/**
 * Tests unitaires pour SpotFormModal
 * Teste la logique du formulaire et les payloads générés
 *
 * IMPORTANT: Ces tests utilisent les constantes partagées de @/constants/spotTypes
 * pour garantir la cohérence avec le composant réel et la base de données.
 */

import { SpotUpdatePayload, CreateSpotPayload } from '@/services/reviewService';
import {
  CATEGORY_TO_SPOT_TYPE,
  SPOT_TYPE_TO_CATEGORY,
  VALID_SPOT_TYPES,
} from '@/constants/spotTypes';

// Mock des types utilisés par le composant
interface DbSpot {
  id: string;
  name: string;
  spot_type: string | null;
  address: string | null;
  duration_minutes: number | null;
  price_range: string | null;
  tips: string | null;
  highlight: boolean;
}

type HighlightCategory = 'food' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'other';

function getCategory(spotType: string | null): HighlightCategory {
  if (!spotType) return 'other';
  return SPOT_TYPE_TO_CATEGORY[spotType.toLowerCase()] || 'other';
}

describe('SpotFormModal Logic', () => {
  // ── Category Mapping Tests ────────────────────────────────────────────────

  describe('getCategory', () => {
    it('should return "food" for restaurant spot type', () => {
      expect(getCategory('restaurant')).toBe('food');
    });

    it('should return "food" for café spot type', () => {
      expect(getCategory('café')).toBe('food');
      expect(getCategory('cafe')).toBe('food');
    });

    it('should return "nightlife" for bar spot type', () => {
      expect(getCategory('bar')).toBe('nightlife');
      expect(getCategory('club')).toBe('nightlife');
    });

    it('should return "culture" for museum spot type', () => {
      expect(getCategory('museum')).toBe('culture');
      expect(getCategory('monument')).toBe('culture');
    });

    it('should return "nature" for park spot type', () => {
      expect(getCategory('park')).toBe('nature');
      expect(getCategory('garden')).toBe('nature');
    });

    it('should return "shopping" for shop spot type', () => {
      expect(getCategory('shop')).toBe('shopping');
      expect(getCategory('market')).toBe('shopping');
    });

    it('should return "other" for null spot type', () => {
      expect(getCategory(null)).toBe('other');
    });

    it('should return "other" for unknown spot type', () => {
      expect(getCategory('unknown')).toBe('other');
      expect(getCategory('xyz')).toBe('other');
    });

    it('should be case insensitive', () => {
      expect(getCategory('RESTAURANT')).toBe('food');
      expect(getCategory('Restaurant')).toBe('food');
      expect(getCategory('MUSEUM')).toBe('culture');
    });
  });

  // ── CATEGORY_TO_SPOT_TYPE Tests ─────────────────────────────────────────────

  describe('CATEGORY_TO_SPOT_TYPE', () => {
    it('should map food to restaurant', () => {
      expect(CATEGORY_TO_SPOT_TYPE['food']).toBe('restaurant');
    });

    it('should map culture to attraction (valid DB type)', () => {
      expect(CATEGORY_TO_SPOT_TYPE['culture']).toBe('attraction');
    });

    it('should map nature to activite (valid DB type)', () => {
      expect(CATEGORY_TO_SPOT_TYPE['nature']).toBe('activite');
    });

    it('should map shopping to shopping (valid DB type)', () => {
      expect(CATEGORY_TO_SPOT_TYPE['shopping']).toBe('shopping');
    });

    it('should map nightlife to bar', () => {
      expect(CATEGORY_TO_SPOT_TYPE['nightlife']).toBe('bar');
    });

    it('should map other to attraction (valid DB default)', () => {
      expect(CATEGORY_TO_SPOT_TYPE['other']).toBe('attraction');
    });
  });

  // ── Form Initialization Tests ───────────────────────────────────────────────

  describe('Form Initialization', () => {
    it('should initialize empty form for create mode', () => {
      const formState = {
        name: '',
        category: 'other' as HighlightCategory,
        address: '',
        tips: '',
        priceRange: '',
        durationMinutes: '',
        isHighlight: false,
      };

      expect(formState.name).toBe('');
      expect(formState.category).toBe('other');
      expect(formState.isHighlight).toBe(false);
    });

    it('should initialize form with spot data for edit mode', () => {
      const spot: DbSpot = {
        id: 'spot-123',
        name: 'Restaurant Test',
        spot_type: 'restaurant',
        address: '123 Rue Test',
        duration_minutes: 60,
        price_range: '15-25€',
        tips: 'Réserver',
        highlight: true,
      };

      const formState = {
        name: spot.name,
        category: getCategory(spot.spot_type),
        address: spot.address || '',
        tips: spot.tips || '',
        priceRange: spot.price_range || '',
        durationMinutes: spot.duration_minutes?.toString() || '',
        isHighlight: spot.highlight,
      };

      expect(formState.name).toBe('Restaurant Test');
      expect(formState.category).toBe('food');
      expect(formState.address).toBe('123 Rue Test');
      expect(formState.durationMinutes).toBe('60');
      expect(formState.isHighlight).toBe(true);
    });

    it('should handle null fields gracefully', () => {
      const spot: DbSpot = {
        id: 'spot-123',
        name: 'Spot Minimal',
        spot_type: null,
        address: null,
        duration_minutes: null,
        price_range: null,
        tips: null,
        highlight: false,
      };

      const formState = {
        name: spot.name,
        category: getCategory(spot.spot_type),
        address: spot.address || '',
        tips: spot.tips || '',
        priceRange: spot.price_range || '',
        durationMinutes: spot.duration_minutes?.toString() || '',
        isHighlight: spot.highlight,
      };

      expect(formState.category).toBe('other');
      expect(formState.address).toBe('');
      expect(formState.durationMinutes).toBe('');
    });
  });

  // ── Payload Generation Tests (Create Mode) ─────────────────────────────────

  describe('Create Payload Generation', () => {
    it('should generate correct CreateSpotPayload', () => {
      const formState = {
        name: 'Nouveau Restaurant',
        category: 'food' as HighlightCategory,
        address: '123 Rue Test',
        tips: 'Bon spot',
        priceRange: '20-30€',
        durationMinutes: '90',
        isHighlight: true,
      };

      const payload: Omit<CreateSpotPayload, 'day_id'> = {
        name: formState.name.trim(),
        spot_type: CATEGORY_TO_SPOT_TYPE[formState.category],
        address: formState.address.trim() || undefined,
        tips: formState.tips.trim() || undefined,
        price_range: formState.priceRange.trim() || undefined,
        duration_minutes: formState.durationMinutes ? parseInt(formState.durationMinutes, 10) : undefined,
        highlight: formState.isHighlight,
      };

      expect(payload.name).toBe('Nouveau Restaurant');
      expect(payload.spot_type).toBe('restaurant');
      expect(payload.address).toBe('123 Rue Test');
      expect(payload.duration_minutes).toBe(90);
      expect(payload.highlight).toBe(true);
    });

    it('should use undefined for empty optional fields', () => {
      const formState = {
        name: 'Spot Minimal',
        category: 'other' as HighlightCategory,
        address: '',
        tips: '',
        priceRange: '',
        durationMinutes: '',
        isHighlight: false,
      };

      const payload: Omit<CreateSpotPayload, 'day_id'> = {
        name: formState.name.trim(),
        spot_type: CATEGORY_TO_SPOT_TYPE[formState.category],
        address: formState.address.trim() || undefined,
        tips: formState.tips.trim() || undefined,
        price_range: formState.priceRange.trim() || undefined,
        duration_minutes: formState.durationMinutes ? parseInt(formState.durationMinutes, 10) : undefined,
        highlight: formState.isHighlight,
      };

      expect(payload.address).toBeUndefined();
      expect(payload.tips).toBeUndefined();
      expect(payload.price_range).toBeUndefined();
      expect(payload.duration_minutes).toBeUndefined();
    });
  });

  // ── Payload Generation Tests (Edit Mode) ───────────────────────────────────

  describe('Update Payload Generation', () => {
    it('should generate correct SpotUpdatePayload', () => {
      const formState = {
        name: 'Restaurant Modifié',
        category: 'food' as HighlightCategory,
        address: '456 Avenue Test',
        tips: 'Nouveau tip',
        priceRange: '30-40€',
        durationMinutes: '120',
        isHighlight: false,
      };

      const payload: SpotUpdatePayload = {
        name: formState.name.trim(),
        spot_type: CATEGORY_TO_SPOT_TYPE[formState.category],
        address: formState.address.trim() || null,
        tips: formState.tips.trim() || null,
        price_range: formState.priceRange.trim() || null,
        duration_minutes: formState.durationMinutes ? parseInt(formState.durationMinutes, 10) : null,
        highlight: formState.isHighlight,
      };

      expect(payload.name).toBe('Restaurant Modifié');
      expect(payload.duration_minutes).toBe(120);
    });

    it('should use null for empty optional fields (not undefined)', () => {
      const formState = {
        name: 'Spot',
        category: 'other' as HighlightCategory,
        address: '',
        tips: '',
        priceRange: '',
        durationMinutes: '',
        isHighlight: false,
      };

      const payload: SpotUpdatePayload = {
        name: formState.name.trim(),
        spot_type: CATEGORY_TO_SPOT_TYPE[formState.category],
        address: formState.address.trim() || null,
        tips: formState.tips.trim() || null,
        price_range: formState.priceRange.trim() || null,
        duration_minutes: formState.durationMinutes ? parseInt(formState.durationMinutes, 10) : null,
        highlight: formState.isHighlight,
      };

      expect(payload.address).toBeNull();
      expect(payload.tips).toBeNull();
      expect(payload.price_range).toBeNull();
      expect(payload.duration_minutes).toBeNull();
    });
  });

  // ── Validation Tests ────────────────────────────────────────────────────────

  describe('Form Validation', () => {
    it('should require non-empty name', () => {
      const canSubmit = (name: string) => name.trim().length > 0;

      expect(canSubmit('')).toBe(false);
      expect(canSubmit('   ')).toBe(false);
      expect(canSubmit('Test')).toBe(true);
      expect(canSubmit('  Test  ')).toBe(true);
    });

    it('should parse duration as integer', () => {
      const parseDuration = (value: string): number | null => {
        return value ? parseInt(value, 10) : null;
      };

      expect(parseDuration('60')).toBe(60);
      expect(parseDuration('90')).toBe(90);
      expect(parseDuration('')).toBeNull();
      expect(parseDuration('30.5')).toBe(30); // parseInt truncates
    });

    it('should trim whitespace from text fields', () => {
      const trim = (value: string) => value.trim();

      expect(trim('  Test  ')).toBe('Test');
      expect(trim('Test')).toBe('Test');
      expect(trim('')).toBe('');
    });
  });

  // ── Category Selection Tests ────────────────────────────────────────────────

  describe('Category Selection', () => {
    it('should have all 6 categories available', () => {
      const categories: HighlightCategory[] = ['food', 'culture', 'nature', 'shopping', 'nightlife', 'other'];
      expect(categories).toHaveLength(6);
    });

    it('should change spot_type when category changes', () => {
      let category: HighlightCategory = 'food';
      expect(CATEGORY_TO_SPOT_TYPE[category]).toBe('restaurant');

      category = 'culture';
      expect(CATEGORY_TO_SPOT_TYPE[category]).toBe('attraction');

      category = 'nightlife';
      expect(CATEGORY_TO_SPOT_TYPE[category]).toBe('bar');
    });
  });

  // ── Shared Constants Validation ─────────────────────────────────────────────

  describe('Shared Constants (DB Consistency)', () => {
    /**
     * Ces tests vérifient que les constantes partagées sont cohérentes
     * avec les valeurs attendues par la base de données PostgreSQL.
     *
     * Si ces tests échouent après un changement dans @/constants/spotTypes,
     * il faut vérifier que la DB a aussi été mise à jour.
     */

    it('VALID_SPOT_TYPES should contain exactly the DB enum values', () => {
      const expectedDbValues = [
        'attraction',
        'restaurant',
        'bar',
        'hotel',
        'activite',
        'transport',
        'shopping',
      ];

      expect(VALID_SPOT_TYPES).toEqual(expect.arrayContaining(expectedDbValues));
      expect(VALID_SPOT_TYPES.length).toBe(expectedDbValues.length);
    });

    it('CATEGORY_TO_SPOT_TYPE should only return valid DB values', () => {
      const categories: HighlightCategory[] = ['food', 'culture', 'nature', 'shopping', 'nightlife', 'other'];

      for (const category of categories) {
        const spotType = CATEGORY_TO_SPOT_TYPE[category];
        expect(VALID_SPOT_TYPES).toContain(spotType);
      }
    });

    it('should not map any category to "other" (invalid DB value)', () => {
      const categories: HighlightCategory[] = ['food', 'culture', 'nature', 'shopping', 'nightlife', 'other'];

      for (const category of categories) {
        const spotType = CATEGORY_TO_SPOT_TYPE[category];
        expect(spotType).not.toBe('other'); // "other" n'est pas une valeur DB valide
      }
    });
  });
});
