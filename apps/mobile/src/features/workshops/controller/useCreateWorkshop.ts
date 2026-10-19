// UC #1-2 create-workshop submit: validate, call the callable, expose inline and server errors.
import { useCallback, useState } from 'react';
import { errorMessage } from '../../../services/errors/errorMessage';
import { createWorkshop } from '../repo/instructorWorkshopRepo';
import {
  validateWorkshopForm,
  type WorkshopForm,
  type WorkshopFormErrors,
} from './instructorWorkshopLogic';

export function useCreateWorkshop() {
  const [errors, setErrors] = useState<WorkshopFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Resolves the new workshop id, or null when validation or the server rejected it. */
  const submit = useCallback(async (form: WorkshopForm): Promise<string | null> => {
    setServerError(null);
    const result = validateWorkshopForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      return null;
    }
    setErrors({});
    setSaving(true);
    try {
      return (await createWorkshop(result.input)).workshopId;
    } catch (e) {
      setServerError(errorMessage(e));
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  return { errors, serverError, saving, submit };
}
