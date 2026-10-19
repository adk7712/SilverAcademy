// UC #5-2 ManageWorkshops: direct admin reads of workshops; writes only via callables.
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { Workshop, WorkshopAdminAction } from '@silveracademy/shared';
import { callFunction, firestore } from '../../../services';

export const WORKSHOP_LIST_LIMIT = 300;

export async function listWorkshops(): Promise<Workshop[]> {
  const snap = await getDocs(
    query(
      collection(firestore, 'workshops'),
      orderBy('createdAt', 'desc'),
      limit(WORKSHOP_LIST_LIMIT),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as Workshop), id: d.id }));
}

export async function getWorkshop(id: string): Promise<Workshop | null> {
  const snap = await getDoc(doc(firestore, 'workshops', id));
  return snap.exists() ? { ...(snap.data() as Workshop), id: snap.id } : null;
}

export interface WorkshopPatch {
  title?: string;
  description?: string;
  category?: Workshop['category'];
  materials?: string;
  capacity?: number;
}

export const adminUpdateWorkshop = (
  workshopId: string,
  patch: WorkshopPatch,
  expectedVersion: number,
) => callFunction('workshops-adminUpdateWorkshop', { workshopId, patch, expectedVersion });

export const adminSetStatus = (input: {
  workshopId: string;
  status: WorkshopAdminAction;
  expectedVersion: number;
  reason?: string;
  confirmImpact?: boolean;
  incidentId?: string;
}) => callFunction('workshops-adminSetStatus', input);
