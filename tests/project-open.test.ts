import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileArchive, projectOpen } from "../src/operations/index.js";
import {
  cleanupRoot,
  expectError,
  expectSuccess,
  makeRoot,
  seedFile,
  seedProject,
  setDefaultFile,
} from "./helpers.js";

/**
 * Priority 7 — project.open: exactly one non-null branch of
 * ProjectOpenDTO; fallback = ONE full page of active files.
 */
describe("project.open", () => {
  let root: string;
  beforeEach(async () => {
    root = await makeRoot();
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("default branch: full FileDTO with content, files === null", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "main.md", "hello default");
    await seedFile(root, project.id, "other.md", "noise");
    await setDefaultFile(root, project.id, file.id);

    const open = expectSuccess(await projectOpen(root, { projectId: project.id }));
    expect(open.files).toBeNull();
    expect(open.defaultFile).not.toBeNull();
    expect(open.defaultFile!.id).toBe(file.id);
    expect(open.defaultFile!.content).toBe("hello default");
    expect(open.defaultFile!.type).toBe("markdown");
  });

  it("fallback branch: ALL active files in one full page, path ASC, archived hidden", async () => {
    const project = await seedProject(root);
    await seedFile(root, project.id, "b.md", "");
    await seedFile(root, project.id, "a.md", "");
    await seedFile(root, project.id, "c.md", "");
    const z = await seedFile(root, project.id, "z.md", "");
    expectSuccess(
      await fileArchive(root, { fileId: z.id, versionId: z.versionId }),
    );

    const open = expectSuccess(await projectOpen(root, { projectId: project.id }));
    expect(open.defaultFile).toBeNull();
    expect(open.files).not.toBeNull();
    expect(open.files!.items.map((f) => f.path)).toEqual(["a.md", "b.md", "c.md"]);
    // One FULL page — nothing truncated, no hidden limit.
    expect(open.files!.page).toBe(1);
    expect(open.files!.pageSize).toBe(3);
    expect(open.files!.total).toBe(3);
  });

  it("empty project → empty full page, still the files branch", async () => {
    const project = await seedProject(root);
    const open = expectSuccess(await projectOpen(root, { projectId: project.id }));
    expect(open.defaultFile).toBeNull();
    expect(open.files).toEqual({ items: [], page: 1, pageSize: 0, total: 0 });
  });

  it("unknown project → PROJECT_NOT_FOUND", async () => {
    expectError(
      await projectOpen(root, { projectId: "no-such-project" }),
      "PROJECT_NOT_FOUND",
    );
  });
});
