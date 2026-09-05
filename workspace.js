(() => {
  const BASE = 'https://propdata-api-worker.sales-fd3.workers.dev';
  const routeButtons = [...document.querySelectorAll('[data-route]')];
  const formatButtons = [...document.querySelectorAll('[data-format]')];
  const fields = {
    address: document.querySelector('[data-field="address"]'),
    lat: document.querySelector('[data-field="lat"]'),
    lng: document.querySelector('[data-field="lng"]'),
    parcel: document.querySelector('[data-field="parcel"]')
  };
  const address = document.querySelector('#ws-address');
  const lat = document.querySelector('#ws-lat');
  const lng = document.querySelector('#ws-lng');
  const parcel = document.querySelector('#ws-parcel');
  const routeTitle = document.querySelector('#ws-route-title');
  const routeDesc = document.querySelector('#ws-route-desc');
  const requestUrl = document.querySelector('#ws-request-url');
  const authState = document.querySelector('#ws-auth-state');
  const output = document.querySelector('#ws-output');
  const outputLabel = document.querySelector('#ws-output-label');
  const copyStatus = document.querySelector('#ws-copy-status');
  const copyCurl = document.querySelector('#ws-copy-curl');
  const copyNode = document.querySelector('#ws-copy-node');
  const copyCode = document.querySelector('#ws-copy-code');
  const docLink = document.querySelector('#ws-doc-link');
  const contract = document.querySelector('#ws-contract');
  const menu = document.querySelector('#menu');
  const nav = document.querySelector('#nav');

  let route = 'property';
  let format = 'curl';

  const configs = {
    property: {
      title: 'Property by address',
      desc: 'Resolve an Australian address through the national G-NAF identity layer and attach promoted jurisdiction context.',
      path: '/v1/property',
      auth: true,
      docs: '/docs#routes',
      fields: ['address'],
      params: () => [['country', 'AU'], ['address', address?.value.trim() || 'YOUR_AUSTRALIAN_ADDRESS']],
      guide: [
        ['Identity', 'Confirm the resolved address/property and jurisdiction before using enrichment.'],
        ['Coverage', 'A successful base match does not imply every state-native cadastral layer is present.'],
        ['Provenance', 'Preserve source, dataset and revision context attached to returned property facts.']
      ]
    },
    location: {
      title: 'Property by coordinates',
      desc: 'Resolve a WGS84 latitude/longitude into containing Australian property context where promoted cadastral geometry supports it.',
      path: '/v1/property/by-location',
      auth: true,
      docs: '/docs#geometry',
      fields: ['lat', 'lng'],
      params: () => [['country', 'AU'], ['lat', lat?.value.trim() || 'LATITUDE'], ['lng', lng?.value.trim() || 'LONGITUDE']],
      guide: [
        ['Spatial match', 'Treat coordinate containment as its own match method, not as proof of an exact postal address.'],
        ['Geometry coverage', 'Coordinate workflows only go as deep as the promoted cadastral geometry for that jurisdiction.'],
        ['Jurisdiction', 'Read the returned state/territory context before interpreting source-native identifiers.']
      ]
    },
    geometry: {
      title: 'Parcel / lot / block geometry',
      desc: 'Retrieve promoted source geometry from a supported Australia-native cadastral identifier.',
      path: '/v1/parcel-geometry',
      auth: true,
      docs: '/docs#geometry',
      fields: ['parcel'],
      params: () => [['country', 'AU'], ['parcel', parcel?.value.trim() || 'NATIVE_PARCEL_ID']],
      guide: [
        ['Native identifier', 'Use the jurisdiction-native parcel, lot or legal-block identifier supported by the promoted source.'],
        ['Coverage', 'No polygon should be inferred when the jurisdiction geometry layer is unavailable or unpromoted.'],
        ['Source geometry', 'Keep the returned source and revision with the boundary in downstream systems.']
      ]
    },
    usage: {
      title: 'Account usage',
      desc: 'Read authoritative PropData request usage and limits for the connected production account.',
      path: '/v1/auth/usage',
      auth: true,
      docs: '/docs#routes',
      fields: [],
      params: () => [],
      guide: [
        ['Usage', 'Treat the usage endpoint and returned rate-limit headers as authoritative for the connected account.'],
        ['Entitlement', 'Contracted and legacy accounts can differ; do not hard-code plan assumptions into the client.'],
        ['Credentials', 'Keep the production API key server-side and send it only in the x-api-key header.']
      ]
    },
    health: {
      title: 'Service health',
      desc: 'Check public production service health without sending a customer API key.',
      path: '/v1/health',
      auth: false,
      docs: '/docs#routes',
      fields: [],
      params: () => [],
      guide: [
        ['Operational state', 'Health reports platform availability, not property-level Australian coverage.'],
        ['No auth', 'This public operational route does not require x-api-key.'],
        ['Coverage', 'Use property responses and coverage semantics—not health—to decide whether a source layer exists.']
      ]
    }
  };

  const config = () => configs[route];

  const buildUrl = () => {
    const c = config();
    const url = new URL(BASE + c.path);
    c.params().forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
  };

  const shellQuote = value => `'${String(value).replace(/'/g, `'"'"'`)}'`;

  const renderCurl = () => {
    const c = config();
    const lines = [`curl --get ${shellQuote(BASE + c.path)}`];
    c.params().forEach(([key, value]) => lines.push(`  --data-urlencode ${shellQuote(`${key}=${value}`)}`));
    if (c.auth) lines.push(`  -H ${shellQuote('x-api-key: $PROPDATA_API_KEY')}`);
    return lines.join(' \\\n');
  };

  const renderNode = () => {
    const c = config();
    const params = c.params().map(([key, value]) => `url.searchParams.set(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join('\n');
    const headers = c.auth ? `\n  headers: { "x-api-key": process.env.PROPDATA_API_KEY },` : '';
    return `const url = new URL(${JSON.stringify(BASE + c.path)});\n${params}${params ? '\n\n' : ''}const controller = new AbortController();\nconst timeout = setTimeout(() => controller.abort(), 10_000);\n\ntry {\n  const response = await fetch(url, {${headers}\n    signal: controller.signal\n  });\n\n  if (!response.ok) {\n    throw new Error(\`PropData ${'${response.status}'}\`);\n  }\n\n  const result = await response.json();\n  console.log(result);\n} finally {\n  clearTimeout(timeout);\n}`;
  };

  const updateFields = () => {
    const visible = new Set(config().fields);
    Object.entries(fields).forEach(([name, el]) => {
      if (el) el.hidden = !visible.has(name);
    });
  };

  const renderGuide = () => {
    if (!contract) return;
    contract.innerHTML = config().guide.map(([title, text]) => `<li><b>${title}</b><span>${text}</span></li>`).join('');
  };

  const render = () => {
    const c = config();
    const url = buildUrl();
    if (routeTitle) routeTitle.textContent = c.title;
    if (routeDesc) routeDesc.textContent = c.desc;
    if (requestUrl) requestUrl.textContent = url.toString();
    if (authState) authState.textContent = c.auth ? 'X-API-KEY REQUIRED' : 'PUBLIC ROUTE';
    if (docLink) docLink.href = c.docs;
    if (output) output.textContent = format === 'node' ? renderNode() : renderCurl();
    if (outputLabel) outputLabel.textContent = `${format === 'node' ? 'NODE.JS' : 'cURL'} · GET ${c.path}`;
    if (copyStatus) copyStatus.textContent = 'READY';
    renderGuide();
  };

  const setRoute = next => {
    if (!configs[next]) return;
    route = next;
    routeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.route === route));
    updateFields();
    render();
  };

  const setFormat = next => {
    format = next === 'node' ? 'node' : 'curl';
    formatButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.format === format));
    render();
  };

  const copyText = async text => {
    try {
      await navigator.clipboard.writeText(text);
      if (copyStatus) copyStatus.textContent = 'COPIED';
      if (copyCode) copyCode.textContent = 'COPIED';
      setTimeout(() => {
        if (copyStatus) copyStatus.textContent = 'READY';
        if (copyCode) copyCode.textContent = 'COPY';
      }, 1400);
    } catch {
      if (copyStatus) copyStatus.textContent = 'SELECT + COPY';
    }
  };

  routeButtons.forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.route)));
  formatButtons.forEach(btn => btn.addEventListener('click', () => setFormat(btn.dataset.format)));
  [address, lat, lng, parcel].forEach(input => input?.addEventListener('input', render));

  copyCurl?.addEventListener('click', () => {
    setFormat('curl');
    copyText(renderCurl());
  });
  copyNode?.addEventListener('click', () => {
    setFormat('node');
    copyText(renderNode());
  });
  copyCode?.addEventListener('click', () => copyText(output?.textContent || ''));

  document.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.preset === 'qld-address') {
        if (address) address.value = '4 ACT Court, Alexandra Hills QLD 4161';
        setRoute('property');
      }
      if (button.dataset.preset === 'brisbane-point') {
        if (lat) lat.value = '-27.4698';
        if (lng) lng.value = '153.0251';
        setRoute('location');
      }
    });
  });

  menu?.addEventListener('click', () => nav?.classList.toggle('open'));
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  setRoute('property');
  setFormat('curl');
})();
