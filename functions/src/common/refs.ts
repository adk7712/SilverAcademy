// Collection names, path builders and typed Firestore converters (architecture.md 2.2, 2.3). Cross-cutting.
import type {
  CollectionReference,
  DocumentData,
  Firestore,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type {
  AuditLog,
  Booking,
  Facility,
  InstructorProfile,
  LedgerEntry,
  Notification,
  TimeSlot,
  User,
  VenueRequest,
  Wallet,
  Workshop,
} from '@silveracademy/shared';

/** Top-level and sub-collection ids. Use these instead of string literals. */
export const COL = {
  users: 'users',
  instructorProfiles: 'instructorProfiles',
  workshops: 'workshops',
  facilities: 'facilities',
  slots: 'slots',
  venueRequests: 'venueRequests',
  bookings: 'bookings',
  attendance: 'attendance',
  volunteerAssignments: 'volunteerAssignments',
  feedback: 'feedback',
  wallets: 'wallets',
  ledger: 'ledger',
  voucherTiers: 'voucherTiers',
  voucherInventory: 'voucherInventory',
  voucherUploads: 'voucherUploads',
  incidents: 'incidents',
  notifications: 'notifications',
  auditLogs: 'auditLogs',
  rateLimits: 'rateLimits',
} as const;

/** Deterministic ids where uniqueness is a business rule (architecture.md 2.2). */
export const ids = {
  booking: (workshopId: string, learnerId: string) => `${workshopId}_${learnerId}`,
  volunteerAssignment: (workshopId: string, volunteerId: string) => `${workshopId}_${volunteerId}`,
  earnEntry: (bookingId: string) => `earn_${bookingId}`,
  redeemEntry: (voucherId: string) => `redeem_${voucherId}`,
  singpassUid: (hash20: string) => `sp_${hash20}`,
  staffUid: (staffUserId: string) => `st_${staffUserId}`,
};

/** Full document paths for places that need a string (e.g. `Notification.refPath`). */
export const paths = {
  user: (uid: string) => `${COL.users}/${uid}`,
  workshop: (id: string) => `${COL.workshops}/${id}`,
  booking: (id: string) => `${COL.bookings}/${id}`,
  wallet: (uid: string) => `${COL.wallets}/${uid}`,
  ledgerEntry: (uid: string, entryId: string) => `${COL.wallets}/${uid}/${COL.ledger}/${entryId}`,
  facility: (id: string) => `${COL.facilities}/${id}`,
  slot: (facilityId: string, slotId: string) =>
    `${COL.facilities}/${facilityId}/${COL.slots}/${slotId}`,
  venueRequest: (id: string) => `${COL.venueRequests}/${id}`,
};

/**
 * Pass-through converter that only adds types. Writes keep using FieldValue/Timestamp as normal;
 * the stored shape is the shared entity interface (TimestampLike is satisfied by admin Timestamp).
 */
export const converter = <T>(): FirestoreDataConverter<T> => ({
  toFirestore: (data) => data as DocumentData,
  fromFirestore: (snap: QueryDocumentSnapshot) => snap.data() as T,
});

const typed = <T>(db: Firestore, path: string): CollectionReference<T> =>
  db.collection(path).withConverter(converter<T>());

/** Typed collection refs. Entities embed `id`/`uid` fields, so the converter does not inject ids. */
export const refs = {
  users: (db: Firestore) => typed<User>(db, COL.users),
  instructorProfiles: (db: Firestore) => typed<InstructorProfile>(db, COL.instructorProfiles),
  workshops: (db: Firestore) => typed<Workshop>(db, COL.workshops),
  facilities: (db: Firestore) => typed<Facility>(db, COL.facilities),
  slots: (db: Firestore, facilityId: string) =>
    typed<TimeSlot>(db, `${COL.facilities}/${facilityId}/${COL.slots}`),
  venueRequests: (db: Firestore) => typed<VenueRequest>(db, COL.venueRequests),
  bookings: (db: Firestore) => typed<Booking>(db, COL.bookings),
  wallets: (db: Firestore) => typed<Wallet>(db, COL.wallets),
  ledger: (db: Firestore, uid: string) =>
    typed<LedgerEntry>(db, `${COL.wallets}/${uid}/${COL.ledger}`),
  notifications: (db: Firestore) => typed<Notification>(db, COL.notifications),
  auditLogs: (db: Firestore) => typed<AuditLog>(db, COL.auditLogs),
  /** Untyped escape hatch for collections without a shared entity type here (attendance, feedback, vouchers...). */
  raw: (db: Firestore, collection: string) => db.collection(collection),
};
