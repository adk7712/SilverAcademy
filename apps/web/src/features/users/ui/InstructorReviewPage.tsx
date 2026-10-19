// UC #5-5 ReviewInstructorAndCurriculum (list at /admin/instructor-review, detail at .../:uid)
import { Route, Routes } from 'react-router-dom';
import { PendingProfileList } from './PendingProfileList';
import { ProfileReviewDetail } from './ProfileReviewDetail';

export function InstructorReviewPage() {
  return (
    <Routes>
      <Route index element={<PendingProfileList />} />
      <Route path=":uid" element={<ProfileReviewDetail />} />
    </Routes>
  );
}
