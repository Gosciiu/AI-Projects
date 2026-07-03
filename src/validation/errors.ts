import type { ErrorData } from "../dto/index.js";

/**
 * ErrorCode — the complete, closed list of 10 error codes from
 * ARCHITECTURE.md Section 6. Do not add, remove or rename entries.
 *
 * Per the DTO-block review decision: the wire-facing ErrorData DTO
 * keeps `code: string`, and compile-time narrowing lives HERE, at
 * the point where errors are CREATED. Every error in the codebase
 * must be constructed via errorData() below — never as an object
 * literal — so that a typo'd or invented code fails to compile.
 *
 * Deliberately absent: any "VERSION_CONFLICT"-style code. A version
 * conflict is never an error (Section 5 step 4) — see version/.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "PROJECT_NOT_FOUND"
  | "FILE_NOT_FOUND"
  | "FILE_VERSION_NOT_FOUND"
  | "FILE_ARCHIVED"
  | "FILE_NOT_ARCHIVED"
  | "UNSUPPORTED_FILE_TYPE"
  | "PATH_CONFLICT"
  | "NO_CHANGES"
  | "VERSION_MISMATCH";

/**
 * Sole factory for ErrorData. Operation-specific detail goes into
 * `message` — ErrorData has no other fields by design (Section 6).
 */
export function errorData(code: ErrorCode, message: string): ErrorData {
  return { code, message };
}
