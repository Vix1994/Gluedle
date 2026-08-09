export type ShareImageResult = "shared" | "downloaded" | "aborted";

export async function shareImageOrDownload(
  blob: Blob,
  filename: string,
  title: string,
): Promise<ShareImageResult> {
  const file = typeof File === "function"
    ? new File([blob], filename, { type: "image/png" })
    : null;

  if (file && typeof navigator.share === "function" && canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return "aborted";
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canShareFile(file: File): boolean {
  if (typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}
