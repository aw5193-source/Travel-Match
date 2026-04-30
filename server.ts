/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import type {
  DetailedLocationInfo,
  LocationMatch,
  UserPreferences,
} from "./src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, ".env"), quiet: true });

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const openAiModel = process.env.OPENAI_MODEL || "gpt-5.4-mini";

app.use(express.json({ limit: "1mb" }));

type JsonObject = Record<string, unknown>;

class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const locationMatchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    country: { type: "string" },
    description: { type: "string" },
    matchScore: { type: "number" },
    coordinates: {
      type: "object",
      additionalProperties: false,
      properties: {
        lat: { type: "number" },
        lng: { type: "number" },
      },
      required: ["lat", "lng"],
    },
  },
  required: ["name", "country", "description", "matchScore", "coordinates"],
};

const travelMatchesSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    matches: {
      type: "array",
      items: locationMatchSchema,
    },
  },
  required: ["matches"],
};

const itemWithSourceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    sourceLink: { type: "string" },
  },
  required: ["name", "description", "sourceLink"],
};

const residentialSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    type: { type: "string" },
    description: { type: "string" },
    priceRange: { type: "string" },
    sourceLink: { type: "string" },
  },
  required: ["name", "type", "description", "priceRange", "sourceLink"],
};

const locationDetailsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overview: { type: "string" },
    residential: {
      type: "array",
      items: residentialSchema,
    },
    places: {
      type: "array",
      items: itemWithSourceSchema,
    },
    food: {
      type: "array",
      items: itemWithSourceSchema,
    },
    activities: {
      type: "array",
      items: itemWithSourceSchema,
    },
  },
  required: ["overview", "residential", "places", "food", "activities"],
};

function compactList(values?: string[]) {
  return values?.length ? values.join(", ") : "None selected";
}

function preferencePrompt(preferences: UserPreferences) {
  const priorities = Object.entries(preferences.priorities || {})
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(", ");

  return `Based on these detailed travel preferences:
- Primary vibes: ${compactList(preferences.vibe)}
- Budget: ${preferences.budget}
- Climate: ${preferences.climate}
- Travelers: ${preferences.travelers}
- Scenery preferences: ${compactList(preferences.scenery)}
- Cultural interests: ${compactList(preferences.culture)}
- Food interests: ${compactList(preferences.food)}
- Adventure activities: ${compactList(preferences.adventure)}
- Nightlife/events: ${compactList(preferences.nightlife)}
- Priorities: ${priorities || "None selected"}
- Atmosphere and pace: ${preferences.pace || "neutral"} pace in a ${preferences.density || "neutral"} environment
- Custom constraints/needs: ${preferences.customDirectives || "None"}
- Additional interests: ${compactList(preferences.interests)}

Recommend exactly 5 travel locations globally that are the absolute best fit.
Give a match score from 0 to 100 based on the stated factors.`;
}

function detailsPrompt(locationName: string) {
  return `Provide detailed travel information for ${locationName}.
Include:
1. An overview description.
2. 3 residential options, such as hotels or stays. Prefer well-established, real properties that are likely to have public reference pages.
3. 3 famous views and sites.
4. 3 famous foods or local specialties.
5. 3 major events or activities.

For each item, provide:
- name
- description with 2-3 useful sentences
- sourceLink as a real or highly relevant URL, such as an official site, tourism board, or reputable guide
- for residential options, also include type and priceRange.`;
}

const imageCache = new Map<string, Promise<string[]>>();

function significantTokens(value: string) {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "at",
    "by",
    "for",
    "hotel",
    "hotels",
    "inn",
    "of",
    "resort",
    "spa",
    "suites",
    "the",
    "to",
  ]);

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function titleLooksRelevant(title: string, subject: string, strict: boolean) {
  const titleTokens = new Set(significantTokens(title));
  const subjectTokens = significantTokens(subject);

  if (!subjectTokens.length) {
    return false;
  }

  const matches = subjectTokens.filter((token) => titleTokens.has(token)).length;

  if (strict) {
    return matches >= Math.min(subjectTokens.length, 3);
  }

  return (
    matches >= Math.min(subjectTokens.length, 2) ||
    matches / subjectTokens.length >= 0.65 ||
    (subjectTokens.length <= 3 && matches >= 1)
  );
}

