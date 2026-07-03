import type { OperationResponse, PageDTO, SearchResultDTO } from "../../dto/index.js";
import { toSearchResultDTO } from "../../mappers/index.js";
import { listProjectFiles, readProject } from "../../storage/index.js";
import {
  requireNonEmptyString,
  requireProject,
  validatePagination,
} from "../../validation/index.js";
import { loadCurrentVersion } from "../currentVersion.js";
import { paginate } from "../pagination.js";
import { fail, ok } from "../results.js";
import { compareAsc } from "../sort.js";

/**
 * project.search.fulltext — Section 8, Project Operations.
 *
 * Searches ONLY the current content of ACTIVE files. Matching
 * semantics (review decision 2026-07-03): case-insensitive substring
 * — no regexes, no tokenization, no fuzzy matching, no ranking
 * (ADR-001; Pattern Search deferred). One SearchResultDTO per file;
 * the first occurrence wins. Results sorted `path ASC`.
 */

/** Context on each side of the match in an excerpt (review decision 2026-07-03). */
const EXCERPT_CONTEXT_CHARS = 80;

function buildExcerpt(
  content: string,
  matchIndex: number,
  matchLength: number,
): string {
  // matchIndex comes from content.toLowerCase(), but the excerpt is
  // sliced from the ORIGINAL content. Exotic Unicode case folding
  // (e.g. Turkish İ lowercases to two code units) can shift the
  // window by a few characters — known, acceptable MVP limitation.
  const start = Math.max(0, matchIndex - EXCERPT_CONTEXT_CHARS);
  const end = Math.min(content.length, matchIndex + matchLength + EXCERPT_CONTEXT_CHARS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return prefix + content.slice(start, end) + suffix;
}

export async function projectSearchFulltext(
  root: string,
  req: {
    projectId?: unknown;
    query?: unknown;
    page?: unknown;
    pageSize?: unknown;
  },
): Promise<OperationResponse<PageDTO<SearchResultDTO>>> {
  // GVO 1 — request (query must be non-empty, Section 8)
  const bad =
    requireNonEmptyString(req.projectId, "projectId") ??
    requireNonEmptyString(req.query, "query") ??
    validatePagination(req.page, req.pageSize);
  if (bad !== null) return fail(bad);
  const projectId = req.projectId as string;
  const query = req.query as string;
  const page = req.page as number;
  const pageSize = req.pageSize as number;

  // GVO 2 — existence
  const project = await readProject(root, projectId);
  const notFound = requireProject(project, projectId);
  if (project === null) return fail(notFound!);

  const active = (await listProjectFiles(root, projectId)).filter(
    (f) => f.status === "active",
  );
  active.sort((a, b) => compareAsc(a.path, b.path));

  const needle = query.toLowerCase();
  const results: SearchResultDTO[] = [];
  for (const file of active) {
    const current = await loadCurrentVersion(root, file);
    const matchIndex = current.content.toLowerCase().indexOf(needle);
    if (matchIndex === -1) continue;
    results.push(
      toSearchResultDTO(file, buildExcerpt(current.content, matchIndex, query.length)),
    );
  }
  return ok(paginate(results, page, pageSize));
}
