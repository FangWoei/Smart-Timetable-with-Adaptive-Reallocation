// src/data/retakeData.js
// 重修（retake）学生的假数据 + 排课逻辑。数据库接好后，只需要把这里的常量换成 API 返回值。
//
// 时间格：startSlot 1..21 = 半小时一格（1 = 08:30），colSpan = 占几格（4 = 2 小时）
 
const SEM_START = '05/01/2026'
const SEM_END = '24/04/2026'
 
const mk = (id, name, day, startSlot, colSpan, room, instructor, tone = 'navy') => ({
  id, name, day, startSlot, colSpan, room, instructor, tone,
  startDate: SEM_START, endDate: SEM_END,
})
 
/* ---------- 各 group 本学期的正常课表 ---------- */
export const BASE_COURSES = {
  DB2601A: [
    mk('b-a1', 'Principles of Marketing', 'MONDAY', 1, 4, 'BR-104', 'Ms Chong', 'blue'),
    mk('b-a2', 'Business Communication', 'TUESDAY', 5, 4, 'BR-201', 'Mr Raj', 'emerald'),
    mk('b-a3', 'Business Computing', 'WEDNESDAY', 9, 4, 'LAB-2', 'Dr Lim', 'purple'),
    mk('b-a4', 'Management Principles', 'THURSDAY', 3, 4, 'BR-104', 'Ms Tan', 'navy'),
    mk('b-a5', 'Business Mathematics', 'FRIDAY', 7, 4, 'BR-305', 'Dr Wong', 'blue'),
  ],
  HM2601A: [
    mk('b-h1', 'Hospitality Operations', 'MONDAY', 7, 4, 'BR-202', 'Ms Aisha', 'emerald'),
    mk('b-h2', 'Food & Beverage Service', 'TUESDAY', 1, 4, 'KITCHEN-1', 'Chef Daniel', 'purple'),
    mk('b-h3', 'Tourism Geography', 'WEDNESDAY', 5, 4, 'BR-202', 'Mr Faizal', 'blue'),
    mk('b-h4', 'Customer Service', 'THURSDAY', 9, 4, 'BR-305', 'Ms Aisha', 'navy'),
  ],
  DB2542A: [
    mk('b-d1', 'Financial Accounting II', 'MONDAY', 5, 4, 'BR-308', 'Dr Wong', 'blue'),
    mk('b-d2', 'Business Finance', 'WEDNESDAY', 1, 4, 'BR-308', 'Ms Tan', 'emerald'),
    mk('b-d3', 'Organisational Behaviour', 'THURSDAY', 7, 4, 'BR-201', 'Mr Raj', 'navy'),
    mk('b-d4', 'Entrepreneurship', 'FRIDAY', 3, 4, 'BR-104', 'Ms Chong', 'purple'),
  ],
}
 
/* ---------- 重修学生 ---------- */
export const RETAKE_STUDENTS = [
  { id: '2401019', name: 'Nur Aisyah B.', baseGroup: 'DB2601A', programme: 'Diploma in Business, Year 1' },
  { id: '2401011', name: 'Tan Wei Jie', baseGroup: 'DB2601A', programme: 'Diploma in Business, Year 1' },
  { id: '2401013', name: 'Arvind Kumar', baseGroup: 'DB2601A', programme: 'Diploma in Business, Year 1' },
  { id: '2402005', name: 'Lim Hui Min', baseGroup: 'HM2601A', programme: 'Diploma in Hospitality, Year 1' },
  { id: '2402008', name: 'Farid Hakimi', baseGroup: 'HM2601A', programme: 'Diploma in Hospitality, Year 1' },
  { id: '2403002', name: 'Chong Mei Ling', baseGroup: 'DB2542A', programme: 'Diploma in Business, Year 2' },
]
 
/* ---------- 重修科目（时长、教室、讲师是默认值；时间由你拖到哪里决定） ---------- */
export const SUBJECTS = [
  { code: 'ECO201', subject: 'Microeconomics', hours: 2, room: 'BR-308', instructor: 'Dr Ong' },
  { code: 'BLW204', subject: 'Business Law', hours: 2, room: 'BR-308', instructor: 'Ms Chong' },
  { code: 'ACC101', subject: 'Accounting I', hours: 2, room: 'BR-202', instructor: 'Ms Tan' },
  { code: 'BST102', subject: 'Business Statistics', hours: 2, room: 'BR-305', instructor: 'Dr Lim' },
]
 
/* ---------- 每个学生要重修什么 ---------- */
export const RETAKE_REQUESTS = [
  { id: 'r1', studentId: '2401019', code: 'ECO201' },
  { id: 'r2', studentId: '2401011', code: 'BLW204' },
  { id: 'r3', studentId: '2401013', code: 'ACC101' },
  { id: 'r4', studentId: '2402005', code: 'BST102' },
  { id: 'r5', studentId: '2402008', code: 'ECO201' },
  { id: 'r6', studentId: '2402008', code: 'BST102' },
  { id: 'r7', studentId: '2403002', code: 'ACC101' },
]
 
