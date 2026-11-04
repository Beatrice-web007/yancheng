(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const C = YC.components;
  const icon = YC.ui.icon;

  const VALID_VIEWS = ["today", "schedule", "habits", "projects", "sparks"];
  const THEME_KEY = "yancheng.theme.v1";
  const VIEW_TITLES = {
    today: "今天",
    schedule: "日程",
    habits: "日常打卡",
    projects: "课题推进",
    sparks: "闪念"
  };

  const app = {
    ui: {
      view: "today",
      selectedDate: U.todayISO(),
      scheduleView: "month",
      habitMonth: U.monthKey(U.todayISO()),
      sparkFilter: "all",
      sparkRemindOnly: false
    }
  };
  YC.app = app;

  let themePref = "auto";
  let deferredInstallPrompt = null;
  let dragId = null;
  let lastRenderedView = null;

  const mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function readThemePref() {
    try {
      const value = window.localStorage.getItem(THEME_KEY);
      return ["auto", "light", "dark"].includes(value) ? value : "auto";
    } catch (error) {
      return "auto";
    }
  }

  function effectiveTheme() {
    if (themePref === "light" || themePref === "dark") return themePref;
    return mql && mql.matches ? "dark" : "light";
  }

  function applyTheme() {
    const root = document.documentElement;
    if (themePref === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themePref);
    }
    updateThemeMeta();
  }

  function updateThemeMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", effectiveTheme() === "dark" ? "#0D1511" : "#F4F2EC");
  }

  function updateThemeControls() {
    const dark = effectiveTheme() === "dark";
    const iconName = dark ? "sun" : "moon";
    document.querySelectorAll('[data-action="toggle-theme"]').forEach((button) => {
      if (button.classList.contains("rail-link")) {
        button.innerHTML = `${icon(iconName)}<span>切换主题</span>`;
      } else {
        button.innerHTML = icon(iconName);
      }
      button.setAttribute("aria-label", dark ? "切换到浅色主题" : "切换到深色主题");
    });
  }

  function setTheme(pref, options) {
    themePref = ["auto", "light", "dark"].includes(pref) ? pref : "auto";
    try {
      window.localStorage.setItem(THEME_KEY, themePref);
    } catch (error) {
      // Theme still applies for this session.
    }
    applyTheme();
    updateThemeControls();
    refreshSettings();
    const opts = options || {};
    if (opts.toast) {
      const label = themePref === "auto" ? "跟随系统" : themePref === "dark" ? "深色" : "浅色";
      YC.ui.toast(`主题：${label}`, { type: "info" });
    }
  }

  function toggleTheme() {
    setTheme(effectiveTheme() === "dark" ? "light" : "dark", { toast: true });
  }

  function initRouter() {
    const hashView = window.location.hash.replace(/^#/, "");
    if (!VALID_VIEWS.includes(hashView)) {
      try {
        window.history.replaceState(null, "", "#today");
      } catch (error) {
        window.location.hash = "today";
      }
      app.ui.view = "today";
    } else {
      app.ui.view = hashView;
    }
    window.addEventListener("hashchange", () => {
      const next = window.location.hash.replace(/^#/, "");
      if (!VALID_VIEWS.includes(next) || next === app.ui.view) return;
      YC.ui.closeAll();
      app.ui.view = next;
      render();
      window.scrollTo(0, 0);
    });
  }

  function navigate(view) {
    if (!VALID_VIEWS.includes(view)) return;
    if (window.location.hash.replace(/^#/, "") === view) {
      app.ui.view = view;
      render();
      return;
    }
    window.location.hash = view;
  }

  function storageBanner() {
    if (S.storageOK && !S.loadError) return "";
    const message = S.loadError
      ? "本地数据读取失败，当前显示的是示例内容。请先导出或清空站点数据后再试。"
      : "浏览器阻止了本地存储。本次修改只在当前页面有效，关闭后会丢失。";
    return `
      <div class="demo-banner demo-banner--danger" role="alert">
        ${icon("alert")}
        <p><strong>数据可能无法保存</strong>${U.esc(message)}</p>
        <div class="demo-banner-actions">
          <button class="btn btn--small btn--secondary" type="button" data-action="open-settings">数据设置</button>
        </div>
      </div>`;
  }

  function updateRail() {
    const today = U.todayISO();
    const week = S.weekEventStats(today);
    const weekTotal = week.items.reduce((sum, item) => sum + item.total, 0);
    const weekDone = week.items.reduce((sum, item) => sum + item.done, 0);
    const weekPct = U.percent(weekDone, weekTotal);
    const overall = S.overallProjectStats();
    const dateEl = document.getElementById("rail-date");
    const weekdayEl = document.getElementById("rail-weekday");
    if (dateEl) dateEl.textContent = U.dateDots(today);
    if (weekdayEl) weekdayEl.textContent = U.weekdayFull(today);
    const pulse = document.getElementById("rail-pulse");
    if (pulse) {
      pulse.innerHTML = `
        <div class="rail-pulse-label"><span>THIS WEEK</span><span>${weekDone}/${weekTotal}</span></div>
        <strong>${weekPct}%</strong>
        <p>${weekDone} 项日程完成 · ${overall.active} 个课题推进中</p>
        <div class="progress"><span style="width:${weekPct}%"></span></div>`;
    }
  }

  function updateNav() {
    document.querySelectorAll("[data-nav]").forEach((item) => {
      const active = item.dataset.nav === app.ui.view;
      item.classList.toggle("is-active", active);
      if (active) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
    updateFab();
  }

  function updateFab() {
    const fab = document.querySelector(".fab");
    if (!fab) return;
    const config = {
      today: { action: "add-event", label: "新建日程", date: U.todayISO() },
      schedule: { action: "add-event", label: "新建日程", date: app.ui.selectedDate || U.todayISO() },
      habits: { action: "add-habit", label: "新建打卡" },
      projects: { action: "add-project", label: "新建课题" },
      sparks: { action: "add-spark", label: "记录闪念" }
    }[app.ui.view] || { action: "add-event", label: "新建日程", date: U.todayISO() };
    fab.dataset.action = config.action;
    fab.setAttribute("aria-label", config.label);
    fab.setAttribute("title", config.label);
    if (config.date) fab.dataset.date = config.date;
    else delete fab.dataset.date;
  }

  function render() {
    const root = document.getElementById("view-root");
    if (!root) return;
    const view = VALID_VIEWS.includes(app.ui.view) ? app.ui.view : "today";
    const viewModule = YC.views[view];
    if (!viewModule) return;
    const previousView = lastRenderedView;
    lastRenderedView = view;
    root.innerHTML = `${storageBanner()}${viewModule.render()}`;
    document.body.dataset.view = view;
    document.title = `${VIEW_TITLES[view]} · 研程`;
    updateNav();
    updateRail();
    updateThemeControls();
    if (previousView && previousView !== view) window.scrollTo(0, 0);
  }

  function showFormError(form, message) {
    let box = form.querySelector("[data-form-error]");
    if (!box) {
      box = document.createElement("div");
      box.className = "form-error";
      box.setAttribute("data-form-error", "");
      box.innerHTML = `${icon("alert")}<span></span>`;
      form.prepend(box);
    }
    box.hidden = false;
    const text = box.querySelector("span");
    if (text) text.textContent = message;
    try {
      box.scrollIntoView({ block: "nearest" });
    } catch (error) {
      // Ignore scroll failures.
    }
  }

  app.render = render; app.showFormError = showFormError; app.refreshSettings = refreshSettings;

  function refreshSettings() {
    const current = YC.ui.currentModal();
    if (!current || current.key !== "settings") return;
    Object.assign(current, YC.settings.config(themePref, deferredInstallPrompt));
    YC.ui.refreshModal();
  }

  function openSettings() {
    YC.ui.openModal(YC.settings.config(themePref, deferredInstallPrompt));
  }

  async function installApp() {
    if (!deferredInstallPrompt) {
      YC.ui.toast("当前浏览器没有提供安装入口，请从浏览器菜单选择“添加到主屏幕”。", { type: "info", duration: 4200 });
      return;
    }
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      refreshSettings();
      YC.ui.toast(choice && choice.outcome === "accepted" ? "已开始安装" : "已取消安装", {
        type: choice && choice.outcome === "accepted" ? "success" : "info"
      });
    } catch (error) {
      YC.ui.toast("安装入口暂时不可用，请使用浏览器菜单添加到主屏幕。", { type: "info" });
    }
  }

  function handleToggleEvent(id) {
    const before = S.getEvent(id);
    if (!before) return;
    const next = S.toggleEvent(id);
    if (!next) return;
    if (next.projectId) {
      const link = S.eventProject(next);
      if (link) {
        YC.ui.toast(next.done
          ? `已完成，同步到「${link.project.name} · ${link.step.name}」`
          : `已取消完成，课题进度已同步回退`, { type: "info" });
      }
    }
  }

  function handleCalendarStep(direction) {
    const view = app.ui.scheduleView;
    const current = app.ui.selectedDate || U.todayISO();
    if (view === "month") {
      app.ui.selectedDate = YC.views.schedule.shiftMonth(current, direction);
    } else if (view === "week") {
      app.ui.selectedDate = U.addDays(current, direction * 7);
    } else {
      app.ui.selectedDate = U.addDays(current, direction);
    }
    render();
  }

  function handleHabitMonth(direction) {
    const today = U.todayISO();
    const [year, month] = (app.ui.habitMonth || U.monthKey(today)).split("-").map(Number);
    const next = new Date(year, month - 1 + direction, 1);
    const nextKey = `${next.getFullYear()}-${U.pad(next.getMonth() + 1)}`;
    if (nextKey > U.monthKey(today)) return;
    app.ui.habitMonth = nextKey;
    render();
  }

  async function handleAction(element) {
    const action = element.dataset.action;
    if (!action) return;
    if (YC.gistSync && YC.gistSync.handle(action, element)) return;
    if (YC.sparkActions && YC.sparkActions.handle(action, element)) return;
    switch (action) {
      case "add-event":
        YC.modals.eventModal(null, element.dataset.date);
        break;
      case "open-event":
        YC.modals.eventModal(element.dataset.id);
        break;
      case "toggle-event":
        handleToggleEvent(element.dataset.id);
        break;
      case "add-habit":
        YC.modals.habitModal();
        break;
      case "edit-habit":
        YC.modals.habitModal(element.dataset.id);
        break;
      case "toggle-habit":
        S.toggleHabit(element.dataset.id, element.dataset.date);
        break;
      case "delete-habit": {
        const habit = S.getHabit(element.dataset.id);
        if (!habit) break;
        YC.ui.confirm({
          title: "删除这个打卡？",
          message: `「${habit.name}」的全部打卡历史都会被删除，无法撤销。`,
          confirmLabel: "删除打卡",
          onConfirm: () => {
            YC.ui.closeAll();
            S.deleteHabit(habit.id);
            YC.ui.toast("打卡已删除");
          }
        });
        break;
      }
      case "add-project":
        YC.modals.projectModal();
        break;
      case "edit-project":
        YC.modals.projectModal(element.dataset.id);
        break;
      case "delete-project": {
        const project = S.getProject(element.dataset.id);
        if (!project) break;
        YC.ui.confirm({
          title: "删除这个课题？",
          message: `「${project.name}」的八个阶段和全部子事项会被删除；关联日程会保留，但解除课题关联。`,
          confirmLabel: "删除课题",
          onConfirm: () => {
            YC.ui.closeAll();
            S.deleteProject(project.id);
            YC.ui.toast("课题已删除");
          }
        });
        break;
      }
      case "open-stage": {
        const config = YC.views.projects.stageConfig(element.dataset.project, element.dataset.step);
        if (config) YC.ui.openModal(config);
        break;
      }
      case "toggle-subtask": {
        const projectId = element.dataset.project;
        const stepId = element.dataset.step;
        S.toggleSubtask(projectId, stepId, element.dataset.subtask);
        YC.views.projects.refreshStage(projectId, stepId);
        break;
      }
      case "delete-subtask": {
        const project = S.getProject(element.dataset.project);
        const step = project && project.steps.find((item) => item.id === element.dataset.step);
        const subtask = step && step.subtasks.find((item) => item.id === element.dataset.subtask);
        if (!subtask) break;
        YC.ui.confirm({
          title: "删除这个子事项？",
          message: subtask.sourceEventId
            ? "这个子事项来自日程。删除它会解除与日程的关联，日程本身会保留。"
            : "删除后无法撤销。",
          confirmLabel: "删除子事项",
          onConfirm: () => {
            S.deleteSubtask(element.dataset.project, element.dataset.step, element.dataset.subtask);
            YC.views.projects.refreshStage(element.dataset.project, element.dataset.step);
            YC.ui.toast("子事项已删除");
          }
        });
        break;
      }
      case "complete-empty-stage": {
        const projectId = element.dataset.project;
        const stepId = element.dataset.step;
        S.completeEmptyStage(projectId, stepId);
        YC.views.projects.refreshStage(projectId, stepId);
        YC.ui.toast("阶段已标记完成");
        break;
      }
      case "delete-event": {
        const event = S.getEvent(element.dataset.id);
        if (!event) break;
        const existing = S.findSubtaskByEvent(event.id);
        YC.ui.confirm({
          title: "删除这条日程？",
          message: existing
            ? `它同步在课题「${existing.project.name}」的「${existing.step.name}」阶段中，删除日程会同时移除那条子事项。`
            : "删除后无法撤销。",
          confirmLabel: "删除日程",
          onConfirm: () => {
            YC.ui.closeAll();
            S.deleteEvent(event.id);
            YC.ui.toast("日程已删除");
          }
        });
        break;
      }
      case "calendar-prev":
        handleCalendarStep(-1);
        break;
      case "calendar-next":
        handleCalendarStep(1);
        break;
      case "calendar-today":
        app.ui.selectedDate = U.todayISO();
        render();
        break;
      case "set-schedule-view":
        app.ui.scheduleView = element.dataset.view;
        render();
        break;
      case "open-day":
        app.ui.selectedDate = element.dataset.date;
        app.ui.scheduleView = "day";
        if (app.ui.view !== "schedule") navigate("schedule");
        else render();
        break;
      case "habit-prev":
        handleHabitMonth(-1);
        break;
      case "habit-next":
        handleHabitMonth(1);
        break;
      case "habit-today":
        app.ui.habitMonth = U.monthKey(U.todayISO());
        render();
        break;
      case "dismiss-demo":
        S.dismissDemo();
        YC.ui.toast("示例提示已隐藏，数据仍在本地。", { type: "info" });
        break;
      case "clear-demo":
      case "reset-data": {
        const data = S.getState();
        YC.ui.confirm({
          title: "清空全部数据？",
          message: `会删除 ${data.events.length} 条日程、${data.habits.length} 个打卡、${data.projects.length} 个课题和 ${data.sparks.length} 条闪念。此操作无法撤销，建议先导出备份。`,
          confirmLabel: "清空全部数据",
          onConfirm: () => {
            S.resetEmpty();
            app.ui.selectedDate = U.todayISO();
            app.ui.habitMonth = U.monthKey(U.todayISO());
            app.ui.sparkFilter = "all";
            app.ui.sparkRemindOnly = false;
            YC.ui.closeAll();
            YC.ui.toast("已清空，可以开始记录你的研究。", { type: "info" });
          }
        });
        break;
      }
      case "load-demo": {
        YC.ui.confirm({
          title: "载入示例数据？",
          message: "当前数据会被示例内容替换。建议先导出备份。",
          confirmLabel: "载入示例",
          onConfirm: () => {
            S.loadDemo();
            app.ui.selectedDate = U.todayISO();
            app.ui.habitMonth = U.monthKey(U.todayISO());
            app.ui.sparkFilter = "all";
            app.ui.sparkRemindOnly = false;
            YC.ui.closeAll();
            YC.ui.toast("示例数据已载入", { type: "info" });
          }
        });
        break;
      }
      case "skip-main": {
        const main = document.getElementById("view-root");
        if (main) main.focus({ preventScroll: false });
        break;
      }
      case "open-settings":
        openSettings();
        break;
      case "set-theme":
        setTheme(element.dataset.themeValue, { toast: true });
        break;
      case "toggle-theme":
        toggleTheme();
        break;
      case "export-download": {
        const ok = YC.ui.downloadText(`yancheng-backup-${U.todayISO()}.json`, S.exportJSON());
        YC.ui.toast(ok
          ? "已生成备份文件；若浏览器未下载，请使用「复制 JSON」"
          : "下载没有启动，请使用「复制 JSON」", { type: ok ? "info" : "error", duration: 4200 });
        break;
      }
      case "export-copy": {
        const json = S.exportJSON();
        const ok = await YC.ui.copyText(json);
        if (ok) {
          YC.ui.toast("备份 JSON 已复制");
        } else {
          const area = document.getElementById("export-preview");
          if (area) {
            area.focus();
            area.select();
          }
          YC.ui.toast("无法自动复制，已选中文本，请手动复制", { type: "error", duration: 4000 });
        }
        break;
      }
      case "import-text": {
        const area = document.getElementById("import-text");
        const text = area ? area.value.trim() : "";
        if (!text) {
          YC.ui.toast("请先粘贴备份 JSON", { type: "error" });
          break;
        }
        YC.settings.confirmImport(text, "粘贴文本");
        break;
      }
      case "install-app":
        await installApp();
        break;
      case "close-modal":
        YC.ui.closeTop();
        break;
      case "modal-confirm":
        YC.ui.confirmAction();
        break;
      default:
        break;
    }
  }

  function onSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const type = form.dataset.form;
    if (type === "spark") {
      YC.sparkActions.submit(form, new FormData(form));
      return;
    }
    try {
      if (type === "event") {
        const fd = new FormData(form);
        const id = String(fd.get("id") || "");
        const title = String(fd.get("title") || "").trim();
        const date = String(fd.get("date") || "");
        const start = String(fd.get("start") || "");
        const end = String(fd.get("end") || "");
        const notes = String(fd.get("notes") || "");
        if (!title) throw new Error("请填写日程内容");
        if (!U.isDateString(date)) throw new Error("请选择有效日期");
        if (start && end && end <= start) throw new Error("结束时间需要晚于开始时间");
        const old = id ? S.getEvent(id) : null;
        const hadLink = Boolean(old && old.projectId);
        const link = C.splitLinkValue(fd.get("link"));
        const saved = S.upsertEvent({
          title,
          date,
          start,
          end,
          notes,
          done: fd.get("done") === "on",
          projectId: link.projectId,
          stepId: link.stepId
        }, id || null);
        YC.ui.closeAll();
        if (saved.projectId) {
          const linked = S.eventProject(saved);
          YC.ui.toast(linked ? `日程已保存，并同步到「${linked.project.name} · ${linked.step.name}」` : "日程已保存");
        } else if (hadLink) {
          YC.ui.toast("日程已保存，原有子事项保留为手动项", { type: "info" });
        } else {
          YC.ui.toast("日程已保存");
        }
      } else if (type === "habit") {
        const fd = new FormData(form);
        const id = String(fd.get("id") || "");
        const name = String(fd.get("name") || "").trim();
        const color = String(fd.get("color") || U.HABIT_COLORS[0]);
        if (!name) throw new Error("请填写打卡内容");
        if (id) {
          S.updateHabit(id, { name, color });
          YC.ui.closeAll();
          YC.ui.toast("打卡已更新");
        } else {
          S.addHabit(name, color);
          YC.ui.closeAll();
          YC.ui.toast("打卡已建立");
        }
      } else if (type === "project") {
        const fd = new FormData(form);
        const id = String(fd.get("id") || "");
        const name = String(fd.get("name") || "").trim();
        const start = String(fd.get("start") || "");
        const color = String(fd.get("color") || U.PROJECT_COLORS[0]);
        if (!name) throw new Error("请填写课题名称");
        if (!U.isDateString(start)) throw new Error("请选择开始日期");
        if (id) {
          S.updateProject(id, { name, start, color });
          YC.ui.closeAll();
          YC.ui.toast("课题已更新");
        } else {
          S.createProject(name, start, color);
          YC.ui.closeAll();
          YC.ui.toast("课题已建立，八个阶段已生成");
        }
      } else if (type === "stage-dates") {
        const fd = new FormData(form);
        const projectId = form.dataset.project;
        const stepId = form.dataset.step;
        const start = String(fd.get("start") || "");
        const end = String(fd.get("end") || "");
        if (!U.isDateString(start) || !U.isDateString(end)) throw new Error("请选择完整日期");
        if (end < start) throw new Error("结束日期不能早于开始日期");
        S.updateStepDates(projectId, stepId, start, end);
        YC.views.projects.refreshStage(projectId, stepId);
        YC.ui.toast("阶段日期已更新");
      } else if (type === "subtask-add") {
        const fd = new FormData(form);
        const projectId = form.dataset.project;
        const stepId = form.dataset.step;
        const title = String(fd.get("title") || "").trim();
        const date = String(fd.get("date") || "");
        if (!title) throw new Error("请填写子事项");
        S.addSubtask(projectId, stepId, title, date);
        YC.views.projects.refreshStage(projectId, stepId);
        window.requestAnimationFrame(() => {
          const input = document.querySelector('.subtask-add input[name="title"]');
          if (input) input.focus();
        });
      }
    } catch (error) {
      showFormError(form, error.message || "保存失败，请检查输入");
    }
  }

  function onChange(event) {
    const input = event.target;
    if (!input || input.id !== "import-file") return;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      YC.settings.confirmImport(String(reader.result || ""), file.name);
    };
    reader.onerror = () => {
      YC.ui.toast("文件读取失败", { type: "error" });
    };
    reader.readAsText(file);
    input.value = "";
  }

  function dragCleanup() {
    dragId = null;
    document.querySelectorAll(".is-drop-target").forEach((el) => el.classList.remove("is-drop-target"));
    document.querySelectorAll(".is-dragging").forEach((el) => el.classList.remove("is-dragging"));
  }

  function bindDrag() {
    document.addEventListener("dragstart", (event) => {
      const source = event.target.closest('[draggable="true"][data-event-id]');
      if (!source) return;
      dragId = source.dataset.eventId;
      source.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dragId);
      }
    });
    document.addEventListener("dragover", (event) => {
      if (!dragId) return;
      const zone = event.target.closest("[data-drop-date]");
      if (!zone) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      zone.classList.add("is-drop-target");
    });
    document.addEventListener("dragleave", (event) => {
      const zone = event.target.closest("[data-drop-date]");
      if (!zone) return;
      if (!zone.contains(event.relatedTarget)) zone.classList.remove("is-drop-target");
    });
    document.addEventListener("drop", (event) => {
      if (!dragId) return;
      const zone = event.target.closest("[data-drop-date]");
      if (!zone) return;
      event.preventDefault();
      const eventId = dragId;
      const date = zone.dataset.dropDate;
      dragCleanup();
      if (!U.isDateString(date)) return;
      const moved = S.moveEvent(eventId, date);
      if (moved) {
        YC.ui.toast(`已移动到 ${U.dateCN(date)}`, { type: "info" });
      }
    });
    document.addEventListener("dragend", dragCleanup);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-action]");
      if (!actionEl) return;
      if (actionEl.disabled) return;
      event.preventDefault();
      void handleAction(actionEl);
    });

    document.addEventListener("submit", onSubmit);
    document.addEventListener("change", onChange);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!target || target.closest("button, input, select, textarea, a")) return;
      if (target.matches('[role="button"][data-action]')) {
        event.preventDefault();
        target.click();
      }
    });
    document.addEventListener("yc:change", () => {
      if (S.getState()) render();
    });
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      refreshSettings();
    });
    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      refreshSettings();
      YC.ui.toast("研程已安装到桌面");
    });
    if (mql) {
      const onChangeTheme = () => {
        if (themePref !== "auto") return;
        updateThemeMeta();
        updateThemeControls();
      };
      if (mql.addEventListener) mql.addEventListener("change", onChangeTheme);
      else if (mql.addListener) mql.addListener(onChangeTheme);
    }
    bindDrag();
  }

  function registerServiceWorker() {
    if (window.__YC_PREVIEW__) return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // The app still works without offline caching.
      });
    });
  }

  function init() {
    S.init();
    themePref = readThemePref();
    applyTheme();
    updateThemeControls();
    bindEvents();
    initRouter();
    render();
    registerServiceWorker();
    if (S.loadError) {
      window.setTimeout(() => YC.ui.toast(S.loadError, { type: "error", duration: 6000 }), 600);
    } else if (!S.storageOK) {
      window.setTimeout(() => YC.ui.toast("浏览器阻止了本地存储，数据可能不会保存。请导出备份。", { type: "error", duration: 6000 }), 600);
    }
    document.dispatchEvent(new CustomEvent("yc:ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
