import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shareListingTable = pgTable("share_listing", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  sellerWallet: text("seller_wallet").notNull(),
  shareCount: integer("share_count").notNull(),
  pricePerShare: doublePrecision("price_per_share").notNull(),
  status: text("status").notNull().default("active"),
  buyerWallet: text("buyer_wallet"),
  paymentTxHash: text("payment_tx_hash"),
  transferTxHash: text("transfer_tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertShareListingSchema = createInsertSchema(shareListingTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertShareListing = z.infer<typeof insertShareListingSchema>;
export type ShareListing = typeof shareListingTable.$inferSelect;
