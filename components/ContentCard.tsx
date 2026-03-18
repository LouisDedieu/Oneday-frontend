import React from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pill } from './Pill';
import { TripDayChip, type CategoryType } from './TripDayChip';

// ---------------------------------------------------------------------------
// Border Gradient Colors
// ---------------------------------------------------------------------------

const BORDER_GRADIENT = {
  colors: ['rgba(156, 159, 191, 0.5)', 'rgba(73, 82, 102, 0.5)', 'rgba(156, 159, 191, 0.5)'] as const,
  locations: [0, 0.5, 1] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DayData {
  dayNumber: number;
  count: number;
}

interface CategoryData {
  category: CategoryType;
  count: number;
}

interface TripCardProps {
  variant: 'trip';
  title: string;
  daysCount?: number;
  spotsCount?: number;
  season?: string;
  days?: DayData[];
  style?: StyleProp<ViewStyle>;
}

interface CityCardProps {
  variant: 'city';
  title: string;
  highlightsCount?: number;
  country?: string;
  countryFlag?: string;
  categories?: CategoryData[];
  style?: StyleProp<ViewStyle>;
}

export type ContentCardProps = TripCardProps | CityCardProps;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const CARD_BG = '#363276';
const TITLE_COLOR = '#FFFFFF';
const SUBTITLE_COLOR = 'rgba(255, 255, 255, 0.59)';

// Pill colors
const TRIP_PILL_BG = '#656E57';
const TRIP_PILL_TEXT = '#201A63';
const CITY_PILL_BG = '#336CA0';
const CITY_PILL_TEXT = '#201A63';

// ---------------------------------------------------------------------------
// ContentCard Component
// ---------------------------------------------------------------------------

export function ContentCard(props: ContentCardProps) {
  const { t } = useTranslation();
  const { variant, title, style } = props;

  const isTrip = variant === 'trip';
  const borderWidth = 1;

  // Build subtitle text
  let subtitle = '';
  if (isTrip) {
    const parts: string[] = [];
    if (props.daysCount) parts.push(`${props.daysCount} ${t('contentCard.days')}`);
    if (props.spotsCount) parts.push(`${props.spotsCount} ${t('contentCard.spots')}`);
    if (props.season) parts.push(props.season);
    subtitle = parts.join(' · ');
  } else {
    const parts: string[] = [];
    if (props.highlightsCount) parts.push(`${props.highlightsCount} ${t('contentCard.highlights')}`);
    if (props.country) parts.push(`${props.country}${props.countryFlag ? ` ${props.countryFlag}` : ''}`);
    subtitle = parts.join(' · ');
  }

  // Get chips arrays
  const chips = isTrip ? (props.days ?? []) : (props.categories ?? []);
  const hasChips = chips.length > 0;

  // Pill configuration
  const pillLabel = isTrip ? t('contentCard.trip') : t('contentCard.city');
  const pillBg = isTrip ? TRIP_PILL_BG : CITY_PILL_BG;
  const pillText = isTrip ? TRIP_PILL_TEXT : CITY_PILL_TEXT;

  return (
    <LinearGradient
      colors={[...BORDER_GRADIENT.colors]}
      locations={[...BORDER_GRADIENT.locations]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        {
          borderRadius: 16,
          padding: borderWidth,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingVertical: 10,
          paddingHorizontal: 12,
          gap: 13,
          backgroundColor: CARD_BG,
          borderRadius: 16 - borderWidth,
        }}
      >
        {/* Header row with title info and pill */}
        <View className="flex-row justify-between items-start w-full">
          {/* Title and subtitle */}
          <View style={{ gap: 6, flex: 1 }}>
            <Text
              style={{
                fontFamily: 'Righteous',
                fontSize: 14,
                lineHeight: 17,
                color: TITLE_COLOR,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans',
                fontSize: 10,
                lineHeight: 13,
                color: SUBTITLE_COLOR,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>

          {/* Pill */}
          <Pill
            label={pillLabel}
            backgroundColor={pillBg}
            textColor={pillText}
          />
        </View>

        {/* Chips row */}
        {hasChips && (
          <View className="flex-row flex-wrap" style={{ gap: 6 }}>
            {isTrip
              ? (
                  <>
                    {(props.days ?? []).slice(0, 6).map((day) => (
                      <TripDayChip
                        key={day.dayNumber}
                        variant="day"
                        dayNumber={day.dayNumber}
                        count={day.count}
                      />
                    ))}
                    {(props.days ?? []).length > 6 && (
                      <TripDayChip
                        variant="moreDays"
                        daysCount={(props.days ?? []).length - 6}
                      />
                    )}
                  </>
                )
              : (props.categories ?? []).map((cat) => (
                  <TripDayChip
                    key={cat.category}
                    variant="category"
                    category={cat.category}
                    count={cat.count}
                  />
                ))}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}
