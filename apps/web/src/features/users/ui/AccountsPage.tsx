// UC #5-1 ManageAccounts (list at /admin/accounts, detail at /admin/accounts/:uid)
import { Route, Routes } from 'react-router-dom';
import { AccountDetail } from './AccountDetail';
import { AccountList } from './AccountList';

export function AccountsPage() {
  return (
    <Routes>
      <Route index element={<AccountList />} />
      <Route path=":uid" element={<AccountDetail />} />
    </Routes>
  );
}
