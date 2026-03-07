import React, { useCallback } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Navbar, type NavbarTab, type NavbarAction } from '@/components/navigation/Navbar';
import { PrimaryButton } from '@/components/PrimaryButton';
import Icon from 'react-native-remix-icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabBarProps {
  /** Tab items for the Navbar */
  tabs: NavbarTab[];
  /** Index of active tab */
  activeIndex?: number;
  /** Called when tab changes */
  onTabChange?: (index: number) => void;
  /** Whether the navbar is expanded */
  expanded?: boolean;
  /** Called when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Action buttons shown in expanded mode */
  actions?: NavbarAction[];
  /** Input placeholder in expanded mode */
  inputPlaceholder?: string;
  /** Input value in expanded mode */
  inputValue?: string;
  /** Called when input value changes */
  onInputChange?: (value: string) => void;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// CrossIcon — two rectangles forming a + / × shape
// Drawn manually so we fully own the transform (no icon lib dependency here)
// ---------------------------------------------------------------------------

function CrossIcon({ size, color }: { size: number; color: string }) {
  const thickness = Math.round(size * 0.083); // ≈ 2px at 24
  const length = Math.round(size * 0.75);     // ≈ 18px at 24

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: length,
          height: thickness,
          backgroundColor: color,
          borderRadius: thickness / 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: thickness,
          height: length,
          backgroundColor: color,
          borderRadius: thickness / 2,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// TabBar
// ---------------------------------------------------------------------------

export function TabBar({
                         tabs,
                         activeIndex = 0,
                         onTabChange,
                         expanded = false,
                         onExpandedChange,
                         actions,
                         inputPlaceholder,
                         inputValue,
                         onInputChange,
                         style,
                       }: TabBarProps) {
  // 0 = collapsed → 1 = expanded
  const expandProgress = useSharedValue(expanded ? 1 : 0);

  const timingConfig = {
    duration: 300,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  };

  // Sync animation when prop is controlled externally
  React.useEffect(() => {
    expandProgress.value = withTiming(expanded ? 1 : 0, timingConfig);
  }, [expanded]);

  const handleToggle = useCallback(() => {
    onExpandedChange?.(!expanded);
  }, [expanded, onExpandedChange]);

  // Cross rotates 0° (add) → 45° (close) as panel opens
  const rotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(expandProgress.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 17,
        },
        style,
      ]}
    >
      {/* Navbar fills the available width */}
      <Navbar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabChange={onTabChange}
        expanded={expanded}
        actions={actions}
        inputPlaceholder={inputPlaceholder}
        inputValue={inputValue}
        onInputChange={onInputChange}
        style={{ flex: 1 }}
      />

      {/* Toggle button — fixed 61×61 to match Figma */}
      <View style={{ width: 61, height: 61 }}>
        {/*
          PrimaryButton renders the gradient shell + press animation.
          We pass NO icon props intentionally: when size="icon" with no
          title/children, PrimaryButton renders an empty pressable shell,
          which is exactly what we want — our CrossIcon overlay handles
          the visual.
        */}
        {/*
          We use size="pill" (borderRadius: 51) with forced 61×61 dimensions.
          size="icon" computes borderRadius=26 which isn't enough for a perfect
          circle at 61px. pill's radius of 51 exceeds half of 61 so it always
          renders as a perfect circle regardless of exact px value.
        */}
        <PrimaryButton
          size="pill"
          onPress={handleToggle}
          style={{ width: 61, height: 61 }}
        />

        {/* Animated cross overlay (non-interactive) */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            },
            rotateStyle,
          ]}
        >
          <Icon name="add-line" size={32} color="#FAFAFF" />
        </Animated.View>
      </View>
    </View>
  );
}