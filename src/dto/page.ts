/**
 * DTO: PageDTO<T>
 *
 * Per ARCHITECTURE.md Section 7.
 *
 * Generic pagination envelope used by every listing operation
 * (project.list, project.files, project.search.fulltext,
 * project.history, file.versions). Default sort is `path ASC`
 * everywhere EXCEPT project.history and file.versions, which sort
 * `DESC` (chronology) — sorting is a concern of the operation that
 * produces the page, not of this DTO itself.
 */
export interface PageDTO<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
