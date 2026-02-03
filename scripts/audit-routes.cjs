/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const { getArtifactsDir, getBaseUrl, getReportsDir, safeFilename } = require('./audit-constants.cjs');
const { isAllowedNetworkUrl, toAbsoluteUrl, toBasePath } = require('./audit-net.cjs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readAppRoutes() {
  const appPath = path.join(process.cwd(), 'src', 'App.tsx');
  if (!fs.existsSync(appPath)) return [];

  const content = fs.readFileSync(appPath, 'utf8');
  const matches = [...content.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
  const routes = new Set();
  for (const route of matches) {
    if (!route || route === '*') continue;
    routes.add(
      route
        .replace(/:trackId\\b/g, 'demo-track')
        .replace(/:albumId\\b/g, 'demo-album')
        .replace(/:artistId\\b/g, 'demo-artist')
        .replace(/:playlistId\\b/g, 'demo-playlist')
        .replace(/:forumName\\b/g, 'music')
        .replace(/:postId\\b/g, 'demo-post'),
    );
  }
  return [...routes];
}

async function main() {
  const baseUrl = getBaseUrl();
  const baseOrigin = baseUrl.origin;
  const basePathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname.slice(0, -1) : baseUrl.pathname;
  const maxDepth = Number(process.env.AUDIT_MAX_DEPTH || 3);

  const reportsDir = getReportsDir();
  const artifactsDir = getArtifactsDir();
  const crawlArtifactsDir = path.join(artifactsDir, 'crawl');
  ensureDir(reportsDir);
  ensureDir(crawlArtifactsDir);

  const seedRoutes = readAppRoutes();
  const queue = [{ path: '/', depth: 0, source: 'seed' }, ...seedRoutes.map((p) => ({ path: p, depth: 1, source: 'app' }))];

  const visited = new Set();
  const discovered = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const blockedRequests = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (isAllowedNetworkUrl(url, { baseOrigin, basePathname })) return route.continue();
    blockedRequests.push(url);
    return route.abort();
  });

  const page = await context.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    if (item.depth > maxDepth) continue;

    const absoluteUrl = toAbsoluteUrl(item.path, { baseOrigin, basePathname });
    if (!absoluteUrl) continue;
    const normalizedPath = toBasePath(absoluteUrl, { baseOrigin, basePathname });
    if (!normalizedPath) continue;

    if (visited.has(normalizedPath)) continue;
    visited.add(normalizedPath);

    const entry = { path: normalizedPath, url: absoluteUrl, depth: item.depth, source: item.source, title: null };
    discovered.push(entry);

    let response;
    try {
      response = await page.goto(absoluteUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      entry.title = await page.title().catch(() => null);
      entry.status = response ? response.status() : null;
    } catch (err) {
      entry.error = err && err.message ? err.message : String(err);
      entry.status = response ? response.status() : null;
    }

    const screenshotPath = path.join(crawlArtifactsDir, `${safeFilename(normalizedPath)}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    entry.screenshot = path.relative(process.cwd(), screenshotPath).replace(/\\/g, '/');

    let hrefs = [];
    try {
      hrefs = await page.$$eval('a[href]', (els) => els.map((el) => el.href));
    } catch {
      hrefs = [];
    }

    for (const href of hrefs) {
      const candidatePath = toBasePath(href, { baseOrigin, basePathname });
      if (!candidatePath) continue;
      if (candidatePath.startsWith('/assets/')) continue;
      if (candidatePath.startsWith('/favicon')) continue;
      queue.push({ path: candidatePath, depth: item.depth + 1, source: 'crawl' });
    }
  }

  await browser.close();

  const out = {
    baseUrl: baseUrl.toString(),
    generatedAt: new Date().toISOString(),
    maxDepth,
    routes: discovered.sort((a, b) => a.path.localeCompare(b.path)),
    blockedRequests: Array.from(new Set(blockedRequests)).sort(),
  };

  const outfile = path.join(reportsDir, 'routes.json');
  fs.writeFileSync(outfile, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), outfile)} (${out.routes.length} routes)`);
  console.log(`Blocked external requests: ${out.blockedRequests.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
