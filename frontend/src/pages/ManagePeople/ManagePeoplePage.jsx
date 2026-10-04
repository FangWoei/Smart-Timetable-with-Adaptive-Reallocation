// src/pages/ManagePeople/ManagePeoplePage.jsx
import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Tabs from '../../components/Tabs.jsx'
import Badge from '../../components/Badge.jsx'
import { LECTURERS } from '../../data/people.js'

// 模拟学生数据
const STUDENTS = [
  {
    id: '2401019',
    name: 'Nur Aisyah Binti Rosli',
    email: 'aisyah.rosli@student.edu',
    group: 'DB2601A',
    programme: 'Diploma in Business',
    retake: 'Retaking 1',
    retakeDetails: {
      subject: 'Microeconomics',
      section: 'DB2542A section · Wed 11:00–12:30 · BR-104',
      original: 'DB2601A, Aug 2025 intake — failed',
      status: 'No clash'
    }
  },
  {
    id: '2401002',
    name: 'Wong Mei Ling',
    email: 'meiling.wong@student.edu',
    group: 'DB2601A',
    programme: 'Diploma in Business',
    retake: 'None',
  },
  {
    id: '2401007',
    name: 'Muhammad Aiman',
    email: 'aiman@student.edu',
    group: 'DB2601A',
    programme: 'Diploma in Business',
    retake: 'None',
  },
  {
    id: '2401011',
    name: 'Tan Wei Jie',
    email: 'weijie.tan@student.edu',
    group: 'HM2601A',
    programme: 'Diploma in Hospitality',
    retake: 'Retaking 1',
  },
  {
    id: '2401013',
    name: 'Arvind Kumar',
    email: 'arvind.kumar@student.edu',
    group: 'DB2601A',
    programme: 'Diploma in Business',
    retake: 'Retaking 1',
  },
  {
    id: '2401021',
    name: 'Lim Zhi Xuan',
    email: 'zhixuan.lim@student.edu',
    group: 'ACC2601A',
    programme: 'Diploma in Accounting',
    retake: 'Retaking 1',
  },
  {
    id: '2401026',
    name: 'Farah Ain Zulkifli',
    email: 'farah.ain@student.edu',
    group: 'DB2542B',
    programme: 'Diploma in Business',
    retake: 'None',
  },
  {
    id: '2401033',
    name: 'Ong Jun Hao',
    email: 'junhao.ong@student.edu',
    group: 'IT2601A',
    programme: 'Diploma in IT',
    retake: 'None',
  },
]

// 模拟科目数据
const SUBJECTS = [
  {
    code: 'BUS101',
    name: 'Business Statistics',
    category: 'Business',
    sessionType: 'Lecture + tutorial',
    roomType: 'Standard room',
    hours: 4,
    lecturers: ['Dr Lim Chee Keong', 'Ms Koh Bee Hoon']
  },
  {
    code: 'ENG102',
    name: 'Academic English',
    category: 'Languages',
    sessionType: 'Lecture + tutorial',
    roomType: 'Standard room',
    hours: 3,
    lecturers: ['Dr Lim Chee Keong']
  },
  {
    code: 'MKT201',
    name: 'Marketing Principles',
    category: 'Business',
    sessionType: 'Lecture + tutorial',
    roomType: 'Standard room',
    hours: 4,
    lecturers: ['Ms Koh Bee Hoon']
  },
  {
    code: 'ACC201',
    name: 'Accounting I',
    category: 'Accounting',
    sessionType: 'Lecture + tutorial',
    roomType: 'Standard room',
    hours: 4,
    lecturers: ['Dr Lim Chee Keong']
  },
  {
    code: 'ACC202',
    name: 'Accounting II',
    category: 'Accounting',
    sessionType: 'Lecture + tutorial',
    roomType: 'Standard room',
    hours: 4,
    lecturers: ['Dr Lim Chee Keong', 'Ms Koh Bee Hoon']
  },
  {
    code: 'FIN205',
    name: 'Financial Management',
    category: 'Accounting',
    sessionType: 'Lecture + tutorial',
    roomType: 'Standard room',
    hours: 4,
    lecturers: ['Dr Lim Chee Keong']
  },
  {
    code: 'LAW150',
    name: 'Business Law',
    category: 'Law',
    sessionType: 'Lecture + tutorial',
    roomType: 'Standard room',
    hours: 3,
    lecturers: ['Ms Koh Bee Hoon']
  },
  {
    code: 'ECO110',
    name: 'Microeconomics',
    category: 'Business',
    sessionType: 'Lecture + tutorial',
    roomType: 'Standard room',
    hours: 3,
    lecturers: ['Dr Lim Chee Keong']
  },
  {
    code: 'PRG101',
    name: 'Programming',
    category: 'IT',
    sessionType: 'Lecture + lab',
    roomType: 'Computer lab',
    hours: 5,
    lecturers: ['Dr Lim Chee Keong']
  },
  {
    code: 'DBS201',
    name: 'Databases',
    category: 'IT',
    sessionType: 'Lecture + lab',
    roomType: 'Computer lab',
    hours: 4,
    lecturers: ['Ms Koh Bee Hoon']
  },
]

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

