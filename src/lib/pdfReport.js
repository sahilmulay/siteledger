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

/**
 * Convert number to Indian currency words
 */
export function numberToWordsINR(amount) {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only'
  const num = Math.floor(Math.abs(Number(amount)))
  const paise = Math.round((Math.abs(Number(amount)) - num) * 100)

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function inWords(n) {
    if (n === 0) return ''
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '')
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '')
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '')
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '')
  }

  let words = inWords(num).trim()
  if (!words) words = 'Zero'
  words += ' Rupees'
  if (paise > 0) {
    words += ' and ' + inWords(paise).trim() + ' Paise'
  }
  return words + ' Only'
}

/**
 * Generate a PDF containing ONLY the filtered expenses and their subtotal
 */
export async function generateFilteredExpensesPDF({ project, expenses = [], filterSummary = {}, firmName, save = true }) {
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
  doc.text('Filtered Expense Report', margin, y + 10)

  // Right side meta
  doc.setFontSize(8.5)
  doc.text(`Generated: ${formatDateLong(new Date().toISOString())}`, pageW - margin, y + 4, { align: 'right' })
  doc.text(`Project: ${project?.project_code || '—'} · ${project?.project_name || ''}`, pageW - margin, y + 10, { align: 'right' })

  y += 15
  doc.setDrawColor(...LINE_COLOR)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)

  y += 6

  // Total amount
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  // Filter Details & Summary Box
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.3)
  doc.setFillColor(252, 252, 252)
  doc.roundedRect(margin, y, contentW, 20, 1.5, 1.5, 'FD')

  // Left side: Active Filters
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Active Filters Applied:', margin + 4, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)

  const filterTags = []
  if (filterSummary.category) filterTags.push(`Category: ${filterSummary.category}`)
  if (filterSummary.subCategory) filterTags.push(`Sub-Cat: ${filterSummary.subCategory}`)
  if (filterSummary.paymentMode) filterTags.push(`Mode: ${filterSummary.paymentMode}`)
  if (filterSummary.startDate || filterSummary.endDate) {
    filterTags.push(`Date: ${filterSummary.startDate || 'Start'} to ${filterSummary.endDate || 'Now'}`)
  }
  if (filterSummary.search) filterTags.push(`Search: "${filterSummary.search}"`)

  const filterText = filterTags.length > 0 ? filterTags.join('  |  ') : 'None (Showing All Filtered)'
  const splitFilter = doc.splitTextToSize(filterText, contentW - 65)
  doc.text(splitFilter, margin + 4, y + 12)

  // Right side: Total and Count
  const rightX = pageW - margin - 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Records: ${expenses.length}`, rightX, y + 6, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BLACK)
  doc.text(`Total: ${formatPDFMoney(totalAmount)}`, rightX, y + 13, { align: 'right' })

  y += 26

  // Table
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
    }
  }

  const tableBody = expenses.map(e => [
    formatDate(e.expense_date),
    e.category,
    e.sub_category || '—',
    e.vendor_name || '—',
    e.payment_mode,
    e.transaction_reference || e.remarks || '—',
    formatPDFMoney(e.amount)
  ])

  autoTable(doc, {
    ...plainTableConfig,
    startY: y,
    head: [['Date', 'Category', 'Sub-Category', 'Vendor', 'Mode', 'Ref / Note', 'Amount']],
    body: tableBody,
    margin: { left: margin, right: margin },
    columnStyles: {
      6: { halign: 'right', fontStyle: 'bold' }
    },
    foot: [[
      'Total Filtered Amount', '', '', '', '', `${expenses.length} Items`,
      formatPDFMoney(totalAmount)
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
      `${firmName || 'SiteLedger'} · Filtered Expense Report · ${project?.project_name || ''}`,
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
  const filename = `${prefix}_${project?.project_code || 'PRJ'}_Filtered_Expenses_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`
  if (save) doc.save(filename)

  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })
  return { doc, filename, blob, file }
}

/**
 * Generate an official single-expense Payment Voucher / Receipt PDF
 */
export async function generateSingleExpenseVoucherPDF({ project, expense, firmName, save = true }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentW = pageW - margin * 2

  const BLACK = [17, 24, 39]
  const DARK_GRAY = [75, 85, 99]
  const LIGHT_GRAY = [243, 244, 246]
  const BORDER_GRAY = [209, 213, 219]
  const LINE_COLOR = [229, 231, 235]

  let y = margin

  // Outer border for voucher (Contractor Voucher style)
  doc.setDrawColor(...BORDER_GRAY)
  doc.setLineWidth(0.6)
  doc.rect(margin, y, contentW, 140, 'S')

  // Top header area
  const pad = 6
  let curY = y + pad

  doc.setTextColor(...BLACK)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(firmName || 'SiteLedger', margin + pad, curY + 4)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)
  doc.text('Construction Contractors & Engineers', margin + pad, curY + 9)

  // Voucher Title on right
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('PAYMENT VOUCHER', pageW - margin - pad, curY + 4, { align: 'right' })

  const voucherNo = 'PV-' + (expense.id ? expense.id.slice(0, 8).toUpperCase() : Date.now().toString().slice(-6))
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)
  doc.text(`Voucher No: ${voucherNo}`, pageW - margin - pad, curY + 9, { align: 'right' })

  curY += 15
  doc.setDrawColor(...LINE_COLOR)
  doc.setLineWidth(0.3)
  doc.line(margin + pad, curY, pageW - margin - pad, curY)
  curY += 5

  // Project and Date Meta Row
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Date: ', margin + pad, curY)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)
  doc.text(formatDateLong(expense.expense_date), margin + pad + 12, curY)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Project: ', margin + pad + 65, curY)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)
  doc.text(`${project?.project_name || 'Project'} (${project?.project_code || '—'})`, margin + pad + 78, curY)

  curY += 7

  // Paid to Row
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Paid To: ', margin + pad, curY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  const vendorDisplay = expense.vendor_name || 'Bearer / Cash'
  doc.text(vendorDisplay, margin + pad + 15, curY)

  const mobileDisplay = expense.vendor_mobile || (expense.remarks?.match(/Phone:\s*(\d+)/)?.[1])
  if (mobileDisplay) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK_GRAY)
    doc.text(`(Mobile: ${mobileDisplay})`, margin + pad + 18 + doc.getTextWidth(vendorDisplay), curY)
  }

  curY += 8

  // Particulars Table / Box
  const tableData = [
    ['Category', expense.category],
    ['Sub-Category', expense.sub_category || '—'],
    ['Payment Mode', expense.payment_mode || 'Cash'],
    ['Reference / UTR', expense.transaction_reference || '—'],
    ['Description / Remarks', expense.remarks || '—']
  ]

  autoTable(doc, {
    theme: 'plain',
    startY: curY,
    margin: { left: margin + pad, right: margin + pad },
    body: tableData,
    styles: {
      fontSize: 8.5,
      textColor: BLACK,
      cellPadding: 2,
      lineColor: LINE_COLOR,
      lineWidth: 0.15
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 45, textColor: DARK_GRAY },
      1: { textColor: BLACK }
    }
  })

  curY = doc.lastAutoTable.finalY + 5

  // Amount Row with box
  doc.setFillColor(...LIGHT_GRAY)
  doc.setDrawColor(...BORDER_GRAY)
  doc.roundedRect(margin + pad, curY, contentW - pad * 2, 14, 1, 1, 'FD')

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK_GRAY)
  doc.text('Amount in Words:', margin + pad + 3, curY + 5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  const words = numberToWordsINR(expense.amount)
  doc.text(words, margin + pad + 32, curY + 5)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK_GRAY)
  doc.text('Amount Paid:', margin + pad + 3, curY + 10.5)
  doc.setFontSize(11)
  doc.setTextColor(...BLACK)
  doc.text(formatPDFMoney(expense.amount), margin + pad + 32, curY + 10.5)

  curY += 24

  // Signatures
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GRAY)
  doc.line(margin + pad + 10, curY, margin + pad + 55, curY)
  doc.text("Receiver's Signature", margin + pad + 16, curY + 4)

  const sigRightX = pageW - margin - pad - 55
  doc.line(sigRightX, curY, sigRightX + 45, curY)
  doc.text('Authorized Signatory', sigRightX + 6, curY + 4)

  const prefix = (firmName || 'SiteLedger').replace(/\s+/g, '_')
  const vName = (expense.vendor_name || 'Expense').replace(/\s+/g, '_')
  const filename = `${prefix}_Voucher_${vName}_${new Date(expense.expense_date).toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`

  if (save) doc.save(filename)

  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })
  return { doc, filename, blob, file }
}
