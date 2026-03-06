import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate, getWeekKey, getMonthKey } from './dateUtils';

// Map user's headers to internal keys
// 'amount'        = TOT+ADDONS (importe conductor, columna antigua "Euros")
// 'billingAmount' = EUROS (nuevo importe de facturación al cliente)
const FIELD_MAP = {
  date: ['F.Carga', 'Fecha', 'F. Carga', 'FEC. CARGA', 'F carga'],
  driver: ['Conductor', 'Nombre Conductor', 'CHOFER', 'CONDUCTOR', 'chofer'],
  clientName: ['Nombre Cliente', 'Nomb.Cliente', 'Cliente', 'CLIENTE', 'cliente'],
  amount: ['TOT+ADDONS', 'TOT ADDONS', 'TOTADDONS', 'Imp. Conductor', 'IMP CONDUCTOR'],
  billingAmount: ['EUROS', 'Euros', 'Importe', 'Total', 'IMP. FACTURACION', 'Imp. Facturacion', 'Facturacion']
};

// Helper to normalize strings for comparison (remove accents, spaces, special chars)
const normalize = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9]/g, '')    // Remove non-alphanumeric
    .toLowerCase()
    .trim();
};

const parseSpanishAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Convert "1.200,50" to "1200.50"
  const clean = String(val)
    .replace(/\s/g, '')      // Remove spaces
    .replace(/\./g, '')      // Remove thousand separator (dot)
    .replace(/,/g, '.');     // Replace decimal separator (comma) with dot
  return parseFloat(clean) || 0;
};

/**
 * Finds the correct key in the row object regardless of case or slight variations.
 * For 'billingAmount', we skip headers that already matched 'amount' to avoid overlap.
 */
const getFieldValue = (row, fieldKey, usedKeys = []) => {
  if (row[fieldKey] !== undefined) return row[fieldKey];

  const possibleHeaders = FIELD_MAP[fieldKey] || [];
  const normalizedPossible = possibleHeaders.map(normalize);

  const rowKeys = Object.keys(row);

  for (const key of rowKeys) {
    const normKey = normalize(key);
    if (normalizedPossible.includes(normKey) && !usedKeys.includes(key)) {
      return row[key];
    }
  }

  return null;
};

/**
 * Parses the uploaded Excel file.
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
  const fingerprintCounts = {}; // Track occurrences for sequence

  const processed = data.map(row => {
    const rawDate = getFieldValue(row, 'date');
    const dateObj = parseDate(rawDate);

    const isInvalid = !dateObj;

    // Detect which key matched 'amount' so billingAmount doesn't reuse it
    const amountHeaders = FIELD_MAP.amount.map(normalize);
    const rowKeys = Object.keys(row);
    const usedAmountKey = rowKeys.find(k => amountHeaders.includes(normalize(k)));

    const amount = parseSpanishAmount(getFieldValue(row, 'amount'));
    const billingAmount = parseSpanishAmount(getFieldValue(row, 'billingAmount', usedAmountKey ? [usedAmountKey] : []));
    const driver = getFieldValue(row, 'driver') || 'Desconocido';
    const client = getFieldValue(row, 'clientName') || 'Desconocido';

    const dateStr = dateObj ? format(dateObj, 'yyyy-MM-dd') : 'fecha-invalida';
    const sanitizeId = (str) => String(str).replace(/[^\w-]/g, '_').toLowerCase();
    const baseFingerprint = `${dateStr}_${sanitizeId(driver)}_${sanitizeId(client)}_${amount}`;

    fingerprintCounts[baseFingerprint] = (fingerprintCounts[baseFingerprint] || 0) + 1;
    const fingerprint = `${baseFingerprint}_${fingerprintCounts[baseFingerprint]}`;

    return {
      id: Math.random().toString(36).substr(2, 9),
      fingerprint,
      driver,
      client,
      date: dateObj,
      week: isInvalid ? 'S/F' : getWeekKey(dateObj),
      month: isInvalid ? 'Sin Fecha' : getMonthKey(dateObj),
      monthIndex: dateObj ? format(dateObj, 'yyyy-MM') : '0000-00',
      amount: amount,           // TOT+ADDONS (importe conductor)
      billingAmount: billingAmount, // EUROS (importe facturación)
      raw: row
    };
  });

  // Aggregations
  const byDriver = {};
  const byClient = {};
  const byMonth = {};
  const byWeek = {};

  let totalAmount = 0;
  let totalBilling = 0;

  processed.forEach(item => {
    totalAmount += item.amount;
    totalBilling += item.billingAmount;

    // Driver Grouping
    if (!byDriver[item.driver]) byDriver[item.driver] = { total: 0, billing: 0, count: 0 };
    byDriver[item.driver].total += item.amount;
    byDriver[item.driver].billing += item.billingAmount;
    byDriver[item.driver].count += 1;

    // Client Grouping
    if (!byClient[item.client]) byClient[item.client] = { total: 0, billing: 0, count: 0 };
    byClient[item.client].total += item.amount;
    byClient[item.client].billing += item.billingAmount;
    byClient[item.client].count += 1;

    // Time Grouping (Global)
    const mKey = item.month;
    if (!byMonth[mKey]) byMonth[mKey] = 0;
    byMonth[mKey] += item.amount;

    // Week grouping
    const wKey = item.week;
    if (!byWeek[wKey]) byWeek[wKey] = 0;
    byWeek[wKey] += item.amount;
  });

  return {
    raw: processed,
    summary: {
      total: totalAmount,
      totalBilling,
      byDriver,
      byClient,
      byMonth,
      byWeek
    }
  };
};

/**
 * Generates and downloads a sample Excel template for data import.
 */
export const downloadTemplate = () => {
  const data = [
    {
      'F.Carga': '01/01/2024',
      'Conductor': 'JUAN PEREZ',
      'Nombre Cliente': 'CLIENTE EJEMPLO SL',
      'Euros': 180.00,
      'TOT+ADDONS': 150.50
    },
    {
      'F.Carga': '02/01/2024',
      'Conductor': 'ANTONIO RUIZ',
      'Nombre Cliente': 'CLIENTE TEST SL',
      'Euros': 250.00,
      'TOT+ADDONS': 210.00
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");

  // Generate buffer and download
  XLSX.writeFile(workbook, "plantilla_importacion.xlsx");
};
