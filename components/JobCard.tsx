import React from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Pill } from './Pill';
import Icon from "react-native-remix-icon";

// ---------------------------------------------------------------------------
// Border Gradient Colors
// ---------------------------------------------------------------------------

const BORDER_GRADIENT = {
  colors: ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.3)'] as const,
  locations: [0, 0.5, 1] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobCardStatus = 'done' | 'loading' | 'error' | 'trip';

export interface JobCardProps {
  status: JobCardStatus;
  /** Main title displayed on the card */
  title: string;
  /** Secondary line (e.g. "12 Lieux · Hier") */
  subtitle?: string;
  /** Source URL shown at the bottom of the text block */
  url?: string;
  /** Content type for icon display */
  contentType?: 'video' | 'carousel' | 'blog';
  /** Number of images for carousel content */
  imageCount?: number;
  /** Label inside the status pill (e.g. "Terminé ✓") */
  pillLabel: string;
  /** Background colour of the status pill */
  pillBackgroundColor: string;
  /** Text colour of the status pill */
  pillTextColor: string;
  /** Background colour of the card */
  cardBackgroundColor: string;
  /** Label shown under the icon (ignored for 'error') */
  iconLabel?: string;
  /** Background colour of the icon label badge */
  iconLabelBackgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Shared text colours (not content-specific, kept as internal constants)
// ---------------------------------------------------------------------------

const TEXT = {
  title:    '#FFFFFF',
  subtitle: '#F4F4F4',
  subtitleError: 'rgba(255,167,167,0.4)',
  url:      '#7D7D7D',
  dark:     '#101A49',
};

// ---------------------------------------------------------------------------
// Icon Components
// ---------------------------------------------------------------------------

function LoadingIcon({ size = 33, color = '#5F57C1' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}6E`, // ~43% opacity
        }}
      />
      <View
        style={{
          width: size / 2,
          height: size / 2,
          borderRadius: size / 4,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 7.6,
        }}
      />
    </View>
  );
}

function ErrorIcon({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 34 34" fill="none">
      <Circle cx="17" cy="17" r="16" fill="rgba(178, 8, 8, 0.39)" />
      <Circle cx="17" cy="17" r="11" fill="rgba(178, 8, 8, 0.6)" />
      <Path d="M17 10V18" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="17" cy="22" r="1.5" fill="#FF6B6B" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// BlurWrapper
// ---------------------------------------------------------------------------

interface BlurWrapperProps {
  blur: boolean;
  intensity?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function BlurWrapper({ blur, intensity = 18, children, style }: BlurWrapperProps) {
  return (
    <View style={[{ position: 'relative' }, style]}>
      {children}
      {blur && (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Icon Column
// ---------------------------------------------------------------------------

interface IconColumnProps {
  status: JobCardStatus;
  iconLabel?: string;
  iconLabelBackgroundColor?: string;
  contentType?: 'video' | 'carousel' | 'blog';
}

function IconColumn({ status, iconLabel, iconLabelBackgroundColor, contentType = 'video' }: IconColumnProps) {
  const isLoading = status === 'loading';
  const isCarousel = contentType === 'carousel';
  const isBlog = contentType === 'blog';

  return (
    <BlurWrapper blur={isLoading} intensity={5} style={{ width: 76 }}>
      <View
        style={{
          width: 76,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
        }}
      >
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
          {status === 'done'    && isBlog && <Icon name={'file-text-line'} size={42} color={'#14b8a6'} />}
          {status === 'done'    && isCarousel && <Icon name={'gallery-line'} size={42} color={'#306A9F'} />}
          {status === 'done'    && !isBlog && !isCarousel && <Icon name={'building-fill'} size={42} color={'#306A9F'} />}
          {status === 'trip'    && isBlog && <Icon name={'file-text-line'} size={42} color={'#14b8a6'} />}
          {status === 'trip'    && isCarousel && <Icon name={'gallery-line'} size={42} color={'#656E57'} />}
          {status === 'trip'    && !isBlog && !isCarousel && <Icon name={'signpost-fill'} size={42} color={'#656E57'} />}
          {status === 'loading' && <LoadingIcon />}
          {status === 'error'   && <ErrorIcon />}
        </View>

        {status !== 'error' && iconLabel && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 1,
              backgroundColor: iconLabelBackgroundColor ?? 'transparent',
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans',
                fontSize: 8,
                lineHeight: 10,
                color: TEXT.dark,
              }}
            >
              {iconLabel}
            </Text>
          </View>
        )}
      </View>
    </BlurWrapper>
  );
}

// ---------------------------------------------------------------------------
// JobCard Component
// ---------------------------------------------------------------------------

export function JobCard({
                          status,
                          title,
                          subtitle,
                          url,
                          contentType,
                          imageCount,
                          pillLabel,
                          pillBackgroundColor,
                          pillTextColor,
                          cardBackgroundColor,
                          iconLabel,
                          iconLabelBackgroundColor,
                          style,
                        }: JobCardProps) {
  const isLoading = status === 'loading';
  const borderWidth = 1;

  return (
    <LinearGradient
      colors={[...BORDER_GRADIENT.colors]}
      locations={[...BORDER_GRADIENT.locations]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        {
          width: '100%',
          borderRadius: 16,
          padding: borderWidth,
        },
        style,
      ]}
    >
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 10,
          gap: 10,
          backgroundColor: cardBackgroundColor,
          borderRadius: 16 - borderWidth,
          overflow: 'hidden',
        }}
      >
        {/* Icon column — blurred on loading */}
        <IconColumn
          status={status}
          iconLabel={iconLabel}
          iconLabelBackgroundColor={iconLabelBackgroundColor}
          contentType={contentType}
        />

        {/* Text block — blurred on loading */}
        <BlurWrapper blur={isLoading} intensity={10} style={{ flex: 1 }}>
          <View style={{ flex: 1, gap: 6, paddingRight: 90 }}>
            <Text
              style={{
                fontFamily: 'Righteous',
                fontWeight: '400',
                fontSize: 16,
                lineHeight: 20,
                color: TEXT.title,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>

            {subtitle && (
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontWeight: '200',
                  fontSize: 12,
                  lineHeight: 16,
                  color: status === 'error' ? TEXT.subtitleError : TEXT.subtitle,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}

            {url && (
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontWeight: '200',
                  fontSize: 10,
                  lineHeight: 13,
                  color: TEXT.url,
                }}
                numberOfLines={1}
              >
                {url}
              </Text>
            )}
          </View>
        </BlurWrapper>

        {/* Status Pill — always sharp, absolute top-right */}
        <View style={{ position: 'absolute', top: 14, right: 7 }}>
          <Pill
            label={pillLabel}
            backgroundColor={pillBackgroundColor}
            textColor={pillTextColor}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// ValidateBanner
// ---------------------------------------------------------------------------

export interface ValidateBannerProps {
  label?: string;
}

export function ValidateBanner({ label = 'Clique sur analyse terminé pour la valider' }: ValidateBannerProps) {
  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        paddingVertical: 4,
        paddingHorizontal: 10,
        backgroundColor: '#5248D4',
        borderRadius: 16,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        position: 'absolute',
        bottom: -20,
      }}
    >
      <Text
        style={{
          fontFamily: 'Righteous',
          fontWeight: '400',
          fontSize: 9,
          lineHeight: 11,
          color: '#E4E4E4',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}