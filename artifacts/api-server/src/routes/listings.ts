import { Router } from "express";
import { db } from "@workspace/db";
import { onChainListingTable, shareListingTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { backfillOnChainListingSupply } from "../lib/on-chain-listing-backfill";

const router = Router();

/** Batch supply for on-chain FCFS listings (plaintext tracked off-chain after user txs). */
router.get("/on-chain/supply", async (req, res) => {
  const raw = req.query.ids;
  const ids = (typeof raw === "string" ? raw.split(",") : [])
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) {
    return res.json({ supplies: {} });
  }

  const rows = await db
    .select()
    .from(onChainListingTable)
    .where(inArray(onChainListingTable.onChainListingId, ids));

  const supplies: Record<
    string,
    { sharesListed: number; sharesRemaining: number; active: boolean }
  > = {};
  for (const row of rows) {
    supplies[String(row.onChainListingId)] = {
      sharesListed: row.sharesListed,
      sharesRemaining: row.sharesRemaining,
      active: row.active,
    };
  }

  for (const id of ids) {
    if (supplies[String(id)]) continue;
    try {
      const backfilled = await backfillOnChainListingSupply(id);
      if (backfilled) {
        supplies[String(id)] = backfilled;
      }
    } catch {
      // best-effort — client may register supply manually
    }
  }

  return res.json({ supplies });
});

router.post("/on-chain", async (req, res) => {
  const {
    onChainListingId,
    propertyId,
    sellerWallet,
    sharesListed,
    pricePerShare,
    createTxHash,
  } = req.body ?? {};

  if (
    !onChainListingId ||
    !propertyId ||
    !sellerWallet ||
    !sharesListed ||
    pricePerShare == null
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (sharesListed <= 0 || pricePerShare <= 0) {
    return res.status(400).json({ error: "Share count and price must be positive" });
  }

  const [row] = await db
    .insert(onChainListingTable)
    .values({
      onChainListingId: Number(onChainListingId),
      propertyId: Number(propertyId),
      sellerWallet: String(sellerWallet).toLowerCase(),
      sharesListed: Number(sharesListed),
      sharesRemaining: Number(sharesListed),
      pricePerShare: Number(pricePerShare),
      active: true,
      createTxHash: createTxHash ?? null,
    })
    .onConflictDoUpdate({
      target: onChainListingTable.onChainListingId,
      set: {
        sharesListed: Number(sharesListed),
        sharesRemaining: Number(sharesListed),
        pricePerShare: Number(pricePerShare),
        active: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  return res.status(201).json(row);
});

router.post("/on-chain/:onChainListingId/fill", async (req, res) => {
  const onChainListingId = Number(req.params.onChainListingId);
  const { shareCount, buyerWallet, txHash } = req.body ?? {};
  if (!onChainListingId || !shareCount || shareCount <= 0) {
    return res.status(400).json({ error: "shareCount required" });
  }

  const [listing] = await db
    .select()
    .from(onChainListingTable)
    .where(eq(onChainListingTable.onChainListingId, onChainListingId));
  if (!listing) {
    return res.status(404).json({ error: "On-chain listing not tracked yet" });
  }
  if (!listing.active || listing.sharesRemaining <= 0) {
    return res.status(400).json({ error: "Listing is sold out" });
  }

  const nextRemaining = Math.max(0, listing.sharesRemaining - Number(shareCount));
  const [updated] = await db
    .update(onChainListingTable)
    .set({
      sharesRemaining: nextRemaining,
      active: nextRemaining > 0,
      updatedAt: new Date(),
    })
    .where(eq(onChainListingTable.onChainListingId, onChainListingId))
    .returning();

  return res.json({
    ...updated,
    buyerWallet: buyerWallet ? String(buyerWallet).toLowerCase() : null,
    txHash: txHash ?? null,
  });
});

router.post("/on-chain/:onChainListingId/cancel", async (req, res) => {
  const onChainListingId = Number(req.params.onChainListingId);
  const { sellerWallet } = req.body ?? {};
  if (!onChainListingId || !sellerWallet) {
    return res.status(400).json({ error: "sellerWallet required" });
  }

  const [listing] = await db
    .select()
    .from(onChainListingTable)
    .where(eq(onChainListingTable.onChainListingId, onChainListingId));
  if (!listing) {
    return res.status(404).json({ error: "On-chain listing not tracked yet" });
  }
  if (listing.sellerWallet !== String(sellerWallet).toLowerCase()) {
    return res.status(403).json({ error: "Not your listing" });
  }

  const [updated] = await db
    .update(onChainListingTable)
    .set({
      sharesRemaining: 0,
      active: false,
      updatedAt: new Date(),
    })
    .where(eq(onChainListingTable.onChainListingId, onChainListingId))
    .returning();

  return res.json(updated);
});

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(shareListingTable)
    .where(eq(shareListingTable.status, "active"))
    .orderBy(desc(shareListingTable.createdAt));
  return res.json(rows);
});

router.get("/mine/:wallet", async (req, res) => {
  const wallet = req.params.wallet.toLowerCase();
  const rows = await db
    .select()
    .from(shareListingTable)
    .where(eq(shareListingTable.sellerWallet, wallet))
    .orderBy(desc(shareListingTable.createdAt));
  return res.json(rows);
});

router.post("/", async (req, res) => {
  const { sellerWallet, propertyId, shareCount, pricePerShare } = req.body ?? {};
  if (!sellerWallet || !propertyId || !shareCount || !pricePerShare) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (shareCount <= 0 || pricePerShare <= 0) {
    return res.status(400).json({ error: "Share count and price must be positive" });
  }

  const [listing] = await db
    .insert(shareListingTable)
    .values({
      sellerWallet: String(sellerWallet).toLowerCase(),
      propertyId: Number(propertyId),
      shareCount: Number(shareCount),
      pricePerShare: Number(pricePerShare),
      status: "active",
    })
    .returning();

  return res.status(201).json(listing);
});

router.post("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const { sellerWallet } = req.body ?? {};
  if (!sellerWallet) return res.status(400).json({ error: "sellerWallet required" });

  const [listing] = await db.select().from(shareListingTable).where(eq(shareListingTable.id, id));
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.sellerWallet !== String(sellerWallet).toLowerCase()) {
    return res.status(403).json({ error: "Not your listing" });
  }
  if (listing.status !== "active") {
    return res.status(400).json({ error: "Listing is not active" });
  }

  const [updated] = await db
    .update(shareListingTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(shareListingTable.id, id))
    .returning();

  return res.json(updated);
});

