import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Place } from "@/types/places";

type FriendshipStatus = "pending" | "accepted" | "rejected";

type FriendRequestAction = "sent" | "accepted";

interface FriendshipRow {
  id: string;
  requester_user_id: string;
  addressee_user_id: string;
  status: FriendshipStatus;
  created_at: string;
}

interface UserProfileRow {
  user_id: string;
  email: string;
}

interface FriendSavedPlaceRow {
  user_id: string;
  custom_notes: string | null;
  tags: string[] | null;
  created_at: string;
  place:
    | {
        id: string;
        name: string;
        address: string;
        lat: number;
        lng: number;
        category: Place["category"];
        image_url: string | null;
        rating: number | null;
        created_at: string | null;
      }
    | {
        id: string;
        name: string;
        address: string;
        lat: number;
        lng: number;
        category: Place["category"];
        image_url: string | null;
        rating: number | null;
        created_at: string | null;
      }[]
    | null;
}

export interface FriendSummary {
  userId: string;
  email: string;
}

export interface IncomingFriendRequest {
  id: string;
  fromUserId: string;
  fromEmail: string;
  createdAt: string;
}

export interface OutgoingFriendRequest {
  id: string;
  toUserId: string;
  toEmail: string;
  createdAt: string;
}

interface FriendsQueryResult {
  currentUserId: string | null;
  friends: FriendSummary[];
  incomingRequests: IncomingFriendRequest[];
  outgoingRequests: OutgoingFriendRequest[];
  friendPlaces: Place[];
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id ?? null;
}

