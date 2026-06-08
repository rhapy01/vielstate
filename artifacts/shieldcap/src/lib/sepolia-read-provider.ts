import { JsonRpcProvider } from "ethers";
import { SEPOLIA_CHAIN } from "@/lib/chain";
import { SEPOLIA_CHAIN_ID } from "@workspace/addresses";

let cached: JsonRpcProvider | null = null;

/** Public Sepolia RPC for read-only contract calls (no injected wallet). */
export function getSepoliaReadProvider(): JsonRpcProvider {
  if (!cached) {
    cached = new JsonRpcProvider(SEPOLIA_CHAIN.rpcUrls[0], SEPOLIA_CHAIN_ID, {
      staticNetwork: true,
    });
  }
  return cached;
}
