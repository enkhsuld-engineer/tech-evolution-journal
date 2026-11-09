window.PortfolioIntro = (() => {
  const storageKey = 'portfolio-entry-v1';
  const screen = document.querySelector('#entryScreen');
  const enter = document.querySelector('#entryEnter');
  const skip = document.querySelector('#entrySkip');
  const status = document.querySelector('#entryStatus');
  const surfaces = [...document.querySelectorAll('body > .topbar, body > .shell, body > .footer')];
  const animations = new Set();
  let drawings = [];
  let phase = 'welcome';
  let ready = false;
  let pointerPosition = null;
  let run = 0;
  let messages = {
    loading: 'Preparing your portfolio...',
    error: 'The portfolio could not load. Please retry.',
    retry: 'Retry',
  };

  function animate(element, keyframes, { startTime, ...options }) {
    const animation = element.animate(keyframes, { fill: 'forwards', ...options });
    animation.startTime = startTime;
    animations.add(animation);
    return animation.finished;
  }

  function finish(focus = true) {
    if (phase === 'done') return;
    phase = 'done';
    run++;
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const { panel, cursor, selection } of drawings) {
      panel.classList.remove('intro-target');
      cursor.remove();
      selection.remove();
    }
    drawings = [];
    document.body.classList.remove('entry-pending', 'intro-running');
    screen.hidden = true;
    skip.hidden = false;
    surfaces.forEach(element => { element.inert = false; });
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointermove', rememberPointer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('hashchange', onNavigation);
    window.removeEventListener('pagehide', onNavigation);
    document.removeEventListener('visibilitychange', onVisibility);
    enter.removeEventListener('click', requestEntry);
    skip.removeEventListener('click', skipEntry);
    try {
      sessionStorage.setItem(storageKey, 'entered');
    } catch (error) {
      console.warn('Entry preference could not be saved; navigation within this page will still skip the intro.', error);
    }
    if (focus) {
      document.body.classList.add('intro-complete');
      const heading = document.querySelector('.view:not(.hidden) h1, .view:not(.hidden) h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.classList.add('intro-heading');
        heading.focus({ preventScroll: true });
      }
    }
  }

  function prepareDrawings() {
    const activeView = document.querySelector('.view:not(.hidden)');
    const homeRegions = activeView ? [...activeView.querySelectorAll('[data-intro-region]')] : [];
    const regions = homeRegions.length ? homeRegions : [...(activeView?.children || [])].slice(0, 4);
    const panels = [document.querySelector('.topbar'), ...regions].filter(Boolean);
    return panels.flatMap(panel => {
      const bounds = panel.getBoundingClientRect();
      const rect = {
        left: Math.max(0, bounds.left),
        right: Math.min(innerWidth, bounds.right),
        top: Math.max(0, bounds.top),
        bottom: Math.min(innerHeight, bounds.bottom),
      };
      rect.width = rect.right - rect.left;
      rect.height = rect.bottom - rect.top;
      // Offscreen sections stay in normal document flow; no cursor travels outside the viewport.
      if (rect.width < 20 || rect.height < 20) return [];
      const selection = document.createElement('div');
      selection.className = 'intro-selection';
      selection.setAttribute('aria-hidden', 'true');
      const cursor = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      cursor.setAttribute('class', 'intro-cursor');
      cursor.setAttribute('viewBox', '0 0 40 48');
      cursor.setAttribute('aria-hidden', 'true');
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arrow.setAttribute('d', 'M5 3v34l9-8 7 15 7-3-7-15 13-1Z');
      cursor.append(arrow);
      panel.classList.add('intro-target');
      document.body.append(selection, cursor);
      return [{ panel, cursor, selection, rect }];
    });
  }

  async function draw({ panel, cursor, selection, rect }, index, origin, startTime) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = (x, y, scale = 1) => `translate(${x - 3}px, ${y - 1.8}px) scale(${reduce ? 1 : scale})`;
    const radius = Math.min(120, innerWidth * .12, innerHeight * .14) * (.65 + Math.random() * .35);
    const direction = Math.random() < .5 ? -1 : 1;
    const phaseOffset = Math.random() * Math.PI * 2;
    const turns = .65 + index * .12 + Math.random() * .1;
    const stretchX = .65 + Math.random() * .55;
    const stretchY = .65 + Math.random() * .55;
    let distance = 0;
    let previous = origin;
    const points = Array.from({ length: 97 }, (_, step) => {
      const t = step / 96;
      const baseX = origin.x + (rect.right - origin.x) * t;
      const baseY = origin.y + (rect.top - origin.y) * t;
      const orbit = Math.min(
        radius * Math.sin(Math.PI * t) ** 2,
        baseX / stretchX, (innerWidth - baseX) / stretchX,
        baseY / stretchY, (innerHeight - baseY) / stretchY,
      );
      const angle = phaseOffset + direction * Math.PI * 2 * turns * t;
      const x = baseX + Math.cos(angle) * orbit * stretchX;
      const y = baseY + Math.sin(angle) * orbit * stretchY;
      distance += Math.hypot(x - previous.x, y - previous.y);
      previous = { x, y };
      return { x, y, distance };
    });
    const approach = points.map((point, index) => ({
      transform: pointer(point.x, point.y),
      offset: distance ? point.distance / distance : index / (points.length - 1),
    }));

    await animate(cursor, [
      { transform: pointer(origin.x, origin.y, .4), opacity: 0 },
      { transform: pointer(origin.x, origin.y), opacity: 1 },
    ], { duration: 140, easing: 'ease-out', startTime });
    startTime += 140;
    await animate(cursor, approach, { duration: 950, easing: 'cubic-bezier(.3, 0, .7, 1)', startTime });
    startTime += 950;
    await animate(cursor, [
      { transform: pointer(rect.right, rect.top) },
      { transform: pointer(rect.right, rect.top, .85) },
    ], { duration: 60, startTime });
    startTime += 60;

    const dragTiming = { duration: 600, easing: 'cubic-bezier(.25, .1, .25, 1)', startTime };
    await Promise.all([
      animate(selection, [
        { left: `${rect.right}px`, top: `${rect.top}px`, width: '0px', height: '0px', opacity: 1 },
        { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, opacity: 1 },
      ], dragTiming),
      animate(cursor, [
        { transform: pointer(rect.right, rect.top, .85) },
        { transform: pointer(rect.left, rect.bottom, .85) },
      ], dragTiming),
    ]);
    startTime += 600;
    await animate(cursor, [
      { transform: pointer(rect.left, rect.bottom, .85) },
      { transform: pointer(rect.left, rect.bottom) },
    ], { duration: 70, startTime });
    startTime += 70;
    await Promise.all([
      animate(selection, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, startTime }),
      animate(panel, [
        { opacity: 0, visibility: 'visible', transform: reduce ? 'scale(1)' : 'scale(.985)' },
        { opacity: 1, visibility: 'visible', transform: 'scale(1)' },
      ], { duration: 320, easing: 'cubic-bezier(.16, 1, .3, 1)', startTime }),
      animate(cursor, [
        { opacity: 1, transform: pointer(rect.left, rect.bottom) },
        { opacity: 0, transform: pointer(rect.left + 18, rect.bottom - 12) },
      ], { duration: 220, delay: 100, startTime }),
    ]);
  }

  async function play() {
    if (phase !== 'waiting' || !ready) return;
    phase = 'animating';
    const currentRun = ++run;
    try {
      drawings = prepareDrawings();
      document.body.classList.replace('entry-pending', 'intro-running');
      const origin = pointerPosition
        ? { x: Math.max(0, Math.min(innerWidth, pointerPosition.x)), y: Math.max(0, Math.min(innerHeight, pointerPosition.y)) }
        : { x: innerWidth / 2, y: innerHeight / 2 };
      const startTime = document.timeline.currentTime;
      await Promise.all(drawings.map((drawing, index) => draw(drawing, index, origin, startTime)));
      if (currentRun === run) finish();
    } catch (error) {
      if (currentRun !== run && error instanceof DOMException && error.name === 'AbortError') return;
      console.error('The portfolio entry animation failed.', error);
      finish();
    }
  }

  function requestEntry() {
    if (phase === 'error') {
      location.reload();
      return;
    }
    if (phase !== 'welcome') return;
    phase = 'waiting';
    if (ready) play();
    else status.textContent = messages.loading;
  }

  function rememberPointer(event) {
    if (phase === 'welcome') pointerPosition = { x: event.clientX, y: event.clientY };
  }

  function onPointerDown(event) {
    if (skip.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    rememberPointer(event);
    requestEntry();
  }

  function onKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || ['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      if (phase === 'animating' && skip.hidden) return;
      (phase === 'animating' || document.activeElement === enter ? skip : enter).focus();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape' || (document.activeElement === skip && ['Enter', ' '].includes(event.key))) finish();
    else requestEntry();
  }

  function skipEntry() { finish(); }
  function onResize() { if (phase === 'animating') finish(); }
  function onNavigation() { if (phase === 'animating' || phase === 'waiting') finish(false); }
  function onVisibility() { if (document.hidden && phase === 'animating') finish(false); }

  function lockEntry() {
    document.body.classList.remove('intro-complete');
    surfaces.forEach(element => { element.inert = true; });
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', rememberPointer);
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', onNavigation);
    window.addEventListener('pagehide', onNavigation);
    document.addEventListener('visibilitychange', onVisibility);
    enter.addEventListener('click', requestEntry);
    skip.addEventListener('click', skipEntry);
  }

  lockEntry();
  try {
    if (sessionStorage.getItem(storageKey) === 'entered') finish(false);
  } catch (error) {
    console.warn('Entry preference could not be read; using the current page lifetime.', error);
  }
  if (phase !== 'done') enter.focus({ preventScroll: true });

  return {
    async reveal(origin = null) {
      if (phase !== 'done' || !ready) return;
      phase = 'waiting';
      pointerPosition = origin;
      skip.hidden = true;
      screen.hidden = false;
      document.body.classList.add('entry-pending');
      lockEntry();
      await play();
    },
    replay() {
      try {
        sessionStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Entry preference could not be reset.', error);
      }
      window.scrollTo({ top:0, left:0, behavior:'instant' });
      location.reload();
    },
    ready(copy) {
      messages = { ...messages, ...copy };
      ready = true;
      if (phase === 'waiting') play();
    },
    fail(message) {
      if (phase === 'done') return;
      phase = 'error';
      status.textContent = message || messages.error;
      enter.textContent = messages.retry;
    },
  };
})();
