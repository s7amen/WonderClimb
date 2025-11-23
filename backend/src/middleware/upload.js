import multer from 'multer';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import logger from './logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Transliterate Cyrillic characters to Latin
 */
const transliterateCyrillic = (text) => {
  const cyrillicToLatin = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
    'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F',
    'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A', 'Ь': 'Y',
    'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y',
    'ю': 'yu', 'я': 'ya'
  };

  return text.split('').map(char => cyrillicToLatin[char] || char).join('');
};

/**
 * Sanitize filename - transliterate Cyrillic and remove invalid characters
 * Includes all names: first, middle (if exists), last
 */
const sanitizeFilename = (firstName, middleName, lastName) => {
  // Transliterate Cyrillic to Latin
  const transliteratedFirst = transliterateCyrillic(firstName || '');
  const transliteratedMiddle = middleName ? transliterateCyrillic(middleName) : '';
  const transliteratedLast = transliterateCyrillic(lastName || '');
  
  // Build name parts array (filter out empty strings)
  const nameParts = [transliteratedFirst, transliteratedMiddle, transliteratedLast].filter(part => part && part.trim());
  
  // Join with underscores and remove invalid characters
  let sanitized = nameParts.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Remove multiple consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_').replace(/^_|_$/g, '');
  
  // Fallback if name is empty after sanitization
  if (!sanitized || sanitized === '_') {
    sanitized = 'climber';
  }
  
  return sanitized;
};

// Configure multer to store files in memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept image files only
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.'), false);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max upload size
  },
  fileFilter: fileFilter,
});

/**
 * Process and compress uploaded image
 * Converts to JPG, resizes to max 1200px, compresses to under 500KB
 */
export const processImage = async (buffer, climberId, firstName, middleName, lastName, sequenceNumber) => {
  try {
    // Create directory if it doesn't exist - use common climbers folder
    const uploadsDir = join(__dirname, '../../uploads/photos/climbers');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate filename with all names: first, middle (if exists), last
    const sanitizedName = sanitizeFilename(firstName, middleName, lastName);
    const filename = `${sanitizedName}_${sequenceNumber}.jpg`;
    const filepath = join(uploadsDir, filename);

    // Process image with sharp
    let quality = 80; // Start with 80% quality
    let processedBuffer = await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();

    // If still over 500KB, reduce quality further
    if (processedBuffer.length > 500 * 1024) {
      quality = 70;
      processedBuffer = await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();
    }

    // If still over 500KB, reduce quality even more
    if (processedBuffer.length > 500 * 1024) {
      quality = 60;
      processedBuffer = await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();
    }

    // Write file to disk
    await writeFile(filepath, processedBuffer);

    logger.info({
      climberId,
      filename,
      originalSize: buffer.length,
      compressedSize: processedBuffer.length,
      quality,
    }, 'Image processed and saved');

    return {
      filename,
      filepath,
      size: processedBuffer.length,
    };
  } catch (error) {
    logger.error({ error, climberId }, 'Error processing image');
    throw new Error('Failed to process image: ' + error.message);
  }
};

