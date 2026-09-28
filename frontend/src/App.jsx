import { Route, Routes } from 'react-router-dom'
import AppShell from './layouts/AppShell.jsx'
import HomePage from './pages/Home/HomePage.jsx'
import GroupViewPage from './pages/GroupView/GroupViewPage.jsx'
import StudentViewPage from './pages/StudentView/StudentViewPage.jsx'
import ManagePeoplePage from './pages/ManagePeople/ManagePeoplePage.jsx'
import ImportDataPage from './pages/ImportData/ImportDataPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="group-view" element={<GroupViewPage />} />
        <Route path="students" element={<StudentViewPage />} />
        <Route path="people" element={<ManagePeoplePage />} />
        <Route path="import" element={<ImportDataPage />} />
        <Route path="*" element={<div className="p-8 text-ink-3">Page not found</div>} />
      </Route>
    </Routes>
  )
}