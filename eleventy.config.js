import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import { readFileSync } from "node:fs";
import YAML from "yaml";

export function shouldPublish(data = {}) {
  return data.published !== false;
}

export default function (eleventyConfig) {
  eleventyConfig.addDataExtension("yaml,yml", (contents) => YAML.parse(contents));
  eleventyConfig.addGlobalData("currentYear", () => new Date().getUTCFullYear());
  eleventyConfig.addGlobalData("siteCss", () => readFileSync("src/public/assets/css/site.css", "utf8"));
  eleventyConfig.addPassthroughCopy({ "src/public/": "/" });
  eleventyConfig.ignores.add("src/content/_drafts/**");

  eleventyConfig.addPreprocessor("published", "*", (data) => {
    if (!shouldPublish(data)) return false;
  });

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/content/posts/*.md")
      .filter((item) => shouldPublish(item.data))
      .sort((a, b) => a.date - b.date)
  );

  eleventyConfig.addFilter("readableDate", (date) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).format(new Date(date))
  );
  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString());
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  eleventyConfig.addPlugin(feedPlugin, {
    outputPath: "/feed.xml",
    stylesheet: "/feed.xsl",
    collection: { name: "posts", limit: 20 },
    metadata: {
      language: "en-US",
      title: "Stephanie M. Wyatt",
      subtitle: "Writing on ministry, biblical interpretation, teaching, and faith.",
      base: "https://stephaniewyatt.net",
      author: { name: "Stephanie M. Wyatt" }
    }
  });

  return {
    dir: {
      input: "src/content",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"]
  };
}
