import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { close, Text, View, type InitialProps } from 'expo-share-extension';
import * as SecureStore from 'expo-secure-store';

const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000';

type Phase = 'init' | 'select' | 'loading' | 'success' | 'error' | 'unsupported';
type EntityTypeOption = 'auto' | 'trip' | 'city';

const SUPPORTED_HOSTS = [
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'instagram.com',
  'vimeo.com',
];

const ENTITY_TYPE_OPTIONS: Array<{
  value: EntityTypeOption;
  label: string;
  description: string;
  icon: string;
  color: string;
}> = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Detection automatique',
    icon: '✨',
    color: '#a855f7',
  },
  {
    value: 'trip',
    label: 'Voyage',
    description: 'Itineraire jour par jour',
    icon: '🗺️',
    color: '#3b82f6',
  },
  {
    value: 'city',
    label: 'Ville',
    description: 'Guide de ville / POIs',
    icon: '📍',
    color: '#a855f7',
  },
];

function isSupportedUrl(url: string): boolean {
  // Use regex as fallback since URL constructor may not work in share extension
  const isSupported = SUPPORTED_HOSTS.some((host) => url.includes(host));
  console.log('[ShareExtension] URL check:', url, 'isSupported:', isSupported);
  return isSupported;
}

// Extract URL from text (TikTok/Instagram sometimes share as text)
function extractUrl(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : undefined;
}

export default function ShareScreen(props: InitialProps) {
  const [phase, setPhase] = useState<Phase>('init');
  const [entityType, setEntityType] = useState<EntityTypeOption>('auto');
  const [hasCheckedUrl, setHasCheckedUrl] = useState(false);

  // Try to get URL from either 'url' prop or extract from 'text' prop
  const sharedUrl = useMemo(() => {
    const directUrl = props.url;
    const textUrl = extractUrl(props.text);
    console.log('[ShareExtension] props:', JSON.stringify(props));
    console.log('[ShareExtension] directUrl:', directUrl);
    console.log('[ShareExtension] textUrl:', textUrl);
    return directUrl || textUrl;
  }, [props.url, props.text]);

  // Wait a bit for props to load, then check URL validity
  useEffect(() => {
    if (hasCheckedUrl) return;

    const timer = setTimeout(() => {
      console.log('[ShareExtension] Checking URL after delay...');
      console.log('[ShareExtension] sharedUrl:', sharedUrl);
      console.log('[ShareExtension] isSupportedUrl:', sharedUrl ? isSupportedUrl(sharedUrl) : false);

      setHasCheckedUrl(true);

      if (!sharedUrl || !isSupportedUrl(sharedUrl)) {
        setPhase('unsupported');
        setTimeout(() => close(), 2000);
      } else {
        setPhase('select');
      }
    }, 500); // Wait 500ms for props to be available

    return () => clearTimeout(timer);
  }, [sharedUrl, hasCheckedUrl]);

  const handleAnalyze = async () => {
    setPhase('loading');

    try {
      const jwt = await SecureStore.getItemAsync('supabase_jwt', {
        accessGroup: 'group.com.anonymous.BomboMobile.shared',
      });

      // Extract user_id from JWT payload (sub claim) instead of reading separately
      let userId: string | null = null;
      if (jwt) {
        try {
          const payload = jwt.split('.')[1];
          const decoded = JSON.parse(atob(payload));
          userId = decoded.sub || null;
        } catch (e) {
          console.log('[ShareExtension] Failed to decode JWT:', e);
        }
      }

      console.log('[ShareExtension] jwt exists:', !!jwt, 'userId:', userId);

      if (!jwt) {
        console.log('[ShareExtension] No JWT found - user not logged in');
        setPhase('error');
        setTimeout(() => close(), 1500);
        return;
      }

      const entityTypeOverride = entityType === 'auto' ? undefined : entityType;

      const response = await fetch(`${API_BASE}/analyze/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          url: sharedUrl,
          user_id: userId,
          entity_type_override: entityTypeOverride,
        }),
      });

      if (!response.ok) throw new Error('API error');
      const { job_id } = await response.json();
      console.log('Analysis job started:', job_id);
      setPhase('success');
    } catch {
      setPhase('error');
    } finally {
      setTimeout(() => close(), 1500);
    }
  };

  // Init phase - show loading
  if (phase === 'init') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.label}>Chargement...</Text>
      </View>
    );
  }

  // Selection phase UI
  if (phase === 'select') {
    const selectedOption = ENTITY_TYPE_OPTIONS.find((o) => o.value === entityType);

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Type d'analyse</Text>

        <View style={styles.optionsRow}>
          {ENTITY_TYPE_OPTIONS.map((option) => {
            const isSelected = entityType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setEntityType(option.value)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isSelected ? `${option.color}22` : '#27272a',
                    borderColor: isSelected ? `${option.color}66` : '#3f3f46',
                  },
                ]}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? option.color : '#a1a1aa' },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.description}>{selectedOption?.description}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => close()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAnalyze} style={styles.analyzeButton}>
            <Text style={styles.analyzeText}>Analyser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading/result phase UI
  const config = {
    loading: { label: 'Analyse en cours...', color: '#60a5fa' },
    success: { label: 'Ajoute a votre inbox !', color: '#34d399' },
    error: { label: 'Erreur, reessayez.', color: '#f87171' },
    unsupported: { label: 'Lien non supporte.', color: '#a1a1aa' },
  }[phase];

  return (
    <View style={styles.container}>
      {phase === 'loading' ? (
        <ActivityIndicator size="large" color="#60a5fa" />
      ) : (
        <Text style={styles.icon}>
          {phase === 'success' ? '✓' : phase === 'error' ? '✕' : '−'}
        </Text>
      )}
      <Text style={[styles.label, { color: config?.color }]}>{config?.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    color: '#71717a',
    marginTop: -4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  analyzeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
  },
  analyzeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  icon: {
    fontSize: 36,
    color: '#ffffff',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
