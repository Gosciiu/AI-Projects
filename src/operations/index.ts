/**
 * Operations layer — all 18 MCP operations as pure async functions
 * `(root, request) → OperationResponse<T>` (ARCHITECTURE.md
 * Sections 8 & 11). MCP-agnostic: the MCP adapter (later block)
 * passes raw `unknown` request fields in; GVO step 1 happens here,
 * not at the transport boundary.
 *
 * project.delete is deliberately absent and must stay absent
 * (Section 9): deleting a project is a user-only Application Layer
 * function (storage has deleteProject() for the future CLI), never
 * an MCP-facing operation.
 */

// File Operations (7)
export { fileRead } from "./file/fileRead.js";
export { fileCreate } from "./file/fileCreate.js";
export { fileUpdate } from "./file/fileUpdate.js";
export { fileMove } from "./file/fileMove.js";
export { fileArchive } from "./file/fileArchive.js";
export { fileUnarchive } from "./file/fileUnarchive.js";
export { fileDelete } from "./file/fileDelete.js";

// Project Operations (7)
export { projectCreate } from "./project/projectCreate.js";
export { projectList } from "./project/projectList.js";
export { projectOpen } from "./project/projectOpen.js";
export { projectFiles } from "./project/projectFiles.js";
export { projectSearchFulltext } from "./project/projectSearchFulltext.js";
export { projectHistory } from "./project/projectHistory.js";
export { projectSetDefaultFile } from "./project/projectSetDefaultFile.js";

// File Version Operations (4)
export { fileVersions } from "./version/fileVersions.js";
export { fileVersionGet } from "./version/fileVersionGet.js";
export { fileVersionDiff } from "./version/fileVersionDiff.js";
export { fileVersionRestore } from "./version/fileVersionRestore.js";
