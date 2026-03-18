import { useEffect, useState, useMemo } from 'react';
import {ImageBackground, Text, View, StyleSheet, TouchableOpacity} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import Loader from '../components/Loader';

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
}> = [
  { value: 'auto', label: 'Auto', description: 'Detection automatique' },
  { value: 'trip', label: 'Voyage', description: 'Itineraire jour par jour' },
  { value: 'city', label: 'Ville', description: 'Guide de ville / POIs' },
];

function isSupportedUrl(url: string): boolean {
  return SUPPORTED_HOSTS.some((host) => url.includes(host));
}

function extractUrl(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : undefined;
}

export default function ShareScreen(props: { url?: string; text?: string }) {
  const [phase, setPhase] = useState<Phase>('init');
  const [entityType, setEntityType] = useState<EntityTypeOption>('auto');
  const [hasCheckedUrl, setHasCheckedUrl] = useState(false);

  const sharedUrl = useMemo(() => {
    const directUrl = props.url;
    const textUrl = extractUrl(props.text);
    return directUrl || textUrl;
  }, [props.url, props.text]);

  useEffect(() => {
    if (hasCheckedUrl) return;

    if (sharedUrl) {
      setHasCheckedUrl(true);
      setPhase(isSupportedUrl(sharedUrl) ? 'select' : 'unsupported');
      if (!isSupportedUrl(sharedUrl)) setTimeout(() => close(), 2000);
      return;
    }

    const timer = setTimeout(() => {
      setHasCheckedUrl(true);
      setPhase('unsupported');
      setTimeout(() => close(), 2000);
    }, 2500);

    return () => clearTimeout(timer);
  }, [sharedUrl, hasCheckedUrl]);

  useEffect(() => {
    if (!sharedUrl || phase !== 'unsupported') return;
    if (isSupportedUrl(sharedUrl)) {
      setPhase('select');
    }
  }, [sharedUrl]);

  const handleAnalyze = async () => {
    setPhase('loading');

    try {
      const jwt = await SecureStore.getItemAsync('supabase_jwt', {
        accessGroup: 'group.com.onedaytravel.mobile.shared',
      });

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

      if (!jwt) {
        setPhase('error');
        setTimeout(() => close(), 1500);
        return;
      }

      const response = await fetch(`${API_BASE}/analyze/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          url: sharedUrl,
          user_id: userId,
          entity_type_override: entityType === 'auto' ? undefined : entityType,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Envoyer une notification locale pour confirmer
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Analyse lancée',
            body: 'Votre vidéo est en cours d\'analyse. Vous serez notifié quand ce sera terminé.',
            data: { type: 'analysis_started' },
          },
          trigger: null, // Notification immédiate
        });
      } catch (notifErr) {
        console.log('[ShareExtension] Notification error:', notifErr);
      }

      setPhase('success');
    } catch (err) {
      console.log('[ShareExtension] Error:', err);
      setPhase('error');
    } finally {
      setTimeout(() => close(), 1500);
    }
  };

  if (phase === 'init') {
    return (
      <ImageBackground source={require('@/assets/images/bg-gradient.png')} resizeMode="stretch" style={s.flex1}>
        <View style={[s.flex1, s.center, s.px5, s.gap3]}>
          <Loader size={48} />
          <Text style={s.textWhite60}>Chargement...</Text>
        </View>
      </ImageBackground>
    );
  }

  if (phase === 'select') {
    const selectedOption = ENTITY_TYPE_OPTIONS.find((o) => o.value === entityType);

    return (
      <ImageBackground source={require('@/assets/images/bg-gradient.png')} resizeMode="stretch" style={s.flex1}>
        <View style={[s.flex1, s.px5, s.py8, s.gap6]}>
          <Text style={s.textTitle}>Type d'analyse</Text>

          <View style={s.row}>
            {ENTITY_TYPE_OPTIONS.map((option) => {
              const isSelected = entityType === option.value;
              return (
                <TouchableOpacity key={option.value} style={s.flex1} onPress={() => setEntityType(option.value)}>
                  <View style={[s.optionButton, isSelected && s.optionButtonSelected]}>
                    <Text 
                      style={[s.optionText, isSelected && s.optionTextSelected]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.textDescription}>
            {selectedOption?.description}
          </Text>

          <View style={[s.row, s.gap3, s.mtAuto]}>
            <TouchableOpacity style={{ flexGrow: 0.3 }} onPress={() => close()}>
              <View style={s.cancelButton}>
                <Text style={s.cancelButtonText}>Annuler</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexGrow: 0.7 }} onPress={handleAnalyze}>
              <View style={s.analyzeButton} >
                <Text style={s.analyzeButtonText}>Analyser</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  const statusConfig = {
    loading:     { label: 'Analyse en cours...',   color: '#60a5fa' },
    success:     { label: 'Ajoute a votre inbox !', color: '#34d399' },
    error:       { label: 'Erreur, reessayez.',     color: '#f87171' },
    unsupported: { label: 'Lien non supporte.',     color: '#a1a1aa' },
  }[phase];

  return (
    <ImageBackground source={require('@/assets/images/bg-gradient.png')} resizeMode="stretch" style={s.flex1}>
      <View style={[s.flex1, s.center, s.px5, s.gap3]}>
        {phase === 'loading' ? (
          <Loader size={48} color={statusConfig.color} />
        ) : (
          <Text style={[s.statusIcon, { color: statusConfig.color }]}>
            {phase === 'success' ? '✓' : phase === 'error' ? '✕' : 'i'}
          </Text>
        )}
        <Text style={[s.statusText, { color: statusConfig.color }]}>
          {statusConfig.label}
        </Text>
      </View>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  px5: { paddingHorizontal: 20 },
  py8: { paddingVertical: 32 },
  gap3: { gap: 12 },
  gap6: { gap: 24 },
  mtAuto: { marginTop: 'auto' },
  
  textWhite: { color: '#ffffff' },
  textWhite60: { color: 'rgba(255,255,255,0.6)' },
  textWhite50: { color: 'rgba(255,255,255,0.5)' },
  textTitle: { color: '#ffffff', fontSize: 18, textAlign: 'center', fontWeight: '600' },
  textDescription: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: -8 },
  statusText: { fontSize: 14, fontWeight: '500' },
  statusIcon: { fontSize: 32, fontWeight: '600' },
  
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  optionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  analyzeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
