# Bombo - État des lieux de l'application

> Dernière mise à jour : Mars 2026

---

## Vue d'ensemble

**Bombo** est une application mobile d'extraction d'itinéraires de voyage utilisant l'IA. Elle analyse des vidéos de voyage (TikTok, Instagram Reels, YouTube) pour en extraire automatiquement des itinéraires structurés que les utilisateurs peuvent sauvegarder et personnaliser. L'application permet également de gérer des **villes** avec leurs points d'intérêt (highlights), de les fusionner et de les intégrer dans des trips existants.

---

## Stack Technique

| Couche | Technologies |
|--------|--------------|
| **Frontend** | React Native 0.83.2 + Expo 55, React 19.2.0, TypeScript 5.9 |
| **Routing** | Expo Router v6 (file-based) |
| **Styling** | NativeWind v4.2.1 (Tailwind pour RN) |
| **Auth** | Supabase (JWT, AsyncStorage, Secure Store) |
| **Backend** | FastAPI (hébergé sur Render) |
| **Maps** | React Native Maps v1.20.1 |
| **Animations** | Reanimated v4.2.1 |
| **Drag & Drop** | react-native-draggable-flatlist v4.0.3 |
| **Graphics** | Shopify React Native Skia v2.5.1 |
| **Bottom Sheet** | @gorhom/bottom-sheet v5.2.8 |
| **Toasts** | Sonner Native v0.23.1 |
| **Analytics** | PostHog React Native v4.37.3 |
| **i18n** | i18next v25 + react-i18next v16 + expo-localization |
| **Testing** | Storybook v10.2 |
| **Icons** | Lucide React Native v0.574.0, Expo Vector Icons |
| **Build** | EAS (Expo Application Services) |

---

## Architecture du Projet

```
app/                         # Routes Expo Router
├── (tabs)/                  # Navigation par onglets
│   ├── index.tsx            # Inbox - Analyses en cours
│   ├── trips/               # Gestion des trips et villes
│   │   ├── index.tsx        # Liste trips/villes sauvegardés
│   │   ├── [tripId].tsx     # Détail d'un trip
│   │   └── city/            # Routes pour les villes
│   │       └── [cityId].tsx # Détail d'une ville
│   └── profile.tsx          # Profil utilisateur
├── review/                  # Pages de validation
│   ├── [tripId].tsx         # Review trip
│   └── city/[cityId].tsx    # Review ville
└── login, reset-password    # Auth

components/                  # Composants réutilisables
├── city/                    # Composants ville (NEW)
│   ├── CategoryFilterChips.tsx
│   ├── HighlightCard.tsx
│   ├── HighlightReviewCard.tsx
│   ├── CityHighlightsMap.tsx
│   └── CityBudgetCard.tsx
├── trip/                    # Composants trip
│   └── AddCityToTripModal.tsx (NEW)
└── ...

services/                    # Logique métier
├── tripService.ts           # CRUD trips
├── reviewService.ts         # Édition trips
├── cityService.ts           # CRUD villes
├── cityReviewService.ts     # Édition villes
├── geocodingService.ts      # Géocodage via backend proxy (NEW)
├── analysisService.ts       # Analyses IA
└── savedService.ts          # Collection utilisateur

context/AuthContext          # État d'authentification
lib/                         # Utilitaires (api.ts, supabase.ts)
share-extension/             # Extension de partage iOS/Android
```

---

## Fonctionnalités Principales

### Fonctionnalités Existantes
1. **Authentification** - Email/password via Supabase, confirmation email, reset password
2. **Inbox** - Liste des analyses en cours avec polling temps réel (15s)
3. **Analyse Vidéo** - SSE streaming pour suivre la progression (0-100%)
4. **Gestion des Trips** - CRUD complet, notes personnelles, cartes interactives
5. **Review & Validation** - Édition jour par jour, spots, coordonnées GPS
6. **Share Extension** - Partage direct depuis TikTok/Instagram vers l'app (iOS & Android)
7. **Profil** - Stats utilisateur (trips créés, sauvegardés, vues)

