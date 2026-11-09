/* js/tools/cas.js
   Full CAS in-browser via Pyodide + SymPy
   Exposes: window.DLTOOLS.cas = { html(ctx), wire(ctx) }
*/
(function(){
  const DL = (window.DLTOOLS = window.DLTOOLS || {});

  // Single shared engine instance
  const engine = {
    pyodide: null,
    ready: false,
    busy: false,
    calculating: false,
    status: 'Not loaded',
    async init(){
      if(this.ready) return true;
      if(this.busy) return false;
      this.busy = true;
      this.status = 'Loading Python…';

      try{
        this.pyodide = await loadPyodide({});

        this.status = 'Loading SymPy…';
        await this.pyodide.loadPackage(['sympy']);

        this.status = 'Initializing CAS…';

        const py = `
import sympy as sp
import json
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application

transformations = (standard_transformations + (implicit_multiplication_application,))
t = sp.Symbol('t', positive=True, real=True)
s = sp.Symbol('s')
j = sp.I

def _parse_expr(x):
    x = str(x).replace('^','**')
    x = x.replace('jw', 'I*w')
    return parse_expr(
        x,
        transformations=transformations,
        local_dict={'t':t,'s':s,'j':sp.I,'I':sp.I}
    )

def _parse(x):
    x = str(x).strip()
    # support equations like "s^2 + 1 = 0"
    if '=' in x:
        # allow "lhs = rhs" (single '=')
        parts = x.split('=')
        if len(parts) != 2:
            raise ValueError("Equation must contain exactly one '='.")
        lhs, rhs = parts[0].strip(), parts[1].strip()
        return sp.Eq(_parse_expr(lhs), _parse_expr(rhs))
    return _parse_expr(x)

def cas_eval(expr):
    e = _parse(expr)
    return sp.simplify(e)

def cas_simplify(expr):
    return sp.simplify(_parse(expr))

def cas_factor(expr):
    return sp.factor(_parse(expr))

def cas_expand(expr):
    return sp.expand(_parse(expr))

def cas_diff(expr, var='t'):
    v = t if var=='t' else (s if var=='s' else sp.Symbol(var))
    return sp.diff(_parse(expr), v)

def cas_integrate(expr, var='t'):
    v = t if var=='t' else (s if var=='s' else sp.Symbol(var))
    return sp.integrate(_parse(expr), v)

def cas_solve(eq, var='s'):
    v = t if var=='t' else (s if var=='s' else sp.Symbol(var))
    E = _parse(eq)

    if isinstance(E, sp.Equality):
        sol = sp.solve(E, v)
    else:
        sol = sp.solve(sp.Eq(E, 0), v)

    return sol


def cas_laplace(ft):
    F = sp.laplace_transform(_parse(ft), t, s, noconds=True)
    return sp.simplify(F)

def cas_ilaplace(Fs):
    f = sp.inverse_laplace_transform(_parse(Fs), s, t)
    return sp.simplify(f)

`;
        await this.pyodide.runPythonAsync(py);

        this.ready = true;
        this.status = 'Ready';
        return true;
      }catch(e){
        this.status = 'CAS init failed';
        console.error(e);
        return false;
      }finally{
        this.busy = false;
      }
    },

    async callResult(fnName, ...args){
      if(this.calculating) throw new Error('A calculation is already running. Please wait.');
      this.calculating = true;
      try{
        const ok = await this.init();
        if(!ok) throw new Error(this.status);
        const py = this.pyodide;
        try{
          args.forEach((a,i)=> py.globals.set(`__a${i}`, a));
          const out = await py.runPythonAsync(`
res = ${fnName}(${args.map((_,i)=>`__a${i}`).join(',')})
json.dumps({
    "text": ("\\n".join(sp.sstr(x) for x in res) if res else "(no solutions)") if isinstance(res, list) else str(res),
    "tex": sp.latex(sp.FiniteSet(*res)) if isinstance(res, list) else sp.latex(res)
})
`);
          return JSON.parse(String(out));
        }finally{
          args.forEach((_,i)=> py.globals.delete(`__a${i}`));
        }
      }finally{
        this.calculating = false;
      }
    }
  };

  function html(ctx){
    const { escapeHtml, t } = ctx;
    return `
      <div class="tool-title">CAS (SymPy)</div>
      <div class="tool-sub">Full symbolic math in-browser: simplify, factor, expand, solve, Laplace, inverse Laplace.</div>

      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:10px 0">
        <div style="color:var(--muted);font-weight:900">Engine: <span id="casStatus">${escapeHtml(engine.status)}</span></div>
        <button class="btn ghost smallbtn" id="casInitBtn" type="button">Load CAS</button>
      </div>

      <div class="tool-grid">
        <div class="tool-field" style="grid-column:1/-1">
          <label for="casExpr">Expression</label>
          <textarea id="casExpr" rows="3" spellcheck="false"
            placeholder="Examples:
(s+1)/(0.0002*s+0.01)
exp(-2*t)*sin(10*t)
s^2 + 2*s + 5"></textarea>
        </div>

        <div class="tool-field">
          <label>Operation</label>

          <input type="hidden" id="casOp" value="simplify"/>

          <div class="cas-opbar" id="casOpBar" aria-label="CAS operation">
            <button class="cas-opbtn active" data-op="simplify" type="button">Simplify</button>
            <button class="cas-opbtn" data-op="factor" type="button">Factor</button>
            <button class="cas-opbtn" data-op="expand" type="button">Expand</button>
            <button class="cas-opbtn" data-op="diff_t" type="button" aria-label="Differentiate with respect to t"><span class="math-inline">\\(\\frac{d}{dt}\\)</span></button>
            <button class="cas-opbtn" data-op="int_t" type="button" aria-label="Integrate with respect to t"><span class="math-inline">\\(\\int dt\\)</span></button>
            <button class="cas-opbtn" data-op="solve_s" type="button">Solve(s)</button>
            <button class="cas-opbtn" data-op="laplace" type="button">Laplace</button>
            <button class="cas-opbtn" data-op="ilaplace" type="button">Inv Laplace</button>
          </div>

          <div class="cas-ophelp" id="casOpHelp">simplify(expr)</div>
        </div>

        <div class="tool-field">
          <label>${escapeHtml(t('tools.result'))}</label>
          <div id="casResult" class="tool-result" aria-live="polite"></div>
          <details class="tool-raw">
            <summary>${escapeHtml(t('tools.plainText'))}</summary>
            <textarea id="casOut" rows="6" readonly aria-label="${escapeHtml(t('tools.result'))}"></textarea>
          </details>
        </div>
      </div>

      <div class="tool-actions">
        <button class="btn" id="casRunBtn" type="button">${escapeHtml(t('tools.compute'))}</button>
        <button class="btn ghost" id="casResetBtn" type="button">${escapeHtml(t('tools.reset'))}</button>
      </div>
    `;
  }

  function wire(ctx){
    const { $ } = ctx;

    const statusEl = $('#casStatus');
    const setStatus = (s)=>{ if(statusEl) statusEl.textContent = s; };

    // Operation UI must be wired AFTER html is inserted
    const opHidden = $('#casOp');
    const opBar = $('#casOpBar');
    const opHelp = $('#casOpHelp');

    const OP_HELP = {
      simplify: String.raw`\operatorname{simplify}(f)`,
      factor:   String.raw`\operatorname{factor}(f)`,
      expand:   String.raw`\operatorname{expand}(f)`,
      diff_t:   String.raw`\frac{df}{dt}`,
      int_t:    String.raw`\int f(t)\,dt`,
      solve_s:  String.raw`f(s)=0`,
      laplace:  String.raw`F(s)=\mathcal{L}\{f(t)\}`,
      ilaplace: String.raw`f(t)=\mathcal{L}^{-1}\{F(s)\}`,
    };

    function setOp(op){
      if(opHidden) opHidden.value = op;
      if(opHelp) ctx.setMath(opHelp, OP_HELP[op]);
      if(opBar){
        opBar.querySelectorAll('.cas-opbtn').forEach(b=>{
          b.classList.toggle('active', b.dataset.op === op);
          b.setAttribute('aria-pressed', String(b.dataset.op === op));
        });
      }
    }

    if(opBar){
      opBar.querySelectorAll('.cas-opbtn').forEach(btn=>{
        btn.onclick = ()=> setOp(btn.dataset.op);
      });
    }
    setOp(opHidden?.value || 'simplify');

    const initBtn = $('#casInitBtn');
    if(initBtn){
      initBtn.onclick = async ()=>{
        setStatus('Loading…');
        const ok = await engine.init();
        setStatus(engine.status);
        if(!ok) ctx.showError($('#casResult'), new Error(engine.status));
      };
    }

    const exprEl = $('#casExpr');
    const outEl  = $('#casOut');

    const demo = 's^2 + 2*s + 5';
    if(exprEl && !exprEl.value) exprEl.value = demo;

    const runBtn = $('#casRunBtn');
    if(runBtn){
      runBtn.onclick = async ()=>{
        runBtn.disabled = true;
        $('#casResetBtn').disabled = true;
        try{
          setStatus(engine.ready ? 'Ready' : 'Loading…');
          const expr = exprEl ? exprEl.value.trim() : '';
          if(!expr) throw new Error('Expression is empty.');

          const op = (opHidden?.value || 'simplify');
          const operations = {
            simplify: ['cas_simplify', expr], factor: ['cas_factor', expr],
            expand: ['cas_expand', expr], diff_t: ['cas_diff', expr, 't'],
            int_t: ['cas_integrate', expr, 't'], solve_s: ['cas_solve', expr, 's'],
            laplace: ['cas_laplace', expr], ilaplace: ['cas_ilaplace', expr],
          };
          if(!operations[op]) throw new Error('Unknown CAS operation.');
          const res = await engine.callResult(...operations[op]);
          if(!outEl.isConnected) return;
          outEl.value = res.text;
          await ctx.setMath($('#casResult'), op === 'solve_s' ? `s\\in ${res.tex}` : res.tex);
          setStatus(engine.status);
        }catch(e){
          if(outEl) outEl.value = '';
          setStatus(engine.status);
          ctx.showError($('#casResult'), e);
        }finally{
          runBtn.disabled = false;
          $('#casResetBtn').disabled = false;
        }
      };
    }

    const rstBtn = $('#casResetBtn');
    if(rstBtn){
      rstBtn.onclick = ()=>{
        if(exprEl) exprEl.value = demo;
        if(outEl) outEl.value = '';
        ctx.setMath($('#casResult'), '');
        setOp('simplify');
      };
    }

    setStatus(engine.status);
  }

  DL.cas = { html, wire };
})();