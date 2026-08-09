import { createQrMatrix } from "./qr-code.ts";
import type { ComparisonStatus } from "../types.ts";
import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  shareCardLayout,
} from "./share-card-layout.ts";
import { SHARE_FIELDS } from "./share-card-model.ts";
import type { ShareCardModel } from "./share-card-model.ts";

export { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, shareCardLayout } from "./share-card-layout.ts";
export { SHARE_FIELDS, buildShareCardModel } from "./share-card-model.ts";
export type { ShareCardModel, ShareField } from "./share-card-model.ts";

const SHARE_FIELD_LABELS = ["发行日", "时长", "收藏", "语言", "专辑", "演唱", "版本", "合作", "创作"];

interface StatusStyle {
  fill: string;
  ink: string;
  mark: string;
  label: string;
}

const STATUS_STYLE: Readonly<Record<ComparisonStatus, StatusStyle>> = Object.freeze({
  match: { fill: "#49e99b", ink: "#050505", mark: "✓", label: "匹配" },
  near: { fill: "#ffd75b", ink: "#050505", mark: "≈", label: "接近" },
  partial: { fill: "#ffd75b", ink: "#050505", mark: "≈", label: "接近" },
  miss: { fill: "#ff5964", ink: "#050505", mark: "×", label: "不匹配" },
  unknown: { fill: "#4d504e", ink: "#f4f3ed", mark: "?", label: "待核验" },
});

export function renderShareCard(canvas: HTMLCanvasElement, model: ShareCardModel): HTMLCanvasElement {
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.fillStyle = "#050505";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.strokeStyle = "rgba(135,168,190,.22)";
  context.lineWidth = 2;
  for (const radius of [180, 260, 340]) {
    context.beginPath();
    context.arc(900, 560, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
  context.fillStyle = "#f4f3ed";
  context.fillRect(0, 0, canvas.width, 218);
  context.fillStyle = "#87a8be";
  context.fillRect(72, 72, 18, 74);

  setFont(context, 700, 72);
  context.fillStyle = "#050505";
  context.fillText("GLUEDLE", 124, 136);
  setFont(context, 500, 24);
  context.fillStyle = "#4d504e";
  context.fillText("GLUE / CURLEY G / RANDOM DATA STUDY", 124, 177);

  setFont(context, 700, 52);
  context.fillStyle = "#f4f3ed";
  context.textAlign = "right";
  context.fillText(model.outcome, 1008, 278);
  setFont(context, 500, 25);
  context.fillStyle = "#a7aaa8";
  context.fillText(model.roundLabel, 1008, 295);
  context.fillText("ROUND RESULT", 1008, 330);
  context.textAlign = "left";

  const layout = shareCardLayout(model.rows.length);
  const { gridTop, cellGap, cellSize, rowGap } = layout;
  const gridWidth = SHARE_FIELDS.length * cellSize + (SHARE_FIELDS.length - 1) * cellGap;
  const gridLeft = Math.round((canvas.width - gridWidth) / 2);

  setFont(context, 500, 16);
  context.fillStyle = "#a7aaa8";
  SHARE_FIELD_LABELS.forEach((label, index) => {
    const x = gridLeft + index * (cellSize + cellGap) + cellSize / 2;
    context.textAlign = "center";
    context.fillText(label, x, gridTop - 14);
  });
  context.textAlign = "left";

  const rows: ComparisonStatus[][] = model.rows.length
    ? model.rows
    : [SHARE_FIELDS.map(() => "unknown")];
  rows.forEach((row, rowIndex) => {
    row.forEach((status, columnIndex) => {
      const style = STATUS_STYLE[status];
      const x = gridLeft + columnIndex * (cellSize + cellGap);
      const y = gridTop + rowIndex * (cellSize + rowGap);
      context.fillStyle = style.fill;
      context.fillRect(x, y, cellSize, cellSize);
      context.strokeStyle = "rgba(244,243,237,.48)";
      context.lineWidth = 2;
      context.strokeRect(x, y, cellSize, cellSize);
      setFont(context, 800, 42);
      context.fillStyle = style.ink;
      context.textAlign = "center";
      context.fillText(style.mark, x + cellSize / 2, y + 53);
    });
  });
  context.textAlign = "left";

  const qrMatrix = createQrMatrix(model.canonicalUrl);
  const { qrModule, quietModules, qrOuterSize, qrY } = layout;
  const qrX = 72;
  context.fillStyle = "#f4f3ed";
  context.fillRect(qrX, qrY, qrOuterSize, qrOuterSize);
  context.fillStyle = "#050505";
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
  if (model.song) {
    const answerY = qrY + 28;
    const { answerX, answerWidth } = layout;
    setFont(context, 500, 18);
    context.fillStyle = "#87a8be";
    context.fillText("ANSWER / SONG INFO", answerX, answerY);
    setFont(context, 700, 44);
    context.fillStyle = "#f4f3ed";
    drawFittedText(context, model.song.title, answerX, answerY + 54, answerWidth, 44, 28);
    setFont(context, 500, 18);
    context.fillStyle = "#e8ebeb";
    drawWrappedText(
      context,
      [model.song.project, model.song.releaseDate, model.song.duration, model.song.favoriteCount].join(" / "),
      answerX,
      answerY + 88,
      answerWidth,
      22,
    );
    context.fillStyle = "#a7aaa8";
    drawWrappedText(
      context,
      [model.song.language, model.song.performance, model.song.origin, model.song.featuredArtists].join(" / "),
      answerX,
      answerY + 134,
      answerWidth,
      22,
    );
    context.fillText(`创作：${model.song.credits}`, answerX, answerY + 180);
    setFont(context, 700, 20);
    context.fillStyle = "#87a8be";
    context.fillText("SCAN TO PLAY", answerX, answerY + 222);
    setFont(context, 500, 17);
    context.fillStyle = "#a7aaa8";
    drawWrappedText(context, displayUrl(model.canonicalUrl), answerX, answerY + 250, answerWidth, 23);
  } else {
    setFont(context, 700, 30);
    context.fillStyle = "#87a8be";
    context.fillText("SCAN TO PLAY", copyX, copyY);
    setFont(context, 700, 44);
    context.fillStyle = "#f4f3ed";
    context.fillText("不用听，", copyX, copyY + 72);
    context.fillText("也能猜到吗？", copyX, copyY + 124);
    setFont(context, 500, 22);
    context.fillStyle = "#a7aaa8";
    drawWrappedText(context, displayUrl(model.canonicalUrl), copyX, copyY + 178, 470, 31);
  }

  const { legendY } = layout;
  let legendX = 72;
  for (const status of ["match", "near", "miss"] as const) {
    const style = STATUS_STYLE[status];
    context.fillStyle = style.fill;
    context.fillRect(legendX, legendY - 20, 28, 28);
    setFont(context, 600, 21);
    context.fillStyle = "#e8ebeb";
    context.fillText(`${style.mark} ${style.label}`, legendX + 40, legendY + 2);
    legendX += 190;
  }
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG export failed."));
    }, "image/png");
  });
}

function setFont(context: CanvasRenderingContext2D, weight: number, size: number): void {
  context.font = `${weight} ${size}px Archivo, "Noto Sans SC", sans-serif`;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
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

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  minSize: number,
): void {
  let fontSize = size;
  while (fontSize > minSize) {
    setFont(context, 700, fontSize);
    if (context.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }
  context.fillText(text, x, y);
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
