# Plan : Fonctionnalité "Cities" pour Bombo

## Résumé

Ajouter un nouveau type de contenu "City" (guide de ville) en parallèle des "Trips" (itinéraires). Les vidéos analysées seront automatiquement classées par l'IA, avec possibilité de forcer le type. L'onglet "Trips" devient "Saved" et affiche les deux types avec filtres.

---

## Périmètre validé

| Aspect | Choix |
|--------|-------|
| **Détection** | Hybride : IA auto-détecte + option de forcer le type |
| **Structure City** | Highlights (POIs) avec catégories filtrables |
| **Navigation** | Onglet "Saved" unifié avec filtres All/Trips/Cities |
| **Scope** | Frontend complet + spécifications backend |

---

## Décisions Techniques (Interview)

| Sujet | Décision |
|-------|----------|
| **AI Confidence** | Silent auto-pick (l'IA décide, user peut changer dans review) |
| **Saved sync** | Auto-sync (live) - les cities sauvées suivent les mises à jour |
| **Type override behavior** | Flatten to highlights (ignorer structure jour par jour) |
| **Performance** | Pagination avec infinite scroll (20 items par page) |
| **Vibe field** | Tags multiples d'une enum (~15 tags, max 5 par entity) |
| **Map clustering** | Cluster automatique avec supercluster |
| **Budget format** | Moyenne par catégorie (Food, Transport, Activities...) |
| **Inbox preview** | Titre + count ("Paris - 24 highlights") |
| **Deduplication** | Merge automatique proposé APRÈS analyse dans Review |
| **Highlight types** | 6 catégories larges + sous-type texte libre |
| **Category visual** | Icône + couleur par catégorie (sur cards ET map markers) |
| **Category filtering** | Filtres par catégorie dans la liste ET sur la map |
| **Reordering** | Drag & drop avec react-native-draggable-flatlist |
| **Validated field** | Review only (suppression définitive si validated=false au sync) |
| **Merge flow** | Review séparée, merge en background |
| **Multi-city split** | Backlog V2 (warning only pour V1) |

---

## 1. Modèles de Données

### 1.1 Nouveaux types (`types/api.ts`)

```typescript
export type EntityType = 'trip' | 'city';

// 6 catégories pour les highlights - utilisées pour filtrage et visuel
export type HighlightCategory = 'food' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'other';

// ~15 vibe tags disponibles
export type VibeTag =
  | 'romantic'
  | 'trendy'
  | 'historic'
  | 'bohemian'
  | 'luxurious'
  | 'budget-friendly'
  | 'foodie'
  | 'artsy'
  | 'family-friendly'
  | 'adventurous'
  | 'relaxing'
  | 'nightlife'
  | 'cultural'
  | 'off-the-beaten-path'
  | 'instagrammable';

export interface CityData {
  city_title: string;
  city_name: string;
  country: string;
  vibe_tags?: VibeTag[];        // Max 5 tags
  best_season?: string;
  latitude?: number;
  longitude?: number;
  highlights?: Highlight[];
  budget?: CityBudget;
  practical_info?: PracticalInfo;
  content_creator?: ContentCreator;
}

export interface Highlight {
  id: string;
  name: string;
  category: HighlightCategory;  // Catégorie pour filtrage et icône
  subtype?: string;             // Sous-type texte libre (ex: "rooftop bar", "street food")
  address?: string;
  description?: string;
  price_range?: string;
  tips?: string;
  is_must_see?: boolean;
  latitude?: number;
  longitude?: number;
  order?: number;               // Pour drag & drop reordering
}

// Budget spécifique City (moyenne par catégorie)
export interface CityBudget {
  currency: string;
  daily_average?: number;
  food_average?: number;        // Repas moyen
  transport_average?: number;   // Transport journalier
  activities_average?: number;  // Activités/entrées
  accommodation_range?: string; // "80-150€/nuit"
}

// AnalysisResponse mis à jour
export interface AnalysisResponse {
  job_id: string;
  trip_id: string | null;
  city_id: string | null;
  entity_type: EntityType;
  duration_seconds: number;
  source_url: string;
  raw_json: TripData | CityData;
  // Pour le merge automatique
  existing_city_match?: {
    city_id: string;
    city_name: string;
    existing_highlights_count: number;
  };
}

// Type guards
export function isTripData(data: TripData | CityData): data is TripData {
  return 'itinerary' in data || 'duration_days' in data;
}

export function isCityData(data: TripData | CityData): data is CityData {
  return 'highlights' in data;
}
```

### 1.2 Configuration des catégories

```typescript
export const HIGHLIGHT_CATEGORIES: Record<HighlightCategory, {
  icon: string;      // Lucide icon name
  color: string;     // Tailwind color
  label: string;     // Display label
}> = {
  food: {
    icon: 'Utensils',
    color: 'orange',
    label: 'Food & Drinks',
  },
  culture: {
    icon: 'Landmark',
    color: 'blue',
    label: 'Culture',
  },
  nature: {
    icon: 'Trees',
    color: 'green',
    label: 'Nature',
  },
  shopping: {
    icon: 'ShoppingBag',
    color: 'pink',
    label: 'Shopping',
  },
  nightlife: {
    icon: 'Moon',
    color: 'purple',
    label: 'Nightlife',
  },
  other: {
    icon: 'MapPin',
    color: 'zinc',
    label: 'Other',
  },
};
```

---

## 2. Spécifications Backend

### 2.1 Tables SQL

```sql
-- Table principale cities
CREATE TABLE cities (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  city_title TEXT NOT NULL,
  city_name TEXT NOT NULL,
  country TEXT,
  vibe_tags TEXT[],              -- Array de tags (max 5)
  best_season TEXT,
  source_url TEXT,
  thumbnail_url TEXT,
  content_creator_handle TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Highlights (POIs)
CREATE TABLE city_highlights (
  id UUID PRIMARY KEY,
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,        -- food, culture, nature, shopping, nightlife, other
  subtype TEXT,                  -- Texte libre
  address TEXT,
  description TEXT,
  price_range TEXT,
  tips TEXT,
  is_must_see BOOLEAN DEFAULT false,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  highlight_order INTEGER DEFAULT 0,
  validated BOOLEAN DEFAULT true  -- Pour review flow uniquement
);

-- Budget City
CREATE TABLE city_budgets (
  id UUID PRIMARY KEY,
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'EUR',
  daily_average DECIMAL(10, 2),
  food_average DECIMAL(10, 2),
  transport_average DECIMAL(10, 2),
  activities_average DECIMAL(10, 2),
  accommodation_range TEXT
);

-- Sauvegardes utilisateur (auto-sync = pas de snapshot)
CREATE TABLE user_saved_cities (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, city_id)
);

-- Mise à jour analysis_jobs
ALTER TABLE analysis_jobs
ADD COLUMN entity_type TEXT DEFAULT 'trip',
ADD COLUMN city_id UUID REFERENCES cities(id);
```

### 2.2 Nouveaux Endpoints

```
# City CRUD
GET    /cities/{city_id}
DELETE /cities/{city_id}

# City saved
GET    /cities/{city_id}/saved
POST   /cities/{city_id}/save
DELETE /cities/{city_id}/save
GET    /cities/saved?page=1&limit=20

# City review
GET    /review/city/{city_id}
PATCH  /review/city/highlights/{id}
PATCH  /review/city/highlights/reorder   # Body: { highlights: [{id, order}] }
DELETE /review/city/highlights/{id}
POST   /review/city/{city_id}/sync       # validated=false sont supprimés

# City merge
POST   /cities/{city_id}/merge           # Body: { source_city_id }
GET    /cities/match?city_name=Paris     # Check existing city for merge

# Unified saved
GET    /saved?type=all|trip|city&page=1&limit=20

# Analyze (mise à jour)
POST   /analyze/url
Body: { url, user_id, entity_type_override?: 'trip'|'city' }
Response: inclut existing_city_match si une city du même nom existe
```

### 2.3 Prompt IA - Détection

```
Analyze this video and determine the content type:

TRIP indicators:
- Multiple days mentioned ("Day 1", "Day 2")
- Travel between different cities
- Overnight stays in different locations

CITY indicators:
- Focus on one city
- Lists "best spots", "must-see places", "hidden gems"
- No day-by-day structure

IMPORTANT: If the video mentions multiple cities with significant content for each,
return entity_type = "trip" (not "city").

Return: entity_type = "trip" | "city"
```

### 2.4 Prompt IA - Extraction City

```json
{
  "entity_type": "city",
  "city_title": "48 Hours in Paris",
  "city_name": "Paris",
  "country": "France",
  "vibe_tags": ["romantic", "cultural", "foodie"],
  "highlights": [
    {
      "name": "Café de Flore",
      "category": "food",
      "subtype": "historic café",
      "is_must_see": true,
      "price_range": "€€€",
      "tips": "Go early morning to avoid crowds",
      "address": "172 Boulevard Saint-Germain"
    },
    {
      "name": "Louvre Museum",
      "category": "culture",
      "subtype": "art museum",
      "is_must_see": true,
      "tips": "Book tickets online, visit Wednesday evening"
    },
    {
      "name": "Jardin du Luxembourg",
      "category": "nature",
      "subtype": "park",
      "is_must_see": false
    }
  ],
  "budget": {
    "currency": "EUR",
    "food_average": 25,
    "transport_average": 15,
    "activities_average": 20
  }
}
```

---

## 3. Changements Frontend

### 3.1 Nouveaux Services

**`services/cityService.ts`**
- `getCity(cityId)` → GET /cities/{cityId}
- `deleteCity(cityId)` → DELETE /cities/{cityId}
- `isCitySaved(userId, cityId)` → GET /cities/{cityId}/saved
- `saveCity(userId, cityId)` → POST /cities/{cityId}/save
- `unsaveCity(userId, cityId)` → DELETE /cities/{cityId}/save
- `getUserSavedCities(userId, page)` → GET /cities/saved?page=X
- `checkCityMatch(cityName)` → GET /cities/match?city_name=X
- `mergeCities(targetCityId, sourceCityId)` → POST /cities/{id}/merge

**`services/cityReviewService.ts`**
- `fetchCityForReview(cityId)` → GET /review/city/{cityId}
- `updateHighlight(id, payload)` → PATCH /review/city/highlights/{id}
- `reorderHighlights(cityId, highlights)` → PATCH /review/city/highlights/reorder
- `deleteHighlight(id)` → DELETE /review/city/highlights/{id}
- `syncCityData(cityId)` → POST /review/city/{cityId}/sync

**`services/savedService.ts`** (nouveau - unifié)
- `getUserSavedItems(userId, filter, page)` → GET /saved?type=filter&page=X

### 3.2 Navigation

**Fichier : `app/(tabs)/_layout.tsx`**

Renommer l'onglet "Trips" → "Saved" :
```typescript
// ClassicTabs
<TabIcon Icon={Bookmark} label="Saved" focused={focused} />

// NativeTabs (iOS 26+)
<Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} />
<Label>Saved</Label>
```

### 3.3 Liste Saved (refactor `app/(tabs)/trips/index.tsx`)

- Ajouter filtre tabs : All | Trips | Cities
- Nouveau composant `EntityCard` qui s'adapte au type
- Différenciation visuelle : bordure bleue (Trip) vs violette (City)
- **Infinite scroll** avec pagination (20 items par page)

```typescript
const [filter, setFilter] = useState<'all' | 'trip' | 'city'>('all');
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

// Filter tabs UI
<View className="flex-row border-b border-zinc-800">
  {['all', 'trip', 'city'].map(f => (
    <TouchableOpacity
      key={f}
      onPress={() => { setFilter(f); setPage(1); }}
      className={filter === f ? 'border-b-2 border-blue-500' : ''}
    >
      <Text>{f === 'all' ? 'All' : f === 'trip' ? 'Trips' : 'Cities'}</Text>
    </TouchableOpacity>
  ))}
</View>

// FlatList with infinite scroll
<FlatList
  data={items}
  onEndReached={() => hasMore && setPage(p => p + 1)}
  onEndReachedThreshold={0.5}
/>
```

### 3.4 Nouvelle Page City Detail

**Fichier : `app/(tabs)/trips/city/[cityId].tsx`**

Structure avec 3 onglets :
| Onglet | Contenu |
|--------|---------|
| **Highlights** | Liste des POIs avec filtres par catégorie |
| **Budget** | Composant CityBudgetCard (moyenne par catégorie) |
| **Pratique** | Réutiliser le composant existant |

#### Filtrage par catégorie (Highlights tab)

```typescript
const [selectedCategories, setSelectedCategories] = useState<HighlightCategory[]>([]);
// [] = toutes les catégories affichées

// Category filter chips (horizontal scroll)
<ScrollView horizontal className="py-2">
  {Object.entries(HIGHLIGHT_CATEGORIES).map(([key, config]) => (
    <TouchableOpacity
      key={key}
      onPress={() => toggleCategory(key as HighlightCategory)}
      className={`flex-row items-center px-3 py-1.5 mr-2 rounded-full ${
        selectedCategories.includes(key) || selectedCategories.length === 0
          ? `bg-${config.color}-500/20 border border-${config.color}-500`
          : 'bg-zinc-800 border border-zinc-700'
      }`}
    >
      <Icon name={config.icon} size={14} color={config.color} />
      <Text className="ml-1.5">{config.label}</Text>
      {/* Badge avec count */}
      <View className="ml-1.5 bg-zinc-700 px-1.5 rounded-full">
        <Text className="text-xs">{getCategoryCount(key)}</Text>
      </View>
    </TouchableOpacity>
  ))}
</ScrollView>

// Filtered highlights list
const filteredHighlights = useMemo(() => {
  if (selectedCategories.length === 0) return highlights;
  return highlights.filter(h => selectedCategories.includes(h.category));
}, [highlights, selectedCategories]);
```

#### Map avec filtrage par catégorie

```typescript
// Map header avec category chips (même UI que la liste)
<View className="absolute top-4 left-0 right-0 z-10 px-4">
  <ScrollView horizontal>
    {/* Same category chips as list */}
  </ScrollView>
</View>

// Markers colorés par catégorie
{filteredHighlights.map(highlight => (
  <Marker
    key={highlight.id}
    coordinate={{ latitude: highlight.latitude, longitude: highlight.longitude }}
  >
    <View className={`p-2 rounded-full bg-${HIGHLIGHT_CATEGORIES[highlight.category].color}-500`}>
      <Icon
        name={HIGHLIGHT_CATEGORIES[highlight.category].icon}
        size={16}
        color="white"
      />
    </View>
  </Marker>
))}

// Clustering avec supercluster
// Les clusters montrent le count et la couleur dominante
```

**Composants à créer :**
- `HighlightCard` - card avec icône catégorie colorée, nom, subtype, must-see badge
- `CategoryFilterChips` - composant réutilisable pour les filtres
- `CityBudgetCard` - affichage des moyennes par catégorie

### 3.5 Nouvelle Page City Review

**Fichier : `app/review/city/[cityId].tsx`**

Workflow :
1. Header avec titre, ville, vibe tags
2. **Merge banner** (si existing_city_match) : "Une city Paris existe déjà. Fusionner les highlights ?"
3. **Category summary** : badges montrant le count par catégorie
4. Panneau highlights :
   - **Drag & drop** pour réordonner (react-native-draggable-flatlist)
   - Édition individuelle (nom, catégorie dropdown, subtype, tips, must-see)
   - Toggle validated (exclu = supprimé au sync)
   - Icône catégorie colorée sur chaque card
5. Footer : "Sauvegarder X highlights"

```typescript
// Category summary in header
<View className="flex-row flex-wrap gap-2 mb-4">
  {Object.entries(HIGHLIGHT_CATEGORIES).map(([key, config]) => {
    const count = highlights.filter(h => h.category === key).length;
    if (count === 0) return null;
    return (
      <View key={key} className={`flex-row items-center px-2 py-1 rounded-full bg-${config.color}-500/20`}>
        <Icon name={config.icon} size={12} className={`text-${config.color}-400`} />
        <Text className={`ml-1 text-${config.color}-400`}>{count}</Text>
      </View>
    );
  })}
</View>

// Category dropdown in edit mode
<Select
  value={highlight.category}
  onValueChange={(value) => updateHighlight(highlight.id, { category: value })}
>
  {Object.entries(HIGHLIGHT_CATEGORIES).map(([key, config]) => (
    <SelectItem key={key} value={key}>
      <Icon name={config.icon} /> {config.label}
    </SelectItem>
  ))}
</Select>
```

### 3.6 AddTripModal Update

**Fichier : `components/AddTripModal.tsx`**

Ajouter sélecteur de type :
```typescript
const [entityTypeOverride, setEntityTypeOverride] = useState<'auto' | 'trip' | 'city'>('auto');

// UI - Segmented control style
<View className="flex-row gap-2 p-1 bg-zinc-800 rounded-lg">
  {[
    { value: 'auto', label: 'Auto', icon: 'Sparkles' },
    { value: 'trip', label: 'Trip', icon: 'Map' },
    { value: 'city', label: 'City', icon: 'Building2' },
  ].map(opt => (
    <TouchableOpacity
      key={opt.value}
      onPress={() => setEntityTypeOverride(opt.value)}
      className={`flex-1 py-2 rounded-md ${entityTypeOverride === opt.value ? 'bg-zinc-700' : ''}`}
    >
      <Icon name={opt.icon} />
      <Text>{opt.label}</Text>
    </TouchableOpacity>
  ))}
</View>
```

### 3.7 Inbox Update

**Fichier : `app/(tabs)/index.tsx`**

- Afficher badge entity_type sur chaque job
- **Preview City** : "Paris - 24 highlights"
- Router vers `/review/city/[cityId]` si entity_type === 'city'

```typescript
// Badge
<View className={`px-2 py-0.5 rounded ${
  job.entity_type === 'city' ? 'bg-purple-500/20' : 'bg-blue-500/20'
}`}>
  <Text className={job.entity_type === 'city' ? 'text-purple-400' : 'text-blue-400'}>
    {job.entity_type === 'city' ? 'City Guide' : 'Trip'}
  </Text>
</View>

// Preview text
{job.entity_type === 'city' && (
  <Text className="text-zinc-400">
    {job.city_name} - {job.highlights_count} highlights
  </Text>
)}

// Navigation
onPress={() => {
  if (job.entity_type === 'city') {
    router.push(`/review/city/${job.city_id}`);
  } else {
    router.push(`/review/${job.trip_id}`);
  }
}}
```

### 3.8 Analysis Service Update

**Fichier : `services/analysisService.ts`**

Ajouter paramètre `entityTypeOverride` :
```typescript
export async function analyzeVideoUrl(
  url: string,
  callbacks?: AnalysisCallbacks,
  userId?: string,
  useTestRoute = false,
  entityTypeOverride?: 'trip' | 'city',
)
```

---

## 4. Différenciation Visuelle

### Trip vs City

| Element | Trip | City |
|---------|------|------|
| Couleur accent | Bleu #3b82f6 | Violet #a855f7 |
| Icône header | Map (lucide) | Building2 (lucide) |
| Bordure carte | border-l-4 border-blue-500 | border-l-4 border-purple-500 |
| Badge | "Trip" bg-blue-500/20 | "City Guide" bg-purple-500/20 |
| Info secondaire | "X jours" | "X highlights" |

### Catégories de highlights

| Catégorie | Icône | Couleur | Marker Map |
|-----------|-------|---------|------------|
| food | Utensils | orange-500 | Cercle orange |
| culture | Landmark | blue-500 | Cercle bleu |
| nature | Trees | green-500 | Cercle vert |
| shopping | ShoppingBag | pink-500 | Cercle rose |
| nightlife | Moon | purple-500 | Cercle violet |
| other | MapPin | zinc-500 | Cercle gris |

**Usage des catégories :**
1. **HighlightCard** : icône colorée à gauche du nom
2. **Map markers** : cercle coloré avec icône blanche
3. **Filter chips** : badge avec icône + label + count
4. **Review summary** : badges colorés avec count par catégorie

---

## 5. Plan d'Implémentation

### Phase 1 : Foundation (Backend + Types)
- [ ] Migrations SQL (tables cities, highlights, budgets, saved)
- [ ] Endpoints API cities CRUD
- [ ] Endpoints API cities review + reorder
- [ ] Endpoint /saved unifié avec pagination
- [ ] Endpoint /cities/match pour merge detection
- [ ] Mise à jour /analyze/url avec entity_type_override
- [ ] Prompts IA (détection + extraction city avec categories)
- [ ] Types TypeScript (CityData, Highlight, VibeTag, HighlightCategory)

### Phase 2 : Services Frontend
- [ ] `services/cityService.ts`
- [ ] `services/cityReviewService.ts`
- [ ] `services/savedService.ts`
- [ ] Update `services/analysisService.ts`

### Phase 3 : Navigation & Liste Saved
- [ ] Renommer onglet Trips → Saved dans `_layout.tsx`
- [ ] Refactor `trips/index.tsx` avec filtres et EntityCard
- [ ] Implémenter infinite scroll (pagination 20 items)
- [ ] Créer `trips/city/_layout.tsx`

### Phase 4 : City Detail
- [ ] `app/(tabs)/trips/city/[cityId].tsx`
- [ ] Composant `CategoryFilterChips` (réutilisable)
- [ ] Composant `HighlightCard` avec icône catégorie
- [ ] Composant `CityBudgetCard`
- [ ] Map avec markers colorés par catégorie
- [ ] Clustering avec supercluster
- [ ] Filtrage highlights par catégorie (liste + map synced)

### Phase 5 : City Review
- [ ] `app/review/city/[cityId].tsx`
- [ ] Drag & drop highlights (react-native-draggable-flatlist)
- [ ] Category dropdown dans l'édition
- [ ] Category summary badges
- [ ] Merge banner et flow

### Phase 6 : Analyse Flow
- [ ] Update AddTripModal avec sélecteur type (segmented control)
- [ ] Update Inbox avec badge, preview count, et routing conditionnel

---

## 6. Fichiers Critiques

| Fichier | Action |
|---------|--------|
| `types/api.ts` | Ajouter CityData, Highlight, VibeTag, HighlightCategory, CityBudget, HIGHLIGHT_CATEGORIES |
| `services/analysisService.ts` | Ajouter param entityTypeOverride |
| `app/(tabs)/_layout.tsx` | Renommer tab Trips → Saved |
| `app/(tabs)/trips/index.tsx` | Refactor majeur : filtres + EntityCard + infinite scroll |
| `components/AddTripModal.tsx` | Ajouter sélecteur Auto/Trip/City |
| `app/(tabs)/index.tsx` | Badge entity_type + preview count + routing conditionnel |

**Nouveaux fichiers :**
- `services/cityService.ts`
- `services/cityReviewService.ts`
- `services/savedService.ts`
- `app/(tabs)/trips/city/[cityId].tsx`
- `app/(tabs)/trips/city/_layout.tsx`
- `app/review/city/[cityId].tsx`
- `components/city/HighlightCard.tsx`
- `components/city/CategoryFilterChips.tsx`
- `components/city/CityBudgetCard.tsx`

**Dépendances à ajouter :**
- `react-native-draggable-flatlist` (drag & drop)
- `supercluster` ou `react-native-map-clustering` (map clustering)

---

## 7. Vérification

### Tests manuels
1. **Analyse vidéo city** : Soumettre une vidéo "Top 10 restaurants Paris" → doit être détectée comme City
2. **Analyse vidéo trip** : Soumettre une vidéo "7 jours au Japon" → doit être détectée comme Trip
3. **Forcer le type** : Utiliser le sélecteur pour forcer City sur une vidéo ambiguë
4. **Liste Saved** : Vérifier que les filtres All/Trips/Cities fonctionnent
5. **Infinite scroll** : Vérifier le chargement progressif des items
6. **City Detail - Highlights** : Vérifier la liste avec icônes catégorie
7. **City Detail - Category filters** : Tester le filtrage par catégorie (chips)
8. **City Detail - Map** : Vérifier les markers colorés par catégorie
9. **City Detail - Map filters** : Vérifier que le filtre catégorie affecte aussi la map
10. **City Review - Drag & drop** : Réordonner les highlights
11. **City Review - Category edit** : Changer la catégorie d'un highlight
12. **City Review - Merge** : Tester le flow de merge avec une city existante
13. **Navigation** : Depuis Inbox → Review City → Save → City Detail

### Tests de régression
- Analyse trip fonctionne toujours
- Trip detail fonctionne toujours
- Trip review fonctionne toujours
- Saved trips apparaissent dans la liste unifiée

---

## 8. Backlog V2

Features reportées pour une version ultérieure :
- [ ] **Multi-city split** : Permettre de splitter les highlights vers plusieurs cities
- [ ] **Notes personnelles** : Ajouter des notes sur les cities sauvées
- [ ] **Filtrage par vibe tags** : Filtrer la liste Saved par vibe tags
- [ ] **Search highlights** : Recherche dans les highlights d'une city
- [ ] **Export** : Exporter une city en PDF ou partager
- [ ] **Category stats** : Analytics sur les catégories les plus sauvées
