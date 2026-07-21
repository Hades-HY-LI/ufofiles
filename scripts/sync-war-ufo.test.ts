import assert from "node:assert/strict";
import test from "node:test";
import type { CaseRecord } from "../lib/types";
import type { Discovery } from "./sync-war-ufo";
import {
  assertCumulativeSnapshot,
  buildMetadata,
  buildReleaseTagMap,
  buildReleases,
  coordinatesForLocation,
  discoverCsvRecords,
  mergeCases,
  normalizeIncidentDate,
  normalizeReleaseDate,
  parseContentRange,
  parseCsv,
  parseZipDirectoryTail,
  shouldPreserveFreshMetadata
} from "./sync-war-ufo";
import {
  readTextBounded,
  safeFetch,
  validatedHttpsUrl
} from "./war-ufo-network";

const header = [
  "Release Date",
  "Title",
  "Type",
  "Description Blurb",
  "DVIDS Video ID",
  "Agency",
  "Incident Date",
  "Incident Location",
  "PDF | Image Link",
  "Modal Image",
  "Redaction",
  "Image VIRIN"
].join(",");

test("cumulative CSV derives sequential release tags and keeps pipe-delimited DVIDS IDs on one row", () => {
  const csv = [
    `\uFEFF${header}`,
    '5/8/26,First record,PDF,"Description, with comma",,AARO,3/22/49,Texas,https://www.war.gov/a.pdf,,false,',
    "5/22/26,Second record,VID,Video row,12345|67890,AARO,2021,Iraq,,,false,",
    "6/12/26,Third record,IMG,Image row,,NASA,2022,Japan,https://www.war.gov/c.jpg,,false,VIRIN-3",
    "7/10/26,Fourth record,AUD,Audio row, 444 | invalid | 555 ,NASA,2023,Germany,,,false,",
    "",
    "   "
  ].join("\r\n");

  const records = discoverCsvRecords(csv);
  assert.equal(records.length, 4);
  assert.deepEqual(records.map((record) => record.tags?.find((tag) => tag.startsWith("release-"))), [
    "release-01",
    "release-02",
    "release-03",
    "release-04"
  ]);
  assert.match(records[3].id ?? "", /^pursue-release-04-/);
  assert.match(records[3].sourceUrl, /releaseDate=Release\+04$/);
  assert.equal(records[1].mediaUrl, "https://www.dvidshub.net/video/embed/12345");
  assert.equal(records[3].mediaUrl, "https://www.dvidshub.net/audio/embed/444");
  assert.equal(records[0].summary, "Description, with comma");
  assert.equal(records[0].incidentDate, "1949-03-22");
});

test("release mapping continues deterministically for later dates", () => {
  const tags = buildReleaseTagMap([
    "2027-01-01",
    "2026-07-10",
    "2026-05-08",
    "2026-06-12",
    "2026-05-22",
    "2026-07-10"
  ]);
  assert.deepEqual([...tags], [
    ["2026-05-08", "release-01"],
    ["2026-05-22", "release-02"],
    ["2026-06-12", "release-03"],
    ["2026-07-10", "release-04"],
    ["2027-01-01", "release-05"]
  ]);
});

test("release records are rebuilt without stale releases or counts", () => {
  const cases = [
    makeCase("one", "2026-05-08", "release-01"),
    makeCase("two", "2026-05-22", "release-02"),
    makeCase("three", "2026-05-22", "release-02")
  ];
  const releases = buildReleases(cases);
  assert.deepEqual(releases.map(({ id, fileCount }) => ({ id, fileCount })), [
    { id: "pursue-release-01", fileCount: 1 },
    { id: "pursue-release-02", fileCount: 2 }
  ]);
});

