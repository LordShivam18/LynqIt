import React, { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';

// Fallback fuzzy search implementation
const fuzzySearch = (items, query, keys, threshold = 0.3) => {
  if (!query || query.length < 2) return items;

  const normalizedQuery = query.toLowerCase();

  return items
    .map(item => {
      let score = 0;
      let matches = [];

      keys.forEach(key => {
        const value = getNestedValue(item, key);
        if (value) {
          const normalizedValue = value.toLowerCase();

          // Exact match gets highest score
          if (normalizedValue.includes(normalizedQuery)) {
            score += 1;
            matches.push({ key, value });
          }
          // Fuzzy matching for typos
          else if (fuzzyMatch(normalizedValue, normalizedQuery, threshold)) {
            score += 0.5;
            matches.push({ key, value });
          }
        }
      });

      return { item, score, matches };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => ({
      ...result.item,
      _fuseScore: 1 - result.score, // Invert score to match Fuse.js format
      _fuseMatches: result.matches
    }));
};

// Helper function to get nested object values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Simple fuzzy matching algorithm
const fuzzyMatch = (text, pattern, threshold) => {
  if (pattern.length > text.length) return false;

  let patternIndex = 0;
  let matches = 0;

  for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
    if (text[i] === pattern[patternIndex]) {
      matches++;
      patternIndex++;
    }
  }

  const matchRatio = matches / pattern.length;
  return matchRatio >= (1 - threshold);
};

const SearchWithFuse = ({
  data = [],
  searchKeys = [],
  onResults,
  placeholder = "Search...",
  threshold = 0.3,
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Perform search when query changes
  useEffect(() => {
    if (query.trim() === '') {
      setIsSearching(false);
      onResults(data, false); // Return all data when no search
      return;
    }

    if (query.trim().length < 2) {
      return; // Don't search for single characters
    }

    setIsSearching(true);

    // Perform fuzzy search using our fallback implementation
    const searchResults = fuzzySearch(data, query, searchKeys, threshold);

    onResults(searchResults, true);
  }, [query, data, searchKeys, threshold, onResults]);

  const handleClear = () => {
    setQuery('');
    setIsSearching(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-lg">
        <Search className="w-4 h-4 text-base-content/60" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-transparent text-sm w-full focus:outline-none"
        />
        {query && (
          <button
            onClick={handleClear}
            className="btn btn-ghost btn-xs btn-circle"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isSearching && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-base-content/60 px-3">
          Searching for "{query}"...
        </div>
      )}
    </div>
  );
};

export default SearchWithFuse;
