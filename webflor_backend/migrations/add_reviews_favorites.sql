-- Migration: Reviews + Favorites tables for Reputation system
-- Run this against the production database

-- Resenas de empleadores sobre candidatos
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  employer_id INT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  candidate_id INT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  job_id INT REFERENCES "Job"(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employer_id, candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_candidate ON reviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_reviews_employer ON reviews(employer_id);

-- Favoritos del empleador
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  employer_id INT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  candidate_id INT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employer_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_employer ON favorites(employer_id);
