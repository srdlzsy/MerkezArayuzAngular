const VERSIONED_APP_ASSET_PATTERN = /(?:^|\/)(?:main|polyfills|styles)-[a-z0-9]+\.(?:js|css)$/i;

export function createAppAssetSignature(assetUrls: Iterable<string>): string {
  return Array.from(assetUrls)
    .map((url) => normalizeAssetPath(url))
    .filter((url) => VERSIONED_APP_ASSET_PATTERN.test(url))
    .sort()
    .join('|');
}

export function extractAppAssetSignature(html: string): string {
  const assetUrls: string[] = [];
  const assetPattern = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(assetPattern)) {
    assetUrls.push(match[1]);
  }

  return createAppAssetSignature(assetUrls);
}

function normalizeAssetPath(value: string): string {
  const withoutFragment = value.trim().split('#', 1)[0];
  const withoutQuery = withoutFragment.split('?', 1)[0].replace(/\\/g, '/');

  return withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1);
}
