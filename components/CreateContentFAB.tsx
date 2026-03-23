import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Text, TouchableOpacity, Keyboard, Modal, Animated as RNAnimated, Alert, StatusBar } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/Input';
import { createManualTrip } from '@/services/tripService';
import { createManualCity } from '@/services/cityService';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Icon from "react-native-remix-icon";

const TIMING_CONFIG = {
  duration: 300,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

interface CreateContentFABProps {
  onContentCreated?: () => void;
  onExpandChange?: (expanded: boolean) => void;
}

export function CreateContentFAB({ onContentCreated, onExpandChange }: CreateContentFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState<'trip' | 'city'>('trip');
  const expandProgress = useSharedValue(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!showModal && isExpanded) {
      setIsExpanded(false);
      onExpandChange?.(false);
      expandProgress.value = withTiming(0, TIMING_CONFIG);
    }
  }, [showModal]);

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandChange?.(next);
    expandProgress.value = withTiming(next ? 1 : 0, TIMING_CONFIG);
  };

  const handleCreateTrip = () => {
    setModalInitialStep('trip');
    setShowModal(true);
  };

  const handleCreateCity = () => {
    setModalInitialStep('city');
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleContentCreated = () => {
    onContentCreated?.();
    handleModalClose();
  };

  // Rotate + to X
  const iconRotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(expandProgress.value, [0, 1], [0, 45])}deg` },
    ],
  }));
  
  // Main FAB - scales down slightly when expanded
  const mainButtonStyle = useAnimatedStyle(() => {
    const scale = interpolate(expandProgress.value, [0, 0.7, 1], [1, 0.9, 1]);
    return {
      transform: [{ scale }],
    };
  });

  // Trip button - slides from FAB (right) to final position
  const tripButtonStyle = useAnimatedStyle(() => {
    const translateX = interpolate(expandProgress.value, [0, 1], [155, 0]);
    const scale = interpolate(expandProgress.value, [0, 0.7, 1], [0.1, 1.15, 1]);
    const opacity = expandProgress.value;

    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  // City button - slides from FAB (right) to final position
  const cityButtonStyle = useAnimatedStyle(() => {
    const translateX = interpolate(expandProgress.value, [0, 1], [75, 0]);
    const scale = interpolate(expandProgress.value, [0, 0.7, 1], [0.1, 1.15, 1]);
    const opacity = interpolate(expandProgress.value, [0, 0.2, 1], [0, 0, 1]);

    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  // Backdrop - fades in when expanded
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 1], [0, 0.5]),
    pointerEvents: isExpanded ? 'auto' : 'none',
  }));

  return (
    <>
      {/* Buttons container - rendered AFTER modal so they appear on top */}
      <View style={[styles.container, { top: insets.top + 20 }]}>
        {/* Trip button - hidden when modal is open */}
        {!showModal && (
          <Animated.View style={[styles.floatingButton, styles.tripButton, tripButtonStyle]}>
            <PrimaryButton
              title="Trip"
              size="iconSm"
              color="green"
              onPress={handleCreateTrip}
              style={{ height: 30, width: 70 }}
            />
          </Animated.View>
        )}

        {/* City button - hidden when modal is open */}
        {!showModal && (
          <Animated.View style={[styles.floatingButton, styles.cityButton, cityButtonStyle]}>
            <PrimaryButton
              title="City"
              size="iconSm"
              color="blue"
              onPress={handleCreateCity}
              style={{ height: 30, width: 70 }}
            />
          </Animated.View>
        )}

        {/* Main FAB */}
        <Animated.View style={mainButtonStyle}>
          <PrimaryButton size="iconSm" onPress={toggle} style={styles.mainButton} />
        </Animated.View>
        {/* Animated + icon that rotates to X */}
        <Animated.View style={[styles.iconContainer, iconRotateStyle]} pointerEvents="none">
          <Icon name="add-line" size={24} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Create Content Modal */}
      <Modal
        visible={showModal}
        animationType="none"
        transparent
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          {/* Visual backdrop - no touch capture */}
          <View style={styles.modalBackdrop} />
          {/* Sheet area with auto pointer events */}
          <View style={styles.modalSheetArea}>
            <CreateContentModalInner
              initialStep={modalInitialStep === 'city' ? 'city-name' : 'choose-trip-template'}
              onClose={handleModalClose}
              onContentCreated={handleContentCreated}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function CreateContentModalInner({ initialStep, onClose, onContentCreated }: { initialStep: string; onClose: () => void; onContentCreated: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [useTemplate, setUseTemplate] = useState(true);
  const [tripName, setTripName] = useState('');
  const [cityName, setCityName] = useState('');
  const [currentStep, setStep] = useState(initialStep);

  // Determine which tab is active based on current step
  const activeTab = currentStep === 'city-name' ? 'city' : 'trip';

  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const sheetTranslateY = useRef(new RNAnimated.Value(400)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      RNAnimated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    if (creating) return;
    Keyboard.dismiss();
    RNAnimated.parallel([
      RNAnimated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(sheetTranslateY, { toValue: 400, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleCreateTrip = async () => {
    if (!tripName.trim()) return;
    Keyboard.dismiss();
    setCreating(true);
    try {
      const result = await createManualTrip(tripName.trim(), useTemplate);
      onContentCreated();
      handleClose();
      setTimeout(() => {
        if (useTemplate) router.push(`/review/${result.trip_id}`);
        else router.push(`/trips/${result.trip_id}`);
      }, 300);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('createContent.errorCreating'));
      setCreating(false);
    }
  };

  const handleCreateCity = async () => {
    if (!cityName.trim()) return;
    Keyboard.dismiss();
    setCreating(true);
    try {
      const result = await createManualCity(cityName.trim());
      onContentCreated();
      handleClose();
      setTimeout(() => {
        router.push(`/trips/city/${result.city_id}`);
      }, 300);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('createContent.errorCreating'));
      setCreating(false);
    }
  };

  const isTripNameValid = tripName.trim().length > 0;
  const isCityNameValid = cityName.trim().length > 0;

  const renderTripName = () => (
    <View className="p-4 gap-4">
      <Text className="text-white/60 font-dmsans text-sm">{t('createContent.tripNameLabel')}</Text>
      <Input
        placeholder={t('createContent.tripNamePlaceholder')}
        value={tripName}
        onChangeText={setTripName}
        variant="dark"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreateTrip}
      />
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
      <Text className="text-white/60 font-dmsans text-sm">{t('createContent.cityNameLabel')}</Text>
      <Input
        placeholder={t('createContent.cityNamePlaceholder')}
        value={cityName}
        onChangeText={setCityName}
        variant="dark"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreateCity}
      />
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

  const renderChooseTripTemplate = () => (
    <View className="p-4 gap-3">
      <Text className="text-white/60 font-dmsans text-sm mb-2">{t('createContent.templateQuestion')}</Text>
      <TouchableOpacity
        onPress={() => { setUseTemplate(true); setStep('trip-name'); }}
        disabled={creating}
        className="flex-row items-center p-4 rounded-xl"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' }}
      >
        <View className="w-11 h-11 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(168,85,247,0.2)' }}>
          <Icon name="file-copy-line" size={22} color="#a855f7" />
        </View>
        <View className="flex-1">
          <Text className="title-righteous">{t('createContent.withTemplate')}</Text>
          <Text className="text-white/50 font-dmsans-medium text-xs mt-0.5">{t('createContent.withTemplateDescription')}</Text>
        </View>
        <Icon name="arrow-right-s-line" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { setUseTemplate(false); setStep('trip-name'); }}
        disabled={creating}
        className="flex-row items-center p-4 rounded-xl"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <View className="w-11 h-11 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}>
          <Icon name="file-add-line" size={22} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="title-righteous">{t('createContent.withoutTemplate')}</Text>
          <Text className="text-white/50 font-dmsans-medium text-xs mt-0.5">{t('createContent.withoutTemplateDescription')}</Text>
        </View>
        <Icon name="arrow-right-s-line" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  );

  const handleSwitchToTrip = () => {
    if (!creating) {
      setStep('choose-trip-template');
    }
  };

  const handleSwitchToCity = () => {
    if (!creating) {
      setStep('city-name');
    }
  };

  const handleBack = () => {
    if (!creating && currentStep === 'trip-name') {
      setStep('choose-trip-template');
    }
  };

  const showBackButton = currentStep === 'trip-name';

  return (
    <RNAnimated.View
      className="rounded-t-3xl"
      style={{
        backgroundColor: '#1e1a64',
        paddingBottom: insets.bottom + 16,
        transform: [{ translateY: sheetTranslateY }],
      }}
    >
      <View className="flex-row items-center justify-between p-4" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        {/* Left side: Back button + Tab buttons */}
        <View className="flex-row items-center gap-2">
          {/* Back button - only shown on trip-name step */}
          {showBackButton && (
            <TouchableOpacity onPress={handleBack} className="p-1 mr-1" disabled={creating}>
              <Icon name="arrow-left-s-line" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
          {/* Tab buttons - same as FAB buttons */}
          <PrimaryButton
            title="Trip"
            size="iconSm"
            color="green"
            active={activeTab === 'trip'}
            onPress={handleSwitchToTrip}
            disabled={creating}
            style={{ height: 30, width: 70 }}
          />
          <PrimaryButton
            title="City"
            size="iconSm"
            color="blue"
            active={activeTab === 'city'}
            onPress={handleSwitchToCity}
            disabled={creating}
            style={{ height: 30, width: 70 }}
          />
        </View>
        <TouchableOpacity onPress={handleClose} className="p-2" disabled={creating}>
          <Icon name="close-line" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>
      {currentStep === 'choose-trip-template' && renderChooseTripTemplate()}
      {currentStep === 'trip-name' && renderTripName()}
      {currentStep === 'city-name' && renderCityName()}
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 998,
  },
  container: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1001,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheetArea: {
    justifyContent: 'flex-end',
  },
  floatingButton: {
    position: 'absolute',
    zIndex: 1000,
  },
  tripButton: {
    right: 155, // immediately left of main FAB (51px button + 9px gap)
  },
  cityButton: {
    right: 75, // further left, next to trip button
  },
  mainButton: {
    zIndex: 1,
    width: 50
  },
  iconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    // Center on the main FAB button
    right: 0,
    width: 50,
    height: 50,
  },
});