test("official record-code reconciliation preserves IDs across title typo corrections", () => {
  const corrections = [
    {
      id: "pursue-release-02-dow-uap-pr053-cigar-shaped-or-fast-sherical-uap",
      before: "DOW-UAP-PR053, Cigar Shaped or Fast Sherical UAP",
      after: "DOW-UAP-PR053, Cigar Shaped or Fast Spherical UAP"
    },
    {
      id: "pursue-release-03-dow-uap-d052-correspondance-regarding-uap",
      before: "DOW-UAP-D052, Correspondance Regarding UAP",
      after: "DOW-UAP-D052, Correspondence Regarding UAP"
    },
    {
      id: "pursue-release-04-nasa-uap-d007-techincal-report",
      before: "NASA-UAP-D007, Techincal Report",
      after: "NASA-UAP-D007, Technical Report"
    },
    {
      id: "pursue-release-04-cia-uap-002-teh-report",
      before: "CIA-UAP-002, Teh Report",
      after: "CIA-UAP-002, The Report"
    }
  ];
  const previous = corrections.map((correction, index) => ({
    ...makeCase(correction.id, `2026-0${index + 5}-08`, `release-0${index + 2}`),
    title: correction.before
  }));
  const discoveries: Discovery[] = corrections.map((correction, index) => ({
    title: correction.after,
    sourceUrl: "https://www.war.gov/ufo/",
    mediaUrl: null,
    releaseDate: `2026-0${index + 5}-08`,
    agency: index === 2 ? "NASA" : "Department of War",
    type: "document",
    summary: `Corrected ${correction.after}`,
    tags: [`release-0${index + 2}`]
  }));

  const merged = mergeCases(previous, discoveries);
  assert.deepEqual(new Set(merged.map((record) => record.id)), new Set(corrections.map(({ id }) => id)));
  for (const correction of corrections) {
    assert.equal(merged.find((record) => record.id === correction.id)?.title, correction.after);
  }
});

test("degraded metadata cannot report a prior fresh status", () => {
  const existing = [makeCase("one", "2026-05-08", "release-01")];
  const metadata = buildMetadata(existing, existing, "partial", {
    attemptedAt: "2026-07-21T12:00:00.000Z",
    lastSuccessfulAt: "2026-07-20T12:00:00.000Z",
    sourceError: "CSV unavailable: HTTP 403; portal unavailable: HTTP 403"
  });
  assert.equal(metadata.status, "partial");
  assert.equal(metadata.lastAttemptedAt, "2026-07-21T12:00:00.000Z");
  assert.equal(metadata.lastSuccessfulAt, "2026-07-20T12:00:00.000Z");
  assert.match(metadata.sourceError ?? "", /403/);
});

test("fresh metadata is preserved only for identical hashed input and unchanged output", () => {
  const existing = [makeCase("one", "2026-05-08", "release-01")];
  const releases = buildReleases(existing);
  const hash = "a".repeat(64);
  const previousMetadata = buildMetadata(existing, existing, "fresh", {
    attemptedAt: "2026-07-20T12:00:00.000Z",
    lastSuccessfulAt: "2026-07-20T12:00:00.000Z",
    csvSha256: hash
  });
  const computedMetadata = buildMetadata(existing, existing, "fresh", {
    attemptedAt: "2026-07-21T12:00:00.000Z",
    lastSuccessfulAt: "2026-07-21T12:00:00.000Z",
    csvSha256: hash
  });
  const base = {
    previousMetadata,
    computedMetadata,
    previousCases: existing,
    nextCases: existing,
    previousReleases: releases,
    nextReleases: releases,
    csvSha256: hash
  };

  assert.equal(shouldPreserveFreshMetadata({ ...base, status: "fresh" }), true);
  assert.equal(shouldPreserveFreshMetadata({ ...base, status: "partial" }), false);
  assert.equal(shouldPreserveFreshMetadata({ ...base, status: "failed" }), false);
  assert.equal(
    shouldPreserveFreshMetadata({ ...base, status: "fresh", csvSha256: "b".repeat(64) }),
    false
  );
  assert.equal(
    shouldPreserveFreshMetadata({
      ...base,
      status: "fresh",
      nextReleases: [...releases, { ...releases[0], id: "pursue-release-02" }]
    }),
    false
  );
});

