import { describe, test, expect } from "bun:test";
import assert from "node:assert/strict";
import { validateCompanyForm, revealProgress } from "../src/data/company-form";
import {
  abortable,
  fetchProjectHTML,
  type ProjectFetcher,
} from "../src/data/company-navigation";

describe("company contact form", () => {
  test("requires a valid Kazakhstan number and allows an empty name", () => {
    expect(validateCompanyForm("", "").valid).toBe(false);
    expect(validateCompanyForm("  ", "+77010000000").valid).toBe(true);
    expect(validateCompanyForm("Тест", "+7 (701) 000-00-00").valid).toBe(true);
    expect(validateCompanyForm("Тест", "87010000000").valid).toBe(true);
  });
  test("rejects another +7 country and incomplete or foreign numbers", () => {
    for (const phone of [
      "+79161234567",
      "+12025550123",
      "+7701",
      "00000000000",
    ]) {
      expect(validateCompanyForm("Тест", phone).valid).toBe(false);
    }
  });
});

test("scroll reveal is reversible with stable fully hidden/visible boundaries", () => {
  const positions = [1000, 940, 780, 620, -500];
  const forward = positions.map((top) => revealProgress(top, 1000));
  expect(forward).toEqual([0, 0, 0.5, 1, 1]);
  expect(
    [...positions].reverse().map((top) => revealProgress(top, 1000)),
  ).toEqual([...forward].reverse());
  expect(revealProgress(850, 1000, 0)).toBe(1);
});

describe("project preparation failures", () => {
  const url = new URL("https://example.test/eurasia-deluxe/");
  const signal = new AbortController().signal;
  test("loads successful HTML with an abort signal", async () => {
    const fetcher: ProjectFetcher = async (_url, options) => {
      expect(options?.signal).toBe(signal);
      return new Response("<main>Project</main>", {
        headers: { "Content-Type": "text/html" },
      });
    };
    expect(await fetchProjectHTML(url, signal, fetcher)).toBe(
      "<main>Project</main>",
    );
  });
  test("rejects HTTP errors and non-HTML responses before page replacement", async () => {
    for (const response of [
      new Response("No", { status: 503 }),
      new Response("{}", { headers: { "Content-Type": "application/json" } }),
    ]) {
      await assert.rejects(fetchProjectHTML(url, signal, async () => response));
    }
  });
  test("network failure propagates to the recovery interface", async () => {
    await assert.rejects(
      fetchProjectHTML(url, signal, async () => {
        throw new TypeError("offline");
      }),
      /offline/,
    );
  });
  test("an aborted preparation rejects a stalled resource without waiting forever", async () => {
    const controller = new AbortController();
    const waiting = abortable(new Promise<void>(() => {}), controller.signal);
    controller.abort(new Error("timeout"));
    await assert.rejects(waiting, /timeout/);
    await assert.rejects(
      abortable(Promise.resolve(), controller.signal),
      /timeout/,
    );
  });
});
