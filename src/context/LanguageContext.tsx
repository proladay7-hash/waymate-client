import React, { createContext, useContext, useState, ReactNode } from 'react';
import { translations, Language, TranslationKey } from '../i18n/translations';

export type UnitSystem = 'KM' | 'MILES';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
  unit: UnitSystem;
  setUnit: (unit: UnitSystem) => void;
  toggleUnit: () => void;
  formatDistance: (km: number) => string;
  formatSpeed: (kmh: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ENG');
  const [unit, setUnit] = useState<UnitSystem>('KM');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ENG' ? 'VIE' : 'ENG'));
  };

  const toggleUnit = () => {
    setUnit((prev) => (prev === 'KM' ? 'MILES' : 'KM'));
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? translations.ENG[key] ?? key;
  };

  const formatDistance = (km: number): string => {
    if (unit === 'MILES') {
      const miles = Math.round(km * 0.621371);
      return `${miles} ${language === 'VIE' ? 'Dặm' : 'Miles'}`;
    }
    return `${km} KM`;
  };

  const formatSpeed = (kmh: number): string => {
    if (unit === 'MILES') {
      const mph = Math.round(kmh * 0.621371);
      return `${mph} mph`;
    }
    return `${kmh} km/h`;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        unit,
        setUnit,
        toggleUnit,
        formatDistance,
        formatSpeed,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
