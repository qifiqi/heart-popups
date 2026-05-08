const warmMessages = [
  "你已经很棒了，不用等谁批准。",
  "今天的你，也值得被认真喜欢。",
  "慢一点没关系，你在向前走。",
  "愿你抬头有光，低头有花。",
  "你不是麻烦，你是被珍惜的人。",
  "累了就歇一下，宇宙不会催你。",
  "你的存在，本身就很温柔。",
  "请相信，春天正在路上。",
  "所有小小努力，都会有回音。",
  "你值得被坚定地选择。",
  "愿你永远有重新出发的勇气。",
  "别怕，今天也有人偷偷偏爱你。",
  "就算慢半拍，也依然闪闪发光。",
  "你不是孤单一人，我在这边。",
  "每一次坚持，都算数。",
  "愿你心里住着一片柔软海洋。",
  "你可以不完美，但依然可爱。",
  "请把今天，也过成礼物。",
  "风会记得你认真生活的样子。",
  "你眼里的光，真的很好看。",
  "愿你所念，终有回声。",
  "有些答案，会在安静里长出来。",
  "你配得上所有明亮的词语。",
  "请先照顾好自己，再去照亮别人。",
  "你已经做得比想象中更好了。",
  "愿你被世界温柔接住。",
  "偶尔脆弱，也是一种勇敢。",
  "别急，你的好消息正在派送。",
  "把心放软一点，日子会更甜。",
  "你值得拥有松弛又自在的幸福。",
  "今天的云，也在替你说晚安。",
  "总会有人奔向你，带着真心。",
  "请继续发光，不必借谁的灯。",
  "愿你一想起自己，就充满底气。",
  "生活会绕个弯，把惊喜送给你。",
  "你很珍贵，不需要证明。",
  "请相信自己配得上好结局。",
  "你所有的认真，都很动人。",
  "愿你把平凡日子过成星光。",
  "你的温柔，会被世界看见。",
  "别担心，花会沿路盛开。",
  "你熬过的夜，终会换来晨光。",
  "请保留那一点天真和热爱。",
  "你值得一切柔软的拥抱。",
  "即使下雨，心里也能种太阳。",
  "愿你每天都有一点点好运气。",
  "往前走吧，路会慢慢亮起来。",
  "有我替你收集今天的温柔。",
  "你值得所有不慌不忙的爱。",
  "每个认真生活的人，都在发亮。",
  "愿你的心事，最后都变成甜的。",
  "请把自己放在重要的位置。",
  "你不是一个人，你一直被惦记。",
  "愿你所到之处，都有花开。",
  "今天也请对自己温柔一点。",
  "你会被懂得，也会被偏爱。",
  "那些沉默的努力，都在发芽。",
  "好事会来，而且会来的刚刚好。",
  "记得开心，因为你真的很可爱。"
];

const state = {
  timers: [],
  popups: [],
  cycle: 0,
  profile: null
};

const stage = document.getElementById("stage");
const hud = document.getElementById("hud");
const hudToggle = document.getElementById("hud-toggle");
const statusText = document.getElementById("status");
const counter = document.getElementById("counter");
const replayButton = document.getElementById("replay");

function schedule(fn, delay) {
  const timer = window.setTimeout(fn, delay);
  state.timers.push(timer);
  return timer;
}

