import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TripVoteSummary, VoteOnPlaceInput } from "@/types/trips";

const LOCAL_VOTES_KEY = "basho-local-trip-votes-v1";

type LocalVotesStore = Record<string, Record<string, -1 | 1>>;

type VoteRow = {
  id: string;
  trip_id: string;
  place_key: string;
  place_name: string | null;
  voter_user_id: string;
  vote: -1 | 1;
};

function safeReadLocalVotes(): LocalVotesStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(LOCAL_VOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalVotesStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeWriteLocalVotes(data: LocalVotesStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(data));
}

function aggregateVoteRows(rows: VoteRow[], currentUserId?: string): TripVoteSummary[] {
  const map = new Map<string, TripVoteSummary>();

  rows.forEach((row) => {
    const existing =
      map.get(row.place_key) ??
      ({
        placeKey: row.place_key,
        score: 0,
        upVotes: 0,
        downVotes: 0,
        myVote: 0,
        voterCount: 0,
      } satisfies TripVoteSummary);

    if (row.vote > 0) {
      existing.upVotes += 1;
    } else {
      existing.downVotes += 1;
    }

    existing.score += row.vote;
    existing.voterCount += 1;

    if (currentUserId && row.voter_user_id === currentUserId) {
      existing.myVote = row.vote;
    }

    map.set(row.place_key, existing);
  });

  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id ?? null;
}

export function useTripVotes(tripId: string | null) {
  const queryClient = useQueryClient();

  const votePermissionQuery = useQuery({
    queryKey: ["trip-vote-permission", tripId],
    enabled: Boolean(tripId && !tripId.startsWith("local-")),
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      return {
        userId: session?.user?.id ?? null,
      };
    },
    staleTime: 1000 * 30,
  });

  const votesQuery = useQuery({
    queryKey: ["trip-votes", tripId],
    enabled: Boolean(tripId),
    queryFn: async (): Promise<TripVoteSummary[]> => {
      if (!tripId) return [];

      if (tripId.startsWith("local-")) {
        const localStore = safeReadLocalVotes();
        const currentUserBucket = localStore[tripId] || {};

        return Object.entries(currentUserBucket).map(([placeKey, vote]) => ({
          placeKey,
          score: vote,
          upVotes: vote > 0 ? 1 : 0,
          downVotes: vote < 0 ? 1 : 0,
          myVote: vote,
          voterCount: 1,
        }));
      }

      const currentUserId = await getCurrentUserId();
      const { data, error } = await supabase
        .from("trip_votes")
        .select("id,trip_id,place_key,place_name,voter_user_id,vote")
        .eq("trip_id", tripId);

      if (error) throw error;
      const rows = (data || []) as VoteRow[];
      return aggregateVoteRows(rows, currentUserId ?? undefined);
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (input: VoteOnPlaceInput): Promise<void> => {
      if (input.tripId.startsWith("local-")) {
        const store = safeReadLocalVotes();
        const tripVotes = store[input.tripId] || {};
        const currentVote = tripVotes[input.placeKey] ?? 0;

        if (currentVote === input.vote) {
          delete tripVotes[input.placeKey];
        } else {
          tripVotes[input.placeKey] = input.vote;
        }

        store[input.tripId] = tripVotes;
        safeWriteLocalVotes(store);
        return;
      }

      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        throw new Error("You need to sign in to vote on shared trips.");
      }

      const { data: existing, error: existingError } = await supabase
        .from("trip_votes")
        .select("id,vote")
        .eq("trip_id", input.tripId)
        .eq("place_key", input.placeKey)
        .eq("voter_user_id", currentUserId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing && existing.vote === input.vote) {
        const { error: deleteError } = await supabase
          .from("trip_votes")
          .delete()
          .eq("id", existing.id);

        if (deleteError) throw deleteError;
        return;
      }

      const { error: upsertError } = await supabase
        .from("trip_votes")
        .upsert({
          trip_id: input.tripId,
          place_key: input.placeKey,
          place_name: input.placeName ?? null,
          voter_user_id: currentUserId,
          vote: input.vote,
        }, { onConflict: "trip_id,place_key,voter_user_id" });

      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-votes", tripId] });
    },
  });

  const voteDisabledReason = !tripId
    ? "Save or load a trip to enable collaboration voting."
    : tripId.startsWith("local-")
      ? null
      : votePermissionQuery.isLoading
        ? "Checking vote permissions..."
        : !votePermissionQuery.data?.userId
          ? "Sign in to vote on shared trips."
          : null;

  const canVote = voteDisabledReason === null;

  return {
    voteSummaries: votesQuery.data ?? [],
    isLoadingVotes: votesQuery.isLoading,
    voteOnPlace: voteMutation.mutateAsync,
    isVoting: voteMutation.isPending,
    canVote,
    voteDisabledReason,
    isCheckingVotePermission: votePermissionQuery.isLoading,
  };
}
