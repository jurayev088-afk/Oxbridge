import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney } from './formatDisplay';

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('uz-UZ');
}

export function exportPaidStudentsPdf(options: {
  periodLabel: string;
  rows: Array<{
    studentName: string;
    groupName: string;
    expectedAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: 'paid' | 'partial';
    methodLabel: string;
    paymentDate: string;
  }>;
}) {
  const doc = new jsPDF();
  const paidTotal = options.rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const remainingTotal = options.rows.reduce((sum, row) => sum + row.remainingAmount, 0);
  const fullCount = options.rows.filter((row) => row.status === 'paid').length;
  const partialCount = options.rows.filter((row) => row.status === 'partial').length;

  doc.setFontSize(16);
  doc.text('Oxbridge Academy — Oylik to\'lovlar', 14, 18);
  doc.setFontSize(11);
  doc.text(options.periodLabel, 14, 26);
  doc.text(
    `Jami: ${options.rows.length} ta (${fullCount} to'liq, ${partialCount} qisman)`,
    14,
    33
  );
  doc.text(`To'langan: ${formatMoney(paidTotal)} · Qolgan: ${formatMoney(remainingTotal)}`, 14, 40);

  autoTable(doc, {
    startY: 47,
    head: [['#', 'O\'quvchi', 'Guruh', 'Oylik', 'To\'langan', 'Qolgan', 'Holat', 'Usul', 'Sana']],
    body: options.rows.map((row, index) => [
      String(index + 1),
      row.studentName,
      row.groupName,
      formatMoney(row.expectedAmount),
      formatMoney(row.paidAmount),
      row.remainingAmount > 0 ? formatMoney(row.remainingAmount) : '—',
      row.status === 'paid' ? 'To\'liq' : 'Qisman',
      row.methodLabel,
      formatDate(row.paymentDate),
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`oylik-tolovlar-${options.periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function exportMonthlyExpensesPdf(options: {
  periodLabel: string;
  teacherSalaries: Array<{ teacherName: string; amount: number }>;
  electricity: number;
  totalExpenses: number;
}) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Oxbridge Academy — Oylik xarajatlar', 14, 18);
  doc.setFontSize(11);
  doc.text(options.periodLabel, 14, 26);

  autoTable(doc, {
    startY: 34,
    head: [['O\'qituvchi', 'Berilgan summa']],
    body: options.teacherSalaries
      .filter((row) => row.amount > 0)
      .map((row) => [row.teacherName, formatMoney(row.amount)]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;

  autoTable(doc, {
    startY: finalY + 10,
    head: [['Xarajat turi', 'Summa']],
    body: [
      ['Svet (elektr energiyasi)', formatMoney(options.electricity)],
      ['Jami xarajat', formatMoney(options.totalExpenses)],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [168, 85, 247] },
  });

  doc.save(`oylik-xarajatlar-${options.periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
