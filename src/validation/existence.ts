import type { Project, ProjectFile, FileVersion } from "../domain/index.js";
import type { ErrorData } from "../dto/index.js";
import { errorData } from "./errors.js";

/**
 * Global Validation Order step 2 — Object existence.
 *
 * Placement: at the validation ROOT, not in a subfolder. Section 11
 * fixes exactly four validation subfolders (request/, state/,
 * version/, business/) mapping 1:1 to steps 1, 3, 4 and 5 — adding
 * an existence/ subfolder would break that structure, and hiding
 * these checks in request/ would mislabel them as step 1. Step 2 is
 * in practice just the storage layer's `null` translated into the
 * right *_NOT_FOUND code, so it lives as a single root module of
 * the layer that owns error codes.
 *
 * Validators are pure: the operation performs the storage read and
 * passes the (possibly null) result in.
 */

export function requireProject(
  project: Project | null,
  projectId: string,
): ErrorData | null {
  if (project !== null) return null;
  return errorData("PROJECT_NOT_FOUND", `Project not found: ${projectId}`);
}

export function requireProjectFile(
  file: ProjectFile | null,
  fileId: string,
): ErrorData | null {
  if (file !== null) return null;
  return errorData("FILE_NOT_FOUND", `File not found: ${fileId}`);
}

export function requireFileVersion(
  version: FileVersion | null,
  versionId: string,
): ErrorData | null {
  if (version !== null) return null;
  return errorData(
    "FILE_VERSION_NOT_FOUND",
    `File version not found: ${versionId}`,
  );
}
