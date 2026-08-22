# stephaniewyatt.net

The source for [Stephanie M. Wyatt’s website](https://stephaniewyatt.net), built with Build Awesome and Nunjucks.

## Develop

Requires Node.js 24 or newer.

```sh
npm ci
npm run dev
```

## Build and verify

```sh
npm run build
npm run check
```

Content and templates live in `src/content`; static assets live in `src/public`. Files in `src/content/_drafts` and files with `published: false` are excluded from all builds.

Except where otherwise noted, original site content is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Third-party assets retain their original licenses; see the generated `/credits.txt`.
