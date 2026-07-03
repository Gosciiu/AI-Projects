/**
 * DTOs: OperationResponse<T>, ErrorData, ConflictData
 *
 * Per ARCHITECTURE.md Sections 5, 6 & 7.
 *
 * These three types form the response envelope shared by every
 * mutating MCP operation and must be kept together: the envelope's
 * `status` discriminant is what makes conflict a real branch of the
 * response rather than an error code.
 */

/**
 * `status: "conflict"` is Global Validation Order step 4 (Version
 * match). A version mismatch is NEVER surfaced as `status: "error"`
 * with an error code — it is always this separate, first-class
 * branch. Do not add a "VERSION_CONFLICT"-style entry to ErrorData's
 * `code` union; that would violate Section 6.
 *
 * Discriminated union rather than a loose interface: the wire format
 * is identical to Section 7's `{ status, data }`, but the union makes
 * the status ↔ data pairing a compile-time guarantee (narrowing on
 * `status` yields the right `data` type).
 */
export type OperationResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; data: ErrorData }
  | { status: "conflict"; data: ConflictData };

/**
 * Deliberately minimal: only `code` and `message`. Any operation- or
 * field-specific detail belongs in the human-readable `message`
 * text, not in additional structured fields — Section 6 fixes the
 * error code list and this shape is not meant to grow per-operation
 * variants.
 */
export interface ErrorData {
  code: string;
  message: string;
}

/**
 * Shape frozen in the original design session (2026-06-25, "Odpowiedź
 * konfliktowa"). Deliberately has NO `conflict` boolean field — the
 * fact that this is a conflict is already carried by
 * `OperationResponse.status`, so repeating it here would be
 * redundant. `versionId`/`content` reflect the CURRENT server-side
 * state of the file, letting the client rebase its change.
 */
export interface ConflictData {
  fileId: string;
  versionId: string;
  content: string;
}
