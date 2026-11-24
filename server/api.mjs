import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  createInitialState,
  validateWorkflow,
  validateRecords,
  executeWorkflow,
  answerQuestion,
} from "../core/engine.mjs";
import {
  computeNextRun,
  validateScheduleConfig,
  recordScheduleResult,
} from "../core/scheduler.mjs";

const MAX_BODY = 1024 * 1024;
const json = (value, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });

async function boundedText(body) {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new Error("요청과 데이터는 1MB 이하로 입력하세요.");
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("Content-Type: application/json 형식으로 요청하세요.");
  let body;
  try {
    body = JSON.parse(await boundedText(request.body));
  } catch (error) {
    if (/1MB/.test(error.message)) throw error;
    throw new Error("올바른 JSON 요청을 입력하세요.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("요청 본문은 JSON 객체여야 합니다.");
  return body;
}

function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (family === 6) {
    const value = address.toLowerCase();
    return (
      !value.startsWith("::") &&
      !value.startsWith("fc") &&
      !value.startsWith("fd") &&
      !value.startsWith("fe8") &&
      !value.startsWith("fe9") &&
      !value.startsWith("fea") &&
      !value.startsWith("feb") &&
      !value.startsWith("ff")
    );
  }
  return false;
}

export async function fetchPublicRecords(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("올바른 HTTPS JSON API 주소를 입력하세요.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    !hostname.includes(".") ||
    isIP(hostname)
  )
    throw new Error(
      "공개 DNS 이름의 HTTPS 주소만 지원합니다. 로컬·IP 주소·인증 정보가 포함된 주소는 사용할 수 없습니다.",
    );
  if (
    [...url.searchParams.keys()].some((key) =>
      /token|secret|password|authorization|api.?key/i.test(key),
    )
  )
    throw new Error("비밀 정보가 포함된 URL은 저장하거나 사용할 수 없습니다.");
  const addresses = await lookup(hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some((item) => !isPublicAddress(item.address))
  )
    throw new Error("사설 네트워크 주소에는 연결할 수 없습니다.");
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`외부 API가 HTTP ${response.status} 상태를 반환했습니다.`);
  if (Number(response.headers.get("content-length") ?? 0) > MAX_BODY)
    throw new Error("외부 데이터는 1MB 이하만 지원합니다.");
  let payload;
  try {
    payload = JSON.parse(await boundedText(response.body));
  } catch (error) {
    if (/1MB/.test(error.message)) throw error;
    throw new Error("외부 API 응답이 올바른 JSON이 아닙니다.");
  }
  return validateRecords(Array.isArray(payload) ? payload : payload?.data);
}

function safeConnection(body) {
  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.length > 120
  )
    throw new Error("연결 이름을 1~120자로 입력하세요.");
  if (
    !["http", "aws", "gcp", "azure", "postgres", "s3", "local"].includes(
      body.type,
    )
  )
    throw new Error("지원하지 않는 연결 유형입니다.");
  if (
    Object.keys(body).some((key) =>
      /password|secret|token|credential|access.?key/i.test(key),
    )
  )
    throw new Error("첫 버전은 비밀 정보 저장을 지원하지 않습니다.");
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (
    url.length > 2048 ||
    (url && /(?:password|secret|token|api.?key)=/i.test(url))
  )
    throw new Error("URL에 비밀 정보를 포함하지 마세요.");
  if (url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("올바른 URL을 입력하세요.");
    }
    if (parsed.username || parsed.password)
      throw new Error("URL에 사용자 이름과 비밀번호를 포함하지 마세요.");
    if (body.type === "http" && parsed.protocol !== "https:")
      throw new Error("HTTPS 주소만 지원합니다.");
  }
  if (body.type === "http" && !url)
    throw new Error("HTTPS JSON API 주소를 입력하세요.");
  return {
    id: `conn-${crypto.randomUUID()}`,
    name: body.name.trim(),
    type: body.type,
    url,
    region: typeof body.region === "string" ? body.region.slice(0, 80) : "",
    status: "configured",
    createdAt: new Date().toISOString(),
  };
}

