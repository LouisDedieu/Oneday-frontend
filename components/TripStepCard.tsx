import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';
import { PrimaryButton } from './PrimaryButton';

// ---------------------------------------------------------------------------
// Animation Constants
// ---------------------------------------------------------------------------

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

const TIMING_CONFIG = {
  duration: 300,
  easing: Easing.bezier(0.8, 0, 0.7, 1),
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategoryType = 'food' | 'culture' | 'nightlife' | 'shopping' | 'nature' | 'beach' | 'other';

interface CategoryCount {
  category: CategoryType;
  count: number;
}

export interface DayData {
  dayNumber: number;
  spotName: string;
  duration: string;
  categories: CategoryCount[];
}

export interface TripStepCardProps {
  stepNumber: number;
  cityName: string;
  daysCount: number;
  spotsCount: number;
  days: DayData[];
  defaultExpanded?: boolean;
  /** When true, the card expands automatically (for map → list interaction) */
  isHighlighted?: boolean;
  onViewDetails?: () => void;
  onExpand?: (cityName: string | null) => void; // null = collapsed
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Category Configuration
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<CategoryType, string> = {
  food: '#ff6b35',
  culture: '#4da6ff',
  nature: '#4cca52',
  shopping: '#d855e8',
  nightlife: '#8b5cf6',
  beach: '#22d3ee',
  other: '#8C92B5',
};

const CATEGORY_ICONS: Record<CategoryType, string> = {
  food: 'restaurant-line',
  culture: 'ancient-gate-line',
  nature: 'leaf-line',
  shopping: 'shopping-bag-line',
  nightlife: 'moon-line',
  beach: 'sun-line',
  other: 'map-pin-line',
};

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const CARD_BG = 'rgba(30, 26, 100, 0.55)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.09)';
const MAIN_COLOR = '#3529C1';
const ACCENT_COLOR = '#6c9dff';
const TEXT_DIM = 'rgba(255, 255, 255, 0.45)';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.22)';

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function StepNumber({ number }: { number: number }) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: MAIN_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Righteous',
          fontSize: 11,
          color: '#FFFFFF',
        }}
      >
        {number}
      </Text>
    </View>
  );
}

