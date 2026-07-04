import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileArchive,
  projectOpen,
  projectSetDefaultFile,
} from "../src/operations/index.js";
import {
  cleanupRoot,
  expectConflict,
  expectError,
  expectSuccess,
  makeRoot,
  seedFile,
  seedProject,
} from "./helpers.js";

/**
 * project.setDefaultFile — operation 18 (Section 8): the only
 * operation optimistically locking on Project.versionId.
 */
describe("project.setDefaultFile", () => {
  let root: string;
  beforeEach(async () => {
    root = await makeRoot();
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("sets the default file and bumps Project.versionId", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "main.md", "hello");

    const meta = expectSuccess(
      await projectSetDefaultFile(root, {
        projectId: project.id,
        fileId: file.id,
        projectVersionId: project.versionId,
      }),
    );
    expect(meta.id).toBe(project.id);
    expect(meta.versionId).not.toBe(project.versionId);

    const open = expectSuccess(await projectOpen(root, { projectId: project.id }));
    expect(open.defaultFile!.id).toBe(file.id);
    expect(open.files).toBeNull();
  });

  it("unsets with an explicit fileId: null", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "main.md", "hello");
    const set = expectSuccess(
      await projectSetDefaultFile(root, {
        projectId: project.id,
        fileId: file.id,
        projectVersionId: project.versionId,
      }),
    );

    const unset = expectSuccess(
      await projectSetDefaultFile(root, {
        projectId: project.id,
        fileId: null,
        projectVersionId: set.versionId,
      }),
    );
    expect(unset.versionId).not.toBe(set.versionId);

    const open = expectSuccess(await projectOpen(root, { projectId: project.id }));
    expect(open.defaultFile).toBeNull();
    expect(open.files).not.toBeNull();
  });

  it("missing fileId field (undefined) → VALIDATION_ERROR, never a silent unset", async () => {
    const project = await seedProject(root);
    expectError(
      await projectSetDefaultFile(root, {
        projectId: project.id,
        projectVersionId: project.versionId,
      }),
      "VALIDATION_ERROR",
    );
  });

  it("stale projectVersionId → conflict with project-role ConflictData mapping", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "main.md", "x");

    // Default currently null → content is "".
    const res1 = await projectSetDefaultFile(root, {
      projectId: project.id,
      fileId: file.id,
      projectVersionId: "stale-etag",
    });
    const c1 = expectConflict(res1);
    expect(c1.fileId).toBe(project.id); // conflicted object = the Project
    expect(c1.versionId).toBe(project.versionId); // its current ETag
    expect(c1.content).toBe(""); // current defaultFileId = null

    // After a successful set → content carries the current default.
    const set = expectSuccess(
      await projectSetDefaultFile(root, {
        projectId: project.id,
        fileId: file.id,
        projectVersionId: project.versionId,
      }),
    );
    const res2 = await projectSetDefaultFile(root, {
      projectId: project.id,
      fileId: null,
      projectVersionId: "stale-etag",
    });
    const c2 = expectConflict(res2);
    expect(c2.fileId).toBe(project.id);
    expect(c2.versionId).toBe(set.versionId);
    expect(c2.content).toBe(file.id);
  });

  it("archived file as default → FILE_ARCHIVED (Section 2 invariant)", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "x");
    expectSuccess(
      await fileArchive(root, { fileId: file.id, versionId: file.versionId }),
    );

    expectError(
      await projectSetDefaultFile(root, {
        projectId: project.id,
        fileId: file.id,
        projectVersionId: project.versionId,
      }),
      "FILE_ARCHIVED",
    );
  });

  it("file from another project → FILE_NOT_FOUND (no new error code)", async () => {
    const projectA = await seedProject(root, "A");
    const projectB = await seedProject(root, "B");
    const fileB = await seedFile(root, projectB.id, "b.md", "x");

    expectError(
      await projectSetDefaultFile(root, {
        projectId: projectA.id,
        fileId: fileB.id,
        projectVersionId: projectA.versionId,
      }),
      "FILE_NOT_FOUND",
    );
  });

  it("unknown fileId → FILE_NOT_FOUND (step 2)", async () => {
    const project = await seedProject(root);
    expectError(
      await projectSetDefaultFile(root, {
        projectId: project.id,
        fileId: "no-such-file",
        projectVersionId: project.versionId,
      }),
      "FILE_NOT_FOUND",
    );
  });

  it("GVO: stale project ETag + foreign file → conflict (step 4 before belongs-to at step 5)", async () => {
    const projectA = await seedProject(root, "A");
    const projectB = await seedProject(root, "B");
    const fileB = await seedFile(root, projectB.id, "b.md", "x");

    const res = await projectSetDefaultFile(root, {
      projectId: projectA.id,
      fileId: fileB.id,
      projectVersionId: "stale-etag",
    });
    const c = expectConflict(res);
    expect(c.fileId).toBe(projectA.id);
  });
});
