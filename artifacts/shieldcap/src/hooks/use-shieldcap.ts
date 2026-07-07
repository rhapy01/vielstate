import { useCallback, useMemo } from "react";
import { Contract, formatUnits, hexlify, Interface, parseUnits, ZeroHash, type Signer } from "ethers";
import {
  PAYMENT_TOKEN_DECIMALS,
  PAYMENT_TOKEN_SYMBOL,
  SHIELDCAP_CONTRACT_ADDRESS,
  TEST_USDC_ADDRESS,
} from "@workspace/addresses";
import { useWallet } from "@/contexts/wallet-context";
import { useFhevm } from "@/contexts/fhevm-context";
import { SHIELDCAP_ABI } from "@/lib/shieldcap-abi";
import { TEST_USDC_ABI } from "@/lib/test-usdc-abi";
import { apiUrl } from "@/lib/api";
import { normalizeEthAddress } from "@/lib/normalize-address";
import { decryptFheHandle } from "@/lib/fhe-decrypt-session";
import { getSepoliaReadProvider } from "@/lib/sepolia-read-provider";
import {
  cacheListingSupplyLocally,
  syncOnChainListingCancel,
  syncOnChainListingCreated,
  syncOnChainListingFill,
} from "@/lib/on-chain-listing-supply";

export type TxEventType =
  | "Purchase"
  | "Transfer"
  | "DividendDistribution"
  | "CapRejected"
  | "ListingCreated"
  | "ListingPurchased"
  | "ListingCancelled";

export type OnChainProperty = {
  id: number;
  name: string;
  location: string;
  imageUrl: string;
  description: string;
  valueUsd: number;
  totalShares: number;
  pricePerShare: number;
  pricePerShareRaw: bigint;
  status: string;
};

export type OnChainSecondaryListing = {
  id: number;
  propertyId: number;
  seller: string;
  pricePerShare: number;
  pricePerShareRaw: bigint;
  active: boolean;
};

function parseSecondaryListingCreatedId(receipt: {
  logs: ReadonlyArray<{ topics: readonly string[]; data: string }>;
}): number | undefined {
  const iface = new Interface(SHIELDCAP_ABI);
  for (const log of receipt.logs) {
    try {
      const ev = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (ev?.name === "SecondaryListingCreated") {
        return Number(ev.args.listingId ?? ev.args[0]);
      }
    } catch {
      // not this event
    }
  }
  return undefined;
}

async function recordOnChainEvent(payload: {
  txHash: string;
  eventType: TxEventType;
  blockNumber: number;
  walletAddress: string;
  shareCount?: number;
  propertyId?: number;
}) {
  const res = await fetch(apiUrl("/api/transactions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to record transaction: ${body}`);
  }
}

/** FHE txs are gas-heavy; estimate when possible instead of reserving 8M. */
async function estimateFheGas(
  estimate: () => Promise<bigint>,
  fallback = 4_000_000n,
): Promise<bigint> {
  try {
    const est = await estimate();
    const buffered = (est * 120n) / 100n;
    const cap = 6_000_000n;
    return buffered > cap ? cap : buffered < fallback ? fallback : buffered;
  } catch {
    return fallback;
  }
}

export function formatTxError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("INSUFFICIENT_FUNDS") || msg.includes("insufficient funds")) {
    const have = msg.match(/have (\d+)/)?.[1];
    const want = msg.match(/want (\d+)/)?.[1];
    const haveEth = have ? (Number(have) / 1e18).toFixed(3) : null;
    const wantEth = want ? (Number(want) / 1e18).toFixed(3) : null;
    const detail =
      haveEth && wantEth
        ? ` You have ~${haveEth} ETH but this FHE tx needs up to ~${wantEth} ETH reserved for gas.`
        : "";
    return `Not enough Sepolia ETH for gas.${detail} Get more from https://sepoliafaucet.com`;
  }
  return msg;
}

