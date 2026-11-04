(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const C = YC.components;
  const icon = YC.ui.icon;

  function localISO(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? U.todayISO() : U.toISO(date);
  }

  function typePill(spark) {
    const type = U.sparkType(spark.type);
    return `<span class="spark-type spark-type--${U.esc(type.key)}">${U.esc(type.label)}</span>`;
  }

  function filterButton(key, label, active) {
    return `
      <button class="spark-filter${active ? " is-active" : ""}" type="button"
              data-action="set-spark-filter" data-filter="${U.esc(key)}"
              aria-pressed="${active ? "true" : "false"}">${U.esc(label)}</button>`;
  }

  function sparkCard(spark, dailyId) {
    const isDaily = spark.id === dailyId;
    const created = localISO(spark.createdAt);
    return `
      <article class="spark-card${isDaily ? " is-daily" : ""}" data-spark-id="${U.esc(spark.id)}">
        <div class="spark-card-head">
          ${typePill(spark)}
          ${isDaily ? `<span class="spark-daily-badge">${icon("spark")}今日抽取</span>` : ""}
          <span class="spark-date">${U.esc(U.dateCompact(created))}</span>
        </div>
        <p class="spark-content">${U.esc(spark.content)}</p>
        <div class="spark-card-foot">
          <button class="spark-remind-toggle${spark.remind ? " is-on" : ""}" type="button"
                  data-action="toggle-spark-remind" data-id="${U.esc(spark.id)}"
                  aria-pressed="${spark.remind ? "true" : "false"}"
                  aria-label="${spark.remind ? "取消每日提醒" : "设为每日提醒"}：${U.esc(spark.content.slice(0, 40))}">
            ${icon("bell")}<span>${spark.remind ? "每日提醒" : "设为提醒"}</span>
          </button>
          <div class="spark-actions">
            <button class="icon-btn icon-btn--small" type="button" data-action="edit-spark" data-id="${U.esc(spark.id)}" aria-label="编辑闪念：${U.esc(spark.content.slice(0, 40))}">${icon("edit")}</button>
            <button class="icon-btn icon-btn--small icon-btn--danger" type="button" data-action="delete-spark" data-id="${U.esc(spark.id)}" aria-label="删除闪念：${U.esc(spark.content.slice(0, 40))}">${icon("trash")}</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const data = S.getState();
    const today = U.todayISO();
    const overview = S.sparkOverview();
    const daily = S.dailySpark(today);
    const filter = YC.app.ui.sparkFilter || "all";
    const onlyRemind = Boolean(YC.app.ui.sparkRemindOnly);
    const sorted = data.sparks.slice().sort((a, b) => {
      const dateCompare = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      return dateCompare !== 0 ? dateCompare : String(a.id).localeCompare(String(b.id));
    });
    const filtered = sorted.filter((spark) => {
      if (filter !== "all" && spark.type !== filter) return false;
      if (onlyRemind && !spark.remind) return false;
      return true;
    });
    const typeButtons = [
      filterButton("all", "全部", filter === "all"),
      ...U.SPARK_TYPES.map((type) => filterButton(type.key, type.label, filter === type.key))
    ].join("");
    const cards = filtered.map((spark) => sparkCard(spark, daily.spark && daily.spark.id)).join("");

    return `
      <header class="view-head">
        <div class="view-head-copy">
          <div class="eyebrow">FLASH NOTES · ${U.numericDate(today)}</div>
          <h1 class="view-title">闪念</h1>
          <p class="view-sub">记下经验、灵感、解法，或此刻的心情。勾选「每日提醒」的条目，会每天随机出现在「今天」标题右侧。</p>
        </div>
        <div class="view-actions">
          <button class="btn btn--primary" type="button" data-action="add-spark">${icon("plus")}记录闪念</button>
        </div>
      </header>

      <section class="spark-stats" aria-label="闪念概览">
        <div class="spark-stat"><strong>${overview.total}</strong><span>全部记录</span></div>
        <div class="spark-stat"><strong>${overview.reminders}</strong><span>每日提醒中</span></div>
        <div class="spark-stat"><strong>${overview.weekAdded}</strong><span>近 7 天新增</span></div>
      </section>

      <div class="spark-toolbar">
        <div class="spark-filters" role="group" aria-label="按类型筛选">${typeButtons}</div>
        <button class="spark-remind-filter${onlyRemind ? " is-active" : ""}" type="button"
                data-action="toggle-spark-remind-filter" aria-pressed="${onlyRemind ? "true" : "false"}">
          ${icon("bell")}只看提醒 <span>${overview.reminders}</span>
        </button>
      </div>

      ${filtered.length
        ? `<div class="spark-grid">${cards}</div>`
        : `<div class="schedule-empty">${C.emptyState({
            icon: "spark",
            title: data.sparks.length ? "当前筛选没有内容" : "还没有闪念",
            text: data.sparks.length
              ? "换一个类型，或关闭「只看提醒」。"
              : "先把一条经验或灵感写下来。它可以在明天提醒你一次。",
            action: data.sparks.length
              ? `<button class="btn btn--secondary btn--small" type="button" data-action="reset-spark-filter">清除筛选</button>`
              : `<button class="btn btn--primary btn--small" type="button" data-action="add-spark">${icon("plus")}记录第一条闪念</button>`
          })}</div>`}`;
  }

  YC.views = YC.views || {};
  YC.views.sparks = { render };
})();
