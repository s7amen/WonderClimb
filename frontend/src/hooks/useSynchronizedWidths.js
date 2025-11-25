import { useState, useEffect, useRef } from 'react';

/**
 * Hook for synchronizing widths of elements across multiple cards
 * @param {Array} items - Array of items to measure (used to reset when items change)
 * @returns {Object} - { widths, handleMeasurement }
 */
export const useSynchronizedWidths = (items = []) => {
  const [widths, setWidths] = useState({});
  const measurementsRef = useRef({});

  // Callback to receive measurements from cards
  const handleMeasurement = (type, width) => {
    if (!measurementsRef.current[type]) {
      measurementsRef.current[type] = [];
    }
    
    // Add measurement if not already present and width is valid
    const exists = measurementsRef.current[type].some(m => Math.abs(m - width) < 1);
    if (!exists && width > 0) {
      measurementsRef.current[type].push(width);
      
      // Update max width for this type
      const maxWidth = Math.max(...measurementsRef.current[type]);
      
      setWidths(prev => {
        if (prev[type] !== maxWidth) {
          return { ...prev, [type]: maxWidth };
        }
        return prev;
      });
    }
  };

  // Reset measurements when items change
  useEffect(() => {
    measurementsRef.current = {};
    setWidths({});
  }, [items.length]);

  return { widths, handleMeasurement };
};

