/**
 * Title-screen vista (Part E #1) — a warm, code-drawn painting of the rundown
 * farm at sunrise: a dawn gradient sky, a low glowing sun, drifting clouds,
 * rolling parallax hills, the farmhouse silhouette with a lit window and rising
 * chimney smoke, a couple of trees, and a few birds gliding across. Everything
 * is procedural (project rule: all art is code). One entry point, `drawVista`,
 * repainted every frame with a rising `t` so the sky shimmers and things drift.
 *
 * The companion `drawLogo` paints the "Wildhearth" wordmark in warm gold with a
 * soft dark outline + shadow and a small heart-and-sprout motif — not DOM text.
 */

// ---- small deterministic helpers (no rng import needed — fixed layout) ------

/** A soft rounded cloud: a cluster of overlapping ellipses, warm-lit top. */
function cloud(g: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  g.save();
  g.globalAlpha = alpha;
  // warm underside
  g.fillStyle = "#e9b98a";
  for (const [dx, dy, rx, ry] of [
    [-1.4, 0.25, 1.5, 0.7], [0, 0.15, 2.1, 0.95], [1.5, 0.3, 1.4, 0.68], [0.5, 0.5, 2.4, 0.6],
  ] as const) g.beginPath(), g.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, 7), g.fill();
  // sunlit crown
  g.fillStyle = "#fde6c2";
  for (const [dx, dy, rx, ry] of [
    [-1.2, -0.1, 1.3, 0.7], [0.1, -0.25, 1.9, 0.95], [1.3, -0.05, 1.2, 0.66],
  ] as const) g.beginPath(), g.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, 7), g.fill();
  g.restore();
}

/** A little gliding bird: a soft double-arc "gull" mark. */
function bird(g: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number) {
  g.strokeStyle = "rgba(60,44,30,.7)";
  g.lineWidth = Math.max(1, s * 0.14);
  g.lineCap = "round";
  const wing = s * (0.75 + flap * 0.25);
  g.beginPath();
  g.moveTo(x - s, y + (1 - flap) * s * 0.3);
  g.quadraticCurveTo(x - s * 0.35, y - wing, x, y);
  g.quadraticCurveTo(x + s * 0.35, y - wing, x + s, y + (1 - flap) * s * 0.3);
  g.stroke();
}

/** A rounded rolling hill band filling from `topY` down to the bottom. */
function hill(
  g: CanvasRenderingContext2D, W: number, H: number,
  topY: number, amp: number, phase: number, color: string,
) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, H);
  g.lineTo(0, topY);
  const step = Math.max(24, W / 40);
  for (let x = 0; x <= W; x += step) {
    const y = topY + Math.sin(x / W * Math.PI * 2 + phase) * amp
      + Math.sin(x / W * Math.PI * 5 + phase * 1.7) * amp * 0.35;
    g.lineTo(x, y);
  }
  g.lineTo(W, topY);
  g.lineTo(W, H);
  g.closePath();
  g.fill();
}

/** A cozy farmhouse silhouette (body + gable roof + chimney + lit window). */
function farmhouse(g: CanvasRenderingContext2D, x: number, groundY: number, s: number, t: number) {
  const w = s * 2.4, h = s * 1.4;
  const bx = x - w / 2, by = groundY - h;
  // long cast shadow along the ground (dawn light from the right)
  g.save();
  g.globalAlpha = 0.18;
  g.fillStyle = "#241a10";
  g.beginPath();
  g.moveTo(bx, groundY);
  g.lineTo(bx - w * 0.7, groundY + s * 0.16);
  g.lineTo(bx + w * 0.5, groundY + s * 0.16);
  g.lineTo(bx + w, groundY);
  g.closePath(); g.fill();
  g.restore();
  // body
  g.fillStyle = "#5a4632";
  g.fillRect(bx, by, w, h);
  // roof (gable), a touch darker
  g.fillStyle = "#43301f";
  g.beginPath();
  g.moveTo(bx - w * 0.12, by);
  g.lineTo(x, by - h * 0.62);
  g.lineTo(bx + w * 1.12, by);
  g.closePath(); g.fill();
  // chimney
  g.fillStyle = "#3a2a1b";
  g.fillRect(bx + w * 0.7, by - h * 0.5, w * 0.14, h * 0.5);
  // warm lit window (gently flickering)
  const glow = 0.72 + Math.sin(t * 2.1) * 0.12;
  g.save();
  g.globalAlpha = glow;
  g.fillStyle = "#ffd47a";
  g.fillRect(bx + w * 0.16, by + h * 0.32, w * 0.24, h * 0.4);
  g.fillStyle = "#ffe6ad";
  g.fillRect(bx + w * 0.55, by + h * 0.34, w * 0.2, h * 0.34);
  g.restore();
  // window mullions
  g.strokeStyle = "#3a2a1b"; g.lineWidth = Math.max(1, s * 0.05);
  g.strokeRect(bx + w * 0.16, by + h * 0.32, w * 0.24, h * 0.4);
  // rising chimney smoke
  g.save();
  const smokeX = bx + w * 0.77;
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.35 + i * 0.28) % 1;
    const sy = by - h * 0.5 - p * s * 1.6;
    const sx = smokeX + Math.sin(t * 1.4 + i) * s * 0.18 * p;
    g.globalAlpha = (1 - p) * 0.4;
    g.fillStyle = "#d9cdbe";
    g.beginPath(); g.arc(sx, sy, s * (0.1 + p * 0.22), 0, 7); g.fill();
  }
  g.restore();
}

