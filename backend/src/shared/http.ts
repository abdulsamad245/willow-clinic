import type { ErrorBody, HttpResult } from "./types.js";

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL: 500,
} as const;

export function ok<T>(status: number, body: T, headers?: Record<string, string>): HttpResult<T> {
  return headers ? { status, body, headers } : { status, body };
}

export function fail(status: number, error: string, headers?: Record<string, string>): HttpResult<ErrorBody> {
  return ok(status, { error }, headers);
}

export function queryString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  return String(value);
}
