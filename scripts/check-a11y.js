#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const reportPath = path.join(process.cwd(), 'a11y-report.json')

// ── Read report ─────────────────────────────────────────────────────────────
let report
try {
  const raw = fs.readFileSync(reportPath, 'utf-8')
  report = JSON.parse(raw)
} catch (err) {
  console.error('❌  Failed to read a11y-report.json:', err.message)
  console.error('    Run `npm run test:e2e` first to generate the report.')
  process.exit(1)
}

// ── Collect all violations across pages ─────────────────────────────────────
const allViolations = (report.pages ?? []).flatMap(p => p.violations ?? [])

const critical = allViolations.filter(v => v.impact === 'critical')
const serious  = allViolations.filter(v => v.impact === 'serious')

// ── Report and exit ─────────────────────────────────────────────────────────
if (critical.length > 0 || serious.length > 0) {
  console.error(
    `❌  Accessibility check FAILED — ${critical.length} critical, ${serious.length} serious violations found:\n`
  )

  for (const v of [...critical, ...serious]) {
    console.error(`  [${(v.impact ?? 'unknown').toUpperCase()}] ${v.id}`)
    console.error(`  ${v.help}`)
    console.error(`  ${v.helpUrl}`)
    for (const node of v.nodes ?? []) {
      const target = Array.isArray(node.target) ? node.target.join(', ') : String(node.target)
      console.error(`    → ${target}`)
      if (node.failureSummary) {
        console.error(`      ${node.failureSummary.split('\n')[0]}`)
      }
    }
    console.error('')
  }

  process.exit(1)
}

const summary = report.summary ?? {}
console.log('✅  Accessibility checks passed.')
console.log(`    Pages audited : ${(report.pages ?? []).length}`)
console.log(`    Total issues  : ${summary.total ?? allViolations.length} (0 critical, 0 serious)`)
console.log(`    Moderate      : ${summary.moderate ?? 0}`)
console.log(`    Minor         : ${summary.minor ?? 0}`)
process.exit(0)
