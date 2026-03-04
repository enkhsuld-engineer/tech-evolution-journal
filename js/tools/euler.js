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

      <div class="tool-grid">
        <div class="tool-field">
          <label>a</label>
          <input id="euA" type="number" step="0.01"/>
        </div>
        <div class="tool-field">
          <label>b (for a + j b)</label>
          <input id="euB" type="number" step="0.01"/>
        </div>

        <div class="tool-field">
          <label>r</label>
          <input id="euR" type="number" step="0.01"/>
        </div>
        <div class="tool-field">
          <label>&theta; (deg)</label>
          <input id="euDeg" type="number" step="1"/>
        </div>

        <div class="tool-field">
          <label>&theta; (deg) for e<sup>j&theta;</sup></label>
          <input id="euEulerDeg" type="number" step="1"/>
        </div>
        <div class="tool-field">
          <label>${escapeHtml(t('tools.result'))}</label>
          <input id="euOut" type="text" value="" readonly/>
        </div>
      </div>

      <div class="tool-actions">
        <button class="btn" id="euRectToPolarBtn">Rect to Polar</button>
        <button class="btn" id="euPolarToRectBtn">Polar to Rect</button>
        <button class="btn" id="euEulerBtn">${escapeHtml(t('tools.computeEj'))}</button>
        <button class="btn ghost" id="euResetBtn">${escapeHtml(t('tools.reset'))}</button>
      </div>

      <div class="tool-help">${escapeHtml(t('tools.eulerHelp'))}</div>
    `;
  }

  function rectToPolar(ctx){
    const { $ } = ctx;
    const a = Number($('#euA')?.value);
    const b = Number($('#euB')?.value);
    const r = Math.hypot(a,b);
    const deg = Math.atan2(b,a) * 180/Math.PI;

    $('#euR').value = r.toFixed(6);
    $('#euDeg').value = deg.toFixed(6);
    $('#euOut').value = `${r.toFixed(6)} ∠ ${deg.toFixed(6)} deg`;
  }

  function polarToRect(ctx){
    const { $ } = ctx;
    const r = Number($('#euR')?.value);
    const deg = Number($('#euDeg')?.value);
    const th = deg * Math.PI/180;

    const a = r * Math.cos(th);
    const b = r * Math.sin(th);

    $('#euA').value = a.toFixed(6);
    $('#euB').value = b.toFixed(6);
    $('#euOut').value = `${a.toFixed(6)} + j ${b.toFixed(6)}`;
  }

  function computeEj(ctx){
    const { $ } = ctx;
    const deg = Number($('#euEulerDeg')?.value);
    const th  = deg * Math.PI/180;

    const a = Math.cos(th);
    const b = Math.sin(th);

    $('#euOut').value = `e^{j${deg}��} = ${a.toFixed(6)} + j ${b.toFixed(6)}`;
  }

  async function reset(ctx){
    const { $ } = ctx;
    const d = await loadDefaults();
    const set=(id,v)=>{ const el=$(id); if(el) el.value = String(v); };
    set('#euA', d.a); set('#euB', d.b);
    set('#euR', d.r); set('#euDeg', d.deg);
    set('#euEulerDeg', d.eulerDeg);
    set('#euOut','');
  }

  async function wire(ctx){
    await reset(ctx);
    ctx.$('#euRectToPolarBtn').onclick = ()=> rectToPolar(ctx);
    ctx.$('#euPolarToRectBtn').onclick = ()=> polarToRect(ctx);
    ctx.$('#euEulerBtn').onclick = ()=> computeEj(ctx);
    ctx.$('#euResetBtn').onclick = ()=> reset(ctx);
  }

  DLTOOLS.euler = { html, wire, rectToPolar, polarToRect, computeEj, reset };
})();