// 讲师子组件
function LecturersTab() {
  const [query, setQuery] = useState('')
  const [lecturers, setLecturers] = useState(LECTURERS)
  const [selectedId, setSelectedId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  useEffect(() => {
    if (selectedId !== null) {
      const found = lecturers.find(l => l.id === selectedId)
      setEditForm(found ? JSON.parse(JSON.stringify(found)) : null)
    } else {
      setEditForm(null)
    }
  }, [selectedId, lecturers])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lecturers.filter((l) => !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q))
  }, [query, lecturers])

  const handleSave = async () => {
    if (!editForm) return
    try {
      setLecturers(prev => prev.map(l => l.id === editForm.id ? editForm : l))
      alert(`Successfully updated lecturer: ${editForm.name}`)
      setSelectedId(null)
    } catch (err) {
      console.error(err)
      alert('Failed to save changes')
    }
  }

  const handleDelete = async () => {
    if (!editForm) return
    if (!confirm(`Are you sure you want to delete ${editForm.name}?`)) return
    try {
      setLecturers(prev => prev.filter(l => l.id !== editForm.id))
      setSelectedId(null)
      alert('Lecturer deleted successfully')
    } catch (err) {
      console.error(err)
      alert('Failed to delete lecturer')
    }
  }

  const toggleSlot = (day, slot) => {
    if (!editForm) return
    const currentAvail = editForm.availability || {}
    const key = `${day}-${slot}`
    const currentStatus = currentAvail[key] || 'open'
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

      {selectedId !== null && editForm && (
        <aside className="w-80 shrink-0 self-start rounded-md border border-line bg-white p-4 lg:block overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Edit lecturer</h2>
            <button type="button" onClick={() => setSelectedId(null)} className="text-ink-4 hover:text-ink text-sm font-bold px-1">✕</button>
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
                <button type="button" onClick={() => {
                  const newSubs = editForm.subjects.filter((_, i) => i !== idx)
                  setEditForm({ ...editForm, subjects: newSubs })
                }} className="hover:text-danger font-bold ml-0.5">×</button>
              </span>
            ))}
            <button type="button" onClick={() => {
              const sub = prompt('Enter subject name:')
              if (sub) setEditForm({ ...editForm, subjects: [...(editForm.subjects || []), sub] })
            }} className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[11px] text-ink-3 hover:border-navy-500">+ Add</button>
          </div>

          <div className="mt-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">Max teaching hours / week</label>
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

          <div className="mt-4 border-t border-line pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-4 mb-1">Weekly availability — click a cell to toggle</div>
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
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
            <button type="button" onClick={handleDelete} className="h-[28px] rounded border border-danger/40 bg-white px-2.5 text-xs font-semibold text-danger hover:bg-red-50 transition-colors">Delete</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedId(null)} className="h-[28px] rounded border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel transition-colors">Cancel</button>
              <button type="button" onClick={handleSave} className="h-[28px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors">Save changes</button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