/* ---------- 逻辑 ----------
 * picks = { [requestId]: { day: 'MONDAY', startSlot: 5 } }   重修科目放在哪一天、哪一格
 * 重修科目可以放在任何空位；唯一的限制：不能压到学生原本（所在班级）的课。
 */
export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
export const SLOT_COUNT = 21
 
const overlaps = (a, b) =>
  a.day === b.day && a.startSlot < b.startSlot + b.colSpan && b.startSlot < a.startSlot + a.colSpan
 
export const studentById = (id) => RETAKE_STUDENTS.find((s) => s.id === id)
export const subjectOf = (code) => SUBJECTS.find((x) => x.code === code)
export const subjectName = (code) => subjectOf(code)?.subject ?? code
export const spanOf = (code) => (subjectOf(code)?.hours ?? 2) * 2
 
/** 把起点限制在一天之内（不能超出 19:00） */
export const clampStart = (startSlot, colSpan) =>
  Math.max(1, Math.min(startSlot, SLOT_COUNT - colSpan + 1))
 
/** 这个位置压到了学生原本的哪些课（有就不允许放） */
export function baseClashes(student, day, startSlot, colSpan) {
  const probe = { day, startSlot, colSpan }
  return (BASE_COURSES[student.baseGroup] ?? []).filter((c) => overlaps(c, probe))
}
 
/** 重修科目放在这个位置时，和同一个学生其他重修科目的重叠 */
export function clashesFor(request, picks) {
  const mine = picks[request.id]
  if (!mine) return []
  const probe = { day: mine.day, startSlot: mine.startSlot, colSpan: spanOf(request.code) }
  return RETAKE_REQUESTS
    .filter((r) => r.studentId === request.studentId && r.id !== request.id && picks[r.id])
    .map((r) => courseFor(r, picks[r.id]))
    .filter((c) => overlaps(c, probe))
}
 
function courseFor(request, place) {
  const sub = subjectOf(request.code)
  return {
    id: `rt-${request.id}`,
    requestId: request.id,
    name: `${sub.subject} (Retake)`,
    day: place.day,
    startSlot: place.startSlot,
    colSpan: spanOf(request.code),
    room: sub.room,
    instructor: sub.instructor,
    tone: 'amber',
    startDate: SEM_START,
    endDate: SEM_END,
  }
}
 
/** 给还没排的重修科目找第一个空位（不压原本的课，也尽量不叠别的重修）。已排好的不动。 */
export function generatePicks(existing = {}) {
  const picks = { ...existing }
  for (const req of RETAKE_REQUESTS) {
    if (picks[req.id]) continue
    const student = studentById(req.studentId)
    const span = spanOf(req.code)
    const taken = RETAKE_REQUESTS
      .filter((r) => r.studentId === student.id && picks[r.id])
      .map((r) => courseFor(r, picks[r.id]))
    let found = null
    for (const day of DAYS) {
      for (let start = 1; start + span - 1 <= SLOT_COUNT; start += 2) {
        const probe = { day, startSlot: start, colSpan: span }
        if (baseClashes(student, day, start, span).length) continue
        if (taken.some((c) => overlaps(c, probe))) continue
        found = { day, startSlot: start }
        break
      }
      if (found) break
    }
    if (found) picks[req.id] = found
  }
  return picks
}
 
export function requestStatus(request, picks) {
  const place = picks[request.id]
  if (!place) return { placed: false, place: null, clashes: [] }
  return { placed: true, place, clashes: clashesFor(request, picks) }
}
 
export function studentStatus(studentId, picks) {
  const reqs = RETAKE_REQUESTS.filter((r) => r.studentId === studentId)
  const stats = reqs.map((r) => requestStatus(r, picks))
  if (stats.some((s) => s.clashes.length)) return 'conflict'
  if (stats.length && stats.every((s) => s.placed)) return 'clear'
  return 'pending'
}
 
/** 正常课表 + 已排好的重修科目（琥珀色），格式和 TimetableView 需要的一样。 */
export function buildTimetable(student, picks) {
  const retakes = RETAKE_REQUESTS
    .filter((r) => r.studentId === student.id && picks[r.id])
    .map((r) => courseFor(r, picks[r.id]))
  return {
    programme: student.programme,
    semesterStart: SEM_START,
    semesterEnd: SEM_END,
    courses: [...(BASE_COURSES[student.baseGroup] ?? []), ...retakes],
  }
}
 
const hhmm = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
 
/** 第 n 格的开始时间（1 = 08:30） */
export const slotStart = (slot) => hhmm(8 * 60 + 30 + (slot - 1) * 30)
 
export const slotText = ({ day, startSlot, colSpan }) =>
  `${day[0]}${day.slice(1, 3).toLowerCase()} ${slotStart(startSlot)}–${slotStart(startSlot + colSpan)}`
 
 