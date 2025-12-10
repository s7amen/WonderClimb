import { lazy } from 'react';

// Cache for pending imports to prevent race conditions
const pendingImports = new Map();

/**
 * Creates a lazy-loaded component with retry logic and race condition handling
 * @param {Function} importFn - The dynamic import function (e.g., () => import('./Component'))
 * @param {Object} options - Configuration options
 * @param {number} options.retries - Number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Initial retry delay in ms (default: 1000)
 * @param {string} options.fallback - Fallback component key for error display
 * @returns {React.LazyExoticComponent} Lazy-loaded component
 */
const lazyWithRetry = (importFn, options = {}) => {
  const {
    retries = 3,
    retryDelay = 1000,
    fallback = 'component',
  } = options;

  // Create a unique key for this import based on the function string representation
  const importKey = importFn.toString();

  // Create a retry function with exponential backoff
  const retryImport = async (attempt = 0) => {
    try {
      const module = await importFn();
      return module;
    } catch (error) {
      // Check if it's a network/chunk loading error
      const isChunkError = 
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('ChunkLoadError') ||
        error.name === 'ChunkLoadError' ||
        (error.name === 'TypeError' && error.message?.includes('fetch'));

      if (isChunkError && attempt < retries) {
        // Calculate exponential backoff delay
        const delay = retryDelay * Math.pow(2, attempt);
        
        console.warn(
          `Failed to load ${fallback}, retrying... (${attempt + 1}/${retries})`,
          error
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the import
        return retryImport(attempt + 1);
      }

      // If we've exhausted retries or it's not a chunk error, throw
      console.error(`Failed to load ${fallback} after ${attempt + 1} attempts:`, error);
      throw error;
    }
  };

  // Create a wrapper function that handles race conditions
  const importWithRaceConditionHandling = async () => {
    // Check if there's already a pending import for this component
    if (pendingImports.has(importKey)) {
      const pendingPromise = pendingImports.get(importKey);
      // Wait for the existing promise to resolve/reject
      try {
        return await pendingPromise;
      } catch (error) {
        // If the pending promise failed, try again
        // Remove from cache so we can retry
        pendingImports.delete(importKey);
        // Fall through to create a new import
      }
    }

    // Create a new import promise
    const importPromise = retryImport();
    
    // Store it in the cache
    pendingImports.set(importKey, importPromise);

    try {
      const result = await importPromise;
      // Clean up after successful import (keep it cached for a short time)
      // We'll let it expire naturally or on next navigation
      return result;
    } catch (error) {
      // Clean up on error so we can retry later
      pendingImports.delete(importKey);
      throw error;
    }
  };

  // Create the lazy component
  return lazy(importWithRaceConditionHandling);
};

export default lazyWithRetry;