### Nouvelles Fonctionnalités (Mars 2025)
8. **Gestion des Villes** - CRUD complet des villes avec highlights
9. **Highlights CRUD** - Créer, modifier, supprimer des points d'intérêt
10. **Système de Merge** - Détection et fusion de villes dupliquées
11. **Drag & Drop** - Réordonner les highlights par glisser-déposer
12. **Filtrage par catégorie** - Food, Culture, Nature, Shopping, Nightlife, Other
13. **Géocodage automatique** - LocationIQ API pour convertir adresses en coordonnées
14. **Cartes interactives villes** - Visualisation des highlights sur carte
15. **Intégration Trip-Ville** - Ajouter des villes sauvegardées à un trip
16. **Navigation iOS 26+** - Support Liquid Glass tabs natifs

---

## Endpoints Backend Utilisés

### Trips
- `POST /analyze/url` → Lance l'analyse
- `GET /analyze/stream/{job_id}` → SSE temps réel
- `GET /inbox` → Jobs de l'utilisateur
- `GET/POST/DELETE /trips` → CRUD trips
- `GET /trips/{tripId}` → Détail trip complet
- `GET /trips/saved` → Trips sauvegardés
- `POST /trips/{tripId}/save` → Sauvegarder un trip
- `DELETE /trips/{tripId}/save` → Retirer de la collection
- `POST /trips/{tripId}/validate-and-save` → **NEW** Valide et sauvegarde atomiquement (transactionnel)

### Review Trips
- `GET /review/{tripId}` → Trip pour édition
- `PATCH /review/days/{dayId}/validate` → Inclure/exclure un jour
- `PATCH /review/spots/{spotId}` → Édition spots
- `PATCH /review/spots/{spotId}/coordinates` → MAJ GPS spot
- `DELETE /review/spots/{spotId}` → Suppression spot
- `POST /review/{tripId}/sync` → Sync coordonnées GPS
- `POST /review/{tripId}/destinations` → Ajouter destination (NEW)
- `DELETE /review/{tripId}/destinations/{destId}` → Supprimer destination (NEW)
- `PATCH /review/{tripId}/destinations/reorder` → Réordonner destinations (NEW)
- `POST /review/{tripId}/add-city` → Ajouter une ville au trip (NEW)

### Villes (NEW)
- `GET /cities/{cityId}` → Détail ville avec highlights
- `DELETE /cities/{cityId}` → Suppression ville
- `GET /cities/saved` → Villes sauvegardées (paginé)
- `GET /cities/{cityId}/saved` → Vérifie si sauvegardée
- `POST /cities/{cityId}/save` → Sauvegarder ville
- `DELETE /cities/{cityId}/save` → Retirer de collection
- `PATCH /cities/{cityId}/coordinates` → MAJ GPS ville
- `GET /cities/match?name=` → Détection ville existante (merge)
- `POST /cities/{targetId}/merge` → Fusionner deux villes

### Review Villes (NEW)
- `GET /review/city/{cityId}` → Ville pour édition
- `POST /review/city/{cityId}/highlights` → Créer highlight
- `PATCH /review/highlights/{highlightId}` → Éditer highlight
- `PATCH /review/highlights/{highlightId}/coordinates` → MAJ GPS highlight
- `PATCH /review/highlights/{highlightId}/validate` → Valider/invalider
- `PATCH /review/highlights/{highlightId}/category` → Changer catégorie
- `DELETE /review/highlights/{highlightId}` → Supprimer highlight
- `PATCH /review/city/{cityId}/highlights/reorder` → Réordonner highlights
- `POST /review/city/{cityId}/sync` → Sync données (supprime non-validés)

### Geocoding (NEW - Mars 2026)
- `GET /geocoding/search?q=...&limit=...` → Proxy sécurisé vers LocationIQ (clé API cachée)

---

## État Actuel

| Aspect | Status |
|--------|--------|
| **Branche** | `city-itinerary-management` |
| **Derniers commits** | `1f52996` - Remove unnecessary padding from user profile view |
| **Git status** | Clean (pas de modifications en cours) |
| **Plateforme iOS** | iOS 15.1+ avec Share Extension native, Liquid Glass tabs (iOS 26+) |
| **Plateforme Android** | Support Share Intent |

---

## Points Forts

