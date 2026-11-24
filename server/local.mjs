import http from "node:http";
import { Readable } from "node:stream";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createInitialState } from "../core/engine.mjs";
import { handleApi, executeAndPersist } from "./api.mjs";
import { computeNextRun, runDueSchedules } from "../core/scheduler.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, ".data"));
const statePath = path.join(dataDir, "state.json");
await mkdir(dataDir, { recursive: true });
let state;
try {
  state = JSON.parse(await readFile(statePath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT")
    throw new Error(
      `저장된 작업 공간을 읽을 수 없습니다. ${statePath}: ${error.message}`,
    );
  state = createInitialState();
  await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
}
const store = {
  async read() {
    return structuredClone(state);
  },
  async write(nextState) {
    const temporary = `${statePath}.tmp`;
    await writeFile(temporary, JSON.stringify(nextState, null, 2), {
      mode: 0o600,
    });
    await rename(temporary, statePath);
    state = structuredClone(nextState);
  },
};
state.schedules ??= [];
for (const schedule of state.schedules) {
  if (schedule.enabled && !schedule.nextRunAt) {
    try {
      schedule.nextRunAt = computeNextRun(schedule);
    } catch (error) {
      schedule.enabled = false;
      schedule.nextRunAt = null;
      schedule.lastError = error.message;
    }
  }
}
await store.write(state);
let queue = Promise.resolve();
let schedulerQueued = false;
const enqueueScheduler = () => {
  if (schedulerQueued) return;
  schedulerQueued = true;
  queue = queue
    .then(() => runDueSchedules(store, executeAndPersist))
    .catch((error) => console.error("예약 확인 실패:", error.message))
    .finally(() => {
      schedulerQueued = false;
    });
};
const schedulerTimer = setInterval(enqueueScheduler, 15000);
schedulerTimer.unref();
enqueueScheduler();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const server = http.createServer((incoming, outgoing) => {
  if (incoming.method === "GET" && incoming.url === "/health") {
    outgoing.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    outgoing.end(JSON.stringify({ status: "ok", version: "0.1.0" }));
    return;
  }
  const handle = async () => {
    const requestOrigin = `http://${incoming.headers.host || "localhost"}`;
    let url;
    try {
      url = new URL(incoming.url, requestOrigin);
    } catch {
      outgoing.writeHead(400);
      outgoing.end("Bad request");
      return;
    }
    try {
      if (url.pathname.startsWith("/api/")) {
        const method = incoming.method || "GET";
        const request = new Request(url, {
          method,
          headers: incoming.headers,
          ...(!["GET", "HEAD"].includes(method)
            ? { body: Readable.toWeb(incoming), duplex: "half" }
            : {}),
        });
        const response = await handleApi(request, store);
        outgoing.writeHead(
          response.status,
          Object.fromEntries(response.headers),
        );
        outgoing.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (!["GET", "HEAD"].includes(incoming.method)) {
        outgoing.writeHead(405);
        outgoing.end("Method not allowed");
        return;
      }
      const requested = decodeURIComponent(url.pathname);
      const publicDir = path.join(root, "public");
      const file = path.resolve(
        publicDir,
        `.${requested === "/" ? "/index.html" : requested}`,
      );
      if (file !== publicDir && !file.startsWith(`${publicDir}${path.sep}`)) {
        outgoing.writeHead(403);
        outgoing.end("Forbidden");
        return;
      }
      const content = await readFile(file);
      outgoing.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
      });
      outgoing.end(incoming.method === "HEAD" ? undefined : content);
    } catch (error) {
      if (!outgoing.headersSent)
        outgoing.writeHead(
          error.code === "ENOENT" || error.code === "EISDIR" ? 404 : 500,
          { "Content-Type": "application/json; charset=utf-8" },
        );
      outgoing.end(
        JSON.stringify({
          error:
            error.code === "ENOENT" || error.code === "EISDIR"
              ? "파일을 찾을 수 없습니다."
              : "서버에서 요청을 처리하지 못했습니다.",
        }),
      );
      if (error.code !== "ENOENT" && error.code !== "EISDIR")
        console.error(error);
    }
  };
  queue = queue.then(handle, handle).catch((error) => {
    console.error(error);
    if (!outgoing.writableEnded) outgoing.end();
  });
});
const port = Number(process.env.PORT || 4318);
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () =>
  console.log(
    `Tide local platform: http://${host === "0.0.0.0" ? "localhost" : host}:${port}\nWorkspace: ${dataDir}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    clearInterval(schedulerTimer);
    server.close(() => queue.finally(() => process.exit(0)));
    setTimeout(() => {
      server.closeAllConnections();
      process.exit(0);
    }, 5000).unref();
  });
