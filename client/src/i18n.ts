import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslation from './locales/en/translation.json';
import frTranslation from './locales/fr/translation.json';
import arTranslation from './locales/ar/translation.json';
import esTranslation from './locales/es/translation.json';
import ruTranslation from './locales/ru/translation.json';

const resources = {
  en: { translation: enTranslation },
  fr: { translation: frTranslation },
  ar: { translation: arTranslation },
  es: { translation: esTranslation },
  ru: { translation: ruTranslation },
};

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    // language detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    // Special options for react-i18next
    react: {
      useSuspense: true,
    },
  });

export default i18n;
