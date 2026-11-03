// src/pages/Holidays/HolidaysPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'

const STATES = [
  ['PNG', 'Penang'], ['KUL', 'Kuala Lumpur'], ['SGR', 'Selangor'], ['JHR', 'Johor'],
  ['KDH', 'Kedah'], ['KTN', 'Kelantan'], ['MLK', 'Melaka'], ['NSN', 'Negeri Sembilan'],
  ['PHG', 'Pahang'], ['PRK', 'Perak'], ['PLS', 'Perlis'], ['SBH', 'Sabah'],
  ['SWK', 'Sarawak'], ['TRG', 'Terengganu'], ['LBN', 'Labuan'], ['PJY', 'Putrajaya'],
]
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const btn =
  'flex h-[30px] items-center gap-1.5 rounded border border-line-strong bg-white px-3 text-[13px] text-ink-2 hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50'
const btnPrimary =
  'flex h-[30px] items-center gap-1.5 rounded bg-navy-700 px-4 text-[13px] font-semibold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50'
const field =
  'h-[30px] rounded border border-line-strong bg-white px-2 text-[13px] text-ink outline-none focus:border-navy-500'

// 用本地时间解析 YYYY-MM-DD，避免时区把日期推到前一天
const parse = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const weekdayOf = (iso) => parse(iso).toLocaleDateString('en-GB', { weekday: 'short' })
const dayLabel = (iso) => parse(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

export default function HolidaysPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [state, setState] = useState('PNG')
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [rows, setRows] = useState(null) // null = loading
  const [semester, setSemester] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)
  const load = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([api.getHolidays(`${year}-01-01`, `${year}-12-31`), api.getSemesters()])
      .then(([list, semesters]) => {
        if (cancelled) return
        setRows(list)
        setSemester(semesters.find((s) => s.is_active) ?? null)
        setError('')
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message)
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [year, reloadKey])

  async function handleSync() {
    setBusy(true)
    setMessage('')
    try {
      const r = await api.syncHolidays(year, state)
      setMessage(`Synced ${year}: ${r.saved} saved, ${r.kept_manual} manual entries kept.`)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(h) {
    if (!window.confirm(`Delete "${h.name}" (${h.holiday_date})?`)) return
    try {
      await api.deleteHoliday(h.holiday_date)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const byMonth = useMemo(() => {
    const groups = Array.from({ length: 12 }, () => [])
    ;(rows ?? []).forEach((h) => groups[parse(h.holiday_date).getMonth()].push(h))
    return groups
  }, [rows])

  const holidayMap = useMemo(
    () => Object.fromEntries((rows ?? []).map((h) => [h.holiday_date, h])),
    [rows],
  )

  const closures = (rows ?? []).filter((h) => !h.is_teaching_day).length
  const inSemester = (iso) =>
    semester && iso >= semester.start_date && iso <= semester.end_date

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      {/* 工具栏 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
        <div className="flex items-center rounded border border-line-strong bg-white text-[13px] text-ink-2">
          <button type="button" aria-label="Previous year" onClick={() => setYear((y) => y - 1)} className="px-2.5 py-1 hover:bg-panel">‹</button>
          <span className="w-14 text-center font-semibold text-ink">{year}</span>
          <button type="button" aria-label="Next year" onClick={() => setYear((y) => y + 1)} className="px-2.5 py-1 hover:bg-panel">›</button>
        </div>

        <select value={state} onChange={(e) => setState(e.target.value)} className={field} aria-label="State">
          {STATES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>

        <button type="button" onClick={handleSync} disabled={busy} className={btn}>
          {busy ? '⏳ Syncing…' : `Sync public holidays ${year}`}
        </button>

        <div role="tablist" aria-label="Holiday view" className="ml-2 flex rounded bg-panel p-0.5">
          {[['list', 'List'], ['calendar', 'Calendar']].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              type="button"
              onClick={() => setView(id)}
              className={`h-[26px] w-[84px] rounded-[3px] text-[13px] ${
                view === id
                  ? 'border border-line-strong bg-white font-semibold text-navy-700'
                  : 'border border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => setShowAdd(true)} className={`${btnPrimary} ml-auto`}>
          + Add closure
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {/* 状态行 */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
          <span className="text-[15px] font-semibold text-ink">
            {rows ? `${rows.length} holidays in ${year}` : 'Loading…'}
          </span>
          {rows && <span>{closures} no-class days</span>}
          {semester && (
            <span>
              Active semester <b className="text-ink-2">{semester.name}</b>: {semester.start_date} → {semester.end_date}
            </span>
          )}
          {message && <span className="font-medium text-navy-700">{message}</span>}
          {error && <span className="font-medium text-danger">{error}</span>}
        </div>

        {rows && rows.length === 0 && !error && (
          <p className="rounded-lg border border-dashed border-line-strong bg-white p-8 text-center text-sm text-ink-4">
            No holidays for {year} yet. Click “Sync public holidays {year}” or add a closure manually.
          </p>
        )}

        {/* 列表视图 */}
        {view === 'list' && rows && rows.length > 0 && (
          <div className="space-y-3">
            {byMonth.map((list, m) =>
              list.length === 0 ? null : (
                <section key={m} className="overflow-hidden rounded-lg border border-line bg-white shadow-xs">
                  <h2 className="border-b border-line bg-panel px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                    {MONTHS[m]} <span className="font-normal text-ink-4">· {list.length}</span>
                  </h2>
                  <ul className="divide-y divide-line">
                    {list.map((h) => (
                      <li key={h.holiday_date} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                        <span className="w-16 shrink-0 font-semibold text-ink">{dayLabel(h.holiday_date)}</span>
                        <span className="w-10 shrink-0 text-ink-3">{weekdayOf(h.holiday_date)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{h.name}</span>
                          {h.note && <span className="block truncate text-[11px] text-ink-4">{h.note}</span>}
                        </span>
                        {inSemester(h.holiday_date) && (
                          <span className="shrink-0 rounded-full bg-navy-50 px-2 py-px text-[10px] font-semibold text-navy-700">in semester</span>
                        )}
                        {h.is_teaching_day && (
                          <span className="shrink-0 rounded-full bg-[#FDF2DF] px-2 py-px text-[10px] font-semibold text-[#8A6212]">classes run</span>
                        )}
                        <span className="w-16 shrink-0 text-right text-[11px] text-ink-4">
                          {h.source === 'manual' ? 'Manual' : 'Auto'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(h)}
                          aria-label={`Delete ${h.name}`}
                          className="shrink-0 rounded px-2 py-0.5 text-xs text-ink-4 hover:bg-panel hover:text-danger"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
          </div>
        )}

        {/* 日历视图 */}
        {view === 'calendar' && rows && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {MONTHS.map((name, m) => (
              <MonthCard key={name} year={year} month={m} name={name} holidayMap={holidayMap} semester={semester} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddClosureDialog
          defaultYear={year}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function MonthCard({ year, month, name, holidayMap, semester }) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // 周一为一周开头
  const days = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const iso = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-xs">
      <h3 className="mb-2 text-[13px] font-semibold text-ink">{name}</h3>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[10px] font-semibold text-ink-4">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />
          const key = iso(d)
          const h = holidayMap[key]
          const weekend = (i % 7) >= 5
          const inSem = semester && key >= semester.start_date && key <= semester.end_date
          let cls = weekend ? 'text-ink-4' : 'text-ink-2'
          if (inSem) cls += ' bg-navy-50'
          if (h) {
            cls = h.is_teaching_day
              ? 'bg-[#FDF2DF] font-bold text-[#8A6212]'
              : 'bg-navy-700 font-bold text-white'
          }
          return (
            <span
              key={key}
              title={h ? h.name : undefined}
              className={`flex h-7 items-center justify-center rounded ${cls}`}
            >
              {d}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function AddClosureDialog({ defaultYear, onClose, onSaved }) {
  const [date, setDate] = useState(`${defaultYear}-01-01`)
  const [name, setName] = useState('')
  const [teaching, setTeaching] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setErr('Please enter a name.')
    setSaving(true)
    try {
      await api.addHoliday({
        date,
        name: name.trim(),
        is_teaching_day: teaching,
        note: note.trim() || null,
      })
      onSaved()
    } catch (e2) {
      setErr(e2.message)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-lg">
        <h2 className="text-[15px] font-semibold text-ink">Add closure</h2>

        <label className="block text-xs text-ink-3">
          Date
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1 w-full`} />
        </label>
        <label className="block text-xs text-ink-3">
          Name
          <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. University Day" className={`${field} mt-1 w-full`} />
        </label>
        <label className="block text-xs text-ink-3">
          Note (optional)
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={`${field} mt-1 w-full`} />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={teaching} onChange={(e) => setTeaching(e.target.checked)} />
          Holiday, but classes still run
        </label>

        {err && <p className="text-xs font-medium text-danger">{err}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btn}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
