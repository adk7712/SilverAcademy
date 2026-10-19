// UC #2-4 SubmitWorkshopFeedback controller: list attended workshops, submit one review at a time.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../design';
import { strings } from '../../../i18n';
import { errorMessage } from '../../../services/errors/errorMessage';
import { toAppError } from '../../../services/errors/toAppError';
import { useSession } from '../../auth';
import type { AttendedWorkshop } from '../feedbackTypes';
import {
  listAttendedWorkshops,
  listSubmittedWorkshopIds,
  submitFeedback,
} from '../repo/feedbackRepo';
import { clampComment, sortForFeedback, toggleTag, validateFeedback } from './feedbackLogic';

export function useFeedback() {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const toast = useToast();
  const [attended, setAttended] = useState<AttendedWorkshop[]>([]);
  const [submitted, setSubmitted] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const [list, done] = await Promise.all([
        listAttendedWorkshops(uid),
        listSubmittedWorkshopIds(uid),
      ]);
      setAttended(list);
      setSubmitted(done);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(
    () => sortForFeedback(attended, submitted, new Date()),
    [attended, submitted],
  );

  const select = (id: string | null) => {
    setSelectedId(id);
    setRating(null);
    setComment('');
    setTags([]);
    setRatingError(null);
    setError(null);
  };

  const submit = async () => {
    if (!selectedId) return;
    if (validateFeedback({ rating, comment, tags })) {
      setRatingError(strings.workshopsVolunteer.ratingRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitFeedback({
        workshopId: selectedId,
        rating: rating as number,
        comment: comment.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.show(strings.workshopsVolunteer.feedbackThanks, 'success');
      setSubmitted((s) => new Set([...s, selectedId]));
      select(null);
    } catch (e) {
      const appError = toAppError(e);
      setError(errorMessage(appError));
      // Window closed / already submitted / not attended: the list state is stale, refresh it.
      if (['FEEDBACK_WINDOW_CLOSED', 'ALREADY_SUBMITTED', 'NOT_ATTENDED'].includes(appError.code)) {
        select(null);
        await load();
        setError(errorMessage(appError));
      }
    } finally {
      setBusy(false);
    }
  };

  return {
    items,
    submitted,
    loading,
    error,
    busy,
    selectedId,
    rating,
    comment,
    tags,
    ratingError,
    select,
    setRating: (n: number) => {
      setRating(n);
      setRatingError(null);
    },
    setComment: (text: string) => setComment(clampComment(text)),
    toggleTag: (tag: string) => setTags((t) => toggleTag(t, tag)),
    submit,
    reload: load,
  };
}
