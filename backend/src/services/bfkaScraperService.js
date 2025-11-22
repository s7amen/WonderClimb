import * as cheerio from 'cheerio';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const BFKA_CALENDAR_URL = 'https://bfka.org/calendar.php';

/**
 * Scrapes the BFKA calendar page and extracts competition data
 * @returns {Promise<Array>} Array of competition objects with temporary IDs
 */
export async function scrapeBFKACalendar() {
  try {
    logger.info('Starting BFKA calendar scraping...');
    logger.info(`Fetching from URL: ${BFKA_CALENDAR_URL}`);
    
    // Check if fetch is available (Node.js 18+)
    if (typeof fetch === 'undefined') {
      throw new Error('fetch API is not available. Please use Node.js 18+ or install node-fetch');
    }
    
    // Fetch the HTML page
    let response;
    try {
      // Use AbortController for timeout (Node.js 18+)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      response = await fetch(BFKA_CALENDAR_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'bg-BG,bg;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      logger.error('Network error fetching BFKA calendar:', fetchError);
      if (fetchError.name === 'AbortError') {
        throw new Error('Времето за зареждане на календара на БФКА изтече. Моля, опитайте отново.');
      }
      throw new Error(`Мрежова грешка при зареждане на календара на БФКА: ${fetchError.message}`);
    }

    if (!response.ok) {
      logger.error(`HTTP error: ${response.status} ${response.statusText}`);
      throw new Error(`Грешка при зареждане на календара на БФКА: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    logger.info(`Fetched ${html.length} characters of HTML`);
    
    if (!html || html.length < 100) {
      throw new Error('Получен е празен или невалиден HTML от БФКА');
    }
    
    const $ = cheerio.load(html);

    const competitions = [];
    let tempId = 1;

    // Find the table with calendar data
    // Look for the main calendar table - usually has class or is in a specific container
    let tableFound = false;
    
    // Try to find table by common patterns
    const tableSelectors = [
      'table.calendar',
      'table#calendar',
      'table',
      'div table',
    ];

    let $table = null;
    for (const selector of tableSelectors) {
      $table = $(selector).first();
      if ($table.length > 0 && $table.find('tr').length > 1) {
        tableFound = true;
        break;
      }
    }

    if (!tableFound) {
      logger.warn('Calendar table not found, trying all tables');
      $table = $('table').first();
    }

    // Find all rows in the table
    $table.find('tr').each((index, element) => {
      const $row = $(element);
      const cells = $row.find('td');

      // Skip header row and rows with less than 6 cells
      if (cells.length < 6) {
        return;
      }

      // Extract data from each cell
      const dateText = $(cells[0]).text().trim();
      const title = $(cells[1]).text().trim();
      const location = $(cells[2]).text().trim();
      const sport = $(cells[3]).text().trim();
      const groups = $(cells[4]).text().trim();
      const rank = $(cells[5]).text().trim();

      // Skip empty rows or rows that look like navigation/header
      if (!dateText || !title || title.length > 200 || dateText.length > 100) {
        return;
      }

      // Skip if date text contains navigation keywords
      const navKeywords = ['БФКА', 'История', 'Устав', 'Клубове', 'Календар', 'Дейности'];
      if (navKeywords.some(keyword => dateText.includes(keyword) || title.includes(keyword))) {
        return;
      }

      // Parse date - handle Bulgarian date format
      // Common formats: "01.01.2024", "1 януари 2024", "01-02.03.2025" (date range)
      let date;
      try {
        date = parseBulgarianDate(dateText);
      } catch (error) {
        logger.warn(`Failed to parse date "${dateText}": ${error.message}`);
        return;
      }

      // Create competition object with temporary ID
      competitions.push({
        tempId: tempId++,
        date,
        title,
        location,
        sport,
        groups,
        rank,
        sourceUrl: BFKA_CALENDAR_URL,
      });
    });

    logger.info(`Scraped ${competitions.length} competitions from BFKA calendar`);
    return competitions;
  } catch (error) {
    logger.error('Error scraping BFKA calendar:', error);
    throw error;
  }
}

/**
 * Parses Bulgarian date formats to JavaScript Date object
 * @param {string} dateText - Date string in various formats
 * @returns {Date} Parsed date
 */
function parseBulgarianDate(dateText) {
  if (!dateText) {
    throw new Error('Empty date string');
  }

  // Clean the date text
  const cleanDateText = dateText.trim();

  // Handle date ranges (e.g., "01-02.03.2025" or "28.07-03.08.2025")
  // We'll take the first date in the range
  let dateToParse = cleanDateText;
  
  // Pattern: DD-DD.MM.YYYY (e.g., "01-02.03.2025")
  const rangePattern1 = /^(\d{1,2})-(\d{1,2})\.(\d{1,2})\.(\d{4})/;
  const match1 = cleanDateText.match(rangePattern1);
  if (match1) {
    const [, startDay, , month, year] = match1;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(startDay));
  }

  // Pattern: DD.MM-DD.MM.YYYY (e.g., "28.07-03.08.2025")
  const rangePattern2 = /^(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})\.(\d{4})/;
  const match2 = cleanDateText.match(rangePattern2);
  if (match2) {
    const [, startDay, startMonth, , , year] = match2;
    return new Date(parseInt(year), parseInt(startMonth) - 1, parseInt(startDay));
  }

  // Pattern: DD.MM-DD.MM.YYYY with different months (e.g., "30.10-01.11.2025")
  const rangePattern3 = /^(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})\.(\d{4})/;
  const match3 = cleanDateText.match(rangePattern3);
  if (match3) {
    const [, startDay, startMonth, , , year] = match3;
    return new Date(parseInt(year), parseInt(startMonth) - 1, parseInt(startDay));
  }

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanDateText)) {
    return new Date(cleanDateText);
  }

  // Try DD.MM.YYYY format
  const dotFormat = cleanDateText.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotFormat) {
    const [, day, month, year] = dotFormat;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try DD/MM/YYYY format
  const slashFormat = cleanDateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashFormat) {
    const [, day, month, year] = slashFormat;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try Bulgarian month names
  const bulgarianMonths = {
    'януари': 0, 'февруари': 1, 'март': 2, 'април': 3,
    'май': 4, 'юни': 5, 'юли': 6, 'август': 7,
    'септември': 8, 'октомври': 9, 'ноември': 10, 'декември': 11,
  };

  for (const [monthName, monthIndex] of Object.entries(bulgarianMonths)) {
    const regex = new RegExp(`(\\d{1,2})\\s+${monthName}\\s+(\\d{4})`, 'i');
    const match = cleanDateText.match(regex);
    if (match) {
      const [, day, year] = match;
      return new Date(parseInt(year), monthIndex, parseInt(day));
    }
  }

  // Fallback: try native Date parsing
  const parsed = new Date(cleanDateText);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Unable to parse date: ${dateText}`);
}