function CategoryBar({ categories, maxTotal }: { categories: CategoryCount[]; maxTotal: number }) {
  const total = categories.reduce((sum, c) => sum + c.count, 0);
  const widthPercent = (total / maxTotal) * 100;

  return (
    <View
      style={{
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 6,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          height: '100%',
          width: `${widthPercent}%`,
          gap: 2,
        }}
      >
        {categories.map((cat, index) => (
          <View
            key={index}
            style={{
              flex: cat.count,
              height: '100%',
              backgroundColor: CATEGORY_COLORS[cat.category],
              borderRadius: 6,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function CategoryLegend({ categories }: { categories: CategoryCount[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      {categories.map((cat, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Icon
            name={CATEGORY_ICONS[cat.category]}
            size={10}
            color={CATEGORY_COLORS[cat.category]}
          />
          <Text
            style={{
              fontFamily: 'Righteous',
              fontSize: 9,
              color: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            {cat.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DayRow({ day, maxTotal, t }: { day: DayData; maxTotal: number; t: (key: string, options?: Record<string, any>) => string }) {
  return (
    <View
      style={{
        flexDirection: 'column',
        gap: 6,
        padding: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Top row: day number, spot name, duration */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            fontFamily: 'Righteous',
            fontSize: 10,
            color: ACCENT_COLOR,
            minWidth: 20,
          }}
        >
          {t('tripStepCard.dayShort', { number: day.dayNumber })}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans',
            fontSize: 12,
            fontWeight: '500',
            color: 'rgba(255, 255, 255, 0.82)',
            flex: 1,
          }}
          numberOfLines={1}
        >
          {day.spotName}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans',
            fontSize: 10,
            color: TEXT_MUTED,
          }}
        >
          {day.duration}
        </Text>
      </View>

      {/* Bottom row: category bar + legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <CategoryBar categories={day.categories} maxTotal={maxTotal} />
        <CategoryLegend categories={day.categories} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animated Day Row Component
// ---------------------------------------------------------------------------

function AnimatedDayRow({
                          day,
                          maxTotal,
                          index,
                          expandProgress,
                          t,
                        }: {
  day: DayData;
  maxTotal: number;
  index: number;
  expandProgress: Animated.SharedValue<number>;
  t: (key: string, options?: Record<string, any>) => string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    // Staggered animation based on index
    const delay = index * 0.1;
    const progress = interpolate(
      expandProgress.value,
      [delay, delay + 0.4],
      [0, 1],
      'clamp'
    );

    return {
      opacity: progress,
      transform: [
        { translateY: interpolate(progress, [0, 1], [15, 0]) },
        { scale: interpolate(progress, [0, 1], [0.95, 1]) },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <DayRow day={day} maxTotal={maxTotal} t={t} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// TripStepCard Component
// ---------------------------------------------------------------------------

export function TripStepCard({
                               stepNumber,
                               cityName,
                               daysCount,
                               spotsCount,
                               days,
                               defaultExpanded = false,
                               isHighlighted = false,
                               onViewDetails,
                               onExpand,
                               style,
                             }: TripStepCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Auto-expand when highlighted (map → list interaction)
  useEffect(() => {
    if (isHighlighted && !expanded) {
      setExpanded(true);
      onExpand?.(cityName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHighlighted]);

  // Calculate max total spots for bar normalization
  const maxTotal = Math.max(...days.map((d) => d.categories.reduce((sum, c) => sum + c.count, 0)));

  // Animation values
  const expandProgress = useSharedValue(defaultExpanded ? 1 : 0);
  const chevronRotation = useSharedValue(defaultExpanded ? 180 : 0);

  useEffect(() => {
    expandProgress.value = withTiming(expanded ? 1 : 0, TIMING_CONFIG);
    chevronRotation.value = withSpring(expanded ? 180 : 0, SPRING_CONFIG);
  }, [expanded]);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    onExpand?.(next ? cityName : null);
  };

  // Animated styles
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: expandProgress.value,
      maxHeight: interpolate(expandProgress.value, [0, 1], [0, 500]),
      transform: [
        { translateY: interpolate(expandProgress.value, [0, 1], [-20, 0]) },
      ],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const delay = days.length * 0.1;
    const progress = interpolate(
      expandProgress.value,
      [delay, delay + 0.3],
      [0, 1],
      'clamp'
    );

    return {
      opacity: progress,
      transform: [
        { translateY: interpolate(progress, [0, 1], [10, 0]) },
      ],
    };
  });

  const chevronAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${chevronRotation.value}deg` }],
    };
  });

  return (
    <View
      style={[
        {
          backgroundColor: CARD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: 16,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Header */}
      <Pressable
        onPress={toggleExpanded}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 12,
          paddingHorizontal: 14,
        }}
      >
        <StepNumber number={stepNumber} />

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'Righteous',
              fontSize: 14,
              color: '#FFFFFF',
            }}
            numberOfLines={1}
          >
            {cityName}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans',
              fontSize: 11,
              color: TEXT_DIM,
              marginTop: 2,
            }}
          >
            {t('tripStepCard.daysSpots', { days: daysCount, spots: spotsCount })}
          </Text>
        </View>

        <Animated.View style={chevronAnimatedStyle}>
          <PrimaryButton
            leftIcon="arrow-down-s-line"
            color="accent"
            size="iconSm"
            onPress={toggleExpanded}
            style={{ aspectRatio: 1, opacity: expanded ? 0.5 : 1 }}
          />
        </Animated.View>
      </Pressable>

      {/* Expandable content */}
      <Animated.View
        style={[
          {
            paddingHorizontal: 14,
            paddingLeft: 48,
            overflow: 'hidden',
          },
          contentAnimatedStyle,
        ]}
      >
        <View style={{ gap: 7, paddingBottom: 14 }}>
          {days.map((day, index) => (
            <AnimatedDayRow
              key={index}
              day={day}
              maxTotal={maxTotal}
              index={index}
              expandProgress={expandProgress}
              t={t}
            />
          ))}

          {/* View details button */}
          {onViewDetails && (
            <Animated.View style={buttonAnimatedStyle}>
              <PrimaryButton
                title={t('tripStepCard.viewDetails')}
                showArrow
                color="accent"
                size="sm"
                fullWidth
                onPress={onViewDetails}
                style={{ marginTop: 7 }}
              />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}