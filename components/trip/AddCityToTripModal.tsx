/**
 * AddCityToTripModal - Modal to add a city to a trip
 * Allows either importing an existing saved city or adding a new one via geocoding.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  Keyboard,
  TouchableWithoutFeedback, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';
import { useAuth } from '@/context/AuthContext';
import { getUserSavedCities } from '@/services/cityService';
import { addCityToTrip, addDestinationToTrip, DbDay } from '@/services/reviewService';
import { CityData } from '@/types/api';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import Loader from '@/components/Loader';
import {Input} from "@/components/Input";

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
  existingDestinations: string[];
  onCityAdded: () => void;
}

type Step = 'choose-mode' | 'select-city' | 'select-day' | 'manual-city';

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
  const { t } = useTranslation();

  const [cities, setCities] = useState<SavedCityItem[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  const [manualQuery, setManualQuery] = useState('');
  const [geoResults, setGeoResults] = useState<NominatimResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [step, setStep] = useState<Step>('choose-mode');
  const [adding, setAdding] = useState(false);

  // Animation
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(600)).current;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // fermeture gérée par handleClose
    }
  }, [visible]);

  useEffect(() => {
    if (visible && step === 'select-city' && user?.id) {
      setLoadingCities(true);
      getUserSavedCities(user.id, 1, 100)
        .then((res) => setCities(res.items))
        .catch(console.error)
        .finally(() => setLoadingCities(false));
    }
  }, [visible, step, user?.id]);

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

  const filteredCities = cities.filter((item) => {
    if (!item.cities) return false;
    const query = searchQuery.toLowerCase();
    const cityName = item.cities.city_name || '';
    const cityTitle = item.cities.city_title || '';
    const country = item.cities.country || '';
    return (
      cityName.toLowerCase().includes(query) ||
      cityTitle.toLowerCase().includes(query) ||
      country.toLowerCase().includes(query)
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
        setGeoError(t('addCityToTrip.noResults'));
      }
      setGeoResults(data);
    } catch {
      setGeoError(t('addCityToTrip.geoError'));
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSelectCity = (city: CityData) => {
    setSelectedCity(city);
    if (city.city_name && isCityInTrip(city.city_name)) {
      setStep('select-day');
    } else if (city.id) {
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
        t('addCityToTrip.added'),
        t('addCityToTrip.pointsAdded', { count: result.spots_count, plural: result.spots_count > 1 ? 's' : '', city: result.city_name }),
        [{ text: t('common.ok'), onPress: handleClose }]
      );
      onCityAdded();
    } catch (err: any) {
      Alert.alert(t('addCityToTrip.error'), err.message || t('addCityToTrip.cannotAddCity'));
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
        t('addCityToTrip.added'),
        t('addCityToTrip.addedToItinerary', { city: cityName }),
        [{ text: t('common.ok'), onPress: handleClose }]
      );
      onCityAdded();
    } catch (err: any) {
      Alert.alert(t('addCityToTrip.error'), err.message || t('addCityToTrip.cannotAddCity'));
    } finally {
      setAdding(false);
    }
  };

  const renderChooseMode = () => (
    <View className="p-4 gap-3">
      <Text className="text-white/60 font-dmsans text-sm mb-2">
        {t('addCityToTrip.howToAdd')}
      </Text>

      <TouchableOpacity
        onPress={() => setStep('select-city')}
        className="flex-row items-center p-4 rounded-xl"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: 'rgba(168,85,247,0.2)' }}
        >
          <Icon name="book-marked-line" size={22} color="#a855f7" />
        </View>
        <View className="flex-1">
          <Text className="title-righteous">{t('addCityToTrip.importSavedCity')}</Text>
          <Text className="text-white/50 font-dmsans-medium text-xs mt-0.5">
            {t('addCityToTrip.fromExistingGuides')}
          </Text>
        </View>
        <Icon name="arrow-right-s-line" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setStep('manual-city')}
        className="flex-row items-center p-4 rounded-xl"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}
        >
          <Icon name="pencil-line" size={22} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="title-righteous">{t('addCityToTrip.addNewCity')}</Text>
          <Text className="text-white/50 font-dmsans-medium text-xs mt-0.5">
            {t('addCityToTrip.enterNameAndLocate')}
          </Text>
        </View>
        <Icon name="arrow-right-s-line" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  );

  const renderSavedCities = () => (
    <>
      <View className="px-4 py-3">
        <Input
          leftIcon="search-line"
          placeholder={t('addCityToTrip.searchCity')}
          variant={'dark'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loadingCities ? (
        <View className="flex-1 items-center justify-center mt-10" style={{ marginBottom: insets.bottom}}>
          <Loader size={40} />
        </View>
      ) : filteredCities.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12 px-4" style={{ marginBottom: insets.bottom}}>
          <Icon name="building-4-line" size={48} color="rgba(255,255,255,0.3)" />
          <Text className="text-white/50 font-dmsans-semibold text-center mt-4">
            {searchQuery ? t('addCityToTrip.noCityFound') : t('addCityToTrip.noCitySaved')}
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
              <View
                className="flex-row items-center p-3 rounded-xl mb-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderColor: alreadyInTrip ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)',
                }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                >
                  <Icon name="building-line" size={20} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <Text className="title-righteous">{city.city_title || city.city_name}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Icon name="map-pin-line" size={12} color="rgba(255,255,255,0.5)" />
                    <Text className="text-white/50 font-dmsans text-xs">
                      {city.city_name}, {city.country}
                    </Text>
                    <Text className="text-white/30 font-dmsans text-xs">•</Text>
                    <Text className="text-white/50 font-dmsans text-xs">{highlightsCount} {t('addCityToTrip.points')}</Text>
                  </View>
                  {alreadyInTrip && (
                    <Text className="text-purple-400 font-dmsans-medium text-xs mt-1">{t('addCityToTrip.alreadyInItinerary')}</Text>
                  )}
                </View>
                <PrimaryButton
                  title={t('addCityToTrip.add')}
                  onPress={() => handleSelectCity(city)}
                  disabled={adding || alreadyInTrip || !city.id}
                  size={"sm"}
                  color={'purple'}
                />
              </View>
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
          {selectedCity.city_name} {t('addCityToTrip.alreadyExists')}
        </Text>
        <Text className="text-white/60 text-sm mb-4">
          {t('addCityToTrip.addToExistingOrNew')}
        </Text>

        {existingDays.map((day) => (
          <TouchableOpacity
            key={day.id}
            onPress={() => selectedCity.id && handleAddSavedCity(selectedCity.id, day.id, false)}
            disabled={adding || !selectedCity.id}
            className="flex-row items-center p-3 rounded-xl mb-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}
            >
              {adding ? (
                <Loader size={20} color="#3b82f6" />
              ) : (
                <Icon name="calendar-line" size={20} color="#3b82f6" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-white font-medium">{t('addCityToTrip.jour', { number: day.day_number })}</Text>
              <Text className="text-white/50 text-xs">
                {day.theme || day.location} • {day.spots.length} {t('addCityToTrip.spots')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => selectedCity.id && handleAddSavedCity(selectedCity.id, undefined, true)}
          disabled={adding || !selectedCity.id}
          className="flex-row items-center p-3 rounded-xl"
          style={{ backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: 'rgba(168,85,247,0.2)' }}
          >
            <Icon name="add-line" size={20} color="#a855f7" />
          </View>
          <View className="flex-1">
            <Text className="text-purple-400 font-medium">{t('addCityToTrip.createNewDay')}</Text>
            <Text className="text-purple-500 text-xs">
              {t('addCityToTrip.jour', { number: tripDays.length + 1 })} - {selectedCity.city_name}
            </Text>
          </View>
          {adding && <Loader size={18} color="#a855f7" />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setSelectedCity(null); setStep('select-city'); }}
          className="mt-4 py-3 items-center"
        >
          <Text className="text-white/60">{t('addCityToTrip.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderManualCity = () => (
    <>
      <View className="px-4 py-3">
        <Input
          leftIcon="search-line"
          placeholder={t('addCityToTrip.enterCityName')}
          variant={'dark'}
          value={manualQuery}
          onChangeText={setManualQuery}
          onSubmitEditing={searchCity}
          returnKeyType="search"
        />
      </View>

      {geoLoading ? (
        <View className="flex-1 items-center justify-center mt-10" style={{ marginBottom: insets.bottom}}>
          <Loader size={40} />
        </View>
      ) : !!geoError ? (
        <View className="flex-1 items-center justify-center py-12 px-4" style={{ marginBottom: insets.bottom}}>
          <Icon name="map-pin-line" size={48} color="rgba(255,255,255,0.3)" />
          <Text className="text-white/50 text-center mt-4">{geoError}</Text>
        </View>
      ) : geoResults.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12 px-4" style={{ marginBottom: insets.bottom}}>
          <Icon name="map-pin-line" size={48} color="rgba(255,255,255,0.3)" />
          <Text className="text-white/50 text-center mt-4">
            {manualQuery.trim()
              ? t('addCityToTrip.noGeoResults')
              : t('addCityToTrip.enterCityName')}
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
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                >
                  {adding ? (
                    <Loader size={18} color="#3b82f6" />
                  ) : (
                    <Icon name="map-pin-fill" size={24} color="#3b82f6" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="title-righteous">{cityLabel}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-white/50 font-dmsans-medium text-xs">{country}</Text>
                  </View>
                </View>
                <PrimaryButton
                  title={t('addCityToTrip.addNew')}
                  onPress={() => handleAddManualCity(item)}
                  disabled={adding}
                  size={"sm"}
                  color={'accent'}
                />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </>
  );

  const stepTitle: Record<Step, string> = {
    'choose-mode': t('addCityToTrip.addCity'),
    'select-city': t('addCityToTrip.selectCity'),
    'select-day': t('addCityToTrip.chooseDay'),
    'manual-city': t('addCityToTrip.newCity'),
  };

  const backStep: Partial<Record<Step, Step>> = {
    'select-city': 'choose-mode',
    'manual-city': 'choose-mode',
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropOpacity }}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              className="rounded-t-3xl"
              style={{
                backgroundColor: '#1e1a64',
                maxHeight: '80%',
                paddingBottom: insets.bottom + 16,
                transform: [{ translateY: sheetTranslateY }],
              }}
            >
              <View className="flex-row items-center justify-between p-4" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <View className="row-center">
                  {backStep[step] && (
                    <TouchableOpacity
                      onPress={() => setStep(backStep[step]!)}
                      className="p-2"
                    >
                      <Icon name={"arrow-left-s-line"} size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <Text className="text-lg font-righteous text-white">{stepTitle[step]}</Text>
                </View>
                <TouchableOpacity onPress={handleClose} className="p-2">
                  <Icon name="close-line" size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>

              {step === 'choose-mode' && renderChooseMode()}
              {step === 'select-city' && renderSavedCities()}
              {step === 'select-day' && renderDaySelection()}
              {step === 'manual-city' && renderManualCity()}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}