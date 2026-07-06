import { describe, it, expect } from 'vitest';
import {
  extractBudget,
  extractBudgetRange,
  extractPreferredBrand,
  extractPreferredBodyType,
  extractPreferredVisitTime,
  extractCustomerPreferences,
  formatBudgetForDisplay,
} from './customerMemoryExtractor';

describe('customerMemoryExtractor', () => {
  describe('extractBudget', () => {
    it('extracts explicit budget "預算30萬"', () => {
      expect(extractBudget('預算30萬')).toBe(3000000);
    });

    it('extracts budget "30萬"', () => {
      expect(extractBudget('我的預算30萬')).toBe(3000000);
    });

    it('extracts budget with "萬"', () => {
      expect(extractBudget('50萬以內')).toBe(5000000);
    });

    it('extracts budget with "万" (simplified)', () => {
      expect(extractBudget('預算30万')).toBe(3000000);
    });

    it('returns undefined for questions "多少錢"', () => {
      expect(extractBudget('多少錢')).toBeUndefined();
      expect(extractBudget('價格多少')).toBeUndefined();
      expect(extractBudget('預算多少')).toBeUndefined();
    });

    it('returns undefined for range statements', () => {
      expect(extractBudget('30到50萬')).toBeUndefined();
    });

    it('handles 100萬', () => {
      expect(extractBudget('100萬')).toBe(10000000);
    });
  });

  describe('extractBudgetRange', () => {
    it('extracts "30到50萬"', () => {
      expect(extractBudgetRange('30到50萬')).toBe('30-50');
    });

    it('extracts "30-50萬"', () => {
      expect(extractBudgetRange('30-50萬')).toBe('30-50');
    });

    it('extracts "30~50萬"', () => {
      expect(extractBudgetRange('30~50萬')).toBe('30-50');
    });

    it('returns undefined if no range', () => {
      expect(extractBudgetRange('30萬')).toBeUndefined();
    });
  });

  describe('extractPreferredBrand', () => {
    it('extracts single brand "想買Toyota"', () => {
      expect(extractPreferredBrand('我想買Toyota')).toContain('Toyota');
    });

    it('extracts multiple brands "Honda 或 Toyota"', () => {
      const result = extractPreferredBrand('我有興趣 Honda 或 Toyota');
      expect(result).toContain('Honda');
      expect(result).toContain('Toyota');
    });

    it('extracts Chinese brand names', () => {
      const result = extractPreferredBrand('我喜歡豐田和本田');
      expect(result).toBeTruthy();
      expect(result).toContain('Toyota');
      expect(result).toContain('Honda');
    });

    it('case-insensitive', () => {
      const result = extractPreferredBrand('我想要toyota或honda');
      expect(result?.toLowerCase()).toContain('toyota');
      expect(result?.toLowerCase()).toContain('honda');
    });

    it('returns undefined if no preference keyword', () => {
      expect(extractPreferredBrand('Toyota 的怎麼樣')).toBeUndefined();
    });

    it('returns undefined if no brand mentioned', () => {
      expect(extractPreferredBrand('我想買個車')).toBeUndefined();
    });
  });

  describe('extractPreferredBodyType', () => {
    it('extracts "想買SUV"', () => {
      expect(extractPreferredBodyType('我想買SUV')).toBe('SUV');
    });

    it('extracts "喜歡轎車"', () => {
      expect(extractPreferredBodyType('我喜歡轎車')).toBe('轎車');
    });

    it('extracts "要MPV"', () => {
      expect(extractPreferredBodyType('我要MPV')).toBe('MPV');
    });

    it('returns undefined without preference keyword', () => {
      expect(extractPreferredBodyType('SUV 都很貴')).toBeUndefined();
    });

    it('returns undefined if no body type mentioned', () => {
      expect(extractPreferredBodyType('我想買個車')).toBeUndefined();
    });
  });

  describe('extractPreferredVisitTime', () => {
    it('extracts "週末下午"', () => {
      const result = extractPreferredVisitTime('什麼時候方便週末下午');
      expect(result).toBeTruthy();
      expect(result).toMatch(/週末|下午/);
    });

    it('extracts from urgency context "過年前"', () => {
      const result = extractPreferredVisitTime('我急著過年前要車');
      expect(result).toBeTruthy();
      expect(result).toBe('過年前');
    });

    it('returns undefined without time context', () => {
      expect(extractPreferredVisitTime('下午很熱')).toBeUndefined();
    });
  });

  describe('extractCustomerPreferences', () => {
    it('extracts all preferences from one message', () => {
      const result = extractCustomerPreferences('我想買Toyota SUV，預算50萬，什麼時候週末下午方便');
      expect(result.budget).toBe(5000000);
      expect(result.preferredBrand).toContain('Toyota');
      expect(result.preferredBodyType).toBe('SUV');
      expect(result.preferredVisitTime).toBeTruthy();
      expect(result.preferredVisitTime).toMatch(/週末|下午/);
    });

    it('handles message with only budget', () => {
      const result = extractCustomerPreferences('預算30萬');
      expect(result.budget).toBe(3000000);
      expect(result.preferredBrand).toBeUndefined();
    });
  });

  describe('formatBudgetForDisplay', () => {
    it('formats 3000000 to "30萬"', () => {
      expect(formatBudgetForDisplay(3000000)).toBe('30萬');
    });

    it('formats 0 to ""', () => {
      expect(formatBudgetForDisplay(0)).toBe('');
    });

    it('formats null to ""', () => {
      expect(formatBudgetForDisplay(null)).toBe('');
    });

    it('formats undefined to ""', () => {
      expect(formatBudgetForDisplay(undefined)).toBe('');
    });

    it('rounds 3100000 to "31萬"', () => {
      expect(formatBudgetForDisplay(3100000)).toBe('31萬');
    });
  });
});
