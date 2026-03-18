import { useCallback } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, type SupportedLanguage } from './index';

export function useLanguage() {
  const { i18n } = useI18nTranslation();

  const changeLanguage = useCallback(async (lang: SupportedLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  }, [i18n]);

  return {
    language: i18n.language as SupportedLanguage,
    changeLanguage,
    isSupported: (lang: string) => SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage),
  };
}
