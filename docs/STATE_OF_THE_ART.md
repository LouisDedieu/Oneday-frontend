# Bombo - État des lieux de l'application

> Dernière mise à jour : Février 2025

---

## Vue d'ensemble

**Bombo** est une application mobile d'extraction d'itinéraires de voyage utilisant l'IA. Elle analyse des vidéos de voyage (TikTok, Instagram Reels, YouTube) pour en extraire automatiquement des itinéraires structurés que les utilisateurs peuvent sauvegarder et personnaliser.

---

## Stack Technique

| Couche | Technologies |
|--------|--------------|
| **Frontend** | React Native + Expo 54, TypeScript 5.9 |
| **Routing** | Expo Router v6 (file-based) |
| **Styling** | NativeWind v4.2.1 (Tailwind pour RN) |
| **Auth** | Supabase (JWT, AsyncStorage) |
| **Backend** | FastAPI (hébergé sur Render) |
| **Maps** | React Native Maps v1.20.1 |
| **Animations** | Reanimated v4.1.1 |
| **Build** | EAS (Expo Application Services) |

---

## Architecture du Projet

```
app/                    # Routes Expo Router
├── (tabs)/             # Navigation par onglets (Inbox, Trips, Profile)
├── review/[tripId]     # Page de validation des trips
└── login, reset-password

components/             # Composants réutilisables
context/AuthContext     # Gestion de l'état d'authentification
services/               # Logique métier (tripService, analysisService, reviewService)
lib/                    # Utilitaires (api.ts, supabase.ts)
share-extension/        # Extension de partage iOS/Android
```

---

## Fonctionnalités Principales

1. **Authentification** - Email/password via Supabase, confirmation email, reset password
2. **Inbox** - Liste des analyses en cours avec polling temps réel (15s)
3. **Analyse Vidéo** - SSE streaming pour suivre la progression (0-100%)
4. **Gestion des Trips** - CRUD complet, notes personnelles, cartes interactives
5. **Review & Validation** - Édition jour par jour, spots, coordonnées GPS
6. **Share Extension** - Partage direct depuis TikTok/Instagram vers l'app (iOS & Android)
7. **Profil** - Stats utilisateur (trips créés, sauvegardés, vues)

---

## Endpoints Backend Utilisés

- `POST /analyze/url` → Lance l'analyse
- `GET /analyze/stream/{job_id}` → SSE temps réel
- `GET /inbox` → Jobs de l'utilisateur
- `GET/POST/DELETE /trips` → CRUD trips
- `PATCH /review/spots/{spotId}` → Édition spots

---

## État Actuel

| Aspect | Status |
|--------|--------|
| **Branche** | `feature-share-extension` |
| **Dernier commit** | `f92c5f1` - Add share extension for iOS and Android |
| **Git status** | Clean (pas de modifications en cours) |
| **Plateforme iOS** | iOS 15.1+ avec Share Extension native |
| **Plateforme Android** | Support Share Intent |

---

## Points Forts

- Architecture propre avec séparation des responsabilités (components/services/context)
- TypeScript strict avec types bien définis (`/types/api.ts`)
- Gestion robuste des tokens JWT (Secure Store, sync iOS container)
- Mode test/dev configurable via variables d'environnement
- Animations fluides avec Reanimated
- Support multi-plateforme (iOS, Android, Web limité)

---

## Intégrations Tierces

- **Supabase** - BDD PostgreSQL + Auth
- **LocationIQ** - Géocodage des adresses
- **Render** - Hébergement backend FastAPI

---

# Gestion des Trips - Documentation Détaillée

## Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUX DE DONNÉES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Vidéo URL ──► Analyse IA ──► Review/Validation ──► Sauvegarde ──► Affichage
│   (TikTok,       (SSE)         (édition spots)       (trips saved)   (détail)
│    Instagram)                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Modèles de Données

### Types principaux (`types/api.ts`)

```typescript
TripData {
  trip_title: string
  vibe?: string                    // "Aventure", "Romantique", etc.
  duration_days?: number
  best_season?: string             // "summer", "winter", "all year"
  destinations?: Destination[]     // Multi-destinations supportées
  itinerary?: ItineraryDay[]       // Jours avec spots
  logistics?: LogisticsItem[]      // Transports entre destinations
  budget?: Budget                  // Estimation budgétaire
  practical_info?: PracticalInfo   // Visa, langue, apps, packing list
  content_creator?: ContentCreator // @handle du créateur
}
```

