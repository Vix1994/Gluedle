export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

export function shareCardLayout(rowCount: unknown) {
  const count = Math.max(1, Math.min(8, Math.floor(Number(rowCount)) || 0));
  const gridTop = 360;
  const cellGap = count > 6 ? 8 : 10;
  const cellSize = count > 6 ? Math.floor((540 - (count - 1) * 8) / count) : 78;
  const rowGap = count > 6 ? 8 : 12;
  const qrModule = 7;
  const quietModules = 4;
  const qrOuterSize = (37 + quietModules * 2) * qrModule;
  const qrY = SHARE_CARD_HEIGHT - qrOuterSize - 24;
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
    answerX: 450,
    answerWidth: 558,
  };
}
