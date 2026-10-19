// Assembles the full seed plan from the fixtures (task 0.5). Pure: takes config and the run time, performs no I/O.
import type { Feedback } from '@silveracademy/shared';
import type { SeedConfig } from './guard';
import type { SeedPlan } from './types';
import {
  buildAccounts,
  buildInstructorProfileDocs,
  UID,
  type RatingTally,
} from './fixtures/accounts';
import { buildBookingFacts } from './fixtures/bookings';
import { buildVenueDocs } from './fixtures/venues';
import { buildVoucherDocs } from './fixtures/vouchers';
import { buildWalletDocs } from './fixtures/wallets';
import { buildWorkshopDocs } from './fixtures/workshops';

function ratingsByInstructor(feedback: Feedback[]): Record<string, RatingTally> {
  const tallies: Record<string, RatingTally> = {};
  for (const f of feedback) {
    const current = tallies[f.instructorId] ?? { ratingSum: 0, ratingCount: 0 };
    tallies[f.instructorId] = {
      ratingSum: current.ratingSum + f.rating,
      ratingCount: current.ratingCount + 1,
    };
  }
  return tallies;
}

export function buildSeedPlan(config: SeedConfig, now: Date): SeedPlan {
  const accounts = buildAccounts(config, now);
  const venues = buildVenueDocs(now);
  const bookings = buildBookingFacts(now, config.qrSecret);
  const vouchers = buildVoucherDocs(now);
  const profiles = buildInstructorProfileDocs(now, ratingsByInstructor(bookings.feedback));
  const workshops = buildWorkshopDocs(now, {
    bookings: bookings.bookings,
    assignments: bookings.assignments,
    feedback: bookings.feedback,
  });
  const wallets = buildWalletDocs(now, {
    instructorUids: [UID.instructorAhmad, UID.instructorMary],
    attendance: bookings.attendance,
    claimed: vouchers.claimed,
  });

  return {
    authUsers: accounts.authUsers,
    docs: [
      ...accounts.docs,
      ...profiles,
      ...venues,
      ...workshops,
      ...bookings.docs,
      ...vouchers.docs,
      ...wallets,
    ],
  };
}
