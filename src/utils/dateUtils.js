import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parses a raw date input into a valid Date object or returns null.
 * Supports: Excel serial numbers, timestamps, ISO strings, and DD/MM/YYYY strings.
 * @param {string|number|Date} rawDate 
 * @returns {Date|null}
 */
export function parseDate(rawDate) {
    if (rawDate === null || rawDate === undefined || rawDate === '') return null;

    let dateObj;

    // Handle Firestore Timestamp or similar
    if (rawDate && typeof rawDate.toDate === 'function') {
        dateObj = rawDate.toDate();
    } else if (typeof rawDate === 'number') {
        // Excel serial date (Windows Excel uses 1900 epoch)
        dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else if (typeof rawDate === 'string') {
        const trimmed = rawDate.trim();
        if (/^\d+$/.test(trimmed)) {
            // String looking like a number
            const serial = parseInt(trimmed, 10);
            if (serial < 100000) {
                dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
            } else {
                dateObj = new Date(serial);
            }
        } else if (trimmed.includes('/')) {
            // Try DD/MM/YYYY or D/M/YYYY
            const parts = trimmed.split('/').map(p => p.trim());
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                let yearStr = parts[2];
                if (yearStr.length === 2) yearStr = '20' + yearStr;
                const year = parseInt(yearStr, 10);

                // Validar que son números razonables
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    dateObj = new Date(year, month - 1, day);
                }
            }
        } else {
            const parsed = Date.parse(trimmed);
            if (!isNaN(parsed)) {
                dateObj = new Date(parsed);
            }
        }
    } else if (rawDate instanceof Date) {
        dateObj = rawDate;
    }

    if (!dateObj || isNaN(dateObj.getTime())) return null;

    return dateObj;
}

/**
 * Calculates the ISO week string "Semana X - YYYY"
 * @param {Date} dateObj 
 * @returns {string}
 */
export function getWeekKey(dateObj) {
    const validDate = parseDate(dateObj);
    if (!validDate) return 'Fecha No Válida';

    // Copy date so we don't modify the original
    const target = new Date(validDate.valueOf());

    // ISO 8601 week number calculation
    const dayNr = (validDate.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);

    return `Semana ${weekNum} - ${validDate.getFullYear()}`;
}

/**
 * Formats a date to "MMM yyyy"
 * @param {Date} dateObj 
 * @returns {string}
 */
export function getMonthKey(dateObj) {
    const validDate = parseDate(dateObj);
    if (!validDate) return 'Fecha No Válida';
    return format(validDate, 'MMM yyyy', { locale: es });
}
