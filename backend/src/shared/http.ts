import type { ErrorBody, HttpResult } from "./types.js";

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
