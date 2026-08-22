export class GameEngineError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GameEngineError";
    this.code = code;
  }
}
