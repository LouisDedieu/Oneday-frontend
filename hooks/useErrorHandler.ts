/**
 * hooks/useErrorHandler.ts
 *
 * Hook pour gérer les erreurs API avec codes d'erreur standardisés.
 * Mappe les codes d'erreur vers des messages localisés via i18n.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { parseErrorCode, ApiError, ParsedError } from '@/types/errors';

export interface UseErrorHandlerReturn {
  getErrorMessage: (error: unknown) => string;
  parseError: (error: unknown) => ParsedError;
  isApiError: (error: unknown) => error is ApiError;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const { t } = useTranslation();

  const isApiError = useCallback((error: unknown): error is ApiError => {
    if (typeof error !== 'object' || error === null) return false;
    const e = error as Record<string, unknown>;
    return typeof e.code === 'string';
  }, []);

  const parseError = useCallback((error: unknown): ParsedError => {
    if (isApiError(error)) {
      const apiError = error as ApiError;
      const parsed = parseErrorCode(apiError.code);
      const localizedMessage = t(parsed.i18nKey, { defaultValue: apiError.message ?? apiError.code });
      return {
        ...parsed,
        message: localizedMessage,
      };
    }

    if (error instanceof Error) {
      return {
        category: 'unknown',
        code: 'UNKNOWN',
        i18nKey: 'errors.unknown',
        message: error.message,
      };
    }

    return {
      category: 'unknown',
      code: 'UNKNOWN',
      i18nKey: 'errors.unknown',
      message: String(error),
    };
  }, [t, isApiError]);

  const getErrorMessage = useCallback((error: unknown): string => {
    return parseError(error).message;
  }, [parseError]);

  return {
    getErrorMessage,
    parseError,
    isApiError,
  };
}
