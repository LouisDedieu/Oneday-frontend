/**
 * AddCityToTripModal - Modal to add a city to a trip
 * Allows either importing an existing saved city or adding a new one via geocoding.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Search,
  MapPin,
  Plus,
  Calendar,
  Loader2,
  Building2,
  ChevronRight,
  BookMarked,
  PenLine,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { getUserSavedCities } from '@/services/cityService';
import { addCityToTrip, addDestinationToTrip, DbDay } from '@/services/reviewService';
import { CityData } from '@/types/api';

interface SavedCityItem {
  id: string;
  notes: string | null;
  created_at: string;
  cities: CityData | null;
}

interface NominatimResult {
  place_id: string;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    country_code?: string;
  };
}

interface AddCityToTripModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  tripDays: DbDay[];
  existingDestinations: string[]; // List of city names already in trip
  onCityAdded: () => void;
}

type Step = 'choose-mode' | 'select-city' | 'select-day' | 'manual-city';

function SpinningLoader({ size = 16, color = '#a855f7' }: { size?: number; color?: string }) {
  const rotation = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

export function AddCityToTripModal({
  visible,
  onClose,
  tripId,
  tripDays,
  existingDestinations,
  onCityAdded,
}: AddCityToTripModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Saved cities state
  const [cities, setCities] = useState<SavedCityItem[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  // Manual city state
  const [manualQuery, setManualQuery] = useState('');
  const [geoResults, setGeoResults] = useState<NominatimResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [step, setStep] = useState<Step>('choose-mode');
  const [adding, setAdding] = useState(false);

  // Load saved cities when entering select-city step
  useEffect(() => {
    if (visible && step === 'select-city' && user?.id) {
      setLoadingCities(true);
      getUserSavedCities(user.id, 1, 100)
        .then((res) => setCities(res.items))
        .catch(console.error)
        .finally(() => setLoadingCities(false));
    }
  }, [visible, step, user?.id]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedCity(null);
      setStep('choose-mode');
      setSearchQuery('');
      setManualQuery('');
      setGeoResults([]);
      setGeoError('');
    }
  }, [visible]);

  // ── Saved cities helpers ──────────────────────────────────────────────────

  const filteredCities = cities.filter((item) => {
    if (!item.cities) return false;
    const query = searchQuery.toLowerCase();
    return (
      item.cities.city_name?.toLowerCase().includes(query) ||
      item.cities.city_title?.toLowerCase().includes(query) ||
      item.cities.country?.toLowerCase().includes(query)
    );
  });

  const isCityInTrip = useCallback(
    (cityName: string) =>
      existingDestinations.some((dest) => dest.toLowerCase() === cityName.toLowerCase()),
    [existingDestinations]
  );

  const getDaysForCity = useCallback(
    (cityName: string) =>
      tripDays.filter((day) => day.location?.toLowerCase() === cityName.toLowerCase()),
    [tripDays]
  );

  // ── Geocoding (Nominatim) ─────────────────────────────────────────────────

  const searchCity = async () => {
    const q = manualQuery.trim();
    if (!q) return;
    setGeoLoading(true);
    setGeoError('');
    setGeoResults([]);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&featuretype=city`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'fr,en', 'User-Agent': 'BomboApp/1.0' },
      });
      if (!res.ok) throw new Error('Geocoding error');
      const data: NominatimResult[] = await res.json();
      if (data.length === 0) {
        setGeoError('Aucun résultat. Essayez un nom différent.');
      }
      setGeoResults(data);
    } catch {
      setGeoError('Impossible de rechercher. Vérifiez votre connexion.');
    } finally {
      setGeoLoading(false);
    }
  };

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleSelectCity = (city: CityData) => {
    setSelectedCity(city);
    if (isCityInTrip(city.city_name)) {
      setStep('select-day');
    } else {
      handleAddSavedCity(city.id, undefined, true);
    }
  };

  const handleAddSavedCity = async (
    cityId: string,
    dayId?: string,
    createNewDay = false
  ) => {
    setAdding(true);
    try {
      const result = await addCityToTrip(tripId, {
        city_id: cityId,
        day_id: dayId,
        create_new_day: createNewDay,
      });
      Alert.alert(
        'Ajouté !',
        `${result.spots_count} point${result.spots_count > 1 ? 's' : ''} ajouté${result.spots_count > 1 ? 's' : ''} à ${result.city_name}`,
        [{ text: 'OK', onPress: onClose }]
      );
      onCityAdded();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Impossible d'ajouter la ville");
    } finally {
      setAdding(false);
    }
  };

  const handleAddManualCity = async (geoResult: NominatimResult) => {
    setAdding(true);
    try {
      const addr = geoResult.address || {};
      const cityName = addr.city || addr.town || addr.village || geoResult.name;
      const country = addr.country;
      const latitude = parseFloat(geoResult.lat);
      const longitude = parseFloat(geoResult.lon);

      await addDestinationToTrip(tripId, { city_name: cityName, country, latitude, longitude });

      Alert.alert(
        'Ajouté !',
        `${cityName} a été ajouté à votre itinéraire avec un jour vide.`,
        [{ text: 'OK', onPress: onClose }]
      );
      onCityAdded();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Impossible d'ajouter la ville");
    } finally {
      setAdding(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderChooseMode = () => (
    <View className="p-4 gap-3">
      <Text className="text-zinc-400 text-sm mb-2">
        Comment souhaitez-vous ajouter une ville ?
      </Text>

      <TouchableOpacity
        onPress={() => setStep('select-city')}
        className="flex-row items-center p-4 rounded-xl"
        style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: '#a855f733' }}
        >
          <BookMarked size={22} color="#a855f7" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold">Importer une ville sauvegardée</Text>
          <Text className="text-zinc-500 text-xs mt-0.5">
            Depuis vos City Guides existants
          </Text>
        </View>
        <ChevronRight size={18} color="#71717a" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setStep('manual-city')}
        className="flex-row items-center p-4 rounded-xl"
        style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: '#3b82f633' }}
        >
          <PenLine size={22} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold">Ajouter une nouvelle ville</Text>
          <Text className="text-zinc-500 text-xs mt-0.5">
            Saisir un nom et localiser sur la carte
          </Text>
        </View>
        <ChevronRight size={18} color="#71717a" />
      </TouchableOpacity>
    </View>
  );

  const renderSavedCities = () => (
    <>
      {/* Search */}
      <View className="px-4 py-3">
        <View
          className="flex-row items-center rounded-lg px-3 py-2"
          style={{ backgroundColor: '#27272a' }}
        >
          <Search size={18} color="#71717a" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher une ville..."
            placeholderTextColor="#52525b"
            className="flex-1 ml-2 text-white"
          />
        </View>
      </View>

      {loadingCities ? (
        <View className="flex-1 items-center justify-center py-12">
          <SpinningLoader size={32} color="#a855f7" />
        </View>
      ) : filteredCities.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12 px-4">
          <Building2 size={48} color="#52525b" />
          <Text className="text-zinc-500 text-center mt-4">
            {searchQuery ? 'Aucune ville trouvée' : 'Aucune ville sauvegardée'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (!item.cities) return null;
            const city = item.cities;
            const alreadyInTrip = isCityInTrip(city.city_name);
            const highlightsCount = city.city_highlights?.length || 0;
            return (
              <TouchableOpacity
                onPress={() => handleSelectCity(city)}
                className="flex-row items-center p-3 rounded-xl mb-2"
                style={{
                  backgroundColor: '#27272a',
                  borderWidth: 1,
                  borderColor: alreadyInTrip ? '#a855f74D' : '#3f3f46',
                }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: '#a855f733' }}
                >
                  <Building2 size={20} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">{city.city_title || city.city_name}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <MapPin size={12} color="#71717a" />
                    <Text className="text-zinc-500 text-xs">
                      {city.city_name}, {city.country}
                    </Text>
                    <Text className="text-zinc-600 text-xs">•</Text>
                    <Text className="text-zinc-500 text-xs">{highlightsCount} points</Text>
                  </View>
                  {alreadyInTrip && (
                    <Text className="text-purple-400 text-xs mt-1">Déjà dans cet itinéraire</Text>
                  )}
                </View>
                <ChevronRight size={20} color="#71717a" />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </>
  );

  const renderDaySelection = () => {
    if (!selectedCity) return null;
    const existingDays = getDaysForCity(selectedCity.city_name);
    return (
      <View className="flex-1 p-4">
        <Text className="text-white text-lg font-bold mb-2">
          {selectedCity.city_name} existe déjà
        </Text>
        <Text className="text-zinc-400 text-sm mb-4">
          Ajouter les points à un jour existant ou créer un nouveau jour ?
        </Text>

        {existingDays.map((day) => (
          <TouchableOpacity
            key={day.id}
            onPress={() => handleAddSavedCity(selectedCity.id, day.id, false)}
            disabled={adding}
            className="flex-row items-center p-3 rounded-xl mb-2"
            style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: '#3b82f633' }}
            >
              <Calendar size={20} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">Jour {day.day_number}</Text>
              <Text className="text-zinc-500 text-xs">
                {day.theme || day.location} • {day.spots.length} spots
              </Text>
            </View>
            {adding ? <SpinningLoader size={18} color="#3b82f6" /> : <Plus size={20} color="#3b82f6" />}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => handleAddSavedCity(selectedCity.id, undefined, true)}
          disabled={adding}
          className="flex-row items-center p-3 rounded-xl"
          style={{ backgroundColor: '#a855f71A', borderWidth: 1, borderColor: '#a855f74D' }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: '#a855f733' }}
          >
            <Plus size={20} color="#a855f7" />
          </View>
          <View className="flex-1">
            <Text className="text-purple-400 font-medium">Créer un nouveau jour</Text>
            <Text className="text-purple-500 text-xs">
              Jour {tripDays.length + 1} - {selectedCity.city_name}
            </Text>
          </View>
          {adding && <SpinningLoader size={18} color="#a855f7" />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setSelectedCity(null); setStep('select-city'); }}
          className="mt-4 py-3 items-center"
        >
          <Text className="text-zinc-400">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderManualCity = () => (
    <>
      {/* Search — même style que renderSavedCities */}
      <View className="px-4 py-3">
        <View
          className="flex-row items-center rounded-lg px-3 py-2"
          style={{ backgroundColor: '#27272a' }}
        >
          <Search size={18} color="#71717a" />
          <TextInput
            value={manualQuery}
            onChangeText={setManualQuery}
            onSubmitEditing={searchCity}
            placeholder="Ex: Kyoto, Tokyo, Lisbonne..."
            placeholderTextColor="#52525b"
            returnKeyType="search"
            autoFocus
            className="flex-1 ml-2 text-white"
          />
          {geoLoading
            ? <SpinningLoader size={18} color="#71717a" />
            : manualQuery.trim().length > 0 && (
                <TouchableOpacity onPress={searchCity} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text className="text-blue-400 font-medium text-sm ml-2">Chercher</Text>
                </TouchableOpacity>
              )
          }
        </View>
      </View>

      {/* États — même logique que renderSavedCities */}
      {geoLoading ? (
        <View className="flex-1 items-center justify-center py-12">
          <SpinningLoader size={32} color="#3b82f6" />
        </View>
      ) : !!geoError ? (
        <View className="flex-1 items-center justify-center py-12 px-4">
          <MapPin size={48} color="#52525b" />
          <Text className="text-zinc-500 text-center mt-4">{geoError}</Text>
        </View>
      ) : geoResults.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12 px-4">
          <MapPin size={48} color="#52525b" />
          <Text className="text-zinc-500 text-center mt-4">
            {manualQuery.trim()
              ? 'Aucun résultat. Essayez un nom différent.'
              : 'Saisissez un nom de ville pour rechercher'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={geoResults}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => {
            const addr = item.address || {};
            const cityLabel = addr.city || addr.town || addr.village || item.name;
            const country = addr.country || '';
            return (
              <TouchableOpacity
                onPress={() => handleAddManualCity(item)}
                disabled={adding}
                className="flex-row items-center p-3 rounded-xl mb-2"
                style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: '#3b82f633' }}
                >
                  {adding
                    ? <SpinningLoader size={18} color="#3b82f6" />
                    : <MapPin size={20} color="#3b82f6" />
                  }
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">{cityLabel}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-zinc-500 text-xs">{country}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#71717a" />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </>
  );

  // ── Title by step ─────────────────────────────────────────────────────────

  const stepTitle: Record<Step, string> = {
    'choose-mode': 'Ajouter une ville',
    'select-city': 'Mes City Guides',
    'select-day': 'Choisir un jour',
    'manual-city': 'Nouvelle ville',
  };

  const backStep: Partial<Record<Step, Step>> = {
    'select-city': 'choose-mode',
    'manual-city': 'choose-mode',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View
          className="bg-zinc-900 rounded-t-3xl"
          style={{ maxHeight: '80%', paddingBottom: insets.bottom + 16 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-zinc-800">
            <View className="flex-row items-center gap-2">
              {backStep[step] && (
                <TouchableOpacity
                  onPress={() => setStep(backStep[step]!)}
                  className="pr-2"
                >
                  <Text className="text-zinc-400 text-sm">← Retour</Text>
                </TouchableOpacity>
              )}
              <Text className="text-lg font-bold text-white">{stepTitle[step]}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color="#71717a" />
            </TouchableOpacity>
          </View>

          {step === 'choose-mode' && renderChooseMode()}
          {step === 'select-city' && renderSavedCities()}
          {step === 'select-day' && renderDaySelection()}
          {step === 'manual-city' && renderManualCity()}
        </View>
      </View>
    </Modal>
  );
}
