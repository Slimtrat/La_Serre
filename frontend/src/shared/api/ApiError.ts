export interface ApiErrorPayload<TValidation = unknown> {
  code?: string;
  detail?: unknown;
  errors?: TValidation;
  message?: string;
  validation?: TValidation;
  [key: string]: unknown;
}

export interface ApiErrorOptions<_TValidation = unknown> {
  status: number;
  statusText?: string;
  data?: unknown;
  cause?: unknown;
}

function isPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readableDetail(
  data: unknown,
  status: number,
  statusText?: string,
): string {
  if (isPayload(data)) {
    if (typeof data.detail === "string" && data.detail.trim())
      return data.detail;
    if (typeof data.message === "string" && data.message.trim())
      return data.message;
  }
  if (typeof data === "string" && data.trim()) return data;
  return statusText?.trim() || `La requête a échoué (${status})`;
}

/** Erreur HTTP normalisée, y compris pour les erreurs de validation FastAPI. */
export class ApiError<TValidation = unknown> extends Error {
  readonly status: number;
  readonly detail: string;
  readonly code?: string;
  readonly validation?: TValidation;
  readonly data: unknown;

  constructor(options: ApiErrorOptions<TValidation>) {
    const detail = readableDetail(
      options.data,
      options.status,
      options.statusText,
    );
    super(
      detail,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "ApiError";
    this.status = options.status;
    this.detail = detail;
    this.data = options.data;

    if (isPayload(options.data)) {
      this.code =
        typeof options.data.code === "string" ? options.data.code : undefined;
      this.validation = (options.data.validation ??
        options.data.errors ??
        (Array.isArray(options.data.detail)
          ? options.data.detail
          : undefined)) as TValidation | undefined;
    }
  }
}
