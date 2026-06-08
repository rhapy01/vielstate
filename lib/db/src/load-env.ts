import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

function normalizePrivateKey(key: string): string {
  const trimmed = key.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function applyDeployerKeyAliases(): void {
  const raw = process.env.DEPLOYER_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (!raw) return;

  process.env.DEPLOYER_PRIVATE_KEY = normalizePrivateKey(raw);
}

let loaded = false;

/** Load `.ENV` / `.env` from the monorepo root (first import wins). */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = findRepoRoot(path.resolve(here, "../.."));

  for (const name of [".ENV", ".env"]) {
    const file = path.join(root, name);
    if (existsSync(file)) {
      config({ path: file, override: false });
    }
  }

  applyDeployerKeyAliases();
}

loadEnv();
