/* js/tools/laplace_helper.js
   Teaching Laplace helper (rule-based, step output)
   Exposes: window.DLTOOLS.laplace_helper = { html(ctx), wire(ctx) }
*/
(function(){
  const DL = (window.DLTOOLS = window.DLTOOLS || {});

  function html(ctx){
    const { escapeHtml, t } = ctx;
    return `
      <div class="tool-title">${escapeHtml(t('tools.laplace'))}</div>
      <div class="tool-sub">${escapeHtml(t('tools.laplaceSub'))}</div>

      <div class="tool-grid" style="margin-top:12px">
        <div class="tool-field" style="grid-column:1/-1">
          <label for="lapHIn">f(t)</label>
          <textarea id="lapHIn" rows="3" spellcheck="false"
            placeholder="Example: 3 + 2*t^2 - 5*exp(2*t) + 4*sin(10*t) - cos(3*t)"></textarea>
        </div>

        <div class="tool-field">
          <label>${escapeHtml(t('tools.parsed'))}</label>
          <div id="lapHParsedMath" class="tool-result" aria-live="polite"></div>
          <details class="tool-raw">
            <summary>${escapeHtml(t('tools.plainText'))}</summary>
            <textarea id="lapHParsed" rows="3" readonly aria-label="${escapeHtml(t('tools.parsed'))}"></textarea>
          </details>
        </div>

        <div class="tool-field">
          <label>${escapeHtml(t('tools.result'))}</label>
          <div id="lapHResult" class="tool-result" aria-live="polite"></div>
          <details class="tool-raw">
            <summary>${escapeHtml(t('tools.plainText'))}</summary>
            <textarea id="lapHOut" rows="3" readonly aria-label="${escapeHtml(t('tools.result'))}"></textarea>
          </details>
        </div>

        <div class="tool-field" style="grid-column:1/-1">
          <label>${escapeHtml(t('tools.steps'))}</label>
          <div id="lapHSteps" style="margin-top:6px"></div>
        </div>
      </div>

      <div class="tool-actions">
        <button class="btn" id="lapHCalcBtn">${escapeHtml(t('tools.compute'))}</button>
        <button class="btn ghost" id="lapHResetBtn">${escapeHtml(t('tools.reset'))}</button>
      </div>

      <div class="tool-help">${escapeHtml(t('tools.laplaceSyntax'))}</div>
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
      ctx.clearMath(stepsEl);
      stepsEl.innerHTML = `
        <ol class="tool-steps">${steps.map(x=>`<li>${ctx.mathHtml(x)}</li>`).join('')}</ol>
      `;
      ctx.typesetMath(stepsEl);
    };

    function fail(error){
      if(parsed) parsed.value = '';
      if(out) out.value = '';
      ctx.setMath($('#lapHParsedMath'), '');
      ctx.showError($('#lapHResult'), error);
      ctx.clearMath(stepsEl);
      stepsEl.innerHTML = '';
    }

    function calc(silent){
      try{
        const s = inp?.value || '';
        const toks = tok(s);
        const ast = parse(toks);

        if(parsed) parsed.value = simplifyStr(astToString(ast));

        const { Fs, tex, steps } = transform(ast);
        if(out) out.value = Fs;
        ctx.setMath($('#lapHParsedMath'), `f(t)=${astToTex(ast)}`);
        ctx.setMath($('#lapHResult'), `F(s)=\\mathcal{L}\\{f(t)\\}=${tex}`);
        renderSteps(steps);
      }catch(e){
        fail(e);
      }
    }

    $('#lapHCalcBtn').onclick = ()=> calc(false);
    $('#lapHResetBtn').onclick = ()=>{ if(inp) inp.value = demo; calc(true); };
    calc(true);

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
          const value = Number(src.slice(i,j));
          if(!Number.isFinite(value)) throw new Error('Invalid number: ' + src.slice(i,j));
          out.push({t:'num', v:value});
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

    function astToTex(n){
      if(n.k === 'num') return ctx.numberTex(n.v);
      if(n.k === 't') return 't';
      if(n.k === 'un') return `${n.op}\\left(${astToTex(n.x)}\\right)`;
      if(n.k === 'call'){
        const args = n.args.map(astToTex).join(',');
        return n.name === 'exp' ? `e^{${args}}` : `\\${n.name}\\left(${args}\\right)`;
      }
      const a = astToTex(n.a), b = astToTex(n.b);
      if(n.op === '/') return `\\frac{${a}}{${b}}`;
      if(n.op === '^') return `{${a}}^{${b}}`;
      return `\\left(${a}${n.op === '*' ? '\\cdot ' : n.op}${b}\\right)`;
    }

    function transform(node){
      const steps = [];
      steps.push(String.raw`\mathcal{L}\{f(t)+g(t)\}=\mathcal{L}\{f(t)\}+\mathcal{L}\{g(t)\}`);
      steps.push(String.raw`\mathcal{L}\{c\,f(t)\}=c\,\mathcal{L}\{f(t)\}`);

      const numVal = n => n?.k === 'num' ? n.v : n?.k === 'un' ? (n.op === '-' ? -1 : 1) * numVal(n.x) : NaN;
      const isNum = n => Number.isFinite(numVal(n));
      const result = (text, tex) => ({ text, tex });

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
          const tex = `\\frac{${ctx.numberTex(c)}}{s}`;
          steps.push(`\\mathcal{L}\\{${ctx.numberTex(c)}\\}=${tex}`);
          return result(`${c}/s`, tex);
        }
        if(n.k==='t'){
          steps.push(String.raw`\mathcal{L}\{t\}=\frac{1}{s^2}`);
          return result('1/s^2', String.raw`\frac{1}{s^2}`);
        }
        if(n.k==='un'){
          const inner = tf(n.x);
          if(n.op==='-'){
            steps.push(String.raw`\mathcal{L}\{-f(t)\}=-\mathcal{L}\{f(t)\}`);
            return result(`-(${inner.text})`, `-\\left(${inner.tex}\\right)`);
          }
          return inner;
        }
        if(n.k==='bin'){
          if(n.op==='+' || n.op==='-'){
            const a = tf(n.a), b = tf(n.b);
            return result(`(${a.text} ${n.op} ${b.text})`, `\\left(${a.tex}${n.op}${b.tex}\\right)`);
          }
          if(n.op==='*'){
            if(isNum(n.a)){
              const c = numVal(n.a);
              const F = tf(n.b);
              steps.push(`\\mathcal{L}\\{${astToTex(n)}\\}=${ctx.numberTex(c)}\\left(${F.tex}\\right)`);
              return result(`${c}*(${F.text})`, `${ctx.numberTex(c)}\\left(${F.tex}\\right)`);
            }
            if(isNum(n.b)){
              const c = numVal(n.b);
              const F = tf(n.a);
              steps.push(`\\mathcal{L}\\{${astToTex(n)}\\}=${ctx.numberTex(c)}\\left(${F.tex}\\right)`);
              return result(`${c}*(${F.text})`, `${ctx.numberTex(c)}\\left(${F.tex}\\right)`);
            }
            throw new Error('Only constant * term supported (e.g. 2*sin(3*t)).');
          }
          if(n.op==='^'){
            if(n.a.k==='t' && isNum(n.b)){
              const nn = numVal(n.b);
              if(!Number.isSafeInteger(nn) || nn < 0) throw new Error('t^n requires a nonnegative integer n.');
              const tex = `\\frac{${nn}!}{s^{${nn+1}}}`;
              steps.push(`\\mathcal{L}\\{t^{${nn}}\\}=${tex}`);
              return result(`${nn}!/s^${nn+1}`, tex);
            }
            throw new Error('Only t^n is supported for power.');
          }
          if(n.op==='/'){
            throw new Error('Division in time-domain input is not supported.');
          }
        }
        if(n.k==='call'){
          if(n.args.length !== 1) throw new Error('Functions require exactly one argument.');
          if(n.name==='exp'){
            const m = matchAT(n.args?.[0]);
            if(!m) throw new Error('exp(...) must look like exp(a*t).');
            const tex = `\\frac{1}{s${m.a < 0 ? '+' : '-'}${ctx.numberTex(Math.abs(m.a))}}`;
            steps.push(`\\mathcal{L}\\{e^{${ctx.numberTex(m.a)}t}\\}=${tex}`);
            return result(`1/(s-(${m.a}))`, tex);
          }
          if(n.name==='sin' || n.name==='cos'){
            const m = matchWT(n.args?.[0]);
            if(!m) throw new Error(`${n.name}(...) must look like ${n.name}(w*t).`);
            if(n.name==='sin'){
              const tex = `\\frac{${ctx.numberTex(m.w)}}{s^2+(${ctx.numberTex(m.w)})^2}`;
              steps.push(`\\mathcal{L}\\{\\sin(${ctx.numberTex(m.w)}t)\\}=${tex}`);
              return result(`${m.w}/(s^2+(${m.w})^2)`, tex);
            }else{
              const tex = `\\frac{s}{s^2+(${ctx.numberTex(m.w)})^2}`;
              steps.push(`\\mathcal{L}\\{\\cos(${ctx.numberTex(m.w)}t)\\}=${tex}`);
              return result(`s/(s^2+(${m.w})^2)`, tex);
            }
          }
          throw new Error('Unsupported function: ' + n.name);
        }
        throw new Error('Unsupported expression form.');
      }

      const transformed = tf(node);
      return { Fs: transformed.text, tex: transformed.tex, steps };
    }
  }

  DL.laplace_helper = { html, wire };
})();