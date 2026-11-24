import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  validateWorkflow,
  executeWorkflow,
  answerQuestion,
} from "../core/engine.mjs";
import { handleApi, fetchPublicRecords } from "../server/api.mjs";

const workflow = () => createInitialState().workflows[0];
const row = (overrides = {}) => ({
  sku: "SKU-TEST",
  name: "테스트 상품",
  category: "리빙",
  price: 12000,
  previous_price: 10000,
  date: "2026-11-24",
  ...overrides,
});
function upload(records) {
  const value = workflow();
  value.nodes.find((node) => node.type === "source").config = {
    mode: "upload",
    records,
  };
  return value;
}
function memoryStore() {
  let state = createInitialState();
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

test("sample executes six real tasks and creates raw, staging and mart records", () => {
  const result = executeWorkflow(workflow());
  assert.equal(result.run.status, "succeeded");
  assert.equal(result.run.nodes.length, 6);
  assert.ok(
    result.run.nodes.every(
      (node) => node.status === "succeeded" && node.logs.length,
    ),
  );
  assert.equal(
    result.datasets.find((dataset) => dataset.layer === "raw").rowCount,
    99,
  );
  assert.equal(
    result.datasets.find((dataset) => dataset.layer === "staging").rowCount,
    96,
  );
  assert.equal(
    result.datasets.find((dataset) => dataset.layer === "mart").rowCount,
    12,
  );
  assert.equal(result.run.summary.invalidRows, 1);
  assert.equal(result.run.summary.duplicateRows, 2);
  assert.equal(result.run.summary.outputRows, 12);
  assert.equal(
    result.datasets.find((dataset) => dataset.layer === "mart").rows[0].date,
    "2026-11-24",
  );
  assert.match(result.run.nodes.at(-1).logs[0], /아직 연결하지/);
});

test("rerun replaces dataset versions without duplicate tables or records and keeps old snapshot immutable", () => {
  const value = upload([
    row(),
    row(),
    row({ date: "2026-11-23", price: 11000 }),
  ]);
  const first = executeWorkflow(value);
  const second = executeWorkflow(value, first.datasets);
  assert.equal(second.datasets.length, 3);
  assert.equal(
    second.datasets.find((dataset) => dataset.layer === "raw").rowCount,
    3,
  );
  assert.equal(
    second.datasets.find((dataset) => dataset.layer === "staging").rowCount,
    2,
  );
  const mart = second.datasets.find((dataset) => dataset.layer === "mart");
  assert.equal(mart.rowCount, 1);
  assert.equal(mart.rows[0].change_percent, 20);
  assert.notEqual(first.run.id, second.run.id);
  value.name = "변경한 이름";
  assert.notEqual(first.run.workflowSnapshot.name, value.name);
  assert.equal(
    first.datasets.find((dataset) => dataset.layer === "mart").runId,
    first.run.id,
  );
});

test("quality failure skips consumers and preserves the previous successful mart", () => {
  const first = executeWorkflow(workflow());
  const value = upload([row(), row({ sku: "BAD", price: -5 })]);
  const second = executeWorkflow(value, first.datasets);
  assert.equal(second.run.status, "failed");
  assert.equal(
    second.run.nodes.find((node) => node.type === "quality").status,
    "failed",
  );
  assert.equal(
    second.run.nodes.find((node) => node.type === "mart").status,
    "skipped",
  );
  assert.equal(
    second.run.nodes.find((node) => node.type === "assistant").status,
    "skipped",
  );
  assert.deepEqual(
    second.datasets.find((dataset) => dataset.layer === "mart"),
    first.datasets.find((dataset) => dataset.layer === "mart"),
  );
});

test("invalid dates and missing prices are rejected by transformation, not silently changed", () => {
  const result = executeWorkflow(
    upload([row({ date: "2026-02-30" }), row({ price: null })]),
  );
  assert.equal(result.run.status, "failed");
  assert.equal(result.run.summary.invalidRows, 2);
  assert.equal(
    result.datasets.find((dataset) => dataset.layer === "staging").rowCount,
    0,
  );
});

test("cycles, orphan tasks and bypassing quality are rejected before execution", () => {
  const cycle = workflow();
  cycle.edges.push({ source: "node-assistant", target: "node-source" });
  assert.throws(() => validateWorkflow(cycle), /순환/);
  const orphan = workflow();
  orphan.edges = orphan.edges.filter(
    (edge) => edge.target !== "node-transform",
  );
  assert.throws(() => validateWorkflow(orphan), /순서/);
  const bypass = workflow();
  bypass.edges = bypass.edges.map((edge) =>
    edge.target === "node-mart"
      ? { source: "node-transform", target: edge.target }
      : edge,
  );
  assert.throws(() => validateWorkflow(bypass), /순서/);
});

test("invalid upload inputs and quality settings fail validation", () => {
  for (const records of [
    [],
    [null],
    ["not an object"],
    {},
    Array.from({ length: 10001 }, () => row()),
  ])
    assert.throws(() => executeWorkflow(upload(records)), /JSON 배열/);
  const value = workflow();
  value.nodes.find((node) => node.type === "quality").config.maxInvalidPercent =
    "10";
  assert.throws(() => validateWorkflow(value), /0~100/);
});

test("data tool reads actual marts, gives evidence, and refuses unsupported questions", () => {
  const state = createInitialState();
  assert.throws(() => answerQuestion(state, "평균 가격"), /먼저 워크플로/);
  const result = executeWorkflow(
    upload([row(), row({ sku: "SECOND", name: "다른 상품", price: 8000 })]),
  );
  state.datasets = result.datasets;
  const average = answerQuestion(state, "평균 가격을 알려줘");
  assert.equal(average.mode, "data-tool");
  assert.equal(average.rows[0].average_price, 10000);
  assert.match(average.answer, /10,000원/);
  assert.equal(average.sources[0].runId, result.run.id);
  assert.equal(answerQuestion(state, "가격이 오른 상품").rows.length, 1);
  assert.equal(answerQuestion(state, "가격이 내린 상품").rows.length, 1);
  assert.equal(
    answerQuestion(state, "카테고리별 요약").rows[0].product_count,
    2,
  );
  assert.throws(
    () => answerQuestion(state, "내일의 날씨"),
    /현재 데이터 조회 도구/,
  );
  assert.throws(
    () => answerQuestion(state, "평균", "other-workflow"),
    /마트가 없습니다/,
  );
});

test("API persists execution and answers from its output", async () => {
  const store = memoryStore();
  const runResponse = await handleApi(
    request("/api/workflows/wf-commerce/run", "POST"),
    store,
  );
  assert.equal(runResponse.status, 200);
  const result = await runResponse.json();
  assert.equal(result.run.status, "succeeded");
  const stateResponse = await handleApi(request("/api/state"), store);
  const state = await stateResponse.json();
  assert.equal(state.runs[0].id, result.run.id);
  assert.equal(state.datasets.length, 3);
  const chat = await handleApi(
    request("/api/chat", "POST", { question: "상품 몇 개야?" }),
    store,
  );
  assert.equal(chat.status, 200);
  assert.equal((await chat.json()).rows.length, 12);
});

test("API workflow save validates structure and preserves server identity", async () => {
  const store = memoryStore();
  const value = workflow();
  value.name = "업로드 워크플로";
  value.id = "spoofed-id";
  const saved = await handleApi(
    request("/api/workflows/wf-commerce", "PUT", value),
    store,
  );
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).id, "wf-commerce");
  value.edges = [];
  const invalid = await handleApi(
    request("/api/workflows/wf-commerce", "PUT", value),
    store,
  );
  assert.equal(invalid.status, 400);
  assert.ok((await invalid.json()).error);
  assert.equal((await store.read()).workflows[0].name, "업로드 워크플로");
});

