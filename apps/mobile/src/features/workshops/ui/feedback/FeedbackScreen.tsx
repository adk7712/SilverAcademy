// UC #2-4 SubmitWorkshopFeedback: rating, review and tags for attended workshops inside the 7-day window.
import { View } from 'react-native';
import { FEEDBACK_TAGS_MAX, FEEDBACK_WINDOW_DAYS } from '@silveracademy/shared';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ListItem,
  LoadingState,
  Screen,
  TextField,
  useTheme,
} from '../../../../design';
import { format, strings } from '../../../../i18n';
import { feedbackState } from '../../controller/feedbackLogic';
import { useFeedback } from '../../controller/useFeedback';

const t = strings.workshopsVolunteer;
const RATINGS = [1, 2, 3, 4, 5] as const;
const TAG_KEYS = Object.keys(t.tags) as (keyof typeof t.tags)[];

export function FeedbackScreen() {
  const { spacing } = useTheme();
  const c = useFeedback();
  const now = new Date();
  const selected = c.items.find((w) => w.workshopId === c.selectedId) ?? null;

  return (
    <Screen title={t.feedbackTitle}>
      <AppText color="textMuted">{format(t.feedbackIntro, { days: FEEDBACK_WINDOW_DAYS })}</AppText>
      {c.error ? <ErrorBanner message={c.error} /> : null}
      {c.loading ? <LoadingState /> : null}
      {!c.loading && c.items.length === 0 && !c.error ? (
        <EmptyState title={t.feedbackEmpty} message={t.feedbackEmptyBody} />
      ) : null}
      {selected ? (
        <Card>
          <AppText variant="title">{selected.title}</AppText>
          <AppText variant="bodyStrong">{t.feedbackRating}</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {RATINGS.map((n) => (
              <View key={n} style={{ flex: 1 }}>
                <Button
                  label={String(n)}
                  variant={c.rating === n ? 'primary' : 'secondary'}
                  accessibilityLabel={format(t.ratingLabel, { n })}
                  onPress={() => c.setRating(n)}
                  testID={`rating-${n}`}
                />
              </View>
            ))}
          </View>
          {c.ratingError ? <AppText color="danger">{c.ratingError}</AppText> : null}
          <TextField
            label={`${t.feedbackComment} (${strings.common.fieldOptional})`}
            value={c.comment}
            onChangeText={c.setComment}
            multiline
            testID="feedback-comment"
          />
          <AppText variant="bodyStrong">
            {format(t.feedbackTags, { max: FEEDBACK_TAGS_MAX })}
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {TAG_KEYS.map((key) => (
              <Button
                key={key}
                label={t.tags[key]}
                variant={c.tags.includes(t.tags[key]) ? 'primary' : 'secondary'}
                onPress={() => c.toggleTag(t.tags[key])}
              />
            ))}
          </View>
          <Button
            label={t.feedbackSubmit}
            loading={c.busy}
            onPress={() => void c.submit()}
            testID="feedback-submit"
          />
          <Button label={strings.common.cancel} variant="ghost" onPress={() => c.select(null)} />
        </Card>
      ) : (
        c.items.map((w) => {
          const s = feedbackState(w, c.submitted, now);
          return (
            <ListItem
              key={w.workshopId}
              title={w.title}
              meta={
                s.kind === 'OPEN'
                  ? format(t.feedbackOpenUntil, { date: s.deadline.toLocaleDateString('en-SG') })
                  : undefined
              }
              right={
                s.kind === 'OPEN' ? (
                  <Badge label={t.feedbackRate} tone="info" />
                ) : (
                  <Badge
                    label={s.kind === 'SUBMITTED' ? t.feedbackSubmitted : t.feedbackClosed}
                    tone="neutral"
                  />
                )
              }
              onPress={s.kind === 'OPEN' ? () => c.select(w.workshopId) : undefined}
              testID={`feedback-${w.workshopId}`}
            />
          );
        })
      )}
    </Screen>
  );
}
