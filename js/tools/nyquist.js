// js/tools/nyquist.js
(function(){
  const DLTOOLS = (window.DLTOOLS = window.DLTOOLS || {});
  const S = { defaults: null };

  async function loadDefaults(){
    if(S.defaults) return S.defaults;
    try{
      const res = await fetch('js/tools/nyquist.defaults.json', { cache:'no-store' });
      if(res.ok) S.defaults = await res.json();
    }catch(_){}
    S.defaults = S.defaults || {
      num: "1",
      den: "0.001, 1",
      fmin: 1,
      fmax: 10000,
      npts: 800,
      delay: 0
    };
    return S.defaults;
  }

  function html(ctx){
    const { t, escapeHtml } = ctx;
    return `
      <div class="tool-title">${escapeHtml(t('tools.nyquist'))}</div>
      <div class="tool-sub">${escapeHtml(t('tools.nyquistSub'))}</div>

      <div class="tool-grid">
        <div class="tool-field">
          <label>${escapeHtml(t('tools.num'))}</label>
          <textarea id="nyqNum"></textarea>
        </div>
        <div class="tool-field">
          <label>${escapeHtml(t('tools.den'))}</label>
          <textarea id="nyqDen"></textarea>
        </div>

        <div class="tool-field">
          <label>${escapeHtml(t('tools.fmin'))}</label>
          <input id="nyqFmin" type="number" step="0.1"/>
        </div>
        <div class="tool-field">
          <label>${escapeHtml(t('tools.fmax'))}</label>
          <input id="nyqFmax" type="number" step="1"/>
        </div>

        <div class="tool-field">
          <label>${escapeHtml(t('tools.points'))}</label>
          <input id="nyqNpts" type="number" step="50"/>
        </div>
        <div class="tool-field">
          <label>${escapeHtml(t('tools.delay'))}</label>
          <input id="nyqDelay" type="number" step="0.000001"/>
        </div>
      </div>

      <div class="tool-actions">
        <button class="btn" id="nyqPlotBtn">${escapeHtml(t('tools.plot'))}</button>
        <button class="btn ghost" id="nyqResetBtn">${escapeHtml(t('tools.reset'))}</button>
      </div>

      <div class="tool-help">${t('tools.nyquistHelp')}</div>

      <div class="plotbox">
        <div id="nyquistPlot" class="plot"></div>
      </div>
    `;
  }

  function parseCoeffs(text){
    const cleaned = String(text || '').replace(/[\n\r]/g, ' ').trim();
    if(!cleaned) return [];
    const parts = cleaned.split(/[\s,]+/).filter(Boolean);
    return parts.map(v => {
      const x = Number(v);
      if(!Number.isFinite(x)) throw new Error('Invalid coefficient: ' + v);
      return x;
    });
  }

  // Horner evaluation for polynomial with coefficients ordered:
  // [a_n, a_(n-1), ..., a_0]
  // evaluated at s = j*w
  function polyEvalJw(coeffs, w){
    if(!coeffs.length) return { re: 0, im: 0 };

    let re = coeffs[0];
    let im = 0;

    for(let k = 1; k < coeffs.length; k++){
      const nextRe = -im * w + coeffs[k];
      const nextIm =  re * w;
      re = nextRe;
      im = nextIm;
    }
    return { re, im };
  }

  function cDiv(a, b){
    const d = b.re*b.re + b.im*b.im;
    if(d === 0) return { re: Infinity, im: Infinity };
    return {
      re: (a.re*b.re + a.im*b.im)/d,
      im: (a.im*b.re - a.re*b.im)/d
    };
  }

  function cAbs(a){
    return Math.hypot(a.re, a.im);
  }

  function logspace(fmin, fmax, n){
    const out = [];
    const a = Math.log10(fmin);
    const b = Math.log10(fmax);
    for(let i = 0; i < n; i++){
      const tt = i / (n - 1);
      out.push(Math.pow(10, a + (b - a) * tt));
    }
    return out;
  }

  function applyDelay(G, w, Td){
    if(!(Td > 0)) return G;
    const ang = -w * Td;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    return {
      re: G.re * c - G.im * s,
      im: G.re * s + G.im * c
    };
  }

  function finitePoint(z){
    return Number.isFinite(z.re) && Number.isFinite(z.im) && cAbs(z) < 1e12;
  }

  function plotFromUi(ctx, silent){
    const { $ } = ctx;

    try{
      if(!window.Plotly) throw new Error('Plotly not loaded. Check your script include.');

      const num = parseCoeffs($('#nyqNum')?.value);
      const den = parseCoeffs($('#nyqDen')?.value);
      const fmin = Number($('#nyqFmin')?.value);
      const fmax = Number($('#nyqFmax')?.value);
      const npts = Math.max(50, Math.floor(Number($('#nyqNpts')?.value)));
      const Td = Number($('#nyqDelay')?.value);

      if(num.length === 0 || den.length === 0) throw new Error('Numerator/denominator cannot be empty.');
      if(!(fmin > 0 && fmax > fmin)) throw new Error('Check f_min and f_max.');
      if(!(Td >= 0)) throw new Error('Delay must be >= 0.');

      const f = logspace(fmin, fmax, npts);

      const posRe = [];
      const posIm = [];
      const negRe = [];
      const negIm = [];
      const txtPos = [];
      const txtNeg = [];

      for(let i = 0; i < f.length; i++){
        const w = 2 * Math.PI * f[i];

        const N = polyEvalJw(num, w);
        const D = polyEvalJw(den, w);
        let G = cDiv(N, D);
        G = applyDelay(G, w, Td);

        if(finitePoint(G)){
          posRe.push(G.re);
          posIm.push(G.im);
          txtPos.push(`f = ${f[i].toFixed(3)} Hz`);
        }

        const Gm = { re: G.re, im: -G.im };
        if(finitePoint(Gm)){
          negRe.push(Gm.re);
          negIm.push(Gm.im);
          txtNeg.push(`f = ${f[i].toFixed(3)} Hz`);
        }
      }

      const traces = [
        {
          x: posRe,
          y: posIm,
          type: 'scatter',
          mode: 'lines',
          name: 'G(jω)',
          text: txtPos,
          hovertemplate: 'Re: %{x}<br>Im: %{y}<br>%{text}<extra></extra>'
        },
        {
          x: negRe,
          y: negIm,
          type: 'scatter',
          mode: 'lines',
          name: 'G(-jω)',
          text: txtNeg,
          hovertemplate: 'Re: %{x}<br>Im: %{y}<br>%{text}<extra></extra>'
        },
        {
          x: [-1],
          y: [0],
          type: 'scatter',
          mode: 'markers+text',
          name: '-1 point',
          text: ['-1 + j0'],
          textposition: 'top right',
          hovertemplate: 'Critical point<extra></extra>',
          marker: { size: 8 }
        }
      ];

      Plotly.newPlot('nyquistPlot', traces, {
        title: 'Nyquist Diagram',
        xaxis: {
          title: 'Real',
          zeroline: true,
          zerolinewidth: 1
        },
        yaxis: {
          title: 'Imaginary',
          zeroline: true,
          zerolinewidth: 1,
          scaleanchor: 'x',
          scaleratio: 1
        },
        margin: { l: 60, r: 20, t: 50, b: 50 },
        showlegend: true
      }, { responsive: true });

    }catch(e){
      if(!silent) alert(e.message || String(e));
    }
  }

  async function reset(ctx, silent){
    const { $ } = ctx;
    const d = await loadDefaults();

    const set = (id, v) => {
      const el = $(id);
      if(el) el.value = String(v);
    };

    set('#nyqNum', d.num);
    set('#nyqDen', d.den);
    set('#nyqFmin', d.fmin);
    set('#nyqFmax', d.fmax);
    set('#nyqNpts', d.npts);
    set('#nyqDelay', d.delay);

    plotFromUi(ctx, silent ?? true);
  }

  async function wire(ctx){
    await reset(ctx, true);
    ctx.$('#nyqPlotBtn').onclick = () => plotFromUi(ctx, false);
    ctx.$('#nyqResetBtn').onclick = () => reset(ctx, false);
  }

  DLTOOLS.nyquist = { html, wire, plotFromUi, reset };
})();