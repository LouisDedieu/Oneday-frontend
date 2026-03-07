import { Tabs } from 'expo-router';
import { Platform, DynamicColorIOS } from 'react-native';
import Constants from 'expo-constants';
import { TabBarItem } from '@/components/navigation/TabBar';

const isExpoGo = Constants.appOwnership === 'expo';
const isIOS26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26 && !isExpoGo;

// Dynamically import NativeTabs only when supported
let NativeTabs: any = null;
if (isIOS26) {
  const nativeTabsModule = require('expo-router/unstable-native-tabs');
  NativeTabs = nativeTabsModule.NativeTabs;
}

function ClassicTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181b',
          borderTopWidth: 1,
          borderTopColor: '#27272a',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarItem icon={focused ? 'inbox-fill' : 'inbox-line'} label="Inbox" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarItem icon={focused ? 'bookmark-fill' : 'bookmark-line'} label="Saved" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarItem icon={focused ? 'user-fill' : 'user-line'} label="Profile" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

function LiquidGlassTabs() {
  if (!NativeTabs) return <ClassicTabs />;

  const dynamicColor = DynamicColorIOS({
    dark: 'white',
    light: 'black',
  });

  return (
    <NativeTabs
      labelStyle={{ color: dynamicColor }}
      tintColor={dynamicColor}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.fill' }} md="inbox" />
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} md="bookmark" />
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabsLayout() {
  if (isIOS26) {
    return <LiquidGlassTabs />;
  }
  return <ClassicTabs />;
}
