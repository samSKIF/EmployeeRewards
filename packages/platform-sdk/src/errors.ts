export class AppError extends Error {
  code: string;
  cause?: unknown;
  status?: number;
  constructor(code: string, message: string, opts?: { cause?: unknown; status?: number }) {
    super(message);
    this.code = code;
    this.cause = opts?.cause;
    this.status = opts?.status;
  }
  static normalize(e: unknown, fallback: string = 'unknown_error') {
    if (e instanceof AppError) return e;
    if (e instanceof Error) return new AppError(fallback, e.message, { cause: e });
    return new AppError(fallback, String(e));
  }
  withHttp(status: number) { this.status = status; return this; }
}