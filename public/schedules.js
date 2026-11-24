const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
export function dayKey(value, timezone = "Asia/Seoul") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function calendarDays() {
  const today = dayKey(new Date());
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + ((7 - end.getUTCDay()) % 7));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 181);
  return Array.from({ length: 182 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
export function frequencyLabel(s) {
  return `${s.frequency === "daily" ? "매일" : s.daysOfWeek?.map((n) => weekdayNames[n]).join("·") + "요일"} ${s.time}`;
}
export function renderSchedules(c) {
  const { state, ui, icon, esc, date, badge, button, pageHeading } = c;
  const schedules = state.schedules || [];
  const filtered = schedules.filter(
    (s) =>
      ui.scheduleWorkflow === "all" || s.workflowId === ui.scheduleWorkflow,
  );
  const runs = state.runs.filter(
    (r) =>
      ui.scheduleWorkflow === "all" || r.workflowId === ui.scheduleWorkflow,
  );
  const days = calendarDays(),
    today = dayKey(new Date());
  const grouped = new Map(days.map((day) => [day, []]));
  runs.forEach((r) => grouped.get(dayKey(r.startedAt))?.push(r));
  const enabled = schedules.filter((s) => s.enabled);
  const next = enabled
    .filter((s) => s.nextRunAt)
    .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))[0];
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  let lastMonth = "";
  const months = Array.from({ length: 26 }, (_, i) => {
    const key = days[i * 7];
    const month = Number(key.slice(5, 7));
    const text = month === lastMonth ? "" : `${month}월`;
    lastMonth = month;
    return `<span>${text}</span>`;
  }).join("");
  return `${ui.offline ? `<div class="notice offline-notice">${icon("info")}<span>로컬 서버와 연결이 끊겼습니다. 아래는 마지막으로 확인한 상태입니다. Docker 컨테이너를 확인해 주세요. 마지막 확인: ${date(ui.lastSyncedAt)}</span></div>` : ""}${pageHeading("A RHYTHM FOR YOUR DATA", "데이터에도, 꾸준한 리듬을.", "워크플로마다 실행 시간을 정하고, 매일의 흐름을 잔디로 확인하세요.", button("새 스케줄", "new-schedule", { primary: true, icon: "plus" }))}
  <div class="metrics-row schedule-metrics"><div class="metric"><span class="metric-icon mint">${icon("calendar")}</span><div><span>활성 스케줄</span><strong>${enabled.length}<small>개</small></strong></div><span class="metric-hint">전체 ${schedules.length}개 중</span></div><div class="metric"><span class="metric-icon blue">${icon("clock")}</span><div><span>다음 예약 실행</span><strong class="next-run-metric">${next ? date(next.nextRunAt) : "예약 없음"}</strong></div></div><div class="metric"><span class="metric-icon purple">${icon("check")}</span><div><span>저장된 성공 실행</span><strong>${succeeded}<small>회</small></strong></div><span class="metric-hint">현재 조회 범위</span></div></div>
  <section class="surface calendar-panel"><div class="section-toolbar"><div><h2>${icon("grid")} 실행 캘린더</h2><p>최근 6개월 · 실제 실행 기록 기준 · 날짜를 눌러 로그를 확인하세요</p></div><select id="schedule-workflow-filter" aria-label="스케줄 워크플로 필터"><option value="all">모든 워크플로</option>${state.workflows.map((w) => `<option value="${esc(w.id)}" ${ui.scheduleWorkflow === w.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></div>
  <div class="calendar-scroll"><div class="calendar-inner"><div class="calendar-months">${months}</div><div class="calendar-with-days"><div class="calendar-weekdays"><span>월</span><span></span><span>수</span><span></span><span>금</span><span></span><span>일</span></div><div class="heatmap">${days
    .map((day) => {
      const dayRuns = grouped.get(day);
      const good = dayRuns.filter((r) => r.status === "succeeded").length,
        bad = dayRuns.filter((r) => r.status === "failed").length;
      const future = day > today;
      const cls = future
        ? "future"
        : bad
          ? good
            ? "mixed"
            : "failed"
          : good
            ? good > 2
              ? "level3"
              : good > 1
                ? "level2"
                : "level1"
            : "empty-day";
      const label = `${day} · ${future ? "예정일" : dayRuns.length ? `${dayRuns.length}회 실행 · 성공 ${good} · 실패 ${bad}` : "실행 없음"}`;
      return `<button class="heatmap-day ${cls} ${day === today ? "today" : ""}" data-action="day-detail" data-date="${day}" title="${esc(label)}" aria-label="${esc(label)}" ${future ? "disabled" : ""}></button>`;
    })
    .join("")}</div></div></div></div>
  <div class="calendar-legend"><span>Asia/Seoul 기준 · 최근 1,000회 실행을 보관합니다</span><div><i class="legend-square empty-day"></i>실행 없음<i class="legend-square level1"></i>성공<i class="legend-square mixed"></i>일부 실패<i class="legend-square failed"></i>실패</div></div></section>
  <section class="surface schedule-table"><div class="section-toolbar"><div><h2>등록된 스케줄 <span class="count">${filtered.length}</span></h2><p>워크플로별로 여러 예약을 독립적으로 관리할 수 있습니다</p></div><span class="scheduler-status ${ui.offline ? "offline" : ""}"><span class="tiny-dot"></span>${ui.offline ? "서버 연결 끊김" : "Local scheduler · 15초 간격 확인"}</span></div>
  ${
    filtered.length
      ? `<div class="table-scroll"><table><thead><tr><th>스케줄 / 워크플로</th><th>실행 주기</th><th>다음 실행 · 한국 시간</th><th>최근 실행</th><th>예약 상태</th><th>관리</th></tr></thead><tbody>${filtered
          .map((s) => {
            const last = state.runs.find((r) => r.id === s.lastRunId);
            return `<tr><td><button class="schedule-title" data-action="edit-schedule" data-id="${esc(s.id)}">${esc(s.name)}</button><small class="block">${esc(state.workflows.find((w) => w.id === s.workflowId)?.name || s.workflowId)}</small>${s.lastError ? `<small class="error-text block">${esc(s.lastError)}</small>` : ""}</td><td><strong>${esc(frequencyLabel(s))}</strong><small class="block">${esc(s.timezone)}</small></td><td>${s.enabled ? date(s.nextRunAt) : "일시정지"}${s.enabled && s.nextRunAt && s.nextRunAt < new Date().toISOString() ? '<small class="block">예약 시간 도달 · 실행 대기</small>' : ""}</td><td>${last ? `<button class="text-button" data-action="run-detail" data-id="${esc(last.id)}">${badge(last.status)}</button>` : s.lastRunAt ? date(s.lastRunAt) : '<span class="muted">아직 실행하지 않음</span>'}</td><td><button class="schedule-toggle ${s.enabled ? "on" : ""}" role="switch" aria-checked="${s.enabled}" aria-label="${esc(s.name)} ${s.enabled ? "일시정지" : "재개"}" data-action="toggle-schedule" data-id="${esc(s.id)}"><span></span></button><span class="toggle-label">${s.enabled ? "활성" : "일시정지"}</span></td><td><div class="schedule-actions"><button class="icon-btn" data-action="test-schedule" data-id="${esc(s.id)}" aria-label="${esc(s.name)} 지금 실행" title="예약을 변경하지 않고 지금 실행">${icon("play")}</button><button class="btn small" data-action="edit-schedule" data-id="${esc(s.id)}">설정</button></div></td></tr>`;
          })
          .join("")}</tbody></table></div>`
      : `<div class="empty schedule-empty">${icon("calendar")}<h3>반복되는 일은 스케줄에 맡기세요</h3><p>매일 아침 9시, 또는 필요한 요일만.<br>워크플로마다 실행 시간을 자유롭게 설정하세요.</p>${button("첫 스케줄 만들기", "new-schedule", { primary: true, icon: "plus" })}</div>`
  }</section>
  <div class="schedule-footnote">${icon("info")}컴퓨터와 Docker 컨테이너가 켜져 있을 때 실행됩니다. 중단 중 지난 예약은 재시작 시 한 번으로 합쳐 실행하며, 전체 기간을 자동 재처리하지 않습니다.</div>`;
}
export function renderScheduleForm(c, schedule) {
  const { state, ui, icon, esc, button, dialogHead } = c;
  const s = schedule || {
    workflowId: ui.workflowId,
    name: "",
    frequency: "daily",
    time: "09:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    timezone: "Asia/Seoul",
    enabled: true,
  };
  return `${dialogHead(schedule ? "스케줄 설정" : "새로운 실행 리듬", "워크플로마다 독립적인 실행 시간을 설정하세요.")}<form id="schedule-form" ${schedule ? `data-id="${esc(s.id)}"` : ""}><label>워크플로<select name="workflowId" required>${state.workflows.map((w) => `<option value="${esc(w.id)}" ${w.id === s.workflowId ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label><label>스케줄 이름<input name="name" placeholder="예: 매일 아침 상품 가격 갱신" value="${esc(s.name)}" maxlength="100" required></label><div class="form-columns"><label>실행 주기<select name="frequency" id="schedule-frequency"><option value="daily" ${s.frequency === "daily" ? "selected" : ""}>매일</option><option value="weekly" ${s.frequency === "weekly" ? "selected" : ""}>요일 선택</option></select></label><label>실행 시간<input name="time" type="time" value="${esc(s.time)}" required></label></div><fieldset class="weekday-field" id="weekday-field" ${s.frequency === "daily" ? "hidden" : ""}><legend>실행할 요일</legend><div class="weekday-choices">${[1, 2, 3, 4, 5, 6, 0].map((n) => `<label><input type="checkbox" name="weekday" value="${n}" ${s.daysOfWeek?.includes(n) ? "checked" : ""}><span>${weekdayNames[n]}</span></label>`).join("")}</div></fieldset><label>시간대<select name="timezone"><option value="Asia/Seoul" ${s.timezone === "Asia/Seoul" ? "selected" : ""}>Asia/Seoul · 한국 시간</option><option value="UTC" ${s.timezone === "UTC" ? "selected" : ""}>UTC · 협정 세계시</option></select></label><label class="checkbox-label"><input name="enabled" type="checkbox" ${s.enabled ? "checked" : ""}>스케줄 활성화</label><div class="schedule-preview">${icon("calendar")}<p>저장 후 다음 실행 시각을 계산합니다. 예약은 Docker 컨테이너가 실행 중일 때 동작합니다.</p></div><div class="dialog-footer">${schedule ? button("스케줄 삭제", "delete-schedule", { class: "danger" }) : ""}<button class="btn primary" type="submit">${schedule ? "변경 사항 저장" : "스케줄 만들기"}</button></div></form>`;
}
export function renderDayDetail(c, day) {
  const { state, ui, esc, date, badge, dialogHead } = c;
  const runs = state.runs.filter(
    (r) =>
      dayKey(r.startedAt) === day &&
      (ui.scheduleWorkflow === "all" || r.workflowId === ui.scheduleWorkflow),
  );
  return `${dialogHead(`${esc(day)} 실행 기록`, `${runs.length}회 실행 · Asia/Seoul 기준`)}${runs.length ? `<div class="day-run-list">${runs.map((r) => `<button data-action="run-detail" data-id="${esc(r.id)}"><span><strong>${esc(r.workflowName)}</strong><small>${date(r.startedAt)} · ${r.trigger === "scheduled" ? "예약 실행" : r.trigger === "schedule-test" ? "스케줄 즉시 실행" : "수동 실행"}</small></span>${badge(r.status)}</button>`).join("")}</div>` : '<div class="calendar-day-empty"><p>이 날짜에 기록된 실행이 없습니다.</p><small>예약이 있더라도 실제 실행 전에는 잔디에 표시하지 않습니다.</small></div>'}`;
}
