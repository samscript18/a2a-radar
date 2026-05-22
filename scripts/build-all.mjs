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
  const checks = [
    ["cargo", ["check", "--workspace"]],
    ["cargo", ["build", "--target", "wasm32v1-none", "--release", "-p", "a2a-radar-core-program", "-p", "a2a-radar-broadcast-program", "-p", "a2a-radar-market-program"]],
    ["npm", ["run", "idl:generate"]]
  ];
  for (const [cmd, args] of checks) {
    const result = spawnSync(cmd, args, { stdio: "inherit" });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
} else {
  console.log("cargo not found; skipped Rust/Sails build");
}
