import type { PageDTO } from "../dto/index.js";

/**
 * Slices an ALREADY SORTED array into a PageDTO. Sorting is each
 * operation's responsibility (Section 8 fixes the order per
 * operation); storage returns raw, unordered data. A page past the
 * end yields an empty `items` with the true `total` — not an error.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): PageDTO<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}
