import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Icon from 'react-native-remix-icon';
import { cn } from '@/components/ui/utils';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Input } from '@/components/Input';
import { isValidUrl } from '@/services/inboxService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavbarTab {
  /** Remixicon name */
  icon: string;
  /** Tab label */
  label: string;
  /** Badge count (optional) */
  badge?: number;
  /** Called when tab is pressed */
  onPress?: () => void;
}

export interface NavbarAction {
  /** Remixicon name */
  icon: string;
  /** Action label */
  label: string;
  /** Color preset */
  color: 'purple' | 'green' | 'blue' | 'default';
  /** Called when action is pressed */
  onPress?: () => void;
}

export interface NavbarProps extends Omit<ViewProps, 'children'> {
  /** Tab items */
  tabs: NavbarTab[];
  /** Index of active tab */
  activeIndex?: number;
  /** Called when tab changes */
  onTabChange?: (index: number) => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary';
  /** Size variant (secondary only) */
  size?: 'default' | 'sm';
  /** Expanded mode with action buttons (primary only) */
  expanded?: boolean;
  /** Action buttons (for expanded mode) */
  actions?: NavbarAction[];
  /** Input placeholder (for expanded mode) */
  inputPlaceholder?: string;
  /** Input value (for expanded mode) */
  inputValue?: string;
  /** Called when input changes (for expanded mode) */
  onInputChange?: (value: string) => void;
  /**
   * Called when the user submits a URL via an action button.
   * Receives the current inputValue and the action that was pressed.
   */
  onSubmit?: (url: string, action: NavbarAction) => void;
  /** Extra class names */
  className?: string;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

// Primary variant colors
const PRIMARY_COLORS = {
  main: '#3529C1',
  outerGradient: ['#EEF2FF', 'rgba(191, 200, 239, 0.88)', '#E7EBF8'] as const,
  innerGradient: ['#EBEFFF', '#F1F3FB'] as const,
  indicatorBg: '#FAFAFF',
  border: 'rgba(24, 56, 186, 0.54)',
};

// Secondary variant colors
const SECONDARY_COLORS = {
  activeText: '#FAFAFF',
  inactiveText: 'rgba(250,250,255,0.7)',
  outerGradient: ['#8781CD', 'rgba(103, 96, 185, 0.88)', '#8781CD'] as const,
  innerGradient: ['#534D99', '#625BAD'] as const,
  indicatorBg: '#3C367C',
  badgeBg: '#7872AF',
  border: 'rgba(24, 56, 186, 0.54)',
};

// Size configurations
const SIZE_CONFIG = {
  primary: {
    default: {
      navbarHeight: 61,
      expandedHeight: 122,
      indicatorWidth: 94,
      iconSize: 22,
      fontSize: 13,
      padding: 3,
      tabHeight: 54,
    },
  },
  secondary: {
    default: {
      navbarHeight: 50,
      tabHeight: 42,
      iconSize: 24,
      fontSize: 14,
      padding: 3.5,
      badgeSize: 15,
    },
    sm: {
      navbarHeight: 31,
      tabHeight: 25,
      iconSize: 13,
      fontSize: 12,
      padding: 2.5,
      badgeSize: 12,
    },
  },
};

// ---------------------------------------------------------------------------
// NavbarItem Component (Primary)
// ---------------------------------------------------------------------------

function PrimaryNavbarItem({
                             icon,
                             label,
                             badge,
                             active,
                             onPress,
                             onPressIn,
                             onPressOut,
                             tabHeight,
                             iconSize,
                             fontSize,
                           }: {
  icon: string;
  label: string;
  badge?: number;
  active: boolean;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  tabHeight: number;
  iconSize: number;
  fontSize: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{
        flex: 1,
        height: tabHeight,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        borderRadius: 30,
        zIndex: 2,
      }}
    >
      <View style={{ position: 'relative' }}>
        <Icon name={active ? icon.replace('-line', '-fill') : icon} size={iconSize} color={PRIMARY_COLORS.main} />
        {badge !== undefined && badge > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -8,
              backgroundColor: '#F87171',
              borderRadius: 8,
              minWidth: 16,
              height: 16,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                fontFamily: 'Righteous',
                fontSize: 9,
                lineHeight: 12,
                color: '#FAFAFF',
              }}
            >
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          fontFamily: 'Righteous',
          fontSize: fontSize,
          lineHeight: fontSize * 1.2,
          color: PRIMARY_COLORS.main,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// NavbarItem Component (Secondary)
// ---------------------------------------------------------------------------

function SecondaryNavbarItem({
                               icon,
                               label,
                               badge,
                               active,
                               onPress,
                               onPressIn,
                               onPressOut,
                               tabHeight,
                               iconSize,
                               fontSize,
                               badgeSize,
                             }: {
  icon: string;
  label: string;
  badge?: number;
  active: boolean;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  tabHeight: number;
  iconSize: number;
  fontSize: number;
  badgeSize: number;
}) {
  const textColor = active ? SECONDARY_COLORS.activeText : SECONDARY_COLORS.inactiveText;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{
        flex: 1,
        height: tabHeight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        borderRadius: 30,
        zIndex: 2,
      }}
    >
      <Icon name={active ? icon.replace('-line', '-fill') : icon} size={iconSize} color={textColor} />
      <Text
        style={{
          fontFamily: 'Righteous',
          fontSize: fontSize,
          lineHeight: fontSize * 1.25,
          color: textColor,
        }}
      >
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View
          style={{
            backgroundColor: SECONDARY_COLORS.badgeBg,
            borderRadius: 17,
            paddingHorizontal: 4,
            minWidth: badgeSize,
            height: badgeSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'Righteous',
              fontSize: 10,
              lineHeight: 12,
              color: SECONDARY_COLORS.activeText,
            }}
          >
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Animated Indicator Component
// ---------------------------------------------------------------------------

function AnimatedIndicator({
                             activeIndex,
                             tabCount,
                             containerWidth,
                             variant,
                             tabHeight,
                             padding,
                             isPressed,
                           }: {
  activeIndex: number;
  tabCount: number;
  containerWidth: number;
  variant: 'primary' | 'secondary';
  tabHeight: number;
  padding: number;
  isPressed: Animated.SharedValue<boolean>;
}) {
  const indicatorWidth =
    variant === 'primary'
      ? SIZE_CONFIG.primary.default.indicatorWidth
      : containerWidth / tabCount - padding+1;

  const tabWidth = containerWidth / tabCount;

  const translateX = useSharedValue(activeIndex * tabWidth + (tabWidth - indicatorWidth) / 2);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  useEffect(() => {
    translateX.value = withSpring(
      activeIndex * tabWidth + (tabWidth - indicatorWidth) / 2,
      SPRING_CONFIG
    );
  }, [activeIndex, tabWidth, indicatorWidth]);

  const animatedStyle = useAnimatedStyle(() => {
    if (isPressed.value) {
      scaleX.value = withSpring(1.08, { damping: 8, stiffness: 600, mass: 0.5 });
      scaleY.value = withSpring(0.88, { damping: 8, stiffness: 600, mass: 0.5 });
    } else {
      scaleX.value = withSpring(1, { damping: 10, stiffness: 500, mass: 0.6 });
      scaleY.value = withSpring(1, { damping: 10, stiffness: 500, mass: 0.6 });
    }

    return {
      transform: [
        { translateX: translateX.value },
        { scaleX: scaleX.value },
        { scaleY: scaleY.value },
      ],
    };
  });

  const bgColor = variant === 'primary' ? PRIMARY_COLORS.indicatorBg : SECONDARY_COLORS.indicatorBg;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: indicatorWidth-4,
          height: tabHeight-1,
          top: padding,
          left: 2,
          backgroundColor: bgColor,
          borderRadius: 30,
          zIndex: 1,
          ...(variant === 'secondary' && {
            shadowColor: 'rgba(63, 63, 63, 0.23)',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 4,
            elevation: 4,
          }),
        },
        animatedStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Navbar Component
// ---------------------------------------------------------------------------

export function Navbar({
                         tabs,
                         activeIndex = 0,
                         onTabChange,
                         variant = 'primary',
                         size = 'default',
                         expanded = false,
                         actions,
                         inputPlaceholder = 'Coller votre lien ici...',
                         inputValue,
                         onInputChange,
                         onSubmit,
                         className,
                         style,
                         ...props
                       }: NavbarProps) {
  const sizeConfig =
    variant === 'primary' ? SIZE_CONFIG.primary.default : SIZE_CONFIG.secondary[size];

  const [containerWidth, setContainerWidth] = useState(0);

  const heightValue = useSharedValue(
    variant === 'primary' && expanded
      ? SIZE_CONFIG.primary.default.expandedHeight
      : sizeConfig.navbarHeight
  );
  const expandProgress = useSharedValue(expanded ? 1 : 0);
  const indicatorPressed = useSharedValue(false);

  useEffect(() => {
    if (variant === 'primary') {
      heightValue.value = withSpring(
        expanded ? SIZE_CONFIG.primary.default.expandedHeight : SIZE_CONFIG.primary.default.navbarHeight,
        SPRING_CONFIG
      );
      expandProgress.value = withTiming(expanded ? 1 : 0, {
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    }
  }, [expanded, variant]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: variant === 'primary' ? heightValue.value : sizeConfig.navbarHeight,
  }));

  const actionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    transform: [{ translateY: interpolate(expandProgress.value, [0, 1], [-10, 0]) }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    transform: [{ translateY: interpolate(expandProgress.value, [0, 1], [10, 0]) }],
  }));

  const tabsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(expandProgress.value, [0, 1], [1, 0.95]) }],
  }));

  const colors = variant === 'primary' ? PRIMARY_COLORS : SECONDARY_COLORS;

  // Derived: is the current inputValue a valid URL?
  const isValidInput = isValidUrl(inputValue ?? '');

  return (
    <Animated.View
      className={cn(className)}
      style={[
        {
          borderRadius: 30,
          borderWidth: 0.5,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        animatedContainerStyle,
        style,
      ]}
      {...props}
    >
      {/* Outer gradient (border effect) */}
      <LinearGradient
        colors={[...colors.outerGradient]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Inner fill gradient */}
      <LinearGradient
        colors={[...colors.innerGradient]}
        start={{ x: 0.5, y: variant === 'primary' ? 1 : 0 }}
        end={{ x: 0.5, y: variant === 'primary' ? 0 : 1 }}
        locations={[0.375, 1]}
        style={{
          position: 'absolute',
          top: sizeConfig.padding,
          left: sizeConfig.padding,
          right: sizeConfig.padding,
          bottom: sizeConfig.padding,
          borderRadius: 27,
        }}
      />

      {variant === 'primary' && expanded ? (
        // ── Expanded layout ────────────────────────────────────────────────
        <View style={{ flex: 1, padding: sizeConfig.padding, justifyContent: 'flex-end' }}>
          {/* Action buttons row */}
          {actions && actions.length > 0 && (
            <Animated.View
              style={[
                {
                  flexDirection: 'row',
                  paddingHorizontal: 4,
                  paddingTop: 7,
                  gap: 4,
                  height: 55,
                },
                actionsAnimatedStyle,
              ]}
            >
              {actions.map((action, index) => (
                <PrimaryButton
                  key={index}
                  leftIcon={action.icon}
                  title={action.label}
                  color={action.color}
                  size="pill"
                  style={{ flex: 1 }}
                  disabled={!isValidInput}
                  onPress={() => {
                    // Call the action's own handler (if any), then bubble up
                    action.onPress?.();
                    if (isValidInput && inputValue) {
                      onSubmit?.(inputValue.trim(), action);
                    }
                  }}
                />
              ))}
            </Animated.View>
          )}

          {/* Input field */}
          <Animated.View style={[{ marginTop: 10 }, inputAnimatedStyle]}>
            <Input
              value={inputValue}
              onChangeText={onInputChange}
              placeholder={inputPlaceholder}
              leftIcon="link"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onSubmitEditing={() => {
                // Allow submitting via keyboard "Go" — use first action or generic submit
                if (isValidInput && inputValue && actions?.[0]) {
                  onSubmit?.(inputValue.trim(), actions[0]);
                }
              }}
              returnKeyType="go"
            />
          </Animated.View>
        </View>
      ) : (
        // ── Tabs layout ────────────────────────────────────────────────────
        <Animated.View
          style={[
            {
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: sizeConfig.padding,
            },
            variant === 'primary' ? tabsAnimatedStyle : undefined,
          ]}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {containerWidth > 0 && (
            <AnimatedIndicator
              activeIndex={activeIndex}
              tabCount={tabs.length}
              containerWidth={containerWidth}
              variant={variant}
              tabHeight={sizeConfig.tabHeight}
              padding={sizeConfig.padding}
              isPressed={indicatorPressed}
            />
          )}

          {tabs.map((tab, index) =>
            variant === 'primary' ? (
              <PrimaryNavbarItem
                key={index}
                icon={tab.icon}
                label={tab.label}
                badge={tab.badge}
                active={index === activeIndex}
                onPress={() => {
                  tab.onPress?.();
                  onTabChange?.(index);
                }}
                onPressIn={() => { indicatorPressed.value = true; }}
                onPressOut={() => { indicatorPressed.value = false; }}
                tabHeight={sizeConfig.tabHeight}
                iconSize={sizeConfig.iconSize}
                fontSize={sizeConfig.fontSize}
              />
            ) : (
              <SecondaryNavbarItem
                key={index}
                icon={tab.icon}
                label={tab.label}
                badge={tab.badge}
                active={index === activeIndex}
                onPress={() => {
                  tab.onPress?.();
                  onTabChange?.(index);
                }}
                onPressIn={() => { indicatorPressed.value = true; }}
                onPressOut={() => { indicatorPressed.value = false; }}
                tabHeight={sizeConfig.tabHeight}
                iconSize={sizeConfig.iconSize}
                fontSize={sizeConfig.fontSize}
                badgeSize={(sizeConfig as typeof SIZE_CONFIG.secondary.default).badgeSize || 15}
              />
            )
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

export { SIZE_CONFIG as NAVBAR_SIZE_CONFIG };