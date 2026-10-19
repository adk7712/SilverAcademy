// UC #1-4 #3-4 attendance data access: record a scan (callable) and list workshops the user may scan.
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Role } from '@silveracademy/shared';
import { callFunction } from '../../../services/callables';
import { firestore } from '../../../services/firebase';
import type { ScanInput, ScanSuccess, ScanWorkshop } from '../types';

export async function recordAttendance(
  workshopId: string,
  input: ScanInput,
): Promise<Omit<ScanSuccess, 'status'>> {
  return callFunction('attendance-recordAttendance', { workshopId, ...input });
}

type TimestampLike = { toMillis?: () => number } | null | undefined;
const toMs = (t: unknown): number | null => {
  const ts = t as TimestampLike;
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null;
};

const SCANNABLE_STATUSES: readonly string[] = ['OPEN', 'COMPLETED'];

async function listOwned(uid: string): Promise<ScanWorkshop[]> {
  const snap = await getDocs(
    query(collection(firestore, 'workshops'), where('instructorId', '==', uid)),
  );
  return snap.docs
    .filter((d) => SCANNABLE_STATUSES.includes(String(d.data().status)))
    .map((d) => ({
      id: d.id,
      title: String(d.data().title ?? ''),
      startAtMs: toMs(d.data().startAt),
      endAtMs: toMs(d.data().endAt),
      source: 'OWNED' as const,
    }));
}

async function listAssigned(uid: string): Promise<ScanWorkshop[]> {
  const snap = await getDocs(
    query(collection(firestore, 'volunteerAssignments'), where('volunteerId', '==', uid)),
  );
  return snap.docs
    .filter((d) => d.data().status === 'ASSIGNED')
    .map((d) => ({
      id: String(d.data().workshopId),
      title: String(d.data().workshopTitle ?? ''),
      startAtMs: toMs(d.data().startAt),
      endAtMs: null,
      source: 'ASSIGNED' as const,
    }));
}

export async function listScannableWorkshops(uid: string, roles: Role[]): Promise<ScanWorkshop[]> {
  const parts = await Promise.all([
    roles.includes('SENIOR_INSTRUCTOR') ? listOwned(uid) : Promise.resolve([]),
    roles.includes('VOLUNTEER') ? listAssigned(uid) : Promise.resolve([]),
  ]);
  return parts.flat();
}
