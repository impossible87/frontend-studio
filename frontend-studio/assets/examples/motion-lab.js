/* Original, dependency-free mechanisms. Static HTML remains usable before initialization. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const removers = [];
  const running = new Set();
  let scrollFrame = 0, spotFrame = 0;
  let initialized = false;
  const on = (node, type, handler, options) => {
    node.addEventListener(type, handler, options);
    removers.push(() => node.removeEventListener(type, handler, options));
  };
  const animate = (node, frames, duration = 440, easing = 'cubic-bezier(.22,1,.36,1)') => {
    if (reduce.matches || !node.animate) return null;
    const animation = node.animate(frames, { duration, easing });
    running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
    return animation;
  };
  const story = document.querySelector('#story');
  const stage = story.querySelector('.story-stage');
  const steps = [...document.querySelectorAll('[data-step]')];
  const productPanels = [...document.querySelectorAll('.product-panel')];
  const flow = document.querySelector('#flow');
  const marker = document.querySelector('#flow-marker');
  let productIndex = -1, productAnimation;
  function chooseProduct(index, progress = index / 2) {
    productAnimation?.cancel();
    const changed = productIndex !== index;
    productIndex = index;
    steps.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      button.closest('li').classList.toggle('is-active', i === index);
    });
    productPanels.forEach((panel, i) => { panel.hidden = i !== index; });
    if (changed) productAnimation = animate(productPanels[index], [{ opacity: .6, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 280);
    stage.dataset.activeStep = String(index);
    flow.style.strokeDashoffset = String(1 - progress);
    marker.setAttribute('cx', String(24 + progress * 432));
  }
  function renderScroll() {
    scrollFrame = 0;
    if (reduce.matches || !initialized) return;
    const rect = story.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const distance = Math.max(1, story.offsetHeight - stage.offsetHeight);
    const progress = Math.max(0, Math.min(1, (top - rect.top) / distance));
    const index = Math.min(2, Math.floor(progress * 3));
    // Preserve the active animation when only continuous progress changes.
    if (index !== productIndex) chooseProduct(index, progress);
    else {
      flow.style.strokeDashoffset = String(1 - progress);
      marker.setAttribute('cx', String(24 + progress * 432));
    }
  }
  const scheduleScroll = () => { if (!scrollFrame && !reduce.matches) scrollFrame = requestAnimationFrame(renderScroll); };
  steps.forEach((button, index) => on(button, 'click', () => {
    chooseProduct(index);
    if (!reduce.matches) {
      const top = parseFloat(getComputedStyle(stage).top) || 0;
      const distance = Math.max(1, story.offsetHeight - stage.offsetHeight);
      window.scrollTo({ top: window.scrollY + story.getBoundingClientRect().top - top + distance * [0, .5, 1][index], behavior: 'instant' });
    }
  }));

  const works = [...document.querySelectorAll('.work')];
  const workAnimations = new Map();
  const workSummaries = works.map(work => work.querySelector('summary'));
  function chooseWork(target) {
    // Read the current rendered heights before cancellation so interrupted transitions resume in place.
    const before = works.map(work => work.getBoundingClientRect().height);
    const shouldOpen = !target.open;
    workAnimations.forEach(animation => animation.cancel());
    workAnimations.clear();
    works.forEach(work => {
      const summary = work.querySelector('summary');
      if (work !== target && work.contains(document.activeElement) && document.activeElement !== summary) summary.focus({ preventScroll: true });
      work.open = work === target && shouldOpen;
      summary.setAttribute('aria-expanded', String(work.open));
      work.classList.remove('is-reflow');
    });
    const after = works.map(work => work.getBoundingClientRect().height);
    works.forEach((work, i) => {
      if (Math.abs(before[i] - after[i]) < 1) return;
      work.classList.add('is-reflow');
      const animation = animate(work, [{ height: `${before[i]}px` }, { height: `${after[i]}px` }]);
      if (!animation) { work.classList.remove('is-reflow'); return; }
      workAnimations.set(work, animation);
      animation.finished.catch(() => {}).finally(() => {
        if (workAnimations.get(work) === animation) {
          work.classList.remove('is-reflow');
          workAnimations.delete(work);
        }
      });
    });
  }
  workSummaries.forEach((summary, i) => {
    summary.setAttribute('aria-expanded', String(works[i].open));
    on(summary, 'click', event => { event.preventDefault(); chooseWork(works[i]); });
  });

  const tabs = [...document.querySelectorAll('.tab')];
  const panels = [...document.querySelectorAll('.research-panel')];
  const tablist = document.querySelector('#tabs');
  const panelHost = document.querySelector('#research-panels');
  const indicator = document.querySelector('.tab-indicator');
  let tabIndex = 0, heightAnimation, contentAnimation, indicatorAnimation;
  const indicatorPosition = index => ({ transform: `translateX(${tabs[index].offsetLeft}px) scaleX(${tabs[index].offsetWidth})` });
  function alignIndicator() { indicatorAnimation?.cancel(); Object.assign(indicator.style, indicatorPosition(tabIndex)); }
  function chooseTab(index, focus = false) {
    const beforeHeight = panelHost.getBoundingClientRect().height;
    const beforeIndicator = getComputedStyle(indicator).transform;
    heightAnimation?.cancel(); contentAnimation?.cancel(); indicatorAnimation?.cancel();
    tabIndex = index;
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    const afterHeight = panelHost.getBoundingClientRect().height;
    panelHost.classList.add('is-reflow');
    heightAnimation = animate(panelHost, [{ height: `${beforeHeight}px` }, { height: `${afterHeight}px` }], 280);
    const currentHeightAnimation = heightAnimation;
    if (heightAnimation) heightAnimation.finished.catch(() => {}).finally(() => {
      if (heightAnimation === currentHeightAnimation) panelHost.classList.remove('is-reflow');
    });
    else panelHost.classList.remove('is-reflow');
    contentAnimation = animate(panels[index], [{ opacity: .65, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 220);
    Object.assign(indicator.style, indicatorPosition(index));
    indicatorAnimation = animate(indicator, [{ transform: beforeIndicator }, indicatorPosition(index)], 220);
    if (focus) tabs[index].focus({ preventScroll: true });
  }
  tabs.forEach((tab, index) => {
    on(tab, 'click', () => chooseTab(index));
    on(tab, 'keydown', event => {
      const keys = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault(); chooseTab(keys[event.key], true);
    });
  });

  const route = document.querySelector('#route');
  let routeAnimation;
  on(document.querySelector('#replay'), 'click', () => {
    routeAnimation?.cancel();
    routeAnimation = animate(route, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 850);
  });
  const spot = document.querySelector('#spotlight');
  let pointer;
  const clearSpot = () => { cancelAnimationFrame(spotFrame); spotFrame = 0; spot.classList.remove('is-lit'); };
  on(spot, 'pointermove', event => {
    if (reduce.matches || !fine.matches) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (spotFrame) return;
    spotFrame = requestAnimationFrame(() => {
      spotFrame = 0;
      const rect = spot.getBoundingClientRect();
      spot.style.setProperty('--x', `${pointer.x - rect.left}px`); spot.style.setProperty('--y', `${pointer.y - rect.top}px`);
      spot.classList.add('is-lit');
    });
  });
  on(spot, 'pointerleave', clearSpot);
  on(document.querySelector('#spot-toggle'), 'click', event => {
    const selected = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    event.currentTarget.setAttribute('aria-pressed', String(selected));
    document.querySelector('#spot-status').textContent = root.lang === 'en'
      ? (selected ? 'Area marked' : 'Select to mark this area')
      : (selected ? '已标记为关注区块' : '点击标记这个区块');
  });
  function mode() {
    running.forEach(animation => animation.cancel());
    workAnimations.forEach(animation => animation.cancel()); workAnimations.clear();
    works.forEach(work => work.classList.remove('is-reflow'));
    panelHost.classList.remove('is-reflow'); clearSpot();
    cancelAnimationFrame(scrollFrame); scrollFrame = 0;
    root.classList.toggle('scroll-story', !reduce.matches);
    chooseProduct(productIndex < 0 ? 0 : productIndex);
    chooseTab(tabIndex);
    alignIndicator();
    if (!reduce.matches) scheduleScroll();
  }
  const resize = () => {
    heightAnimation?.cancel(); contentAnimation?.cancel(); panelHost.classList.remove('is-reflow');
    workAnimations.forEach(animation => animation.cancel()); workAnimations.clear();
    works.forEach(work => work.classList.remove('is-reflow'));
    alignIndicator(); scheduleScroll();
  };
  const restore = () => {
    initialized = false;
    removers.splice(0).forEach(remove => remove());
    running.forEach(animation => animation.cancel());
    cancelAnimationFrame(scrollFrame); cancelAnimationFrame(spotFrame);
    root.classList.remove('enhanced', 'scroll-story');
    productPanels.concat(panels).forEach(panel => { panel.hidden = false; panel.removeAttribute('role'); });
    works.forEach(work => { work.classList.remove('is-reflow'); work.querySelector('summary').removeAttribute('aria-expanded'); });
    panelHost.classList.remove('is-reflow');
    tablist.removeAttribute('role');
  };
  try {
    // Enhance only after all essential listeners and structures are available.
    root.classList.add('enhanced');
    tablist.setAttribute('role', 'tablist');
    tabs.forEach(tab => tab.setAttribute('role', 'tab'));
    panels.forEach(panel => panel.setAttribute('role', 'tabpanel'));
    initialized = true;
    mode();
    on(window, 'scroll', scheduleScroll, { passive: true });
    on(window, 'resize', resize);
    on(reduce, 'change', mode);
    on(fine, 'change', clearSpot);
    // Preserve initialization when entering bfcache; restore only on a real unload.
    on(window, 'pagehide', event => { if (!event.persisted) restore(); });
    document.fonts?.ready.then(() => { if (initialized) resize(); });
  } catch (error) {
    initialized = false; restore();
    console.error('Motion lab initialization failed; static content restored.', error);
  }
})();
