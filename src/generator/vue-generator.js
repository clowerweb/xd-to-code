import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { renderTemplate } from './template-renderer.js';

/**
 * Generate Vue SFC files for each normalized artboard.
 */
export function generateVueFiles(normalizedArtboards, assetMap, outputDir) {
  const pagesDir = join(outputDir, 'src', 'pages');
  const componentsDir = join(outputDir, 'src', 'components');

  mkdirSync(pagesDir, { recursive: true });
  mkdirSync(componentsDir, { recursive: true });

  const generated = [];

  for (const artboard of normalizedArtboards) {
    const componentName = toComponentName(artboard.name);
    const templateHtml = renderTemplate(artboard.tree, assetMap);

    const sfc = buildSFC(templateHtml);

    if (artboard.isOverlay) {
      // Overlay artboards become modal components
      const modalSfc = buildModalSFC(templateHtml);
      const filePath = join(componentsDir, `${componentName}.vue`);
      writeFileSync(filePath, modalSfc);
      generated.push({ name: artboard.name, componentName, filePath, isOverlay: true });
    } else {
      const filePath = join(pagesDir, `${componentName}Page.vue`);
      writeFileSync(filePath, sfc);
      generated.push({ name: artboard.name, componentName: `${componentName}Page`, filePath, isOverlay: false });
    }
  }

  return generated;
}

function buildSFC(templateHtml) {
  return `<script setup>
</script>

<template>
${templateHtml}
</template>
`;
}

function buildModalSFC(templateHtml) {
  return `<script setup>
defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>
      <div class="relative z-10">
${templateHtml}
      </div>
    </div>
  </Teleport>
</template>
`;
}

function toComponentName(name) {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
