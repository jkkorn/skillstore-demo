/* atos-b.js · atos 4 a 8 (Builder B): Buracos, A pergunta, Vira skill, Guardrails, O que vem depois.
 * Lê e escreve SK.estado (respostas, buracoResolvido, regraAprovada, skillEm, guardrails, departamentos) e o campo próprio SK.estado.b:
 * departamentos: o mesmo campo do Builder C ([{ id, nome, pessoas, membros, novo }]); os criados aqui entram na tabela de acessos e no mapa.
 *   b.limite (número, R$), b.regra [3 linhas], b.animarSkill (bool), b.canal (último canal aberto), b.verComo ('voce'|'engenharia').
 * Texto de quem usa entra sempre como nó de texto.
 */
(function () {
  const SK = window.SK, D = SK.dados, el = SK.el, ic = SK.icone;
  const E = () => SK.estado;
  const B = () => (E().b = E().b || {});
  let observadores = [];
  const observar = (alvo, fn) => { const o = new ResizeObserver(() => fn()); o.observe(alvo); observadores.push(o); };
  const soltar = () => { observadores.forEach((o) => o.disconnect()); observadores = []; };
  const btn = (classe, rotulo, aoClicar, ...extra) => el("button", { class: "btn " + classe, type: "button", on: { click: aoClicar } }, ...extra, rotulo);
  const rolarPara = (alvo) => { if (!alvo) return; const r = alvo.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight) alvo.scrollIntoView({ behavior: SK.reduzido() ? "auto" : "smooth", block: "nearest" }); };

  /* esqueleto na primeira vez que o conteúdo principal de uma tela aparece (ajudante do Builder A) */
  function carga(holder, conteudo, forma, chave, depois) {
    const b = B(); b.carregou = b.carregou || {};
    const pronto = (h) => { h.append(conteudo); if (SK.escalonar) SK.escalonar(conteudo.children ? conteudo : [conteudo], 55); if (depois) depois(); };
    if (typeof SK.carregar === "function" && !b.carregou[chave] && !SK.reduzido()) { b.carregou[chave] = true; SK.salvar(); SK.carregar(holder, 380, pronto, forma); }
    else { holder.append(conteudo); if (depois) depois(); }
  }
  /* número que corre e SEMPRE termina no valor exato (movimento reduzido, aba em segundo plano, saída do ato) */
  function contarExato(alvo, ate, fmt, ms) {
    const fim = () => { alvo.textContent = fmt(ate); };
    if (SK.reduzido() || document.hidden) { fim(); return; }
    const t0 = performance.now();
    const passo = (t) => { if (document.hidden) { fim(); return; } const p = Math.min(1, (t - t0) / ms), k = 1 - Math.pow(1 - p, 3); alvo.textContent = p >= 1 ? fmt(ate) : fmt(ate * k); if (p < 1) SK.quadro(passo); };
    SK.quadro(passo);
    setTimeout(fim, ms + 120);
  }
  /* ---------- regra a partir das respostas ---------- */
  const rs = (v) => "R$ " + SK.fmt(v);

  /* ---------- o gráfico de buracos (frequência x intensidade) ---------- */
  /* buraco 10 (Y6c): enquanto não estiver em dados.js, entra aqui; contagens seguem D.buracos.length */
  if (!D.buracos.some((x) => x.id === "perguntas-repetidas")) {
    D.buracos.push({ id: "perguntas-repetidas", titulo: "The same questions reach you every week", porMes: 14, frequencia: "14 a month", intensidade: 0.5, processo: "antecipacao",
      dor: "14 questions a month; 11 have an answer in the spreadsheet. Each one interrupts you.", numeros: { perguntas: 14, naPlanilha: 11 },
      proposta: "Let the brain answer what is already in the spreadsheet, with the source beside it." });
  }
  if (D.final) D.final.buracos = D.buracos.length;
  const CURTO = { "perguntas-repetidas": "Repeated questions", antecipacao: "Advance", "primeira-resposta": "1-hour reply", "troca-conta": "Account change", "repasse-retido": "Held payout", conciliacao: "Manual reconciliation", "taxa-especial": "Special rate", chargeback: "Chargeback deadline", incidente: "Incident notice", admissao: "Access on hire" };
  const INT_RESOLVIDA = 0.2;
  const CURTO_M = { "perguntas-repetidas": "Questions", antecipacao: "Advance", "primeira-resposta": "1h reply", "troca-conta": "Account change", "repasse-retido": "Held payout", conciliacao: "Reconciliation", "taxa-especial": "Special rate", chargeback: "Chargeback", incidente: "Incident", admissao: "Hire" };
  const CUSTO = { "perguntas-repetidas": "14 interruptions a month", antecipacao: "1.8 days and R$ 1.2M stuck", "primeira-resposta": "55 merchants a month wait 2 h 26 min", "troca-conta": "7 merchants a month with no approval", "repasse-retido": "9 merchants a month, 3 sets of criteria", conciliacao: "50 minutes a day", "taxa-especial": "3 days of waiting", chargeback: "4 disputes lost in October", incidente: "2 notices a month, from scratch", admissao: "2 days without access" };
  const lx = (v) => 7 + 86 * (Math.log(v / 1.5) / Math.log(70 / 1.5));
  const ly = (i) => 8 + 82 * (1 - i);

  function grafico({ compacto = false, aoSelecionar, aoPairar, resolvido = false, fechado = false, foco = false } = {}) {
    const so1 = compacto || foco;
    const raiz = el("div", { class: "bg" + (compacto ? " bg-compacto" : "") });
    const area = el("div", { class: "bg-area" });
    const linhas = el("div", { class: "bg-grade", "aria-hidden": "true" });
    [2, 5, 10, 25, 50].forEach((v) => linhas.append(el("span", { class: "bg-tick", style: { left: lx(v) + "%" } }, el("span", { class: "bg-tick-n num" }, String(v)))));
    const yAlto = el("span", { class: "bg-y bg-y-alto", "aria-hidden": "true" }, "Hurts most");
    const yBaixo = el("span", { class: "bg-y bg-y-baixo", "aria-hidden": "true" }, "Hurts least");
    const svg = el("svg", { class: "bg-traco", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" });
    const traco = el("line", { x1: lx(23), x2: lx(23), y1: ly(0.92), y2: ly(0.92), "vector-effect": "non-scaling-stroke", pathLength: "1" });
    svg.append(traco);
    const fantasma = el("span", { class: "bg-fantasma", "aria-hidden": "true", style: { left: lx(23) + "%", top: ly(0.92) + "%" } });
    const rotAntes = el("span", { class: "bg-antes", "aria-hidden": "true", style: { left: lx(23) + "%", top: ly(0.92) + "%" } });
    const trilha = el("span", { class: "bg-trilha", "aria-hidden": "true", style: { left: lx(23) + "%", top: ly(0.92) + "%", height: "0%" } });
    area.append(linhas, svg, trilha, fantasma, rotAntes, yAlto, yBaixo);
    const marcas = new Map(), rotulos = new Map();
    D.buracos.forEach((b, i) => {
      const m = el("button", { class: "bg-marca " + (b.intensidade >= 0.75 ? "forte" : b.intensidade >= 0.5 ? "medio" : "baixo"), type: "button", "data-id": b.id, style: { left: lx(b.porMes) + "%", top: ly(b.intensidade) + "%", "--i": String(b.intensidade) }, "aria-label": (i + 1) + ". " + b.titulo + ". " + b.frequencia + "." },
        el("span", { class: "num" }, String(i + 1)));
      if (aoSelecionar) m.addEventListener("click", () => aoSelecionar(b.id));
      if (aoPairar) { m.addEventListener("mouseenter", () => aoPairar(b.id)); m.addEventListener("mouseleave", () => aoPairar(null)); }
      if (!aoSelecionar) { m.tabIndex = -1; m.setAttribute("aria-hidden", "true"); }
      const r = el("span", { class: "bg-rot", "aria-hidden": "true", hidden: so1 && b.id !== "antecipacao" ? true : null }, CURTO[b.id] || b.titulo);
      if (so1 && b.id !== "antecipacao") m.classList.add("apagada");
      marcas.set(b.id, m); rotulos.set(b.id, r);
      area.append(m, r);
    });
    const eixo = el("div", { class: "bg-x", "aria-hidden": "true" }, el("span", {}, "Happens rarely"), el("span", { class: "bg-x-meio" }, " times a month"), el("span", {}, "Happens often", ic("seta", "ico-sm")));
    raiz.append(area, eixo);

    let sel = null;
    function posicionar() {
      const W = area.clientWidth, H = area.clientHeight;
      if (!W || !H) return;
      const R = compacto ? 13 : 16;
      const estreito = W < 480;
      rotulos.forEach((r, id) => { if (r.dataset.fixo) { r.textContent = estreito && r.dataset.curto ? r.dataset.curto : r.dataset.fixo; return; } r.textContent = (estreito ? CURTO_M : CURTO)[id] || id; });
      const caixas = [];
      const bater = (a, semMargem) => a.x < 0 || a.y < 0 || a.x + a.w > W || a.y + a.h > H - (semMargem ? 0 : 16) || caixas.some((c) => a.x < c.x + c.w && a.x + a.w > c.x && a.y < c.y + c.h && a.y + a.h > c.y);
      [yAlto, yBaixo].concat(raiz.classList.contains("bg-com-antes") ? [rotAntes] : []).forEach((y) => caixas.push({ x: y.offsetLeft - 4, y: y.offsetTop - 2, w: y.offsetWidth + 8, h: y.offsetHeight + 4 }));
      const centro = (m) => ({ cx: (parseFloat(m.style.left) / 100) * W, cy: (parseFloat(m.style.top) / 100) * H });
      marcas.forEach((m) => { const { cx, cy } = centro(m); caixas.push({ x: cx - R - 2, y: cy - R - 2, w: 2 * R + 4, h: 2 * R + 4 }); });
      const ordem = D.buracos.map((b) => b.id).sort((a, b) => (a === sel ? -1 : b === sel ? 1 : 0));
      for (const id of ordem) {
        const r = rotulos.get(id), m = marcas.get(id);
        if (r.hidden) continue;
        r.style.visibility = "hidden"; r.style.left = "0px"; r.style.top = "0px";
        const tentar = () => {
          const w = r.offsetWidth, h = r.offsetHeight, { cx, cy } = centro(m), g = 6;
          const cands = [{ x: cx + R + g, y: cy - h / 2 }, { x: cx - R - g - w, y: cy - h / 2 }, { x: cx - w / 2, y: cy - R - g - h }, { x: cx - w / 2, y: cy + R + g }, { x: cx + R - 2, y: cy - R - h }, { x: cx - R - w + 2, y: cy - R - h }, { x: cx + R - 2, y: cy + R }, { x: cx - R - w + 2, y: cy + R }];
          return cands.map((c) => ({ x: c.x, y: c.y, w, h })).find((c) => !bater(c)) || (r.dataset.fixo ? cands.map((c) => ({ x: c.x, y: c.y, w, h })).find((c) => !bater(c, true)) : null);
        };
        let ok = tentar();
        if (!ok && !r.dataset.fixo && CURTO_M[id] && r.textContent !== CURTO_M[id]) { r.textContent = CURTO_M[id]; ok = tentar(); }
        if (ok) { r.style.left = ok.x + "px"; r.style.top = ok.y + "px"; r.style.visibility = "visible"; caixas.push(ok); }
      }
    }
    function selecionar(id) {
      sel = id;
      marcas.forEach((m, k) => m.setAttribute("aria-pressed", k === id ? "true" : "false"));
      rotulos.forEach((r, k) => r.classList.toggle("sel", k === id));
      posicionar();
    }
    function pairar(id) { marcas.forEach((m, k) => m.classList.toggle("pairada", k === id)); rotulos.forEach((r, k) => r.classList.toggle("pairada", k === id)); }
    function resolver(animado) {
      const m = marcas.get("antecipacao"), r = rotulos.get("antecipacao");
      raiz.classList.toggle("bg-animando", !!animado && !SK.reduzido());
      m.classList.add("resolvida"); m.classList.remove("forte", "medio", "baixo");
      const alvoI = fechado ? 0.06 : INT_RESOLVIDA;
      m.style.top = ly(alvoI) + "%"; m.style.setProperty("--i", String(alvoI));
      r.textContent = fechado ? "Advance\nclosed this week" : "Advance · 2 hours";
      r.dataset.fixo = r.textContent; if (fechado) { r.classList.add("bg-rot-fechado"); r.dataset.curto = "Closed\nthis week"; }
      if (fechado) { m.classList.add("fechada"); raiz.classList.add("bg-fechado"); }
      traco.setAttribute("y2", String(ly(alvoI) - 4)); trilha.style.height = (ly(alvoI) - ly(0.92)) + "%";
      raiz.classList.add("bg-resolvido", "bg-trilha-on");
      m.setAttribute("aria-label", "1. " + D.buracos[0].titulo + (fechado ? ". Closed this week: wait went from 1.8 days to 2 hours." : ". Resolved: wait went from 1.8 days to 2 hours."));
      posicionar();
    }
    function mover(i, rotulo, animado, antes) {
      const m = marcas.get("antecipacao"), r = rotulos.get("antecipacao");
      if (i >= 0.9) {
        raiz.classList.remove("bg-resolvido", "bg-trilha-on", "bg-com-antes", "bg-animando");
        m.classList.remove("resolvida"); m.classList.add("forte"); m.style.top = ly(0.92) + "%";
        delete r.dataset.fixo; traco.setAttribute("y2", String(ly(0.92))); posicionar(); return;
      }
      raiz.classList.toggle("bg-animando", !!animado && !SK.reduzido());
      raiz.classList.remove("bg-trilha-on"); void raiz.offsetWidth;
      m.classList.add("resolvida"); m.classList.remove("forte", "medio", "baixo");
      m.style.top = ly(i) + "%";
      traco.setAttribute("y2", String(ly(i) - 3)); trilha.style.height = (ly(i) - ly(0.92)) + "%";
      raiz.classList.add("bg-resolvido", "bg-trilha-on");
      if (antes) { rotAntes.textContent = antes; raiz.classList.add("bg-com-antes"); }
      r.textContent = rotulo || "Advance"; r.dataset.fixo = r.textContent;
      m.setAttribute("aria-label", "1. " + D.buracos[0].titulo + ". " + (rotulo || ""));
      posicionar();
    }
    observar(area, posicionar);
    if (resolvido) resolver(false);
    requestAnimationFrame(posicionar);
    return { el: raiz, selecionar, pairar, resolver, posicionar, mover };
  }

  /* ---------- o modelo da regra (um só estado para os atos 5, 6, Slack e Claude) ---------- */
  const PEDIDOS = [1200, 1800, 2100, 2500, 2900, 3100, 3400, 3900, 4200, 4500, 4800, 7000, 9500, 12000, 18000, 22000, 31000, 38000, 46000, 62000, 140000, 310000, 480000];
  const DOUGLAS = () => (D.porId && D.porId("douglas")) || { nome: "Douglas Nery", primeiro: "Douglas", iniciais: "DN", cargo: "Finance Director" };
  const REGRA_COMPLETA = { auto: 5000, tes: 50000, slack: true, exc: true, quem: true };
  const R = () => { const b = B(); b.r = b.r || { auto: null, tes: null, slack: false, exc: false, quem: false }; return b.r; };
  const mudou = (r) => !!(r.auto || r.tes || r.slack || r.exc);
  const destino = (v, r) => (r.auto && v < r.auto ? "auto" : r.tes && v <= r.tes ? "tes" : r.slack ? "slack" : "email");
  const conta = (f) => PEDIDOS.filter(f).length;
  const soma = (f) => PEDIDOS.filter(f).reduce((s, v) => s + v, 0);
  const mi = (v) => (v >= 950000 ? "R$ " + (v / 1e6).toFixed(1) + "M" : "R$ " + SK.fmt(Math.round(v / 1000)) + "k");
  function faixas(r) {
    const out = []; let lo = 0;
    if (r.auto) { out.push({ tipo: "auto", txt: "Below " + rs(r.auto) + ": automatic approval", n: conta((v) => v < r.auto) }); lo = r.auto; }
    if (r.tes) { out.push({ tipo: "tes", txt: (lo ? "From " + rs(lo) + " to " + rs(r.tes) : "Up to " + rs(r.tes)) + ": Treasury approves", n: conta((v) => destino(v, r) === "tes") }); lo = r.tes; }
    const resto = conta((v) => destino(v, r) === "slack" || destino(v, r) === "email");
    out.push({ tipo: r.slack ? "slack" : "email", txt: (lo ? "Above " + rs(lo) : "All requests") + (r.slack ? ": go to #antecipacoes, Marina or " + DOUGLAS().primeiro + " approve" : ": Marina approves, by email"), n: resto });
    if (r.exc) out.push({ tipo: "exc", txt: "Chargeback in the last 90 days: always Marina, whatever the amount", n: null });
    return out;
  }
  function efeito(r) {
    const espera = PEDIDOS.map((v) => ({ auto: 0, tes: 2, slack: 2, email: 43 })[destino(v, r)]).sort((a, b) => a - b)[11];
    const fora = (v) => destino(v, r) !== "email";
    return {
      espera, esperaTxt: espera === 0 ? "instantly" : espera === 2 ? "2 hours" : "1.8 days", esperaCurta: espera === 0 ? "0 h" : espera === 2 ? "2 h" : "1.8 days",
      intensidade: espera === 0 ? 0.12 : espera === 2 ? 0.2 : 0.92,
      parados: soma((v) => !fora(v)), liberados: soma(fora), horas: Math.round((conta(fora) * 80) / 60), saem: conta(fora),
    };
  }
  function decidir(v, chargeback) {
    const r = R(), d = destino(v, r);
    if (chargeback && r.exc) return { txt: "Not this one. Loja Ventana had a chargeback on 8 November. Under the rule, it goes through Marina, whatever the amount.", chamar: true };
    if (d === "auto") return { txt: "You can go ahead: below " + rs(r.auto) + ", approval is automatic." + (chargeback ? " Heads up: the store had a recent chargeback." : "") };
    if (d === "tes") return { txt: "Yes. " + (r.auto ? "From " + rs(r.auto) + " to " + rs(r.tes) : "Up to " + rs(r.tes)) + ", Treasury approves." + (chargeback ? " The store had a recent chargeback, but the rule doesn’t say anything about that yet." : " I checked: no chargeback in the last 90 days.") };
    if (d === "slack") return { txt: B().guarda && B().guarda.escreve === false ? "This goes to #antecipacoes, but I can’t write there: ask Marina or " + DOUGLAS().primeiro + "." : "I sent it to #antecipacoes. Marina or " + DOUGLAS().primeiro + " give the ok there.", canal: true };
    return { txt: "This goes through Marina, by email.", chamar: true };
  }
  /* o que uma sugestão faria, calculado com a mesma regra */
  function impactoSugestao(o, r, b) {
    const n = semAcento(o), simula = (mud) => { const r2 = Object.assign({}, r, mud); return r2; };
    const saiDoEmail = (r2) => conta((v) => destino(v, r) === "email" && destino(v, r2) !== "email");
    if (/^how many/.test(n)) return "only asks, does not change the rule";
    if (/automat/.test(n)) { const v = b.ultimo || 5000; return conta((x) => x < v) + " requests a month go out instantly"; }
    if (/treasury/.test(n)) { const r2 = simula({ tes: 50000 }); return conta((v) => destino(v, r2) === "tes") + " a month without going through you"; }
    if (/slack|channel|#/.test(n)) { const k = saiDoEmail(simula({ slack: true })); return k + " a month outside your email"; }
    if (/chargeback/.test(n)) return "keeps the risk: a merchant with a chargeback always comes to you";
    if (/particip|involv|takes part/.test(n)) return "shows who does each part, before and after";
    return "";
  }
  const EFEITO = {
    "primeira-resposta": "The public promise holds again in 55 of 60 conversations a month.",
    "troca-conta": "7 account changes a month get someone to check the account holder.",
    "repasse-retido": "9 held payouts a month get the same answer, whoever picks them up.",
    conciliacao: "About 18 hours a month back (50 minutes on 22 mornings); only checking the differences is left.",
    "taxa-especial": "6 proposals a month stop waiting 3 days for an answer.",
    chargeback: "No dispute lost to a deadline (there were 4 in October).",
    incidente: "The merchant notice goes out ready in the middle of the crisis, with no writing from scratch.",
    admissao: "A new person works on day one, without waiting 2 days for access.",
    "perguntas-repetidas": "11 of 14 questions a month answered on the spot, with the source; you only see the other 3.",
  };
  function efeitoBuraco(id) {
    if (id === "antecipacao") { const ef = efeito(REGRA_COMPLETA); return ef.saem + " requests a month stop waiting 1.8 days; " + mi(ef.liberados) + " a month without waiting for approval."; }
    return EFEITO[id] || "";
  }
  function padraoPergunta(e) {
    e.b = e.b || {};
    if (!e.b.r || !mudou(e.b.r)) e.b.r = Object.assign({}, REGRA_COMPLETA);
    e.respostas = e.respostas && e.respostas.pergunta ? e.respostas : { pergunta: D.pergunta.resposta, aprofunda: D.pergunta.resposta2 };
    e.buracoResolvido = true;
  }
  const semAcento = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  function valores(t) {
    const n = semAcento(t).replace(/(\d),(\d{3})(?!\d)/g, "$1$2").replace(/(\d),(\d{3})(?!\d)/g, "$1$2"), out = [];
    const re = /(r\$\s*)?(\d+(?:\.\d+)?)\s*(thousand|k|mil)?\b/g; let m;
    while ((m = re.exec(n))) { if (!m[1] && !m[3]) continue; let v = parseFloat(m[2]); if (m[3]) v *= 1000; out.push(Math.round(v)); }
    return out;
  }

  /* =================================================================== 4 · BURACOS */
  SK.ato({
    id: 4, titulo: "Gaps", nav: "Gaps",
    montar(sec) {
      const e = E(), resolvido = !!e.buracoResolvido, fechado = resolvido && !!e.regraAprovada;
      const raiz = el("div", { class: "ato-papel b-largo b4" });
      const cab = el("div", { class: "ato-cabeca b-cabeca" },
        el("div", { class: "pilha", style: { "--gap": "10px" } },
          el("h1", { class: "t-titulo" }, D.buracos.length + " gaps in Lume’s processes"),
          el("p", { class: "t-sub texto-2" }, fechado ? "One closed this week, with an answer from you. The others wait their turn." : resolvido ? "You resolved one of them today. The rule still needs approval." : "Where work stops and waits. Further right, it happens more. Higher, it hurts more.")));
      raiz.append(cab);

      if (B().sel4) { this._sel = B().sel4; B().sel4 = null; SK.salvar(); }
      let selId = this._sel && D.buracos.some((b) => b.id === this._sel) ? this._sel : "antecipacao";
      const detalhe = el("div", { class: "cartao b4-detalhe", "aria-live": "polite" });
      const g = grafico({ aoSelecionar: (id) => selecionar(id, true), aoPairar: (id) => { g.pairar(id); linhas.forEach((l, k) => l.classList.toggle("pairada", k === id)); }, resolvido, fechado });
      const plot = el("div", { class: "cartao b4-plot" }, el("h2", { class: "b-h2" }, "Frequency and intensity"), g.el);
      const grade = el("div", { class: "b4-grade" }, plot, detalhe);

      const lista = el("ol", { class: "lista b4-lista", "aria-label": "Gaps from largest to smallest" });
      const linhas = new Map();
      D.buracos.forEach((b, i) => {
        const res = resolvido && b.id === "antecipacao";
        const nivel = res ? (fechado ? "Closed this week" : "Resolved today") : CUSTO[b.id];
        const l = el("button", { class: "linha linha-botao b4-linha", type: "button", on: { click: () => selecionar(b.id, true), mouseenter: () => g.pairar(b.id), mouseleave: () => g.pairar(null) } },
          el("span", { class: "b4-n num " + (res ? "resolvida" : b.intensidade >= 0.75 ? "forte" : b.intensidade >= 0.5 ? "medio" : "baixo") }, String(i + 1)),
          el("span", { class: "linha-principal" }, el("span", { class: "forte" }, b.titulo), el("span", { class: "t-pequeno texto-2" }, res ? "The wait fell from 1.8 days to 2 hours. R$ 1.2 million a month stopped waiting." : b.dor)),
          el("span", { class: "linha-meta" }, el("span", { class: "b4-freq num" }, b.frequencia), el("span", { class: "chip b4-custo " + (res ? "chip-ok" : b.intensidade >= 0.5 ? "chip-brasa" : "") }, nivel)));
        linhas.set(b.id, l);
        lista.append(el("li", {}, l));
      });
      const blocoLista = el("section", { class: "b4-ranking", "aria-label": "List" }, el("h2", { class: "b-h2" }, "Largest to smallest"), el("div", { class: "cartao b-cartao-lista" }, lista));
      const holder4 = el("div", { class: "b-carga" });
      raiz.append(holder4);
      carga(holder4, el("div", { class: "b-carga-in" }, grade, blocoLista), "cartoes", "a4");
      sec.append(raiz);

      const self = this;
      function selecionar(id, doUsuario) {
        selId = id; self._sel = id;
        g.selecionar(id);
        linhas.forEach((l, k) => l.setAttribute("aria-current", k === id ? "true" : "false"));
        desenharDetalhe(id, doUsuario);
      }
      function desenharDetalhe(id, anim) {
        const i = D.buracos.findIndex((b) => b.id === id), b = D.buracos[i], res = resolvido && id === "antecipacao";
        const proc = D.processos.find((p) => p.id === b.processo);
        detalhe.replaceChildren();
        const corpo = el("div", { class: "pilha b4-detalhe-corpo" + (anim ? " entra" : ""), style: { "--gap": "16px" } });
        corpo.append(el("div", { class: "fila", style: { "--gap": "8px" } },
          el("span", { class: "chip" }, i === 0 ? "The biggest gap" : (i + 1) + " of " + D.buracos.length),
          proc ? el("span", { class: "chip" }, ic("processo", "ico-sm"), proc.nome) : null,
          res ? el("span", { class: "chip chip-ok" }, ic("check", "ico-sm"), fechado ? "Closed this week" : "Resolved today") : null));
        corpo.append(el("h2", { class: "b4-titulo" }, b.titulo));
        if (b.sobreVoce) corpo.append(el("div", { class: "b4-elogio" }, el("span", { class: "avatar avatar-sm" }, D.usuaria.iniciais),
          el("p", {}, el("span", { class: "forte" }, b.elogio + " "), el("span", { class: "texto-2" }, "The rule was just never written, so everything goes up to you."))));
        const nums = el("div", { class: "b4-numeros" });
        const N = (v, r, brasa) => el("div", { class: "numero" + (brasa ? " numero-brasa" : "") }, el("span", { class: "numero-valor num" }, v), el("span", { class: "numero-rotulo" }, r));
        if (b.id === "antecipacao") {
          nums.append(N("23", "requests a month"));
          if (res) nums.append(el("div", { class: "numero" }, el("span", { class: "numero-valor num b-antes-depois" }, el("s", { class: "b-antes" }, "1.8 days"), el("span", {}, "2 h")), el("span", { class: "numero-rotulo" }, "wait, median")));
          else nums.append(N("1.8 days", "stuck, median", true));
          if (res) nums.append(el("div", { class: "numero b-mudou" }, el("span", { class: "numero-valor num" }, "R$ 1.2M"), el("span", { class: "numero-rotulo" }, "a month stopped waiting for approval")));
          else nums.append(N("R$ 1.2M", "in requests waiting each month", true));
        } else {
          nums.append(N(String(b.porMes), b.id === "primeira-resposta" ? "of 60 conversations a month" : " times a month"));
        }
        corpo.append(nums);
        if (b.id !== "antecipacao") corpo.append(el("p", { class: "b4-dor" }, el("span", { class: "b4-dor-ponto", "aria-hidden": "true" }), b.dor));
        corpo.append(el("div", { class: "b4-proposta" }, el("span", { class: "t-micro texto-2 forte" }, "How to improve"), el("p", {}, b.proposta), el("p", { class: "b4-efeito t-pequeno" }, ic("relampago", "ico-sm"), el("span", {}, "Expected effect: " + efeitoBuraco(b.id)))));
        const acoes = el("div", { class: "fila b4-acoes" });
        if (b.id === "antecipacao") {
          if (!res) acoes.append(btn("btn-primario", "Improve with one question", () => SK.ir(5)), el("span", { class: "t-pequeno texto-2" }, "One question, one answer from you."));
          else acoes.append(btn("btn-primario", e.regraAprovada ? "See the skill in use" : "Approve the rule", () => SK.ir(e.regraAprovada ? 6 : 5)));
        } else if (proc) {
          acoes.append(btn("btn-secundario", "See the process", () => abrirProcesso(proc), ic("processo", "ico-sm")), el("span", { class: "t-pequeno texto-2" }, "This one’s question is ready after the biggest."));
        }
        corpo.append(acoes);
        detalhe.append(corpo);
      }
      selecionar(selId, false);
    },
    padrao() {},
  });

  function abrirProcesso(p) {
    const nome = (id) => { const x = id && D.porId(id); return x ? x.nome : "Nobody"; };
    const corpo = el("div", { class: "pilha", style: { "--gap": "28px" } },
      el("div", { class: "painel-secao" }, el("h3", { class: "painel-h" }, "Steps"), el("ol", {}, p.passos.map((s) => el("li", {}, s)))),
      el("div", { class: "painel-secao" }, el("h3", { class: "painel-h" }, "Who decides"), el("p", {}, p.decide)),
      p.excecoes.length ? el("div", { class: "painel-secao" }, el("h3", { class: "painel-h" }, "Exceptions"), el("ul", { class: "marcadores" }, p.excecoes.map((s) => el("li", {}, s)))) : null,
      el("div", { class: "painel-secao" }, el("h3", { class: "painel-h" }, "Where I got it"), ...p.fontes.map((f) => el("div", { class: "fonte-linha" }, ic(f.fonte === "drive" ? "drive" : f.fonte === "agenda" ? "agenda" : f.fonte === "gmail" ? "gmail" : "fonte"), el("span", {}, f.texto), el("span", { class: "fonte-data" }, f.data)))));
    SK.painel.abrir({ titulo: p.nome, sobre: p.frequencia + " · done by " + nome(p.quem) + " · approves: " + (p.aprova ? nome(p.aprova) : "sem dono"), corpo });
  }

  /* =================================================================== 5 · A PERGUNTA */
  const ROTEIRO = ["How many are below R$ 5,000?", "Those are approved automatically. From R$ 5,000 to R$ 50,000, Treasury approves.", "The rest goes to #antecipacoes in Slack: Marina or Douglas give the ok.", "With a chargeback, always me.", "Who is involved in this process?"];
  SK.ato({
    id: 5, titulo: "The question", nav: "The question",
    montar(sec) {
      const e = E(), b = B(), r = R(), P = D.pergunta, buraco = D.buracos[0];
      b.conversa = b.conversa || [];
      const raiz = el("div", { class: "ato-papel b-largo b5" });
      raiz.append(el("div", { class: "ato-cabeca b-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "One question to close the biggest gap"),
        el("p", { class: "t-sub texto-2" }, buraco.titulo + "."))));

      /* lado direito: a regra viva, quem participa e o buraco */
      const ctx = el("div", { class: "b5-ctx pilha", style: { "--gap": "16px" } });
      const cartaoRegra = el("div", { class: "cartao b5-regra" });
      const cartaoQuem = el("div", { class: "cartao b5-quem" });
      const espera = el("span", { class: "numero-valor num" }, "1.8 days");
      const esperaN = el("div", { class: "numero numero-brasa" }, espera, el("span", { class: "numero-rotulo" }, "wait, median"));
      const parados = el("span", { class: "numero-valor num" }, "R$ 1.2M");
      const paradosN = el("div", { class: "numero numero-brasa" }, parados, el("span", { class: "numero-rotulo" }, "waiting each month in your email"));
      const g = grafico({ compacto: true });
      g.selecionar("antecipacao");
      const cartaoBuraco = el("div", { class: "cartao b5-buraco" },
        el("div", { class: "b5-buraco-esq" }, el("h2", { class: "b-h2" }, "The gap"),
          el("div", { class: "b5-numeros" }, el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, "23"), el("span", { class: "numero-rotulo" }, "requests a month")), esperaN, paradosN)),
        g.el);
      ctx.append(cartaoRegra, cartaoQuem, cartaoBuraco);
      /* a skill sendo escrita ao vivo: cada resposta entra na seção certa, com a etiqueta de onde veio */
      const sv = SK.skillViva({ titulo: "The skill, being written" });
      const regraAcoes = el("div", { class: "b5-regra-pe" });
      cartaoRegra.append(sv.el, regraAcoes);
      const conectadasNomes = () => ["Gmail", "Drive", "Calendar"].concat(D.integracoes.filter((i) => (e.conectadas || []).includes(i.id)).map((i) => i.nome));
      let nResp = 0, temRegra = false;
      function registrar(r0, t, resp, perguntou) {
        nResp++;
        const de = "answer " + nResp;
        const add = (sec, txt) => sv.adicionar(sec, txt, { de });
        let algo = false;
        const marca = () => { if (!temRegra) { temRegra = true; add("regra", "Approval depends on the size of the request."); } algo = true; };
        if (r.auto && r.auto !== r0.auto) { marca(); add("condicoes", "If the request is below " + rs(r.auto) + ", then approval is automatic."); add("quem", "Nobody: automatic below " + rs(r.auto) + "."); }
        if (r.tes && r.tes !== r0.tes) { marca(); add("condicoes", "If the request is " + (r.auto ? "from " + rs(r.auto) + " to " : "up to ") + rs(r.tes) + ", then Treasury approves."); add("quem", "Treasury: Caio or Débora."); }
        if (r.slack && !r0.slack) { marca(); add("fluxo", "Above " + rs(r.tes || r.auto || 50000) + ": the request goes to #antecipacoes; Marina or " + DOUGLAS().primeiro + " give the ok."); add("termos", "#antecipacoes: the Slack channel where large requests wait for an ok."); }
        if (r.exc && !r0.exc) { marca(); add("excecoes", "Merchant with a chargeback in the last 90 days: always Marina, whatever the amount."); }
        if (r.quem && !r0.quem) { algo = true; add("fluxo", "Before: every request went by email, from Caio to Marina."); }
        if (!algo && !perguntou && resp.some((x) => /^Anotei\./.test(x))) sv.organizar(t, { de, conectadas: conectadasNomes() });
      }

      /* conversa */
      const fio = el("div", { class: "b5-fio", role: "log", "aria-label": "Conversation", "aria-live": "polite" });
      const caixa = el("textarea", { class: "b5-texto", rows: "2", placeholder: "Reply or ask in your own words", "aria-label": "Your message" });
      const enviar = btn("btn-primario btn-sm", "Send", () => mandar(caixa.value), ic("seta", "ico-sm"));
      const comoMarina = btn("btn-secundario btn-sm", "Answer as Marina", () => digitarComoMarina());
      const sugestoes = el("div", { class: "b5-sugestoes", "aria-label": "Suggestions" });
      const compositor = el("div", { class: "b5-compositor" }, caixa, sugestoes, el("div", { class: "b5-comp-acoes" }, comoMarina, enviar));
      const conversa = el("section", { class: "b5-conversa", "aria-label": "Conversation with the brain" },
        el("div", { class: "b5-conversa-topo" }, el("span", { class: "b5-marca", "aria-hidden": "true" }, marcaMini()), el("div", {}, el("p", { class: "forte" }, "Lume’s brain"), el("p", { class: "t-micro texto-2" }, "About: " + D.skill.nome))),
        fio, compositor);
      raiz.append(el("div", { class: "b5-grade" }, conversa, ctx));
      sec.append(raiz);

      let ocupado = false;
      const atualizarBotoes = () => { enviar.disabled = ocupado || !caixa.value.trim(); comoMarina.disabled = ocupado || !proximaFala(); sugestoes.querySelectorAll("button").forEach((x) => (x.disabled = ocupado)); };
      caixa.addEventListener("input", atualizarBotoes);
      caixa.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); mandar(caixa.value); } });
      const rolarFio = () => { fio.scrollTop = fio.scrollHeight; };
      const add = (n) => { fio.append(n); rolarFio(); return n; };
      const msgProduto = (anim, ...f) => add(el("div", { class: "b5-msg b5-produto" + (anim ? " entra" : "") }, ...f));
      const msgDela = (t, anim) => add(el("div", { class: "b5-msg b5-dela" + (anim ? " entra" : "") }, el("p", {}, t)));
      const voz = (t) => el("p", { class: "voz b5-voz" }, t);
      function porque(texto) { const d = el("details", { class: "b5-porque" }, el("summary", {}, ic("mais", "ico-sm"), "Why I am asking"), el("p", {}, texto)); d.addEventListener("toggle", rolarFio); return d; }
      function pensar(anim, depois) {
        if (!anim) { depois(); return; }
        const d = add(el("div", { class: "b5-msg b5-produto b5-digitando", "aria-label": "Writing" }, el("span"), el("span"), el("span")));
        SK.depois(600, () => { d.remove(); depois(); });
      }
      function abertura(anim) {
        msgProduto(anim, el("p", {}, "Before asking, here is what I saw:"),
          el("ul", { class: "b5-fatos" }, P.evidencia.map((f, i) => el("li", { class: anim ? "entra" : "", style: { "--atraso": 80 + i * 70 + "ms" } }, ic("check", "ico-sm"), f))),
          el("p", { class: "b5-fonte t-micro texto-2" }, ic("fonte", "ico-sm"), "Caio’s emails to you and the “Advances 2026” spreadsheet."));
      }
      const pergunta1 = (anim) => msgProduto(anim, el("p", { class: "b5-pergunta" }, P.pergunta), porque(P.porque));
      const pergunta2 = (anim) => msgProduto(anim, el("p", { class: "b5-pergunta" }, P.aprofunda), porque("Of the 19 requests below R$ 50,000, 3 came from a merchant with a recent chargeback. A rule based only on amount would let those pass without you."));

      /* entender a mensagem: devolve as respostas do produto e muda r */
      function entender(t) {
        const n = semAcento(t), resp = [];
        const pergunta = /\?\s*$/.test(t.trim()) || /^(how|what|which|who|why)\b/.test(n);
        if (pergunta) {
          if (/particip|involv|takes part|who (is|does|handles|looks after)|people/.test(n)) { r.quem = true; resp.push("Today it goes through three people and an email. I showed alongside how it looks with your rule."); return resp; }
          const vs = valores(t);
          if (vs.length && /how many|how much|below|under|above|over|less|more|up to|until/.test(n)) {
            const v = vs[vs.length - 1], acima = /above|over|more than|greater|higher|bigger|larger/.test(n) && !/below|under|less|lower|fewer|smaller/.test(n);
            const k = conta((x) => (acima ? x > v : x < v)), s = soma((x) => (acima ? x > v : x < v));
            b.ultimo = v;
            resp.push("Of the 23 requests this month, " + k + (acima ? " are above " : " are below ") + rs(v) + ". They add up to " + mi(s) + ", and none was refused in 6 months.");
            if (!acima && v <= 10000) resp.push("If you like, those can be approved automatically.");
            return resp;
          }
          resp.push("In this prototype I answer how many requests are below or above an amount, and who takes part in the process.");
          return resp;
        }
        let entendi = false;
        n.split(/[.;]\s*/).filter(Boolean).forEach((f, i) => {
          const fo = t.split(/[.;]\s*/).filter(Boolean)[i] || f, vs = valores(fo);
          if (/automat|without anyone|nobody|no one|without a human|on their own|instantly/.test(f)) {
            const v = vs.length ? vs[0] : b.ultimo || 5000; r.auto = v; if (r.tes && r.tes <= v) r.tes = null; entendi = true;
            resp.push("Agreed: below " + rs(v) + ", approval is automatic. That is " + conta((x) => x < v) + " requests a month.");
          } else if (/treasury/.test(f)) {
            const v = vs.length ? Math.max(...vs) : 50000; r.tes = v; entendi = true;
            const k = conta((x) => destino(x, r) === "tes");
            resp.push("Got it: " + (r.auto && r.auto < v ? "from " + rs(r.auto) + " to " + rs(v) : "up to " + rs(v)) + ", Treasury approves. That is " + k + " a month.");
          }
          if (/slack|channel|#/.test(f)) { r.slack = true; entendi = true; resp.push("Done: the rest goes to #antecipacoes, and Marina or " + DOUGLAS().primeiro + " give the ok. Nothing sits in your email."); }
          if (/chargeback/.test(f)) { r.exc = true; entendi = true; resp.push("Noted the exception: with a chargeback in the last 90 days, it always goes through you, whatever the amount."); }
          if (/particip|involv|takes part|people/.test(f)) { r.quem = true; entendi = true; resp.push("I showed alongside who takes part, before and after."); }
          else if (!entendi && /\b(i|me|my|myself|marina)\b/.test(f)) { entendi = true; resp.push("Got it: what is left stays with you."); }
        });
        if (!entendi) resp.push("Noted. In this prototype I understand amounts, who approves and where the request goes.");
        return resp;
      }

      function mandar(texto, anim = true) {
        const t = (texto || "").trim();
        if (!t || ocupado) return;
        ocupado = true; caixa.value = ""; atualizarBotoes();
        msgDela(t, anim);
        const antes = mudou(r), antesR = JSON.stringify(r), r0 = Object.assign({}, r);
        const resp = entender(t);
        registrar(r0, t, resp, /\?\s*$/.test(t));
        b.conversa.push(t);
        if (!e.respostas || !e.respostas.pergunta) e.respostas = { pergunta: t, aprofunda: "" }; else e.respostas.aprofunda = t;
        if (mudou(r)) e.buracoResolvido = true;
        SK.salvar();
        const mudouRegra = JSON.stringify(r) !== antesR;
        const terminar = () => {
          redesenhar(anim);
          ocupado = false; atualizarBotoes(); desenharSugestoes();
          if (anim && document.activeElement === document.body) caixa.focus({ preventScroll: true });
        };
        pensar(anim, () => {
          msgProduto(anim, ...resp.map((x) => el("p", {}, x)));
          if (!antes && mudou(r) && !r.exc && !b.fezAprofunda) { b.fezAprofunda = true; SK.salvar(); if (anim) SK.depois(380, () => pergunta2(true)); else pergunta2(false); }
          if (anim && mudouRegra && typeof SK.passos === "function" && !SK.reduzido()) {
            const caixaPassos = el("div", { class: "b5-passos" });
            regraAcoes.replaceChildren(caixaPassos);
            SK.passos(caixaPassos, ["Reading what you wrote", "Splitting the month’s 23 requests by amount", "Writing the rule and its effect"], { ms: 240 }).then(terminar);
          } else terminar();
        });
      }
      function proximaFala() { return ROTEIRO.find((x) => !b.conversa.includes(x) && !jaCoberto(x)); }
      function jaCoberto(x) {
        if (x.startsWith("How many")) return !!b.ultimo || !!r.auto;
        if (x.startsWith("Those")) return !!r.auto && !!r.tes;
        if (x.startsWith("The rest")) return r.slack;
        if (x.startsWith("With a chargeback")) return r.exc;
        if (x.startsWith("Who")) return r.quem;
        return false;
      }
      function desenharSugestoes() {
        sugestoes.replaceChildren();
        const ops = [];
        if (!b.ultimo && !r.auto) ops.push("How many are below R$ 5,000?");
        if (!r.auto) ops.push(b.ultimo ? "Those are approved automatically" : "Below R$ 5,000, approved automatically");
        if (!r.tes) ops.push(r.auto ? "From R$ 5,000 to R$ 50,000, Treasury approves" : "Up to R$ 50,000, Treasury approves");
        if (!r.slack) ops.push("The rest goes to #antecipacoes in Slack: Marina or Douglas give the ok");
        if (!r.exc) ops.push("With a chargeback, always me");
        if (!r.quem) ops.push("Who is involved in this process?");
        ops.slice(0, 4).forEach((o) => sugestoes.append(el("button", { class: "b5-sug", type: "button", on: { click: () => mandar(o) } }, el("span", { class: "b5-sug-txt" }, o), el("span", { class: "b5-sug-imp" }, impactoSugestao(o, r, b)))));
        sugestoes.hidden = !sugestoes.childElementCount;
      }
      function digitarComoMarina() {
        const alvo = proximaFala();
        if (ocupado || !alvo) return;
        ocupado = true; atualizarBotoes(); caixa.value = "";
        if (SK.reduzido()) { ocupado = false; mandar(alvo); return; }
        let i = 0;
        const tm = SK.cada(18, () => { i += 1; caixa.value = alvo.slice(0, i); if (i >= alvo.length) { clearInterval(tm); SK.depois(260, () => { ocupado = false; mandar(alvo); }); } });
      }

      /* a regra viva */
      function redesenhar(anim) {
        const tem = mudou(r), ef = efeito(r);
        regraAcoes.replaceChildren(el("div", { class: "fila b5-regra-acoes" },
          btn("btn-primario", e.regraAprovada ? "See the skill" : "Review before publishing", () => SK.ir(6), ic("seta", "ico-sm")),
          el("span", { class: "t-pequeno texto-2" }, e.regraAprovada ? "Published by you." : tem ? "Before publishing, you see the before and after." : "Answer alongside and the skill writes itself here.")));
        regraAcoes.querySelector(".btn-primario").disabled = !tem && !e.regraAprovada;
        cartaoQuem.hidden = !r.quem;
        if (r.quem) cartaoQuem.replaceChildren(el("h2", { class: "b-h2" }, "Who takes part"), quemParticipa(r, anim));
        espera.textContent = ef.esperaCurta;
        esperaN.classList.toggle("numero-brasa", ef.espera > 2); esperaN.classList.toggle("b-mudou", ef.espera <= 2);
        parados.textContent = ef.parados ? mi(ef.parados) : "R$ 0";
        paradosN.classList.toggle("numero-brasa", ef.parados > 0); paradosN.classList.toggle("b-mudou", !ef.parados);
        g.mover(ef.intensidade, ef.espera > 2 ? null : "now · " + ef.esperaTxt, !!anim);
      }

      /* reconstrução */
      this._inicio = null;
      abertura(false); pergunta1(false);
      if (b.conversa.length) {
        const salvo = b.conversa.slice(); b.conversa = []; const r0 = Object.assign({}, r);
        Object.assign(r, { auto: null, tes: null, slack: false, exc: false, quem: false }); b.ultimo = null; b.fezAprofunda = false;
        salvo.forEach((t) => { msgDela(t, false); const antes = mudou(r), r0 = Object.assign({}, r); const resp = entender(t); registrar(r0, t, resp, /\?\s*$/.test(t)); b.conversa.push(t); msgProduto(false, ...resp.map((x) => el("p", {}, x))); if (!antes && mudou(r) && !r.exc && !b.fezAprofunda) { b.fezAprofunda = true; pergunta2(false); } });
        if (!mudou(r) && mudou(r0)) Object.assign(r, r0);
      } else if (mudou(r)) {
        registrar({ auto: null, tes: null, slack: false, exc: false, quem: false }, "", [], false);
        msgProduto(false, el("p", {}, "This is the rule you approved. Change anything you like: I will update it alongside."));
      } else {
        fio.replaceChildren(); ocupado = true;
        this._inicio = () => { abertura(true); SK.depois(800, () => { pergunta1(true); ocupado = false; atualizarBotoes(); }); };
      }
      redesenhar(false); desenharSugestoes(); atualizarBotoes();
      sv.el.querySelectorAll(".sv-novo, .sv-acende").forEach((x) => x.classList.remove("sv-novo", "sv-acende"));
    },
    entrar() { if (this._inicio) this._inicio(); },
    sair() { soltar(); },
    padrao(e) { padraoPergunta(e); },
  });

  function quemParticipa(r, anim) {
    const P = (ini, nome, extra) => el("span", { class: "b-pessoa" }, el("span", { class: "avatar avatar-sm" }, ini), el("span", { class: "b-pessoa-nome" }, nome, extra ? el("span", { class: "texto-2" }, " " + extra) : null));
    const seta = () => el("span", { class: "b-seta", "aria-hidden": "true" }, ic("seta", "ico-sm"));
    const passo = (t) => el("span", { class: "b-passo-sist" }, t);
    const lojista = () => el("span", { class: "b-pessoa" }, el("span", { class: "avatar avatar-sm avatar-externo" }, "LJ"), el("span", { class: "b-pessoa-nome" }, "Merchant"));
    const d = DOUGLAS();
    const linha = (rot, ...f) => el("div", { class: "b-fluxo" + (anim ? " entra" : "") }, el("span", { class: "b-fluxo-rot t-micro texto-2" }, rot), el("div", { class: "b-fluxo-cad" }, ...f));
    const depois = [];
    if (r.auto) depois.push(linha("Below " + rs(r.auto), lojista(), seta(), passo("automatic")));
    if (r.tes) depois.push(linha((r.auto ? "From " + rs(r.auto) + " a " : "Up to ") + rs(r.tes), lojista(), seta(), P("CB", "Caio"), P("DL", "Débora")));
    depois.push(linha(r.slack ? "The rest" : "The rest", lojista(), seta(), r.slack ? passo("#antecipacoes") : passo("email"), seta(), P("MD", "Marina"), r.slack ? P(d.iniciais, d.primeiro || d.nome.split(" ")[0]) : null));
    return el("div", { class: "b-quem" },
      el("p", { class: "t-micro texto-2 forte" }, "Before"),
      linha("Everyone", lojista(), seta(), P("CB", "Caio", "(Treasury)"), seta(), passo("email"), seta(), P("MD", "Marina")),
      el("p", { class: "t-micro texto-2 forte b-quem-depois" }, "With your rule"), ...depois);
  }

  function marcaMini() {
    const s = el("svg", { viewBox: "0 0 28 28", class: "b-marca-svg", "aria-hidden": "true" });
    s.innerHTML = '<circle cx="14" cy="14" r="4.2" fill="currentColor"/><circle cx="5" cy="7" r="2.3" fill="currentColor" opacity=".55"/><circle cx="23" cy="6" r="2.3" fill="currentColor" opacity=".55"/><circle cx="22.5" cy="22" r="2.3" fill="currentColor" opacity=".55"/><circle cx="5.5" cy="21.5" r="2.3" fill="currentColor" opacity=".55"/>';
    return s;
  }

  /* =================================================================== 6 · VIRA SKILL */
  const CANAIS = [
    { id: "claude", nome: "Claude", letra: "C", onde: "In Lume’s Claude, through the brain connection." },
    { id: "chatgpt", nome: "ChatGPT", letra: "G", onde: "In Lume’s ChatGPT, through the same connection." },
    { id: "grok", nome: "Grok", letra: "X", onde: "In Lume’s Grok, through the same connection." },
    { id: "slack", nome: "Slack", letra: "S", onde: "In Slack, in #tesouraria, #antecipacoes and by message." },
  ];
  const marcaCanal = (c, pequena) => (typeof SK.marca === "function" ? SK.marca(c.id, pequena ? "mf-sm" : "") : el("span", { class: "b6-letra" + (pequena ? " b6-letra-sm" : ""), "aria-hidden": "true" }, c.letra));

  const GUARDAS = [
    { id: "aprova", txt: "Only reads requests; approves nothing on its own above R$ 5,000", sim: "Above R$ 5,000, it recommends and a person approves.", nao: "It could approve any amount on its own within the rule." },
    { id: "status", txt: "Can change: request status", sim: "It marks the request as approved or under review.", nao: "It only answers; someone changes the status by hand." },
    { id: "conta", txt: "Never touches the merchant’s payout account", trava: true, sim: "Locked: changing accounts is the favorite fraud route." },
    { id: "parcial", txt: "Answers about a month not yet closed, with a warning", sim: "Gives the day’s partial figure and warns it may change.", nao: "Gives no figure for an open month: says Marina has it." },
    { id: "escreve", txt: "Can write in #antecipacoes", sim: "It takes the large requests to the channel on its own.", nao: "It does not write in the channel: it tells the asker to call Marina or Douglas." },
  ];
  SK.ato({
    id: 6, titulo: "Before publishing", nav: "Skill",
    montar(sec) {
      const e = E(), b = B(), r = R();
      if (!mudou(r)) Object.assign(r, REGRA_COMPLETA);
      b.guarda = Object.assign({ aprova: true, status: true, conta: true, escreve: true, parcial: true }, b.guarda || {});
      b.conf = b.conf || {};
      const ef = efeito(r), fx = faixas(r);
      const faixaN = (q) => (D.antecipacoesPorFaixa.find((f) => f.faixa.startsWith(q)) || {}).quantos;
      const raiz = el("div", { class: "ato-papel b-largo b6p" });
      raiz.append(el("div", { class: "ato-cabeca b-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Before publishing"),
        el("p", { class: "t-sub texto-2" }, D.skill.nome + " · " + (e.regraAprovada ? "publicada" : "draft, from your words")))));
      const lista = (linhas, cls) => el("ul", { class: "b6p-lista " + cls }, ...linhas.map((t) => el("li", { class: "b6p-muda" }, t)));
      const antes = ["All 23 requests of the month wait for Marina, by email.", "Nobody else approves, at any amount.", "Recent chargeback: it is not written what to do."];
      const depois = fx.map((f) => f.txt + (f.n != null ? " · " + f.n + " a month" : ""));
      const imp = (titulo, linhas, cls) => el("div", { class: "b6p-imp-col " + cls }, el("h3", { class: "b6p-imp-h" }, titulo),
        el("ul", { class: "b6p-imp-lista" }, ...linhas.map(([t, m]) => el("li", {}, el("p", {}, t), el("p", { class: "t-micro texto-2" }, m)))));
      const melhora = [
        ["The median wait falls from 1.8 days to " + ef.esperaTxt + ".", "estimate, from the rule applied to the month’s 23 requests"],
        [ef.saem + " requests a month leave your email; " + mi(ef.liberados) + " a month stop waiting for approval.", "estimate"],
        ["About " + ef.horas + " hours a month of back and forth returned to the team.", "estimate: 1 h 20 min per request"],
      ];
      const piora = [
        [(faixaN("below") || 11) + " requests a month below " + rs(r.auto || 5000) + " pass without anyone looking.", "measured: the amount band of the month’s requests"],
        ["Treasury now decides " + (faixaN("from R$ 5") || 8) + " requests a month: more work for Caio and Débora.", "estimate"],
        ["A merchant with an old chargeback (more than 90 days) goes through the normal rule.", "not measured: I will watch the cases you undo"],
      ];
      const CONFLITOS = [
        { id: "planilha", txt: "The “Advances 2026” spreadsheet asks for Marina’s ok on every request. You said up to R$ 50,000 does not need it.", escolha: "Use what I said today" },
        { id: "procedimento", txt: "The written procedure says nothing about chargebacks. You said: with a chargeback, always you.", escolha: "Use what I said today" },
      ];
      const pend = el("ol", { class: "r-pend" });
      const publicar = btn("btn-primario btn-grande btn-largo", "Publish", () => publicarJa(false));
      const motivo = el("p", { class: "t-pequeno texto-2" });
      const mesmoAssim = btn("btn-quieto btn-sm", "Publish anyway, with the question open", () => publicarJa(true));
      const depoisBox = el("div", { class: "b6p-depois" });
      const onde = CANAIS.filter((c) => e.skillEm && e.skillEm[c.id]).map((c) => c.nome);
      const quemUsa = el("div", { class: "r-quem-usa" }, el("p", { class: "t-micro texto-2" }, "Who will use it"),
        el("p", {}, "Caio and Débora (Treasury)" + (r.slack ? ", Marina and " + DOUGLAS().primeiro + " in #antecipacoes" : "") + (onde.length ? "; in the company assistants: " + onde.join(", ").replace(/, ([^,]*)$/, " and $1") : "") + "."),
        el("p", { class: "t-micro texto-2" }, "The assistants come from Settings and apply to all skills. ", el("button", { class: "link", type: "button", on: { click: () => SK.ir("config") } }, "Change in Settings")));
      function desenhar() {
        pend.replaceChildren();
        CONFLITOS.forEach((c, i) => {
          const ok = !!b.conf[c.id] || e.regraAprovada;
          pend.append(el("li", { class: "r-pend-item" + (ok ? " ok" : "") }, el("span", { class: "r-pend-n" }, ok ? ic("check", "ico-sm") : String(i + 1)),
            el("div", { class: "pilha", style: { "--gap": "6px" } }, el("p", {}, c.txt), ok ? el("p", { class: "t-pequeno r-ok" }, "Resolved: what you said applies.") : btn("btn-secundario btn-sm", c.escolha, () => { b.conf[c.id] = true; SK.salvar(); desenhar(); }))));
        });
        pend.append(el("li", { class: "r-pend-item" + (r.exc ? " ok" : "") }, el("span", { class: "r-pend-n" }, r.exc ? ic("check", "ico-sm") : String(CONFLITOS.length + 1)),
          el("div", { class: "pilha", style: { "--gap": "6px" } }, el("p", {}, "And when the merchant has had a chargeback in the last 90 days?"),
            r.exc ? el("p", { class: "t-pequeno r-ok" }, "Answered: always you, whatever the amount.") : btn("btn-secundario btn-sm", "Answer in the conversation", () => SK.ir(5)))));
        const conflitosOk = CONFLITOS.every((c) => b.conf[c.id]) || e.regraAprovada;
        publicar.disabled = !conflitosOk || !r.exc || e.regraAprovada; publicar.hidden = !!e.regraAprovada;
        mesmoAssim.hidden = !conflitosOk || r.exc || e.regraAprovada;
        motivo.textContent = e.regraAprovada ? "" : !conflitosOk ? "First, resolve the conflicts below." : !r.exc ? "The open question below is still missing." : "All set.";
        depoisBox.replaceChildren();
        if (e.regraAprovada) depoisBox.append(el("div", { class: "r-publicada entra" },
          el("p", { class: "forte" }, ic("check", "ico-sm"), " Published: " + D.skill.nome + " · " + D.skill.versao + ", approved by " + D.skill.aprovadaPor + " " + D.skill.quando + "."),
          el("p", { class: "t-pequeno texto-2" }, "Next step: decide what each area can see."),
          btn("btn-primario", "Go to Access", () => SK.ir(7), ic("seta", "ico-sm"))));
      }
      function publicarJa(comAberta) {
        e.regraAprovada = true; b.comAberta = !!comAberta; padraoPergunta(e);
        if (!Object.values(e.skillEm || {}).some(Boolean)) e.skillEm = { claude: true, chatgpt: false, grok: false, slack: true };
        SK.salvar(); desenhar(); SK.anunciar("Skill published.");
      }
      raiz.append(el("div", { class: "r-pub-grade" },
        el("div", { class: "pilha", style: { "--gap": "16px" } },
          el("section", { class: "cartao" }, el("h2", { class: "b-h2" }, "Before and after"),
            el("div", { class: "r-ad" }, el("div", { class: "r-ad-col r-ad-antes" }, el("p", { class: "t-micro texto-2 forte" }, "How it is today"), lista(antes, "")),
              el("div", { class: "r-ad-col r-ad-depois" }, el("p", { class: "t-micro texto-2 forte" }, "How it looks, with your answers"), lista(depois, ""))),
            el("p", { class: "t-micro texto-2" }, "Marked: what changes.")),
          el("section", { class: "cartao" }, el("h2", { class: "b-h2" }, "Expected impact"),
            el("div", { class: "r-imp" }, imp("What improves", melhora, "r-imp-col r-imp-bom"), imp("What could get worse", piora, "r-imp-col r-imp-ruim"))),
          el("section", { class: "cartao" }, el("h2", { class: "b-h2" }, "Limits of this skill"), guardasLista())),
        el("aside", { class: "cartao r-pub-lado" }, el("h2", { class: "b-h2" }, "To publish"), publicar, motivo, mesmoAssim, depoisBox, pend, quemUsa)));
      function guardasLista() {
        const ul = el("ul", { class: "b6-guardas" });
        GUARDAS.forEach((gd) => {
          const efeitoP = el("p", { class: "t-micro texto-2 b6-guarda-ef" }, b.guarda[gd.id] ? gd.sim : gd.nao);
          if (gd.trava) { ul.append(el("li", { class: "b6-guarda travada" }, el("div", { class: "b6-guarda-linha" }, el("span", { class: "b6-trava", title: "Always on" }, ic("cadeado", "ico-sm")), el("span", { class: "b6-guarda-txt" }, gd.txt)), efeitoP)); return; }
          const t = SK.toggle(gd.txt, !!b.guarda[gd.id], (v) => { b.guarda[gd.id] = v; SK.salvar(); efeitoP.textContent = v ? gd.sim : gd.nao; });
          t.classList.add("b6-guarda-tg"); ul.append(el("li", { class: "b6-guarda" }, t, efeitoP));
        });
        return ul;
      }
      sec.append(raiz);
      desenhar();
    },
    sair() { soltar(); },
    padrao(e) {
      padraoPergunta(e);
      e.regraAprovada = true;
      if (!Object.values(e.skillEm || {}).some(Boolean)) e.skillEm = { claude: true, chatgpt: false, grok: false, slack: true };
    },
  });

  function slack(anim) {
    const b = B(), caixa = el("div", { class: "b-slack-caixa" });
    const quem = b.fio === "ceo" ? "ceo" : "analista";
    const sw = el("div", { class: "segmentado b-slack-sw", role: "tablist", "aria-label": "Who asks" },
      ...[["analista", "Analyst asks"], ["ceo", "CEO asks"]].map(([id, rot]) => el("button", { role: "tab", type: "button", "aria-selected": quem === id ? "true" : "false", on: { click: () => { b.fio = id; SK.salvar(); caixa.replaceWith(slack(true)); } } }, rot)));
    caixa.append(sw, quem === "ceo" ? slackCEO(anim) : slackAnalista(anim));
    return caixa;
  }
  function slackCEO(anim) {
    const parcial = !(B().guarda && B().guarda.parcial === false);
    const ORIGEM_OUT = "Advances 2026 spreadsheet · October tab · cell F42 · month closed on 5 Nov";
    const msgs = [
      { quem: "Otávio Reis", ini: "OR", hora: "8:02 am", txt: "How much did we advance in October?" },
      { bot: true, hora: "8:02 am", txt: "R$ 1.2 million, in 23 advances.", origem: ORIGEM_OUT },
      { quem: "Otávio Reis", ini: "OR", hora: "8:03 am", txt: "And November?" },
      parcial ? { bot: true, hora: "8:03 am", txt: "November has not closed yet. Today’s partial figure is R$ 870,000, in 17 advances, and it may change. Marina closes it on the 5th.", origem: "Advances 2026 spreadsheet · November tab · partial as of 25 Nov" }
        : { bot: true, hora: "8:03 am", txt: "November has not closed yet and I do not answer for an open month. Marina has the partial figure." },
      { quem: "Otávio Reis", ini: "OR", hora: "8:05 am", txt: "Is it worth advancing for Loja Ventana?" },
      { bot: true, hora: "8:05 am", txt: "That is Marina’s decision. I have already let her know." },
    ];
    return desenhoSlack("financeiro", "6 membros", msgs, anim);
  }
  function slackAnalista(anim) {
    const d1 = decidir(22000, false), d2 = decidir(38000, true), d3 = decidir(140000, false);
    const msgs = [
      { quem: "Débora Lins", ini: "DL", hora: "10:12 am", txt: "Casa Pirá advance request, R$ 22,000. Can I approve it?" },
      { bot: true, hora: "10:12 am", txt: d1.txt, chamar: d1.chamar },
      { quem: "Débora Lins", ini: "DL", hora: "10:14 am", txt: "And Loja Ventana, R$ 38,000?" },
      { bot: true, hora: "10:14 am", txt: d2.txt, chamar: d2.chamar },
      { quem: "Caio Brandão", ini: "CB", hora: "10:31 am", txt: "Rede Sol asked for R$ 140,000 for Friday." },
      { bot: true, hora: "10:31 am", txt: d3.txt, chamar: d3.chamar },
    ];
    return desenhoSlack("tesouraria", "4 membros", msgs, anim);
  }
  function desenhoSlack(canal, membros, msgs, anim) {
    const janela = el("div", { class: "b-slack", role: "img", "aria-label": "Preview: Slack conversation, channel " + canal });
    const lado = el("div", { class: "b-slack-lado", "aria-hidden": "true" },
      el("p", { class: "b-slack-ws" }, "Lume"),
      ...["geral", "financeiro", "tesouraria", "antecipacoes", "risco"].map((c) => el("p", { class: "b-slack-canal" + (c === canal ? " active" : "") }, "# " + c)),
      el("p", { class: "b-slack-sec" }, "Apps"), el("p", { class: "b-slack-canal" }, "Lume’s brain"));
    const fio = el("div", { class: "b-slack-fio" });
    janela.append(lado, el("div", { class: "b-slack-main" }, el("div", { class: "b-slack-cab" }, el("span", { class: "forte" }, "# " + canal), el("span", { class: "t-micro" }, membros)), fio));
    msgs.forEach((m, i) => {
      fio.append(el("div", { class: "b-slack-msg" + (anim ? " entra" : ""), style: { "--atraso": anim ? i * 380 + "ms" : "0ms" } },
        (m.bot && typeof SK.marca === "function") ? SK.marca("cerebro") : el("span", { class: "b-slack-av" + (m.bot ? " bot" : "") }, m.bot ? marcaMini() : m.ini),
        el("div", { class: "b-slack-corpo" },
          el("p", { class: "b-slack-nome" }, el("span", { class: "forte" }, m.bot ? "Lume’s brain" : m.quem), m.bot ? el("span", { class: "b-slack-app" }, "APP") : null, el("span", { class: "b-slack-hora" }, m.hora)),
          el("p", {}, m.txt),
          m.chamar ? el("div", { class: "b-slack-chamar" }, el("span", { class: "avatar avatar-sm" }, D.usuaria.iniciais), el("span", {}, "Call ", el("span", { class: "forte" }, "Marina Duarte"), ". She decides the chargeback cases."), el("span", { class: "b-slack-botao" }, "Call Marina")) : null,
          m.origem ? el("p", { class: "b-slack-skill b-slack-origem" }, ic("fonte", "ico-sm"), m.origem) : m.bot && canal !== "financeiro" ? el("p", { class: "b-slack-skill" }, ic("processo", "ico-sm"), "Skill " + D.skill.nome + " · " + D.skill.versao) : null)));
    });
    return janela;
  }
  function conversaIA(c, anim) {
    const conv = D.uso.conversas[0], d = decidir(38000, true);
    const j = el("div", { class: "b-ia b-ia-" + c.id, role: "img", "aria-label": "Preview: conversation in " + c.nome });
    j.append(el("div", { class: "b-ia-cab" }, marcaCanal(c, true), el("span", { class: "forte" }, c.nome), el("span", { class: "t-micro b-ia-sub" }, "Débora Lins · Treasury")),
      el("div", { class: "b-ia-fio" },
        el("div", { class: "b-ia-dela" + (anim ? " entra" : "") }, el("p", {}, conv.pergunta)),
        el("div", { class: "b-ia-resp" + (anim ? " entra" : ""), style: { "--atraso": anim ? "450ms" : "0ms" } },
          el("p", { class: "b-ia-usando" }, ic("processo", "ico-sm"), "Using the skill ", el("span", { class: "forte" }, D.skill.nome + " · " + D.skill.versao), ", approved by Marina"),
          el("p", {}, d.txt))));
    return j;
  }

  /* =================================================================== 7 · GUARDRAILS */
  /* começo inteligente: RH e Diretoria só para si e para a Diretoria, menos a porta aberta que achei (Engenharia vê RH) */
  function guardInicial(e) {
    e.b = e.b || {};
    if (e.b.guardInit) return;
    const A = D.areas, sem = (xs) => A.filter((a) => !xs.includes(a));
    /* só as 5 áreas de base; chaves que outra tela acrescentou (departamentos criados) ficam como estão */
    e.guardrails = Object.assign({}, e.guardrails || {}, { "Operations": sem(["HR", "Leadership"]), "Treasury": sem(["HR", "Leadership"]), "Engineering": sem(["Leadership"]), "HR": sem(["Leadership"]), "Leadership": A.slice() });
    e.b.guardInit = true;
  }
  const AREA_TIME = { "Operations": "operacoes", "Treasury": "tesouraria", "Engineering": "engenharia", "HR": "rh", "Leadership": "diretoria" };
  /* departamentos: o MESMO campo do Builder C (atos-c.js): SK.estado.departamentos = [{ id, nome, pessoas, membros, novo }] */
  function departamentos(e) {
    if (!Array.isArray(e.departamentos)) e.departamentos = D.times.map((t) => ({ id: t.id, nome: t.nome, pessoas: t.pessoas, membros: D.pessoas.filter((p) => p.time === t.id).map((p) => p.id) }));
    return e.departamentos;
  }
  const novos = (e) => departamentos(e).filter((d) => d.novo);
  /* cada área: chave em SK.estado.guardrails (o nome de base, ou o nome do departamento criado), id e o nome que aparece (renomear em Configurações aparece aqui) */
  function areasDe(e) {
    const ds = departamentos(e);
    return D.areas.map((a) => { const d = ds.find((x) => x.id === AREA_TIME[a]); return { chave: a, id: AREA_TIME[a], rot: d ? d.nome : a }; })
      .concat(novos(e).filter((d) => !D.areas.includes(d.nome)).map((d) => ({ chave: d.nome, id: d.id, rot: d.nome, dep: d })));
  }
  /* como o Builder C: um departamento novo vê o que é dele; quem já existe não ganha acesso a ele sem você marcar */
  function sincronizarDeps(e) { novos(e).forEach((d) => { if (!e.guardrails[d.nome]) e.guardrails[d.nome] = [d.nome]; }); }
  const INTERNO = [[33, 34], [67, 34], [33, 66], [67, 66], [50, 30], [50, 66]];
  SK.ato({
    id: 7, titulo: "Access", nav: "Access",
    montar(sec) {
      const e = E(), b = B();
      guardInicial(e); departamentos(e); sincronizarDeps(e); SK.salvar();
      const AREAS = areasDe(e), self = this;
      const ENG = (AREAS.find((x) => x.chave === "Engineering") || { rot: "Engineering" }).rot;
      const raiz = el("div", { class: "ato-papel b-largo b7" });
      raiz.append(el("div", { class: "ato-cabeca b-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Access: who sees what"),
        el("p", { class: "t-sub texto-2" }, "Each area sees the skills and processes of the areas ticked. You can change it whenever you like."))));

      const engVeRH = () => e.guardrails["Engineering"].includes("HR");
      const aviso = el("div", { class: "b7-aviso" });
      let chipEngRH = null;
      function fecharPorta() {
        e.guardrails["Engineering"] = e.guardrails["Engineering"].filter((x) => x !== "HR");
        if (chipEngRH) chipEngRH.setAttribute("aria-pressed", "false");
        b.verComo = "engenharia"; SK.salvar(); desenharAviso(true); desenharMapa();
        SK.anunciar("Done. Engineering no longer sees HR.");
      }
      function desenharAviso(anim) {
        aviso.classList.toggle("aberta", engVeRH());
        if (engVeRH()) aviso.replaceChildren(
          el("span", { class: "b5-marca", "aria-hidden": "true" }, marcaMini()),
          el("div", { class: "pilha b7-aviso-txt", style: { "--gap": "8px" } },
            el("p", {}, el("span", { class: "forte" }, "I found an open door: "), "the HR hiring folder in Drive is shared with Engineering. That is why Engineering sees HR’s processes today."),
            el("p", { class: "b7-fonte t-micro texto-2" }, ic("drive", "ico-sm"), "Drive · folder “HR / Hires” · shared with the Engineering group since March")),
          btn("btn-primario b7-fechar", "Close it to Engineering", fecharPorta, ic("cadeado", "ico-sm")));
        else aviso.replaceChildren(
          el("span", { class: "b7-feito" + (anim ? " b6-carimbo" : ""), "aria-hidden": "true" }, ic("check", "ico-sm")),
          el("p", {}, el("span", { class: "forte" }, "Done. "), "Engineering no longer sees HR."));
      }
      const matriz = el("div", { class: "cartao b7-matriz" });
      AREAS.forEach((A) => {
        const a = A.chave;
        if (!Array.isArray(e.guardrails[a])) e.guardrails[a] = [a];
        const chips = el("div", { class: "b7-chips" });
        AREAS.forEach((Al) => {
          const alvo = Al.chave;
          const propria = a === alvo, sugerida = a === "Engineering" && alvo === "HR";
          const ligado = propria || e.guardrails[a].includes(alvo);
          const c = el("button", { class: "b7-chip" + (sugerida ? " suggested" : ""), type: "button", "aria-pressed": ligado ? "true" : "false", "aria-label": A.rot + " sees " + Al.rot, disabled: propria ? true : null, title: propria ? "Each area always sees its own" : null },
            el("span", { class: "b7-caixa", "aria-hidden": "true" }, propria ? ic("cadeado", "ico-sm") : ic("check", "ico-sm")), Al.rot);
          if (!propria) c.addEventListener("click", () => {
            const lista = e.guardrails[a], on = lista.includes(alvo);
            e.guardrails[a] = on ? lista.filter((x) => x !== alvo) : lista.concat(alvo);
            c.setAttribute("aria-pressed", on ? "false" : "true");
            SK.salvar(); desenharAviso(a === "Engineering" && alvo === "HR"); desenharMapa(true); resumo();
            if (a === "Engineering" && on && alvo === "HR") SK.anunciar("Engineering no longer sees HR.");
          });
          if (sugerida) chipEngRH = c;
          chips.append(c);
        });
        const dep = A.dep;
        matriz.append(el("div", { class: "b7-linha" + (a === "Engineering" ? " destaque" : "") + (dep && dep.id === b.depNovo ? " b7-nova" : "") }, el("p", { class: "b7-area" }, el("span", { class: "forte" }, A.rot), el("span", { class: "texto-2" }, " sees"), dep ? el("span", { class: "chip b7-dep-chip" }, dep.pessoas + (dep.pessoas === 1 ? " person" : " people")) : null), chips));
      });

      if (D.externos && D.externos.length) {
        if (!Array.isArray(b.fora)) b.fora = [];
        const chips = el("div", { class: "b7-chips" });
        const sempre = el("span", { class: "chip b7-sempre" }, ic("cadeado", "ico-sm"), "Always: only the processes they take part in");
        AREAS.forEach((Al) => {
          const alvo = Al.chave;
          const c = el("button", { class: "b7-chip", type: "button", "aria-pressed": b.fora.includes(alvo) ? "true" : "false", "aria-label": "Outside contacts see everything in " + Al.rot },
            el("span", { class: "b7-caixa", "aria-hidden": "true" }, ic("check", "ico-sm")), Al.rot);
          c.addEventListener("click", () => { const on = b.fora.includes(alvo); b.fora = on ? b.fora.filter((x) => x !== alvo) : b.fora.concat(alvo); c.setAttribute("aria-pressed", on ? "false" : "true"); SK.salvar(); });
          chips.append(c);
        });
        matriz.append(el("div", { class: "b7-linha b7-fora" },
          el("div", { class: "b7-area" }, el("p", {}, el("span", { class: "forte" }, "Outside contacts"), el("span", { class: "texto-2" }, " see")),
            el("p", { class: "t-micro texto-2" }, "Assistants for " + D.externos.map((x) => x.curto).join(", ").replace(/, ([^,]*)$/, " and $1"))), sempre, el("p", { class: "t-micro texto-2 b7-mais" }, "Open an entire area to someone outside:"), chips));
      }
      /* criar departamento */
      const criar = el("div", { class: "b7-criar" });
      function formCriar() {
        const nome = el("input", { class: "b7-input", type: "text", placeholder: "E.g. Finance", "aria-label": "Department name", maxlength: "40" });
        const escolhidos = new Set();
        const pessoas = el("div", { class: "b7-pessoas", role: "group", "aria-label": "Who belongs" }, ...D.pessoas.map((p) => {
          const c = el("button", { class: "b7-pessoa", type: "button", "aria-pressed": "false" }, el("span", { class: "avatar avatar-sm" }, p.iniciais), el("span", {}, p.nome));
          c.addEventListener("click", () => { const on = escolhidos.has(p.id); on ? escolhidos.delete(p.id) : escolhidos.add(p.id); c.setAttribute("aria-pressed", on ? "false" : "true"); validar(); });
          return c;
        }));
        const ok = btn("btn-primario btn-sm", "Create department", () => {
          const n = nome.value.replace(/\s+/g, " ").trim(); if (!n) return;
          const ds = departamentos(e);
          if (ds.some((d) => semAcento(d.nome) === semAcento(n)) || D.areas.some((a) => semAcento(a) === semAcento(n))) { aviso2.textContent = "A department with that name already exists."; return; }
          let id = "dep-" + (semAcento(n).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "novo"), k = 2;
          while (ds.some((d) => d.id === id)) id = id.replace(/-\d+$/, "") + "-" + k++;
          ds.push({ id, nome: n, pessoas: escolhidos.size, membros: [...escolhidos], novo: true });
          b.depNovo = id; sincronizarDeps(e); SK.salvar();
          document.dispatchEvent(new CustomEvent("sk:departamentos", { detail: { criado: id } }));
          SK.anunciar("Department " + n + " created. It is now in the table and in the brain.");
          soltar(); sec.replaceChildren(); self.montar(sec);
          const linha = sec.querySelector(".b7-nova"); if (linha) linha.scrollIntoView({ block: "center", behavior: SK.reduzido() ? "auto" : "smooth" });
        }, ic("mais", "ico-sm"));
        const aviso2 = el("p", { class: "t-micro b7-erro", "aria-live": "polite" });
        const validar = () => { ok.disabled = !nome.value.trim(); aviso2.textContent = ""; };
        nome.addEventListener("input", validar);
        nome.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); ok.click(); } });
        validar();
        criar.replaceChildren(el("div", { class: "b7-form entra" },
          el("label", { class: "b7-rotulo" }, el("span", { class: "forte t-pequeno" }, "Name"), nome),
          el("div", { class: "b7-rotulo" }, el("span", { class: "forte t-pequeno" }, "Who belongs"), el("span", { class: "t-micro texto-2" }, "You can choose later. A person can be in more than one."), pessoas),
          aviso2,
          el("div", { class: "fila" }, ok, btn("btn-quieto btn-sm", "Cancel", fechado))));
        nome.focus();
      }
      function fechado() { criar.replaceChildren(btn("btn-secundario btn-sm b7-criar-btn", "Create department", formCriar, ic("mais", "ico-sm"))); }
      fechado();
      matriz.append(criar);
      const abas = el("div", { class: "segmentado", role: "tablist", "aria-label": "See the brain as" });
      const comoVoce = el("button", { role: "tab", type: "button", on: { click: () => trocar("voce") } }, "How you see it");
      const comoEng = el("button", { role: "tab", type: "button", on: { click: () => trocar("engenharia") } }, ic("olho", "ico-sm"), "View as " + ENG);
      comoEng.style.display = "inline-flex"; comoEng.style.alignItems = "center"; comoEng.style.gap = "6px";
      abas.append(comoVoce, comoEng);
      const mapa = el("div", { class: "b7-mapa canvas" });
      const legenda = el("p", { class: "t-pequeno texto-2 b7-legenda", "aria-live": "polite" });
      const previa = el("div", { class: "cartao b7-previa" }, el("div", { class: "fila b7-previa-topo" }, el("h2", { class: "b-h2" }, "The brain"), abas), mapa, legenda);
      raiz.append(aviso, el("div", { class: "b7-grade" }, matriz, previa),
        el("div", { class: "fila b7-fim" }, btn("btn-secundario", "Next: what comes after", () => SK.ir(8), ic("seta", "ico-sm"))));
      sec.append(raiz);

      /* mapa: times ao redor da empresa */
      const POS = { tl: [17, 25], tc: [50, 16], tr: [83, 25], ml: [12, 50], mr: [88, 50], bl: [17, 74], bc: [50, 80], br: [83, 74] };
      const nomeDep = (t) => { const d = departamentos(e).find((x) => x.id === t.id); return d ? d.nome : t.nome; };
      const svg = el("svg", { class: "b7-linhas", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" });
      const nos = new Map(), tracos = new Map();
      D.times.forEach((t) => {
        const [x, y] = POS[t.celula];
        const l = el("line", { x1: "50", y1: "50", x2: String(x), y2: String(y), "vector-effect": "non-scaling-stroke" });
        svg.append(l); tracos.set(t.id, l);
        const n = el("div", { class: "b7-no" + (t.celula[0] === "t" ? " b7-no-cima" : ""), style: { left: x + "%", top: y + "%" } }, el("span", { class: "b7-ponto" }), el("span", { class: "b7-rot" }, el("span", { class: "b7-no-nome" }, nomeDep(t)), el("span", { class: "b7-no-n num" }, t.pessoas + " people")));
        nos.set(t.id, n);
      });
      novos(e).forEach((d, i) => {
        const [x, y] = INTERNO[i % INTERNO.length];
        const l = el("line", { x1: "50", y1: "50", x2: String(x), y2: String(y), "vector-effect": "non-scaling-stroke" });
        svg.append(l); tracos.set(d.id, l);
        nos.set(d.id, el("div", { class: "b7-no b7-no-novo" + (d.id === b.depNovo ? " entra-lento" : ""), style: { left: x + "%", top: y + "%" } }, el("span", { class: "b7-ponto" }), el("span", { class: "b7-rot" }, el("span", { class: "b7-no-nome" }, d.nome), el("span", { class: "b7-no-n num" }, d.pessoas + (d.pessoas === 1 ? " person" : " people")))));
      });
      const centro = el("div", { class: "b7-no b7-centro", style: { left: "50%", top: "50%" } }, el("span", { class: "b7-ponto" }), el("span", { class: "b7-rot" }, el("span", { class: "b7-no-nome" }, "Lume")));
      const oculto = el("div", { class: "b7-oculto" });
      const fantasmas = new Map();
      D.times.forEach((t) => { const [x, y] = POS[t.celula]; fantasmas.set(t.id, el("span", { class: "b7-fantasma", "aria-hidden": "true", style: { left: x + "%", top: y + "%" } })); });
      mapa.append(svg, ...fantasmas.values(), ...nos.values(), centro, oculto);

      const todosTimes = () => D.times.map((t) => Object.assign({}, t, { nome: nomeDep(t) })).concat(novos(e).map((d) => ({ id: d.id, nome: d.nome, pessoas: d.pessoas, area: d.nome })));
      function visiveis(como) {
        const vistos = como === "engenharia" ? e.guardrails["Engineering"] : AREAS.map((x) => x.chave);
        return todosTimes().filter((t) => { const area = t.area || Object.keys(AREA_TIME).find((k) => AREA_TIME[k] === t.id); return !area || vistos.includes(area); }).map((t) => t.id);
      }
      function desenharMapa() {
        const como = b.verComo || "voce";
        const vis = visiveis(como);
        nos.forEach((n, id) => { const v = vis.includes(id); n.classList.toggle("some", !v); n.setAttribute("aria-hidden", v ? "false" : "true"); });
        tracos.forEach((l, id) => l.classList.toggle("some", !vis.includes(id)));
        centro.querySelector(".b7-no-nome").textContent = como === "engenharia" ? "Lume, for " + ENG : "Lume";
        mapa.classList.toggle("como-eng", como === "engenharia");
        const fora = todosTimes().filter((t) => !vis.includes(t.id));
        const procs = D.processos.filter((p) => fora.some((t) => t.id === p.time));
        if (como !== "engenharia") legenda.textContent = "You see the " + todosTimes().length + " departments and all the processes.";
        else if (!fora.length) legenda.textContent = "Today " + ENG + " sees everything, like you.";
        else {
          const nomes = fora.map((t) => t.nome).join(", ").replace(/, ([^,]*)$/, " and $1");
          legenda.textContent = "For people in " + ENG + ", " + nomes + (fora.length > 1 ? " disappear: " : " disappears: ") + fora.reduce((s, t) => s + t.pessoas, 0) + " people, " + procs.length + (procs.length === 1 ? " process" : " processes") + " (" + procs.map((p) => p.nome).join(", ") + ") and the skills " + (fora.length > 1 ? "of those areas" : "of " + nomes) + " in Claude and Slack.";
        }
        oculto.textContent = como === "engenharia" && fora.length ? fora.map((t) => t.nome).join(", ").replace(/, ([^,]*)$/, " and $1") + " hidden from " + ENG : "";
        fantasmas.forEach((f, id) => f.classList.toggle("vis", como === "engenharia" && fora.some((t) => t.id === id)));
        comoVoce.setAttribute("aria-selected", como === "voce" ? "true" : "false");
        comoEng.setAttribute("aria-selected", como === "engenharia" ? "true" : "false");
      }
      function trocar(como) { b.verComo = como; SK.salvar(); desenharMapa(); }
      function resumo() {}
      desenharAviso(); desenharMapa();
      b.depNovo = null;
      const aoMudarDeps = () => { if (!sec.isConnected || sec.hidden) return; soltar(); sec.replaceChildren(); self.montar(sec); };
      document.removeEventListener("sk:departamentos", self._ouvinte || (() => {}));
      self._ouvinte = (ev) => { if (!(ev.detail && ev.detail.criado === b.depNovo)) setTimeout(aoMudarDeps, 0); };
      document.addEventListener("sk:departamentos", self._ouvinte);
    },
    entrar() { const m = document.querySelector('section.ato:not([hidden]) .b7-matriz'); if (m && SK.escalonar && !SK.reduzido()) SK.escalonar(m, 45); },
    sair() { soltar(); if (this._ouvinte) { document.removeEventListener("sk:departamentos", this._ouvinte); this._ouvinte = null; } },
    padrao(e) { guardInicial(e); e.guardrails["Engineering"] = e.guardrails["Engineering"].filter((x) => x !== "HR"); },
  });

  /* =================================================================== SKILLS (#/skills): a lista; abre a tela da skill (#/ato-6) */
  SK.ato({
    id: "skills", titulo: "Skills", nav: "Skills",
    montar(sec) {
      const e = E(), r = R(), aprovada = !!e.regraAprovada, ef = efeito(mudou(r) ? r : REGRA_COMPLETA);
      const raiz = el("div", { class: "ato-papel b-largo b9" });
      raiz.append(el("div", { class: "ato-cabeca b-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Skills"),
        el("p", { class: "t-sub texto-2" }, aprovada ? "The rules you approved, working where the team already asks." : "Each gap you close becomes a skill. There are none yet."))));
      if (aprovada) {
        const onde = CANAIS.filter((c) => e.skillEm && e.skillEm[c.id]);
        const holder9 = el("div", { class: "b-carga" }); raiz.append(holder9);
        carga(holder9, el("ul", { class: "lista cartao b-cartao-lista b9-lista" }, el("li", {},
          el("button", { class: "linha linha-botao b9-linha", type: "button", on: { click: () => SK.ir(6) } },
            el("span", { class: "b6-selo ok", "aria-hidden": "true" }, ic("check")),
            el("span", { class: "linha-principal" }, el("span", { class: "forte" }, D.skill.nome), el("span", { class: "t-pequeno texto-2" }, D.skill.versao + " · approved by " + D.skill.aprovadaPor + " " + D.skill.quando + " · " + faixas(r).length + " parts in the rule")),
            el("span", { class: "linha-meta b9-meta" },
              el("span", { class: "b9-onde" }, ...(onde.length ? onde.map((c) => marcaCanal(c, true)) : [el("span", { class: "t-pequeno texto-2" }, "nowhere yet")])),
              el("span", { class: "chip chip-ok" }, ef.horas + " h a month back"),
              ic("seta", "ico-sm"))))), "lista", "skills");
      } else {
        raiz.append(el("div", { class: "cartao b9-vazio" }, el("span", { class: "b6-selo", "aria-hidden": "true" }, ic("processo")),
          el("h2", { class: "b-h2" }, "The first skill comes from one question"),
          el("p", { class: "texto-2" }, "The biggest gap, " + D.buracos[0].titulo.toLowerCase() + ", closes with one answer from you. " + efeitoBuraco("antecipacao")),
          btn("btn-primario", "Improve with one question", () => SK.ir(5), ic("seta", "ico-sm"))));
      }
      sec.append(raiz);
    },
    sair() { soltar(); },
  });

  /* =================================================================== 8 · INÍCIO (a tela de todo dia) */
  function irBuraco(id) { if (id === "antecipacao" && !E().regraAprovada) { SK.ir(5); return; } B().sel4 = id; SK.salvar(); SK.ir(4); }
  SK.ato({
    id: 8, titulo: "Home", nav: "Home",
    montar(sec) {
      const e = E(), r = R(), aprovada = !!e.regraAprovada;
      const ef = efeito(mudou(r) ? r : REGRA_COMPLETA);
      const usando = Object.values(e.skillEm || {}).some(Boolean);
      const raiz = el("div", { class: "ato-papel b-largo b8 b8-inicio" });
      const hoje = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
      raiz.append(el("div", { class: "b8-saudacao" },
        el("div", { class: "pilha", style: { "--gap": "6px" } }, el("h1", { class: "t-titulo" }, "Good morning, " + D.usuaria.primeiro + "."), el("p", { class: "t-sub texto-2" }, hoje.charAt(0).toUpperCase() + hoje.slice(1) + ". " + (aprovada ? "One gap closed; the next is waiting." : "The first gap closes with one question.")))));

      /* (1) a semana em quatro números */
      const T = (v, rot, ok, i, num) => { const vEl = el("p", { class: "b8-num-v num" + (ok ? " ok" : "") }, v); const t = el("div", { class: "b8-num entra", style: { "--atraso": 60 + i * 70 + "ms" } }, vEl, el("p", { class: "t-pequeno texto-2" }, rot)); if (num != null) t._contar = () => contarExato(vEl, num, (x) => SK.fmt(x), 900); return t; };
      const nums = [
        T(aprovada ? "1" : "0", "gap closed this week", aprovada, 0),
        T(aprovada ? String(ef.horas) : "0", "hours a month returned to the team", aprovada, 1, aprovada ? ef.horas : null),
        T(aprovada ? mi(ef.liberados) : "R$ 0", "a month stopped waiting for approval", aprovada, 2),
        T(aprovada ? "1" : "0", aprovada && usando ? "skill in use, " + D.uso.semana + " uses this week" : "skill in use", false, 3),
      ];
      this._nums = nums;
      raiz.append(el("div", { class: "b8-nums" }, ...nums));

      /* (2) esperando você, por impacto */
      const abertos = D.buracos.filter((x) => !(aprovada && x.id === "antecipacao"));
      const linhaAcao = (txt, imp, acaoTxt, acao, extra) => {
        const b = el("button", { class: "btn btn-secundario btn-sm b8-aceitar", type: "button" }, acaoTxt);
        b.addEventListener("click", acao || (() => { b.replaceChildren(ic("check", "ico-sm"), "Done"); b.classList.add("feito"); b.setAttribute("aria-pressed", "true"); }));
        return el("li", { class: "linha b8-acao-linha" }, el("span", { class: "linha-principal" }, extra || null, el("span", { class: "b8-acao-txt" }, txt), el("span", { class: "b8-imp t-pequeno" }, ic("relampago", "ico-sm"), imp)), el("span", { class: "linha-meta" }, b));
      };
      const proximo = abertos[0];
      const espera = el("section", { class: "cartao b8-bloco b8-espera" },
        el("div", { class: "b8-bloco-cab" }, el("h2", { class: "b-h2" }, "Waiting for you"), el("span", { class: "t-pequeno texto-2" }, "from biggest impact to smallest")),
        el("ul", { class: "lista" },
          linhaAcao(proximo.titulo, efeitoBuraco(proximo.id), proximo.id === "antecipacao" ? "Improve with one question" : "Open", () => irBuraco(proximo.id), el("span", { class: "chip chip-brasa b8-chip-tipo" }, aprovada ? "Next gap" : "Biggest gap")),
          linhaAcao(abertos[1].titulo, efeitoBuraco(abertos[1].id), "Open", () => irBuraco(abertos[1].id), el("span", { class: "chip b8-chip-tipo" }, "Gap"))),
        el("div", { class: "b8-conceito" },
          el("div", { class: "b8-bloco-cab" }, el("h3", { class: "b-h3" }, "From last night’s review"), el("span", { class: "tag-conceito" }, "Concept · not available yet")),
          el("ul", { class: "lista" },
            linhaAcao(D.depois.novo, "about 18 hours a month, if nobody else does it by hand", "Make it a skill", null, el("span", { class: "chip b8-chip-tipo" }, "New process")),
            linhaAcao(D.depois.melhoria, "20 minutes less per case", "Apply", null, el("span", { class: "chip b8-chip-tipo" }, "Improvement")),
            linhaAcao("New lesson: when the merchant has a recent chargeback, Treasury always calls you.", "becomes a rule in one click", "Make it a rule"),
            linhaAcao("I merged 2 refund step-by-steps that said the same thing.", "one place for the team to look", "Accept"),
            linhaAcao("I retired “Manual merchant registration”: nobody has used it since August.", "one less process to maintain", "Accept"))));

      /* (3) o que melhorou */
      const melhorou = el("section", { class: "cartao b8-bloco" }, el("h2", { class: "b-h2" }, "What improved"));
      if (aprovada) {
        const g = grafico({ compacto: true });
        g.selecionar("antecipacao");
        melhorou.append(el("p", { class: "forte" }, D.buracos[0].titulo),
          el("div", { class: "b8-antes-depois" },
            el("div", { class: "numero" }, el("span", { class: "numero-valor num b-antes-depois" }, el("s", { class: "b-antes" }, "1.8 days"), el("span", { class: "b8-ok" }, ef.esperaCurta)), el("span", { class: "numero-rotulo" }, "wait, median")),
            el("div", { class: "numero" }, el("span", { class: "numero-valor num b8-ok" }, String(D.uso.semChamar)), el("span", { class: "numero-rotulo" }, "from " + D.uso.semana + " uses without calling you"))),
          g.el);
        this._g = () => SK.depois(400, () => g.mover(ef.intensidade, "now · " + ef.esperaTxt, true, "before · 1.8 days"));
      } else {
        this._g = null;
        melhorou.append(el("div", { class: "b6-vazio b8-vazio" }, ic("relampago", "ico-lg"), el("p", { class: "texto-2" }, "Nothing yet. The biggest gap closes with one answer from you."), btn("btn-primario btn-sm", "Close the first one", () => SK.ir(5), ic("seta", "ico-sm"))));
      }

      /* (4) buracos abertos */
      const listaAbertos = el("section", { class: "cartao b8-bloco" }, el("div", { class: "b8-bloco-cab" }, el("h2", { class: "b-h2" }, "Open gaps"), el("a", { class: "b8-veio t-pequeno", href: "#/ato-4" }, "See the " + abertos.length)),
        el("ul", { class: "lista" }, abertos.slice(0, 4).map((bu) => el("li", {}, el("button", { class: "linha linha-botao b8-aberto", type: "button", on: { click: () => irBuraco(bu.id) } }, el("span", { class: "linha-principal" }, el("span", { class: "forte" }, bu.titulo), el("span", { class: "t-micro texto-2" }, bu.frequencia)), el("span", { class: "linha-meta" }, el("span", { class: "chip " + (bu.intensidade >= 0.5 ? "chip-brasa" : "") }, CUSTO[bu.id]), ic("seta", "ico-sm")))))));

      /* (5) fontes */
      const conectadas = e.conectadas && e.conectadas.length ? e.conectadas : ["intercom", "tldv"];
      const su = e.suite || "google";
      const cob = D.coberturaDe ? D.coberturaDe(conectadas, su) : 53;
      const ganhoDe = (id) => (D.ganhoDe ? D.ganhoDe(id, su) : (D.cobertura && D.cobertura.porFonte[id]) || 0);
      const ganhos = (D.porGanho ? D.porGanho(su) : D.integracoes).filter((it) => !conectadas.includes(it.id) && !it.conceito).map((it) => ({ it, g: ganhoDe(it.id) })).slice(0, 2);
      const abrirFontes = () => { if (SK.fontes && typeof SK.fontes.abrir === "function") SK.fontes.abrir(); else SK.ir(3); };
      const fontes = el("section", { class: "cartao b8-bloco" }, el("div", { class: "b8-bloco-cab" }, el("h2", { class: "b-h2" }, "Sources"), el("span", { class: "t-pequeno texto-2" }, cob + "% of the work in view")),
        el("div", { class: "b8-barra", role: "img", "aria-label": cob + "% of the work the map sees" }, el("span", { class: "b8-barra-ch", style: { width: cob + "%" } })),
        el("ul", { class: "lista" }, ganhos.map(({ it, g }) => linhaAcao("Connect " + it.nome, "+" + g + " points of the work in view" + (it.acrescentaria ? ": " + it.acrescentaria : ""), "Connect", abrirFontes, (typeof SK.marca === "function") ? SK.marca(it.id, "mf-sm") : null))));

      /* perguntas que chegaram no cérebro (por papel, nunca por pessoa) */
      const PERG = { total: 11, sozinho: 9, papeis: [["Leadership", 6], ["Sales", 3], ["Investor", 2]],
        esperando: [{ papel: "Leadership", txt: "What is the average rate on advances this quarter?", imp: "the spreadsheet has the data; you still need to say how to calculate it" },
          { papel: "Investor", txt: "How much of November’s volume was advanced?", imp: "month still open: the rule asks for your ok" }] };
      const perguntas = el("section", { class: "cartao b8-bloco" }, el("div", { class: "b8-bloco-cab" }, el("h2", { class: "b-h2" }, "Questions that reached the brain"), el("span", { class: "t-pequeno texto-2" }, "this week")),
        el("div", { class: "b8-perg-nums" },
          el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, String(PERG.total)), el("span", { class: "numero-rotulo" }, "questions")),
          el("div", { class: "numero" }, el("span", { class: "numero-valor num b8-ok" }, String(PERG.sozinho)), el("span", { class: "numero-rotulo" }, "answered without calling you")),
          el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, String(PERG.total - PERG.sozinho)), el("span", { class: "numero-rotulo" }, "waiting for you"))),
        el("ul", { class: "lista" }, PERG.esperando.map((q) => linhaAcao(q.txt, q.imp, "Answer and make it a rule", null, el("span", { class: "chip b8-chip-tipo" }, "Question " + ({ Investidor: "from the investor", Diretoria: "from Leadership", Comercial: "from Sales" }[q.papel] || "from " + q.papel))))),
        el("p", { class: "t-pequeno texto-2 b8-papeis" }, "Who asks, by role: ", ...PERG.papeis.map(([p, n], i) => el("span", { class: "chip" }, p + " " + n))));
      const holder8 = el("div", { class: "b-carga" }); raiz.append(holder8);
      carga(holder8, el("div", { class: "b8-inicio-grade" }, el("div", { class: "pilha", style: { "--gap": "16px" } }, espera, listaAbertos), el("div", { class: "pilha", style: { "--gap": "16px" } }, melhorou, perguntas, fontes)), "cartoes", "inicio");

      /* (6) o ciclo, uma linha */
      const feito = { ler: true, mapear: true, buracos: e.vistos.includes(4), perguntas: mudou(r) && (B().conversa || []).length > 0 || aprovada, skills: aprovada, uso: aprovada && usando, "ler de novo": false };
      raiz.append(el("p", { class: "b8-ciclo-linha" }, ...D.depois.ciclo.map((p, i) => el("span", { class: "b8-ciclo-p" + (feito[p] ? " done" : "") }, i ? el("span", { class: "b8-ciclo-seta", "aria-hidden": "true" }, ic("seta", "ico-sm")) : null, feito[p] ? ic("check", "ico-sm") : null, ({ ler: "read", mapear: "map", buracos: "gaps", perguntas: "questions", skills: "skills", uso: "use", "ler de novo": "read again" })[p] || p)), el("span", { class: "texto-2 b8-ciclo-frase-p" }, "Each round leaves the map more complete and the gaps smaller.")));
      sec.append(raiz);
    },
    entrar() { (this._nums || []).forEach((t) => t._contar && t._contar()); if (this._g) this._g(); },
    sair() { soltar(); },
  });
})();
