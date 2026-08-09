export interface GluedleElements {
  gameSongCount: HTMLElement;
  gameRound: HTMLElement;
  gameStatus: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  suggestions: HTMLUListElement;
  submit: HTMLButtonElement;
  feedback: HTMLElement;
  board: HTMLTableSectionElement;
  attemptCount: HTMLElement;
  hintButton: HTMLButtonElement;
  hintStack: HTMLElement;
  share: HTMLButtonElement;
  reset: HTMLButtonElement;
  helpDialog: HTMLDialogElement;
  resultDialog: HTMLDialogElement;
  resultOutcome: HTMLElement;
  resultTitle: HTMLElement;
  resultSummary: HTMLElement;
  resultReset: HTMLButtonElement;
  sharePreview: HTMLElement;
  shareConfirm: HTMLButtonElement;
  shareDownload: HTMLButtonElement;
  shareCanvas: HTMLCanvasElement;
  toast: HTMLElement;
  appBoot: HTMLElement | null;
}

export function collectGluedleElements(root: ParentNode = document): GluedleElements {
  const get = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Gluedle page is missing ${selector}.`);
    return element;
  };

  return {
    gameSongCount: get<HTMLElement>("[data-game-song-count]"),
    gameRound: get<HTMLElement>("#game-round"),
    gameStatus: get<HTMLElement>("#game-status"),
    form: get<HTMLFormElement>("#guess-form"),
    input: get<HTMLInputElement>("#song-input"),
    suggestions: get<HTMLUListElement>("#song-suggestions"),
    submit: get<HTMLButtonElement>("#guess-submit"),
    feedback: get<HTMLElement>("#guess-feedback"),
    board: get<HTMLTableSectionElement>("[data-guess-rows]"),
    attemptCount: get<HTMLElement>("#attempt-count"),
    hintButton: get<HTMLButtonElement>("#hint-button"),
    hintStack: get<HTMLElement>("[data-hint-stack]"),
    share: get<HTMLButtonElement>("#share-button"),
    reset: get<HTMLButtonElement>("#reset-button"),
    helpDialog: get<HTMLDialogElement>("#help-dialog"),
    resultDialog: get<HTMLDialogElement>("#result-dialog"),
    resultOutcome: get<HTMLElement>("[data-result-outcome]"),
    resultTitle: get<HTMLElement>("#result-title"),
    resultSummary: get<HTMLElement>("[data-result-summary]"),
    resultReset: get<HTMLButtonElement>("[data-result-reset]"),
    sharePreview: get<HTMLElement>("[data-share-preview]"),
    shareConfirm: get<HTMLButtonElement>("[data-share-confirm]"),
    shareDownload: get<HTMLButtonElement>("[data-share-download]"),
    shareCanvas: get<HTMLCanvasElement>("[data-share-canvas]"),
    toast: get<HTMLElement>("[data-toast]"),
    appBoot: root.querySelector<HTMLElement>("[data-app-boot]"),
  };
}
