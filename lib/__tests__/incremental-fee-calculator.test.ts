/**
 * Unit Tests for Incremental Fee Calculator
 * 
 * Tests cover:
 * - First/second/third/extra solos
 * - Duet/trio/group entries
 * - Registration fee charging logic
 * - Combinations with registration paid/unpaid
 */

import { computeIncrementalFee, markRegistrationCharged, isRegistrationCharged } from '../incremental-fee-calculator';
import { getSql } from '../database';

// Mock database functions
jest.mock('../database', () => ({
  getSql: jest.fn()
}));

describe('Incremental Fee Calculator', () => {
  const mockEventId = 'event-123';
  const mockDancerId = 'dancer-123';
  const mockEodsaId = 'E123456';
  const mockEventConfig = {
    registrationFeePerDancer: 300,
    solo1Fee: 400,
    solo2Fee: 750,
    solo3Fee: 1050,
    soloAdditionalFee: 100,
    duoTrioFeePerDancer: 280,
    groupFeePerDancer: 220,
    largeGroupFeePerDancer: 190,
    currency: 'ZAR'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Solo Entry Fees', () => {
    it('should charge registration + first solo fee for first solo entry', async () => {
      const mockSql = {
        async query(query: any) {
          // No existing entries, registration not charged
          if (query.includes('registration_charged_flags')) {
            return [{ count: 0 }];
          }
          if (query.includes('event_entries')) {
            return [{ count: 0 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Solo',
        participantIds: [mockEodsaId],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(300);
      expect(result.entryFee).toBe(400);
      expect(result.totalFee).toBe(700);
      expect(result.registrationCharged).toBe(true);
      expect(result.registrationWasAlreadyCharged).toBe(false);
      expect(result.entryCount).toBe(0);
    });

    it('should charge only incremental fee for second solo (no registration)', async () => {
      const mockSql = {
        async query(query: any) {
          // Registration already charged, 1 existing solo entry
          if (query.includes('registration_charged_flags')) {
            return [{ count: 1 }];
          }
          if (query.includes('event_entries') && query.includes('Solo')) {
            return [{ count: 1 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Solo',
        participantIds: [mockEodsaId],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(0);
      expect(result.entryFee).toBe(350); // 750 - 400 = 350
      expect(result.totalFee).toBe(350);
      expect(result.registrationCharged).toBe(false);
      expect(result.registrationWasAlreadyCharged).toBe(true);
      expect(result.entryCount).toBe(1);
    });

    it('should charge only incremental fee for third solo', async () => {
      const mockSql = {
        async query(query: any) {
          if (query.includes('registration_charged_flags')) {
            return [{ count: 1 }];
          }
          if (query.includes('event_entries') && query.includes('Solo')) {
            return [{ count: 2 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Solo',
        participantIds: [mockEodsaId],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(0);
      expect(result.entryFee).toBe(300); // 1050 - 750 = 300
      expect(result.totalFee).toBe(300);
      expect(result.entryCount).toBe(2);
    });

    it('should charge additional solo fee for 4th+ solos', async () => {
      const mockSql = {
        async query(query: any) {
          if (query.includes('registration_charged_flags')) {
            return [{ count: 1 }];
          }
          if (query.includes('event_entries') && query.includes('Solo')) {
            return [{ count: 3 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Solo',
        participantIds: [mockEodsaId],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(0);
      expect(result.entryFee).toBe(100); // Additional solo fee
      expect(result.totalFee).toBe(100);
      expect(result.entryCount).toBe(3);
    });
  });

  describe('Duet/Trio/Group Entry Fees', () => {
    it('should charge registration + duet fee for first duet entry', async () => {
      const mockSql = {
        async query(query: any) {
          if (query.includes('registration_charged_flags')) {
            return [{ count: 0 }];
          }
          if (query.includes('event_entries')) {
            return [{ count: 0 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Duet',
        participantIds: [mockEodsaId, 'E654321'],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(300);
      expect(result.entryFee).toBe(560); // 280 * 2 participants
      expect(result.totalFee).toBe(860);
      expect(result.registrationCharged).toBe(true);
    });

    it('should charge only duet fee for subsequent duet (registration already charged)', async () => {
      const mockSql = {
        async query(query: any) {
          if (query.includes('registration_charged_flags')) {
            return [{ count: 1 }];
          }
          if (query.includes('event_entries') && query.includes('Duet')) {
            return [{ count: 1 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Duet',
        participantIds: [mockEodsaId, 'E654321'],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(0);
      expect(result.entryFee).toBe(560);
      expect(result.totalFee).toBe(560);
      expect(result.registrationWasAlreadyCharged).toBe(true);
    });

    it('should charge group fee per participant', async () => {
      const mockSql = {
        async query(query: any) {
          if (query.includes('registration_charged_flags')) {
            return [{ count: 1 }];
          }
          if (query.includes('event_entries') && query.includes('Group')) {
            return [{ count: 0 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Group',
        participantIds: ['E111111', 'E222222', 'E333333', 'E444444'],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(0);
      expect(result.entryFee).toBe(880); // 220 * 4 participants
      expect(result.totalFee).toBe(880);
    });
  });

  describe('Registration Fee Logic', () => {
    it('should NOT charge registration if already charged (even if not paid)', async () => {
      const mockSql = {
        async query(query: any) {
          // Registration was CHARGED (in registration_charged_flags table)
          if (query.includes('registration_charged_flags')) {
            return [{ count: 1 }];
          }
          if (query.includes('event_entries')) {
            return [{ count: 0 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Solo',
        participantIds: [mockEodsaId],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(0);
      expect(result.registrationWasAlreadyCharged).toBe(true);
    });

    it('should charge registration if no existing entries for this event', async () => {
      const mockSql = {
        async query(query: any) {
          if (query.includes('registration_charged_flags')) {
            return [{ count: 0 }];
          }
          if (query.includes('event_entries')) {
            return [{ count: 0 }];
          }
          if (query.includes('events')) {
            return [mockEventConfig];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Solo',
        participantIds: [mockEodsaId],
        masteryLevel: 'Water'
      });

      expect(result.registrationFee).toBe(300);
      expect(result.registrationCharged).toBe(true);
    });
  });

  describe('Negative Fee Protection', () => {
    it('should never return negative fees', async () => {
      // This test would require mocking a scenario that produces negative fees
      // The function should correct to zero and add a warning
      const mockSql = {
        async query(query: any) {
          if (query.includes('events')) {
            return [{
              ...mockEventConfig,
              solo1Fee: -100 // Invalid config that would produce negative
            }];
          }
          return [];
        }
      };

      (getSql as jest.Mock).mockReturnValue(mockSql);

      const result = await computeIncrementalFee({
        eventId: mockEventId,
        dancerId: mockDancerId,
        eodsaId: mockEodsaId,
        performanceType: 'Solo',
        participantIds: [mockEodsaId],
        masteryLevel: 'Water'
      });

      expect(result.totalFee).toBeGreaterThanOrEqual(0);
      if (result.totalFee < 0) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });
});

