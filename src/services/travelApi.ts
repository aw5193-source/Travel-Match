/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserPreferences, LocationMatch, DetailedLocationInfo } from "../types";

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error ||
      `The travel AI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return data as TResponse;
}

export async function getTravelMatches(
  preferences: UserPreferences,
): Promise<LocationMatch[]> {
  const data = await postJson<{ matches: LocationMatch[] }>(
    "/api/travel-matches",
    { preferences },
  );

  return data.matches;
}

export async function getLocationDetails(
  locationName: string,
): Promise<DetailedLocationInfo> {
  const data = await postJson<{ details: DetailedLocationInfo }>(
    "/api/location-details",
    { locationName },
  );

  return data.details;
}
