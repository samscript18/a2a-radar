import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const agents = {
	core: {
		key: "core",
		manifestKey: "radarCore",
		handle: "a2a-radar-core",
		rawWasm: "target/wasm32v1-none/wasm32-gear/release/a2a_radar_core_program.wasm",
		wasm: "target/wasm32v1-none/wasm32-gear/release/a2a_radar_core_program.opt.wasm",
		idl: "artifacts/idl/a2a_radar_core_program.idl",
		register: "deploy/templates/register-core.json",
		skills: "deploy/skills/a2a-radar-core.md",
		deployIdl: "deploy/idl/a2a_radar_core_program.idl",
	},
	broadcast: {
		key: "broadcast",
		manifestKey: "radarBroadcast",
		handle: "a2a-radar-broadcast",
		rawWasm: "target/wasm32v1-none/wasm32-gear/release/a2a_radar_broadcast_program.wasm",
		wasm: "target/wasm32v1-none/wasm32-gear/release/a2a_radar_broadcast_program.opt.wasm",
		idl: "artifacts/idl/a2a_radar_broadcast_program.idl",
		register: "deploy/templates/register-broadcast.json",
		skills: "deploy/skills/a2a-radar-broadcast.md",
		deployIdl: "deploy/idl/a2a_radar_broadcast_program.idl",
	},
	market: {
		key: "market",
		manifestKey: "radarMarket",
		handle: "a2a-radar-market",
		rawWasm: "target/wasm32v1-none/wasm32-gear/release/a2a_radar_market_program.wasm",
		wasm: "target/wasm32v1-none/wasm32-gear/release/a2a_radar_market_program.opt.wasm",
		idl: "artifacts/idl/a2a_radar_market_program.idl",
		register: "deploy/templates/register-market.json",
		skills: "deploy/skills/a2a-radar-market.md",
		deployIdl: "deploy/idl/a2a_radar_market_program.idl",
	},
};

const VARA_WALLET_PATCHED_PATH = join("tools", "vara-wallet-patched", "vara-wallet.cjs");

function resolveCommand(cmd, args) {
	if (cmd !== "vara-wallet") return { cmd, args };
	if (existsSync(VARA_WALLET_PATCHED_PATH)) {
		return { cmd: process.execPath, args: [VARA_WALLET_PATCHED_PATH, ...args] };
	}
	return { cmd, args };
}

export function run(cmd, args, options = {}) {
	const resolved = resolveCommand(cmd, args);
	const result = spawnSync(resolved.cmd, resolved.args, {
		encoding: "utf8",
		stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
		env: { ...process.env, ...options.env },
	});
	if (result.status !== 0) {
		if (options.capture) {
			process.stderr.write(result.stderr ?? "");
			process.stdout.write(result.stdout ?? "");
		}
		throw new Error(`${cmd} ${args.join(" ")} failed`);
	}
	return result.stdout ?? "";
}

export function varaWalletArgs(args = []) {
	const prefix = [];
	if (process.env.ACCT) prefix.push("--account", process.env.ACCT);
	if (process.env.VARA_NETWORK) prefix.push("--network", process.env.VARA_NETWORK);
	return [...prefix, ...args];
}

export function withVoucher(args = []) {
	const voucher = process.env.VOUCHER_ID ?? readJson("artifacts/deploy/voucher.json", {}).voucherId;
	return voucher ? [...args, "--voucher", voucher] : args;
}

export function requireVoucher() {
	const voucher = process.env.VOUCHER_ID ?? readJson("artifacts/deploy/voucher.json", {}).voucherId;
	if (!voucher) {
		throw new Error("Missing gas voucher. Run npm run voucher:claim before Registry/Board writes.");
	}
	return voucher;
}

export function runJson(cmd, args) {
	const finalArgs = cmd === "vara-wallet" ? ["--json", ...args] : [...args, "--json"];
	const out = run(cmd, finalArgs, { capture: true });
	try {
		return JSON.parse(out);
	} catch {
		const lines = out.trim().split("\n").filter(Boolean);
		return JSON.parse(lines.at(-1) ?? "{}");
	}
}

export function ensureFile(path) {
	if (!existsSync(path)) {
		throw new Error(`Missing required file: ${path}`);
	}
}

export function readJson(path, fallback = {}) {
	if (!existsSync(path)) return fallback;
	return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function programIdsPath() {
	return "artifacts/deploy/program-ids.json";
}

export function requireProgramIds() {
	const ids = readJson(programIdsPath(), {});
	const manifest = readJson("deploy/mainnet/programs.json", {});
	const resolved = {
		core: ids.core ?? manifest.radarCore?.programId ?? "0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503",
		broadcast: ids.broadcast ?? manifest.radarBroadcast?.programId ?? "0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a",
		market: ids.market ?? manifest.radarMarket?.programId ?? "0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176",
	};
	for (const key of ["core", "broadcast", "market"]) {
		if (!resolved[key]) {
			throw new Error(`Missing ${key} program id. Run npm run deploy:mainnet first.`);
		}
	}
	return resolved;
}

export function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing env ${name}`);
	}
	return value;
}

export function balanceRaw(wallet = readJson("artifacts/deploy/wallet-status.json", {})) {
	try {
		return BigInt(wallet.balanceRaw ?? "0");
	} catch {
		return 0n;
	}
}

export function isFundedForDeploy(wallet = readJson("artifacts/deploy/wallet-status.json", {})) {
	const minimum = BigInt(process.env.MIN_DEPLOY_BALANCE_RAW ?? "5000000000000");
	return balanceRaw(wallet) >= minimum;
}

export function sha256Hex(path) {
	ensureFile(path);
	return `0x${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

export function extractProgramId(output) {
	if (!output) return undefined;
	if (typeof output === "string") {
		const labeled = output.match(/(?:programId|program_id|Program ID|program id|id)[:=\s"]+(0x[a-fA-F0-9]{64})/);
		if (labeled) return labeled[1];
		const anyHex = output.match(/0x[a-fA-F0-9]{64}/);
		return anyHex?.[0];
	}
	const candidates = [output.programId, output.program_id, output.id, output.program?.id, output.result?.programId, output.result?.program_id];
	return candidates.find((value) => typeof value === "string" && value.length > 10);
}
