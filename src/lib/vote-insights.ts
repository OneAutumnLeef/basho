import { TripBucketItem } from "@/types/places";
import {
  TripVoteActivity,
  TripVoteInsight,
  TripVoteInsights,
  TripVoteSummary,
} from "@/types/trips";

interface VoteRowForActivity {
  created_at?: string | null;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function buildVoteActivity(
  rows: VoteRowForActivity[],
  nowMs = Date.now(),
): TripVoteActivity {
  const recentBoundary = nowMs - DAY_MS;
  const previousBoundary = nowMs - DAY_MS * 2;

  let last24Hours = 0;
  let previous24Hours = 0;

  rows.forEach((row) => {
    if (!row.created_at) return;
    const voteAtMs = Date.parse(row.created_at);
    if (Number.isNaN(voteAtMs)) return;

    if (voteAtMs >= recentBoundary) {
      last24Hours += 1;
      return;
    }

    if (voteAtMs >= previousBoundary) {
      previous24Hours += 1;
    }
  });

  const direction =
    last24Hours > previous24Hours
      ? "up"
      : last24Hours < previous24Hours
        ? "down"
        : "flat";

  return {
    last24Hours,
    previous24Hours,
    direction,
  };
}

export function buildTripVoteInsights(
  items: TripBucketItem[],
  voteSummaryByPlaceKey: Record<string, TripVoteSummary>,
  activity: TripVoteActivity,
): TripVoteInsights {
  const entries: TripVoteInsight[] = items
    .map((item) => {
      const placeKey = item.place.originalId || item.place.id;
      const voteSummary = voteSummaryByPlaceKey[placeKey];
      if (!voteSummary) return null;

      return {
        placeKey,
        placeName: item.place.name,
        score: voteSummary.score,
        voterCount: voteSummary.voterCount,
        upVotes: voteSummary.upVotes,
        downVotes: voteSummary.downVotes,
      };
    })
    .filter((entry): entry is TripVoteInsight => Boolean(entry));

  const ranked = [...entries].sort(
    (a, b) => b.score - a.score || b.voterCount - a.voterCount,
  );

  const controversialCandidates = entries.filter(
    (entry) => entry.upVotes > 0 && entry.downVotes > 0,
  );
  const controversial = [...controversialCandidates].sort((a, b) => {
    const aSplit = Math.min(a.upVotes, a.downVotes);
    const bSplit = Math.min(b.upVotes, b.downVotes);

    return bSplit - aSplit || b.voterCount - a.voterCount;
  })[0] ?? null;

  const noVoteSuggestions = items
    .filter((item) => {
      const placeKey = item.place.originalId || item.place.id;
      return !voteSummaryByPlaceKey[placeKey];
    })
    .map((item) => item.place.name)
    .slice(0, 3);

  const totalVotes = entries.reduce((sum, entry) => sum + entry.voterCount, 0);

  return {
    totalVotes,
    top: ranked[0] ?? null,
    bottom: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    controversial,
    noVoteSuggestions,
    activity,
  };
}
