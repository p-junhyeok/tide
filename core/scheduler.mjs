const TIMEZONES = ["Asia/Seoul", "UTC"];

export function validateScheduleConfig(input) {
  if (!input || typeof input !== "object")
    throw new Error("예약 설정이 필요합니다.");
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.length > 120
  )
    throw new Error("예약 이름을 1~120자로 입력하세요.");
  if (typeof input.workflowId !== "string" || !input.workflowId)
    throw new Error("실행할 워크플로를 선택하세요.");
  if (!["daily", "weekly"].includes(input.frequency))
    throw new Error("예약 주기는 매일 또는 매주를 선택하세요.");
  if (
    typeof input.time !== "string" ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)
  )
    throw new Error("실행 시간은 HH:mm 형식으로 입력하세요.");
  if (!TIMEZONES.includes(input.timezone))
    throw new Error("시간대는 Asia/Seoul 또는 UTC를 선택하세요.");
  if (input.enabled != null && typeof input.enabled !== "boolean")
    throw new Error("예약 활성화 여부는 true 또는 false여야 합니다.");
  let daysOfWeek = [];
  if (input.frequency === "weekly") {
    if (
      !Array.isArray(input.daysOfWeek) ||
      !input.daysOfWeek.length ||
      input.daysOfWeek.some(
        (day) => !Number.isInteger(day) || day < 0 || day > 6,
      )
    )
      throw new Error(
        "매주 예약은 일요일(0)~토요일(6) 중 실행할 요일을 선택하세요.",
      );
    daysOfWeek = [...new Set(input.daysOfWeek)].sort((a, b) => a - b);
  }
  return {
    name: input.name.trim(),
    workflowId: input.workflowId,
    frequency: input.frequency,
    time: input.time,
    daysOfWeek,
    timezone: input.timezone,
    enabled: input.enabled ?? true,
  };
}

// Supported zones do not observe daylight saving time. Intl determines the
// local calendar date; the explicit offsets convert that wall time to UTC.
export function computeNextRun(schedule, afterISO = new Date().toISOString()) {
  const config = validateScheduleConfig(schedule);
  if (!config.enabled) return null;
  const after = new Date(afterISO);
  if (!Number.isFinite(after.getTime()))
    throw new Error("다음 실행을 계산할 기준 시각이 올바르지 않습니다.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(after);
  const component = (type) =>
    Number(parts.find((part) => part.type === type).value);
  const [hour, minute] = config.time.split(":").map(Number);
  const offset = config.timezone === "Asia/Seoul" ? 9 * 60 * 60 * 1000 : 0;
  const localDay = Date.UTC(
    component("year"),
    component("month") - 1,
    component("day"),
  );
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const localDate = new Date(localDay + dayOffset * 86400000);
    if (
      config.frequency === "weekly" &&
      !config.daysOfWeek.includes(localDate.getUTCDay())
    )
      continue;
    const candidate =
      localDate.getTime() + (hour * 60 + minute) * 60000 - offset;
    if (candidate > after.getTime()) return new Date(candidate).toISOString();
  }
  throw new Error("다음 실행 시각을 계산하지 못했습니다.");
}

export async function recordScheduleResult(
  store,
  scheduleId,
  result,
  error,
  timestamp = new Date().toISOString(),
) {
  const state = await store.read();
  const schedule = state.schedules?.find((item) => item.id === scheduleId);
  if (!schedule) return;
  schedule.lastRunAt = result?.run.startedAt ?? timestamp;
  schedule.lastRunId = result?.run.id ?? null;
  schedule.lastError =
    error?.message ??
    (result?.run.status === "failed"
      ? (result.run.nodes.find((node) => node.status === "failed")?.error ??
        "예약 실행이 실패했습니다.")
      : null);
  await store.write(state);
}

// Call inside the same serial queue used for mutations. Claiming the next
// occurrence before execution prevents duplicate dispatch after a restart;
// a crash after this write can skip that occurrence (no automatic backfill).
export async function runDueSchedules(
  store,
  execute,
  timestamp = new Date().toISOString(),
) {
  const tick = new Date(timestamp);
  if (!Number.isFinite(tick.getTime()))
    throw new Error("예약 확인 시각이 올바르지 않습니다.");
  const state = await store.read();
  const dueIds = (state.schedules ?? [])
    .filter(
      (schedule) =>
        schedule.enabled &&
        schedule.nextRunAt &&
        new Date(schedule.nextRunAt).getTime() <= tick.getTime(),
    )
    .map((schedule) => schedule.id);
  const outcomes = [];
  for (const id of dueIds) {
    const latest = await store.read();
    const schedule = latest.schedules?.find((item) => item.id === id);
    if (
      !schedule?.enabled ||
      !schedule.nextRunAt ||
      new Date(schedule.nextRunAt).getTime() > tick.getTime()
    )
      continue;
    const scheduledFor = schedule.nextRunAt;
    try {
      schedule.nextRunAt = computeNextRun(schedule, timestamp);
    } catch (error) {
      schedule.enabled = false;
      schedule.nextRunAt = null;
      schedule.lastError = error.message;
      await store.write(latest);
      outcomes.push({ scheduleId: id, error: error.message });
      continue;
    }
    await store.write(latest);
    try {
      const result = await execute(store, schedule.workflowId, {
        trigger: "scheduled",
        scheduleId: id,
        scheduledFor,
      });
      await recordScheduleResult(store, id, result, null, timestamp);
      outcomes.push({
        scheduleId: id,
        runId: result.run.id,
        status: result.run.status,
      });
    } catch (error) {
      await recordScheduleResult(store, id, null, error, timestamp);
      outcomes.push({ scheduleId: id, error: error.message });
    }
  }
  return outcomes;
}
