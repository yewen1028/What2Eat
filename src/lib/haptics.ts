import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics are a user preference, and `Touchable` is used everywhere — routing
 * the toggle through a module flag keeps the primitive from having to subscribe
 * to profile context on every button in the app.
 */
let enabled = true;

export function setHapticsEnabled(next: boolean) {
  enabled = next;
}

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export function impact(strength: 'light' | 'medium' = 'light') {
  if (!enabled || !supported) return;
  void Haptics.impactAsync(
    strength === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
  ).catch(() => {});
}

export function selection() {
  if (!enabled || !supported) return;
  void Haptics.selectionAsync().catch(() => {});
}
