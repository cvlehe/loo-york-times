import { spawnSync } from "node:child_process";

const checks = [
  ["Lint", ["run", "lint"]],
  ["Import planning", ["run", "test:import"]],
  ["Production build", ["run", "build"]],
  ["Database permissions", ["run", "verify:permissions"]],
  ["Review uniqueness and aggregates", ["run", "verify:reviews"]],
  ["Approval, rejection, and retry behavior", ["run", "verify:admin-review"]],
  ["Listing maintenance and review removal", ["run", "verify:maintenance"]],
  ["Administrator article entry", ["run", "verify:articles"]],
];

const results = [];

for (const [name, args] of checks) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync("npm", args, {
    env: process.env,
    stdio: "inherit",
  });

  const status = result.error ? "error" : result.status === 0 ? "passed" : "failed";
  results.push({ name, status });
}

console.log("\n=== Task 17 verification summary ===");
for (const result of results) {
  console.log(`${result.status === "passed" ? "PASS" : "FAIL"}  ${result.name}`);
}

const failed = results.filter(({ status }) => status !== "passed");
if (failed.length > 0) {
  console.error(`\n${failed.length} verification check${failed.length === 1 ? "" : "s"} failed.`);
  process.exitCode = 1;
}
