import { Router } from "express";
import { db } from "@workspace/db";
import { transactionEventTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const RecordTransactionBody = z.object({
  txHash: z.string().min(1),
  eventType: z.enum([
    "Purchase",
    "Transfer",
    "DividendDistribution",
    "CapRejected",
    "ListingCreated",
    "ListingPurchased",
    "ListingCancelled",
  ]),
  blockNumber: z.number().int().positive(),
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  shareCount: z.number().int().positive().optional(),
  propertyId: z.number().int().positive().optional(),
});

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

router.post("/", async (req, res) => {
  const parsed = RecordTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { txHash, eventType, blockNumber, walletAddress, shareCount, propertyId } = parsed.data;

  const [row] = await db
    .insert(transactionEventTable)
    .values({
      txHash,
      eventType,
      blockNumber,
      walletAddress,
      shareCount:
        eventType === "Purchase" || eventType === "ListingCreated" || eventType === "ListingPurchased"
          ? shareCount ?? null
          : null,
      propertyId:
        eventType === "Purchase" || eventType === "ListingCreated" ? propertyId ?? null : null,
      timestamp: new Date(),
    })
    .returning();

  return res.status(201).json({
    id: row.id,
    txHash: row.txHash,
    eventType: row.eventType,
    timestamp: row.timestamp.toISOString(),
    blockNumber: row.blockNumber,
    walletAddress: row.walletAddress ?? null,
  });
});

export default router;
