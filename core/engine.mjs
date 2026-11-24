const TYPES = ["source", "raw", "transform", "quality", "mart", "assistant"];
const PREDECESSORS = {
  source: [],
  raw: ["source"],
  transform: ["raw"],
  quality: ["transform"],
  mart: ["quality"],
  assistant: ["mart"],
};
const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;

export function createInitialState() {
  const labels = [
    "상품 데이터 수집",
    "원본 데이터 적재",
    "데이터 정제",
    "데이터 품질 검사",
    "가격 분석 마트",
    "데이터 조회 도구",
  ];
  const positions = [
    [60, 60],
    [340, 60],
    [620, 60],
    [620, 280],
    [340, 280],
    [60, 280],
  ];
  const nodes = TYPES.map((type, i) => ({
    id: `node-${type}`,
    type,
    label: labels[i],
    x: positions[i][0],
    y: positions[i][1],
    config:
      type === "source"
        ? { mode: "sample" }
        : type === "quality"
          ? { maxInvalidPercent: 10 }
          : {},
  }));
  return {
    workflows: [
      {
        id: "wf-commerce",
        name: "커머스 데이터에서 AI 인사이트까지",
        description:
          "상품 가격을 수집하고, 신뢰할 수 있는 데이터 마트로 질문에 답하세요.",
        updatedAt: now(),
        nodes,
        edges: nodes
          .slice(1)
          .map((node, i) => ({ source: nodes[i].id, target: node.id })),
      },
    ],
    runs: [],
    datasets: [],
    connections: [],
    schedules: [],
  };
}

export function validateWorkflow(workflow) {
  if (
    !workflow ||
    typeof workflow.id !== "string" ||
    !workflow.id ||
    typeof workflow.name !== "string" ||
    !workflow.name.trim() ||
    workflow.name.length > 120
  )
    throw new Error("워크플로 ID와 이름(120자 이하)이 필요합니다.");
  if (
    !Array.isArray(workflow.nodes) ||
    !workflow.nodes.length ||
    workflow.nodes.length > 6 ||
    !Array.isArray(workflow.edges)
  )
    throw new Error("워크플로에는 1~6개의 작업과 연결 목록이 필요합니다.");
  const nodes = new Map();
  const seenTypes = new Set();
  for (const node of workflow.nodes) {
    if (!node || typeof node.id !== "string" || !node.id || nodes.has(node.id))
      throw new Error("작업 ID는 비어 있지 않고 서로 달라야 합니다.");
    if (!TYPES.includes(node.type) || seenTypes.has(node.type))
      throw new Error("첫 버전은 각 작업 유형을 하나씩 지원합니다.");
    if (
      typeof node.label !== "string" ||
      !node.label.trim() ||
      node.label.length > 120
    )
      throw new Error("작업 이름은 1~120자로 입력하세요.");
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y))
      throw new Error("작업 위치가 올바르지 않습니다.");
    if (
      node.config != null &&
      (typeof node.config !== "object" || Array.isArray(node.config))
    )
      throw new Error("작업 설정은 객체여야 합니다.");
    if (node.type === "source") {
      const mode = node.config?.mode ?? "sample";
      if (!["sample", "upload", "http"].includes(mode))
        throw new Error("지원하지 않는 데이터 소스입니다.");
      if (mode === "upload") validateRecords(node.config?.records);
      if (
        mode === "http" &&
        (typeof node.config?.url !== "string" || !node.config.url.trim())
      )
        throw new Error("HTTPS JSON API 주소를 입력하세요.");
    }
    if (node.type === "quality") {
      const threshold = node.config?.maxInvalidPercent ?? 10;
      if (
        typeof threshold !== "number" ||
        !Number.isFinite(threshold) ||
        threshold < 0 ||
        threshold > 100
      )
        throw new Error("허용 오류 비율은 0~100 사이 숫자여야 합니다.");
    }
    seenTypes.add(node.type);
    nodes.set(node.id, node);
  }
  if (!seenTypes.has("source"))
    throw new Error("데이터 소스 작업이 필요합니다.");
  const indegree = new Map([...nodes.keys()].map((id) => [id, 0]));
  const next = new Map([...nodes.keys()].map((id) => [id, []]));
  const edgeKeys = new Set();
  for (const edge of workflow.edges) {
    if (!edge || !nodes.has(edge.source) || !nodes.has(edge.target))
      throw new Error("연결 대상 작업을 찾을 수 없습니다.");
    const key = `${edge.source}:${edge.target}`;
    if (edgeKeys.has(key)) throw new Error("중복된 연결이 있습니다.");
    edgeKeys.add(key);
    indegree.set(edge.target, indegree.get(edge.target) + 1);
    next.get(edge.source).push(edge.target);
  }
  const queue = [...indegree]
    .filter(([, count]) => count === 0)
    .map(([id]) => id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(nodes.get(id));
    for (const target of next.get(id)) {
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }
  if (order.length !== nodes.size)
    throw new Error("순환 연결은 실행할 수 없습니다. 작업 순서를 확인하세요.");
  for (const node of workflow.nodes) {
    const parents = workflow.edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => nodes.get(edge.source));
    if (node.type === "source" && parents.length)
      throw new Error("데이터 소스는 첫 작업이어야 합니다.");
    if (
      node.type !== "source" &&
      (parents.length !== 1 ||
        !PREDECESSORS[node.type].includes(parents[0].type))
    )
      throw new Error(
        `${node.label}: 수집 → 원본 → 정제 → 품질 검사 → 마트 → 조회 도구 순서로 연결하세요.`,
      );
  }
  return order;
}

