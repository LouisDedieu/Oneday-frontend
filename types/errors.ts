export type ErrorCategory =
  | 'auth'
  | 'video'
  | 'trip'
  | 'destination'
  | 'share'
  | 'network'
  | 'server';

export interface ApiError {
  code: string;
  message?: string;
  details?: string;
}

export interface ParsedError {
  category: ErrorCategory | 'unknown';
  code: string;
  i18nKey: string;
  message: string;
}

export const ERROR_CATEGORY_MAP: Record<string, ErrorCategory> = {
  AUTH: 'auth',
  TOKEN: 'auth',
  SESSION: 'auth',
  EMAIL: 'auth',
  PASSWORD: 'auth',
  VIDEO: 'video',
  URL: 'video',
  ANALYSIS: 'video',
  TRIP: 'trip',
  DESTINATION: 'destination',
  SHARE: 'share',
  NETWORK: 'network',
  TIMEOUT: 'network',
  CONNECTION: 'network',
  SERVER: 'server',
  DATABASE: 'server',
  INTERNAL: 'server',
};

export function parseErrorCode(code: string): ParsedError {
  const parts = code.split('_');
  const categoryKey = parts[0]?.toUpperCase() ?? 'UNKNOWN';
  const errorCode = parts.slice(1).join('_').toLowerCase() ?? 'unknown';

  const mappedCategory = ERROR_CATEGORY_MAP[categoryKey];
  const category: ErrorCategory | 'unknown' = mappedCategory ?? 'unknown';
  
  const i18nKey = mappedCategory !== undefined 
    ? `errors.${mappedCategory}.${errorCode}`
    : 'errors.unknown';

  return {
    category,
    code,
    i18nKey,
    message: code,
  };
}
