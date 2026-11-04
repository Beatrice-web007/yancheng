(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const C = YC.components;
  const icon = YC.ui.icon;

  function dailySparkCard(daily, hasSparks) {
    if (daily.spark) {
      const type = U.sparkType(daily.spark.type);
      return `
        <button class="daily-spark" type="button" data-action="open-spark" data-id="${U.esc(daily.spark.id)}"
                aria-label="今日闪念：${U.esc(daily.spark.content.slice(0, 80))}">
          <span class="daily-spark-head">
            <span class="daily-spark-label">${icon("spark")}今日闪念</span>
            <span class="spark-type spark-type--${U.esc(type.key)}">${U.esc(type.label)}</span>
          </span>
          <span class="daily-spark-text">${U.esc(daily.spark.content)}</span>
          <span class="daily-spark-meta">从 ${daily.total} 条每日提醒中抽取 · 点击回看</span>
        </button>`;
    }
    if (hasSparks) {
      return `
        <a class="daily-spark daily-spark--empty" href="#sparks">
          <span class="daily-spark-head"><span class="daily-spark-label">${icon("spark")}今日闪念</span></span>
          <span class="daily-spark-text">把想记住的闪念设为提醒，这里每天会抽一条。</span>
          <span class="daily-spark-meta">去闪念中设置 →</span>
        </a>`;
    }
    return `
      <button class="daily-spark daily-spark--empty" type="button" data-action="add-spark">
        <span class="daily-spark-head"><span class="daily-spark-label">${icon("spark")}今日闪念</span></span>
        <span class="daily-spark-text">记录第一条经验或灵感，勾选「今天提醒」，之后每天在这里抽一条。</span>
        <span class="daily-spark-meta">＋ 记录闪念</span>
      </button>`;
  }

  function render() {
    const data = S.getState();
    const today = U.todayISO();
    const daily = S.dailySpark(today);
    const events = S.eventsForDate(today);
    const todayDone = events.filter((event) => event.done).length;
    const week = S.weekEventStats(today);
    const weekTotal = week.items.reduce((sum, item) => sum + item.total, 0);
    const weekDone = week.items.reduce((sum, item) => sum + item.done, 0);
    const habitOverview = S.habitOverview();
    const projects = data.projects.map((project) => ({
      project,
      stats: S.projectStats(project)
    }));
    const activeProjects = projects.filter((item) => !item.stats.allComplete).length;
    const pendingHabits = Math.max(0, data.habits.length - habitOverview.doneToday);
    const demoBanner = data.meta.isDemo && !data.meta.demoDismissed
      ? `
        <div class="demo-banner">
          ${icon("spark")}
          <p><strong>这是示例内容</strong>，方便你先体验「日程 → 子事项 → 进度」和「闪念提醒」。数据只保存在这台设备。</p>
          <div class="demo-banner-actions">
            <button class="btn btn--small btn--ghost" type="button" data-action="dismiss-demo">开始使用</button>
            <button class="btn btn--small btn--secondary" type="button" data-action="clear-demo">清空示例</button>
          </div>
        </div>`
      : "";

    const todayRows = events.length
      ? events.map((event) => C.eventRow(event, { className: "timeline-event" })).join("")
      : C.emptyState({
          icon: "calendar",
          title: "今天还没有安排",
          text: "先放进一件最值得推进的小事，完成后再决定下一步。",
          action: `<button class="btn btn--primary btn--small" type="button" data-action="add-event" data-date="${today}">${icon("plus")}新建日程</button>`
        });

    const habitRows = data.habits.length
      ? data.habits.map((habit) => {
          const done = Boolean(habit.history[today]);
          const streak = S.habitCurrentStreak(habit, today);
          return `
            <div class="habit-mini" style="--habit-color:${U.esc(habit.color)};--event-color:${U.esc(habit.color)}">
              <span class="habit-swatch" aria-hidden="true"></span>
              <span class="habit-mini-name">${U.esc(habit.name)}<small>${streak ? `连续 ${streak} 天` : "今天开始"}</small></span>
              <button class="check${done ? " is-done" : ""}" type="button"
                      data-action="toggle-habit" data-id="${U.esc(habit.id)}" data-date="${today}"
                      aria-label="${done ? "取消打卡" : "完成打卡"}：${U.esc(habit.name)}"
                      aria-pressed="${done ? "true" : "false"}">${icon("check")}</button>
            </div>`;
        }).join("")
      : `<p class="settings-copy">还没有打卡项目。先建立一个每天能完成的小习惯。</p>
         <button class="btn btn--secondary btn--small" type="button" data-action="add-habit" style="margin-top:10px">${icon("plus")}新建打卡</button>`;

    const projectRows = projects.length
      ? projects.slice(0, 3).map(({ project, stats }) => `
          <a class="project-mini" href="#projects" style="--project:${U.esc(project.color)}">
            <div class="project-mini-head">
              <span class="project-mini-name">${U.esc(project.name)}</span>
              <span class="project-mini-pct">${stats.pct}%</span>
            </div>
            ${C.progressBar(stats.pct, project.color, { thin: true })}
            <div class="project-mini-next">${stats.allComplete ? "全部阶段已完成" : C.nextActionText(stats.next)}</div>
          </a>`).join("")
      : `<p class="settings-copy">还没有课题。建立课题后，日程可以关联到阶段，完成时自动推进进度。</p>
         <button class="btn btn--secondary btn--small" type="button" data-action="add-project" style="margin-top:10px">${icon("plus")}新建课题</button>`;

    const weekBars = week.items.map((item) => {
      const pct = item.total ? Math.round((item.done / item.total) * 100) : 0;
      return `
        <div class="week-bar${item.date === today ? " is-today" : ""}" title="${U.esc(U.weekdayFull(item.date))} · 完成 ${item.done}/${item.total}">
          <span class="week-bar-track"><span style="height:${pct}%"></span></span>
          <small>${U.weekdayShort(item.date)}</small>
        </div>`;
    }).join("");

    return `
      ${demoBanner}
      <header class="view-head">
        <div class="view-head-copy">
          <div class="eyebrow">${U.numericDate(today)} · ${U.weekdayFull(today)}</div>
          <div class="today-titleline">
            <h1 class="view-title">今天</h1>
            ${dailySparkCard(daily, data.sparks.length > 0)}
          </div>
          <p class="view-sub">${events.length} 项日程，${pendingHabits} 个习惯待打卡，${activeProjects} 个课题在推进。把注意力放在下一件能完成的事上。</p>
        </div>
        <div class="view-actions">
          <button class="btn btn--primary" type="button" data-action="add-event" data-date="${today}">
            ${icon("plus")}新建日程
          </button>
        </div>
      </header>

      <section class="today-pulse" aria-label="今日概览">
        <div class="pulse-stat"><strong>${todayDone}<small>/${events.length}</small></strong><span>今日日程完成</span></div>
        <div class="pulse-stat"><strong>${weekDone}<small>/${weekTotal}</small></strong><span>本周完成</span></div>
        <div class="pulse-stat"><strong>${habitOverview.doneToday}<small>/${data.habits.length}</small></strong><span>今日打卡</span></div>
        <div class="pulse-stat"><strong>${activeProjects}<small>/${data.projects.length}</small></strong><span>推进中的课题</span></div>
      </section>

      <div class="today-grid">
        <section class="today-main" aria-labelledby="today-schedule-title">
          <div class="section-head">
            <div>
              <div class="section-kicker">TODAY'S RHYTHM</div>
              <h2 class="section-title" id="today-schedule-title">今天的节奏</h2>
            </div>
            <a class="text-link" href="#schedule">完整日程 ${icon("arrow-right")}</a>
          </div>
          <div class="timeline-list">${todayRows}</div>
        </section>

        <aside class="today-aside">
          <section class="panel" aria-labelledby="today-habits-title">
            <div class="panel-head">
              <h2 class="panel-title" id="today-habits-title">${icon("habit")}今日打卡</h2>
              <a class="text-link" href="#habits">全部 ${icon("arrow-right")}</a>
            </div>
            ${habitRows}
          </section>

          <section class="panel" aria-labelledby="today-projects-title">
            <div class="panel-head">
              <h2 class="panel-title" id="today-projects-title">${icon("project")}课题推进</h2>
              <a class="text-link" href="#projects">全部 ${icon("arrow-right")}</a>
            </div>
            ${projectRows}
          </section>

          <section class="panel" aria-labelledby="today-week-title">
            <div class="panel-head">
              <h2 class="panel-title" id="today-week-title">${icon("target")}本周节奏</h2>
              <span class="section-kicker">${weekDone}/${weekTotal}</span>
            </div>
            <div class="week-bars" role="img" aria-label="本周每天的日程完成比例">${weekBars}</div>
            <p class="habit-hint">柱高表示当天日程完成比例。今天用金色标出。</p>
          </section>
        </aside>
      </div>`;
  }

  YC.views = YC.views || {};
  YC.views.today = { render };
})();