- Architecture propre avec séparation des responsabilités (components/services/context)
- TypeScript strict avec types bien définis (`/types/api.ts`)
- Gestion robuste des tokens JWT (Secure Store, sync iOS container)
- Mode test/dev configurable via variables d'environnement
- Animations fluides avec Reanimated
- Support multi-plateforme (iOS, Android, Web limité)
- **Système de merge intelligent** pour éviter les doublons de villes
- **Géocodage automatique** des adresses
- **Drag & Drop** pour réorganiser les contenus
- **Refresh automatique** des données au focus des écrans

---

## Intégrations Tierces

- **Supabase** - BDD PostgreSQL + Auth
- **LocationIQ** - Géocodage des adresses
- **Render** - Hébergement backend FastAPI
- **Apple Maps / Google Maps / Waze** - Liens de navigation depuis les spots

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
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    NOUVEAU : FLUX VILLES                            │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │ Vidéo ──► Analyse ──► Review Ville ──► Détection Merge ──► Save    │   │
│   │                         ├── Validation highlights                   │   │
│   │                         ├── Drag & Drop ordre                      │   │
│   │                         └── Édition/Suppression                    │   │
│   │                                                                     │   │
│   │ Ville Saved ──► Détail ──► CRUD Highlights ──► Intégration Trip   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Modèles de Données

### Types Trip (`types/api.ts`)

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

### Types City (NEW)

```typescript
CityData {
  id: string
  city_name: string
  country?: string
  latitude?: number
  longitude?: number
  highlights: Highlight[]
  budget?: CityBudget
  practical_info?: PracticalInfo
  source_url?: string
  content_creator_handle?: string
}

Highlight {
  id: string
  name: string
  category: 'food' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'other'
  description?: string
  address?: string
  latitude?: number
  longitude?: number
  price_range?: string
  tips?: string
  must_see?: boolean
  validated?: boolean
  order?: number
}
```

### Modèles de Review (`services/reviewService.ts`)

| Entité | Champs clés |
|--------|-------------|
| **DbTrip** | `id`, `trip_title`, `vibe`, `duration_days`, `source_url`, `content_creator_handle`, `destination`, `days[]` |
| **DbDay** | `id`, `day_number`, `location`, `theme`, `accommodation_*`, `breakfast/lunch/dinner_spot`, `validated`, `spots[]` |
| **DbSpot** | `id`, `name`, `spot_type`, `address`, `duration_minutes`, `price_range`, `tips`, `highlight`, `latitude`, `longitude` |

### Modèles City Review (NEW - `services/cityReviewService.ts`)

| Entité | Champs clés |
|--------|-------------|
| **DbCity** | `id`, `city_name`, `country`, `latitude`, `longitude`, `highlights[]`, `budget`, `practical_info` |
| **HighlightUpdatePayload** | `name`, `category`, `description`, `address`, `price_range`, `tips`, `must_see` |
| **CreateHighlightPayload** | Tous les champs pour créer un nouveau highlight |

---

## 2. Services Backend

### tripService.ts - Opérations CRUD Trips

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
| `validateAndSaveTrip(tripId, notes?)` | `POST /trips/{tripId}/validate-and-save` | **NEW** Opération atomique : syncDestinations + saveTrip en transaction |
| `updateSpotCoordinates(...)` | `PATCH /review/spots/{spotId}/coordinates` | MAJ GPS d'un spot |
| `updateDestinationCoordinates(...)` | `PATCH /review/destinations/{destId}/coordinates` | MAJ GPS destination |

### cityService.ts - Opérations CRUD Villes (NEW)

| Fonction | Endpoint | Description |
|----------|----------|-------------|
| `getCity(cityId)` | `GET /cities/{cityId}` | Récupère une ville avec ses highlights |
| `deleteCity(cityId)` | `DELETE /cities/{cityId}` | Suppression ville |
| `getUserSavedCities(userId, page, limit)` | `GET /cities/saved` | Villes sauvegardées (paginé) |
| `isCitySaved(userId, cityId)` | `GET /cities/{cityId}/saved` | Vérifie si sauvegardée |
| `saveCity(userId, cityId)` | `POST /cities/{cityId}/save` | Sauvegarde ville |
| `unsaveCity(userId, cityId)` | `DELETE /cities/{cityId}/save` | Retire de collection |
| `toggleSaveCity(...)` | — | Toggle save/unsave |
| `checkCityMatch(cityName)` | `GET /cities/match?name=` | Détection ville existante pour merge |
| `mergeCities(targetId, sourceId, highlightIds, deleteSource)` | `POST /cities/{targetId}/merge` | Fusion deux villes |
| `updateCityCoordinates(cityId, lat, lon)` | `PATCH /cities/{cityId}/coordinates` | MAJ GPS ville |