/** A simple round-canopy tree silhouette. */
function tree(g: CanvasRenderingContext2D, x: number, groundY: number, s: number) {
  g.fillStyle = "#3a2a1b";
  g.fillRect(x - s * 0.1, groundY - s * 0.9, s * 0.2, s * 0.9);
  for (const [dx, dy, r] of [[0, -1.1, 0.62], [-0.5, -0.85, 0.5], [0.5, -0.85, 0.5], [0, -1.5, 0.5]] as const) {
    g.fillStyle = "#33452a";
    g.beginPath(); g.arc(x + dx * s, groundY + dy * s, r * s, 0, 7); g.fill();
  }
  // a warm dawn rim on the sunlit (right) side
  g.fillStyle = "rgba(255,214,140,.35)";
  g.beginPath(); g.arc(x + s * 0.35, groundY - s * 1.25, s * 0.4, 0, 7); g.fill();
}

/**
 * Paint the whole vista into a `W`×`H` box (device-independent px; the caller
 * sets the transform / clears). `t` is seconds since the menu opened.
 */
export function drawVista(g: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // --- dawn sky gradient ---
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#2b2c55");   // deep pre-dawn indigo up top
  sky.addColorStop(0.35, "#7d5580");
  sky.addColorStop(0.6, "#d97a5c");
  sky.addColorStop(0.8, "#f5a860");
  sky.addColorStop(1, "#ffd78a");   // warm gold at the horizon
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const horizon = H * 0.66;

  // --- the low sun + halo, just above the horizon, gently breathing ---
  const sunX = W * 0.72, sunY = horizon - H * 0.06;
  const pulse = 1 + Math.sin(t * 0.8) * 0.04;
  const halo = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.5 * pulse);
  halo.addColorStop(0, "rgba(255,232,180,.85)");
  halo.addColorStop(0.25, "rgba(255,200,130,.4)");
  halo.addColorStop(1, "rgba(255,200,130,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#fff2cf";
  g.beginPath(); g.arc(sunX, sunY, H * 0.055 * pulse, 0, 7); g.fill();

  // --- drifting clouds (wrap around the width) ---
  const cs = H * 0.03;
  const clouds: Array<[number, number, number, number]> = [
    [0.16, 0.2, 1.5, 0.8], [0.5, 0.14, 1.9, 0.7], [0.83, 0.26, 1.3, 0.75], [0.34, 0.32, 1.1, 0.6],
  ];
  for (const [fx, fy, scl, a] of clouds) {
    const x = ((fx * W + t * 8 * scl) % (W + 200)) - 100;
    cloud(g, x, fy * H, cs * scl, a);
  }

  // --- birds gliding across, wrapping ---
  for (let i = 0; i < 4; i++) {
    const speed = 14 + i * 5;
    const x = ((i * 0.27 * W + t * speed) % (W + 80)) - 40;
    const y = H * (0.24 + i * 0.045) + Math.sin(t * 0.9 + i) * 6;
    const flap = 0.5 + Math.sin(t * 4 + i * 1.3) * 0.5;
    bird(g, x, y, H * 0.02, flap);
  }

  // --- rolling parallax hills (back = hazier/lighter) ---
  hill(g, W, H, horizon - H * 0.02, H * 0.018, 0.6, "#8a6f86");            // far ridge, dusty violet
  hill(g, W, H, horizon + H * 0.05, H * 0.03, 2.2, "#5f6a4e");            // mid hills, muted green
  hill(g, W, H, horizon + H * 0.13, H * 0.045, 4.1, "#465737");          // near meadow

  // a soft warm haze band on the horizon to sell the sunrise
  const haze = g.createLinearGradient(0, horizon - H * 0.06, 0, horizon + H * 0.1);
  haze.addColorStop(0, "rgba(255,214,150,0)");
  haze.addColorStop(0.5, "rgba(255,200,140,.28)");
  haze.addColorStop(1, "rgba(255,200,140,0)");
  g.fillStyle = haze;
  g.fillRect(0, horizon - H * 0.06, W, H * 0.16);

  // --- foreground: the farm sitting on the near meadow, kept left of centre so
  // the button column (which sits over the middle) never covers the house ---
  const groundY = horizon + H * 0.2;
  const unit = H * 0.09;
  tree(g, W * 0.1, groundY + H * 0.02, unit * 0.9);
  farmhouse(g, W * 0.28, groundY + H * 0.03, unit, t);
  tree(g, W * 0.72, groundY + H * 0.05, unit * 1.1);

  // a hint of a broken fence line running off to the right (the rundown farm)
  g.strokeStyle = "#3a2a1b"; g.lineWidth = Math.max(1.5, H * 0.006);
  const fy = groundY + H * 0.11;
  for (let i = 0; i < 8; i++) {
    const fx = W * 0.5 + i * W * 0.06;
    const lean = (i % 3 === 0 ? 0.14 : 0);   // a couple leaning posts
    g.beginPath();
    g.moveTo(fx, fy);
    g.lineTo(fx + lean * unit, fy - unit * 0.42);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(W * 0.5, fy - unit * 0.28);
  g.lineTo(W * 0.5 + 7 * W * 0.06, fy - unit * 0.28);
  g.stroke();

  // gentle full-frame warm vignette so the whole thing feels lit from within
  const vig = g.createRadialGradient(W / 2, H * 0.42, H * 0.2, W / 2, H * 0.55, H * 0.95);
  vig.addColorStop(0, "rgba(255,240,200,0)");
  vig.addColorStop(1, "rgba(30,20,10,.34)");
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);
}

