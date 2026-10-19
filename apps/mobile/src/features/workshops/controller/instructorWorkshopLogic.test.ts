// UC #1-2 tests for create-workshop validation and dashboard next steps.
import {
  EMPTY_WORKSHOP_FORM,
  nextStepFor,
  validateWorkshopForm,
  type WorkshopForm,
} from './instructorWorkshopLogic';

const valid: WorkshopForm = {
  title: ' Tai chi ',
  description: 'Gentle movement',
  category: 'FITNESS_WELLNESS',
  capacity: '12',
  materials: '',
  needsVolunteers: false,
  volunteerSlots: '',
};

describe('validateWorkshopForm', () => {
  it('reports every mandatory field on an empty form', () => {
    const r = validateWorkshopForm(EMPTY_WORKSHOP_FORM);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual([
        'capacity',
        'category',
        'description',
        'title',
      ]);
  });
  it('trims and builds the callable input with 0 volunteer slots', () => {
    const r = validateWorkshopForm({ ...valid, volunteerSlots: '4' });
    expect(r).toEqual({
      ok: true,
      input: {
        title: 'Tai chi',
        description: 'Gentle movement',
        category: 'FITNESS_WELLNESS',
        capacity: 12,
        materials: '',
        needsVolunteers: false,
        volunteerSlots: 0,
      },
    });
  });
  it.each(['0', '51', '2.5', 'abc', ''])('rejects capacity %p', (capacity) => {
    expect(validateWorkshopForm({ ...valid, capacity }).ok).toBe(false);
  });
  it('requires slots >= 1 when volunteers are needed', () => {
    const r = validateWorkshopForm({ ...valid, needsVolunteers: true, volunteerSlots: '0' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volunteerSlots).toBeDefined();
    expect(validateWorkshopForm({ ...valid, needsVolunteers: true, volunteerSlots: '3' }).ok).toBe(
      true,
    );
  });
  it('rejects an over-long title', () => {
    const r = validateWorkshopForm({ ...valid, title: 'x'.repeat(81) });
    expect(r.ok).toBe(false);
  });
});

describe('nextStepFor', () => {
  it('maps status to next action', () => {
    expect(nextStepFor('DRAFT').kind).toBe('REQUEST_VENUE');
    expect(nextStepFor('PENDING_VENUE').kind).toBe('VIEW_REQUEST');
    expect(nextStepFor('OPEN').kind).toBe('ROSTER');
    expect(nextStepFor('CANCELLED').kind).toBe('NONE');
  });
});
