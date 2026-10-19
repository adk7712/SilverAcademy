// UC #1-2 / #5-5 reads own instructorProfiles/{uid} and calls users-submitInstructorProfile.
import { doc, getDoc } from 'firebase/firestore';
import type { InstructorProfile } from '@silveracademy/shared';
import { callFunction } from '../../../services/callables';
import { firestore } from '../../../services/firebase';

export async function fetchInstructorProfile(uid: string): Promise<InstructorProfile | null> {
  const snap = await getDoc(doc(firestore, 'instructorProfiles', uid));
  return snap.exists() ? (snap.data() as InstructorProfile) : null;
}

export const submitInstructorProfile = (
  input: Parameters<typeof callFunction<'users-submitInstructorProfile'>>[1],
) => callFunction('users-submitInstructorProfile', input);