function mapFriendPlaces(rows: FriendSavedPlaceRow[]): Place[] {
  const deduped = new Map<string, Place>();

  rows
    .filter((row) => Boolean(row.place))
    .forEach((row) => {
      const rawPlace = row.place;
      const place = Array.isArray(rawPlace) ? rawPlace[0] : rawPlace;
      if (!place) return;

      const mapped: Place = {
        id: place.id,
        originalId: place.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        category: place.category,
        imageUrl: place.image_url || undefined,
        rating: place.rating || undefined,
        notes: row.custom_notes || undefined,
        tags: Array.from(new Set([...(row.tags || []), "friends"])),
        createdAt: row.created_at || place.created_at || new Date().toISOString(),
      };

      const key = `${mapped.name}|${mapped.address}|${mapped.lat.toFixed(6)}|${mapped.lng.toFixed(6)}`;
      const existing = deduped.get(key);

      if (!existing) {
        deduped.set(key, mapped);
        return;
      }

      const merged: Place = {
        ...existing,
        tags: Array.from(new Set([...(existing.tags || []), ...(mapped.tags || [])])),
      };

      if (new Date(mapped.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        deduped.set(key, {
          ...mapped,
          tags: merged.tags,
        });
      } else {
        deduped.set(key, merged);
      }
    });

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function useFriends() {
  const queryClient = useQueryClient();

  const friendsQuery = useQuery({
    queryKey: ["friends-network"],
    queryFn: async (): Promise<FriendsQueryResult> => {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return {
          currentUserId: null,
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
          friendPlaces: [],
        };
      }

      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        return {
          currentUserId: null,
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
          friendPlaces: [],
        };
      }

      const { data: friendshipData, error: friendshipError } = await supabase
        .from("friendships")
        .select("id,requester_user_id,addressee_user_id,status,created_at")
        .or(`requester_user_id.eq.${currentUserId},addressee_user_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (friendshipError) throw friendshipError;
      const friendshipRows = (friendshipData || []) as FriendshipRow[];

      const relatedUserIds = new Set<string>();
      friendshipRows.forEach((row) => {
        relatedUserIds.add(row.requester_user_id);
        relatedUserIds.add(row.addressee_user_id);
      });

      let profileRows: UserProfileRow[] = [];
      if (relatedUserIds.size > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("user_id,email")
          .in("user_id", Array.from(relatedUserIds));

        if (profileError) throw profileError;
        profileRows = (profileData || []) as UserProfileRow[];
      }

      const emailByUserId = profileRows.reduce<Record<string, string>>((acc, row) => {
        acc[row.user_id] = row.email;
        return acc;
      }, {});

      const friends = friendshipRows
        .filter((row) => row.status === "accepted")
        .map((row) => {
          const friendUserId =
            row.requester_user_id === currentUserId
              ? row.addressee_user_id
              : row.requester_user_id;

          return {
            userId: friendUserId,
            email: emailByUserId[friendUserId] || "Unknown user",
          } satisfies FriendSummary;
        })
        .filter((friend, index, array) => array.findIndex((f) => f.userId === friend.userId) === index)
        .sort((a, b) => a.email.localeCompare(b.email));

      const incomingRequests = friendshipRows
        .filter((row) => row.status === "pending" && row.addressee_user_id === currentUserId)
        .map((row) => ({
          id: row.id,
          fromUserId: row.requester_user_id,
          fromEmail: emailByUserId[row.requester_user_id] || "Unknown user",
          createdAt: row.created_at,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const outgoingRequests = friendshipRows
        .filter((row) => row.status === "pending" && row.requester_user_id === currentUserId)
        .map((row) => ({
          id: row.id,
          toUserId: row.addressee_user_id,
          toEmail: emailByUserId[row.addressee_user_id] || "Unknown user",
          createdAt: row.created_at,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const friendIds = friends.map((friend) => friend.userId);
      if (friendIds.length === 0) {
        return {
          currentUserId,
          friends,
          incomingRequests,
          outgoingRequests,
          friendPlaces: [],
        };
      }

      const { data: placeData, error: friendPlacesError } = await supabase
        .from("user_saved_places")
        .select(
          "user_id,custom_notes,tags,created_at,place:places(id,name,address,lat,lng,category,image_url,rating,created_at)",
        )
        .in("user_id", friendIds)
        .order("created_at", { ascending: false });

      if (friendPlacesError) throw friendPlacesError;

      const friendPlaces = mapFriendPlaces((placeData || []) as FriendSavedPlaceRow[]);

      return {
        currentUserId,
        friends,
        incomingRequests,
        outgoingRequests,
        friendPlaces,
      };
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (emailInput: string): Promise<FriendRequestAction> => {
      const normalizedEmail = emailInput.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error("Enter an email to add a friend.");
      }

      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        throw new Error("Sign in to add friends.");
      }

      const { data: targetProfile, error: targetProfileError } = await supabase
        .from("user_profiles")
        .select("user_id,email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (targetProfileError) throw targetProfileError;
      if (!targetProfile) {
        throw new Error("No Basho user found with that email.");
      }

      if (targetProfile.user_id === currentUserId) {
        throw new Error("You cannot add yourself.");
      }

      const pairFilter = [
        `and(requester_user_id.eq.${currentUserId},addressee_user_id.eq.${targetProfile.user_id})`,
        `and(requester_user_id.eq.${targetProfile.user_id},addressee_user_id.eq.${currentUserId})`,
      ].join(",");

      const { data: existingRow, error: existingRowError } = await supabase
        .from("friendships")
        .select("id,requester_user_id,addressee_user_id,status")
        .or(pairFilter)
        .maybeSingle();

      if (existingRowError) throw existingRowError;

      if (existingRow) {
        if (existingRow.status === "accepted") {
          throw new Error("You are already connected as friends.");
        }

        if (existingRow.status === "pending") {
          if (existingRow.requester_user_id === currentUserId) {
            throw new Error("Friend request already sent.");
          }

          const { error: acceptError } = await supabase
            .from("friendships")
            .update({
              status: "accepted",
              responded_at: new Date().toISOString(),
            })
            .eq("id", existingRow.id);

          if (acceptError) throw acceptError;
          return "accepted";
        }

        if (existingRow.requester_user_id !== currentUserId) {
          const { error: deleteError } = await supabase
            .from("friendships")
            .delete()
            .eq("id", existingRow.id);

          if (deleteError) throw deleteError;

          const { error: insertAfterDeleteError } = await supabase
            .from("friendships")
            .insert({
              requester_user_id: currentUserId,
              addressee_user_id: targetProfile.user_id,
              status: "pending",
            });

          if (insertAfterDeleteError) throw insertAfterDeleteError;
          return "sent";
        }

        const { error: reactivateError } = await supabase
          .from("friendships")
          .update({
            status: "pending",
            responded_at: null,
          })
          .eq("id", existingRow.id);

        if (reactivateError) throw reactivateError;
        return "sent";
      }

      const { error: insertError } = await supabase
        .from("friendships")
        .insert({
          requester_user_id: currentUserId,
          addressee_user_id: targetProfile.user_id,
          status: "pending",
        });

      if (insertError) throw insertError;
      return "sent";
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends-network"] });
    },
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (requestId: string): Promise<void> => {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        throw new Error("Sign in to manage friend requests.");
      }

      const { error } = await supabase
        .from("friendships")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("addressee_user_id", currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends-network"] });
    },
  });

  const declineFriendRequestMutation = useMutation({
    mutationFn: async (requestId: string): Promise<void> => {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        throw new Error("Sign in to manage friend requests.");
      }

      const { error } = await supabase
        .from("friendships")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("addressee_user_id", currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends-network"] });
    },
  });

  return {
    currentUserId: friendsQuery.data?.currentUserId ?? null,
    friends: friendsQuery.data?.friends ?? [],
    incomingRequests: friendsQuery.data?.incomingRequests ?? [],
    outgoingRequests: friendsQuery.data?.outgoingRequests ?? [],
    friendPlaces: friendsQuery.data?.friendPlaces ?? [],
    isLoadingFriends: friendsQuery.isLoading,
    isRefreshingFriends: friendsQuery.isFetching,
    sendFriendRequest: sendFriendRequestMutation.mutateAsync,
    acceptFriendRequest: acceptFriendRequestMutation.mutateAsync,
    declineFriendRequest: declineFriendRequestMutation.mutateAsync,
    isSendingFriendRequest: sendFriendRequestMutation.isPending,
    isRespondingToFriendRequest:
      acceptFriendRequestMutation.isPending || declineFriendRequestMutation.isPending,
  };
}
