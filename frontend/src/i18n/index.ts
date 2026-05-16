import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

/**
 * Configuración de i18next.
 *
 * - Idiomas soportados: inglés (en) y español (es).
 * - El idioma inicial se lee de `localStorage`; si no hay nada se usa
 *   el del navegador o `en` como fallback.
 * - `interpolation.escapeValue: false` porque React ya escapa.
 */
const STORAGE_KEY = 'dndplanner:lang';

const stored =
  typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;

const browserLang =
  typeof navigator !== 'undefined' && navigator.language.startsWith('es')
    ? 'es'
    : 'en';

const initialLang = stored ?? browserLang;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

function syncDocumentLang(lng: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
}

syncDocumentLang(initialLang);

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, lng);
  }
  syncDocumentLang(lng);
});

export default i18n;
