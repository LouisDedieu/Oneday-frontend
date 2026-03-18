import { useState, useEffect, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { View, Keyboard, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TabBar } from '@/components/navigation/TabBar';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NavbarTab, NavbarAction } from '@/components/navigation/Navbar';
import { useAnalysis } from '@/context/AnalysisContext';
import { useNotifications } from '@/context/NotificationContext';

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const keyboardHeight = useSharedValue(0);
  const { triggerAnalysis } = useAnalysis();
  const { unreadCount } = useNotifications();

  // Build tabs with notification badge
  const tabs: NavbarTab[] = useMemo(() => [
    { icon: 'inbox-line', label: t('tabs.inbox'), badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: 'bookmark-line', label: t('tabs.saved') },
    { icon: 'user3-line', label: t('tabs.profile') },
  ], [unreadCount, t]);

  // Build actions with translations
  const actions: NavbarAction[] = useMemo(() => [
    { icon: 'sparkling-fill', label: t('tabs.actionsAuto'), color: 'default' as const },
    { icon: 'signpost-fill', label: t('tabs.actionsTrip'), color: 'green' as const },
    { icon: 'building-fill', label: t('tabs.actionsCity'), color: 'blue' as const },
  ], [t]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      keyboardHeight.value = withTiming(e.endCoordinates.height - insets.bottom, {
        duration: Platform.OS === 'ios' ? 250 : 200,
        easing: Easing.out(Easing.ease),
      });
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      keyboardHeight.value = withTiming(0, {
        duration: Platform.OS === 'ios' ? 250 : 200,
        easing: Easing.out(Easing.ease),
      });
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [insets.bottom]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardHeight.value }],
  }));

  const handleTabChange = (index: number) => {
    const route = state.routes[index];
    navigation.navigate(route.name);
  };

  const handleSubmit = (url: string, _action: NavbarAction) => {
    // Clear the input after submission
    setInputValue('');
    // Delegate to whatever page has registered its handler
    triggerAnalysis(url);
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 8,
        },
        animatedStyle,
      ]}
    >
      <TabBar
        tabs={tabs}
        activeIndex={state.index}
        onTabChange={handleTabChange}
        expanded={expanded}
        onExpandedChange={setExpanded}
        actions={actions}
        inputPlaceholder={t('tabs.pasteLinkPlaceholder')}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleSubmit}
      />
    </Animated.View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: 'transparent' },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="review" options={{ href: null }} />
    </Tabs>
  );
}