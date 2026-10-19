// UC #2-5 ReportIssue: pure decisions for reports-submitReport. No Firebase imports.
import {
  AppError,
  ATTACHMENT_CONTENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  REPORTER_ROLES,
  type IncidentAttachment,
  type ReporterRole,
  type Role,
} from '@silveracademy/shared';

/** What Storage reports about an uploaded object (null = object missing). */
export interface AttachmentMeta {
  path: string;
  contentType: string;
  sizeBytes: number;
}

const attachmentPrefix = (uid: string): string => `reportUploads/${uid}/`;

/** Path must be exactly `reportUploads/{uid}/{fileId}` for the caller (no nested paths or traversal). */
export function isOwnAttachmentPath(uid: string, path: string): boolean {
  const prefix = attachmentPrefix(uid);
  if (!path.startsWith(prefix)) return false;
  const fileId = path.slice(prefix.length);
  return fileId.length > 0 && !fileId.includes('/') && fileId !== '.' && fileId !== '..';
}

/** Cheap pre-storage check so foreign paths never trigger a Storage lookup. */
export function assertOwnAttachmentPaths(uid: string, paths: readonly string[]): void {
  const bad = paths.filter((p) => !isOwnAttachmentPath(uid, p));
  if (bad.length > 0) throw new AppError('ATTACHMENT_INVALID', undefined, { paths: bad });
}

/** Every path needs metadata (else missing), an allowed content type and size <= MAX_ATTACHMENT_BYTES. */
export function decideAttachments(
  paths: readonly string[],
  metas: ReadonlyArray<AttachmentMeta | null>,
): IncidentAttachment[] {
  const out: IncidentAttachment[] = [];
  paths.forEach((path, i) => {
    const meta = metas[i];
    const okType =
      !!meta && (ATTACHMENT_CONTENT_TYPES as readonly string[]).includes(meta.contentType);
    if (!meta || !okType || meta.sizeBytes > MAX_ATTACHMENT_BYTES || meta.sizeBytes <= 0) {
      throw new AppError('ATTACHMENT_INVALID', undefined, { path });
    }
    out.push({ path, contentType: meta.contentType, sizeBytes: meta.sizeBytes });
  });
  return out;
}

/** The role stamped on the incident: first held role that may report, in REPORTER_ROLES order. */
export function reporterRoleOf(roles: readonly Role[]): ReporterRole {
  const role = REPORTER_ROLES.find((r) => roles.includes(r));
  if (!role) throw new AppError('PERMISSION_DENIED');
  return role;
}
