const path = require('path');

const DEFAULT_BASE_URL = 'https://kaospan.github.io/clademusic/';

function getBaseUrl() {
  const baseUrl = process.env.AUDIT_BASE_URL || process.env.BASE_URL || DEFAULT_BASE_URL;
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(normalized);
}

function getRepoRoot() {
  return process.cwd();
}

function getReportsDir() {
  return path.join(getRepoRoot(), 'reports');
}

function getArtifactsDir() {
  return path.join(getRepoRoot(), 'artifacts');
}

function safeFilename(input) {
  const cleaned = String(input)
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180);
  return cleaned.length > 0 ? cleaned : 'root';
}

module.exports = {
  getArtifactsDir,
  getBaseUrl,
  getReportsDir,
  safeFilename,
};