### Modèles de Review (`services/reviewService.ts`)

| Entité | Champs clés |
|--------|-------------|
| **DbTrip** | `id`, `trip_title`, `vibe`, `duration_days`, `source_url`, `content_creator_handle`, `destination`, `days[]` |
| **DbDay** | `id`, `day_number`, `location`, `theme`, `accommodation_*`, `breakfast/lunch/dinner_spot`, `validated`, `spots[]` |
| **DbSpot** | `id`, `name`, `spot_type`, `address`, `duration_minutes`, `price_range`, `tips`, `highlight`, `latitude`, `longitude` |

---

## 2. Services Backend

### tripService.ts - Opérations CRUD

| Fonction | Endpoint | Description |
|----------|----------|-------------|
| `getTrip(tripId)` | `GET /trips/{tripId}` | Récupère un trip complet avec jours validés |
| `getPublicTrips(limit)` | `GET /trips/public?limit=` | Trips publics pour feed découverte |
| `getUserTrips(userId)` | `GET /trips/user/{userId}` | Tous les trips d'un utilisateur |
| `deleteTrip(tripId)` | `DELETE /trips/{tripId}` | Suppression (ownership vérifié backend) |
| `getUserSavedTrips(userId)` | `GET /trips/saved` | Trips sauvegardés par l'utilisateur |
| `isTripSaved(userId, tripId)` | `GET /trips/{tripId}/saved` | Vérifie si déjà sauvegardé |
| `saveTrip(userId, tripId, notes?)` | `POST /trips/{tripId}/save` | Sauvegarde avec notes optionnelles |
| `unsaveTrip(userId, tripId)` | `DELETE /trips/{tripId}/save` | Retire de la collection |
| `toggleSaveTrip(...)` | — | Toggle save/unsave, retourne nouvel état |
| `updateSpotCoordinates(...)` | `PATCH /review/spots/{spotId}/coordinates` | MAJ GPS d'un spot |
| `updateDestinationCoordinates(...)` | `PATCH /review/destinations/{destId}/coordinates` | MAJ GPS destination |

### reviewService.ts - Édition de trips

| Fonction | Endpoint | Description |
|----------|----------|-------------|
| `fetchTripForReview(tripId)` | `GET /review/{tripId}` | Trip complet avec tous les jours (non filtrés) |
| `setDayValidated(dayId, validated)` | `PATCH /review/days/{dayId}/validate` | Inclure/exclure un jour |
| `syncDestinations(tripId)` | `POST /review/{tripId}/sync` | Synchronise les coordonnées GPS via LocationIQ |
| `updateSpot(spotId, payload)` | `PATCH /review/spots/{spotId}` | MAJ nom, type, prix, tips, highlight, etc. |
| `deleteSpot(spotId)` | `DELETE /review/spots/{spotId}` | Supprime un spot |

---

## 3. Pages et Composants

### `/app/(tabs)/trips/index.tsx` - Liste des trips sauvegardés

**Fonctionnalités :**
- Affichage en `FlatList` avec animations staggerées (80ms par carte)
- Pull-to-refresh pour recharger
- Rechargement automatique au focus (useFocusEffect)
- Suppression avec confirmation (Alert)
- État vide animé avec message d'onboarding

**Composant `TripCard` :**
```
┌──────────────────────────────────────┐
│ [Thumbnail avec overlay gradient]    │
│   Titre du trip                      │
│   Vibe (ex: "Road trip aventure")    │
├──────────────────────────────────────┤
│ 📍 X jours  |  📅 Il y a X jours     │
│ @creator_handle                      │
│ ─────────────────────────────────────│
│ 📝 Notes utilisateur (italic)        │
│ ✓ Sauvegardé            🗑️ Supprimer │
└──────────────────────────────────────┘
```

**Helper `timeAgo()`** : Affiche "Aujourd'hui", "Hier", "Il y a X jours/semaines/mois"

---

### `/app/(tabs)/trips/[tripId].tsx` - Détail d'un trip

**Structure avec onglets :**

