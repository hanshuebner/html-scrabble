import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import yaml from 'js-yaml'

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    backend: {
      loadPath: '/locales/{{lng}}.yaml',
      parse: (data: string) => yaml.load(data) as Record<string, string>,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
