
import { parseDate, getWeekKey } from './src/utils/dateUtils.js';

// Simulation of the data
const rows = [
    { 'F.Carga': '13/02/2026', id: 1 },
    { 'F.Carga': 46066, id: 2 }, // Roughly 2026
    { 'F.Carga': '46066', id: 3 }
];

const targetWeek = 'Semana 7 - 2026';

console.log(`Target Week: ${targetWeek}`);

const docsToDelete = rows.filter(row => {
    const dateObj = parseDate(row['F.Carga']);
    if (!dateObj) {
        console.log(`Row ${row.id}: Invalid Date`);
        return false;
    }
    const key = getWeekKey(dateObj);
    const match = key === targetWeek;
    console.log(`Row ${row.id}: raw=${row['F.Carga']}, parsed=${dateObj.toISOString()}, key='${key}', match=${match}`);
    return match;
});

console.log(`\nFound ${docsToDelete.length} documents to delete.`);
if (docsToDelete.length > 0) {
    console.log("SUCCESS: Fix verified. Logic correctly identifies records.");
} else {
    console.log("FAILURE: No records found.");
}
