// UC #3-1 ids of workshops the volunteer is currently assigned to (best effort: a failure only hides the badge).
import { listMyAssignments } from '../repo/volunteerRepo';

export async function getMyAssignmentsSafe(uid: string): Promise<Set<string>> {
  try {
    const all = await listMyAssignments(uid);
    return new Set(all.filter((a) => a.status === 'ASSIGNED').map((a) => a.workshopId));
  } catch {
    return new Set();
  }
}