export function validateRecords(records) {
  if (
    !Array.isArray(records) ||
    !records.length ||
    records.length > 10000 ||
    records.some((row) => !row || typeof row !== "object" || Array.isArray(row))
  )
    throw new Error(
      "데이터는 1~10,000개의 객체를 담은 JSON 배열이어야 합니다.",
    );
  return records;
}

function sampleRecords() {
  const products = [
    ["SKU-001", "무선 노이즈 캔슬링 헤드폰", "전자기기", 129000],
    ["SKU-002", "기계식 키보드", "전자기기", 89000],
    ["SKU-003", "USB-C 멀티 허브", "전자기기", 45000],
    ["SKU-004", "데스크 조명", "리빙", 39000],
    ["SKU-005", "스테인리스 텀블러", "리빙", 24000],
    ["SKU-006", "에스프레소 원두 500g", "식품", 18000],
    ["SKU-007", "오가닉 그래놀라", "식품", 12000],
    ["SKU-008", "캔버스 토트백", "패션", 29000],
    ["SKU-009", "미니 블루투스 스피커", "전자기기", 59000],
    ["SKU-010", "노트북 스탠드", "리빙", 35000],
    ["SKU-011", "트레일 러닝 양말", "패션", 15000],
    ["SKU-012", "드립 커피 세트", "식품", 32000],
  ];
  const rows = [];
  for (let day = 0; day < 8; day++)
    for (let i = 0; i < products.length; i++) {
      const [sku, name, category, base] = products[i];
      const step = ((i % 5) - 2) * 0.0125;
      rows.push({
        sku,
        name,
        category,
        price: Math.round((base * (1 + step * day)) / 100) * 100,
        previous_price:
          Math.round((base * (1 + step * Math.max(0, day - 1))) / 100) * 100,
        date: `2026-11-${String(17 + day).padStart(2, "0")}`,
      });
    }
  return [
    ...rows,
    clone(rows[0]),
    clone(rows[1]),
    {
      sku: "INVALID",
      name: "검사 예시",
      price: -1,
      previous_price: 100,
      date: "2026-11-24",
    },
  ];
}

function normalize(row) {
  const sku = String(row.sku ?? "").trim();
  const name = String(row.name ?? "").trim();
  const date = typeof row.date === "string" ? row.date.trim() : "";
  const price =
    !["number", "string"].includes(typeof row.price) || row.price === ""
      ? NaN
      : Number(row.price);
  const previous_price =
    !["number", "string"].includes(typeof row.previous_price) ||
    row.previous_price === ""
      ? NaN
      : Number(row.previous_price);
  if (
    !sku ||
    !name ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(previous_price) ||
    previous_price <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  )
    return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    return null;
  return {
    sku,
    name,
    category: String(row.category ?? "미분류").trim() || "미분류",
    price,
    previous_price,
    date,
  };
}