### reviewService.ts - Édition de trips (ENHANCED)

| Fonction | Endpoint | Description |
|----------|----------|-------------|
| `fetchTripForReview(tripId)` | `GET /review/{tripId}` | Trip complet avec tous les jours (non filtrés) |
| `setDayValidated(dayId, validated)` | `PATCH /review/days/{dayId}/validate` | Inclure/exclure un jour |
| `syncDestinations(tripId)` | `POST /review/{tripId}/sync` | Synchronise les coordonnées GPS via LocationIQ |
| `updateSpot(spotId, payload)` | `PATCH /review/spots/{spotId}` | MAJ nom, type, prix, tips, highlight, etc. |
| `deleteSpot(spotId)` | `DELETE /review/spots/{spotId}` | Supprime un spot |
| `addCityToTrip(tripId, payload)` | `POST /review/{tripId}/add-city` | **NEW** - Ajoute ville au trip |
| `addDestinationToTrip(tripId, payload)` | `POST /review/{tripId}/destinations` | **NEW** - Ajoute destination |
| `deleteDestination(tripId, destId)` | `DELETE /review/{tripId}/destinations/{destId}` | **NEW** - Supprime destination |
| `reorderDestinations(tripId, payload)` | `PATCH /review/{tripId}/destinations/reorder` | **NEW** - Réordonne destinations |

### cityReviewService.ts - Édition de villes (NEW)

| Fonction | Endpoint | Description |
|----------|----------|-------------|
| `fetchCityForReview(cityId)` | `GET /review/city/{cityId}` | Ville avec tous les highlights |
| `createHighlight(cityId, payload)` | `POST /review/city/{cityId}/highlights` | Crée nouveau highlight |
| `updateHighlight(highlightId, payload)` | `PATCH /review/highlights/{highlightId}` | MAJ highlight |
| `updateHighlightCoordinates(highlightId, lat, lon)` | `PATCH /review/highlights/{highlightId}/coordinates` | MAJ GPS highlight |
| `setHighlightValidated(highlightId, validated)` | `PATCH /review/highlights/{highlightId}/validate` | Valide/invalide |
| `setHighlightCategory(highlightId, category)` | `PATCH /review/highlights/{highlightId}/category` | Change catégorie |
| `deleteHighlight(highlightId)` | `DELETE /review/highlights/{highlightId}` | Supprime highlight |
| `reorderHighlights(cityId, highlights)` | `PATCH /review/city/{cityId}/highlights/reorder` | Réordonne (drag & drop) |
| `syncCityData(cityId)` | `POST /review/city/{cityId}/sync` | Supprime non-validés, recalcule ordre |

---

## 3. Pages et Composants

### `/app/(tabs)/trips/index.tsx` - Liste des trips et villes sauvegardés

**Fonctionnalités :**
- Affichage en `FlatList` avec animations staggerées (80ms par carte)
- Pull-to-refresh pour recharger
- Rechargement automatique au focus (useFocusEffect)
- Suppression avec confirmation (Alert)
- État vide animé avec message d'onboarding
- **Support trips ET villes dans la même liste**

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
│ [+ Ajouter une ville] (NEW)                 │
├─────────────────────────────────────────────┤
│ Étapes du voyage (multi-stop, réordonnables)│
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

**Nouveau : AddCityToTripModal**
- Recherche dans les villes sauvegardées
- Aperçu des highlights de la ville
- Sélection du jour d'intégration
- Création automatique des spots depuis highlights

---

### `/app/(tabs)/trips/city/[cityId].tsx` - Détail d'une ville (NEW)

**Structure avec onglets :**

