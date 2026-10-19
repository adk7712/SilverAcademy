// UC #5-1 ManageAccounts: search, filter and list accounts.
import { Link } from 'react-router-dom';
import { ACCOUNT_STATUSES, ROLES } from '@silveracademy/shared';
import type { AccountStatus, Role, User } from '@silveracademy/shared';
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  SelectField,
  Table,
  TextField,
} from '../../../design';
import type { Column } from '../../../design';
import { formatTimestamp } from '../../../services/formatTimestamp';
import { useAccountList } from '../controller/useAccounts';
import { userStrings as t } from '../strings';
import { AccountStatusBadge } from './AccountStatusBadge';

const columns: Column<User>[] = [
  {
    key: 'name',
    header: t.accounts.colName,
    sortValue: (u) => u.displayNameLower,
    render: (u) => (
      <>
        {u.displayName} {u.flagged && <Badge tone="warning">{t.accounts.flagged}</Badge>}
      </>
    ),
  },
  {
    key: 'roles',
    header: t.accounts.colRoles,
    render: (u) => u.roles.map((r) => t.roleLabels[r]).join(', '),
  },
  {
    key: 'status',
    header: t.accounts.colStatus,
    sortValue: (u) => u.status,
    render: (u) => <AccountStatusBadge status={u.status} />,
  },
  {
    key: 'updated',
    header: t.accounts.colUpdated,
    sortValue: (u) => u.updatedAt.seconds,
    render: (u) => formatTimestamp(u.updatedAt),
  },
  {
    key: 'actions',
    header: t.accounts.colActions,
    render: (u) => (
      <Link
        className="btn btn--secondary"
        to={u.uid}
        aria-label={t.accounts.viewFor(u.displayName)}
      >
        {t.accounts.view}
      </Link>
    ),
  },
];

export function AccountList() {
  const a = useAccountList();
  return (
    <section className="stack">
      <h1>{t.accounts.title}</h1>
      <form
        className="row"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          a.search();
        }}
      >
        <TextField
          label={t.accounts.searchLabel}
          hint={t.accounts.searchHint}
          value={a.nameQuery}
          onChange={(e) => a.setNameQuery(e.target.value)}
        />
        <Button type="submit">{t.accounts.searchButton}</Button>
      </form>
      <div className="row">
        <SelectField
          label={t.accounts.roleFilter}
          value={a.filters.role}
          onChange={(e) => a.setFilters({ ...a.filters, role: e.target.value as Role | '' })}
        >
          <option value="">{t.accounts.all}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t.roleLabels[r]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t.accounts.statusFilter}
          value={a.filters.status}
          onChange={(e) =>
            a.setFilters({ ...a.filters, status: e.target.value as AccountStatus | '' })
          }
        >
          <option value="">{t.accounts.all}</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.statusLabels[s]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t.accounts.flaggedFilter}
          value={a.filters.flagged}
          onChange={(e) =>
            a.setFilters({ ...a.filters, flagged: e.target.value as 'yes' | 'no' | '' })
          }
        >
          <option value="">{t.accounts.all}</option>
          <option value="yes">{t.accounts.flaggedOnly}</option>
          <option value="no">{t.accounts.notFlagged}</option>
        </SelectField>
      </div>
      <ErrorBanner error={a.error} onRetry={a.reload} />
      <Table
        caption={t.accounts.tableCaption}
        columns={columns}
        rows={a.rows}
        rowKey={(u) => u.uid}
        loading={a.loading}
        empty={
          <EmptyState title={t.accounts.emptyTitle} description={t.accounts.emptyDescription} />
        }
      />
    </section>
  );
}
