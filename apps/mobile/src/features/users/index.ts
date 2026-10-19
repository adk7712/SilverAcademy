// Public API of the users feature (cross-feature imports go through here).
export { ProfileScreen } from './ui/ProfileScreen';
export { InstructorProfileScreen } from './ui/InstructorProfileScreen';
export { useInstructorProfile } from './controller/useInstructorProfile';
export {
  isProfileApproved,
  profileStatusInfo,
  type ProfileStatus,
} from './controller/instructorProfileLogic';
