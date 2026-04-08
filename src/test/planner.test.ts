import { describe, expect, it } from "vitest";
import {
  buildAutoFixSuggestions,
  buildPlannedStops,
  computePlanner,
  formatMinutesAsClock,
  parseClockToMinutes,
} from "@/lib/planner";
import {
  Place,
  PlannerSettings,
  RouteData,
  TripBucketItem,
} from "@/types/places";

function makePlace(id: string, category: Place["category"] = "dining"): Place {
  return {
    id,
    originalId: id,
    name: `Place ${id}`,
    address: `Address ${id}`,
    lat: 12.97,
    lng: 77.59,
    category,
    tags: [],
    createdAt: new Date().toISOString(),
  };
}

const settings: PlannerSettings = {
  city: "Bangalore",
  vibe: "Night Out",
  startTime: "18:00",
  timeWindow: "evening",
  pace: "balanced",
};

const items: TripBucketItem[] = [
  { id: "bucket-a", place: makePlace("a", "dining"), order: 0, dwellMinutes: 60 },
  { id: "bucket-b", place: makePlace("b", "cafe"), order: 1, dwellMinutes: 60 },
  { id: "bucket-c", place: makePlace("c", "historic"), order: 2, dwellMinutes: 40 },
];

const routeData: RouteData = {
  distance: 6000,
  duration: 3300,
  geometry: {
    type: "LineString",
    coordinates: [
      [77.59, 12.97],
      [77.61, 12.98],
    ],
  },
  legs: [
    { distance: 1200, duration: 600, fromIndex: 0, toIndex: 1, fromPlaceId: "a", toPlaceId: "b" },
    { distance: 4800, duration: 2700, fromIndex: 1, toIndex: 2, fromPlaceId: "b", toPlaceId: "c" },
  ],
  waypointOrder: [0, 1, 2],
  source: "route",
};

