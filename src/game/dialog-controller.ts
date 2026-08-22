export interface DialogController {
  open(dialog: HTMLDialogElement | null): void;
  close(dialog: HTMLDialogElement | null): void;
  destroy(): void;
}

export function createDialogController({
  signal,
  helpDialog,
}: {
  signal: AbortSignal;
  helpDialog: HTMLDialogElement;
}): DialogController {
  let lastTrigger: Element | null = null;

  const open = (dialog: HTMLDialogElement | null): void => {
    if (!dialog) return;
    lastTrigger = document.activeElement;
    document.body.classList.add("dialog-open");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  };

  const close = (dialog: HTMLDialogElement | null): void => {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    document.body.classList.remove("dialog-open");
    if (lastTrigger instanceof HTMLElement && lastTrigger.isConnected) {
      lastTrigger.focus({ preventScroll: true });
    }
    lastTrigger = null;
  };

  document.addEventListener("glue:open-help", () => open(helpDialog), { signal });
  document.querySelectorAll<HTMLElement>("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialogId = button.dataset.openDialog;
      if (dialogId) open(document.getElementById(dialogId) as HTMLDialogElement | null);
    }, { signal });
  });
  document.querySelectorAll<HTMLElement>("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => close(button.closest("dialog")), { signal });
  });
  document.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close(dialog);
    }, { signal });
  });

  return {
    open,
    close,
    destroy() {
      document.body.classList.remove("dialog-open");
      lastTrigger = null;
    },
  };
}
