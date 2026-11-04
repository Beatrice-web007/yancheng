(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const C = YC.components;
  const icon = YC.ui.icon;

  function uiState() {
    return YC.app.ui;
  }

  function shiftMonth(iso, delta) {
    const date = U.parseISO(iso);
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + delta);
    const max = U.monthDays(date.getFullYear(), date.getMonth());
    date.setDate(Math.min(day, max));
    return U.toISO(date);
  }

  function isoWeekNumber(iso) {
    const date = U.parseISO(iso);
    const target = new Date(date.getTime());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstDayNr = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
    return 1 + Math.round((target - firstThursday) / (7 * 86400000));
  }

  function eventsByDate(events) {
    return events.reduce((map, event) => {
      (map[event.date] || (map[event.date] = [])).push(event);
      return map;
    }, {});
  }

  function toolbar() {
    const ui = uiState();
    const today = U.todayISO();
    const selected = ui.selectedDate || today;
    let title = "";
    let sub = "";
    if (ui.scheduleView === "month") {
      const date = U.parseISO(selected);
      title = U.monthLabel(date.getFullYear(), date.getMonth());
      sub = `${date.getFullYear()} 年 · ${U.monthDays(date.getFullYear(), date.getMonth())} 天`;
    } else if (ui.scheduleView === "week") {
      const start = U.startOfWeek(selected);
      const end = U.endOfWeek(selected);
      title = `${U.dateCompact(start)} – ${U.dateCompact(end)}`;
      sub = `${U.parseISO(selected).getFullYear()} 年 · 第 ${isoWeekNumber(selected)} 周`;
    } else {
      title = U.dateLongCN(selected).split(" · ")[0];
      sub = `${U.numericDate(selected).slice(0, 4)} · ${U.weekdayFull(selected)}${selected === today ? " · 今天" : ""}`;
    }
    const viewButton = (value, label, iconName) => `
      <button type="button" data-action="set-schedule-view" data-view="${value}"
              class="${ui.scheduleView === value ? "is-active" : ""}" aria-pressed="${ui.scheduleView === value ? "true" : "false"}">
        ${icon(iconName)}${label}
      </button>`;
    return `
      <div class="schedule-toolbar">
        <div class="date-nav">
          <button class="icon-btn" type="button" data-action="calendar-prev" aria-label="上一${ui.scheduleView === "day" ? "天" : ui.scheduleView === "week" ? "周" : "月"}">${icon("left")}</button>
          <div class="date-nav-copy"><strong>${U.esc(title)}</strong><span>${U.esc(sub)}</span></div>
          <button class="icon-btn" type="button" data-action="calendar-next" aria-label="下一${ui.scheduleView === "day" ? "天" : ui.scheduleView === "week" ? "周" : "月"}">${icon("right")}</button>
          <button class="btn btn--secondary btn--small" type="button" data-action="calendar-today">今天</button>
        </div>
        <div class="segmented" role="group" aria-label="日历视图">
          ${viewButton("month", "月", "grid")}
          ${viewButton("week", "周", "columns")}
          ${viewButton("day", "日", "list")}
        </div>
      </div>`;
  }

  function monthView() {
    const ui = uiState();
    const today = U.todayISO();
    const selected = ui.selectedDate || today;
    const date = U.parseISO(selected);
    const year = date.getFullYear();
    const month = date.getMonth();
    const grid = U.monthGrid(year, month);
    const map = eventsByDate(S.getState().events);
    const currentKey = U.monthKey(selected);

    const weekdays = U.WEEKDAYS_SHORT.map((label) => {
      const weekend = label === "六" || label === "日";
      return `<span class="${weekend ? "is-weekend" : ""}">周${label}</span>`;
    }).join("");

    const cells = grid.map((iso) => {
      const events = U.sortEvents(map[iso] || []);
      const other = U.monthKey(iso) !== currentKey;
      const isToday = iso === today;
      const shown = events.slice(0, 3);
      const more = events.length - shown.length;
      const dots = events.slice(0, 4).map((event) => C.eventDot(event)).join("");
      const label = `${U.dateLongCN(iso)}，${events.length} 项日程`;
      return `
        <div class="month-cell${other ? " is-other" : ""}${isToday ? " is-today" : ""}"
             data-action="open-day" data-date="${iso}" data-drop-date="${iso}"
             role="button" tabindex="0" aria-label="${U.esc(label)}">
          <div class="month-dayline">
            <span class="month-daynum">${U.parseISO(iso).getDate()}</span>
            <button class="month-add" type="button" data-action="add-event" data-date="${iso}" aria-label="${U.esc(U.dateCN(iso))}新建日程">${icon("plus")}</button>
          </div>
          <div class="month-events">
            ${shown.map((event) => C.eventPill(event)).join("")}
            ${more > 0 ? `<span class="month-more">+${more}</span>` : ""}
          </div>
          <div class="month-dots" aria-hidden="true">${dots}</div>
        </div>`;
    }).join("");

    return `
      <div class="schedule-wrap">
        <div class="weekday-row">${weekdays}</div>
        <div class="month-grid">${cells}</div>
      </div>`;
  }

  function weekView() {
    const ui = uiState();
    const today = U.todayISO();
    const selected = ui.selectedDate || today;
    const dates = U.weekDates(selected);
    const map = eventsByDate(S.getState().events);
    const cols = dates.map((iso) => {
      const events = U.sortEvents(map[iso] || []);
      const isToday = iso === today;
      return `
        <section class="week-col${isToday ? " is-today" : ""}" data-drop-date="${iso}" aria-label="${U.esc(U.dateLongCN(iso))}">
          <div class="week-col-head">
            <button type="button" data-action="open-day" data-date="${iso}">
              ${U.weekdayFull(iso)}<strong>${U.parseISO(iso).getDate()}</strong>
            </button>
            <span>${U.parseISO(iso).getMonth() + 1} 月</span>
          </div>
          <div class="week-col-events">
            ${events.length ? events.map((event) => C.weekEvent(event)).join("") : `<div class="week-empty">无安排</div>`}
          </div>
          <button class="week-add" type="button" data-action="add-event" data-date="${iso}">
            ${icon("plus")}添加
          </button>
        </section>`;
    }).join("");
    return `<div class="week-grid">${cols}</div>`;
  }

  function dayView() {
    const ui = uiState();
    const selected = ui.selectedDate || U.todayISO();
    const events = S.eventsForDate(selected);
    const done = events.filter((event) => event.done).length;
    if (!events.length) {
      return `
        <div class="day-layout">
          <div class="day-agenda">
            <div class="schedule-empty">
              ${C.emptyState({
                icon: "calendar",
                title: "这一天还没有安排",
                text: "添加一项日程，或回到周视图看看整周的节奏。",
                action: `<button class="btn btn--primary btn--small" type="button" data-action="add-event" data-date="${selected}">${icon("plus")}新建日程</button>`
              })}
            </div>
          </div>
          <aside class="day-side">
            <div class="panel">
              <div class="panel-head"><h2 class="panel-title">${icon("target")}当日概览</h2></div>
              <p class="settings-copy">还没有日程。先放进一件最值得推进的小事。</p>
            </div>
          </aside>
        </div>`;
    }
    const allDay = events.filter((event) => !event.start);
    const timed = events.filter((event) => event.start);
    const renderGroup = (label, items) => items.length
      ? `<div class="day-group">
           <div class="day-group-label">${label}</div>
           <div class="timeline-list day-timeline">${items.map((event) => C.eventRow(event, { className: "timeline-event" })).join("")}</div>
         </div>`
      : "";
    const linked = events.map((event) => C.eventLink(event)).filter(Boolean);
    const grouped = linked.reduce((map, link) => {
      const key = link.project.id;
      if (!map[key]) map[key] = { project: link.project, stages: new Set(), count: 0 };
      map[key].stages.add(link.step.name);
      map[key].count += 1;
      return map;
    }, {});
    const linkedRows = Object.values(grouped).map((item) => `
      <div class="day-link-row" style="--project:${U.esc(item.project.color)}">
        <span class="day-link-dot" aria-hidden="true"></span>
        <div>
          <strong>${U.esc(item.project.name)}</strong>
          <span>${U.esc(Array.from(item.stages).join(" / "))} · ${item.count} 项</span>
        </div>
      </div>`).join("");
    return `
      <div class="day-layout">
        <div class="day-agenda">
          <div class="day-date-line">${events.length} 项日程 · ${done} 项已完成</div>
          ${renderGroup("未定时间", allDay)}
          ${renderGroup("时间轴", timed)}
        </div>
        <aside class="day-side">
          <div class="panel">
            <div class="panel-head"><h2 class="panel-title">${icon("target")}当日概览</h2><span class="section-kicker">${done}/${events.length}</span></div>
            <div class="day-side-stats">
              <div><strong>${events.length}</strong><span>全部</span></div>
              <div><strong>${done}</strong><span>完成</span></div>
              <div><strong>${events.length - done}</strong><span>待办</span></div>
            </div>
            <div class="divider"></div>
            <div class="section-kicker">关联课题</div>
            <div class="day-links">
              ${linkedRows || `<p class="settings-copy" style="margin-top:8px">今天的日程还没有关联课题。编辑日程时可以选择课题阶段。</p>`}
            </div>
          </div>
        </aside>
      </div>`;
  }

  function render() {
    const ui = uiState();
    const today = U.todayISO();
    const selected = ui.selectedDate || today;
    const selectedLabel = U.relativeDay(selected, today);
    const body = ui.scheduleView === "month" ? monthView() : ui.scheduleView === "week" ? weekView() : dayView();
    return `
      <header class="view-head">
        <div class="view-head-copy">
          <div class="eyebrow">CALENDAR · ${U.numericDate(today)}</div>
          <h1 class="view-title">日程</h1>
          <p class="view-sub">月视图看全貌，周视图排节奏，日视图专注当天。点圆圈标记完成；日程可随时修改或移动。</p>
        </div>
        <div class="view-actions">
          <button class="btn btn--primary" type="button" data-action="add-event" data-date="${selected}">
            ${icon("plus")}新建日程
          </button>
        </div>
      </header>
      ${toolbar()}
      ${body}
      ${ui.scheduleView === "day" ? "" : `<p class="habit-hint" style="margin-top:14px">当前选中：${U.esc(selectedLabel)} · ${U.esc(U.dateCN(selected))}</p>`}`;
  }

  YC.views = YC.views || {};
  YC.views.schedule = {
    render,
    shiftMonth,
    isoWeekNumber
  };
})();
