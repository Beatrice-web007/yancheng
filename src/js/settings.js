(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const icon = YC.ui.icon;

  function config(themePref, installPrompt) {
    const data = S.getState();
    const json = S.exportJSON();
    const themeOptions = [
      { value: "auto", label: "跟随系统", iconName: "spark" },
      { value: "light", label: "浅色", iconName: "sun" },
      { value: "dark", label: "深色", iconName: "moon" }
    ].map((option) => `
      <button class="theme-option${themePref === option.value ? " is-active" : ""}" type="button"
              data-action="set-theme" data-theme-value="${option.value}"
              ${themePref === option.value ? "data-autofocus" : ""}>
        ${icon(option.iconName)}${option.label}
      </button>`).join("");
    const storageNote = S.storageOK
      ? "数据默认只保存在当前浏览器；开启 GitHub Gist 同步后，会写入你自己的 Gist。清理浏览器数据前请先导出备份。"
      : "当前浏览器阻止了本地存储，修改可能不会保存。请检查隐私设置后再试。";
    const install = installPrompt
      ? `<button class="btn btn--secondary btn--small" type="button" data-action="install-app">${icon("download")}安装到桌面</button>`
      : "";
    const body = `
      <div class="settings-section">
        <h3 class="settings-title">外观</h3>
        <p class="settings-copy">默认跟随系统。选择明确主题后，应用会记住这个选择。</p>
        <div class="theme-options">${themeOptions}</div>
      </div>

      <div class="settings-section">
        <h3 class="settings-title">数据与备份</h3>
        <p class="settings-copy">${U.esc(storageNote)}</p>
        <p class="settings-copy" style="margin-top:6px">当前：${data.events.length} 条日程 · ${data.habits.length} 个打卡 · ${data.projects.length} 个课题 · ${data.sparks.length} 条闪念</p>
        <div class="backup-actions">
          <button class="btn btn--secondary btn--small" type="button" data-action="export-download">${icon("download")}下载 JSON</button>
          <button class="btn btn--secondary btn--small" type="button" data-action="export-copy">${icon("copy")}复制 JSON</button>
          <label class="btn btn--secondary btn--small" for="import-file">${icon("upload")}导入文件</label>
          <input class="sr-only" id="import-file" type="file" accept=".json,application/json">
          ${install}
        </div>
        <label class="field-label" for="export-preview" style="display:block;margin-top:14px">当前备份内容</label>
        <textarea class="backup-box" id="export-preview" readonly>${U.esc(json)}</textarea>
        <label class="field-label" for="import-text" style="display:block;margin-top:12px">从文本导入</label>
        <textarea class="backup-box import-box" id="import-text" placeholder="粘贴研程导出的 JSON，然后点击下方按钮。"></textarea>
        <div class="backup-actions">
          <button class="btn btn--primary btn--small" type="button" data-action="import-text">${icon("upload")}替换为导入数据</button>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-title">GitHub Gist 同步</h3>
        ${YC.gistSync ? YC.gistSync.settingsHTML() : `<p class="settings-copy">同步模块未加载。</p>`}
      </div>

      <div class="settings-section">
        <h3 class="settings-title">示例与重置</h3>
        <div class="backup-actions">
          <button class="btn btn--secondary btn--small" type="button" data-action="load-demo">${icon("spark")}载入示例数据</button>
        </div>
        <div class="danger-zone">
          <strong>清空全部数据</strong>
          <p>会删除所有日程、打卡、课题和闪念，无法撤销。建议先下载或复制备份。</p>
          <button class="btn btn--danger btn--small" type="button" data-action="reset-data">${icon("trash")}清空全部数据</button>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-title">关于研程</h3>
        <div class="about-block">
          <span class="about-mark">${icon("project")}</span>
          <div><strong>研程</strong><span>v1.2.0 · 本地优先</span></div>
        </div>
        <p class="settings-copy" style="margin-top:10px">把科研拆成今天能做完的事。日程、习惯、课题推进与闪念共享同一份本地数据。</p>
      </div>`;
    return {
      key: "settings",
      kicker: "SETTINGS",
      title: "数据与设置",
      sub: "备份、同步、主题和本地数据",
      body,
      footer: `<button class="btn btn--secondary" type="button" data-action="close-modal">关闭</button>`,
      wide: true
    };
  }

  function confirmImport(text, sourceLabel) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      YC.ui.toast("JSON 解析失败，请检查文件内容", { type: "error" });
      return;
    }
    const raw = parsed && parsed.data ? parsed.data : parsed;
    const counts = raw && typeof raw === "object"
      ? {
          events: Array.isArray(raw.events) ? raw.events.length : 0,
          habits: Array.isArray(raw.habits) ? raw.habits.length : 0,
          projects: Array.isArray(raw.projects) ? raw.projects.length : 0,
          sparks: Array.isArray(raw.sparks) ? raw.sparks.length : 0
        }
      : null;
    YC.ui.confirm({
      kicker: "IMPORT",
      title: "替换当前数据？",
      message: counts
        ? `将导入 ${counts.events} 条日程、${counts.habits} 个打卡、${counts.projects} 个课题、${counts.sparks} 条闪念${sourceLabel ? `（${sourceLabel}）` : ""}。当前数据会被完全替换，建议先导出备份。`
        : "当前数据会被完全替换，建议先导出备份。",
      confirmLabel: "确认导入",
      onConfirm: () => {
        try {
          S.importJSON(text);
          YC.app.ui.selectedDate = U.todayISO();
          YC.app.ui.habitMonth = U.monthKey(U.todayISO());
          YC.ui.closeAll();
          YC.ui.toast("数据已导入");
        } catch (error) {
          YC.ui.toast(error.message || "导入失败", { type: "error" });
        }
      }
    });
  }


  YC.settings = { config, confirmImport };
})();
