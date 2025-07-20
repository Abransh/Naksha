// apps/consultant-dashboard/src/hooks/useDebounce.ts

import { useState, useEffect } from 'react';

/**
 * Hook that delays updating a value until after a specified delay
 * Useful for search inputs to prevent API calls on every keystroke
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook specifically for search functionality
 * Returns the current search term, debounced search term, and loading state
 */
export function useDebouncedSearch(initialValue: string = '', delay: number = 500) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Set loading state when search term changes
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  return {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    setSearchTerm,
  };
}