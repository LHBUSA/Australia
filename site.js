(() => {
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('#menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const tabs = [...document.querySelectorAll('[data-state-tab]')];
  const panels = [...document.querySelectorAll('[data-state-panel]')];

  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 18);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('open', !open);
    document.body.classList.toggle('nav-open', !open);
  });

  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu?.setAttribute('aria-expanded', 'false');
    nav?.classList.remove('open');
    document.body.classList.remove('nav-open');
  }));

  const activateState = code => {
    tabs.forEach(tab => {
      const active = tab.dataset.stateTab === code;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    panels.forEach(panel => panel.hidden = panel.dataset.statePanel !== code);
  };
  tabs.forEach(tab => tab.addEventListener('click', () => activateState(tab.dataset.stateTab)));

  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy') || '';
      try {
        await navigator.clipboard.writeText(value);
        const original = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => button.textContent = original, 1400);
      } catch (_) {}
    });
  });

  const success = new URLSearchParams(location.search).get('success');
  if (success === '1') document.querySelector('#success')?.classList.add('show');
})();
