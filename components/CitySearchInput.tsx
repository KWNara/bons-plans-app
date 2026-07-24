"use client";

import { useEffect, useState } from "react";
import { searchCities, type BanSuggestion } from "@/lib/cities";

type Props = {
  onSelect: (suggestion: BanSuggestion) => void;
  placeholder?: string;
};

export function CitySearchInput({ onSelect, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BanSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const results = await searchCities(query, controller.signal);
        setSuggestions(results);
      } catch {
        // requête annulée par la frappe suivante, on ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Nom de ville ou code postal"}
        className="w-full rounded border border-ink/20 px-3 py-2"
      />
      {loading && <p className="text-xs text-ink/40 mt-1">Recherche...</p>}
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-paper border border-ink/10 rounded mt-1 shadow-md max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <li key={s.code_insee}>
              <button
                type="button"
                onClick={() => {
                  onSelect(s);
                  setQuery("");
                  setSuggestions([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-ink/5"
              >
                {s.nom} <span className="text-ink/50">({s.code_postal})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
