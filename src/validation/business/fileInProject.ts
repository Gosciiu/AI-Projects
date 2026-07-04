import type { ProjectFile } from "../../domain/index.js";
import type { ErrorData } from "../../dto/index.js";
import { errorData } from "../errors.js";

/**
 * Global Validation Order step 5 — project.setDefaultFile only: the
 * designated file must belong to the target project.
 *
 * Deliberately FILE_NOT_FOUND, not a new code (Section 8 footnote:
 * "NIE dodajemy nowego kodu bez potrzeby"): from THIS project's
 * perspective the file does not exist. The message carries the
 * project context that the code alone cannot.
 */
export function requireFileInProject(
  file: ProjectFile,
  projectId: string,
): ErrorData | null {
  if (file.projectId === projectId) return null;
  return errorData(
    "FILE_NOT_FOUND",
    `File not found in project ${projectId}: ${file.id}`,
  );
}
