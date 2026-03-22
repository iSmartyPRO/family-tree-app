import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import ru from './locales/ru.json'
import en from './locales/en.json'
import kg from './locales/kg.json'
import tr from './locales/tr.json'

const savedLang = localStorage.getItem('lang') || 'ru'

i18next
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
      kg: { translation: kg },
      tr: { translation: tr }
    },
    lng: savedLang,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  })

export default i18next
