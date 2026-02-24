import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';

/**
 * Extract the XD preview image and invoke Claude Code to intelligently
 * clean up the generated project — converting absolute positioning to
 * flex/grid, making it responsive, adding semantic HTML, etc.
 */
export async function aiPolish(zip, outputDir, generatedFiles, options) {
  const absOutputDir = resolve(outputDir);

  // Extract preview image from XD for Claude to reference
  const previewEntry = zip.getEntry('preview.png');
  if (previewEntry) {
    writeFileSync(join(absOutputDir, 'design-preview.png'), previewEntry.getData());
  }

  const pageFiles = generatedFiles
    .map(f => f.isOverlay
      ? `src/components/${f.componentName}.vue`
      : `src/pages/${f.componentName}.vue`
    );

  const prompt = buildPrompt(pageFiles, !!previewEntry, absOutputDir);

  console.log(chalk.magenta('\n  [AI]'), 'Invoking Claude Code for intelligent cleanup...');
  console.log(chalk.dim('        This may take a few minutes.\n'));

  // Always save the prompt so user can re-run or inspect
  writeFileSync(join(absOutputDir, '.claude-polish-prompt'), prompt);

  try {
    await runClaude(absOutputDir, options.verbose);
    console.log(chalk.green.bold('\n  ✓ AI polish complete!\n'));
  } catch (err) {
    console.log(chalk.yellow('\n  ⚠ AI polish skipped:'), err.message);
    console.log(chalk.dim('    You can run it manually later:\n'));
    console.log(chalk.dim(`    cd ${outputDir}`));
    console.log(chalk.dim(`    claude -p "$(cat .claude-polish-prompt)"\n`));
  }
}

function buildPrompt(pageFiles, hasPreview, absOutputDir) {
  const fileList = pageFiles.map(f => `- ${f}`).join('\n');
  const previewInstruction = hasPreview
    ? `\nIMPORTANT: First, read the file ./design-preview.png — this is the original design from Adobe XD. Use it as your visual reference throughout.\n`
    : '';

  return `You are cleaning up an auto-generated Vite + Vue 3 + Tailwind CSS project. The code was mechanically extracted from an Adobe XD design file — it's functional but uses absolute positioning throughout since coordinates were taken directly from the design.
${previewInstruction}
The generated page/component files are:
${fileList}

Please make this production-quality. Work through each file and:

1. LAYOUT — Convert absolute positioning to flex/grid. Group elements into logical sections (hero, nav, team grid, news cards, footer). Keep absolute only for genuinely overlapping decorative elements.

2. RESPONSIVE — The design is 1500px wide (desktop). Add tablet (md:) and mobile breakpoints. Grids should reflow, text should scale, images should resize.

3. SEMANTIC HTML — Use proper elements: nav, header, main, section, footer, article, button, a (router-link), input, textarea. Nav items should be router-links. Contact form should have real inputs.

4. FONTS — The design uses "Avenir" and "Orpheus Pro". Set up font imports in src/style.css (use Nunito Sans as Avenir alternative and Playfair Display as Orpheus Pro alternative from Google Fonts).

5. INTERACTIONS — Mobile menu toggle, hover states on buttons/links, smooth scroll anchors.

6. SHARED COMPONENTS — The nav bar and footer repeat across pages. Extract them into src/components/NavBar.vue and src/components/SiteFooter.vue.

After all changes, run \`npx vite build\` to verify the project compiles.`;
}

function runClaude(cwd, verbose) {
  return new Promise((resolvePromise, reject) => {
    // Point Claude at the prompt file instead of passing inline —
    // avoids shell arg length limits and stdin piping quirks.
    const args = [
      '-p', 'Read and follow the instructions in .claude-polish-prompt',
      '--dangerously-skip-permissions',
      '--output-format', 'stream-json',
    ];
    if (verbose) args.push('--verbose');

    // Clear CLAUDECODE env var so this works even when invoked from within
    // a Claude Code session (e.g. during development/testing)
    const env = { ...process.env };
    delete env.CLAUDECODE;

    const claude = spawn('claude', args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let buffer = '';

    if (claude.stdout) {
      claude.stdout.on('data', (data) => {
        output += data.toString();
        buffer += data.toString();

        // Parse newline-delimited JSON events for progress
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (verbose) {
              // Show tool usage as progress indicators
              if (event.type === 'assistant' && event.message?.content) {
                for (const block of event.message.content) {
                  if (block.type === 'tool_use') {
                    const name = block.name;
                    const file = block.input?.file_path || block.input?.command || '';
                    const short = typeof file === 'string' ? file.split('/').pop() : '';
                    console.log(chalk.dim(`        [Claude] ${name}${short ? ': ' + short : ''}`));
                  }
                }
              }
            } else {
              // Minimal progress: dot per event
              if (event.type === 'assistant') process.stdout.write(chalk.dim('.'));
            }
          } catch { /* skip non-JSON lines */ }
        }
      });
    }
    if (claude.stderr) {
      claude.stderr.on('data', (data) => {
        if (verbose) process.stderr.write(chalk.dim(data.toString()));
      });
    }

    claude.on('error', () => {
      reject(new Error('Claude Code not found. Install it with: npm install -g @anthropic-ai/claude-code'));
    });

    claude.on('close', (code) => {
      if (output) console.log();
      if (code === 0) {
        resolvePromise(output);
      } else {
        reject(new Error(`Claude Code exited with code ${code}`));
      }
    });
  });
}
