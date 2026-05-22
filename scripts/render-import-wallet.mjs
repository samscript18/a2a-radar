import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const walletName = process.env.VARA_WALLET_NAME ?? "a2a-radar-render";
const passphrase = process.env.VARA_WALLET_PASSPHRASE;
const patchedWalletPath = resolve(process.cwd(), "tools", "vara-wallet-patched", "vara-wallet.cjs");
const usePatchedWallet = existsSync(patchedWalletPath);

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
		env: process.env,
		input: options.input,
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

function runWallet(args, options = {}) {
	if (usePatchedWallet) {
		return run(process.execPath, [patchedWalletPath, ...args], options);
	}
	return run("vara-wallet", args, options);
}

function getWalletList() {
	const out = runWallet(["--json", "wallet", "list"], { capture: true });
	const wallets = JSON.parse(out);
	return Array.isArray(wallets) ? wallets : [];
}

function walletExists(wallets) {
	return wallets.some((wallet) => wallet.name === walletName);
}

function walletIsDefault(wallets) {
	return wallets.some((wallet) => wallet.name === walletName && wallet.isDefault);
}

function detectImportSupport() {
	const help = runWallet(["wallet", "import", "--help"], { capture: true });
	const supportsName = help.includes("--name <name>");
	if (help.includes("--json <path>")) return { supportsName, jsonFlag: "--json", stdinFlag: null };
	if (help.includes("--json-file <path>")) return { supportsName, jsonFlag: "--json-file", stdinFlag: null };
	if (help.includes("--keystore <path>")) return { supportsName, jsonFlag: "--keystore", stdinFlag: null };
	if (help.includes("--file <path>")) return { supportsName, jsonFlag: "--file", stdinFlag: null };
	if (help.includes("--stdin")) return { supportsName, jsonFlag: null, stdinFlag: "--stdin" };
	return { supportsName, jsonFlag: null, stdinFlag: null };
}

function readKeyringJson(path) {
	const raw = readFileSync(path, "utf8");
	JSON.parse(raw);
	return raw;
}

function isImportArgError(errorMessage) {
	return /too many arguments|unexpected argument|unknown option/i.test(errorMessage);
}

