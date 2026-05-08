-- Migration: Enhanced Job Offers
-- Adds new fields for richer job listings: banner, contract type, modality,
-- location, salary range, benefits, and tags.

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS banner_url VARCHAR;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS location VARCHAR;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS salary_min DECIMAL;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS salary_max DECIMAL;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS salary_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS benefits TEXT[];
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS modality VARCHAR DEFAULT 'presencial';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS contract_type VARCHAR DEFAULT 'efectivo';
