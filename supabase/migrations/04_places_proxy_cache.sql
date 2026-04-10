-- Shared cache and centralized quota ledger for server-side Places proxy calls.

CREATE TABLE IF NOT EXISTS public.places_api_cache (
  cache_key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL CHECK (endpoint IN ('search', 'trending')),
  response_json JSONB NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS places_api_cache_expires_at_idx
  ON public.places_api_cache (expires_at);

CREATE TABLE IF NOT EXISTS public.places_api_rate_limits (
  day_key DATE NOT NULL,
  endpoint TEXT NOT NULL CHECK (endpoint IN ('search', 'trending')),
  client_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (day_key, endpoint, client_key)
);

CREATE INDEX IF NOT EXISTS places_api_rate_limits_lookup_idx
  ON public.places_api_rate_limits (endpoint, day_key);

CREATE TABLE IF NOT EXISTS public.places_api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL CHECK (endpoint IN ('search', 'trending')),
  cache_key TEXT,
  client_key TEXT,
  status TEXT NOT NULL,
  provider TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS places_api_request_logs_created_at_idx
  ON public.places_api_request_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS places_api_request_logs_endpoint_idx
  ON public.places_api_request_logs (endpoint, created_at DESC);

ALTER TABLE public.places_api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bump_places_rate_limit(
  p_day_key DATE,
  p_endpoint TEXT,
  p_client_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_count INTEGER;
BEGIN
  IF p_endpoint NOT IN ('search', 'trending') THEN
    RAISE EXCEPTION 'Unsupported endpoint %', p_endpoint;
  END IF;

  INSERT INTO public.places_api_rate_limits (
    day_key,
    endpoint,
    client_key,
    request_count
  )
  VALUES (
    p_day_key,
    p_endpoint,
    p_client_key,
    1
  )
  ON CONFLICT (day_key, endpoint, client_key)
  DO UPDATE
  SET
    request_count = public.places_api_rate_limits.request_count + 1,
    updated_at = timezone('utc', now())
  RETURNING request_count INTO v_request_count;

  RETURN v_request_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_places_rate_limit(DATE, TEXT, TEXT) FROM public;
