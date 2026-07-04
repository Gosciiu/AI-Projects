import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileArchive, projectSearchFulltext } from "../src/operations/index.js";
import {
  cleanupRoot,
  expectError,
  expectSuccess,
  makeRoot,
  seedFile,
  seedProject,
} from "./helpers.js";

/**
 * Priority 8 — project.search.fulltext: case-insensitive substring,
 * one result per file, excerpt window with "…", active files only.
 */
describe("project.search.fulltext", () => {
  let root: string;
  let projectId: string;
  beforeEach(async () => {
    root = await makeRoot();
    projectId = (await seedProject(root)).id;
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("case-insensitive substring, active only, one result per file, path ASC", async () => {
    await seedFile(root, projectId, "b.md", "hello world");
    await seedFile(root, projectId, "a.md", "Hello World foo");
    await seedFile(root, projectId, "c.md", "nothing relevant");
    const d = await seedFile(root, projectId, "d.md", "hello from the archive");
    expectSuccess(
      await fileArchive(root, { fileId: d.id, versionId: d.versionId }),
    );

    const page = expectSuccess(
      await projectSearchFulltext(root, {
        projectId,
        query: "HELLO",
        page: 1,
        pageSize: 10,
      }),
    );
    expect(page.items.map((r) => r.filePath)).toEqual(["a.md", "b.md"]);
    expect(page.total).toBe(2);
  });

  it("multiple occurrences in one file → still exactly one result (first match wins)", async () => {
    await seedFile(root, projectId, "dup.md", "dup dup dup");
    const page = expectSuccess(
      await projectSearchFulltext(root, {
        projectId,
        query: "dup",
        page: 1,
        pageSize: 10,
      }),
    );
    expect(page.items).toHaveLength(1);
  });

  it("excerpt: ±80 chars around the first match, '…' on truncated ends", async () => {
    const content = "x".repeat(200) + "NEEDLE" + "y".repeat(200);
    await seedFile(root, projectId, "long.md", content);

    const page = expectSuccess(
      await projectSearchFulltext(root, {
        projectId,
        query: "needle",
        page: 1,
        pageSize: 10,
      }),
    );
    const excerpt = page.items[0]!.excerpt;
    // "…" + 80 + "NEEDLE"(6) + 80 + "…"
    expect(excerpt).toBe("…" + "x".repeat(80) + "NEEDLE" + "y".repeat(80) + "…");
  });

  it("excerpt: match at the very start → no leading '…'", async () => {
    const content = "NEEDLE" + "y".repeat(200);
    await seedFile(root, projectId, "start.md", content);

    const page = expectSuccess(
      await projectSearchFulltext(root, {
        projectId,
        query: "needle",
        page: 1,
        pageSize: 10,
      }),
    );
    const excerpt = page.items[0]!.excerpt;
    expect(excerpt).toBe("NEEDLE" + "y".repeat(80) + "…");
  });

  it("short content → excerpt is the whole content, no '…'", async () => {
    await seedFile(root, projectId, "short.md", "just a needle here");
    const page = expectSuccess(
      await projectSearchFulltext(root, {
        projectId,
        query: "needle",
        page: 1,
        pageSize: 10,
      }),
    );
    expect(page.items[0]!.excerpt).toBe("just a needle here");
  });

  it("result carries the file's CURRENT ETag as versionId", async () => {
    const file = await seedFile(root, projectId, "a.md", "needle");
    const page = expectSuccess(
      await projectSearchFulltext(root, {
        projectId,
        query: "needle",
        page: 1,
        pageSize: 10,
      }),
    );
    expect(page.items[0]!.versionId).toBe(file.versionId);
  });

  it("empty / whitespace-only query → VALIDATION_ERROR", async () => {
    expectError(
      await projectSearchFulltext(root, {
        projectId,
        query: "",
        page: 1,
        pageSize: 10,
      }),
      "VALIDATION_ERROR",
    );
    expectError(
      await projectSearchFulltext(root, {
        projectId,
        query: "   ",
        page: 1,
        pageSize: 10,
      }),
      "VALIDATION_ERROR",
    );
  });
});
