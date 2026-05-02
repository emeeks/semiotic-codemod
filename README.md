# `semiotic-codemod`

Automated source transforms for migrating [Semiotic](https://github.com/nteract/semiotic) v1.x / v2.x apps to v3.

> **Pairs with the migration guide.** This package handles the mechanical parts of the upgrade — the rest of the migration is documented at [the Semiotic migration guide](https://semiotic.nteract.io/migration). Read both: the codemod fixes the easy 60% so you can focus on what's actually different in your app.

## Quick start

```bash
# Run the full migration recipe across your source tree
npx semiotic-codemod migration-recipe ./src

# Or pick individual transforms
npx semiotic-codemod realtime-network-frame ./src
npx semiotic-codemod realtime-sankey ./src
npx semiotic-codemod subpath-imports ./src
```

The CLI shells out to [jscodeshift](https://github.com/facebook/jscodeshift), so every jscodeshift flag works:

```bash
# Preview changes without writing
npx semiotic-codemod migration-recipe ./src --dry --print

# Process a custom set of extensions
npx semiotic-codemod subpath-imports ./src --extensions=ts,tsx
```

The transforms default to the `tsx` parser (handles `.js`, `.jsx`, `.ts`, `.tsx`). Pass `--parser=babel` for plain JavaScript codebases without TypeScript type syntax.

## What's in the recipe

| Transform | What it does |
|---|---|
| `realtime-network-frame` | Renames `RealtimeNetworkFrame` → `StreamNetworkFrame` everywhere (imports, JSX, identifier references). Pure rename — same component, new name in v3. |
| `realtime-sankey` | Renames `RealtimeSankey` → `StreamNetworkFrame` and adds `chartType="sankey"` to each JSX usage. v3 folded the bespoke streaming-sankey component into `StreamNetworkFrame`'s sankey chart type. |
| `subpath-imports` | Splits bare `from "semiotic"` imports into the appropriate sub-path entry points (`semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/realtime`, `semiotic/geo`, `semiotic/themes`, `semiotic/recipes`). Cuts bundle size dramatically — sub-path bundles are 30–80% smaller than the full bundle. |
| `migration-recipe` | Runs all of the above, in order. |

Every transform is **idempotent** — running it twice produces no further changes — so it's safe to re-run after manual edits or to apply selectively.

## What's *not* in the recipe

Some migrations are too contextual to automate reliably and are documented manually in the migration guide:

- **`baseMarkProps` removal** — replacements differ per chart family and per use case (now per-mark `lineStyle` / `pieceStyle` / `pointStyle` props plus standard CSS transitions).
- **`FacetController` → `LinkedCharts`** — the rename is mechanical, but the v3 model expects explicit `linkedHover` / `selection` props on each child chart. A blanket rewrite would produce non-idiomatic v3 code.
- **`XYFrame` `lines={[…]}` + `lineDataAccessor` → flat-data `LineChart` HOC** — your data shape changes, not just imports. The migration guide walks through both forms with worked examples.

For the rest, the codemod handles it.

## Subpath manifest

The `subpath-imports` transform groups specifiers by sub-path using a built-in manifest. A specifier not in the manifest stays on the original `from "semiotic"` import (so the file still compiles) — open a PR to add new exports.

To inspect or extend the manifest, look at [`transforms/subpath-imports.js`](./transforms/subpath-imports.js).

## Development

```bash
npm install
npm test          # runs the fixture-based test suite
```

Each transform has paired `*.input.tsx` / `*.output.tsx` fixtures under [`tests/__testfixtures__/`](./tests/__testfixtures__/). The test runner exercises both the transformation (input → output) and idempotency (running the transform twice produces no further changes), plus an end-to-end recipe test that chains all three transforms together (regression cover for the dedupe path that fires when two renames target the same name).

## Style note

The codemod emits jscodeshift / recast's default style for new nodes (semicolons on new statements; original style preserved for unchanged ones). Run your formatter afterward to get a uniform style — most teams pair this with prettier:

```bash
npx semiotic-codemod migration-recipe ./src
npx prettier --write ./src
```

## Related

- **Semiotic** — [github.com/nteract/semiotic](https://github.com/nteract/semiotic)
- **Migration guide** — [semiotic.nteract.io/migration](https://semiotic.nteract.io/migration)
- **Issues with the codemod** — [github.com/emeeks/semiotic-codemod/issues](https://github.com/emeeks/semiotic-codemod/issues)
- **Issues with Semiotic itself** — [github.com/nteract/semiotic/issues](https://github.com/nteract/semiotic/issues)

## License

Apache-2.0. Same as Semiotic.
