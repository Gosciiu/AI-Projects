/**
 * Deterministic ASC comparator for the string sorts fixed by
 * Section 8 (`path ASC` for file listings, `name ASC` for
 * project.list — review decision 2026-07-03, consistent with
 * docs/Architecture_FINAL.md).
 *
 * Plain code-unit comparison, deliberately NOT localeCompare():
 * locale collation varies between environments and would make
 * listing order machine-dependent.
 */
export function compareAsc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
