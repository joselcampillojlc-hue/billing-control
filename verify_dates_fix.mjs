import { parseDate, getWeekKey, getMonthKey } from './src/utils/dateUtils.js';

// Re-implementing parts for verification script if needed, 
// but let's try to import directly. We need to mock 'format' if date-fns is not in node_modules accessible.
// Actually, node_modules IS in the root.

const testData = [
    { 'F.Carga': 45352, 'Conductor': 'D1', 'Euros': 100 }, // Excel serial for ~March 2024
    { 'F.Carga': '01/02/2024', 'Conductor': 'D2', 'Euros': 200 }, // Feb
    { 'F.Carga': 'invalid', 'Conductor': 'D3', 'Euros': 300 }, // Should go to null
    { 'F.Carga': '2024-03-15', 'Conductor': 'D1', 'Euros': 50 } // March
];

testData.forEach((row, i) => {
    const date = parseDate(row['F.Carga']);
    const month = getMonthKey(date);
    const week = getWeekKey(date);
    console.log(`Test ${i}: Input: ${row['F.Carga']} -> Date: ${date ? date.toISOString() : 'null'} -> Month: ${month} -> Week: ${week}`);
});
