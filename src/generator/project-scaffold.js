import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Scaffold a complete Vite + Vue 3 + Tailwind CSS project.
 */
export function scaffoldProject(outputDir, projectName) {
  // Create directory structure
  const dirs = [
    '',
    'src',
    'src/assets',
    'src/pages',
    'src/components',
    'src/router',
    'public',
  ];

  for (const dir of dirs) {
    mkdirSync(join(outputDir, dir), { recursive: true });
  }

  // Write config files
  writeFileSync(join(outputDir, 'package.json'), packageJson(projectName));
  writeFileSync(join(outputDir, 'vite.config.js'), viteConfig());
  writeFileSync(join(outputDir, 'tailwind.config.js'), tailwindConfig());
  writeFileSync(join(outputDir, 'postcss.config.js'), postcssConfig());
  writeFileSync(join(outputDir, 'index.html'), indexHtml(projectName));
  writeFileSync(join(outputDir, 'src', 'main.js'), mainJs());
  writeFileSync(join(outputDir, 'src', 'App.vue'), appVue());
  writeFileSync(join(outputDir, 'src', 'style.css'), styleCss());
}

function packageJson(name) {
  return JSON.stringify({
    name: name || 'xd-generated-site',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      vue: '^3.5.0',
      'vue-router': '^4.5.0',
    },
    devDependencies: {
      '@vitejs/plugin-vue': '^5.2.0',
      autoprefixer: '^10.4.20',
      postcss: '^8.5.0',
      tailwindcss: '^3.4.0',
      vite: '^6.1.0',
    },
  }, null, 2) + '\n';
}

function viteConfig() {
  return `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
`;
}

function tailwindConfig() {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
}

function postcssConfig() {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function indexHtml(title) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title || 'XD Generated Site'}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;
}

function mainJs() {
  return `import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './style.css';

createApp(App).use(router).mount('#app');
`;
}

function appVue() {
  return `<script setup>
</script>

<template>
  <RouterView />
</template>
`;
}

function styleCss() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}