function tryWalletImport(args, input) {
	try {
		runWallet(args, { capture: true, input });
		return true;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Wallet import failed: ${message}`);
		if (isImportArgError(message)) {
			return false;
		}
		throw error;
	}
}

function importArgsFromEnv() {
	if (process.env.OPERATOR_KEYRING_JSON_PATH) {
		const keyringJson = readKeyringJson(process.env.OPERATOR_KEYRING_JSON_PATH);
		const support = detectImportSupport();
		return {
			kind: "keyring",
			keyringJson,
			keyringPath: process.env.OPERATOR_KEYRING_JSON_PATH,
			support,
		};
	}

	if (process.env.OPERATOR_KEYRING_JSON_B64) {
		const path = resolve(process.cwd(), ".render-secrets", "operator-keyring.json");
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, Buffer.from(process.env.OPERATOR_KEYRING_JSON_B64, "base64"));
		const keyringJson = readKeyringJson(path);
		const support = detectImportSupport();
		return {
			kind: "keyring",
			keyringJson,
			keyringPath: path,
			support,
		};
	}

	if (process.env.OPERATOR_SEED) {
		return { kind: "seed", args: ["--seed", process.env.OPERATOR_SEED], support: detectImportSupport() };
	}

	if (process.env.OPERATOR_MNEMONIC) {
		return { kind: "mnemonic", args: ["--mnemonic", process.env.OPERATOR_MNEMONIC], support: detectImportSupport() };
	}

	return undefined;
}

if (!existsSync("package.json")) {
	throw new Error("render-import-wallet must be run from the a2a-radar repo root.");
}

console.log(`Wallet binary: ${usePatchedWallet ? patchedWalletPath : "vara-wallet"}`);

const walletsBefore = getWalletList();
console.log(`Wallet exists: ${walletExists(walletsBefore)}`);

if (!walletExists(walletsBefore)) {
	const importConfig = importArgsFromEnv();
	if (!importConfig) {
		throw new Error("Missing operator wallet secret. Set OPERATOR_KEYRING_JSON_PATH, OPERATOR_KEYRING_JSON_B64, OPERATOR_SEED, or OPERATOR_MNEMONIC in Render.");
	}

	const encryptionArgs = passphrase ? ["--passphrase", passphrase] : [];
	const nameArgs = importConfig.support?.supportsName ? ["--name", walletName] : [];
	const supportDetails = importConfig.support
		? `jsonFlag=${importConfig.support.jsonFlag ?? "none"}, stdinFlag=${importConfig.support.stdinFlag ?? "none"}, supportsName=${importConfig.support.supportsName}`
		: "unknown";
	console.log(`Wallet import support: ${supportDetails}`);

	if (importConfig.kind === "keyring") {
		const { support } = importConfig;
		console.log(`Keyring path present: ${existsSync(importConfig.keyringPath)}`);
		if (!support.jsonFlag && !support.stdinFlag) {
			throw new Error("wallet import does not support JSON keystore input in this vara-wallet build.");
		}

		if (support.jsonFlag) {
			console.log("Wallet import mode: keyring-path");
			const okWithName = tryWalletImport(["wallet", "import", ...nameArgs, support.jsonFlag, importConfig.keyringPath, ...encryptionArgs], undefined);
			const okWithoutName = okWithName || nameArgs.length === 0
				? okWithName
				: tryWalletImport(["wallet", "import", support.jsonFlag, importConfig.keyringPath, ...encryptionArgs], undefined);
			if (!okWithoutName) {
				console.log("Wallet import mode: keyring-stdin");
				const okJsonFlagStdin = tryWalletImport(["wallet", "import", ...nameArgs, support.jsonFlag, ...encryptionArgs], importConfig.keyringJson);
				const okJsonFlagStdinNoName = okJsonFlagStdin || nameArgs.length === 0
					? okJsonFlagStdin
					: tryWalletImport(["wallet", "import", support.jsonFlag, ...encryptionArgs], importConfig.keyringJson);
				if (!okJsonFlagStdinNoName) {
					if (!support.stdinFlag) {
						const okPlainStdin = tryWalletImport(
							["wallet", "import", ...nameArgs, ...encryptionArgs],
							importConfig.keyringJson,
						);
						const okPlainStdinNoName = okPlainStdin || nameArgs.length === 0
							? okPlainStdin
							: tryWalletImport(["wallet", "import", ...encryptionArgs], importConfig.keyringJson);
						if (!okPlainStdinNoName) {
							throw new Error("wallet import rejected the JSON path and does not advertise stdin support. Set OPERATOR_SEED or OPERATOR_MNEMONIC, or update vara-wallet.");
						}
					}
					const okStdinWithName = tryWalletImport(["wallet", "import", ...nameArgs, support.stdinFlag, ...encryptionArgs], importConfig.keyringJson);
					if (!okStdinWithName && nameArgs.length > 0) {
						runWallet(["wallet", "import", support.stdinFlag, ...encryptionArgs], { capture: true, input: importConfig.keyringJson });
					}
				}
			}
		} else {
			console.log("Wallet import mode: keyring-stdin");
			if (!support.stdinFlag) {
				throw new Error("wallet import does not advertise stdin support. Set OPERATOR_SEED or OPERATOR_MNEMONIC, or update vara-wallet.");
			}
			const okStdinWithName = tryWalletImport(["wallet", "import", ...nameArgs, support.stdinFlag, ...encryptionArgs], importConfig.keyringJson);
			if (!okStdinWithName && nameArgs.length > 0) {
				runWallet(["wallet", "import", support.stdinFlag, ...encryptionArgs], { capture: true, input: importConfig.keyringJson });
			}
		}
	} else {
		console.log(`Wallet import mode: ${importConfig.kind}`);
		runWallet(["wallet", "import", ...nameArgs, ...importConfig.args, ...encryptionArgs], { capture: true });
	}

	const walletsAfter = getWalletList();
	if (!walletExists(walletsAfter)) {
		throw new Error("Wallet import completed, but wallet does not appear in wallet list.");
	}
}

runWallet(["wallet", "default", walletName]);
const walletsFinal = getWalletList();
if (!walletExists(walletsFinal)) {
	throw new Error("Default wallet set, but wallet does not appear in wallet list.");
}
if (!walletIsDefault(walletsFinal)) {
	throw new Error("Wallet exists, but is not marked as default after setting.");
}
