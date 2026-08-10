import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Touchable } from '../../src/components/Touchable';
import { Txt } from '../../src/components/Txt';
import { useSaved } from '../../src/state/saved';
import { useTheme } from '../../src/theme/theme';
import { icon as iconSize, space } from '../../src/theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; label: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', label: 'Now', icon: 'compass-outline', activeIcon: 'compass' },
  { name: 'nearby', label: 'Nearby', icon: 'list-outline', activeIcon: 'list' },
  { name: 'map', label: 'Map', icon: 'map-outline', activeIcon: 'map' },
  { name: 'saved', label: 'Saved', icon: 'bookmark-outline', activeIcon: 'bookmark' },
  { name: 'profile', label: 'You', icon: 'person-outline', activeIcon: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Now' }} />
      <Tabs.Screen name="nearby" options={{ title: 'Nearby' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { items } = useSaved();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.bg,
          borderTopColor: c.border,
          paddingBottom: Math.max(insets.bottom, space.md),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;

        const focused = state.index === index;
        const tint = focused ? c.accent : c.textFaint;
        const badge = tab.name === 'saved' && items.length > 0 ? items.length : undefined;

        return (
          <Touchable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={
              badge ? `${tab.label} tab, ${badge} saved` : `${tab.label} tab`
            }
            accessibilityState={{ selected: focused }}
            haptic="selection"
            scaleTo={0.94}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tab}
          >
            <View>
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={iconSize.lg}
                color={tint}
              />
              {badge !== undefined ? (
                <View style={[styles.badge, { backgroundColor: c.accent, borderColor: c.bg }]}>
                  <Txt variant="label" color={c.onAccent} style={styles.badgeText}>
                    {badge > 9 ? '9+' : badge}
                  </Txt>
                </View>
              ) : null}
            </View>
            <Txt variant="label" color={tint} style={{ marginTop: 5 }}>
              {tab.label}
            </Txt>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { letterSpacing: 0, fontSize: 10, lineHeight: 14 },
});
