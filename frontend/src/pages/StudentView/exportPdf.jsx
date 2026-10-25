// src/pages/StudentView/exportPdf.jsx
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import JSZip from 'jszip'
import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'
import TimetableView from './TimetableView.jsx'

// A4 横向 297mm，左右各留 10mm 边距 → 内容宽 277mm ≈ 1047px (96dpi)
const MARGIN_MM = 10
const A4_W = 297
const A4_H = 210
const CONTENT_W_PX = Math.round(((A4_W - MARGIN_MM * 2) * 96) / 25.4)

const nextFrame = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

/** 用真实的 TimetableView（exportMode = 你原来的打印设计）渲染一个学生，输出 A4 横向 PDF */
export async function renderStudentPdf(student, timetable) {
  const host = document.createElement('div')
  Object.assign(host.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${CONTENT_W_PX}px`,
    zIndex: '-1',
    pointerEvents: 'none',
    background: '#ffffff',
  })
  document.body.appendChild(host)

  const root = createRoot(host)
  try {
    flushSync(() => {
      root.render(<TimetableView student={student} timetable={timetable} exportMode />)
    })
    if (document.fonts?.ready) await document.fonts.ready
    await nextFrame()

    const w = host.offsetWidth
    const h = host.offsetHeight

    const canvas = await html2canvas(host, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
      scrollX: 0,
      scrollY: 0,
    })

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // 按内容宽度铺满；万一太高就等比缩小，保证一页放得下
    const maxW = A4_W - MARGIN_MM * 2
    const maxH = A4_H - MARGIN_MM * 2
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height)
    const imgW = canvas.width * ratio
    const imgH = canvas.height * ratio

    // 水平居中，顶部对齐
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (A4_W - imgW) / 2, MARGIN_MM, imgW, imgH)
    return pdf.output('arraybuffer')
  } finally {
    root.unmount()
    host.remove()
  }
}

const safe = (name) => name.replace(/[^a-zA-Z0-9]/g, '_')

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportSinglePdf(student, timetable) {
  const buf = await renderStudentPdf(student, timetable)
  download(new Blob([buf], { type: 'application/pdf' }), `${safe(student.name)}_${student.id}_Timetable.pdf`)
}

export async function exportBatchZip(students, timetables, onProgress) {
  const zip = new JSZip()
  const folder = zip.folder('Retake_Students_PDFs')
  let done = 0
  for (const s of students) {
    const tt = timetables[s.id]
    if (!tt) continue
    const buf = await renderStudentPdf(s, tt)
    folder.file(`${safe(s.name)}_${s.id}_Retake.pdf`, buf)
    onProgress?.(++done, students.length)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  download(blob, 'All_Retake_Students_Timetables_PDF.zip')
}