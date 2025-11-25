import { format } from 'date-fns';

/**
 * Format date consistently as dd/mm/yyyy
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date as dd/mm/yyyy or '-' if invalid
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format date for HTML date input (yyyy-MM-dd)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date as yyyy-MM-dd or '' if invalid
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};

/**
 * Parse date from dd/mm/yyyy format to Date object
 * @param {string} dateString - Date string in dd/mm/yyyy format
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    // Handle dd/mm/yyyy format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      const date = new Date(year, month, day);
      
      // Validate the date
      if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
        return date;
      }
    }
    
    // Fallback to standard Date parsing
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

