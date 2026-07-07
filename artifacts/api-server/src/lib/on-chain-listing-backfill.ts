import { SHIELDCAP_CONTRACT_ADDRESS } from "@workspace/addresses";
import { db } from "@workspace/db";
import { onChainListingTable, transactionEventTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Contract, JsonRpcProvider, formatUnits } from "ethers";

const PAYMENT_TOKEN_DECIMALS = 6;

const SHIELDCAP_LISTING_ABI = [
  "event SecondaryListingCreated(uint256 indexed listingId, uint256 indexed propertyId, address indexed seller, uint256 pricePerShare, uint256 timestamp)",
] as const;

function getProvider() {
  return new JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
  );
}

/** Rebuild marketplace supply rows from chain events + recorded create txs. */
export async function backfillOnChainListingSupply(
  listingId: number,
): Promise<{ sharesListed: number; sharesRemaining: number; active: boolean } | null> {
  const provider = getProvider();
  const contract = new Contract(SHIELDCAP_CONTRACT_ADDRESS, SHIELDCAP_LISTING_ABI, provider);
  const logs = await contract.queryFilter(contract.filters.SecondaryListingCreated(listingId));
  if (!logs.length) return null;

  const log = logs[0];
  const args = log.args as unknown as {
    propertyId: bigint;
    seller: string;
    pricePerShare: bigint;
  };
  const propertyId = Number(args.propertyId);
  const sellerWallet = String(args.seller).toLowerCase();
  const pricePerShare = Number(formatUnits(args.pricePerShare, PAYMENT_TOKEN_DECIMALS));
  const createTxHash = log.transactionHash;

  const [txEvent] = await db
    .select()
    .from(transactionEventTable)
    .where(eq(transactionEventTable.txHash, createTxHash));
  const sharesListed = txEvent?.shareCount;
  if (!sharesListed || sharesListed <= 0) return null;

  const [existing] = await db
    .select()
    .from(onChainListingTable)
    .where(eq(onChainListingTable.onChainListingId, listingId));

  if (existing) {
    return {
      sharesListed: existing.sharesListed,
      sharesRemaining: existing.sharesRemaining,
      active: existing.active,
    };
  }

  const [row] = await db
    .insert(onChainListingTable)
    .values({
      onChainListingId: listingId,
      propertyId,
      sellerWallet,
      sharesListed,
      sharesRemaining: sharesListed,
      pricePerShare,
      active: true,
      createTxHash,
    })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    const [inserted] = await db
      .select()
      .from(onChainListingTable)
      .where(eq(onChainListingTable.onChainListingId, listingId));
    if (!inserted) return null;
    return {
      sharesListed: inserted.sharesListed,
      sharesRemaining: inserted.sharesRemaining,
      active: inserted.active,
    };
  }

  return {
    sharesListed: row.sharesListed,
    sharesRemaining: row.sharesRemaining,
    active: row.active,
  };
}