test("cumulative snapshot guard rejects truncated releases before replacement", () => {
  const existing = [
    makeCase("one", "2026-05-08", "release-01"),
    makeCase("two", "2026-05-22", "release-02")
  ];
  assert.throws(
    () => assertCumulativeSnapshot(existing, [{ releaseDate: "2026-05-08" }]),
    /cumulative CSV regressed/
  );
  assert.doesNotThrow(() =>
    assertCumulativeSnapshot(existing, [
      { releaseDate: "2026-05-08" },
      { releaseDate: "2026-05-22" },
      { releaseDate: "2026-06-12" }
    ])
  );
});

test("cumulative snapshot guard rejects same-count identity replacement but allows code corrections", () => {
  const prior = {
    ...makeCase("historical-id", "2026-05-22", "release-02"),
    title: "DOW-UAP-PR053, Sherical UAP",
    mediaUrl: "https://www.war.gov/old-pr053.pdf",
    tags: ["official", "csv", "release-02"]
  };
  assert.throws(
    () =>
      assertCumulativeSnapshot([prior], [
        {
          releaseDate: "2026-05-22",
          title: "CIA-UAP-999, Replacement Record",
          mediaUrl: "https://www.war.gov/replacement.pdf"
        }
      ]),
    /no longer contains a unique identity/
  );
  assert.doesNotThrow(() =>
    assertCumulativeSnapshot([prior], [
      {
        releaseDate: "2026-05-22",
        title: "DOW-UAP-PR053, Spherical UAP",
        mediaUrl: "https://www.war.gov/corrected-pr053.pdf"
      }
    ])
  );
});

test("date and location normalization handle post-2026 dates and New Mexico precedence", () => {
  assert.equal(normalizeReleaseDate("7/10/27"), "2027-07-10");
  assert.equal(normalizeIncidentDate("3/22/49", new Date("2026-07-21T00:00:00Z")), "1949-03-22");
  assert.equal(normalizeIncidentDate("3/22/22", new Date("2026-07-21T00:00:00Z")), "2022-03-22");
  assert.equal(normalizeIncidentDate("7/10/27", new Date("2027-01-01T00:00:00Z")), "2027-07-10");
  assert.deepEqual(coordinatesForLocation("New Mexico"), {
    latitude: 34.5199,
    longitude: -105.8701
  });
});

test("network URL and bounded-read helpers reject unsafe inputs", async () => {
  const hosts = new Set(["www.war.gov"]);
  assert.equal(validatedHttpsUrl("https://www.war.gov/ufo", hosts).hostname, "www.war.gov");
  for (const unsafe of [
    "http://www.war.gov/ufo",
    "https://user:pass@www.war.gov/ufo",
    "https://www.war.gov:444/ufo",
    "https://evil.www.war.gov/ufo"
  ]) {
    assert.throws(() => validatedHttpsUrl(unsafe, hosts));
  }
  await assert.rejects(
    () => readTextBounded(new Response("12345"), 4),
    /exceeds 4 bytes/
  );
  assert.deepEqual(parseContentRange("bytes 10-19/20"), { start: 10, end: 19, total: 20 });
  assert.equal(parseContentRange("bytes 10-20/20"), null);
  assert.throws(() => parseZipDirectoryTail(Buffer.alloc(22), 0), /not found/);

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://attacker.example/redirect" }
      })) as typeof fetch;
    await assert.rejects(
      () => safeFetch("https://www.war.gov/ufo", { allowedHosts: hosts }),
      /host is not allowed/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CSV rejects empty input, missing required headers, and malformed quotes", () => {
  assert.throws(() => discoverCsvRecords(""), /empty/);
  assert.throws(() => discoverCsvRecords("Title,Type\nA,PDF"), /missing required column/);
  assert.throws(() => parseCsv('Title,"broken'), /unterminated/);
});

function makeCase(id: string, releaseDate: string, releaseTag: string): CaseRecord {
  return {
    id,
    title: id,
    agency: "AARO",
    releaseDate,
    incidentDate: null,
    locationName: "Unknown location",
    latitude: null,
    longitude: null,
    type: "document",
    sourceUrl: `https://www.war.gov/UFO/${id}/?releaseDate=Release+${releaseTag.slice(-2)}`,
    mediaUrl: null,
    summary: id,
    tags: ["official", releaseTag],
    confidence: "official-source"
  };
}
