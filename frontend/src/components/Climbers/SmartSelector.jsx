import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getClimbers } from '../../utils/climberCache';
import { useClimberSuggestions } from '../../hooks/useClimberSuggestions';
import { getUserFullName } from '../../utils/userUtils';
import api from '../../services/api';

/**
 * SmartSelector - Smart dropdown for selecting climbers/families with suggestions
 * 
 * @param {Object} props
 * @param {string|null} props.value - Selected climber/family ID
 * @param {Function} props.onChange - Callback when selection changes: (item) => void
 * @param {'check-in'|'pass'} props.mode - Context mode
 * @param {boolean} props.allowFamilies - Show families option
 * @param {string} props.placeholder - Input placeholder
 * @param {boolean} props.disabled - Disable the selector
 * @param {boolean} props.autoFocus - Auto-focus input
 * @param {string} props.className - Additional CSS classes
 */
const SmartSelector = ({
  value,
  onChange,
  mode = 'check-in',
  allowFamilies = false,
  placeholder = 'Търсене по име или телефон...',
  disabled = false,
  autoFocus = false,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [allClimbers, setAllClimbers] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loadingClimbers, setLoadingClimbers] = useState(false);
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  const { suggestions, loading: loadingSuggestions } = useClimberSuggestions(mode);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // Load climbers on mount
  useEffect(() => {
    const loadClimbers = async () => {
      setLoadingClimbers(true);
      try {
        const climbers = await getClimbers();
        setAllClimbers(climbers);
      } catch (error) {
        console.error('Error loading climbers:', error);
      } finally {
        setLoadingClimbers(false);
      }
    };

    loadClimbers();
  }, []);

  // Load families if allowed
  useEffect(() => {
    if (!allowFamilies) return;

    const loadFamilies = async () => {
      setLoadingFamilies(true);
      try {
        const response = await api.get('/families');
        setFamilies(response.data || []);
      } catch (error) {
        console.error('Error loading families:', error);
      } finally {
        setLoadingFamilies(false);
      }
    };

    loadFamilies();
  }, [allowFamilies]);

  // Filter climbers based on query
  const filteredClimbers = useMemo(() => {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase().trim();
    const queryParts = queryLower.split(/\s+/).filter(p => p.length > 0);

    return allClimbers.filter(climber => {
      const firstName = (climber.firstName || '').toLowerCase();
      const middleName = (climber.middleName || '').toLowerCase();
      const lastName = (climber.lastName || '').toLowerCase();
      const phone = (climber.phone || '').toLowerCase();

      // Check phone if query contains digits
      if (/\d/.test(queryLower) && phone.includes(queryLower)) {
        return true;
      }

      // Check if all query parts match any of the name fields
      if (queryParts.length === 1) {
        // Single word - match any name field
        const singleQuery = queryParts[0];
        return firstName.includes(singleQuery) ||
               middleName.includes(singleQuery) ||
               lastName.includes(singleQuery);
      } else {
        // Multiple words - match across name fields
        // Try to match each query part to any name field
        const nameFields = [firstName, middleName, lastName].filter(f => f.length > 0);
        return queryParts.every(part => 
          nameFields.some(field => field.includes(part))
        );
      }
    }).slice(0, 50); // Limit to 50 results
  }, [query, allClimbers]);

  // Filter families based on query
  const filteredFamilies = useMemo(() => {
    if (!allowFamilies || !query || query.length < 2) return [];

    const queryLower = query.toLowerCase().trim();
    return families.filter(family => 
      (family.name || '').toLowerCase().includes(queryLower)
    ).slice(0, 20);
  }, [query, families, allowFamilies]);

  // Format climber name for display
  const formatClimberName = useCallback((climber) => {
    return getUserFullName(climber);
  }, []);

  // Find selected item by value prop
  const selectedItem = useMemo(() => {
    if (!value) return null;
    
    // Check in climbers
    const climber = allClimbers.find(c => c.id === value || c._id === value);
    if (climber) {
      return { type: 'user', ...climber };
    }
    
    // Check in families
    if (allowFamilies) {
      const family = families.find(f => (f._id || f.id) === value);
      if (family) {
        return { type: 'family', id: family._id || family.id, name: family.name };
      }
    }
    
    return null;
  }, [value, allClimbers, families, allowFamilies]);

  // Handle input change
  const handleInputChange = useCallback((e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setIsOpen(true);
    setSelectedIndex(-1);
    
    // If user starts typing and it doesn't match selected item, clear selection
    if (selectedItem && newQuery !== (selectedItem.type === 'user' ? formatClimberName(selectedItem) : selectedItem.name)) {
      onChange(null);
    }
  }, [selectedItem, onChange, formatClimberName]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Handle selection
  const handleSelect = useCallback((item) => {
    if (item) {
      onChange(item);
      // Set query to show selected item name
      if (item.type === 'user') {
        setQuery(formatClimberName(item));
      } else {
        setQuery(item.name || '');
      }
    } else {
      // Guest or clear selection
      onChange(null);
      setQuery('');
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [onChange, formatClimberName]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const allResults = [
      ...(query.length >= 2 ? filteredClimbers : []),
      ...(query.length >= 2 && allowFamilies ? filteredFamilies : []),
    ];

    // If showing suggestions (no query), count suggestion items
    const suggestionItems = query.length < 2 ? (
      (suggestions?.recentClimbers?.length || 0) +
      (mode === 'check-in' ? (suggestions?.frequentClimbers?.length || 0) : 0) +
      (mode === 'pass' ? (suggestions?.expiredPassClimbers?.length || 0) : 0) +
      (allowFamilies ? families.length : 0)
    ) : 0;

    const totalItems = query.length >= 2 ? allResults.length : suggestionItems;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < totalItems) {
        // Handle selection based on query state
        if (query.length >= 2) {
          if (selectedIndex < filteredClimbers.length) {
            handleSelect({ type: 'user', ...filteredClimbers[selectedIndex] });
          } else {
            const familyIndex = selectedIndex - filteredClimbers.length;
            handleSelect({ type: 'family', ...filteredFamilies[familyIndex] });
          }
        } else {
          // Handle suggestion selection (simplified - would need to track which group)
          // For now, just close
          setIsOpen(false);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, [isOpen, query, filteredClimbers, filteredFamilies, selectedIndex, suggestions, mode, allowFamilies, families.length, handleSelect]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Check if query contains digits (phone search)
  const isPhoneSearch = useMemo(() => {
    return query && /\d/.test(query);
  }, [query]);

  // Sync query with selected item - show selected name when dropdown closes
  useEffect(() => {
    // Only sync when dropdown closes, not while it's open or while user is typing
    if (!isOpen && document.activeElement !== inputRef.current) {
      if (selectedItem) {
        // Show selected item name in input when dropdown is closed
        const name = selectedItem.type === 'user' 
          ? formatClimberName(selectedItem) 
          : (selectedItem.name || '');
        // Only update if query doesn't match (to avoid infinite loops)
        if (query !== name) {
          setQuery(name);
        }
      } else if (!value && query !== '') {
        // Clear query when no selection
        setQuery('');
      }
    }
  }, [selectedItem, value, isOpen, formatClimberName]);

  // Render suggestion groups
  const renderSuggestions = () => {
    if (loadingSuggestions || loadingClimbers) {
      return (
        <div className="px-3 py-2 text-sm text-gray-500 text-center">
          Зареждане...
        </div>
      );
    }

    return (
      <div className="max-h-96 overflow-y-auto">
        {/* Recent Climbers */}
        {suggestions?.recentClimbers && suggestions.recentClimbers.length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase">
              Последно регистрирани
            </div>
            {suggestions.recentClimbers.map((climber, idx) => (
              <button
                key={climber.id}
                type="button"
                onClick={() => handleSelect({ type: 'user', ...climber })}
                className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${
                  selectedIndex === idx ? 'bg-gray-100' : ''
                }`}
              >
                <div className="text-sm text-gray-900 whitespace-nowrap">
                  {formatClimberName(climber)}
                </div>
                {isPhoneSearch && climber.phone && (
                  <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{climber.phone}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Frequent Climbers (check-in only) */}
        {mode === 'check-in' && suggestions?.frequentClimbers && suggestions.frequentClimbers.length > 0 && (
          <div className="py-2 border-t border-gray-100">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase">
              Често използвани
            </div>
            {suggestions.frequentClimbers.map((climber, idx) => {
              const globalIdx = (suggestions?.recentClimbers?.length || 0) + idx;
              return (
                <button
                  key={climber.id}
                  type="button"
                  onClick={() => handleSelect({ type: 'user', ...climber })}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                    selectedIndex === globalIdx ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 whitespace-nowrap">
                        {formatClimberName(climber)}
                      </div>
                      {isPhoneSearch && climber.phone && (
                        <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{climber.phone}</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Expired Pass Climbers (pass only) */}
        {mode === 'pass' && suggestions?.expiredPassClimbers && suggestions.expiredPassClimbers.length > 0 && (
          <div className="py-2 border-t border-gray-100">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase">
              С изтекли карти
            </div>
            {suggestions.expiredPassClimbers.map((climber, idx) => {
              const globalIdx = (suggestions?.recentClimbers?.length || 0) + idx;
              return (
                <button
                  key={climber.id}
                  type="button"
                  onClick={() => handleSelect({ type: 'user', ...climber })}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                    selectedIndex === globalIdx ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 whitespace-nowrap">
                        {formatClimberName(climber)}
                      </div>
                      {isPhoneSearch && climber.phone && (
                        <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{climber.phone}</div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                      изт. {climber.daysSinceExpiry}д
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Families (pass only, bottom) */}
        {allowFamilies && families.length > 0 && (
          <div className="py-2 border-t border-gray-200">
            <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
              Семейства
            </div>
            {families.map((family, idx) => {
              const baseIdx = (suggestions?.recentClimbers?.length || 0) +
                (mode === 'check-in' ? (suggestions?.frequentClimbers?.length || 0) : 0) +
                (mode === 'pass' ? (suggestions?.expiredPassClimbers?.length || 0) : 0);
              const globalIdx = baseIdx + idx;
              return (
                <button
                  key={family._id || family.id}
                  type="button"
                  onClick={() => handleSelect({ 
                    type: 'family', 
                    id: family._id || family.id,
                    name: family.name 
                  })}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${
                    selectedIndex === globalIdx ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="text-sm text-gray-900 whitespace-nowrap">
                    {family.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                    {family.memberIds?.length || 0} членове
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Guest option for check-in mode */}
        {mode === 'check-in' && (
          <div className="py-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm text-gray-600"
            >
              Гост
            </button>
          </div>
        )}

        {/* Empty state */}
        {(!suggestions || (
          (!suggestions.recentClimbers || suggestions.recentClimbers.length === 0) &&
          (!suggestions.frequentClimbers || suggestions.frequentClimbers.length === 0) &&
          (!suggestions.expiredPassClimbers || suggestions.expiredPassClimbers.length === 0)
        )) && (!allowFamilies || families.length === 0) && mode !== 'check-in' && (
          <div className="px-4 py-3 text-sm text-gray-500 text-center">
            Няма предложения
          </div>
        )}
      </div>
    );
  };

  // Render search results
  const renderSearchResults = () => {
    const hasResults = filteredClimbers.length > 0 || (allowFamilies && filteredFamilies.length > 0);

    if (!hasResults) {
      return (
        <div className="px-3 py-2 text-sm text-gray-500 text-center">
          Няма резултати за "{query}"
        </div>
      );
    }

    return (
      <div className="max-h-96 overflow-y-auto">
        {/* Climbers Results */}
        {filteredClimbers.length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase">
              Катерачи
            </div>
            {filteredClimbers.map((climber, idx) => (
              <button
                key={climber.id}
                type="button"
                onClick={() => handleSelect({ type: 'user', ...climber })}
                className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${
                  selectedIndex === idx ? 'bg-gray-100' : ''
                }`}
              >
                <div className="text-sm text-gray-900 whitespace-nowrap">
                  {formatClimberName(climber)}
                </div>
                {isPhoneSearch && climber.phone && (
                  <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{climber.phone}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Families Results */}
        {allowFamilies && filteredFamilies.length > 0 && (
          <div className="py-2 border-t border-gray-200">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase">
              Семейства
            </div>
            {filteredFamilies.map((family, idx) => {
              const globalIdx = filteredClimbers.length + idx;
              return (
                <button
                  key={family._id || family.id}
                  type="button"
                  onClick={() => handleSelect({ 
                    type: 'family', 
                    id: family._id || family.id,
                    name: family.name 
                  })}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${
                    selectedIndex === globalIdx ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="text-sm text-gray-900 whitespace-nowrap">
                    {family.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                    {family.memberIds?.length || 0} членове
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full min-w-[280px] px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
      />
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full min-w-[320px] mt-1 bg-white border border-gray-200 rounded-md shadow-lg"
          style={{ minWidth: 'max(320px, 100%)' }}
        >
          {query.length < 2 ? renderSuggestions() : renderSearchResults()}
        </div>
      )}
    </div>
  );
};

export default SmartSelector;

