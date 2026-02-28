-- Cities Feature Migration
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. CITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  job_id UUID,
  city_title TEXT NOT NULL,
  city_name TEXT NOT NULL,
  country TEXT,
  vibe_tags TEXT[],
  best_season TEXT,
  source_url TEXT,
  thumbnail_url TEXT,
  content_creator_handle TEXT,
  content_creator_links TEXT[],
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_public BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. CITY_HIGHLIGHTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS city_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('food', 'culture', 'nature', 'shopping', 'nightlife', 'other')),
  subtype TEXT,
  address TEXT,
  description TEXT,
  price_range TEXT,
  tips TEXT,
  is_must_see BOOLEAN DEFAULT false,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  highlight_order INTEGER DEFAULT 0,
  validated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. CITY_BUDGETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS city_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'EUR',
  daily_average DECIMAL(10, 2),
  food_average DECIMAL(10, 2),
  transport_average DECIMAL(10, 2),
  activities_average DECIMAL(10, 2),
  accommodation_range TEXT
);

-- ============================================================================
-- 4. CITY_PRACTICAL_INFO TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS city_practical_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  visa_required BOOLEAN,
  local_currency TEXT,
  language TEXT,
  best_apps TEXT[],
  what_to_pack TEXT[],
  safety_tips TEXT[],
  things_to_avoid TEXT[]
);

-- ============================================================================
-- 5. USER_SAVED_CITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_saved_cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, city_id)
);

-- ============================================================================
-- 6. ALTER ANALYSIS_JOBS TABLE
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_jobs' AND column_name = 'entity_type') THEN
    ALTER TABLE analysis_jobs ADD COLUMN entity_type TEXT DEFAULT 'trip';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_jobs' AND column_name = 'city_id') THEN
    ALTER TABLE analysis_jobs ADD COLUMN city_id UUID REFERENCES cities(id);
  END IF;
END $$;

-- Add constraint for entity_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysis_jobs_entity_type_check') THEN
    ALTER TABLE analysis_jobs ADD CONSTRAINT analysis_jobs_entity_type_check CHECK (entity_type IN ('trip', 'city'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cities_user_id ON cities(user_id);
CREATE INDEX IF NOT EXISTS idx_cities_city_name ON cities(city_name);
CREATE INDEX IF NOT EXISTS idx_city_highlights_city_id ON city_highlights(city_id);
CREATE INDEX IF NOT EXISTS idx_city_highlights_category ON city_highlights(category);
CREATE INDEX IF NOT EXISTS idx_user_saved_cities_user_id ON user_saved_cities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_cities_city_id ON user_saved_cities(city_id);

-- ============================================================================
-- 8. CITY_DETAILS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW city_details AS
SELECT
  c.*,
  (SELECT COUNT(*) FROM city_highlights h WHERE h.city_id = c.id AND h.validated = true) as highlights_count
FROM cities c;

-- ============================================================================
-- 9. RLS POLICIES FOR CITIES
-- ============================================================================
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_practical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_cities ENABLE ROW LEVEL SECURITY;

-- Cities: Users can read all public cities or their own
CREATE POLICY "Users can view public cities or their own" ON cities
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own cities" ON cities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cities" ON cities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cities" ON cities
  FOR DELETE USING (auth.uid() = user_id);

-- City highlights: Follow parent city access
CREATE POLICY "Users can view highlights of accessible cities" ON city_highlights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cities c
      WHERE c.id = city_highlights.city_id
      AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage highlights of their cities" ON city_highlights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cities c
      WHERE c.id = city_highlights.city_id
      AND c.user_id = auth.uid()
    )
  );

-- City budgets: Follow parent city access
CREATE POLICY "Users can view budgets of accessible cities" ON city_budgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cities c
      WHERE c.id = city_budgets.city_id
      AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage budgets of their cities" ON city_budgets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cities c
      WHERE c.id = city_budgets.city_id
      AND c.user_id = auth.uid()
    )
  );

-- City practical info: Follow parent city access
CREATE POLICY "Users can view practical_info of accessible cities" ON city_practical_info
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cities c
      WHERE c.id = city_practical_info.city_id
      AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage practical_info of their cities" ON city_practical_info
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cities c
      WHERE c.id = city_practical_info.city_id
      AND c.user_id = auth.uid()
    )
  );

-- User saved cities: Users can only manage their own saves
CREATE POLICY "Users can view their saved cities" ON user_saved_cities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save cities" ON user_saved_cities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave cities" ON user_saved_cities
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 10. SERVICE ROLE BYPASS (for backend operations)
-- ============================================================================
-- These policies allow the service role to bypass RLS
CREATE POLICY "Service role can do anything on cities" ON cities
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do anything on city_highlights" ON city_highlights
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do anything on city_budgets" ON city_budgets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do anything on city_practical_info" ON city_practical_info
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do anything on user_saved_cities" ON user_saved_cities
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
