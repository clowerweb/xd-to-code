#!/usr/bin/env node
import { program } from 'commander';
import { convert } from '../src/index.js';

program
  .name('xd-to-code')
  .description('Convert Adobe XD (.xd) files to Vite + Vue + Tailwind CSS projects')
  .version('1.0.0')
  .argument('<xd-file>', 'Path to the .xd file')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--polish', 'Invoke Claude Code to intelligently clean up the generated project (default: true)')
  .option('--no-polish', 'Skip the AI polish step')
  .option('--verbose', 'Show detailed progress')
  .action(async (xdFile, options) => {
    try {
      await convert(xdFile, options);
    } catch (err) {
      console.error(`\n  Error: ${err.message}\n`);
      if (options.verbose) console.error(err.stack);
      process.exit(1);
    }
  });

program.parse();
