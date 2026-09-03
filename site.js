(() => {
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('#menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const tabs = [...document.querySelectorAll('[data-state-tab]')];
  const panels = [...document.querySelectorAll('[data-state-panel]')];
  const toast = document.querySelector('#success');

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
})();