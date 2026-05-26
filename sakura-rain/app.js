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
    swaySpeed: random(0.45, 1.1),
    phase: random(0, Math.PI * 2),
    vx: burst ? random(-90, 90) : random(-18, 18),
    vy: burst ? random(-120, -20) : random(26, reduceMotion ? 54 : 94),
    drift: random(8, 34),
    tint: random(0, 1)
  };
}

function makeMote(initial = false) {
  return {
    x: random(0, state.width),
    y: initial ? random(0, state.height) : random(-40, -8),
    radius: random(0.8, 2.6),
    alpha: random(0.2, 0.9),
    speed: random(10, 42),
    phase: random(0, Math.PI * 2),
    twinkle: random(0.8, 2.4)
  };
}

function resetScene() {
  const profile = viewportProfile();
  state.streaks = Array.from({ length: profile.streakCount }, () => makeStreak(true));
  state.petals = Array.from({ length: profile.petalCount }, () => makePetal(true));
  state.motes = Array.from({ length: profile.moteCount }, () => makeMote(true));
}

function resizeScene() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  resizeCanvas(streakCanvas, streakCtx);
  resizeCanvas(petalsCanvas, petalsCtx);
  resetScene();
}

function drawStreak(streak, time) {
  const swayX = Math.sin(time * 0.00035 + streak.phase) * streak.sway;
  const x = streak.x + swayX;
  const headY = streak.y;
  const tailY = streak.y - streak.length;
  const glowAlpha = streak.alpha * 0.9;

  const gradient = streakCtx.createLinearGradient(x, tailY, x, headY);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(0.3, `rgba(255, 231, 239, ${glowAlpha * 0.28})`);
  gradient.addColorStop(0.72, `rgba(255, 208, 226, ${glowAlpha})`);
  gradient.addColorStop(1, `rgba(255, 247, 251, ${Math.min(1, glowAlpha + 0.18)})`);

  streakCtx.beginPath();
  streakCtx.strokeStyle = gradient;
  streakCtx.lineWidth = streak.width;
  streakCtx.moveTo(x, tailY);
  streakCtx.lineTo(x, headY);
  streakCtx.stroke();

  streakCtx.beginPath();
  streakCtx.fillStyle = `rgba(255, 247, 250, ${Math.min(1, glowAlpha + 0.22)})`;
  streakCtx.arc(x, headY, streak.width * 1.8, 0, Math.PI * 2);
  streakCtx.fill();

  if (Math.random() < streak.sparkle * 0.05) {
    const beadY = tailY + streak.length * random(0.15, 0.9);
    streakCtx.beginPath();
    streakCtx.fillStyle = `rgba(255, 243, 247, ${glowAlpha * 0.7})`;
    streakCtx.arc(x, beadY, streak.width * random(1, 1.8), 0, Math.PI * 2);
    streakCtx.fill();
  }
}

function drawPetal(petal) {
  petalsCtx.save();
  petalsCtx.translate(petal.x, petal.y);
  petalsCtx.rotate(petal.rotation);
  petalsCtx.scale(1, 0.82);
  petalsCtx.globalAlpha = petal.alpha;

  const gradient = petalsCtx.createLinearGradient(0, -petal.size, 0, petal.size);
  gradient.addColorStop(0, petal.tint > 0.5 ? "rgba(255, 252, 253, 0.98)" : "rgba(255, 243, 247, 0.98)");
  gradient.addColorStop(0.45, petal.tint > 0.5 ? "rgba(255, 194, 216, 0.96)" : "rgba(255, 205, 221, 0.96)");
  gradient.addColorStop(1, "rgba(255, 140, 176, 0.9)");

  petalsCtx.fillStyle = gradient;
  petalsCtx.beginPath();
  petalsCtx.moveTo(0, -petal.size * 0.62);
  petalsCtx.bezierCurveTo(
    petal.size * 0.88,
    -petal.size * 0.44,
    petal.size * 0.92,
    petal.size * 0.18,
    0,
    petal.size * 0.86
  );
  petalsCtx.bezierCurveTo(
    -petal.size * 0.84,
    petal.size * 0.2,
    -petal.size * 0.82,
    -petal.size * 0.42,
    0,
    -petal.size * 0.62
  );
  petalsCtx.fill();

  petalsCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  petalsCtx.lineWidth = Math.max(0.8, petal.size * 0.06);
  petalsCtx.beginPath();
  petalsCtx.moveTo(0, -petal.size * 0.38);
  petalsCtx.quadraticCurveTo(petal.size * 0.1, 0, 0, petal.size * 0.54);
  petalsCtx.stroke();
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
