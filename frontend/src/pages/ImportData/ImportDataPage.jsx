import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Tabs from '../../components/Tabs.jsx'

const TABS = [
  { id: 'bulk', label: 'Bulk import' },
  { id: 'manual', label: 'Add manually' },
]

const FILE_TYPES = [
  { id: 'sheet', label: 'Excel / CSV sheet', accept: '.xlsx,.csv', hint: '.xlsx, .csv up to 10 MB' },
  { id: 'pdf', label: 'PDF class list', accept: '.pdf', hint: '.pdf up to 10 MB' },
]

function BulkImport() {
  const [type, setType] = useState('sheet')
  const [file, setFile] = useState(null)
  const current = FILE_TYPES.find((t) => t.id === type)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-lg font-semibold text-ink">Import students, lecturers or subjects</h1>
      <p className="mt-1 text-sm text-ink-3">
        Upload a PDF class list or an Excel/CSV sheet — we'll match the columns and let you confirm before anything is added.
      </p>

      <div className="mt-4 inline-flex rounded bg-panel p-0.5" role="tablist" aria-label="File type">
        {FILE_TYPES.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === type}
            onClick={() => { setType(t.id); setFile(null) }}
            className={[
              'h-[26px] rounded-[3px] px-4 text-[13px]',
              t.id === type ? 'border border-line-strong bg-white font-semibold text-navy-700' : 'border border-transparent text-ink-3',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] ?? null) }}
          className="flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-white text-center hover:border-navy-500"
        >
          <input
            type="file"
            accept={current.accept}
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <span className="text-sm font-medium text-ink">{file.name}</span>
              <span className="text-xs text-ink-4">{(file.size / 1024).toFixed(0)} KB · choose another to replace</span>
            </>
          ) : (
            <>
              <span className="text-sm text-ink-2">Drag a file here, or click to browse</span>
              <span className="text-xs text-ink-4">{current.hint}</span>
              <span className="mt-1 rounded border border-line-strong px-3 py-1 text-[13px] text-ink-2">Choose file</span>
            </>
          )}
        </label>

        <aside className="rounded-md border border-line bg-white p-4 text-xs text-ink-2">
          <h2 className="text-[13px] font-semibold text-ink">What we'll try to detect</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4">
            <li>Student ID, full name, intake and group columns</li>
            <li>Lecturer name, email and subjects taught (if present)</li>
            <li>Subject code and name, for a subject list sheet</li>
          </ul>
        </aside>
      </div>

      {/* TODO: column-mapping + preview table appear here after the upload is parsed */}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={() => setFile(null)} className="h-[30px] rounded border border-line-strong bg-white px-4 text-[13px] text-ink-2 hover:bg-panel">
          Discard
        </button>
        <button type="button" disabled={!file} className="h-[30px] rounded bg-navy-700 px-4 text-[13px] font-semibold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40">
          Import
        </button>
      </div>
    </div>
  )
}

export default function ImportDataPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'bulk'

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="border-b border-line bg-white px-6 pt-3">
        <Tabs tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id })} label="Import mode" />
      </div>
      <div className="p-6">
        {tab === 'bulk' ? (
          <BulkImport />
        ) : (
          <div className="mx-auto max-w-4xl rounded-md border border-dashed border-line-strong bg-white p-8 text-center text-xs text-ink-4">
            Add-one-at-a-time form goes here
          </div>
        )}
      </div>
    </div>
  )
}