| Onglet | Icône | Contenu |
|--------|-------|---------|
| **Highlights** | ⭐ | Carte interactive, filtres catégories, liste highlights |
| **Budget** | 💰 | Budget journalier, répartition par catégorie |
| **Pratique** | 🌍 | Visa, devise, langue, conseils |

**Section Highlights :**
```
┌─────────────────────────────────────────────┐
│ [CityHighlightsMap - carte des highlights]  │
├─────────────────────────────────────────────┤
│ [🍽️ Food] [🏛️ Culture] [🌳 Nature] ...     │
│ X highlights                                │
├─────────────────────────────────────────────┤
│ [HighlightCard] ─────────────────────────── │
│   🍽️ Restaurant Name         ⭐ Must-see   │
│   📍 123 rue de Paris                       │
│   💰 €€ Modéré                              │
│   💡 "Réserver à l'avance"                  │
│   [📍 Voir sur carte] [✏️] [🗑️]             │
└─────────────────────────────────────────────┘
```

**Fonctionnalités CRUD Highlights :**
- Création via modal (nom, catégorie, adresse, description, prix, tips, must-see)
- Édition inline de tous les champs
- Suppression avec confirmation
- Géocodage automatique des adresses (LocationIQ)
- Liens vers Apple Maps / Google Maps / Waze

---

### `/app/review/city/[cityId].tsx` - Review et validation d'une ville (NEW)

**Workflow :**
1. L'utilisateur arrive depuis l'Inbox après analyse
2. **Détection merge** : si une ville existe déjà, proposition de fusion
3. Il sélectionne les highlights à inclure (validation checkboxes)
4. Il peut réordonner par drag & drop
5. Il peut éditer/supprimer chaque highlight
6. Il sauvegarde → redirection vers le détail de la ville

**Panneau de sélection :**
```
┌─────────────────────────────────────────────┐
│ Sélectionne tes highlights   [Tout][Aucun]  │
│ X highlights · Y sélectionnés               │
│ [████████░░░░░░░░░░] 60%                    │
│                                             │
│ [🍽️ Food (3)] [🏛️ Culture (2)] ...         │
└─────────────────────────────────────────────┘
```

**HighlightReviewCard :**
```
┌─────────────────────────────────────────────┐
│ [☰ drag] [✓] 🍽️ Nom du lieu    [✏️][🗑️]   │
│           📍 Adresse                        │
│           💰 €€  💡 Conseil                 │
└─────────────────────────────────────────────┘
```

**Merge Modal (si ville existante détectée) :**
```
┌─────────────────────────────────────────────┐
│ ⚠️ Ville existante détectée                 │
│                                             │
│ "Paris" existe déjà dans ta collection.     │
│ Souhaites-tu fusionner les highlights ?     │
│                                             │
│ [Fusionner] [Créer nouvelle] [Annuler]      │
└─────────────────────────────────────────────┘
```

---

## 4. Composants Réutilisables

### Composants Ville (NEW - `/components/city/`)

| Composant | Description |
|-----------|-------------|
| **CategoryFilterChips** | Chips horizontaux scrollables pour filtrer par catégorie |
| **HighlightCard** | Carte highlight en mode lecture avec actions CRUD |
| **HighlightReviewCard** | Carte highlight en mode review avec validation + drag |
| **CityHighlightsMap** | Carte interactive avec markers colorés par catégorie |
| **CityBudgetCard** | Affichage budget avec répartition |

### Composants Trip (NEW - `/components/trip/`)

| Composant | Description |
|-----------|-------------|
| **AddCityToTripModal** | Modal pour ajouter ville sauvegardée à un trip |

---

## 5. Constantes et Configuration

### Types de spots avec emojis
```typescript
SPOT_EMOJI = {
  restaurant: '🍽️', bar: '🍷', hotel: '🏨', attraction: '🏛️',
  activite: '🎯', transport: '🚗', shopping: '🛍️', museum: '🏛️',
  beach: '🏖️', park: '🌳', viewpoint: '🔭', cafe: '☕',
  market: '🛒', nightlife: '🎶', spa: '💆', other: '📍'
}
```

