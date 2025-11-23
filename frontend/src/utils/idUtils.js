/**
 * Normalizes an ID to a string for consistent comparison
 * Handles ObjectId, string, and other types
 * @param {any} id - The ID to normalize
 * @returns {string} - Normalized string ID
 */
export const normalizeId = (id) => {
  if (!id) return '';
  
  if (typeof id === 'string') {
    return id;
  }
  
  if (typeof id === 'object') {
    // Handle ObjectId with toString method
    if (id.toString && typeof id.toString === 'function') {
      return id.toString();
    }
    // Handle object with _id property
    if (id._id) {
      return normalizeId(id._id);
    }
    // Handle object with id property
    if (id.id) {
      return normalizeId(id.id);
    }
  }
  
  return String(id);
};

/**
 * Compares two IDs for equality after normalization
 * @param {any} id1 - First ID to compare
 * @param {any} id2 - Second ID to compare
 * @returns {boolean} - True if IDs are equal
 */
export const compareIds = (id1, id2) => {
  return normalizeId(id1) === normalizeId(id2);
};

/**
 * Checks if an ID is in an array of IDs
 * @param {any} id - The ID to check
 * @param {any[]} idArray - Array of IDs to check against
 * @returns {boolean} - True if ID is in array
 */
export const isIdInArray = (id, idArray) => {
  if (!Array.isArray(idArray)) return false;
  const normalizedId = normalizeId(id);
  return idArray.some(arrayId => normalizeId(arrayId) === normalizedId);
};

