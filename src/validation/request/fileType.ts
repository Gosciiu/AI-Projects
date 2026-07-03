import type { ErrorData } from "../../dto/index.js";
import { errorData } from "../errors.js";

/**
 * `type` computation from `path` — ARCHITECTURE.md Section 4:
 *
 *   .md          → "markdown"
 *   .json        → "json"
 *   .yaml / .yml → "yaml"
 *   no extension → "text"
 *   anything else → UNSUPPORTED_FILE_TYPE
 *
 * `type` is NEVER a stored field nor a request parameter — always
 * derived from `path`. This module is the single implementation of
 * that rule; the mappers layer (Section 11) must reuse
 * fileTypeFromPath() rather than re-deriving it.
 *
 * Section 6 marks UNSUPPORTED_FILE_TYPE as "request/business":
 * file.create and file.move validate the (new) path up front, which
 * is why this lives in request/.
 */

export type FileType = "markdown" | "json" | "yaml" | "text";

/** `null` = unsupported extension. */
export function fileTypeFromPath(filePath: string): FileType | null {
  const basename = filePath.slice(filePath.lastIndexOf("/") + 1);
  const dot = basename.lastIndexOf(".");
  // No dot, or a leading-dot name like ".gitignore": no extension.
  if (dot <= 0) return "text";
  const ext = basename.slice(dot + 1).toLowerCase();
  switch (ext) {
    case "md":
      return "markdown";
    case "json":
      return "json";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return null;
  }
}

export function validateSupportedFileType(filePath: string): ErrorData | null {
  if (fileTypeFromPath(filePath) !== null) return null;
  return errorData(
    "UNSUPPORTED_FILE_TYPE",
    `Unsupported file type for path: ${filePath} (supported: .md, .json, .yaml, .yml, or no extension)`,
  );
}
