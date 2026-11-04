(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const S = YC.store;

  function handle(action, element) {
    switch (action) {
      case "add-spark":
        YC.modals.sparkModal();
        return true;
      case "open-spark":
      case "edit-spark":
        YC.modals.sparkModal(element.dataset.id);
        return true;
      case "toggle-spark-remind": {
        const spark = S.getSpark(element.dataset.id);
        if (!spark) return true;
        const next = S.toggleSparkRemind(spark.id);
        YC.ui.toast(next && next.remind ? "已加入每日抽取" : "已取消每日提醒", { type: "info" });
        return true;
      }
      case "delete-spark": {
        const spark = S.getSpark(element.dataset.id);
        if (!spark) return true;
        YC.ui.confirm({
          title: "删除这条闪念？",
          message: "删除后无法撤销；如果它正在每日提醒中，也会从抽取池移除。",
          confirmLabel: "删除闪念",
          onConfirm: () => {
            YC.ui.closeAll();
            S.deleteSpark(spark.id);
            YC.ui.toast("闪念已删除");
          }
        });
        return true;
      }
      case "set-spark-filter":
        YC.app.ui.sparkFilter = element.dataset.filter || "all";
        YC.app.render();
        return true;
      case "toggle-spark-remind-filter":
        YC.app.ui.sparkRemindOnly = !YC.app.ui.sparkRemindOnly;
        YC.app.render();
        return true;
      case "reset-spark-filter":
        YC.app.ui.sparkFilter = "all";
        YC.app.ui.sparkRemindOnly = false;
        YC.app.render();
        return true;
      default:
        return false;
    }
  }

  function submit(form, fd) {
    try {
      const id = String(fd.get("id") || "");
      const content = String(fd.get("content") || "").trim();
      const type = String(fd.get("type") || "note");
      const remind = fd.get("remind") === "on";
      if (!content) throw new Error("请写下一条闪念");
      if (id) {
        S.updateSpark(id, { content, type, remind });
      } else {
        S.addSpark(content, type, remind);
      }
      YC.ui.closeAll();
      YC.ui.toast(remind ? "闪念已保存，并加入每日抽取" : "闪念已保存");
    } catch (error) {
      YC.app.showFormError(form, error.message || "保存失败，请检查输入");
    }
  }

  YC.sparkActions = { handle, submit };
})();
