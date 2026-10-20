import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import Tabs from "../../components/Tabs.jsx";

const TABS = [
  { id: "bulk", label: "Bulk import" },
  { id: "manual", label: "Add manually" },
];

const MANUAL_CATEGORIES = [
  { id: 'subject', label: 'Subject / course', desc: 'Add subjects/courses', badge: 'SU' },
  { id: 'group', label: 'Group / intake', desc: 'Add groups/intakes', badge: 'GR' },
  { id: 'lecturer', label: 'Lecturer', desc: 'Add lecturers', badge: 'LC' },
  { id: 'classroom', label: 'Classroom', desc: 'Add classrooms', badge: 'RM' },
  { id: 'student', label: 'Student', desc: 'Add students', badge: 'ST' },
];

function BulkImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function pick(f) {
    setFile(f ?? null);
    setPreview(null);
    setError("");
    setDone("");
  }

  async function run(action) {
    if (!file) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      if (action === "preview") {
        setPreview(await api.importPreview(file));
      } else {
        const r = await api.importCommit(file);
        setDone(`Imported ${r.classes} classes and ${r.groups} intake groups.`);
        setPreview(null);
        setFile(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-lg font-semibold text-ink">Import course listing</h1>
      <p className="mt-1 text-sm text-ink-3">
        Upload the Course Listing CSV. Student names in the file are ignored —
        only the head count per class is read.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-white text-center hover:border-navy-500">
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {file ? (
            <>
              <span className="text-sm font-medium text-ink">{file.name}</span>
              <span className="text-xs text-ink-4">
                {(file.size / 1024).toFixed(0)} KB · choose another to replace
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-ink-2">
                Drag a file here, or click to browse
              </span>
              <span className="text-xs text-ink-4">.csv up to 2 MB</span>
              <span className="mt-1 rounded border border-line-strong px-3 py-1 text-[13px] text-ink-2">
                Choose file
              </span>
            </>
          )}
        </label>

        <aside className="rounded-md border border-line bg-white p-4 text-xs text-ink-2">
          <h2 className="text-[13px] font-semibold text-ink">What gets read</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4">
            <li>Intake group, level and head count</li>
            <li>Course code, name and hours per week</li>
            <li>Lecturer name and full-time / part-time</li>
            <li className="text-ink-4">Student names are skipped</li>
          </ul>
        </aside>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {done && <p className="mt-3 text-sm text-green-700">{done}</p>}

      {preview && (
        <div className="mt-6 space-y-4">
          {preview.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-[13px] font-semibold text-amber-900">
                Check these with the coordinator
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-800">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="text-[13px] font-semibold text-ink">
            {preview.classes.length} classes ·{" "}
            {Object.keys(preview.groups).length} intake groups
          </h2>

          <div className="overflow-x-auto rounded-md border border-line bg-white">
            <table className="w-full text-xs">
              <thead className="bg-panel text-left text-ink-2">
                <tr>
                  {[
                    "Code",
                    "Module",
                    "Groups",
                    "Students",
                    "Hours",
                    "Lecturer",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.classes.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{c.id}</td>
                    <td className="px-3 py-2 text-ink-2">{c.module}</td>
                    <td className="px-3 py-2 text-ink-4">
                      {c.groups.join(", ")}
                    </td>
                    <td className="px-3 py-2 text-ink-2">{c.students}</td>
                    <td className="px-3 py-2 text-ink-2">{c.weekly_hours}h</td>
                    <td className="px-3 py-2 text-ink-2">
                      {c.lecturer}
                      {c.part_time && (
                        <span className="ml-1 rounded bg-panel px-1 text-[10px]">
                          PT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.skipped.length > 0 && (
            <p className="text-xs text-ink-4">
              Skipped (not timetabled):{" "}
              {preview.skipped.map((s) => `${s.code} ${s.group}`).join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => pick(null)}
          className="h-[30px] rounded border border-line-strong bg-white px-4 text-[13px] text-ink-2 hover:bg-panel">
          Discard
        </button>
        <button
          type="button"
          disabled={!file || busy}
          onClick={() => run(preview ? "commit" : "preview")}
          className="h-[30px] rounded bg-navy-700 px-4 text-[13px] font-semibold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? "Working…" : preview ? "Confirm import" : "Preview"}
        </button>
      </div>
    </div>
  );
}

function ManualImport() {
  const [category, setCategory] = useState('subject');

  const [subjectCode, setSubjectCode] = useState('BUS204');
  const [subjectName, setSubjectName] = useState('Financial Management');
  const [sessionType, setSessionType] = useState('Lecture + tutorial');
  const [hours, setHours] = useState('4');
  const [groups, setGroups] = useState(['DB2601A', 'DB2601B']);
  const [lecturer, setLecturer] = useState('Ms Koh Bee Hoon');
  const [needsLab, setNeedsLab] = useState(false);

  const [groupCode, setGroupCode] = useState('');
  const [classSize, setClassSize] = useState('35');

  const [lecturerName, setLecturerName] = useState('');
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [lecturerType, setLecturerType] = useState('Full-time');

  const [roomCode, setRoomCode] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('40');
  const [roomType, setRoomType] = useState('Standard Lecture Room');

  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState(''); // 新增：学生邮箱 State
  const [studentGroup, setStudentGroup] = useState('DB2601A');

  const [addedRecords, setAddedRecords] = useState([]);

  const handleRemove = (id) => {
    setAddedRecords(addedRecords.filter(r => r.id !== id));
  };

  const removeGroupTag = (g) => {
    setGroups(groups.filter(item => item !== g));
  };

  const handleAddRecord = () => {
    let newRec = null;

    if (category === 'subject') {
      if (!subjectCode.trim()) return;
      newRec = {
        id: Date.now(),
        type: 'Course',
        name: `${subjectCode} — ${subjectName}`,
        detail: `${hours} hrs/wk · ${groups.join(', ')}`,
      };
    } else if (category === 'group') {
      if (!groupCode.trim()) return;
      newRec = {
        id: Date.now(),
        type: 'Group',
        name: groupCode,
        detail: `Size: ${classSize} · Year 1`,
      };
      setGroupCode('');
    } else if (category === 'lecturer') {
      if (!lecturerName.trim()) return;
      newRec = {
        id: Date.now(),
        type: 'Lecturer',
        name: lecturerName,
        detail: `${lecturerType} · ${lecturerEmail || 'No email'}`,
      };
      setLecturerName('');
      setLecturerEmail('');
    } else if (category === 'classroom') {
      if (!roomCode.trim()) return;
      newRec = {
        id: Date.now(),
        type: 'Room',
        name: roomCode,
        detail: `${roomType} (Cap: ${roomCapacity})`,
      };
      setRoomCode('');
    } else if (category === 'student') {
      if (!studentId.trim() || !studentName.trim()) return;
      newRec = {
        id: Date.now(),
        type: 'Student',
        name: `${studentId} — ${studentName}`,
        detail: `Group ${studentGroup} · ${studentEmail || 'No email'}`, // 包含邮箱显示
      };
      setStudentId('');
      setStudentName('');
      setStudentEmail(''); // 清空邮箱输入框
    }

    if (newRec) {
      setAddedRecords([newRec, ...addedRecords]);
    }
  };

  const getAddButtonText = () => {
    switch (category) {
      case 'subject': return 'Add subject';
      case 'group': return 'Add group';
      case 'lecturer': return 'Add lecturer';
      case 'classroom': return 'Add classroom';
      case 'student': return 'Add student';
      default: return 'Add record';
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-line bg-white">
        <ul className="min-h-0 flex-1 overflow-y-auto space-y-0.5">
          {MANUAL_CATEGORIES.map((cat) => {
            const active = cat.id === category;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  aria-current={active ? 'true' : undefined}
                  className={[
                    'flex h-11 w-full items-center gap-3 border-l-[3px] px-3 text-left text-xs',
                    active ? 'border-navy-700 bg-navy-50 font-semibold text-navy-700' : 'border-transparent text-ink-2 hover:bg-panel',
                  ].join(' ')}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-panel text-[11px] font-bold text-ink-2">
                    {cat.badge}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{cat.label}</div>
                    <div className="mt-0.5 text-[11px] text-ink-4 truncate">
                      {cat.desc}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line-2 px-3 py-2 text-[11px] text-ink-4">
          {addedRecords.length} records added · Done
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
            
            {category === 'subject' && (
              <>
                <h2 className="text-sm font-bold text-ink">Add a subject / course</h2>
                <p className="text-xs text-ink-3">Used across every group that teaches it</p>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Subject code</label>
                    <input
                      type="text"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Session type</label>
                    <select
                      value={sessionType}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    >
                      <option>Lecture + tutorial</option>
                      <option>Lecture only</option>
                      <option>Practical / Lab</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Subject name</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Hours / week</label>
                    <input
                      type="text"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                    <span className="mt-1 block text-[10px] text-ink-4">split into 2 sessions of 2 hrs</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Room type</label>
                    <select className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none">
                      <option>Standard</option>
                      <option>Computer Lab</option>
                      <option>Auditorium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Category</label>
                    <select className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none">
                      <option>Accounting</option>
                      <option>Business</option>
                      <option>Computing</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Groups taking this subject</label>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded border border-line-strong bg-white p-1.5 min-h-[36px]">
                      {groups.map((g) => (
                        <span key={g} className="inline-flex items-center gap-1 rounded bg-[#EBF1F6] px-2 py-0.5 text-xs font-medium text-navy-800">
                          {g}
                          <button onClick={() => removeGroupTag(g)} className="text-navy-500 hover:text-navy-900 font-bold">×</button>
                        </span>
                      ))}
                      <button onClick={() => setGroups([...groups, `DB260${groups.length + 3}C`])} className="text-xs text-navy-600 hover:underline px-1 font-semibold">
                        + Add group
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Lecturer (optional)</label>
                    <div className="mt-1 flex items-center rounded border border-line-strong bg-white p-1.5 min-h-[36px]">
                      {lecturer ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#EBF1F6] px-2 py-0.5 text-xs font-medium text-navy-800">
                          {lecturer}
                          <button onClick={() => setLecturer('')} className="text-navy-500 hover:text-navy-900 font-bold">×</button>
                        </span>
                      ) : (
                        <span className="text-xs text-ink-4 px-1">Click to assign lecturer</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lab"
                    checked={needsLab}
                    onChange={(e) => setNeedsLab(e.target.checked)}
                    className="h-4 w-4 rounded border-line-strong text-navy-700 focus:ring-navy-500"
                  />
                  <label htmlFor="lab" className="text-xs text-ink font-medium">Needs a lab room</label>
                </div>
              </>
            )}

            {category === 'group' && (
              <>
                <h2 className="text-sm font-bold text-ink">Add a group</h2>
                <p className="text-xs text-ink-3">Belongs to an intake — create the intake first if it's new</p>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Intake</label>
                    <select className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none">
                      <option>January 2026</option>
                      <option>May 2026</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">&nbsp;</label>
                    <button className="mt-1 flex items-center gap-2 rounded border border-line-strong bg-panel px-3 py-1.5 text-xs font-semibold text-navy-700">
                      <span>+</span> New intake...
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Group code</label>
                    <input
                      type="text"
                      placeholder="e.g. DB2601C"
                      value={groupCode}
                      onChange={(e) => setGroupCode(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Programme</label>
                    <select className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none">
                      <option>Diploma in Business</option>
                      <option>Diploma in Accounting</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Class size</label>
                    <input
                      type="text"
                      value={classSize}
                      onChange={(e) => setClassSize(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Year</label>
                    <select className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none">
                      <option>Year 1</option>
                      <option>Year 2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Intake month</label>
                    <select className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none">
                      <option>Jan 2026</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {category === 'lecturer' && (
              <>
                <h2 className="text-sm font-bold text-ink">Add a lecturer</h2>
                <p className="text-xs text-ink-3">Register a teaching staff member into the system</p>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Lecturer full name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Alan Turing"
                      value={lecturerName}
                      onChange={(e) => setLecturerName(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Email address</label>
                    <input
                      type="email"
                      placeholder="e.g. alan@college.edu.my"
                      value={lecturerEmail}
                      onChange={(e) => setLecturerEmail(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Employment type</label>
                  <select
                    value={lecturerType}
                    onChange={(e) => setLecturerType(e.target.value)}
                    className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract / Visiting</option>
                  </select>
                </div>
              </>
            )}

            {category === 'classroom' && (
              <>
                <h2 className="text-sm font-bold text-ink">Add a classroom / venue</h2>
                <p className="text-xs text-ink-3">Define rooms and labs available for scheduling</p>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Room code / name</label>
                    <input
                      type="text"
                      placeholder="e.g. LAB-302"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Room capacity</label>
                    <input
                      type="number"
                      value={roomCapacity}
                      onChange={(e) => setRoomCapacity(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Facility type</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                  >
                    <option>Standard Lecture Room</option>
                    <option>Computer Lab</option>
                    <option>Auditorium</option>
                    <option>Workshop / Studio</option>
                  </select>
                </div>
              </>
            )}

            {category === 'student' && (
              <>
                <h2 className="text-sm font-bold text-ink">Add a student</h2>
                <p className="text-xs text-ink-3">Enroll an individual student into a base group</p>

                <div className="mt-5 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Student ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 2601099"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Full name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Email address</label>
                    <input
                      type="email"
                      placeholder="e.g. john@college.edu.my"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="mt-1 w-full rounded border border-line-strong px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-3">Assigned group</label>
                  <select
                    value={studentGroup}
                    onChange={(e) => setStudentGroup(e.target.value)}
                    className="mt-1 w-full rounded border border-line-strong bg-white px-3 py-1.5 text-xs text-ink focus:border-navy-500 focus:outline-none"
                  >
                    <option>DB2601A</option>
                    <option>DB2601B</option>
                    <option>DB2602C</option>
                  </select>
                </div>
              </>
            )}

          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="h-[30px] rounded border border-line-strong bg-white px-4 text-xs font-medium text-ink-2 hover:bg-panel">
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleAddRecord}
              className="h-[30px] rounded bg-navy-700 px-4 text-xs font-semibold text-white hover:bg-navy-900"
            >
              {getAddButtonText()}
            </button>
          </div>

          {addedRecords.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between pb-2 text-xs text-ink-4 border-b border-line">
                <span>Added this session</span>
                <span>Not saved anywhere else until you press Done</span>
              </div>
              <div className="divide-y divide-line bg-white rounded-b-md border-x border-b border-line">
                {addedRecords.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-panel px-2 py-0.5 font-medium text-ink-2 text-[11px]">{rec.type}</span>
                      <span className="font-semibold text-ink">{rec.name}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-ink-3">{rec.detail}</span>
                      <button 
                        onClick={() => handleRemove(rec.id)}
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function ImportDataPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab"))
    ? params.get("tab")
    : "bulk";

  return (
    <div className="min-h-0 flex-1 overflow-auto flex flex-col">
      <div className="border-b border-line bg-white px-6 pt-3 shrink-0">
        <Tabs tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id })} label="Import mode" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "bulk" ? <div className="p-6"><BulkImport /></div> : <ManualImport />}
      </div>
    </div>
  );
}