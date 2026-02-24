import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Extract all referenced images from the XD ZIP to the output assets directory.
 */
export function extractAssets(zip, assetMap, outputDir) {
  const assetsDir = join(outputDir, 'src', 'assets');
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true });
  }

  let extracted = 0;
  for (const [uid, asset] of Object.entries(assetMap)) {
    const entry = zip.getEntry(asset.zipPath);
    if (!entry) {
      console.warn(`  Warning: Resource not found in ZIP: ${asset.zipPath}`);
      continue;
    }

    const outPath = join(assetsDir, asset.fileName);
    writeFileSync(outPath, entry.getData());
    extracted++;
  }

  return extracted;
}