| Onglet | Icône | Contenu |
|--------|-------|---------|
| **Itinéraire** | 📅 | Carte interactive, stats, étapes, jours dépliables |
| **Budget** | 💰 | Total estimé, répartition, conseils économies |
| **Pratique** | 🌍 | Visa, devise, langue, apps, packing list, safety tips |
| **Transport** | 🚗 | Timeline des trajets avec mode, durée, coût |

**Section Itinéraire :**
```
┌─────────────────────────────────────────────┐
│ [InteractiveHeroMap - carte des destinations]│
├─────────────────────────────────────────────┤
│ 📅 Xj    📍 X villes    🧭 X lieux          │
│ Créateur: @handle  [Voir la vidéo →]        │
├─────────────────────────────────────────────┤
│ Étapes du voyage (multi-stop)               │
│  ① Paris, France (3 jours)                  │
│  │                                          │
│  ② Lyon, France (2 jours)                   │
├─────────────────────────────────────────────┤
│ [DayCard - Jour 1] ▼                        │
│   📍 Spots avec emoji par type              │
│   🍽️ Où manger (matin/midi/soir)           │
│   🏨 Hébergement                            │
└─────────────────────────────────────────────┘
```

**Composant `SpotCard` :**
- Emoji selon `spot_type` (restaurant 🍽️, bar 🍷, hotel 🏨, attraction 🏛️, etc.)
- Badge "highlight" avec ⭐
- Badge "verified" avec ✓
- Durée, prix coloré (gratuit → luxe)
- Tips en italique bleu
- Lien Google Maps si coordonnées disponibles

**Section Budget :**
- Hero card avec total estimé + fourchette par jour
- Répartition : 🏨 Hébergement, 🍽️ Nourriture, 🚗 Transport, 🎯 Activités
- 💡 Conseils pour économiser

**Section Pratique :**
- Visa (requis/non requis avec icône couleur)
- Devise locale, langue
- 📱 Apps utiles (badges)
- 📦 À emporter (tags)
- 🛡️ Conseils sécurité
- ⚠️ À éviter (rouge)

**Section Transport (Logistics) :**
- Timeline verticale avec numéros
- Emoji par mode (✈️ avion, 🚆 train, 🚌 bus, 🚗 voiture, ⛴️ ferry, etc.)
- Trajet "From → To" avec durée et coût
- Tips par trajet

---

### `/app/review/[tripId].tsx` - Validation et édition

**Workflow :**
1. L'utilisateur arrive depuis l'Inbox après analyse
2. Il sélectionne les jours à inclure (toggle "Inclus/Inclure")
3. Il peut éditer chaque spot (nom, type, prix, tips, highlight)
4. Il peut supprimer des spots
5. Il sauvegarde → redirection vers le détail du trip

**UI Header :**
```
← Retour  |  Titre du trip
          |  📍 Destination · X jours
```

**Panneau de sélection :**
```
┌─────────────────────────────────────────────┐
│ Sélectionne tes jours         [Tout][Aucun]│
│ X jours · Y lieux                           │
│ [████████░░░░░░░░░░] 60%                    │
│ [✓ J1] [✓ J2] [ J3] [✓ J4] [ J5]           │
└─────────────────────────────────────────────┘
```

**DayReviewCard :**
- Barre latérale colorée (bleu si inclus)
- Toggle "Inclus/Inclure" avec animation
- Expansion avec animation (height 0→auto)
- Liste des spots éditables
- Repas du jour (🌅 🌞 🌙)
- Hébergement

**SpotReviewCard - Mode lecture :**
```
🍽️ Nom du spot ⭐  [📍][✏️][🗑️]
    Adresse
    ⏱️ 30min  €€ Modéré
    💡 Conseil du créateur
```

**SpotReviewCard - Mode édition :**
```
┌─────────────────────────────────────────────┐
│ NOM    [_____________________________]      │
│ TYPE   [🍽️ restaurant] [🍷 bar] [🏨 hotel]...│
│ PRIX   [gratuit] [€] [€€] [€€€] [€€€€]     │
│ ADRESSE [_____________________________]     │
│ DURÉE   [_____] min                         │
│ CONSEIL [_____________________________]     │
│ [⭐ Coup de cœur]                           │
│                                             │
│ [💾 Enregistrer]  [✕ Annuler]              │
└─────────────────────────────────────────────┘
```

