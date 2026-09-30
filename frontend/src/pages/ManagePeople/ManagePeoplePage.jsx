// src/pages/ManagePeople/ManagePeoplePage.jsx
import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Tabs from '../../components/Tabs.jsx'
import Badge from '../../components/Badge.jsx'
import { LECTURERS } from '../../data/people.js'

const TABS = [
  { id: 'lecturers', label: 'Lecturers' },
  { id: 'students', label: 'Students' },
  { id: 'subjects', label: 'Subjects' },
]

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr']
const TIME_SLOTS = ['08-10', '10-12', '13-15', '15-17']

function availability(l) {
  if (l.hours >= l.cap) return { tone: 'danger', text: 'full' }
  if (l.hours / l.cap >= 0.85) return { tone: 'warn', text: 'near limit' }
  return { tone: 'ok', text: 'open' }
}

function LecturersTab() {
  const [query, setQuery] = useState('')
  const [lecturers, setLecturers] = useState(LECTURERS)
  
  // 默认设为 null，表示初始时右侧 Edit 窗口不打开
  const [selectedId, setSelectedId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  // 模拟 API: 获取讲师列表
  useEffect(() => {
    async function fetchLecturers() {
      try {
        // const res = await fetch('/api/lecturers')
        // const data = await res.json()
        // setLecturers(data)
      } catch (err) {
        console.error('Failed to fetch lecturers', err)
      }
    }
    // fetchLecturers()
  }, [])

  // 当选择某个讲师时，同步更新右侧表单状态
  useEffect(() => {
    if (selectedId !== null) {
      const found = lecturers.find(l => l.id === selectedId)
      setEditForm(found ? JSON.parse(JSON.stringify(found)) : null)
    } else {
      setEditForm(null)
    }
  }, [selectedId, lecturers])

  // 过滤搜索
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lecturers.filter((l) => !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q))
  }, [query, lecturers])

  // ==================== API 互动操作方法 ====================

  // 1. 保存更改 (API 接口)
  const handleSave = async () => {
    if (!editForm) return
    try {
      // 真实对接 API 示例:
      // const res = await fetch(`/api/lecturers/${editForm.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(editForm)
      // })
      // if (!res.ok) throw new Error('Failed to update')

      // 前端状态更新
      setLecturers(prev => prev.map(l => l.id === editForm.id ? editForm : l))
      alert(`Successfully updated lecturer: ${editForm.name}`)
      setSelectedId(null) // 保存后关闭侧边栏
    } catch (err) {
      console.error(err)
      alert('Failed to save changes')
    }
  }

  // 2. 删除讲师 (API 接口 - 移至 Edit 内部)
  const handleDelete = async () => {
    if (!editForm) return
    if (!confirm(`Are you sure you want to delete ${editForm.name}?`)) return
    try {
      // 真实对接 API 示例:
      // await fetch(`/api/lecturers/${editForm.id}`, { method: 'DELETE' })

      setLecturers(prev => prev.filter(l => l.id !== editForm.id))
      setSelectedId(null) // 删除后关闭侧边栏
      alert('Lecturer deleted successfully')
    } catch (err) {
      console.error(err)
      alert('Failed to delete lecturer')
    }
  }


  // 4. 切换时间格子的可用状态 (互动)
  const toggleSlot = (day, slot) => {
    if (!editForm) return
    const currentAvail = editForm.availability || {}
    const key = `${day}-${slot}`
    const currentStatus = currentAvail[key] || 'open' // open / busy / unavailable
    
    // 简单的循环切换状态逻辑
    const nextStatus = currentStatus === 'open' ? 'busy' : currentStatus === 'busy' ? 'unavailable' : 'open'

    setEditForm({
      ...editForm,
      availability: {
        ...currentAvail,
        [key]: nextStatus
      }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      {/* 左侧表格主体 */}
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="mb-3 flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lecturers…"
            aria-label="Search lecturers"
            className="h-[30px] w-72 rounded border border-line bg-white px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
          />
        
        </div>

        <div className="overflow-x-auto rounded-md border border-line bg-white flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel text-[11px] text-ink-4">
              <tr>
                <th className="px-3 py-2 font-semibold">Lecturer</th>
                <th className="px-3 py-2 font-semibold">Subjects taught</th>
                <th className="px-3 py-2 font-semibold">Weekly hours</th>
                <th className="px-3 py-2 font-semibold">Availability</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const a = availability(l)
                const active = l.id === selectedId
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className={`cursor-pointer border-t border-line-2 transition-colors ${active ? 'bg-navy-50' : 'hover:bg-panel'}`}
                  >
                    <td className="px-3 py-2 flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-navy-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {l.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-ink">{l.name}</div>
                        <div className="text-ink-4 text-[11px]">{l.email}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-ink-2">{l.subjects?.join(', ') || 'None'}</td>
                    <td className="px-3 py-2 text-ink-2">{l.hours} / {l.cap} hrs</td>
                    <td className="px-3 py-2"><Badge tone={a.tone}>{a.text}</Badge></td>
                    <td className="px-3 py-2 text-right">
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.stopPropagation() 
                          setSelectedId(l.id) 
                        }}
                        className="rounded border border-line bg-white px-3 py-1 text-xs text-ink-2 hover:bg-panel transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-ink-4">No lecturers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-4">{lecturers.length} lecturers total · showing {rows.length}</p>
      </div>

      {/* 右侧编辑面板 (点击行或 Edit 按钮时才出现) */}
      {selectedId !== null && editForm && (
        <aside className="w-80 shrink-0 self-start rounded-md border border-line bg-white p-4 lg:block overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Edit lecturer</h2>
            <button 
              type="button" 
              onClick={() => setSelectedId(null)}
              className="text-ink-4 hover:text-ink text-sm font-bold px-1"
            >
              ✕
            </button>
          </div>
          
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Full name
            <input 
              value={editForm.name} 
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500" 
            />
          </label>

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Email
            <input 
              value={editForm.email} 
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500" 
            />
          </label>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-4">Subjects this lecturer can teach</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {editForm.subjects?.map((s, idx) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-700">
                {s} 
                <button 
                  type="button" 
                  onClick={() => {
                    const newSubs = editForm.subjects.filter((_, i) => i !== idx)
                    setEditForm({ ...editForm, subjects: newSubs })
                  }}
                  className="hover:text-danger font-bold ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            <button 
              type="button" 
              onClick={() => {
                const sub = prompt('Enter subject name:')
                if (sub) setEditForm({ ...editForm, subjects: [...(editForm.subjects || []), sub] })
              }}
              className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[11px] text-ink-3 hover:border-navy-500"
            >
              + Add
            </button>
          </div>

          <div className="mt-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
              Max teaching hours / week
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="number"
                value={editForm.cap} 
                onChange={(e) => setEditForm({ ...editForm, cap: Number(e.target.value) })}
                className="h-[30px] w-20 rounded border border-line px-2 text-xs text-ink outline-none focus:border-navy-500" 
              />
              <span className="text-xs text-ink-3">currently {editForm.hours} assigned</span>
            </div>
          </div>

          {/* 周可用性时间网格 (可互动点击切换状态) */}
          <div className="mt-4 border-t border-line pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-4 mb-1">
              Weekly availability — click a cell to toggle
            </div>
            <div className="grid grid-cols-6 gap-1 text-[10px] text-center mt-2">
              <div></div>
              {DAYS.map(d => <div key={d} className="font-semibold text-ink-3">{d}</div>)}

              {TIME_SLOTS.map(slot => (
                <div key={`row-${slot}`} className="contents">
                  <div className="text-[9px] text-ink-4 flex items-center justify-end pr-1">{slot}</div>
                  {DAYS.map(day => {
                    const status = editForm.availability?.[`${day}-${slot}`] || 'open'
                    let bgClass = 'bg-panel text-ink-3'
                    let textLabel = 'avail'
                    if (status === 'busy') {
                      bgClass = 'bg-[#FBE8D2] text-[#A57D2E] font-medium'
                      textLabel = 'busy'
                    } else if (status === 'unavailable') {
                      bgClass = 'bg-[#FBE2E6] text-danger font-medium'
                      textLabel = 'off'
                    }
                    return (
                      <button
                        key={`${day}-${slot}`}
                        type="button"
                        className={`h-7 rounded border border-line ${bgClass} flex items-center justify-center text-[9px] transition-all hover:opacity-80`}
                        onClick={() => toggleSlot(day, slot)}
                      >
                        {textLabel}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-ink-4">
              <span className="flex items-center gap-1"><span className="size-2 rounded bg-panel border border-line"></span>Available</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded bg-[#FBE8D2]"></span>Busy</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded bg-[#FBE2E6]"></span>Unavailable</span>
            </div>
          </div>

          {/* 底部按钮区（包含删除按钮和保存按钮） */}
          <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
            <button 
              type="button" 
              onClick={handleDelete}
              className="h-[28px] rounded border border-danger/40 bg-white px-2.5 text-xs font-semibold text-danger hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setSelectedId(null)}
                className="h-[28px] rounded border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSave}
                className="h-[28px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors"
              >
                Save changes
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

export default function ManagePeoplePage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'lecturers'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line bg-white px-6 pt-3">
        <Tabs tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id })} label="People and resources" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
        {tab === 'lecturers' ? (
          <LecturersTab />
        ) : (
          <div className="rounded-md border border-dashed border-line-strong bg-white p-8 text-center text-xs text-ink-4">
            {TABS.find((t) => t.id === tab)?.label} management module coming soon.
          </div>
        )}
      </div>
    </div>
  )
}