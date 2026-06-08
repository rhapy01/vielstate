import { getAddress, isAddress } from "ethers";

/** EIP-55 checksum address for contract calls and the Zama FHE SDK. */
export function normalizeEthAddress(value: string): string {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    throw new Error("Wallet address is not a valid address.");
  }
  return getAddress(trimmed.toLowerCase());
}

export function tryNormalizeEthAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return normalizeEthAddress(value);
  } catch {
    return null;
  }
}
