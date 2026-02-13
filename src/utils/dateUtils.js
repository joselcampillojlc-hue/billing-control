import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parses a raw date input into a valid Date object or returns null.
 * Supports: Excel serial numbers, timestamps, ISO strings, and DD/MM/YYYY strings.
 * @param {string|number|Date} rawDate 
 * @returns {Date|null}
 */
export function parseDate(rawDate) {
    let dateObj;

    if (rawDate === null || rawDate === undefined) return null;

    if (typeof rawDate === 'number') {
        // Excel serial date
        dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else if (typeof rawDate === 'string' && /^\d+$/.test(rawDate)) {
        // String looking like a number (timestamp or serial)
        // Heuristic: If it's small (e.g. < 100000), treat as serial. If large, timestamp.
        // But for this app, we mostly see Excel serials.
        const serial = parseInt(rawDate, 10);
        // Excel serial 45000 is approx year 2023. Timestamp 1700000000 is 2023.
        if (serial < 100000) {
            dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
        } else {
            dateObj = new Date(serial);
        }
    } else if (rawDate instanceof Date) {
        dateObj = rawDate;
    } else {
        // string
        dateObj = new Date(rawDate);
        if (isNaN(dateObj) && typeof rawDate === 'string' && rawDate.includes('/')) {
            // Try DD/MM/YYYY
            const part = rawDate.split('/');
            if (part.length === 3) {
                // Note: parts[1] is 1-indexed month
                dateObj = new Date(part[2], part[1] - 1, part[0]);
            }
        }
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
    if (!dateObj || isNaN(dateObj)) return 'Invalid Date';

    // Copy date so we don't modify the original
    const target = new Date(dateObj.valueOf());

    // ISO 8601 week number calculation
    const dayNr = (dateObj.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);

    return `Semana ${weekNum} - ${dateObj.getFullYear()}`;
}

/**
 * Formats a date to "MMM yyyy"
 * @param {Date} dateObj 
 * @returns {string}
 */
export function getMonthKey(dateObj) {
    if (!dateObj || isNaN(dateObj)) return 'Invalid Date';
    return format(dateObj, 'MMM yyyy', { locale: es });
}
