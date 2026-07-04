import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileArchive,
  fileUpdate,
  fileVersions,
  projectFiles,
  projectHistory,
  projectList,
} from "../src/operations/index.js";
import { writeFileVersion } from "../src/storage/index.js";
import {
  cleanupRoot,
  expectSuccess,
  makeRoot,
  seedFile,
  seedProject,
} from "./helpers.js";

/**
 * Priority 9 — sort orders fixed by Section 8 (+ review decision:
 * name ASC for project.list) and pagination on sorted data.
 */
describe("sort orders", () => {
  let root: string;
  beforeEach(async () => {
    root = await makeRoot();
  });
  afterEach(async () => {
    await cleanupRoot(root);
  });

  it("project.files: path ASC, status filter, pagination", async () => {
    const project = await seedProject(root);
    await seedFile(root, project.id, "z.md", "");
    await seedFile(root, project.id, "a.md", "");
    const m = await seedFile(root, project.id, "m.md", "");
    expectSuccess(
      await fileArchive(root, { fileId: m.id, versionId: m.versionId }),
    );

    // No status → ALL files (active + archived), path ASC.
    const all = expectSuccess(
      await projectFiles(root, { projectId: project.id, page: 1, pageSize: 10 }),
    );
    expect(all.items.map((f) => f.path)).toEqual(["a.md", "m.md", "z.md"]);

    const active = expectSuccess(
      await projectFiles(root, {
        projectId: project.id,
        status: "active",
        page: 1,
        pageSize: 10,
      }),
    );
    expect(active.items.map((f) => f.path)).toEqual(["a.md", "z.md"]);

    const archived = expectSuccess(
      await projectFiles(root, {
        projectId: project.id,
        status: "archived",
        page: 1,
        pageSize: 10,
      }),
    );
    expect(archived.items.map((f) => f.path)).toEqual(["m.md"]);

    // Page 2 of size 1 over sorted data → the middle element.
    const page2 = expectSuccess(
      await projectFiles(root, { projectId: project.id, page: 2, pageSize: 1 }),
    );
    expect(page2.items.map((f) => f.path)).toEqual(["m.md"]);
    expect(page2.total).toBe(3);
  });

  it("project.list: name ASC", async () => {
    await seedProject(root, "zeta");
    await seedProject(root, "alpha");
    await seedProject(root, "mid");

    const page = expectSuccess(await projectList(root, { page: 1, pageSize: 10 }));
    expect(page.items.map((p) => p.name)).toEqual(["alpha", "mid", "zeta"]);
  });

  it("file.versions: versionNumber DESC", async () => {
    const project = await seedProject(root);
    const file = await seedFile(root, project.id, "a.md", "one");
    let etag = file.versionId;
    for (const content of ["two", "three"]) {
      const updated = expectSuccess(
        await fileUpdate(root, { fileId: file.id, versionId: etag, content }),
      );
      etag = updated.versionId;
    }

    const page = expectSuccess(
      await fileVersions(root, { fileId: file.id, page: 1, pageSize: 10 }),
    );
    expect(page.items.map((v) => v.versionNumber)).toEqual([3, 2, 1]);
  });

  it("project.history: createdAt DESC, ties broken by versionNumber DESC", async () => {
    const project = await seedProject(root);
    const fileA = await seedFile(root, project.id, "a.md", "a1");
    const fileB = await seedFile(root, project.id, "b.md", "b1");

    // Deterministic timestamps require controlled createdAt, so the
    // extra versions are written through the REAL storage layer
    // (project.history only aggregates FileVersions — it does not
    // care that no ETag flip accompanied them). 2099 dates dominate
    // the seed versions' real now() timestamps.
    const vA2 = {
      id: randomUUID(),
      fileId: fileA.id,
      versionNumber: 2,
      content: "a2",
      createdAt: "2099-01-02T00:00:00.000Z",
    };
    const vA3 = {
      id: randomUUID(),
      fileId: fileA.id,
      versionNumber: 3,
      content: "a3",
      createdAt: "2099-01-02T00:00:00.000Z", // tie with vA2
    };
    const vB2 = {
      id: randomUUID(),
      fileId: fileB.id,
      versionNumber: 2,
      content: "b2",
      createdAt: "2099-01-03T00:00:00.000Z",
    };
    await writeFileVersion(root, project.id, vA2);
    await writeFileVersion(root, project.id, vA3);
    await writeFileVersion(root, project.id, vB2);

    const page = expectSuccess(
      await projectHistory(root, { projectId: project.id, page: 1, pageSize: 10 }),
    );
    expect(page.total).toBe(5);
    // Newest date first; the tied pair ordered versionNumber DESC.
    expect(page.items.slice(0, 3).map((e) => e.versionId)).toEqual([
      vB2.id,
      vA3.id,
      vA2.id,
    ]);
  });
});
