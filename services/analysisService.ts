/**
 * services/analysisService.ts — React Native / Expo
 *
 * Parité fonctionnelle avec la version web :
 * - POST /analyze/url  → job_id
 * - SSE  /analyze/stream/{job_id} avec headers personnalisés (react-native-sse)
 * - Polling fallback
 * - Hook useVideoAnalysis identique
 *
 * Remplacements web → RN :
 *   import.meta.env.VITE_*      → process.env.EXPO_PUBLIC_*
 *   @microsoft/fetch-event-source → react-native-sse (supporte les headers)
 */

import React from 'react';
import EventSource, { type EventSourceEvent } from 'react-native-sse';
import { AnalysisResponse, AnalysisError, EntityType } from '../types/api';
import { supabase } from '../lib/supabase';

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000';

/** Headers de base sans auth */
const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

/** Récupère le JWT courant et construit les headers avec Authorization */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Non authentifié');
  return { ...BASE_HEADERS, Authorization: `Bearer ${token}` };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending:     'En attente…',
  downloading: 'Téléchargement de la vidéo…',
  analyzing:   'Analyse en cours (peut prendre plusieurs minutes)…',
  done:        'Analyse terminée',
  error:       'Erreur',
};

export type JobStatus = 'pending' | 'downloading' | 'analyzing' | 'done' | 'error';

export interface JobStatusResponse {
  job_id:     string;
  status:     JobStatus;
  progress?:  number;
  result?:    AnalysisResponse;
  error?:     string;
  timestamp?: string;
}

