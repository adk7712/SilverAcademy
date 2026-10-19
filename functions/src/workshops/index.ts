// Callables for the workshops feature, surfaced as workshops-<name> (UC #1-2, #3-2).
// adminUpdateWorkshop / adminSetStatus / submitFeedback: task 1.7.
export { createWorkshopCallable as createWorkshop } from './handlers/createWorkshop';
export { updateWorkshopCallable as updateWorkshop } from './handlers/updateWorkshop';
export { optInVolunteerCallable as optInVolunteer } from './handlers/optInVolunteer';
export { withdrawVolunteerCallable as withdrawVolunteer } from './handlers/withdrawVolunteer';
export { adminUpdateWorkshopCallable as adminUpdateWorkshop } from './handlers/adminUpdateWorkshop';
export { adminSetStatusCallable as adminSetStatus } from './handlers/adminSetStatus';
export { submitFeedbackCallable as submitFeedback } from './handlers/submitFeedback';
