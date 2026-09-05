(() => {
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('#menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const tabs = [...document.querySelectorAll('[data-state-tab]')];
  const panels = [...document.querySelectorAll('[data-state-panel]')];
  const toast = document.querySelector('#success');

  const photos = {
    hero: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Aerial_view_of_Sydney_Harbour.jpg',
    residential: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Brisbane_seen_from_air,_suburb.jpg',
    queensland: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Brisbane_from_air.jpg'
  };

  const heroPhoto = document.querySelector('.hero-photo');
  const productPhoto = document.querySelector('.photo-large img');
  const qldPhoto = document.querySelector('[data-state-panel="QLD"] .panel-photo img');
  const finalPhoto = document.querySelector('.final-card > img');
  if (heroPhoto) heroPhoto.src = photos.hero;
  if (productPhoto) productPhoto.src = photos.residential;
  if (qldPhoto) qldPhoto.src = photos.queensland;
  if (finalPhoto) finalPhoto.src = photos.queensland;

  document.querySelectorAll('a[href="https://gb.proptechusa.ai/"]').forEach(link => {
    link.href = 'https://global.proptechusa.ai/';
    link.setAttribute('title', 'Great Britain coverage is currently managed through PropData Global');
  });

  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 10);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const closeMenu = () => {
    menu?.setAttribute('aria-expanded', 'false');
    nav?.classList.remove('open');
    document.body.classList.remove('nav-open');
  };

  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('open', !open);
    document.body.classList.toggle('nav-open', !open);
  });

  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  document.querySelectorAll('.network-menu').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      document.querySelectorAll('.network-menu').forEach(other => {
        if (other !== details) other.open = false;
      });
    });
  });

  const activateState = code => {
    tabs.forEach(tab => {
      const active = tab.dataset.stateTab === code;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => {
      const active = panel.dataset.statePanel === code;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateState(tab.dataset.stateTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + delta + tabs.length) % tabs.length];
      activateState(next.dataset.stateTab);
      next.focus();
    });
  });

  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px' });
    document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  const params = new URLSearchParams(location.search);
  const success = params.get('success');
  if (success && toast) {
    const planNames = { developer: 'Developer', builder: 'Builder', scale: 'Scale' };
    const name = planNames[success] || 'Australia';
    const message = toast.querySelector('span');
    if (message) message.textContent = `Welcome to PropData Australia. Your ${name} subscription was received and access is being provisioned.`;
    toast.classList.add('show');
    if (history.replaceState) {
      params.delete('success');
      params.delete('session_id');
      const clean = `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`;
      history.replaceState({}, '', clean);
    }
  }
  toast?.querySelector('button')?.addEventListener('click', () => toast.classList.remove('show'));

  document.querySelectorAll('a[href^="https://buy.stripe.com/"]').forEach(link => {
    link.setAttribute('rel', 'noopener');
    link.addEventListener('click', () => {
      link.dataset.checkoutStarted = 'true';
    });
  });

  const footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom && !document.querySelector('.photo-credit')) {
    const credit = document.createElement('span');
    credit.className = 'photo-credit';
    credit.style.cssText = 'display:block;padding:0 0 22px;font:6px/1.6 "DM Mono",monospace;letter-spacing:.04em;color:#506b7c;text-align:center';
    credit.innerHTML = 'Photography: <a style="color:#6f899d" href="https://commons.wikimedia.org/wiki/File:Aerial_view_of_Sydney_Harbour.jpg" target="_blank" rel="noopener">Sydney Harbour — Andy / CC BY-SA 2.0</a> · Brisbane aerials via Wikimedia Commons';
    footerBottom.insertAdjacentElement('afterend', credit);
  }
})();

