import { Tabs } from 'expo-router';
import { View, Text, Platform, DynamicColorIOS } from 'react-native';
import { Inbox, Bookmark, User } from 'lucide-react-native';
import Constants from 'expo-constants';

const COLOR_ACTIVE   = '#3b82f6';
const COLOR_INACTIVE = '#71717a';

const isExpoGo = Constants.appOwnership === 'expo';
const isIOS26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26 && !isExpoGo;

// Dynamically import NativeTabs only when supported
let NativeTabs: any = null;
let Icon: any = null;
let Label: any = null;
if (isIOS26) {
  const nativeTabsModule = require('expo-router/unstable-native-tabs');
  NativeTabs = nativeTabsModule.NativeTabs;
  Icon = nativeTabsModule.Icon;
  Label = nativeTabsModule.Label;
}

function TabIcon({
                   Icon,
                   label,
                   focused,
                 }: {
  Icon: React.ComponentType<{ size?: number; color: string }>;
  label: string;
  focused: boolean;
}) {
  const color = focused ? COLOR_ACTIVE : COLOR_INACTIVE;
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
      <Icon size={24} color={color} />
      <Text style={{ fontSize: 12, color, marginTop: 4 }}>{label}</Text>
    </View>
  );
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
          tabBarIcon: ({ focused }) => <TabIcon Icon={Inbox} label="Inbox" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Bookmark} label="Saved" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} label="Profile" focused={focused} />,
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
        <Icon sf={{ default: 'tray', selected: 'tray.fill' }} md="inbox" />
        <Label>Inbox</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} md="bookmark" />
        <Label>Saved</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        <Label>Profile</Label>
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