function parseProperty(id: number, raw: unknown, paymentTokenDecimals: number): OnChainProperty | null {
  const row = raw as {
    name?: string;
    location?: string;
    imageUri?: string;
    description?: string;
    valueUsd?: bigint;
    totalShares?: bigint;
    pricePerShare?: bigint;
    active?: boolean;
    0?: string;
    1?: string;
    2?: string;
    3?: string;
    4?: bigint;
    5?: bigint;
    6?: bigint;
    7?: boolean;
  };

  const name = row.name ?? row[0] ?? "";
  const location = row.location ?? row[1] ?? "";
  const imageUri = row.imageUri ?? row[2] ?? "";
  const description = row.description ?? row[3] ?? "";
  const valueUsd = row.valueUsd ?? row[4] ?? 0n;
  const totalShares = row.totalShares ?? row[5] ?? 0n;
  const pricePerShareRaw = row.pricePerShare ?? row[6] ?? 0n;
  const active = row.active ?? row[7] ?? false;

  if (!active || !name) return null;

  return {
    id,
    name,
    location,
    imageUrl: imageUri,
    description,
    valueUsd: Number(valueUsd),
    totalShares: Number(totalShares),
    pricePerShare: Number(formatUnits(pricePerShareRaw, paymentTokenDecimals)),
    pricePerShareRaw,
    status: "active",
  };
}

