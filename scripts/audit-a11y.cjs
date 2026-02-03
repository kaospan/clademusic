/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const axe = require('axe-core');

const { getArtifactsDir, getBaseUrl, getReportsDir, safeFilename } = require('./audit-constants.cjs');
const { isAllowedNetworkUrl, toAbsoluteUrl } = require('./audit-net.cjs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readRoutesJson() {
  const routesPath = path.join(getRseportsDir(), 'routes.json');
  if (!fs.existsSync(routesPath)) {
    throw new Error(`Missing ${routesPath}. Run node scripts/audit-routes.cjs first.`);
  }
  return JSON.parse(fs.readFileSync(routesPath, 'utf8'));
}

function isHashOnlyRoute(p) {
  return typeof p === 'string' && p.startsWith('/#');
}

async function scanRoute({ page, routePath, absoluteUrl, baseOrigin, basePathname }) {
  const blockedRequests = [];
  const failedRequests = [];
  const consoleErrors = [];
  const pageErrors = [];

  await page.context().route('**/*', (route) => {
    const url = route.request().url();
    if (isAllowedNetworkUrl(url, { baseOrigin, basePathname })) return route.continue();
    blockedRequests.push({ url, type: route.request().resourceType(), method: route.request().method() });
    return route.abort();
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), location: msg.location() });
  });
  page.on('pageerror', (err) => {
    pageErrors.push({ message: err.message });
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), type: request.resourceType(), failure: request.failure() });
  });

  let status = null;
  let title = null;
  let navigationError = null;

  try {
    const response = await page.goto(absoluteUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    status = response ? response.status() : null;
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
    title = await page.title().catch(() => null);
  } catch (err) {
    navigationError = err && err.message ? err.message : String(err);
    title = await page.title().catch(() => null);
  }

  await page.addScriptTag({ content: axe.source });
  const axeResults = await page.evaluate(async () => {
    // @ts-ignore - injected global
    return await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
      resultTypes: ['violations'],
    });
  });

  const artifactsDir = getArtifactsDir();
  const screenshotDir = path.join(artifactsDir, 'a11y');
  ensureDir(screenshotDir);
  const screenshotPath = path.join(screenshotDir, `${safeFilename(routePath)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  return {
    status,
    title,
    navigationError,
    screenshot: path.relative(process.cwd(), screenshotPath).replace(/\\/g, '/'),
    violations: (axeResults.violations || []).map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: (v.nodes || []).slice(0, 10).map((n) => ({
        target: n.target,
        html: n.html,
        failureSummary: n.failureSummary,
      })),
    })),
    blockedRequests,
    failedRequests,
    consoleErrors,
    pageErrors,
  };
}

async function main() {
  const baseUrl = getBaseUrl();
  const baseOrigin = baseUrl.origin;
  const basePathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname.slice(0, -1) : baseUrl.pathname;

  const routesJson = readRoutesJson();
  const allPaths = (routesJson.routes || []).map((r) => r.path).filter(Boolean);
  const paths = Array.from(new Set(allPaths)).filter((p) => !isHashOnlyRoute(p));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const results = [];
  for (const p of paths) {
    const absoluteUrl = toAbsoluteUrl(p, { baseOrigin, basePathname });
    if (!absoluteUrl) continue;
    console.log(`A11y: ${p}`);
    const res = await scanRoute({ page, routePath: p, absoluteUrl, baseOrigin, basePathname });
    results.push({ routePath: p, url: absoluteUrl, ...res });
  }

  await browser.close();

  const summary = {
    totalRoutes: results.length,
    totalViolations: results.reduce((sum, r) => sum + (r.violations?.length || 0), 0),
    violationsById: results
      .flatMap((r) => r.violations || [])
      .reduce((acc, v) => {
        acc[v.id] = (acc[v.id] || 0) + 1;
        return acc;
      }, {}),
  };

  const out = { baseUrl: baseUrl.toString(), generatedAt: new Date().toISOString(), summary, results };
  const reportsDir = getReportsDir();
  ensureDir(reportsDir);
  const outfile = path.join(reportsDir, 'a11y.json');
  fs.writeFileSync(outfile, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), outfile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
