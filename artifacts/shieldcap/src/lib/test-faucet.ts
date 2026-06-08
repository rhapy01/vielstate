import { apiUrl } from "@/lib/api";

export async function requestTestUsdc(walletAddress: string) {
  const res = await fetch(apiUrl("/api/faucet/usdc"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });

  const body = (await res.json()) as { error?: string; txHash?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Faucet request failed");
  }

  return {
    txHash: body.txHash!,
    message: body.message!,
  };
}
