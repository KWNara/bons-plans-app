"use client";

import { useEffect, useId, useState } from "react";
import { searchCities, type BanSuggestion } from "@/lib/cities";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  onSelect: (suggestion: BanSuggestion) => void;
  placeholder?: string;
  label?: string;
};

export function CitySearchInput({ onSelect, placeholder, label }: Props) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BanSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      // Sans cette remise à zéro, effacer un caractère laissait « Recherche… »
      // affiché indéfiniment.
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setFailed(false);

    const timeout = setTimeout(async () => {
      try {
        const results = await searchCities(query, controller.signal);
        setSuggestions(results);
        setLoading(false);
      } catch (err) {
        // Une annulation par la frappe suivante n'est pas une erreur : le
        // rendu est piloté par la requête qui lui succède.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailed(true);
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
      <label htmlFor={inputId} className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5">
        {label ?? "Ville"}
      </label>
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Nom de ville ou code postal"}
        autoComplete="off"
        className="w-full rounded-control border border-ink/15 px-3.5 py-2.5 text-sm focus:border-teal transition-colors"
      />

      {loading && (
        <p className="flex items-center gap-1.5 text-xs text-ink/60 mt-1.5">
          <Spinner size={12} />
          Recherche…
        </p>
      )}

      {failed && (
        <p className="text-xs text-tag mt-1.5">
          La recherche de villes est indisponible. Vérifie ta connexion et réessaie.
        </p>
      )}

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-ink/10 rounded-control mt-1 shadow-raised max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <li key={s.code_insee}>
              <button
                type="button"
                onClick={() => {
                  onSelect(s);
                  setQuery("");
                  setSuggestions([]);
                }}
                className="press w-full text-left px-3.5 py-3 text-sm hover:bg-paper"
              >
                {s.nom} <span className="text-ink/60">({s.code_postal})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
