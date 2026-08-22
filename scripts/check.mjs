import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { shouldPublish } from "../eleventy.config.js";

const output = new URL("../_site/", import.meta.url).pathname;
const canonical = "https://stephaniewyatt.net";
const baseline = [
  "/", "/welcome/", "/teaching/", "/jezebel/", "/invited-sermons/",
  "/covid/", "/ministry/", "/faith-statement/", "/my-life-books/",
  "/wyatt_JSOT_Citation/Wyatt_JSOT_Jezebel_Elijah_and_the_Widow_of_Zarephath_microdata/",
  "/about/", "/blog/", "/contact/", "/copyright/", "/projects/", "/tags/",
  "/yandex_86bdfe930f70f799/",
  "/documents/SMWyatt_Teaching_Philosophy_4_9_2016.pdf",
  "/documents/Wyatt-Advent05-Manger.pdf",
  "/documents/Wyatt_Each_generation_plays_a_role_in-preserving_Baptist_heritage.pdf",
  "/documents/smwyatt-cv.pdf"
];

function outputPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  if (clean === "/") return join(output, "index.html");
  if (clean.endsWith("/")) return join(output, clean, "index.html");
  return join(output, clean);
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("live sitemap routes remain available", () => {
  for (const route of baseline) assert.ok(existsSync(outputPath(route)), `missing ${route}`);
});

test("all internal HTML links and assets resolve with exact case", () => {
  for (const file of walk(output).filter((path) => path.endsWith(".html"))) {
    const html = readFileSync(file, "utf8");
    for (const [, target] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      if (/^(?:https?:|mailto:|tel:|data:|#)/.test(target)) continue;
      const resolved = target.startsWith("/") ? target : new URL(target, `file://${file}`).pathname;
      assert.ok(existsSync(outputPath(resolved)), `${file.replace(output, "/")} → ${target}`);
    }
  }
  assert.ok(existsSync(join(output, "pagefind/pagefind.js")), "Pagefind module missing");
});

test("feeds and sitemap use the canonical host", () => {
  const sitemap = readFileSync(join(output, "sitemap.xml"), "utf8");
  const atom = readFileSync(join(output, "feed.xml"), "utf8");
  const rss = readFileSync(join(output, "feed.rss"), "utf8");
  const json = JSON.parse(readFileSync(join(output, "feed.json"), "utf8"));
  const twtxt = readFileSync(join(output, "twtxt.txt"), "utf8");

  for (const document of [sitemap, atom, rss, JSON.stringify(json), twtxt]) {
    assert.ok(document.includes(canonical), "canonical host missing");
    assert.ok(!document.includes("www.stephaniewyatt.net"), "www host drifted back in");
    assert.ok(!document.includes("_drafts"), "draft leaked into public output");
  }
  assert.match(atom, /<feed[^>]+xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/);
  assert.match(atom, /<entry>/);
  assert.match(rss, /<rss version="2\.0">/);
  assert.match(rss, /<item>/);
  assert.equal(json.version, "https://jsonfeed.org/version/1.1");
  assert.equal(json.items.length, 8);
  for (const line of twtxt.split("\n").filter((line) => line && !line.startsWith("#"))) {
    assert.match(line, /^\d{4}-\d{2}-\d{2}T[^\t]+\t.+https:\/\/stephaniewyatt\.net\//);
  }
});

test("draft and privacy rules are enforced", () => {
  assert.equal(shouldPublish({ published: false }), false);
  assert.equal(shouldPublish({ published: true }), true);
  assert.equal(shouldPublish({}), true);
  assert.ok(!existsSync(join(output, "_drafts")));

  const html = walk(output)
    .filter((path) => path.endsWith(".html"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.doesNotMatch(html, /219 Pebble Brook|\(865\)\s*406|Rev\.?\s+Dr\.?|earned (?:her )?Ph\.D/i);
  assert.match(readFileSync(join(output, "cv/index.html"), "utf8"), /Ph\.D\. Candidate, Biblical Interpretation · August 2005–May 2016/);
  assert.doesNotMatch(readFileSync(join(output, "documents/stephaniewyatt.tel.vcf"), "utf8"), /TEL|ADR|GEO/);
  assert.deepEqual(
    readFileSync(join(output, "documents/SMWyatt_CV_2026_rev2.pdf")),
    readFileSync(join(output, "documents/smwyatt-cv.pdf"))
  );
});

test("search index and licenses are present", () => {
  assert.ok(walk(join(output, "pagefind")).some((path) => path.endsWith(".pf_index")));
  assert.ok(existsSync(join(output, "assets/icons/CC_BY-SA_icon.svg")));
  const footer = readFileSync(join(output, "index.html"), "utf8");
  assert.match(footer, /rel="license"/);
  assert.match(footer, /CC BY-SA 4\.0/);
});
