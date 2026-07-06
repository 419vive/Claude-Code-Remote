-- Migration: Add extracted customer preferences to conversations table
-- Purpose: Store budget, brand, body type, visit time to avoid re-asking same questions
-- Date: 2026-07-06

ALTER TABLE conversations
ADD COLUMN budget INT AFTER aiDisabled,
ADD COLUMN budgetRange VARCHAR(32) AFTER budget,
ADD COLUMN preferredBrand VARCHAR(256) AFTER budgetRange,
ADD COLUMN preferredBodyType VARCHAR(128) AFTER preferredBrand,
ADD COLUMN preferredVisitTime VARCHAR(64) AFTER preferredBodyType;

-- Create indexes for faster lookups (optional, for future analytics)
CREATE INDEX idx_budget ON conversations(budget);
CREATE INDEX idx_budgetRange ON conversations(budgetRange);
