/**
 * Rename `RealtimeSankey` → `StreamNetworkFrame chartType="sankey"`.
 *
 * `RealtimeSankey` was a bespoke streaming-sankey component. v3 folded
 * its behavior into `StreamNetworkFrame`'s sankey chart type with the
 * same push API. Two changes per usage:
 *   1. Rewrite the import (`RealtimeSankey` → `StreamNetworkFrame`).
 *   2. On every `<RealtimeSankey …>` JSX element, rename the tag and
 *      add `chartType="sankey"` if it isn't already there.
 *
 * Usage:
 *   npx @semiotic/codemod realtime-sankey src/
 */
"use strict"

const OLD_NAME = "RealtimeSankey"
const NEW_NAME = "StreamNetworkFrame"
const CHART_TYPE_VALUE = "sankey"

function hasChartTypeAttr(openingElement, jscodeshift) {
  return (openingElement.attributes || []).some((attr) =>
    attr.type === "JSXAttribute" &&
    attr.name &&
    attr.name.type === "JSXIdentifier" &&
    attr.name.name === "chartType",
  )
}

function transformer(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  let changed = false

  // 1. Rewrite imports. Track each local binding so we know which JSX
  //    tags / identifier references downstream belong to us.
  const importedAs = new Set()
  root
    .find(j.ImportDeclaration)
    .filter((p) => {
      const src = p.node.source.value
      // Sankey lived in the main bundle and the network sub-path in v2;
      // accept both.
      return typeof src === "string" && (src === "semiotic" || src.startsWith("semiotic/"))
    })
    .forEach((p) => {
      for (const spec of p.node.specifiers || []) {
        if (
          spec.type === "ImportSpecifier" &&
          spec.imported &&
          spec.imported.name === OLD_NAME
        ) {
          importedAs.add(spec.local ? spec.local.name : OLD_NAME)
          spec.imported.name = NEW_NAME
          if (spec.local && spec.local.name === OLD_NAME) {
            spec.local.name = NEW_NAME
          }
          changed = true
        }
      }
      // Dedupe — running the recipe back-to-back with
      // `realtime-network-frame` can leave two `StreamNetworkFrame`
      // specifiers in the same import (both renames target the same
      // name), which is invalid TS. Collapse same-name specifiers.
      p.node.specifiers = dedupeSpecifiers(p.node.specifiers || [])
    })

  if (importedAs.size === 0) return file.source

  // 2. Rename JSX opening + closing tags and add `chartType="sankey"`.
  for (const local of importedAs) {
    root
      .find(j.JSXElement, { openingElement: { name: { name: local } } })
      .forEach((p) => {
        const opening = p.node.openingElement
        const closing = p.node.closingElement
        opening.name.name = NEW_NAME
        if (closing) closing.name.name = NEW_NAME

        if (!hasChartTypeAttr(opening, j)) {
          // Prepend the new attribute so it shows up first in the JSX
          // (matches how a hand-written StreamNetworkFrame usage reads).
          opening.attributes.unshift(
            j.jsxAttribute(
              j.jsxIdentifier("chartType"),
              j.stringLiteral(CHART_TYPE_VALUE),
            ),
          )
        }
      })

    // Self-closing variant lives in JSXElement too, but jscodeshift treats
    // tag identifiers that aren't part of an opening/closing pair as
    // JSXIdentifier nodes — rewrite any leftover identifier references
    // (e.g. `const Cmp = RealtimeSankey`).
    if (local !== NEW_NAME) {
      root
        .find(j.Identifier, { name: local })
        .forEach((p) => {
          const parent = p.parentPath.node
          if (parent.type === "MemberExpression" && parent.property === p.node && !parent.computed) return
          if (parent.type === "Property" && parent.key === p.node && !parent.computed) return
          if (parent.type === "ObjectProperty" && parent.key === p.node && !parent.computed) return
          p.node.name = NEW_NAME
        })
    }
  }

  return changed ? root.toSource({ quote: "double" }) : file.source
}

/** See realtime-network-frame.js — same helper, kept inline so each
 *  transform stays self-contained for users who copy them around. */
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
