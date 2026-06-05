import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionEventTable = pgTable("transaction_event", {
  id: serial("id").primaryKey(),
  txHash: text("tx_hash").notNull(),
  eventType: text("event_type").notNull(), // Purchase | Transfer | DividendDistribution | CapRejected
  blockNumber: integer("block_number").notNull(),
  walletAddress: text("wallet_address"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionEventSchema = createInsertSchema(transactionEventTable).omit({ id: true, createdAt: true });
export type InsertTransactionEvent = z.infer<typeof insertTransactionEventSchema>;
export type TransactionEvent = typeof transactionEventTable.$inferSelect;
