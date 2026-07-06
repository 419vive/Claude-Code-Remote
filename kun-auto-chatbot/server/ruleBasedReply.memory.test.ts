/**
 * Tests for customer memory re-ask gating in rule-based replies
 *
 * Verifies that when customer preferences are already known,
 * the chatbot doesn't re-ask the same questions.
 *
 * Example:
 * - Customer says: "預算30萬" → extracted and stored
 * - Customer later says: "想看車" → should NOT ask "預算大概在多少呢" again
 * - Instead should say: "根據你的預算30萬，我幫你看看有什麼適合的車款"
 */

import { describe, it, expect } from 'vitest';
import { generateRuleBasedReply, type RuleContext } from './ruleBasedReply';

const baseContext: Omit<RuleContext, 'userMessage'> = {
  greeting: '大哥',
  detection: {
    type: 'none',
    vehicle: null,
    questionType: 'general',
    directAnswer: '',
  },
  intents: [],
  customerContact: null,
  leadScore: 0,
};

describe('ruleBasedReply - Customer Memory Re-ask Gating', () => {
  describe('Budget gating', () => {
    it('asks for budget when not known', () => {
      const ctx: RuleContext = {
        userMessage: '預算多少',
        ...baseContext,
        intents: ['budget'],
      };
      const reply = generateRuleBasedReply(ctx);
      expect(reply).toContain('預算');
      expect(reply).not.toContain('根據你的預算');
    });

    it('skips budget question when budget is known', () => {
      const ctx: RuleContext = {
        userMessage: '預算多少',
        ...baseContext,
        intents: ['budget'],
        customerBudget: 3000000, // 30萬
      };
      const reply = generateRuleBasedReply(ctx);
      expect(reply).toContain('根據你的預算');
      expect(reply).toContain('30萬'); // Should reference the known budget
      expect(reply).not.toContain('預算大概在多少');
    });

    it('skips budget question when budget range is known', () => {
      const ctx: RuleContext = {
        userMessage: '預算多少',
        ...baseContext,
        intents: ['budget'],
        customerBudgetRange: '30-50',
      };
      const reply = generateRuleBasedReply(ctx);
      expect(reply).toContain('根據你的預算');
      expect(reply).toContain('30-50'); // Should reference the known budget range
    });

    it('acknowledges budget in dedicated budget intent', () => {
      const ctx: RuleContext = {
        userMessage: '預算多少',
        ...baseContext,
        intents: ['budget'],
        customerBudget: 3000000,
      };
      const reply = generateRuleBasedReply(ctx);
      expect(reply).toContain('根據你的預算');
      expect(reply).toContain('30萬');
    });
  });

  describe('Brand preference gating', () => {
    it('asks for brand and budget in generic inquiry', () => {
      const ctx: RuleContext = {
        userMessage: '推薦一下',
        ...baseContext,
        intents: [],
      };
      const reply = generateRuleBasedReply(ctx);
      // Should mention asking about preferences
      expect(reply).toMatch(/預算|品牌/);
    });

    it('skips budget question when multiple preferences are known', () => {
      const ctx: RuleContext = {
        userMessage: '推薦一下',
        ...baseContext,
        intents: [],
        customerBudget: 3000000, // 30萬
        customerPreferredBrand: 'Honda,Toyota',
      };
      const reply = generateRuleBasedReply(ctx);
      // When 2+ preferences known, should provide filtered suggestions
      expect(reply).toContain('Honda');
      expect(reply).toContain('Toyota');
    });

    it('mentions known brand preference when budget also known', () => {
      const ctx: RuleContext = {
        userMessage: '推薦一下',
        ...baseContext,
        intents: [],
        customerBudget: 3000000,
        customerPreferredBrand: 'Toyota',
      };
      const reply = generateRuleBasedReply(ctx);
      // With both budget and brand known, should reference both
      expect(reply).toContain('Toyota');
      expect(reply).toContain('根據');
    });
  });

  describe('Visit time gating', () => {
    it('asks for time slot when not known', () => {
      const ctx: RuleContext = {
        userMessage: '看車',
        ...baseContext,
        intents: ['visit'],
        customerContact: '0912345678',
      };
      const reply = generateRuleBasedReply(ctx);
      expect(reply).toContain('哪個時段');
      expect(reply).toContain('10-11');
      expect(reply).toContain('14-15');
    });

    it('suggests known time slot when visiting', () => {
      const ctx: RuleContext = {
        userMessage: '看車',
        ...baseContext,
        intents: ['visit'],
        customerContact: '0912345678',
        customerPreferredVisitTime: '週末下午',
      };
      const reply = generateRuleBasedReply(ctx);
      expect(reply).toContain('週末下午');
      expect(reply).toContain('看車');
      expect(reply).not.toContain('哪個時段方便呢');
    });
  });

  describe('Combined preference gating', () => {
    it('applies gating when budget is known in budget intent', () => {
      const ctx: RuleContext = {
        userMessage: '預算多少',
        ...baseContext,
        intents: ['budget'],
        customerBudget: 3000000,
        customerPreferredBrand: 'Honda',
      };
      const reply = generateRuleBasedReply(ctx);
      // Should acknowledge known budget and preferences
      expect(reply).toContain('根據');
      expect(reply).toContain('30萬');
    });

    it('integrates memory with appointment flow', () => {
      const ctx: RuleContext = {
        userMessage: '看車',
        ...baseContext,
        intents: ['visit'],
        customerContact: '0912345678',
        customerBudget: 3000000,
        customerPreferredBrand: 'Honda',
      };
      const reply = generateRuleBasedReply(ctx);
      // Should show appointment times without re-asking budget
      expect(reply).toContain('時段');
    });

    it('suggests time slot when both are known', () => {
      const ctx: RuleContext = {
        userMessage: '看車',
        ...baseContext,
        intents: ['visit'],
        customerContact: '0912345678',
        customerPreferredVisitTime: '週末下午',
      };
      const reply = generateRuleBasedReply(ctx);
      // Should suggest known time slot
      expect(reply).toContain('週末下午');
    });
  });

  describe('Edge cases', () => {
    it('handles budget=0 gracefully', () => {
      const ctx: RuleContext = {
        userMessage: '推薦',
        ...baseContext,
        intents: [],
        customerBudget: 0, // Edge case — should treat as unknown
      };
      const reply = generateRuleBasedReply(ctx);
      // Should still ask for budget preferences since 0 is falsy
      expect(reply).toMatch(/預算|品牌/);
    });

    it('handles empty brand string', () => {
      const ctx: RuleContext = {
        userMessage: '推薦',
        ...baseContext,
        intents: [],
        customerPreferredBrand: '', // Empty string
      };
      const reply = generateRuleBasedReply(ctx);
      // Should treat empty as not known
      expect(reply).toMatch(/品牌|預算/);
    });

    it('handles null preferences', () => {
      const ctx: RuleContext = {
        userMessage: '推薦',
        ...baseContext,
        intents: [],
        customerBudget: null,
        customerPreferredBrand: null,
      };
      const reply = generateRuleBasedReply(ctx);
      // Should ask for preferences
      expect(reply).toMatch(/預算|品牌/);
    });

    it('skips asking budget when amount is known', () => {
      const ctx: RuleContext = {
        userMessage: '預算多少',
        ...baseContext,
        intents: ['budget'],
        customerBudget: 5000000,
      };
      const reply = generateRuleBasedReply(ctx);
      // Should reference the known budget
      expect(reply).toContain('根據');
      expect(reply).toContain('50萬');
    });
  });

  describe('Integration with detection types', () => {
    it('still respects rich menu detection over memory', () => {
      const ctx: RuleContext = {
        userMessage: '看車庫存',
        ...baseContext,
        detection: {
          type: 'inquiry_button',
          vehicle: null,
          questionType: 'general',
          directAnswer: '',
        },
        customerBudget: 3000000, // Even if budget is known
      };
      const reply = generateRuleBasedReply(ctx);
      // Should handle the button click (inquiry_button with no vehicle = sold out)
      expect(reply).toContain('不好意思');
      expect(reply).toContain('已經不在庫存');
    });

    it('applies memory gating for context_missing detection', () => {
      const ctx: RuleContext = {
        userMessage: '那個多少錢',
        ...baseContext,
        detection: {
          type: 'context_missing',
          vehicle: null,
          questionType: 'general',
          directAnswer: '',
        },
        customerBudget: 3000000,
      };
      const reply = generateRuleBasedReply(ctx);
      // For context_missing, should prompt to clarify which car
      expect(reply).toContain('哪一台');
    });
  });
});