// 学生子组件
function StudentsTab() {
  const [query, setQuery] = useState('')
  const [students, setStudents] = useState(STUDENTS)
  const [selectedId, setSelectedId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  useEffect(() => {
    if (selectedId !== null) {
      const found = students.find(s => s.id === selectedId)
      setEditForm(found ? JSON.parse(JSON.stringify(found)) : null)
    } else {
      setEditForm(null)
    }
  }, [selectedId, students])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.group.toLowerCase().includes(q))
  }, [query, students])

  const handleSave = async () => {
    if (!editForm) return
    try {
      setStudents(prev => prev.map(s => s.id === editForm.id ? editForm : s))
      alert(`Successfully updated student: ${editForm.name}`)
      setSelectedId(null)
    } catch (err) {
      console.error(err)
      alert('Failed to save changes')
    }
  }

  const handleDelete = async () => {
    if (!editForm) return
    if (!confirm(`Are you sure you want to delete ${editForm.name}?`)) return
    try {
      setStudents(prev => prev.filter(s => s.id !== editForm.id))
      setSelectedId(null)
      alert('Student deleted successfully')
    } catch (err) {
      console.error(err)
      alert('Failed to delete student')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="mb-3 flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students…"
            aria-label="Search students"
            className="h-[30px] w-72 rounded border border-line bg-white px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
          />
        </div>

        <div className="overflow-x-auto rounded-md border border-line bg-white flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel text-[11px] text-ink-4">
              <tr>
                <th className="px-3 py-2 font-semibold">Student</th>
                <th className="px-3 py-2 font-semibold">Group</th>
                <th className="px-3 py-2 font-semibold">Programme</th>
                <th className="px-3 py-2 font-semibold">Retake</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const active = s.id === selectedId
                const isRetake = s.retake && s.retake !== 'None'
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer border-t border-line-2 transition-colors ${active ? 'bg-navy-50' : 'hover:bg-panel'}`}
                  >
                    <td className="px-3 py-2 flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-navy-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-ink">{s.name}</div>
                        <div className="text-ink-4 text-[11px]">{s.email}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-ink-2">{s.group}</td>
                    <td className="px-3 py-2 text-ink-2">{s.programme}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${isRetake ? 'bg-[#FBE8D2] text-[#A57D2E]' : 'bg-panel text-ink-3'}`}>
                        {s.retake}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.stopPropagation() 
                          setSelectedId(s.id) 
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
                  <td colSpan="5" className="py-8 text-center text-ink-4">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-4">{students.length} students total · showing {rows.length}</p>
      </div>

      {selectedId !== null && editForm && (
        <aside className="w-80 shrink-0 self-start rounded-md border border-line bg-white p-4 lg:block overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Edit student</h2>
            <button type="button" onClick={() => setSelectedId(null)} className="text-ink-4 hover:text-ink text-sm font-bold px-1">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
              Student ID
              <input 
                value={editForm.id} 
                onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500" 
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
              Group
              <select
                value={editForm.group}
                onChange={(e) => setEditForm({ ...editForm, group: e.target.value })}
                className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink bg-white outline-none focus:border-navy-500"
              >
                <option value="DB2601A">DB2601A</option>
                <option value="HM2601A">HM2601A</option>
                <option value="ACC2601A">ACC2601A</option>
                <option value="DB2542B">DB2542B</option>
                <option value="IT2601A">IT2601A</option>
              </select>
            </label>
          </div>
          
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Full Name
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

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Programme
            <select
              value={editForm.programme}
              onChange={(e) => setEditForm({ ...editForm, programme: e.target.value })}
              className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink bg-white outline-none focus:border-navy-500"
            >
              <option value="Diploma in Business">Diploma in Business</option>
              <option value="Diploma in Hospitality">Diploma in Hospitality</option>
              <option value="Diploma in Accounting">Diploma in Accounting</option>
              <option value="Diploma in IT">Diploma in IT</option>
            </select>
          </label>

          <div className="mt-3">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4 mb-1">Retake Status</span>
            {editForm.retakeDetails ? (
              <div className="rounded border border-[#FBE8D2] bg-[#FFFBF7] p-2.5 text-[11px]">
                <div className="flex items-center justify-between font-semibold text-[#A57D2E] mb-1">
                  <span>Retaking {editForm.retakeDetails.subject}</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600 font-normal">No clash</span>
                </div>
                <div className="text-ink-3 leading-relaxed">
                  Placed · {editForm.retakeDetails.section}<br />
                  Original attempt: {editForm.retakeDetails.original}
                </div>
              </div>
            ) : (
              <div className="text-xs text-ink-3">No active retakes for this student.</div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <button type="button" onClick={handleDelete} className="h-[28px] rounded border border-danger/40 bg-white px-2.5 text-xs font-semibold text-danger hover:bg-red-50 transition-colors">Delete</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedId(null)} className="h-[28px] rounded border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel transition-colors">Cancel</button>
              <button type="button" onClick={handleSave} className="h-[28px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors">Save</button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

// 科目子组件 (SubjectsTab)
function SubjectsTab() {
  const [query, setQuery] = useState('')
  const [subjects, setSubjects] = useState(SUBJECTS)
  const [selectedCode, setSelectedCode] = useState(null)
  const [editForm, setEditForm] = useState(null)

  useEffect(() => {
    if (selectedCode !== null) {
      const found = subjects.find(s => s.code === selectedCode)
      setEditForm(found ? JSON.parse(JSON.stringify(found)) : null)
    } else {
      setEditForm(null)
    }
  }, [selectedCode, subjects])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return subjects.filter((s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
  }, [query, subjects])

  const handleSave = async () => {
    if (!editForm) return
    try {
      setSubjects(prev => prev.map(s => s.code === editForm.code ? editForm : s))
      alert(`Successfully updated subject: ${editForm.name}`)
      setSelectedCode(null)
    } catch (err) {
      console.error(err)
      alert('Failed to save changes')
    }
  }

  const handleDelete = async () => {
    if (!editForm) return
    if (!confirm(`Are you sure you want to delete ${editForm.name}?`)) return
    try {
      setSubjects(prev => prev.filter(s => s.code !== editForm.code))
      setSelectedCode(null)
      alert('Subject deleted successfully')
    } catch (err) {
      console.error(err)
      alert('Failed to delete subject')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="mb-3 flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects…"
            aria-label="Search subjects"
            className="h-[30px] w-72 rounded border border-line bg-white px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
          />
        </div>

        <div className="overflow-x-auto rounded-md border border-line bg-white flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel text-[11px] text-ink-4">
              <tr>
                <th className="px-3 py-2 font-semibold">Subject</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Session type</th>
                <th className="px-3 py-2 font-semibold">Hours / week</th>
                <th className="px-3 py-2 font-semibold">Lecturers</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const active = s.code === selectedCode
                return (
                  <tr
                    key={s.code}
                    onClick={() => setSelectedCode(s.code)}
                    className={`cursor-pointer border-t border-line-2 transition-colors ${active ? 'bg-navy-50' : 'hover:bg-panel'}`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{s.name}</div>
                      <div className="text-ink-4 text-[11px]">{s.code}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded-full bg-panel px-2 py-0.5 text-[11px] text-ink-2 font-medium border border-line">
                        {s.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink-2">{s.sessionType}</td>
                    <td className="px-3 py-2 text-ink-2">{s.hours} h/wk</td>
                    <td className="px-3 py-2 text-ink-2">{s.lecturers?.length ? `${s.lecturers.length} lecturer${s.lecturers.length > 1 ? 's' : ''}` : 'None'}</td>
                    <td className="px-3 py-2 text-right">
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.stopPropagation() 
                          setSelectedCode(s.code) 
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
                  <td colSpan="6" className="py-8 text-center text-ink-4">No subjects found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-4">{subjects.length} subjects total · showing {rows.length}</p>
      </div>

      {selectedCode !== null && editForm && (
        <aside className="w-96 shrink-0 self-start rounded-md border border-line bg-white p-4 lg:block overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Edit subject</h2>
            <button type="button" onClick={() => setSelectedCode(null)} className="text-ink-4 hover:text-ink text-sm font-bold px-1">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
              Subject Code
              <input 
                value={editForm.code} 
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500" 
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
              Hours / Week
              <input 
                type="number"
                value={editForm.hours} 
                onChange={(e) => setEditForm({ ...editForm, hours: Number(e.target.value) })}
                className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500" 
              />
            </label>
          </div>
          
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Subject Name
            <input 
              value={editForm.name} 
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500" 
            />
          </label>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
              Session Type
              <select
                value={editForm.sessionType}
                onChange={(e) => setEditForm({ ...editForm, sessionType: e.target.value })}
                className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink bg-white outline-none focus:border-navy-500"
              >
                <option value="Lecture + tutorial">Lecture + tutorial</option>
                <option value="Lecture + lab">Lecture + lab</option>
                <option value="Lecture only">Lecture only</option>
              </select>
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
              Room Type
              <select
                value={editForm.roomType}
                onChange={(e) => setEditForm({ ...editForm, roomType: e.target.value })}
                className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink bg-white outline-none focus:border-navy-500"
              >
                <option value="Standard room">Standard room</option>
                <option value="Computer lab">Computer lab</option>
                <option value="Lecture hall">Lecture hall</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Category
          </label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {['Business', 'Languages', 'Accounting', 'Law', 'IT'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setEditForm({ ...editForm, category: cat })}
                className={`rounded-full px-2.5 py-0.5 text-[11px] border transition-colors ${editForm.category === cat ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-ink-3 border-line hover:border-navy-500'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-4 mb-1">Lecturers Assigned</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {editForm.lecturers?.map((lec, idx) => (
                <span key={lec} className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-700 border border-navy-100">
                  {lec}
                  <button type="button" onClick={() => {
                    const newLecs = editForm.lecturers.filter((_, i) => i !== idx)
                    setEditForm({ ...editForm, lecturers: newLecs })
                  }} className="hover:text-danger font-bold ml-0.5">×</button>
                </span>
              ))}
              <button type="button" onClick={() => {
                const lecName = prompt('Enter lecturer name:')
                if (lecName) setEditForm({ ...editForm, lecturers: [...(editForm.lecturers || []), lecName] })
              }} className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[11px] text-ink-3 hover:border-navy-500">+ Add</button>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-ink-4">Removing this subject also removes it from every group that teaches it.</p>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <button type="button" onClick={handleDelete} className="h-[28px] rounded border border-danger/40 bg-white px-2.5 text-xs font-semibold text-danger hover:bg-red-50 transition-colors">Delete</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedCode(null)} className="h-[28px] rounded border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel transition-colors">Cancel</button>
              <button type="button" onClick={handleSave} className="h-[28px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors">Save</button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

// 主页面组件
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
        ) : tab === 'students' ? (
          <StudentsTab />
        ) : tab === 'subjects' ? (
          <SubjectsTab />
        ) : (
          <div className="rounded-md border border-dashed border-line-strong bg-white p-8 text-center text-xs text-ink-4">
            {TABS.find((t) => t.id === tab)?.label} management module coming soon.
          </div>
        )}
      </div>
    </div>
  )
}