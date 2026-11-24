import assert from "node:assert/strict";

const origin = process.env.TIDE_BASE_URL || "http://127.0.0.1:4318";
async function api(path, method = "GET", body) {
  const response = await fetch(`${origin}/api${path}`, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${JSON.stringify(result)}`);
  return result;
}
const state = await api("/state");
const workflow = state.workflows.find((w) => w.id === "wf-commerce");
assert.ok(workflow, "Fresh sample workspace must exist");
const result = await api(`/workflows/${workflow.id}/run`, "POST", {});
assert.equal(result.run.status, "succeeded");
assert.equal(result.run.trigger, "manual");
assert.equal(
  result.datasets.find((d) => d.id === `${workflow.id}-raw`).rowCount,
  99,
);
assert.equal(
  result.datasets.find((d) => d.id === `${workflow.id}-staging`).rowCount,
  96,
);
assert.equal(
  result.datasets.find((d) => d.id === `${workflow.id}-mart`).rowCount,
  12,
);
const answer = await api("/chat", "POST", {
  question: "평균 가격은 얼마야?",
  workflowId: workflow.id,
});
assert.equal(answer.mode, "data-tool");
assert.equal(answer.rows[0].average_price, 42083);
assert.equal(answer.sources[0].runId, result.run.id);
let schedule;
try {
  schedule = await api("/schedules", "POST", {
    name: "Container smoke test",
    workflowId: workflow.id,
    frequency: "daily",
    time: "09:00",
    timezone: "Asia/Seoul",
    enabled: false,
  });
  assert.equal(schedule.nextRunAt, null);
  const scheduled = await api(`/schedules/${schedule.id}/run-now`, "POST", {});
  assert.equal(scheduled.run.status, "succeeded");
  assert.equal(scheduled.run.trigger, "schedule-test");
  const persisted = await api("/state");
  assert.equal(
    persisted.schedules.find((s) => s.id === schedule.id).lastRunId,
    scheduled.run.id,
  );
  assert.equal(
    persisted.datasets.find((d) => d.id === `${workflow.id}-mart`).rowCount,
    12,
  );
} finally {
  if (schedule) await api(`/schedules/${schedule.id}`, "DELETE");
}
const health = await fetch(`${origin}/health`, {
  signal: AbortSignal.timeout(3000),
});
assert.equal(health.status, 200);
assert.equal((await health.json()).status, "ok");
console.log(
  "PASS: container HTTP, sample pipeline 99 → 96 → 12, data provenance, persistent schedule and immediate execution.",
);
