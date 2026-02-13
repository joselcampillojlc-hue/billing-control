
// Simulation of the discrepancy
const rows = [
    { 'F.Carga': '13/02/2026', id: 1 },
    { 'F.Carga': 46066, id: 2 }, // Roughly 2026
    { 'F.Carga': '46066', id: 3 }
];

console.log("--- App.jsx Logic ---");
rows.forEach(row => {
    let dateObj;
    const rawDate = row['F.Carga'];
    if (typeof rawDate === 'number') {
        dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else {
        dateObj = new Date(rawDate);
    }
    console.log(`Row ${row.id}: raw=${rawDate}, parsed=${dateObj}, isNaN=${isNaN(dateObj)}`);
});

console.log("\n--- DataManagement.jsx Logic ---");
rows.forEach(row => {
    let dateObj;
    const rawDate = row['F.Carga'];
    if (typeof rawDate === 'number') {
        dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else if (typeof rawDate === 'string' && /^\d+$/.test(rawDate)) {
        const serial = parseInt(rawDate, 10);
        dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
    } else {
        dateObj = new Date(rawDate);
        if (isNaN(dateObj) && typeof rawDate === 'string' && rawDate.includes('/')) {
            const part = rawDate.split('/');
            if (part.length === 3) dateObj = new Date(part[2], part[1] - 1, part[0]);
        }
    }
    console.log(`Row ${row.id}: raw=${rawDate}, parsed=${dateObj}, isNaN=${isNaN(dateObj)}`);
});
