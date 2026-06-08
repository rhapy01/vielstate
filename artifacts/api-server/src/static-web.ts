import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import { logger } from "./lib/logger";

export function mountWebApp(app: Express): void {
  if (process.env.SERVE_WEB !== "true") return;

  const webRoot = path.resolve(__dirname, "../../shieldcap/dist/public");
  if (!existsSync(webRoot)) {
    logger.warn({ webRoot }, "SERVE_WEB enabled but frontend dist is missing — run pnpm build:demo first");
    return;
  }

  app.use(express.static(webRoot, { index: false }));

  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(webRoot, "index.html"));
  });

  logger.info({ webRoot }, "Serving ShieldCap frontend");
}