describe("planner utilities", () => {
  it("parses and formats clock values", () => {
    expect(parseClockToMinutes("18:35")).toBe(1115);
    expect(formatMinutesAsClock(1115)).toBe("18:35");
    expect(formatMinutesAsClock(24 * 60 + 5)).toBe("00:05");
  });

  it("builds schedule with travel timings and warning signals", () => {
    const plannedStops = buildPlannedStops(items, routeData, settings);

    expect(plannedStops).toHaveLength(3);
    expect(plannedStops[1].arrivalTime).toBe("19:10");
    expect(plannedStops[1].departureTime).toBe("20:10");
    expect(plannedStops[2].warnings).toContain("long_detour");
    expect(plannedStops[2].warnings).toContain("tight_connection");
  });

  it("flags late finish when itinerary spills into late night", () => {
    const lateSettings: PlannerSettings = {
      ...settings,
      startTime: "23:00",
    };

    const latePlan = buildPlannedStops([items[0]], null, lateSettings);
    expect(latePlan[0].warnings).toContain("late_finish");
  });

  it("computes aggregate score and totals", () => {
    const planner = computePlanner(items, routeData, settings);

    expect(planner.totals.travelMinutes).toBe(55);
    expect(planner.totals.dwellMinutes).toBe(160);
    expect(planner.score.warningCount).toBeGreaterThan(0);
    expect(planner.score.overall).toBeGreaterThanOrEqual(0);
    expect(planner.score.overall).toBeLessThanOrEqual(100);
  });

  it("generates auto-fix suggestions for weak stops", () => {
    const plannedStops = buildPlannedStops(items, routeData, settings);
    const candidates: Place[] = [
      {
        ...makePlace("d", "dining"),
        lat: 12.97,
        lng: 77.59,
        rating: 4.6,
      },
      {
        ...makePlace("e", "nature"),
        lat: 12.999,
        lng: 77.651,
        rating: 4.1,
      },
    ];

    const suggestions = buildAutoFixSuggestions(items, plannedStops, candidates, settings);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].candidate.id).toBe("d");
    expect(suggestions[0].estimatedScoreDelta).toBeGreaterThan(0);
    expect(suggestions[0].confidence).toBeGreaterThanOrEqual(45);
  });

  it("improves overall score after applying a top auto-fix and rerouting", () => {
    const scoreItems: TripBucketItem[] = [
      {
        id: "bucket-sa",
        place: { ...makePlace("sa", "dining"), lat: 12.9714, lng: 77.5946 },
        order: 0,
        dwellMinutes: 60,
      },
      {
        id: "bucket-sb",
        place: { ...makePlace("sb", "cafe"), lat: 12.9728, lng: 77.6051 },
        order: 1,
        dwellMinutes: 55,
      },
      {
        id: "bucket-sc",
        place: { ...makePlace("sc", "historic"), lat: 13.041, lng: 77.739 },
        order: 2,
        dwellMinutes: 45,
      },
    ];

    const baselineRoute: RouteData = {
      ...routeData,
      legs: [
        { distance: 1100, duration: 540, fromIndex: 0, toIndex: 1, fromPlaceId: "sa", toPlaceId: "sb" },
        { distance: 9300, duration: 3360, fromIndex: 1, toIndex: 2, fromPlaceId: "sb", toPlaceId: "sc" },
      ],
      waypointOrder: [0, 1, 2],
    };

    const plannedStops = buildPlannedStops(scoreItems, baselineRoute, settings);
    const candidates: Place[] = [
      {
        ...makePlace("replacement-close", "historic"),
        lat: 12.9752,
        lng: 77.611,
        rating: 4.8,
      },
      {
        ...makePlace("replacement-far", "historic"),
        lat: 13.112,
        lng: 77.82,
        rating: 4.2,
      },
    ];

    const suggestions = buildAutoFixSuggestions(scoreItems, plannedStops, candidates, settings);
    expect(suggestions.length).toBeGreaterThan(0);

    const bestSuggestion = suggestions[0];
    const replacedItems = scoreItems.map((item) =>
      item.id === bestSuggestion.itemId
        ? {
            ...item,
            place: bestSuggestion.candidate,
          }
        : item,
    );

    const improvedRoute: RouteData = {
      ...baselineRoute,
      legs: [
        { distance: 1100, duration: 540, fromIndex: 0, toIndex: 1, fromPlaceId: "sa", toPlaceId: "sb" },
        {
          distance: 2200,
          duration: 1020,
          fromIndex: 1,
          toIndex: 2,
          fromPlaceId: "sb",
          toPlaceId: bestSuggestion.candidate.id,
        },
      ],
    };

    const baselinePlanner = computePlanner(scoreItems, baselineRoute, settings);
    const improvedPlanner = computePlanner(replacedItems, improvedRoute, settings);

    expect(improvedPlanner.score.overall).toBeGreaterThan(baselinePlanner.score.overall);
  });

  it("returns no suggestions when there are no warning stops", () => {
    const calmRoute: RouteData = {
      ...routeData,
      legs: [
        { distance: 800, duration: 300, fromIndex: 0, toIndex: 1, fromPlaceId: "a", toPlaceId: "b" },
        { distance: 1000, duration: 420, fromIndex: 1, toIndex: 2, fromPlaceId: "b", toPlaceId: "c" },
      ],
    };

    const plannedStops = buildPlannedStops(items, calmRoute, settings);
    const candidates: Place[] = [
      { ...makePlace("d", "dining"), rating: 4.8 },
      { ...makePlace("e", "cafe"), rating: 4.4 },
    ];

    const suggestions = buildAutoFixSuggestions(items, plannedStops, candidates, settings);
    expect(suggestions).toHaveLength(0);
  });

  it("returns no suggestions when candidate pool is empty after dedupe", () => {
    const plannedStops = buildPlannedStops(items, routeData, settings);
    const existingOnlyCandidates = items.map((item) => item.place);

    const suggestions = buildAutoFixSuggestions(
      items,
      plannedStops,
      existingOnlyCandidates,
      settings,
    );

    expect(suggestions).toHaveLength(0);
  });
});
