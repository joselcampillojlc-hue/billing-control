import { parseDate, getWeekKey, getMonthKey } from './src/utils/dateUtils.js';
import { processBillingData } from './src/utils/billing.js';

const mockRow = {
    'F.Carga': '02/01/2026',
    'Conductor': 'ELG',
    'Nombre Cliente': 'APM TERMINALS SPAIN RAILWAY, S.L.U.',
    'Euros': '205,00',
    'Kms': 45
};

const processed = processBillingData([mockRow]);
console.log(JSON.stringify(processed, null, 2));
