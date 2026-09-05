const fs = require('node:fs');
const path = require('node:path');

module.exports = function handler(req, res) {
  const platformPath = path.join(process.cwd(), 'platform.html');
  let html = fs.readFileSync(platformPath, 'utf8');

  const nav = '<nav id="nav"><a href="#platform">Platform</a><a href="#jurisdictions">Jurisdictions</a><a href="#solutions">Solutions</a><a href="/docs">Docs</a><a href="/workspace">Workspace</a><a href="#pricing">Pricing</a><a href="https://global.proptechusa.ai/">Global</a></nav>';

  html = html.replace(/<nav id="nav">[\s\S]*?<\/nav>/, nav);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
};
