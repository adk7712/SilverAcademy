// UC #1-2 / #5-5 Instructor profile strings (task 2.3).
import { categoryLabels } from './workshopsInstructor';

export const usersInstructor = {
  categoryLabels,
  intro: 'Tell us about yourself. An administrator will review your profile.',
  statusLabel: 'Status',
  statusNone: 'Not submitted',
  statusPending: 'Waiting for approval',
  statusApproved: 'Approved',
  statusRejected: 'Not approved',
  statusRevision: 'Changes needed',
  rejectionReason: 'Reason from the administrator: {reason}',
  fieldBio: 'About you',
  fieldBioHelper: 'Your background and what you like to teach.',
  fieldExpertise: 'What can you teach? (choose one or more)',
  fieldExperience: 'Years of experience',
  errBioRequired: 'Please tell us about yourself.',
  errBioTooLong: 'Too long (maximum {max} characters).',
  errExpertiseRequired: 'Choose at least one topic.',
  errExperienceInvalid: 'Enter a whole number from 0 to {max}.',
  submit: 'Submit for approval',
  resubmit: 'Submit changes for approval',
  submitted: 'Profile submitted for approval.',
  pendingNote: 'Your profile is being reviewed. You cannot change it until then.',
  approvedNote: 'Your profile is approved. You can create workshops.',
  loadFailed: 'We could not load your profile.',
  profileLink: 'Instructor profile',
} as const;
