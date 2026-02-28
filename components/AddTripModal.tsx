/**
 * components/AddTripModal.tsx — React Native / Expo (NativeWind)
 *
 * Parité fonctionnelle avec la version React :
 * - useUserId() + useAuth() pour l'utilisateur connecté
 * - Passage de l'user_id à analyze()
 * - Affichage de l'email dans l'en-tête
 * - Variantes de statut SSE (pending → downloading → analyzing → done → error)
 * - Barre de progression animée
 * - Fermeture propre (reset URL + erreur)
 */

import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  User,
  Wand2,
  Map,
  MapPin,
} from 'lucide-react-native';
import { Button } from './Button';
import { useVideoAnalysis } from '@/services/analysisService';
import { useAuth, useUserId } from '@/context/AuthContext';
import { EntityType } from '@/types/api';
import Toast from 'react-native-toast-message';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending:     'En attente...',
  downloading: 'Téléchargement de la vidéo...',
  analyzing:   'Analyse par IA en cours...',
  done:        'Finalisation...',
  error:       'Erreur',
};

const validateUrl = (value: string) =>
  /tiktok\.com/i.test(value) || /instagram\.com\/reel/i.test(value);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddTripModalProps {
  isOpen:  boolean;
  onClose: () => void;
  onAnalysisStarted?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Entity type options for the selector
type EntityTypeOption = 'auto' | 'trip' | 'city';

const ENTITY_TYPE_OPTIONS: Array<{
  value: EntityTypeOption;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}> = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Detection automatique',
    icon: Wand2,
    color: '#a855f7', // purple
  },
  {
    value: 'trip',
    label: 'Voyage',
    description: 'Itineraire jour par jour',
    icon: Map,
    color: '#3b82f6', // blue
  },
  {
    value: 'city',
    label: 'Ville',
    description: 'Guide de ville / POIs',
    icon: MapPin,
    color: '#a855f7', // purple
  },
];

