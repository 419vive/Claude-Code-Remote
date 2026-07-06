-- Migration: Add "operator" role to messages.role enum
-- Purpose: Support operator replies in web chat polling
-- Backwards compatible: existing messages keep their role

-- Modify the role enum to include "operator"
-- Note: MySQL ENUM modifications require recreating the column
ALTER TABLE messages MODIFY COLUMN role ENUM('user', 'assistant', 'system', 'operator') NOT NULL;
