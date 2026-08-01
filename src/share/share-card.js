import { createQrMatrix } from "./qr-code.js";

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;
export const SHARE_FIELDS = ["year", "duration", "project", "language", "live", "performance", "credits"];

const STATUS_STYLE = Object.freeze({
  match: { fill: "#0b7a4b", mark: "✓", label: "匹配" },
  near: { fill: "#b56a00", mark: "≈", label: "接近" },
  partial: { fill: "#b56a00", mark: "≈", label: "接近" },
  miss: { fill: "#8e2638", mark: "×", label: "不匹配" },
  unknown: { fill: "#505969", mark: "?", label: "待核验" },
});

export function buildShareCardModel({ dayKey, state, canonicalUrl }) {
  const outcome = state.status === "won"
    ? `${state.attempts.length} / 6`
    : state.status === "lost" ? "X / 6" : `${state.attempts.length} / …`;
  return {
    dayKey,
    outcome,
    canonicalUrl,
    rows: state.attempts.map((attempt) =>
      SHARE_FIELDS.map((field) => normalizeStatus(attempt.comparison[field]?.status)),
    ),
  };
}

export function shareCardLayout(rowCount) {
  const count = Math.max(1, Math.min(6, Math.floor(Number(rowCount)) || 0));
  const gridTop = 340;
  const cellGap = 10;
  const cellSize = 78;
  const rowGap = 12;
  const qrModule = 7;
  const quietModules = 4;
  const qrOuterSize = (37 + quietModules * 2) * qrModule;
  const qrY = SHARE_CARD_HEIGHT - qrOuterSize - 72;
  return {
    count,
    gridTop,
    cellGap,
    cellSize,
    rowGap,
    gridBottom: gridTop + count * cellSize + (count - 1) * rowGap,
    qrModule,
    quietModules,
    qrOuterSize,
    qrY,
    legendY: qrY - 52,
  };
}

export function renderShareCard(canvas, model) {
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.fillStyle = "#06131f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0b2639";
  context.fillRect(0, 0, canvas.width, 218);
  context.fillStyle = "#22e6a7";
  context.fillRect(72, 72, 18, 74);

  setFont(context, 700, 72);
  context.fillStyle = "#f6f2e8";
  context.fillText("GLUEDLE", 124, 136);
  setFont(context, 500, 24);
  context.fillStyle = "#91aabd";
  context.fillText("SONG DATA GUESSING GAME / NO AUDIO", 124, 177);

  setFont(context, 700, 52);
  context.fillStyle = "#f6f2e8";
  context.fillText(model.outcome, 72, 310);
  setFont(context, 500, 25);
  context.fillStyle = "#91aabd";
  context.textAlign = "right";
  context.fillText(model.dayKey, 1008, 295);
  context.fillText("DAILY RESULT", 1008, 330);
  context.textAlign = "left";

  const layout = shareCardLayout(model.rows.length);
  const { gridTop, cellGap, cellSize, rowGap } = layout;
  const gridWidth = SHARE_FIELDS.length * cellSize + (SHARE_FIELDS.length - 1) * cellGap;
  const gridLeft = Math.round((canvas.width - gridWidth) / 2);

  const rows = model.rows.length ? model.rows : [SHARE_FIELDS.map(() => "unknown")];
  rows.forEach((row, rowIndex) => {
    row.forEach((status, columnIndex) => {
      const style = STATUS_STYLE[status];
      const x = gridLeft + columnIndex * (cellSize + cellGap);
      const y = gridTop + rowIndex * (cellSize + rowGap);
      roundedRect(context, x, y, cellSize, cellSize, 12);
      context.fillStyle = style.fill;
      context.fill();
      context.strokeStyle = "rgba(255,255,255,.48)";
      context.lineWidth = 2;
      context.stroke();
      setFont(context, 800, 42);
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.fillText(style.mark, x + cellSize / 2, y + 53);
    });
  });
  context.textAlign = "left";

  const qrMatrix = createQrMatrix(model.canonicalUrl);
  const { qrModule, quietModules, qrOuterSize, qrY } = layout;
  const qrX = 72;
  context.fillStyle = "#ffffff";
  context.fillRect(qrX, qrY, qrOuterSize, qrOuterSize);
  context.fillStyle = "#06131f";
  qrMatrix.forEach((row, rowIndex) => {
    row.forEach((dark, columnIndex) => {
      if (!dark) return;
      context.fillRect(
        qrX + (columnIndex + quietModules) * qrModule,
        qrY + (rowIndex + quietModules) * qrModule,
        qrModule,
        qrModule,
      );
    });
  });

  const copyX = qrX + qrOuterSize + 46;
  const copyY = qrY + 46;
  setFont(context, 700, 30);
  context.fillStyle = "#22e6a7";
  context.fillText("SCAN TO PLAY", copyX, copyY);
  setFont(context, 700, 44);
  context.fillStyle = "#f6f2e8";
  context.fillText("不用听，", copyX, copyY + 72);
  context.fillText("也能猜到吗？", copyX, copyY + 124);
  setFont(context, 500, 22);
  context.fillStyle = "#91aabd";
  drawWrappedText(context, displayUrl(model.canonicalUrl), copyX, copyY + 178, 470, 31);

  const { legendY } = layout;
  let legendX = 72;
  for (const status of ["match", "near", "miss"]) {
    const style = STATUS_STYLE[status];
    context.fillStyle = style.fill;
    context.fillRect(legendX, legendY - 20, 28, 28);
    setFont(context, 600, 21);
    context.fillStyle = "#dfeaf1";
    context.fillText(`${style.mark} ${style.label}`, legendX + 40, legendY + 2);
    legendX += 190;
  }
  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG export failed."));
    }, "image/png");
  });
}

function normalizeStatus(status) {
  return Object.hasOwn(STATUS_STYLE, status) ? status : "unknown";
}

function setFont(context, weight, size) {
  context.font = `${weight} ${size}px Archivo, "Noto Sans SC", sans-serif`;
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/(?=[/.])/u);
  let line = "";
  let lineY = y;
  for (const word of words) {
    const candidate = line + word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else line = candidate;
  }
  if (line) context.fillText(line, x, lineY);
}

function displayUrl(url) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
