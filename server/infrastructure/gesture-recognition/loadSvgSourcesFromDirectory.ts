import fs from 'node:fs/promises';
import path from 'node:path';
import { SvgSource } from './createSharpSvgRasterizer';

export async function loadSvgSourcesFromDirectory(directoryPath: string): Promise<SvgSource[]> {
  const fileNames = await fs.readdir(directoryPath);
  const svgFiles = fileNames
    .filter((fileName) => fileName.toLowerCase().endsWith('.svg'))
    .sort((first, second) => first.localeCompare(second));

  return Promise.all(
    svgFiles.map(async (fileName) => {
      const filePath = path.join(directoryPath, fileName);
      const svg = await fs.readFile(filePath, 'utf8');
      const key = path.basename(fileName, '.svg').toLowerCase();
      return { key, svg };
    })
  );
}

