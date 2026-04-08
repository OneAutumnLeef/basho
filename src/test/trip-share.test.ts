import { describe, expect, it } from "vitest";
import {
  buildShareableTripPayload,
  buildShareableTripUrl,
  decodeShareableTrip,
  encodeShareableTrip,
} from "@/lib/trip-share";
import { PlannerSettings } from "@/types/places";

const settings: PlannerSettings = {
  city: "Bangalore",
  vibe: "Night Out",
  startTime: "18:30",
  timeWindow: "evening",
  pace: "balanced",
};

describe("trip-share utilities", () => {
  it("encodes and decodes share payload safely", () => {
    const payload = buildShareableTripPayload({
      name: "Weekend Crawl",
      settings,
      routeMode: "optimize",
      score: 82,
      stops: [
        {
          itemId: "bucket-a",
          order: 0,
          place: {
            id: "a",
            originalId: "a",
            name: "Cafe A",
            address: "Address A",
            lat: 12.97,
            lng: 77.59,
            category: "cafe",
            tags: [],
            createdAt: new Date().toISOString(),
          },
          arrivalTime: "18:30",
          departureTime: "19:10",
          dwellMinutes: 40,
          travelMinutesFromPrevious: 0,
          warnings: [],
        },
      ],
    });

    const token = encodeShareableTrip(payload);
    const decoded = decodeShareableTrip(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe("Weekend Crawl");
    expect(decoded?.stops[0].name).toBe("Cafe A");
    expect(decoded?.settings.timeWindow).toBe("evening");
  });

  it("builds share URL with encoded plan token", () => {
    const url = buildShareableTripUrl("abc123", "https://example.com/app");
    expect(url).toContain("plan=abc123");
  });
});
