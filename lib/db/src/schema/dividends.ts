import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dividendRoundTable = pgTable("dividend_round", {
  id: serial("id").primaryKey(),
  roundNumber: integer("round_number").notNull(),
  totalDistributedUsd: doublePrecision("total_distributed_usd").notNull(),
  revenueUsd: doublePrecision("revenue_usd").notNull(),
  distributedAt: timestamp("distributed_at", { withTimezone: true }).notNull().defaultNow(),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("confirmed"), // pending | confirmed | failed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDividendRoundSchema = createInsertSchema(dividendRoundTable).omit({ id: true, createdAt: true });
export type InsertDividendRound = z.infer<typeof insertDividendRoundSchema>;
export type DividendRound = typeof dividendRoundTable.$inferSelect;
