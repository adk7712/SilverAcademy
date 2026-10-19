// UC #2-5 SubmitUserReport controller: draft, optional attachment (upload first), submit, my reports.
import { useCallback, useEffect, useState } from 'react';
import {
  INCIDENT_DESCRIPTION_MAX,
  INCIDENT_DESCRIPTION_MIN,
  type IncidentCategory,
} from '@silveracademy/shared';
import { format, strings } from '../../../i18n';
import { errorMessage } from '../../../services/errors/errorMessage';
import { useSession } from '../../auth';
import {
  deleteAttachment,
  listMyReports,
  submitReport,
  uploadAttachment,
} from '../repo/reportRepo';
import type { MyReport, PickedAttachment } from '../reportTypes';
import {
  attachmentPath,
  checkAttachment,
  maxAttachmentMb,
  validateReportDraft,
} from './reportLogic';

const t = strings.reports;

export function useReportIssue() {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<PickedAttachment | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ category?: string; description?: string }>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const [reports, setReports] = useState<MyReport[]>([]);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!uid) return;
    try {
      setReports(await listMyReports(uid));
      setReportsError(null);
    } catch (e) {
      setReportsError(errorMessage(e));
    }
  }, [uid]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const pick = (file: PickedAttachment | null) => {
    if (!file) return;
    const problem = checkAttachment(file);
    if (problem) {
      setAttachment(null);
      setAttachmentError(
        problem === 'TOO_LARGE'
          ? format(t.attachTooLarge, { mb: maxAttachmentMb })
          : t.attachBadType,
      );
      return;
    }
    setAttachmentError(null);
    setAttachment(file);
  };

  /** Runs the device picker; a picker failure is shown as an attachment error instead of rejecting. */
  const pickFromDevice = async (picker: () => Promise<PickedAttachment | null>) => {
    try {
      pick(await picker());
    } catch {
      setAttachmentError(t.attachPickFailed);
    }
  };

  const submit = async () => {
    const errors = validateReportDraft({ category, description });
    setFieldErrors({
      category: errors.category ? t.categoryRequired : undefined,
      description:
        errors.description === 'DESCRIPTION_TOO_SHORT'
          ? format(t.descriptionTooShort, { min: INCIDENT_DESCRIPTION_MIN })
          : errors.description
            ? format(t.descriptionTooLong, { max: INCIDENT_DESCRIPTION_MAX })
            : undefined,
    });
    if (errors.category || errors.description || !category || !uid) return;
    setBusy(true);
    setError(null);
    try {
      let attachmentPaths: string[] | undefined;
      if (attachment) {
        const path = attachmentPath(
          uid,
          attachment.contentType,
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        );
        try {
          await uploadAttachment(attachment.uri, path, attachment.contentType);
        } catch {
          setError(t.uploadFailed); // nothing is submitted when the upload fails (no partial record)
          return;
        }
        attachmentPaths = [path];
      }
      let ref: string;
      try {
        ref = await submitReport({
          category,
          description: description.trim(),
          attachmentPaths,
        });
      } catch (e) {
        // Best effort: do not leave an orphaned upload behind when no report references it.
        if (attachmentPaths?.[0]) void deleteAttachment(attachmentPaths[0]).catch(() => undefined);
        throw e;
      }
      setReferenceNo(ref);
      void loadReports();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setReferenceNo(null);
    setCategory(null);
    setDescription('');
    setAttachment(null);
    setFieldErrors({});
    setAttachmentError(null);
    setError(null);
  };

  return {
    category,
    setCategory,
    description,
    setDescription,
    attachment,
    pick,
    pickFromDevice,
    clearAttachment: () => setAttachment(null),
    fieldErrors,
    attachmentError,
    error,
    busy,
    referenceNo,
    reports,
    reportsError,
    submit,
    reset,
    reloadReports: loadReports,
  };
}
