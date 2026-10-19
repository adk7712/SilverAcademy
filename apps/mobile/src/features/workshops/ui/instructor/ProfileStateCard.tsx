// UC #1-2 shows the instructor-profile approval state and links to the profile form.
import { AppText, Badge, Button, Card } from '../../../../design';
import { strings } from '../../../../i18n';
import { profileStatusInfo, type ProfileStatus } from '../../../users';

const t = strings.workshopsInstructor;

export function ProfileStateCard({
  status,
  onOpenProfile,
}: {
  status: ProfileStatus;
  onOpenProfile: () => void;
}) {
  const info = profileStatusInfo(status);
  if (status === 'APPROVED') {
    return <Badge label={t.profileApproved} tone="success" />;
  }
  return (
    <Card>
      <Badge label={info.label} tone={info.tone} />
      <AppText variant="bodyStrong">{t.profileGateMessage}</AppText>
      <Button label={t.openProfile} variant="secondary" onPress={onOpenProfile} />
    </Card>
  );
}
