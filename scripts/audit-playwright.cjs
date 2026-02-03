/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { chromium, firefox, webkit } = require('playwright');

const { getArtifactsDir, getBaseUrl, getReportsDir, safeFilename } = require('./audit-constants.cjs');
const { isAllowedNetworkUrl, toAbsoluteUrl } = require('./audit-net.cjs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readRoutesJson() {
  const routesPath = path.join(getReportsDir(), 'routes.json');
  if (!fs.existsSync(routesPath)) {
    throw new Error(`Missing ${routesPath}. Run node scripts/audit-routes.cjs first.`);
  }
  return JSON.parse(fs.readFileSync(routesPath, 'utf8'));
}

function isHashOnlyRoute(p) {
  return typeof p === 'string' && p.startsWith('/#');
}

async function auditSinglePage({ browserType, browserName, absoluteUrl, routePath, baseOrigin, basePathname }) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: `clademusic-audit/${browserName}`,
  });

  const blockedRequests = [];
  const failedRequests = [];
  const badResponses = [];
  const consoleMessages = [];
  const pageErrors = [];

  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (isAllowedNetworkUrl(url, { baseOrigin, basePathname })) return route.continue();
    blockedRequests.push({ url, type: route.request().resourceType(), method: route.request().method() });
    return route.abort();
  });

  const page = await context.newPage();
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text(), location: msg.location() });
  });
  page.on('pageerror', (err) => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), method: request.method(), type: request.resourceType(), failure: request.failure() });
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      badResponses.push({
        url: response.url(),
        status,
        type: response.request().resourceType(),
        method: response.request().method(),
      });
    }
  });
  page.on('dialog', (d) => d.dismiss().catch(() => {}));

  await page.addInitScript(() => {
    window.__audit = { errors: [], rejections: [] };
    window.addEventListener(
      'error',
      (e) => {
        window.__audit.errors.push({
          message: e?.message || 'error',
          filename: e?.filename,
          lineno: e?.lineno,
          colno: e?.colno,
        });
      },
      true,
    );
    window.addEventListener('unhandledrejection', (e) => {
      window.__audit.rejections.push({ reason: String(e?.reason || 'unhandledrejection') });
    });
  });

  let status = null;
  let finalUrl = null;
  let title = null;
  let navigationError = null;
  let hasRootContent = false;

  try {
    const response = await page.goto(absoluteUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    status = response ? response.status() : null;
    finalUrl = page.url();

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1_000);

    title = await page.title().catch(() => null);
    hasRootContent = await page.evaluate(() => {
      const root = document.querySelector('#root');
      return !!root && root.textContent && root.textContent.trim().length > 0;
    });
  } catch (err) {
    navigationError = err && err.message ? err.message : String(err);
    finalUrl = page.url();
    title = await page.title().catch(() => null);
  }

  const runtimeSignals = await page.evaluate(() => window.__audit).catch(() => ({ errors: [], rejections: [] }));

  const artifactsDir = getArtifactsDir();
  const screenshotDir = path.join(artifactsDir, 'routes', browserName);
  ensureDir(screenshotDir);
  const screenshotPath = path.join(screenshotDir, `${safeFilename(routePath)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  await browser.close();

  return {
    browser: browserName,
    routePath,
    url: absoluteUrl,
    status,
    finalUrl,
    title,
    navigationError,
    hasRootContent,
    screenshot: path.relative(process.cwd(), screenshotPath).replace(/\\/g, '/'),
    console: consoleMessages,
    pageErrors,
    runtime: runtimeSignals,
    blockedRequests,
    failedRequests,
    badResponses,
  };
}

function computePass(run) {
  if ((run.pageErrors?.length || 0) > 0) return false;

  const runtimeErrors = Array.isArray(run.runtime?.errors) ? run.runtime.errors : [];
  const hasFatalRuntime = runtimeErrors.some((e) => {
    const msg = String(e?.message || '').trim();
    if (!msg) return false;
    if (msg === 'error' || msg === 'Script error.') return false;
    return /Uncaught|ReferenceError|TypeError|SyntaxError/.test(msg);
  });
  if (hasFatalRuntime) return false;

  if (run.navigationError) return false;
  if (!run.hasRootContent) return false;
  return true;
}

async function main() {
  const baseUrl = getBaseUrl();
  const baseOrigin = baseUrl.origin;
  const basePathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname.slice(0, -1) : baseUrl.pathname;

  const routesJson = readRoutesJson();
  const allPaths = (routesJson.routes || []).map((r) => r.path).filter(Boolean);
  const paths = Array.from(new Set(allPaths)).filter((p) => !isHashOnlyRoute(p));

  const criticalPaths = [
    '/',
    '/feed',
    '/search',
    '/compare',
    '/track/demo-track',
    '/profile',
    '/playlists',
    '/forum',
    '/terms',
    '/privacy',
  ];
  for (const p of criticalPaths) {
    if (!paths.includes(p)) paths.push(p);
  }

  const results = [];
  const perRoute = {};

  console.log(`Auditing ${paths.length} routes (Chromium full, cross-browser for ${criticalPaths.length} critical routes)`);

  for (const p of paths) {
    const absoluteUrl = toAbsoluteUrl(p, { baseOrigin, basePathname });
    if (!absoluteUrl) continue;

    const chromiumRun = await auditSinglePage({
      browserType: chromium,
      browserName: 'chromium',
      absoluteUrl,
      routePath: p,
      baseOrigin,
      basePathname,
    });
    results.push(chromiumRun);

    if (criticalPaths.includes(p)) {
      const firefoxRun = await auditSinglePage({
        browserType: firefox,
        browserName: 'firefox',
        absoluteUrl,
        routePath: p,
        baseOrigin,
        basePathname,
      });
      const webkitRun = await auditSinglePage({
        browserType: webkit,
        browserName: 'webkit',
        absoluteUrl,
        routePath: p,
        baseOrigin,
        basePathname,
      });
      results.push(firefoxRun, webkitRun);
    }

    perRoute[p] = perRoute[p] || {};
    const allRuns = results.filter((r) => r.routePath === p);
    for (const run of allRuns) {
      perRoute[p][run.browser] = {
        pass: computePass(run),
        status: run.status,
        hasRootContent: run.hasRootContent,
        navigationError: run.navigationError,
        consoleErrors: (run.console || []).filter((m) => m.type === 'error').length,
        pageErrors: (run.pageErrors || []).length,
        blocked: (run.blockedRequests || []).length,
        failedRequests: (run.failedRequests || []).length,
        badResponses: (run.badResponses || []).length,
        screenshot: run.screenshot,
      };
    }
  }

  const out = {
    baseUrl: baseUrl.toString(),
    generatedAt: new Date().toISOString(),
    networkPolicy: {
      allowed: ['https://kaospan.github.io/clademusic/*', '*.supabase.co'],
      blocked: 'everything else',
    },
    criticalPaths,
    perRoute,
    runs: results.map((r) => ({
      browser: r.browser,
      routePath: r.routePath,
      url: r.url,
      status: r.status,
      finalUrl: r.finalUrl,
      title: r.title,
      navigationError: r.navigationError,
      hasRootContent: r.hasRootContent,
      screenshot: r.screenshot,
      console: (r.console || []).filter((m) => m.type === 'error' || m.type === 'warning'),
      pageErrors: r.pageErrors,
      runtime: r.runtime,
      blockedRequests: r.blockedRequests,
      failedRequests: r.failedRequests,
      badResponses: r.badResponses,
    })),
  };

  const reportsDir = getReportsDir();
  ensureDir(reportsDir);
  const outfile = path.join(reportsDir, 'playwright.json');
  fs.writeFileSync(outfile, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), outfile)} (${out.runs.length} runs)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
