import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './format';

export const exportDataToPDF = (title, columns, data, filename) => {
    console.log('Exporting PDF...', { title, filename, dataCount: data.length });
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Add title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, 20);

        // Add date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const dateStr = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.text(`Generado el: ${dateStr}`, 14, 28);

        // Map data to rows based on columns
        const rows = data.map(item => {
            return columns.map(col => {
                let val = item[col.key];
                if (col.format === 'currency') {
                    val = formatCurrency(val);
                }
                return val;
            });
        });

        const headers = columns.map(col => col.label);

        autoTable(doc, {
            startY: 35,
            head: [headers],
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229], // Indigo 600
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: columns.reduce((acc, col, index) => {
                if (col.align === 'right') {
                    acc[index] = { halign: 'right' };
                } else if (col.align === 'center') {
                    acc[index] = { halign: 'center' };
                }
                if (col.width) {
                    acc[index] = { ...acc[index], cellWidth: col.width };
                }
                return acc;
            }, {}),
            styles: {
                fontSize: 9,
                cellPadding: 4
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            }
        });

        doc.save(`${filename}.pdf`);
        console.log('PDF saved successfully');
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Error al generar el PDF: ' + error.message);
    }
};