export function executeWorkflow(workflow, previousDatasets = [], options = {}) {
  const order = validateWorkflow(workflow);
  const startedAt = now();
  const start = performance.now();
  const runId = uid("run");
  const run = {
    id: runId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    status: "running",
    startedAt,
    finishedAt: null,
    durationMs: 0,
    nodes: [],
    workflowSnapshot: clone(workflow),
    summary: {},
  };
  const outputs = new Map();
  const produced = [];
  let failed = false;
  for (const node of order) {
    const parentId = workflow.edges.find(
      (edge) => edge.target === node.id,
    )?.source;
    const input = outputs.get(parentId);
    const entry = {
      nodeId: node.id,
      label: node.label,
      type: node.type,
      status: "running",
      startedAt: now(),
      finishedAt: null,
      inputRows: input?.rows?.length ?? 0,
      outputRows: 0,
      logs: [],
    };
    run.nodes.push(entry);
    if (failed) {
      entry.status = "skipped";
      entry.logs.push("선행 작업 실패로 실행을 건너뛰었습니다.");
      entry.finishedAt = now();
      continue;
    }
    try {
      let output;
      let layer;
      if (node.type === "source") {
        if (options.sourceError) throw new Error(options.sourceError);
        const mode = node.config?.mode ?? "sample";
        const rows =
          mode === "sample"
            ? sampleRecords()
            : validateRecords(node.config?.records);
        output = {
          rows: clone(rows),
          stats: { sourceRows: rows.length, invalidRows: 0, duplicateRows: 0 },
          datasetId: null,
        };
        entry.logs.push(
          `${mode === "sample" ? "샘플 상품 데이터" : mode === "http" ? "HTTPS JSON API" : "업로드 데이터"} ${rows.length}건을 읽었습니다.`,
        );
      } else if (node.type === "raw") {
        output = { ...input, rows: clone(input.rows) };
        layer = "raw";
        entry.logs.push("원본 레코드를 변경 없이 저장했습니다.");
      } else if (node.type === "transform") {
        const unique = new Map();
        let invalidRows = 0;
        let duplicateRows = 0;
        for (const row of input.rows) {
          const normalized = normalize(row);
          if (!normalized) {
            invalidRows++;
            continue;
          }
          const key = `${normalized.sku}\u0000${normalized.date}`;
          if (unique.has(key)) duplicateRows++;
          unique.set(key, normalized);
        }
        output = {
          ...input,
          rows: [...unique.values()],
          stats: { sourceRows: input.rows.length, invalidRows, duplicateRows },
        };
        layer = "staging";
        entry.logs.push(
          `필드 정규화 완료 · 유효 ${output.rows.length}건 · 오류 ${invalidRows}건 · 중복 ${duplicateRows}건 제거`,
        );
      } else if (node.type === "quality") {
        const ratio = input.stats.sourceRows
          ? (input.stats.invalidRows / input.stats.sourceRows) * 100
          : 100;
        const limit = node.config?.maxInvalidPercent ?? 10;
        entry.logs.push(`오류 비율 ${ratio.toFixed(2)}% / 허용 ${limit}%`);
        if (!input.rows.length)
          throw new Error("품질 검사 실패: 유효한 데이터가 없습니다.");
        if (ratio > limit)
          throw new Error(
            `품질 검사 실패: 오류 비율 ${ratio.toFixed(2)}%가 허용 ${limit}%를 초과했습니다.`,
          );
        output = { ...input, qualityPassed: true };
        entry.logs.push("데이터 품질 기준을 통과했습니다.");
      } else if (node.type === "mart") {
        if (!input.qualityPassed)
          throw new Error(
            "품질 검사를 통과한 데이터만 마트로 생성할 수 있습니다.",
          );
        const latest = new Map();
        for (const row of input.rows)
          if (!latest.has(row.sku) || latest.get(row.sku).date <= row.date)
            latest.set(row.sku, row);
        const rows = [...latest.values()].map((row) => ({
          ...row,
          change_percent: Number(
            ((row.price / row.previous_price - 1) * 100).toFixed(2),
          ),
        }));
        output = { ...input, rows };
        layer = "mart";
        entry.logs.push(
          `상품별 최신 가격 ${rows.length}건과 이전 가격 대비 변동률을 계산했습니다.`,
        );
      } else {
        output = { ...input, toolReady: true };
        entry.logs.push(
          "실제 마트를 읽는 데이터 조회 도구가 준비되었습니다. LangGraph/LLM은 아직 연결하지 않았습니다.",
        );
      }
      if (layer) {
        const datasetId = `${workflow.id}-${layer}`;
        const dataset = {
          id: datasetId,
          name: `${layer}.product_prices`,
          layer,
          rows: clone(output.rows),
          columns: [...new Set(output.rows.flatMap((row) => Object.keys(row)))],
          rowCount: output.rows.length,
          updatedAt: now(),
          runId,
          workflowId: workflow.id,
          upstream: input?.datasetId ? [input.datasetId] : [],
          stats: clone(output.stats),
          qualityPassed: layer === "mart",
        };
        produced.push(dataset);
        output.datasetId = datasetId;
      }
      outputs.set(node.id, output);
      entry.outputRows = output.rows.length;
      entry.status = "succeeded";
    } catch (error) {
      entry.status = "failed";
      entry.error = error.message;
      entry.logs.push(error.message);
      failed = true;
    }
    entry.finishedAt = now();
  }
  run.status = failed ? "failed" : "succeeded";
  run.finishedAt = now();
  run.durationMs = Math.max(1, Math.round(performance.now() - start));
  const last = [...outputs.values()].at(-1);
  run.summary = {
    sourceRows: last?.stats.sourceRows ?? 0,
    invalidRows: last?.stats.invalidRows ?? 0,
    duplicateRows: last?.stats.duplicateRows ?? 0,
    outputRows:
      produced.find((dataset) => dataset.layer === "mart")?.rowCount ?? 0,
    datasetsCreated: produced.length,
  };
  const replacements = new Map(
    produced.map((dataset) => [dataset.id, dataset]),
  );
  const datasets = previousDatasets.map(
    (dataset) => replacements.get(dataset.id) ?? clone(dataset),
  );
  for (const dataset of produced)
    if (!previousDatasets.some((previous) => previous.id === dataset.id))
      datasets.push(dataset);
  return { run, datasets };
}

