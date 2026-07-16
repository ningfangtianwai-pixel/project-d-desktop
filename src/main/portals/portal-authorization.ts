import path from "node:path";
import type { PortalConfig } from "../../shared/types.js";

export function isPathWithinOrSame(rootPath: string, candidatePath: string): boolean {
  const root = path.resolve(rootPath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function createAuthorizedSearchPortal(options: {
  resultPath: string;
  selectedFolder: string;
  addPortal: (folderPath: string, name: string) => Promise<PortalConfig>;
}): Promise<PortalConfig> {
  const selectedFolder = path.resolve(options.selectedFolder);
  const resultPath = path.resolve(options.resultPath);
  if (!isPathWithinOrSame(selectedFolder, resultPath)) {
    throw new Error("请选择包含该搜索结果的文件夹");
  }
  return options.addPortal(selectedFolder, path.basename(selectedFolder));
}
