-- Create an ENUM type for categories
CREATE TYPE place_category AS ENUM (
  'accommodation', 
  'dining', 
  'attraction', 
  'transport', 
  'cafe', 
  'nature', 
  'historic', 
  'other'
);

-- PLACES TABLE
-- A global registry of places so multiple users sharing the same location don't copy data
CREATE TABLE public.places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category place_category DEFAULT 'other',
  image_url TEXT,
  rating DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER_SAVED_PLACES TABLE
-- Joins a specific user auth string directly to the global places table
CREATE TABLE public.user_saved_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE,
  custom_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- BUCKET_ITEMS TABLE
-- Represents the sequential itinerary items in a user's trip bucket
CREATE TABLE public.bucket_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE,
  order_index DOUBLE PRECISION NOT NULL, -- Used for drag and drop sorting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_items ENABLE ROW LEVEL SECURITY;

-- Allow unauthenticated reading of global places (for shared maps)
CREATE POLICY "Public places are viewable by everyone" ON public.places
  FOR SELECT USING (true);
  
-- Authenticated users can insert global places
CREATE POLICY "Authenticated users can insert places" ON public.places
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can only manage their own saved places
CREATE POLICY "Users manage their own saved places" ON public.user_saved_places
  FOR ALL USING (auth.uid() = user_id);

-- Users can only manage their own bucket
CREATE POLICY "Users manage their own bucket" ON public.bucket_items
  FOR ALL USING (auth.uid() = user_id);
