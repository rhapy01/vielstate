import { ZeroHash, type Signer, type TypedDataField } from "ethers";
import { SHIELDCAP_CONTRACT_ADDRESS, TEST_USDC_ADDRESS } from "@workspace/addresses";
import { normalizeEthAddress } from "@/lib/normalize-address";

type FheHandle = `0x${string}`;

export type FhevmDecryptInstance = {
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEIP712: (
    publicKey: string,
    contractAddresses: string[],
    startTimestamp: number,
    durationDays: number,
  ) => {
    domain: Record<string, unknown>;
    types: { UserDecryptRequestVerification: unknown[] };
    message: Record<string, unknown>;
  };
  userDecrypt: (
    handles: { handle: FheHandle; contractAddress: string }[],
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number,
  ) => Promise<Record<string, bigint | number | string>>;
};

type DecryptSession = {
  userAddress: string;
  keypair: { publicKey: string; privateKey: string };
  signature: string;
  startTimestamp: number;
  durationDays: number;
  contractAddresses: string[];
};

const SESSION_DURATION_DAYS = 10;
const DEFAULT_CONTRACTS = [SHIELDCAP_CONTRACT_ADDRESS, TEST_USDC_ADDRESS];

let activeSession: DecryptSession | null = null;
let sessionPromise: Promise<DecryptSession> | null = null;
const valueCache = new Map<string, bigint>();

function toHandle(value: string): FheHandle {
  return value as FheHandle;
}

function cacheKey(user: string, contract: string, handle: string) {
  return `${user}:${contract}:${handle}`;
}

function uniqueContracts(addresses: string[]) {
  return [...new Set(addresses.map((a) => normalizeEthAddress(a)))];
}

function sessionExpired(session: DecryptSession, nowSec: number) {
  return nowSec >= session.startTimestamp + session.durationDays * 86_400;
}

async function createSession(
  instance: FhevmDecryptInstance,
  signer: Signer,
  userAddress: string,
  contractAddresses: string[],
): Promise<DecryptSession> {
  const normalizedUser = normalizeEthAddress(userAddress);
  const contracts = uniqueContracts(contractAddresses);
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);

  const eip712 = instance.createEIP712(
    keypair.publicKey,
    contracts,
    startTimestamp,
    SESSION_DURATION_DAYS,
  );

  const signature = await signer.signTypedData(
    eip712.domain,
    {
      UserDecryptRequestVerification:
        eip712.types.UserDecryptRequestVerification as unknown as TypedDataField[],
    },
    eip712.message,
  );

  return {
    userAddress: normalizedUser,
    keypair,
    signature,
    startTimestamp,
    durationDays: SESSION_DURATION_DAYS,
    contractAddresses: contracts,
  };
}

async function ensureSession(
  instance: FhevmDecryptInstance,
  signer: Signer,
  userAddress: string,
): Promise<DecryptSession> {
  const normalizedUser = normalizeEthAddress(userAddress);
  const nowSec = Math.floor(Date.now() / 1000);
  const contracts = uniqueContracts(DEFAULT_CONTRACTS);

  if (
    activeSession &&
    activeSession.userAddress === normalizedUser &&
    !sessionExpired(activeSession, nowSec)
  ) {
    return activeSession;
  }

  if (!sessionPromise) {
    sessionPromise = createSession(instance, signer, normalizedUser, contracts)
      .then((session) => {
        activeSession = session;
        return session;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }

  return sessionPromise;
}

export function clearFheDecryptSession() {
  activeSession = null;
  sessionPromise = null;
  valueCache.clear();
}

export function invalidateFheDecryptCache() {
  valueCache.clear();
}

export async function decryptFheHandle(params: {
  instance: FhevmDecryptInstance;
  signer: Signer;
  userAddress: string;
  handle: string;
  contractAddress: string;
}): Promise<bigint> {
  const { instance, signer, handle, contractAddress } = params;
  if (handle === ZeroHash) return 0n;

  const normalizedUser = normalizeEthAddress(params.userAddress);
  const normalizedContract = normalizeEthAddress(contractAddress);
  const fheHandle = toHandle(handle);
  const key = cacheKey(normalizedUser, normalizedContract, fheHandle);

  const cached = valueCache.get(key);
  if (cached !== undefined) return cached;

  const session = await ensureSession(instance, signer, normalizedUser);

  const result = await instance.userDecrypt(
    [{ handle: fheHandle, contractAddress: normalizedContract }],
    session.keypair.privateKey,
    session.keypair.publicKey,
    session.signature.replace("0x", ""),
    session.contractAddresses,
    normalizedUser,
    session.startTimestamp,
    session.durationDays,
  );

  const value = result[fheHandle];
  const bigintVal = typeof value === "bigint" ? value : BigInt(value ?? 0);
  valueCache.set(key, bigintVal);
  return bigintVal;
}
