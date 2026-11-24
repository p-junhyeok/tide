import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, executeWorkflow } from "../core/engine.mjs";
import {
  computeNextRun,
  validateScheduleConfig,
  runDueSchedules,
} from "../core/scheduler.mjs";
import { handleApi, executeAndPersist } from "../server/api.mjs";

const config = (overrides = {}) => ({
  name: "매일 상품 가격 갱신",
  workflowId: "wf-commerce",
  frequency: "daily",
  time: "09:00",
  daysOfWeek: [],
  timezone: "Asia/Seoul",
  enabled: true,
  ...overrides,
});
function memoryStore(initial = createInitialState()) {
  let state = structuredClone(initial);
  return {
    async read() {
      return structuredClone(state);
    },
    async write(value) {
      state = structuredClone(value);
    },
  };
}
function request(path, method = "GET", body) {
  return new Request(`http://localhost:4318${path}`, {
    method,
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}
function stateWithDueSchedules() {
  const state = createInitialState();
  state.schedules.push({
    id: "schedule-daily",
    ...config(),
    createdAt: "2026-11-23T00:00:00.000Z",
    updatedAt: "2026-11-23T00:00:00.000Z",
    nextRunAt: "2026-11-24T00:00:00.000Z",
    lastRunAt: null,
    lastRunId: null,
    lastError: null,
  });
  return state;
}

test("Seoul daily scheduling respects timezone, strict future boundary and date rollover", () => {
  assert.equal(
    computeNextRun(config(), "2026-11-23T23:59:59.000Z"),
    "2026-11-24T00:00:00.000Z",
  );
  assert.equal(
    computeNextRun(config(), "2026-11-24T00:00:00.000Z"),
    "2026-11-25T00:00:00.000Z",
  );
  assert.equal(
    computeNextRun(config({ time: "00:00" }), "2026-12-31T15:00:00.000Z"),
    "2027-01-01T15:00:00.000Z",
  );
  assert.equal(
    computeNextRun(
      config({ timezone: "UTC", time: "09:00" }),
      "2026-11-24T00:00:00.000Z",
    ),
    "2026-11-24T09:00:00.000Z",
  );
});

test("weekly schedules select only requested local weekdays including Sunday and next week", () => {
  const weekly = config({ frequency: "weekly", daysOfWeek: [1, 3] });
  assert.equal(
    computeNextRun(weekly, "2026-11-24T00:00:00.000Z"),
    "2026-11-25T00:00:00.000Z",
  );
  assert.equal(
    computeNextRun(
      config({ frequency: "weekly", daysOfWeek: [0] }),
      "2026-11-28T15:00:00.000Z",
    ),
    "2026-11-29T00:00:00.000Z",
  );
  assert.equal(
    computeNextRun(
      config({ frequency: "weekly", daysOfWeek: [2] }),
      "2026-11-24T00:00:00.000Z",
    ),
    "2026-12-01T00:00:00.000Z",
  );
  assert.deepEqual(
    validateScheduleConfig(
      config({ frequency: "weekly", daysOfWeek: [3, 1, 3] }),
    ).daysOfWeek,
    [1, 3],
  );
});

test("disabled schedules have no next run and invalid schedules are rejected", () => {
  assert.equal(
    computeNextRun(config({ enabled: false }), "2026-11-24T00:00:00.000Z"),
    null,
  );
  for (const override of [
    { time: "24:00" },
    { time: "9:00" },
    { time: "12:60" },
    { timezone: "America/New_York" },
    { frequency: "monthly" },
    { frequency: "weekly", daysOfWeek: [] },
    { frequency: "weekly", daysOfWeek: [7] },
    { frequency: "weekly", daysOfWeek: ["1"] },
    { enabled: "true" },
    { name: "" },
  ])
    assert.throws(() => validateScheduleConfig(config(override)));
  assert.throws(() => computeNextRun(config(), "invalid"), /기준 시각/);
});

test("due tick claims before execution and dispatches an occurrence exactly once across restart", async () => {
  const store = memoryStore(stateWithDueSchedules());
  let calls = 0;
  const execute = async (target, workflowId, metadata) => {
    calls++;
    assert.equal(
      (await target.read()).schedules[0].nextRunAt,
      "2026-11-25T00:00:00.000Z",
    );
    return executeAndPersist(target, workflowId, metadata);
  };
  const outcomes = await runDueSchedules(
    store,
    execute,
    "2026-11-24T00:00:15.000Z",
  );
  assert.equal(calls, 1);
  assert.equal(outcomes[0].status, "succeeded");
  const saved = await store.read();
  const run = saved.runs[0];
  assert.equal(run.trigger, "scheduled");
  assert.equal(run.scheduleId, "schedule-daily");
  assert.equal(run.scheduledFor, "2026-11-24T00:00:00.000Z");
  assert.equal(saved.schedules[0].lastRunId, run.id);
  assert.equal(saved.schedules[0].lastError, null);
  await runDueSchedules(store, execute, "2026-11-24T00:00:30.000Z");
  const restartedStore = memoryStore(await store.read());
  await runDueSchedules(restartedStore, execute, "2026-11-24T00:00:45.000Z");
  assert.equal(calls, 1);
  assert.equal((await restartedStore.read()).runs.length, 1);
});

test("overdue schedules coalesce missed intervals and paused schedules never dispatch", async () => {
  const initial = stateWithDueSchedules();
  initial.schedules[0].nextRunAt = "2026-11-01T00:00:00.000Z";
  initial.schedules.push({
    ...initial.schedules[0],
    id: "paused",
    enabled: false,
  });
  const store = memoryStore(initial);
  const outcomes = await runDueSchedules(
    store,
    executeAndPersist,
    "2026-11-24T00:00:15.000Z",
  );
  assert.equal(outcomes.length, 1);
  const saved = await store.read();
  assert.equal(saved.runs.length, 1);
  assert.equal(saved.runs[0].scheduledFor, "2026-11-01T00:00:00.000Z");
  assert.equal(saved.schedules[0].nextRunAt, "2026-11-25T00:00:00.000Z");
});

test("multiple independent schedules for one workflow both dispatch once", async () => {
  const initial = stateWithDueSchedules();
  initial.schedules.push({
    ...initial.schedules[0],
    id: "second-schedule",
    name: "두 번째 예약",
  });
  const store = memoryStore(initial);
  const outcomes = await runDueSchedules(
    store,
    executeAndPersist,
    "2026-11-24T00:00:15.000Z",
  );
  assert.equal(outcomes.length, 2);
  const saved = await store.read();
  assert.equal(saved.runs.length, 2);
  assert.notEqual(saved.schedules[0].lastRunId, saved.schedules[1].lastRunId);
  assert.equal(saved.datasets.length, 3);
});

test("failed scheduled quality checks preserve prior successful mart and expose last error", async () => {
  const initial = stateWithDueSchedules();
  initial.datasets = executeWorkflow(initial.workflows[0]).datasets;
  const previousMart = structuredClone(
    initial.datasets.find((item) => item.layer === "mart"),
  );
  initial.workflows[0].nodes.find(
    (node) => node.type === "quality",
  ).config.maxInvalidPercent = 0;
  const store = memoryStore(initial);
  await runDueSchedules(store, executeAndPersist, "2026-11-24T00:00:15.000Z");
  const saved = await store.read();
  assert.equal(saved.runs[0].status, "failed");
  assert.match(saved.schedules[0].lastError, /품질 검사 실패/);
  assert.deepEqual(
    saved.datasets.find((item) => item.layer === "mart"),
    previousMart,
  );
  assert.equal(saved.schedules[0].nextRunAt, "2026-11-25T00:00:00.000Z");
});

test("invalid workflow schedule records error and advances instead of looping", async () => {
  const initial = stateWithDueSchedules();
  initial.schedules[0].workflowId = "missing";
  const store = memoryStore(initial);
  const first = await runDueSchedules(
    store,
    executeAndPersist,
    "2026-11-24T00:00:15.000Z",
  );
  assert.match(first[0].error, /워크플로/);
  const saved = await store.read();
  assert.match(saved.schedules[0].lastError, /워크플로/);
  assert.equal(saved.schedules[0].nextRunAt, "2026-11-25T00:00:00.000Z");
  assert.deepEqual(
    await runDueSchedules(store, executeAndPersist, "2026-11-24T00:00:30.000Z"),
    [],
  );
});

test("API creates, edits, disables, enables and deletes per-workflow schedules", async () => {
  const store = memoryStore();
  const created = await handleApi(
    request("/api/schedules", "POST", config()),
    store,
  );
  assert.equal(created.status, 201);
  const schedule = await created.json();
  assert.ok(new Date(schedule.nextRunAt).getTime() > Date.now());
  const edited = await handleApi(
    request(`/api/schedules/${schedule.id}`, "PUT", {
      name: "매주 월수",
      frequency: "weekly",
      daysOfWeek: [1, 3],
      time: "14:30",
    }),
    store,
  );
  assert.equal(edited.status, 200);
  assert.deepEqual((await edited.json()).daysOfWeek, [1, 3]);
  const disabled = await handleApi(
    request(`/api/schedules/${schedule.id}/toggle`, "POST", { enabled: false }),
    store,
  );
  assert.equal((await disabled.json()).nextRunAt, null);
  assert.equal((await store.read()).schedules[0].enabled, false);
  const enabled = await handleApi(
    request(`/api/schedules/${schedule.id}/toggle`, "POST", { enabled: true }),
    store,
  );
  assert.ok((await enabled.json()).nextRunAt);
  const deleted = await handleApi(
    request(`/api/schedules/${schedule.id}`, "DELETE"),
    store,
  );
  assert.deepEqual(await deleted.json(), { deleted: true });
  assert.equal((await store.read()).schedules.length, 0);
});

test("schedule test runs are real but preserve next scheduled occurrence including paused schedules", async () => {
  const store = memoryStore();
  const create = await handleApi(
    request("/api/schedules", "POST", config()),
    store,
  );
  const schedule = await create.json();
  const response = await handleApi(
    request(`/api/schedules/${schedule.id}/run-now`, "POST"),
    store,
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.run.trigger, "schedule-test");
  assert.equal(result.run.scheduleId, schedule.id);
  assert.equal(result.schedule.nextRunAt, schedule.nextRunAt);
  assert.equal(result.schedule.lastRunId, result.run.id);
  await handleApi(
    request(`/api/schedules/${schedule.id}/toggle`, "POST", { enabled: false }),
    store,
  );
  const pausedResponse = await handleApi(
    request(`/api/schedules/${schedule.id}/run-now`, "POST"),
    store,
  );
  const paused = await pausedResponse.json();
  assert.equal(paused.run.status, "succeeded");
  assert.equal(paused.schedule.nextRunAt, null);
  assert.equal(paused.schedule.enabled, false);
});

test("API rejects malformed schedules, missing workflow and system-field overrides", async () => {
  const store = memoryStore();
  assert.equal(
    (
      await handleApi(
        request("/api/schedules", "POST", config({ workflowId: "missing" })),
        store,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await handleApi(
        request("/api/schedules", "POST", config({ time: "25:00" })),
        store,
      )
    ).status,
    400,
  );
  const created = await handleApi(
    request("/api/schedules", "POST", config()),
    store,
  );
  const schedule = await created.json();
  assert.equal(
    (
      await handleApi(
        request(`/api/schedules/${schedule.id}/toggle`, "POST", {
          enabled: "yes",
        }),
        store,
      )
    ).status,
    400,
  );
  const edited = await handleApi(
    request(`/api/schedules/${schedule.id}`, "PUT", {
      id: "other",
      nextRunAt: "2000-01-01T00:00:00Z",
      lastRunId: "spoofed",
    }),
    store,
  );
  const value = await edited.json();
  assert.equal(value.id, schedule.id);
  assert.equal(value.nextRunAt, schedule.nextRunAt);
  assert.equal(value.lastRunId, null);
  assert.equal(
    (await handleApi(request("/api/schedules/missing/run-now", "POST"), store))
      .status,
    404,
  );
});

test("old state exposes schedules array and manual runs carry trigger metadata", async () => {
  const initial = createInitialState();
  delete initial.schedules;
  const store = memoryStore(initial);
  const stateResponse = await handleApi(request("/api/state"), store);
  assert.deepEqual((await stateResponse.json()).schedules, []);
  const response = await handleApi(
    request("/api/workflows/wf-commerce/run", "POST"),
    store,
  );
  assert.equal((await response.json()).run.trigger, "manual");
  assert.deepEqual((await store.read()).schedules, []);
});

test("recorded history retains latest 1000 runs for calendar views", async () => {
  const initial = createInitialState();
  initial.runs = Array.from({ length: 1000 }, (_, i) => ({ id: `old-${i}` }));
  const store = memoryStore(initial);
  const result = await executeAndPersist(store, "wf-commerce");
  const saved = await store.read();
  assert.equal(saved.runs.length, 1000);
  assert.equal(saved.runs[0].id, result.run.id);
  assert.equal(saved.runs.at(-1).id, "old-998");
});
