// UC #5-2 ManageWorkshops: list state, detail load, edit and status actions.
import { useCallback, useMemo, useState } from 'react';
import type { Workshop, WorkshopAdminAction } from '@silveracademy/shared';
import { useSession } from '../../auth';
import {
  adminSetStatus,
  adminUpdateWorkshop,
  getWorkshop,
  listWorkshops,
} from '../repo/workshopsRepo';
import { EMPTY_WORKSHOP_FILTERS } from '../types';
import type { EditForm, SubmitOutcome, WorkshopFilters } from '../types';
import { checkEditForm } from './editForm';
import { attempt, checkStatusForm } from './submit';
import { useLoad } from '../../../services/useLoad';
import {
  capacityLocked,
  filterWorkshops,
  impactedBookings,
  statusActionNeedsReason,
} from './workshopRules';

export function useWorkshopList() {
  const [filters, setFilters] = useState<WorkshopFilters>(EMPTY_WORKSHOP_FILTERS);
  const list = useLoad(listWorkshops, []);
  const rows = useMemo(() => filterWorkshops(list.data ?? [], filters), [list.data, filters]);
  return {
    filters,
    setFilters,
    rows,
    loading: list.loading,
    error: list.error,
    reload: list.reload,
  };
}

export function useWorkshopDetail(id: string, incidentId: string | null = null) {
  const { logout } = useSession();
  const load = useLoad(() => getWorkshop(id), [id]);
  const [busy, setBusy] = useState(false);

  const finish = useCallback(
    <T>(o: SubmitOutcome<T>): SubmitOutcome<T> => {
      setBusy(false);
      if (o.kind === 'done' || (o.kind === 'failed' && o.refresh)) load.reload();
      if (o.kind === 'failed' && o.endSession) void logout();
      return o;
    },
    [load, logout],
  );

  const save = useCallback(
    async (w: Workshop, form: EditForm): Promise<SubmitOutcome<boolean>> => {
      const check = checkEditForm(form, w, capacityLocked(w, new Date()));
      if (!check.ok) return { kind: 'invalid', fieldErrors: check.errors };
      if (Object.keys(check.patch).length === 0) return { kind: 'done', value: false };
      setBusy(true);
      return finish(
        await attempt(async () => {
          await adminUpdateWorkshop(w.id, check.patch, w.version);
          return true;
        }),
      );
    },
    [finish],
  );

  const changeStatus = useCallback(
    async (w: Workshop, action: WorkshopAdminAction, reasonText: string, acknowledged: boolean) => {
      const impact = impactedBookings(w, action, new Date());
      const check = checkStatusForm({
        reasonText,
        reasonRequired: statusActionNeedsReason(action),
        impact,
        acknowledged,
      });
      if (Object.keys(check.errors).length)
        return { kind: 'invalid', fieldErrors: check.errors } as const;
      setBusy(true);
      return finish(
        await attempt(() =>
          adminSetStatus({
            workshopId: w.id,
            status: action,
            expectedVersion: w.version,
            ...(incidentId ? { incidentId } : {}),
            ...(check.reason ? { reason: check.reason } : {}),
            ...(impact > 0 ? { confirmImpact: true } : {}),
          }),
        ),
      );
    },
    [finish, incidentId],
  );

  return {
    workshop: load.data,
    loading: load.loading,
    error: load.error,
    reload: load.reload,
    busy,
    save,
    changeStatus,
  };
}
