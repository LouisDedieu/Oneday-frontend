/**
 * Tests unitaires pour reviewService.ts
 * Couvre les fonctions CRUD pour spots et destinations
 */

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token-123' } },
      }),
    },
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import après les mocks
import {
  createSpot,
  reorderSpots,
  moveSpotToDay,
  updateDestination,
  CreateSpotPayload,
  ReorderSpotsPayload,
  MoveSpotPayload,
  UpdateDestinationPayload,
} from '@/services/reviewService';

describe('reviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // ── createSpot Tests ────────────────────────────────────────────────────────

  describe('createSpot', () => {
    const mockTripId = 'trip-123';
    const mockPayload: CreateSpotPayload = {
      day_id: 'day-456',
      name: 'Restaurant Test',
      spot_type: 'restaurant',
      address: '123 Rue Test',
      duration_minutes: 60,
      price_range: '15-25€',
      tips: 'Réserver à l\'avance',
      highlight: true,
    };

    it('should call the correct endpoint with POST method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'spot-new-123',
          name: 'Restaurant Test',
          day_id: 'day-456',
        }),
      });

      await createSpot(mockTripId, mockPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/trips/${mockTripId}/spots`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockPayload),
        })
      );
    });

    it('should include authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'spot-new-123', name: 'Test', day_id: 'day-456' }),
      });

      await createSpot(mockTripId, mockPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should return CreateSpotResult on success', async () => {
      const expectedResult = {
        id: 'spot-new-123',
        name: 'Restaurant Test',
        day_id: 'day-456',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(expectedResult),
      });

      const result = await createSpot(mockTripId, mockPayload);

      expect(result).toEqual(expectedResult);
      expect(result.id).toBe('spot-new-123');
      expect(result.name).toBe('Restaurant Test');
      expect(result.day_id).toBe('day-456');
    });

    it('should handle minimal payload (only required fields)', async () => {
      const minimalPayload: CreateSpotPayload = {
        day_id: 'day-456',
        name: 'Spot Minimal',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'spot-min', name: 'Spot Minimal', day_id: 'day-456' }),
      });

      await createSpot(mockTripId, minimalPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(minimalPayload),
        })
      );
    });

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error_code: 'DAY_NOT_FOUND',
          message: 'Jour introuvable',
        }),
      });

      await expect(createSpot(mockTripId, mockPayload)).rejects.toThrow();
    });
  });

  // ── reorderSpots Tests ──────────────────────────────────────────────────────

  describe('reorderSpots', () => {
    const mockDayId = 'day-123';
    const mockPayload: ReorderSpotsPayload = {
      spots: [
        { id: 'spot-1', order: 1 },
        { id: 'spot-2', order: 2 },
        { id: 'spot-3', order: 3 },
      ],
    };

    it('should call the correct endpoint with PATCH method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reordered: true }),
      });

      await reorderSpots(mockDayId, mockPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/trips/days/${mockDayId}/spots/reorder`),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(mockPayload),
        })
      );
    });

    it('should handle empty spots array', async () => {
      const emptyPayload: ReorderSpotsPayload = { spots: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reordered: true }),
      });

      await reorderSpots(mockDayId, emptyPayload);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should not return a value (void)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reordered: true }),
      });

      const result = await reorderSpots(mockDayId, mockPayload);

      expect(result).toBeUndefined();
    });

    it('should handle ownership error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error_code: 'DAY_NOT_FOUND',
          message: 'Jour introuvable',
        }),
      });

      await expect(reorderSpots(mockDayId, mockPayload)).rejects.toThrow();
    });

    it('should handle spots not in day error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error_code: 'SPOT_NOT_FOUND',
          message: 'Spots introuvables dans ce jour',
        }),
      });

      await expect(reorderSpots(mockDayId, mockPayload)).rejects.toThrow();
    });
  });

  // ── moveSpotToDay Tests ─────────────────────────────────────────────────────

  describe('moveSpotToDay', () => {
    const mockSpotId = 'spot-123';

    it('should call the correct endpoint with PATCH method', async () => {
      const payload: MoveSpotPayload = { target_day_id: 'day-456' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ moved: true }),
      });

      await moveSpotToDay(mockSpotId, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/trips/spots/${mockSpotId}/move`),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      );
    });

    it('should handle payload with explicit order', async () => {
      const payload: MoveSpotPayload = { target_day_id: 'day-456', order: 5 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ moved: true }),
      });

      await moveSpotToDay(mockSpotId, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(payload),
        })
      );
    });

    it('should not return a value (void)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ moved: true }),
      });

      const result = await moveSpotToDay(mockSpotId, { target_day_id: 'day-456' });

      expect(result).toBeUndefined();
    });

    it('should handle spot not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error_code: 'SPOT_NOT_FOUND',
          message: 'Spot introuvable',
        }),
      });

      await expect(
        moveSpotToDay(mockSpotId, { target_day_id: 'day-456' })
      ).rejects.toThrow();
    });

    it('should handle target day not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error_code: 'DAY_NOT_FOUND',
          message: 'Jour cible introuvable',
        }),
      });

      await expect(
        moveSpotToDay(mockSpotId, { target_day_id: 'invalid-day' })
      ).rejects.toThrow();
    });

    it('should handle cross-trip move error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error_code: 'INVALID_REQUEST',
          message: 'Le jour cible doit faire partie du même trip',
        }),
      });

      await expect(
        moveSpotToDay(mockSpotId, { target_day_id: 'day-other-trip' })
      ).rejects.toThrow();
    });
  });

  // ── updateDestination Tests ─────────────────────────────────────────────────

  describe('updateDestination', () => {
    const mockDestId = 'dest-123';

    it('should call the correct endpoint with PATCH method', async () => {
      const payload: UpdateDestinationPayload = { city_name: 'Paris' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      });

      await updateDestination(mockDestId, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/trips/destinations/${mockDestId}`),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      );
    });

    it('should handle city_name only update', async () => {
      const payload: UpdateDestinationPayload = { city_name: 'Lyon' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      });

      await updateDestination(mockDestId, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ city_name: 'Lyon' }),
        })
      );
    });

    it('should handle country only update', async () => {
      const payload: UpdateDestinationPayload = { country: 'France' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      });

      await updateDestination(mockDestId, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ country: 'France' }),
        })
      );
    });

    it('should handle both fields update', async () => {
      const payload: UpdateDestinationPayload = { city_name: 'Marseille', country: 'France' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      });

      await updateDestination(mockDestId, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(payload),
        })
      );
    });

    it('should not return a value (void)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      });

      const result = await updateDestination(mockDestId, { city_name: 'Test' });

      expect(result).toBeUndefined();
    });

    it('should handle destination not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error_code: 'DESTINATION_NOT_FOUND',
          message: 'Destination introuvable',
        }),
      });

      await expect(
        updateDestination(mockDestId, { city_name: 'Test' })
      ).rejects.toThrow();
    });
  });

  // ── Payload Type Tests ──────────────────────────────────────────────────────

  describe('Payload Types', () => {
    it('CreateSpotPayload should have correct shape', () => {
      const payload: CreateSpotPayload = {
        day_id: 'day-123',
        name: 'Test',
        spot_type: 'restaurant',
        address: '123 Rue Test',
        duration_minutes: 60,
        price_range: '15€',
        tips: 'Tips',
        highlight: true,
        latitude: 48.8566,
        longitude: 2.3522,
      };

      expect(payload.day_id).toBeDefined();
      expect(payload.name).toBeDefined();
      expect(typeof payload.highlight).toBe('boolean');
    });

    it('ReorderSpotsPayload should have spots array', () => {
      const payload: ReorderSpotsPayload = {
        spots: [
          { id: 'spot-1', order: 1 },
          { id: 'spot-2', order: 2 },
        ],
      };

      expect(Array.isArray(payload.spots)).toBe(true);
      expect(payload.spots[0]).toHaveProperty('id');
      expect(payload.spots[0]).toHaveProperty('order');
    });

    it('MoveSpotPayload should have target_day_id', () => {
      const payload: MoveSpotPayload = {
        target_day_id: 'day-456',
        order: 3,
      };

      expect(payload.target_day_id).toBeDefined();
      expect(payload.order).toBe(3);
    });

    it('UpdateDestinationPayload fields should be optional', () => {
      const cityOnly: UpdateDestinationPayload = { city_name: 'Paris' };
      const countryOnly: UpdateDestinationPayload = { country: 'France' };
      const both: UpdateDestinationPayload = { city_name: 'Lyon', country: 'France' };
      const empty: UpdateDestinationPayload = {};

      expect(cityOnly.city_name).toBe('Paris');
      expect(cityOnly.country).toBeUndefined();
      expect(countryOnly.country).toBe('France');
      expect(both.city_name).toBe('Lyon');
      expect(Object.keys(empty).length).toBe(0);
    });
  });

  // ── Error Response Tests ────────────────────────────────────────────────────

  describe('Error Response Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        createSpot('trip-123', { day_id: 'day-456', name: 'Test' })
      ).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error_code: 'NOT_AUTHENTICATED',
          message: 'Non authentifié',
        }),
      });

      await expect(
        createSpot('trip-123', { day_id: 'day-456', name: 'Test' })
      ).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error_code: 'SERVICE_UNAVAILABLE',
          message: 'Service indisponible',
        }),
      });

      await expect(
        reorderSpots('day-123', { spots: [] })
      ).rejects.toThrow();
    });
  });
});
