// UC #1-2 Instructor profile form: submit for approval, shows status and rejection reason.
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { WORKSHOP_CATEGORIES, type WorkshopCategory } from '@silveracademy/shared';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorBanner,
  LoadingState,
  Screen,
  TextField,
  useTheme,
  useToast,
} from '../../../design';
import { format, strings } from '../../../i18n';
import {
  EMPTY_PROFILE_FORM,
  canSubmitProfile,
  profileStatusInfo,
  toggleExpertise,
  validateProfileForm,
  type ProfileForm,
  type ProfileFormErrors,
} from '../controller/instructorProfileLogic';
import { useInstructorProfile } from '../controller/useInstructorProfile';

const t = strings.usersInstructor;

export function InstructorProfileScreen() {
  const { spacing, colors, sizes, radius } = useTheme();
  const toast = useToast();
  const { profile, status, loading, error, saving, reload, submit } = useInstructorProfile();
  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM);
  const [errors, setErrors] = useState<ProfileFormErrors>({});

  useEffect(() => {
    if (profile) {
      setForm({
        bio: profile.bio,
        expertise: profile.expertise,
        experienceYears: String(profile.experienceYears),
      });
    }
  }, [profile]);

  const info = profileStatusInfo(status);
  const editable = canSubmitProfile(status);
  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async () => {
    const result = validateProfileForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (await submit(result.input)) toast.show(t.submitted, 'success');
  };

  return (
    <Screen title={strings.users.instructorProfileTitle}>
      {loading && !profile ? <LoadingState /> : null}
      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      <Card>
        <AppText color="textMuted">{t.statusLabel}</AppText>
        <Badge label={info.label} tone={info.tone} />
        {profile?.reviewReason && (status === 'REJECTED' || status === 'REQUIRES_REVISION') ? (
          <AppText color="danger" variant="bodyStrong">
            {format(t.rejectionReason, { reason: profile.reviewReason })}
          </AppText>
        ) : null}
        {status === 'PENDING' ? <AppText>{t.pendingNote}</AppText> : null}
        {status === 'APPROVED' ? <AppText>{t.approvedNote}</AppText> : null}
      </Card>
      {editable ? <AppText color="textMuted">{t.intro}</AppText> : null}
      <TextField
        label={t.fieldBio}
        helper={t.fieldBioHelper}
        value={form.bio}
        onChangeText={(v) => set('bio', v)}
        multiline
        error={errors.bio}
      />
      <View style={{ gap: spacing.sm }}>
        <AppText variant="bodyStrong">{t.fieldExpertise}</AppText>
        {WORKSHOP_CATEGORIES.map((c: WorkshopCategory) => {
          const selected = form.expertise.includes(c);
          return (
            <Pressable
              key={c}
              disabled={!editable}
              onPress={() => set('expertise', toggleExpertise(form.expertise, c))}
              accessibilityRole="checkbox"
              accessibilityLabel={t.categoryLabels[c]}
              accessibilityState={{ checked: selected, disabled: !editable }}
              style={{
                minHeight: sizes.iconButton,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: sizes.borderWidth,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.secondaryBg : colors.background,
                opacity: editable ? 1 : 0.6,
              }}
            >
              <AppText variant={selected ? 'bodyStrong' : 'body'}>
                {selected ? '✓ ' : ''}
                {t.categoryLabels[c]}
              </AppText>
            </Pressable>
          );
        })}
        {errors.expertise ? (
          <AppText variant="caption" color="danger">
            {errors.expertise}
          </AppText>
        ) : null}
      </View>
      <TextField
        label={t.fieldExperience}
        value={form.experienceYears}
        onChangeText={(v) => set('experienceYears', v)}
        keyboardType="number-pad"
        error={errors.experienceYears}
      />
      {editable ? (
        <Button
          label={status === null ? t.submit : t.resubmit}
          onPress={() => void onSubmit()}
          loading={saving}
        />
      ) : null}
    </Screen>
  );
}
