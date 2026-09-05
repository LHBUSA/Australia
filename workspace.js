(() => {
  'use strict';

  const API_BASE = 'https://propdata-api-worker.sales-fd3.workers.dev';
  const STORAGE_KEY = 'propdata_au_key';
  const ACTIVITY_KEY = 'propdata_au_workspace_activity_v1';
  const MAX_ACTIVITY = 8;

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const firstDefined = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
  const numberOrNull = value => {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const formatNumber = value => {
    const number = numberOrNull(value);
    return number === null ? '—' : new Intl.NumberFormat('en-AU').format(number);
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
  const maskKey = key => {
    const value = String(key || '');
    if (!value) return 'Preview mode only';
    if (value.length <= 10) return `${value.slice(0, 3)}••••${value.slice(-2)}`;
    return `${value.slice(0, 6)}••••••••${value.slice(-4)}`;
  };
  const bytes = text => {
    try { return new Blob([text || '']).size; } catch { return String(text || '').length; }
  };
  const nowTime = () => new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const state = {
    view: 'overview',
    mode: 'preview',
    key: null,
    usage: null,
    usagePath: '/v1/auth/usage',
    keys: [],
    keyManagement: 'unknown',
    activity: loadActivity(),
    running: false
  };

  function loadActivity() {
    try {
      const value = JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) || '[]');
      return Array.isArray(value) ? value.slice(0, MAX_ACTIVITY) : [];
    } catch {
      return [];
    }
  }

  function persistActivity() {
    try { sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(state.activity.slice(0, MAX_ACTIVITY))); } catch { /* best effort */ }
  }

  function getStoredKey() {
    try { return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
  }

  function storeKey(key, remember) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      if (remember) localStorage.setItem(STORAGE_KEY, key);
      else sessionStorage.setItem(STORAGE_KEY, key);
    } catch { /* browser storage may be blocked */ }
  }

  function clearStoredKey() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }

  function showToast(message, error = false) {
    const toast = qs('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('error', Boolean(error));
    toast.classList.remove('hidden');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.add('hidden'), 2600);
  }

  function openModal(id) {
    qs(`#${id}`)?.classList.remove('hidden');
    if (id === 'connect-modal') window.setTimeout(() => qs('#api-key')?.focus(), 50);
  }

  function closeModal(id) {
    qs(`#${id}`)?.classList.add('hidden');
  }

  function setButtonLoading(button, loading, idleText, loadingText) {
    if (!button) return;
    button.disabled = Boolean(loading);
    button.textContent = loading ? loadingText : idleText;
  }

  function setView(name) {
    const target = qs(`#view-${name}`);
    if (!target) return;
    state.view = name;
    qsa('.view').forEach(view => view.classList.toggle('active', view === target));
    qsa('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    qs('#sidebar')?.classList.remove('open');
  }

  function setMode(mode, { quiet = false } = {}) {
    if (mode === 'production' && !state.key) {
      state.mode = 'preview';
      renderMode();
      if (!quiet) openModal('connect-modal');
      return false;
    }
    state.mode = mode === 'production' ? 'production' : 'preview';
    renderMode();
    renderRequestGate();
    return true;
  }

  function renderMode() {
    qsa('[data-mode]').forEach(button => {
      button.classList.toggle('active', button.dataset.mode === state.mode);
    });
    const previewState = qs('#preview-state');
    const productionState = qs('#production-state');
    if (previewState) previewState.textContent = state.mode === 'preview' ? 'ACTIVE' : 'AVAILABLE';
    if (productionState) productionState.textContent = !state.key ? 'LOCKED' : (state.mode === 'production' ? 'ACTIVE' : 'READY');
  }

  function normalizeUsagePayload(payload) {
    const raw = payload && typeof payload === 'object' ? payload : {};
    const windowData = raw.window && typeof raw.window === 'object' ? raw.window : {};
    const planData = raw.plan && typeof raw.plan === 'object' ? raw.plan : {};
    const used = numberOrNull(firstDefined(
      raw.used,
      raw.requests_this_month,
      raw.requests_this_window,
      raw.requests_this_hour,
      windowData.used,
      windowData.requests,
      0
    ));
    const limit = numberOrNull(firstDefined(
      raw.limit,
      raw.monthly_limit,
      raw.limit_per_window,
      raw.limit_per_hour,
      windowData.limit,
      planData.limit
    ));
    const explicitRemaining = numberOrNull(firstDefined(raw.remaining, windowData.remaining));
    const remaining = explicitRemaining !== null
      ? explicitRemaining
      : (limit !== null && used !== null ? Math.max(0, limit - used) : null);
    const totalRequests = numberOrNull(firstDefined(
      raw.total_requests,
      raw.requests_total,
      raw.total,
      raw.lifetime_requests
    ));
    const resetAt = firstDefined(raw.reset_at, raw.cycle_reset_at, windowData.reset_at, windowData.resets_at);
    const tier = firstDefined(
      raw.tier,
      raw.plan_name,
      raw.plan_id,
      typeof raw.plan === 'string' ? raw.plan : null,
      planData.name,
      planData.id,
      planData.tier
    );
    const allowance = firstDefined(raw.allowance, planData.allowance, limit !== null ? limit : null);
    const endpointsRaw = firstDefined(raw.endpoints, raw.endpoint_usage, raw.breakdown, windowData.endpoints, {});
    const endpoints = endpointsRaw && typeof endpointsRaw === 'object' && !Array.isArray(endpointsRaw) ? endpointsRaw : {};
    return {
      raw,
      used,
      limit,
      remaining,
      total_requests: totalRequests,
      reset_at: resetAt || null,
      tier: tier || null,
      allowance,
      endpoints
    };
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function requestUsage(key, { allowFallback = true } = {}) {
    const paths = allowFallback ? ['/v1/auth/usage', '/v1/usage'] : [state.usagePath || '/v1/auth/usage'];
    let lastError = null;
    for (const path of paths) {
      try {
        const response = await fetchWithTimeout(API_BASE + path, { headers: { 'x-api-key': key } });
        const payload = await response.json().catch(() => ({}));
        if ((response.status === 404 || response.status === 405) && allowFallback) {
          lastError = new Error(`Usage route ${path} unavailable.`);
          continue;
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error(payload.error || payload.message || 'The API key was rejected.');
        }
        if (!response.ok) {
          throw new Error(payload.error || payload.message || `Usage service returned HTTP ${response.status}.`);
        }
        state.usagePath = path;
        return normalizeUsagePayload(payload);
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error('The API key check timed out.');
        lastError = error;
        if (!allowFallback || path === paths[paths.length - 1]) throw error;
      }
    }
    throw lastError || new Error('Could not validate the API key.');
  }

  async function validateAndConnect(key, remember = false) {
    const usage = await requestUsage(key, { allowFallback: true });
    state.key = key;
    state.usage = usage;
    storeKey(key, remember);
    renderConnectedState();
    renderUsage();
    await loadKeyInventory();
    return usage;
  }

  function renderConnectedState() {
    const connected = Boolean(state.key);
    const connect = qs('#connect-key');
    const overviewConnect = qs('#overview-connect');
    const disconnect = qs('#disconnect-key');
    if (connect) {
      connect.textContent = connected ? 'Production connected' : 'Connect key';
      connect.classList.toggle('connected', connected);
      connect.classList.toggle('primary', !connected);
    }
    if (overviewConnect) overviewConnect.textContent = connected ? 'Manage connection' : 'Connect key';
    disconnect?.classList.toggle('hidden', !connected);

    const title = qs('#credential-title');
    const mask = qs('#credential-mask');
    const status = qs('#credential-status');
    if (title) title.textContent = connected ? 'Production key connected' : 'No production key connected';
    if (mask) mask.textContent = connected ? maskKey(state.key) : 'Preview mode only';
    if (status) {
      status.textContent = connected ? 'VALIDATED' : 'DISCONNECTED';
      status.classList.toggle('live', connected);
    }

    const tier = state.usage?.tier || null;
    const planMetric = qs('#metric-plan');
    const planNote = qs('#metric-plan-note');
    if (planMetric) planMetric.textContent = connected ? (tier || 'Connected') : 'Preview';
    if (planNote) planNote.textContent = connected
      ? 'Loaded from authenticated account telemetry.'
      : 'Connect a production key to load account truth.';

    renderMode();
    renderRequestGate();
    renderUsage();
    renderKeysGate();
    renderBilling();
  }

  function renderUsage() {
    const connected = Boolean(state.key && state.usage);
    qs('#usage-lock')?.classList.toggle('hidden', connected);
    qs('#usage-content')?.classList.toggle('hidden', !connected);

    const usage = state.usage || {};
    const used = usage.used;
    const limit = usage.limit;
    const remaining = usage.remaining;
    const tier = usage.tier;

    if (qs('#metric-used')) qs('#metric-used').textContent = connected ? formatNumber(used) : '—';
    if (qs('#metric-remaining')) qs('#metric-remaining').textContent = connected ? formatNumber(remaining) : '—';
    if (qs('#metric-reset')) qs('#metric-reset').textContent = connected && usage.reset_at
      ? `Resets ${new Date(usage.reset_at).toLocaleString('en-AU')}`
      : 'Reset not reported.';

    if (!connected) return;
    if (qs('#usage-plan')) qs('#usage-plan').textContent = tier || 'Connected';
    if (qs('#usage-used')) qs('#usage-used').textContent = formatNumber(used);
    if (qs('#usage-left')) qs('#usage-left').textContent = formatNumber(remaining);
    if (qs('#usage-total')) qs('#usage-total').textContent = formatNumber(usage.total_requests);
    if (qs('#usage-heading')) qs('#usage-heading').textContent = tier ? `${tier} account` : 'Authenticated account';
    if (qs('#usage-reset-pill')) qs('#usage-reset-pill').textContent = usage.reset_at
      ? `RESETS ${new Date(usage.reset_at).toLocaleDateString('en-AU')}`
      : 'CONNECTED';

    const progress = limit && limit > 0 && used !== null ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
    if (qs('#usage-progress')) qs('#usage-progress').style.width = `${progress}%`;
    if (qs('#usage-progress-copy')) qs('#usage-progress-copy').textContent = limit && limit > 0
      ? `${formatNumber(used)} of ${formatNumber(limit)} reported requests used`
      : `${formatNumber(used)} requests reported; account limit not supplied`;
    if (qs('#usage-limit-copy')) qs('#usage-limit-copy').textContent = limit && limit > 0 ? `${Math.round(progress)}%` : 'No reported limit';

    const endpointBars = qs('#endpoint-bars');
    if (!endpointBars) return;
    const entries = Object.entries(usage.endpoints || {})
      .map(([name, count]) => [name, numberOrNull(count)])
      .filter(([, count]) => count !== null)
      .sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      endpointBars.innerHTML = '<div class="empty">No endpoint breakdown reported by this account.</div>';
      return;
    }
    const max = Math.max(...entries.map(([, count]) => count), 1);
    endpointBars.innerHTML = entries.map(([name, count]) => {
      const width = Math.max(3, (count / max) * 100);
      return `<div class="endpoint-row"><code>${escapeHtml(name)}</code><div class="progress"><i style="width:${width}%"></i></div><span>${formatNumber(count)}</span></div>`;
    }).join('');
  }

  function renderBilling() {
    const tier = state.usage?.tier || null;
    const allowance = state.usage?.allowance;
    if (qs('#billing-plan')) qs('#billing-plan').textContent = state.key ? (tier || 'Connected account') : 'Preview';
    if (qs('#billing-copy')) {
      qs('#billing-copy').textContent = !state.key
        ? 'Connect a production key to load the account tier and allowance reported by PropData.'
        : allowance !== undefined && allowance !== null
          ? `Authenticated account allowance: ${formatNumber(allowance)}. Billing terms remain governed by your subscription or contract.`
          : 'The account is connected. No allowance value was reported by the live usage response.';
    }
  }

  function renderRequestGate() {
    const unlocked = Boolean(state.key && state.mode === 'production');
    qs('#request-lock')?.classList.toggle('hidden', unlocked);
    qs('#request-lab')?.classList.toggle('hidden', !unlocked);
  }

  function renderKeysGate() {
    const connected = Boolean(state.key);
    qs('#keys-lock')?.classList.toggle('hidden', connected);
    qs('#keys-content')?.classList.toggle('hidden', !connected);
    const createButton = qs('#create-key');
    if (createButton) createButton.disabled = !connected || state.keyManagement === 'unavailable';
    if (!connected) {
      if (qs('#key-count')) qs('#key-count').textContent = '—';
      return;
    }
    renderKeyInventory();
  }

  function renderKeyInventory() {
    const unavailable = state.keyManagement === 'unavailable';
    qs('#keys-unavailable')?.classList.toggle('hidden', !unavailable);
    qs('#keys-table-wrap')?.classList.toggle('hidden', unavailable);
    if (qs('#key-count')) qs('#key-count').textContent = unavailable ? '—' : String(state.keys.length || 0);
    if (unavailable) return;

    const body = qs('#keys-body');
    if (!body) return;
    if (!state.keys.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">No additional key inventory was returned.</td></tr>';
      return;
    }
    body.innerHTML = state.keys.map((item, index) => {
      const id = firstDefined(item.id, item.key_id, item.uuid, item.name, String(index));
      const name = firstDefined(item.name, item.label, item.environment, 'API key');
      const prefix = firstDefined(item.masked_key, item.key_prefix, item.prefix, item.last4 ? `••••${item.last4}` : null, 'Secret hidden');
      const created = firstDefined(item.created_at, item.created, item.inserted_at);
      const lastUsed = firstDefined(item.last_used_at, item.last_used, item.last_request_at);
      const status = firstDefined(item.status, item.active === false ? 'revoked' : 'active');
      return `<tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td><code>${escapeHtml(prefix)}</code></td>
        <td>${created ? escapeHtml(new Date(created).toLocaleString('en-AU')) : '—'}</td>
        <td>${lastUsed ? escapeHtml(new Date(lastUsed).toLocaleString('en-AU')) : '—'}</td>
        <td><span class="pill ${String(status).toLowerCase() === 'active' ? 'good' : ''}">${escapeHtml(String(status).toUpperCase())}</span></td>
        <td><button class="btn danger" type="button" data-revoke-key="${escapeHtml(id)}">Revoke</button></td>
      </tr>`;
    }).join('');
  }

  async function loadKeyInventory() {
    if (!state.key) return;
    state.keyManagement = 'loading';
    state.keys = [];
    renderKeysGate();
    try {
      const response = await fetchWithTimeout(API_BASE + '/v1/auth/keys', { headers: { 'x-api-key': state.key } });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 404 || response.status === 405) {
        state.keyManagement = 'unavailable';
        state.keys = [];
        renderKeysGate();
        return;
      }
      if (response.status === 401 || response.status === 403) throw new Error('The connected key no longer has access to key management.');
      if (!response.ok) throw new Error(payload.error || payload.message || `Key inventory returned HTTP ${response.status}.`);
      const list = Array.isArray(payload) ? payload : firstDefined(payload.keys, payload.data, payload.items, []);
      state.keys = Array.isArray(list) ? list : [];
      state.keyManagement = 'available';
      renderKeysGate();
    } catch (error) {
      state.keyManagement = 'error';
      state.keys = [];
      renderKeysGate();
      showToast(error.message || 'Could not load API key inventory.', true);
    }
  }

  async function createApiKey(name) {
    if (!state.key || state.keyManagement !== 'available') throw new Error('Key creation is not available for this account.');
    const response = await fetchWithTimeout(API_BASE + '/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': state.key },
      body: JSON.stringify({ name })
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 404 || response.status === 405) {
      state.keyManagement = 'unavailable';
      renderKeysGate();
      throw new Error('Additional credential creation is currently unavailable.');
    }
    if (!response.ok) throw new Error(payload.error || payload.message || `Key creation returned HTTP ${response.status}.`);
    const secret = firstDefined(payload.key, payload.api_key, payload.secret, payload.token);
    await loadKeyInventory();
    return secret || null;
  }

  async function revokeApiKey(id) {
    if (!state.key || state.keyManagement !== 'available' || !id) return;
    if (!window.confirm('Revoke this API key? Applications using it will immediately lose access.')) return;
    try {
      const response = await fetchWithTimeout(`${API_BASE}/v1/auth/keys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-api-key': state.key }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 404 || response.status === 405) {
        state.keyManagement = 'unavailable';
        renderKeysGate();
        throw new Error('Credential revocation is currently unavailable.');
      }
      if (!response.ok) throw new Error(payload.error || payload.message || `Key revocation returned HTTP ${response.status}.`);
      showToast('API key revoked.');
      await loadKeyInventory();
    } catch (error) {
      showToast(error.message || 'Could not revoke API key.', true);
    }
  }

  const labConfig = {
    property: {
      path: '/v1/property', auth: true, fields: ['address'], title: 'Property by address',
      copy: 'Resolve an Australian address into country and jurisdiction-aware property context.',
      params: () => [['country', 'AU'], ['address', qs('#lab-address')?.value.trim() || '']]
    },
    location: {
      path: '/v1/property/by-location', auth: true, fields: ['lat', 'lng'], title: 'Property by coordinates',
      copy: 'Resolve WGS84 coordinates into containing Australian property context where promoted geometry supports it.',
      params: () => [['country', 'AU'], ['lat', qs('#lab-lat')?.value.trim() || ''], ['lng', qs('#lab-lng')?.value.trim() || '']]
    },
    geometry: {
      path: '/v1/parcel-geometry', auth: true, fields: ['parcel'], title: 'Parcel / lot / block geometry',
      copy: 'Retrieve promoted Australia-native parcel, lot or legal-block geometry using a supported source identifier.',
      params: () => [['country', 'AU'], ['parcel', qs('#lab-parcel')?.value.trim() || '']]
    },
    usage: {
      path: () => state.usagePath || '/v1/auth/usage', auth: true, fields: [], title: 'Account usage',
      copy: 'Read the connected account usage and rate-limit contract.', params: () => []
    },
    health: {
      path: '/v1/health', auth: false, fields: [], title: 'API health',
      copy: 'Check public production service health. Health is not property-level coverage.', params: () => []
    },
    stats: {
      path: '/v1/stats', auth: false, fields: [], title: 'Live stats',
      copy: 'Read public service statistics without treating them as property-level coverage.', params: () => []
    },
    changelog: {
      path: '/v1/changelog', auth: false, fields: [], title: 'Changelog',
      copy: 'Read production API and data-platform release changes.', params: () => []
    }
  };

  function currentLabConfig() {
    return labConfig[qs('#lab-route')?.value || 'property'];
  }

  function buildLabUrl() {
    const config = currentLabConfig();
    const path = typeof config.path === 'function' ? config.path() : config.path;
    const url = new URL(API_BASE + path);
    config.params().forEach(([key, value]) => {
      if (value !== '') url.searchParams.set(key, value);
    });
    return { url, path, config };
  }

  function renderLab() {
    const { url, config } = buildLabUrl();
    if (qs('#lab-title')) qs('#lab-title').textContent = config.title;
    if (qs('#lab-copy')) qs('#lab-copy').textContent = config.copy;
    if (qs('#lab-url')) qs('#lab-url').textContent = url.toString();
    const visible = new Set(config.fields);
    qsa('[data-lab-field]').forEach(field => field.classList.toggle('hidden', !visible.has(field.dataset.labField)));
  }

  function addActivity(item) {
    state.activity.unshift(item);
    state.activity = state.activity.slice(0, MAX_ACTIVITY);
    persistActivity();
    renderActivity();
  }

  function renderActivity() {
    const body = qs('#activity-body');
    if (!body) return;
    if (!state.activity.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty">No production requests in this session.</td></tr>';
      return;
    }
    body.innerHTML = state.activity.map(item => `<tr>
      <td>${escapeHtml(item.time || '—')}</td>
      <td><code>${escapeHtml(item.path || '—')}</code></td>
      <td><span class="pill ${Number(item.status) >= 200 && Number(item.status) < 400 ? 'good' : 'warn'}">${escapeHtml(item.status || 'ERR')}</span></td>
      <td>${escapeHtml(item.elapsed != null ? `${item.elapsed} ms` : '—')}</td>
      <td>${escapeHtml((item.mode || 'production').toUpperCase())}</td>
    </tr>`).join('');
  }

  async function runLabRequest() {
    if (!state.key || state.mode !== 'production' || state.running) return;
    const { url, path, config } = buildLabUrl();
    const output = qs('#response-json');
    const status = qs('#response-status');
    const latency = qs('#response-latency');
    const size = qs('#response-bytes');
    const title = qs('#response-title');
    const button = qs('#run-request');
    state.running = true;
    setButtonLoading(button, true, 'Run production request', 'Running…');
    if (output) output.textContent = 'Request in flight…';
    if (title) title.textContent = `RESPONSE · GET ${path}`;
    if (status) { status.textContent = 'RUNNING'; status.className = ''; }
    if (latency) latency.textContent = '—';
    if (size) size.textContent = '—';
    const started = performance.now();
    try {
      const headers = config.auth ? { 'x-api-key': state.key } : {};
      const response = await fetchWithTimeout(url.toString(), { headers }, 12000);
      const text = await response.text();
      const elapsed = Math.round(performance.now() - started);
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      if (output) output.textContent = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
      if (status) {
        status.textContent = String(response.status);
        status.className = response.ok ? 'ok' : 'bad';
      }
      if (latency) latency.textContent = `${elapsed} ms`;
      if (size) size.textContent = `${formatNumber(bytes(text))} B`;
      addActivity({ time: nowTime(), path, status: response.status, elapsed, mode: 'production' });
      if (response.ok && config.auth && path !== state.usagePath && path !== '/v1/usage') {
        refreshUsage(true).catch(() => {});
      }
    } catch (error) {
      const elapsed = Math.round(performance.now() - started);
      if (output) output.textContent = JSON.stringify({ error: error?.name === 'AbortError' ? 'Request timed out.' : (error.message || 'Request failed.') }, null, 2);
      if (status) { status.textContent = 'ERROR'; status.className = 'bad'; }
      if (latency) latency.textContent = `${elapsed} ms`;
      addActivity({ time: nowTime(), path, status: 'ERR', elapsed, mode: 'production' });
    } finally {
      state.running = false;
      setButtonLoading(button, false, 'Run production request', 'Running…');
    }
  }

  async function refreshUsage(quiet = false) {
    if (!state.key) return;
    try {
      state.usage = await requestUsage(state.key, { allowFallback: true });
      renderConnectedState();
      if (!quiet) showToast('Account usage refreshed.');
    } catch (error) {
      if (!quiet) showToast(error.message || 'Could not refresh usage.', true);
    }
  }

  async function checkHealth() {
    const text = qs('#api-health');
    const dot = qs('#api-dot');
    const metric = qs('#metric-health');
    try {
      const response = await fetchWithTimeout(API_BASE + '/v1/health', {}, 8000);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json().catch(() => ({}));
      const label = firstDefined(payload.status, payload.ok === true ? 'Operational' : null, 'Operational');
      if (text) text.textContent = String(label);
      dot?.classList.add('ok');
      dot?.classList.remove('bad');
      if (metric) metric.textContent = 'Operational';
    } catch {
      if (text) text.textContent = 'Health unavailable';
      dot?.classList.remove('ok');
      dot?.classList.add('bad');
      if (metric) metric.textContent = 'Unavailable';
    }
  }

  function disconnect() {
    clearStoredKey();
    state.key = null;
    state.usage = null;
    state.keys = [];
    state.keyManagement = 'unknown';
    state.mode = 'preview';
    renderConnectedState();
    renderActivity();
    showToast('Production key disconnected.');
  }

  qsa('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  qsa('[data-jump]').forEach(button => button.addEventListener('click', () => setView(button.dataset.jump)));
  qsa('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  qsa('[data-connect], #connect-key, #overview-connect').forEach(button => button?.addEventListener('click', () => openModal('connect-modal')));
  qsa('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.close)));
  qsa('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => {
    if (event.target === backdrop) backdrop.classList.add('hidden');
  }));
  qs('#mobile-menu')?.addEventListener('click', () => qs('#sidebar')?.classList.toggle('open'));
  qs('#disconnect-key')?.addEventListener('click', disconnect);

  qs('#connect-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const key = qs('#api-key')?.value.trim() || '';
    const remember = Boolean(qs('#remember-key')?.checked);
    const error = qs('#connect-error');
    const button = qs('#validate-key');
    if (error) error.textContent = '';
    if (!key) {
      if (error) error.textContent = 'Enter your PropData production API key.';
      return;
    }
    setButtonLoading(button, true, 'Validate & connect', 'Validating…');
    try {
      await validateAndConnect(key, remember);
      if (qs('#api-key')) qs('#api-key').value = '';
      closeModal('connect-modal');
      showToast('Production key validated.');
    } catch (exception) {
      if (error) error.textContent = exception.message || 'The key could not be validated.';
    } finally {
      setButtonLoading(button, false, 'Validate & connect', 'Validating…');
    }
  });

  qs('#refresh-usage')?.addEventListener('click', () => refreshUsage(false));
  qs('#refresh-keys')?.addEventListener('click', () => loadKeyInventory());
  qs('#create-key')?.addEventListener('click', () => {
    if (state.keyManagement !== 'available') {
      showToast('Key creation is not available for this account.', true);
      return;
    }
    openModal('create-modal');
  });
  qs('#create-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const name = qs('#new-key-name')?.value.trim() || '';
    const error = qs('#create-error');
    const button = qs('#create-key-submit');
    if (error) error.textContent = '';
    if (!name) {
      if (error) error.textContent = 'Give the new key a clear name.';
      return;
    }
    setButtonLoading(button, true, 'Create key', 'Creating…');
    try {
      const secret = await createApiKey(name);
      if (qs('#new-key-name')) qs('#new-key-name').value = '';
      closeModal('create-modal');
      if (secret) {
        if (qs('#new-key-secret')) qs('#new-key-secret').textContent = secret;
        openModal('secret-modal');
      } else {
        showToast('API key created. The API did not return a displayable secret.');
      }
    } catch (exception) {
      if (error) error.textContent = exception.message || 'Could not create API key.';
    } finally {
      setButtonLoading(button, false, 'Create key', 'Creating…');
    }
  });
  qs('#keys-body')?.addEventListener('click', event => {
    const button = event.target.closest('[data-revoke-key]');
    if (button) revokeApiKey(button.dataset.revokeKey);
  });

  qs('#lab-route')?.addEventListener('change', renderLab);
  qsa('#request-lab input').forEach(input => input.addEventListener('input', renderLab));
  qs('#run-request')?.addEventListener('click', runLabRequest);
  qs('#clear-response')?.addEventListener('click', () => {
    if (qs('#response-json')) qs('#response-json').textContent = 'Ready for the next explicit production request.';
    if (qs('#response-status')) qs('#response-status').textContent = '—';
    if (qs('#response-latency')) qs('#response-latency').textContent = '—';
    if (qs('#response-bytes')) qs('#response-bytes').textContent = '—';
  });

  qs('#copy-mcp')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(qs('#mcp-url')?.textContent || '');
      showToast('MCP endpoint copied.');
    } catch { showToast('Could not copy MCP endpoint.', true); }
  });
  qs('#copy-secret')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(qs('#new-key-secret')?.textContent || '');
      showToast('API key copied.');
    } catch { showToast('Could not copy the API key.', true); }
  });

  async function boot() {
    renderMode();
    renderConnectedState();
    renderActivity();
    renderLab();
    checkHealth();
    const stored = getStoredKey();
    if (stored) {
      try {
        await validateAndConnect(stored, Boolean(localStorage.getItem(STORAGE_KEY)));
      } catch {
        clearStoredKey();
        state.key = null;
        state.usage = null;
        renderConnectedState();
        showToast('Saved production key is no longer valid. Reconnect to continue.', true);
      }
    }
  }

  boot();
})();
