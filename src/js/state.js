(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const STORAGE_KEY = "yancheng.state.v1";

  const STAGE_TEMPLATE = [
    { key: "idea", name: "Idea 生成" },
    { key: "experiment", name: "实验程序" },
    { key: "data", name: "数据收集" },
    { key: "analysis", name: "数据分析" },
    { key: "discussion", name: "结果讨论" },
    { key: "writing", name: "论文写作" },
    { key: "submission", name: "投稿" },
    { key: "acceptance", name: "接收" }
  ];

  const STAGE_DAYS = 21;
  const STAGE_OVERLAP = 0;

  let data = null;
  let storageOK = true;
  let loadError = "";

  function nowISO() {
    return new Date().toISOString();
  }

  function emptyState() {
    return {
      version: 2,
      updatedAt: nowISO(),
      meta: {
        createdAt: nowISO(),
        isDemo: false,
        demoDismissed: false
      },
      events: [],
      habits: [],
      projects: [],
      sparks: []
    };
  }

  function createStep(template, index, projectStart, projectId) {
    const start = U.addDays(projectStart, index * STAGE_DAYS - index * STAGE_OVERLAP);
    const end = U.addDays(start, STAGE_DAYS - 1);
    return {
      id: U.uid(`step-${projectId ? projectId.slice(-6) : "new"}`),
      key: template.key,
      name: template.name,
      start,
      end,
      subtasks: []
    };
  }

  function createProject(name, startDate, color, forcedId) {
    const id = forcedId || U.uid("project");
    const start = U.isDateString(startDate) ? startDate : U.todayISO();
    return {
      id,
      name,
      color: U.safeColor(color, U.PROJECT_COLORS[0]),
      createdAt: nowISO(),
      steps: STAGE_TEMPLATE.map((template, index) => createStep(template, index, start, id))
    };
  }

  function normalizeSubtask(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : U.uid("sub"),
      title: String(raw.title || "未命名子事项").slice(0, 180),
      done: Boolean(raw.done),
      date: U.isDateString(raw.date) ? raw.date : "",
      sourceEventId: raw.sourceEventId ? String(raw.sourceEventId) : null,
      createdAt: raw.createdAt ? String(raw.createdAt) : nowISO()
    };
  }

  function normalizeStep(raw, index, projectStart, projectId) {
    const fallback = STAGE_TEMPLATE[index] || STAGE_TEMPLATE[STAGE_TEMPLATE.length - 1];
    const start = U.isDateString(raw && raw.start) ? raw.start : U.addDays(projectStart, index * STAGE_DAYS);
    const end = U.isDateString(raw && raw.end) ? raw.end : U.addDays(start, STAGE_DAYS - 1);
    const subtasks = raw && Array.isArray(raw.subtasks)
      ? raw.subtasks.map(normalizeSubtask).filter(Boolean)
      : [];
    return {
      id: raw && typeof raw.id === "string" && raw.id ? raw.id : U.uid(`step-${projectId.slice(-5)}`),
      key: raw && raw.key ? String(raw.key) : fallback.key,
      name: raw && raw.name ? String(raw.name).slice(0, 60) : fallback.name,
      start,
      end,
      subtasks
    };
  }

  function normalizeProject(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = typeof raw.id === "string" && raw.id ? raw.id : U.uid("project");
    const name = String(raw.name || "未命名课题").slice(0, 80);
    const color = U.safeColor(raw.color, U.PROJECT_COLORS[0]);
    const createdAt = raw.createdAt ? String(raw.createdAt) : nowISO();
    const start = raw.steps && raw.steps[0] && U.isDateString(raw.steps[0].start)
      ? raw.steps[0].start
      : U.addDays(U.todayISO(), -7);
    let steps = raw.steps && Array.isArray(raw.steps) && raw.steps.length
      ? raw.steps.slice(0, 8).map((step, index) => normalizeStep(step, index, start, id))
      : STAGE_TEMPLATE.map((template, index) => createStep(template, index, start, id));
    while (steps.length < STAGE_TEMPLATE.length) {
      steps.push(createStep(STAGE_TEMPLATE[steps.length], steps.length, start, id));
    }
    return { id, name, color, createdAt, steps };
  }

  function normalizeHabit(raw) {
    if (!raw || typeof raw !== "object") return null;
    const history = {};
    if (raw.history && typeof raw.history === "object") {
      Object.keys(raw.history).forEach((key) => {
        if (U.isDateString(key) && raw.history[key]) history[key] = true;
      });
    }
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : U.uid("habit"),
      name: String(raw.name || "未命名习惯").slice(0, 60),
      color: U.safeColor(raw.color, U.HABIT_COLORS[0]),
      createdAt: raw.createdAt ? String(raw.createdAt) : nowISO(),
      history
    };
  }

  function normalizeEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : U.uid("event"),
      title: String(raw.title || "未命名日程").slice(0, 180),
      date: U.isDateString(raw.date) ? raw.date : U.todayISO(),
      start: U.isTimeString(raw.start) ? String(raw.start || "") : "",
      end: U.isTimeString(raw.end) ? String(raw.end || "") : "",
      done: Boolean(raw.done),
      notes: String(raw.notes || "").slice(0, 2000),
      projectId: raw.projectId ? String(raw.projectId) : null,
      stepId: raw.stepId ? String(raw.stepId) : null,
      createdAt: raw.createdAt ? String(raw.createdAt) : nowISO(),
      updatedAt: raw.updatedAt ? String(raw.updatedAt) : nowISO()
    };
  }

  function normalizeSpark(raw) {
    if (!raw || typeof raw !== "object") return null;
    const content = String(raw.content || "").trim().slice(0, 4000);
    if (!content) return null;
    const validType = U.SPARK_TYPES.some((type) => type.key === raw.type);
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : U.uid("spark"),
      content,
      type: validType ? raw.type : "note",
      remind: Boolean(raw.remind),
      createdAt: raw.createdAt ? String(raw.createdAt) : nowISO(),
      updatedAt: raw.updatedAt ? String(raw.updatedAt) : nowISO()
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") throw new Error("数据格式无法识别");
    const meta = raw.meta && typeof raw.meta === "object" ? raw.meta : {};
    const events = Array.isArray(raw.events) ? raw.events.map(normalizeEvent).filter(Boolean) : [];
    const habits = Array.isArray(raw.habits) ? raw.habits.map(normalizeHabit).filter(Boolean) : [];
    const projects = Array.isArray(raw.projects) ? raw.projects.map(normalizeProject).filter(Boolean) : [];
    const sparks = Array.isArray(raw.sparks)
      ? raw.sparks.map(normalizeSpark).filter(Boolean)
      : (meta.isDemo && YC.seed && typeof YC.seed.demoSparks === "function" ? YC.seed.demoSparks() : []);

    const projectMap = new Map(projects.map((project) => [project.id, project]));
    events.forEach((event) => {
      const project = event.projectId ? projectMap.get(event.projectId) : null;
      const step = project && event.stepId ? project.steps.find((item) => item.id === event.stepId) : null;
      if (!project || !step) {
        event.projectId = null;
        event.stepId = null;
      }
    });

    return {
      version: 2,
      updatedAt: raw.updatedAt ? String(raw.updatedAt) : nowISO(),
      meta: {
        createdAt: meta.createdAt ? String(meta.createdAt) : nowISO(),
        isDemo: Boolean(meta.isDemo),
        demoDismissed: Boolean(meta.demoDismissed)
      },
      events,
      habits,
      projects,
      sparks
    };
  }

  function load() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      loadError = "本地数据读取失败，已载入示例内容。请先导出旧数据或清空站点数据后重试。";
      if (raw) {
        try {
          window.localStorage.setItem(`yancheng.state.corrupt.${Date.now()}`, raw);
        } catch (backupError) {
          // Keep the original key untouched if the backup cannot be written.
        }
      }
      return null;
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      storageOK = true;
      return true;
    } catch (error) {
      storageOK = false;
      return false;
    }
  }

  function emit(reason) {
    document.dispatchEvent(new CustomEvent("yc:change", { detail: { reason: reason || "change" } }));
  }

  function commit(reason) {
    data.updatedAt = nowISO();
    save();
    emit(reason);
  }

  function init() {
    const loaded = load();
    if (!loaded) {
      data = YC.seed.build();
    } else {
      data = loaded;
    }
    if (!save()) {
      emit("storage-error");
    }
    return data;
  }

  function get() {
    return data;
  }

  function getState() {
    return data;
  }

  function getProject(projectId) {
    return data.projects.find((project) => project.id === projectId) || null;
  }

  function getStep(projectId, stepId) {
    const project = getProject(projectId);
    return project ? project.steps.find((step) => step.id === stepId) || null : null;
  }

  function getEvent(eventId) {
    return data.events.find((event) => event.id === eventId) || null;
  }

  function getHabit(habitId) {
    return data.habits.find((habit) => habit.id === habitId) || null;
  }

  function getSpark(sparkId) {
    return data.sparks.find((spark) => spark.id === sparkId) || null;
  }

  function findSubtaskByEvent(eventId) {
    for (const project of data.projects) {
      for (const step of project.steps) {
        for (const subtask of step.subtasks) {
          if (subtask.sourceEventId === eventId) {
            return { project, step, subtask };
          }
        }
      }
    }
    return null;
  }

  function removeSubtaskRef(ref) {
    const index = ref.step.subtasks.indexOf(ref.subtask);
    if (index >= 0) ref.step.subtasks.splice(index, 1);
  }

  function syncEventSubtask(event) {
    const existing = findSubtaskByEvent(event.id);
    const targetProject = event.projectId ? getProject(event.projectId) : null;
    const targetStep = targetProject && event.stepId
      ? targetProject.steps.find((step) => step.id === event.stepId)
      : null;

    if (!targetProject || !targetStep) {
      if (existing) {
        delete existing.subtask.sourceEventId;
      }
      event.projectId = null;
      event.stepId = null;
      return;
    }

    if (existing) {
      if (existing.step !== targetStep) removeSubtaskRef(existing);
      existing.subtask.title = event.title;
      existing.subtask.date = event.date;
      existing.subtask.done = event.done;
      if (existing.step !== targetStep) targetStep.subtasks.push(existing.subtask);
      return;
    }

    targetStep.subtasks.push({
      id: U.uid("sub"),
      title: event.title,
      done: event.done,
      date: event.date,
      sourceEventId: event.id,
      createdAt: nowISO()
    });
  }

  function upsertEvent(payload, eventId) {
    const title = String(payload.title || "").trim();
    const date = U.isDateString(payload.date) ? payload.date : "";
    if (!title || !date) throw new Error("请填写日程名称和日期");

    let event = eventId ? getEvent(eventId) : null;
    const isNew = !event;
    if (!event) {
      event = {
        id: U.uid("event"),
        createdAt: nowISO()
      };
      data.events.push(event);
    }

    event.title = title.slice(0, 180);
    event.date = date;
    event.start = U.isTimeString(payload.start) ? String(payload.start || "") : "";
    event.end = U.isTimeString(payload.end) ? String(payload.end || "") : "";
    event.done = Boolean(payload.done);
    event.notes = String(payload.notes || "").slice(0, 2000);
    event.projectId = payload.projectId || null;
    event.stepId = payload.stepId || null;
    event.updatedAt = nowISO();

    syncEventSubtask(event);
    commit(isNew ? "event-add" : "event-update");
    return event;
  }

  function toggleEvent(eventId) {
    const event = getEvent(eventId);
    if (!event) return null;
    event.done = !event.done;
    event.updatedAt = nowISO();
    syncEventSubtask(event);
    commit("event-toggle");
    return event;
  }

  function moveEvent(eventId, date) {
    const event = getEvent(eventId);
    if (!event || !U.isDateString(date)) return null;
    event.date = date;
    event.updatedAt = nowISO();
    syncEventSubtask(event);
    commit("event-move");
    return event;
  }

  function deleteEvent(eventId, options) {
    const event = getEvent(eventId);
    if (!event) return;
    const opts = options || {};
    const existing = findSubtaskByEvent(eventId);
    if (existing) {
      if (opts.keepSubtask) {
        delete existing.subtask.sourceEventId;
      } else {
        removeSubtaskRef(existing);
      }
    }
    data.events = data.events.filter((item) => item.id !== eventId);
    commit("event-delete");
  }

  function addHabit(name, color) {
    const label = String(name || "").trim();
    if (!label) throw new Error("请填写打卡内容");
    const habit = {
      id: U.uid("habit"),
      name: label.slice(0, 60),
      color: U.safeColor(color, U.HABIT_COLORS[0]),
      createdAt: nowISO(),
      history: {}
    };
    data.habits.push(habit);
    commit("habit-add");
    return habit;
  }

  function updateHabit(habitId, patch) {
    const habit = getHabit(habitId);
    if (!habit) return;
    if (typeof patch.name === "string" && patch.name.trim()) habit.name = patch.name.trim().slice(0, 60);
    if (patch.color) habit.color = U.safeColor(patch.color, habit.color);
    commit("habit-update");
  }

  function toggleHabit(habitId, date) {
    const habit = getHabit(habitId);
    if (!habit || !U.isDateString(date)) return;
    if (date > U.todayISO()) return;
    if (habit.history[date]) {
      delete habit.history[date];
    } else {
      habit.history[date] = true;
    }
    commit("habit-toggle");
  }

  function deleteHabit(habitId) {
    data.habits = data.habits.filter((habit) => habit.id !== habitId);
    commit("habit-delete");
  }

  function addSpark(content, type, remind) {
    const text = String(content || "").trim();
    if (!text) throw new Error("请写下一条闪念");
    const validType = U.SPARK_TYPES.some((item) => item.key === type);
    const spark = {
      id: U.uid("spark"),
      content: text.slice(0, 4000),
      type: validType ? type : "note",
      remind: Boolean(remind),
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    data.sparks.push(spark);
    commit("spark-add");
    return spark;
  }

  function updateSpark(sparkId, patch) {
    const spark = getSpark(sparkId);
    if (!spark) return;
    if (typeof patch.content === "string") {
      const text = patch.content.trim();
      if (!text) throw new Error("请写下一条闪念");
      spark.content = text.slice(0, 4000);
    }
    if (typeof patch.type === "string" && U.SPARK_TYPES.some((item) => item.key === patch.type)) {
      spark.type = patch.type;
    }
    if (typeof patch.remind === "boolean") spark.remind = patch.remind;
    spark.updatedAt = nowISO();
    commit("spark-update");
    return spark;
  }

  function toggleSparkRemind(sparkId) {
    const spark = getSpark(sparkId);
    if (!spark) return null;
    spark.remind = !spark.remind;
    spark.updatedAt = nowISO();
    commit("spark-remind");
    return spark;
  }

  function deleteSpark(sparkId) {
    data.sparks = data.sparks.filter((spark) => spark.id !== sparkId);
    commit("spark-delete");
  }

  function createNewProject(name, startDate, color) {
    const label = String(name || "").trim();
    if (!label) throw new Error("请填写课题名称");
    const project = createProject(label.slice(0, 80), startDate, color);
    data.projects.push(project);
    commit("project-add");
    return project;
  }

  function updateProject(projectId, patch) {
    const project = getProject(projectId);
    if (!project) return;
    if (typeof patch.name === "string" && patch.name.trim()) project.name = patch.name.trim().slice(0, 80);
    if (patch.color) project.color = U.safeColor(patch.color, project.color);
    if (U.isDateString(patch.start)) {
      const oldStart = project.steps[0] ? project.steps[0].start : patch.start;
      const delta = U.diffDays(oldStart, patch.start);
      if (delta !== 0) {
        project.steps.forEach((step) => {
          if (U.isDateString(step.start)) step.start = U.addDays(step.start, delta);
          if (U.isDateString(step.end)) step.end = U.addDays(step.end, delta);
        });
      }
    }
    commit("project-update");
  }

  function deleteProject(projectId) {
    const project = getProject(projectId);
    if (!project) return;
    const stepIds = new Set(project.steps.map((step) => step.id));
    data.events.forEach((event) => {
      if (event.projectId === projectId || (event.stepId && stepIds.has(event.stepId))) {
        event.projectId = null;
        event.stepId = null;
        event.updatedAt = nowISO();
      }
    });
    data.projects = data.projects.filter((item) => item.id !== projectId);
    commit("project-delete");
  }

  function updateStepDates(projectId, stepId, start, end) {
    const step = getStep(projectId, stepId);
    if (!step) return;
    if (U.isDateString(start)) step.start = start;
    if (U.isDateString(end)) step.end = end;
    if (step.start && step.end && step.end < step.start) {
      step.end = step.start;
    }
    commit("step-dates");
  }

  function addSubtask(projectId, stepId, title, date) {
    const step = getStep(projectId, stepId);
    if (!step) return;
    const label = String(title || "").trim();
    if (!label) throw new Error("请填写子事项");
    step.subtasks.push({
      id: U.uid("sub"),
      title: label.slice(0, 180),
      done: false,
      date: U.isDateString(date) ? date : "",
      sourceEventId: null,
      createdAt: nowISO()
    });
    commit("subtask-add");
  }

  function toggleSubtask(projectId, stepId, subtaskId) {
    const step = getStep(projectId, stepId);
    if (!step) return;
    const subtask = step.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) return;
    subtask.done = !subtask.done;
    if (subtask.sourceEventId) {
      const event = getEvent(subtask.sourceEventId);
      if (event) {
        event.done = subtask.done;
        event.updatedAt = nowISO();
      }
    }
    commit("subtask-toggle");
  }

  function deleteSubtask(projectId, stepId, subtaskId) {
    const step = getStep(projectId, stepId);
    if (!step) return;
    const subtask = step.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) return;
    if (subtask.sourceEventId) {
      const event = getEvent(subtask.sourceEventId);
      if (event) {
        event.projectId = null;
        event.stepId = null;
        event.updatedAt = nowISO();
      }
    }
    step.subtasks = step.subtasks.filter((item) => item.id !== subtaskId);
    commit("subtask-delete");
  }

  function completeEmptyStage(projectId, stepId) {
    const step = getStep(projectId, stepId);
    if (!step || step.subtasks.length) return;
    step.subtasks.push({
      id: U.uid("sub"),
      title: `完成「${step.name}」阶段`,
      done: true,
      date: U.todayISO(),
      sourceEventId: null,
      createdAt: nowISO()
    });
    commit("stage-complete-empty");
  }

  function exportObject() {
    return {
      app: "研程",
      schema: 2,
      exportedAt: nowISO(),
      counts: {
        events: data.events.length,
        habits: data.habits.length,
        projects: data.projects.length,
        sparks: data.sparks.length
      },
      data
    };
  }

  function exportJSON() {
    return JSON.stringify(exportObject(), null, 2);
  }

  function importJSON(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error("JSON 解析失败，请检查文件内容");
    }
    const raw = parsed && parsed.data ? parsed.data : parsed;
    if (!raw || typeof raw !== "object" || (!Array.isArray(raw.events) && !Array.isArray(raw.habits) && !Array.isArray(raw.projects) && !Array.isArray(raw.sparks))) {
      throw new Error("文件中没有可识别的研程数据");
    }
    const next = normalizeState(raw);
    data = next;
    save();
    emit("import");
    return next;
  }

  function resetEmpty() {
    data = emptyState();
    save();
    emit("reset");
  }

  function loadDemo() {
    data = YC.seed.build();
    save();
    emit("demo");
  }

  function dismissDemo() {
    if (!data.meta) data.meta = {};
    data.meta.demoDismissed = true;
    commit("demo-dismiss");
  }

  YC.store = {
    STAGE_TEMPLATE,
    init,
    getState,
    get,
    getProject,
    getStep,
    getEvent,
    getHabit,
    getSpark,
    findSubtaskByEvent,
    upsertEvent,
    toggleEvent,
    moveEvent,
    deleteEvent,
    addHabit,
    updateHabit,
    toggleHabit,
    deleteHabit,
    addSpark,
    updateSpark,
    toggleSparkRemind,
    deleteSpark,
    createProject: createNewProject,
    createProjectRecord: createProject,
    updateProject,
    deleteProject,
    updateStepDates,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    completeEmptyStage,
    exportJSON,
    exportObject,
    importJSON,
    resetEmpty,
    loadDemo,
    dismissDemo,
    get storageOK() { return storageOK; },
    get loadError() { return loadError; }
  };
})();
