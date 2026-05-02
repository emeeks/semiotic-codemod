/**
 * Rename `RealtimeNetworkFrame` → `StreamNetworkFrame`.
 *
 * `RealtimeNetworkFrame` was removed in Semiotic v3 — what used to be a
 * separate component is now `StreamNetworkFrame`, which covers both
 * bounded and streaming network charts. This transform is a pure
 * rename: imports, JSX, type references, and any local variable named
 * after the legacy export.
 *
 * Usage:
 *   npx @semiotic/codemod realtime-network-frame src/
 */
"use strict"

const OLD_NAME = "RealtimeNetworkFrame"
const NEW_NAME = "StreamNetworkFrame"

function transformer(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  let changed = false

  // 1. Rename the import specifier on every `from "semiotic"` /
  //    `from "semiotic/network"` declaration that pulls it in. Track the
  //    local binding name so JSX/identifier rewrites below only touch the
  //    bindings introduced by the import (avoids mangling unrelated
  //    user-defined symbols that happen to share the name).
  const importedAs = new Set()
  root
    .find(j.ImportDeclaration)
    .filter((p) => {
      const src = p.node.source.value
      return typeof src === "string" && (src === "semiotic" || src.startsWith("semiotic/"))
    })
    .forEach((p) => {
      for (const spec of p.node.specifiers || []) {
        if (
          spec.type === "ImportSpecifier" &&
          spec.imported &&
          spec.imported.name === OLD_NAME
        ) {
          // Track the local alias (defaults to the imported name when no
          // `as` was used) so we know which identifiers downstream are
          // ours to rewrite.
          importedAs.add(spec.local ? spec.local.name : OLD_NAME)
          spec.imported.name = NEW_NAME
          // If the local alias was the default-imported name, rename it
          // too so the rest of the file stays consistent.
          if (spec.local && spec.local.name === OLD_NAME) {
            spec.local.name = NEW_NAME
          }
          changed = true
        }
      }
      // Dedupe — running the recipe back-to-back with `realtime-sankey`
      // can leave two `StreamNetworkFrame` specifiers in the same import
      // (one from each rename source), which is invalid TS and trips
      // downstream parsing. Collapse same-name specifiers to one.
      p.node.specifiers = dedupeSpecifiers(p.node.specifiers || [])
    })

  if (importedAs.size === 0) return file.source

  // 2. Rewrite identifier references that match the imported binding(s).
  //    Scopes through to JSX automatically because JSXIdentifier is just
  //    an Identifier in jscodeshift's AST.
  for (const local of importedAs) {
    if (local === NEW_NAME) continue // already correct
    root
      .find(j.Identifier, { name: local })
      .forEach((p) => {
        // Skip property keys / member-expression properties — those are
        // never the import binding (they're foo.RealtimeNetworkFrame, not
        // the imported value). Same for object-literal keys.
        const parent = p.parentPath.node
        if (parent.type === "MemberExpression" && parent.property === p.node && !parent.computed) return
        if (parent.type === "Property" && parent.key === p.node && !parent.computed) return
        if (parent.type === "ObjectProperty" && parent.key === p.node && !parent.computed) return
        p.node.name = NEW_NAME
      })
    // JSXIdentifier nodes are a separate type in some parsers; rewrite
    // those too so `<RealtimeNetworkFrame …>` becomes `<StreamNetworkFrame …>`.
    root
      .find(j.JSXIdentifier, { name: local })
      .forEach((p) => {
        p.node.name = NEW_NAME
      })
  }

  return changed ? root.toSource({ quote: "double" }) : file.source
}

/**
 * Drop duplicate import specifiers (same imported + local name pair).
 * Stable: keeps the first occurrence so any source-order assumptions
 * downstream remain valid.
 */
function dedupeSpecifiers(specs) {
  const seen = new Set()
  const out = []
  for (const spec of specs) {
    if (spec.type !== "ImportSpecifier") { out.push(spec); continue }
    const key = `${spec.imported.name}::${spec.local ? spec.local.name : spec.imported.name}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(spec)
  }
  return out
}

module.exports = transformer
module.exports.parser = "tsx"
