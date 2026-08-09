import type { GameState, Song } from "../types.ts";
import type { GluedleElements } from "../game/gluedle-elements.ts";
import { downloadBlob, shareImageOrDownload } from "./browser-share.ts";
import { canonicalGameUrl } from "./qr-code.ts";
import { buildShareCardModel, canvasToBlob, renderShareCard } from "./share-card.ts";

type ShareElements = Pick<
  GluedleElements,
  | "reset"
  | "resultReset"
  | "share"
  | "shareCanvas"
  | "shareConfirm"
  | "shareDownload"
  | "sharePreview"
>;

export function createResultShareController({
  signal,
  elements,
  getState,
  getAnswer,
  getRoundNumber,
  openResult,
  setFeedback,
  showToast,
}: {
  signal: AbortSignal;
  elements: ShareElements;
  getState: () => GameState | null;
  getAnswer: () => Song | null;
  getRoundNumber: () => number;
  openResult: () => void;
  setFeedback: (message: string, isError?: boolean) => void;
  showToast: (message: string) => void;
}) {
  let isSharing = false;
  let shareBlob: Blob | null = null;
  let shareFilename = "";

  elements.share.addEventListener("click", () => {
    openResult();
    void prepare();
  }, { signal });
  elements.shareConfirm.addEventListener("click", () => void sharePreparedImage(), { signal });
  elements.shareDownload.addEventListener("click", downloadPreparedImage, { signal });

  async function prepare(): Promise<void> {
    const state = getState();
    const answer = getAnswer();
    if (!state?.attempts.length || !answer || isSharing) return;
    isSharing = true;
    setButtonsBusy(true);
    try {
      const roundNumber = getRoundNumber();
      const model = buildShareCardModel({
        roundLabel: `ROUND ${String(roundNumber).padStart(2, "0")}`,
        state,
        answer,
        canonicalUrl: canonicalGameUrl(window.location),
      });
      renderShareCard(elements.shareCanvas, model);
      shareBlob = await canvasToBlob(elements.shareCanvas);
      shareFilename = `gluedle-round-${roundNumber}.png`;
      elements.sharePreview.hidden = false;
      showToast("结果图片已生成，可选择分享或保存");
    } catch {
      setFeedback("结果图片生成失败，请稍后再试。", true);
      showToast("图片生成失败，请稍后再试");
    } finally {
      isSharing = false;
      setButtonsBusy(false);
    }
  }

  async function sharePreparedImage(): Promise<void> {
    const blob = shareBlob;
    if (!blob || isSharing) return;
    isSharing = true;
    setButtonsBusy(true);
    try {
      const result = await shareImageOrDownload(blob, shareFilename, "GLUEDLE 随机歌曲推理");
      if (result === "shared") showToast("分享面板已打开");
      if (result === "downloaded") showToast("当前设备不支持直接分享，已自动保存图片");
    } finally {
      isSharing = false;
      setButtonsBusy(false);
    }
  }

  function downloadPreparedImage(): void {
    if (!shareBlob || isSharing) return;
    downloadBlob(shareBlob, shareFilename);
    showToast("结果图片已下载");
  }

  function reset(): void {
    shareBlob = null;
    shareFilename = "";
    elements.sharePreview.hidden = true;
  }

  function setButtonsBusy(busy: boolean): void {
    elements.share.disabled = busy || !getState()?.attempts.length;
    elements.shareConfirm.disabled = busy || !shareBlob;
    elements.shareDownload.disabled = busy || !shareBlob;
    elements.reset.disabled = busy;
    elements.resultReset.disabled = busy;
    elements.share.textContent = busy ? "正在生成…" : "分享结果";
  }

  return {
    get isBusy() { return isSharing; },
    prepare,
    reset,
  };
}
