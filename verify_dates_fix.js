// Mock requirements
const { parseDate, getWeekKey, getMonthKey } = require('./src/utils/dateUtils.js');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');

// Simple mock for format since we are in node
// Note: In real app this comes from date-fns
function mockFormat(date, fmt, options) {
    if (!date) return 'Invalid';
    // Very basic mock for the specific MMM yyyy format
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Re-implementing the core logic for testing since I can't easily import ES modules in simple node script without config
function testProcessing(data) {
    const byMonth = {};
    const byWeek = {};
    const byDriver = {};

    data.forEach(row => {
        const dateObj = parseDate(row['F.Carga']);
        const month = dateObj ? getMonthKey(dateObj) : 'Sin Fecha';
        const week = dateObj ? getWeekKey(dateObj) : 'S/F';
        const driver = row['Conductor'] || 'Desconocido';
        const amount = parseFloat(row['Euros']) || 0;

        byMonth[month] = (byMonth[month] || 0) + amount;
        byWeek[week] = (byWeek[week] || 0) + amount;
        if (!byDriver[driver]) byDriver[driver] = { total: 0 };
        byDriver[driver].total += amount;
    });

    return { byMonth, byWeek, byDriver };
}

const testData = [
    { 'F.Carga': '45352', 'Conductor': 'D1', 'Euros': 100 }, // Excel serial for ~March 2024
    { 'F.Carga': '01/02/2024', 'Conductor': 'D2', 'Euros': 200 }, // Feb
    { 'F.Carga': 'invalid', 'Conductor': 'D3', 'Euros': 300 }, // Should go to 'Sin Fecha'
    { 'F.Carga': '2024-03-15', 'Conductor': 'D1', 'Euros': 50 } // March
];

const results = testProcessing(testData);
console.log('Resultados por Mes:', results.byMonth);
console.log('Resultados por Semana:', results.byWeek);
console.log('Resultados por Conductor:', results.byDriver);

const monthKeys = Object.keys(results.byMonth);
if (monthKeys.includes('feb 2024') || monthKeys.includes('feb. 2024')) {
    console.log('✅ Éxito: Se detectó el mes de Febrero por separado.');
} else {
    console.log('❌ Fallo: No se separaron los meses correctamente.');
}

if (monthKeys.includes('Sin Fecha')) {
    console.log('✅ Éxito: Las fechas inválidas se agrupan en "Sin Fecha" en lugar de hoy.');
}
