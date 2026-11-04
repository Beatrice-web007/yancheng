(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;

  function icon(name, className) {
    return `<svg class="icon${className ? ` ${className}` : ""}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  const modalRoot = () => document.getElementById("modal-root");
  const stack = [];
  let lastFocused = null;

  function modalHTML(config) {
    const head = `
      <div class="modal-head">
        <div>
          ${config.kicker ? `<div class="modal-kicker">${config.kicker}</div>` : ""}
          <h2 class="modal-title" id="modal-title">${config.title || ""}</h2>
          ${config.sub ? `<p class="modal-sub">${config.sub}</p>` : ""}
        </div>
        <button class="icon-btn modal-close" type="button" data-action="close-modal" aria-label="关闭">
          ${icon("x")}
        </button>
      </div>`;
    const footer = config.footer
      ? `<div class="modal-foot">${config.footer}</div>`
      : "";
    return `
      <div class="modal-layer" data-modal-layer>
        <div class="modal-backdrop" ${config.dismissible === false ? "" : 'data-action="close-modal"'} aria-hidden="true"></div>
        <section class="modal${config.wide ? " modal--wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          ${head}
          <div class="modal-body">${config.body || ""}</div>
          ${footer}
        </section>
      </div>`;
  }

  function focusFirst() {
    const root = modalRoot();
    if (!root) return;
    const target = root.querySelector("[data-autofocus]") ||
      root.querySelector(".modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea") ||
      root.querySelector(".modal-foot .btn--primary, .modal-foot .btn--danger") ||
      root.querySelector(".modal-close");
    if (target) {
      window.requestAnimationFrame(() => {
        try { target.focus({ preventScroll: true }); } catch (error) { target.focus(); }
      });
    }
  }

  function render(shouldFocus) {
    const root = modalRoot();
    if (!root) return;
    const current = stack[stack.length - 1];
    if (!current) {
      root.innerHTML = "";
      document.body.classList.remove("modal-open");
      if (lastFocused && typeof lastFocused.focus === "function") {
        try { lastFocused.focus({ preventScroll: true }); } catch (error) { lastFocused.focus(); }
      }
      lastFocused = null;
      return;
    }
    const previousBody = root.querySelector(".modal-body");
    const scrollTop = previousBody ? previousBody.scrollTop : 0;
    root.innerHTML = modalHTML(current);
    document.body.classList.add("modal-open");
    const nextBody = root.querySelector(".modal-body");
    if (nextBody && scrollTop) nextBody.scrollTop = scrollTop;
    if (shouldFocus !== false) focusFirst();
  }

  function openModal(config) {
    if (!stack.length) lastFocused = document.activeElement;
    stack.push(config);
    render();
  }

  function closeTop() {
    if (!stack.length) return;
    stack.pop();
    render();
  }

  function closeAll() {
    stack.length = 0;
    render();
  }

  function refreshModal() {
    if (!stack.length) return;
    render();
  }

  function currentModal() {
    return stack[stack.length - 1] || null;
  }

  function confirmAction() {
    const current = currentModal();
    if (!current || typeof current.onConfirm !== "function") return;
    const action = current.onConfirm;
    closeTop();
    action();
  }

  function confirm(options) {
    const opts = options || {};
    const danger = opts.danger !== false;
    openModal({
      kicker: opts.kicker || "请确认",
      title: U.esc(opts.title || "确认操作"),
      body: `
        <div class="confirm-copy">
          <span class="confirm-icon">${icon(danger ? "alert" : "spark")}</span>
          <p>${U.esc(opts.message || "")}</p>
        </div>`,
      footer: `
        <button class="btn btn--ghost" type="button" data-action="close-modal">取消</button>
        <button class="btn ${danger ? "btn--danger" : "btn--primary"}" type="button" data-action="modal-confirm">
          ${U.esc(opts.confirmLabel || "确认")}
        </button>`,
      onConfirm: opts.onConfirm,
      dismissible: true
    });
  }

  function toast(message, options) {
    const opts = options || {};
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast";
    const type = opts.type || "success";
    const iconName = type === "error" ? "alert" : type === "info" ? "spark" : "check";
    el.innerHTML = `${icon(iconName)}<span></span>`;
    el.querySelector("span").textContent = message;
    root.appendChild(el);
    const timeout = Number(opts.duration) || 2600;
    window.setTimeout(() => {
      el.classList.add("is-leaving");
      window.setTimeout(() => el.remove(), 220);
    }, timeout);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
        .then(() => true)
        .catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      area.style.top = "0";
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, area.value.length);
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (error) {
      return false;
    }
  }

  function downloadText(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (error) {
      return false;
    }
  }

  document.addEventListener("keydown", (event) => {
    if (!stack.length) return;
    const current = currentModal();
    if (event.key === "Escape") {
      if (current && current.dismissible === false) return;
      event.preventDefault();
      closeTop();
      return;
    }
    if (event.key !== "Tab") return;
    const root = modalRoot();
    const layer = root && root.querySelector(".modal");
    if (!layer) return;
    const focusable = Array.from(layer.querySelectorAll(
      'button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  YC.ui = {
    icon,
    openModal,
    closeTop,
    closeAll,
    refreshModal,
    currentModal,
    confirm,
    confirmAction,
    toast,
    copyText,
    downloadText
  };
})();
