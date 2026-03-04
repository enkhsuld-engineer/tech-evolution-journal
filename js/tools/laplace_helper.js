/* js/tools/laplace_helper.js
   Teaching Laplace helper (rule-based, step output)
   Exposes: window.DLTOOLS.laplace_helper = { html(ctx), wire(ctx) }
*/
(function(){
  const DL = (window.DLTOOLS = window.DLTOOLS || {});

  function html(ctx){
    const { escapeHtml } = ctx;
    return `
      <div class="tool-title">${escapeHtml('Laplace Helper')}</div>
      <div class="tool-sub">${escapeHtml('Rule-based Laplace transform with step-by-step explanation (teaching mode).')}</div>

      <div class="tool-grid" style="margin-top:12px">
        <div class="tool-field" style="grid-column:1/-1">
          <label>f(t)</label>
          <textarea id="lapHIn" rows="3" spellcheck="false"
            placeholder="Example: 3 + 2*t^2 - 5*exp(2*t) + 4*sin(10*t) - cos(3*t)"></textarea>
        </div>

        <div class="tool-field">
          <label>Parsed</label>
          <textarea id="lapHParsed" rows="3" readonly></textarea>
        </div>

        <div class="tool-field">
          <label>F(s) = L{f(t)}</label>
          <textarea id="lapHOut" rows="3" readonly></textarea>
        </div>

        <div class="tool-field" style="grid-column:1/-1">
          <label>Steps</label>
          <div id="lapHSteps" style="margin-top:6px"></div>
        </div>
      </div>

      <div class="tool-actions">
        <button class="btn" id="lapHCalcBtn">Calculate</button>
        <button class="btn ghost" id="lapHResetBtn">Reset</button>
      </div>

      <div class="tool-help" style="margin-top:10px">
        Supported: c, t^n, exp(a*t), sin(w*t), cos(w*t), +, -, constant*term, parentheses.<br/>
        Use <b>*</b> for multiplication (2*t^2). This helper is intentionally limited to stay reliable.
      </div>
    `;
  }

  function wire(ctx){
    const { $ } = ctx;

    const inp = $('#lapHIn');
    const parsed = $('#lapHParsed');
    const out = $('#lapHOut');
    const stepsEl = $('#lapHSteps');

    const demo = 't';
    if(inp && !inp.value) inp.value = demo;

    const renderSteps = (steps)=>{
      if(!stepsEl) return;
      stepsEl.innerHTML = `
        <div class="card" style="padding:12px">
          <div style="font-weight:900;margin-bottom:8px">How it's calculated</div>
          <ul style="margin:0 0 0 18px;color:var(--muted);line-height:1.6">
            ${steps.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}
          </ul>
        </div>
      `;
    };

    function fail(msg){
      if(parsed) parsed.value = '';
      if(out) out.value = '';
      if(stepsEl) stepsEl.innerHTML = `<div class="card" style="padding:12px;color:var(--muted)">${escapeHtml(msg)}</div>`;
    }

    function calc(silent){
      try{
        const s = inp?.value || '';
        const toks = tok(s);
        const ast = parse(toks);

        if(parsed) parsed.value = simplifyStr(astToString(ast));

        const { Fs, steps } = transform(ast);
        if(out) out.value = Fs;
        renderSteps(steps);
      }catch(e){
        if(!silent) alert(e.message || String(e));
        fail(e.message || String(e));
      }
    }

    $('#lapHCalcBtn').onclick = ()=> calc(false);
    $('#lapHResetBtn').onclick = ()=>{ if(inp) inp.value = demo; calc(true); };
    calc(true);

    // --- tokenizer / parser / transform (same logic as your old helper) ---

    function tok(s){
      const src = String(s||'').trim();
      const out = [];
      let i=0;
      const isDigit = c => (c>='0' && c<='9') || c==='.';
      const isAlpha = c => (c>='a' && c<='z') || (c>='A' && c<='Z') || c==='_';

      while(i<src.length){
        const c = src[i];
        if(/\s/.test(c)){ i++; continue; }

        if(isDigit(c)){
          let j=i+1;
          while(j<src.length && isDigit(src[j])) j++;
          out.push({t:'num', v:Number(src.slice(i,j))});
          i=j; continue;
        }

        if(isAlpha(c)){
          let j=i+1;
          while(j<src.length && (isAlpha(src[j]) || (src[j]>='0' && src[j]<='9'))) j++;
          out.push({t:'id', v:src.slice(i,j)});
          i=j; continue;
        }

        if('()+-*/^,'.includes(c)){
          out.push({t:c, v:c});
          i++; continue;
        }

        throw new Error('Unexpected character: ' + c);
      }
      return out;
    }

    function parse(tokens){
      let pos=0;
      const peek = ()=> tokens[pos];
      const take = ()=> tokens[pos++];

      function parseExpr(){
        let node = parseTerm();
        while(peek() && (peek().t==='+' || peek().t==='-')){
          const op = take().t;
          const rhs = parseTerm();
          node = {k:'bin', op, a:node, b:rhs};
        }
        return node;
      }

      function parseTerm(){
        let node = parseFactor();
        while(peek() && (peek().t==='*' || peek().t==='/')){
          const op = take().t;
          const rhs = parseFactor();
          node = {k:'bin', op, a:node, b:rhs};
        }
        return node;
      }

      function parseFactor(){
        let node = parseUnary();
        if(peek() && peek().t==='^'){
          take();
          const rhs = parseFactor(); // right associative
          node = {k:'bin', op:'^', a:node, b:rhs};
        }
        return node;
      }

      function parseUnary(){
        if(peek() && (peek().t==='+' || peek().t==='-')){
          const op = take().t;
          const x = parseUnary();
          return {k:'un', op, x};
        }
        return parsePrimary();
      }

      function parsePrimary(){
        const tk = peek();
        if(!tk) throw new Error('Unexpected end of input');

        if(tk.t==='num'){ take(); return {k:'num', v:tk.v}; }

        if(tk.t==='id'){
          const name = tk.v;
          take();
          if(name.toLowerCase()==='t') return {k:'t'};

          if(peek() && peek().t==='('){
            take(); // (
            const args = [];
            if(peek() && peek().t!==')'){
              args.push(parseExpr());
              while(peek() && peek().t===','){ take(); args.push(parseExpr()); }
            }
            if(!peek() || peek().t!==')') throw new Error('Missing ) in function call');
            take(); // )
            return {k:'call', name:name.toLowerCase(), args};
          }

          throw new Error('Unknown identifier: ' + name);
        }

        if(tk.t==='('){
          take();
          const node = parseExpr();
          if(!peek() || peek().t!==')') throw new Error('Missing )');
          take();
          return node;
        }

        throw new Error('Unexpected token: ' + tk.t);
      }

      const ast = parseExpr();
      if(pos !== tokens.length) throw new Error('Unexpected extra input near: ' + (tokens[pos]?.v ?? tokens[pos]?.t));
      return ast;
    }

    function astToString(n){
      if(!n) return '';
      if(n.k==='num') return String(n.v);
      if(n.k==='t') return 't';
      if(n.k==='un') return (n.op==='-'?'-':'') + astToString(n.x);
      if(n.k==='call'){
        const a = (n.args||[]).map(astToString).join(', ');
        return `${n.name}(${a})`;
      }
      if(n.k==='bin'){
        return `(${astToString(n.a)} ${n.op} ${astToString(n.b)})`;
      }
      return '';
    }

    function simplifyStr(s){
      return String(s).replace(/\s+/g,' ').trim();
    }

    function transform(node){
      const steps = [];
      steps.push('Linearity: L{f(t)+g(t)} = L{f(t)} + L{g(t)}');
        steps.push('Scaling: L{c\u00B7f(t)} = c\u00B7L{f(t)} (constant c)');

      const isNum = n => n && n.k==='num' && Number.isFinite(n.v);
      const numVal = n => Number(n.v);

      function matchAT(n){
        if(!n) return null;
        if(n.k==='bin' && n.op==='*'){
          if(n.a.k==='t' && isNum(n.b)) return {a:numVal(n.b)};
          if(n.b.k==='t' && isNum(n.a)) return {a:numVal(n.a)};
        }
        return null;
      }
      function matchWT(n){
        const m = matchAT(n);
        return m ? {w:m.a} : null;
      }

      function tf(n){
        if(n.k==='num'){
          const c = numVal(n);
          steps.push(`Constant: ${c} → L{${c}} = ${c}/s`);
          return `${c}/s`;
        }
        if(n.k==='t'){
          steps.push(`t → L{t} = 1/s^2`);
          return `1/s^2`;
        }
        if(n.k==='un'){
          const inner = tf(n.x);
          if(n.op==='-'){
            steps.push(`Unary minus: L{-f(t)} = -L{f(t)}`);
            return `-(${inner})`;
          }
          return inner;
        }
        if(n.k==='bin'){
          if(n.op==='+' || n.op==='-'){
            return `(${tf(n.a)} ${n.op} ${tf(n.b)})`;
          }
          if(n.op==='*'){
            if(isNum(n.a)){
              const c = numVal(n.a);
              const F = tf(n.b);
              steps.push(`Scale: ${c}?f(t) → ${c}?F(s)`);
              return `${c}*(${F})`;
            }
            if(isNum(n.b)){
              const c = numVal(n.b);
              const F = tf(n.a);
              steps.push(`Scale: f(t)?${c} → ${c}?F(s)`);
              return `${c}*(${F})`;
            }
            throw new Error('Only constant * term supported (e.g. 2*sin(3*t)).');
          }
          if(n.op==='^'){
            if(n.a.k==='t' && isNum(n.b)){
              const nn = Math.floor(numVal(n.b));
              if(nn < 0) throw new Error('t^n requires integer n >= 0.');
              steps.push(`Power: t^${nn} → L{t^${nn}} = ${nn}! / s^${nn+1}`);
              return `${nn}!/s^${nn+1}`;
            }
            throw new Error('Only t^n is supported for power.');
          }
          if(n.op==='/'){
            throw new Error('Division in time-domain input is not supported.');
          }
        }
        if(n.k==='call'){
          if(n.name==='exp'){
            const m = matchAT(n.args?.[0]);
            if(!m) throw new Error('exp(...) must look like exp(a*t).');
            steps.push(`exp: e^{${m.a}t} → L{e^{a t}} = 1/(s-a)`);
            return `1/(s-${m.a})`;
          }
          if(n.name==='sin' || n.name==='cos'){
            const m = matchWT(n.args?.[0]);
            if(!m) throw new Error(`${n.name}(...) must look like ${n.name}(w*t).`);
            if(n.name==='sin'){
              steps.push(`sin: sin(${m.w}t) → L{sin(ωt)} = ω/(s^2+ω^2)`);
              return `${m.w}/(s^2+${m.w}^2)`;
            }else{
              steps.push(`cos: cos(${m.w}t) → L{cos(ωt)} = s/(s^2+ω^2)`);
              return `s/(s^2+${m.w}^2)`;
            }
          }
          throw new Error('Unsupported function: ' + n.name);
        }
        throw new Error('Unsupported expression form.');
      }

      return { Fs: tf(node), steps };
    }
  }

  DL.laplace_helper = { html, wire };
})();