/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const { getBaseUrl, getReportsDir } = require('./audit-constants.cjs');

function readJson(relPath) {
  const full = path.join(process.cwd(), relPath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function readText(relPath) {
  const full = path.join(process.cwd(), relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function toMdTable(rows) {
  const cols = [
    'Severity(P0–P2)',
    'Type',
    'URL/Path',
    'Repro Steps',
    'Expected',
    'Actual',
    'Console/Network Evidence',
    'Suggested Fix',
    'Acceptance Criteria',
  ];

  const esc = (s) =>
    String(s ?? '')
      .replace(/\r?\n/g, '<br/>')
      .replace(/\|/g, '\\|')
      .trim();

  const header = `| ${cols.join(' | ')} |`;
  const sep = `| ${cols.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((r) =>
      `| ${[
        r.severity,
        r.type,
        r.path,
        esc(r.repro),
        esc(r.expected),
        esc(r.actual),
        esc(r.evidence),
        esc(r.suggestedFix),
        esc(r.acceptance),
      ].join(' | ')} |`,
    )
    .join('\n');
  return `${header}\n${sep}\n${body}\n`;
}

function isFatalJsRun(run) {
  if ((run.pageErrors?.length || 0) > 0) return true;
  const runtimeErrors = Array.isArray(run.runtime?.errors) ? run.runtime.errors : [];
  return runtimeErrors.some((e) => /Uncaught|ReferenceError|TypeError|SyntaxError/.test(String(e?.message || '')));
}

function summariseRunEvidence(run) {
  const parts = [];
  const consoleErrors = (run.console || []).filter((m) => m.type === 'error').map((m) => m.text);
  const firstConsole = consoleErrors[0];
  const pageErr = run.pageErrors?.[0]?.message;

  if (run.navigationError) parts.push(`Navigation error: ${run.navigationError}`);
  if (pageErr) parts.push(`JS error: ${pageErr}`);
  if (firstConsole && firstConsole !== pageErr) parts.push(`Console: ${firstConsole}`);

  const badDoc = (run.badResponses || []).find((r) => r.type === 'document' && r.status >= 400);
  if (badDoc) parts.push(`HTTP: ${badDoc.status} ${badDoc.url}`);

  const blocked = (run.blockedRequests || []).slice(0, 5).map((r) => r.url);
  if (blocked.length) parts.push(`Blocked: ${blocked.join(', ')}${(run.blockedRequests?.length || 0) > 5 ? ' …' : ''}`);

  return parts.join(' | ');
}

function makeIssueId(issue) {
  return `${issue.severity}|${issue.type}|${issue.path}|${issue.actual}`.slice(0, 300);
}

async function main() {
  const baseUrl = getBaseUrl().toString();
  const issues = [];

  const pw = readJson('reports/playwright.json');
  const a11y = readJson('reports/a11y.json');
  const lhCsv = readText('reports/lighthouse.csv');

  if (pw) {
    const chromiumRuns = (pw.runs || []).filter((r) => r.browser === 'chromium');
    for (const run of chromiumRuns) {
      if (!run.hasRootContent || run.navigationError || isFatalJsRun(run)) {
        issues.push({
          severity: 'P0',
          type: 'Runtime/Crash',
          path: run.routePath,
          repro: `Open ${run.url} (or navigate to ${run.routePath} from home).`,
          expected: 'Page renders without uncaught exceptions.',
          actual: isFatalJsRun(run) ? 'Uncaught JS exception during render.' : 'Page did not fully render.',
          evidence: `${summariseRunEvidence(run)}\nScreenshot: ${run.screenshot}`,
          suggestedFix:
            run.pageErrors?.[0]?.message?.includes('formatDurationFull') ||
            run.runtime?.errors?.some((e) => String(e?.message || '').includes('formatDurationFull'))
              ? 'Import and use `formatDurationFull()` from `src/lib/timeFormat.ts` in the affected page(s).'
              : 'Fix the underlying uncaught exception and add an error boundary for route-level failures.',
          acceptance: 'Navigating to the route renders content and produces zero uncaught exceptions.',
          attachments: [run.screenshot],
        });
      }
    }

    const blocked = (pw.runs || [])
      .flatMap((r) => (r.blockedRequests || []).map((b) => ({ url: b.url })))
      .map((b) => b.url);
    const blockedUnique = Array.from(new Set(blocked));
    if (blockedUnique.length > 0) {
      issues.push({
        severity: 'P0',
        type: 'Networking/Policy',
        path: '(multiple)',
        repro: 'Load the site while restricting network calls to `kaospan.github.io/clademusic/*` and `*.supabase.co` only.',
        expected: 'No runtime dependency on third-party origins beyond Supabase.',
        actual: `Site requests assets from other origins (${blockedUnique.length} unique URLs blocked during audit).`,
        evidence: blockedUnique.slice(0, 10).join('\n') + (blockedUnique.length > 10 ? '\n…' : ''),
        suggestedFix: 'Self-host images/assets under `public/` (or `docs/`), or move them into Supabase Storage with proper caching + RLS.',
        acceptance: 'All runtime network requests are only to allowed origins; no blocked requests in Playwright audit.',
        attachments: [],
      });
    }
  }

  if (a11y) {
    const byId = new Map();
    for (const r of a11y.results || []) {
      for (const v of r.violations || []) {
        const key = v.id;
        const entry = byId.get(key) || { id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, routes: [] };
        entry.routes.push({
          routePath: r.routePath,
          sampleTargets: (v.nodes || []).slice(0, 2).map((n) => (n.target || []).join(', ')).join(' | '),
        });
        byId.set(key, entry);
      }
    }

    for (const v of byId.values()) {
      const affectsHome = v.routes.some((r) => r.routePath === '/');
      const severity =
        v.impact === 'critical' || v.impact === 'serious'
          ? affectsHome
            ? 'P0'
            : 'P1'
          : 'P2';

      issues.push({
        severity,
        type: 'Accessibility (axe-core)',
        path: v.routes.map((r) => r.routePath).slice(0, 6).join(', ') + (v.routes.length > 6 ? ' …' : ''),
        repro: `Run axe-core on affected route(s). Rule: ${v.id}.`,
        expected: 'WCAG 2.2 AA compliant markup and interactions.',
        actual: `${v.id}: ${v.help}`,
        evidence: `impact=${v.impact || 'unknown'}\nhelpUrl=${v.helpUrl}\nsampleTargets=${v.routes[0]?.sampleTargets || ''}`,
        suggestedFix: 'Fix the underlying markup per axe guidance; add regression a11y checks in CI.',
        acceptance: `axe-core reports 0 violations for ${v.id} on affected routes.`,
        attachments: [],
      });
    }
  }

  if (lhCsv) {
    const lines = lhCsv.trim().split(/\r?\n/);
    if (lines.length > 1) {
      const header = lines[0].split(',');
      const idx = (name) => header.indexOf(name);
      const perfIdx = idx('perfScore');
      const routeIdx = idx('routePath');
      const presetIdx = idx('preset');
      for (const line of lines.slice(1)) {
        const cols = line.split(',');
        const preset = cols[presetIdx];
        const routePath = cols[routeIdx];
        const perf = Number(cols[perfIdx]);
        if (preset === 'mobile' && Number.isFinite(perf) && perf < 0.9) {
          issues.push({
            severity: 'P1',
            type: 'Performance (Lighthouse)',
            path: routePath,
            repro: `Run Lighthouse (mobile) on ${routePath}.`,
            expected: 'Performance score ≥ 0.90 on key routes.',
            actual: `Performance score ${perf} (< 0.90).`,
            evidence: 'See reports/lighthouse.csv',
            suggestedFix: 'Reduce main-thread JS, eliminate layout shifts (set image dimensions), and avoid loading large media above-the-fold.',
            acceptance: 'Perf score ≥ 0.90 on mobile for the route with stable LCP/CLS/INP.',
            attachments: [],
          });
        }
      }
    }
  }

  const deduped = uniqBy(issues, makeIssueId);

  const outJson = { baseUrl, generatedAt: new Date().toISOString(), issues: deduped };
  const reportsDir = getReportsDir();
  fs.mkdirSync(reportsDir, { recursive: true });

  const jsonPath = path.join(reportsDir, 'bugs.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(outJson, null, 2)}\n`, 'utf8');

  const mdPath = path.join(reportsDir, 'bugs.md');
  fs.writeFileSync(mdPath, toMdTable(deduped), 'utf8');

  console.log(`Wrote ${path.relative(process.cwd(), jsonPath)} (${deduped.length} issues)`);
  console.log(`Wrote ${path.relative(process.cwd(), mdPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

