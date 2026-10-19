// UC #2-5 report data access: Storage upload, reports-submitReport callable, own incidents (direct read).
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import type { IncidentCategory } from '@silveracademy/shared';
import { callFunction } from '../../../services/callables';
import { firestore } from '../../../services/firebase';
import { deleteStoragePath, uploadLocalFile } from '../../../services/storageClient';
import type { MyReport } from '../reportTypes';

export const uploadAttachment = uploadLocalFile;
export const deleteAttachment = deleteStoragePath;

export async function submitReport(input: {
  category: IncidentCategory;
  description: string;
  attachmentPaths?: string[];
}): Promise<string> {
  const out = await callFunction('reports-submitReport', input);
  return out.referenceNo;
}

export async function listMyReports(uid: string): Promise<MyReport[]> {
  const snap = await getDocs(
    query(
      collection(firestore, 'incidents'),
      where('reporterId', '==', uid),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      referenceNo: d.id,
      category: data.category,
      status: data.status,
      createdAt: data.createdAt?.toDate?.() ?? null,
      infoRequest: data.infoRequest,
      resolution: data.resolution,
    };
  });
}
