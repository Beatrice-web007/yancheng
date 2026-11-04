(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});

  const WEEKDAYS_SHORT = ["一", "二", "三", "四", "五", "六", "日"];
  const WEEKDAYS_FULL = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const PROJECT_COLORS = ["#3F7256", "#A06A2A", "#4F6F8F", "#8B5A6B", "#5E7C68", "#A65B45"];
  const HABIT_COLORS = ["#3F7256", "#A06A2A", "#4F6F8F", "#8B5A6B", "#5E7C68", "#A65B45"];
  const SPARK_TYPES = [
    { key: "experience", label: "经验" },
    { key: "idea", label: "灵感" },
    { key: "mood", label: "心情" },
    { key: "note", label: "随记" }
  ];

  const pad = (n) => String(n).padStart(2, "0");

  function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseISO(iso) {
    const parts = String(iso || "").slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return new Date(NaN);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function todayISO() {
    return toISO(new Date());
  }

  function addDays(iso, amount) {
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) return iso;
    date.setDate(date.getDate() + amount);
    return toISO(date);
  }

  function diffDays(fromISO, toISOValue) {
    const a = parseISO(fromISO);
    const b = parseISO(toISOValue);
    return Math.round((b - a) / 86400000);
  }

  function weekdayIndex(iso) {
    const day = parseISO(iso).getDay();
    return (day + 6) % 7;
  }

  function startOfWeek(iso) {
    return addDays(iso, -weekdayIndex(iso));
  }

  function endOfWeek(iso) {
    return addDays(startOfWeek(iso), 6);
  }

  function weekDates(iso) {
    const start = startOfWeek(iso);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }

  function monthKey(iso) {
    return String(iso).slice(0, 7);
  }

  function monthDays(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function monthGrid(year, month) {
    const first = `${year}-${pad(month + 1)}-01`;
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }

  function monthLabel(year, month) {
    return `${year} 年 ${month + 1} 月`;
  }

  function numericDate(iso) {
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.getFullYear()} / ${pad(date.getMonth() + 1)} / ${pad(date.getDate())}`;
  }

  function dateCN(iso) {
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  }

  function dateLongCN(iso) {
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${weekdayFull(iso)}`;
  }

  function dateDots(iso) {
    return String(iso || "").replace(/-/g, ".");
  }

  function dateCompact(iso) {
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.getMonth() + 1}.${pad(date.getDate())}`;
  }

  function weekdayFull(iso) {
    return WEEKDAYS_FULL[weekdayIndex(iso)] || "";
  }

  function weekdayShort(iso) {
    return WEEKDAYS_SHORT[weekdayIndex(iso)] || "";
  }

  function isWeekend(iso) {
    return weekdayIndex(iso) >= 5;
  }

  function relativeDay(iso, baseISO) {
    const base = baseISO || todayISO();
    const delta = diffDays(base, iso);
    if (delta === 0) return "今天";
    if (delta === 1) return "明天";
    if (delta === -1) return "昨天";
    if (delta > 1 && delta < 7) return weekdayFull(iso);
    if (delta < -1 && delta > -7) return weekdayFull(iso);
    return dateCN(iso);
  }

  function rangeLabel(start, end) {
    if (!start && !end) return "未设日期";
    if (start && !end) return `${dateDots(start)} 起`;
    if (!start && end) return `至 ${dateDots(end)}`;
    if (start === end) return dateDots(start);
    return `${dateDots(start)} – ${dateDots(end)}`;
  }

  function timeRange(start, end) {
    if (start && end) return `${start}–${end}`;
    if (start) return start;
    if (end) return `至 ${end}`;
    return "未定时间";
  }

  function timeSortValue(start) {
    if (!start || !/^\d{2}:\d{2}$/.test(start)) return "99:99";
    return start;
  }

  function minutesOf(time) {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return char;
      }
    });
  }

  function uid(prefix) {
    const head = prefix || "id";
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${head}-${window.crypto.randomUUID()}`;
    }
    return `${head}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function percent(done, total) {
    if (!total) return 0;
    return clamp(Math.round((done / total) * 100), 0, 100);
  }

  function safeColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : (fallback || PROJECT_COLORS[0]);
  }

  function sortEvents(events) {
    return events.slice().sort((a, b) => {
      const dateCompare = String(a.date).localeCompare(String(b.date));
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = timeSortValue(a.start).localeCompare(timeSortValue(b.start));
      if (timeCompare !== 0) return timeCompare;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
  }

  function groupBy(items, keyFn) {
    return items.reduce((acc, item) => {
      const key = keyFn(item);
      (acc[key] || (acc[key] = [])).push(item);
      return acc;
    }, {});
  }

  function escapeAttr(value) {
    return esc(value);
  }

  function isDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }

  function isTimeString(value) {
    return !value || /^\d{2}:\d{2}$/.test(String(value));
  }

  function formatCount(n, unit) {
    return `${n}${unit || ""}`;
  }

  function sparkType(key) {
    return SPARK_TYPES.find((type) => type.key === key) || SPARK_TYPES[SPARK_TYPES.length - 1];
  }

  function sparkTypeLabel(key) {
    return sparkType(key).label;
  }

  YC.utils = {
    WEEKDAYS_SHORT,
    WEEKDAYS_FULL,
    PROJECT_COLORS,
    HABIT_COLORS,
    SPARK_TYPES,
    sparkType,
    sparkTypeLabel,
    pad,
    toISO,
    parseISO,
    todayISO,
    addDays,
    diffDays,
    weekdayIndex,
    startOfWeek,
    endOfWeek,
    weekDates,
    monthKey,
    monthDays,
    monthGrid,
    monthLabel,
    numericDate,
    dateCN,
    dateLongCN,
    dateDots,
    dateCompact,
    weekdayFull,
    weekdayShort,
    isWeekend,
    relativeDay,
    rangeLabel,
    timeRange,
    timeSortValue,
    minutesOf,
    esc,
    uid,
    clamp,
    percent,
    safeColor,
    sortEvents,
    groupBy,
    isDateString,
    isTimeString,
    formatCount
  };
})();