function subjectVariants(subject: string) {
  const strippedParenthetical = subject.replace(/\s*\([^)]*\)/g, "").trim();
  const variants = [
    subject,
    strippedParenthetical,
    strippedParenthetical.replace(/\bBamboo Grove\b/i, "Bamboo Forest"),
    strippedParenthetical.replace(/\bryori\b/i, "").trim(),
    strippedParenthetical.replace(/\bexperience\b/i, "").trim(),
    strippedParenthetical.replace(/\bsightseeing\b/i, "").trim(),
  ];

  return [...new Set(variants.filter(Boolean))];
}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 TravelMatch/1.0 (local development image lookup)",
      ...headers,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as JsonObject | null;
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 TravelMatch/1.0 (local development image lookup)",
      ...headers,
    },
  });

  if (!response.ok) {
    return "";
  }

  return await response.text().catch(() => "");
}

function normalizedImageUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.replace(/&amp;/g, "&").trim();

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
      pathname.endsWith(".svg")
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function uniqueImageUrls(values: unknown[]) {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const value of values) {
    const url = normalizedImageUrl(value);
    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    urls.push(url);
  }

  return urls;
}

function imageResultLooksUseful(result: JsonObject) {
  const text = [
    result.title,
    result.url,
    result.image,
    result.thumbnail,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  const blockedTerms = [
    "clipart",
    "favicon",
    "flag",
    "icon",
    "logo",
    "map",
    "seal",
    "transparent png",
    "vector",
  ];

  return !blockedTerms.some((term) => text.includes(term));
}

function extractDuckDuckGoToken(html: string) {
  return (
    html.match(/vqd=['"]?([^'"&<>\s]+)['"]?/)?.[1] ||
    html.match(/"vqd":"([^"]+)"/)?.[1] ||
    ""
  );
}

async function searchWebImageCandidates(subject: string, context?: string, category?: string) {
  const query = [subject, context, category].filter(Boolean).join(" ");
  const searchUrl = `https://duckduckgo.com/?${new URLSearchParams({
    q: query,
    iax: "images",
    ia: "images",
  })}`;
  const html = await fetchText(searchUrl);
  const token = extractDuckDuckGoToken(html);

  if (!token) {
    return [];
  }

  const params = new URLSearchParams({
    l: "us-en",
    o: "json",
    q: query,
    vqd: token,
    f: ",,,",
    p: "1",
  });
  const data = await fetchJson(`https://duckduckgo.com/i.js?${params}`, {
    Accept: "application/json, text/javascript, */*; q=0.01",
    Referer: "https://duckduckgo.com/",
  });
  const results = Array.isArray(data?.results) ? data.results : [];
  const candidates: string[] = [];

  for (const result of results.slice(0, 8)) {
    if (!result || typeof result !== "object") {
      continue;
    }

    const imageResult = result as JsonObject;
    if (!imageResultLooksUseful(imageResult)) {
      continue;
    }

    candidates.push(String(imageResult.image || ""));
    candidates.push(String(imageResult.thumbnail || ""));
  }

  return uniqueImageUrls(candidates).slice(0, 8);
}

async function searchWikipediaImage(subject: string, query: string, strict: boolean) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "6",
    prop: "pageimages|info",
    piprop: "thumbnail|original",
    pithumbsize: "1400",
    inprop: "url",
    format: "json",
    origin: "*",
  });
  const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const pages = (data?.query as JsonObject | undefined)?.pages as JsonObject | undefined;

  if (!pages) {
    return "";
  }

  const orderedPages = Object.values(pages)
    .filter((page): page is JsonObject => Boolean(page && typeof page === "object"))
    .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));

  for (const page of orderedPages) {
    const title = String(page.title || "");
    const thumbnail = page.thumbnail as JsonObject | undefined;
    const original = page.original as JsonObject | undefined;
    const source =
      typeof thumbnail?.source === "string"
        ? thumbnail.source
        : typeof original?.source === "string"
          ? original.source
          : "";

    if (source && titleLooksRelevant(title, subject, strict)) {
      return source;
    }
  }

  return "";
}

