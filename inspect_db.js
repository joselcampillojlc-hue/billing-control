import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
env.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching billing_records...");
    const { data, error } = await supabase.from('billing_records').select('*');
    if (error) { console.error("DB Error:", error); return; }

    console.log(`Total DB records: ${data.length}`);

    const weekCounts = {};
    let nullDates = 0;

    data.forEach(row => {
        let d = row['F.Carga'];
        if (!d) {
            nullDates++;
            return;
        }

        let dateObj = new Date(d);
        if (!isNaN(dateObj)) {
            // simple calculation for ISO week to estimate
            const target = new Date(dateObj.valueOf());
            const dayNr = (dateObj.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) {
                target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
            }
            const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);

            let y = dateObj.getFullYear();
            let key = `W${weekNum}-${y}`;
            weekCounts[key] = (weekCounts[key] || 0) + 1;
        } else {
            nullDates++;
        }
    });

    console.log('Week counts:', weekCounts);
    console.log('Records with null/invalid dates:', nullDates);

    if (data.length > 0) {
        // Find most recently uploaded (by created_at or just the end of the array if sorted)
        const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        console.log('\nMost recently created 5 records:');
        sorted.slice(0, 5).forEach(r => {
            console.log(`- ID: ${r.id}, F.Carga: ${r['F.Carga']}, Conductor: ${r.Conductor}, Euros: ${r.Euros}, fingerprint: ${r.fingerprint}, created: ${r.created_at}`);
        });
    }
}

run();
