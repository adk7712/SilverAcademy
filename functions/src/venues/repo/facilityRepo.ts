// UC #4-1 ManageAvailability: Admin SDK access for venues-upsertFacility. Rules live in ../controller.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Facility } from '@silveracademy/shared';
import { COL, runTx } from '../../common';
import type { CallableInputOf } from '../../common';
import { decideUpsertFacility } from '../controller/decideFacility';

export function upsertFacilityTx(
  db: Firestore,
  args: { uid: string; orgName: string; input: CallableInputOf<'venues-upsertFacility'> },
): Promise<{ facilityId: string }> {
  const { facilityId, ...fields } = args.input;
  const col = db.collection(COL.facilities);
  const ref = facilityId ? col.doc(facilityId) : col.doc();
  return runTx(db, async (tx) => {
    const snap = facilityId ? await tx.get(ref) : undefined;
    const existing = snap?.exists ? (snap.data() as Facility) : undefined;
    const mode = decideUpsertFacility(existing, !!facilityId, fields, args.uid);
    if (mode === 'create') {
      tx.create(ref, {
        id: ref.id,
        partnerId: args.uid,
        orgName: args.orgName,
        ...fields,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.update(ref, { ...fields, orgName: args.orgName, updatedAt: FieldValue.serverTimestamp() });
    }
    return { facilityId: ref.id };
  });
}
