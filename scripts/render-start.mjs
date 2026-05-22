import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const walletName = process.env.VARA_WALLET_NAME ?? "a2a-radar-render";
const passphrase = process.env.VARA_WALLET_PASSPHRASE;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
    input: options.input
  });

  if (result.status !== 0) {
    if (options.capture && result.stderr) {
      process.stderr.write(result.stderr);
    }
    const details = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`${command} ${args.join(" ")} failed${details ? `: ${details}` : ""}`);
  }

  return result.stdout ?? "";
}

function getWalletList() {
  const out = run("vara-wallet", ["--json", "wallet", "list"], { capture: true });
  const wallets = JSON.parse(out);
  return Array.isArray(wallets) ? wallets : [];
}

function walletExists(wallets) {
  return wallets.some((wallet) => wallet.name === walletName);
}

function walletIsDefault(wallets) {
  return wallets.some((wallet) => wallet.name === walletName && wallet.isDefault);
}

function detectJsonImportMode() {
  const help = run("vara-wallet", ["wallet", "import", "--help"], { capture: true });
  if (help.includes("--json <path>")) return { mode: "path", flag: "--json" };
  if (help.includes("--json-file <path>")) return { mode: "path", flag: "--json-file" };
  if (help.includes("--keystore <path>")) return { mode: "path", flag: "--keystore" };
  if (help.includes("--file <path>")) return { mode: "path", flag: "--file" };
  if (help.includes("--stdin")) return { mode: "stdin", flag: "--stdin" };
  return { mode: "unsupported", flag: null };
}

function readKeyringJson(path) {
  const raw = readFileSync(path, "utf8");
  JSON.parse(raw);
  return raw;
}

function importArgsFromEnv() {
  if (process.env.OPERATOR_KEYRING_JSON_PATH) {
    const keyringJson = readKeyringJson(process.env.OPERATOR_KEYRING_JSON_PATH);
    const mode = detectJsonImportMode();
    if (mode.mode === "path" && mode.flag) {
      return { kind: "keyring-path", args: [mode.flag, process.env.OPERATOR_KEYRING_JSON_PATH] };
    }
    if (mode.mode === "stdin" && mode.flag) {
      return { kind: "keyring-stdin", args: [mode.flag], input: keyringJson };
    }
    if (mode.mode === "unsupported") {
      throw new Error("wallet import does not support JSON keystore paths in this vara-wallet build.");
    }
  }

  if (process.env.OPERATOR_KEYRING_JSON_B64) {
    const path = resolve(process.cwd(), ".render-secrets", "operator-keyring.json");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(process.env.OPERATOR_KEYRING_JSON_B64, "base64"));
    const keyringJson = readKeyringJson(path);
    const mode = detectJsonImportMode();
    if (mode.mode === "path" && mode.flag) {
      return { kind: "keyring-path", args: [mode.flag, path] };
    }
    if (mode.mode === "stdin" && mode.flag) {
      return { kind: "keyring-stdin", args: [mode.flag], input: keyringJson };
    }
    if (mode.mode === "unsupported") {
      throw new Error("wallet import does not support JSON keystore paths in this vara-wallet build.");
    }
  }

  if (process.env.OPERATOR_SEED) {
    return { kind: "seed", args: ["--seed", process.env.OPERATOR_SEED] };
  }

  if (process.env.OPERATOR_MNEMONIC) {
    return { kind: "mnemonic", args: ["--mnemonic", process.env.OPERATOR_MNEMONIC] };
  }

  return undefined;
}

if (!existsSync("package.json")) {
  throw new Error("render-start must be run from the a2a-radar repo root.");
}

const walletsBefore = getWalletList();
console.log(`Wallet exists: ${walletExists(walletsBefore)}`);

if (!walletExists(walletsBefore)) {
  const importConfig = importArgsFromEnv();
  if (!importConfig) {
    throw new Error("Missing operator wallet secret. Set OPERATOR_KEYRING_JSON_PATH, OPERATOR_KEYRING_JSON_B64, OPERATOR_SEED, or OPERATOR_MNEMONIC in Render.");
  }

  console.log(`Wallet import mode: ${importConfig.kind}`);

  const encryptionArgs = passphrase ? ["--passphrase", passphrase] : [];
  run(
    "vara-wallet",
    ["wallet", "import", "--name", walletName, ...importConfig.args, ...encryptionArgs],
    { capture: true, input: importConfig.input }
  );

  const walletsAfter = getWalletList();
  if (!walletExists(walletsAfter)) {
    throw new Error("Wallet import completed, but wallet does not appear in wallet list.");
  }
}

run("vara-wallet", ["wallet", "default", walletName]);
const walletsFinal = getWalletList();
if (!walletExists(walletsFinal)) {
  throw new Error("Default wallet set, but wallet does not appear in wallet list.");
}
if (!walletIsDefault(walletsFinal)) {
  throw new Error("Wallet exists, but is not marked as default after setting.");
}
run("npm", ["run", "api:start"]);