async function searchWikipediaSummaryImage(subject: string, strict: boolean) {
  const title = encodeURIComponent(subject.trim().replace(/\s+/g, "_"));
  const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);

  if (!data) {
    return "";
  }

  const pageTitle = String(data.title || data.displaytitle || subject);
  const thumbnail = data.thumbnail as JsonObject | undefined;
  const original = data.originalimage as JsonObject | undefined;
  const source =
    typeof thumbnail?.source === "string"
      ? thumbnail.source
      : typeof original?.source === "string"
        ? original.source
        : "";

  if (source && titleLooksRelevant(pageTitle, subject, strict)) {
    return source;
  }

  return "";
}

async function searchCommonsImage(subject: string, query: string, strict: boolean) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "1400",
    format: "json",
    origin: "*",
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const pages = (data?.query as JsonObject | undefined)?.pages as JsonObject | undefined;

  if (!pages) {
    return "";
  }

  const blockedTerms = ["coat of arms", "flag", "logo", "map", "seal", "svg"];
  const orderedPages = Object.values(pages)
    .filter((page): page is JsonObject => Boolean(page && typeof page === "object"))
    .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));

  for (const page of orderedPages) {
    const title = String(page.title || "");
    const lowerTitle = title.toLowerCase();

    if (blockedTerms.some((term) => lowerTitle.includes(term))) {
      continue;
    }

    if (!titleLooksRelevant(title, subject, strict)) {
      continue;
    }

    const imageInfo = Array.isArray(page.imageinfo) ? page.imageinfo[0] as JsonObject | undefined : undefined;
    const mime = String(imageInfo?.mime || "");
    const source =
      typeof imageInfo?.thumburl === "string"
        ? imageInfo.thumburl
        : typeof imageInfo?.url === "string"
          ? imageInfo.url
          : "";

    if (source && mime.startsWith("image/")) {
      return source;
    }
  }

  return "";
}

async function resolveImageCandidates({
  subject,
  context,
  category,
  strict = false,
}: {
  subject: string;
  context?: string;
  category?: string;
  strict?: boolean;
}) {
  const trimmedSubject = subject.trim();
  if (!trimmedSubject) {
    return [];
  }

  const cacheKey = [trimmedSubject, context || "", category || "", strict ? "strict" : "loose"]
    .join("|")
    .toLowerCase();

  if (!imageCache.has(cacheKey)) {
    imageCache.set(
      cacheKey,
      (async () => {
        for (const variant of subjectVariants(trimmedSubject)) {
          const searchedImages = await searchWebImageCandidates(variant, context, category);
          if (searchedImages.length) return searchedImages;
        }

        for (const variant of subjectVariants(trimmedSubject)) {
          const summaryImage = await searchWikipediaSummaryImage(variant, strict);
          if (summaryImage) return [summaryImage];
        }

        for (const variant of subjectVariants(trimmedSubject)) {
          const query = [variant, context, category].filter(Boolean).join(" ");
          const wikipediaImage = await searchWikipediaImage(variant, query, strict);
          if (wikipediaImage) return [wikipediaImage];
        }

        for (const variant of subjectVariants(trimmedSubject)) {
          const query = [variant, context, category].filter(Boolean).join(" ");
          const commonsImage = await searchCommonsImage(variant, query, strict);
          if (commonsImage) return [commonsImage];
        }

        return [];
      })(),
    );
  }

  return imageCache.get(cacheKey)!;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<U>,
) {
  const results = new Array<U>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

async function withMatchImages(matches: Omit<LocationMatch, "id" | "imageUrl">[]) {
  return mapWithConcurrency(
    matches,
    3,
    async (match, index) => {
      const images = await resolveImageCandidates({
        subject: match.name,
        context: match.country,
        category: "travel",
      });

      return {
        ...match,
        id: `location-${index}`,
        matchScore: Math.max(0, Math.min(100, Math.round(match.matchScore))),
        imageUrl: images[0] || "",
        images: images.slice(1),
      };
    },
  );
}

async function withDetailImages(details: DetailedLocationInfo, locationName: string) {
  const addImages = async <T extends { name: string }>(
    items: T[],
    category: string,
    strict = false,
  ) =>
    mapWithConcurrency(
      items,
      2,
      async (item) => {
        const images = await resolveImageCandidates({
          subject: item.name,
          context: locationName,
          category,
          strict,
        });

        return {
          ...item,
          imageUrl: images[0] || "",
          images: images.slice(1),
        };
      },
    );

  return {
    ...details,
    residential: await addImages(details.residential, "hotel", true),
    places: await addImages(details.places, "landmark"),
    food: await addImages(details.food, "food"),
    activities: await addImages(details.activities, "activity"),
  };
}

function getOutputText(data: JsonObject) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) =>
      typeof item === "object" && item && Array.isArray((item as JsonObject).content)
        ? ((item as JsonObject).content as unknown[])
        : [],
    )
    .map((content) => {
      if (!content || typeof content !== "object") return "";
      const typed = content as JsonObject;
      if (typeof typed.text === "string") return typed.text;
      if (typeof typed.refusal === "string") return typed.refusal;
      return "";
    })
    .join("");
}