export async function executeAndPersist(
  store,
  workflowId,
  metadata = { trigger: "manual" },
) {
  const state = await store.read();
  const savedWorkflow = state.workflows.find((item) => item.id === workflowId);
  if (!savedWorkflow) throw new Error("실행할 워크플로를 찾을 수 없습니다.");
  const workflow = structuredClone(savedWorkflow);
  validateWorkflow(workflow);
  const source = workflow.nodes.find((node) => node.type === "source");
  let sourceError;
  if (source.config?.mode === "http") {
    try {
      source.config.records = await fetchPublicRecords(source.config.url);
    } catch (error) {
      sourceError =
        error.name === "TimeoutError"
          ? "외부 API 응답이 10초를 초과했습니다."
          : error.message;
    }
  }
  const result = executeWorkflow(workflow, state.datasets, { sourceError });
  result.run.trigger = metadata.trigger ?? "manual";
  if (metadata.scheduleId) result.run.scheduleId = metadata.scheduleId;
  if (metadata.scheduledFor) result.run.scheduledFor = metadata.scheduledFor;
  state.runs.unshift(result.run);
  state.runs = state.runs.slice(0, 1000);
  state.datasets = result.datasets;
  state.schedules ??= [];
  await store.write(state);
  return result;
}

export async function handleApi(request, store) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/")) return null;
  try {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin)
        return json(
          { error: "다른 사이트에서 실행한 변경 요청은 허용하지 않습니다." },
          403,
        );
    }
    const state = await store.read();
    state.schedules ??= [];
    if (request.method === "GET" && path === "/api/state") return json(state);
    if (request.method === "GET" && path === "/api/export")
      return json(
        { version: 1, exportedAt: new Date().toISOString(), ...state },
        200,
        { "Content-Disposition": 'attachment; filename="tide-workspace.json"' },
      );
    if (request.method === "POST" && path === "/api/workflows") {
      const body = await readJson(request);
      if (
        body.name != null &&
        (typeof body.name !== "string" ||
          !body.name.trim() ||
          body.name.length > 120)
      )
        throw new Error("워크플로 이름을 1~120자로 입력하세요.");
      const template =
        state.workflows.find((item) => item.id === body.templateId) ??
        createInitialState().workflows[0];
      const workflow = {
        ...structuredClone(template),
        id: `wf-${crypto.randomUUID()}`,
        name: body.name?.trim() || "새 데이터 워크플로",
        updatedAt: new Date().toISOString(),
      };
      state.workflows.push(workflow);
      await store.write(state);
      return json(workflow, 201);
    }
    const workflowMatch = path.match(/^\/api\/workflows\/([^/]+)(\/run)?$/);
    if (workflowMatch) {
      const index = state.workflows.findIndex(
        (item) => item.id === workflowMatch[1],
      );
      if (index < 0)
        return json({ error: "워크플로를 찾을 수 없습니다." }, 404);
      if (request.method === "PUT" && !workflowMatch[2]) {
        const body = await readJson(request);
        const workflow = {
          ...body,
          id: state.workflows[index].id,
          updatedAt: new Date().toISOString(),
        };
        validateWorkflow(workflow);
        state.workflows[index] = workflow;
        await store.write(state);
        return json(workflow);
      }
      if (request.method === "POST" && workflowMatch[2]) {
        return json(
          await executeAndPersist(store, state.workflows[index].id, {
            trigger: "manual",
          }),
        );
      }
    }
    if (request.method === "POST" && path === "/api/schedules") {
      const config = validateScheduleConfig(await readJson(request));
      if (
        !state.workflows.some((workflow) => workflow.id === config.workflowId)
      )
        return json({ error: "실행할 워크플로를 찾을 수 없습니다." }, 404);
      const timestamp = new Date().toISOString();
      const schedule = {
        id: `schedule-${crypto.randomUUID()}`,
        ...config,
        createdAt: timestamp,
        updatedAt: timestamp,
        nextRunAt: computeNextRun(config, timestamp),
        lastRunAt: null,
        lastRunId: null,
        lastError: null,
      };
      state.schedules.push(schedule);
      await store.write(state);
      return json(schedule, 201);
    }
    const scheduleMatch = path.match(
      /^\/api\/schedules\/([^/]+)(?:\/(toggle|run-now))?$/,
    );
    if (scheduleMatch) {
      const index = state.schedules.findIndex(
        (schedule) => schedule.id === scheduleMatch[1],
      );
      if (index < 0) return json({ error: "예약을 찾을 수 없습니다." }, 404);
      const schedule = state.schedules[index];
      const action = scheduleMatch[2];
      if (request.method === "PUT" && !action) {
        const body = await readJson(request);
        const config = validateScheduleConfig({
          ...schedule,
          ...Object.fromEntries(
            Object.entries(body).filter(([key]) =>
              [
                "name",
                "workflowId",
                "frequency",
                "time",
                "daysOfWeek",
                "timezone",
                "enabled",
              ].includes(key),
            ),
          ),
        });
        if (
          !state.workflows.some((workflow) => workflow.id === config.workflowId)
        )
          return json({ error: "실행할 워크플로를 찾을 수 없습니다." }, 404);
        const changed =
          ["frequency", "time", "timezone", "enabled"].some(
            (key) => config[key] !== schedule[key],
          ) ||
          JSON.stringify(config.daysOfWeek) !==
            JSON.stringify(schedule.daysOfWeek);
        Object.assign(schedule, config, {
          updatedAt: new Date().toISOString(),
        });
        if (changed) schedule.nextRunAt = computeNextRun(schedule);
        await store.write(state);
        return json(schedule);
      }
      if (request.method === "POST" && action === "toggle") {
        const body = await readJson(request);
        if (typeof body.enabled !== "boolean")
          throw new Error("활성화 여부를 true 또는 false로 입력하세요.");
        schedule.enabled = body.enabled;
        schedule.updatedAt = new Date().toISOString();
        schedule.nextRunAt = computeNextRun(schedule);
        await store.write(state);
        return json(schedule);
      }
      if (request.method === "POST" && action === "run-now") {
        try {
          const result = await executeAndPersist(store, schedule.workflowId, {
            trigger: "schedule-test",
            scheduleId: schedule.id,
          });
          await recordScheduleResult(store, schedule.id, result, null);
          const latest = await store.read();
          return json({
            ...result,
            schedule: latest.schedules.find((item) => item.id === schedule.id),
          });
        } catch (error) {
          await recordScheduleResult(store, schedule.id, null, error);
          throw error;
        }
      }
      if (request.method === "DELETE" && !action) {
        state.schedules.splice(index, 1);
        await store.write(state);
        return json({ deleted: true });
      }
    }
    if (request.method === "POST" && path === "/api/chat") {
      const body = await readJson(request);
      return json(answerQuestion(state, body.question, body.workflowId));
    }
    if (request.method === "POST" && path === "/api/connections") {
      const connection = safeConnection(await readJson(request));
      state.connections.push(connection);
      await store.write(state);
      return json(connection, 201);
    }
    const testMatch = path.match(/^\/api\/connections\/([^/]+)\/test$/);
    if (request.method === "POST" && testMatch) {
      const connection = state.connections.find(
        (item) => item.id === testMatch[1],
      );
      if (!connection) return json({ error: "연결을 찾을 수 없습니다." }, 404);
      connection.checkedAt = new Date().toISOString();
      if (connection.type !== "http") {
        connection.status = "unsupported";
        connection.error =
          "설정만 등록되었습니다. 이 연결의 실제 실행·인증 테스트는 아직 지원하지 않습니다.";
      } else {
        try {
          const rows = await fetchPublicRecords(connection.url);
          connection.status = "connected";
          connection.recordCount = rows.length;
          delete connection.error;
        } catch (error) {
          connection.status = "failed";
          connection.error =
            error.name === "TimeoutError"
              ? "연결 시간이 10초를 초과했습니다."
              : error.message;
        }
      }
      await store.write(state);
      return json(connection);
    }
    return json({ error: "지원하지 않는 API 경로 또는 요청 방식입니다." }, 404);
  } catch (error) {
    return json(
      {
        error:
          error.name === "TimeoutError"
            ? "외부 API 응답이 10초를 초과했습니다."
            : error.message || "요청을 처리하지 못했습니다.",
      },
      /1MB/.test(error.message) ? 413 : 400,
    );
  }
}