// 2026-09-05 certified AU portfolio positioning. Keep the premium visual shell,
// but replace the pre-certification rollout copy with the current production graph.
(() => {
  if (!document.querySelector('.hero .live-board')) return;

  document.title = 'PropData Australia | National Address & Cadastral Property Intelligence';
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', 'Australia property intelligence built on a complete 16.97M-address national G-NAF spine and 7.05M+ certified cadastral records across Queensland, Victoria, Tasmania and ACT, with state-native geometry, identifiers, provenance and one PropData contract.');

  const launch = document.querySelector('.launch-strip-inner');
  if (launch) {
    const spans = launch.querySelectorAll(':scope > span');
    if (spans[0]) spans[0].innerHTML = '<i></i> NATIONAL ADDRESS SPINE LIVE';
    if (spans[1]) spans[1].innerHTML = '16.97M G-NAF addresses <b>•</b> QLD · VIC · TAS · ACT cadastre live <b>•</b> NSW next';
  }

  const heroTitle = document.querySelector('.hero-copy h1');
  if (heroTitle) heroTitle.innerHTML = "Australia's property<br><em>graph, normalized.</em><br><b>One contract.</b>";
  const heroBody = document.querySelector('.hero-copy > p');
  if (heroBody) heroBody.textContent = 'Start with a complete national G-NAF identity spine, then attach certified state-native cadastral identity, polygon geometry and jurisdiction semantics. PropData handles the fragmentation across Australia so your product does not have to.';

  const boardHead = document.querySelector('.live-board-head');
  if (boardHead) boardHead.innerHTML = '<span><i></i> AUSTRALIA PRODUCTION GRAPH</span><small>National identity · state-native depth</small>';
  const metrics = [...document.querySelectorAll('.live-board .metric-grid > div')];
  const metricData = [
    ['16.97M', 'national G-NAF addresses', '2026-08 baseline complete'],
    ['7.05M+', 'certified cadastral records', 'QLD · VIC · TAS · ACT'],
    ['4', 'cadastral jurisdictions live', 'state-native geometry + IDs'],
    ['8', 'jurisdictions', 'one Australia contract']
  ];
  metrics.forEach((el, i) => {
    const row = metricData[i];
    if (!row) return;
    el.innerHTML = `<b>${row[0]}</b><span>${row[1]}</span><small>${row[2]}</small>`;
  });
  const boardLink = document.querySelector('.live-board > a');
  if (boardLink) boardLink.textContent = 'Explore the national property graph →';

  const product = document.querySelector('#product .copy-block');
  if (product) {
    const eyebrow = product.querySelector('.eyebrow');
    const h2 = product.querySelector('h2');
    const p = product.querySelector(':scope > p');
    if (eyebrow) eyebrow.textContent = 'THE AUSTRALIA NORMALIZATION LAYER';
    if (h2) h2.textContent = 'One national identity spine. Eight jurisdiction systems. No integration maze.';
    if (p) p.textContent = 'Australian property data is fragmented by design. PropData preserves the state-native identifiers, geometry, source revisions and jurisdiction semantics that matter, then delivers them through one governed country contract your application can build against.';
  }

  const coverageHead = document.querySelector('#coverage .section-head');
  if (coverageHead) {
    const eyebrow = coverageHead.querySelector('.eyebrow');
    const h2 = coverageHead.querySelector('h2');
    const p = coverageHead.querySelector('p');
    if (eyebrow) eyebrow.textContent = 'CERTIFIED NATIONAL + STATE COVERAGE';
    if (h2) h2.textContent = 'National identity is complete. State-native cadastre is already deep.';
    if (p) p.textContent = 'The 16,970,406-record G-NAF baseline provides the national address spine. Queensland, Victoria, Tasmania and ACT add 7,052,719 certified cadastral records today. NSW is the next promotion; WA, SA and NT retain national address identity while deeper cadastre remains source and rights gated.';
  }

  const tabText = {
    QLD: ['QLD', 'LIVE'],
    NAT: ['AU', '16.97M'],
    NSW: ['NSW', 'NEXT'],
    VIC: ['VIC', 'LIVE'],
    REST: ['TAS · ACT · WA · SA · NT', '2 LIVE · 3 GATED']
  };
  document.querySelectorAll('[data-state-tab]').forEach(tab => {
    const row = tabText[tab.dataset.stateTab];
    if (!row) return;
    const b = tab.querySelector('b');
    const s = tab.querySelector('span');
    if (b) b.textContent = row[0];
    if (s) s.textContent = row[1];
  });

  const nat = document.querySelector('[data-state-panel="NAT"] .panel-copy');
  if (nat) {
    nat.querySelector('h3').textContent = "Australia's complete national address spine.";
    nat.querySelector('p').textContent = 'The certified 2026-08 G-NAF baseline carries 16,970,406 geocoded address records across all national source partitions while retaining native address PIDs and geocodes.';
    const stats = nat.querySelectorAll('.panel-stats > div');
    if (stats[0]) stats[0].innerHTML = '<b>16,970,406</b><span>certified addresses</span>';
    if (stats[1]) stats[1].innerHTML = '<b>9 / 9</b><span>source partitions certified</span>';
    if (stats[2]) stats[2].innerHTML = '<b>National</b><span>identity spine complete</span>';
  }

  const vic = document.querySelector('[data-state-panel="VIC"] .panel-copy');
  if (vic) {
    vic.querySelector('h3').textContent = 'Victoria is already a production cadastral foundation.';
    vic.querySelector('p').textContent = 'The certified Vicmap baseline contributes 4,303,714 parcel records while preserving PFI/UFI identity, statewide geometry and State of Victoria provenance.';
    const stats = vic.querySelectorAll('.panel-stats > div');
    if (stats[0]) stats[0].innerHTML = '<b>4,303,714</b><span>parcel records</span>';
    if (stats[1]) stats[1].innerHTML = '<b>PFI / UFI</b><span>native identity retained</span>';
    if (stats[2]) stats[2].innerHTML = '<b>LIVE</b><span>certified baseline</span>';
  }

  const nsw = document.querySelector('[data-state-panel="NSW"] .panel-copy');
  if (nsw) {
    nsw.querySelector('h3').textContent = 'Next promotion: pinned-source NSW cadastre.';
    nsw.querySelector('p').textContent = 'New South Wales remains deliberately source-revision gated. The statewide lot layer is rebuilt against one pinned revision and must reconcile cleanly before PropData promotes it into the production cadastral contract.';
    const stats = nsw.querySelectorAll('.panel-stats > div');
    if (stats[0]) stats[0].innerHTML = '<b>3.35M+</b><span>statewide lot scale</span>';
    if (stats[1]) stats[1].innerHTML = '<b>Pinned</b><span>source revision required</span>';
    if (stats[2]) stats[2].innerHTML = '<b>NEXT</b><span>promotion after reconciliation</span>';
  }

  const rest = document.querySelector('[data-state-panel="REST"] .panel-copy');
  if (rest) {
    rest.querySelector('.panel-kicker').textContent = 'TASMANIA · ACT · WA · SA · NT';
    rest.querySelector('h3').textContent = 'Tasmania and ACT are live. National address identity covers the rest.';
    rest.querySelector('p').textContent = 'Tasmania contributes 439,539 certified LIST cadastral parcels and ACT contributes 152,986 legal blocks. Western Australia, South Australia and Northern Territory already sit on the national G-NAF spine while deeper cadastre remains source-delivery and rights gated.';
    const stats = rest.querySelectorAll('.panel-stats > div');
    if (stats[0]) stats[0].innerHTML = '<b>439,539</b><span>TAS cadastral parcels</span>';
    if (stats[1]) stats[1].innerHTML = '<b>152,986</b><span>ACT legal blocks</span>';
    if (stats[2]) stats[2].innerHTML = '<b>3 states</b><span>national identity live · cadastre gated</span>';
  }

  const qld = document.querySelector('[data-state-panel="QLD"] .panel-copy');
  if (qld) {
    qld.querySelector('h3').textContent = 'Queensland remains a certified production foundation.';
    qld.querySelector('p').textContent = 'Queensland QSCF contributes 2,156,480 certified lot parcels with native identity and polygon geometry, connected to the national G-NAF address spine through the Australia contract.';
  }

  const developerPlan = document.querySelector('.price-grid .price-card:nth-child(1) ul');
  if (developerPlan) developerPlan.innerHTML = '<li>Complete national G-NAF identity spine</li><li>QLD · VIC · TAS · ACT cadastral depth</li><li>State-native identifiers + geometry</li><li>Coverage + source provenance</li><li>REST + MCP compatible access</li>';
  const builderPlan = document.querySelector('.price-grid .price-card:nth-child(2) ul');
  if (builderPlan) builderPlan.innerHTML = '<li>Everything in Developer</li><li>50,000 monthly requests</li><li>Production property + spatial workflows</li><li>Priority integration support</li><li>New jurisdiction depth as promoted</li>';
  const scalePlan = document.querySelector('.price-grid .price-card:nth-child(3) ul');
  if (scalePlan) scalePlan.innerHTML = '<li>Everything in Builder</li><li>250,000 monthly requests</li><li>High-volume national workflows</li><li>Bulk workflow eligibility</li><li>Platform-scale operations</li>';

  const finalCopy = document.querySelector('.final-copy');
  if (finalCopy) {
    const eyebrow = finalCopy.querySelector('.eyebrow');
    const h2 = finalCopy.querySelector('h2');
    const p = finalCopy.querySelector('p');
    if (eyebrow) eyebrow.textContent = 'STOP REBUILDING AUSTRALIA JURISDICTION BY JURISDICTION';
    if (h2) h2.textContent = 'Build on the national graph that is already here.';
    if (p) p.textContent = '16.97M national addresses, 7.05M+ certified cadastral records, state-native geometry and identifiers, one production contract — with additional jurisdiction depth promoted behind the same integration.';
  }

  const footerBrand = document.querySelector('.footer-brand > p');
  if (footerBrand) footerBrand.textContent = "Australia's national property normalization layer: complete address identity plus certified state-native cadastral depth, geometry and provenance.";
  const footerStatus = document.querySelector('.footer-status');
  if (footerStatus) footerStatus.innerHTML = '<i></i> National G-NAF live · QLD · VIC · TAS · ACT cadastre live';
})();