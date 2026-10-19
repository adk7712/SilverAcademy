// UC #3-3 roster data access: bookings-getRoster callable.
import { callFunction } from '../../../services/callables';
import type { Roster } from '../rosterTypes';

export const fetchRoster = (workshopId: string): Promise<Roster> =>
  callFunction('bookings-getRoster', { workshopId });
