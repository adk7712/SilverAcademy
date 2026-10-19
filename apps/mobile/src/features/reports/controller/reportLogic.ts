// UC #2-5 pure report rules: draft validation, attachment checks (rules: 5 MB, jpg/png/pdf), storage path.
import {
  ATTACHMENT_CONTENT_TYPES,
  INCIDENT_DESCRIPTION_MAX,
  INCIDENT_DESCRIPTION_MIN,
  MAX_ATTACHMENT_BYTES,
  type IncidentCategory,
} from '@silveracademy/shared';

export type ReportFieldError =
  'CATEGORY_REQUIRED' | 'DESCRIPTION_TOO_SHORT' | 'DESCRIPTION_TOO_LONG';

export interface ReportDraft {
  category: IncidentCategory | null;
  description: string;
}

/** Missing fields block submission (#2-5 Ex1). */
export function validateReportDraft(
  d: ReportDraft,
): Partial<Record<'category' | 'description', ReportFieldError>> {
  const errors: Partial<Record<'category' | 'description', ReportFieldError>> = {};
  if (!d.category) errors.category = 'CATEGORY_REQUIRED';
  const length = d.description.trim().length;
  if (length < INCIDENT_DESCRIPTION_MIN) errors.description = 'DESCRIPTION_TOO_SHORT';
  else if (length > INCIDENT_DESCRIPTION_MAX) errors.description = 'DESCRIPTION_TOO_LONG';
  return errors;
}

export type AttachmentProblem = 'TOO_LARGE' | 'BAD_TYPE';

/** Oversized or unsupported files are rejected before anything is uploaded (#2-5 Ex2). */
export function checkAttachment(file: {
  sizeBytes: number;
  contentType: string;
}): AttachmentProblem | null {
  if (!(ATTACHMENT_CONTENT_TYPES as readonly string[]).includes(file.contentType))
    return 'BAD_TYPE';
  if (file.sizeBytes > MAX_ATTACHMENT_BYTES) return 'TOO_LARGE';
  return null;
}

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

/** `reportUploads/{uid}/{fileId}` as required by storage.rules and reports-submitReport. */
export function attachmentPath(uid: string, contentType: string, nonce: string): string {
  return `reportUploads/${uid}/${nonce}.${EXTENSION[contentType] ?? 'bin'}`;
}

export const maxAttachmentMb = MAX_ATTACHMENT_BYTES / (1024 * 1024);
