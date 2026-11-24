// src/pages/ManagePeople/ManagePeoplePage.jsx
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Tabs from "../../components/Tabs.jsx";
import LecturersTab from "./LecturersTab.jsx";
import RoomsTab from "./RoomsTab.jsx";
import SubjectsTab from "./SubjectsTab.jsx";

const TABS = [
  { id: "lecturers", label: "Lecturers" },
  { id: "subjects", label: "Subjects" },
  { id: "rooms", label: "Rooms" },
];

const HEADINGS = {
  lecturers: [
    "Manage lecturers",
    "Staff list, full-time / part-time status and weekly availability.",
  ],
  subjects: ["Manage subjects", "Courses, hours per week and room needs."],
  rooms: ["Manage rooms", "Classrooms, labs and maintenance status."],
};

// 主页面组件
export default function ManagePeoplePage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab"))
    ? params.get("tab")
    : "lecturers";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow={TABS.find((t) => t.id === tab)?.label}
        title={HEADINGS[tab][0]}
        subtitle={HEADINGS[tab][1]}
      />
      <div className="shrink-0 border-b border-line bg-surface px-6 pt-3">
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={(id) => setParams({ tab: id })}
          label="People and resources"
        />
      </div>
      <div className="flex flex-col p-6">
        {tab === "lecturers" ? (
          <LecturersTab />
        ) : tab === "subjects" ? (
          <SubjectsTab />
        ) : tab === "rooms" ? (
          <RoomsTab />
        ) : (
          <div className="rounded-md border border-dashed border-line-strong bg-surface p-8 text-center text-xs text-ink-4">
            {TABS.find((t) => t.id === tab)?.label} management module coming
            soon.
          </div>
        )}
      </div>
    </div>
  );
}
