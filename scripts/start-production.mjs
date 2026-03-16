import { spawn } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env.local"), quiet: true });
loadEnv({ path: path.join(process.cwd(), ".env"), quiet: true });

if (!process.env.DATABASE_URL && process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  process.env.DATABASE_URL = `file:${path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "dev.db")}`;
}

if (!process.env.STORAGE_ROOT && process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  process.env.STORAGE_ROOT = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "storage");
}

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Script failed: ${scriptPath} (${code ?? "unknown"})`));
    });
  });
}

await runNodeScript(path.join(process.cwd(), "scripts", "db-push.mjs"));

const port = process.env.PORT || "3000";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const nextProcess = spawn(process.execPath, [nextCli, "start", "-H", hostname, "-p", port], {
  stdio: "inherit",
  env: process.env,
});

nextProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});
