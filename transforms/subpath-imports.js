/**
 * Split bare `from "semiotic"` imports into the appropriate sub-path
 * entry points for tree-shaking. v3 ships per-family bundles
 * (`semiotic/xy`, `semiotic/ordinal`, `semiotic/network`,
 * `semiotic/realtime`, `semiotic/geo`, `semiotic/recipes`,
 * `semiotic/themes`, `semiotic/server`) — using the bare `"semiotic"`
 * import pulls every family into the bundle.
 *
 * The transform groups each named export by its owning sub-path,
 * emits one import declaration per sub-path, and drops any specifier
 * not in the manifest into a residual `from "semiotic"` import (so
 * unrecognized symbols still resolve — they just don't get the
 * tree-shake win until the manifest catches up).
 *
 * Usage:
 *   npx @semiotic/codemod subpath-imports src/
 */
"use strict"

// Manifest mapping every named export → owning sub-path. Generated from
// the v3 entry points; keep in sync with src/components/semiotic-*.ts.
// Symbols not listed fall back to the bare "semiotic" import so user
// code keeps compiling — the migration guide explicitly says unmapped
// symbols are a follow-up, not a blocker.
const SUBPATH = {
  // semiotic/xy
  LineChart: "semiotic/xy",
  AreaChart: "semiotic/xy",
  StackedAreaChart: "semiotic/xy",
  Scatterplot: "semiotic/xy",
  ConnectedScatterplot: "semiotic/xy",
  BubbleChart: "semiotic/xy",
  Heatmap: "semiotic/xy",
  ScatterplotMatrix: "semiotic/xy",
  MinimapChart: "semiotic/xy",
  QuadrantChart: "semiotic/xy",
  MultiAxisLineChart: "semiotic/xy",
  CandlestickChart: "semiotic/xy",
  XYCustomChart: "semiotic/xy",
  StreamXYFrame: "semiotic/xy",
  LineChartProps: "semiotic/xy",
  AreaChartProps: "semiotic/xy",
  StackedAreaChartProps: "semiotic/xy",
  ScatterplotProps: "semiotic/xy",
  ConnectedScatterplotProps: "semiotic/xy",
  BubbleChartProps: "semiotic/xy",
  HeatmapProps: "semiotic/xy",
  QuadrantChartProps: "semiotic/xy",
  MultiAxisLineChartProps: "semiotic/xy",
  CandlestickChartProps: "semiotic/xy",
  XYCustomChartProps: "semiotic/xy",

  // semiotic/ordinal
  BarChart: "semiotic/ordinal",
  StackedBarChart: "semiotic/ordinal",
  GroupedBarChart: "semiotic/ordinal",
  SwarmPlot: "semiotic/ordinal",
  BoxPlot: "semiotic/ordinal",
  Histogram: "semiotic/ordinal",
  ViolinPlot: "semiotic/ordinal",
  RidgelinePlot: "semiotic/ordinal",
  DotPlot: "semiotic/ordinal",
  PieChart: "semiotic/ordinal",
  DonutChart: "semiotic/ordinal",
  GaugeChart: "semiotic/ordinal",
  FunnelChart: "semiotic/ordinal",
  SwimlaneChart: "semiotic/ordinal",
  LikertChart: "semiotic/ordinal",
  OrdinalCustomChart: "semiotic/ordinal",
  StreamOrdinalFrame: "semiotic/ordinal",
  BarChartProps: "semiotic/ordinal",
  StackedBarChartProps: "semiotic/ordinal",
  GroupedBarChartProps: "semiotic/ordinal",
  PieChartProps: "semiotic/ordinal",
  DonutChartProps: "semiotic/ordinal",
  OrdinalCustomChartProps: "semiotic/ordinal",

  // semiotic/network
  ForceDirectedGraph: "semiotic/network",
  ChordDiagram: "semiotic/network",
  SankeyDiagram: "semiotic/network",
  TreeDiagram: "semiotic/network",
  Treemap: "semiotic/network",
  CirclePack: "semiotic/network",
  OrbitDiagram: "semiotic/network",
  NetworkCustomChart: "semiotic/network",
  StreamNetworkFrame: "semiotic/network",
  NetworkCustomChartProps: "semiotic/network",

  // semiotic/realtime
  RealtimeLineChart: "semiotic/realtime",
  RealtimeHistogram: "semiotic/realtime",
  RealtimeTemporalHistogram: "semiotic/realtime",
  RealtimeSwarmChart: "semiotic/realtime",
  RealtimeWaterfallChart: "semiotic/realtime",
  RealtimeHeatmap: "semiotic/realtime",

  // semiotic/geo
  ChoroplethMap: "semiotic/geo",
  ProportionalSymbolMap: "semiotic/geo",
  FlowMap: "semiotic/geo",
  DistanceCartogram: "semiotic/geo",

  // semiotic/themes
  ThemeProvider: "semiotic/themes",
  useTheme: "semiotic/themes",

  // semiotic/recipes
  waffleLayout: "semiotic/recipes",
  calendarLayout: "semiotic/recipes",
  flextreeLayout: "semiotic/recipes",
  dagreLayout: "semiotic/recipes",
  marimekkoLayout: "semiotic/recipes",
  bulletLayout: "semiotic/recipes",
  parallelCoordinatesLayout: "semiotic/recipes",
}

