import { spawnSync } from "node:child_process";

const commands = [
  ["rustc", ["--version"]],
  ["cargo", ["--version"]],
  ["cargo", ["check", "--workspace"]]
];

for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

