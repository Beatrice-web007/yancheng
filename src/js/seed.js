(function () {
  "use strict";

  const YC = (window.YC = window.YC || {});
  const U = YC.utils;
  const S = YC.store;

  function nowISO() {
    return new Date().toISOString();
  }

  function makeSubtask(title, done, date, sourceEventId) {
    return {
      id: U.uid("sub"),
      title,
      done: Boolean(done),
      date: U.isDateString(date) ? date : "",
      sourceEventId: sourceEventId || null,
      createdAt: nowISO()
    };
  }

  function stamp(daysAgo, hour) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour || 10, 0, 0, 0);
    return date.toISOString();
  }

  function demoSparks() {
    return [
      {
        id: "spark-demo-1",
        content: "项目开题时，先把「不做什么」写清楚。边界越明确，后面的实验设计和写作越省力。",
        type: "experience",
        remind: true,
        createdAt: stamp(2, 9),
        updatedAt: stamp(2, 9)
      },
      {
        id: "spark-demo-2",
        content: "写作卡住时，先写图注：每张图到底要说明什么。图注理顺了，段落结构通常就出来了。",
        type: "experience",
        remind: true,
        createdAt: stamp(5, 15),
        updatedAt: stamp(5, 15)
      },
      {
        id: "spark-demo-3",
        content: "把失败实验的参数单独记一张表：模型、数据版本、随机种子、异常现象。下次排查会快很多。",
        type: "idea",
        remind: true,
        createdAt: stamp(9, 20),
        updatedAt: stamp(9, 20)
      },
      {
        id: "spark-demo-4",
        content: "组会前有点焦虑。把要讲的三句话写下来之后，紧张感明显下降。准备本身就是安定感。",
        type: "mood",
        remind: false,
        createdAt: stamp(1, 21),
        updatedAt: stamp(1, 21)
      }
    ];
  }

  function buildSeed() {
    const today = U.todayISO();
    const day = (offset) => U.addDays(today, offset);
    const p1 = S.createProjectRecord("多模态情绪识别", day(-35), "#3F7256", "project-demo-emotion");
    const p2 = S.createProjectRecord("跨被试泛化研究", day(-8), "#4F6F8F", "project-demo-generalization");
    const s1 = p1.steps;
    const s2 = p2.steps;
    const demoRanges = [
      [-80, -60],
      [-55, 8],
      [-8, 20],
      [-12, 25],
      [-2, 18],
      [20, 60],
      [60, 90],
      [90, 150]
    ];
    s1.forEach((step, index) => {
      step.start = day(demoRanges[index][0]);
      step.end = day(demoRanges[index][1]);
    });

    s1[0].subtasks.push(
      makeSubtask("确定研究问题与假设", true, day(-33)),
      makeSubtask("完成核心文献综述", true, day(-27))
    );
    s1[1].subtasks.push(
      makeSubtask("搭建训练与评测管线", true, day(-22)),
      makeSubtask("实现两个 baseline", true, day(-15)),
      Object.assign(makeSubtask("跑 baseline 消融实验", false, today, "event-demo-1"), { id: "sub-demo-1" })
    );
    s1[2].subtasks.push(
      makeSubtask("整理公开数据集清单", true, day(-13)),
      Object.assign(makeSubtask("清洗 EEG 数据", false, day(1), "event-demo-2"), { id: "sub-demo-2" })
    );
    s1[3].subtasks.push(
      Object.assign(makeSubtask("读 3 篇 EEG 融合论文", false, today, "event-demo-3"), { id: "sub-demo-3" }),
      makeSubtask("完成主实验统计分析", false, day(6))
    );
    s1[4].subtasks.push(
      Object.assign(makeSubtask("和导师讨论结果", false, day(2), "event-demo-4"), { id: "sub-demo-4" })
    );
    s1[5].subtasks.push(makeSubtask("搭建论文骨架", false, day(24)));

    s2[0].subtasks.push(
      makeSubtask("确认跨被试实验设定", true, day(-6)),
      makeSubtask("列出 5 篇核心基线", false, day(3))
    );

    const events = [
      {
        id: "event-demo-1",
        title: "跑 baseline 消融实验",
        date: today,
        start: "14:00",
        end: "16:00",
        done: false,
        notes: "关注 batch size 与采样率两组消融。",
        projectId: p1.id,
        stepId: s1[1].id,
        createdAt: nowISO(),
        updatedAt: nowISO()
      },
      {
        id: "event-demo-2",
        title: "清洗 EEG 数据",
        date: day(1),
        start: "10:00",
        end: "11:30",
        done: false,
        notes: "",
        projectId: p1.id,
        stepId: s1[2].id,
        createdAt: nowISO(),
        updatedAt: nowISO()
      },
      {
        id: "event-demo-3",
        title: "读 3 篇 EEG 融合论文",
        date: today,
        start: "09:00",
        end: "10:30",
        done: false,
        notes: "先看方法部分，记录融合层级。",
        projectId: p1.id,
        stepId: s1[3].id,
        createdAt: nowISO(),
        updatedAt: nowISO()
      },
      {
        id: "event-demo-4",
        title: "和导师讨论结果",
        date: day(2),
        start: "15:00",
        end: "16:00",
        done: false,
        notes: "",
        projectId: p1.id,
        stepId: s1[4].id,
        createdAt: nowISO(),
        updatedAt: nowISO()
      },
      {
        id: "event-demo-5",
        title: "组会：汇报本周进展",
        date: today,
        start: "16:30",
        end: "17:30",
        done: true,
        notes: "准备三页进展与两个待讨论问题。",
        projectId: null,
        stepId: null,
        createdAt: nowISO(),
        updatedAt: nowISO()
      },
      {
        id: "event-demo-6",
        title: "预实验复盘",
        date: day(-1),
        start: "20:00",
        end: "21:00",
        done: true,
        notes: "",
        projectId: null,
        stepId: null,
        createdAt: nowISO(),
        updatedAt: nowISO()
      },
      {
        id: "event-demo-7",
        title: "整理投稿目标期刊",
        date: day(4),
        start: "09:30",
        end: "10:30",
        done: false,
        notes: "",
        projectId: null,
        stepId: null,
        createdAt: nowISO(),
        updatedAt: nowISO()
      }
    ];

    const habitHistory = (badDays) => {
      const history = {};
      for (let i = 0; i <= 24; i += 1) {
        if (!badDays.includes(i)) history[day(-i)] = true;
      }
      return history;
    };

    return {
      version: 2,
      updatedAt: nowISO(),
      meta: {
        createdAt: nowISO(),
        isDemo: true,
        demoDismissed: false
      },
      events,
      habits: [
        {
          id: "habit-demo-1",
          name: "读论文 30 分钟",
          color: U.HABIT_COLORS[0],
          createdAt: nowISO(),
          history: habitHistory([3, 6, 9, 14, 16, 21])
        },
        {
          id: "habit-demo-2",
          name: "运动 30 分钟",
          color: U.HABIT_COLORS[1],
          createdAt: nowISO(),
          history: habitHistory([0, 2, 4, 5, 8, 11, 12, 15, 17, 19, 22, 23])
        },
        {
          id: "habit-demo-3",
          name: "23:30 前睡觉",
          color: U.HABIT_COLORS[2],
          createdAt: nowISO(),
          history: habitHistory([0, 1, 3, 4, 7, 8, 10, 13, 15, 18, 20, 23])
        }
      ],
      projects: [p1, p2],
      sparks: demoSparks()
    };
  }


  YC.seed = { build: buildSeed, demoSparks };
})();
