import * as XLSX from 'xlsx';
const data = [
    { "F.Carga": "02/01/2026", "Conductor": "ELG", "Nombre Cliente": "APM TERMINALS SPAIN RAILWAY, S.L.U.", "Euros": "205,00", "Kms": 45 },
    { "F.Carga": "02/01/2026", "Conductor": "AGP", "Nombre Cliente": "TRANSPORTES CARGUA, S.A.", "Euros": "1.250,00", "Kms": 120 }
];
const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
XLSX.writeFile(wb, "C:\\Users\\jose.campillo\\.gemini\\antigravity\\scratch\\billing-control\\test.xlsx");
console.log("Excel file generated at test.xlsx");
