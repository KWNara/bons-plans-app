"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type SelectedCity = { id: string; nom: string; code_postal: string };

type CityContextValue = {
  selectedCity: SelectedCity | null;
  setSelectedCity: (city: SelectedCity | null) => void;
  loaded: boolean;
};

const STORAGE_KEY = "bons-plans:selected-city";

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<SelectedCity | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSelectedCityState(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoaded(true);
  }, []);

  function setSelectedCity(city: SelectedCity | null) {
    setSelectedCityState(city);
    if (city) localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
    else localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity, loaded }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity doit être utilisé sous CityProvider");
  return ctx;
}
