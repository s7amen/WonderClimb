import { useState, useEffect } from 'react';
import { climberSuggestionsAPI } from '../services/api';

let suggestionsCache = {};
let cacheTimestamps = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch and cache climber suggestions
 * @param {string} context - 'check-in' or 'pass'
 * @returns {Object} { suggestions, loading, error }
 */
export const useClimberSuggestions = (context = 'check-in') => {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check cache first
    const cacheKey = context;
    const cached = suggestionsCache[cacheKey];
    const cacheTime = cacheTimestamps[cacheKey];

    if (cached && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      setSuggestions(cached);
      setLoading(false);
      return;
    }

    // Fetch suggestions
    const fetchSuggestions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await climberSuggestionsAPI.getSuggestions(context);
        const data = response.data || {};

        // Cache the results
        suggestionsCache[cacheKey] = data;
        cacheTimestamps[cacheKey] = Date.now();

        setSuggestions(data);
      } catch (err) {
        console.error('Error fetching climber suggestions:', err);
        setError(err);
        // Use cached data if available, even if expired
        if (cached) {
          setSuggestions(cached);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [context]);

  return { suggestions, loading, error };
};

/**
 * Clear suggestions cache
 * @param {string} context - Optional context to clear, or 'all' to clear all
 */
export const clearSuggestionsCache = (context = 'all') => {
  if (context === 'all') {
    suggestionsCache = {};
    cacheTimestamps = {};
  } else {
    delete suggestionsCache[context];
    delete cacheTimestamps[context];
  }
};


