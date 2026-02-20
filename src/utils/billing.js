import * as XLSX from 'xlsx';
import { getISOWeek, format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// Map user's headers to internal keys
const FIELD_MAP = {
  date: ['F.Carga', 'Fecha', 'F. Carga', 'FEC. CARGA'],
  driver: ['Conductor', 'Nombre Conductor', 'CHOFER'],
  clientName: ['Nomb.Cliente', 'Cliente', 'Nombre Cliente', 'CLIENTE'],
  amount: ['Euros', 'Importe', 'Total', 'EUROS'],
  kms: ['Kms', 'KM', 'Kilómetros', 'KILOMETROS']
};

/**
 * Finds the correct key in the row object regardless of case or slight variations.
 */
const getFieldValue = (row, fieldKey) => {
  const possibleHeaders = FIELD_MAP[fieldKey];
  if (!possibleHeaders) return null;

  // 1. Try exact matches from map
  for (const header of possibleHeaders) {
    if (row[header] !== undefined) return row[header];
  }

  // 2. Try case-insensitive search through all row keys
  const rowKeys = Object.keys(row);
  for (const header of possibleHeaders) {
    const foundKey = rowKeys.find(k => k.toLowerCase() === header.toLowerCase());
    if (foundKey) return row[foundKey];
  }

  return null;
};

/**
 * Parses the uploaded Excel file.
 * @param {File} file 
 * @returns {Promise<Array>} Raw data array
 */
export const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Processes raw data into summaries.
 */
export const processBillingData = (data) => {
  const processed = data.map(row => {
    // Parse date. Assuming DD/MM/YYYY or Excel serial date.
    let dateObj;
    const rawDate = getFieldValue(row, 'date');

    // Handle Excel serial date or string
    if (typeof rawDate === 'number') {
      dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else if (typeof rawDate === 'string') {
      // Check if it's a numeric string (Excel serial stored as text)
      if (/^\d+$/.test(rawDate)) {
        const serial = parseInt(rawDate, 10);
        dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
      } else {
        // Try parsing standard string date
        dateObj = new Date(rawDate);

        // If invalid, try DD/MM/YYYY manually if needed
        if (isNaN(dateObj) && rawDate.includes('/')) {
          const part = rawDate.split('/');
          if (part.length === 3) {
            // Assume DD/MM/YYYY
            dateObj = new Date(part[2], part[1] - 1, part[0]);
          }
        }
      }
    }

    if (!isValid(dateObj)) dateObj = new Date(); // Fallback or error

    const amount = parseFloat(getFieldValue(row, 'amount')) || 0;
    const driver = getFieldValue(row, 'driver') || 'Unknown';
    const client = getFieldValue(row, 'clientName') || 'Unknown';

    // Generate a unique fingerprint for this row to prevent duplicates
    // Pattern: date_driver_client_amount
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    const fingerprint = `${dateStr}_${driver}_${client}_${amount}`.replace(/\s+/g, '_').toLowerCase();

    return {
      id: Math.random().toString(36).substr(2, 9),
      fingerprint, // Added for deduplication
      driver,
      client,
      date: dateObj,
      week: getISOWeek(dateObj),
      month: format(dateObj, 'MMM yyyy', { locale: es }),
      monthIndex: format(dateObj, 'yyyy-MM'), // Helper for sorting
      amount: amount,
      raw: row
    };
  });

  // Aggregations
  const byDriver = {};
  const byClient = {};
  const byMonth = {};
  const byWeek = {};

  let totalAmount = 0;

  processed.forEach(item => {
    totalAmount += item.amount;

    // Driver Grouping
    if (!byDriver[item.driver]) byDriver[item.driver] = { total: 0, count: 0, weeks: {}, months: {} };
    byDriver[item.driver].total += item.amount;
    byDriver[item.driver].count += 1;

    // Client Grouping
    if (!byClient[item.client]) byClient[item.client] = { total: 0, count: 0, weeks: {}, months: {} };
    byClient[item.client].total += item.amount;
    byClient[item.client].count += 1;

    // Time Grouping (Global)
    if (!byMonth[item.month]) byMonth[item.month] = 0;
    byMonth[item.month] += item.amount;

    // Week grouping (key: "Week X - Month")
    const weekKey = `Semana ${item.week}`;
    if (!byWeek[weekKey]) byWeek[weekKey] = 0;
    byWeek[weekKey] += item.amount;
  });

  return {
    raw: processed,
    summary: {
      total: totalAmount,
      byDriver,
      byClient,
      byMonth,
      byWeek
    }
  };
};
