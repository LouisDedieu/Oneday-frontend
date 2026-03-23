/**
 * CreateContentModal - Bottom sheet to create manual trip or city
 * Allows users to create a new trip (with or without template) or city guide
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Icon from 'react-native-remix-icon';
import { createManualTrip } from '@/services/tripService';
import { createManualCity } from '@/services/cityService';
import { Input } from '@/components/Input';
import { PrimaryButton } from '@/components/PrimaryButton';

interface CreateContentModalProps {
  visible: boolean;
  onClose: () => void;
  onContentCreated?: () => void;
  /** Initial step when modal opens ('trip' skips choose-type, 'city' skips to city-name) */
  initialStep?: 'trip' | 'city';
}

type Step = 'choose-type' | 'choose-trip-template' | 'trip-name' | 'city-name';

export function CreateContentModal({
  visible,
  onClose,
  onContentCreated,
  initialStep,
}: CreateContentModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();

  const getInitialStep = (): Step => {
    if (initialStep === 'city') return 'city-name';
    if (initialStep === 'trip') return 'choose-trip-template';
    return 'choose-type';
  };

  const [step, setStep] = useState<Step>(getInitialStep());
  const [creating, setCreating] = useState(false);
  const [useTemplate, setUseTemplate] = useState(true);

  // Form state
  const [tripName, setTripName] = useState('');
  const [cityName, setCityName] = useState('');

  // Reset step when modal opens with new initialStep
  useEffect(() => {
    if (visible) {
      setStep(getInitialStep());
    }
  }, [visible, initialStep]);

  // Animation
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  const handleClose = () => {
    if (creating) return;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 400,
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
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  useEffect(() => {
    if (!visible) {
      setStep(getInitialStep());
      setCreating(false);
      setUseTemplate(true);
      setTripName('');
      setCityName('');
    }
  }, [visible]);

  const handleSelectTripTemplate = (withTemplate: boolean) => {
    setUseTemplate(withTemplate);
    setStep('trip-name');
  };

  const handleCreateTrip = async () => {
    Keyboard.dismiss();
    setCreating(true);
    try {
      const result = await createManualTrip(tripName.trim(), useTemplate);
      onContentCreated?.();
      handleClose();
      setTimeout(() => {
        if (useTemplate) {
          router.push(`/review/${result.trip_id}`);
        } else {
          router.push(`/trips/${result.trip_id}`);
        }
      }, 300);
    } catch (err: any) {
      Alert.alert(
        t('common.error'),
        err.message || t('createContent.errorCreating')
      );
      setCreating(false);
    }
  };

  const handleCreateCity = async () => {
    Keyboard.dismiss();
    setCreating(true);
    try {
      const result = await createManualCity(cityName.trim());
      onContentCreated?.();
      handleClose();
      setTimeout(() => {
        router.push(`/trips/city/${result.city_id}`);
      }, 300);
    } catch (err: any) {
      Alert.alert(
        t('common.error'),
        err.message || t('createContent.errorCreating')
      );
      setCreating(false);
    }
  };

  const isTripNameValid = tripName.trim().length > 0;
  const isCityNameValid = cityName.trim().length > 0;

  const renderChooseType = () => (
    <View className="p-4 gap-3">
      {/* Create Trip Option */}
      <TouchableOpacity
        onPress={() => setStep('choose-trip-template')}
        disabled={creating}
        className="flex-row items-center p-4 rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: 'rgba(168,85,247,0.2)' }}
        >
          <Icon name="signpost-line" size={22} color="#a855f7" />
        </View>
        <View className="flex-1">
          <Text className="title-righteous">{t('createContent.tripOption')}</Text>
          <Text className="text-white/50 font-dmsans-medium text-xs mt-0.5">
            {t('createContent.tripDescription')}
          </Text>
        </View>
        <Icon name="arrow-right-s-line" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      {/* Create City Option */}
      <TouchableOpacity
        onPress={() => setStep('city-name')}
        disabled={creating}
        className="flex-row items-center p-4 rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}
        >
          <Icon name="building-line" size={22} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="title-righteous">{t('createContent.cityOption')}</Text>
          <Text className="text-white/50 font-dmsans-medium text-xs mt-0.5">
            {t('createContent.cityDescription')}
          </Text>
        </View>
        <Icon name="arrow-right-s-line" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  );

  const renderChooseTripTemplate = () => (
    <View className="p-4 gap-3">
      <Text className="text-white/60 font-dmsans text-sm mb-2">
        {t('createContent.templateQuestion')}
      </Text>

      {/* With Template Option */}
      <TouchableOpacity
        onPress={() => handleSelectTripTemplate(true)}
        disabled={creating}
        className="flex-row items-center p-4 rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.3)',
        }}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: 'rgba(168,85,247,0.2)' }}
        >
          <Icon name="file-copy-line" size={22} color="#a855f7" />
        </View>
        <View className="flex-1">
          <Text className="title-righteous">{t('createContent.withTemplate')}</Text>
          <Text className="text-white/50 font-dmsans-medium text-xs mt-0.5">
            {t('createContent.withTemplateDescription')}
          </Text>
        </View>
        <Icon name="arrow-right-s-line" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      {/* Without Template Option */}
      <TouchableOpacity
        onPress={() => handleSelectTripTemplate(false)}
        disabled={creating}
        className="flex-row items-center p-4 rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}
        >
          <Icon name="file-add-line" size={22} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="title-righteous">{t('createContent.withoutTemplate')}</Text>
          <Text className="text-white/50 font-dmsans-medium text-xs mt-0.5">
            {t('createContent.withoutTemplateDescription')}
          </Text>
        </View>
        <Icon name="arrow-right-s-line" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  );

  const renderTripName = () => (
    <View className="p-4 gap-4">
      <Text className="text-white/60 font-dmsans text-sm">
        {t('createContent.tripNameLabel')}
      </Text>

      <Input
        placeholder={t('createContent.tripNamePlaceholder')}
        value={tripName}
        onChangeText={setTripName}
        variant="dark"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreateTrip}
      />

      {/* Create Button */}
      <PrimaryButton
        title={t('createContent.createTrip')}
        leftIcon="add-line"
        color="green"
        onPress={handleCreateTrip}
        disabled={creating || !isTripNameValid}
        loading={creating}
        fullWidth
        className="mt-2"
      />

      <Text className="text-white/30 text-center text-xs font-dmsans">
        {useTemplate ? t('createContent.willUseTemplate') : t('createContent.willBeEmpty')}
      </Text>
    </View>
  );

  const renderCityName = () => (
    <View className="p-4 gap-4">
      <Text className="text-white/60 font-dmsans text-sm">
        {t('createContent.cityNameLabel')}
      </Text>

      <Input
        placeholder={t('createContent.cityNamePlaceholder')}
        value={cityName}
        onChangeText={setCityName}
        variant="dark"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreateCity}
      />

      {/* Create Button */}
      <PrimaryButton
        title={t('createContent.createCity')}
        leftIcon="add-line"
        color="blue"
        onPress={handleCreateCity}
        disabled={creating || !isCityNameValid}
        loading={creating}
        fullWidth
        className="mt-2"
      />
    </View>
  );

  const stepTitles: Record<Step, string> = {
    'choose-type': t('createContent.title'),
    'choose-trip-template': t('createContent.tripOption'),
    'trip-name': t('createContent.tripOption'),
    'city-name': t('createContent.cityOption'),
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <Animated.View
        className="flex-1 justify-end"
        pointerEvents="box-none"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropOpacity, zIndex: 1000 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View
            className="rounded-t-3xl"
            style={{
              backgroundColor: '#1e1a64',
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: sheetTranslateY }],
              zIndex: 1001,
            }}
          >
              {/* Header */}
              <View
                className="flex-row items-center justify-between p-4"
                style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
              >
                <Text className="text-lg font-righteous text-white">
                  {stepTitles[step]}
                </Text>
                <TouchableOpacity onPress={handleClose} className="p-2" disabled={creating}>
                  <Icon name="close-line" size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              {step === 'choose-type' && renderChooseType()}
              {step === 'choose-trip-template' && renderChooseTripTemplate()}
              {step === 'trip-name' && renderTripName()}
              {step === 'city-name' && renderCityName()}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
    </Modal>
  );
}