async function requestStructuredJson<T>(
  name: string,
  schema: JsonObject,
  prompt: string,
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ApiError(
      "OpenAI is not configured yet. Add OPENAI_API_KEY to .env.local and restart the dev server.",
      503,
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel,
      instructions:
        "You are a precise travel matching engine. Return only schema-valid JSON with practical, specific travel recommendations.",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as JsonObject | null;

  if (!response.ok) {
    const error = data?.error as JsonObject | undefined;
    const apiMessage =
      typeof error?.message === "string"
        ? error.message
        : `OpenAI request failed with status ${response.status}.`;
    throw new ApiError(sanitizeOpenAiError(apiMessage), response.status);
  }

  if (!data) {
    throw new ApiError("OpenAI returned an empty response.");
  }

  const outputText = getOutputText(data);

  if (!outputText) {
    throw new ApiError("OpenAI returned no text output.");
  }

  try {
    return JSON.parse(outputText) as T;
  } catch {
    throw new ApiError("OpenAI returned JSON that could not be parsed.");
  }
}

function sanitizeOpenAiError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("incorrect api key")) {
    return "The OpenAI API key was rejected. Check OPENAI_API_KEY in .env.local, then restart the dev server.";
  }

  if (normalized.includes("you exceeded your current quota")) {
    return "The OpenAI account has no available quota. Check billing or usage limits, then try again.";
  }

  if (normalized.includes("model") && normalized.includes("does not exist")) {
    return `The configured OpenAI model (${openAiModel}) is not available for this API key. Set OPENAI_MODEL in .env.local to a model your account can use.`;
  }

  return message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***");
}

function handleError(error: unknown, res: express.Response) {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError("Something went wrong while contacting the travel AI.");

  if (!(error instanceof ApiError)) {
    console.error(error);
  }

  res.status(apiError.statusCode).json({ error: apiError.message });
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "openai",
    model: openAiModel,
    configured: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.post("/api/travel-matches", async (req, res) => {
  try {
    const preferences = req.body?.preferences as UserPreferences | undefined;

    if (!preferences) {
      throw new ApiError("Travel preferences are required.", 400);
    }

    const result = await requestStructuredJson<{
      matches: Omit<LocationMatch, "id" | "imageUrl">[];
    }>("travel_matches", travelMatchesSchema, preferencePrompt(preferences));

    res.json({ matches: await withMatchImages(result.matches) });
  } catch (error) {
    handleError(error, res);
  }
});

app.post("/api/location-details", async (req, res) => {
  try {
    const locationName = String(req.body?.locationName || "").trim();

    if (!locationName) {
      throw new ApiError("A location name is required.", 400);
    }

    const details = await requestStructuredJson<DetailedLocationInfo>(
      "location_details",
      locationDetailsSchema,
      detailsPrompt(locationName),
    );

    res.json({ details: await withDetailImages(details, locationName) });
  } catch (error) {
    handleError(error, res);
  }
});

if (isProduction) {
  const distPath = path.resolve(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  const vite = await createViteServer({
    appType: "spa",
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== "true",
    },
  });
  app.use(vite.middlewares);
}

app.listen(port, "0.0.0.0", () => {
  const keyStatus = process.env.OPENAI_API_KEY ? "configured" : "missing";
  console.log(`Travel Match running at http://localhost:${port}`);
  console.log(`OpenAI key: ${keyStatus}; model: ${openAiModel}`);
  if (isProduction && !fs.existsSync(path.resolve(__dirname, "dist", "index.html"))) {
    console.warn("Production mode is enabled, but dist/index.html was not found.");
  }
});
