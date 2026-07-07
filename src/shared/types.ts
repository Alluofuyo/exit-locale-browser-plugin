export type ProxyMode = 'direct' | 'system' | 'manual';

export interface ProxyProfile {
  id: string;
  name: string;
  mode: ProxyMode;
  host?: string;
  port?: number;
}

export interface LocaleProfile {
  id: string;
  name: string;
  languages: string[];
  timezone: string;
  latitude?: number;
  longitude?: number;
}

export interface SiteRule {
  id: string;
  enabled: boolean;
  hostnamePattern: string;
  proxyProfileId: string;
  localeProfileId: string;
}

export interface IpCheckSettings {
  providerId: string;
  timeoutMs: number;
  cacheTtlMs: number;
  autoRefreshOnPopupOpen: boolean;
}

export interface ExtensionSettings {
  schemaVersion: 1;
  enabled: boolean;
  defaultProxyProfileId: string;
  defaultLocaleProfileId: string;
  proxyProfiles: ProxyProfile[];
  localeProfiles: LocaleProfile[];
  siteRules: SiteRule[];
  ipCheck: IpCheckSettings;
}

export interface EffectiveRule {
  url: string;
  enabled: boolean;
  proxyProfile: ProxyProfile;
  localeProfile: LocaleProfile;
  siteRule?: SiteRule;
}

export type IpCheckErrorCode =
  | 'network_error'
  | 'timeout'
  | 'rate_limited'
  | 'invalid_response'
  | 'unsupported_provider';

export interface IpCheckError {
  code: IpCheckErrorCode;
  message: string;
}

export interface IpCheckResult {
  status: 'success' | 'failure';
  providerId: string;
  checkedAt: string;
  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  isp?: string;
  asn?: string;
  timezone?: string;
  error?: IpCheckError;
}

export type RuntimeMessage =
  | { type: 'PING' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: ExtensionSettings }
  | { type: 'GET_EFFECTIVE_RULE'; url: string }
  | { type: 'CHECK_CURRENT_EXIT'; force?: boolean }
  | { type: 'GET_LAST_EXIT_CHECK' };

export type RuntimeResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
