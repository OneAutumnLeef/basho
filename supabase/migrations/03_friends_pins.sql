-- Sprint 6: friends network + friend pin feed support

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read user profiles" ON public.user_profiles;
CREATE POLICY "Authenticated users can read user profiles" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, created_at, updated_at)
  VALUES (NEW.id, LOWER(NEW.email), NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    email = LOWER(EXCLUDED.email),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_profile_on_auth_user ON auth.users;
CREATE TRIGGER trg_sync_user_profile_on_auth_user
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (NEW.email IS NOT NULL)
EXECUTE FUNCTION public.sync_user_profile();

INSERT INTO public.user_profiles (user_id, email)
SELECT id, LOWER(email)
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (user_id)
DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

DROP TRIGGER IF EXISTS trg_user_profiles_set_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_set_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (requester_user_id <> addressee_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_pair_idx
ON public.friendships (
  LEAST(requester_user_id, addressee_user_id),
  GREATEST(requester_user_id, addressee_user_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their friendship rows" ON public.friendships;
CREATE POLICY "Users can read their friendship rows" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_user_id OR auth.uid() = addressee_user_id);

DROP POLICY IF EXISTS "Users can create outgoing friendship requests" ON public.friendships;
CREATE POLICY "Users can create outgoing friendship requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can update their friendship rows" ON public.friendships;
CREATE POLICY "Users can update their friendship rows" ON public.friendships
  FOR UPDATE USING (auth.uid() = requester_user_id OR auth.uid() = addressee_user_id)
  WITH CHECK (auth.uid() = requester_user_id OR auth.uid() = addressee_user_id);

DROP POLICY IF EXISTS "Users can delete their friendship rows" ON public.friendships;
CREATE POLICY "Users can delete their friendship rows" ON public.friendships
  FOR DELETE USING (auth.uid() = requester_user_id OR auth.uid() = addressee_user_id);

CREATE OR REPLACE FUNCTION public.prevent_friendship_user_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.requester_user_id <> OLD.requester_user_id
     OR NEW.addressee_user_id <> OLD.addressee_user_id THEN
    RAISE EXCEPTION 'Cannot change friendship participants after creation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friendships_set_updated_at ON public.friendships;
CREATE TRIGGER trg_friendships_set_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_friendships_prevent_user_mutation ON public.friendships;
CREATE TRIGGER trg_friendships_prevent_user_mutation
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.prevent_friendship_user_mutation();
