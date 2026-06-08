import { Router } from "express";
import { db } from "@workspace/db";
import { propertyTable, transactionEventTable, dividendRoundTable } from "@workspace/db";
import { and, count, countDistinct, sum, eq, isNotNull, isNull, or } from "drizzle-orm";

const router = Router();

router.get("/all", async (_req, res) => {
  const rows = await db.select().from(propertyTable).where(eq(propertyTable.status, "active"));
  return res.json(rows);
});

router.get("/metrics", async (_req, res) => {
  const [property] = await db.select().from(propertyTable).limit(1);
  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  const [txCountRow] = await db.select({ value: count() }).from(transactionEventTable);
  const [dividendCountRow] = await db.select({ value: count() }).from(dividendRoundTable);
  const [revenueRow] = await db
    .select({ value: sum(dividendRoundTable.totalDistributedUsd) })
    .from(dividendRoundTable)
    .where(eq(dividendRoundTable.status, "confirmed"));
  const [investorCountRow] = await db
    .select({ value: countDistinct(transactionEventTable.walletAddress) })
    .from(transactionEventTable)
    .where(isNotNull(transactionEventTable.walletAddress));

  return res.json({
    totalSharesIssued: property.totalShares,
    totalRevenueDistributedUsd: Number(revenueRow?.value ?? 0),
    totalTransactions: Number(txCountRow?.value ?? 0),
    totalDividendRounds: Number(dividendCountRow?.value ?? 0),
    investorCount: Number(investorCountRow?.value ?? 0),
    propertyValueUsd: property.valueUsd,
    monthlyRevenueUsd: 0,
  });
});

router.get("/", async (_req, res) => {
  const rows = await db.select().from(propertyTable).limit(1);
  if (!rows.length) {
    return res.status(404).json({ error: "Property not found" });
  }
  return res.json(rows[0]);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid property id" });
  }
  const rows = await db.select().from(propertyTable).where(eq(propertyTable.id, id)).limit(1);
  if (!rows.length) {
    return res.status(404).json({ error: "Property not found" });
  }
  return res.json(rows[0]);
});

router.get("/:id/supply", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid property id" });
  }

  const rows = await db.select().from(propertyTable).where(eq(propertyTable.id, id)).limit(1);
  if (!rows.length) {
    return res.status(404).json({ error: "Property not found" });
  }
  const property = rows[0];

  const purchaseFilter =
    id === 1
      ? and(
          eq(transactionEventTable.eventType, "Purchase"),
          or(eq(transactionEventTable.propertyId, id), isNull(transactionEventTable.propertyId)),
        )
      : and(eq(transactionEventTable.eventType, "Purchase"), eq(transactionEventTable.propertyId, id));

  const [soldRow] = await db
    .select({ value: sum(transactionEventTable.shareCount) })
    .from(transactionEventTable)
    .where(purchaseFilter);

  const [untrackedPurchases] = await db
    .select({ value: count() })
    .from(transactionEventTable)
    .where(and(purchaseFilter, isNull(transactionEventTable.shareCount)));

  const sharesSold = Number(soldRow?.value ?? 0);
  const totalShares = property.totalShares;
  const sharesRemaining = Math.max(0, totalShares - sharesSold);
  const hasUntrackedPurchases = Number(untrackedPurchases?.value ?? 0) > 0;

  return res.json({
    propertyId: id,
    totalShares,
    sharesSold,
    sharesRemaining,
    hasUntrackedPurchases,
  });
});

export default router;
