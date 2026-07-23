"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import tj from "./translations/tj.json";
import ru from "./translations/ru.json";
import en from "./translations/en.json";

type Lang = "tj" | "ru" | "en";

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const translations: Record<Lang, Record<string, string>> = {
  tj: flatten(tj),
  ru: flatten(ru),
  en: flatten(en),
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "tj";
    const saved = localStorage.getItem("nexara_lang") as Lang;
    return saved && ["tj", "ru", "en"].includes(saved) ? saved : "tj";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("nexara_lang", l);
  }, []);

  const t = useCallback(
    (key: string) => translations[lang]?.[key] || translations.en?.[key] || key,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

function flatten(obj: any, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    const val = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      Object.assign(result, flatten(val, fullKey));
    } else if (typeof val === "string") {
      result[fullKey] = val;
    }
  }
  return result;
}
