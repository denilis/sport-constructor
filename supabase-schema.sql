-- ═══════════════════════════════════
-- SPORT CONSTRUCTOR PRO — Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════

-- 1. Projects (проекты калькулятора)
CREATE TABLE IF NOT EXISTS sc_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Новый проект',
  client_name text,
  manager_name text,
  plot_w numeric DEFAULT 100,
  plot_l numeric DEFAULT 50,
  calc_state jsonb DEFAULT '{}',
  hangars jsonb DEFAULT '[]',
  plan_buildings jsonb DEFAULT '[]',
  plan_scale numeric DEFAULT 0,
  plan_img_url text,
  abk_norms jsonb,
  financial jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Buildings (строения проекта)
CREATE TABLE IF NOT EXISTS sc_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES sc_projects(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text,
  w numeric,
  h numeric,
  floors integer DEFAULT 1,
  wall_offset numeric DEFAULT 1,
  layout jsonb DEFAULT '[]',
  layout2 jsonb DEFAULT '[]',
  position_x numeric,
  position_y numeric,
  angle numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 3. Rooms (помещения внутри строений)
CREATE TABLE IF NOT EXISTS sc_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES sc_buildings(id) ON DELETE CASCADE,
  room_type text NOT NULL,
  name text,
  area numeric,
  w numeric,
  h numeric,
  floor integer DEFAULT 1,
  x numeric,
  y numeric,
  equipment jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- 4. Sport objects (объекты: в строениях, помещениях или на участке)
CREATE TABLE IF NOT EXISTS sc_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES sc_projects(id) ON DELETE CASCADE,
  building_id uuid REFERENCES sc_buildings(id) ON DELETE SET NULL,
  room_id uuid REFERENCES sc_rooms(id) ON DELETE SET NULL,
  catalog_id text NOT NULL,
  option_index integer DEFAULT 0,
  qty integer DEFAULT 1,
  price numeric,
  placement text DEFAULT 'building',
  x numeric,
  y numeric,
  w numeric,
  h numeric,
  angle numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 5. Research (результаты исследований цен)
CREATE TABLE IF NOT EXISTS sc_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES sc_projects(id) ON DELETE CASCADE,
  scope text,
  raw_input text,
  results jsonb,
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 6. Renders (сгенерированные визуализации)
CREATE TABLE IF NOT EXISTS sc_renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES sc_projects(id) ON DELETE CASCADE,
  angle text,
  prompt text,
  image_url text,
  reference_url text,
  provider text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 7. AI chats (история чатов НейроМозг)
CREATE TABLE IF NOT EXISTS sc_ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES sc_projects(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]',
  mode text DEFAULT 'config',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_sc_buildings_project ON sc_buildings(project_id);
CREATE INDEX IF NOT EXISTS idx_sc_rooms_building ON sc_rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_sc_objects_project ON sc_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_sc_objects_building ON sc_objects(building_id);
CREATE INDEX IF NOT EXISTS idx_sc_research_project ON sc_research(project_id);
CREATE INDEX IF NOT EXISTS idx_sc_renders_project ON sc_renders(project_id);
CREATE INDEX IF NOT EXISTS idx_sc_ai_chats_project ON sc_ai_chats(project_id);

-- ═══ Row Level Security ═══
ALTER TABLE sc_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sc_ai_chats ENABLE ROW LEVEL SECURITY;

-- Policies: allow all for anon (single-user app, no auth)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'sc_projects','sc_buildings','sc_rooms',
    'sc_objects','sc_research','sc_renders','sc_ai_chats'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "anon_select" ON %I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "anon_insert" ON %I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "anon_update" ON %I FOR UPDATE USING (true)', t);
    EXECUTE format('CREATE POLICY "anon_delete" ON %I FOR DELETE USING (true)', t);
  END LOOP;
END $$;
