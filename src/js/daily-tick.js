(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  let lastDay = U.todayISO();

  function checkDay() {
    const today = U.todayISO();
    if (today === lastDay) return;
    lastDay = today;
    if (YC.app && typeof YC.app.render === "function") {
      YC.app.render();
    }
  }

  window.setInterval(checkDay, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDay();
  });
})();
