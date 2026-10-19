// UC #5-2 edit form: validation (before submit) and changed-fields patch.
import {
  WORKSHOP_CAPACITY_MAX,
  WORKSHOP_CAPACITY_MIN,
  WORKSHOP_DESCRIPTION_MAX,
  WORKSHOP_MATERIALS_MAX,
  WORKSHOP_TITLE_MAX,
} from '@silveracademy/shared';
import type { Workshop } from '@silveracademy/shared';
import type { WorkshopPatch } from '../repo/workshopsRepo';
import { workshopStrings as t } from '../strings';
import type { EditForm } from '../types';

export const toEditForm = (w: Workshop): EditForm => ({
  title: w.title,
  description: w.description,
  category: w.category,
  materials: w.materials,
  capacity: String(w.capacity),
});

export type FormCheck =
  { ok: true; patch: WorkshopPatch } | { ok: false; errors: Record<string, string> };

/** Validates every field and returns only the changed ones. Capacity is skipped when locked. */
export function checkEditForm(
  form: EditForm,
  original: Workshop,
  capacityIsLocked: boolean,
): FormCheck {
  const errors: Record<string, string> = {};
  const patch: WorkshopPatch = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const materials = form.materials.trim();

  if (!title || title.length > WORKSHOP_TITLE_MAX) errors.title = t.edit.errors.title;
  else if (title !== original.title) patch.title = title;
  if (!description || description.length > WORKSHOP_DESCRIPTION_MAX)
    errors.description = t.edit.errors.description;
  else if (description !== original.description) patch.description = description;
  if (materials.length > WORKSHOP_MATERIALS_MAX) errors.materials = t.edit.errors.materials;
  else if (materials !== original.materials) patch.materials = materials;
  if (form.category !== original.category) patch.category = form.category;

  if (!capacityIsLocked) {
    const capacity = Number(form.capacity);
    if (
      !/^\d+$/.test(form.capacity.trim()) ||
      capacity < WORKSHOP_CAPACITY_MIN ||
      capacity > WORKSHOP_CAPACITY_MAX
    )
      errors.capacity = t.edit.errors.capacity;
    else if (capacity < original.seatsTaken)
      errors.capacity = t.edit.errors.capacityBelow(original.seatsTaken);
    else if (capacity !== original.capacity) patch.capacity = capacity;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, patch };
}
