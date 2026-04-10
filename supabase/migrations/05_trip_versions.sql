-- Sprint 7: restore points for trip persistence

CREATE TABLE IF NOT EXISTS public.trip_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Saved snapshot',
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS trip_versions_trip_created_idx
  ON public.trip_versions (trip_id, created_at DESC);

ALTER TABLE public.trip_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip owners and shared viewers can read trip versions" ON public.trip_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND (t.owner_user_id = auth.uid() OR t.is_shared = TRUE)
    )
  );

CREATE POLICY "Trip owners can create trip versions" ON public.trip_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND t.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can delete trip versions" ON public.trip_versions
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND t.owner_user_id = auth.uid()
    )
  );
