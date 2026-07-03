import type { ErrorData } from "../../dto/index.js";
import { errorData } from "../errors.js";

/**
 * Global Validation Order step 1 — pagination params shared by
 * every listing operation (project.list, project.files,
 * project.search.fulltext, project.history, file.versions).
 *
 * ARCHITECTURE.md specifies no upper bound for pageSize — do not
 * invent one here. Defaulting (when the caller omits page/pageSize)
 * is the operations layer's decision; by the time values reach this
 * validator they must be concrete.
 */
export function validatePagination(
  page: unknown,
  pageSize: unknown,
): ErrorData | null {
  if (!Number.isInteger(page) || (page as number) < 1) {
    return errorData("VALIDATION_ERROR", `Field "page" must be an integer >= 1`);
  }
  if (!Number.isInteger(pageSize) || (pageSize as number) < 1) {
    return errorData(
      "VALIDATION_ERROR",
      `Field "pageSize" must be an integer >= 1`,
    );
  }
  return null;
}