export function answerQuestion(state, question, workflowId) {
  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.length > 2000
  )
    throw new Error("질문을 1~2,000자로 입력하세요.");
  const dataset = state.datasets
    .filter(
      (item) =>
        item.layer === "mart" &&
        (!workflowId || item.workflowId === workflowId),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (!dataset?.rows.length)
    throw new Error(
      "아직 조회할 데이터 마트가 없습니다. 먼저 워크플로를 실행하세요.",
    );
  const questionText = question.trim();
  const allRows = dataset.rows;
  let rows;
  let answer;
  const won = (value) => `${Math.round(value).toLocaleString("ko-KR")}원`;
  if (/오른|상승|인상|비싸진|증가/.test(questionText)) {
    rows = allRows
      .filter((row) => row.change_percent > 0)
      .sort((a, b) => b.change_percent - a.change_percent);
    answer = rows.length
      ? `이전 가격보다 오른 상품은 ${rows.length}개입니다. 가장 많이 오른 상품은 ${rows[0].name}으로 ${rows[0].change_percent}% 상승해 ${won(rows[0].price)}입니다.`
      : "이전 가격보다 오른 상품이 없습니다.";
  } else if (/내린|하락|인하|저렴|감소|떨어진/.test(questionText)) {
    rows = allRows
      .filter((row) => row.change_percent < 0)
      .sort((a, b) => a.change_percent - b.change_percent);
    answer = rows.length
      ? `이전 가격보다 내린 상품은 ${rows.length}개입니다. 가장 많이 내린 상품은 ${rows[0].name}으로 ${Math.abs(rows[0].change_percent)}% 하락해 ${won(rows[0].price)}입니다.`
      : "이전 가격보다 내린 상품이 없습니다.";
  } else if (/카테고리|분류/.test(questionText)) {
    rows = [...new Set(allRows.map((row) => row.category))].map((category) => {
      const items = allRows.filter((row) => row.category === category);
      return {
        category,
        product_count: items.length,
        average_price: Math.round(
          items.reduce((sum, row) => sum + row.price, 0) / items.length,
        ),
      };
    });
    answer = `${rows.length}개 카테고리를 조회했습니다. ${rows.map((row) => `${row.category} ${row.product_count}개, 평균 ${won(row.average_price)}`).join(" / ")}`;
  } else if (/평균/.test(questionText)) {
    rows = [
      {
        product_count: allRows.length,
        average_price: Math.round(
          allRows.reduce((sum, row) => sum + row.price, 0) / allRows.length,
        ),
      },
    ];
    answer = `최신 상품 ${allRows.length}개의 평균 가격은 ${won(rows[0].average_price)}입니다.`;
  } else if (/몇|개수|건수|전체|요약|현황|목록|상품/.test(questionText)) {
    rows = allRows;
    answer = `최신 상품은 ${allRows.length}개입니다. 가격 상승 ${allRows.filter((row) => row.change_percent > 0).length}개, 하락 ${allRows.filter((row) => row.change_percent < 0).length}개, 변동 없음 ${allRows.filter((row) => row.change_percent === 0).length}개입니다.`;
  } else {
    throw new Error(
      "현재 데이터 조회 도구는 가격 상승·하락, 평균 가격, 상품 수, 카테고리 요약을 지원합니다. 예: “가격이 오른 상품을 알려줘”",
    );
  }
  return {
    answer,
    sources: [
      {
        datasetId: dataset.id,
        name: dataset.name,
        updatedAt: dataset.updatedAt,
        runId: dataset.runId,
      },
    ],
    rows: clone(rows),
    mode: "data-tool",
  };
}
