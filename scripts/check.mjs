import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { shouldPublish } from "../eleventy.config.js";

const output = new URL("../_site/", import.meta.url).pathname;
const stylesheet = readFileSync(new URL("../src/public/assets/css/site.css", import.meta.url), "utf8");
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

function contrast(foreground, background) {
  const luminance = (hex) => [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function mix(foreground, background, weight) {
  return `#${[1, 3, 5].map((offset) => {
    const front = Number.parseInt(foreground.slice(offset, offset + 2), 16);
    const back = Number.parseInt(background.slice(offset, offset + 2), 16);
    return Math.round(front * weight + back * (1 - weight)).toString(16).padStart(2, "0");
  }).join("")}`;
}

function colorTokens(selector) {
  const start = stylesheet.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing ${selector} color tokens`);
  const block = stylesheet.slice(start, stylesheet.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(([, name, value]) => [name, value]));
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
  assert.match(atom, /<\?xml-stylesheet href="\/feed\.xsl" type="text\/xsl"\?>/);
  assert.ok(existsSync(join(output, "feed.xsl")), "Atom feed stylesheet missing");
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

test("light and dark color roles meet WCAG AA contrast", () => {
  const themes = { light: colorTokens(":root"), dark: colorTokens('[data-theme="dark"]') };
  const textPairs = [
    ["ink", "paper"], ["ink-muted", "paper"], ["ink", "paper-raised"],
    ["ink-muted", "paper-raised"], ["ink", "paper-soft"], ["accent", "paper"],
    ["accent", "paper-raised"], ["accent", "paper-soft"], ["anchor-ink", "anchor"],
    ["on-anchor-accent", "anchor"], ["on-anchor-gold", "anchor"], ["selection-ink", "gold"]
  ];
  const uiPairs = [
    ["rule", "paper"], ["rule", "paper-raised"], ["rule", "paper-soft"],
    ["focus", "paper"], ["focus", "paper-raised"], ["focus", "paper-soft"],
    ["anchor-focus", "anchor"]
  ];

  for (const [theme, colors] of Object.entries(themes)) {
    for (const [foreground, background] of textPairs) {
      assert.ok(contrast(colors[foreground], colors[background]) >= 4.5, `${theme}: ${foreground} on ${background}`);
    }
    for (const [foreground, background] of uiPairs) {
      assert.ok(contrast(colors[foreground], colors[background]) >= 3, `${theme}: ${foreground} on ${background}`);
    }
    assert.ok(contrast(mix(colors["anchor-ink"], colors.anchor, 0.82), colors.anchor) >= 4.5, `${theme}: translucent hero text`);
    assert.ok(contrast(mix(colors["anchor-ink"], colors.anchor, 0.5), colors.anchor) >= 3, `${theme}: profile link border`);
  }
});
