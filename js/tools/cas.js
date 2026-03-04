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

    return [sp.sstr(x) for x in sol]


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

    async call(fnName, ...args){
      const ok = await this.init();
      if(!ok) throw new Error(this.status);

      const py = this.pyodide;
      const f = py.globals.get(fnName);
      if(!f) throw new Error(`Missing CAS function: ${fnName}`);

      const pyArgs = args.map(a => py.toPy(a));
      try{
        const out = f(...pyArgs);
        if(out && typeof out.toJs === 'function') return out.toJs({dict_converter:Object.fromEntries});
        return String(out);
      }finally{
        try{ f.destroy(); }catch(_){}
        pyArgs.forEach(x=>{ try{ x.destroy(); }catch(_){} });
      }
    },

    async callStr(fnName, ...args){
      const ok = await this.init();
      if(!ok) throw new Error(this.status);
      const py = this.pyodide;

      const pycall = `
res = ${fnName}(${args.map((_,i)=>`__a${i}`).join(',')})
str(res)
`;
      args.forEach((a,i)=> py.globals.set(`__a${i}`, a));
      const out = await py.runPythonAsync(pycall);
      args.forEach((_,i)=>{ try{ py.globals.delete(`__a${i}`); }catch(_){} });
      return String(out);
    }
  };

  function html(ctx){
    const { escapeHtml } = ctx;
    return `
      <div class="tool-title">CAS (SymPy)</div>
      <div class="tool-sub">Full symbolic math in-browser: simplify, factor, expand, solve, Laplace, inverse Laplace.</div>

      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:10px 0">
        <div style="color:var(--muted);font-weight:900">Engine: <span id="casStatus">${escapeHtml(engine.status)}</span></div>
        <button class="btn ghost smallbtn" id="casInitBtn" type="button">Load CAS</button>
      </div>

      <div class="tool-grid">
        <div class="tool-field" style="grid-column:1/-1">
          <label>Expression</label>
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
            <button class="cas-opbtn" data-op="diff_t" type="button">d/dt</button>
            <button class="cas-opbtn" data-op="int_t" type="button">∫ dt</button>
            <button class="cas-opbtn" data-op="solve_s" type="button">Solve(s)</button>
            <button class="cas-opbtn" data-op="laplace" type="button">Laplace</button>
            <button class="cas-opbtn" data-op="ilaplace" type="button">Inv Laplace</button>
          </div>

          <div class="cas-ophelp" id="casOpHelp">simplify(expr)</div>
        </div>

        <div class="tool-field">
          <label>Result</label>
          <textarea id="casOut" rows="6" readonly></textarea>
        </div>
      </div>

      <div class="tool-actions">
        <button class="btn" id="casRunBtn" type="button">Run</button>
        <button class="btn ghost" id="casResetBtn" type="button">Reset</button>
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
      simplify: 'simplify(expr)',
      factor:   'factor(expr)',
      expand:   'expand(expr)',
      diff_t:   'diff(expr, t)',
      int_t:    'integrate(expr, t)',
      solve_s:  'solve(expr = 0, s)',
      laplace:  'L{f(t)}',
      ilaplace: 'L^{-1}{F(s)}',
    };

    function setOp(op){
      if(opHidden) opHidden.value = op;
      if(opHelp) opHelp.textContent = OP_HELP[op] || op;
      if(opBar){
        opBar.querySelectorAll('.cas-opbtn').forEach(b=>{
          b.classList.toggle('active', b.dataset.op === op);
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
        if(!ok) alert(engine.status);
      };
    }

    const exprEl = $('#casExpr');
    const outEl  = $('#casOut');

    const demo = 's^2 + 2*s + 5';
    if(exprEl && !exprEl.value) exprEl.value = demo;

    const runBtn = $('#casRunBtn');
    if(runBtn){
      runBtn.onclick = async ()=>{
        try{
          setStatus(engine.ready ? 'Ready' : 'Loading…');
          const expr = exprEl ? exprEl.value.trim() : '';
          if(!expr) throw new Error('Expression is empty.');

          const op = (opHidden?.value || 'simplify');
          let res = '';

          if(op === 'simplify') res = await engine.callStr('cas_simplify', expr);
          else if(op === 'factor') res = await engine.callStr('cas_factor', expr);
          else if(op === 'expand') res = await engine.callStr('cas_expand', expr);
          else if(op === 'diff_t') res = await engine.callStr('cas_diff', expr, 't');
          else if(op === 'int_t') res = await engine.callStr('cas_integrate', expr, 't');
          else if(op === 'solve_s'){
            const sol = await engine.call('cas_solve', expr, 's');
            res = sol.length ? sol.join('\n') : '(no solutions)';
          }
          else if(op === 'laplace') res = await engine.callStr('cas_laplace', expr);
          else if(op === 'ilaplace') res = await engine.callStr('cas_ilaplace', expr);
          else res = await engine.callStr('cas_simplify', expr);

          if(outEl) outEl.value = res;
          setStatus(engine.status);
        }catch(e){
          if(outEl) outEl.value = '';
          setStatus(engine.status);
          alert(e.message || String(e));
        }
      };
    }

    const rstBtn = $('#casResetBtn');
    if(rstBtn){
      rstBtn.onclick = ()=>{
        if(exprEl) exprEl.value = demo;
        if(outEl) outEl.value = '';
        setOp('simplify');
      };
    }

    setStatus(engine.status);
  }

  DL.cas = { html, wire };
})();