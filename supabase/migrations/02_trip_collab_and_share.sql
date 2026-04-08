-- Sprint 3: persistence, collaboration votes, and share metadata support

CREATE TABLE public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Bangalore',
  vibe TEXT NOT NULL DEFAULT 'Night Out',
  start_time TEXT NOT NULL DEFAULT '18:30',
  time_window TEXT NOT NULL DEFAULT 'evening',
  pace TEXT NOT NULL DEFAULT 'balanced',
  route_mode TEXT NOT NULL DEFAULT 'optimize',
  plan_score INTEGER NOT NULL DEFAULT 0,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.trip_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  dwell_minutes INTEGER NOT NULL DEFAULT 60,
  external_place_id TEXT,
  place_name TEXT NOT NULL,
  place_address TEXT NOT NULL,
  place_lat DOUBLE PRECISION NOT NULL,
  place_lng DOUBLE PRECISION NOT NULL,
  place_category place_category DEFAULT 'other',
  place_image_url TEXT,
  place_rating DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (trip_id, order_index)
);

CREATE TABLE public.trip_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_key TEXT NOT NULL,
  place_name TEXT,
  voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (trip_id, place_key, voter_user_id)
);

CREATE TABLE public.trip_suggestion_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  original_place_key TEXT NOT NULL,
  suggested_place_key TEXT NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_suggestion_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip owners and shared viewers can read trips" ON public.trips
  FOR SELECT USING (auth.uid() = owner_user_id OR is_shared = TRUE);

CREATE POLICY "Authenticated users can create own trips" ON public.trips
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = owner_user_id);

CREATE POLICY "Trip owners can update trips" ON public.trips
  FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "Trip owners can delete trips" ON public.trips
  FOR DELETE USING (auth.uid() = owner_user_id);

CREATE POLICY "Trip owners and shared viewers can read trip items" ON public.trip_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND (t.owner_user_id = auth.uid() OR t.is_shared = TRUE)
    )
  );

CREATE POLICY "Trip owners can manage trip items" ON public.trip_items
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read votes for accessible trips" ON public.trip_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND (t.owner_user_id = auth.uid() OR t.is_shared = TRUE)
    )
  );

CREATE POLICY "Authenticated users can vote on shared or owned trips" ON public.trip_votes
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = voter_user_id
    AND EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND (t.owner_user_id = auth.uid() OR t.is_shared = TRUE)
    )
  );

CREATE POLICY "Users can edit or remove their own votes" ON public.trip_votes
  FOR UPDATE USING (auth.uid() = voter_user_id);

CREATE POLICY "Users can delete their own votes" ON public.trip_votes
  FOR DELETE USING (auth.uid() = voter_user_id);

CREATE POLICY "Trip owners can read suggestion audit" ON public.trip_suggestion_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can write suggestion audit" ON public.trip_suggestion_audit
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can update suggestion audit" ON public.trip_suggestion_audit
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND t.owner_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trips_set_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
