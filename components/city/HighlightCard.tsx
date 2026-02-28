/**
 * HighlightCard - Display a single highlight/POI with category icon
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, ActionSheetIOS, Platform, Alert } from 'react-native';
import {
  Utensils,
  Landmark,
  Trees,
  ShoppingBag,
  Moon,
  MapPin,
  Star,
  Navigation,
  Pencil,
  Trash2,
  X,
} from 'lucide-react-native';
import { Highlight, HighlightCategory, HIGHLIGHT_CATEGORIES } from '@/types/api';

const CATEGORY_ICONS: Record<HighlightCategory, React.ComponentType<any>> = {
  food: Utensils,
  culture: Landmark,
  nature: Trees,
  shopping: ShoppingBag,
  nightlife: Moon,
  other: MapPin,
};

const CATEGORY_COLORS: Record<HighlightCategory, string> = {
  food: '#f97316',
  culture: '#3b82f6',
  nature: '#22c55e',
  shopping: '#ec4899',
  nightlife: '#a855f7',
  other: '#71717a',
};

const PRICE_COLORS: Record<string, string> = {
  gratuit: '#4ade80',
  '€': '#4ade80',
  '€€': '#facc15',
  '€€€': '#f97316',
  '€€€€': '#ef4444',
};

interface HighlightCardProps {
  highlight: Highlight;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  editable?: boolean;
}

export function HighlightCard({ highlight, onPress, onEdit, onDelete, editable = false }: HighlightCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const category = highlight.category || 'other';
  const Icon = CATEGORY_ICONS[category];
  const color = CATEGORY_COLORS[category];
  const config = HIGHLIGHT_CATEGORIES[category];

  const openMaps = () => {
    const lat = highlight.latitude;
    const lng = highlight.longitude;
    const address = highlight.address;
    const label = encodeURIComponent(highlight.name);

    // Build URLs for each map app
    const getUrls = () => {
      if (lat && lng) {
        return {
          appleMaps: `maps://maps.apple.com/?q=${label}&ll=${lat},${lng}`,
          googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          waze: `waze://?ll=${lat},${lng}&navigate=yes`,
        };
      } else if (address) {
        const encodedAddress = encodeURIComponent(address);
        return {
          appleMaps: `maps://maps.apple.com/?q=${encodedAddress}`,
          googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
          waze: `waze://?q=${encodedAddress}`,
        };
      }
      return null;
    };

    const urls = getUrls();
    if (!urls) return;

    const openUrl = async (url: string, fallbackUrl?: string) => {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        Linking.openURL(url);
      } else if (fallbackUrl) {
        Linking.openURL(fallbackUrl);
      } else {
        Alert.alert('Erreur', "Impossible d'ouvrir l'application");
      }
    };

    const options = ['Apple Maps', 'Google Maps', 'Waze', 'Annuler'];
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Ouvrir avec',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openUrl(urls.appleMaps);
          } else if (buttonIndex === 1) {
            openUrl(urls.googleMaps);
          } else if (buttonIndex === 2) {
            // Waze app URL, fallback to web
            openUrl(urls.waze, `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
          }
        }
      );
    } else {
      // Android - use Alert as ActionSheet alternative
      Alert.alert('Ouvrir avec', undefined, [
        { text: 'Google Maps', onPress: () => openUrl(urls.googleMaps) },
        {
          text: 'Waze',
          onPress: () => openUrl(urls.waze, `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`),
        },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const hasLocation = highlight.latitude || highlight.address;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-zinc-900 rounded-xl p-4"
      style={{ borderWidth: 1, borderColor: '#27272a' }}
    >
      <View className="flex-row">
        {/* Category Icon */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${color}22` }}
        >
          <Icon size={20} color={color} />
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Header: Name + Must-see */}
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-semibold flex-1" numberOfLines={1}>
              {highlight.name}
            </Text>
            {highlight.is_must_see && (
              <View className="flex-row items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                <Star size={12} color="#facc15" fill="#facc15" />
                <Text className="text-yellow-400 text-xs">Must-see</Text>
              </View>
            )}
          </View>

          {/* Subtype badge */}
          {highlight.subtype && (
            <View className="flex-row mt-1">
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}22` }}
              >
                <Text style={{ color, fontSize: 11 }}>{highlight.subtype}</Text>
              </View>
            </View>
          )}

          {/* Description */}
          {highlight.description && (
            <Text className="text-zinc-400 text-sm mt-2" numberOfLines={2}>
              {highlight.description}
            </Text>
          )}

          {/* Meta row: Price + Address */}
          <View className="flex-row items-center gap-3 mt-2 flex-wrap">
            {highlight.price_range && (
              <Text
                className="text-sm font-medium"
                style={{ color: PRICE_COLORS[highlight.price_range] || '#71717a' }}
              >
                {highlight.price_range}
              </Text>
            )}
            {highlight.address && (
              <Text className="text-zinc-500 text-xs flex-1" numberOfLines={1}>
                {highlight.address}
              </Text>
            )}
          </View>

          {/* Tips */}
          {highlight.tips && (
            <Text className="text-blue-400 text-xs italic mt-2">
              {highlight.tips}
            </Text>
          )}
        </View>

        {/* Action buttons */}
        <View className="ml-2 items-center gap-1">
          {/* Navigation button */}
          {hasLocation && (
            <TouchableOpacity
              onPress={openMaps}
              className="p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Navigation size={18} color="#60a5fa" />
            </TouchableOpacity>
          )}

          {/* Edit/Delete buttons when editable */}
          {editable && (
            <>
              {onEdit && (
                <TouchableOpacity
                  onPress={onEdit}
                  className="p-2"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Pencil size={16} color="#71717a" />
                </TouchableOpacity>
              )}

              {onDelete && (
                confirmDelete ? (
                  <View className="flex-row items-center gap-1">
                    <TouchableOpacity
                      onPress={() => {
                        onDelete();
                        setConfirmDelete(false);
                      }}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      <Text style={{ fontSize: 10, color: '#fff' }}>Suppr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setConfirmDelete(false)} className="p-1">
                      <X size={12} color="#71717a" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setConfirmDelete(true)}
                    className="p-2"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color="#71717a" />
                  </TouchableOpacity>
                )
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export { CATEGORY_ICONS, CATEGORY_COLORS, PRICE_COLORS };
