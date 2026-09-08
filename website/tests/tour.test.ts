import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { apartments, apartmentPath } from "../src/data/apartments.ts";
import { tourFrame } from "../src/data/timeline.ts";
import { whatsappLink } from "../src/data/contact.ts";

test("all approved scenes and responsive assets exist", () => {
  assert.deepEqual(
    apartments.map((a) => a.scenes.length),
    [8, 7, 12],
  );
  for (const a of apartments) {
    assert.match(
      apartmentPath(a.id),
      /^\/eurasia-deluxe\/apartments\/(36-67|39-87|79-79)\/$/,
    );
    const files = [
      a.cover,
      a.plan,
      ...a.scenes.flatMap((s) => [s.poster, s.desktop, s.mobile]),
    ];
    for (const file of files)
      assert.ok(existsSync(`public${file}`), `Missing ${file}`);
    assert.equal(new Set(a.scenes.map((s) => s.id)).size, a.scenes.length);
  }
});

test("scroll boundaries, crossfade, backward scrubbing and final frame", () => {
  assert.deepEqual(tourFrame(0, 8), { index: 0, time: 0, blend: 0 });
  assert.deepEqual(tourFrame(1, 8), { index: 7, time: 1, blend: 0 });
  const fade = tourFrame(0.95 / 8, 8);
  assert.equal(fade.index, 0);
  assert.equal(fade.time, 1);
  assert.ok(Math.abs(fade.blend - 0.5) < 1e-10);
  assert.deepEqual(tourFrame(1 / 8, 8), { index: 1, time: 0, blend: 0 });
  assert.ok(tourFrame(0.2, 8).time > tourFrame(0.15, 8).time);
  assert.deepEqual(tourFrame(-1, 8), tourFrame(0, 8));
  assert.deepEqual(tourFrame(2, 8), tourFrame(1, 8));
  assert.deepEqual(tourFrame(NaN, 8), tourFrame(0, 8));
  assert.throws(() => tourFrame(0, 0));
});

test("no fabricated WhatsApp link; valid link keeps apartment and safe encoded text", () => {
  for (const value of ["", "null", "+7 123", "javascript:alert(1)", "00000000"])
    assert.equal(whatsappLink(value), undefined);
  const link = new URL(
    whatsappLink(
      "77000000000",
      "36,67",
      "https://example.com/eurasia-deluxe/apartments/36-67/",
    )!,
  );
  assert.equal(link.origin, "https://wa.me");
  assert.ok(link.searchParams.get("text")?.includes("36,67 м²"));
  assert.ok(
    link.searchParams
      .get("text")
      ?.includes("https://example.com/eurasia-deluxe/apartments/36-67/"),
  );
});

test("media manifest covers exactly the 27 selected scenes and three photo movements", () => {
  const media = JSON.parse(readFileSync("public/media/manifest.json", "utf8"));
  assert.equal(media.length, 27);
  assert.equal(
    media.filter((m: { still_zoom: boolean }) => m.still_zoom).length,
    3,
  );
  for (const a of apartments)
    for (const scene of a.scenes)
      assert.ok(
        media.find(
          (m: { apartment: string; scene: string }) =>
            m.apartment === a.id && m.scene === scene.id,
        ),
      );
});