/** A little heart with a sprout growing from its top notch — the game's motif. */
function heartSprout(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number) {
  // heart
  g.fillStyle = "#d6564e";
  g.beginPath();
  g.moveTo(cx, cy + s * 0.85);
  g.bezierCurveTo(cx - s * 1.2, cy - s * 0.1, cx - s * 0.55, cy - s * 0.95, cx, cy - s * 0.3);
  g.bezierCurveTo(cx + s * 0.55, cy - s * 0.95, cx + s * 1.2, cy - s * 0.1, cx, cy + s * 0.85);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(58,24,20,.7)"; g.lineWidth = s * 0.12; g.stroke();
  // little sway on the sprout
  const sway = Math.sin(t * 1.6) * s * 0.1;
  g.strokeStyle = "#5a9a48"; g.lineWidth = s * 0.14; g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx, cy - s * 0.28);
  g.quadraticCurveTo(cx + sway, cy - s * 0.7, cx + sway, cy - s * 0.95);
  g.stroke();
  // two leaves
  g.fillStyle = "#6cb356";
  g.beginPath(); g.ellipse(cx - s * 0.22 + sway * 0.5, cy - s * 0.72, s * 0.28, s * 0.15, -0.6, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx + s * 0.24 + sway, cy - s * 0.9, s * 0.28, s * 0.15, 0.6, 0, 7); g.fill();
}

/**
 * Paint the "Wildhearth" wordmark centred at (cx, cy), sized by `scale` (a rough
 * cap-height-in-px), warm gold with a dark outline + soft shadow, the heart-
 * and-sprout motif above it, and a gentle vertical bob.
 */
export function drawLogo(g: CanvasRenderingContext2D, cx: number, cy: number, scale: number, t: number) {
  const bob = Math.sin(t * 1.1) * scale * 0.03;
  const y = cy + bob;
  g.save();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `800 ${scale}px "Georgia", "Times New Roman", serif`;

  // soft drop shadow
  g.save();
  g.shadowColor = "rgba(0,0,0,.55)";
  g.shadowBlur = scale * 0.22;
  g.shadowOffsetY = scale * 0.06;
  g.fillStyle = "#000";
  g.globalAlpha = 0.001;   // paint only the shadow, not visible ink
  g.fillText("Wildhearth", cx, y);
  g.restore();

  // dark outline
  g.lineJoin = "round";
  g.strokeStyle = "#3a2712";
  g.lineWidth = scale * 0.14;
  g.strokeText("Wildhearth", cx, y);

  // warm gold gradient fill
  const grad = g.createLinearGradient(0, y - scale * 0.6, 0, y + scale * 0.6);
  grad.addColorStop(0, "#ffe9a8");
  grad.addColorStop(0.5, "#ffd15a");
  grad.addColorStop(1, "#e8a52e");
  g.fillStyle = grad;
  g.fillText("Wildhearth", cx, y);

  // a slim inner highlight line for a hand-lettered sheen
  g.strokeStyle = "rgba(255,255,235,.35)";
  g.lineWidth = scale * 0.02;
  g.strokeText("Wildhearth", cx, y - scale * 0.03);

  g.restore();

  heartSprout(g, cx, y - scale * 0.95, scale * 0.34, t);
}
