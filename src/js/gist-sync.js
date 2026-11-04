(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;
  const icon = YC.ui.icon;

  const API = "https://api.github.com";
  const FILE_NAME = "yancheng-state.json";
  const CONFIG_KEY = "yancheng.gist.v1";
  const AUTO_INTERVAL = 2 * 60 * 1000;

  const LABELS = {
    idle: "已连接",
    syncing: "同步中…",
    ok: "已同步",
    dirty: "本地有未同步修改",
    offline: "离线，等待网络",
    error: "同步失败",
    conflict: "需要选择保留版本"
  };

  let config = loadConfig();
  let status = { state: connected() ? "idle" : "off", message: "" };
  let syncing = false;
  let pending = false;
  let applyingRemote = false;
  let conflictOpen = false;
  let pendingConflict = null;
  let timer = null;

  function defaults() {
    return { token: "", gistId: "", enabled: true, lastSyncedHash: "", lastSyncAt: "" };
  }

  function loadConfig() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(CONFIG_KEY) || "{}");
      return Object.assign(defaults(), raw, { enabled: raw.enabled !== false });
    } catch (error) {
      return defaults();
    }
  }

  function saveConfig() {
    try {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      YC.ui.toast("同步设置无法保存：浏览器存储不可用", { type: "error" });
    }
  }

  function connected() {
    return Boolean(config.token && config.gistId);
  }

  function autoOn() {
    return connected() && config.enabled;
  }

  function refreshSettingsUI() {
    const current = YC.ui.currentModal && YC.ui.currentModal();
    if (current && current.key === "settings" && YC.app && typeof YC.app.refreshSettings === "function") {
      YC.app.refreshSettings();
    }
  }

  function setStatus(state, message) {
    status = { state, message: message || "" };
    refreshSettingsUI();
  }

  function formatTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function countsOf(state) {
    if (!state) return "0 日程 · 0 打卡 · 0 课题 · 0 闪念";
    return `${state.events ? state.events.length : 0} 日程 · ${state.habits ? state.habits.length : 0} 打卡 · ${state.projects ? state.projects.length : 0} 课题 · ${state.sparks ? state.sparks.length : 0} 闪念`;
  }

  function statusClass() {
    if (!config.enabled && !["syncing", "error", "conflict", "dirty"].includes(status.state)) return "paused";
    return status.state === "off" ? "idle" : status.state;
  }

  function settingsHTML() {
    if (!connected()) {
      return `
        <div class="sync-box">
          <p class="settings-copy">把日程、打卡、课题和闪念同步到 GitHub Gist。创建新 Gist 时，会先上传当前本机数据；连接已有 Gist 时，会以云端数据覆盖本机。</p>
          <div class="field" style="margin-top:12px">
            <label for="gist-token">GitHub Token</label>
            <input class="input" id="gist-token" type="password" autocomplete="off" spellcheck="false" placeholder="ghp_… 或 github_pat_…">
            <p class="field-hint">需要 Gists 读写权限。Classic token 勾选 <code>gist</code>；fine-grained token 在 Account permissions → Gists 选择 Read and write。<a class="text-link" href="https://github.com/settings/tokens/new?scopes=gist&description=YanCheng" target="_blank" rel="noopener">创建 token</a></p>
          </div>
          <div class="field" style="margin-top:12px">
            <label for="gist-id">Gist ID（连接已有 Gist 时填写）</label>
            <input class="input" id="gist-id" type="text" autocomplete="off" spellcheck="false" placeholder="也可以直接粘贴 Gist 链接">
          </div>
          <div class="sync-actions">
            <button class="btn btn--primary btn--small" type="button" data-action="gist-create">${icon("upload")}创建新 Gist 并上传</button>
            <button class="btn btn--secondary btn--small" type="button" data-action="gist-connect">${icon("download")}连接已有 Gist</button>
          </div>
          <div class="sync-inline" id="gist-inline-status" hidden></div>
          <p class="sync-warning">Secret Gist 不会公开列出，但任何拿到链接的人都能读取。不要同步高度敏感内容。Token 只保存在当前浏览器，不会写入 JSON 备份。</p>
        </div>`;
    }

    return `
      <div class="sync-box" id="gist-settings">
        <div class="sync-status-line">
          <span class="sync-dot is-${statusClass()}" aria-hidden="true"></span>
          <strong>${LABELS[status.state] || "已连接"}</strong>
          ${config.lastSyncAt ? `<span class="sync-time">${U.esc(formatTime(config.lastSyncAt))}</span>` : ""}
        </div>
        <p class="settings-copy sync-meta">Gist <code class="gist-id">${U.esc(config.gistId)}</code><button class="sync-copy" type="button" data-action="gist-copy-id" aria-label="复制 Gist ID">${icon("copy")}</button> · ${config.enabled ? "自动同步已开启" : "自动同步已暂停"}</p>
        ${status.message ? `<p class="sync-message">${U.esc(status.message)}</p>` : ""}
        <div class="sync-actions">
          <button class="btn btn--secondary btn--small" type="button" data-action="gist-sync-now">立即同步</button>
          <button class="btn btn--ghost btn--small" type="button" data-action="gist-toggle-auto">${config.enabled ? "暂停自动同步" : "开启自动同步"}</button>
          <button class="btn btn--ghost btn--small" type="button" data-action="gist-push">上传本地覆盖云端</button>
          <button class="btn btn--ghost btn--small" type="button" data-action="gist-pull">从云端恢复</button>
          <button class="btn btn--ghost btn--small sync-disconnect" type="button" data-action="gist-disconnect">断开</button>
        </div>
        <p class="sync-warning">Secret Gist 不公开列出，但拿到链接的人可以读。自动同步开启时，本机的修改会在一小段时间后上传；清空或导入数据也会同步到云端。Token 只保存在当前浏览器。</p>
      </div>`;
  }

  function readToken() {
    const element = document.getElementById("gist-token");
    return element ? element.value.trim() : "";
  }

  function readGistId() {
    const element = document.getElementById("gist-id");
    return element ? normalizeGistId(element.value) : "";
  }

  function normalizeGistId(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    try {
      if (/^https?:\/\//i.test(text)) {
        const url = new URL(text);
        text = url.pathname.split("/").filter(Boolean).pop() || "";
      }
    } catch (error) {
      // Fall through to the plain ID path.
    }
    return text.split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop() || "";
  }

  function setInline(message, isError) {
    const element = document.getElementById("gist-inline-status");
    if (!element) return;
    element.hidden = false;
    element.className = `sync-inline${isError ? " is-error" : ""}`;
    element.textContent = message;
  }

  async function request(path, options) {
    const opts = options || {};
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    const token = opts.token || config.token;
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.body) headers["Content-Type"] = "application/json";
    let response;
    try {
      response = await fetch(`${API}${path}`, {
        method: opts.method || "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store"
      });
    } catch (error) {
      throw new Error("网络请求失败，请检查 GitHub 是否可访问");
    }
    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = body && body.message ? `：${body.message}` : "";
      } catch (error) {
        // Ignore non-JSON error bodies.
      }
      if (response.status === 401) throw new Error("GitHub token 无效");
      if (response.status === 403) throw new Error(`token 权限不足或 GitHub API 限流${detail}`);
      if (response.status === 404) throw new Error("Gist 不存在，或 token 无权访问");
      if (response.status === 422) throw new Error(`GitHub 拒绝了同步请求${detail}`);
      throw new Error(`GitHub 返回 ${response.status}${detail}`);
    }
    return response.json();
  }

  async function hashState(state) {
    const text = JSON.stringify(state);
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function serializeLocal() {
    return S.exportJSON();
  }

  async function createGist(token) {
    return request("/gists", {
      method: "POST",
      token,
      body: {
        description: "研程 · 科研日程同步",
        public: false,
        files: { [FILE_NAME]: { content: serializeLocal() } }
      }
    });
  }

  async function fetchRemote(token, gistId) {
    const gist = await request(`/gists/${encodeURIComponent(gistId)}`, { token });
    const file = gist.files && gist.files[FILE_NAME];
    if (!file) return { exists: false, gist };
    if (file.truncated) throw new Error("云端文件超过 GitHub API 返回上限，暂无法读取");
    let parsed;
    try {
      parsed = JSON.parse(file.content);
    } catch (error) {
      throw new Error("云端同步文件不是有效 JSON");
    }
    const state = parsed && parsed.data ? parsed.data : parsed;
    if (!state || typeof state !== "object") throw new Error("云端同步文件格式无法识别");
    return {
      exists: true,
      gist,
      content: file.content,
      state,
      hash: await hashState(state),
      counts: parsed.counts || null,
      updatedAt: gist.updated_at
    };
  }

  async function pushLocal() {
    const content = serializeLocal();
    const hash = await hashState(S.getState());
    await request(`/gists/${encodeURIComponent(config.gistId)}`, {
      method: "PATCH",
      body: { files: { [FILE_NAME]: { content } } }
    });
    config.lastSyncedHash = hash;
    config.lastSyncAt = new Date().toISOString();
    saveConfig();
    setStatus("ok");
    return true;
  }

  async function applyRemote(remote, manual) {
    applyingRemote = true;
    try {
      S.importJSON(remote.content);
      config.lastSyncedHash = remote.hash;
      config.lastSyncAt = new Date().toISOString();
      saveConfig();
      setStatus("ok");
      if (manual) YC.ui.toast("已从云端恢复");
      return true;
    } finally {
      applyingRemote = false;
    }
  }

  function scheduleSync(delay) {
    if (!autoOn()) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      if (autoOn() && status.state !== "conflict") void syncNow({ automatic: true });
    }, delay);
  }

  async function syncNow(options) {
    const opts = options || {};
    if (!connected()) return false;
    if (syncing) {
      pending = true;
      return false;
    }
    if (!navigator.onLine) {
      setStatus("offline");
      if (opts.manual) YC.ui.toast("当前没有网络", { type: "error" });
      return false;
    }
    if (status.state === "conflict" && !opts.manual) return false;

    syncing = true;
    setStatus("syncing");
    try {
      const remote = await fetchRemote(null, config.gistId);
      if (!remote.exists) {
        await pushLocal();
        if (opts.manual) YC.ui.toast("云端还没有数据，已上传本地");
        return true;
      }
      const localHash = await hashState(S.getState());
      if (remote.hash === localHash) {
        config.lastSyncedHash = localHash;
        config.lastSyncAt = new Date().toISOString();
        saveConfig();
        setStatus("ok");
        if (opts.manual) YC.ui.toast("已是最新");
        return true;
      }
      if (!config.lastSyncedHash) {
        showConflict(remote, localHash);
        return false;
      }
      if (remote.hash === config.lastSyncedHash) {
        await pushLocal();
        if (opts.manual) YC.ui.toast("已上传本地修改");
        return true;
      }
      if (localHash === config.lastSyncedHash) {
        await applyRemote(remote, opts.manual);
        return true;
      }
      showConflict(remote, localHash);
      return false;
    } catch (error) {
      setStatus("error", error.message || "同步失败");
      if (opts.manual) YC.ui.toast(error.message || "同步失败", { type: "error", duration: 4200 });
      return false;
    } finally {
      syncing = false;
      if (pending) {
        pending = false;
        scheduleSync(800);
      }
    }
  }

  function showConflict(remote, localHash) {
    if (conflictOpen) return;
    conflictOpen = true;
    pendingConflict = { remote, localHash };
    setStatus("conflict", "云端和本地都有修改");
    YC.ui.openModal({
      key: "gist-conflict",
      kicker: "SYNC CONFLICT",
      title: "云端和本地都有修改",
      sub: "选择一份数据继续同步。选择后另一份会被覆盖。",
      body: `
        <div class="sync-conflict">
          <div class="sync-conflict-grid">
            <div class="sync-conflict-card">
              <span>云端 Gist</span>
              <strong>${U.esc(countsOf(remote.state))}</strong>
              <small>更新于 ${U.esc(formatTime(remote.updatedAt) || "未知时间")}</small>
            </div>
            <div class="sync-conflict-card">
              <span>本机</span>
              <strong>${U.esc(countsOf(S.getState()))}</strong>
              <small>当前浏览器中的数据</small>
            </div>
          </div>
          <p class="sync-warning">建议先到「数据与备份」导出一份本地 JSON，再选择。</p>
        </div>`,
      footer: `
        <button class="btn btn--ghost" type="button" data-action="gist-conflict-cancel">稍后处理</button>
        <button class="btn btn--secondary" type="button" data-action="gist-conflict-push">${icon("upload")}保留本地</button>
        <button class="btn btn--primary" type="button" data-action="gist-conflict-pull">${icon("download")}使用云端</button>`
    });
  }

  async function createAndConnect(token) {
    setInline("正在创建 Gist…");
    try {
      const gist = await createGist(token);
      const hash = await hashState(S.getState());
      config = { token, gistId: gist.id, enabled: true, lastSyncedHash: hash, lastSyncAt: new Date().toISOString() };
      saveConfig();
      setStatus("ok");
      refreshSettingsUI();
      YC.ui.toast("Gist 已创建并上传");
    } catch (error) {
      setInline(error.message || "创建失败", true);
      YC.ui.toast(error.message || "创建失败", { type: "error", duration: 4200 });
    }
  }

  async function previewConnect(token, gistId) {
    setInline("正在读取云端…");
    try {
      const remote = await fetchRemote(token, gistId);
      if (!remote.exists) {
        setInline("这个 Gist 中没有研程同步文件", true);
        return;
      }
      setInline("");
      const element = document.getElementById("gist-inline-status");
      if (element) element.hidden = true;
      YC.ui.confirm({
        title: "连接已有 Gist？",
        message: `云端有 ${countsOf(remote.state)}。连接后会以云端数据覆盖本机当前数据，建议先导出本机备份。`,
        confirmLabel: "连接并拉取",
        onConfirm: () => {
          void connectAndPull(token, gistId, remote);
        }
      });
    } catch (error) {
      setInline(error.message || "读取失败", true);
      YC.ui.toast(error.message || "读取失败", { type: "error", duration: 4200 });
    }
  }

  async function connectAndPull(token, gistId, remote) {
    applyingRemote = true;
    try {
      S.importJSON(remote.content);
      config = { token, gistId, enabled: true, lastSyncedHash: remote.hash, lastSyncAt: new Date().toISOString() };
      saveConfig();
      setStatus("ok");
      refreshSettingsUI();
      YC.ui.toast("已连接并从云端拉取");
    } catch (error) {
      setInline(error.message || "连接失败", true);
      YC.ui.toast(error.message || "连接失败", { type: "error", duration: 4200 });
    } finally {
      applyingRemote = false;
    }
  }

  async function pushManual() {
    if (!connected()) return;
    setStatus("syncing");
    try {
      await pushLocal();
      YC.ui.toast("已用本地覆盖云端");
    } catch (error) {
      setStatus("error", error.message || "上传失败");
      YC.ui.toast(error.message || "上传失败", { type: "error", duration: 4200 });
    }
  }

  async function pullManual() {
    if (!connected()) return;
    setStatus("syncing");
    try {
      const remote = await fetchRemote(null, config.gistId);
      if (!remote.exists) throw new Error("云端还没有研程同步文件");
      await applyRemote(remote, true);
    } catch (error) {
      setStatus("error", error.message || "下载失败");
      YC.ui.toast(error.message || "下载失败", { type: "error", duration: 4200 });
    }
  }

  function handle(action, element) {
    switch (action) {
      case "gist-create": {
        const token = readToken();
        if (!token) {
          setInline("请先填写 GitHub Token", true);
          return true;
        }
        YC.ui.confirm({
          title: "创建并上传到 Gist？",
          message: "当前全部数据会写入一个新的 Secret Gist。Secret Gist 不公开列出，但拿到链接的人可以读取。继续？",
          confirmLabel: "创建并上传",
          onConfirm: () => { void createAndConnect(token); }
        });
        return true;
      }
      case "gist-connect": {
        const token = readToken();
        const gistId = readGistId();
        if (!token) {
          setInline("请先填写 GitHub Token", true);
          return true;
        }
        if (!gistId) {
          setInline("请填写 Gist ID 或粘贴 Gist 链接", true);
          return true;
        }
        void previewConnect(token, gistId);
        return true;
      }
      case "gist-copy-id":
        if (!config.gistId) return true;
        void YC.ui.copyText(config.gistId).then((ok) => {
          YC.ui.toast(ok ? "Gist ID 已复制" : "无法自动复制，请手动选择 Gist ID", { type: ok ? "success" : "error" });
        });
        return true;
      case "gist-sync-now":
        void syncNow({ manual: true });
        return true;
      case "gist-toggle-auto":
        if (!connected()) return true;
        config.enabled = !config.enabled;
        saveConfig();
        setStatus("idle");
        YC.ui.toast(config.enabled ? "自动同步已开启" : "自动同步已暂停", { type: "info" });
        if (config.enabled) void syncNow({ manual: false });
        return true;
      case "gist-push":
        YC.ui.confirm({
          title: "用本地覆盖云端？",
          message: "其他设备尚未同步的修改会丢失。确定要用当前本机数据覆盖 Gist？",
          confirmLabel: "覆盖云端",
          onConfirm: () => { void pushManual(); }
        });
        return true;
      case "gist-pull":
        YC.ui.confirm({
          title: "从云端恢复？",
          message: "本机尚未同步的修改会丢失。确定要用云端数据覆盖当前本机？",
          confirmLabel: "使用云端",
          onConfirm: () => { void pullManual(); }
        });
        return true;
      case "gist-disconnect":
        YC.ui.confirm({
          title: "断开 GitHub 同步？",
          message: "断开后不再自动同步，云端 Gist 不会被删除。之后可以重新连接。",
          confirmLabel: "断开同步",
          onConfirm: () => {
            config = defaults();
            saveConfig();
            setStatus("off");
            refreshSettingsUI();
            YC.ui.toast("已断开同步，云端 Gist 未删除", { type: "info" });
          }
        });
        return true;
      case "gist-conflict-pull": {
        const conflict = pendingConflict;
        YC.ui.closeTop();
        conflictOpen = false;
        pendingConflict = null;
        if (conflict) void applyRemote(conflict.remote, true);
        return true;
      }
      case "gist-conflict-push":
        YC.ui.closeTop();
        conflictOpen = false;
        pendingConflict = null;
        void pushManual();
        return true;
      case "gist-conflict-cancel":
        YC.ui.closeTop();
        conflictOpen = false;
        setStatus("conflict", "待选择保留版本");
        return true;
      default:
        return false;
    }
  }

  document.addEventListener("yc:ready", () => {
    if (connected() && config.enabled) scheduleSync(800);
  });

  document.addEventListener("yc:change", () => {
    if (applyingRemote || !connected()) return;
    if (!config.enabled) return;
    if (status.state === "conflict") return;
    setStatus("dirty");
    if (syncing) {
      pending = true;
      return;
    }
    scheduleSync(1800);
  });

  window.addEventListener("online", () => {
    if (autoOn()) scheduleSync(500);
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && autoOn()) scheduleSync(400);
  });

  window.setInterval(() => {
    if (!document.hidden && autoOn() && status.state !== "conflict") {
      void syncNow({ automatic: true });
    }
  }, AUTO_INTERVAL);

  YC.gistSync = {
    settingsHTML,
    handle,
    syncNow,
    getConfig: () => ({ token: config.token, gistId: config.gistId, enabled: config.enabled, lastSyncAt: config.lastSyncAt }),
    getStatus: () => ({ state: status.state, message: status.message, connected: connected(), enabled: config.enabled })
  };
})();
