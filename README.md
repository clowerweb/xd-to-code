# xd-to-code

Convert Adobe XD (`.xd`) design files into complete, production-ready **Vite + Vue 3 + Tailwind CSS** projects — in about 3 minutes.

The tool runs a deterministic conversion pipeline to extract layouts, text, images, and styles from XD, then optionally invokes [Claude Code](https://docs.anthropic.com/en/docs/claude-code) to intelligently rewrite the output into clean, responsive, semantic code.

## How it works

| Stage | What happens |
|-------|-------------|
| **1. Parse** | Opens the `.xd` file (ZIP archive), reads the manifest, extracts artboard trees and resource mappings |
| **2. Normalize** | Converts XD's AGC node format into a clean intermediate representation — resolving transforms, colors, text styles, compound shapes, images, and component references |
| **3. Scaffold** | Creates a fresh Vite + Vue 3 + Tailwind CSS project with routing, PostCSS, and path aliases preconfigured |
| **4. Generate** | Produces Vue SFC files for each artboard (pages + overlay components), extracts all image assets with meaningful filenames, and wires up Vue Router |
| **5. AI Polish** | Invokes Claude Code to convert absolute positioning to flex/grid, add responsive breakpoints, extract shared components, set up fonts, and add interactions |

## Requirements

- **Node.js** 18+
- **Claude Code** (for the AI polish step) — [install instructions](https://docs.anthropic.com/en/docs/claude-code)

## Install

```bash
git clone <repo-url>
cd xd-to-code
npm install
```

Or link it globally:

```bash
npm link
```

## Usage

```bash
# Basic — generates into ./output
node bin/xd-to-code.js design.xd

# Custom output directory
node bin/xd-to-code.js design.xd -o ./my-site

# Verbose — see artboard details and Claude's progress
node bin/xd-to-code.js design.xd -o ./my-site --verbose

# Skip AI polish (deterministic output only)
node bin/xd-to-code.js design.xd -o ./my-site --no-polish
```

Then run the generated project:

```bash
cd my-site
npm install
npm run dev
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `./output` |
| `--polish` / `--no-polish` | Enable/disable the Claude Code AI polish step | Enabled |
| `--verbose` | Show artboard details and Claude's tool calls in real time | Off |
| `--help` | Show help | |
| `--version` | Show version | |

## What the AI polish does

When enabled (the default), Stage 5 spawns Claude Code with a structured prompt that:

1. **Layout** — Converts absolute positioning to flexbox/grid, grouping elements into logical sections (hero, nav, cards, footer)
2. **Responsive** — Adds tablet and mobile breakpoints (the XD design is treated as desktop)
3. **Semantic HTML** — Replaces divs with `nav`, `header`, `main`, `section`, `footer`, `article`, `button`, `a` (router-link), form inputs, etc.
4. **Fonts** — Sets up Google Fonts imports as alternatives to the design's typefaces
5. **Interactions** — Adds mobile menu toggle, hover states, smooth scroll
6. **Shared components** — Extracts repeated elements (navbar, footer) into reusable Vue components

The prompt is saved to `.claude-polish-prompt` in the output directory. If the polish step is skipped or fails, you can run it manually:

```bash
cd my-site
claude -p "Read and follow the instructions in .claude-polish-prompt"
```

## Project structure

```
xd-to-code/
  bin/
    xd-to-code.js          CLI entry point
  src/
    index.js                Pipeline orchestrator
    parser/
      xd-reader.js          XD/ZIP extraction
      resource-map.js        Image asset mapping
    normalizer/
      normalize.js           Artboard normalization entry point
      node-normalizer.js     AGC → IR conversion (shapes, text, groups, syncRefs)
      transform-resolver.js  Position/dimension/path-bounds resolution
      color-utils.js         RGB/ARGB/hex color conversion
    generator/
      project-scaffold.js    Vite + Vue + Tailwind project creation
      vue-generator.js       Vue SFC file generation
      template-renderer.js   IR → Vue template HTML rendering
      tailwind-mapper.js     Style → Tailwind class mapping
      router-generator.js    Vue Router generation
      asset-extractor.js     Image extraction with meaningful filenames
      ai-polish.js           Claude Code AI cleanup integration
```

## Supported XD features

- Artboards (pages) and overlay artboards (modals/popups)
- Rectangles, circles, lines, and compound shapes (rendered as inline SVGs)
- Pattern fills (images)
- Text with mixed formatting (font, color, size, weight, letter-spacing, line-height)
- Groups and nested groups
- Component instances (syncRef resolution)
- Opacity and blend modes
- Border color, width, and radius
- Interaction-based overlay detection

## Known limitations

- **Component masters with external library references** — syncRef nodes pointing to source GUIDs that don't exist in the file (e.g., from linked XD libraries) are silently skipped
- **Gradients** — Linear/radial gradients are not yet mapped; the first color stop is used as a solid fill
- **Blur and shadow effects** — Not yet extracted from XD styles
- **Figma support** — Planned for a future version

## License

MIT
