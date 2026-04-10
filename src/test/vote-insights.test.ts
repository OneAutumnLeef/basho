import { describe, expect, it } from "vitest";
import { TripBucketItem } from "@/types/places";
import { TripVoteSummary } from "@/types/trips";
import { buildTripVoteInsights, buildVoteActivity } from "@/lib/vote-insights";

function makeItem(id: string, name: string): TripBucketItem {
  return {
    id: `bucket-${id}`,
    order: 0,
    place: {
      id,
      originalId: id,
      name,
      address: `${name} Address`,
      lat: 12.97,
      lng: 77.59,
      category: "dining",
      tags: [],
      createdAt: new Date().toISOString(),
    },
  };
}

describe("vote insights", () => {
  it("builds vote activity trend from vote timestamps", () => {
    const now = Date.parse("2026-04-10T12:00:00Z");
    const activity = buildVoteActivity(
      [
        { created_at: "2026-04-10T11:00:00Z" },
        { created_at: "2026-04-10T08:00:00Z" },
        { created_at: "2026-04-09T07:00:00Z" },
        { created_at: "2026-04-06T07:00:00Z" },
      ],
      now,
    );

    expect(activity.last24Hours).toBe(2);
    expect(activity.previous24Hours).toBe(1);
    expect(activity.direction).toBe("up");
  });

  it("selects top, bottom, controversial, and unvoted suggestions", () => {
    const items: TripBucketItem[] = [
      makeItem("a", "Alpha"),
      makeItem("b", "Bravo"),
      makeItem("c", "Charlie"),
    ];

    const voteSummaryByPlaceKey: Record<string, TripVoteSummary> = {
      a: {
        placeKey: "a",
        score: 3,
        upVotes: 3,
        downVotes: 0,
        myVote: 0,
        voterCount: 3,
      },
      b: {
        placeKey: "b",
        score: 0,
        upVotes: 2,
        downVotes: 2,
        myVote: 0,
        voterCount: 4,
      },
    };

    const insights = buildTripVoteInsights(items, voteSummaryByPlaceKey, {
      last24Hours: 4,
      previous24Hours: 2,
      direction: "up",
    });

    expect(insights.totalVotes).toBe(7);
    expect(insights.top?.placeName).toBe("Alpha");
    expect(insights.bottom?.placeName).toBe("Bravo");
    expect(insights.controversial?.placeName).toBe("Bravo");
    expect(insights.noVoteSuggestions).toEqual(["Charlie"]);
    expect(insights.activity.direction).toBe("up");
  });
});
