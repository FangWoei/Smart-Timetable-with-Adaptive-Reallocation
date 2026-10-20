import { Route, Routes, Navigate } from 'react-router-dom'
import AppShell from './layouts/AppShell.jsx'
import GroupViewPage from './pages/GroupView/GroupViewPage.jsx'
import StudentViewPage from './pages/StudentView/StudentViewPage.jsx'
import ManagePeoplePage from './pages/ManagePeople/ManagePeoplePage.jsx'
import ImportDataPage from './pages/ImportData/ImportDataPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* 将根路径直接重定向到 group-view */}
        <Route index element={<Navigate to="/group-view" replace />} />
        <Route path="group-view" element={<GroupViewPage />} />
        <Route path="students" element={<StudentViewPage />} />
        <Route path="people" element={<ManagePeoplePage />} />
        <Route path="import" element={<ImportDataPage />} />
        <Route path="*" element={<div className="p-8 text-ink-3">Page not found</div>} />
      </Route>
    </Routes>
  )
}