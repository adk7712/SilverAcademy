// Local view models for workshops (UC #5-2); entity types come from @silveracademy/shared.
import type { WorkshopCategory, WorkshopStatus } from '@silveracademy/shared';

export interface WorkshopFilters {
  query: string;
  status: WorkshopStatus | '';
  category: WorkshopCategory | '';
}

export const EMPTY_WORKSHOP_FILTERS: WorkshopFilters = { query: '', status: '', category: '' };

export interface EditForm {
  title: string;
  description: string;
  category: WorkshopCategory;
  materials: string;
  capacity: string;
}

export type SubmitOutcome<T> =
  | { kind: 'done'; value: T }
  | { kind: 'invalid'; fieldErrors: Record<string, string> }
  | {
      kind: 'failed';
      message: string;
      fieldErrors: Record<string, string>;
      refresh: boolean;
      endSession: boolean;
    };
