import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '../../src/components/Badges';
import { Button } from '../../src/components/Button';
import { FilterChip } from '../../src/components/FilterChip';
import { Notice, SCREEN_PADDING, SectionHeader } from '../../src/components/Layout';
import { Toggle } from '../../src/components/Toggle';
import { Txt } from '../../src/components/Txt';
import { useNearby } from '../../src/state/nearby';
import { initialsFor, useProfile } from '../../src/state/profile';
import { useSaved } from '../../src/state/saved';
import { useTheme } from '../../src/theme/theme';
import { fonts, icon, radius, space } from '../../src/theme/tokens';

const WALK_OPTIONS = [5, 10, 20, 40];
const RATING_OPTIONS = [0, 4, 4.3, 4.5];
const PRICE_OPTIONS: { level: number; label: string; hint: string }[] = [
  { level: 1, label: '$', hint: 'Cheap eats' },
  { level: 2, label: '$$', hint: 'Moderate' },
  { level: 3, label: '$$$', hint: 'Expensive' },
  { level: 4, label: '$$$$', hint: 'Very expensive' },
];

export default function ProfileScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { profile, update, reset } = useProfile();
  const { items, remove } = useSaved();
  const {
    status,
    areaName,
    usingDemoLocation,
    source,
    places,
    suggestions,
    filtersChanged,
    resetFilters,
    requestLocation,
    useDemoLocation,
  } = useNearby();

  const togglePrice = (level: number) => {
    const next = profile.priceLevels.includes(level)
      ? profile.priceLevels.filter((l) => l !== level)
      : [...profile.priceLevels, level].sort();
    update({ priceLevels: next.length === 0 ? [level] : next });
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[
        styles.body,
        { paddingTop: insets.top + space.xl, paddingBottom: space['4xl'] },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Identity />

      <View style={styles.section}>
        <SectionHeader title="Your defaults" />
        <Txt variant="small" tone="muted" style={{ marginBottom: space.lg }}>
          Every session starts from these. The filter sheet still overrides them for a one-off, and
          “Reset” there comes back to this page.
        </Txt>

        <Txt variant="smallStrong" style={styles.fieldLabel}>
          Diet
        </Txt>
        <View style={styles.chipWrap}>
          <FilterChip
            label="No restriction"
            selected={profile.dietary === 'none'}
            onPress={() => update({ dietary: 'none' })}
          />
          <FilterChip
            label="Vegetarian"
            iconName="leaf-outline"
            selected={profile.dietary === 'vegetarian'}
            onPress={() => update({ dietary: 'vegetarian' })}
          />
        </View>

        <Txt variant="smallStrong" style={styles.fieldLabel}>
          How far you will walk
        </Txt>
        <View style={styles.chipWrap}>
          {WALK_OPTIONS.map((m) => (
            <FilterChip
              key={m}
              label={`${m} min`}
              selected={profile.maxWalkMinutes === m}
              accessibilityLabel={`Up to ${m} minutes walk`}
              onPress={() => update({ maxWalkMinutes: m })}
            />
          ))}
        </View>

        <Txt variant="smallStrong" style={styles.fieldLabel}>
          Minimum rating
        </Txt>
        <View style={styles.chipWrap}>
          {RATING_OPTIONS.map((r) => (
            <FilterChip
              key={r}
              label={r === 0 ? 'Any' : `${r.toFixed(1)}+`}
              selected={profile.minRating === r}
              accessibilityLabel={r === 0 ? 'Any rating' : `Rated ${r.toFixed(1)} and above`}
              onPress={() => update({ minRating: r })}
            />
          ))}
        </View>

        <Txt variant="smallStrong" style={styles.fieldLabel}>
          Price range
        </Txt>
        <View style={styles.chipWrap}>
          {PRICE_OPTIONS.map((p) => (
            <FilterChip
              key={p.level}
              label={p.label}
              selected={profile.priceLevels.includes(p.level)}
              accessibilityLabel={`${p.hint}, ${p.label}`}
              onPress={() => togglePrice(p.level)}
            />
          ))}
        </View>

        <SwitchRow
          title="Only show open kitchens"
          subtitle="Hides places that have already closed."
          value={profile.openOnly}
          onChange={(v) => update({ openOnly: v })}
        />

        {filtersChanged ? (
          <View style={{ marginTop: space.lg }}>
            <Notice text="This session is currently using different filters than your defaults." />
            <Button
              label="Use my defaults now"
              variant="secondary"
              onPress={resetFilters}
              style={{ marginTop: space.md }}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Your activity" />
        <View style={styles.statRow}>
          <Stat value={String(items.length)} label={items.length === 1 ? 'Place saved' : 'Places saved'} />
          <Stat value={String(suggestions.length)} label="Match right now" />
          <Stat value={String(places.length)} label="Considered nearby" />
        </View>
        {items.length > 0 ? (
          <Button
            label="View saved places"
            variant="secondary"
            onPress={() => router.push('/saved')}
            style={{ marginTop: space.lg }}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Location & data" />
        <InfoRow
          iconName="navigate-outline"
          label="Position"
          value={
            status !== 'ready'
              ? 'Not set'
              : usingDemoLocation
                ? `Demo · ${areaName ?? 'Fitzrovia'}`
                : (areaName ?? 'Located')
          }
        />
        <InfoRow
          iconName="server-outline"
          label="Listings"
          value={source === 'google' ? 'Google Places' : 'Sample data'}
        />
        <View style={[styles.chipWrap, { marginTop: space.lg }]}>
          <Button
            label={usingDemoLocation || status !== 'ready' ? 'Use my real location' : 'Refresh position'}
            variant="secondary"
            iconName="locate"
            onPress={requestLocation}
          />
          {!usingDemoLocation ? (
            <Button label="Demo location" variant="ghost" onPress={useDemoLocation} />
          ) : null}
        </View>
        <Txt variant="small" tone="muted" style={{ marginTop: space.md }}>
          Your position is read on demand and used only to rank what is around you. Nothing is
          uploaded, and nothing about you is stored beyond this device.
        </Txt>
      </View>

      <View style={styles.section}>
        <SectionHeader title="App" />
        <SwitchRow
          title="Haptic feedback"
          subtitle="A light tap when you press things. Ignored on web."
          value={profile.hapticsEnabled}
          onChange={(v) => update({ hapticsEnabled: v })}
          first
        />
        <InfoRow iconName="contrast-outline" label="Appearance" value="Follows system" />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Reset" />
        <ConfirmButton
          label="Reset preferences"
          confirmLabel="Tap again to reset"
          onConfirm={reset}
        />
        {items.length > 0 ? (
          <ConfirmButton
            label={`Clear ${items.length} saved ${items.length === 1 ? 'place' : 'places'}`}
            confirmLabel="Tap again to clear"
            onConfirm={() => items.forEach((p) => remove(p.id))}
            style={{ marginTop: space.md }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

/** Name is edited in place — a separate "edit profile" screen would be one tap
 *  of ceremony for one field. */
function Identity() {
  const { c } = useTheme();
  const { profile, update } = useProfile();
  const { areaName } = useNearby();
  const { items } = useSaved();
  const [draft, setDraft] = useState(profile.name);
  const [focused, setFocused] = useState(false);

  useEffect(() => setDraft(profile.name), [profile.name]);

  const subtitle = [areaName, items.length > 0 ? `${items.length} saved` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.identity}>
      <View style={[styles.avatar, { backgroundColor: c.accentSoft, borderColor: c.accent }]}>
        <Txt style={{ fontFamily: fonts.display, fontSize: 22, color: c.onAccentSoft }}>
          {initialsFor(profile.name)}
        </Txt>
      </View>

      <View style={{ flex: 1, marginLeft: space.lg }}>
        <View style={styles.nameRow}>
          <TextInput
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            update({ name: draft.trim() });
          }}
          onSubmitEditing={() => update({ name: draft.trim() })}
          placeholder="Add your name"
          placeholderTextColor={c.textFaint}
          returnKeyType="done"
          maxLength={40}
          accessibilityLabel="Your name"
          accessibilityHint="Used for the greeting on the Now tab"
            style={[
              styles.nameInput,
              {
                color: c.text,
                borderColor: focused ? c.accent : 'transparent',
                backgroundColor: focused ? c.surface : 'transparent',
              },
            ]}
          />
          {!focused ? (
            <Ionicons name="pencil" size={icon.sm - 2} color={c.textFaint} style={{ marginLeft: 2 }} />
          ) : null}
        </View>
        <Txt variant="small" tone="muted" numberOfLines={1} style={{ marginLeft: space.sm }}>
          {subtitle || 'Tap your name to change it'}
        </Txt>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.surfaceAlt }]}>
      <Txt style={{ fontFamily: fonts.display, fontSize: 26, color: c.text, letterSpacing: -0.5 }}>
        {value}
      </Txt>
      <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
        {label}
      </Txt>
    </View>
  );
}

function InfoRow({
  iconName,
  label,
  value,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.infoRow, { borderColor: c.border }]} accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={iconName} size={icon.md} color={c.textMuted} />
      <Txt variant="body" tone="muted" style={{ marginLeft: space.md, marginRight: space.lg }}>
        {label}
      </Txt>
      <View style={{ flex: 1 }} />
      <Txt variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}

function SwitchRow({
  title,
  subtitle,
  value,
  onChange,
  first,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  /** Drops the separating rule when the row opens a section. */
  first?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        styles.switchRow,
        { borderColor: c.border },
        first && { marginTop: 0, paddingTop: 0, borderTopWidth: 0 },
      ]}
    >
      <View style={{ flex: 1, marginRight: space.lg }}>
        <Txt variant="bodyStrong">{title}</Txt>
        <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
          {subtitle}
        </Txt>
      </View>
      <Toggle value={value} onChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

/**
 * Two-tap confirmation instead of a system dialog: `Alert` is a no-op on web,
 * and a destructive action must not silently do nothing on any platform.
 */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  style,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  style?: object;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  return (
    <Button
      label={armed ? confirmLabel : label}
      variant="secondary"
      iconName={armed ? 'alert-circle-outline' : 'refresh-outline'}
      accessibilityHint={armed ? 'Confirms the reset' : 'Asks for confirmation before resetting'}
      style={style}
      onPress={() => {
        if (armed) {
          if (timer.current) clearTimeout(timer.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), 4000);
      }}
    />
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SCREEN_PADDING },
  identity: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  nameInput: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    minHeight: 40,
  },
  section: { marginTop: space['3xl'] },
  fieldLabel: { marginTop: space.lg, marginBottom: space.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statRow: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, padding: space.lg, borderRadius: radius.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
