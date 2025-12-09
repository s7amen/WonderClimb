import { Settings } from '../models/settings.js';
import logger from '../middleware/logging.js';

/**
 * Get current settings (singleton - ensures one document exists)
 */
export const getSettings = async () => {
  try {
    let settings = await Settings.findOne();
    
    // If no settings exist, create default one
    if (!settings) {
      settings = await Settings.create({});
      logger.info('Default settings document created');
    }
    
    return settings;
  } catch (error) {
    logger.error({ error: error.message }, 'Error fetching settings');
    throw error;
  }
};

/**
 * Update settings
 */
export const updateSettings = async (updates) => {
  try {
    // Get or create settings document
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(updates);
      logger.info('Settings document created with updates');
    } else {
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (settings.schema.paths[key]) {
          settings[key] = updates[key];
        }
      });
      
      await settings.save();
      logger.info({ updates: Object.keys(updates) }, 'Settings updated');
    }
    
    return settings;
  } catch (error) {
    logger.error({ error: error.message, updates }, 'Error updating settings');
    throw error;
  }
};

/**
 * Get a specific message by key
 * @param {string} key - The message key (e.g., 'cancellationPeriodExpired')
 * @param {object} replacements - Optional replacements for placeholders (e.g., {count: 5})
 * @returns {string} The message text
 */
export const getMessage = async (key, replacements = {}) => {
  try {
    const settings = await getSettings();
    
    if (!settings[key]) {
      logger.warn({ key }, 'Message key not found in settings, using default');
      // Return a default message if key doesn't exist
      return `Съобщение не е намерено за ключ: ${key}`;
    }
    
    let message = settings[key];
    
    // Replace placeholders if any
    if (replacements && Object.keys(replacements).length > 0) {
      Object.keys(replacements).forEach(placeholder => {
        message = message.replace(`{${placeholder}}`, replacements[placeholder]);
      });
    }
    
    return message;
  } catch (error) {
    logger.error({ error: error.message, key }, 'Error getting message');
    // Return a fallback message
    return `Грешка при зареждане на съобщение: ${key}`;
  }
};











