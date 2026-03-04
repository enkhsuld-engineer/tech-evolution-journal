// js/tools/bode.js
(function(){
  const DLTOOLS = (window.DLTOOLS = window.DLTOOLS || {});
  const S = { defaults: null };

  async function loadDefaults(){
    if(S.defaults) return S.defaults;
    try{
      const res = await fetch('js/tools/bode.defaults.json', { cache:'no-store' });
      if(res.ok) S.defaults = await res.json();
    }catch(_){}
    S.defaults = S.defaults || {
      num: "1",
      den: "0.0002, 0.01",
      fmin: 1,
      fmax: 20000,
      npts: 800,
      delay: 0
    };
    return S.defaults;
  }

  function html(ctx){
    const { t, escapeHtml } = ctx;
    return `
      <div class="tool-title">${escapeHtml(t('tools.bode'))}</div>
      <div class="tool-sub">${escapeHtml(t('tools.bodeSub'))}</div>

      <div class="tool-grid">
        <div class="tool-field">
          <label>${escapeHtml(t('tools.num'))}</label>
          <textarea id="bodeNum"></textarea>
        </div>
        <div class="tool-field">
          <label>${escapeHtml(t('tools.den'))}</label>
          <textarea id="bodeDen"></textarea>
        </div>

        <div class="tool-field">
          <label>${escapeHtml(t('tools.fmin'))}</label>
          <input id="bodeFmin" type="number" step="0.1"/>
        </div>
        <div class="tool-field">
          <label>${escapeHtml(t('tools.fmax'))}</label>
          <input id="bodeFmax" type="number" step="1"/>
        </div>

        <div class="tool-field">
          <label>${escapeHtml(t('tools.points'))}</label>
          <input id="bodeNpts" type="number" step="50"/>
        </div>
        <div class="tool-field">
          <label>${escapeHtml(t('tools.delay'))}</label>
          <input id="bodeDelay" type="number" step="0.000001"/>
        </div>
      </div>

      <div class="tool-actions">
        <button class="btn" id="bodePlotBtn">${escapeHtml(t('tools.plot'))}</button>
        <button class="btn ghost" id="bodeResetBtn">${escapeHtml(t('tools.reset'))}</button>
      </div>

      <div class="tool-help">${t('tools.bodeHelp')}</div>

      <div class="plotbox"><div id="bodeMag" class="plot"></div></div>
      <div class="plotbox"><div id="bodePh" class="plot"></div></div>
    `;
  }

  function parseCoeffs(text){
    const cleaned = String(text||'').replace(/[\n\r]/g, " ").trim();
    if(!cleaned) return [];
    const parts = cleaned.split(/[\s,]+/).filter(Boolean);
    return parts.map(v=>{
      const x = Number(v);
      if(!Number.isFinite(x)) throw new Error("Invalid coefficient: " + v);
      return x;
    });
  }

  // Horner at s=jw
  function polyEvalJw(coeffs, w){
    let re = 0, im = 0;
    const sre = 0, sim = w;
    for(let k=0;k<coeffs.length;k++){
      const nre = re*sre - im*sim;
      const nim = re*sim + im*sre;
      re = nre + coeffs[k];
      im = nim;
    }
    return {re, im};
  }
  function cDiv(a,b){
    const d = b.re*b.re + b.im*b.im;
    if(d === 0) return {re: Infinity, im: Infinity};
    return {re:(a.re*b.re + a.im*b.im)/d, im:(a.im*b.re - a.re*b.im)/d};
  }
  function cAbs(a){ return Math.hypot(a.re, a.im); }
  function cArgDeg(a){ return Math.atan2(a.im, a.re) * 180 / Math.PI; }

  function logspace(fmin, fmax, n){
    const out = [];
    const a = Math.log10(fmin), b = Math.log10(fmax);
    for(let i=0;i<n;i++){
      const tt = i/(n-1);
      out.push(Math.pow(10, a + (b-a)*tt));
    }
    return out;
  }

  function plotFromUi(ctx, silent){
    const { $ } = ctx;
    try{
      if(!window.Plotly) throw new Error("Plotly not loaded. Check your <script> include.");

      const num = parseCoeffs($('#bodeNum')?.value);
      const den = parseCoeffs($('#bodeDen')?.value);
      const fmin = Number($('#bodeFmin')?.value);
      const fmax = Number($('#bodeFmax')?.value);
      const npts = Math.max(50, Math.floor(Number($('#bodeNpts')?.value)));
      const Td = Number($('#bodeDelay')?.value);

      if(num.length===0 || den.length===0) throw new Error("Numerator/denominator cannot be empty.");
      if(!(fmin > 0 && fmax > fmin)) throw new Error("Check f_min and f_max.");
      if(!(Td >= 0)) throw new Error("Delay must be >= 0.");

      const f = logspace(fmin, fmax, npts);
      const magDb = [];
      const phDeg = [];

      for(let i=0;i<f.length;i++){
        const w = 2*Math.PI*f[i];
        const N = polyEvalJw(num, w);
        const D = polyEvalJw(den, w);
        const G = cDiv(N, D);

        const mag = cAbs(G);
        const phaseDelayDeg = -(w * Td) * 180 / Math.PI;
        const phase = cArgDeg(G) + phaseDelayDeg;

        magDb.push(20*Math.log10(mag));
        phDeg.push(phase);
      }

      Plotly.newPlot('bodeMag', [{
        x: f, y: magDb, type:'scatter', mode:'lines', name:'|G(j��)| (dB)'
      }], {
        title: 'Magnitude',
        xaxis:{ type:'log', title:'Frequency (Hz)' },
        yaxis:{ title:'Magnitude (dB)' },
        margin:{ l:60, r:20, t:50, b:50 }
      }, {responsive:true});

      Plotly.newPlot('bodePh', [{
        x: f, y: phDeg, type:'scatter', mode:'lines', name:'��G(j��) (deg)'
      }], {
        title: 'Phase',
        xaxis:{ type:'log', title:'Frequency (Hz)' },
        yaxis:{ title:'Phase (deg)' },
        margin:{ l:60, r:20, t:50, b:50 }
      }, {responsive:true});

    }catch(e){
      if(!silent) alert(e.message || String(e));
    }
  }

  async function reset(ctx, silent){
    const { $ } = ctx;
    const d = await loadDefaults();
    const set = (id, v)=>{ const el=$(id); if(el) el.value = String(v); };
    set('#bodeNum', d.num);
    set('#bodeDen', d.den);
    set('#bodeFmin', d.fmin);
    set('#bodeFmax', d.fmax);
    set('#bodeNpts', d.npts);
    set('#bodeDelay', d.delay);
    plotFromUi(ctx, silent ?? true);
  }

  async function wire(ctx){
    await reset(ctx, true);
    ctx.$('#bodePlotBtn').onclick = ()=> plotFromUi(ctx, false);
    ctx.$('#bodeResetBtn').onclick = ()=> reset(ctx, false);
  }

  DLTOOLS.bode = { html, wire, plotFromUi, reset };
})();