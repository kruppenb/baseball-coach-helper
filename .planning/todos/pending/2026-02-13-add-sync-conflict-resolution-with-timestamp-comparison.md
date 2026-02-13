---
created: 2026-02-13T18:18:22.466Z
title: Add sync conflict resolution with timestamp comparison
area: sync
files:
  - src/sync/sync-engine.ts
  - src/sync/SyncContext.tsx
  - src/sync/useCloudStorage.ts
---

## Problem

The current sync engine uses last-write-wins (via Cosmos DB etag versioning) with no user awareness. If a coach makes local changes that are more recent than what's in the cloud, those changes silently overwrite cloud data (or vice versa). The coach has no visibility into when data was last modified on each side and no opportunity to choose which version to keep.

This matters most when a coach uses the app on multiple devices — e.g., edits roster on a laptop at home, then opens the app on a phone at the field where older local data might push up and overwrite the newer cloud version.

## Solution

- Track timestamps on both sides: localStorage writes should store a `lastModified` timestamp alongside each key, and cloud documents already have `_ts` from Cosmos DB
- On sync (push or pull), compare local `lastModified` vs cloud `_ts`
- If local is newer than cloud: prompt the coach with both timestamps and ask whether to overwrite cloud data
- UI: likely a modal/dialog showing "Local data (modified 2:30 PM) vs Cloud data (modified 1:15 PM) — which do you want to keep?"
- Consider: option to "always use most recent" as a preference toggle to avoid repeated prompts
- This replaces the silent last-write-wins behavior for authenticated users
