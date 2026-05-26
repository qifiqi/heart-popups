const streakCanvas = document.getElementById("streaks-layer");
const petalsCanvas = document.getElementById("petals-layer");

const streakCtx = streakCanvas.getContext("2d");
const petalsCtx = petalsCanvas.getContext("2d");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  dpr: Math.min(window.devicePixelRatio || 1, 2),
  width: window.innerWidth,
  height: window.innerHeight,
  streaks: [],
  petals: [],
  motes: [],
  frameId: 0,
  lastTime: 0
};

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function viewportProfile() {
  const small = window.innerWidth <= 720;

  if (reduceMotion) {
    return {
      streakCount: small ? 24 : 34,
      petalCount: small ? 18 : 26,
      moteCount: small ? 18 : 28
    };
  }

  return {
    streakCount: small ? 44 : 74,
    petalCount: small ? 34 : 58,
    moteCount: small ? 34 : 64
  };
}

function resizeCanvas(canvas, ctx) {
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
}

function makeStreak(initial = false) {
  return {
    x: random(0, state.width),
    y: initial ? random(-state.height, state.height) : random(-state.height * 0.45, -24),
    length: random(state.height * 0.18, state.height * 0.88),
    speed: random(80, reduceMotion ? 120 : 220),
    width: random(0.6, 2.4),
    alpha: random(0.18, 0.75),
    sway: random(-12, 12),
    phase: random(0, Math.PI * 2),
    sparkle: random(0.2, 0.9)
  };
}

function makePetal(initial = false, origin = null) {
  const burst = Boolean(origin);
  const small = state.width <= 720;
  const size = random(small ? 8 : 10, small ? 18 : 24);
  const baseX = burst ? origin.x + random(-24, 24) : random(-state.width * 0.08, state.width * 1.08);
  const baseY = burst ? origin.y + random(-20, 20) : initial ? random(-state.height, state.height) : random(-state.height * 0.28, -16);

  return {
    x: baseX,
    y: baseY,
    size,
    alpha: random(0.72, 1),
    rotation: random(0, Math.PI * 2),
    spin: random(-1.2, 1.2),
    sway: random(10, 48),
    swaySpeed: random(0.35, 1.1),
    phase: random(0, Math.PI * 2),
    vx: random(-10, 10),
    vy: random(24, 76),
    drift: random(-18, 18)
  };
}

function makeMote(initial = false) {
  return {
    x: random(0, state.width),
    y: initial ? random(0, state.height) : random(-state.height * 0.3, -16),
    radius: random(0.7, 1.9),
    speed: random(18, reduceMotion ? 40 : 72),
    alpha: random(0.12, 0.42),
    twinkle: random(0.8, 1.8),
    phase: random(0, Math.PI * 2)
  };
}

function populateScene() {
  const profile = viewportProfile();

  state.streaks = Array.from({ length: profile.streakCount }, () => makeStreak(true));
  state.petals = Array.from({ length: profile.petalCount }, () => makePetal(true));
  state.motes = Array.from({ length: profile.moteCount }, () => makeMote(true));
}

function resizeScene() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);

  resizeCanvas(streakCanvas, streakCtx);
  resizeCanvas(petalsCanvas, petalsCtx);

  populateScene();
}

function drawStreak(streak, time) {
  const sway = Math.sin(time * 0.001 * 1.4 + streak.phase) * streak.sway;
  const x = streak.x + sway;
  const y1 = streak.y;
  const y2 = streak.y - streak.length;
  const fade = 0.55 + Math.sin(time * 0.002 + streak.phase) * 0.45;
  const alpha = streak.alpha * fade;

  const gradient = streakCtx.createLinearGradient(x, y2, x, y1);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.25, `rgba(255, 242, 248, ${alpha * 0.35})`);
  gradient.addColorStop(1, `rgba(255, 206, 225, ${alpha})`);

  streakCtx.strokeStyle = gradient;
  streakCtx.lineWidth = streak.width;
  streakCtx.lineCap = "round";
  streakCtx.beginPath();
  streakCtx.moveTo(x, y2);
  streakCtx.lineTo(x, y1);
  streakCtx.stroke();
}

