import { normalizeNode } from './node-normalizer.js';

/**
 * Normalize all artboard trees from raw AGC data into IR nodes.
 * Also resolves artboard dimensions from manifest bounds.
 */
export function normalize(parsedData) {
  const { artboards, interactions } = parsedData;
  const normalizedArtboards = [];

  // Detect overlay artboards from interactions
  const overlayTargets = findOverlayTargets(interactions);

  for (const artboard of artboards) {
    if (!artboard.tree) continue;

    const irTree = normalizeNode(artboard.tree);
    if (!irTree) continue;

    // Apply bounds from manifest
    if (artboard.bounds) {
      irTree.width = artboard.bounds.width;
      irTree.height = artboard.bounds.height;
    }

    const artboardId = artboard.path?.replace('artboard-', '') || artboard.id;

    normalizedArtboards.push({
      name: artboard.name,
      id: artboardId,
      isOverlay: overlayTargets.has(artboardId),
      tree: irTree,
    });
  }

  return normalizedArtboards;
}

/**
 * Find artboard IDs that are overlay (modal) targets.
 */
function findOverlayTargets(interactions) {
  const targets = new Set();
  if (!interactions?.interactions) return targets;

  for (const actions of Object.values(interactions.interactions)) {
    for (const action of actions) {
      if (action.action === 'overlay-transition' && action.properties?.destination) {
        targets.add(action.properties.destination);
      }
    }
  }

  return targets;
}
