import { createContext, useContext, useState, useCallback } from 'react';
import es from './es.js';
import en from './en.js';

const langs = { es, en };

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('kleo_lang') || 'es');

  const changeLang = useCallback((newLang) => {
    setLang(newLang);
    localStorage.setItem('kleo_lang', newLang);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, strings: langs[lang] || langs.es }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

/**
 * Simple template interpolation: t('hello', { name: 'Carlos' })
 * Replaces {name} with the value from params.
 */
export function t(str, params) {
  if (!str) return '';
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}
