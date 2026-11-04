(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;

  function data() {
    return YC.store.getState();
  }

  function stepStats(step) {
    const total = step.subtasks.length;
    const done = step.subtasks.filter((subtask) => subtask.done).length;
    return {
      total,
      done,
      remaining: total - done,
      pct: U.percent(done, total),
      complete: total > 0 && done === total
    };
  }

  function projectStats(project) {
    const today = U.todayISO();
    const steps = project.steps.map((step, index) => {
      const stats = stepStats(step);
      const overdue = !stats.complete && Boolean(step.end) && step.end < today;
      return {
        index,
        step,
        stats,
        overdue,
        complete: stats.complete
      };
    });
    const nextIndex = steps.findIndex((item) => !item.complete);
    steps.forEach((item) => {
      item.active = item.index === nextIndex;
    });
    const pct = Math.round(steps.reduce((sum, item) => sum + item.stats.pct, 0) / (steps.length || 1));
    return {
      pct: U.clamp(pct, 0, 100),
      steps,
      next: nextIndex >= 0 ? steps[nextIndex] : null,
      nextIndex,
      completedStages: steps.filter((item) => item.complete).length,
      plannedStages: steps.filter((item) => item.stats.total > 0).length,
      emptyStages: steps.filter((item) => item.stats.total === 0).length,
      totalTasks: steps.reduce((sum, item) => sum + item.stats.total, 0),
      doneTasks: steps.reduce((sum, item) => sum + item.stats.done, 0),
      allComplete: steps.every((item) => item.complete)
    };
  }

  function overallProjectStats() {
    const state = data();
    if (!state.projects.length) {
      return { pct: 0, active: 0, completed: 0, total: 0, items: [] };
    }
    const stats = state.projects.map((project) => ({ project, stats: projectStats(project) }));
    const pct = Math.round(stats.reduce((sum, item) => sum + item.stats.pct, 0) / stats.length);
    return {
      pct,
      active: stats.filter((item) => item.stats.pct < 100).length,
      completed: stats.filter((item) => item.stats.allComplete).length,
      total: state.projects.length,
      items: stats
    };
  }

  function eventsForDate(date) {
    return U.sortEvents(data().events.filter((event) => event.date === date));
  }

  function eventsInRange(start, end) {
    return U.sortEvents(data().events.filter((event) => event.date >= start && event.date <= end));
  }

  function weekEventStats(baseISO) {
    const dates = U.weekDates(baseISO || U.todayISO());
    return {
      dates,
      items: dates.map((date) => {
        const events = eventsForDate(date);
        return {
          date,
          total: events.length,
          done: events.filter((event) => event.done).length,
          events
        };
      })
    };
  }

  function habitCurrentStreak(habit, baseISO) {
    const base = baseISO || U.todayISO();
    let cursor = habit.history[base] ? base : U.addDays(base, -1);
    let streak = 0;
    while (habit.history[cursor] && streak < 3660) {
      streak += 1;
      cursor = U.addDays(cursor, -1);
    }
    return streak;
  }

  function habitBestStreak(habit) {
    const dates = Object.keys(habit.history).filter((date) => habit.history[date]).sort();
    let best = 0;
    let current = 0;
    let previous = "";
    dates.forEach((date) => {
      if (previous && U.diffDays(previous, date) === 1) {
        current += 1;
      } else {
        current = 1;
      }
      best = Math.max(best, current);
      previous = date;
    });
    return best;
  }

  function habitMonthCount(habit, year, month) {
    const total = U.monthDays(year, month);
    let count = 0;
    for (let day = 1; day <= total; day += 1) {
      const iso = `${year}-${U.pad(month + 1)}-${U.pad(day)}`;
      if (habit.history[iso]) count += 1;
    }
    return count;
  }

  function habitOverview() {
    const state = data();
    const today = U.todayISO();
    const doneToday = state.habits.filter((habit) => habit.history[today]).length;
    const totalCheckins = state.habits.reduce((sum, habit) => sum + Object.keys(habit.history).length, 0);
    const best = state.habits.reduce((max, habit) => Math.max(max, habitBestStreak(habit)), 0);
    const current = state.habits.reduce((max, habit) => Math.max(max, habitCurrentStreak(habit)), 0);
    return {
      doneToday,
      totalHabits: state.habits.length,
      totalCheckins,
      bestStreak: best,
      currentStreak: current
    };
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function dailySpark(dateISO) {
    const state = data();
    const date = U.isDateString(dateISO) ? dateISO : U.todayISO();
    const pool = state.sparks
      .filter((spark) => spark.remind && String(spark.content || "").trim())
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (!pool.length) return { spark: null, total: 0, date };
    const index = hashString(date) % pool.length;
    return { spark: pool[index], total: pool.length, date };
  }

  function sparkOverview() {
    const state = data();
    const today = U.todayISO();
    const weekStart = U.addDays(today, -6);
    return {
      total: state.sparks.length,
      reminders: state.sparks.filter((spark) => spark.remind).length,
      weekAdded: state.sparks.filter((spark) => {
        const created = new Date(spark.createdAt);
        if (Number.isNaN(created.getTime())) return false;
        const date = U.toISO(created);
        return date >= weekStart && date <= today;
      }).length
    };
  }

  function eventProject(event) {
    if (!event.projectId) return null;
    const project = YC.store.getProject(event.projectId);
    if (!project) return null;
    const step = project.steps.find((item) => item.id === event.stepId);
    if (!step) return null;
    return { project, step, index: project.steps.indexOf(step) };
  }

  Object.assign(YC.store, {
    stepStats,
    projectStats,
    overallProjectStats,
    eventsForDate,
    eventsInRange,
    weekEventStats,
    habitCurrentStreak,
    habitBestStreak,
    habitMonthCount,
    habitOverview,
    dailySpark,
    sparkOverview,
    eventProject
  });
})();
