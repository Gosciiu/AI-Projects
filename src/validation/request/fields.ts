import type { ErrorData } from "../../dto/index.js";
import { errorData } from "../errors.js";

/**
 * Global Validation Order step 1 — Request validation (format,
 * required fields) → VALIDATION_ERROR.
 *
 * Inputs arrive from the MCP boundary as `unknown`; these validators
 * establish the basic shape before any storage access happens.
 *
 * Note: IDs (projectId, fileId, versionId) are validated only as
 * non-empty strings — a well-formed but unknown UUID is step 2's
 * business (*_NOT_FOUND), not a format error.
 */

/**
 * Required string that must carry content (name, path, query,
 * IDs...). Whitespace-only counts as empty — a project named " "
 * is not a valid name.
 */
export function requireNonEmptyString(
  value: unknown,
  field: string,
): ErrorData | null {
  if (typeof value === "string" && value.trim() !== "") return null;
  return errorData(
    "VALIDATION_ERROR",
    `Field "${field}" must be a non-empty string`,
  );
}

/**
 * Required string that MAY be empty — `content` only. An empty file
 * is a legal file; a missing/non-string `content` is not.
 */
export function requireString(value: unknown, field: string): ErrorData | null {
  if (typeof value === "string") return null;
  return errorData("VALIDATION_ERROR", `Field "${field}" must be a string`);
}
