(function () {
  function inPagesDirectory() {
    return window.location.pathname.toLowerCase().indexOf('/pages/') >= 0;
  }

  function rootPath(relativePath) {
    return inPagesDirectory() ? '../' + relativePath : relativePath;
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
      return;
    }
    fn();
  }

  function mountScrollProgress() {
    if (document.getElementById('scrollProgress')) return;

    var bar = document.createElement('div');
    bar.id = 'scrollProgress';
    document.body.appendChild(bar);

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function ensureToastStack() {
    var stack = document.querySelector('.toast-stack');
    if (stack) return stack;

    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
    return stack;
  }

  function showToast(title, message, type, timeoutMs) {
    var stack = ensureToastStack();
    var toast = document.createElement('article');
    toast.className = 'toast ' + (type || 'ok');

    var safeTitle = title || 'Notice';
    var safeMessage = message || '';
    toast.innerHTML = '<strong>' + safeTitle + '</strong><span>' + safeMessage + '</span>';
    stack.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 180);
    }, timeoutMs || 2600);
  }

  function mountTransitionLayer() {
    if (document.querySelector('.page-transition')) return;

    var layer = document.createElement('div');
    layer.className = 'page-transition';
    document.body.appendChild(layer);

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href') || '';
      if (!href || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      if (href.charAt(0) === '#') return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;

      var destination = new URL(link.href, window.location.href);
      var current = new URL(window.location.href);
      var samePage = destination.pathname === current.pathname && destination.search === current.search;
      if (samePage) return;

      event.preventDefault();
      layer.classList.add('active');
      setTimeout(function () {
        window.location.href = link.href;
      }, 150);
    });
  }

  function collectQuickLinks() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.portal-nav a'));
    if (!links.length) {
      links = Array.prototype.slice.call(document.querySelectorAll('.header-nav a'));
    }
    if (!links.length) return [];

    return links
      .map(function (link) {
        return {
          href: link.getAttribute('href') || '#',
          label: (link.textContent || '').trim()
        };
      })
      .filter(function (item) {
        return item.href && item.href !== '#' && item.label;
      })
      .slice(0, 7);
  }

  function mountQuickActions() {
    if (document.querySelector('.quick-fab')) return;
    if (!document.querySelector('.portal-shell')) return;

    var links = collectQuickLinks();
    if (!links.length) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-fab';
    button.textContent = 'Quick';

    var panel = document.createElement('aside');
    panel.className = 'quick-panel';
    panel.innerHTML = '<h4>Quick Actions</h4>' +
      '<ul class="quick-links">' +
      links.map(function (item) {
        return '<li><a href="' + item.href + '">' + item.label + '</a></li>';
      }).join('') +
      '</ul>' +
      '<p class="kbd-hint">Shortcut: <span class="kbd">K</span> to open, <span class="kbd">/</span> to search</p>';

    function closePanel() {
      panel.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    }

    function togglePanel() {
      var open = panel.classList.toggle('open');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open quick actions');
    button.addEventListener('click', togglePanel);

    document.addEventListener('click', function (event) {
      if (!panel.classList.contains('open')) return;
      var inside = panel.contains(event.target) || button.contains(event.target);
      if (!inside) closePanel();
    });

    document.addEventListener('keydown', function (event) {
      if ((event.key || '').toLowerCase() === 'k' && !event.ctrlKey && !event.metaKey) {
        var tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        event.preventDefault();
        togglePanel();
      }
      if (event.key === 'Escape') {
        closePanel();
      }
    });

    document.body.appendChild(button);
    document.body.appendChild(panel);
  }

  function findSearchInput() {
    var selectors = [
      '#aiSearchText',
      '#memberLookup',
      '#restaurantSearch',
      'input[type="search"]',
      'input[id*="Search"]',
      'input[id*="search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="Search"]'
    ];

    for (var i = 0; i < selectors.length; i += 1) {
      var node = document.querySelector(selectors[i]);
      if (node) return node;
    }
    return null;
  }

  function mountKeyboardSearchShortcut() {
    document.addEventListener('keydown', function (event) {
      if (event.key !== '/') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      var active = document.activeElement;
      var tag = (active && active.tagName || '').toLowerCase();
      var editable = active && (active.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select');
      if (editable) return;

      var input = findSearchInput();
      if (!input) return;

      event.preventDefault();
      input.focus();
      if (typeof input.select === 'function') input.select();
    });
  }

  function aiHealthUrl() {
    var endpoint = window.CANEATLAH_RECOMMENDER_URL || 'http://127.0.0.1:8000/recommend';
    if (endpoint.indexOf('/recommend') >= 0) {
      return endpoint.replace('/recommend', '/health');
    }
    if (endpoint.charAt(endpoint.length - 1) === '/') {
      return endpoint + 'health';
    }
    return endpoint + '/health';
  }

  function shouldShowAiBadge() {
    return !!(
      document.getElementById('aiRunBtn') ||
      window.location.pathname.toLowerCase().indexOf('diner-ai-recommendations') >= 0 ||
      document.querySelector('script[src*="recommendation.js"]')
    );
  }

  function badgeContainer() {
    return (
      document.querySelector('.portal-top h1') ||
      document.querySelector('.hero-copy h1') ||
      document.querySelector('.header-nav') ||
      document.querySelector('.header-inner')
    );
  }

  function mountAiHealthBadge() {
    if (!shouldShowAiBadge()) return;
    if (document.querySelector('.ai-health-badge')) return;

    var host = badgeContainer();
    if (!host) return;

    var badge = document.createElement('span');
    badge.className = 'ai-health-badge pending';
    badge.textContent = 'AI checking...';

    if (host.classList && host.classList.contains('header-nav')) {
      host.insertBefore(badge, host.firstChild);
    } else {
      host.appendChild(badge);
    }

    function updateBadge(online) {
      badge.classList.remove('pending', 'online', 'offline');
      if (online) {
        badge.classList.add('online');
        badge.textContent = 'AI online';
      } else {
        badge.classList.add('offline');
        badge.textContent = 'AI offline';
      }
    }

    function check() {
      var timeout = new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('timeout'));
        }, 2200);
      });

      Promise.race([
        fetch(aiHealthUrl(), { method: 'GET' }).then(function (response) {
          if (!response.ok) throw new Error('offline');
          return response.json();
        }),
        timeout
      ])
        .then(function () {
          updateBadge(true);
        })
        .catch(function () {
          updateBadge(false);
        });
    }

    check();
    setInterval(check, 30000);
  }

  function ensureSharedStyles() {
    var expected = rootPath('assets/css/experience.css');
    var found = Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"]')).some(function (node) {
      return (node.getAttribute('href') || '').indexOf('assets/css/experience.css') >= 0;
    });

    if (found) return;

    var style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = expected;
    document.head.appendChild(style);
  }

  onReady(function () {
    ensureSharedStyles();
    mountScrollProgress();
    mountTransitionLayer();
    mountQuickActions();
    mountKeyboardSearchShortcut();
    mountAiHealthBadge();

    window.appUX = window.appUX || {};
    window.appUX.showToast = showToast;
  });
})();
