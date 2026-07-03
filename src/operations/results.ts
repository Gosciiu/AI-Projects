import type { ConflictData, ErrorData, OperationResponse } from "../dto/index.js";

/**
 * Response constructors — the only way operations build an
 * OperationResponse. `fail` and `conflict` return
 * OperationResponse<never>, which is assignable to any
 * OperationResponse<T>, so error/conflict paths need no type
 * gymnastics.
 *
 * A version conflict goes through conflict(), NEVER through fail()
 * with an invented code — Section 5 step 4.
 */

export function ok<T>(data: T): OperationResponse<T> {
  return { status: "success", data };
}

export function fail(error: ErrorData): OperationResponse<never> {
  return { status: "error", data: error };
}

export function conflict(data: ConflictData): OperationResponse<never> {
  return { status: "conflict", data };
}
