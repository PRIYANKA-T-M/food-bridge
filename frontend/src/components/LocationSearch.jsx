import React, { useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';

const LocationSearch = ({ onSelect, placeholder = 'Search city, area, landmark, or address' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchLocation = async (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        q: value,
        format: 'json',
        addressdetails: '1',
        limit: '5'
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      const data = await response.json();
      setResults(data);
      if (!data.length) setError('No matching locations found.');
    } catch {
      setError('Location search failed. Try a more specific address.');
    } finally {
      setLoading(false);
    }
  };

  const chooseResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    setQuery(result.display_name);
    setResults([]);
    onSelect([lat, lng], result);
  };

  return (
    <div className="relative">
      <form onSubmit={searchLocation} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </form>

      {(results.length > 0 || error) && (
        <div className="absolute z-[1200] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {error && <p className="px-3 py-2 text-sm text-red-600">{error}</p>}
          {results.map((result) => (
            <button
              key={`${result.place_id}-${result.lat}-${result.lon}`}
              type="button"
              onClick={() => chooseResult(result)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <span className="text-slate-700 dark:text-slate-200">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
