import React from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '@/components/ui/utils';
import Icon from 'react-native-remix-icon';

// ---------------------------------------------------------------------------
// Color Presets - Each has stroke gradient + fill gradient
// ---------------------------------------------------------------------------

const colorPresets = {
  // Default purple/indigo (from Figma)
  default: {
    stroke: ['#7a6eec', '#362D81', '#5C4FD0'] as const,
    fill: ['#776bc8', '#2D22A5'] as const,
    fillAngle: 124.86,
    shadow: 'rgba(59, 46, 189, 0.64)',
    dropShadow: 'rgba(17, 13, 63, 0.36)',
  },
  // Purple variant
  purple: {
    stroke: ['#9d65fa', '#4C1D95', '#7C3AED'] as const,
    fill: ['#8b58dc', '#4C1D95'] as const,
    fillAngle: 124.86,
    shadow: 'rgba(109, 40, 217, 0.64)',
    dropShadow: 'rgba(76, 29, 149, 0.36)',
  },
  // Blue variant
  blue: {
    stroke: ['#6096f3', '#1E3A8A', '#3B82F6'] as const,
    fill: ['#5184f6', '#1D4ED8'] as const,
    fillAngle: 124.86,
    shadow: 'rgba(37, 99, 235, 0.64)',
    dropShadow: 'rgba(30, 58, 138, 0.36)',
  },
  // Green/yellowish variant
  green: {
    stroke: ['#7c8c5e', '#3D4A2D', '#6B7B4F'] as const,
    fill: ['#768851', '#4A5A2F'] as const,
    fillAngle: 124.86,
    shadow: 'rgba(92, 107, 61, 0.64)',
    dropShadow: 'rgba(61, 74, 45, 0.36)',
  },
} as const;

type ColorPreset = keyof typeof colorPresets;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrimaryButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Button label text */
  title?: string;
  /** Children (alternative to title) */
  children?: React.ReactNode;
  /** Remixicon name for left icon (e.g., "add-line", "arrow-right-line") */
  leftIcon?: string;
  /** Remixicon name for right icon */
  rightIcon?: string;
  /** Show arrow icon on the right (shorthand for rightIcon="arrow-right-line") */
  showArrow?: boolean;
  /** Color preset */
  color?: ColorPreset;
  /** Button size: default, sm, lg, icon (round), pill (max rounded with text+icon) */
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'pill';
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Extra class names */
  className?: string;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrimaryButton({
  title,
  children,
  leftIcon,
  rightIcon,
  showArrow = false,
  color = 'default',
  size = 'default',
  fullWidth = false,
  loading = false,
  disabled = false,
  className,
  style,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const preset = colorPresets[color];
  const isIconOnly = size === 'icon' && !title && !children;

  // Size configurations
  const sizeConfig = {
    default: { height: 51, padding: { top: 9, bottom: 9, left: 10, right: 12 }, iconSize: 24, fontSize: 16, borderRadius: 16, strokeWidth: 3 },
    sm: { height: 40, padding: { top: 6, bottom: 6, left: 8, right: 10 }, iconSize: 20, fontSize: 14, borderRadius: 12, strokeWidth: 3 },
    lg: { height: 60, padding: { top: 12, bottom: 12, left: 14, right: 16 }, iconSize: 28, fontSize: 18, borderRadius: 20, strokeWidth: 3 },
    icon: { height: 51, padding: { top: 0, bottom: 0, left: 0, right: 0 }, iconSize: 24, fontSize: 16, borderRadius: 26, strokeWidth: 3 },
    pill: { height: 48, padding: { top: 6, bottom: 6, left: 14, right: 14 }, iconSize: 19, fontSize: 14, borderRadius: 51, strokeWidth: 3 },
  };

  const config = sizeConfig[size];
  const iconOnlySize = size === 'icon' ? config.height : undefined;

  // Actual right icon (either provided or arrow)
  const actualRightIcon = rightIcon ?? (showArrow ? 'arrow-right-line' : undefined);

  return (
    <Pressable
      disabled={isDisabled}
      className={cn(fullWidth && 'w-full', className)}
      style={[
        {
          height: config.height,
          width: isIconOnly ? iconOnlySize : undefined,
          borderRadius: config.borderRadius,
          // Drop shadow
          shadowColor: preset.dropShadow,
          shadowOffset: { width: 3, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 10,
          elevation: 8,
        },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
      {...props}
    >
      {({ pressed }) => (
        <View
          style={{
            flex: 1,
            borderRadius: config.borderRadius,
            overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          }}
        >
          {/* Stroke gradient (outer layer) */}
          <LinearGradient
            colors={[...preset.stroke]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: config.borderRadius,
            }}
          />

          {/* Fill gradient (inner layer - creates stroke effect) */}
          <LinearGradient
            colors={[...preset.fill]}
            start={{ x: 0.45, y: -1 }}
            end={{ x: 0.5, y:  1}}
            style={{
              position: 'absolute',
              top: config.strokeWidth,
              left: config.strokeWidth,
              right: config.strokeWidth,
              bottom: config.strokeWidth,
              borderRadius: config.borderRadius - 1,
              // Inner shadow simulation
              shadowColor: preset.shadow,
              shadowOffset: { width: -4, height: -4 },
              shadowOpacity: 1,
              shadowRadius: 12,
            }}
          />

          {/* Content */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: config.padding.top,
              paddingBottom: config.padding.bottom,
              paddingLeft: config.padding.left,
              paddingRight: config.padding.right,
              gap: 10,
              zIndex: 10,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FAFAFF" />
            ) : (
              <>
                {leftIcon && (
                  <Icon name={leftIcon} size={config.iconSize} color="#FAFAFF" />
                )}
                {(title || children) && (
                  <Text
                    style={{
                      fontFamily: 'Righteous',
                      fontWeight: '400',
                      fontSize: config.fontSize,
                      lineHeight: config.fontSize * 1.25,
                      color: '#FAFAFF',
                      textAlign: 'center',
                    }}
                  >
                    {children ?? title}
                  </Text>
                )}
                {actualRightIcon && !isIconOnly && (
                  <Icon name={actualRightIcon} size={config.iconSize} color="#FAFAFF" />
                )}
              </>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export { colorPresets };