**Footer sticky :**
- Bouton vert "Sauvegarder X jours" si jours sélectionnés
- Bouton gris "Sélectionne au moins un jour" si aucun
- Bouton rouge "Retirer de ma collection" si déjà sauvegardé
- Loader pendant la validation

---

## 4. Constantes et Configuration

### Types de spots avec emojis
```typescript
SPOT_EMOJI = {
  restaurant: '🍽️', bar: '🍷', hotel: '🏨', attraction: '🏛️',
  activite: '🎯', transport: '🚗', shopping: '🛍️', museum: '🏛️',
  beach: '🏖️', park: '🌳', viewpoint: '🔭', cafe: '☕',
  market: '🛒', nightlife: '🎶', spa: '💆', other: '📍'
}
```

### Gammes de prix
```typescript
PRICE_CONFIG = {
  gratuit: { label: 'Gratuit', color: 'emerald-400' },
  '€':     { label: 'Budget',  color: 'green-400' },
  '€€':    { label: 'Modéré',  color: 'yellow-400' },
  '€€€':   { label: 'Cher',    color: 'orange-400' },
  '€€€€':  { label: 'Luxe',    color: 'red-400' }
}
```

### Modes de transport
```typescript
TRANSPORT_CONFIG = {
  plane: '✈️ Vol', train: '🚆 Train', bus: '🚌 Bus',
  car: '🚗 Voiture', ferry: '⛴️ Ferry', walk: '🚶 À pied',
  taxi: '🚕 Taxi', metro: '🚇 Métro', bike: '🚲 Vélo', boat: '🛥️ Bateau'
}
```

### Saisons
```typescript
SEASON_EMOJI = {
  spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️', 'all year': '🌍'
}
```

---

## 5. Fonctionnalités Avancées

### Géolocalisation
- **LocationIQ API** pour geocoding des adresses
- Normalisation du texte pour l'API (`normalizeTextForLocationIQAPI`)
- Sync automatique des coordonnées au moment du save (`syncDestinations`)
- Lien Google Maps depuis chaque spot (lat/lon ou adresse)

### Animations
- **Staggered entry** : Cartes apparaissent en cascade (80ms de délai)
- **Expand/collapse** : Animation hauteur + opacité pour les jours
- **Loader rotatif** : SpinningLoader avec Animated.loop

### Optimistic Updates
- Les modifications locales sont appliquées immédiatement
- Rollback en cas d'erreur API
- Refresh complet si échec de rollback

### Notes utilisateur
- Champ `notes` optionnel lors du save
- Affiché en italique sur la carte du trip

---

## 6. Points d'Amélioration Potentiels

| Aspect | État actuel | Amélioration possible |
|--------|-------------|----------------------|
| **Offline** | Aucun cache local | Ajouter AsyncStorage pour trips sauvegardés |
| **Partage** | Non implémenté | Ajouter deep links pour partager un trip |
| **Recherche** | Non implémentée | Filtrer trips par destination/vibe/durée |
| **Export** | Non implémenté | PDF/calendrier pour l'itinéraire |
| **Collaboration** | Non implémentée | Partager un trip avec d'autres utilisateurs |
| **Réordonner spots** | Non implémenté | Drag & drop pour changer l'ordre |
| **Ajouter spots** | Non implémenté | Bouton "+" pour ajouter manuellement |

---

## Historique Git Récent

```
f92c5f1 - Add share extension for iOS and Android
fc29a82 - Merge pull request #1
47f40ce - Refactor iOS version check and clean up AddTripModal; add InteractiveHeroMap
7bf6277 - Add layout and navigation for trips and reviews; implement interactive map
a28796b - Use env variables for test and dev modes
c4e95a8 - Refactor to React Native with Expo (major rewrite from web)
e7f4b5d - Initial commit
```

---

## Configuration Environnement

Variables d'environnement (`.env`) :
- `EXPO_PUBLIC_SUPABASE_URL` - URL Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Clé publique Supabase
- `EXPO_PUBLIC_API_BASE` - URL backend FastAPI
- `EXPO_PUBLIC_TEST_MODE` - Mode test (auto-login)
- `EXPO_PUBLIC_DEV_MODE` - Mode développement (debug panel)
- `EXPO_PUBLIC_LOCATIONIQ_KEY` - Clé API LocationIQ
