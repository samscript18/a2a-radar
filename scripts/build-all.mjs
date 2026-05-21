import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "check"]],
  ["npm", ["test"]],
  ["npm", ["exec", "--workspace", "@a2a-radar/dashboard", "--", "next", "build"]]
];

for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const cargo = spawnSync("cargo", ["--version"], { stdio: "ignore" });
if (cargo.status === 0) {
  const result = spawnSync("cargo", ["build", "--workspace", "--release"], { stdio: "inherit" });
  process.exit(result.status ?? 0);
} else {
  console.log("cargo not found; skipped Rust/Sails build");
}

