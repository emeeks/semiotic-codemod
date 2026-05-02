/**
 * Snapshot test suite — for each transform, run it against the input
 * fixture and assert the result matches the output fixture. Keeps the
 * fixtures human-readable (real .tsx files you can lint and tweak in
 * isolation) instead of inline strings.
 */
"use strict"
const fs = require("fs")
const path = require("path")
const jscodeshift = require("jscodeshift")

const FIXTURES = path.join(__dirname, "__testfixtures__")

function runTransform(name, sourceText) {
  const transform = require(path.join("..", "transforms", `${name}.js`))
  const parser = transform.parser || "tsx"
  const j = jscodeshift.withParser(parser)
  const api = { jscodeshift: j, j, stats: () => {}, report: () => {} }
  return transform({ path: "input.tsx", source: sourceText }, api, {})
}

function read(file) {
  return fs.readFileSync(path.join(FIXTURES, file), "utf8")
}

const cases = [
  { name: "realtime-network-frame", input: "realtime-network-frame.input.tsx", output: "realtime-network-frame.output.tsx" },
  { name: "realtime-sankey", input: "realtime-sankey.input.tsx", output: "realtime-sankey.output.tsx" },
  { name: "subpath-imports", input: "subpath-imports.input.tsx", output: "subpath-imports.output.tsx" },
]

describe("transforms", () => {
  for (const c of cases) {
    test(c.name, () => {
      const input = read(c.input)
      const expected = read(c.output)
      const actual = runTransform(c.name, input)
      expect(normalize(actual)).toBe(normalize(expected))
    })

    test(`${c.name} is idempotent — second run is a no-op`, () => {
      const once = runTransform(c.name, read(c.input))
      const twice = runTransform(c.name, once)
      expect(normalize(twice)).toBe(normalize(once))
    })
  }
})

describe("migration-recipe (chained transforms)", () => {
  // Regression: running realtime-sankey + realtime-network-frame in
  // sequence both renamed their targets to `StreamNetworkFrame`, which
  // produced two specifiers of the same name in the import declaration.
  // Each transform now dedupes specifiers in any import declaration it
  // touches, so the final result is well-formed and parseable.
  test("sankey + network rename + subpath split runs end-to-end", () => {
    const input = read("recipe.input.tsx")
    const afterSankey = runTransform("realtime-sankey", input)
    const afterNetwork = runTransform("realtime-network-frame", afterSankey)
    const afterSubpath = runTransform("subpath-imports", afterNetwork)

    // Output should parse cleanly (no duplicate StreamNetworkFrame specifiers)
    // and split into per-subpath imports.
    expect(afterSubpath).not.toMatch(/StreamNetworkFrame[^"]*StreamNetworkFrame/)
    expect(afterSubpath).toMatch(/import \{ StreamNetworkFrame \} from "semiotic\/network"/)
    expect(afterSubpath).toMatch(/import \{ LineChart \} from "semiotic\/xy"/)
    expect(afterSubpath).toMatch(/import \{ BarChart \} from "semiotic\/ordinal"/)
    expect(afterSubpath).toMatch(/import \{ ThemeProvider \} from "semiotic\/themes"/)
    expect(afterSubpath).toMatch(/<StreamNetworkFrame chartType="sankey"/)
  })
})

// Trailing-newline + Windows-line-ending tolerance. jscodeshift's
// recast pretty-printer occasionally drops the final newline; the
// fixtures keep one, so normalize before comparing.
function normalize(s) {
  return s.replace(/\r\n/g, "\n").replace(/\s+$/, "") + "\n"
}
