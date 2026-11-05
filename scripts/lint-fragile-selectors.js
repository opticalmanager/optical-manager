// scripts/lint-fragile-selectors.js
// Automated Anti-Regression Scanner for Optical Manager
// Detects fragile positional DOM selectors in CSS, inline <style>, and styled templates.

const fs = require('fs');
const path = require('path');

const FORBIDDEN_PATTERNS = [
  { pattern: />\s*div:first-child/g, name: "Positional first-child selector (> div:first-child)" },
  { pattern: />\s*div:nth-child/g, name: "Positional nth-child selector (> div:nth-child)" },
  { pattern: /overflow-hidden\s*>\s*div/g, name: "Fragile overflow container direct child selector" },
  { pattern: /h-screen\s*>\s*div/g, name: "Fragile h-screen container direct child selector" },
];

const SCAN_DIRS = ['app', 'components', 'styles'];

function scanDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDir(fullPath, results);
      }
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const { pattern, name } of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          results.push({ file: fullPath, violation: name });
        }
      }
    }
  }
  return results;
}

const violations = SCAN_DIRS.flatMap(dir => scanDir(path.join(process.cwd(), dir)));

if (violations.length > 0) {
  console.error("\n❌ Anti-Regression Check Failed! Found dangerous positional selectors:");
  violations.forEach(v => console.error(`  - ${path.relative(process.cwd(), v.file)}: ${v.violation}`));
  console.error("\nFix: Use explicit semantic classes or attributes (e.g. print:hidden, [data-sidebar]) instead of positional DOM selectors.\n");
  process.exit(1);
} else {
  console.log("✅ Anti-Regression Check Passed: Zero fragile positional selectors detected across app/, components/, and styles/.");
  process.exit(0);
}
