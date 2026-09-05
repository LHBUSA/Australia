const fs = require('node:fs');
const path = require('node:path');

module.exports = function handler(req, res) {
  const platformPath = path.join(process.cwd(), 'platform.html');
  let html = fs.readFileSync(platformPath, 'utf8');

  const nav = '<nav id="nav"><a href="#platform">Platform</a><a href="#jurisdictions">Jurisdictions</a><a href="#solutions">Solutions</a><a href="/docs">Docs</a><a href="/workspace">Workspace</a><a href="#pricing">Pricing</a><a href="https://global.proptechusa.ai/">Global</a></nav>';
  html = html.replace(/<nav id="nav">[\s\S]*?<\/nav>/, nav);

  const replacements = [
    [/property="og:title" content="[^"]*"/, 'property="og:title" content="PropData Australia | National property intelligence for software"'],
    [/property="og:description" content="[^"]*"/, 'property="og:description" content="National property intelligence combining G-NAF address identity, certified state-native cadastre, parcel geometry, coverage and provenance through one governed API."'],
    [/property="og:image" content="[^"]*"/, 'property="og:image" content="https://au.proptechusa.ai/api/og-image"'],
    [/property="og:image:width" content="[^"]*"/, 'property="og:image:width" content="1200"'],
    [/property="og:image:height" content="[^"]*"/, 'property="og:image:height" content="630"'],
    [/name="twitter:title" content="[^"]*"/, 'name="twitter:title" content="PropData Australia | National property intelligence for software"'],
    [/name="twitter:description" content="[^"]*"/, 'name="twitter:description" content="G-NAF identity, state-native cadastre, parcel geometry, coverage and provenance through one Australian property intelligence layer."'],
    [/name="twitter:image" content="[^"]*"/, 'name="twitter:image" content="https://au.proptechusa.ai/api/og-image"']
  ];

  for (const [pattern, replacement] of replacements) html = html.replace(pattern, replacement);

  if (!html.includes('property="og:image:type"')) {
    html = html.replace('<meta property="og:image:width" content="1200">', '<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200">');
  }
  if (!html.includes('property="og:image:alt"')) {
    html = html.replace('<meta property="og:image:height" content="630">', '<meta property="og:image:height" content="630"><meta property="og:image:alt" content="PropData Australia national property intelligence for software">');
  }
  if (!html.includes('name="twitter:image:alt"')) {
    html = html.replace('<meta name="twitter:image" content="https://au.proptechusa.ai/api/og-image">', '<meta name="twitter:image" content="https://au.proptechusa.ai/api/og-image"><meta name="twitter:image:alt" content="PropData Australia national property intelligence for software">');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
};
