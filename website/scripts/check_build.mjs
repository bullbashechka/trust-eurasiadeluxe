import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
async function walk(dir) {
  const children = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      children.map((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : join(dir, e.name),
      ),
    )
  ).flat();
}
const pages = (await walk(root)).filter((p) => p.endsWith(".html"));
assert.equal(pages.length, 5);
for (const file of pages) {
  const html = await readFile(file, "utf8");
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, file);
  assert.match(html, /<html lang="ru"/);
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:title"/);
  const refs = [...html.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)].map(
    (m) => m[1],
  );
  for (const ref of refs.filter(
    (r) => r.startsWith("/") && !r.startsWith("//"),
  )) {
    const dest = join(root, ref.endsWith("/") ? `${ref}index.html` : ref);
    assert.ok(
      (await stat(dest)).isFile(),
      `Missing linked asset ${ref} in ${file}`,
    );
  }
  if (!process.env.PUBLIC_WHATSAPP_NUMBER)
    assert.ok(
      !html.includes("https://wa.me/"),
      "Unconfigured contact should not be actionable",
    );
  const apartment = file.match(/apartments\/(\d+-\d+)/)?.[1];
  if (apartment)
    assert.ok(
      html.includes(apartment.replace("-", ",")),
      "Apartment title must match route",
    );
}
console.log(
  `Build verified: ${pages.length} pages; local links, images, titles and unconfigured contact state.`,
);
