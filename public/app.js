import {
  renderSchedules,
  renderScheduleForm,
  renderDayDetail,
} from "./schedules.js";
const icons = {
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-12 4h2m3 0h2m-7 3h2"/>',
  maximize: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  wave: '<path d="M3 9c3-5 6-5 9 0s6 5 9 0M3 16c3-5 6-5 9 0s6 5 9 0"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  workflow:
    '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v9h9M9 6h9v9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  database:
    '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  plug: '<path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4"/>',
  sparkle:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  cloud: '<path d="M6 18a5 5 0 1 1 0-10 7 7 0 0 1 13 1 4.5 4.5 0 0 1-1 9H6Z"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  table:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10M3 15h18"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  save: '<path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8"/>',
  layout:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M9 12h12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9H4l-2 2v-10a10 10 0 0 1 19-1Z"/><path d="M7 10h10m-10 4h6"/>',
  book: '<path d="M12 5c-4-3-8-2-10-1v15c4-2 7-2 10 0 3-2 6-2 10 0V4c-3-1-6-2-10 1Zm0 0v14"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  terminal:
    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.grid}</svg>`;
const $ = (q, root = document) => root.querySelector(q);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) => Number(n || 0).toLocaleString("ko-KR");
const date = (v) =>
  v
    ? new Date(v).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "아직 실행하지 않음";
const kinds = {
  source: {
    name: "데이터 수집",
    en: "SOURCE",
    icon: "globe",
    color: "blue",
    description: "샘플 · JSON 파일 · HTTP API",
  },
  raw: {
    name: "원본 적재",
    en: "STORAGE",
    icon: "database",
    color: "cyan",
    description: "수집한 원본을 그대로 보관",
  },
  transform: {
    name: "데이터 정제",
    en: "TRANSFORM",
    icon: "code",
    color: "amber",
    description: "형식 정리 · 중복 제거",
  },
  quality: {
    name: "품질 검사",
    en: "QUALITY",
    icon: "shield",
    color: "green",
    description: "필수 값과 유효 데이터 확인",
  },
  mart: {
    name: "데이터 마트",
    en: "DATA MART",
    icon: "table",
    color: "teal",
    description: "상품별 최신 가격과 변동률",
  },
  assistant: {
    name: "AI 데이터 도구",
    en: "AI TOOL",
    icon: "sparkle",
    color: "violet",
    description: "데이터 기반 질문과 답변",
  },
};
const navs = [
  ["workflows", "workflow", "워크플로"],
  ["schedules", "calendar", "스케줄"],
  ["runs", "clock", "실행 이력"],
  ["datasets", "database", "데이터셋"],
  ["connections", "plug", "연결 관리"],
  ["ai", "sparkle", "AI 스튜디오"],
];
const stageTypes = Object.keys(kinds);
const ui = {
  page: location.hash.slice(1) || "workflows",
  workflowId: null,
  nodeId: null,
  dirty: false,
  zoom: 1,
  busy: false,
  runId: null,
  datasetId: null,
  chat: [],
  runFilter: "all",
  datasetSearch: "",
  palette: true,
  scheduleWorkflow: "all",
  scheduleId: null,
  focusMode: false,
  offline: false,
  lastSyncedAt: null,
};
let state = {
  workflows: [],
  runs: [],
  datasets: [],
  connections: [],
  schedules: [],
};
const drafts = new Map();
let toastTimer;
function toast(message, error = false) {
  const el = $("#toast");
  el.innerHTML = `${icon(error ? "info" : "check")}<span>${esc(message)}</span>`;
  el.className = error ? "visible error" : "visible";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ""), 4500);
}
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
  return body;
}
async function refresh() {
  const fresh = await api("/state");
  fresh.schedules ??= [];
  fresh.workflows = fresh.workflows.map((w) => drafts.get(w.id) || w);
  state = fresh;
  if (!state.workflows.some((w) => w.id === ui.workflowId))
    ui.workflowId = state.workflows[0]?.id;
  ui.dirty = drafts.has(ui.workflowId);
  ui.offline = false;
  ui.lastSyncedAt = new Date().toISOString();
}
function markDirty() {
  ui.dirty = true;
  drafts.set(ui.workflowId, structuredClone(current()));
}
function selectWorkflow(id) {
  ui.workflowId = id;
  ui.dirty = drafts.has(id);
  ui.nodeId = null;
}
function current() {
  return state.workflows.find((w) => w.id === ui.workflowId);
}
function latest() {
  return state.runs.find((r) => r.workflowId === ui.workflowId);
}
function badge(status) {
  const names = {
    succeeded: "성공",
    failed: "실패",
    skipped: "건너뜀",
    running: "실행 중",
    connected: "연결 확인",
    configured: "설정됨",
    unsupported: "어댑터 준비 중",
  };
  return `<span class="badge ${esc(status)}">${icon(status === "succeeded" || status === "connected" ? "check" : status === "failed" ? "x" : "clock")}${names[status] || "대기"}</span>`;
}
function button(text, action, opts = {}) {
  return `<button type="button" class="btn ${opts.primary ? "primary" : ""} ${opts.class || ""}" data-action="${action}" ${opts.disabled ? "disabled" : ""}>${opts.icon ? icon(opts.icon) : ""}${text}</button>`;
}
function empty(title, subtitle, action = "run", label = "샘플 워크플로 실행") {
  return `<div class="empty">${icon("workflow")}<h3>${title}</h3><p>${subtitle}</p>${button(label, action, { primary: true, icon: "play", disabled: ui.busy })}</div>`;
}
function render() {
  const nav = navs.find((n) => n[0] === ui.page) || navs[0];
  $("#app").innerHTML = `<aside class="sidebar">
    <a class="brand" href="#workflows" aria-label="Tide 홈"><span class="brand-mark">${icon("wave")}</span><span>tide<span class="brand-period">.</span></span><span class="version">ALPHA</span></a>
    <button class="workspace" data-action="guide"><span class="workspace-avatar">P</span><span class="workspace-copy"><strong>Personal workspace</strong><small>나만의 데이터 작업 공간</small></span>${icon("down")}</button>
    <div class="nav-caption">WORKSPACE</div>
    <nav aria-label="주 메뉴">${navs.map(([key, ic, label]) => `<a class="nav-item ${key === ui.page ? "active" : ""}" href="#${key}" ${key === ui.page ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${key === "workflows" ? `<small>${state.workflows.length}</small>` : ""}${key === "ai" ? '<span class="nav-new">NEW</span>' : ""}</a>`).join("")}</nav>
    <div class="sidebar-tip"><span class="tip-icon">${icon("sparkle")}</span><strong>작은 연결이 만드는<br>새로운 가능성</strong><p>데이터의 시작부터 AI까지,<br>첫 흐름을 만들어 보세요.</p><button data-action="guide">시작 가이드 ${icon("external")}</button></div>
    <div class="sidebar-bottom"><div class="local-tag"><span></span><span>로컬 워크스페이스</span>${icon("shield")}</div><button data-action="export" class="nav-item">${icon("download")}<span>워크스페이스 내보내기</span></button><div class="profile"><span class="profile-avatar">PJ</span><div><strong>나의 워크스페이스</strong><small>Local · Open source</small></div><span class="profile-dot"></span></div></div>
  </aside>
  <div class="main-shell"><header class="topbar"><div class="breadcrumbs"><span>워크스페이스</span>${icon("chevron")}<strong>${nav[2]}</strong></div><div class="top-actions"><button class="search-button" data-action="search">${icon("search")}<span>빠르게 찾기</span><kbd>⌘ K</kbd></button><span class="top-divider"></span><button class="icon-btn" data-action="guide" aria-label="사용 가이드">${icon("book")}</button><span class="top-avatar">PJ</span></div></header>
  <main id="main" class="content" tabindex="-1">${ui.page === "workflows" ? renderWorkflow() : ui.page === "schedules" ? renderSchedules(scheduleContext()) : ui.page === "runs" ? renderRuns() : ui.page === "datasets" ? renderDatasets() : ui.page === "connections" ? renderConnections() : renderAI()}</main>
  <footer class="app-footer"><span>${icon("wave")} YOUR DATA, IN FLOW.</span><span>Tide v0.1.0 <span class="footer-dot">·</span> 로컬에서 안전하게 흐릅니다</span></footer></div>`;
  if (ui.page === "workflows") {
    drawEdges();
    bindCanvas();
  }
  if (ui.page === "schedules") positionCalendar();
  if (ui.page === "ai") $(".chat-messages")?.scrollTo(0, 999999);
}
function positionCalendar() {
  const el = $(".calendar-scroll");
  if (!el) return;
  if (ui.calendarWidth !== el.clientWidth) el.scrollLeft = el.scrollWidth;
  else el.scrollLeft = ui.calendarScroll || 0;
  ui.calendarWidth = el.clientWidth;
  el.addEventListener(
    "scroll",
    () => {
      ui.calendarScroll = el.scrollLeft;
    },
    { passive: true },
  );
}
window.addEventListener("resize", () => {
  if (ui.page === "schedules") positionCalendar();
});
function pageHeading(eyebrow, title, description, actions = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function renderWorkflow() {
  const w = current();
  if (!w)
    return empty(
      "첫 워크플로를 만들어 보세요",
      "템플릿으로 데이터 흐름을 시작하세요.",
      "new-workflow",
      "워크플로 만들기",
    );
  const run = latest(),
    good = state.runs.filter(
      (r) => r.workflowId === w.id && r.status === "succeeded",
    ).length;
  const data = state.datasets.filter((d) => d.workflowId === w.id);
  return `${pageHeading("BUILD YOUR DATA FLOW", "데이터를 연결하고, 가능성을 넓히세요.", "원천 데이터에서 마트, AI까지. 모든 과정을 하나의 워크플로로 관리하세요.", button("새 워크플로", "new-workflow", { icon: "plus", primary: true }))}
 <div class="metrics-row"><div class="metric"><span class="metric-icon mint">${icon("workflow")}</span><div><span>워크플로</span><strong>${state.workflows.length}<small>개</small></strong></div><span class="metric-hint">내가 만든 데이터 흐름</span></div><div class="metric"><span class="metric-icon blue">${icon("check")}</span><div><span>성공한 실행</span><strong>${good}<small>회</small></strong></div><span class="metric-hint">현재 워크플로 기준</span></div><div class="metric"><span class="metric-icon purple">${icon("database")}</span><div><span>연결된 데이터셋</span><strong>${data.length}<small>개</small></strong></div><span class="metric-hint">실행으로 생성된 데이터</span></div></div>
 <section class="editor-card ${ui.focusMode ? "focus-mode" : ""}" aria-label="워크플로 편집기"><div class="editor-header"><div class="editor-heading"><span class="workflow-tile">${icon("workflow")}</span><div><div class="workflow-name"><select id="workflow-select" aria-label="워크플로 선택">${state.workflows.map((f) => `<option value="${esc(f.id)}" ${f.id === w.id ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select>${icon("down")}<span class="badge subtle">${ui.dirty ? "저장 전" : "초안"}</span></div><p>${esc(w.description || "나만의 데이터 흐름을 연결하세요.")}</p></div></div><div class="editor-actions">${button("저장", "save", { icon: "save", disabled: ui.busy })}${button(ui.busy ? "실행 중…" : "워크플로 실행", "run", { primary: true, icon: "play", disabled: ui.busy })}</div></div>
 <div class="editor-tabs"><button class="editor-tab active">${icon("workflow")} 편집기</button><button class="editor-tab" data-action="go-runs">${icon("clock")} 실행 이력 <span>${state.runs.filter((r) => r.workflowId === w.id).length}</span></button><div class="editor-tab-right"><span class="environment-tag">${icon("terminal")} Local runner</span><button data-action="schedule" class="text-button schedule-link">${icon("calendar")} ${state.schedules.some((s) => s.workflowId === w.id) ? `스케줄 ${state.schedules.filter((s) => s.workflowId === w.id).length}개` : "스케줄 설정"}</button></div></div>
 <div class="editor-body ${ui.palette ? "" : "palette-hidden"}"><aside class="node-palette"><div class="palette-heading">노드 라이브러리 <span>${Object.keys(kinds).length}</span></div><p>연결된 단계의 설정을 확인하세요</p><div class="palette-label">데이터 파이프라인</div>${Object.entries(
   kinds,
 )
   .map(
     ([type, k], i) =>
       `${i === 5 ? '<div class="palette-label ai-label">AI & INSIGHTS</div>' : ""}<button class="palette-node" data-action="add-node" data-type="${type}"><span class="node-icon ${k.color}">${icon(k.icon)}</span><span><strong>${k.name}</strong><small>${type === "source" ? "데이터 가져오기" : type === "raw" ? "원본 보관하기" : type === "transform" ? "데이터 다듬기" : type === "quality" ? "신뢰할 수 있는 데이터" : type === "mart" ? "활용 가능한 데이터" : "데이터에 질문하기"}</small></span>${icon(w.nodes.some((n) => n.type === type) ? "check" : "plus")}</button>`,
   )
   .join(
     "",
   )}<div class="palette-note">${icon("info")} 유형별 하나의 노드를 지원합니다.<br>클릭해서 설정하세요.</div></aside>
 <div class="canvas-wrap"><div class="canvas-top"><span class="canvas-label"><span class="tiny-dot"></span> WORKFLOW CANVAS</span><div><button class="icon-btn" data-action="focus-canvas" aria-label="${ui.focusMode ? "캔버스 확대 종료" : "캔버스 확대"}" title="${ui.focusMode ? "확대 종료" : "캔버스 확대"}">${icon("maximize")}</button>${button("연결 추가", "add-edge", { icon: "plus", class: "small" })}<button class="icon-btn" data-action="toggle-palette" aria-label="노드 라이브러리 열기 또는 닫기">${icon("layout")}</button></div></div><div class="canvas-scroll"><div class="graph" style="transform:scale(${ui.zoom});width:${Math.max(930, ...w.nodes.map((n) => n.x + 280))}px;height:${Math.max(500, ...w.nodes.map((n) => n.y + 180))}px"><svg id="edges" class="edges" aria-label="노드 의존 관계"></svg>${w.nodes.map((n) => renderNode(n, run)).join("")}</div></div><div class="canvas-bottom"><span>${icon("info")} 노드를 선택해 설정하고, 드래그해서 배치하세요.</span><div class="canvas-controls"><button data-action="zoom-out" aria-label="축소">−</button><span>${Math.round(ui.zoom * 100)}%</span><button data-action="zoom-in" aria-label="확대">+</button><i></i><button data-action="layout" aria-label="노드 자동 정렬">${icon("layout")}</button></div></div></div></div>
 <div class="editor-status"><span>${icon(ui.dirty ? "info" : "check")} ${ui.dirty ? "변경 사항이 있습니다. 실행 전에 저장됩니다." : "워크플로를 실행할 준비가 되었습니다."}</span><span>${w.nodes.length}개 노드 <span>·</span> ${w.edges.length}개 연결 <span>·</span> ${run ? `최근 실행 ${date(run.startedAt)}` : "아직 실행하지 않음"}</span></div></section>
 <div class="below-editor"><div class="getting-started"><span class="getting-icon">${icon("play")}</span><div><h3>첫 데이터 흐름을 경험해 보세요</h3><p>샘플 상품 데이터를 마트로 만들고, 데이터에 직접 질문해 보세요.</p></div><button class="text-button" data-action="guide">시작 가이드 ${icon("external")}</button></div><div class="flow-summary"><span class="stacked-icons">${icon("database")}${icon("sparkle")}</span><div><strong>데이터에서 인사이트까지</strong><p>수집 · 정제 · 마트 · AI 조회</p></div></div></div>`;
}
function renderNode(n, run) {
  const k = kinds[n.type] || kinds.source;
  const r = run?.nodes?.find((v) => v.nodeId === n.id);
  return `<button class="flow-node ${k.color} ${ui.nodeId === n.id ? "selected" : ""} ${r?.status || ""}" style="left:${n.x}px;top:${n.y}px" data-node="${esc(n.id)}" aria-label="${esc(n.label)} 설정"><span class="node-port input"></span><span class="node-top"><span class="node-icon ${k.color}">${icon(k.icon)}</span><span class="node-type">${k.en}</span><span class="node-options">···</span></span><strong>${esc(n.label)}</strong><span class="node-description">${n.type === "source" && n.config?.mode === "upload" ? `업로드 · ${fmt(n.config.records?.length)}개 레코드` : n.type === "source" && n.config?.mode === "http" ? "HTTP API · JSON 데이터" : k.description}</span><span class="node-footer">${r ? `<span class="node-state ${r.status}">${icon(r.status === "succeeded" ? "check" : r.status === "failed" ? "x" : "clock")}${r.status === "succeeded" ? "실행 완료" : r.status === "failed" ? "실행 실패" : "건너뜀"}</span><span>${fmt(r.outputRows)} rows</span>` : `<span>${icon(n.type === "source" ? "globe" : n.type === "assistant" ? "sparkle" : "code")}${n.type === "source" ? "입력 설정" : n.type === "assistant" ? "Data tool" : "Built-in"}</span><span>설정됨</span>`}</span><span class="node-port output"></span></button>`;
}
function drawEdges() {
  const svg = $("#edges");
  if (!svg) return;
  const w = current();
  svg.innerHTML =
    `<defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#90aba7" stroke-width="1.2"/></marker></defs>` +
    w.edges
      .map((e) => {
        const a = w.nodes.find((n) => n.id === e.source),
          b = w.nodes.find((n) => n.id === e.target);
        if (!a || !b) return "";
        const right = b.x > a.x;
        let x1 = a.x + (right ? 220 : 0),
          y1 = a.y + 74,
          x2 = b.x + (right ? 0 : 220),
          y2 = b.y + 74;
        let d;
        if (Math.abs(a.y - b.y) < 30) {
          const mid = (x1 + x2) / 2;
          d = `M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
        } else if (Math.abs(a.x - b.x) < 30) {
          x1 = a.x + 110;
          y1 = a.y + 148;
          x2 = b.x + 110;
          y2 = b.y;
          d = `M${x1} ${y1} C${x1} ${y1 + 35}, ${x2} ${y2 - 35}, ${x2} ${y2}`;
        } else {
          const mid = (x1 + x2) / 2;
          d = `M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
        }
        return `<path d="${d}" class="edge" marker-end="url(#arrowhead)"/>`;
      })
      .join("");
}
function bindCanvas() {
  const graph = $(".graph");
  if (!graph) return;
  graph.addEventListener("pointerdown", (e) => {
    const el = e.target.closest("[data-node]");
    if (!el || e.button !== 0 || ui.busy) return;
    const n = current().nodes.find((x) => x.id === el.dataset.node);
    const start = { x: e.clientX, y: e.clientY, left: n.x, top: n.y };
    let moved = false;
    el.setPointerCapture(e.pointerId);
    const move = (ev) => {
      if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 5)
        moved = true;
      if (!moved) return;
      n.x = Math.max(
        20,
        Math.min(2000, start.left + (ev.clientX - start.x) / ui.zoom),
      );
      n.y = Math.max(
        20,
        Math.min(1200, start.top + (ev.clientY - start.y) / ui.zoom),
      );
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
      drawEdges();
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      if (moved) {
        markDirty();
        render();
      } else openNode(n.id);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  });
  graph.addEventListener("keydown", (e) => {
    const el = e.target.closest("[data-node]");
    if (el && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openNode(el.dataset.node);
    }
  });
}
function renderRuns() {
  const runs = state.runs.filter(
    (r) => ui.runFilter === "all" || r.status === ui.runFilter,
  );
  return `${pageHeading("OBSERVE YOUR FLOW", "모든 실행을 한눈에.", "작업의 결과와 로그를 확인하고, 실패한 흐름을 다시 실행하세요.", button("워크플로 열기", "go-workflows", { icon: "workflow" }))}<section class="surface"><div class="section-toolbar"><h2>실행 이력 <span class="count">${state.runs.length}</span></h2><select id="run-filter" aria-label="실행 상태 필터"><option value="all" ${ui.runFilter === "all" ? "selected" : ""}>모든 상태</option><option value="succeeded" ${ui.runFilter === "succeeded" ? "selected" : ""}>성공</option><option value="failed" ${ui.runFilter === "failed" ? "selected" : ""}>실패</option></select></div>${runs.length ? `<div class="table-scroll"><table><thead><tr><th>워크플로 / 실행</th><th>상태</th><th>시작 시각</th><th>실행 시간</th><th>노드</th><th></th></tr></thead><tbody>${runs.map((r) => `<tr><td><strong>${esc(r.workflowName)}</strong><small class="mono block">${esc(r.id)}</small></td><td>${badge(r.status)}<small class="block">${r.trigger === "scheduled" ? "예약 실행" : r.trigger === "schedule-test" ? "스케줄 즉시 실행" : "수동 실행"}</small></td><td>${date(r.startedAt)}</td><td>${r.durationMs < 1000 ? `${r.durationMs} ms` : `${(r.durationMs / 1000).toFixed(1)} s`}</td><td>${r.nodes.filter((n) => n.status === "succeeded").length} / ${r.nodes.length}</td><td><button class="btn small" data-action="run-detail" data-id="${esc(r.id)}">로그 보기 ${icon("chevron")}</button></td></tr>`).join("")}</tbody></table></div>` : empty("아직 실행 기록이 없어요", "첫 워크플로를 실행하면 단계별 로그와 결과가 여기에 쌓입니다.")}</section>`;
}
function dataTable(rows, columns, limit = 30) {
  if (!rows?.length)
    return '<div class="table-empty">표시할 데이터가 없습니다.</div>';
  const cols = columns?.length
    ? columns.map((c) => (typeof c === "string" ? c : c.name))
    : Object.keys(rows[0]);
  return `<div class="table-scroll"><table class="data-table"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows
    .slice(0, limit)
    .map(
      (row) =>
        `<tr>${cols.map((c) => `<td>${esc(typeof row[c] === "object" ? JSON.stringify(row[c]) : row[c])}</td>`).join("")}</tr>`,
    )
    .join(
      "",
    )}</tbody></table></div>${rows.length > limit ? `<p class="table-footnote">전체 ${fmt(rows.length)}개 중 ${limit}개를 미리 보고 있습니다.</p>` : ""}`;
}
function renderDatasets() {
  const ds = state.datasets.filter((d) =>
    d.name.toLowerCase().includes(ui.datasetSearch.toLowerCase()),
  );
  const selected = state.datasets.find((d) => d.id === ui.datasetId);
  return `${pageHeading("KNOW YOUR DATA", "데이터에도 맥락이 필요하니까.", "원본부터 마트까지, 데이터의 내용과 연결 관계를 확인하세요.")}<section class="surface"><div class="section-toolbar"><h2>데이터 카탈로그 <span class="count">${state.datasets.length}</span></h2><label class="inline-search">${icon("search")}<input id="dataset-search" placeholder="데이터셋 검색" value="${esc(ui.datasetSearch)}" aria-label="데이터셋 검색"></label></div>${ds.length ? `<div class="dataset-grid">${ds.map((d) => `<button class="dataset-card ${d.id === ui.datasetId ? "selected" : ""}" data-action="dataset-detail" data-id="${esc(d.id)}"><div><span class="node-icon ${d.layer === "mart" ? "teal" : d.layer === "raw" ? "blue" : "amber"}">${icon(d.layer === "mart" ? "table" : "database")}</span><span class="layer">${esc(d.layer.toUpperCase())}</span></div><h3>${esc(d.name)}</h3><p>${fmt(d.rowCount)}개 레코드 <span>·</span> ${d.columns.length}개 컬럼</p><div class="dataset-footer"><span>갱신 ${date(d.updatedAt)}</span>${icon("chevron")}</div></button>`).join("")}</div>` : empty("데이터가 도착할 자리예요", "워크플로를 실행하면 원본·정제·마트 데이터셋이 자동으로 등록됩니다.")}</section>${selected ? `<section class="surface data-detail"><div class="section-toolbar"><div><h2>${esc(selected.name)}</h2><p>최근 성공 실행으로 생성된 데이터</p></div>${button("CSV 다운로드", "dataset-download", { icon: "download" })}</div><div class="lineage-strip">${icon("workflow")}<span>${esc(state.workflows.find((w) => w.id === selected.workflowId)?.name || selected.workflowId)}</span>${icon("chevron")}<strong>${esc(selected.name)}</strong><button class="text-button" data-action="run-detail" data-id="${esc(selected.runId)}">원본 실행 보기</button></div>${dataTable(selected.rows, selected.columns)}<div class="dataset-metadata"><span>생성 실행 <code>${esc(selected.runId)}</code></span><span>상위 데이터셋 ${selected.upstream?.map(esc).join(", ") || "원천 데이터"}</span></div></section>` : ""}`;
}
function renderConnections() {
  return `${pageHeading("CONNECT YOUR WORLD", "흩어진 데이터의 연결점.", "데이터 소스와 클라우드 설정을 한곳에서 관리하세요.", button("연결 추가", "new-connection", { primary: true, icon: "plus" }))}<div class="notice">${icon("info")}<span>HTTP 연결은 실제 접근 여부를 확인합니다. 클라우드는 설정 등록을 지원하며, 원격 실행 어댑터는 후속 버전에서 연결됩니다.</span></div><div class="connections-grid">${state.connections.map((c) => `<article class="surface connection-card"><div class="connection-top"><span class="connection-icon ${c.type === "http" ? "blue" : "amber"}">${icon(c.type === "http" ? "globe" : "cloud")}</span>${badge(c.status)}</div><h2>${esc(c.name)}</h2><p>${esc(c.type?.toUpperCase())} ${c.region ? `· ${esc(c.region)}` : ""}</p><div class="connection-address">${esc(c.url || "클라우드 실행 환경 설정")}</div>${c.error ? `<p class="error-text">${esc(c.error)}</p>` : ""}<div class="connection-bottom"><span>${c.checkedAt ? date(c.checkedAt) : "아직 확인하지 않음"}</span><button class="btn small" data-action="test-connection" data-id="${esc(c.id)}" ${ui.busy ? "disabled" : ""}>${c.type === "http" ? "연결 테스트" : "지원 상태 확인"}</button></div></article>`).join("")}<button class="connection-add" data-action="new-connection">${icon("plus")}<strong>새로운 연결</strong><span>HTTP API · AWS · GCP · Azure</span></button></div><section class="surface infra-panel"><div><span class="node-icon teal">${icon("terminal")}</span><h2>실행 환경</h2><p>현재 워크스페이스가 사용하는 실행 환경입니다.</p></div><div class="runner-row"><span class="runner-logo">${icon("terminal")}</span><div><strong>Local runner</strong><p>Docker 또는 로컬 Node.js 프로세스</p></div><span class="badge succeeded">${icon("check")} 사용 가능</span></div><p class="muted">현재 버전은 내장 데이터 작업을 실행합니다. 임의 Python 코드 실행, 원격 클라우드 실행은 아직 지원하지 않습니다.</p></section>`;
}
function renderAI() {
  const marts = state.datasets.filter(
    (d) => d.layer === "mart" && d.workflowId === ui.workflowId,
  );
  return `${pageHeading("TURN DATA INTO ANSWERS", "데이터에 질문을 건네보세요.", "완성된 마트를 조회하고, 답변의 근거가 된 데이터를 확인하세요.")}<div class="ai-layout"><section class="surface chat-panel"><div class="chat-header"><span class="node-icon violet">${icon("sparkle")}</span><div><h2>Tide 데이터 어시스턴트</h2><p>내 데이터에서 찾는 작은 인사이트</p></div><span class="badge subtle">Data tool</span></div><div class="chat-messages">${ui.chat.length ? ui.chat.map((m) => `<div class="message ${m.role}"><span class="message-avatar">${m.role === "user" ? "나" : icon("sparkle")}</span><div><div class="message-body">${esc(m.text).replace(/\n/g, "<br>")}</div>${m.sources?.length ? `<div class="answer-sources">${m.sources.map((s) => `<button data-action="dataset-detail" data-id="${esc(s.datasetId)}">${icon("database")}<span>${esc(s.name)}<small>${date(s.updatedAt)}</small></span>${icon("external")}</button>`).join("")}</div>` : ""}${m.rows?.length ? `<div class="answer-table">${dataTable(m.rows, null, 8)}</div>` : ""}</div></div>`).join("") : `<div class="chat-welcome"><span class="welcome-icon">${icon("sparkle")}</span><h2>데이터 속 이야기를 찾아보세요</h2><p>최신 상품 마트를 바탕으로<br>가격과 변화에 대한 질문을 할 수 있어요.</p><div class="suggestions">${["가격이 오른 상품을 알려줘", "평균 가격은 얼마야?", "카테고리별 상품 수를 보여줘"].map((q) => `<button data-action="suggestion" data-question="${esc(q)}">${q}${icon("plus")}</button>`).join("")}</div></div>`}${ui.busy ? '<p class="chat-loading">데이터를 조회하고 있습니다…</p>' : ""}</div><form id="chat-form" class="chat-input"><input name="question" placeholder="예: 가격이 가장 많이 오른 상품은?" autocomplete="off" aria-label="데이터 질문" ${ui.busy ? "disabled" : ""} required><button class="btn primary" aria-label="질문 보내기" ${ui.busy ? "disabled" : ""}>${icon("arrow")}</button></form><p class="chat-disclaimer">현재는 지원하는 질문을 실제 데이터로 계산하는 Data tool 모드입니다.</p></section><aside class="ai-context"><section class="surface"><div class="section-toolbar"><h2>${icon("database")} 연결된 데이터</h2></div><label class="ai-workflow-choice">조회할 워크플로<select id="ai-workflow-select" aria-label="조회할 워크플로">${state.workflows.map((w) => `<option value="${esc(w.id)}" ${w.id === ui.workflowId ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label>${marts.length ? marts.map((d) => `<button class="context-dataset" data-action="dataset-detail" data-id="${esc(d.id)}"><span class="node-icon teal">${icon("table")}</span><strong>${esc(d.name)}</strong><span>${fmt(d.rowCount)}개 레코드</span><small>갱신 ${date(d.updatedAt)}</small></button>`).join("") : `<div class="context-empty">${icon("database")}<p>아직 연결된 마트가 없습니다.</p>${button("워크플로 실행", "run", { primary: true, icon: "play", disabled: ui.busy })}</div>`}</section><section class="surface ai-how"><span class="node-icon violet">${icon("workflow")}</span><h3>데이터에서 답변까지</h3><ol><li>질문 유형 확인</li><li>데이터 마트 조회</li><li>실제 값으로 결과 계산</li><li>근거 데이터와 함께 답변</li></ol><div class="upcoming"><strong>LangGraph 연결</strong><p>현재 LLM은 호출하지 않습니다. LangGraph·모델 제공자 연동은 확장 단계입니다.</p></div></section></aside></div>`;
}
function modal(html, { drawer = false } = {}) {
  const d = $("#dialog");
  d.className = drawer ? "drawer" : "";
  d.innerHTML = html;
  d.showModal();
  setTimeout(() => d.querySelector("input,select,button")?.focus(), 0);
}
function dialogHead(title, sub = "") {
  return `<div class="dialog-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button type="button" class="icon-btn" data-action="close" aria-label="닫기">${icon("x")}</button></div>`;
}
function openNode(id) {
  ui.nodeId = id;
  const n = current().nodes.find((n) => n.id === id);
  if (!n) return;
  const k = kinds[n.type];
  const logs = latest()?.nodes.find((v) => v.nodeId === id);
  modal(
    `${dialogHead("노드 설정", "설정은 저장 후 다음 실행부터 적용됩니다.")}<div class="node-inspector-title"><span class="node-icon ${k.color}">${icon(k.icon)}</span><div><strong>${k.name}</strong><small>${k.en}</small></div></div><form id="node-form" data-id="${esc(id)}"><label>노드 이름<input name="label" value="${esc(n.label)}" required maxlength="80"></label>${n.type === "source" ? `<label>데이터 가져오기<select name="mode" id="source-mode"><option value="sample" ${n.config.mode === "sample" ? "selected" : ""}>샘플 상품 가격 데이터</option><option value="upload" ${n.config.mode === "upload" ? "selected" : ""}>내 JSON 파일 업로드</option><option value="http" ${n.config.mode === "http" ? "selected" : ""}>HTTP JSON API</option></select></label><div id="source-options">${sourceOptions(n)}</div>` : n.type === "quality" ? `<label>허용할 잘못된 레코드 비율 (%)<input name="maxInvalidPercent" type="number" min="0" max="100" step="1" value="${n.config.maxInvalidPercent ?? 10}" required></label><p class="field-hint">가격·상품 키 등 필수 값이 없는 데이터의 비율이 기준을 넘으면 실행을 중단합니다.</p>` : `<div class="inspector-description">${icon("info")}<p>${n.type === "raw" ? "수집된 레코드를 변경하지 않고 원본 데이터셋으로 저장합니다." : n.type === "transform" ? "상품 필드와 가격 형식을 정리하고, 동일 상품·일자의 중복을 제거합니다." : n.type === "mart" ? "상품별 최신 가격과 이전 가격을 비교해 변동률을 계산합니다." : "생성된 마트를 데이터 조회 도구에 연결합니다. 현재는 LLM을 호출하지 않는 Data tool 모드입니다."}</p></div>`}<div class="inspector-section"><h3>입력 연결</h3>${
      current()
        .edges.filter((e) => e.target === id)
        .map(
          (e) =>
            `<div class="dependency-item">${icon(kinds[current().nodes.find((v) => v.id === e.source)?.type]?.icon || "workflow")}<span>${esc(current().nodes.find((v) => v.id === e.source)?.label)}</span><button type="button" class="icon-btn" data-action="remove-edge" data-source="${esc(e.source)}" data-target="${esc(id)}" aria-label="연결 삭제">${icon("x")}</button></div>`,
        )
        .join("") || '<p class="muted">상위 노드가 없습니다.</p>'
    }</div>${logs ? `<div class="inspector-section"><h3>최근 실행</h3>${badge(logs.status)}<pre class="log-block">${esc((logs.logs || []).map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n"))}${logs.error ? "\n" + esc(logs.error) : ""}</pre></div>` : ""}<div class="dialog-footer"><button type="button" class="btn danger" data-action="remove-node" data-id="${esc(id)}">노드 삭제</button><button class="btn primary" type="submit">설정 적용</button></div></form>`,
    { drawer: true },
  );
}
function sourceOptions(n) {
  const mode = n.config.mode || "sample";
  return mode === "http"
    ? `<label>공개 HTTPS API URL<input name="url" type="url" placeholder="https://example.com/products.json" value="${esc(n.config.url || "")}"></label><p class="field-hint">JSON 배열을 반환하는 공개 HTTPS 주소를 사용하세요. 현재 비공개 네트워크·인증 헤더는 지원하지 않습니다.</p>`
    : mode === "upload"
      ? `<label class="upload-box">${icon("upload")}<strong>상품 JSON 파일 선택</strong><input id="source-file" type="file" accept=".json,application/json"><span id="upload-status">${n.config.records?.length ? `${fmt(n.config.records.length)}개 레코드 등록됨` : "JSON 배열 · 최대 1MB"}</span></label><p class="field-hint">필드: sku, name, category, price, previous_price, date</p><pre class="example-code">${esc(JSON.stringify([{ sku: "SKU-001", name: "드립 커피", category: "식품", price: 15000, previous_price: 14000, date: "2026-11-24" }], null, 2))}</pre>`
      : `<div class="sample-source">${icon("sparkle")}<div><strong>준비된 샘플로 시작하세요</strong><p>상품 가격 데이터를 실제로 정제·적재하고 마트를 생성합니다. API 키가 필요하지 않습니다.</p></div></div>`;
}
function showGuide() {
  modal(
    `${dialogHead("첫 흐름을 만드는 가장 쉬운 방법", "설치부터 데이터 활용까지, 세 단계면 충분해요.")}<div class="guide-steps"><article><span>1</span><div><h3>준비된 흐름을 살펴보세요</h3><p>수집, 적재, 정제, 품질 검사, 마트, AI 데이터 도구가 연결되어 있어요. 노드를 클릭하면 설정을 확인할 수 있습니다.</p></div></article><article><span>2</span><div><h3>워크플로를 실행하세요</h3><p>샘플 데이터가 실제 처리됩니다. 실행 이력에서 단계별 로그를, 데이터셋에서 적재된 결과를 확인하세요.</p></div></article><article><span>3</span><div><h3>데이터에 질문해 보세요</h3><p>AI 스튜디오에서 가격이 오른 상품이나 평균 가격을 물어보세요. 현재는 실제 데이터를 계산하는 Data tool 모드예요.</p></div></article></div><div class="notice"><span>${icon("shield")}</span><p>데이터와 실행 기록은 로컬 볼륨에 저장됩니다. 원격 클라우드 실행·임의 코드 실행·LangGraph 연결은 확장 예정 기능입니다.</p></div><div class="dialog-footer">${button("워크플로 살펴보기", "guide-start", { primary: true, icon: "workflow" })}</div>`,
  );
}
function showRun(id) {
  const r = state.runs.find((v) => v.id === id);
  if (!r) return toast("실행 기록을 찾을 수 없습니다.", true);
  modal(
    `${dialogHead("실행 상세", esc(r.workflowName))}<div class="run-detail-summary">${badge(r.status)}<span>${date(r.startedAt)}</span><span>${r.durationMs} ms</span><span>${r.trigger === "scheduled" ? "예약 실행" : r.trigger === "schedule-test" ? "스케줄 즉시 실행" : "수동 실행"}</span></div>${r.scheduledFor ? `<p class="muted">예약 기준 시각 ${date(r.scheduledFor)}</p>` : ""}<p class="mono muted">${esc(r.id)}</p><div class="run-timeline">${r.nodes.map((n) => `<article><span class="timeline-marker ${n.status}">${icon(n.status === "succeeded" ? "check" : n.status === "failed" ? "x" : "clock")}</span><div><div class="timeline-title"><strong>${esc(n.label)}</strong>${badge(n.status)}</div><p>${fmt(n.inputRows)} input / ${fmt(n.outputRows)} output</p><pre class="log-block">${esc((n.logs || []).map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n"))}${n.error ? "\n" + esc(n.error) : ""}</pre></div></article>`).join("")}</div><div class="dialog-footer">${button("데이터셋 확인", "go-datasets", { icon: "database" })}${button("다시 실행", "rerun", { primary: true, icon: "play", disabled: ui.busy })}</div>`,
    { drawer: true },
  );
  ui.runId = id;
}
function download(name, text, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function save(silent = false) {
  const w = current();
  await api(`/workflows/${encodeURIComponent(w.id)}`, {
    method: "PUT",
    body: JSON.stringify(w),
  });
  drafts.delete(w.id);
  ui.dirty = false;
  if (!silent) toast("워크플로를 저장했습니다.");
}
async function run() {
  if (ui.busy) return;
  ui.busy = true;
  render();
  try {
    if (ui.dirty) await save(true);
    const result = await api(
      `/workflows/${encodeURIComponent(ui.workflowId)}/run`,
      { method: "POST", body: "{}" },
    );
    await refresh();
    toast(
      result.run.status === "succeeded"
        ? "데이터 흐름이 완성됐습니다. 결과를 확인해 보세요."
        : "일부 단계가 실패했습니다. 실행 로그를 확인해 주세요.",
      result.run.status !== "succeeded",
    );
    ui.runId = result.run.id;
    ui.busy = false;
    render();
    showRun(result.run.id);
  } catch (e) {
    toast(e.message, true);
  } finally {
    ui.busy = false;
    render();
  }
}
async function ask(question) {
  if (ui.busy || !question.trim()) return;
  ui.chat.push({ role: "user", text: question });
  ui.busy = true;
  render();
  try {
    const result = await api("/chat", {
      method: "POST",
      body: JSON.stringify({ question, workflowId: ui.workflowId }),
    });
    ui.chat.push({
      role: "assistant",
      text: result.answer,
      sources: result.sources,
      rows: result.rows,
    });
  } catch (e) {
    ui.chat.push({ role: "assistant", text: e.message });
  } finally {
    ui.busy = false;
    render();
  }
}
function navigate(page) {
  if (location.hash === `#${page}`) {
    ui.page = page;
    render();
  } else location.hash = page;
}
const actions = {
  close: () => $("#dialog").close(),
  guide: showGuide,
  "guide-start": () => {
    $("#dialog").close();
    navigate("workflows");
  },
  "go-workflows": () => navigate("workflows"),
  "go-runs": () => navigate("runs"),
  "go-datasets": () => {
    $("#dialog").close();
    navigate("datasets");
  },
  save: () => save().then(render),
  run: run,
  rerun: () => {
    selectWorkflow(
      state.runs.find((r) => r.id === ui.runId)?.workflowId || ui.workflowId,
    );
    $("#dialog").close();
    return run();
  },
  "toggle-palette": () => {
    ui.palette = !ui.palette;
    render();
  },
  "zoom-in": () => {
    ui.zoom = Math.min(1.3, Math.round((ui.zoom + 0.1) * 10) / 10);
    render();
  },
  "zoom-out": () => {
    ui.zoom = Math.max(0.5, Math.round((ui.zoom - 0.1) * 10) / 10);
    render();
  },
  layout: () => {
    current().nodes.forEach((n, i) => {
      const row = Math.floor(i / 3),
        col = row % 2 ? 2 - (i % 3) : i % 3;
      n.x = 60 + col * 280;
      n.y = 60 + row * 220;
    });
    markDirty();
    render();
  },
  "new-workflow": () =>
    modal(
      `${dialogHead("새로운 데이터 흐름", "검증된 템플릿으로 빠르게 시작하세요.")}<form id="workflow-form"><label>워크플로 이름<input name="name" placeholder="예: 상품 가격 분석 파이프라인" required maxlength="100"></label><div class="template-choice"><span class="node-icon teal">${icon("workflow")}</span><div><strong>원천에서 AI까지</strong><p>수집 · 원본 · 정제 · 품질 · 마트 · 데이터 도구</p></div>${icon("check")}</div><p class="field-hint">템플릿을 만든 뒤 수집 노드에서 내 JSON 파일이나 HTTP API로 변경할 수 있습니다.</p><div class="dialog-footer"><button type="button" class="btn" data-action="close">취소</button><button class="btn primary">워크플로 만들기</button></div></form>`,
    ),
  "add-node": (el) => {
    const type = el.dataset.type;
    const w = current();
    const existing = w.nodes.find((n) => n.type === type);
    if (existing) return openNode(existing.id);
    const id = `node-${crypto.randomUUID().slice(0, 8)}`;
    const index = stageTypes.indexOf(type);
    const previous = w.nodes.find((n) => n.type === stageTypes[index - 1]);
    const next = w.nodes.find((n) => n.type === stageTypes[index + 1]);
    const row = Math.floor(index / 3),
      col = row % 2 ? 2 - (index % 3) : index % 3;
    w.nodes.push({
      id,
      type,
      label: kinds[type].name,
      x: 60 + col * 280,
      y: 60 + row * 220,
      config:
        type === "source"
          ? { mode: "sample" }
          : type === "quality"
            ? { maxInvalidPercent: 10 }
            : {},
    });
    if (previous) w.edges.push({ source: previous.id, target: id });
    if (next) w.edges.push({ source: id, target: next.id });
    markDirty();
    render();
    openNode(id);
  },
  "add-edge": () => {
    const nodes = current().nodes;
    modal(
      `${dialogHead("노드 연결", "선행 작업이 완료되면 다음 작업을 실행합니다.")}<form id="edge-form"><label>선행 노드<select name="source">${nodes.map((n) => `<option value="${esc(n.id)}">${esc(n.label)}</option>`).join("")}</select></label><label>다음 노드<select name="target">${nodes.map((n, i) => `<option value="${esc(n.id)}" ${i === 1 ? "selected" : ""}>${esc(n.label)}</option>`).join("")}</select></label><p class="field-hint">순환 연결과 작업 유형에 맞지 않는 연결은 저장 시 검증됩니다.</p><div class="dialog-footer"><button class="btn primary">연결 추가</button></div></form>`,
    );
  },
  "remove-edge": (el) => {
    current().edges = current().edges.filter(
      (e) =>
        !(e.source === el.dataset.source && e.target === el.dataset.target),
    );
    markDirty();
    openNode(el.dataset.target);
    render();
  },
  "remove-node": (el) => {
    const id = el.dataset.id;
    current().nodes = current().nodes.filter((n) => n.id !== id);
    current().edges = current().edges.filter(
      (e) => e.source !== id && e.target !== id,
    );
    markDirty();
    $("#dialog").close();
    render();
    toast("노드를 제거했습니다. 필요한 연결을 다시 확인하세요.");
  },
  "run-detail": (el) => showRun(el.dataset.id),
  "dataset-detail": (el) => {
    ui.datasetId = el.dataset.id;
    $("#dialog").close();
    navigate("datasets");
  },
  "dataset-download": () => {
    const d = state.datasets.find((v) => v.id === ui.datasetId);
    if (!d) return;
    const cols = d.columns.map((c) => (typeof c === "string" ? c : c.name));
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    download(
      `${d.name}.csv`,
      "\uFEFF" +
        [
          cols.map(cell).join(","),
          ...d.rows.map((r) => cols.map((c) => cell(r[c])).join(",")),
        ].join("\r\n"),
      "text/csv;charset=utf-8",
    );
  },
  suggestion: (el) => ask(el.dataset.question),
  export: async () => {
    const data = await api("/export");
    download("tide-workspace.json", JSON.stringify(data, null, 2));
    toast("워크스페이스를 내보냈습니다.");
  },
  schedule: () => {
    const schedules = state.schedules.filter(
      (s) => s.workflowId === ui.workflowId,
    );
    if (schedules.length === 1) return showSchedule(schedules[0].id);
    if (schedules.length > 1) {
      ui.scheduleWorkflow = ui.workflowId;
      return navigate("schedules");
    }
    showSchedule();
  },
  "focus-canvas": () => {
    ui.focusMode = !ui.focusMode;
    render();
  },
  "new-schedule": () => showSchedule(),
  "edit-schedule": (el) => showSchedule(el.dataset.id),
  "day-detail": (el) =>
    modal(renderDayDetail(scheduleContext(), el.dataset.date)),
  "toggle-schedule": async (el) => {
    el.disabled = true;
    try {
      if (ui.dirty) await save(true);
      const s = state.schedules.find((s) => s.id === el.dataset.id);
      await api(`/schedules/${encodeURIComponent(s.id)}/toggle`, {
        method: "POST",
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      await refresh();
      render();
      toast(
        s.enabled
          ? "스케줄을 일시정지했습니다."
          : "스케줄을 다시 시작했습니다.",
      );
    } finally {
      el.disabled = false;
    }
  },
  "test-schedule": async (el) => {
    if (ui.busy) return;
    el.disabled = true;
    ui.busy = true;
    try {
      if (ui.dirty) await save(true);
      const result = await api(
        `/schedules/${encodeURIComponent(el.dataset.id)}/run-now`,
        { method: "POST", body: "{}" },
      );
      await refresh();
      render();
      showRun(result.run.id);
      toast(
        result.run.status === "succeeded"
          ? "즉시 실행이 완료됐습니다. 다음 예약 시각은 유지됩니다."
          : "실행에 실패했습니다. 로그를 확인하세요.",
        result.run.status !== "succeeded",
      );
    } finally {
      ui.busy = false;
      el.disabled = false;
    }
  },
  "delete-schedule": async () => {
    if (!ui.scheduleId) return;
    if (ui.dirty) await save(true);
    await api(`/schedules/${encodeURIComponent(ui.scheduleId)}`, {
      method: "DELETE",
    });
    await refresh();
    $("#dialog").close();
    render();
    toast("스케줄을 삭제했습니다. 기존 실행 기록은 유지됩니다.");
  },
  "new-connection": () =>
    modal(
      `${dialogHead("새 연결 등록", "비밀키는 입력하거나 저장하지 않습니다.")}<form id="connection-form"><label>연결 이름<input name="name" placeholder="예: 상품 API" required maxlength="100"></label><label>서비스 유형<select name="type" id="connection-type"><option value="http">HTTP JSON API</option><option value="aws">AWS · 설정 등록</option><option value="gcp">Google Cloud · 설정 등록</option><option value="azure">Microsoft Azure · 설정 등록</option></select></label><label>HTTPS 주소 <span class="optional">선택</span><input name="url" type="url" placeholder="https://example.com/products.json"></label><label>리전 <span class="optional">선택</span><input name="region" placeholder="예: ap-northeast-2" maxlength="80"></label><p class="field-hint">HTTP는 실제 연결 테스트를 지원합니다. AWS·GCP·Azure는 설정만 보관하며, 원격 작업 실행은 아직 지원하지 않습니다.</p><div class="dialog-footer"><button class="btn primary">연결 등록</button></div></form>`,
    ),
  "test-connection": async (el) => {
    el.disabled = true;
    el.textContent = "확인 중…";
    try {
      const c = await api(
        `/connections/${encodeURIComponent(el.dataset.id)}/test`,
        { method: "POST", body: "{}" },
      );
      await refresh();
      render();
      toast(
        c.status === "connected"
          ? "실제 연결을 확인했습니다."
          : c.status === "unsupported"
            ? "이 클라우드의 실행 어댑터는 아직 지원하지 않습니다."
            : c.error || "연결에 실패했습니다.",
        c.status === "failed",
      );
    } finally {
      el.disabled = false;
    }
  },
  search: () => {
    modal(
      `${dialogHead("워크스페이스에서 찾기")}<label class="search-dialog-input">${icon("search")}<input id="global-search" placeholder="워크플로, 데이터셋 이름 검색" aria-label="검색어"></label><div id="search-results" class="search-results">${searchResults("")}</div>`,
    );
  },
  "open-workflow": (el) => {
    selectWorkflow(el.dataset.id);
    $("#dialog").close();
    navigate("workflows");
  },
};
function scheduleContext() {
  return {
    state,
    ui,
    icon,
    esc,
    fmt,
    date,
    badge,
    button,
    pageHeading,
    dialogHead,
  };
}
function showSchedule(id) {
  ui.scheduleId = id || null;
  modal(
    renderScheduleForm(
      scheduleContext(),
      state.schedules.find((s) => s.id === id),
    ),
  );
}
function searchResults(query) {
  const q = query.toLowerCase();
  const wf = state.workflows.filter((w) => w.name.toLowerCase().includes(q));
  const ds = state.datasets.filter((d) => d.name.toLowerCase().includes(q));
  return `<div class="palette-label">워크플로</div>${wf.map((w) => `<button data-action="open-workflow" data-id="${esc(w.id)}">${icon("workflow")}<span>${esc(w.name)}</span>${icon("chevron")}</button>`).join("") || '<p class="muted">검색 결과 없음</p>'}<div class="palette-label">데이터셋</div>${ds.map((d) => `<button data-action="dataset-detail" data-id="${esc(d.id)}">${icon("database")}<span>${esc(d.name)}</span>${icon("chevron")}</button>`).join("") || '<p class="muted">검색 결과 없음</p>'}`;
}
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  try {
    await actions[el.dataset.action]?.(el);
  } catch (error) {
    toast(error.message, true);
  }
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const values = Object.fromEntries(new FormData(form));
  const submit = form.querySelector(
    '[type="submit"],button:not([type="button"])',
  );
  if (submit) submit.disabled = true;
  try {
    if (form.id === "workflow-form") {
      if (ui.dirty) await save(true);
      const w = await api("/workflows", {
        method: "POST",
        body: JSON.stringify({ name: values.name }),
      });
      await refresh();
      selectWorkflow(w.id);
      $("#dialog").close();
      navigate("workflows");
      toast("새 워크플로가 준비됐습니다.");
    }
    if (form.id === "node-form") {
      const original = current().nodes.find((n) => n.id === form.dataset.id);
      const n = structuredClone(original);
      n.label = values.label.trim();
      if (!n.label) throw new Error("노드 이름을 입력해 주세요.");
      if (n.type === "source") {
        n.config.mode = values.mode;
        if (values.url !== undefined) n.config.url = values.url;
        if (form._records) n.config.records = form._records;
        if (n.config.mode === "upload" && !n.config.records?.length)
          throw new Error("먼저 JSON 파일을 선택해 주세요.");
        if (n.config.mode === "http" && !n.config.url?.trim())
          throw new Error("HTTPS API 주소를 입력해 주세요.");
      }
      if (n.type === "quality")
        n.config.maxInvalidPercent = Number(values.maxInvalidPercent);
      Object.assign(original, n);
      markDirty();
      $("#dialog").close();
      render();
      toast("설정이 적용됐습니다. 저장하거나 실행해 주세요.");
    }
    if (form.id === "edge-form") {
      if (values.source === values.target)
        throw new Error("같은 노드끼리는 연결할 수 없습니다.");
      if (
        current().edges.some(
          (x) => x.source === values.source && x.target === values.target,
        )
      )
        throw new Error("이미 존재하는 연결입니다.");
      current().edges.push({ source: values.source, target: values.target });
      markDirty();
      $("#dialog").close();
      render();
    }
    if (form.id === "connection-form") {
      if (values.type === "http" && !values.url)
        throw new Error("HTTP 연결에는 HTTPS 주소가 필요합니다.");
      await api("/connections", {
        method: "POST",
        body: JSON.stringify(values),
      });
      await refresh();
      $("#dialog").close();
      navigate("connections");
      toast("연결 설정을 등록했습니다.");
    }
    if (form.id === "schedule-form") {
      if (ui.dirty) await save(true);
      const data = {
        name: values.name,
        workflowId: values.workflowId,
        frequency: values.frequency,
        time: values.time,
        timezone: values.timezone,
        daysOfWeek: new FormData(form).getAll("weekday").map(Number),
        enabled: new FormData(form).has("enabled"),
      };
      if (data.frequency === "weekly" && !data.daysOfWeek.length)
        throw new Error("실행할 요일을 하나 이상 선택해 주세요.");
      const id = form.dataset.id;
      const scheduled = await api(
        id ? `/schedules/${encodeURIComponent(id)}` : "/schedules",
        { method: id ? "PUT" : "POST", body: JSON.stringify(data) },
      );
      await refresh();
      $("#dialog").close();
      render();
      toast(
        scheduled.enabled
          ? `스케줄을 저장했습니다. 다음 실행 ${date(scheduled.nextRunAt)}`
          : "일시정지된 스케줄을 저장했습니다.",
      );
    }
    if (form.id === "chat-form") {
      await ask(values.question);
    }
  } catch (error) {
    toast(error.message, true);
  } finally {
    if (submit) submit.disabled = false;
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "schedule-frequency")
    $("#weekday-field").hidden = e.target.value !== "weekly";
  if (e.target.id === "schedule-workflow-filter") {
    ui.scheduleWorkflow = e.target.value;
    render();
  }
  if (e.target.id === "workflow-select") {
    if (ui.dirty) {
      try {
        await save(true);
      } catch (error) {
        e.target.value = ui.workflowId;
        return toast(error.message, true);
      }
    }
    selectWorkflow(e.target.value);
    render();
  }
  if (e.target.id === "ai-workflow-select") {
    selectWorkflow(e.target.value);
    ui.chat = [];
    render();
  }
  if (e.target.id === "run-filter") {
    ui.runFilter = e.target.value;
    render();
  }
  if (e.target.id === "source-mode") {
    const n = current().nodes.find((n) => n.id === ui.nodeId);
    $("#source-options").innerHTML = sourceOptions({
      ...n,
      config: { ...n.config, mode: e.target.value },
    });
  }
  if (e.target.id === "source-file") {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 900000)
        throw new Error("파일은 900KB 이하로 선택해 주세요.");
      const records = JSON.parse(await file.text());
      if (
        !Array.isArray(records) ||
        !records.length ||
        records.some((r) => !r || typeof r !== "object" || Array.isArray(r))
      )
        throw new Error("레코드 객체가 담긴 JSON 배열이 필요합니다.");
      $("#node-form")._records = records;
      $("#upload-status").textContent =
        `${file.name} · ${fmt(records.length)}개 레코드`;
    } catch (error) {
      e.target.value = "";
      toast(error.message, true);
    }
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "global-search")
    $("#search-results").innerHTML = searchResults(e.target.value);
  if (e.target.id === "dataset-search") {
    ui.datasetSearch = e.target.value;
    const start = e.target.selectionStart;
    render();
    const input = $("#dataset-search");
    input.focus();
    input.setSelectionRange(start, start);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ui.focusMode && !$("#dialog").open) {
    ui.focusMode = false;
    render();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    if (!$("#dialog").open) actions.search();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    save()
      .then(render)
      .catch((error) => toast(error.message, true));
  }
});
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
window.addEventListener("hashchange", () => {
  ui.page = navs.some((n) => n[0] === location.hash.slice(1))
    ? location.hash.slice(1)
    : "workflows";
  render();
});
window.addEventListener("beforeunload", (e) => {
  if (drafts.size) {
    e.preventDefault();
    e.returnValue = "";
  }
});
try {
  await refresh();
  render();
} catch (error) {
  $("#app").innerHTML =
    `<div class="boot error-screen">${icon("info")}<h1>워크스페이스에 연결할 수 없어요</h1><p>${esc(error.message)}</p><p>Docker 컨테이너가 실행 중인지 확인해 주세요.</p><button class="btn primary" onclick="location.reload()">다시 연결</button></div>`;
}

setInterval(async () => {
  if (
    !ui.busy &&
    !$("#dialog").open &&
    ["schedules", "runs"].includes(ui.page)
  ) {
    try {
      await refresh();
      render();
    } catch {
      ui.offline = true;
      render();
    }
  }
}, 15000);
