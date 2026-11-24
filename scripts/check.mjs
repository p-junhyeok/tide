import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

async function files(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries
        .filter(
          (e) => !["node_modules", ".data", ".git", "output"].includes(e.name),
        )
        .map((e) =>
          e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)],
        ),
    )
  ).flat();
}
let failed = false;
for (const file of (await files(".")).filter((f) => /\.(mjs|js)$/.test(f))) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (result.status !== 0) failed = true;
}
if (failed) process.exit(1);
console.log("All JavaScript modules passed syntax checks.");
