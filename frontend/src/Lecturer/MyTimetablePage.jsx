// Lecturer: 我的时间表（只读）
import { useEffect, useMemo, useState } from "react";
import { toGridGroups } from "../api.js";
import TimetableGrid from "../components/TimetableGrid.jsx";
import { refreshSemester, setSemester } from "../semester.js";
import { useLecturer } from "./LecturerContext.js";
import { PREVIEW_SEMESTER } from "./lecturerApi.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function MyTimetablePage() {
  const { api, preview } = useLecturer();
  const [data, setData] = useState(null);
  const [hours, setHours] = useState(null);
  const [error, setError] = useState("");
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (preview) setSemester(PREVIEW_SEMESTER, []);
    else refreshSemester(); // 学期日期 + 假期，课表上要显示
    api
      .myTimetable()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    api
      .myHours()
      .then((h) => !cancelled && setHours(h))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, preview]);

  // 一个 lecturer 一张表：每节课只属于 lecturer 自己，课程名后面标上班级
  const groups = useMemo(() => {
    if (!data) return [];
    const entries = data.entries.map((e) => ({
      ...e,
      locked: false,
      groups: [data.lecturer],
      class_code: `${e.class_code ?? e.module} (${(e.groups ?? []).join(", ")})`,
    }));
    return toGridGroups({ entries }).map((g) => ({
      ...g,
      title: `${g.lessons.length} classes this week`,
    }));
  }, [data]);

  if (error) return <div className="p-8 text-sm text-ink-3">{error}</div>;
  if (!data) return <div className="p-8 text-ink-3">Loading…</div>;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-5">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-line bg-white px-4 py-3 text-xs text-ink-3">
          <span>
            <b className="text-ink">{hours?.per_week ?? "–"}</b> hrs / week
          </span>
          {hours &&
            DAYS.map((d, i) => (
              <span key={d}>
                {d} {hours.per_day[i + 1] ?? 0}h
              </span>
            ))}
          {hours?.semester_total != null && (
            <span className="ml-auto">
              Semester total: <b className="text-ink">{hours.semester_total}</b> hrs
            </span>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-ink-3">
            No classes have been assigned to you yet.
          </div>
        ) : (
          <TimetableGrid
            groups={groups}
            selectedId={groups[0].id}
            onSelect={() => {}}
            selectedLesson={selectedLesson}
            onLessonSelect={setSelectedLesson}
            dnd={null}
            view="lecturer"
          />
        )}
      </div>
    </div>
  );
}
