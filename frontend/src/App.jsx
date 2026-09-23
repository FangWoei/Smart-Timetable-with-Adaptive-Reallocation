import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import GeneratePage from "./pages/GeneratePage";
import TimetablePage from "./pages/TimetablePage";

const links = [
  { to: "/", label: "Timetable" },
  { to: "/generate", label: "Generate" },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50 text-gray-900">
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white p-4">
          <h1 className="mb-6 text-xl font-bold">STAR</h1>
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `rounded px-3 py-2 text-sm ${
                    isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"
                  }`
                }>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<TimetablePage />} />
            <Route path="/generate" element={<GeneratePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
