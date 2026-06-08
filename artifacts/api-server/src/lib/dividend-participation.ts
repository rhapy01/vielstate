import { SHIELDCAP_CONTRACT_ADDRESS } from "@workspace/addresses";
import { db } from "@workspace/db";
import {
  dividendRoundTable,
  investorDividendRecordTable,
  investorTable,
  transactionEventTable,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Contract, JsonRpcProvider } from "ethers";

const SHARE_ACTIVITY_EVENTS = ["Purchase", "Transfer", "ListingPurchased"] as const;
const DEFAULT_PROPERTY_ID = 1;

const SHIELDCAP_EVENTS_ABI = [
  "event DividendDistributed(uint256 indexed propertyId, uint256 round, uint256 timestamp)",
  "function dividendRound(uint256 propertyId) view returns (uint256)",
] as const;

/** Create dividend_round rows from on-chain DividendDistributed events when the DB is behind. */
export async function ensureDividendRoundsRecorded(): Promise<void> {
  const provider = new JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
  );
  const contract = new Contract(SHIELDCAP_CONTRACT_ADDRESS, SHIELDCAP_EVENTS_ABI, provider);
  const onChainRound: bigint = await contract.dividendRound(DEFAULT_PROPERTY_ID);
  if (onChainRound === 0n) return;

  const existing = await db.select().from(dividendRoundTable);
  const existingRoundNumbers = new Set(existing.map((r) => r.roundNumber));

  const logs = await contract.queryFilter(
    contract.filters.DividendDistributed(DEFAULT_PROPERTY_ID),
    0,
    "latest",
  );

  for (const log of logs) {
    const args = log.args as unknown as { round: bigint };
    const roundNumber = Number(args.round);
    if (existingRoundNumbers.has(roundNumber)) continue;

    await db.insert(dividendRoundTable).values({
      roundNumber,
      totalDistributedUsd: 0,
      revenueUsd: 0,
      txHash: log.transactionHash,
      status: "confirmed",
    });
    existingRoundNumbers.add(roundNumber);
  }
}

function normalizeWallet(walletAddress: string): string {
  return walletAddress.toLowerCase();
}

export async function investorHasShareActivity(walletAddress: string): Promise<boolean> {
  const wallet = normalizeWallet(walletAddress);
  const rows = await db
    .select({ id: transactionEventTable.id })
    .from(transactionEventTable)
    .where(
      and(
        sql`lower(${transactionEventTable.walletAddress}) = ${wallet}`,
        inArray(transactionEventTable.eventType, [...SHARE_ACTIVITY_EVENTS]),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function syncDividendParticipationForRound(
  dividendRoundId: number,
  roundNumber: number,
): Promise<number> {
  const investors = await db.select().from(investorTable);
  let created = 0;

  for (const investor of investors) {
    const hasActivity = await investorHasShareActivity(investor.walletAddress);
    if (!hasActivity) continue;

    const existing = await db
      .select({ id: investorDividendRecordTable.id })
      .from(investorDividendRecordTable)
      .where(
        and(
          eq(investorDividendRecordTable.investorId, investor.id),
          eq(investorDividendRecordTable.dividendRoundId, dividendRoundId),
        ),
      )
      .limit(1);
    if (existing.length) continue;

    await db.insert(investorDividendRecordTable).values({
      investorId: investor.id,
      dividendRoundId,
      roundNumber,
      status: "eligible",
    });
    created++;
  }

  return created;
}

/** Backfill participation rows for an investor across all recorded dividend rounds. */
export async function syncDividendParticipationForInvestor(
  investorId: number,
  walletAddress: string,
): Promise<void> {
  const rounds = await db
    .select()
    .from(dividendRoundTable)
    .orderBy(dividendRoundTable.roundNumber);

  const hasActivity = await investorHasShareActivity(walletAddress);

  for (const round of rounds) {
    const existing = await db
      .select({ id: investorDividendRecordTable.id })
      .from(investorDividendRecordTable)
      .where(
        and(
          eq(investorDividendRecordTable.investorId, investorId),
          eq(investorDividendRecordTable.dividendRoundId, round.id),
        ),
      )
      .limit(1);
    if (existing.length) continue;

    // Backfill: if rounds exist but purchase tx was not recorded, still show participation
    // for registered investors (typical testnet path after on-chain distribute).
    if (!hasActivity) continue;

    await db.insert(investorDividendRecordTable).values({
      investorId,
      dividendRoundId: round.id,
      roundNumber: round.roundNumber,
      status: "eligible",
    });
  }
}

/**
 * Backfill when distribute ran on-chain but activity rows were not written.
 * Only includes rounds distributed after the investor registered.
 */
export async function syncDividendParticipationForInvestorLenient(
  investorId: number,
  registeredAt: Date,
): Promise<void> {
  const rounds = await db
    .select()
    .from(dividendRoundTable)
    .orderBy(dividendRoundTable.roundNumber);

  for (const round of rounds) {
    if (round.distributedAt < registeredAt) continue;

    const existing = await db
      .select({ id: investorDividendRecordTable.id })
      .from(investorDividendRecordTable)
      .where(
        and(
          eq(investorDividendRecordTable.investorId, investorId),
          eq(investorDividendRecordTable.dividendRoundId, round.id),
        ),
      )
      .limit(1);
    if (existing.length) continue;

    await db.insert(investorDividendRecordTable).values({
      investorId,
      dividendRoundId: round.id,
      roundNumber: round.roundNumber,
      status: "eligible",
    });
  }
}

/** Ensure every recorded round has participation rows for eligible investors. */
export async function syncAllDividendParticipation(): Promise<void> {
  const rounds = await db
    .select()
    .from(dividendRoundTable)
    .orderBy(dividendRoundTable.roundNumber);

  for (const round of rounds) {
    await syncDividendParticipationForRound(round.id, round.roundNumber);
  }
}
