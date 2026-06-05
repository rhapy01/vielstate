import { Router } from "express";
import { db } from "@workspace/db";
import { propertyTable, transactionEventTable, dividendRoundTable, investorTable } from "@workspace/db";
import { count, sum, eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const rows = await db.select().from(propertyTable).limit(1);
  if (!rows.length) {
    return res.status(404).json({ error: "Property not found" });
  }
  return res.json(rows[0]);
});

router.get("/metrics", async (req, res) => {
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
  const [investorCountRow] = await db.select({ value: count() }).from(investorTable);

  return res.json({
    totalSharesIssued: property.totalShares,
    totalRevenueDistributedUsd: Number(revenueRow?.value ?? 0),
    totalTransactions: Number(txCountRow?.value ?? 0),
    totalDividendRounds: Number(dividendCountRow?.value ?? 0),
    investorCount: Number(investorCountRow?.value ?? 0),
    propertyValueUsd: property.valueUsd,
    monthlyRevenueUsd: 100000,
  });
});

export default router;
