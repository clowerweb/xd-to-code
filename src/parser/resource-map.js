/**
 * Scans all artboard IR trees to collect image UIDs referenced by pattern fills,
 * and builds a mapping from UID → meaningful asset filename.
 */
export function buildAssetMap(artboards, resourceMap) {
  const uidToName = new Map();

  for (const artboard of artboards) {
    if (artboard.tree) {
      collectImageUIDs(artboard.tree, uidToName);
    }
  }

  const assetMap = {};
  const usedNames = new Set();

  for (const [uid, elementName] of uidToName) {
    const resource = resourceMap[uid];
    if (!resource) continue;

    let slug = slugify(elementName);
    if (!slug) slug = uid.slice(0, 12);

    // Deduplicate
    let finalName = slug;
    let counter = 2;
    while (usedNames.has(finalName)) {
      finalName = `${slug}-${counter}`;
      counter++;
    }
    usedNames.add(finalName);

    assetMap[uid] = {
      ...resource,
      fileName: `${finalName}${resource.ext}`,
    };
  }

  return assetMap;
}

function collectImageUIDs(node, uidToName) {
  // Check for pattern fill with UID
  const patternUID = node.style?.fill?.pattern?.meta?.ux?.uid;
  if (patternUID && !uidToName.has(patternUID)) {
    uidToName.set(patternUID, node.name || patternUID.slice(0, 12));
  }

  // Recurse into children
  const children = node.artboard?.children || node.group?.children || node.children || [];
  for (const child of children) {
    collectImageUIDs(child, uidToName);
  }

  // Also check states for syncRef resolution
  if (node.meta?.ux?.states) {
    for (const state of Object.values(node.meta.ux.states)) {
      collectImageUIDs(state, uidToName);
    }
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
