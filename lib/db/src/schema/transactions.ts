import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionEventTable = pgTable("transaction_event", {
  id: serial("id").primaryKey(),
  txHash: text("tx_hash").notNull().unique(),
  eventType: text("event_type").notNull(), // Purchase | Transfer | DividendDistribution | CapRejected
  blockNumber: integer("block_number").notNull(),
  walletAddress: text("wallet_address"),
  /** Plaintext share count for primary Purchase events (off-chain activity feed). */
  shareCount: integer("share_count"),
  propertyId: integer("property_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionEventSchema = createInsertSchema(transactionEventTable).omit({ id: true, createdAt: true });
export type InsertTransactionEvent = z.infer<typeof insertTransactionEventSchema>;
export type TransactionEvent = typeof transactionEventTable.$inferSelect;
