import { Router } from "express";
import { db } from "@workspace/db";
import {
  investorTable,
  investorDividendRecordTable,
  transactionEventTable,
  dividendRoundTable,
} from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { RegisterInvestorBody } from "@workspace/api-zod";
import {
  ensureDividendRoundsRecorded,
  syncDividendParticipationForInvestor,
  syncDividendParticipationForInvestorLenient,
} from "../lib/dividend-participation";

const router = Router();

router.post("/", async (req, res) => {
  const parsed = RegisterInvestorBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const { walletAddress, displayName } = parsed.data;

  const existing = await db
    .select()
    .from(investorTable)
    .where(eq(investorTable.walletAddress, walletAddress))
    .limit(1);

  if (existing.length) {
    const investor = existing[0];
    const [txCount] = await db
      .select({ value: count() })
      .from(transactionEventTable)
      .where(eq(transactionEventTable.walletAddress, walletAddress));
    const [divCount] = await db
      .select({ value: count() })
      .from(investorDividendRecordTable)
      .where(eq(investorDividendRecordTable.investorId, investor.id));

    return res.status(201).json({
      id: investor.id,
      walletAddress: investor.walletAddress,
      registeredAt: investor.registeredAt.toISOString(),
      transactionCount: Number(txCount?.value ?? 0),
      dividendRoundsParticipated: Number(divCount?.value ?? 0),
      displayName: investor.displayName ?? null,
    });
  }

  const [investor] = await db
    .insert(investorTable)
    .values({ walletAddress, displayName })
    .returning();

  return res.status(201).json({
    id: investor.id,
    walletAddress: investor.walletAddress,
    registeredAt: investor.registeredAt.toISOString(),
    transactionCount: 0,
    dividendRoundsParticipated: 0,
    displayName: investor.displayName ?? null,
  });
});

router.get("/:walletAddress", async (req, res) => {
  const { walletAddress } = req.params;
  const rows = await db
    .select()
    .from(investorTable)
    .where(eq(investorTable.walletAddress, walletAddress))
    .limit(1);

  if (!rows.length) {
    return res.status(404).json({ error: "Investor not found" });
  }
  const investor = rows[0];

  const [txCount] = await db
    .select({ value: count() })
    .from(transactionEventTable)
    .where(eq(transactionEventTable.walletAddress, walletAddress));
  const [divCount] = await db
    .select({ value: count() })
    .from(investorDividendRecordTable)
    .where(eq(investorDividendRecordTable.investorId, investor.id));

  return res.json({
    id: investor.id,
    walletAddress: investor.walletAddress,
    registeredAt: investor.registeredAt.toISOString(),
    transactionCount: Number(txCount?.value ?? 0),
    dividendRoundsParticipated: Number(divCount?.value ?? 0),
    displayName: investor.displayName ?? null,
  });
});

router.get("/:walletAddress/transactions", async (req, res) => {
  const { walletAddress } = req.params;
  const rows = await db
    .select()
    .from(transactionEventTable)
    .where(eq(transactionEventTable.walletAddress, walletAddress))
    .orderBy(desc(transactionEventTable.timestamp))
    .limit(20);

  return res.json(rows.map(r => ({
    id: r.id,
    txHash: r.txHash,
    eventType: r.eventType,
    timestamp: r.timestamp.toISOString(),
    blockNumber: r.blockNumber,
    walletAddress: r.walletAddress ?? null,
  })));
});

router.get("/:walletAddress/dividends", async (req, res) => {
  const { walletAddress } = req.params;
  const normalizedWallet = walletAddress.toLowerCase();
  const investorRows = await db
    .select()
    .from(investorTable)
    .where(sql`lower(${investorTable.walletAddress}) = ${normalizedWallet}`)
    .limit(1);

  if (!investorRows.length) {
    return res.json([]);
  }
  const investor = investorRows[0];

  await ensureDividendRoundsRecorded();
  await syncDividendParticipationForInvestor(investor.id, investor.walletAddress);

  let records = await db
    .select()
    .from(investorDividendRecordTable)
    .where(eq(investorDividendRecordTable.investorId, investor.id))
    .orderBy(desc(investorDividendRecordTable.createdAt))
    .limit(20);

  if (records.length === 0) {
    await syncDividendParticipationForInvestorLenient(investor.id, investor.registeredAt);
    records = await db
      .select()
      .from(investorDividendRecordTable)
      .where(eq(investorDividendRecordTable.investorId, investor.id))
      .orderBy(desc(investorDividendRecordTable.createdAt))
      .limit(20);
  }

  const dividendRows = await db
    .select()
    .from(dividendRoundTable)
    .orderBy(desc(dividendRoundTable.roundNumber))
    .limit(20);

  const roundMap = new Map(dividendRows.map(d => [d.id, d]));

  return res.json(records.map(r => ({
    id: r.id,
    roundNumber: r.roundNumber,
    distributedAt: roundMap.get(r.dividendRoundId)?.distributedAt.toISOString() ?? r.createdAt.toISOString(),
    status: r.status,
  })));
});

export default router;
