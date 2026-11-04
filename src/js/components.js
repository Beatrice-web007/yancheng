(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const icon = YC.ui.icon;

  function eventLink(event) {
    return S.eventProject(event);
  }

  function eventColor(event) {
    const link = eventLink(event);
    return link ? link.project.color : "var(--accent)";
  }

  function linkLabel(link) {
    if (!link) return "";
    return `${link.project.name} · ${U.pad(link.index + 1)} ${link.step.name}`;
  }

  function eventRow(event, options) {
    const opts = options || {};
    const link = eventLink(event);
    const color = eventColor(event);
    const meta = [];
    if (opts.showDate) meta.push(`<span>${U.dateCN(event.date)}</span>`);
    if (link) {
      meta.push(`<span class="link-badge" style="--project:${U.esc(link.project.color)}"><span>${U.esc(linkLabel(link))}</span></span>`);
    }
    if (event.notes) meta.push(`<span>有备注</span>`);
    const drag = opts.draggable ? ' draggable="true"' : "";
    return `
      <div class="event-row${event.done ? " is-done" : ""}${opts.className ? ` ${opts.className}` : ""}"
           style="--event-color:${U.esc(color)}" data-event-id="${U.esc(event.id)}"${drag}>
        <button class="check${event.done ? " is-done" : ""}" type="button"
                data-action="toggle-event" data-id="${U.esc(event.id)}"
                aria-label="${event.done ? "标记为未完成" : "标记为完成"}：${U.esc(event.title)}"
                aria-pressed="${event.done ? "true" : "false"}">
          ${icon("check")}
        </button>
        <span class="event-time">${U.esc(U.timeRange(event.start, event.end))}</span>
        <div class="event-main">
          <button class="event-title" type="button" data-action="open-event" data-id="${U.esc(event.id)}">${U.esc(event.title)}</button>
          ${meta.length ? `<div class="event-meta">${meta.join("")}</div>` : ""}
        </div>
        <button class="icon-btn icon-btn--small event-edit" type="button" data-action="open-event"
                data-id="${U.esc(event.id)}" aria-label="编辑日程：${U.esc(event.title)}">
          ${icon("edit")}
        </button>
      </div>`;
  }

  function eventPill(event) {
    const color = eventColor(event);
    return `
      <button class="event-pill${event.done ? " is-done" : ""}" type="button"
              style="--project:${U.esc(color)}" data-action="open-event" data-id="${U.esc(event.id)}"
              data-event-id="${U.esc(event.id)}" draggable="true" title="${U.esc(event.title)}">
        <span>${U.esc(event.title)}</span>
      </button>`;
  }

  function eventDot(event) {
    return `<i style="--project:${U.esc(eventColor(event))}"></i>`;
  }

  function weekEvent(event) {
    const link = eventLink(event);
    const color = eventColor(event);
    return `
      <button class="week-event${event.done ? " is-done" : ""}" type="button"
              style="--project:${U.esc(color)}" data-action="open-event" data-id="${U.esc(event.id)}"
              data-event-id="${U.esc(event.id)}" draggable="true" title="${U.esc(event.title)}">
        <strong>${U.esc(event.title)}</strong>
        <small>${U.esc(event.start || "全天")}${link ? ` · ${U.esc(link.step.name)}` : ""}</small>
      </button>`;
  }

  function projectOptions(selectedProjectId, selectedStepId) {
    const groups = S.getState().projects.map((project) => {
      const options = project.steps.map((step, index) => {
        const selected = selectedProjectId === project.id && selectedStepId === step.id;
        return `<option value="${U.esc(project.id)}::${U.esc(step.id)}" ${selected ? "selected" : ""}>${U.pad(index + 1)} ${U.esc(step.name)}</option>`;
      }).join("");
      return `<optgroup label="${U.esc(project.name)}">${options}</optgroup>`;
    }).join("");
    return `<option value="">不关联课题</option>${groups}`;
  }

  function splitLinkValue(value) {
    const text = String(value || "");
    const index = text.indexOf("::");
    if (index < 0) return { projectId: null, stepId: null };
    return {
      projectId: text.slice(0, index) || null,
      stepId: text.slice(index + 2) || null
    };
  }

  function stageClasses(item) {
    const classes = ["stage"];
    if (item.complete) classes.push("is-done");
    if (item.active) classes.push("is-active");
    if (item.overdue) classes.push("is-overdue");
    return classes.join(" ");
  }

  function stageCountText(item) {
    if (!item.stats.total) return "待规划";
    return `${item.stats.done}/${item.stats.total}`;
  }

  function nextActionText(next) {
    if (!next) return "全部阶段已完成。";
    if (!next.stats.total) return `为「${next.step.name}」添加子事项，或直接标记阶段完成。`;
    const remaining = next.stats.remaining;
    return `推进「${next.step.name}」，还剩 ${remaining} 项子事项。`;
  }

  function emptyState(opts) {
    return `
      <div class="empty">
        <span class="empty-mark">${icon(opts.icon || "spark")}</span>
        <strong>${U.esc(opts.title || "这里还没有内容")}</strong>
        <p>${U.esc(opts.text || "添加第一项，开始记录。")}</p>
        ${opts.action || ""}
      </div>`;
  }

  function progressBar(value, color, options) {
    const opts = options || {};
    const pct = U.clamp(Math.round(value || 0), 0, 100);
    return `
      <div class="progress${opts.thin ? " progress--thin" : ""}${opts.thick ? " progress--thick" : ""}">
        <span style="width:${pct}%;${color ? `--progress-color:${U.esc(color)};` : ""}"></span>
      </div>`;
  }

  function stageLinkText(link) {
    return link ? `${U.pad(link.index + 1)} ${link.step.name}` : "";
  }

  YC.components = {
    eventRow,
    eventPill,
    eventDot,
    weekEvent,
    projectOptions,
    splitLinkValue,
    stageClasses,
    stageCountText,
    nextActionText,
    emptyState,
    progressBar,
    eventLink,
    eventColor,
    linkLabel,
    stageLinkText
  };
})();
