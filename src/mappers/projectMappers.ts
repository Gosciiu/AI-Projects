import type { Project } from "../domain/index.js";
import type { ProjectMetaDTO } from "../dto/index.js";

/**
 * Mappers: Project → ProjectMetaDTO.
 *
 * `defaultFileId` is intentionally NOT exposed: ProjectMetaDTO
 * (Section 7) carries only id/name/versionId. The default file
 * surfaces to clients exclusively through project.open's
 * `defaultFile` branch (ProjectOpenDTO, assembled in the operation).
 */
export function toProjectMetaDTO(project: Project): ProjectMetaDTO {
  return {
    id: project.id,
    name: project.name,
    versionId: project.versionId,
  };
}
