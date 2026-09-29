export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
export const PERIODS = [1, 2, 3, 4, 5]

// Lesson colours by subject family (from the design reference).
export const TONES = {
  blue: { bg: '#CFE0F3', bar: '#14406E', code: '#14406E', sub: '#4A6B8F', sub2: '#7A90AB' },
  green: { bg: '#DCE9DB', bar: '#4A7C59', code: '#33604A', sub: '#5F8571', sub2: '#7FA48E' },
  amber: { bg: '#FBE8D2', bar: '#B5701F', code: '#8A5516', sub: '#A67434', sub2: '#B98F55' },
  purple: { bg: '#E3DCF2', bar: '#5B4B8A', code: '#4B3D75', sub: '#6F6295', sub2: '#8C82AE' },
  teal: { bg: '#D6E3EE', bar: '#2A6478', code: '#245567', sub: '#4C7788', sub2: '#6F97A6' },
  rose: { bg: '#F3DFE8', bar: '#8A3E66', code: '#6E2F52', sub: '#93607F', sub2: '#AD819A' },
  gold: { bg: '#FBEBD2', bar: '#C58A1E', code: '#8A6212', sub: '#A57D2E', sub2: '#B99A57' },
}

const SUBJECT_TONE = {
  BS: 'blue', FM: 'blue',
  AE: 'green', MP: 'green',
  AC: 'amber',
  BL: 'purple',
  PR: 'teal', DB: 'teal', NW: 'teal',
  FS: 'rose', HK: 'rose',
  MI: 'gold',
}

// [code, day 0-4, start period 1-5, span, room, lecturer?, flags?]
const lesson = ([code, day, period, span, room, lecturer, flags = {}]) => ({
  code, day, period, span, room, lecturer,
  tone: SUBJECT_TONE[code] ?? 'blue',
  ...flags,
})

export const GROUPS = [
  {
    id: 'DB2601A', count: 18,
    lessons: [
      ['BS', 0, 1, 2, 'BR-201', 'Dr Lim'],
      ['AE', 0, 4, 1, '112'],
      ['MP', 1, 2, 2, 'BR-105', 'Ms Tan'],
      ['AC', 2, 2, 2, 'BR-201', 'Mr Raj', { conflict: true }],
      ['BL', 3, 2, 2, 'BR-308', 'Ms Chong'],
      ['MI', 4, 2, 1, 'RT', undefined, { retake: true }],
    ],
  },
  {
    id: 'DB2601B', count: 18,
    lessons: [
      ['MP', 0, 1, 2, 'BR-106'],
      ['AC', 1, 1, 2, 'BR-203'],
      ['BS', 2, 1, 2, 'BR-204'],
      ['AE', 3, 1, 2, 'BR-112'],
      ['BL', 4, 1, 2, 'BR-308'],
    ],
  },
  {
    id: 'DB2542A', count: 16,
    lessons: [
      ['AC', 0, 3, 2, 'BR-203'],
      ['BL', 1, 3, 2, 'BR-307'],
      ['MP', 2, 3, 2, 'BR-105'],
      ['AE', 3, 3, 1, '112'],
    ],
  },
  {
    id: 'DB2542B', count: 17, alert: true,
    lessons: [
      ['BL', 0, 1, 2, 'BR-307'],
      ['FM', 2, 2, 2, 'BR-201', 'Ms Koh', { conflict: true }],
      ['BS', 3, 2, 2, 'BR-204'],
      ['AC', 4, 3, 2, 'BR-203'],
    ],
  },
  {
    id: 'IT2601A', count: 20,
    lessons: [
      ['PR', 0, 2, 2, 'LAB-1'],
      ['DB', 1, 2, 2, 'LAB-2'],
      ['NW', 2, 4, 2, 'LAB-3'],
      ['AE', 3, 4, 2, 'BR-113'],
    ],
  },
  {
    id: 'IT2601B', count: 19,
    lessons: [
      ['AE', 0, 1, 1, '113'],
      ['PR', 1, 1, 2, 'LAB-1'],
      ['NW', 2, 1, 2, 'LAB-3'],
      ['DB', 3, 3, 2, 'LAB-2'],
    ],
  },
  {
    id: 'HM2601A', count: 15,
    lessons: [
      ['FS', 0, 3, 2, 'KIT-1'],
      ['HK', 1, 4, 2, 'BR-120'],
      ['FS', 3, 1, 2, 'KIT-1'],
      ['HK', 4, 2, 2, 'BR-120'],
    ],
    freeSlots: [{ day: 4, period: 4, span: 1 }],
  },
  {
    id: 'ACC2601A', count: 17,
    lessons: [
      ['AC', 0, 1, 2, 'BR-205'],
      ['BS', 1, 2, 2, 'BR-204'],
      ['BL', 2, 3, 2, 'BR-309'],
      ['AC', 4, 1, 2, 'BR-205'],
    ],
  },
].map((g) => ({ ...g, lessons: g.lessons.map(lesson), freeSlots: g.freeSlots ?? [] }))

export const RESOURCES = [
  { label: 'Subjects', count: 24 },
  { label: 'Lecturers', count: 47 },
  { label: 'Classrooms', count: 19 },
  { label: 'Time slots', count: 25 },
]

export const CONSTRAINTS = [
  { label: 'Lecturer availability' },
  { label: 'Room capacity' },
  { label: 'Daily teaching cap' },
  { label: 'No-gap preference' },
  { label: 'Retake overlap rule', soft: true },
]
