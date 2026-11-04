(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const C = YC.components;
  const icon = YC.ui.icon;

  function monthFromUI() {
    const ui = YC.app.ui;
    const today = U.todayISO();
    const key = ui.habitMonth || U.monthKey(today);
    const [year, month] = key.split("-").map(Number);
    if (!year || !month) {
      const date = U.parseISO(today);
      return { year: date.getFullYear(), month: date.getMonth() };
    }
    return { year, month: month - 1 };
  }

  function shiftMonth(year, month, delta) {
    const date = new Date(year, month + delta, 1);
    return { year: date.getFullYear(), month: date.getMonth() };
  }

  function heatmap(habit, year, month) {
    const today = U.todayISO();
    const firstISO = `${year}-${U.pad(month + 1)}-01`;
    const leading = U.weekdayIndex(firstISO);
    const total = U.monthDays(year, month);
    const cells = [];
    for (let i = 0; i < leading; i += 1) {
      cells.push(`<span class="habit-cell is-blank" aria-hidden="true"></span>`);
    }
    for (let day = 1; day <= total; day += 1) {
      const iso = `${year}-${U.pad(month + 1)}-${U.pad(day)}`;
      const done = Boolean(habit.history[iso]);
      const future = iso > today;
      const isToday = iso === today;
      cells.push(`
        <button class="habit-cell${done ? " is-done" : ""}${isToday ? " is-today" : ""}${future ? " is-future" : ""}"
                type="button" style="--habit-color:${U.esc(habit.color)}"
                data-action="toggle-habit" data-id="${U.esc(habit.id)}" data-date="${iso}"
                ${future ? "disabled" : ""}
                aria-label="${U.esc(habit.name)}，${U.esc(U.dateCN(iso))}，${done ? "已打卡" : future ? "未来日期" : "未打卡"}"
                aria-pressed="${done ? "true" : "false"}">
          ${day}
        </button>`);
    }
    const trailing = (7 - ((leading + total) % 7)) % 7;
    for (let i = 0; i < trailing; i += 1) {
      cells.push(`<span class="habit-cell is-blank" aria-hidden="true"></span>`);
    }
    return `
      <div class="heatmap-weekdays">${U.WEEKDAYS_SHORT.map((day) => `<span>${day}</span>`).join("")}</div>
      <div class="habit-heatmap" role="group" aria-label="${U.esc(habit.name)} ${year} 年 ${month + 1} 月打卡记录">
        ${cells.join("")}
      </div>`;
  }

  function habitCard(habit, year, month) {
    const today = U.todayISO();
    const doneToday = Boolean(habit.history[today]);
    const streak = S.habitCurrentStreak(habit, today);
    const best = S.habitBestStreak(habit);
    const monthCount = S.habitMonthCount(habit, year, month);
    return `
      <section class="habit-card" style="--habit-color:${U.esc(habit.color)}">
        <div class="habit-top">
          <div class="habit-identity">
            <span class="habit-big-dot" aria-hidden="true"></span>
            <div>
              <button class="habit-name" type="button" data-action="edit-habit" data-id="${U.esc(habit.id)}">${U.esc(habit.name)}</button>
              <div class="habit-meta-line">
                <span class="streak">${icon("flame")}连续 ${streak} 天</span>
                <span>最长 ${best} 天</span>
                <span>${year} 年 ${month + 1} 月 ${monthCount} 次</span>
              </div>
            </div>
          </div>
          <div class="habit-today">
            <span class="habit-today-label">TODAY</span>
            <button class="check${doneToday ? " is-done" : ""}" type="button"
                    style="--event-color:${U.esc(habit.color)}"
                    data-action="toggle-habit" data-id="${U.esc(habit.id)}" data-date="${today}"
                    aria-label="${doneToday ? "取消今日打卡" : "完成今日打卡"}：${U.esc(habit.name)}"
                    aria-pressed="${doneToday ? "true" : "false"}">${icon("check")}</button>
            <div class="habit-actions">
              <button class="icon-btn icon-btn--small" type="button" data-action="edit-habit" data-id="${U.esc(habit.id)}" aria-label="编辑打卡：${U.esc(habit.name)}">${icon("edit")}</button>
              <button class="icon-btn icon-btn--small icon-btn--danger" type="button" data-action="delete-habit" data-id="${U.esc(habit.id)}" aria-label="删除打卡：${U.esc(habit.name)}">${icon("trash")}</button>
            </div>
          </div>
        </div>
        <div class="heatmap-block">
          ${heatmap(habit, year, month)}
          <p class="habit-hint">点击日期可补记或取消；未来日期不可打卡。</p>
        </div>
      </section>`;
  }

  function render() {
    const data = S.getState();
    const today = U.todayISO();
    const { year, month } = monthFromUI();
    const overview = S.habitOverview();
    const monthCheckins = data.habits.reduce((sum, habit) => sum + S.habitMonthCount(habit, year, month), 0);
    const cards = data.habits.map((habit) => habitCard(habit, year, month)).join("");
    const canGoNext = `${year}-${U.pad(month + 1)}` < U.monthKey(today);

    return `
      <header class="view-head">
        <div class="view-head-copy">
          <div class="eyebrow">DAILY PRACTICE · ${U.numericDate(today)}</div>
          <h1 class="view-title">日常打卡</h1>
          <p class="view-sub">每天留下一个颜色标记。完成就点亮当天，不需要解释，也不需要连续完美。</p>
        </div>
        <div class="view-actions">
          <button class="btn btn--primary" type="button" data-action="add-habit">${icon("plus")}新建打卡</button>
        </div>
      </header>

      <section class="habit-stats" aria-label="打卡概览">
        <div class="habit-stat"><strong>${overview.doneToday}/${overview.totalHabits}</strong><span>今日完成</span></div>
        <div class="habit-stat"><strong>${monthCheckins}</strong><span>${year} 年 ${month + 1} 月累计</span></div>
        <div class="habit-stat"><strong>${overview.currentStreak}</strong><span>当前最长连续（天）</span></div>
      </section>

      <div class="habit-toolbar">
        <div class="month-nav">
          <button class="icon-btn" type="button" data-action="habit-prev" aria-label="上个月">${icon("left")}</button>
          <strong>${year}.${U.pad(month + 1)}</strong>
          <button class="icon-btn" type="button" data-action="habit-next" aria-label="下个月" ${canGoNext ? "" : "disabled"}>${icon("right")}</button>
          <button class="btn btn--ghost btn--small" type="button" data-action="habit-today">回到本月</button>
        </div>
        <span class="section-kicker">${data.habits.length} 个习惯</span>
      </div>

      ${data.habits.length
        ? `<div class="habit-list">${cards}</div>`
        : `<div class="schedule-empty">${C.emptyState({
            icon: "habit",
            title: "还没有打卡项目",
            text: "从一件每天 10 分钟能完成的事开始，比如读一篇摘要。",
            action: `<button class="btn btn--primary btn--small" type="button" data-action="add-habit">${icon("plus")}新建第一个打卡</button>`
          })}</div>`}`;
  }

  YC.views = YC.views || {};
  YC.views.habits = { render, shiftMonth };
})();
