function isSupabaseHost(hostname) {
  return hostname === 'supabase.co' || hostname.endsWith('.supabase.co');
}

function isAllowedNetworkUrl(rawUrl, { baseOrigin, basePathname }) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol === 'data:' || url.protocol === 'blob:') return true;
  if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    return false;
  }

  if (isSupabaseHost(url.hostname)) return true;
  if (url.origin !== baseOrigin) return false;
  return url.pathname === basePathname || url.pathname.startsWith(`${basePathname}/`);
}

function toBasePath(url, { baseOrigin, basePathname }) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  if (u.origin !== baseOrigin) return null;
  if (!(u.pathname === basePathname || u.pathname.startsWith(`${basePathname}/`))) return null;

  const pathWithSearch = `${u.pathname}${u.search}${u.hash}`;
  if (pathWithSearch === basePathname) return '/';
  if (pathWithSearch.startsWith(`${basePathname}/`)) return pathWithSearch.slice(basePathname.length);
  return null;
}

function toAbsoluteUrl(pathnameOrUrl, { baseOrigin, basePathname }) {
  if (!pathnameOrUrl) return null;
  if (pathnameOrUrl.startsWith('http://') || pathnameOrUrl.startsWith('https://')) return pathnameOrUrl;

  const normalized = pathnameOrUrl.startsWith('/') ? pathnameOrUrl : `/${pathnameOrUrl}`;
  const fullPath = normalized === '/' ? `${basePathname}/` : `${basePathname}${normalized}`;
  return `${baseOrigin}${fullPath}`;
}

module.exports = {
  isAllowedNetworkUrl,
  toAbsoluteUrl,
  toBasePath,
};