test("API creates independent template workflows and exports state", async () => {
  const store = memoryStore();
  const response = await handleApi(
    request("/api/workflows", "POST", { name: "새 프로젝트" }),
    store,
  );
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.notEqual(created.id, "wf-commerce");
  assert.equal(created.nodes.length, 6);
  const exportResponse = await handleApi(request("/api/export"), store);
  assert.equal(exportResponse.status, 200);
  assert.equal((await exportResponse.json()).workflows.length, 2);
});

test("cloud config is never misrepresented as a tested live connection", async () => {
  const store = memoryStore();
  const response = await handleApi(
    request("/api/connections", "POST", {
      name: "AWS 개발",
      type: "aws",
      region: "ap-northeast-2",
    }),
    store,
  );
  const connection = await response.json();
  assert.equal(connection.status, "configured");
  const tested = await handleApi(
    request(`/api/connections/${connection.id}/test`, "POST"),
    store,
  );
  const result = await tested.json();
  assert.equal(result.status, "unsupported");
  assert.match(result.error, /아직 지원하지/);
  const credential = await handleApi(
    request("/api/connections", "POST", {
      name: "AWS",
      type: "aws",
      accessKey: "do-not-store",
    }),
    store,
  );
  assert.equal(credential.status, 400);
  assert.equal((await store.read()).connections.length, 1);
});

test("HTTP connections really test the configured URL and reject local addresses", async () => {
  const store = memoryStore();
  const response = await handleApi(
    request("/api/connections", "POST", {
      name: "로컬 접근 금지",
      type: "http",
      url: "https://localhost/data",
    }),
    store,
  );
  const connection = await response.json();
  const tested = await handleApi(
    request(`/api/connections/${connection.id}/test`, "POST"),
    store,
  );
  assert.equal((await tested.json()).status, "failed");
  for (const url of [
    "http://example.com",
    "https://127.0.0.1",
    "https://[::1]/",
    "https://example.com:444",
    "https://user:password@example.com/",
    "https://example.com?api_key=abc",
  ])
    await assert.rejects(fetchPublicRecords(url));
});

test("HTTP source failure is persisted as a failed run with skipped downstream tasks", async () => {
  const store = memoryStore();
  const value = workflow();
  value.nodes[0].config = { mode: "http", url: "https://localhost/data" };
  await handleApi(request("/api/workflows/wf-commerce", "PUT", value), store);
  const response = await handleApi(
    request("/api/workflows/wf-commerce/run", "POST"),
    store,
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.run.status, "failed");
  assert.equal(result.run.nodes[0].status, "failed");
  assert.ok(
    result.run.nodes.slice(1).every((node) => node.status === "skipped"),
  );
  assert.equal((await store.read()).runs[0].id, result.run.id);
});

test("unknown routes, malformed JSON, excessive body and cross-origin changes fail explicitly", async () => {
  const store = memoryStore();
  assert.equal((await handleApi(request("/api/unknown"), store)).status, 404);
  assert.equal(
    (await handleApi(request("/api/workflows/missing/run", "POST"), store))
      .status,
    404,
  );
  const malformed = new Request("http://localhost:4318/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid",
  });
  assert.equal((await handleApi(malformed, store)).status, 400);
  const oversized = request("/api/chat", "POST", {
    question: "x".repeat(1024 * 1024),
  });
  assert.equal((await handleApi(oversized, store)).status, 413);
  const foreign = new Request("http://localhost:4318/api/workflows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://other.example",
    },
    body: "{}",
  });
  assert.equal((await handleApi(foreign, store)).status, 403);
  assert.equal(await handleApi(request("/index.html"), store), null);
});
