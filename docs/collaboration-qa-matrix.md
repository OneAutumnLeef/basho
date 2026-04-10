# Collaboration QA Matrix

## Scope
This checklist validates multi-user voting permissions and concurrent trip save conflict handling.

## Test Accounts
- `owner`: Authenticated account that created the trip.
- `collaborator`: Different authenticated account with access to the shared trip.
- `outsider`: Authenticated account without access to private trip.
- `anonymous`: Not signed in.

## Preconditions
1. Create one private cloud trip (`trip-private`) with at least 2 stops.
2. Create one shared cloud trip (`trip-shared`) with at least 2 stops.
3. Open at least two browser sessions for `owner` (Tab A and Tab B).

## Vote Permission Matrix
| Scenario | User | Trip | Expected UI | Expected Write Result |
| --- | --- | --- | --- | --- |
| V1 | `owner` | `trip-private` | Vote buttons enabled | Vote persists and updates totals |
| V2 | `collaborator` | `trip-shared` | Vote buttons enabled | Vote persists and updates totals |
| V3 | `anonymous` | `trip-shared` | Vote disabled with sign-in message | No write attempted |
| V4 | `outsider` | `trip-private` | Vote disabled with access message | Mutation blocked with permission error |
| V5 | any signed-in user | local-only trip (`local-*`) | Vote buttons enabled | Vote stored in localStorage only |

## Concurrent Save Matrix
| Scenario | Setup | Action | Expected Result |
| --- | --- | --- | --- |
| C1 | `owner` Tab A and Tab B open same cloud trip | Tab A changes name and saves, then Tab B changes stops and saves without reloading | Tab B save is rejected with conflict toast; no silent overwrite |
| C2 | Conflict triggered in C1 | Tab B loads latest trip and retries save | Save succeeds and trip reflects merged user intent from latest baseline |
| C3 | New unsaved trip | Save for first time | Save succeeds and records `updatedAt` baseline |

## Restore Point Matrix
| Scenario | Setup | Action | Expected Result |
| --- | --- | --- | --- |
| R1 | Cloud trip with 2+ saves | Select older restore point and click restore | Trip name/stops/settings revert to selected snapshot and save succeeds |
| R2 | Local trip with 2+ saves | Select older restore point and click restore | Local trip state reverts and remains in local storage |
| R3 | Tab A and Tab B open same cloud trip | Tab A saves, Tab B restores stale snapshot | Conflict toast appears; no silent overwrite |

## Smoke Checklist
1. Verify `Trip changed elsewhere. Load latest trip and retry your save.` toast appears on stale save attempts.
2. Verify stale save does not delete or reorder cloud trip items.
3. Verify vote-disabled messages are specific:
   - `Sign in to vote on shared trips.`
   - `You don't have access to vote on this trip.`
4. Verify successful votes still invalidate and refresh trip vote summaries.
5. Verify restore-point selector populates after at least one successful save.
