// UC #1-2 CreateWorkshop form: mandatory fields with inline errors; blocked until the profile is approved.
import { useState } from 'react';
import { WORKSHOP_CATEGORIES } from '@silveracademy/shared';
import {
  AppText,
  Button,
  Card,
  ErrorBanner,
  LoadingState,
  Screen,
  Segmented,
  Select,
  TextField,
  useToast,
} from '../../../design';
import { strings } from '../../../i18n';
import { useAppNavigation } from '../../../navigation';
import { isProfileApproved, useInstructorProfile } from '../../users';
import { EMPTY_WORKSHOP_FORM, type WorkshopForm } from '../controller/instructorWorkshopLogic';
import { useCreateWorkshop } from '../controller/useCreateWorkshop';

const t = strings.workshopsInstructor;
const categoryOptions = WORKSHOP_CATEGORIES.map((c) => ({ value: c, label: t.categoryLabels[c] }));
const yesNo = [
  { value: 'yes', label: t.yes },
  { value: 'no', label: t.no },
] as const;

export function CreateWorkshopScreen() {
  const navigation = useAppNavigation();
  const toast = useToast();
  const profile = useInstructorProfile();
  const { errors, serverError, saving, submit } = useCreateWorkshop();
  const [form, setForm] = useState<WorkshopForm>(EMPTY_WORKSHOP_FORM);
  const set = <K extends keyof WorkshopForm>(key: K, value: WorkshopForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (profile.loading) {
    return (
      <Screen title={strings.workshops.createTitle}>
        <LoadingState />
      </Screen>
    );
  }
  if (!isProfileApproved(profile.status)) {
    return (
      <Screen title={strings.workshops.createTitle}>
        <Card>
          <AppText variant="title">{t.notApprovedTitle}</AppText>
          <AppText>{t.profileGateMessage}</AppText>
          <Button
            label={t.openProfile}
            onPress={() => navigation.navigate('InstructorProfileForm')}
          />
        </Card>
      </Screen>
    );
  }

  const onSubmit = async () => {
    const workshopId = await submit(form);
    if (workshopId) {
      toast.show(t.created, 'success');
      navigation.replace('VenueRequest', { workshopId });
    }
  };

  return (
    <Screen title={strings.workshops.createTitle}>
      <AppText color="textMuted">{t.formIntro}</AppText>
      {serverError ? <ErrorBanner message={serverError} /> : null}
      {Object.keys(errors).length > 0 ? <ErrorBanner message={t.formHasErrors} /> : null}
      <TextField
        label={t.fieldTitle}
        value={form.title}
        onChangeText={(v) => set('title', v)}
        error={errors.title}
      />
      <TextField
        label={t.fieldDescription}
        value={form.description}
        onChangeText={(v) => set('description', v)}
        multiline
        error={errors.description}
      />
      <Select
        label={t.fieldCategory}
        options={categoryOptions}
        value={form.category}
        onChange={(v) => set('category', v)}
        error={errors.category}
      />
      <TextField
        label={t.fieldCapacity}
        value={form.capacity}
        onChangeText={(v) => set('capacity', v)}
        keyboardType="number-pad"
        error={errors.capacity}
      />
      <TextField
        label={t.fieldMaterials}
        helper={t.fieldMaterialsHelper}
        value={form.materials}
        onChangeText={(v) => set('materials', v)}
        multiline
        error={errors.materials}
      />
      <AppText variant="bodyStrong">{t.fieldNeedsVolunteers}</AppText>
      <Segmented
        options={yesNo}
        value={form.needsVolunteers ? 'yes' : 'no'}
        onChange={(v) => set('needsVolunteers', v === 'yes')}
      />
      {form.needsVolunteers ? (
        <TextField
          label={t.fieldVolunteerSlots}
          value={form.volunteerSlots}
          onChangeText={(v) => set('volunteerSlots', v)}
          keyboardType="number-pad"
          error={errors.volunteerSlots}
        />
      ) : null}
      <Button label={t.saveDraft} onPress={() => void onSubmit()} loading={saving} />
    </Screen>
  );
}
