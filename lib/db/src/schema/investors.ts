import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investorTable = pgTable("investor", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  displayName: text("display_name"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investorDividendRecordTable = pgTable("investor_dividend_record", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull(),
  dividendRoundId: integer("dividend_round_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  status: text("status").notNull().default("eligible"), // eligible | excluded
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contractConfigTable = pgTable("contract_config", {
  id: serial("id").primaryKey(),
  contractAddress: text("contract_address").notNull(),
  paymentTokenAddress: text("payment_token_address"),
  paymentTokenSymbol: text("payment_token_symbol").default("tUSDC"),
  paymentTokenDecimals: integer("payment_token_decimals").default(6),
  networkId: integer("network_id").notNull(),
  networkName: text("network_name").notNull(),
  abi: text("abi").notNull(), // JSON stringified ABI
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvestorSchema = createInsertSchema(investorTable).omit({ id: true, createdAt: true });
export type InsertInvestor = z.infer<typeof insertInvestorSchema>;
export type Investor = typeof investorTable.$inferSelect;

export const insertInvestorDividendRecordSchema = createInsertSchema(investorDividendRecordTable).omit({ id: true, createdAt: true });
export type InsertInvestorDividendRecord = z.infer<typeof insertInvestorDividendRecordSchema>;
export type InvestorDividendRecord = typeof investorDividendRecordTable.$inferSelect;
