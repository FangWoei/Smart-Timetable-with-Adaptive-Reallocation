import { useState, useEffect } from "react";
import Logo from "../../components/Logo.jsx";
import { api } from "../../api";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr'];
const TIME_SLOTS = ['Slot 1 (08:30)', 'Slot 2 (10:30)', 'Slot 3 (13:30)', 'Slot 4 (15:30)'];

export default function LecturerDashboard() {
  // 当前激活的标签：'home' 或 'scheduler'
  const [activeTab, setActiveTab] = useState('home');

  const [timetable, setTimetable] = useState(null);
  const [hours, setHours] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 加载数据
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const [ttRes, hrsRes, availRes] = await Promise.all([
          api.getTimetable ? api.getTimetable() : fetch("/me/timetable").then(r => r.json()).catch(() => null),
          fetch("/me/hours").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/me/availability").then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        
        setTimetable(ttRes);
        setHours(hrsRes);
        setAvailability(availRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 切换可用时间
  const toggleSlot = (dIdx, sIdx) => {
    if (!availability) return;
    const day = dIdx + 1;
    const slot = sIdx + 1;
    const currentUnavailable = availability.unavailable || [];
    const exists = currentUnavailable.some(([d, s]) => d === day && s === slot);

    let updated = exists
      ? currentUnavailable.filter(([d, s]) => !(d === day && s === slot))
      : [...currentUnavailable, [day, slot]];

    setAvailability({ ...availability, unavailable: updated });
  };

  // 保存可用时间
  const handleSaveAvailability = async () => {
    if (!availability) return;
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");
      const res = await fetch("/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unavailable: availability.unavailable }),
      });
      if (!res.ok) throw new Error("Failed to save availability");
      setSuccessMsg("Availability saved successfully!");
    } catch (err) {
      setError(err.message || "Error saving availability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      
      {/* 顶部导航栏 (和截图一模一样：Logo + Home + Scheduler) */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white px-8 shadow-xs">
        <div className="flex items-center gap-10">
          {/* Logo 区域 */}
          <div className="flex items-center gap-2">
            <Logo />
          </div>

          {/* 导航按钮：Home 与 Scheduler */}
          <nav className="flex items-center gap-8">
            <button
              onClick={() => setActiveTab('home')}
              className={`text-base font-semibold transition-colors pb-1 border-b-2 ${
                activeTab === 'home'
                  ? 'text-navy-700 border-navy-700'
                  : 'text-ink-3 border-transparent hover:text-navy-700'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('scheduler')}
              className={`text-base font-semibold transition-colors pb-1 border-b-2 ${
                activeTab === 'scheduler'
                  ? 'text-navy-700 border-navy-700'
                  : 'text-ink-3 border-transparent hover:text-navy-700'
              }`}
            >
              Scheduler
            </button>
          </nav>
        </div>

        {/* 右侧展示讲师身份信息 */}
        {timetable?.lecturer && (
          <div className="text-xs font-semibold text-ink-3 bg-panel px-3 py-1.5 rounded-md border border-line">
            Lecturer: <span className="text-navy-700 font-bold">{timetable.lecturer}</span>
          </div>
        )}
      </header>

      {/* 页面内容区域 */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100">{error}</div>}
          {successMsg && <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">{successMsg}</div>}

          {/* ----------------- TAB 1: HOME (个人数据 & 可用时间管理) ----------------- */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* 讲师概览卡片 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-xl border border-line bg-white p-6 shadow-xs gap-4">
                <div>
                  <span className="rounded bg-navy-50 px-2 py-0.5 text-[11px] font-bold text-navy-700">
                    {availability?.is_part_time ? "Part-time Lecturer" : "Full-time Lecturer"}
                  </span>
                  <h1 className="mt-2 text-xl font-bold text-ink">
                    Welcome back, {timetable?.lecturer || "Lecturer"}
                  </h1>
                  <p className="text-xs text-ink-4 mt-1">
                    Manage your weekly teaching availability and view summary hours.
                  </p>
                </div>

                <div className="flex gap-4 rounded-lg bg-panel p-3 border border-line text-xs">
                  <div>
                    <div className="text-ink-4 uppercase text-[10px]">Total Teaching Hours</div>
                    <div className="font-bold text-ink text-sm">{hours?.total_hours || 0} hrs</div>
                  </div>
                  <div className="border-l border-line pl-4">
                    <div className="text-ink-4 uppercase text-[10px]">Assigned Classes</div>
                    <div className="font-bold text-ink text-sm">{timetable?.entries?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* 管理可用时间 */}
              <div className="rounded-xl border border-line bg-white p-6 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-ink">Manage Weekly Availability</h2>
                    <p className="text-xs text-ink-3 mt-0.5">
                      Select times when you are unavailable for classes.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveAvailability}
                    className="h-8 rounded bg-navy-700 px-4 text-xs font-semibold text-white hover:bg-navy-900 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>

                {/* 时间槽点选网格 */}
                <div className="grid grid-cols-6 gap-2 text-center text-xs mt-4">
                  <div></div>
                  {DAY_SHORT.map(d => (
                    <div key={d} className="font-semibold text-ink-3 py-1">{d}</div>
                  ))}

                  {TIME_SLOTS.map((slotTime, sIdx) => (
                    <div key={slotTime} className="contents">
                      <div className="flex items-center justify-end pr-2 text-[10px] text-ink-4 font-medium">
                        {slotTime}
                      </div>
                      {DAY_SHORT.map((_, dIdx) => {
                        const dayNum = dIdx + 1;
                        const slotNum = sIdx + 1;
                        const isUnavailable = (availability?.unavailable || []).some(
                          ([d, s]) => d === dayNum && s === slotNum
                        );

                        return (
                          <button
                            key={`${dIdx}-${sIdx}`}
                            type="button"
                            onClick={() => toggleSlot(dIdx, sIdx)}
                            className={`h-10 rounded border transition-all flex items-center justify-center text-[11px] font-medium ${
                              isUnavailable
                                ? 'bg-red-50 text-red-600 border-red-200 font-bold'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {isUnavailable ? "Off" : "Available"}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ----------------- TAB 2: SCHEDULER (课表视图) ----------------- */}
          {activeTab === 'scheduler' && (
            <div className="rounded-xl border border-line bg-white p-6 shadow-xs">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-ink">My Teaching Timetable</h2>
                <p className="text-xs text-ink-4 mt-0.5">Your personal schedule for the active term.</p>
              </div>

              {!timetable?.entries || timetable.entries.length === 0 ? (
                <div className="py-16 text-center text-xs text-ink-4">
                  No active timetable classes assigned to you.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-line">
                  <table className="w-full text-xs">
                    <thead className="bg-panel text-left text-ink-2">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Day</th>
                        <th className="px-3 py-2.5 font-semibold">Slot</th>
                        <th className="px-3 py-2.5 font-semibold">Module / Course</th>
                        <th className="px-3 py-2.5 font-semibold">Groups</th>
                        <th className="px-3 py-2.5 font-semibold">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {timetable.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-panel/50 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-ink">
                            {DAYS[entry.day - 1] || `Day ${entry.day}`}
                          </td>
                          <td className="px-3 py-2.5 text-ink-2">Slot {entry.start_slot}</td>
                          <td className="px-3 py-2.5 font-semibold text-navy-700">
                            {entry.module_name || entry.lesson_id}
                          </td>
                          <td className="px-3 py-2.5 text-ink-3">
                            {Array.isArray(entry.groups) ? entry.groups.join(", ") : entry.groups}
                          </td>
                          <td className="px-3 py-2.5 text-ink-2">{entry.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

    </div>
  );
}