import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatDateLong } from './formatters'

/**
 * Format currency cleanly for PDF without Unicode font glitches
 * e.g. Rs. 10,000.00
 */
function formatPDFMoney(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rs. 0.00'
  const num = Number(amount)
  return 'Rs. ' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

/**
 * Generate a clean, plain, professional black & white / subtle gray PDF report
 */
export async function generateProjectPDF({ project, stats, income, expenses, firmName, save = true }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentW = pageW - margin * 2

  const BLACK = [17, 24, 39]       // #111827
  const DARK_GRAY = [75, 85, 99]   // #4B5563
  const LIGHT_GRAY = [243, 244, 246] // #F3F4F6
  const BORDER_GRAY = [229, 231, 235] // #E5E7EB
  const LINE_COLOR = [209, 213, 219] // #D1D5DB

  let y = 14

  // ── Header (Plain & Professional) ──────────────────────────
  doc.setTextColor(...BLACK)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(firmName || 'SiteLedger', margin, y + 4)

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)
  doc.text('Project Financial Statement', margin, y + 10)

  // Date on the right
  doc.setFontSize(8.5)
  doc.text(`Generated: ${formatDateLong(new Date().toISOString())}`, pageW - margin, y + 4, { align: 'right' })
  doc.text(`Project Code: ${project.project_code}`, pageW - margin, y + 10, { align: 'right' })

  // Subtle divider line
  y += 15
  doc.setDrawColor(...LINE_COLOR)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)

  y += 6

  // ── Project Details Box (Clean White with subtle border) ────
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.3)
  doc.setFillColor(252, 252, 252)
  doc.roundedRect(margin, y, contentW, 26, 1.5, 1.5, 'FD')

  // Left column
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text(project.project_name, margin + 4, y + 6)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)
  doc.text(`Project Code: ${project.project_code}`, margin + 4, y + 12)
  doc.text(`Status: ${project.project_status}`, margin + 4, y + 18)

  // Right column
  const col2X = margin + contentW / 2
  doc.text(`Owner: ${project.owner_name}`, col2X, y + 6)
  if (project.owner_mobile) doc.text(`Contact: ${project.owner_mobile}`, col2X, y + 12)
  if (project.site_address) {
    const addr = doc.splitTextToSize(`Site: ${project.site_address}`, contentW / 2 - 6)
    doc.text(addr, col2X, y + 18)
  }

  y += 32

  // ── Financial Summary (Clean 3-Box Minimalist Row) ──────────
  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Financial Summary', margin, y)
  y += 4

  const boxW = (contentW - 8) / 3
  const boxH = 18
  const summaryBoxes = [
    { label: 'Total Received', value: formatPDFMoney(stats.totalReceived) },
    { label: 'Total Expenses', value: formatPDFMoney(stats.totalExpenses) },
    { label: 'Net Balance', value: formatPDFMoney(stats.balance) }
  ]

  summaryBoxes.forEach((item, i) => {
    const bx = margin + i * (boxW + 4)
    doc.setDrawColor(...BORDER_GRAY)
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(bx, y, boxW, boxH, 1.5, 1.5, 'FD')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK_GRAY)
    doc.text(item.label, bx + 4, y + 6)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(item.value, bx + 4, y + 13.5)
  })

  y += boxH + 8

  // Common Table Styling (Plain, clean, elegant)
  const plainTableConfig = {
    theme: 'plain',
    styles: {
      fontSize: 8,
      textColor: BLACK,
      cellPadding: 2.5,
      lineColor: BORDER_GRAY,
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: LIGHT_GRAY,
      textColor: BLACK,
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: BORDER_GRAY,
      lineWidth: 0.2
    },
    footStyles: {
      fillColor: LIGHT_GRAY,
      textColor: BLACK,
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: BORDER_GRAY,
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    }
  }

  // ── Category Breakdown ─────────────────────────────────────
  if (stats.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0) {
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text('Expense Category Breakdown', margin, y)
    y += 3

    const catRows = Object.entries(stats.categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amt]) => [
        cat,
        formatPDFMoney(amt),
        stats.totalExpenses > 0 ? `${((amt / stats.totalExpenses) * 100).toFixed(1)}%` : '0%'
      ])

    autoTable(doc, {
      ...plainTableConfig,
      startY: y,
      head: [['Category', 'Total Amount', 'Share (%)']],
      body: catRows,
      margin: { left: margin, right: margin },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    })

    y = doc.lastAutoTable.finalY + 8
  }

  // ── Income History ─────────────────────────────────────────
  if (income && income.length > 0) {
    if (y > pageH - 45) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(`Income History (${income.length} entries)`, margin, y)
    y += 3

    autoTable(doc, {
      ...plainTableConfig,
      startY: y,
      head: [['Date', 'Payment Mode', 'Reference', 'Remarks', 'Amount']],
      body: income.map(i => [
        formatDate(i.date),
        i.payment_mode,
        i.transaction_reference || '—',
        i.remarks || '—',
        formatPDFMoney(i.amount)
      ]),
      margin: { left: margin, right: margin },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' }
      },
      foot: [[
        'Total Income Received', '', '', '',
        formatPDFMoney(income.reduce((s, i) => s + Number(i.amount), 0))
      ]]
    })

    y = doc.lastAutoTable.finalY + 8
  }

  // ── Expense History ────────────────────────────────────────
  if (expenses && expenses.length > 0) {
    if (y > pageH - 45) {
      doc.addPage()
      y = margin
    }

    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(`Expense History (${expenses.length} entries)`, margin, y)
    y += 3

    autoTable(doc, {
      ...plainTableConfig,
      startY: y,
      head: [['Date', 'Category', 'Sub-Category', 'Vendor', 'Mode', 'Amount']],
      body: expenses.map(e => [
        formatDate(e.expense_date),
        e.category,
        e.sub_category || '—',
        e.vendor_name || '—',
        e.payment_mode,
        formatPDFMoney(e.amount)
      ]),
      margin: { left: margin, right: margin },
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' }
      },
      foot: [[
        'Total Expenses', '', '', '', '',
        formatPDFMoney(expenses.reduce((s, e) => s + Number(e.amount), 0))
      ]]
    })
  }

  // ── Plain Footer on all pages ──────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE_COLOR)
    doc.setLineWidth(0.2)
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10)

    doc.setFontSize(8)
    doc.setTextColor(...DARK_GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${firmName || 'SiteLedger'} · ${project.project_code} — ${project.project_name}`,
      margin,
      pageH - 6
    )
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageW - margin,
      pageH - 6,
      { align: 'right' }
    )
  }

  // ── Save PDF ───────────────────────────────────────────────
  const prefix = (firmName || 'SiteLedger').replace(/\s+/g, '_')
  const filename = `${prefix}_${project.project_code}_${project.project_name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`
  if (save) {
    doc.save(filename)
  }

  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  return { doc, filename, blob, file }
}

/**
 * Generate a consolidated Master All-Projects Financial Statement PDF
 */
export async function generateAllProjectsPDF({ projects = [], stats = {}, firmName }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentW = pageW - margin * 2

  const BLACK = [17, 24, 39]
  const DARK_GRAY = [75, 85, 99]
  const LIGHT_GRAY = [243, 244, 246]
  const BORDER_GRAY = [229, 231, 235]
  const LINE_COLOR = [209, 213, 219]

  let y = 14

  // Header
  doc.setTextColor(...BLACK)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(firmName || 'SiteLedger', margin, y + 4)

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)
  doc.text('Master Projects Financial Summary', margin, y + 10)

  doc.setFontSize(8.5)
  doc.text(`Generated: ${formatDateLong(new Date().toISOString())}`, pageW - margin, y + 4, { align: 'right' })
  doc.text(`Total Projects: ${projects.length}`, pageW - margin, y + 10, { align: 'right' })

  y += 15
  doc.setDrawColor(...LINE_COLOR)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)

  y += 6

  // Calculate totals
  let grandReceived = 0
  let grandExpenses = 0
  projects.forEach(p => {
    const s = stats[p.id] || {}
    grandReceived += Number(s.totalReceived || 0)
    grandExpenses += Number(s.totalExpenses || 0)
  })
  const grandBalance = grandReceived - grandExpenses

  // Financial Summary Cards
  const boxW = (contentW - 8) / 3
  const boxH = 18
  const summaryBoxes = [
    { label: 'Overall Received', value: formatPDFMoney(grandReceived) },
    { label: 'Overall Expenses', value: formatPDFMoney(grandExpenses) },
    { label: 'Overall Net Balance', value: formatPDFMoney(grandBalance) }
  ]

  summaryBoxes.forEach((item, i) => {
    const bx = margin + i * (boxW + 4)
    doc.setDrawColor(...BORDER_GRAY)
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(bx, y, boxW, boxH, 1.5, 1.5, 'FD')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK_GRAY)
    doc.text(item.label, bx + 4, y + 6)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(item.value, bx + 4, y + 13.5)
  })

  y += boxH + 8

  // Projects Breakdown Table
  const tableRows = projects.map(p => {
    const s = stats[p.id] || {}
    const r = Number(s.totalReceived || 0)
    const e = Number(s.totalExpenses || 0)
    const b = r - e
    return [
      p.project_code,
      p.project_name,
      p.owner_name,
      p.project_status,
      formatPDFMoney(r),
      formatPDFMoney(e),
      formatPDFMoney(b)
    ]
  })

  autoTable(doc, {
    theme: 'plain',
    startY: y,
    head: [['Code', 'Project Name', 'Owner', 'Status', 'Received', 'Expenses', 'Balance']],
    body: tableRows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      textColor: BLACK,
      cellPadding: 2.5,
      lineColor: BORDER_GRAY,
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: LIGHT_GRAY,
      textColor: BLACK,
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: BORDER_GRAY,
      lineWidth: 0.2
    },
    footStyles: {
      fillColor: LIGHT_GRAY,
      textColor: BLACK,
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: BORDER_GRAY,
      lineWidth: 0.2
    },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' }
    },
    foot: [[
      'Total', `${projects.length} Projects`, '', '',
      formatPDFMoney(grandReceived),
      formatPDFMoney(grandExpenses),
      formatPDFMoney(grandBalance)
    ]]
  })

  // Footers
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE_COLOR)
    doc.setLineWidth(0.2)
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10)

    doc.setFontSize(8)
    doc.setTextColor(...DARK_GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${firmName || 'SiteLedger'} · All Projects Financial Summary`,
      margin,
      pageH - 6
    )
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageW - margin,
      pageH - 6,
      { align: 'right' }
    )
  }

  const prefix = (firmName || 'SiteLedger').replace(/\s+/g, '_')
  const filename = `${prefix}_All_Projects_Summary_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`
  doc.save(filename)
}
