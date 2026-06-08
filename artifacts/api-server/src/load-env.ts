import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

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

export function loadRootEnv(): void {
  const root = findRepoRoot(process.cwd());

  for (const name of [".ENV", ".env"]) {
    const file = path.join(root, name);
    if (existsSync(file)) {
      config({ path: file, override: true });
    }
  }

  const raw = process.env.DEPLOYER_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (raw) {
    const trimmed = raw.trim();
    process.env.DEPLOYER_PRIVATE_KEY = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  }
}

loadRootEnv();
