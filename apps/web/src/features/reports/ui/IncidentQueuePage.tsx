// UC #5-3 ResolveUserReports: admin incident queue (list + detail routes under /admin/incidents).
import { Route, Routes } from 'react-router-dom';
import { IncidentDetail } from './IncidentDetail';
import { IncidentList } from './IncidentList';

export function IncidentQueuePage() {
  return (
    <Routes>
      <Route index element={<IncidentList />} />
      <Route path=":id" element={<IncidentDetail />} />
    </Routes>
  );
}
