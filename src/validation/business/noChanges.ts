import type { ErrorData } from "../../dto/index.js";
import { errorData } from "../errors.js";

/**
 * Global Validation Order step 5 — NO_CHANGES (file.update,
 * file.version.restore).
 *
 * Runs AFTER the version match (step 4): identical content with a
 * stale versionId is a conflict, not NO_CHANGES. Rejecting no-op
 * writes keeps the FileVersion history free of duplicate entries —
 * for restore this means restoring the version that already equals
 * the current content is refused rather than minting a redundant
 * FileVersion.
 */
export function requireContentChange(
  newContent: string,
  currentContent: string,
): ErrorData | null {
  if (newContent !== currentContent) return null;
  return errorData("NO_CHANGES", "Content is identical to the current version");
}