router.post("/:id/buy", async (req, res) => {
  const id = Number(req.params.id);
  const { buyerWallet, paymentTxHash } = req.body ?? {};
  if (!buyerWallet) return res.status(400).json({ error: "buyerWallet required" });

  const [listing] = await db.select().from(shareListingTable).where(eq(shareListingTable.id, id));
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.status !== "active") {
    return res.status(400).json({ error: "Listing is not available" });
  }
  if (listing.sellerWallet === String(buyerWallet).toLowerCase()) {
    return res.status(400).json({ error: "Cannot buy your own listing" });
  }

  const [updated] = await db
    .update(shareListingTable)
    .set({
      status: "pending",
      buyerWallet: String(buyerWallet).toLowerCase(),
      paymentTxHash: paymentTxHash ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(shareListingTable.id, id), eq(shareListingTable.status, "active")))
    .returning();

  if (!updated) return res.status(409).json({ error: "Listing already taken" });
  return res.json(updated);
});

router.post("/:id/fulfill", async (req, res) => {
  const id = Number(req.params.id);
  const { sellerWallet, transferTxHash } = req.body ?? {};
  if (!sellerWallet || !transferTxHash) {
    return res.status(400).json({ error: "sellerWallet and transferTxHash required" });
  }

  const [listing] = await db.select().from(shareListingTable).where(eq(shareListingTable.id, id));
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.sellerWallet !== String(sellerWallet).toLowerCase()) {
    return res.status(403).json({ error: "Not your listing" });
  }
  if (listing.status !== "pending") {
    return res.status(400).json({ error: "Listing is not awaiting transfer" });
  }

  const [updated] = await db
    .update(shareListingTable)
    .set({
      status: "sold",
      transferTxHash,
      updatedAt: new Date(),
    })
    .where(eq(shareListingTable.id, id))
    .returning();

  return res.json(updated);
});

export default router;