export interface AnalysisCallbacks {
  onStatus?:   (status: JobStatus, progress?: number) => void;
  onProgress?: (progress: number, message?: string)   => void;
  onError?:    (error: string)                         => void;
  onComplete?: (result: AnalysisResponse)              => void;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Lance l'analyse d'une URL vidéo et streame les mises à jour SSE en temps réel.
 *
 * Flux :
 *   1. POST /analyze/url  → reçoit { job_id }
 *   2. GET  /analyze/stream/{job_id} via react-native-sse (supporte les headers)
 *   3. Résout avec AnalysisResponse quand status === "done"
 *
 * @param entityTypeOverride - Force le type d'entité: 'trip' | 'city' | undefined (auto)
 */
export async function analyzeVideoUrl(
  url: string,
  callbacks?: AnalysisCallbacks,
  userId?: string,
  useTestRoute = false,
  entityTypeOverride?: EntityType,
): Promise<AnalysisResponse> {
  const endpoint = useTestRoute ? '/test/analyze/url' : '/analyze/url';

  // ── Étape 1 : démarrer le job ──────────────────────────────────────────────
  let job_id: string;
  try {
    const body: Record<string, any> = { url, user_id: userId };
    if (entityTypeOverride) {
      body.entity_type_override = entityTypeOverride;
    }

    const authHeaders = await getAuthHeaders();
    const startRes = await fetch(`${API_BASE}${endpoint}`, {
      method:  'POST',
      headers: authHeaders,
      body:    JSON.stringify(body),
    });

    if (!startRes.ok) {
      const errData: AnalysisError = await startRes.json().catch(() => ({
        error:   'HTTP Error',
        message: `Erreur ${startRes.status}: ${startRes.statusText}`,
      }));
      throw new Error(errData.message || "Impossible de démarrer l'analyse.");
    }

    ({ job_id } = await startRes.json());
  } catch (error: any) {
    callbacks?.onError?.(error.message || "Erreur lors du démarrage de l'analyse");
    throw error;
  }

  // ── Étape 2 : streamer les mises à jour SSE ────────────────────────────────
  const authHeaders = await getAuthHeaders();
  return streamJobUpdates(job_id, authHeaders, callbacks);
}

// ── SSE streaming (react-native-sse — supporte les headers) ───────────────────

/**
 * Ouvre une connexion SSE vers /analyze/stream/{jobId} via react-native-sse.
 * Contrairement au EventSource natif, react-native-sse peut envoyer des headers
 * personnalisés, ce qui était la raison d'utiliser fetchEventSource côté web.
 */
function streamJobUpdates(
  jobId: string,
  headers: Record<string, string>,
  callbacks?: AnalysisCallbacks,
): Promise<AnalysisResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      es.close();
      fn();
    };

    // Timeout de sécurité : 30 minutes (identique à la version web)
    const timeout = setTimeout(() => {
      const msg = "L'analyse a pris trop de temps (timeout 30 min)";
      callbacks?.onError?.(msg);
      settle(() => reject(new Error(msg)));
    }, 30 * 60 * 1_000);

    const es = new EventSource(`${API_BASE}/analyze/stream/${jobId}`, {
      headers,
      withCredentials: false,
    });

    // ── Message ──────────────────────────────────────────────────────────────
    es.addEventListener('message', (ev: EventSourceEvent<'message'>) => {
      let data: JobStatusResponse;
      try {
        data = JSON.parse(ev.data ?? '');
      } catch {
        return; // frame non parseable — ignorer
      }

      console.debug('📡 SSE:', data);

      callbacks?.onStatus?.(data.status, data.progress);
      if (data.progress !== undefined) callbacks?.onProgress?.(data.progress);

      if (data.status === 'done' && data.result) {
        callbacks?.onComplete?.(data.result);
        settle(() => resolve(data.result!));
        return;
      }

      if (data.status === 'error') {
        const msg = data.error ?? "L'analyse a échoué côté serveur.";
        callbacks?.onError?.(msg);
        settle(() => reject(new Error(msg)));
      }
    });

    // ── Erreur de connexion ───────────────────────────────────────────────────
    // react-native-sse émet 'error' puis tente de se reconnecter automatiquement.
    // On log sans rejeter, pour laisser la lib gérer le backoff — même logique
    // que le onerror de fetchEventSource qui ne throw pas.
    es.addEventListener('error', (ev: EventSourceEvent<'error'>) => {
      if (settled) return;
      console.warn('📡 SSE connection dropped, reconnecting…', ev);
      // Ne pas appeler reject ici : la reconnexion est automatique.
    });
  });
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useVideoAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [progress,    setProgress]    = React.useState(0);
  const [status,      setStatus]      = React.useState<JobStatus>('pending');
  const [error,       setError]       = React.useState<string | null>(null);
  const [result,      setResult]      = React.useState<AnalysisResponse | null>(null);

  const analyze = React.useCallback(async (
    url: string,
    userId?: string,
    useTestRoute = false,
    entityTypeOverride?: EntityType,
  ): Promise<AnalysisResponse> => {
    setIsAnalyzing(true);
    setProgress(0);
    setStatus('pending');
    setError(null);
    setResult(null);

    try {
      const res = await analyzeVideoUrl(
        url,
        {
          onStatus:   (s, p) => { setStatus(s); if (p !== undefined) setProgress(p); },
          onProgress: (p)    => setProgress(p),
          onError:    (e)    => setError(e),
          onComplete: (r)    => setResult(r),
        },
        userId,
        useTestRoute,
        entityTypeOverride,
      );
      return res;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyze, isAnalyzing, progress, status, error, result };
}

// ── Polling fallback ──────────────────────────────────────────────────────────
// Conservé pour les environnements où le SSE est peu fiable (proxies d'entreprise).
// fetch est natif dans React Native / Expo — aucun changement nécessaire.

export async function analyzeVideoUrlPolling(
  url: string,
  onStatus?: (status: JobStatus) => void,
  useTestRoute = false,
  pollIntervalMs = 5_000,
  timeoutMs = 30 * 60 * 1_000,
): Promise<AnalysisResponse> {
  const endpoint = useTestRoute ? '/test/analyze/url' : '/analyze/url';

  const authHeaders = await getAuthHeaders();
  const startRes = await fetch(`${API_BASE}${endpoint}`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({ url }),
  });

  if (!startRes.ok) {
    const err: AnalysisError = await startRes.json().catch(() => ({
      error:   'HTTP Error',
      message: `${startRes.status} ${startRes.statusText}`,
    }));
    throw new Error(err.message);
  }

  const { job_id }       = await startRes.json();
  const deadline         = Date.now() + timeoutMs;
  let lastStatus: JobStatus | null = null;
  let consecutiveErrors  = 0;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    let pollRes: Response;
    try {
      pollRes = await fetch(`${API_BASE}/analyze/status/${job_id}`, {
        headers: BASE_HEADERS,
      });
    } catch {
      if (++consecutiveErrors >= 5) throw new Error('Connexion au serveur perdue.');
      continue;
    }

    if (!pollRes.ok) {
      if (++consecutiveErrors >= 5)
        throw new Error(`Le serveur a retourné ${pollRes.status}.`);
      continue;
    }

    const pollData: JobStatusResponse = await pollRes.json().catch(() => null as any);
    if (!pollData) {
      if (++consecutiveErrors >= 5) throw new Error('Réponse invalide du serveur.');
      continue;
    }

    consecutiveErrors = 0;

    if (pollData.status !== lastStatus) {
      lastStatus = pollData.status;
      onStatus?.(pollData.status);
    }

    if (pollData.status === 'done') {
      if (!pollData.result) throw new Error('Le serveur a retourné un résultat vide.');
      return pollData.result;
    }
    if (pollData.status === 'error') {
      throw new Error(pollData.error ?? "L'analyse a échoué.");
    }
  }

  throw new Error("L'analyse a pris trop de temps.");
}