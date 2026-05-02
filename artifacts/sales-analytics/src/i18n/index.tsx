import React, { createContext, useContext, useState, useEffect } from 'react';
import { en, TranslationKey } from './en';
import { ar } from './ar';

export type Lang = 'ar' | 'en';

const translations = { ar, en } as Record<Lang, typeof en>;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ar',
  setLang: () => {},
  t: (key) => key,
  isRTL: true,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('lang') as Lang) || 'ar';
  });

  const applyLang = (l: Lang) => {
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  useEffect(() => {
    applyLang(lang);
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem('lang', l);
    applyLang(l);
    setLangState(l);
  };

  const t = (key: TranslationKey): string =>
    (translations[lang] as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRTL: lang === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
