-- 001_create_inspections.sql
-- ReturnOps AI — initial schema
--
-- Single inspections table with JSONB columns for structured fields.
-- Organization isolation: application-layer WHERE organization_id = $org_id filter.
-- RLS is NOT enabled in this build — documented as a future production hardening step.

CREATE TABLE IF NOT EXISTS inspections (
  -- Identity
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id         TEXT        NOT NULL UNIQUE,        -- e.g. "RTN-1234567890-ABCDE"
  schema_version    TEXT        NOT NULL DEFAULT '1.0',

  -- Tenancy (application-layer isolation)
  organization_id   TEXT        NOT NULL,               -- "org_demo_alpha" | "org_demo_bravo"
  client_id         TEXT        NOT NULL,

  -- Agent
  agent             JSONB       NOT NULL,               -- { name, version }

  -- Subject
  subject           JSONB       NOT NULL,               -- { order_id, sku, asin?, product_name }

  -- Capture metadata
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operator_label    TEXT        NOT NULL,

  -- Evidence
  images            TEXT[]      NOT NULL DEFAULT '{}',  -- ["image_1", "image_2", ...]
  checks            JSONB       NOT NULL DEFAULT '[]',  -- CheckRecord[]
  outcome           JSONB       NOT NULL,               -- { disposition, policy_version, rule_trace }
  overrides         JSONB       NOT NULL DEFAULT '[]',  -- OverrideRecord[]

  -- Status
  status            TEXT        NOT NULL
                    CHECK (status IN ('resolved', 'pending_review', 'failed')),

  -- Integrity
  content_hash      TEXT,                               -- SHA-256 of canonical record

  -- Debugging (not part of official evidence contract)
  raw_observation   JSONB,                              -- InspectionObservation from Gemini
  error_detail      TEXT,                               -- populated on pipeline failures

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inspections_org
  ON inspections (organization_id);

CREATE INDEX IF NOT EXISTS idx_inspections_org_status
  ON inspections (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_inspections_record_id
  ON inspections (record_id);

CREATE INDEX IF NOT EXISTS idx_inspections_subject_order
  ON inspections ((subject->>'order_id'));

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
-- Server-side operations using service_role key will bypass RLS.
-- This prevents direct unauthenticated/anonymous access from public clients and clears the Supabase Security Advisor warning.
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
