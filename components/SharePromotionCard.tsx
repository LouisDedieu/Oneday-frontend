import React from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import OneDayLogo from '@/assets/svg/Oneday.svg';
import TikTokLogo from '@/assets/svg/tiktok logo.svg';
import InstagramLogo from '@/assets/svg/instagram logo.svg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SharePromotionCardProps {
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = {
  background: '#231F5E',
  border: 'rgba(140, 146, 181, 0.35)',
  textPrimary: '#FAFAFF',
  textSecondary: 'rgba(255, 255, 255, 0.55)',
  textTertiary: 'rgba(255, 255, 255, 0.71)',
  workflowBar: '#353275',
  badgeBackground: 'rgba(95, 87, 193, 0.36)',
  badgeText: '#C2B2E1',
  iconBackground: '#4C42CE',
  iconForeground: '#C0C1C2',
  arrow: '#FAFAFF',
};

// ---------------------------------------------------------------------------
// Icon Components
// ---------------------------------------------------------------------------

function SocialIconsGroup() {
  return (
    <View style={{ width: 24, height: 19, position: 'relative' }}>
      <View style={{ position: 'absolute', left: 0, top: 2, transform: [{ rotate: '-15deg' }], borderRadius: '50%' }}>
        <TikTokLogo width={14} height={14} />
      </View>
      <View style={{ position: 'absolute', left: 10, top: 2, transform: [{ rotate: '15deg' }] }}>
        <InstagramLogo width={14} height={14} />
      </View>
    </View>
  );
}

function ArrowIcon({ size = 7.5 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Path
        d="M4 0L7.5 4L4 8"
        stroke={COLORS.arrow}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function ShareIcon({ size = 13.75 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: COLORS.iconBackground,
        borderRadius: 4.3,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" style={{ position: 'absolute' }} fill={COLORS.iconForeground}>
        <Path
          d="M19.4999 2C20.0945 1.99965 20.6988 2.15061 21.2499 2.46875C22.924 3.43525 23.4977 5.57598 22.5312 7.25L15.0312 20.2402C14.0647 21.9142 11.924 22.488 10.2499 21.5215C9.41368 21.0386 8.85171 20.2606 8.62005 19.3975L6.85345 12.8037L2.02533 7.97461C0.65837 6.60765 0.658729 4.39208 2.02533 3.02539C2.65755 2.39311 3.53385 2.00011 4.49994 2H19.4999ZM4.49994 4C4.08555 4.00011 3.71182 4.167 3.43939 4.43945C2.85354 5.0254 2.85378 5.97494 3.43939 6.56055L7.914 11.0352L14.8906 7.00684C15.3688 6.7308 15.9806 6.89487 16.2568 7.37305C16.5327 7.85124 16.3687 8.46312 15.8906 8.73926L8.914 12.7676L10.5517 18.8789C10.6515 19.2509 10.8913 19.5819 11.2499 19.7891C11.9673 20.2032 12.8845 19.9575 13.2988 19.2402L20.7988 6.25C21.213 5.53256 20.9674 4.61539 20.2499 4.20117C20.0128 4.06427 19.7555 3.99982 19.5009 4H4.49994Z"
        />
      </Svg>
    </View>
  );
}

function OneDayIcon({ size = 14.3 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: '#5248D4',
        borderRadius: 3,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <OneDayLogo width={size * 0.8} height={size * 0.8} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// SharePromotionCard Component
// ---------------------------------------------------------------------------

export function SharePromotionCard({ style }: SharePromotionCardProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[
        {
          width: '100%',
          paddingHorizontal: 16,
          paddingVertical: 13,
          backgroundColor: COLORS.background,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: COLORS.border,
          borderRadius: 16,
          gap: 3,
        },
        style,
      ]}
    >
      {/* Title */}
      <Text
        style={{
          fontFamily: 'Righteous',
          fontWeight: '400',
          fontSize: 13,
          lineHeight: 16,
          color: COLORS.textPrimary,
        }}
      >
        {t('sharePromotion.title')}
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontFamily: 'DMSans-Medium',
          fontSize: 9,
          lineHeight: 11,
          letterSpacing: -0.04 * 9,
          color: COLORS.textSecondary,
        }}
      >
        {t('sharePromotion.subtitle')}
      </Text>

      {/* Workflow Bar */}
      <View
        style={{
          marginTop: 3,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 4,
          paddingHorizontal: 10,
          gap: 7,
          backgroundColor: COLORS.workflowBar,
          borderRadius: 6,
        }}
      >
        {/* TikTok/Instagram icons */}
        <SocialIconsGroup />

        {/* Arrow */}
        <ArrowIcon />

        {/* Share section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ShareIcon />
          <Text
            style={{
              fontFamily: 'DMSans-Medium',
              fontSize: 9,
              lineHeight: 11,
              letterSpacing: -0.04 * 9,
              color: COLORS.textTertiary,
            }}
          >
            {t('sharePromotion.share')}
          </Text>
        </View>

        {/* Arrow */}
        <ArrowIcon />

        {/* OneDay section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <OneDayIcon />
          <Text
            style={{
              fontFamily: 'DMSans-Medium',
              fontSize: 9,
              lineHeight: 11,
              letterSpacing: -0.04 * 9,
              color: COLORS.textTertiary,
            }}
          >
            OneDay
          </Text>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Analyse auto badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 7,
            paddingVertical: 2,
            backgroundColor: COLORS.badgeBackground,
            borderRadius: 16,
            shadowColor: '#5C55AA',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.5,
            shadowRadius: 0.5,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans',
              fontSize: 7,
              lineHeight: 9,
              color: COLORS.badgeText,
            }}
          >
            {t('sharePromotion.autoAnalysis')}
          </Text>
        </View>
      </View>
    </View>
  );
}
