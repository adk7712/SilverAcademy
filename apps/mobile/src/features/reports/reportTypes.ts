// UC #2-5 view models for Report an Issue.
import type { IncidentCategory, IncidentStatus } from '@silveracademy/shared';

export interface PickedAttachment {
  uri: string;
  name: string;
  sizeBytes: number;
  contentType: string;
}

export interface MyReport {
  referenceNo: string;
  category: IncidentCategory;
  status: IncidentStatus;
  createdAt: Date | null;
  infoRequest?: string;
  resolution?: string;
}