export default function AddTripModal({ isOpen, onClose, onAnalysisStarted }: AddTripModalProps) {
  const router = useRouter();

  const [url,             setUrl]             = useState('');
  const [validationError, setValidationError] = useState('');
  const [entityType,      setEntityType]      = useState<EntityTypeOption>('auto');

  const userId     = useUserId();
  const { user }   = useAuth();

  const {
    analyze,
    isAnalyzing,
    progress,
    status,
    error: analysisError,
    result,
  } = useVideoAnalysis();

  // Animated width for the progress bar (0 → 1)
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue:         progress / 100,
      duration:        300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  /**
   * Quand l'analyse est terminée, afficher un toast de succès.
   * L'utilisateur peut ensuite cliquer sur l'analyse dans l'inbox.
   */
  useEffect(() => {
    if (!result) return;

    if (result.trip_id) {
      Toast.show({ type: 'success', text1: 'Itinéraire extrait avec succès !' });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Analyse terminée (affichage local)',
      });
    }
  }, [result]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setValidationError('');

    if (!url.trim()) {
      setValidationError('Veuillez saisir une URL');
      return;
    }
    if (!validateUrl(url)) {
      setValidationError('URL invalide. Utilisez un lien TikTok ou Instagram Reel');
      return;
    }
    if (!userId) {
      setValidationError('Vous devez être connecté pour analyser une vidéo');
      Toast.show({ type: 'error', text1: 'Utilisateur non connecté' });
      return;
    }

    try {
      // Convert 'auto' to undefined for the API
      const entityTypeOverride: EntityType | undefined =
        entityType === 'auto' ? undefined : entityType;

      analyze(url, userId, false, entityTypeOverride);
      // Fermer le modal et rafraîchir l'inbox après un court délai
      // pour laisser le temps au job d'être créé côté backend
      setTimeout(() => {
        onClose();
        onAnalysisStarted?.();
      }, 500);
    } catch (err: any) {
      console.error("Erreur d'analyse:", err);
    }
  };

  const handleClose = () => {
    setUrl('');
    setValidationError('');
    setEntityType('auto');
    onClose();
  };

  const displayError = validationError || analysisError || '';
  const isDisabled   = isAnalyzing || !url.trim() || !userId;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1 items-center justify-center bg-black/80 px-4"
        onPress={handleClose}
      >
        {/* Card — stopPropagation so inner taps don't close */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="w-full max-w-md"
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden w-full">

              {/* ── Header ────────────────────────────────────────────────── */}
              <View className="flex-row items-center justify-between p-6 border-b border-zinc-800">
                <View className="flex-row items-center gap-3">
                  {/* Gradient avatar — LinearGradient alternative via bg + opacity trick */}
                  <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center">
                    <Sparkles size={20} color="#ffffff" />
                  </View>
                  <View>
                    <Text className="text-xl font-bold text-white">Analyser une vidéo</Text>
                    <Text className="text-sm text-zinc-400">TikTok ou Instagram Reel</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={handleClose} className="p-2">
                  <X size={20} color="#a1a1aa" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="pb-2"
              >

                {/* ── Formulaire ────────────────────────────────────────── */}
                <View className="p-6 gap-4">

                  {/* URL input */}
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-zinc-300">
                      URL de la vidéo
                    </Text>
                    <View className="relative flex-row items-center bg-zinc-800 border border-zinc-700 rounded-lg">
                      <View className="absolute left-3 z-10">
                        <LinkIcon size={20} color="#71717a" />
                      </View>
                      <TextInput
                        value={url}
                        onChangeText={v => { setUrl(v); setValidationError(''); }}
                        placeholder="https://www.tiktok.com/@user/video/..."
                        placeholderTextColor="#52525b"
                        keyboardType="url"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isAnalyzing}
                        className="flex-1 text-white text-sm py-3 pl-10 pr-3"
                      />
                    </View>
                  </View>

                  {/* Entity type selector */}
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-zinc-300">
                      Type de contenu
                    </Text>
                    <View className="flex-row gap-2">
                      {ENTITY_TYPE_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isSelected = entityType === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() => setEntityType(option.value)}
                            disabled={isAnalyzing}
                            className="flex-1 rounded-lg p-3"
                            style={{
                              backgroundColor: isSelected ? `${option.color}22` : '#27272a',
                              borderWidth: 1,
                              borderColor: isSelected ? `${option.color}66` : '#3f3f46',
                              opacity: isAnalyzing ? 0.5 : 1,
                            }}
                          >
                            <View className="items-center gap-1.5">
                              <Icon
                                size={20}
                                color={isSelected ? option.color : '#71717a'}
                              />
                              <Text
                                className="text-xs font-medium"
                                style={{ color: isSelected ? option.color : '#a1a1aa' }}
                              >
                                {option.label}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text className="text-xs text-zinc-500">
                      {ENTITY_TYPE_OPTIONS.find(o => o.value === entityType)?.description}
                    </Text>
                  </View>

                  {/* Error */}
                  {!!displayError && (
                    <View className="flex-row items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle size={20} color="#f87171" className="shrink-0 mt-0.5" />
                      <Text className="text-sm text-red-300 flex-1">{displayError}</Text>
                    </View>
                  )}

                  {/* Progress */}
                  {isAnalyzing && (
                    <View className="gap-3">
                      <View className="flex-row items-center gap-3">
                        <ActivityIndicator size="small" color="#60a5fa" />
                        <View className="flex-1">
                          <Text className="text-sm text-white font-medium">
                            {STATUS_LABELS[status] ?? 'Traitement en cours...'}
                          </Text>
                          <Text className="text-xs text-zinc-400 mt-1">
                            {Math.round(progress)}%
                          </Text>
                        </View>
                      </View>

                      {/* Animated progress bar */}
                      <View className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <Animated.View
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: progressAnim.interpolate({
                              inputRange:  [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Tips */}
                  <View className="bg-zinc-800/50 rounded-lg p-4 gap-2">
                    <Text className="text-xs text-zinc-400">
                      💡{' '}
                      <Text className="font-semibold text-zinc-300">Conseil :</Text>
                      {' '}Les vidéos courtes (&lt;60s) donnent de meilleurs résultats
                    </Text>
                    <Text className="text-xs text-zinc-400">
                      ⏱ L'analyse prend 2–4 minutes selon la durée de la vidéo
                    </Text>
                    <Text className="text-xs text-zinc-400">
                      💾 Le voyage sera sauvegardé automatiquement dans votre compte
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="gap-2 pt-2">
                    <View className="flex-row gap-3">
                      <Button
                        variant="outline"
                        onPress={handleClose}
                        className="flex-1 border-zinc-700"
                        textClassName="text-zinc-300"
                        title="Annuler"
                      />
                      <Button
                        onPress={handleSubmit}
                        disabled={isDisabled}
                        className="flex-1 bg-blue-600"
                      >
                        {isAnalyzing ? (
                          <View className="flex-row items-center gap-2">
                            <ActivityIndicator size="small" color="#ffffff" />
                            <Text className="text-white text-sm font-semibold">Analyse...</Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-2">
                            <Sparkles size={16} color="#ffffff" />
                            <Text className="text-white text-sm font-semibold">Analyser</Text>
                          </View>
                        )}
                      </Button>
                    </View>
                  </View>

                </View>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}