// UC #0-1 #0-2 schemas for auth-exchangeSingpass and auth-recordStaffLogin.
import { z } from 'zod';
import { REGISTER_AS, STAFF_LOGIN_OUTCOMES } from '../enums';
import { STAFF_USER_ID_MAX } from '../constants';
import { idSchema, roleSchema } from './common';

export const exchangeSingpassInput = z.object({
  assertion: z.string().min(1),
  nonce: z.string().min(1).optional(),
  registerAs: z.enum(REGISTER_AS).optional(),
});
export const exchangeSingpassOutput = z.object({
  customToken: z.string().min(1),
  uid: idSchema,
  roles: z.array(roleSchema),
  seniorEligible: z.boolean(),
  isNewUser: z.boolean(),
});

export const recordStaffLoginInput = z.object({
  userId: z.string().trim().toLowerCase().min(1).max(STAFF_USER_ID_MAX),
  outcome: z.enum(STAFF_LOGIN_OUTCOMES),
});
/** `{ roles }` on SUCCESS, `{}` otherwise. */
export const recordStaffLoginOutput = z.object({ roles: z.array(roleSchema).optional() });