### Catégories Highlights (NEW)
```typescript
HIGHLIGHT_CATEGORIES = {
  food: { label: 'Food & Drinks', emoji: '🍽️', color: 'orange' },
  culture: { label: 'Culture', emoji: '🏛️', color: 'purple' },
  nature: { label: 'Nature', emoji: '🌳', color: 'green' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: 'pink' },
  nightlife: { label: 'Nightlife', emoji: '🎶', color: 'indigo' },
  other: { label: 'Other', emoji: '📍', color: 'gray' }
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

## 6. Fonctionnalités Avancées

### Géolocalisation
- **LocationIQ API** pour geocoding des adresses (proxifié via backend)
- **Clé API sécurisée** : la clé LocationIQ n'est plus exposée côté client
- Endpoint backend : `GET /geocoding/search?q=...&limit=...`
- Service frontend : `geocodingService.ts` avec fonctions `geocodeQuery`, `geocodeAddress`, `geocodeDestination`, `geocodeHighlight`
- Normalisation du texte pour l'API (`normalizeTextForGeocoding`)
- Sync automatique des coordonnées au moment du save
- Lien Google Maps / Apple Maps / Waze depuis chaque spot/highlight
- **Géocodage contextuel** : inclut toujours ville/pays pour éviter ambiguïtés

### Animations
- **Staggered entry** : Cartes apparaissent en cascade (80ms de délai)
- **Expand/collapse** : Animation hauteur + opacité pour les jours
- **Loader rotatif** : SpinningLoader avec Animated.loop
- **Drag & Drop** : Animation scale lors du déplacement

### Optimistic Updates
- Les modifications locales sont appliquées immédiatement
- Rollback en cas d'erreur API
- Refresh complet si échec de rollback

### Opérations Atomiques (NEW - Mars 2026)
- **validateAndSaveTrip** : Combine syncDestinations + saveTrip en une seule transaction PostgreSQL
- Utilise une fonction RPC PostgreSQL (`validate_and_save_trip`) pour garantir l'atomicité
- Si une étape échoue, toutes les modifications sont automatiquement annulées (rollback)
- Migration SQL : `migrations/001_validate_and_save_trip.sql` (à appliquer dans Supabase)

### Système de Merge (NEW)
- Détection automatique de villes existantes par nom
- Sélection des highlights à fusionner
- Option de supprimer la source après merge
- Seuls les highlights validés sont fusionnés

### Data Refresh
- **useFocusEffect** : Recharge les données quand l'écran reprend le focus
- Évite les données stales après navigation

---

## 7. Points d'Amélioration Potentiels

| Aspect | État actuel | Amélioration possible |
|--------|-------------|----------------------|
| **Offline** | Aucun cache local | Ajouter AsyncStorage pour trips/villes sauvegardés |
| **Partage** | Non implémenté | Ajouter deep links pour partager un trip/ville |
| **Recherche** | Non implémentée | Filtrer trips par destination/vibe/durée |
| **Export** | Non implémenté | PDF/calendrier pour l'itinéraire |
| **Collaboration** | Non implémentée | Partager un trip avec d'autres utilisateurs |
| **Réordonner spots** | Non implémenté | Drag & drop pour changer l'ordre des spots |
| **Ajouter spots** | Non implémenté | Bouton "+" pour ajouter manuellement des spots |
| **Sync bi-directionnelle** | Partielle | Synchroniser highlights ville ↔ spots trip |

---

## Historique Git Récent

```
1f52996 - Remove unnecessary padding from user profile view
d4ccb01 - Fix safe area padding for iOS navbar in saved items list
c081316 - Fix navigation blocking after review save/merge
7d020d9 - Align trip detail navigation with city detail for consistency
4bf046f - Fix city detail page navigation and add data refresh on focus
...
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

Variables d'environnement (`.env` frontend) :
- `EXPO_PUBLIC_SUPABASE_URL` - URL Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Clé publique Supabase
- `EXPO_PUBLIC_API_BASE` - URL backend FastAPI
- `EXPO_PUBLIC_TEST_MODE` - Mode test (auto-login)
- `EXPO_PUBLIC_DEV_MODE` - Mode développement (debug panel)

Variables d'environnement (`.env` backend) :
- `LOCATIONIQ_API_KEY` - Clé API LocationIQ (sécurisée côté serveur)
