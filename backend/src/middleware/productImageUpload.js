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
 * Sanitize filename for product - transliterate and remove invalid characters
 */
const sanitizeProductName = (productName) => {
    // Transliterate Cyrillic to Latin
    const transliterated = transliterateCyrillic(productName || '');

    // Remove invalid characters and replace spaces with underscores
    let sanitized = transliterated.replace(/[^a-zA-Z0-9_\s]/g, '').replace(/\s+/g, '_');

    // Remove multiple consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_').replace(/^_|_$/g, '');

    // Fallback if name is empty after sanitization
    if (!sanitized || sanitized === '_') {
        sanitized = 'product';
    }

    return sanitized.toLowerCase();
};

/**
 * Process and compress product image
 * Converts to JPG, resizes to 600x600px, compresses to under 300KB
 */
export const processProductImage = async (buffer, productId, productName) => {
    try {
        // Create directory if it doesn't exist
        const uploadsDir = join(__dirname, '../../uploads/products');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Generate filename
        const sanitizedName = sanitizeProductName(productName);
        const timestamp = Date.now();
        const filename = `${sanitizedName}_${timestamp}.jpg`;
        const filepath = join(uploadsDir, filename);

        // Process image with sharp - resize to 600x600px
        let quality = 80; // Start with 80% quality
        let processedBuffer = await sharp(buffer)
            .resize(600, 600, {
                fit: 'cover',
                position: 'center',
            })
            .jpeg({ quality })
            .toBuffer();

        // If over 300KB, reduce quality
        if (processedBuffer.length > 300 * 1024) {
            quality = 70;
            processedBuffer = await sharp(buffer)
                .resize(600, 600, {
                    fit: 'cover',
                    position: 'center',
                })
                .jpeg({ quality })
                .toBuffer();
        }

        // If still over 300KB, reduce quality more
        if (processedBuffer.length > 300 * 1024) {
            quality = 60;
            processedBuffer = await sharp(buffer)
                .resize(600, 600, {
                    fit: 'cover',
                    position: 'center',
                })
                .jpeg({ quality })
                .toBuffer();
        }

        // Write file to disk
        await writeFile(filepath, processedBuffer);

        logger.info({
            productId,
            filename,
            originalSize: buffer.length,
            compressedSize: processedBuffer.length,
            quality,
        }, 'Product image processed and saved');

        return {
            filename,
            filepath,
            size: processedBuffer.length,
            url: `/uploads/products/${filename}`,
        };
    } catch (error) {
        logger.error({ error, productId }, 'Error processing product image');
        throw new Error('Failed to process product image: ' + error.message);
    }
};
