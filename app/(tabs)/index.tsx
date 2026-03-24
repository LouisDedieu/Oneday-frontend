/**
 * pages/Inbox.tsx
 *
 * Affiche :
 *  - Empty state (cas actuel implémenté)
 *  - Les jobs en cours d'analyse (pending / downloading / analyzing)
 *  - Les voyages terminés mais pas encore validés (done, absent de user_saved_trips)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-remix-icon';
import { useTranslation } from 'react-i18next';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Input } from '@/components/Input';
import { SharePromotionCard } from '@/components/SharePromotionCard';
import { JobCard } from '@/components/JobCard';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import { useAnalysis } from '@/context/AnalysisContext';

import {
  type InboxJob,
  fetchInboxJobs,
  deleteInboxJob,
  startAnalysis,
  createOptimisticJob,
  mergeWithOptimisticJobs,
  mapJobToCardProps,
  isValidUrl,
  isJobInProgress,
} from '@/services/inboxService';
import { markNotificationsReadByEntity } from '@/services/notificationService';

import { colors } from '@/constants/colors';

// ── Empty State Component ─────────────────────────────────────────────────────

interface EmptyStateProps {
  onAnalysisStarted: (url: string) => void;
  isSubmitting: boolean;
}

function EmptyState({ onAnalysisStarted, isSubmitting }: EmptyStateProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState('');

  const handleAnalyze = () => {
    if (!videoUrl.trim()) return;
    onAnalysisStarted(videoUrl.trim());
    setVideoUrl('');
  };

  const isValidInput = isValidUrl(videoUrl);

  return (
    <ImageBackground
      source={require('@/assets/images/bg-gradient.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Title */}
        <View className="mb-4">
          <Text className="font-righteous text-hero text-text-primary">
            {t('inbox.transformVideo')}
          </Text>
          <View className="flex-row">
            <Text
              className="font-righteous text-hero text-accent"
              style={{
                textShadowColor: colors.shadowDark,
                textShadowOffset: { width: 0, height: 4 },
                textShadowRadius: 4,
              }}
            >
              {`${t('inbox.video')}`}
            </Text>
            <Text className="font-righteous text-hero text-text-primary">
              {` ${t('inbox.intoItinerary')}`}
            </Text>
          </View>
        </View>

        {/* Subtitle */}
        <Text className="font-dmsans-medium text-body text-text-secondary mb-10">
          {t('inbox.linkSubtitle')}
        </Text>

        {/* Input */}
        <Input
          leftIcon="link"
          placeholder={t('inbox.pasteLinkHere')}
          variant="dark"
          value={videoUrl}
          onChangeText={setVideoUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isSubmitting}
          style={{ marginBottom: 16 }}
        />

        {/* Primary Button */}
        <PrimaryButton
          title={t('inbox.analyzeVideo')}
          showArrow
          fullWidth
          onPress={handleAnalyze}
          disabled={!isValidInput}
          loading={isSubmitting}
          style={{ marginBottom: 60 }}
        />

        {/* Share Promotion Card */}
        <SharePromotionCard style={{ marginBottom: 15 }} />

        {/* Social Links */}
        <View className="flex-row items-center justify-center gap-6">
          <TouchableOpacity className="row-center" activeOpacity={0.7}>
            <Icon name="tiktok-fill" color={colors.social} size={17} />
            <Text className="font-dmsans-medium text-micro text-social">{t('inbox.tiktok')}</Text>
          </TouchableOpacity>

          <View className="w-px h-4.5 bg-divider" />

          <TouchableOpacity className="row-center" activeOpacity={0.7}>
            <Icon name="instagram-line" color={colors.social} size={17} />
            <Text className="font-dmsans-medium text-micro text-social">{t('inbox.instagramReels')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

// ── Loading State Component ───────────────────────────────────────────────────

function LoadingState() {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require('@/assets/images/bg-gradient.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <View
        className="flex-1 justify-center items-center"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Loader />
      </View>
    </ImageBackground>
  );
}

// ── Inbox Job Card Wrapper ────────────────────────────────────────────────────

interface InboxJobCardProps {
  job: InboxJob;
  onPress: () => void;
  onDelete: () => void;
  animIndex: number;
}

function InboxJobCard({ job, onPress, onDelete, animIndex }: InboxJobCardProps) {
  const isNavigable = job.status === 'done' && (job.tripId || job.cityId);
  const isDeletable = (job.status === 'done' || job.status === 'error') && (job.tripId || job.cityId);
  const isInteractive = isNavigable || isDeletable;
  const cardProps = mapJobToCardProps(job);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: animIndex * 40,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        delay: animIndex * 40,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    if (isNavigable) {
      onPress();
    }
  };

  const handleLongPress = () => {
    if (isDeletable) {
      onDelete();
    }
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={!isInteractive}
        activeOpacity={isNavigable ? 0.8 : 1}
      >
        <JobCard
          status={cardProps.status}
          title={job.title}
          subtitle={cardProps.subtitle}
          url={job.sourceUrl}
          contentType={job.contentType}
          imageCount={job.imageCount}
          pillLabel={cardProps.pillLabel}
          pillBackgroundColor={cardProps.pillBackgroundColor}
          pillTextColor={cardProps.pillTextColor}
          cardBackgroundColor={cardProps.cardBackgroundColor}
          iconLabel={cardProps.iconLabel}
          iconLabelBackgroundColor={cardProps.iconLabelBackgroundColor}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Jobs List Component ───────────────────────────────────────────────────────

interface JobsListProps {
  jobs: InboxJob[];
  onAnalysisStarted: (url: string) => void;
  onDeleteJob: (job: InboxJob) => void;
  onJobPress: (job: InboxJob) => void;
  onRefresh: () => void;
  isSubmitting: boolean;
  isRefreshing: boolean;
}

function JobsList({
                    jobs,
                    onAnalysisStarted,
                    onDeleteJob,
                    onJobPress,
                    onRefresh,
                    isSubmitting,
                    isRefreshing,
                  }: JobsListProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState('');

  const handleAnalyze = () => {
    if (!videoUrl.trim()) return;
    onAnalysisStarted(videoUrl.trim());
    setVideoUrl('');
  };

  const isValidInput = isValidUrl(videoUrl);

  const renderHeader = () => (
    <View className="mb-4">
      {/* Main Title */}
      <View className="flex-row flex-wrap mb-4">
        <Text className="section-title">
          {t('inbox.transformVideo')}
        </Text>
        <Text
          className="section-title-accent"
          style={{
            textShadowColor: colors.shadowDark,
            textShadowOffset: { width: 0, height: 4 },
            textShadowRadius: 4,
          }}
        >
          {` ${t('inbox.video')}`}
        </Text>
        <Text className="section-title">
          {` ${t('inbox.intoItinerary')}`}
        </Text>
      </View>

      {/* Input + Button Row */}
      <View className="flex-row items-center gap-3 mb-5">
        <Input
          leftIcon="link"
          placeholder={t('inbox.newLink')}
          variant="dark"
          value={videoUrl}
          onChangeText={setVideoUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isSubmitting}
          style={{ flex: 1 }}
        />
        <PrimaryButton
          leftIcon="add-line"
          size="default"
          onPress={handleAnalyze}
          disabled={!isValidInput}
          loading={isSubmitting}
          style={{ aspectRatio: 1 }}
        />
      </View>

      <SharePromotionCard style={{ marginBottom: 32 }} />

      {/* Section Title */}
      <View className="flex-row gap-2">
        <Text className="section-title">
          {t('inbox.allYour')}
        </Text>
        <Text
          className="section-title-accent"
          style={{
            textShadowColor: colors.shadowDark,
            textShadowOffset: { width: 0, height: 4 },
            textShadowRadius: 4,
          }}
        >
          {`${t('inbox.analyses')}`}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <Text className="font-dmsans text-tiny text-text-subtle text-center mt-3 pb-5">
      {t('inbox.completedAnalysesDisappear')}
    </Text>
  );

  return (
    <ImageBackground
      source={require('@/assets/images/bg-gradient.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.jobId}
        renderItem={({ item, index }) => (
          <InboxJobCard
            job={item}
            onPress={() => onJobPress(item)}
            onDelete={() => onDeleteJob(item)}
            animIndex={index}
          />
        )}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 120,
        }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.textPrimary}
            progressViewOffset={insets.top}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </ImageBackground>
  );
}

// ── Error State Component ─────────────────────────────────────────────────────

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <ImageBackground
      source={require('@/assets/images/bg-gradient.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <View
        className="flex-1 justify-center items-center px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View className="w-16 h-16 rounded-full bg-error-bg justify-center items-center mb-4">
          <Icon name="error-warning-line" size={32} color={colors.error} />
        </View>
        <Text className="font-dmsans-medium text-body text-text-primary text-center mb-2">
          {t('inbox.whoops')}
        </Text>
        <Text className="font-dmsans text-small text-text-muted text-center mb-6">
          {error}
        </Text>
        <PrimaryButton
          title={t('common.retry')}
          leftIcon="refresh-line"
          onPress={onRetry}
        />
      </View>
    </ImageBackground>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InboxPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { registerHandler, unregisterHandler } = useAnalysis();
  const [jobs, setJobs] = useState<InboxJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load jobs from API
  const loadJobs = useCallback(async (showLoader = true) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const fetched = await fetchInboxJobs();
      setJobs((prev) => mergeWithOptimisticJobs(prev, fetched));
    } catch (err: any) {
      console.error('Failed to load jobs:', err);
      setError(t('inbox.unableToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, t]);

  // Load on mount
  useEffect(() => {
    loadJobs(true);
  }, [loadJobs]);

  // Reload on tab focus
  useFocusEffect(
    useCallback(() => {
      loadJobs(false);
    }, [loadJobs])
  );

  // Poll every 15s if jobs are in progress
  const inProgressCount = jobs.filter((j) => isJobInProgress(j.status)).length;

  useEffect(() => {
    if (inProgressCount === 0) return;
    const interval = setInterval(() => loadJobs(false), 15_000);
    return () => clearInterval(interval);
  }, [inProgressCount, loadJobs]);

  // Start analysis
  const handleAnalysisStarted = useCallback(async (url: string) => {
    if (!user?.id) return;

    setIsSubmitting(true);

    const optimisticJob = createOptimisticJob(url);
    setJobs((prev) => [optimisticJob, ...prev]);

    try {
      await startAnalysis(url, user.id);
      await loadJobs(false);

      // Envoyer une notification locale au lieu d'une Alert
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('inbox.analysisStarted'),
          body: t('inbox.videoBeingAnalyzed'),
          data: { type: 'analysis_started' },
        },
        trigger: null, // Notification immédiate
      });
    } catch (err: any) {
      console.error('Failed to start analysis:', err);
      setJobs((prev) => prev.filter((j) => j.jobId !== optimisticJob.jobId));

      Alert.alert(
        t('inbox.error'),
        err.message || t('inbox.cannotStartAnalysis'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, loadJobs, t]);

  // Register / unregister handler so the TabBar can trigger analysis from anywhere
  useEffect(() => {
    registerHandler(handleAnalysisStarted);
    return () => unregisterHandler();
  }, [handleAnalysisStarted, registerHandler, unregisterHandler]);

  // Delete job
  const handleDeleteJob = (job: InboxJob) => {
    Alert.alert(
      t('inbox.deleteAnalysis'),
      t('inbox.allDataAssociatedWillBeDeleted', { title: job.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInboxJob(job.jobId);
              setJobs((prev) => prev.filter((j) => j.jobId !== job.jobId));
              // Marquer les notifications liées comme lues
              const entityId = job.cityId || job.tripId;
              if (entityId) {
                markNotificationsReadByEntity(job.entityType, entityId);
              }
            } catch (err) {
              Alert.alert(t('inbox.error'), t('inbox.cannotDelete'));
            }
          },
        },
      ]
    );
  };

  // Navigate to review
  const handleJobPress = (job: InboxJob) => {
    if (job.status !== 'done') return;

    // Marquer les notifications liées comme lues
    const entityId = job.cityId || job.tripId;
    if (entityId) {
      markNotificationsReadByEntity(job.entityType, entityId);
    }

    if (job.entityType === 'city' && job.cityId) {
      router.push(`/review/city/${job.cityId}`);
    } else if (job.tripId) {
      router.push(`/review/${job.tripId}`);
    }
  };

  // Case 1: Initial loading
  if (loading && jobs.length === 0) {
    return <LoadingState />;
  }

  // Case 2: Error (no jobs)
  if (error && jobs.length === 0) {
    return <ErrorState error={error} onRetry={() => loadJobs(true)} />;
  }

  // Case 3: Jobs list
  if (jobs.length > 0) {
    return (
      <JobsList
        jobs={jobs}
        onAnalysisStarted={handleAnalysisStarted}
        onDeleteJob={handleDeleteJob}
        onJobPress={handleJobPress}
        onRefresh={() => loadJobs(false)}
        isSubmitting={isSubmitting}
        isRefreshing={refreshing}
      />
    );
  }

  // Case 4: Empty state (default)
  return (
    <EmptyState
      onAnalysisStarted={handleAnalysisStarted}
      isSubmitting={isSubmitting}
    />
  );
}