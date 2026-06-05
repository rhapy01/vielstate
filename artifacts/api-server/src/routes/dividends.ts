import { Router } from "express";
import { db } from "@workspace/db";
import { dividendRoundTable, transactionEventTable } from "@workspace/db";
import { desc, count } from "drizzle-orm";
import { TriggerDividendDistributionBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(dividendRoundTable)
    .orderBy(desc(dividendRoundTable.distributedAt))
    .limit(20);
  return res.json(rows.map(r => ({
    id: r.id,
    roundNumber: r.roundNumber,
    totalDistributedUsd: r.totalDistributedUsd,
    revenueUsd: r.revenueUsd,
    distributedAt: r.distributedAt.toISOString(),
    txHash: r.txHash ?? null,
    status: r.status,
  })));
});

router.post("/distribute", async (req, res) => {
  const parsed = TriggerDividendDistributionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const { revenueUsd, txHash } = parsed.data;

  // Get the current max round number
  const [latest] = await db
    .select()
    .from(dividendRoundTable)
    .orderBy(desc(dividendRoundTable.roundNumber))
    .limit(1);
  const nextRound = (latest?.roundNumber ?? 0) + 1;

  const [round] = await db
    .insert(dividendRoundTable)
    .values({
      roundNumber: nextRound,
      totalDistributedUsd: revenueUsd,
      revenueUsd,
      txHash,
      status: "confirmed",
    })
    .returning();

  // Record the transaction event
  await db.insert(transactionEventTable).values({
    txHash,
    eventType: "DividendDistribution",
    blockNumber: Math.floor(Math.random() * 100000) + 1000000,
    walletAddress: null,
    timestamp: new Date(),
  });

  return res.status(201).json({
    id: round.id,
    roundNumber: round.roundNumber,
    totalDistributedUsd: round.totalDistributedUsd,
    revenueUsd: round.revenueUsd,
    distributedAt: round.distributedAt.toISOString(),
    txHash: round.txHash ?? null,
    status: round.status,
  });
});

export default router;
