import type { FileVersion } from "../../domain/index.js";
import type { ErrorData } from "../../dto/index.js";
import { errorData } from "../errors.js";

/**
 * Global Validation Order step 5 — VERSION_MISMATCH
 * (file.version.diff only).
 *
 * Both versions must belong to the same file; diffing across files
 * is meaningless. Despite the name, this has NOTHING to do with the
 * optimistic-locking version match of step 4 (version/) — that one
 * yields ConflictData, never a code. VERSION_MISMATCH is a plain
 * business error about mismatched fileIds.
 */
export function requireSameFile(
  from: FileVersion,
  to: FileVersion,
): ErrorData | null {
  if (from.fileId === to.fileId) return null;
  return errorData(
    "VERSION_MISMATCH",
    `Versions belong to different files: ${from.fileId} vs ${to.fileId}`,
  );
}
