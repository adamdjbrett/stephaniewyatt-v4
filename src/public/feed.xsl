<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:a="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title><xsl:value-of select="a:feed/a:title"/></title>
        <style>html{max-width:70ch;padding:3em 1em;margin:auto;line-height:1.75;font:1.25em system-ui;color:#000;background:#fff}a{color:inherit}article{border-top:3px solid;margin-top:2em;padding-top:1em}small{font-family:monospace}</style>
      </head>
      <body>
        <header>
          <h1><xsl:value-of select="a:feed/a:title"/></h1>
          <p><xsl:value-of select="a:feed/a:subtitle"/></p>
          <p>This is an Atom feed. <a href="https://stephaniewyatt.net/blog/">Read the blog</a>.</p>
        </header>
        <main>
          <xsl:for-each select="a:feed/a:entry">
            <article>
              <h2><a href="{a:link[not(@rel) or @rel='alternate'][1]/@href}"><xsl:value-of select="a:title"/></a></h2>
              <small><xsl:value-of select="substring(a:updated, 1, 10)"/></small>
              <div><xsl:value-of select="a:content" disable-output-escaping="yes"/></div>
            </article>
          </xsl:for-each>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
