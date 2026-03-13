export class AppError extends Error {
  public readonly code: string;
  public readonly metadata: Record<string, string | number | boolean | null | undefined>;

  constructor(
    code: string,
    message: string,
    metadata: Record<string, string | number | boolean | null | undefined> = {},
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.metadata = metadata;
  }
}
