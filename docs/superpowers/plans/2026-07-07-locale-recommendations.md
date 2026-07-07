# Locale Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recommend and apply timezone, language, and geolocation spoofing settings from the current exit IP result.

**Architecture:** Extend `IpCheckResult` with provider location fields, add pure recommendation logic in `src/core/locale-recommendation.ts`, route apply/read actions through background messages, and surface the recommendation in popup/options. The recommendation writes to the default `LocaleProfile`; content spoofing remains a later feature.

**Tech Stack:** TypeScript, React, WXT runtime messages, Vitest.

---

## Tasks

### Task 1: Core Recommendation Logic

**Files:**
- Create: `src/core/locale-recommendation.ts`
- Create: `src/core/locale-recommendation.test.ts`
- Modify: `src/shared/types.ts`

- [ ] Add `LocaleRecommendation` and geolocation fields to shared types.
- [ ] Write tests for high-confidence provider fields, country fallback, and failure/no-data cases.
- [ ] Implement language parsing, country fallback map, and recommendation confidence.

### Task 2: Provider Field Mapping

**Files:**
- Modify: `src/ip-check/providers.ts`
- Modify: `src/ip-check/checker.test.ts`

- [ ] Add ipapi response fields for `latitude`, `longitude`, and `languages`.
- [ ] Normalize those fields into `IpCheckResult`.
- [ ] Extend tests so successful IP results can drive locale recommendation.

### Task 3: Runtime Messages And Settings Apply

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/messages.ts`
- Modify: `src/shared/messages.test.ts`
- Modify: `entrypoints/background.ts`

- [ ] Add `GET_LOCALE_RECOMMENDATION` and `APPLY_LOCALE_RECOMMENDATION`.
- [ ] Generate recommendations from the latest successful IP result.
- [ ] Apply recommendations by updating the default locale profile.

### Task 4: Popup And Options UI

**Files:**
- Modify: `entrypoints/popup/App.tsx`
- Modify: `entrypoints/popup/style.css`
- Modify: `entrypoints/options/App.tsx`
- Modify: `entrypoints/options/style.css`

- [ ] Show the recommended language, timezone, and approximate geolocation in popup.
- [ ] Add an apply button for the recommendation.
- [ ] Show the active default locale profile in options.

### Task 5: Verification

**Files:**
- Modify: `README.md`
- Refresh: `.codebase-memory/*`

- [ ] Document the recommendation behavior.
- [ ] Run `pnpm test`, `pnpm typecheck`, `pnpm build:chrome`, and `pnpm build:firefox`.
- [ ] Refresh codebase-memory index and commit.
