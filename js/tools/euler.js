// js/tools/euler.js
(function(){
  const DLTOOLS = (window.DLTOOLS = window.DLTOOLS || {});
  const S = { defaults: null };

  async function loadDefaults(){
    if(S.defaults) return S.defaults;
    try{
      const res = await fetch('js/tools/euler.defaults.json', { cache:'no-store' });
      if(res.ok) S.defaults = await res.json();
    }catch(_){}
    S.defaults = S.defaults || { a:1, b:0, r:1, deg:0, eulerDeg:30 };
    return S.defaults;
  }

  function html(ctx){
    const { t, escapeHtml } = ctx;
    return `
      <div class="tool-title">${escapeHtml(t('tools.euler'))}</div>
      <div class="tool-sub">${escapeHtml(t('tools.eulerSub'))}</div>
      <div class="tool-help">${ctx.mathHtml(String.raw`z=a+jb=re^{j\theta},\qquad e^{j\theta}=\cos\theta+j\sin\theta`)}</div>

      <div class="tool-grid">
        <div class="tool-field">
          <label for="euA">a</label>
          <input id="euA" type="number" step="0.01"/>
        </div>
        <div class="tool-field">
          <label for="euB">b</label>
          <input id="euB" type="number" step="0.01"/>
        </div>

        <div class="tool-field">
          <label for="euR">r</label>
          <input id="euR" type="number" step="0.01" min="0"/>
        </div>
        <div class="tool-field">
          <label for="euDeg">&theta; (deg)</label>
          <input id="euDeg" type="number" step="1"/>
        </div>

        <div class="tool-field">
          <label for="euEulerDeg">&theta; (deg) for e<sup>j&theta;</sup></label>
          <input id="euEulerDeg" type="number" step="1"/>
        </div>
      </div>

      <div class="tool-actions">
        <button class="btn" id="euRectToPolarBtn">${escapeHtml(t('tools.rectToPolar'))}</button>
        <button class="btn" id="euPolarToRectBtn">${escapeHtml(t('tools.polarToRect'))}</button>
        <button class="btn" id="euEulerBtn">${escapeHtml(t('tools.computeEj'))}</button>
        <button class="btn ghost" id="euResetBtn">${escapeHtml(t('tools.reset'))}</button>
      </div>

      <div id="euResult" class="tool-result" aria-live="polite"></div>
      <details class="tool-raw tool-field">
        <summary>${escapeHtml(t('tools.plainText'))}</summary>
        <input id="euOut" type="text" value="" readonly aria-label="${escapeHtml(t('tools.result'))}"/>
      </details>
      <div class="tool-help">
        ${escapeHtml(t('tools.eulerHelp'))}
        ${ctx.mathHtml(String.raw`r=\sqrt{a^2+b^2},\quad \theta=\operatorname{atan2}(b,a),\quad a=r\cos\theta,\quad b=r\sin\theta`)}
      </div>
    `;
  }

  function readNumber(ctx, selector){
    const value = ctx.$(selector).value.trim();
    if(!value || !Number.isFinite(Number(value))) throw new Error('Enter a finite number in each required field.');
    return Number(value);
  }

  function fixedTex(ctx, value){
    return Math.abs(value) >= 1e21 ? ctx.numberTex(value) : value.toFixed(6);
  }

  function complexTex(ctx, a, b){
    return `${fixedTex(ctx, a)} ${b < 0 ? '-' : '+'} j\\,${fixedTex(ctx, Math.abs(b))}`;
  }

  function rectToPolar(ctx){
    const { $ } = ctx;
    const a = readNumber(ctx, '#euA');
    const b = readNumber(ctx, '#euB');
    const r = Math.hypot(a,b);
    const deg = Math.atan2(b,a) * 180/Math.PI;
    if(!Number.isFinite(r)) throw new Error('The magnitude is too large.');

    $('#euR').value = r.toFixed(6);
    $('#euDeg').value = deg.toFixed(6);
    $('#euOut').value = `${r.toFixed(6)} ∠ ${deg.toFixed(6)} deg`;
    ctx.setMath($('#euResult'), `z=${complexTex(ctx, a, b)}=${fixedTex(ctx, r)}\\angle ${deg.toFixed(6)}\\,{}^{\\circ}`);
  }

  function polarToRect(ctx){
    const { $ } = ctx;
    const r = readNumber(ctx, '#euR');
    const deg = readNumber(ctx, '#euDeg');
    if(r < 0) throw new Error('The magnitude r must be nonnegative.');
    const th = (deg % 360) * Math.PI/180;

    const a = r * Math.cos(th);
    const b = r * Math.sin(th);

    $('#euA').value = a.toFixed(6);
    $('#euB').value = b.toFixed(6);
    $('#euOut').value = `${a.toFixed(6)} ${b < 0 ? '-' : '+'} j ${Math.abs(b).toFixed(6)}`;
    ctx.setMath($('#euResult'), `z=${fixedTex(ctx, r)}\\angle ${ctx.numberTex(deg)}\\,{}^{\\circ}=${complexTex(ctx, a, b)}`);
  }

  function computeEj(ctx){
    const { $ } = ctx;
    const deg = readNumber(ctx, '#euEulerDeg');
    const th  = (deg % 360) * Math.PI/180;

    const a = Math.cos(th);
    const b = Math.sin(th);

    $('#euOut').value = `e^(j ${deg} deg) = ${a.toFixed(6)} ${b < 0 ? '-' : '+'} j ${Math.abs(b).toFixed(6)}`;
    ctx.setMath($('#euResult'), `e^{j(${ctx.numberTex(deg)}\\,{}^{\\circ})}=${complexTex(ctx, a, b)}`);
  }

  async function reset(ctx){
    const { $ } = ctx;
    const d = await loadDefaults();
    if(!$('#euA')?.isConnected) return;
    const set=(id,v)=>{ const el=$(id); if(el) el.value = String(v); };
    set('#euA', d.a); set('#euB', d.b);
    set('#euR', d.r); set('#euDeg', d.deg);
    set('#euEulerDeg', d.eulerDeg);
    set('#euOut','');
    ctx.setMath($('#euResult'), '');
  }

  async function wire(ctx){
    await reset(ctx);
    if(!ctx.$('#euRectToPolarBtn')?.isConnected) return;
    const calculate = operation => ()=>{
      try{
        operation(ctx);
      }catch(error){
        ctx.$('#euOut').value = '';
        ctx.showError(ctx.$('#euResult'), error);
      }
    };
    ctx.$('#euRectToPolarBtn').onclick = calculate(rectToPolar);
    ctx.$('#euPolarToRectBtn').onclick = calculate(polarToRect);
    ctx.$('#euEulerBtn').onclick = calculate(computeEj);
    ctx.$('#euResetBtn').onclick = ()=> reset(ctx);
  }

  DLTOOLS.euler = { html, wire, rectToPolar, polarToRect, computeEj, reset };
})();