function transformer(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)

  // Collect every transformation site first, then mutate. Mutating
  // during the `forEach` walk invalidates sibling paths that haven't
  // been visited yet — we'd skip later `from "semiotic"` imports
  // (e.g. the type-only one in a file with both named and type imports).
  const work = []
  root
    .find(j.ImportDeclaration)
    .filter((p) => p.node.source.value === "semiotic")
    .forEach((p) => {
      const node = p.node
      const allNamed = (node.specifiers || []).every(
        (s) => s.type === "ImportSpecifier",
      )
      if (!allNamed || node.specifiers.length === 0) return

      const buckets = new Map()
      const residual = []
      for (const spec of node.specifiers) {
        const importedName = spec.imported.name
        const target = SUBPATH[importedName]
        if (!target) {
          residual.push(spec)
          continue
        }
        if (!buckets.has(target)) buckets.set(target, [])
        buckets.get(target).push(spec)
      }

      if (buckets.size === 0) return
      work.push({ path: p, node, buckets, residual, isTypeOnly: node.importKind === "type" })
    })

  if (work.length === 0) return file.source

  for (const item of work) {
    const { path: p, node, buckets, residual, isTypeOnly } = item
    const targets = Array.from(buckets.keys()).sort()
    const newImports = targets.map((target) => {
      const specs = buckets
        .get(target)
        .slice()
        .sort((a, b) => a.imported.name.localeCompare(b.imported.name))
      const decl = j.importDeclaration(specs, j.stringLiteral(target))
      if (isTypeOnly) decl.importKind = "type"
      return decl
    })

    if (residual.length > 0) {
      // Keep the residual specifiers on the original `from "semiotic"`
      // declaration; insert new imports immediately before it. ast-types'
      // `path.insertBefore` keeps the most-recently-inserted node closest
      // to the anchor — iterate in reverse so the final order matches
      // `targets`.
      node.specifiers = residual
        .slice()
        .sort((a, b) => a.imported.name.localeCompare(b.imported.name))
      for (let i = newImports.length - 1; i >= 0; i--) {
        p.insertBefore(newImports[i])
      }
    } else {
      // No residual — replace the original declaration with the new
      // imports outright. `replaceWith(array)` swaps one node for many
      // in document order, which is what we want here.
      j(p).replaceWith(newImports)
    }
  }

  return root.toSource({ quote: "double" })
}

module.exports = transformer
module.exports.parser = "tsx"