export function useShieldCapContract() {
  const { signer, address } = useWallet();
  const { instance } = useFhevm();

  const contractAddress = SHIELDCAP_CONTRACT_ADDRESS;
  const paymentTokenAddress = TEST_USDC_ADDRESS;
  const paymentTokenDecimals = PAYMENT_TOKEN_DECIMALS;
  const isConfigured = !!contractAddress && !!paymentTokenAddress;

  const readProvider = useMemo(() => getSepoliaReadProvider(), []);

  const contract = useMemo(() => {
    if (!isConfigured || !contractAddress) return null;
    return new Contract(contractAddress, SHIELDCAP_ABI, readProvider);
  }, [readProvider, isConfigured, contractAddress]);

  const writeContract = useMemo(() => {
    if (!signer || !isConfigured || !contractAddress) return null;
    return new Contract(contractAddress, SHIELDCAP_ABI, signer);
  }, [signer, isConfigured, contractAddress]);

  const getContractReadOnly = useCallback(async () => {
    if (!isConfigured || !contractAddress) throw new Error("Contract not configured");
    return new Contract(contractAddress, SHIELDCAP_ABI, readProvider);
  }, [isConfigured, contractAddress, readProvider]);

  const resolveUserAddress = useCallback(async (): Promise<string> => {
    if (signer) {
      return normalizeEthAddress(await signer.getAddress());
    }
    if (address) {
      return normalizeEthAddress(address);
    }
    throw new Error("Wallet not connected");
  }, [signer, address]);

  const encryptAmount = useCallback(
    async (amount: bigint, targetContract = contractAddress) => {
      if (!instance || !targetContract) {
        throw new Error("FHE SDK not ready");
      }
      const userAddress = await resolveUserAddress();
      const normalizedContract = normalizeEthAddress(targetContract);
      const input = instance.createEncryptedInput(normalizedContract, userAddress);
      input.add64(amount);
      const encrypted = await input.encrypt();
      return {
        handle: hexlify(encrypted.handles[0]),
        inputProof: encrypted.inputProof,
      };
    },
    [instance, contractAddress, resolveUserAddress],
  );

  const decryptHandle = useCallback(
    async (
      handle: string,
      readSigner: Signer,
      userAddress?: string,
      targetContract = contractAddress,
    ) => {
      if (!instance || !targetContract) throw new Error("FHE SDK not ready");
      const resolvedUser = normalizeEthAddress(
        userAddress ?? (await readSigner.getAddress()),
      );
      return decryptFheHandle({
        instance,
        signer: readSigner,
        userAddress: resolvedUser,
        handle,
        contractAddress: targetContract,
      });
    },
    [instance, contractAddress],
  );

  const readProperty = useCallback(
    async (propertyId: number): Promise<OnChainProperty | null> => {
      if (!contract) return null;
      try {
        const raw = await contract.getProperty(propertyId);
        return parseProperty(propertyId, raw, paymentTokenDecimals);
      } catch {
        return null;
      }
    },
    [contract, paymentTokenDecimals],
  );

  const readActiveProperties = useCallback(async (): Promise<OnChainProperty[]> => {
    if (!contract) return [];
    const nextId: bigint = await contract.nextPropertyId();
    const properties: OnChainProperty[] = [];
    for (let id = 1n; id < nextId; id++) {
      const prop = await readProperty(Number(id));
      if (prop) properties.push(prop);
    }
    return properties;
  }, [contract, readProperty]);

  const createProperty = useCallback(
    async (payload: {
      name: string;
      location: string;
      imageUri: string;
      description: string;
      valueUsd: number;
      totalShares: number;
      pricePerShareUnits: bigint;
    }) => {
      if (!writeContract || !address) throw new Error("Wallet not connected");
      const tx = await writeContract.createProperty(
        payload.name,
        payload.location,
        payload.imageUri,
        payload.description,
        BigInt(payload.valueUsd),
        BigInt(payload.totalShares),
        payload.pricePerShareUnits,
        { gasLimit: 2_000_000 },
      );
      return tx.wait();
    },
    [writeContract, address],
  );

  const purchaseShares = useCallback(
    async (propertyId: number, shareCount: number) => {
      if (!writeContract || !signer || !address) throw new Error("Wallet not connected");
      const encrypted = await encryptAmount(BigInt(shareCount));
      const gasLimit = await estimateFheGas(() =>
        writeContract.purchaseShares.estimateGas(
          propertyId,
          encrypted.handle,
          encrypted.inputProof,
        ),
      );
      const tx = await writeContract.purchaseShares(
        propertyId,
        encrypted.handle,
        encrypted.inputProof,
        { gasLimit },
      );
      const receipt = await tx.wait();
      const eventType: TxEventType = receipt.status === 1 ? "Purchase" : "CapRejected";
      try {
        const walletAddress = await resolveUserAddress();
        await recordOnChainEvent({
          txHash: receipt.hash,
          eventType,
          blockNumber: Number(receipt.blockNumber),
          walletAddress,
          shareCount: eventType === "Purchase" ? shareCount : undefined,
          propertyId: eventType === "Purchase" ? propertyId : undefined,
        });
      } catch {
        // best-effort
      }
      return receipt;
    },
    [writeContract, signer, address, encryptAmount, resolveUserAddress],
  );

  const createSecondaryListing = useCallback(
    async (propertyId: number, shareCount: number, pricePerShareUnits: bigint) => {
      if (!writeContract || !signer || !address) throw new Error("Wallet not connected");
      const encrypted = await encryptAmount(BigInt(shareCount));
      const gasLimit = await estimateFheGas(() =>
        writeContract.createSecondaryListing.estimateGas(
          propertyId,
          pricePerShareUnits,
          encrypted.handle,
          encrypted.inputProof,
        ),
      );
      const tx = await writeContract.createSecondaryListing(
        propertyId,
        pricePerShareUnits,
        encrypted.handle,
        encrypted.inputProof,
        { gasLimit },
      );
      const receipt = await tx.wait();
      const onChainListingId = parseSecondaryListingCreatedId(receipt);
      try {
        await recordOnChainEvent({
          txHash: receipt.hash,
          eventType: "ListingCreated",
          blockNumber: Number(receipt.blockNumber),
          walletAddress: address,
          shareCount,
          propertyId,
        });
      } catch {
        // best-effort
      }
      if (onChainListingId) {
        cacheListingSupplyLocally({
          onChainListingId,
          propertyId,
          sellerWallet: address.toLowerCase(),
          sharesListed: shareCount,
          sharesRemaining: shareCount,
          pricePerShare: Number(formatUnits(pricePerShareUnits, paymentTokenDecimals)),
          createTxHash: receipt.hash,
        });
        try {
          await syncOnChainListingCreated({
            onChainListingId,
            propertyId,
            sellerWallet: address,
            sharesListed: shareCount,
            pricePerShare: Number(formatUnits(pricePerShareUnits, paymentTokenDecimals)),
            createTxHash: receipt.hash,
          });
        } catch {
          // best-effort
        }
      }
      return receipt;
    },
    [writeContract, signer, address, encryptAmount, paymentTokenDecimals],
  );

  const buySecondaryListing = useCallback(
    async (listingId: number, shareCount: number) => {
      if (!writeContract || !signer || !address) throw new Error("Wallet not connected");
      const encrypted = await encryptAmount(BigInt(shareCount));
      const gasLimit = await estimateFheGas(() =>
        writeContract.buySecondaryListing.estimateGas(
          listingId,
          encrypted.handle,
          encrypted.inputProof,
        ),
      );
      const tx = await writeContract.buySecondaryListing(
        listingId,
        encrypted.handle,
        encrypted.inputProof,
        { gasLimit },
      );
      const receipt = await tx.wait();
      try {
        await recordOnChainEvent({
          txHash: receipt.hash,
          eventType: "ListingPurchased",
          blockNumber: Number(receipt.blockNumber),
          walletAddress: address,
          shareCount,
        });
      } catch {
        // best-effort
      }
      try {
        await syncOnChainListingFill({
          onChainListingId: listingId,
          shareCount,
          buyerWallet: address,
          txHash: receipt.hash,
        });
      } catch {
        // best-effort
      }
      return receipt;
    },
    [writeContract, signer, address, encryptAmount],
  );

  const cancelSecondaryListing = useCallback(
    async (listingId: number) => {
      if (!writeContract || !signer || !address) throw new Error("Wallet not connected");
      const tx = await writeContract.cancelSecondaryListing(listingId, { gasLimit: 5_000_000 });
      const receipt = await tx.wait();
      try {
        await recordOnChainEvent({
          txHash: receipt.hash,
          eventType: "ListingCancelled",
          blockNumber: receipt.blockNumber,
          walletAddress: address,
        });
      } catch {
        // best-effort
      }
      try {
        await syncOnChainListingCancel({
          onChainListingId: listingId,
          sellerWallet: address,
        });
      } catch {
        // best-effort
      }
      return receipt;
    },
    [writeContract, signer, address],
  );

  const readActiveSecondaryListings = useCallback(async (): Promise<OnChainSecondaryListing[]> => {
    if (!contract) return [];
    const nextId: bigint = await contract.nextListingId();
    const listings: OnChainSecondaryListing[] = [];
    for (let id = 1n; id < nextId; id++) {
      const result = await contract.getSecondaryListing(id);
      const propertyId = Number(result.propertyId ?? result[0]);
      const seller = String(result.seller ?? result[1]).toLowerCase();
      const pricePerShareRaw: bigint = result.pricePerShare ?? result[3];
      const active: boolean = result.active ?? result[4];
      if (!active) continue;
      listings.push({
        id: Number(id),
        propertyId,
        seller,
        pricePerShare: Number(formatUnits(pricePerShareRaw, paymentTokenDecimals)),
        pricePerShareRaw,
        active,
      });
    }
    return listings;
  }, [contract, paymentTokenDecimals]);

  const readShareBalance = useCallback(
    async (propertyId: number, account: string, readSigner: Signer) => {
      const normalizedAccount = normalizeEthAddress(account);
      const c = await getContractReadOnly();
      const handle: string = await c.balanceOfProperty(propertyId, normalizedAccount);
      return decryptHandle(handle, readSigner, normalizedAccount);
    },
    [getContractReadOnly, decryptHandle],
  );

  const readListingRemainingShares = useCallback(
    async (listingId: number, readSigner: Signer) => {
      if (!contract) return 0n;
      const wallet = normalizeEthAddress(await readSigner.getAddress());
      const result = await contract.getSecondaryListing(listingId);
      const handle: string = result.sharesRemaining ?? result[2];
      try {
        return await decryptHandle(handle, readSigner, wallet);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not authorized")) {
          throw new Error(
            "Cannot decrypt remaining shares for this listing yet. Register the listing supply instead — on-chain ACL for older listings may require a contract upgrade.",
          );
        }
        throw err;
      }
    },
    [contract, decryptHandle],
  );

  const readPropertiesWithBalance = useCallback(
    async (account: string, readSigner: Signer) => {
      if (!contract) return [];
      const nextId: bigint = await contract.nextPropertyId();
      const owned: { propertyId: number; shares: bigint }[] = [];
      for (let id = 1n; id < nextId; id++) {
        const propertyId = Number(id);
        const shares = await readShareBalance(propertyId, account, readSigner);
        if (shares > 0n) {
          owned.push({ propertyId, shares });
        }
      }
      return owned;
    },
    [contract, readShareBalance],
  );

  const readPricePerShare = useCallback(
    async (propertyId: number) => {
      if (!contract) throw new Error("Contract not ready");
      const prop = await contract.getProperty(propertyId);
      const units: bigint = prop.pricePerShare ?? prop[6];
      return formatUnits(units, paymentTokenDecimals);
    },
    [contract, paymentTokenDecimals],
  );

  const readUsdcBalance = useCallback(async () => {
    if (!address || !paymentTokenAddress) {
      throw new Error("Wallet not connected");
    }
    if (!signer) {
      throw new Error("Wallet signer not ready");
    }
    if (!instance) {
      throw new Error("FHE SDK not ready");
    }
    const paymentToken = new Contract(paymentTokenAddress, TEST_USDC_ABI, readProvider);
    const handle: string = await paymentToken.confidentialBalanceOf(normalizeEthAddress(address));
    if (handle === ZeroHash) return formatUnits(0n, paymentTokenDecimals);
    try {
      const raw = await decryptHandle(handle, signer, address, paymentTokenAddress);
      return formatUnits(raw, paymentTokenDecimals);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not authorized")) {
        throw new Error(
          "Unable to read balance. Claim ctUSDC again if contracts were redeployed.",
        );
      }
      throw err;
    }
  }, [address, paymentTokenAddress, paymentTokenDecimals, readProvider, signer, instance, decryptHandle]);

  const readOnChainTotals = useCallback(
    async (propertyId: number) => {
      if (!contract) throw new Error("Contract not ready");
      const prop = await contract.getProperty(propertyId);
      const totalShares = prop.totalShares ?? prop[5];
      const maxShares = await contract.maxSharesForProperty(propertyId);
      const investors = await contract.investorCount(propertyId);
      let sharesAllocatedHandle: string | null = null;
      try {
        sharesAllocatedHandle = await contract.totalSharesAllocated(propertyId);
      } catch {
        sharesAllocatedHandle = null;
      }
      return {
        totalShares: Number(totalShares),
        maxShares: Number(maxShares),
        investorCount: Number(investors),
        sharesAllocatedHandle,
      };
    },
    [contract],
  );

  const readTotalSharesAllocated = useCallback(
    async (propertyId: number, readSigner: Signer) => {
      const c = await getContractReadOnly();
      const handle: string = await c.totalSharesAllocated(propertyId);
      return decryptHandle(handle, readSigner);
    },
    [getContractReadOnly, decryptHandle],
  );

  const readContractOwner = useCallback(async () => {
    if (!contract) return null;
    return (await contract.owner()) as string;
  }, [contract]);

  const readDividendPayout = useCallback(
    async (propertyId: number, account: string, readSigner: Signer) => {
      const normalizedAccount = normalizeEthAddress(account);
      const c = await getContractReadOnly();
      const handle: string = await c.dividendOf(propertyId, normalizedAccount);
      if (handle === ZeroHash) return 0n;
      try {
        return await decryptHandle(handle, readSigner, normalizedAccount);
      } catch (err) {
        // After claimDividend the contract stores encrypted 0 without re-allowing
        // the investor on that handle — treat as zero accrued payout.
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not authorized")) return 0n;
        throw err;
      }
    },
    [getContractReadOnly, decryptHandle],
  );

  const distributeDividend = useCallback(
    async (propertyId: number, revenueUsdc: string, revenueUsd: number) => {
      if (!writeContract || !signer || !address) throw new Error("Wallet not connected");
      const units = parseUnits(revenueUsdc, paymentTokenDecimals);
      const encrypted = await encryptAmount(units);
      const gasLimit = await estimateFheGas(() =>
        writeContract.distributeDividend.estimateGas(
          propertyId,
          encrypted.handle,
          encrypted.inputProof,
        ),
        5_000_000n,
      );
      const tx = await writeContract.distributeDividend(
        propertyId,
        encrypted.handle,
        encrypted.inputProof,
        { gasLimit },
      );
      const receipt = await tx.wait();
      try {
        await fetch(apiUrl("/api/dividends/distribute"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revenueUsd,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
          }),
        });
      } catch {
        // best-effort
      }
      return receipt;
    },
    [writeContract, signer, address, encryptAmount, paymentTokenDecimals],
  );

  const claimDividend = useCallback(
    async (propertyId: number) => {
      if (!writeContract || !signer || !address) throw new Error("Wallet not connected");
      const gasLimit = await estimateFheGas(
        () => writeContract.claimDividend.estimateGas(propertyId),
        3_000_000n,
      );
      const tx = await writeContract.claimDividend(propertyId, { gasLimit });
      return tx.wait();
    },
    [writeContract, signer, address],
  );

  return {
    contract: writeContract ?? contract,
    contractAddress,
    isConfigured,
    isLoading: false,
    configError: undefined,
    createProperty,
    purchaseShares,
    createSecondaryListing,
    buySecondaryListing,
    cancelSecondaryListing,
    readActiveSecondaryListings,
    readActiveProperties,
    readProperty,
    distributeDividend,
    claimDividend,
    readShareBalance,
    readDividendPayout,
    readListingRemainingShares,
    readPropertiesWithBalance,
    readPricePerShare,
    readUsdcBalance,
    paymentTokenAddress,
    paymentTokenSymbol: PAYMENT_TOKEN_SYMBOL,
    paymentTokenDecimals,
    readOnChainTotals,
    readTotalSharesAllocated,
    readContractOwner,
    decryptHandle,
    encryptAmount,
    parseUnits,
  };
}
