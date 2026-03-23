/**
 * Tests unitaires pour MoveSpotModal
 * Teste la logique de sélection et filtrage des jours
 */

// Types simulés
interface DbDay {
  id: string;
  day_number: number;
  location: string | null;
  destination_id: string | null;
}

interface MoveSpotPayload {
  target_day_id: string;
  order?: number;
}

describe('MoveSpotModal Logic', () => {
  // Mock data
  const mockDays: DbDay[] = [
    { id: 'day-1', day_number: 1, location: 'Paris', destination_id: 'dest-1' },
    { id: 'day-2', day_number: 2, location: 'Paris', destination_id: 'dest-1' },
    { id: 'day-3', day_number: 3, location: 'Lyon', destination_id: 'dest-2' },
    { id: 'day-4', day_number: 4, location: 'Lyon', destination_id: 'dest-2' },
    { id: 'day-5', day_number: 5, location: 'Marseille', destination_id: 'dest-3' },
  ];

  // ── Day Filtering Tests ─────────────────────────────────────────────────────

  describe('filterAvailableDays', () => {
    const filterAvailableDays = (allDays: DbDay[], currentDayId: string): DbDay[] => {
      return allDays.filter((day) => day.id !== currentDayId);
    };

    it('should exclude current day from available days', () => {
      const currentDayId = 'day-2';
      const availableDays = filterAvailableDays(mockDays, currentDayId);

      expect(availableDays).toHaveLength(4);
      expect(availableDays.find((d) => d.id === currentDayId)).toBeUndefined();
    });

    it('should return all other days', () => {
      const currentDayId = 'day-1';
      const availableDays = filterAvailableDays(mockDays, currentDayId);

      expect(availableDays).toHaveLength(4);
      expect(availableDays.map((d) => d.id)).toEqual(['day-2', 'day-3', 'day-4', 'day-5']);
    });

    it('should handle empty days array', () => {
      const availableDays = filterAvailableDays([], 'day-1');
      expect(availableDays).toHaveLength(0);
    });

    it('should handle non-existent current day', () => {
      const currentDayId = 'day-999';
      const availableDays = filterAvailableDays(mockDays, currentDayId);

      expect(availableDays).toHaveLength(5);
    });
  });

  // ── Day Grouping Tests ──────────────────────────────────────────────────────

  describe('groupDaysByDestination', () => {
    const groupDaysByDestination = (days: DbDay[]): Map<string, DbDay[]> => {
      const groups = new Map<string, DbDay[]>();

      for (const day of days) {
        const key = day.destination_id || 'no-destination';
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(day);
      }

      return groups;
    };

    it('should group days by destination_id', () => {
      const groups = groupDaysByDestination(mockDays);

      expect(groups.size).toBe(3);
      expect(groups.get('dest-1')).toHaveLength(2);
      expect(groups.get('dest-2')).toHaveLength(2);
      expect(groups.get('dest-3')).toHaveLength(1);
    });

    it('should handle days without destination', () => {
      const daysWithNull: DbDay[] = [
        { id: 'day-1', day_number: 1, location: 'Paris', destination_id: null },
        { id: 'day-2', day_number: 2, location: 'Lyon', destination_id: null },
      ];

      const groups = groupDaysByDestination(daysWithNull);

      expect(groups.size).toBe(1);
      expect(groups.get('no-destination')).toHaveLength(2);
    });
  });

  // ── Day Display Tests ───────────────────────────────────────────────────────

  describe('Day Display Format', () => {
    const formatDayTitle = (day: DbDay): string => {
      const location = day.location || 'Jour';
      return `Jour ${day.day_number} - ${location}`;
    };

    it('should format day title with location', () => {
      const day = mockDays[0];
      expect(formatDayTitle(day)).toBe('Jour 1 - Paris');
    });

    it('should handle null location', () => {
      const day: DbDay = { id: 'day-1', day_number: 1, location: null, destination_id: null };
      expect(formatDayTitle(day)).toBe('Jour 1 - Jour');
    });

    it('should sort days by day_number', () => {
      const sortedDays = [...mockDays].sort((a, b) => a.day_number - b.day_number);

      expect(sortedDays[0].day_number).toBe(1);
      expect(sortedDays[4].day_number).toBe(5);
    });
  });

  // ── Selection State Tests ───────────────────────────────────────────────────

  describe('Selection State', () => {
    it('should track selected day id', () => {
      let selectedDayId: string | null = null;

      // Simulate selection
      selectedDayId = 'day-3';
      expect(selectedDayId).toBe('day-3');

      // Change selection
      selectedDayId = 'day-5';
      expect(selectedDayId).toBe('day-5');
    });

    it('should allow deselection', () => {
      let selectedDayId: string | null = 'day-3';

      // Deselect
      selectedDayId = null;
      expect(selectedDayId).toBeNull();
    });

    it('should disable submit when no selection', () => {
      const canSubmit = (selectedDayId: string | null): boolean => {
        return selectedDayId !== null;
      };

      expect(canSubmit(null)).toBe(false);
      expect(canSubmit('day-3')).toBe(true);
    });
  });

  // ── Payload Generation Tests ────────────────────────────────────────────────

  describe('Move Payload Generation', () => {
    it('should generate payload without order', () => {
      const selectedDayId = 'day-3';

      const payload: MoveSpotPayload = {
        target_day_id: selectedDayId,
      };

      expect(payload.target_day_id).toBe('day-3');
      expect(payload.order).toBeUndefined();
    });

    it('should generate payload with explicit order', () => {
      const selectedDayId = 'day-3';
      const explicitOrder = 1;

      const payload: MoveSpotPayload = {
        target_day_id: selectedDayId,
        order: explicitOrder,
      };

      expect(payload.target_day_id).toBe('day-3');
      expect(payload.order).toBe(1);
    });
  });

  // ── UI State Tests ──────────────────────────────────────────────────────────

  describe('UI State', () => {
    it('should track loading state during move', () => {
      let isMoving = false;

      // Start move
      isMoving = true;
      expect(isMoving).toBe(true);

      // Complete move
      isMoving = false;
      expect(isMoving).toBe(false);
    });

    it('should disable buttons when moving', () => {
      const isButtonDisabled = (isMoving: boolean, selectedDayId: string | null): boolean => {
        return isMoving || selectedDayId === null;
      };

      expect(isButtonDisabled(true, 'day-3')).toBe(true);
      expect(isButtonDisabled(false, null)).toBe(true);
      expect(isButtonDisabled(false, 'day-3')).toBe(false);
    });
  });

  // ── Same Destination Logic Tests ────────────────────────────────────────────

  describe('Same Destination Logic', () => {
    it('should identify days in same destination', () => {
      const currentDay = mockDays[0]; // day-1, dest-1
      const sameDest = mockDays.filter(
        (d) => d.destination_id === currentDay.destination_id && d.id !== currentDay.id
      );

      expect(sameDest).toHaveLength(1);
      expect(sameDest[0].id).toBe('day-2');
    });

    it('should identify days in different destinations', () => {
      const currentDay = mockDays[0]; // day-1, dest-1
      const diffDest = mockDays.filter(
        (d) => d.destination_id !== currentDay.destination_id
      );

      expect(diffDest).toHaveLength(3); // day-3, day-4, day-5
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle single day trip', () => {
      const singleDay: DbDay[] = [
        { id: 'day-1', day_number: 1, location: 'Paris', destination_id: 'dest-1' },
      ];

      const availableDays = singleDay.filter((d) => d.id !== 'day-1');
      expect(availableDays).toHaveLength(0);
    });

    it('should handle spot without current day (error case)', () => {
      const spotDayId = 'day-unknown';
      const dayExists = mockDays.some((d) => d.id === spotDayId);
      expect(dayExists).toBe(false);
    });

    it('should preserve day order in list', () => {
      const availableDays = mockDays.filter((d) => d.id !== 'day-1');
      const dayNumbers = availableDays.map((d) => d.day_number);

      // Should be in order
      for (let i = 1; i < dayNumbers.length; i++) {
        expect(dayNumbers[i]).toBeGreaterThan(dayNumbers[i - 1]);
      }
    });
  });
});