function clearScheduled() {
  state.timers.forEach((timer) => window.clearTimeout(timer));
  state.timers.length = 0;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isPhoneViewport() {
  return window.innerWidth <= 720 || window.innerHeight <= 760;
}

function syncHudToggle() {
  const collapsed = hud.classList.contains("is-collapsed");
  hudToggle.textContent = collapsed ? "展开" : "缩小";
  hudToggle.setAttribute("aria-expanded", String(!collapsed));
  hudToggle.setAttribute("aria-label", collapsed ? "展开说明面板" : "缩小说明面板");
}

function shouldFloat() {
  return Math.random() < state.profile.floatRatio;
}

function getPerformanceProfile() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const phone = isPhoneViewport();
  const compactViewport = window.innerWidth < 960 || window.innerHeight < 760;

  if (reducedMotion || saveData || cores <= 2 || memory <= 2) {
    return {
      mode: "low",
      label: "省电模式",
      phone,
      heartDivisor: phone ? 130000 : 120000,
      heartMin: phone ? 10 : 12,
      heartMax: phone ? 16 : 18,
      totalDivisor: phone ? 50000 : 42000,
      totalMin: phone ? 24 : 28,
      totalMax: phone ? 34 : 42,
      heartStep: 138,
      explodeStep: 34,
      extraStep: 60,
      spawnDelay: 260,
      heartSparkEvery: 0,
      heartSparkCount: 0,
      centerSparkCount: 8,
      widthMin: phone ? 136 : 150,
      widthMax: phone ? 178 : 196,
      popupHeight: phone ? 112 : 126,
      floatRatio: 0,
      floatScaleMin: 0.92,
      floatScaleMax: 1.02,
      explodeRotate: 14
    };
  }

  if (compactViewport || cores <= 4 || memory <= 4) {
    return {
      mode: "lite",
      label: "流畅模式",
      phone,
      heartDivisor: phone ? 98000 : 88000,
      heartMin: phone ? 14 : 16,
      heartMax: phone ? 22 : 26,
      totalDivisor: phone ? 36000 : 30000,
      totalMin: phone ? 30 : 40,
      totalMax: phone ? 54 : 68,
      heartStep: 116,
      explodeStep: 26,
      extraStep: 46,
      spawnDelay: 240,
      heartSparkEvery: 8,
      heartSparkCount: 3,
      centerSparkCount: 14,
      widthMin: phone ? 146 : 158,
      widthMax: phone ? 188 : 214,
      popupHeight: phone ? 118 : 132,
      floatRatio: phone ? 0.24 : 0.42,
      floatScaleMin: 0.9,
      floatScaleMax: 1.03,
      explodeRotate: 18
    };
  }

  return {
    mode: "high",
    label: "标准模式",
    phone,
    heartDivisor: phone ? 80000 : 70000,
    heartMin: phone ? 18 : 20,
    heartMax: phone ? 28 : 34,
    totalDivisor: phone ? 28000 : 24500,
    totalMin: phone ? 42 : 54,
    totalMax: phone ? 74 : 92,
    heartStep: 96,
    explodeStep: 18,
    extraStep: 38,
    spawnDelay: 220,
    heartSparkEvery: 6,
    heartSparkCount: 4,
    centerSparkCount: 18,
    widthMin: phone ? 154 : 168,
    widthMax: phone ? 196 : 234,
    popupHeight: phone ? 124 : 138,
    floatRatio: phone ? 0.46 : 0.72,
    floatScaleMin: 0.88,
    floatScaleMax: 1.05,
    explodeRotate: 24
  };
}

function applyPerformanceProfile() {
  state.profile = getPerformanceProfile();
  document.body.classList.remove("perf-high", "perf-lite", "perf-low");
  document.body.classList.add(`perf-${state.profile.mode}`);
}

function heartPoint(angle) {
  const x = 16 * Math.pow(Math.sin(angle), 3);
  const y = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
  return { x, y };
}

function getBlockedZones() {
  const nodes = [hud, counter];

  return nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const margin = state.profile.phone ? 12 : 16;
    return {
      left: Math.max(0, rect.left - margin),
      top: Math.max(0, rect.top - margin),
      right: Math.min(window.innerWidth, rect.right + margin),
      bottom: Math.min(window.innerHeight, rect.bottom + margin)
    };
  });
}

function overlapsZone(x, y, width, height, zones) {
  return zones.some((zone) => (
    x < zone.right &&
    x + width > zone.left &&
    y < zone.bottom &&
    y + height > zone.top
  ));
}

