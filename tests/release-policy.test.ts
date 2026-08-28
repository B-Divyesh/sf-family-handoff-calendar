import { describe, expect, it } from 'vitest';
import readme from '../README.md?raw';
import { BILLING_BASE, buyUrl } from '../src/license';
import config from '../public/staticwebapp.config.json';

type StaticWebAppConfig = {
  globalHeaders: Record<string, string>;
  mimeTypes: Record<string, string>;
  routes: Array<{ route: string; headers: Record<string, string> }>;
};

const releaseConfig = config as StaticWebAppConfig;
const route = (path: string) => releaseConfig.routes.find((item) => item.route === path)?.headers;

describe('release policy regressions', () => {
  it('uses the live Sociobot checkout endpoint by default', () => {
    expect(BILLING_BASE).toBe('https://api.sociobot.in');
    expect(buyUrl()).toBe('https://api.sociobot.in/api/v1/products/family-handoff-calendar/checkout');
  });

  it('documents the live default and staging override accurately', () => {
    expect(readme).toContain('the default is `https://api.sociobot.in`');
    expect(readme).toContain('Set `VITE_BILLING_BASE` at build time to select another registered environment');
  });

  it('ships immutable hashed-asset caching and revalidates PWA entry points', () => {
    expect(route('/assets/*')?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(route('/sw.js')?.['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
    expect(route('/manifest.webmanifest')?.['Cache-Control']).toBe('no-cache');
    expect(releaseConfig.mimeTypes['.webmanifest']).toBe('application/manifest+json');
  });

  it('ships a restrictive browser response policy', () => {
    expect(releaseConfig.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(releaseConfig.globalHeaders['Content-Security-Policy']).toContain('https://api.sociobot.in');
    expect(releaseConfig.globalHeaders['Permissions-Policy']).toContain('geolocation=()');
    expect(releaseConfig.globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(releaseConfig.globalHeaders['X-Content-Type-Options']).toBe('nosniff');
  });
});
