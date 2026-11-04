(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const C = YC.components;
  const icon = YC.ui.icon;

  function stageStatus(item) {
    if (item.complete) return "已完成";
    if (item.overdue) return "已逾期";
    if (item.active) return "进行中";
    return "未开始";
  }

  function stageStatusClass(item) {
    if (item.complete) return "pill--accent";
    if (item.overdue) return "pill--danger";
    if (item.active) return "pill--ochre";
    return "pill--quiet";
  }

  function stageRail(project, stats) {
    const stages = stats.steps.map((item) => {
      const step = item.step;
      return `
        <button class="${C.stageClasses(item)}" type="button"
                data-action="open-stage" data-project="${U.esc(project.id)}" data-step="${U.esc(step.id)}"
                aria-label="${U.esc(U.pad(item.index + 1))} ${U.esc(step.name)}，${stageStatus(item)}，完成 ${item.stats.done}/${item.stats.total}">
          <span class="stage-line${item.complete ? " is-done" : ""}" aria-hidden="true"></span>
          <span class="stage-dot">${item.complete ? icon("check") : U.pad(item.index + 1)}</span>
          <span class="stage-name">${U.esc(step.name)}</span>
          <span class="stage-count${item.stats.total ? "" : " is-muted"}">${C.stageCountText(item)}</span>
        </button>`;
    }).join("");
    return `<div class="stage-scroll"><div class="stage-rail">${stages}</div></div>`;
  }

  function projectCard(project) {
    const stats = S.projectStats(project);
    const firstStart = project.steps[0] ? project.steps[0].start : "";
    const lastEnd = project.steps[project.steps.length - 1] ? project.steps[project.steps.length - 1].end : "";
    const next = stats.next;
    const nextAction = next
      ? `data-action="open-stage" data-project="${U.esc(project.id)}" data-step="${U.esc(next.step.id)}"`
      : "";
    return `
      <article class="project-card" style="--project:${U.esc(project.color)}">
        <div class="project-head">
          <div class="project-identity">
            <span class="project-mark" aria-hidden="true"></span>
            <div>
              <h2 class="project-name">${U.esc(project.name)}</h2>
              <div class="project-meta">${U.esc(U.rangeLabel(firstStart, lastEnd))} · ${project.steps.length} 个阶段</div>
            </div>
          </div>
          <div class="project-score">
            <strong>${stats.pct}<small>%</small></strong>
            <span>总进度</span>
          </div>
        </div>

        <div class="project-bar">${C.progressBar(stats.pct, project.color, { thick: true })}</div>

        <div class="project-stage-head">
          <span>STAGES · 08</span>
          <small>${stats.completedStages} 个完成 · ${stats.emptyStages} 个待规划</small>
        </div>
        ${stageRail(project, stats)}

        <div class="project-next">
          <span class="project-next-label">NEXT</span>
          <p>${stats.allComplete
            ? "全部阶段已完成。可以回到日程，安排复盘或下一篇工作。"
            : `${C.nextActionText(stats.next)} ${next && next.overdue ? `<span class="pill pill--danger">已逾期</span>` : ""}`}</p>
        </div>

        <div class="project-foot">
          <span class="project-hint">总进度按 8 个阶段平均计算；空阶段计 0%。</span>
          <div class="row">
            ${next ? `<button class="btn btn--ghost btn--small" type="button" ${nextAction}>打开下一步 ${icon("arrow-right")}</button>` : ""}
            <button class="icon-btn icon-btn--small" type="button" data-action="edit-project" data-id="${U.esc(project.id)}" aria-label="编辑课题：${U.esc(project.name)}">${icon("edit")}</button>
            <button class="icon-btn icon-btn--small icon-btn--danger" type="button" data-action="delete-project" data-id="${U.esc(project.id)}" aria-label="删除课题：${U.esc(project.name)}">${icon("trash")}</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const data = S.getState();
    const overall = S.overallProjectStats();
    const totalStages = data.projects.reduce((sum, project) => sum + project.steps.length, 0);
    const completedStages = overall.items
      ? overall.items.reduce((sum, item) => sum + item.stats.completedStages, 0)
      : 0;

    return `
      <header class="view-head">
        <div class="view-head-copy">
          <div class="eyebrow">RESEARCH TRACK · ${U.numericDate(U.todayISO())}</div>
          <h1 class="view-title">课题推进</h1>
          <p class="view-sub">从 Idea 到接收，把课题拆成八个阶段。每个阶段的子事项都来自你的日程，完成一项，进度就往前一格。</p>
        </div>
        <div class="view-actions">
          <button class="btn btn--primary" type="button" data-action="add-project">${icon("plus")}新建课题</button>
        </div>
      </header>

      <section class="project-stats" aria-label="课题概览">
        <div class="project-stat"><strong>${overall.active}</strong><span>进行中的课题</span></div>
        <div class="project-stat"><strong>${overall.pct}%</strong><span>平均总进度</span></div>
        <div class="project-stat"><strong>${completedStages}/${totalStages}</strong><span>已完成阶段</span></div>
      </section>

      ${data.projects.length
        ? `<div class="project-list">${data.projects.map(projectCard).join("")}</div>`
        : `<div class="schedule-empty">${C.emptyState({
            icon: "project",
            title: "还没有课题",
            text: "建立课题后，会自动生成八个阶段。日程关联到阶段后，完成日程就会推进进度。",
            action: `<button class="btn btn--primary btn--small" type="button" data-action="add-project">${icon("plus")}建立第一个课题</button>`
          })}</div>`}`;
  }

  function stageBody(project, step, index) {
    const stats = S.projectStats(project);
    const item = stats.steps[index];
    const stepStats = item.stats;
    const linkedCount = step.subtasks.filter((subtask) => subtask.sourceEventId).length;
    const subtasks = step.subtasks.length
      ? step.subtasks.map((subtask) => {
          const event = subtask.sourceEventId ? S.getEvent(subtask.sourceEventId) : null;
          return `
            <div class="subtask-row${subtask.done ? " is-done" : ""}">
              <button class="check${subtask.done ? " is-done" : ""}" type="button"
                      style="--event-color:${U.esc(project.color)}"
                      data-action="toggle-subtask" data-project="${U.esc(project.id)}" data-step="${U.esc(step.id)}" data-subtask="${U.esc(subtask.id)}"
                      aria-label="${subtask.done ? "标记未完成" : "标记完成"}：${U.esc(subtask.title)}"
                      aria-pressed="${subtask.done ? "true" : "false"}">${icon("check")}</button>
              <div class="subtask-main">
                <div class="subtask-title">${U.esc(subtask.title)}</div>
                <div class="subtask-meta">
                  ${subtask.date ? `<span>${U.esc(U.dateCN(subtask.date))}</span>` : ""}
                  ${event ? `<span class="source-badge">${icon("link")}日程同步</span>` : ""}
                  ${event ? `<span>${U.esc(U.timeRange(event.start, event.end))}</span>` : ""}
                </div>
              </div>
              <button class="icon-btn icon-btn--small icon-btn--danger" type="button"
                      data-action="delete-subtask" data-project="${U.esc(project.id)}" data-step="${U.esc(step.id)}" data-subtask="${U.esc(subtask.id)}"
                      aria-label="删除子事项：${U.esc(subtask.title)}">${icon("trash")}</button>
            </div>`;
        }).join("")
      : `<div class="stage-empty">
           <strong>这个阶段还没有子事项</strong>
           <p>添加子事项，或在日程中关联到本阶段。也可以直接标记阶段完成。</p>
           <button class="btn btn--secondary btn--small" type="button"
                   data-action="complete-empty-stage" data-project="${U.esc(project.id)}" data-step="${U.esc(step.id)}">
             ${icon("check")}标记阶段完成
           </button>
         </div>`;

    return `
      <div class="stage-summary">
        <div class="stage-summary-main">
          <div class="stage-summary-sub">计划 ${U.esc(U.rangeLabel(step.start, step.end))} · ${stepStats.done}/${stepStats.total} 项完成${linkedCount ? ` · ${linkedCount} 项来自日程` : ""}</div>
        </div>
        <div class="stage-ring" style="--pct:${stepStats.pct};--project:${U.esc(project.color)}" aria-label="阶段进度 ${stepStats.pct}%">
          <span>${stepStats.pct}%</span>
        </div>
      </div>

      <form class="stage-dates" data-form="stage-dates" data-project="${U.esc(project.id)}" data-step="${U.esc(step.id)}">
        <div class="field">
          <label for="stage-start">开始日期</label>
          <input class="input" id="stage-start" type="date" name="start" value="${U.esc(step.start)}" required>
        </div>
        <div class="field">
          <label for="stage-end">结束日期</label>
          <input class="input" id="stage-end" type="date" name="end" value="${U.esc(step.end)}" required>
        </div>
        <button class="btn btn--secondary btn--small" type="submit">保存日期</button>
      </form>

      <div class="stage-subhead">
        <h4>子事项</h4>
        <span>${stepStats.done}/${stepStats.total} · ${stageStatus(item)}</span>
      </div>
      <div class="subtask-list">${subtasks}</div>

      <form class="subtask-add" data-form="subtask-add" data-project="${U.esc(project.id)}" data-step="${U.esc(step.id)}">
        <input class="input" type="text" name="title" maxlength="180" placeholder="添加一个子事项…" aria-label="子事项名称" required>
        <input class="input" type="date" name="date" value="${U.esc(step.start)}" aria-label="子事项日期">
        <button class="btn btn--primary btn--small" type="submit">${icon("plus")}添加</button>
      </form>

      <div class="stage-note">
        ${icon("link")}
        <span>在日程中关联到本阶段，会自动出现在这里；勾选任意一侧，另一侧同步更新。</span>
      </div>`;
  }

  function stageConfig(projectId, stepId) {
    const project = S.getProject(projectId);
    if (!project) return null;
    const index = project.steps.findIndex((step) => step.id === stepId);
    if (index < 0) return null;
    const step = project.steps[index];
    const stats = S.projectStats(project);
    const item = stats.steps[index];
    return {
      key: "stage",
      projectId,
      stepId,
      kicker: "阶段详情",
      title: `${U.pad(index + 1)} ${U.esc(step.name)}`,
      sub: `${U.esc(project.name)} · ${stageStatus(item)}`,
      body: stageBody(project, step, index),
      footer: `<button class="btn btn--secondary" type="button" data-action="close-modal">关闭</button>`,
      wide: true
    };
  }

  function refreshStage(projectId, stepId) {
    const current = YC.ui.currentModal();
    if (!current || current.key !== "stage") return;
    const next = stageConfig(projectId, stepId);
    if (!next) return;
    Object.assign(current, next);
    YC.ui.refreshModal();
  }

  function stageStatusText(projectId, stepId) {
    const project = S.getProject(projectId);
    if (!project) return "";
    const index = project.steps.findIndex((step) => step.id === stepId);
    if (index < 0) return "";
    return stageStatus(S.projectStats(project).steps[index]);
  }

  YC.views = YC.views || {};
  YC.views.projects = {
    render,
    stageConfig,
    refreshStage,
    stageStatusText
  };
})();
