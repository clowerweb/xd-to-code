import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Generate vue-router config from the list of generated page components.
 */
export function generateRouter(generatedFiles, outputDir) {
  const routerDir = join(outputDir, 'src', 'router');
  mkdirSync(routerDir, { recursive: true });

  const pages = generatedFiles.filter(f => !f.isOverlay);

  const imports = pages.map(p =>
    `import ${p.componentName} from '@/pages/${p.componentName}.vue';`
  ).join('\n');

  const routes = pages.map(p => {
    const path = p.name === 'home' ? '/' : `/${toRoutePath(p.name)}`;
    return `  { path: '${path}', name: '${toRoutePath(p.name)}', component: ${p.componentName} },`;
  }).join('\n');

  const content = `import { createRouter, createWebHistory } from 'vue-router';
${imports}

const routes = [
${routes}
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
`;

  writeFileSync(join(routerDir, 'index.js'), content);
}

function toRoutePath(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
