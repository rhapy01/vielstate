import { SEPOLIA_CHAIN } from "@/lib/chain";

export function sepoliaTxUrl(txHash: string): string {
  const base = SEPOLIA_CHAIN.blockExplorerUrls[0];
  return `${base}/tx/${txHash}`;
}

export function sepoliaAddressUrl(address: string): string {
  const base = SEPOLIA_CHAIN.blockExplorerUrls[0];
  return `${base}/address/${address}`;
}
