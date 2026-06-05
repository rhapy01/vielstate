import { Router } from "express";
import { db } from "@workspace/db";
import { transactionEventTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(transactionEventTable)
    .orderBy(desc(transactionEventTable.timestamp))
    .limit(50);
  return res.json(rows.map(r => ({
    id: r.id,
    txHash: r.txHash,
    eventType: r.eventType,
    timestamp: r.timestamp.toISOString(),
    blockNumber: r.blockNumber,
    walletAddress: r.walletAddress ?? null,
  })));
});

export default router;