function heartTargets(count) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const centerX = width / 2;
  const centerY = state.profile.phone ? height * 0.56 : height * 0.52;
  const scaleFactor = state.profile.mode === "low" ? 0.0158 : state.profile.phone ? 0.0168 : 0.021;
  const scale = Math.min(width, height) * scaleFactor;
  const points = [];

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const point = heartPoint(angle);
    const jitter = state.profile.phone ? 2.5 : 5;
    points.push({
      x: centerX + point.x * scale + randomBetween(-jitter, jitter),
      y: centerY - point.y * scale + randomBetween(-jitter, jitter)
    });
  }

  return points;
}

function safePosition(boxWidth, boxHeight) {
  const margin = state.profile.phone ? 8 : 16;
  const zones = getBlockedZones();

  for (let attempt = 0; attempt < 28; attempt += 1) {
    const x = randomBetween(margin, window.innerWidth - boxWidth - margin);
    const y = randomBetween(margin, window.innerHeight - boxHeight - margin);

    if (!overlapsZone(x, y, boxWidth, boxHeight, zones)) {
      return { x, y };
    }
  }

  return {
    x: randomBetween(margin, Math.max(margin, window.innerWidth - boxWidth - margin)),
    y: randomBetween(window.innerHeight * 0.28, Math.max(window.innerHeight * 0.28, window.innerHeight - boxHeight - margin))
  };
}

function centerPosition(boxWidth, boxHeight) {
  return {
    x: window.innerWidth / 2 - boxWidth / 2,
    y: window.innerHeight / 2 - boxHeight / 2
  };
}

function spawnSparkBurst(centerX, centerY, count) {
  if (count <= 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.textContent = index % 3 === 0 ? "❤" : index % 2 === 0 ? "✦" : "♡";
    spark.style.left = `${centerX}px`;
    spark.style.top = `${centerY}px`;
    const distance = state.profile.mode === "low" ? 110 : state.profile.mode === "lite" ? 150 : 180;
    spark.style.setProperty("--dx", `${randomBetween(-distance, distance)}px`);
    spark.style.setProperty("--dy", `${randomBetween(-distance, distance)}px`);
    spark.style.fontSize = `${randomBetween(0.85, 1.45)}rem`;
    fragment.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
  }

  stage.appendChild(fragment);
}

function destroyAllPopups() {
  clearScheduled();
  stage.querySelectorAll(".popup, .spark").forEach((node) => node.remove());
  state.popups.length = 0;
}

function applyMotion(record, targetX, targetY, scale, rotate) {
  record.x = targetX;
  record.y = targetY;
  record.element.style.setProperty("--x", `${Math.round(targetX)}px`);
  record.element.style.setProperty("--y", `${Math.round(targetY)}px`);
  record.element.style.setProperty("--scale", `${scale}`);
  record.element.style.setProperty("--rotate", `${rotate}deg`);
}

function makePopup(message, index, startAtCenter = true) {
  const popup = document.createElement("article");
  const width = Math.round(randomBetween(state.profile.widthMin, state.profile.widthMax));
  const height = state.profile.popupHeight;

  popup.className = "popup";
  popup.style.setProperty("--w", `${width}px`);
  popup.style.setProperty("--h", `${height}px`);
  popup.style.setProperty("--delay", `${randomBetween(0, 2.8)}s`);
  popup.innerHTML = `
    <header class="popup-header">
      <div class="window-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="window-tag">Warm Note ${String(index + 1).padStart(2, "0")}</div>
    </header>
    <div class="popup-body">
      <p class="popup-message">${message}</p>
      <p class="popup-sign">给今天的你</p>
    </div>
  `;

  stage.appendChild(popup);

  const start = startAtCenter ? centerPosition(width, height) : safePosition(width, height);
  popup.style.setProperty("--x", `${Math.round(start.x)}px`);
  popup.style.setProperty("--y", `${Math.round(start.y)}px`);

  const record = {
    element: popup,
    width,
    height,
    x: start.x,
    y: start.y
  };

  requestAnimationFrame(() => popup.classList.add("is-visible"));
  state.popups.push(record);
  return record;
}

