import { readXD } from './parser/xd-reader.js';
import { buildAssetMap } from './parser/resource-map.js';
import { normalize } from './normalizer/normalize.js';
import { scaffoldProject } from './generator/project-scaffold.js';
import { extractAssets } from './generator/asset-extractor.js';
import { generateVueFiles } from './generator/vue-generator.js';
import { generateRouter } from './generator/router-generator.js';
import { aiPolish } from './generator/ai-polish.js';
import chalk from 'chalk';
import { basename } from 'path';

export async function convert(xdFilePath, options) {
  const outputDir = options.output || './output';
  const projectName = basename(xdFilePath, '.xd');
  const verbose = options.verbose || false;
  const shouldPolish = options.polish !== false;

  const totalSteps = shouldPolish ? 5 : 4;

  console.log(chalk.blue.bold('\n  XD → Code Converter\n'));

  // Stage 1: Parse
  console.log(chalk.yellow(`  [1/${totalSteps}]`), 'Parsing XD file...');
  const parsed = readXD(xdFilePath);
  console.log(`        Found ${parsed.artboards.length} artboards, ${Object.keys(parsed.resourceMap).length} resources`);

  if (verbose) {
    for (const ab of parsed.artboards) {
      console.log(`        • ${ab.name} (${ab.bounds?.width}×${ab.bounds?.height})`);
    }
  }

  // Stage 2: Normalize
  console.log(chalk.yellow(`  [2/${totalSteps}]`), 'Normalizing design data...');
  const normalizedArtboards = normalize(parsed);
  const assetMap = buildAssetMap(parsed.artboards, parsed.resourceMap);
  console.log(`        Normalized ${normalizedArtboards.length} artboards, ${Object.keys(assetMap).length} images`);

  // Stage 3: Scaffold project
  console.log(chalk.yellow(`  [3/${totalSteps}]`), 'Scaffolding Vite + Vue + Tailwind project...');
  scaffoldProject(outputDir, projectName);

  // Stage 4: Generate
  console.log(chalk.yellow(`  [4/${totalSteps}]`), 'Generating Vue components & extracting assets...');
  const assetCount = extractAssets(parsed.zip, assetMap, outputDir);
  const generatedFiles = generateVueFiles(normalizedArtboards, assetMap, outputDir);
  generateRouter(generatedFiles, outputDir);

  console.log(`        Extracted ${assetCount} images`);
  console.log(`        Generated ${generatedFiles.filter(f => !f.isOverlay).length} pages, ${generatedFiles.filter(f => f.isOverlay).length} components`);

  // Stage 5: AI Polish (optional)
  if (shouldPolish) {
    console.log(chalk.yellow(`  [5/${totalSteps}]`), 'AI-powered cleanup & responsive conversion...');
    await aiPolish(parsed.zip, outputDir, generatedFiles, { verbose });
  }

  // Summary
  console.log(chalk.green.bold('  ✓ Done!\n'));
  console.log(`  Output: ${outputDir}`);
  console.log(chalk.dim(`\n  Next steps:`));
  console.log(chalk.dim(`    cd ${outputDir}`));
  console.log(chalk.dim(`    npm install`));
  console.log(chalk.dim(`    npm run dev\n`));

  return { outputDir, generatedFiles, assetCount };
}
