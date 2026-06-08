import { pgTable, text, timestamp, integer, doublePrecision, boolean } from "drizzle-orm/pg-core";

/** Tracks on-chain FCFS listing fill state for marketplace UI (amounts are encrypted on-chain). */
export const onChainListingTable = pgTable("on_chain_listing", {
  onChainListingId: integer("on_chain_listing_id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  sellerWallet: text("seller_wallet").notNull(),
  sharesListed: integer("shares_listed").notNull(),
  sharesRemaining: integer("shares_remaining").notNull(),
  pricePerShare: doublePrecision("price_per_share").notNull(),
  active: boolean("active").notNull().default(true),
  createTxHash: text("create_tx_hash"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type OnChainListing = typeof onChainListingTable.$inferSelect;
