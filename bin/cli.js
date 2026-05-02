#!/usr/bin/env node
/**
 * Thin wrapper around jscodeshift that resolves a friendly transform
 * name to the bundled script and forwards every other CLI flag to
 * jscodeshift unchanged. Usage:
 *
 *   npx @semiotic/codemod <transform> <path...> [jscodeshift flags]
 *
 * Available transforms:
 *   realtime-network-frame   pure import + JSX rename to StreamNetworkFrame
 *   realtime-sankey          rename + add chartType="sankey" prop
 *   subpath-imports          split bare "semiotic" imports into sub-paths
 *   migration-recipe         run all of the above, in order
 */
"use strict"
const path = require("path")
const { spawnSync } = require("child_process")

const TRANSFORMS = {
  "realtime-network-frame": "transforms/realtime-network-frame.js",
  "realtime-sankey": "transforms/realtime-sankey.js",
  "subpath-imports": "transforms/subpath-imports.js",
}

const RECIPE_ORDER = ["realtime-network-frame", "realtime-sankey", "subpath-imports"]

function printHelp() {
  const lines = [
    "Usage: semiotic-codemod <transform> <path...> [jscodeshift flags]",
    "",
    "Transforms:",
    ...Object.keys(TRANSFORMS).map((name) => `  ${name}`),
    "  migration-recipe   run every transform above in order",
    "",
    "Common flags (forwarded to jscodeshift):",
    "  --dry              preview changes without writing",
    "  --print            print the modified source to stdout",
    "  --extensions=tsx,ts,jsx,js   file extensions to process",
    "  --parser=tsx       parser to use (default: tsx)",
    "",
    "Migration guide: https://nteract-semiotic-docs.netlify.app/migration",
  ]
  console.log(lines.join("\n"))
}

function resolveJscodeshift() {
  try {
    return require.resolve("jscodeshift/bin/jscodeshift.js")
  } catch (err) {
    console.error(
      "Could not locate jscodeshift. Install it as a dependency:\n" +
      "  npm install --save-dev jscodeshift",
    )
    process.exit(1)
  }
}

function runTransform(transformName, jscodeshiftBin, paths, extraFlags) {
  const transformPath = path.resolve(__dirname, "..", TRANSFORMS[transformName])
  const args = [
    jscodeshiftBin,
    "--transform", transformPath,
    // Default to the `tsx` parser so .ts/.tsx files Just Work; users
    // can override with --parser=babel for plain-JS codebases.
    ...(extraFlags.some((a) => a.startsWith("--parser")) ? [] : ["--parser=tsx"]),
    ...(extraFlags.some((a) => a.startsWith("--extensions")) ? [] : ["--extensions=tsx,ts,jsx,js"]),
    ...extraFlags,
    ...paths,
  ]
  console.log(`▶ ${transformName}`)
  const res = spawnSync(process.execPath, args, { stdio: "inherit" })
  if (res.status !== 0) {
    console.error(`✗ ${transformName} failed`)
    process.exit(res.status || 1)
  }
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printHelp()
    return
  }

  const [transform, ...rest] = argv
  if (transform !== "migration-recipe" && !TRANSFORMS[transform]) {
    console.error(`Unknown transform: ${transform}\n`)
    printHelp()
    process.exit(1)
  }

  // Split paths from flags. Anything starting with "-" is a flag forwarded
  // to jscodeshift; everything else is treated as a path. jscodeshift's own
  // flag parser will reject unknowns, so we don't need to validate here.
  const paths = rest.filter((a) => !a.startsWith("-"))
  const flags = rest.filter((a) => a.startsWith("-"))
  if (paths.length === 0) {
    console.error("Error: at least one path is required.\n")
    printHelp()
    process.exit(1)
  }

  const jscodeshiftBin = resolveJscodeshift()
  const transforms = transform === "migration-recipe" ? RECIPE_ORDER : [transform]
  for (const t of transforms) runTransform(t, jscodeshiftBin, paths, flags)

  console.log("\n✅ done. Review the diff and run your test suite.")
}

main()