function drawPetal(petal) {
  petalsCtx.save();
  petalsCtx.translate(petal.x, petal.y);
  petalsCtx.rotate(petal.rotation);
  petalsCtx.globalAlpha = petal.alpha;

  petalsCtx.fillStyle = "rgba(255, 230, 239, 0.9)";
  petalsCtx.beginPath();
  petalsCtx.moveTo(0, -petal.size * 0.58);
  petalsCtx.quadraticCurveTo(petal.size * 0.54, -petal.size * 0.5, petal.size * 0.48, 0);
  petalsCtx.quadraticCurveTo(petal.size * 0.34, petal.size * 0.58, 0, petal.size * 0.6);
  petalsCtx.quadraticCurveTo(-petal.size * 0.34, petal.size * 0.58, -petal.size * 0.48, 0);
  petalsCtx.quadraticCurveTo(-petal.size * 0.54, -petal.size * 0.5, 0, -petal.size * 0.58);
  petalsCtx.fill();

  petalsCtx.fillStyle = "rgba(255, 194, 214, 0.32)";
  petalsCtx.beginPath();
  petalsCtx.ellipse(0, -petal.size * 0.08, petal.size * 0.15, petal.size * 0.42, 0, 0, Math.PI * 2);
  petalsCtx.fill();
  petalsCtx.restore();
}

function drawMote(mote, time) {
  const pulse = 0.5 + Math.sin(time * 0.001 * mote.twinkle + mote.phase) * 0.5;
  petalsCtx.beginPath();
  petalsCtx.fillStyle = `rgba(255, 243, 247, ${mote.alpha * (0.35 + pulse * 0.65)})`;
  petalsCtx.arc(mote.x, mote.y, mote.radius + pulse * 0.8, 0, Math.PI * 2);
  petalsCtx.fill();
}

function updateStreaks(dt) {
  for (let index = 0; index < state.streaks.length; index += 1) {
    const streak = state.streaks[index];
    streak.y += streak.speed * dt;

    if (streak.y - streak.length > state.height + 60) {
      state.streaks[index] = makeStreak(false);
    }
  }
}

function updatePetals(dt, time) {
  for (let index = 0; index < state.petals.length; index += 1) {
    const petal = state.petals[index];
    const wave = Math.sin(time * 0.0012 * petal.swaySpeed + petal.phase) * petal.sway;

    petal.rotation += petal.spin * dt;
    petal.x += (petal.vx + wave * 0.35 + petal.drift) * dt;
    petal.y += petal.vy * dt;
    petal.vy += reduceMotion ? 2 * dt : 4.8 * dt;

    if (petal.x > state.width + 48) {
      petal.x = -48;
    }

    if (petal.x < -64) {
      petal.x = state.width + 48;
    }

    if (petal.y > state.height + 48) {
      state.petals[index] = makePetal(false);
    }
  }
}

function updateMotes(dt) {
  for (let index = 0; index < state.motes.length; index += 1) {
    const mote = state.motes[index];
    mote.y += mote.speed * dt;

    if (mote.y > state.height + 12) {
      state.motes[index] = makeMote(false);
    }
  }
}

function render(time) {
  const dt = clamp((time - state.lastTime) / 1000 || 0.016, 0.001, 0.033);
  state.lastTime = time;

  streakCtx.clearRect(0, 0, state.width, state.height);
  petalsCtx.clearRect(0, 0, state.width, state.height);

  updateStreaks(dt);
  updatePetals(dt, time);
  updateMotes(dt);

  streakCtx.globalCompositeOperation = "screen";
  for (const streak of state.streaks) {
    drawStreak(streak, time);
  }

  petalsCtx.globalCompositeOperation = "screen";
  for (const mote of state.motes) {
    drawMote(mote, time);
  }

  petalsCtx.globalCompositeOperation = "source-over";
  for (const petal of state.petals) {
    drawPetal(petal);
  }

  state.frameId = window.requestAnimationFrame(render);
}

function scatterPetals(x, y) {
  const extraCount = reduceMotion ? 8 : 16;

  for (let index = 0; index < extraCount; index += 1) {
    state.petals.push(makePetal(false, { x, y }));
  }

  const limit = viewportProfile().petalCount + extraCount * 2;
  if (state.petals.length > limit) {
    state.petals.splice(0, state.petals.length - limit);
  }
}

window.addEventListener("pointerdown", (event) => {
  scatterPetals(event.clientX, event.clientY);
});

window.addEventListener("resize", resizeScene);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.cancelAnimationFrame(state.frameId);
    state.frameId = 0;
    state.lastTime = 0;
    return;
  }

  if (!state.frameId) {
    state.frameId = window.requestAnimationFrame(render);
  }
});

resizeScene();
state.frameId = window.requestAnimationFrame(render);
