(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const C = YC.components;
  const icon = YC.ui.icon;

  function eventModal(id, presetDate) {
    const existing = id ? S.getEvent(id) : null;
    if (id && !existing) {
      YC.ui.toast("这条日程已不存在", { type: "error" });
      return;
    }
    const date = existing ? existing.date : (presetDate || YC.app.ui.selectedDate || U.todayISO());
    const linkValue = existing && existing.projectId && existing.stepId
      ? `${existing.projectId}::${existing.stepId}`
      : "";
    const body = `
      <form id="event-form" class="form-grid" data-form="event">
        <input type="hidden" name="id" value="${existing ? U.esc(existing.id) : ""}">
        <div class="form-error" data-form-error hidden>${icon("alert")}<span></span></div>
        <div class="field">
          <label for="event-title">日程内容</label>
          <input class="input" id="event-title" data-autofocus type="text" name="title" maxlength="180"
                 value="${existing ? U.esc(existing.title) : ""}" placeholder="例如：跑 baseline 消融实验" required>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="event-date">日期</label>
            <input class="input" id="event-date" type="date" name="date" value="${U.esc(date)}" required>
          </div>
          <div class="field">
            <label for="event-link">关联课题阶段</label>
            <select class="select" id="event-link" name="link">
              ${C.projectOptions(existing ? existing.projectId : null, existing ? existing.stepId : null)}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="event-start">开始时间</label>
            <input class="input" id="event-start" type="time" name="start" value="${U.esc(existing ? existing.start : "09:00")}">
          </div>
          <div class="field">
            <label for="event-end">结束时间</label>
            <input class="input" id="event-end" type="time" name="end" value="${U.esc(existing ? existing.end : "10:00")}">
          </div>
        </div>
        <div class="field">
          <label for="event-notes">备注</label>
          <textarea class="textarea" id="event-notes" name="notes" maxlength="2000" placeholder="可选：记录要带的东西、判断标准或下一步。">${existing ? U.esc(existing.notes) : ""}</textarea>
        </div>
        <label class="checkbox-line">
          <input type="checkbox" name="done" ${existing && existing.done ? "checked" : ""}>
          已完成
        </label>
        <p class="field-hint">关联到课题阶段后，会在这个阶段自动生成一条子事项；完成任意一侧，另一侧同步。时间留空表示未定时间。</p>
      </form>`;
    const footer = `
      ${existing ? `<button class="btn btn--danger modal-foot-left" type="button" data-action="delete-event" data-id="${U.esc(existing.id)}">删除</button>` : ""}
      <button class="btn btn--ghost" type="button" data-action="close-modal">取消</button>
      <button class="btn btn--primary" type="submit" form="event-form">保存日程</button>`;
    YC.ui.openModal({
      key: "event",
      kicker: "SCHEDULE",
      title: existing ? "编辑日程" : "新建日程",
      sub: existing
        ? `${U.dateLongCN(existing.date)}${existing.projectId ? " · 已关联课题" : ""}`
        : `安排到 ${U.dateLongCN(date)}`,
      body,
      footer,
      wide: true
    });
  }

  function colorChoices(name, colors, selected) {
    return colors.map((color, index) => `
      <label class="color-choice" style="--swatch:${U.esc(color)}" title="颜色 ${index + 1}">
        <input type="radio" name="${U.esc(name)}" value="${U.esc(color)}" ${selected === color ? "checked" : ""}
               aria-label="选择颜色 ${index + 1}">
        <span></span>
      </label>`).join("");
  }

  function habitModal(id) {
    const existing = id ? S.getHabit(id) : null;
    if (id && !existing) return;
    const selected = existing ? existing.color : U.HABIT_COLORS[0];
    const body = `
      <form id="habit-form" class="form-grid" data-form="habit">
        <input type="hidden" name="id" value="${existing ? U.esc(existing.id) : ""}">
        <div class="form-error" data-form-error hidden>${icon("alert")}<span></span></div>
        <div class="field">
          <label for="habit-name">打卡内容</label>
          <input class="input" id="habit-name" data-autofocus type="text" name="name" maxlength="60"
                 value="${existing ? U.esc(existing.name) : ""}" placeholder="例如：读论文 30 分钟" required>
        </div>
        <div class="field">
          <span class="field-label">颜色标记</span>
          <div class="color-choices">${colorChoices("color", U.HABIT_COLORS, selected)}</div>
          <p class="field-hint">完成的日期会用这个颜色填满。</p>
        </div>
      </form>`;
    const footer = `
      ${existing ? `<button class="btn btn--danger modal-foot-left" type="button" data-action="delete-habit" data-id="${U.esc(existing.id)}">删除</button>` : ""}
      <button class="btn btn--ghost" type="button" data-action="close-modal">取消</button>
      <button class="btn btn--primary" type="submit" form="habit-form">${existing ? "保存修改" : "建立打卡"}</button>`;
    YC.ui.openModal({
      key: "habit",
      kicker: "DAILY PRACTICE",
      title: existing ? "编辑打卡" : "新建打卡",
      sub: "每天一个颜色标记，记录持续，而不是完美。",
      body,
      footer
    });
  }

  function sparkModal(id) {
    const existing = id ? S.getSpark(id) : null;
    if (id && !existing) return;
    const currentType = existing ? existing.type : "note";
    const typeOptions = U.SPARK_TYPES.map((type) => `
      <option value="${type.key}" ${currentType === type.key ? "selected" : ""}>${type.label}</option>`).join("");
    const body = `
      <form id="spark-form" class="form-grid" data-form="spark">
        <input type="hidden" name="id" value="${existing ? U.esc(existing.id) : ""}">
        <div class="form-error" data-form-error hidden>${icon("alert")}<span></span></div>
        <div class="field">
          <label for="spark-content">记下这一念</label>
          <textarea class="textarea spark-textarea" id="spark-content" data-autofocus name="content"
                    maxlength="4000" placeholder="一条经验、一个灵感、一个解法，或此刻的心情…" required>${existing ? U.esc(existing.content) : ""}</textarea>
          <p class="field-hint">可以写得粗糙。先留下，之后再回来整理。</p>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="spark-type">类型</label>
            <select class="select" id="spark-type" name="type">${typeOptions}</select>
          </div>
          <div class="field">
            <span class="field-label">每日提醒</span>
            <label class="checkbox-line spark-remind-line">
              <input type="checkbox" name="remind" ${existing && existing.remind ? "checked" : ""}>
              <span>在「今天」提醒<small>每天随机抽取一条</small></span>
            </label>
          </div>
        </div>
        <div class="stage-note">
          ${icon("spark")}
          <span>勾选后，这条闪念会进入每日抽取池。默认不提醒。</span>
        </div>
      </form>`;
    const footer = `
      ${existing ? `<button class="btn btn--danger modal-foot-left" type="button" data-action="delete-spark" data-id="${U.esc(existing.id)}">删除</button>` : ""}
      <button class="btn btn--ghost" type="button" data-action="close-modal">取消</button>
      <button class="btn btn--primary" type="submit" form="spark-form">保存闪念</button>`;
    YC.ui.openModal({
      key: "spark",
      kicker: "FLASH NOTES",
      title: existing ? "编辑闪念" : "记录闪念",
      sub: existing ? "经验、灵感、心情，都值得被记住。" : "先写下来，再决定它要不要每天提醒你。",
      body,
      footer
    });
  }

  function projectModal(id) {
    const existing = id ? S.getProject(id) : null;
    if (id && !existing) return;
    const selected = existing ? existing.color : U.PROJECT_COLORS[0];
    const start = existing && existing.steps[0] ? existing.steps[0].start : U.todayISO();
    const body = `
      <form id="project-form" class="form-grid" data-form="project">
        <input type="hidden" name="id" value="${existing ? U.esc(existing.id) : ""}">
        <div class="form-error" data-form-error hidden>${icon("alert")}<span></span></div>
        <div class="field">
          <label for="project-name">课题名称</label>
          <input class="input" id="project-name" data-autofocus type="text" name="name" maxlength="80"
                 value="${existing ? U.esc(existing.name) : ""}" placeholder="例如：多模态情绪识别" required>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="project-start">开始日期</label>
            <input class="input" id="project-start" type="date" name="start" value="${U.esc(start)}" required>
          </div>
          <div class="field">
            <span class="field-label">课题颜色</span>
            <div class="color-choices">${colorChoices("color", U.PROJECT_COLORS, selected)}</div>
          </div>
        </div>
        <div class="stage-note">
          ${icon("spark")}
          <span>${existing
            ? "调整开始日期会整体平移八个阶段的日期；具体阶段日期也可以在阶段详情中单独修改。"
            : "保存后自动生成 Idea 生成、实验程序、数据收集、数据分析、结果讨论、论文写作、投稿、接收八个阶段，每阶段默认 3 周。"}</span>
        </div>
      </form>`;
    const footer = `
      ${existing ? `<button class="btn btn--danger modal-foot-left" type="button" data-action="delete-project" data-id="${U.esc(existing.id)}">删除课题</button>` : ""}
      <button class="btn btn--ghost" type="button" data-action="close-modal">取消</button>
      <button class="btn btn--primary" type="submit" form="project-form">${existing ? "保存修改" : "建立课题"}</button>`;
    YC.ui.openModal({
      key: "project",
      kicker: "RESEARCH TRACK",
      title: existing ? "编辑课题" : "新建课题",
      sub: existing ? "八个阶段会跟着课题走。" : "建立课题后，把日程关联到阶段，进度会自动推进。",
      body,
      footer,
      wide: true
    });
  }


  YC.modals = { eventModal, habitModal, projectModal, sparkModal };
})();