function buildHeartPhase(cycle) {
  const area = window.innerWidth * window.innerHeight;
  const heartCount = clamp(
    Math.round(area / state.profile.heartDivisor),
    state.profile.heartMin,
    state.profile.heartMax
  );
  const targets = heartTargets(heartCount);

  statusText.textContent = "正在拼爱心...";
  counter.textContent = `爱心弹窗就位中 · ${heartCount} 句 · ${state.profile.label}`;

  targets.forEach((target, index) => {
    schedule(() => {
      if (cycle !== state.cycle) {
        return;
      }

      const message = warmMessages[index % warmMessages.length];
      const record = makePopup(message, index);
      record.element.classList.add("is-heart");
      applyMotion(
        record,
        target.x - record.width / 2,
        target.y - record.height / 2,
        1,
        randomBetween(-7, 7)
      );

      if (state.profile.heartSparkEvery > 0 && index % state.profile.heartSparkEvery === 0) {
        spawnSparkBurst(target.x, target.y, state.profile.heartSparkCount);
      }

      if (index === targets.length - 1) {
        schedule(() => explodePhase(cycle), 1450);
      }
    }, index * state.profile.heartStep);
  });
}

function explodePhase(cycle) {
  if (cycle !== state.cycle) {
    return;
  }

  statusText.textContent = "炸开啦，整屏都是偏爱...";
  const area = window.innerWidth * window.innerHeight;
  const totalCount = clamp(
    Math.round(area / state.profile.totalDivisor),
    state.profile.totalMin,
    state.profile.totalMax
  );
  counter.textContent = `满屏暖心话 · ${totalCount} 个弹窗 · ${state.profile.label}`;

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  spawnSparkBurst(centerX, centerY, state.profile.centerSparkCount);

  state.popups.forEach((record, index) => {
    schedule(() => {
      if (cycle !== state.cycle) {
        return;
      }

      const target = safePosition(record.width, record.height);
      record.element.classList.remove("is-heart");
      record.element.classList.add("is-exploded");
      if (shouldFloat()) {
        record.element.classList.add("floating");
      }
      applyMotion(
        record,
        target.x,
        target.y,
        randomBetween(state.profile.floatScaleMin, state.profile.floatScaleMax),
        randomBetween(-state.profile.explodeRotate, state.profile.explodeRotate)
      );
    }, index * state.profile.explodeStep);
  });

  const extrasNeeded = Math.max(0, totalCount - state.popups.length);
  for (let index = 0; index < extrasNeeded; index += 1) {
    schedule(() => {
      if (cycle !== state.cycle) {
        return;
      }

      const messageIndex = (state.popups.length + index) % warmMessages.length;
      const record = makePopup(warmMessages[messageIndex], state.popups.length + index);
      record.element.classList.add("is-exploded");
      const target = safePosition(record.width, record.height);
      applyMotion(record, record.x, record.y, 0.22, randomBetween(-24, 24));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (shouldFloat()) {
            record.element.classList.add("floating");
          }
          applyMotion(
            record,
            target.x,
            target.y,
            randomBetween(state.profile.floatScaleMin, state.profile.floatScaleMax),
            randomBetween(-state.profile.explodeRotate, state.profile.explodeRotate)
          );
        });
      });
    }, state.profile.spawnDelay + index * state.profile.extraStep);
  }

  schedule(() => {
    if (cycle === state.cycle) {
      statusText.textContent = "爱意已铺满屏幕";
    }
  }, Math.min(2200 + extrasNeeded * state.profile.extraStep, 5200));
}

function runShow() {
  state.cycle += 1;
  applyPerformanceProfile();
  destroyAllPopups();
  statusText.textContent = "正在酝酿心意...";
  counter.textContent = `准备中 · ${state.profile.label}`;
  buildHeartPhase(state.cycle);
}

hudToggle.addEventListener("click", () => {
  hud.classList.toggle("is-collapsed");
  syncHudToggle();
});

replayButton.addEventListener("click", runShow);

let resizeTimer = 0;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(runShow, 220);
});

syncHudToggle();
runShow();
