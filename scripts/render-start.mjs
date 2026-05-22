import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const walletName = process.env.VARA_WALLET_NAME ?? "a2a-radar-render";
const passphrase = process.env.VARA_WALLET_PASSPHRASE;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    const details = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`${command} ${args.join(" ")} failed${details ? `: ${details}` : ""}`);
  }

  return result.stdout ?? "";
}

function walletExists() {
  const out = run("vara-wallet", ["--json", "wallet", "list"], { capture: true });
  const wallets = JSON.parse(out);
  return Array.isArray(wallets) && wallets.some((wallet) => wallet.name === walletName);
}

function importArgsFromEnv() {
  if (process.env.OPERATOR_KEYRING_JSON_PATH) {
    return ["--json", process.env.OPERATOR_KEYRING_JSON_PATH];
  }

  if (process.env.OPERATOR_KEYRING_JSON_B64) {
    const path = resolve(process.cwd(), ".render-secrets", "operator-keyring.json");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(process.env.OPERATOR_KEYRING_JSON_B64, "base64"));
    return ["--json", path];
  }

  if (process.env.OPERATOR_SEED) {
    return ["--seed", process.env.OPERATOR_SEED];
  }

  if (process.env.OPERATOR_MNEMONIC) {
    return ["--mnemonic", process.env.OPERATOR_MNEMONIC];
  }

  return undefined;
}

if (!existsSync("package.json")) {
  throw new Error("render-start must be run from the a2a-radar repo root.");
}

if (!walletExists()) {
  const importArgs = importArgsFromEnv();
  if (!importArgs) {
    throw new Error("Missing operator wallet secret. Set OPERATOR_KEYRING_JSON_PATH, OPERATOR_KEYRING_JSON_B64, OPERATOR_SEED, or OPERATOR_MNEMONIC in Render.");
  }

  const encryptionArgs = passphrase ? ["--passphrase", passphrase] : [];
  run("vara-wallet", ["wallet", "import", "--name", walletName, ...importArgs, ...encryptionArgs]);
}

run("vara-wallet", ["wallet", "default", walletName]);
run("npm", ["run", "api:start"]);
