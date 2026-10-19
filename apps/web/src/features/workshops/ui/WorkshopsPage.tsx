// UC #5-2 ManageWorkshops (list at /admin/workshops, detail at /admin/workshops/:id)
import { Route, Routes } from 'react-router-dom';
import { WorkshopDetail } from './WorkshopDetail';
import { WorkshopList } from './WorkshopList';

export function WorkshopsPage() {
  return (
    <Routes>
      <Route index element={<WorkshopList />} />
      <Route path=":id" element={<WorkshopDetail />} />
    </Routes>
  );
}
