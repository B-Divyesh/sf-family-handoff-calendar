export const PRODUCT_SLUG = 'family-handoff-calendar';
export const BILLING_BASE = import.meta.env.VITE_BILLING_BASE || 'https://pilot-api.sociobot.in';
const TOKEN_KEY = `sb_license:${PRODUCT_SLUG}`;
const CACHE_KEY = `${TOKEN_KEY}:verdict`;

export interface LicenseState { unlocked: boolean; token: string; notice: string; }

function tokenFromUrl(): string {
  const url = new URL(location.href);
  const token = url.searchParams.get('license')?.trim() ?? '';
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(CACHE_KEY);
    url.searchParams.delete('license');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return token;
}

export function buyUrl(): string {
  return `${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/checkout`;
}

export function saveLicense(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(CACHE_KEY);
}

export async function checkLicense(force = false): Promise<LicenseState> {
  const justReturned = tokenFromUrl();
  const token = justReturned || localStorage.getItem(TOKEN_KEY) || '';
  if (!token) return { unlocked: false, token: '', notice: '' };
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as { valid?: boolean; checkedAt?: number } | null;
  const fresh = cached?.checkedAt && Date.now() - cached.checkedAt < 86400000;
  if (!force && fresh) return { unlocked: cached?.valid === true, token, notice: cached?.valid ? '' : 'License no longer active.' };
  try {
    const response = await fetch(`${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('verify unavailable');
    const result = await response.json() as { valid: boolean };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() }));
    return { unlocked: result.valid, token, notice: result.valid ? '' : 'License no longer active.' };
  } catch {
    return { unlocked: cached?.valid === true, token, notice: 'License check will retry when you are online.' };
  }
}
