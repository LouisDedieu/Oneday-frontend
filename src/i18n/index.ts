import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGE_STORAGE_KEY = 'user_language';
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const getDeviceLanguage = (): SupportedLanguage => {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
  return SUPPORTED_LANGUAGES.includes(locale as SupportedLanguage) 
    ? (locale as SupportedLanguage) 
    : 'en';
};

export const initI18n = async () => {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const language: SupportedLanguage = 
    savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)
      ? (savedLanguage as SupportedLanguage)
      : getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    lng: language,
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    resources: {
      en: { translation: require('./locales/en.json') },
      fr: { translation: require('./locales/fr.json') },
    },
    interpolation: {
      escapeValue: false,
    },
  });

  return i18n;
};

export default i18n;
