// src/pages/GroupView/exportGroupPdf.jsx
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import JSZip from 'jszip'
import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'
import TimetableGrid from '../../components/TimetableGrid.jsx'

// A4 横向 297mm，左右各留 10mm 边距 → 内容宽 277mm ≈ 1047px (96dpi)
const MARGIN_MM = 10
const A4_W = 297
const A4_H = 210
const CONTENT_W_PX = Math.round(((A4_W - MARGIN_MM * 2) * 96) / 25.4)

const nextFrame = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

const safe = (name) => String(name).replace(/[^a-zA-Z0-9]/g, '_')

const VIEW_LABELS = { group: 'Groups', lecturer: 'Lecturers', room: 'Rooms' }

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

/** 用真实的 TimetableGrid（exportMode）渲染一个 group / lecturer / room，输出 A4 横向 PDF */
export async function renderGroupPdf(group, view = 'group') {
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
      root.render(
        <TimetableGrid groups={[group]} selectedId={group.id} zoom={100} exportMode view={view} />,
      )
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

/**
 * 批量导出：每个 group / lecturer / room 一个独立 PDF，打包成一个 ZIP
 * @param targets    已经过滤好、需要导出的条目（必须都有 lessons）
 * @param view       'group' | 'lecturer' | 'room'
 * @param onProgress (done, total) => void
 */
export async function exportGroupBatchZip(targets, view, onProgress) {
  const label = VIEW_LABELS[view] || 'Timetables'
  const folderName = `${label}_Timetables_PDFs`
  const zip = new JSZip()
  const folder = zip.folder(folderName)

  const usedNames = new Set()
  let done = 0
  onProgress?.(0, targets.length)

  for (const g of targets) {
    const buf = await renderGroupPdf(g, view)

    // 名字清洗后可能重复（例如两个讲师名字只差符号），重复就加序号
    let base = safe(g.id)
    let name = `${base}_Timetable.pdf`
    let n = 2
    while (usedNames.has(name)) name = `${base}_${n++}_Timetable.pdf`
    usedNames.add(name)

    folder.file(name, buf)
    onProgress?.(++done, targets.length)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  download(blob, `${folderName}.zip`)
}