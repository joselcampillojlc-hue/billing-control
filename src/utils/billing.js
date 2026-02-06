import * as XLSX from 'xlsx';
import { getISOWeek, format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// Map user's headers to internal keys
const FIELD_MAP = {
  date: 'F.Carga',
  driver: 'Conductor',
  clientName: 'Nomb.Cliente',
  amount: 'Euros',
  currency: 'Euros'
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
    const rawDate = row[FIELD_MAP.date];

    // Handle Excel serial date or string
    if (typeof rawDate === 'number') {
      dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else if (typeof rawDate === 'string') {
      // Try parsing DD/MM/YYYY
      // Simple regex or date-fns parse if needed.
      // Assuming user locale format, but let's be safe.
      // Let's assume standard excel parsers might give strings like '4/5/2024'.
      dateObj = new Date(rawDate);
    }

    if (!isValid(dateObj)) dateObj = new Date(); // Fallback or error

    const amount = parseFloat(row[FIELD_MAP.amount]) || 0;

    return {
      id: Math.random().toString(36).substr(2, 9),
      driver: row[FIELD_MAP.driver] || 'Unknown',
      client: row[FIELD_MAP.clientName] || 'Unknown',
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
