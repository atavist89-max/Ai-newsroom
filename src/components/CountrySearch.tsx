import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Check } from 'lucide-react';
import { cn, getCountryFlag } from '../lib/utils';
import { countries, continents } from '../data/countries';
import type { Country } from '../types';

interface CountrySearchProps {
  value: Country;
  onChange: (country: Country) => void;
}

export function CountrySearch({ value, onChange }: CountrySearchProps) {
  const [query, setQuery] = useState(value.name);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries.slice(0, 15);
    return countries.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query]);

  const handleSelect = useCallback((country: Country) => {
    onChange(country);
    setQuery(country.name);
    setIsOpen(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  }, []);

  // Close on tap outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery(value.name);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [value.name]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search country..."
          className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-700 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-[1001] w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-[60vh] overflow-auto">
          {filtered.map(country => {
            const isSelected = country.code === value.code;
            const continent = continents[country.continentCode];
            return (
              <button
                key={country.code}
                onClick={() => handleSelect(country)}
                className={cn(
                  "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors min-h-[48px]",
                  isSelected ? "bg-blue-900/30" : "hover:bg-slate-700"
                )}
              >
                <span className="text-xl leading-none">{getCountryFlag(country.code)}</span>
                <div className="flex-1 min-w-0">
                  <span className={cn("font-medium text-sm", isSelected ? "text-white" : "text-slate-200")}>
                    {country.name}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">
                    ({continent?.name || country.continent})
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
