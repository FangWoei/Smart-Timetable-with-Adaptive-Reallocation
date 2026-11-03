// src/data/timetables.js
export const TIMETABLE_DATA = {
  '2401019': {
    programme: 'DIPLOMA IN BUSINESS (DB2601A)',
    semesterStart: '05/01/2026',
    semesterEnd: '24/04/2026',
    courses: [
      { id: 'c1', name: 'Business Statistics', day: 'MONDAY', startSlot: 1, colSpan: 3, timeStr: '08:00 – 09:30', room: 'BR-201', instructor: 'Dr. John Doe', startDate: '05/01/2026', endDate: '20/04/2026', tone: 'navy' },
      { id: 'c2', name: 'Afternoon Lab Session', day: 'MONDAY', startSlot: 13, colSpan: 4, timeStr: '14:00 – 16:00', room: 'BR-205', instructor: 'Tech Team', startDate: '12/01/2026', endDate: '20/04/2026', tone: 'amber' },
      { id: 'c3', name: 'Marketing Principles', day: 'TUESDAY', startSlot: 4, colSpan: 4, timeStr: '09:30 – 11:30', room: 'BR-105', instructor: 'Prof. Jane Smith', startDate: '06/01/2026', endDate: '21/04/2026', tone: 'emerald' },
      { id: 'c4', name: 'Accounting II', day: 'WEDNESDAY', startSlot: 1, colSpan: 3, timeStr: '08:00 – 09:30', room: 'BR-104', instructor: 'Dr. Wang', startDate: '07/01/2026', endDate: '22/04/2026', tone: 'amber', isRetake: true },
      { id: 'c5', name: 'Microeconomics', day: 'WEDNESDAY', startSlot: 5, colSpan: 3, timeStr: '09:30 – 11:00', room: 'BR-104', instructor: 'Dr. Wang', startDate: '07/01/2026', endDate: '22/04/2026', tone: 'amber', isRetake: true },
      { id: 'c6', name: 'Business Law', day: 'THURSDAY', startSlot: 2, colSpan: 4, timeStr: '08:30 – 10:30', room: 'BR-308', instructor: 'Mr. Alan Lee', startDate: '08/01/2026', endDate: '23/04/2026', tone: 'purple' },
      { id: 'c7', name: 'Accounting Catchup', day: 'THURSDAY', startSlot: 11, colSpan: 4, timeStr: '13:00 – 15:00', room: 'BR-203', instructor: 'Dr. Wang', startDate: '08/01/2026', endDate: '23/04/2026', tone: 'amber' },
      { id: 'c8', name: 'Academic English', day: 'FRIDAY', startSlot: 1, colSpan: 4, timeStr: '08:00 – 10:00', room: 'BR-112', instructor: 'Ms. Sarah', startDate: '09/01/2026', endDate: '24/04/2026', tone: 'blue' },
      { id: 'c9', name: 'Evening Seminar', day: 'FRIDAY', startSlot: 19, colSpan: 3, timeStr: '17:00 – 18:30', room: 'Hall B', instructor: 'Guest', startDate: '09/01/2026', endDate: '24/04/2026', tone: 'emerald' },
    ],
  },
  '2401011': {
    programme: 'DIPLOMA IN BUSINESS (DB2601A)',
    semesterStart: '05/01/2026',
    semesterEnd: '24/04/2026',
    courses: [
      { id: 'c11_1', name: 'Business Law (Retake)', day: 'MONDAY', startSlot: 4, colSpan: 4, timeStr: '09:30 – 11:30', room: 'BR-308', instructor: 'Mr. Alan Lee', startDate: '05/01/2026', endDate: '20/04/2026', tone: 'amber', isRetake: true },
      { id: 'c11_2', name: 'Marketing Principles', day: 'TUESDAY', startSlot: 4, colSpan: 4, timeStr: '09:30 – 11:30', room: 'BR-105', instructor: 'Prof. Jane Smith', startDate: '06/01/2026', endDate: '21/04/2026', tone: 'emerald' },
      { id: 'c11_3', name: 'Academic English', day: 'FRIDAY', startSlot: 1, colSpan: 4, timeStr: '08:00 – 10:00', room: 'BR-112', instructor: 'Ms. Sarah', startDate: '09/01/2026', endDate: '24/04/2026', tone: 'blue' },
    ],
  },
  '2401013': {
    programme: 'DIPLOMA IN BUSINESS (DB2601A)',
    semesterStart: '05/01/2026',
    semesterEnd: '24/04/2026',
    courses: [
      { id: 'c13_2', name: 'Business Statistics', day: 'MONDAY', startSlot: 1, colSpan: 3, timeStr: '08:00 – 09:30', room: 'BR-201', instructor: 'Dr. John Doe', startDate: '05/01/2026', endDate: '20/04/2026', tone: 'navy' },
      { id: 'c13_1', name: 'Accounting I (Retake)', day: 'TUESDAY', startSlot: 1, colSpan: 3, timeStr: '08:00 – 09:30', room: 'BR-104', instructor: 'Dr. Wang', startDate: '06/01/2026', endDate: '21/04/2026', tone: 'amber', isRetake: true },
    ],
  },
}