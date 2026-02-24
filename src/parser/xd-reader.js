import AdmZip from 'adm-zip';

/**
 * Opens an .xd file (ZIP archive) and extracts all structural data:
 * manifest, artboard trees, resource map, and interactions.
 */
export function readXD(xdFilePath) {
  const zip = new AdmZip(xdFilePath);
  const manifest = JSON.parse(zip.getEntry('manifest').getData().toString('utf8'));

  const artboards = extractArtboards(manifest, zip);
  const resourceMap = buildResourceMap(manifest);
  const interactions = extractInteractions(zip);

  return { zip, manifest, artboards, resourceMap, interactions };
}

function extractArtboards(manifest, zip) {
  const artboards = [];
  const artworkNode = manifest.children?.find(c => c.name === 'artwork');
  if (!artworkNode) return artboards;

  for (const child of artworkNode.children) {
    // Skip pasteboard
    if (child.name === 'pasteboard') continue;

    const agcPath = `${artworkNode.path}/${child.path}/graphics/graphicContent.agc`;
    const entry = zip.getEntry(agcPath);
    if (!entry) continue;

    const agcData = JSON.parse(entry.getData().toString('utf8'));
    const tree = agcData.children?.[0] || null;

    artboards.push({
      name: child.name,
      id: child.id,
      path: child.path,
      bounds: child['uxdesign#bounds'] || null,
      viewport: child['uxdesign#viewport'] || null,
      tree,
    });
  }

  return artboards;
}

function buildResourceMap(manifest) {
  const resourceMap = {};
  const resourcesNode = manifest.children?.find(c => c.name === 'resources');
  if (!resourcesNode?.components) return resourceMap;

  for (const comp of resourcesNode.components) {
    if (comp.rel === 'primary' && comp.path) {
      // The path is the hash filename, and the id is the UUID
      const hash = comp.path;
      const ext = mimeToExt(comp.type);
      resourceMap[hash] = {
        id: comp.id,
        zipPath: `resources/${hash}`,
        mimeType: comp.type,
        ext,
      };
    }
  }

  return resourceMap;
}

function mimeToExt(mimeType) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/svg+xml': '.svg',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };
  return map[mimeType] || '.bin';
}

function extractInteractions(zip) {
  const entry = zip.getEntry('interactions/interactions.json');
  if (!entry) return { interactions: {} };
  return JSON.parse(entry.getData().toString('utf8'));
}
