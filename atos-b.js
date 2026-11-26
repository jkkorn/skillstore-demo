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
  const rs = (v) => (v >= 1000 && v % 1000 === 0 ? "R$ " + SK.fmt(v / 1000) + " mil" : "R$ " + SK.fmt(v));

  /* ---------- o gráfico de buracos (frequência x intensidade) ---------- */
  /* buraco 10 (Y6c): enquanto não estiver em dados.js, entra aqui; contagens seguem D.buracos.length */
  if (!D.buracos.some((x) => x.id === "perguntas-repetidas")) {
    D.buracos.push({ id: "perguntas-repetidas", titulo: "As mesmas perguntas chegam em você toda semana", porMes: 14, frequencia: "14 por mês", intensidade: 0.5, processo: "antecipacao",
      dor: "14 perguntas por mês; 11 têm resposta na planilha. Cada uma te interrompe.", numeros: { perguntas: 14, naPlanilha: 11 },
      proposta: "Deixar o cérebro responder o que já está na planilha, com a origem ao lado." });
  }
  if (D.final) D.final.buracos = D.buracos.length;
  const CURTO = { "perguntas-repetidas": "Perguntas repetidas", antecipacao: "Antecipação", "primeira-resposta": "Resposta em 1 hora", "troca-conta": "Troca de conta", "repasse-retido": "Repasse retido", conciliacao: "Conciliação à mão", "taxa-especial": "Taxa especial", chargeback: "Prazo de chargeback", incidente: "Aviso de incidente", admissao: "Acessos na admissão" };
  const INT_RESOLVIDA = 0.2;
  const CURTO_M = { "perguntas-repetidas": "Perguntas", antecipacao: "Antecipação", "primeira-resposta": "Resposta 1h", "troca-conta": "Troca de conta", "repasse-retido": "Repasse retido", conciliacao: "Conciliação", "taxa-especial": "Taxa especial", chargeback: "Chargeback", incidente: "Incidente", admissao: "Admissão" };
  const CUSTO = { "perguntas-repetidas": "14 interrupções por mês", antecipacao: "1,8 dia e R$ 1,2 mi parados", "primeira-resposta": "55 lojistas por mês esperam 2h26", "troca-conta": "7 lojistas por mês sem aprovação", "repasse-retido": "9 lojistas por mês, 3 critérios", conciliacao: "50 minutos por dia", "taxa-especial": "3 dias de espera", chargeback: "4 disputas perdidas em outubro", incidente: "2 avisos por mês do zero", admissao: "2 dias sem acesso" };
  const lx = (v) => 7 + 86 * (Math.log(v / 1.5) / Math.log(70 / 1.5));
  const ly = (i) => 8 + 82 * (1 - i);

  function grafico({ compacto = false, aoSelecionar, aoPairar, resolvido = false, fechado = false, foco = false } = {}) {
    const so1 = compacto || foco;
    const raiz = el("div", { class: "bg" + (compacto ? " bg-compacto" : "") });
    const area = el("div", { class: "bg-area" });
    const linhas = el("div", { class: "bg-grade", "aria-hidden": "true" });
    [2, 5, 10, 25, 50].forEach((v) => linhas.append(el("span", { class: "bg-tick", style: { left: lx(v) + "%" } }, el("span", { class: "bg-tick-n num" }, String(v)))));
    const yAlto = el("span", { class: "bg-y bg-y-alto", "aria-hidden": "true" }, "Dói mais");
    const yBaixo = el("span", { class: "bg-y bg-y-baixo", "aria-hidden": "true" }, "Dói menos");
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
    const eixo = el("div", { class: "bg-x", "aria-hidden": "true" }, el("span", {}, "Acontece pouco"), el("span", { class: "bg-x-meio" }, "vezes por mês"), el("span", {}, "Acontece muito", ic("seta", "ico-sm")));
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
      r.textContent = fechado ? "Antecipação\nfechado esta semana" : "Antecipação · 2 horas";
      r.dataset.fixo = r.textContent; if (fechado) { r.classList.add("bg-rot-fechado"); r.dataset.curto = "Fechado\nesta semana"; }
      if (fechado) { m.classList.add("fechada"); raiz.classList.add("bg-fechado"); }
      traco.setAttribute("y2", String(ly(alvoI) - 4)); trilha.style.height = (ly(alvoI) - ly(0.92)) + "%";
      raiz.classList.add("bg-resolvido", "bg-trilha-on");
      m.setAttribute("aria-label", "1. " + D.buracos[0].titulo + (fechado ? ". Fechado esta semana: espera de 1,8 dia para 2 horas." : ". Resolvido: espera de 1,8 dia para 2 horas."));
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
      r.textContent = rotulo || "Antecipação"; r.dataset.fixo = r.textContent;
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
  const DOUGLAS = () => (D.porId && D.porId("douglas")) || { nome: "Douglas Nery", primeiro: "Douglas", iniciais: "DN", cargo: "Diretor Financeiro" };
  const REGRA_COMPLETA = { auto: 5000, tes: 50000, slack: true, exc: true, quem: true };
  const R = () => { const b = B(); b.r = b.r || { auto: null, tes: null, slack: false, exc: false, quem: false }; return b.r; };
  const mudou = (r) => !!(r.auto || r.tes || r.slack || r.exc);
  const destino = (v, r) => (r.auto && v < r.auto ? "auto" : r.tes && v <= r.tes ? "tes" : r.slack ? "slack" : "email");
  const conta = (f) => PEDIDOS.filter(f).length;
  const soma = (f) => PEDIDOS.filter(f).reduce((s, v) => s + v, 0);
  const mi = (v) => (v >= 950000 ? "R$ " + (v / 1e6).toFixed(1).replace(".", ",") + " mi" : "R$ " + SK.fmt(Math.round(v / 1000)) + " mil");
  function faixas(r) {
    const out = []; let lo = 0;
    if (r.auto) { out.push({ tipo: "auto", txt: "Abaixo de " + rs(r.auto) + ": aprovação automática", n: conta((v) => v < r.auto) }); lo = r.auto; }
    if (r.tes) { out.push({ tipo: "tes", txt: (lo ? "De " + rs(lo) + " a " + rs(r.tes) : "Até " + rs(r.tes)) + ": a Tesouraria aprova", n: conta((v) => destino(v, r) === "tes") }); lo = r.tes; }
    const resto = conta((v) => destino(v, r) === "slack" || destino(v, r) === "email");
    out.push({ tipo: r.slack ? "slack" : "email", txt: (lo ? "Acima de " + rs(lo) : "Todos os pedidos") + (r.slack ? ": vão para o #antecipacoes, Marina ou " + DOUGLAS().primeiro + " aprovam" : ": a Marina aprova, por e-mail"), n: resto });
    if (r.exc) out.push({ tipo: "exc", txt: "Chargeback nos últimos 90 dias: sempre a Marina, qualquer valor", n: null });
    return out;
  }
  function efeito(r) {
    const espera = PEDIDOS.map((v) => ({ auto: 0, tes: 2, slack: 2, email: 43 })[destino(v, r)]).sort((a, b) => a - b)[11];
    const fora = (v) => destino(v, r) !== "email";
    return {
      espera, esperaTxt: espera === 0 ? "na hora" : espera === 2 ? "2 horas" : "1,8 dia", esperaCurta: espera === 0 ? "0 h" : espera === 2 ? "2 h" : "1,8 dia",
      intensidade: espera === 0 ? 0.12 : espera === 2 ? 0.2 : 0.92,
      parados: soma((v) => !fora(v)), liberados: soma(fora), horas: Math.round((conta(fora) * 80) / 60), saem: conta(fora),
    };
  }
  function decidir(v, chargeback) {
    const r = R(), d = destino(v, r);
    if (chargeback && r.exc) return { txt: "Esta não. A Loja Ventana teve chargeback em 8 de novembro. Pela regra, passa pela Marina, qualquer valor.", chamar: true };
    if (d === "auto") return { txt: "Pode seguir: abaixo de " + rs(r.auto) + ", a aprovação é automática." + (chargeback ? " Atenção: a loja teve chargeback recente." : "") };
    if (d === "tes") return { txt: "Pode. " + (r.auto ? "De " + rs(r.auto) + " a " + rs(r.tes) : "Até " + rs(r.tes)) + ", a Tesouraria aprova." + (chargeback ? " A loja teve chargeback recente, mas a regra ainda não diz nada sobre isso." : " Conferi: não houve chargeback nos últimos 90 dias.") };
    if (d === "slack") return { txt: B().guarda && B().guarda.escreve === false ? "Este vai para o #antecipacoes, mas eu não posso escrever lá: peça o ok à Marina ou ao " + DOUGLAS().primeiro + "." : "Mandei para o #antecipacoes. Marina ou " + DOUGLAS().primeiro + " dão o ok por lá.", canal: true };
    return { txt: "Este passa pela Marina, por e-mail.", chamar: true };
  }
  /* o que uma sugestão faria, calculado com a mesma regra */
  function impactoSugestao(o, r, b) {
    const n = semAcento(o), simula = (mud) => { const r2 = Object.assign({}, r, mud); return r2; };
    const saiDoEmail = (r2) => conta((v) => destino(v, r) === "email" && destino(v, r2) !== "email");
    if (/^quantos/.test(n)) return "só pergunta, não muda a regra";
    if (/automat/.test(n)) { const v = b.ultimo || 5000; return conta((x) => x < v) + " pedidos por mês saem na hora"; }
    if (/tesouraria/.test(n)) { const r2 = simula({ tes: 50000 }); return conta((v) => destino(v, r2) === "tes") + " por mês sem passar por você"; }
    if (/slack|#/.test(n)) { const k = saiDoEmail(simula({ slack: true })); return k + " por mês fora do seu e-mail"; }
    if (/chargeback/.test(n)) return "segura o risco: lojista com chargeback sempre passa por você";
    if (/particip/.test(n)) return "mostra quem faz cada parte, antes e depois";
    return "";
  }
  const EFEITO = {
    "primeira-resposta": "A promessa pública volta a valer em 55 de 60 conversas por mês.",
    "troca-conta": "7 trocas de conta por mês passam a ter quem confira o titular.",
    "repasse-retido": "9 repasses retidos por mês passam a ter a mesma resposta, seja quem for que pegue.",
    conciliacao: "Cerca de 18 horas por mês de volta (50 minutos em 22 manhãs); sobra só conferir as diferenças.",
    "taxa-especial": "6 propostas por mês deixam de esperar 3 dias pela resposta.",
    chargeback: "Nenhuma disputa perdida por prazo (foram 4 em outubro).",
    incidente: "O aviso ao lojista sai pronto no meio da crise, sem escrever do zero.",
    admissao: "Pessoa nova trabalha no primeiro dia, sem esperar 2 dias por acesso.",
    "perguntas-repetidas": "11 de 14 perguntas por mês respondidas na hora, com a origem; você só vê as outras 3.",
  };
  function efeitoBuraco(id) {
    if (id === "antecipacao") { const ef = efeito(REGRA_COMPLETA); return ef.saem + " pedidos por mês deixam de esperar 1,8 dia; " + mi(ef.liberados) + " por mês sem esperar aprovação."; }
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
    const n = semAcento(t).replace(/(\d)\.(\d{3})/g, "$1$2"), out = [];
    const re = /(r\$\s*)?(\d+(?:,\d+)?)\s*(mil|k)?/g; let m;
    while ((m = re.exec(n))) { if (!m[1] && !m[3]) continue; let v = parseFloat(m[2].replace(",", ".")); if (m[3]) v *= 1000; out.push(Math.round(v)); }
    return out;
  }

  /* =================================================================== 4 · BURACOS */
  SK.ato({
    id: 4, titulo: "Buracos", nav: "Buracos",
    montar(sec) {
      const e = E(), resolvido = !!e.buracoResolvido, fechado = resolvido && !!e.regraAprovada;
      const raiz = el("div", { class: "ato-papel b-largo b4" });
      const cab = el("div", { class: "ato-cabeca b-cabeca" },
        el("div", { class: "pilha", style: { "--gap": "10px" } },
          el("h1", { class: "t-titulo" }, D.buracos.length + " buracos nos processos da Lume"),
          el("p", { class: "t-sub texto-2" }, fechado ? "Um fechado esta semana, com uma resposta sua. Os outros esperam a vez." : resolvido ? "Um deles você resolveu hoje. Falta aprovar a regra." : "Onde o trabalho para e espera. Mais à direita, acontece mais. Mais alto, dói mais.")));
      raiz.append(cab);

      if (B().sel4) { this._sel = B().sel4; B().sel4 = null; SK.salvar(); }
      let selId = this._sel && D.buracos.some((b) => b.id === this._sel) ? this._sel : "antecipacao";
      const detalhe = el("div", { class: "cartao b4-detalhe", "aria-live": "polite" });
      const g = grafico({ aoSelecionar: (id) => selecionar(id, true), aoPairar: (id) => { g.pairar(id); linhas.forEach((l, k) => l.classList.toggle("pairada", k === id)); }, resolvido, fechado });
      const plot = el("div", { class: "cartao b4-plot" }, el("h2", { class: "b-h2" }, "Frequência e intensidade"), g.el);
      const grade = el("div", { class: "b4-grade" }, plot, detalhe);

      const lista = el("ol", { class: "lista b4-lista", "aria-label": "Buracos do maior para o menor" });
      const linhas = new Map();
      D.buracos.forEach((b, i) => {
        const res = resolvido && b.id === "antecipacao";
        const nivel = res ? (fechado ? "Fechado esta semana" : "Resolvido hoje") : CUSTO[b.id];
        const l = el("button", { class: "linha linha-botao b4-linha", type: "button", on: { click: () => selecionar(b.id, true), mouseenter: () => g.pairar(b.id), mouseleave: () => g.pairar(null) } },
          el("span", { class: "b4-n num " + (res ? "resolvida" : b.intensidade >= 0.75 ? "forte" : b.intensidade >= 0.5 ? "medio" : "baixo") }, String(i + 1)),
          el("span", { class: "linha-principal" }, el("span", { class: "forte" }, b.titulo), el("span", { class: "t-pequeno texto-2" }, res ? "A espera caiu de 1,8 dia para 2 horas. R$ 1,2 milhão por mês deixou de esperar." : b.dor)),
          el("span", { class: "linha-meta" }, el("span", { class: "b4-freq num" }, b.frequencia), el("span", { class: "chip b4-custo " + (res ? "chip-ok" : b.intensidade >= 0.5 ? "chip-brasa" : "") }, nivel)));
        linhas.set(b.id, l);
        lista.append(el("li", {}, l));
      });
      const blocoLista = el("section", { class: "b4-ranking", "aria-label": "Lista" }, el("h2", { class: "b-h2" }, "Do maior para o menor"), el("div", { class: "cartao b-cartao-lista" }, lista));
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
          el("span", { class: "chip" }, i === 0 ? "O maior buraco" : (i + 1) + "º de " + D.buracos.length),
          proc ? el("span", { class: "chip" }, ic("processo", "ico-sm"), proc.nome) : null,
          res ? el("span", { class: "chip chip-ok" }, ic("check", "ico-sm"), fechado ? "Fechado esta semana" : "Resolvido hoje") : null));
        corpo.append(el("h2", { class: "b4-titulo" }, b.titulo));
        if (b.sobreVoce) corpo.append(el("div", { class: "b4-elogio" }, el("span", { class: "avatar avatar-sm" }, D.usuaria.iniciais),
          el("p", {}, el("span", { class: "forte" }, b.elogio + " "), el("span", { class: "texto-2" }, "A regra só nunca foi escrita, então tudo sobe para você."))));
        const nums = el("div", { class: "b4-numeros" });
        const N = (v, r, brasa) => el("div", { class: "numero" + (brasa ? " numero-brasa" : "") }, el("span", { class: "numero-valor num" }, v), el("span", { class: "numero-rotulo" }, r));
        if (b.id === "antecipacao") {
          nums.append(N("23", "pedidos por mês"));
          if (res) nums.append(el("div", { class: "numero" }, el("span", { class: "numero-valor num b-antes-depois" }, el("s", { class: "b-antes" }, "1,8 dia"), el("span", {}, "2 h")), el("span", { class: "numero-rotulo" }, "de espera, na mediana")));
          else nums.append(N("1,8 dia", "parado, na mediana", true));
          if (res) nums.append(el("div", { class: "numero b-mudou" }, el("span", { class: "numero-valor num" }, "R$ 1,2 mi"), el("span", { class: "numero-rotulo" }, "por mês deixou de esperar aprovação")));
          else nums.append(N("R$ 1,2 mi", "em pedidos esperando por mês", true));
        } else {
          nums.append(N(String(b.porMes), b.id === "primeira-resposta" ? "de 60 conversas por mês" : "vezes por mês"));
        }
        corpo.append(nums);
        if (b.id !== "antecipacao") corpo.append(el("p", { class: "b4-dor" }, el("span", { class: "b4-dor-ponto", "aria-hidden": "true" }), b.dor));
        corpo.append(el("div", { class: "b4-proposta" }, el("span", { class: "t-micro texto-2 forte" }, "Como melhorar"), el("p", {}, b.proposta), el("p", { class: "b4-efeito t-pequeno" }, ic("relampago", "ico-sm"), el("span", {}, "Efeito esperado: " + efeitoBuraco(b.id)))));
        const acoes = el("div", { class: "fila b4-acoes" });
        if (b.id === "antecipacao") {
          if (!res) acoes.append(btn("btn-primario", "Melhorar com uma pergunta", () => SK.ir(5)), el("span", { class: "t-pequeno texto-2" }, "Uma pergunta, uma resposta sua."));
          else acoes.append(btn("btn-primario", e.regraAprovada ? "Ver a skill em uso" : "Aprovar a regra", () => SK.ir(e.regraAprovada ? 6 : 5)));
        } else if (proc) {
          acoes.append(btn("btn-secundario", "Ver o processo", () => abrirProcesso(proc), ic("processo", "ico-sm")), el("span", { class: "t-pequeno texto-2" }, "A pergunta deste fica pronta depois do maior."));
        }
        corpo.append(acoes);
        detalhe.append(corpo);
      }
      selecionar(selId, false);
    },
    padrao() {},
  });

  function abrirProcesso(p) {
    const nome = (id) => { const x = id && D.porId(id); return x ? x.nome : "Ninguém"; };
    const corpo = el("div", { class: "pilha", style: { "--gap": "28px" } },
      el("div", { class: "painel-secao" }, el("h3", { class: "painel-h" }, "Passos"), el("ol", {}, p.passos.map((s) => el("li", {}, s)))),
      el("div", { class: "painel-secao" }, el("h3", { class: "painel-h" }, "Quem decide"), el("p", {}, p.decide)),
      p.excecoes.length ? el("div", { class: "painel-secao" }, el("h3", { class: "painel-h" }, "Exceções"), el("ul", { class: "marcadores" }, p.excecoes.map((s) => el("li", {}, s)))) : null,
      el("div", { class: "painel-secao" }, el("h3", { class: "painel-h" }, "De onde eu tirei"), ...p.fontes.map((f) => el("div", { class: "fonte-linha" }, ic(f.fonte === "drive" ? "drive" : f.fonte === "agenda" ? "agenda" : f.fonte === "gmail" ? "gmail" : "fonte"), el("span", {}, f.texto), el("span", { class: "fonte-data" }, f.data)))));
    SK.painel.abrir({ titulo: p.nome, sobre: p.frequencia + " · feito por " + nome(p.quem) + " · aprova: " + (p.aprova ? nome(p.aprova) : "sem dono"), corpo });
  }

  /* =================================================================== 5 · A PERGUNTA */
  const ROTEIRO = ["Quantos ficam abaixo de R$ 5 mil?", "Esses aprova automático. De R$ 5 mil a R$ 50 mil, a Tesouraria aprova.", "O resto vai para o #antecipacoes no Slack: Marina ou Douglas dão o ok.", "Com chargeback, sempre eu.", "Quem participa desse processo?"];
  SK.ato({
    id: 5, titulo: "A pergunta", nav: "A pergunta",
    montar(sec) {
      const e = E(), b = B(), r = R(), P = D.pergunta, buraco = D.buracos[0];
      b.conversa = b.conversa || [];
      const raiz = el("div", { class: "ato-papel b-largo b5" });
      raiz.append(el("div", { class: "ato-cabeca b-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Uma pergunta para fechar o maior buraco"),
        el("p", { class: "t-sub texto-2" }, buraco.titulo + "."))));

      /* lado direito: a regra viva, quem participa e o buraco */
      const ctx = el("div", { class: "b5-ctx pilha", style: { "--gap": "16px" } });
      const cartaoRegra = el("div", { class: "cartao b5-regra" });
      const cartaoQuem = el("div", { class: "cartao b5-quem" });
      const espera = el("span", { class: "numero-valor num" }, "1,8 dia");
      const esperaN = el("div", { class: "numero numero-brasa" }, espera, el("span", { class: "numero-rotulo" }, "de espera, na mediana"));
      const parados = el("span", { class: "numero-valor num" }, "R$ 1,2 mi");
      const paradosN = el("div", { class: "numero numero-brasa" }, parados, el("span", { class: "numero-rotulo" }, "esperando por mês no seu e-mail"));
      const g = grafico({ compacto: true });
      g.selecionar("antecipacao");
      const cartaoBuraco = el("div", { class: "cartao b5-buraco" },
        el("div", { class: "b5-buraco-esq" }, el("h2", { class: "b-h2" }, "O buraco"),
          el("div", { class: "b5-numeros" }, el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, "23"), el("span", { class: "numero-rotulo" }, "pedidos por mês")), esperaN, paradosN)),
        g.el);
      ctx.append(cartaoRegra, cartaoQuem, cartaoBuraco);
      /* a skill sendo escrita ao vivo: cada resposta entra na seção certa, com a etiqueta de onde veio */
      const sv = SK.skillViva({ titulo: "A skill, sendo escrita" });
      const regraAcoes = el("div", { class: "b5-regra-pe" });
      cartaoRegra.append(sv.el, regraAcoes);
      const conectadasNomes = () => ["Gmail", "Drive", "Agenda"].concat(D.integracoes.filter((i) => (e.conectadas || []).includes(i.id)).map((i) => i.nome));
      let nResp = 0, temRegra = false;
      function registrar(r0, t, resp, perguntou) {
        nResp++;
        const de = "resposta " + nResp;
        const add = (sec, txt) => sv.adicionar(sec, txt, { de });
        let algo = false;
        const marca = () => { if (!temRegra) { temRegra = true; add("regra", "A aprovação depende do valor do pedido."); } algo = true; };
        if (r.auto && r.auto !== r0.auto) { marca(); add("condicoes", "Se o pedido é abaixo de " + rs(r.auto) + ", então a aprovação é automática."); add("quem", "Ninguém: automático abaixo de " + rs(r.auto) + "."); }
        if (r.tes && r.tes !== r0.tes) { marca(); add("condicoes", "Se o pedido vai " + (r.auto ? "de " + rs(r.auto) + " a " : "até ") + rs(r.tes) + ", então a Tesouraria aprova."); add("quem", "Tesouraria: Caio ou Débora."); }
        if (r.slack && !r0.slack) { marca(); add("fluxo", "Acima de " + rs(r.tes || r.auto || 50000) + ": o pedido vai para o #antecipacoes; Marina ou " + DOUGLAS().primeiro + " dão o ok."); add("termos", "#antecipacoes: o canal do Slack onde os pedidos grandes esperam o ok."); }
        if (r.exc && !r0.exc) { marca(); add("excecoes", "Lojista com chargeback nos últimos 90 dias: sempre a Marina, qualquer valor."); }
        if (r.quem && !r0.quem) { algo = true; add("fluxo", "Antes: todos os pedidos iam por e-mail, do Caio para a Marina."); }
        if (!algo && !perguntou && resp.some((x) => /^Anotei\./.test(x))) sv.organizar(t, { de, conectadas: conectadasNomes() });
      }

      /* conversa */
      const fio = el("div", { class: "b5-fio", role: "log", "aria-label": "Conversa", "aria-live": "polite" });
      const caixa = el("textarea", { class: "b5-texto", rows: "2", placeholder: "Responda ou pergunte com as suas palavras", "aria-label": "Sua mensagem" });
      const enviar = btn("btn-primario btn-sm", "Enviar", () => mandar(caixa.value), ic("seta", "ico-sm"));
      const comoMarina = btn("btn-secundario btn-sm", "Responder como a Marina", () => digitarComoMarina());
      const sugestoes = el("div", { class: "b5-sugestoes", "aria-label": "Sugestões" });
      const compositor = el("div", { class: "b5-compositor" }, caixa, sugestoes, el("div", { class: "b5-comp-acoes" }, comoMarina, enviar));
      const conversa = el("section", { class: "b5-conversa", "aria-label": "Conversa com o cérebro" },
        el("div", { class: "b5-conversa-topo" }, el("span", { class: "b5-marca", "aria-hidden": "true" }, marcaMini()), el("div", {}, el("p", { class: "forte" }, "Cérebro da Lume"), el("p", { class: "t-micro texto-2" }, "Sobre: " + D.skill.nome))),
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
      function porque(texto) { const d = el("details", { class: "b5-porque" }, el("summary", {}, ic("mais", "ico-sm"), "Por que estou perguntando"), el("p", {}, texto)); d.addEventListener("toggle", rolarFio); return d; }
      function pensar(anim, depois) {
        if (!anim) { depois(); return; }
        const d = add(el("div", { class: "b5-msg b5-produto b5-digitando", "aria-label": "Escrevendo" }, el("span"), el("span"), el("span")));
        SK.depois(600, () => { d.remove(); depois(); });
      }
      function abertura(anim) {
        msgProduto(anim, el("p", {}, "Antes de perguntar, o que eu vi:"),
          el("ul", { class: "b5-fatos" }, P.evidencia.map((f, i) => el("li", { class: anim ? "entra" : "", style: { "--atraso": 80 + i * 70 + "ms" } }, ic("check", "ico-sm"), f))),
          el("p", { class: "b5-fonte t-micro texto-2" }, ic("fonte", "ico-sm"), "E-mails do Caio para você e a planilha \"Antecipações 2026\"."));
      }
      const pergunta1 = (anim) => msgProduto(anim, el("p", { class: "b5-pergunta" }, P.pergunta), porque(P.porque));
      const pergunta2 = (anim) => msgProduto(anim, el("p", { class: "b5-pergunta" }, P.aprofunda), porque("Dos 19 pedidos abaixo de R$ 50 mil, 3 vieram de lojista com chargeback recente. Uma regra só pelo valor deixaria esses passarem sem você."));

      /* entender a mensagem: devolve as respostas do produto e muda r */
      function entender(t) {
        const n = semAcento(t), resp = [];
        const pergunta = /\?\s*$/.test(t.trim()) || /^(quant|qual|quais|quem|como|por que|e se)/.test(n);
        if (pergunta) {
          if (/particip|envolvid|quem (esta|faz|cuida)|pessoas/.test(n)) { r.quem = true; resp.push("Hoje passa por três pessoas e um e-mail. Mostrei ao lado como fica com a sua regra."); return resp; }
          const vs = valores(t);
          if (vs.length && /quant|abaixo|acima|menos|mais|ate/.test(n)) {
            const v = vs[vs.length - 1], acima = /acima|mais de|maior/.test(n) && !/abaixo|menos/.test(n);
            const k = conta((x) => (acima ? x > v : x < v)), s = soma((x) => (acima ? x > v : x < v));
            b.ultimo = v;
            resp.push("Dos 23 pedidos do mês, " + k + (acima ? " ficam acima de " : " ficam abaixo de ") + rs(v) + ". Somam " + mi(s) + ", e nenhum foi recusado em 6 meses.");
            if (!acima && v <= 10000) resp.push("Se quiser, esses podem ser aprovados automaticamente.");
            return resp;
          }
          resp.push("Neste protótipo eu respondo quantos pedidos ficam abaixo ou acima de um valor, e quem participa do processo.");
          return resp;
        }
        let entendi = false;
        n.split(/[.;]\s*/).filter(Boolean).forEach((f, i) => {
          const fo = t.split(/[.;]\s*/).filter(Boolean)[i] || f, vs = valores(fo);
          if (/automat|sem ninguem|sozinho sem/.test(f)) {
            const v = vs.length ? vs[0] : b.ultimo || 5000; r.auto = v; if (r.tes && r.tes <= v) r.tes = null; entendi = true;
            resp.push("Combinado: abaixo de " + rs(v) + ", aprovação automática. São " + conta((x) => x < v) + " pedidos por mês.");
          } else if (/tesouraria/.test(f)) {
            const v = vs.length ? Math.max(...vs) : 50000; r.tes = v; entendi = true;
            const k = conta((x) => destino(x, r) === "tes");
            resp.push("Certo: " + (r.auto && r.auto < v ? "de " + rs(r.auto) + " a " + rs(v) : "até " + rs(v)) + ", a Tesouraria aprova. São " + k + " por mês.");
          }
          if (/slack|canal|#/.test(f)) { r.slack = true; entendi = true; resp.push("Feito: o resto vai para o #antecipacoes, e Marina ou " + DOUGLAS().primeiro + " dão o ok. Nada fica parado no seu e-mail."); }
          if (/chargeback/.test(f)) { r.exc = true; entendi = true; resp.push("Anotei a exceção: com chargeback nos últimos 90 dias, passa sempre por você, qualquer valor."); }
          if (/particip|envolvid|pessoas/.test(f)) { r.quem = true; entendi = true; resp.push("Mostrei ao lado quem participa, antes e depois."); }
          else if (!entendi && /\b(eu|comigo|mim|marina)\b/.test(f)) { entendi = true; resp.push("Certo: o que sobra continua com você."); }
        });
        if (!entendi) resp.push("Anotei. Neste protótipo eu entendo valores, quem aprova e para onde vai o pedido.");
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
            SK.passos(caixaPassos, ["Lendo o que você escreveu", "Separando os 23 pedidos do mês por valor", "Escrevendo a regra e o efeito"], { ms: 240 }).then(terminar);
          } else terminar();
        });
      }
      function proximaFala() { return ROTEIRO.find((x) => !b.conversa.includes(x) && !jaCoberto(x)); }
      function jaCoberto(x) {
        if (x.startsWith("Quantos")) return !!b.ultimo || !!r.auto;
        if (x.startsWith("Esses")) return !!r.auto && !!r.tes;
        if (x.startsWith("O resto")) return r.slack;
        if (x.startsWith("Com chargeback")) return r.exc;
        if (x.startsWith("Quem")) return r.quem;
        return false;
      }
      function desenharSugestoes() {
        sugestoes.replaceChildren();
        const ops = [];
        if (!b.ultimo && !r.auto) ops.push("Quantos ficam abaixo de R$ 5 mil?");
        if (!r.auto) ops.push(b.ultimo ? "Esses aprova automático" : "Abaixo de R$ 5 mil, aprova automático");
        if (!r.tes) ops.push(r.auto ? "De R$ 5 mil a R$ 50 mil, a Tesouraria aprova" : "Até R$ 50 mil, a Tesouraria aprova");
        if (!r.slack) ops.push("O resto vai para o #antecipacoes no Slack: Marina ou Douglas dão o ok");
        if (!r.exc) ops.push("Com chargeback, sempre eu");
        if (!r.quem) ops.push("Quem participa desse processo?");
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
          btn("btn-primario", e.regraAprovada ? "Ver a skill" : "Revisar antes de publicar", () => SK.ir(6), ic("seta", "ico-sm")),
          el("span", { class: "t-pequeno texto-2" }, e.regraAprovada ? "Publicada por você." : tem ? "Antes de publicar, você vê o antes e o depois." : "Responda ao lado e a skill vai se escrevendo aqui.")));
        regraAcoes.querySelector(".btn-primario").disabled = !tem && !e.regraAprovada;
        cartaoQuem.hidden = !r.quem;
        if (r.quem) cartaoQuem.replaceChildren(el("h2", { class: "b-h2" }, "Quem participa"), quemParticipa(r, anim));
        espera.textContent = ef.esperaCurta;
        esperaN.classList.toggle("numero-brasa", ef.espera > 2); esperaN.classList.toggle("b-mudou", ef.espera <= 2);
        parados.textContent = ef.parados ? mi(ef.parados) : "R$ 0";
        paradosN.classList.toggle("numero-brasa", ef.parados > 0); paradosN.classList.toggle("b-mudou", !ef.parados);
        g.mover(ef.intensidade, ef.espera > 2 ? null : "agora · " + ef.esperaTxt, !!anim);
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
        msgProduto(false, el("p", {}, "Esta é a regra que você aprovou. Pode mudar o que quiser: eu atualizo ao lado."));
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
    const lojista = () => el("span", { class: "b-pessoa" }, el("span", { class: "avatar avatar-sm avatar-externo" }, "LJ"), el("span", { class: "b-pessoa-nome" }, "Lojista"));
    const d = DOUGLAS();
    const linha = (rot, ...f) => el("div", { class: "b-fluxo" + (anim ? " entra" : "") }, el("span", { class: "b-fluxo-rot t-micro texto-2" }, rot), el("div", { class: "b-fluxo-cad" }, ...f));
    const depois = [];
    if (r.auto) depois.push(linha("Abaixo de " + rs(r.auto), lojista(), seta(), passo("automático")));
    if (r.tes) depois.push(linha((r.auto ? "De " + rs(r.auto) + " a " : "Até ") + rs(r.tes), lojista(), seta(), P("CB", "Caio"), P("DL", "Débora")));
    depois.push(linha(r.slack ? "O resto" : "O resto", lojista(), seta(), r.slack ? passo("#antecipacoes") : passo("e-mail"), seta(), P("MD", "Marina"), r.slack ? P(d.iniciais, d.primeiro || d.nome.split(" ")[0]) : null));
    return el("div", { class: "b-quem" },
      el("p", { class: "t-micro texto-2 forte" }, "Antes"),
      linha("Todos", lojista(), seta(), P("CB", "Caio", "(Tesouraria)"), seta(), passo("e-mail"), seta(), P("MD", "Marina")),
      el("p", { class: "t-micro texto-2 forte b-quem-depois" }, "Com a sua regra"), ...depois);
  }

  function marcaMini() {
    const s = el("svg", { viewBox: "0 0 28 28", class: "b-marca-svg", "aria-hidden": "true" });
    s.innerHTML = '<circle cx="14" cy="14" r="4.2" fill="currentColor"/><circle cx="5" cy="7" r="2.3" fill="currentColor" opacity=".55"/><circle cx="23" cy="6" r="2.3" fill="currentColor" opacity=".55"/><circle cx="22.5" cy="22" r="2.3" fill="currentColor" opacity=".55"/><circle cx="5.5" cy="21.5" r="2.3" fill="currentColor" opacity=".55"/>';
    return s;
  }

  /* =================================================================== 6 · VIRA SKILL */
  const CANAIS = [
    { id: "claude", nome: "Claude", letra: "C", onde: "No Claude da Lume, pela conexão do cérebro." },
    { id: "chatgpt", nome: "ChatGPT", letra: "G", onde: "No ChatGPT da Lume, pela mesma conexão." },
    { id: "grok", nome: "Grok", letra: "X", onde: "No Grok da Lume, pela mesma conexão." },
    { id: "slack", nome: "Slack", letra: "S", onde: "No Slack, em #tesouraria, #antecipacoes e por mensagem." },
  ];
  const marcaCanal = (c, pequena) => (typeof SK.marca === "function" ? SK.marca(c.id, pequena ? "mf-sm" : "") : el("span", { class: "b6-letra" + (pequena ? " b6-letra-sm" : ""), "aria-hidden": "true" }, c.letra));

  const GUARDAS = [
    { id: "aprova", txt: "Só lê os pedidos; não aprova nada sozinha acima de R$ 5 mil", sim: "Acima de R$ 5 mil, ela recomenda e uma pessoa aprova.", nao: "Ela poderia aprovar sozinha qualquer valor dentro da regra." },
    { id: "status", txt: "Pode mudar: status do pedido", sim: "Ela marca o pedido como aprovado ou em análise.", nao: "Ela só responde; alguém muda o status à mão." },
    { id: "conta", txt: "Nunca mexe na conta de recebimento do lojista", trava: true, sim: "Travado: troca de conta é o caminho preferido de fraude." },
    { id: "parcial", txt: "Responde mês ainda não fechado, com aviso", sim: "Dá o parcial do dia e avisa que pode mudar.", nao: "Não dá número de mês aberto: diz que quem tem é a Marina." },
    { id: "escreve", txt: "Pode escrever no #antecipacoes", sim: "Ela leva os pedidos grandes ao canal sozinha.", nao: "Ela não escreve no canal: avisa quem pediu para chamar Marina ou Douglas." },
  ];
  SK.ato({
    id: 6, titulo: "Antes de publicar", nav: "Skill",
    montar(sec) {
      const e = E(), b = B(), r = R();
      if (!mudou(r)) Object.assign(r, REGRA_COMPLETA);
      b.guarda = Object.assign({ aprova: true, status: true, conta: true, escreve: true, parcial: true }, b.guarda || {});
      b.conf = b.conf || {};
      const ef = efeito(r), fx = faixas(r);
      const faixaN = (q) => (D.antecipacoesPorFaixa.find((f) => f.faixa.startsWith(q)) || {}).quantos;
      const raiz = el("div", { class: "ato-papel b-largo b6p" });
      raiz.append(el("div", { class: "ato-cabeca b-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Antes de publicar"),
        el("p", { class: "t-sub texto-2" }, D.skill.nome + " · " + (e.regraAprovada ? "publicada" : "rascunho, das suas palavras")))));
      const lista = (linhas, cls) => el("ul", { class: "b6p-lista " + cls }, ...linhas.map((t) => el("li", { class: "b6p-muda" }, t)));
      const antes = ["Todos os 23 pedidos do mês esperam a Marina, por e-mail.", "Ninguém mais aprova, de nenhum valor.", "Chargeback recente: não está escrito o que fazer."];
      const depois = fx.map((f) => f.txt + (f.n != null ? " · " + f.n + " por mês" : ""));
      const imp = (titulo, linhas, cls) => el("div", { class: "b6p-imp-col " + cls }, el("h3", { class: "b6p-imp-h" }, titulo),
        el("ul", { class: "b6p-imp-lista" }, ...linhas.map(([t, m]) => el("li", {}, el("p", {}, t), el("p", { class: "t-micro texto-2" }, m)))));
      const melhora = [
        ["A espera mediana cai de 1,8 dia para " + ef.esperaTxt + ".", "estimativa, pela regra sobre os 23 pedidos do mês"],
        [ef.saem + " pedidos por mês saem do seu e-mail; " + mi(ef.liberados) + " por mês deixam de esperar aprovação.", "estimativa"],
        ["Cerca de " + ef.horas + " horas por mês de idas e voltas devolvidas ao time.", "estimativa: 1h20 por pedido"],
      ];
      const piora = [
        [(faixaN("abaixo") || 11) + " pedidos por mês abaixo de " + rs(r.auto || 5000) + " passam sem ninguém olhar.", "medido: a faixa de valor dos pedidos do mês"],
        ["A Tesouraria passa a decidir " + (faixaN("de R$ 5") || 8) + " pedidos por mês: mais trabalho para o Caio e a Débora.", "estimativa"],
        ["Um lojista com chargeback antigo (mais de 90 dias) passa pela regra normal.", "não medido: vou observar os casos que você desfaz"],
      ];
      const CONFLITOS = [
        { id: "planilha", txt: "A planilha \"Antecipações 2026\" pede o ok da Marina em todo pedido. Você disse que até R$ 50 mil não precisa.", escolha: "Usar o que eu disse hoje" },
        { id: "procedimento", txt: "O procedimento escrito não fala de chargeback. Você disse: com chargeback, sempre você.", escolha: "Usar o que eu disse hoje" },
      ];
      const pend = el("ol", { class: "r-pend" });
      const publicar = btn("btn-primario btn-grande btn-largo", "Publicar", () => publicarJa(false));
      const motivo = el("p", { class: "t-pequeno texto-2" });
      const mesmoAssim = btn("btn-quieto btn-sm", "Publicar mesmo assim, com a pergunta em aberto", () => publicarJa(true));
      const depoisBox = el("div", { class: "b6p-depois" });
      const onde = CANAIS.filter((c) => e.skillEm && e.skillEm[c.id]).map((c) => c.nome);
      const quemUsa = el("div", { class: "r-quem-usa" }, el("p", { class: "t-micro texto-2" }, "Quem vai usar"),
        el("p", {}, "Caio e Débora (Tesouraria)" + (r.slack ? ", Marina e " + DOUGLAS().primeiro + " no #antecipacoes" : "") + (onde.length ? "; nos assistentes da empresa: " + onde.join(", ").replace(/, ([^,]*)$/, " e $1") : "") + "."),
        el("p", { class: "t-micro texto-2" }, "Os assistentes vêm de Configurações e valem para todas as skills. ", el("button", { class: "link", type: "button", on: { click: () => SK.ir("config") } }, "Mudar em Configurações")));
      function desenhar() {
        pend.replaceChildren();
        CONFLITOS.forEach((c, i) => {
          const ok = !!b.conf[c.id] || e.regraAprovada;
          pend.append(el("li", { class: "r-pend-item" + (ok ? " ok" : "") }, el("span", { class: "r-pend-n" }, ok ? ic("check", "ico-sm") : String(i + 1)),
            el("div", { class: "pilha", style: { "--gap": "6px" } }, el("p", {}, c.txt), ok ? el("p", { class: "t-pequeno r-ok" }, "Resolvido: vale o que você disse.") : btn("btn-secundario btn-sm", c.escolha, () => { b.conf[c.id] = true; SK.salvar(); desenhar(); }))));
        });
        pend.append(el("li", { class: "r-pend-item" + (r.exc ? " ok" : "") }, el("span", { class: "r-pend-n" }, r.exc ? ic("check", "ico-sm") : String(CONFLITOS.length + 1)),
          el("div", { class: "pilha", style: { "--gap": "6px" } }, el("p", {}, "E quando o lojista teve chargeback nos últimos 90 dias?"),
            r.exc ? el("p", { class: "t-pequeno r-ok" }, "Respondida: sempre você, qualquer valor.") : btn("btn-secundario btn-sm", "Responder na conversa", () => SK.ir(5)))));
        const conflitosOk = CONFLITOS.every((c) => b.conf[c.id]) || e.regraAprovada;
        publicar.disabled = !conflitosOk || !r.exc || e.regraAprovada; publicar.hidden = !!e.regraAprovada;
        mesmoAssim.hidden = !conflitosOk || r.exc || e.regraAprovada;
        motivo.textContent = e.regraAprovada ? "" : !conflitosOk ? "Antes, resolva os conflitos abaixo." : !r.exc ? "Falta a pergunta em aberto, abaixo." : "Tudo pronto.";
        depoisBox.replaceChildren();
        if (e.regraAprovada) depoisBox.append(el("div", { class: "r-publicada entra" },
          el("p", { class: "forte" }, ic("check", "ico-sm"), " Publicada: " + D.skill.nome + " · " + D.skill.versao + ", aprovada por " + D.skill.aprovadaPor + " " + D.skill.quando + "."),
          el("p", { class: "t-pequeno texto-2" }, "Próximo passo: decidir o que cada área pode ver."),
          btn("btn-primario", "Ir para Acessos", () => SK.ir(7), ic("seta", "ico-sm"))));
      }
      function publicarJa(comAberta) {
        e.regraAprovada = true; b.comAberta = !!comAberta; padraoPergunta(e);
        if (!Object.values(e.skillEm || {}).some(Boolean)) e.skillEm = { claude: true, chatgpt: false, grok: false, slack: true };
        SK.salvar(); desenhar(); SK.anunciar("Skill publicada.");
      }
      raiz.append(el("div", { class: "r-pub-grade" },
        el("div", { class: "pilha", style: { "--gap": "16px" } },
          el("section", { class: "cartao" }, el("h2", { class: "b-h2" }, "Antes e depois"),
            el("div", { class: "r-ad" }, el("div", { class: "r-ad-col r-ad-antes" }, el("p", { class: "t-micro texto-2 forte" }, "Como é hoje"), lista(antes, "")),
              el("div", { class: "r-ad-col r-ad-depois" }, el("p", { class: "t-micro texto-2 forte" }, "Como fica, com as suas respostas"), lista(depois, ""))),
            el("p", { class: "t-micro texto-2" }, "Marcado: o que muda.")),
          el("section", { class: "cartao" }, el("h2", { class: "b-h2" }, "Impacto esperado"),
            el("div", { class: "r-imp" }, imp("O que melhora", melhora, "r-imp-col r-imp-bom"), imp("O que pode piorar", piora, "r-imp-col r-imp-ruim"))),
          el("section", { class: "cartao" }, el("h2", { class: "b-h2" }, "Limites desta skill"), guardasLista())),
        el("aside", { class: "cartao r-pub-lado" }, el("h2", { class: "b-h2" }, "Para publicar"), publicar, motivo, mesmoAssim, depoisBox, pend, quemUsa)));
      function guardasLista() {
        const ul = el("ul", { class: "b6-guardas" });
        GUARDAS.forEach((gd) => {
          const efeitoP = el("p", { class: "t-micro texto-2 b6-guarda-ef" }, b.guarda[gd.id] ? gd.sim : gd.nao);
          if (gd.trava) { ul.append(el("li", { class: "b6-guarda travada" }, el("div", { class: "b6-guarda-linha" }, el("span", { class: "b6-trava", title: "Sempre ligado" }, ic("cadeado", "ico-sm")), el("span", { class: "b6-guarda-txt" }, gd.txt)), efeitoP)); return; }
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
    const sw = el("div", { class: "segmentado b-slack-sw", role: "tablist", "aria-label": "Quem pergunta" },
      ...[["analista", "Analista pergunta"], ["ceo", "CEO pergunta"]].map(([id, rot]) => el("button", { role: "tab", type: "button", "aria-selected": quem === id ? "true" : "false", on: { click: () => { b.fio = id; SK.salvar(); caixa.replaceWith(slack(true)); } } }, rot)));
    caixa.append(sw, quem === "ceo" ? slackCEO(anim) : slackAnalista(anim));
    return caixa;
  }
  function slackCEO(anim) {
    const parcial = !(B().guarda && B().guarda.parcial === false);
    const ORIGEM_OUT = "Planilha Antecipações 2026 · aba Outubro · célula F42 · mês fechado em 05/11";
    const msgs = [
      { quem: "Otávio Reis", ini: "OR", hora: "08:02", txt: "Quanto antecipamos em outubro?" },
      { bot: true, hora: "08:02", txt: "R$ 1,2 milhão, em 23 antecipações.", origem: ORIGEM_OUT },
      { quem: "Otávio Reis", ini: "OR", hora: "08:03", txt: "E novembro?" },
      parcial ? { bot: true, hora: "08:03", txt: "Novembro ainda não fechou. O parcial de hoje é R$ 870 mil, em 17 antecipações, e pode mudar. A Marina fecha no dia 5.", origem: "Planilha Antecipações 2026 · aba Novembro · parcial de 25/11" }
        : { bot: true, hora: "08:03", txt: "Novembro ainda não fechou e eu não respondo mês aberto. Quem tem o parcial é a Marina." },
      { quem: "Otávio Reis", ini: "OR", hora: "08:05", txt: "Vale a pena antecipar para a Loja Ventana?" },
      { bot: true, hora: "08:05", txt: "Isso é decisão da Marina. Já avisei ela." },
    ];
    return desenhoSlack("financeiro", "6 membros", msgs, anim);
  }
  function slackAnalista(anim) {
    const d1 = decidir(22000, false), d2 = decidir(38000, true), d3 = decidir(140000, false);
    const msgs = [
      { quem: "Débora Lins", ini: "DL", hora: "10:12", txt: "Pedido de antecipação da Casa Pirá, R$ 22 mil. Posso aprovar?" },
      { bot: true, hora: "10:12", txt: d1.txt, chamar: d1.chamar },
      { quem: "Débora Lins", ini: "DL", hora: "10:14", txt: "E a Loja Ventana, R$ 38 mil?" },
      { bot: true, hora: "10:14", txt: d2.txt, chamar: d2.chamar },
      { quem: "Caio Brandão", ini: "CB", hora: "10:31", txt: "A Rede Sol pediu R$ 140 mil para sexta." },
      { bot: true, hora: "10:31", txt: d3.txt, chamar: d3.chamar },
    ];
    return desenhoSlack("tesouraria", "4 membros", msgs, anim);
  }
  function desenhoSlack(canal, membros, msgs, anim) {
    const janela = el("div", { class: "b-slack", role: "img", "aria-label": "Prévia: conversa no Slack, canal " + canal });
    const lado = el("div", { class: "b-slack-lado", "aria-hidden": "true" },
      el("p", { class: "b-slack-ws" }, "Lume"),
      ...["geral", "financeiro", "tesouraria", "antecipacoes", "risco"].map((c) => el("p", { class: "b-slack-canal" + (c === canal ? " ativo" : "") }, "# " + c)),
      el("p", { class: "b-slack-sec" }, "Apps"), el("p", { class: "b-slack-canal" }, "Cérebro da Lume"));
    const fio = el("div", { class: "b-slack-fio" });
    janela.append(lado, el("div", { class: "b-slack-main" }, el("div", { class: "b-slack-cab" }, el("span", { class: "forte" }, "# " + canal), el("span", { class: "t-micro" }, membros)), fio));
    msgs.forEach((m, i) => {
      fio.append(el("div", { class: "b-slack-msg" + (anim ? " entra" : ""), style: { "--atraso": anim ? i * 380 + "ms" : "0ms" } },
        (m.bot && typeof SK.marca === "function") ? SK.marca("cerebro") : el("span", { class: "b-slack-av" + (m.bot ? " bot" : "") }, m.bot ? marcaMini() : m.ini),
        el("div", { class: "b-slack-corpo" },
          el("p", { class: "b-slack-nome" }, el("span", { class: "forte" }, m.bot ? "Cérebro da Lume" : m.quem), m.bot ? el("span", { class: "b-slack-app" }, "APP") : null, el("span", { class: "b-slack-hora" }, m.hora)),
          el("p", {}, m.txt),
          m.chamar ? el("div", { class: "b-slack-chamar" }, el("span", { class: "avatar avatar-sm" }, D.usuaria.iniciais), el("span", {}, "Chame a ", el("span", { class: "forte" }, "Marina Duarte"), ". Ela decide os casos com chargeback."), el("span", { class: "b-slack-botao" }, "Chamar a Marina")) : null,
          m.origem ? el("p", { class: "b-slack-skill b-slack-origem" }, ic("fonte", "ico-sm"), m.origem) : m.bot && canal !== "financeiro" ? el("p", { class: "b-slack-skill" }, ic("processo", "ico-sm"), "Skill " + D.skill.nome + " · " + D.skill.versao) : null)));
    });
    return janela;
  }
  function conversaIA(c, anim) {
    const conv = D.uso.conversas[0], d = decidir(38000, true);
    const j = el("div", { class: "b-ia b-ia-" + c.id, role: "img", "aria-label": "Prévia: conversa no " + c.nome });
    j.append(el("div", { class: "b-ia-cab" }, marcaCanal(c, true), el("span", { class: "forte" }, c.nome), el("span", { class: "t-micro b-ia-sub" }, "Débora Lins · Tesouraria")),
      el("div", { class: "b-ia-fio" },
        el("div", { class: "b-ia-dela" + (anim ? " entra" : "") }, el("p", {}, conv.pergunta)),
        el("div", { class: "b-ia-resp" + (anim ? " entra" : ""), style: { "--atraso": anim ? "450ms" : "0ms" } },
          el("p", { class: "b-ia-usando" }, ic("processo", "ico-sm"), "Usando a skill ", el("span", { class: "forte" }, D.skill.nome + " · " + D.skill.versao), ", aprovada pela Marina"),
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
    e.guardrails = Object.assign({}, e.guardrails || {}, { "Operações": sem(["RH", "Diretoria"]), "Tesouraria": sem(["RH", "Diretoria"]), "Engenharia": sem(["Diretoria"]), "RH": sem(["Diretoria"]), "Diretoria": A.slice() });
    e.b.guardInit = true;
  }
  const AREA_TIME = { "Operações": "operacoes", "Tesouraria": "tesouraria", "Engenharia": "engenharia", "RH": "rh", "Diretoria": "diretoria" };
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
    id: 7, titulo: "Acessos", nav: "Acessos",
    montar(sec) {
      const e = E(), b = B();
      guardInicial(e); departamentos(e); sincronizarDeps(e); SK.salvar();
      const AREAS = areasDe(e), self = this;
      const ENG = (AREAS.find((x) => x.chave === "Engenharia") || { rot: "Engenharia" }).rot;
      const raiz = el("div", { class: "ato-papel b-largo b7" });
      raiz.append(el("div", { class: "ato-cabeca b-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Acessos: quem vê o quê"),
        el("p", { class: "t-sub texto-2" }, "Cada área vê as skills e os processos das áreas marcadas. Você muda quando quiser."))));

      const engVeRH = () => e.guardrails["Engenharia"].includes("RH");
      const aviso = el("div", { class: "b7-aviso" });
      let chipEngRH = null;
      function fecharPorta() {
        e.guardrails["Engenharia"] = e.guardrails["Engenharia"].filter((x) => x !== "RH");
        if (chipEngRH) chipEngRH.setAttribute("aria-pressed", "false");
        b.verComo = "engenharia"; SK.salvar(); desenharAviso(true); desenharMapa();
        SK.anunciar("Feito. Engenharia não vê mais o RH.");
      }
      function desenharAviso(anim) {
        aviso.classList.toggle("aberta", engVeRH());
        if (engVeRH()) aviso.replaceChildren(
          el("span", { class: "b5-marca", "aria-hidden": "true" }, marcaMini()),
          el("div", { class: "pilha b7-aviso-txt", style: { "--gap": "8px" } },
            el("p", {}, el("span", { class: "forte" }, "Achei uma porta aberta: "), "a pasta de admissão do RH no Drive está compartilhada com a Engenharia. Por isso a Engenharia vê os processos do RH hoje."),
            el("p", { class: "b7-fonte t-micro texto-2" }, ic("drive", "ico-sm"), "Drive · pasta \"RH / Admissões\" · compartilhada com o grupo Engenharia desde março")),
          btn("btn-primario b7-fechar", "Fechar para a Engenharia", fecharPorta, ic("cadeado", "ico-sm")));
        else aviso.replaceChildren(
          el("span", { class: "b7-feito" + (anim ? " b6-carimbo" : ""), "aria-hidden": "true" }, ic("check", "ico-sm")),
          el("p", {}, el("span", { class: "forte" }, "Feito. "), "Engenharia não vê mais o RH."));
      }
      const matriz = el("div", { class: "cartao b7-matriz" });
      AREAS.forEach((A) => {
        const a = A.chave;
        if (!Array.isArray(e.guardrails[a])) e.guardrails[a] = [a];
        const chips = el("div", { class: "b7-chips" });
        AREAS.forEach((Al) => {
          const alvo = Al.chave;
          const propria = a === alvo, sugerida = a === "Engenharia" && alvo === "RH";
          const ligado = propria || e.guardrails[a].includes(alvo);
          const c = el("button", { class: "b7-chip" + (sugerida ? " sugerida" : ""), type: "button", "aria-pressed": ligado ? "true" : "false", "aria-label": A.rot + " vê " + Al.rot, disabled: propria ? true : null, title: propria ? "Cada área sempre vê o que é dela" : null },
            el("span", { class: "b7-caixa", "aria-hidden": "true" }, propria ? ic("cadeado", "ico-sm") : ic("check", "ico-sm")), Al.rot);
          if (!propria) c.addEventListener("click", () => {
            const lista = e.guardrails[a], on = lista.includes(alvo);
            e.guardrails[a] = on ? lista.filter((x) => x !== alvo) : lista.concat(alvo);
            c.setAttribute("aria-pressed", on ? "false" : "true");
            SK.salvar(); desenharAviso(a === "Engenharia" && alvo === "RH"); desenharMapa(true); resumo();
            if (a === "Engenharia" && on && alvo === "RH") SK.anunciar("Engenharia não vê mais o RH.");
          });
          if (sugerida) chipEngRH = c;
          chips.append(c);
        });
        const dep = A.dep;
        matriz.append(el("div", { class: "b7-linha" + (a === "Engenharia" ? " destaque" : "") + (dep && dep.id === b.depNovo ? " b7-nova" : "") }, el("p", { class: "b7-area" }, el("span", { class: "forte" }, A.rot), el("span", { class: "texto-2" }, " vê"), dep ? el("span", { class: "chip b7-dep-chip" }, dep.pessoas + (dep.pessoas === 1 ? " pessoa" : " pessoas")) : null), chips));
      });

      if (D.externos && D.externos.length) {
        if (!Array.isArray(b.fora)) b.fora = [];
        const chips = el("div", { class: "b7-chips" });
        const sempre = el("span", { class: "chip b7-sempre" }, ic("cadeado", "ico-sm"), "Sempre: só os processos de que participa");
        AREAS.forEach((Al) => {
          const alvo = Al.chave;
          const c = el("button", { class: "b7-chip", type: "button", "aria-pressed": b.fora.includes(alvo) ? "true" : "false", "aria-label": "Gente de fora vê tudo de " + Al.rot },
            el("span", { class: "b7-caixa", "aria-hidden": "true" }, ic("check", "ico-sm")), Al.rot);
          c.addEventListener("click", () => { const on = b.fora.includes(alvo); b.fora = on ? b.fora.filter((x) => x !== alvo) : b.fora.concat(alvo); c.setAttribute("aria-pressed", on ? "false" : "true"); SK.salvar(); });
          chips.append(c);
        });
        matriz.append(el("div", { class: "b7-linha b7-fora" },
          el("div", { class: "b7-area" }, el("p", {}, el("span", { class: "forte" }, "Gente de fora"), el("span", { class: "texto-2" }, " vê")),
            el("p", { class: "t-micro texto-2" }, "O assistente da " + D.externos.map((x) => x.curto).join(", ").replace(/, ([^,]*)$/, " e do $1").replace("Banco Aurora e do Agência", "Banco Aurora e da Agência"))), sempre, el("p", { class: "t-micro texto-2 b7-mais" }, "Abrir uma área inteira para quem é de fora:"), chips));
      }
      /* criar departamento */
      const criar = el("div", { class: "b7-criar" });
      function formCriar() {
        const nome = el("input", { class: "b7-input", type: "text", placeholder: "Ex.: Financeiro", "aria-label": "Nome do departamento", maxlength: "40" });
        const escolhidos = new Set();
        const pessoas = el("div", { class: "b7-pessoas", role: "group", "aria-label": "Quem faz parte" }, ...D.pessoas.map((p) => {
          const c = el("button", { class: "b7-pessoa", type: "button", "aria-pressed": "false" }, el("span", { class: "avatar avatar-sm" }, p.iniciais), el("span", {}, p.nome));
          c.addEventListener("click", () => { const on = escolhidos.has(p.id); on ? escolhidos.delete(p.id) : escolhidos.add(p.id); c.setAttribute("aria-pressed", on ? "false" : "true"); validar(); });
          return c;
        }));
        const ok = btn("btn-primario btn-sm", "Criar departamento", () => {
          const n = nome.value.replace(/\s+/g, " ").trim(); if (!n) return;
          const ds = departamentos(e);
          if (ds.some((d) => semAcento(d.nome) === semAcento(n)) || D.areas.some((a) => semAcento(a) === semAcento(n))) { aviso2.textContent = "Já existe um departamento com esse nome."; return; }
          let id = "dep-" + (semAcento(n).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "novo"), k = 2;
          while (ds.some((d) => d.id === id)) id = id.replace(/-\d+$/, "") + "-" + k++;
          ds.push({ id, nome: n, pessoas: escolhidos.size, membros: [...escolhidos], novo: true });
          b.depNovo = id; sincronizarDeps(e); SK.salvar();
          document.dispatchEvent(new CustomEvent("sk:departamentos", { detail: { criado: id } }));
          SK.anunciar("Departamento " + n + " criado. Ele entrou na tabela e no cérebro.");
          soltar(); sec.replaceChildren(); self.montar(sec);
          const linha = sec.querySelector(".b7-nova"); if (linha) linha.scrollIntoView({ block: "center", behavior: SK.reduzido() ? "auto" : "smooth" });
        }, ic("mais", "ico-sm"));
        const aviso2 = el("p", { class: "t-micro b7-erro", "aria-live": "polite" });
        const validar = () => { ok.disabled = !nome.value.trim(); aviso2.textContent = ""; };
        nome.addEventListener("input", validar);
        nome.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); ok.click(); } });
        validar();
        criar.replaceChildren(el("div", { class: "b7-form entra" },
          el("label", { class: "b7-rotulo" }, el("span", { class: "forte t-pequeno" }, "Nome"), nome),
          el("div", { class: "b7-rotulo" }, el("span", { class: "forte t-pequeno" }, "Quem faz parte"), el("span", { class: "t-micro texto-2" }, "Pode escolher depois. Uma pessoa pode estar em mais de um."), pessoas),
          aviso2,
          el("div", { class: "fila" }, ok, btn("btn-quieto btn-sm", "Cancelar", fechado))));
        nome.focus();
      }
      function fechado() { criar.replaceChildren(btn("btn-secundario btn-sm b7-criar-btn", "Criar departamento", formCriar, ic("mais", "ico-sm"))); }
      fechado();
      matriz.append(criar);
      const abas = el("div", { class: "segmentado", role: "tablist", "aria-label": "Ver o cérebro como" });
      const comoVoce = el("button", { role: "tab", type: "button", on: { click: () => trocar("voce") } }, "Como você vê");
      const comoEng = el("button", { role: "tab", type: "button", on: { click: () => trocar("engenharia") } }, ic("olho", "ico-sm"), "Ver como " + ENG);
      comoEng.style.display = "inline-flex"; comoEng.style.alignItems = "center"; comoEng.style.gap = "6px";
      abas.append(comoVoce, comoEng);
      const mapa = el("div", { class: "b7-mapa canvas" });
      const legenda = el("p", { class: "t-pequeno texto-2 b7-legenda", "aria-live": "polite" });
      const previa = el("div", { class: "cartao b7-previa" }, el("div", { class: "fila b7-previa-topo" }, el("h2", { class: "b-h2" }, "O cérebro"), abas), mapa, legenda);
      raiz.append(aviso, el("div", { class: "b7-grade" }, matriz, previa),
        el("div", { class: "fila b7-fim" }, btn("btn-secundario", "Próximo: o que vem depois", () => SK.ir(8), ic("seta", "ico-sm"))));
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
        const n = el("div", { class: "b7-no" + (t.celula[0] === "t" ? " b7-no-cima" : ""), style: { left: x + "%", top: y + "%" } }, el("span", { class: "b7-ponto" }), el("span", { class: "b7-rot" }, el("span", { class: "b7-no-nome" }, nomeDep(t)), el("span", { class: "b7-no-n num" }, t.pessoas + " pessoas")));
        nos.set(t.id, n);
      });
      novos(e).forEach((d, i) => {
        const [x, y] = INTERNO[i % INTERNO.length];
        const l = el("line", { x1: "50", y1: "50", x2: String(x), y2: String(y), "vector-effect": "non-scaling-stroke" });
        svg.append(l); tracos.set(d.id, l);
        nos.set(d.id, el("div", { class: "b7-no b7-no-novo" + (d.id === b.depNovo ? " entra-lento" : ""), style: { left: x + "%", top: y + "%" } }, el("span", { class: "b7-ponto" }), el("span", { class: "b7-rot" }, el("span", { class: "b7-no-nome" }, d.nome), el("span", { class: "b7-no-n num" }, d.pessoas + (d.pessoas === 1 ? " pessoa" : " pessoas")))));
      });
      const centro = el("div", { class: "b7-no b7-centro", style: { left: "50%", top: "50%" } }, el("span", { class: "b7-ponto" }), el("span", { class: "b7-rot" }, el("span", { class: "b7-no-nome" }, "Lume")));
      const oculto = el("div", { class: "b7-oculto" });
      const fantasmas = new Map();
      D.times.forEach((t) => { const [x, y] = POS[t.celula]; fantasmas.set(t.id, el("span", { class: "b7-fantasma", "aria-hidden": "true", style: { left: x + "%", top: y + "%" } })); });
      mapa.append(svg, ...fantasmas.values(), ...nos.values(), centro, oculto);

      const todosTimes = () => D.times.map((t) => Object.assign({}, t, { nome: nomeDep(t) })).concat(novos(e).map((d) => ({ id: d.id, nome: d.nome, pessoas: d.pessoas, area: d.nome })));
      function visiveis(como) {
        const vistos = como === "engenharia" ? e.guardrails["Engenharia"] : AREAS.map((x) => x.chave);
        return todosTimes().filter((t) => { const area = t.area || Object.keys(AREA_TIME).find((k) => AREA_TIME[k] === t.id); return !area || vistos.includes(area); }).map((t) => t.id);
      }
      function desenharMapa() {
        const como = b.verComo || "voce";
        const vis = visiveis(como);
        nos.forEach((n, id) => { const v = vis.includes(id); n.classList.toggle("some", !v); n.setAttribute("aria-hidden", v ? "false" : "true"); });
        tracos.forEach((l, id) => l.classList.toggle("some", !vis.includes(id)));
        centro.querySelector(".b7-no-nome").textContent = como === "engenharia" ? "Lume, para " + ENG : "Lume";
        mapa.classList.toggle("como-eng", como === "engenharia");
        const fora = todosTimes().filter((t) => !vis.includes(t.id));
        const procs = D.processos.filter((p) => fora.some((t) => t.id === p.time));
        if (como !== "engenharia") legenda.textContent = "Você vê os " + todosTimes().length + " departamentos e todos os processos.";
        else if (!fora.length) legenda.textContent = "Hoje " + ENG + " vê tudo, como você.";
        else {
          const nomes = fora.map((t) => t.nome).join(", ").replace(/, ([^,]*)$/, " e $1");
          legenda.textContent = "Para quem está em " + ENG + ", " + (fora.length > 1 ? "somem " : "some ") + nomes + ": " + fora.reduce((s, t) => s + t.pessoas, 0) + " pessoas, " + procs.length + (procs.length === 1 ? " processo" : " processos") + " (" + procs.map((p) => p.nome).join(", ") + ") e as skills " + (fora.length > 1 ? "dessas áreas" : "do " + nomes) + " no Claude e no Slack.";
        }
        oculto.textContent = como === "engenharia" && fora.length ? fora.map((t) => t.nome).join(", ").replace(/, ([^,]*)$/, " e $1") + (fora.length > 1 ? " ocultos para " + ENG : " oculto para " + ENG) : "";
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
    padrao(e) { guardInicial(e); e.guardrails["Engenharia"] = e.guardrails["Engenharia"].filter((x) => x !== "RH"); },
  });

  /* =================================================================== SKILLS (#/skills): a lista; abre a tela da skill (#/ato-6) */
  SK.ato({
    id: "skills", titulo: "Skills", nav: "Skills",
    montar(sec) {
      const e = E(), r = R(), aprovada = !!e.regraAprovada, ef = efeito(mudou(r) ? r : REGRA_COMPLETA);
      const raiz = el("div", { class: "ato-papel b-largo b9" });
      raiz.append(el("div", { class: "ato-cabeca b-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Skills"),
        el("p", { class: "t-sub texto-2" }, aprovada ? "As regras que você aprovou, trabalhando onde o time já pergunta." : "Cada buraco que você fecha vira uma skill. Ainda não há nenhuma."))));
      if (aprovada) {
        const onde = CANAIS.filter((c) => e.skillEm && e.skillEm[c.id]);
        const holder9 = el("div", { class: "b-carga" }); raiz.append(holder9);
        carga(holder9, el("ul", { class: "lista cartao b-cartao-lista b9-lista" }, el("li", {},
          el("button", { class: "linha linha-botao b9-linha", type: "button", on: { click: () => SK.ir(6) } },
            el("span", { class: "b6-selo ok", "aria-hidden": "true" }, ic("check")),
            el("span", { class: "linha-principal" }, el("span", { class: "forte" }, D.skill.nome), el("span", { class: "t-pequeno texto-2" }, D.skill.versao + " · aprovada por " + D.skill.aprovadaPor + " " + D.skill.quando + " · " + faixas(r).length + " partes na regra")),
            el("span", { class: "linha-meta b9-meta" },
              el("span", { class: "b9-onde" }, ...(onde.length ? onde.map((c) => marcaCanal(c, true)) : [el("span", { class: "t-pequeno texto-2" }, "em nenhum lugar ainda")])),
              el("span", { class: "chip chip-ok" }, ef.horas + " h por mês de volta"),
              ic("seta", "ico-sm"))))), "lista", "skills");
      } else {
        raiz.append(el("div", { class: "cartao b9-vazio" }, el("span", { class: "b6-selo", "aria-hidden": "true" }, ic("processo")),
          el("h2", { class: "b-h2" }, "A primeira skill sai de uma pergunta"),
          el("p", { class: "texto-2" }, "O maior buraco, " + D.buracos[0].titulo.toLowerCase() + ", fecha com uma resposta sua. " + efeitoBuraco("antecipacao")),
          btn("btn-primario", "Melhorar com uma pergunta", () => SK.ir(5), ic("seta", "ico-sm"))));
      }
      sec.append(raiz);
    },
    sair() { soltar(); },
  });

  /* =================================================================== 8 · INÍCIO (a tela de todo dia) */
  function irBuraco(id) { if (id === "antecipacao" && !E().regraAprovada) { SK.ir(5); return; } B().sel4 = id; SK.salvar(); SK.ir(4); }
  SK.ato({
    id: 8, titulo: "Início", nav: "Início",
    montar(sec) {
      const e = E(), r = R(), aprovada = !!e.regraAprovada;
      const ef = efeito(mudou(r) ? r : REGRA_COMPLETA);
      const usando = Object.values(e.skillEm || {}).some(Boolean);
      const raiz = el("div", { class: "ato-papel b-largo b8 b8-inicio" });
      const hoje = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
      raiz.append(el("div", { class: "b8-saudacao" },
        el("div", { class: "pilha", style: { "--gap": "6px" } }, el("h1", { class: "t-titulo" }, "Bom dia, " + D.usuaria.primeiro + "."), el("p", { class: "t-sub texto-2" }, hoje.charAt(0).toUpperCase() + hoje.slice(1) + ". " + (aprovada ? "Um buraco fechado; o próximo está esperando." : "O primeiro buraco fecha com uma pergunta.")))));

      /* (1) a semana em quatro números */
      const T = (v, rot, ok, i, num) => { const vEl = el("p", { class: "b8-num-v num" + (ok ? " ok" : "") }, v); const t = el("div", { class: "b8-num entra", style: { "--atraso": 60 + i * 70 + "ms" } }, vEl, el("p", { class: "t-pequeno texto-2" }, rot)); if (num != null) t._contar = () => contarExato(vEl, num, (x) => SK.fmt(x), 900); return t; };
      const nums = [
        T(aprovada ? "1" : "0", "buraco fechado esta semana", aprovada, 0),
        T(aprovada ? String(ef.horas) : "0", "horas por mês devolvidas ao time", aprovada, 1, aprovada ? ef.horas : null),
        T(aprovada ? mi(ef.liberados) : "R$ 0", "por mês deixou de esperar aprovação", aprovada, 2),
        T(aprovada ? "1" : "0", aprovada && usando ? "skill em uso, " + D.uso.semana + " usos na semana" : "skill em uso", false, 3),
      ];
      this._nums = nums;
      raiz.append(el("div", { class: "b8-nums" }, ...nums));

      /* (2) esperando você, por impacto */
      const abertos = D.buracos.filter((x) => !(aprovada && x.id === "antecipacao"));
      const linhaAcao = (txt, imp, acaoTxt, acao, extra) => {
        const b = el("button", { class: "btn btn-secundario btn-sm b8-aceitar", type: "button" }, acaoTxt);
        b.addEventListener("click", acao || (() => { b.replaceChildren(ic("check", "ico-sm"), "Feito"); b.classList.add("feito"); b.setAttribute("aria-pressed", "true"); }));
        return el("li", { class: "linha b8-acao-linha" }, el("span", { class: "linha-principal" }, extra || null, el("span", { class: "b8-acao-txt" }, txt), el("span", { class: "b8-imp t-pequeno" }, ic("relampago", "ico-sm"), imp)), el("span", { class: "linha-meta" }, b));
      };
      const proximo = abertos[0];
      const espera = el("section", { class: "cartao b8-bloco b8-espera" },
        el("div", { class: "b8-bloco-cab" }, el("h2", { class: "b-h2" }, "Esperando você"), el("span", { class: "t-pequeno texto-2" }, "do maior impacto para o menor")),
        el("ul", { class: "lista" },
          linhaAcao(proximo.titulo, efeitoBuraco(proximo.id), proximo.id === "antecipacao" ? "Melhorar com uma pergunta" : "Abrir", () => irBuraco(proximo.id), el("span", { class: "chip chip-brasa b8-chip-tipo" }, aprovada ? "Próximo buraco" : "Maior buraco")),
          linhaAcao(abertos[1].titulo, efeitoBuraco(abertos[1].id), "Abrir", () => irBuraco(abertos[1].id), el("span", { class: "chip b8-chip-tipo" }, "Buraco"))),
        el("div", { class: "b8-conceito" },
          el("div", { class: "b8-bloco-cab" }, el("h3", { class: "b-h3" }, "Da revisão da noite"), el("span", { class: "tag-conceito" }, "Conceito · ainda não disponível")),
          el("ul", { class: "lista" },
            linhaAcao(D.depois.novo, "cerca de 18 horas por mês, se ninguém mais fizer à mão", "Virar skill", null, el("span", { class: "chip b8-chip-tipo" }, "Processo novo")),
            linhaAcao(D.depois.melhoria, "20 minutos a menos por caso", "Aplicar", null, el("span", { class: "chip b8-chip-tipo" }, "Melhoria")),
            linhaAcao("Nova lição: quando o lojista tem chargeback recente, a Tesouraria sempre te chama.", "vira regra em um clique", "Virar regra"),
            linhaAcao("Juntei 2 passo a passo de reembolso que diziam a mesma coisa.", "um lugar só para o time consultar", "Aceitar"),
            linhaAcao("Aposentei \"Cadastro manual de lojista\": ninguém usa desde agosto.", "um processo a menos para manter", "Aceitar"))));

      /* (3) o que melhorou */
      const melhorou = el("section", { class: "cartao b8-bloco" }, el("h2", { class: "b-h2" }, "O que melhorou"));
      if (aprovada) {
        const g = grafico({ compacto: true });
        g.selecionar("antecipacao");
        melhorou.append(el("p", { class: "forte" }, D.buracos[0].titulo),
          el("div", { class: "b8-antes-depois" },
            el("div", { class: "numero" }, el("span", { class: "numero-valor num b-antes-depois" }, el("s", { class: "b-antes" }, "1,8 dia"), el("span", { class: "b8-ok" }, ef.esperaCurta)), el("span", { class: "numero-rotulo" }, "de espera, na mediana")),
            el("div", { class: "numero" }, el("span", { class: "numero-valor num b8-ok" }, String(D.uso.semChamar)), el("span", { class: "numero-rotulo" }, "de " + D.uso.semana + " usos sem te chamar"))),
          g.el);
        this._g = () => SK.depois(400, () => g.mover(ef.intensidade, "agora · " + ef.esperaTxt, true, "antes · 1,8 dia"));
      } else {
        this._g = null;
        melhorou.append(el("div", { class: "b6-vazio b8-vazio" }, ic("relampago", "ico-lg"), el("p", { class: "texto-2" }, "Nada ainda. O maior buraco fecha com uma pergunta sua."), btn("btn-primario btn-sm", "Fechar o primeiro", () => SK.ir(5), ic("seta", "ico-sm"))));
      }

      /* (4) buracos abertos */
      const listaAbertos = el("section", { class: "cartao b8-bloco" }, el("div", { class: "b8-bloco-cab" }, el("h2", { class: "b-h2" }, "Buracos abertos"), el("a", { class: "b8-veio t-pequeno", href: "#/ato-4" }, "Ver os " + abertos.length)),
        el("ul", { class: "lista" }, abertos.slice(0, 4).map((bu) => el("li", {}, el("button", { class: "linha linha-botao b8-aberto", type: "button", on: { click: () => irBuraco(bu.id) } }, el("span", { class: "linha-principal" }, el("span", { class: "forte" }, bu.titulo), el("span", { class: "t-micro texto-2" }, bu.frequencia)), el("span", { class: "linha-meta" }, el("span", { class: "chip " + (bu.intensidade >= 0.5 ? "chip-brasa" : "") }, CUSTO[bu.id]), ic("seta", "ico-sm")))))));

      /* (5) fontes */
      const conectadas = e.conectadas && e.conectadas.length ? e.conectadas : ["intercom", "tldv"];
      const su = e.suite || "google";
      const cob = D.coberturaDe ? D.coberturaDe(conectadas, su) : 53;
      const ganhoDe = (id) => (D.ganhoDe ? D.ganhoDe(id, su) : (D.cobertura && D.cobertura.porFonte[id]) || 0);
      const ganhos = (D.porGanho ? D.porGanho(su) : D.integracoes).filter((it) => !conectadas.includes(it.id) && !it.conceito).map((it) => ({ it, g: ganhoDe(it.id) })).slice(0, 2);
      const abrirFontes = () => { if (SK.fontes && typeof SK.fontes.abrir === "function") SK.fontes.abrir(); else SK.ir(3); };
      const fontes = el("section", { class: "cartao b8-bloco" }, el("div", { class: "b8-bloco-cab" }, el("h2", { class: "b-h2" }, "Fontes"), el("span", { class: "t-pequeno texto-2" }, cob + "% do trabalho à vista")),
        el("div", { class: "b8-barra", role: "img", "aria-label": cob + "% do trabalho que o mapa vê" }, el("span", { class: "b8-barra-ch", style: { width: cob + "%" } })),
        el("ul", { class: "lista" }, ganhos.map(({ it, g }) => linhaAcao("Conectar o " + it.nome, "+" + g + " pontos do trabalho à vista" + (it.acrescentaria ? ": " + it.acrescentaria : ""), "Conectar", abrirFontes, (typeof SK.marca === "function") ? SK.marca(it.id, "mf-sm") : null))));

      /* perguntas que chegaram no cérebro (por papel, nunca por pessoa) */
      const PERG = { total: 11, sozinho: 9, papeis: [["Diretoria", 6], ["Comercial", 3], ["Investidor", 2]],
        esperando: [{ papel: "Diretoria", txt: "Qual a taxa média das antecipações deste trimestre?", imp: "a planilha tem os dados; falta você dizer como calcular" },
          { papel: "Investidor", txt: "Quanto do volume de novembro foi antecipado?", imp: "mês ainda aberto: a regra pede o seu ok" }] };
      const perguntas = el("section", { class: "cartao b8-bloco" }, el("div", { class: "b8-bloco-cab" }, el("h2", { class: "b-h2" }, "Perguntas que chegaram no cérebro"), el("span", { class: "t-pequeno texto-2" }, "esta semana")),
        el("div", { class: "b8-perg-nums" },
          el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, String(PERG.total)), el("span", { class: "numero-rotulo" }, "perguntas")),
          el("div", { class: "numero" }, el("span", { class: "numero-valor num b8-ok" }, String(PERG.sozinho)), el("span", { class: "numero-rotulo" }, "respondidas sem te chamar")),
          el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, String(PERG.total - PERG.sozinho)), el("span", { class: "numero-rotulo" }, "esperando você"))),
        el("ul", { class: "lista" }, PERG.esperando.map((q) => linhaAcao(q.txt, q.imp, "Responder e virar regra", null, el("span", { class: "chip b8-chip-tipo" }, "Pergunta " + ({ Investidor: "do investidor", Diretoria: "da Diretoria", Comercial: "do Comercial" }[q.papel] || "de " + q.papel))))),
        el("p", { class: "t-pequeno texto-2 b8-papeis" }, "Quem pergunta, por papel: ", ...PERG.papeis.map(([p, n], i) => el("span", { class: "chip" }, p + " " + n))));
      const holder8 = el("div", { class: "b-carga" }); raiz.append(holder8);
      carga(holder8, el("div", { class: "b8-inicio-grade" }, el("div", { class: "pilha", style: { "--gap": "16px" } }, espera, listaAbertos), el("div", { class: "pilha", style: { "--gap": "16px" } }, melhorou, perguntas, fontes)), "cartoes", "inicio");

      /* (6) o ciclo, uma linha */
      const feito = { ler: true, mapear: true, buracos: e.vistos.includes(4), perguntas: mudou(r) && (B().conversa || []).length > 0 || aprovada, skills: aprovada, uso: aprovada && usando, "ler de novo": false };
      raiz.append(el("p", { class: "b8-ciclo-linha" }, ...D.depois.ciclo.map((p, i) => el("span", { class: "b8-ciclo-p" + (feito[p] ? " feito" : "") }, i ? el("span", { class: "b8-ciclo-seta", "aria-hidden": "true" }, ic("seta", "ico-sm")) : null, feito[p] ? ic("check", "ico-sm") : null, p)), el("span", { class: "texto-2 b8-ciclo-frase-p" }, "Cada volta deixa o mapa mais completo e os buracos menores.")));
      sec.append(raiz);
    },
    entrar() { (this._nums || []).forEach((t) => t._contar && t._contar()); if (this._g) this._g(); },
    sair() { soltar(); },
  });
})();
