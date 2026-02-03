/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { getBaseUrl, getReportsDir, safeFilename } = require('./audit-constants.cjs');
const { toAbsoluteUrl } = require('./audit-net.cjs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function findLighthouseBin() {
  const candidates = process.platform === 'win32' ? ['lighthouse.exe', 'lighthouse.cmd', 'lighthouse'] : ['lighthouse'];
  for (const name of candidates) {
    const binPath = path.join(process.cwd(), 'node_modules', '.bin', name);
    if (fs.existsSync(binPath)) return binPath;
  }
  throw new Error(`Missing lighthouse binary under node_modules/.bin. Install lighthouse (dev dependency) before running this audit.`);
}

function extractMetrics(lhr) {
  const audits = lhr.audits || {};
  const categories = lhr.categories || {};

  const lcpMs = audits['largest-contentful-paint']?.numericValue ?? null;
  const cls = audits['cumulative-layout-shift']?.numericValue ?? null;
  const tbtMs = audits['total-blocking-time']?.numericValue ?? null;
  const inpMs = audits['interaction-to-next-paint']?.numericValue ?? null;

  const perfScore = categories.performance?.score ?? null;
  const a11yScore = categories.accessibility?.score ?? null;
  const seoScore = categories.seo?.score ?? null;
  const bpScore = categories['best-practices']?.score ?? null;

  const opportunityIds = new Set(
    (categories.performance?.auditRefs || [])
      .filter((r) => r.group === 'load-opportunities' || r.group === 'diagnostics')
      .map((r) => r.id),
  );
  const opportunities = [];
  for (const id of opportunityIds) {
    const a = audits[id];
    if (!a) continue;
    const savingsMs = a?.details?.overallSavingsMs ?? null;
    const savingsBytes = a?.details?.overallSavingsBytes ?? null;
    if (savingsMs == null && savingsBytes == null) continue;
    opportunities.push({ id, title: a.title, savingsMs, savingsBytes, displayValue: a.displayValue });
  }
  opportunities.sort((a, b) => (b.savingsMs || 0) - (a.savingsMs || 0));

  return { perfScore, a11yScore, seoScore, bpScore, lcpMs, cls, tbtMs, inpMs, opportunities: opportunities.slice(0, 8) };
}

function toCsvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const baseUrl = getBaseUrl();
  const baseOrigin = baseUrl.origin;
  const basePathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname.slice(0, -1) : baseUrl.pathname;

  const routes = (process.env.AUDIT_LH_ROUTES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const defaultRoutes = ['/', '/feed', '/search', '/compare', '/track/demo-track', '/playlists', '/forum'];
  const paths = routes.length > 0 ? routes : defaultRoutes;

  const lighthouseBin = findLighthouseBin();
  const reportsDir = getReportsDir();
  const rawDir = path.join(reportsDir, 'lighthouse');
  ensureDir(rawDir);

  const chromeFlags = [
    '--headless=new',
    '--no-sandbox',
    '--host-resolver-rules="MAP * 0.0.0.0, EXCLUDE kaospan.github.io, EXCLUDE *.supabase.co"',
  ].join(' ');

  const rows = [];
  for (const routePath of paths) {
    const url = toAbsoluteUrl(routePath, { baseOrigin, basePathname });
    if (!url) continue;

    for (const preset of ['mobile', 'desktop']) {
      const outPath = path.join(rawDir, `${safeFilename(routePath)}-${preset}.json`);
      const args = [
        url,
        '--quiet',
        '--output=json',
        `--output-path=${outPath}`,
        '--only-categories=performance,accessibility,best-practices,seo',
        `--chrome-flags=${chromeFlags}`,
      ];
      if (preset === 'desktop') args.push('--preset=desktop');

      console.log(`LH ${preset}: ${routePath}`);
      execFileSync(lighthouseBin, args, { stdio: 'ignore' });

      const json = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      const lhr = json?.lhr || json;
      const metrics = extractMetrics(lhr);
      rows.push({ routePath, preset, url, ...metrics });
    }
  }

  const csvPath = path.join(reportsDir, 'lighthouse.csv');
  const header = ['routePath', 'preset', 'url', 'perfScore', 'a11yScore', 'seoScore', 'bpScore', 'lcpMs', 'cls', 'tbtMs', 'inpMs', 'topOpportunities'];
  const lines = [header.join(',')];
  for (const row of rows) {
    const topOpp = (row.opportunities || [])
      .map((o) => `${o.id}${o.savingsMs ? `(${Math.round(o.savingsMs)}ms)` : ''}`)
      .join('; ');
    lines.push(
      [
        row.routePath,
        row.preset,
        row.url,
        row.perfScore,
        row.a11yScore,
        row.seoScore,
        row.bpScore,
        row.lcpMs != null ? Math.round(row.lcpMs) : '',
        row.cls,
        row.tbtMs != null ? Math.round(row.tbtMs) : '',
        row.inpMs != null ? Math.round(row.inpMs) : '',
        topOpp,
      ]
        .map(toCsvCell)
        .join(','),
    );
  }
  fs.writeFileSync(csvPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), csvPath)} (${rows.length} runs)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
