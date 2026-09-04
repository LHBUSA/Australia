(() => {
  const tabs = [...document.querySelectorAll('[data-ws-tab]')];
  const panels = [...document.querySelectorAll('[data-ws-panel]')];
  const endpoint = document.querySelector('#ws-endpoint');
  const address = document.querySelector('#ws-address');
  const lat = document.querySelector('#ws-lat');
  const lng = document.querySelector('#ws-lng');
  const parcel = document.querySelector('#ws-parcel');
  const output = document.querySelector('#ws-output');
  const outputLabel = document.querySelector('#ws-output-label');
  const copyStatus = document.querySelector('#ws-copy-status');
  const copyCurl = document.querySelector('#ws-copy-curl');
  const copyNode = document.querySelector('#ws-copy-node');
  const fields = {
    address: document.querySelector('[data-field="address"]'),
    lat: document.querySelector('[data-field="lat"]'),
    lng: document.querySelector('[data-field="lng"]'),
    parcel: document.querySelector('[data-field="parcel"]')
  };
  const BASE = 'https://propdata-api-worker.sales-fd3.workers.dev';
  let currentFormat = 'curl';

  const activateTab = name => {
    tabs.forEach(tab => {
      const active = tab.dataset.wsTab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    panels.forEach(panel => {
      panel.hidden = panel.dataset.wsPanel !== name;
    });
  };

  tabs.forEach(tab => tab.addEventListener('click', () => activateTab(tab.dataset.wsTab)));

  const routeConfig = () => {
    switch (endpoint?.value) {
      case 'location': return { path: '/v1/property/by-location', params: [['country', 'AU'], ['lat', lat?.value.trim() || 'LATITUDE'], ['lng', lng?.value.trim() || 'LONGITUDE']], auth: true };
      case 'geometry': return { path: '/v1/parcel-geometry', params: [['country', 'AU'], ['parcel', parcel?.value.trim() || 'NATIVE_PARCEL_ID']], auth: true };
      case 'usage': return { path: '/v1/auth/usage', params: [], auth: true };
      case 'health': return { path: '/v1/health', params: [], auth: false };
      default: return { path: '/v1/property', params: [['country', 'AU'], ['address', address?.value.trim() || 'YOUR_AUSTRALIAN_ADDRESS']], auth: true };
    }
  };

  const buildUrl = config => {
    const url = new URL(BASE + config.path);
    config.params.forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
  };

  const shellQuote = value => `'${String(value).replace(/'/g, `'"'"'`)}'`;

  const renderCurl = config => {
    const lines = [`curl --get ${shellQuote(BASE + config.path)}`];
    config.params.forEach(([key, value]) => lines.push(`  --data-urlencode ${shellQuote(`${key}=${value}`)}`));
    if (config.auth) lines.push(`  -H ${shellQuote('x-api-key: $PROPDATA_API_KEY')}`);
    return lines.join(' \\\n');
  };

  const renderNode = config => {
    const url = buildUrl(config);
    const params = config.params.map(([key, value]) => `url.searchParams.set(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join('\n');
    const headers = config.auth ? `\n  headers: { "x-api-key": process.env.PROPDATA_API_KEY }` : '';
    return `const url = new URL(${JSON.stringify(BASE + config.path)});\n${params}${params ? '\n\n' : ''}const response = await fetch(url, {${headers}\n});\n\nif (!response.ok) {\n  throw new Error(\`PropData ${'${response.status}'}\`);\n}\n\nconst result = await response.json();\nconsole.log(result);`;
  };

  const updateFields = () => {
    const value = endpoint?.value || 'property';
    if (fields.address) fields.address.hidden = value !== 'property';
    if (fields.lat) fields.lat.hidden = value !== 'location';
    if (fields.lng) fields.lng.hidden = value !== 'location';
    if (fields.parcel) fields.parcel.hidden = value !== 'geometry';
  };

  const render = format => {
    currentFormat = format || currentFormat;
    const config = routeConfig();
    if (output) output.textContent = currentFormat === 'node' ? renderNode(config) : renderCurl(config);
    if (outputLabel) outputLabel.textContent = currentFormat === 'node' ? 'Node.js · server-side' : 'cURL · server-side';
    if (copyStatus) copyStatus.textContent = 'READY';
  };

  const copy = async format => {
    render(format);
    try {
      await navigator.clipboard.writeText(output?.textContent || '');
      if (copyStatus) copyStatus.textContent = 'COPIED';
      setTimeout(() => { if (copyStatus) copyStatus.textContent = 'READY'; }, 1600);
    } catch {
      if (copyStatus) copyStatus.textContent = 'SELECT + COPY';
      output?.focus?.();
    }
  };

  endpoint?.addEventListener('change', () => { updateFields(); render(); });
  [address, lat, lng, parcel].forEach(input => input?.addEventListener('input', () => render()));
  copyCurl?.addEventListener('click', () => copy('curl'));
  copyNode?.addEventListener('click', () => copy('node'));

  document.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => {
      const preset = button.dataset.preset;
      if (preset === 'qld-address') {
        if (endpoint) endpoint.value = 'property';
        if (address) address.value = '4 ACT Court, Alexandra Hills QLD 4161';
      } else if (preset === 'location') {
        if (endpoint) endpoint.value = 'location';
        if (lat) lat.value = '-27.47';
        if (lng) lng.value = '153.03';
      } else if (preset === 'usage') {
        if (endpoint) endpoint.value = 'usage';
      }
      updateFields();
      render('curl');
    });
  });

  updateFields();
  render('curl');
})();
