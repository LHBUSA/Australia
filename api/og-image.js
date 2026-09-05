const fs = require('node:fs');
const path = require('node:path');

module.exports = function handler(req, res) {
  const source = path.join(process.cwd(), 'assets', 'propdata-australia-share-card.b64');
  const image = Buffer.from(fs.readFileSync(source, 'utf8').trim(), 'base64');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Length', String(image.length));
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
  res.status(200).send(image);
};
