/* shell.js · roteamento, registro de atos, estado compartilhado, barra do app, painel lateral (Builder A).
 *
 * CONTRATO DE ATO
 *   SK.ato({
 *     id: 4,                       // número do ato (0..8); rota #/ato-4
 *     titulo: "Buracos",           // título do ato; também é o rótulo na navegação (ou use nav: "curto")
 *     nav: "Buracos",              // opcional, rótulo curto na navegação do app (aparece do ato 3 em diante)
 *     montar(el, dados) {},        // chamado A CADA entrada, com el (section.ato) VAZIO. Construa o DOM aqui lendo SK.estado.
 *     entrar() {},                 // depois de montar e de o ato ficar visível: comece animações aqui.
 *     sair() {},                   // ao sair: pare o que for seu. Timers criados com SK.depois/SK.cada/SK.quadro são cancelados sozinhos.
 *     padrao(estado, jaVisto) {},  // opcional: quando alguém abre um ato POSTERIOR direto pela URL (ou pula este),
 *                                  // deixe o estado como se este ato tivesse sido feito. jaVisto=true se a pessoa passou por ele.
 *   })
 *   Atos 0..3 em atos-a.js; 4..8 em atos-b.js (carregado se existir; senão um ato provisório discreto aparece).
 *
 * ESTADO  SK.estado (salvo em sessionStorage; "Reiniciar" volta ao padrão). Campos:
 *   conta           null | { nome, email }            (ato 0, conta escolhida)
 *   espacoCriado    bool                              (ato 0)
 *   google          { gmail, drive, agenda } bools    (ato 1)
 *   leituraCompleta bool                              (ato 2)
 *   conectadas      [ids de SK.dados.integracoes]     (ato 2; padrão ao abrir direto: ['intercom','tldv'])
 *   alcancado       maior ato aberto (a navegação mostra atos 3..alcancado)
 *   passados        [ids de atos cujo padrão já foi aplicado]
 *   vistos          [ids de atos abertos]
 *   respostas       { pergunta: "", aprofunda: "" }   (ato 5)
 *   regraAprovada   bool                              (ato 6)
 *   buracoResolvido bool                              (ato 5/6: o buraco 1 encolhe)
 *   skillEm         { claude, chatgpt, grok, slack } bools  (ato 6)
 *   guardrails      { "Engenharia": ["Operações", …] } o que cada área vê (ato 7); padrão = todas veem todas
 *   casa            bool: a primeira volta terminou (barra com navegação normal)
 *   suite           "google" | "microsoft"   escolhido no ato 0 (padrão "google")
 *   Pode ACRESCENTAR campos seus; chame SK.salvar() depois de mudar o estado.
 *
 * AJUDANTES
 *   SK.dados                     = window.SK_DADOS
 *   SK.ir(n) / SK.proximo() / SK.anterior()
 *   SK.el(tag, attrs, ...filhos)  cria elemento; filhos string viram NÓS DE TEXTO; attrs: class, text, on:{click:fn}, aria-*, data-*, style
 *   SK.icone(nome, classe)        SVG inline: gmail drive agenda seta seta-esq fechar check cadeado pessoa time processo reuniao
 *                                 reiniciar olho mais fonte relampago chat raio-x documento escudo
 *   SK.depois(ms, fn) SK.cada(ms, fn) SK.quadro(fn)   timers presos ao ato atual (cancelados ao sair)
 *   SK.reduzido()                 true se prefers-reduced-motion
 *   SK.anunciar(texto)            leitor de tela (aria-live)
 *   SK.contar(el, de, ate, ms)    número que corre (pt-BR); com movimento reduzido vai direto ao fim
 *   SK.fmt(n)                     número pt-BR (41.200)
 *   SK.toggle(rotulo, ligado, aoMudar) -> button.toggle
 *   SK.painel.abrir({ titulo, sobre, corpo, rodape, aoFechar }) / SK.painel.fechar() / SK.painel.aberto()
 *   A etiqueta "Protótipo · dados inventados" fica na barra do topo (.tag-prototipo), em todas as telas.
 *   SK.tema(id)                  troca o tema (eletrico | noite | mare); evento "sk:tema". Use só tokens: nada de cor escrita à mão.
 *   SK.marca(id, classe)         marca da ferramenta em tinta (gmail drive agenda intercom slack notion github whatsapp zendesk revenuecat
 *                                claude chatgpt; sem marca pública: tldv granola cloudhumans grok viram letra; "cerebro" = quadrado de tinta com "s")
 *   SK.retrato(px)               retrato ilustrado da Marina (SVG); use onde o avatar dela aparece. Os outros mantêm iniciais.
 *   SK.mapa                       o mapa do cérebro (definido em atos-a.js): SK.mapa.criar(container, opcoes) -> { revelar, tudo, destacar, ocultarTime, destruir }
 *   Eventos: document dispara "sk:ato" { detail: { id } } a cada troca de ato; "sk:reiniciar" ao reiniciar.
 *
 * MOVIMENTO (X3; arquivo-marca site/MOVIMENTO-PRONTO). Rápido (150 a 250 ms), ease-out, interrompível; movimento reduzido = estado final.
 *   SK.carregar(el, ms, montar, forma)  mostra esqueletos em el por ms (≈ 280 a 450), depois limpa el, chama montar(el) e faz fade.
 *                                forma: "lista" (padrão) | "cartoes" | "tabela" | "bloco" | "mapa". Use na primeira aparição do conteúdo
 *                                principal do ato e ao trocar de aba. Cancelado sozinho ao sair do ato.
 *   SK.esqueleto(forma)          só o esqueleto (elemento), se quiser montar o seu. Classes: .esqueleto (bloco) .esq-linha .esq-linha-curta .esq-titulo .esq-circulo .esq-cartao
 *   SK.passos(el, rotulos, { ms })  -> Promise   passos que se completam um a um (pendente, andando, feito) dentro de el;
 *                                use onde o produto "faz" algo (conectar fonte, escrever a regra, criar o espaço). ms por passo (padrão 420).
 *   SK.escalonar(nos, passo=45)   entrada escalonada (fade + subida) para uma lista de elementos ou os filhos de um contêiner.
 *   Transição entre atos: para frente entra pela direita, para trás pela esquerda (automático; classes .ato-frente / .ato-tras).
 *   Hover e press: botões, linhas clicáveis, cartões-botão, chips clicáveis e blocos (.tile) já respondem; use essas classes.
 *
 * CASCA DEPOIS DA PRIMEIRA VOLTA (X4; arquivo-marca site/CASCA-PRONTA)
 *   Primeira volta: atos 0..7 com a trilha de passos (1 Cérebro … 5 Acessos, 6 Início). Ao chegar no ato 8 (o Início do Builder B)
 *   a volta termina: SK.estado.casa = true e a barra passa a mostrar a navegação normal:
 *     Início (#/inicio = ato 8) · Cérebro (#/ato-3) · Buracos (#/ato-4, também ativo no ato 5) · Skills (#/skills do Builder B; #/ato-6 se não houver) · Acessos (#/ato-7)
 *     · engrenagem → Configurações (#/config) · botão "Pergunte" (e Ctrl/Cmd+K) → SK.chat.abrir().
 *   Rotas com nome: SK.ato({ id: "config", … }) registra #/config (o mesmo contrato de ato; montar a cada entrada). SK.ir("config") / SK.ir(8).
 *   #/inicio é sinônimo de #/ato-8. Abrir #/inicio ou #/config direto aplica os padrões de todos os atos e marca casa = true.
 *   "Reiniciar" volta à primeira volta (estado padrão, casa = false) e dispara "sk:reiniciar".
 *   index.html carrega atos-b.js/b.css e atos-c.js/c.css; se faltar algum, entra um ato provisório discreto.
 *
 * FONTES  SK.fontes.abrir({ aoFechar(mudou) })   o painel "Conectar mais fontes" (atos-a.js), em qualquer tela: lista por ganho, conectar
 *         com passos, medidor de cobertura. Ao fechar, se algo foi conectado, a tela atual é montada de novo (SK.recarregar()).
 * SK.recarregar()  monta de novo a tela atual.
 *
 * CONVERSA (contrato SK.chat; o painel é do Builder C)
 *   SK.chat.registrar(impl)  impl = { abrir(pergunta?), fechar(), alternar(), aberto() } ou só uma função abrir(pergunta?).
 *   SK.chat.abrir(pergunta?) / .fechar() / .alternar() / .aberto() / .disponivel()
 *   Sem implementação registrada, abrir() mostra um painel provisório. Ctrl/Cmd+K: quem registrou cuida; sem registro, a casca abre o provisório.
 */
(function () {
  const D = window.SK_DADOS;
  const CHAVE = "sk-cerebro-v1";
  const NOMES = { 0: "Entrar", 1: "Permissões", 2: "A leitura", 3: "O cérebro", 4: "Buracos", 5: "A pergunta", 6: "Vira skill", 7: "Acessos", 8: "Início" };

  function padraoEstado() {
    return {
      conta: null, espacoCriado: false, casa: false,
      google: { gmail: false, drive: false, agenda: false },
      leituraCompleta: false, conectadas: [],
      alcancado: 0, passados: [], vistos: [],
      respostas: { pergunta: "", aprofunda: "" },
      regraAprovada: false, buracoResolvido: false,
      skillEm: { claude: false, chatgpt: false, grok: false, slack: false },
      guardrails: JSON.parse(JSON.stringify(D.guardrailsPadrao)),
    };
  }
  function carregar() {
    try { const s = JSON.parse(sessionStorage.getItem(CHAVE) || "null"); if (s) return Object.assign(padraoEstado(), s); } catch (e) {}
    return padraoEstado();
  }

  const atos = new Map();
  let atual = null, timers = [], quadros = [];
  const SK = (window.SK = window.SK || {});
  SK.dados = D;
  SK.estado = carregar();
  SK.salvar = () => { try { sessionStorage.setItem(CHAVE, JSON.stringify(SK.estado)); } catch (e) {} };

  /* ---------- temas (controle do protótipo) ---------- */
  const TEMAS = [["eletrico", "Elétrico", "#4a2bff"], ["noite", "Noite", "#ff5a1f"], ["mare", "Maré", "#0e7c6b"]];
  SK.tema = function (t) {
    if (!TEMAS.some((x) => x[0] === t)) t = "eletrico";
    document.documentElement.dataset.tema = t;
    try { localStorage.setItem("sk-tema", t); } catch (e) {}
    document.querySelectorAll(".tema-bt").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tema === t ? "true" : "false"));
    document.dispatchEvent(new CustomEvent("sk:tema", { detail: { tema: t } }));
  };
  (function () {
    let t = new URLSearchParams(location.search).get("tema");
    if (!t) { try { t = localStorage.getItem("sk-tema"); } catch (e) {} }
    document.documentElement.dataset.tema = TEMAS.some((x) => x[0] === t) ? t : "eletrico";
  })();


  /* ---------- DOM ---------- */
  SK.el = function (tag, attrs, ...filhos) {
    const svg = /^(svg|g|path|circle|line|rect|text|tspan|ellipse|polyline|defs|marker|clipPath|filter|feGaussianBlur|radialGradient|linearGradient|stop)$/.test(tag);
    const e = svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") e.setAttribute("class", v);
      else if (k === "text") e.textContent = v;
      else if (k === "on") for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat()) if (f != null && f !== false) e.append(typeof f === "string" || typeof f === "number" ? document.createTextNode(String(f)) : f);
    return e;
  };

  const ICONES = {
    gmail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    drive: '<path d="M4 18.5h16"/><path d="M5 18.5V7.5a2 2 0 0 1 2-2h4l2 2.5h4a2 2 0 0 1 2 2v8.5"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "seta-esq": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cadeado: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    pessoa: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5"/>',
    time: '<circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6M14.5 15c2.6-.6 5 .8 6 4"/>',
    processo: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.5 6.5c4 0 7 1.5 7.5 3.5M8.5 17.5c4 0 7-1.5 7.5-3.5"/>',
    reuniao: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17"/><circle cx="9" cy="15" r="1.2"/><circle cx="15" cy="15" r="1.2"/>',
    reiniciar: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v4h4"/>',
    olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    fonte: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5"/>',
    documento: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5"/>',
    relampago: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z"/>',
    escudo: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/>',
    "raio-x": '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    externo: '<circle cx="12" cy="12" r="8" stroke-dasharray="3 2.6"/><circle cx="12" cy="12" r="2.5"/>',
    engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/><circle cx="12" cy="12" r="6.2"/>',
  };
  SK.icone = function (nome, classe) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", "ico" + (classe ? " " + classe : ""));
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICONES[nome] || ICONES.fonte; // modelos estáticos, nunca texto de usuário
    return s;
  };

  /* ---------- marcas das ferramentas e retrato da Marina ---------- */
  const SIGLAS = { tldv: "tl", granola: "Gr", cloudhumans: "Ch", grok: "Gk", skillstore: "s", cerebro: "s" };
  SK.marca = function (id, classe) {
    const box = document.createElement("span");
    box.className = "marca-f" + (classe ? " " + classe : "");
    box.setAttribute("aria-hidden", "true");
    const ps = (window.SK_MARCAS || {})[id];
    if (ps) {
      const sv = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      sv.setAttribute("viewBox", "0 0 24 24");
      ps.forEach((d) => { const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); sv.append(p); });
      box.append(sv);
    } else {
      box.classList.add("marca-f-letra");
      if (id === "skillstore" || id === "cerebro") box.classList.add("marca-f-produto");
      box.textContent = SIGLAS[id] || String(id).slice(0, 2);
    }
    return box;
  };
  const RETRATO = '<defs><clipPath id="RID"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#RID)"><rect width="64" height="64" fill="#f3e4dc"/>' +
    '<path d="M14 64c1-11 8-17 18-17s17 6 18 17z" fill="#191817"/><path d="M27 41h10v8c0 2.5-2.2 4-5 4s-5-1.5-5-4z" fill="#c98b66"/>' +
    '<path d="M17 33c0-13 6-21 15-21s15 8 15 21c0 6-1 10-3 13l-2-15H21l-2 15c-1.5-3-2-7-2-13z" fill="#3b2a22"/>' +
    '<ellipse cx="32" cy="31" rx="10" ry="12" fill="#d89c76"/><path d="M21 28c2-8 7-11 12-11 6 0 10 4 11 10-4-3-8-5-12-5-4 0-8 2-11 6z" fill="#3b2a22"/>' +
    '<circle cx="28" cy="31" r="1.1" fill="#191817"/><circle cx="36" cy="31" r="1.1" fill="#191817"/><path d="M29.5 37c1.6 1.2 3.4 1.2 5 0" stroke="#8a2f12" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>';
  let nRetrato = 0;
  SK.retrato = function (px) {
    const id = "ret" + (++nRetrato);
    const sv = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    sv.setAttribute("viewBox", "0 0 64 64"); sv.setAttribute("class", "retrato"); sv.setAttribute("aria-hidden", "true");
    if (px) { sv.setAttribute("width", px); sv.setAttribute("height", px); }
    sv.innerHTML = RETRATO.replace(/RID/g, id); // modelo estático, nunca texto de usuário
    return sv;
  };
  SK.retratoSvg = (id) => RETRATO.replace(/RID/g, id);

  /* ---------- tempo ---------- */
  SK.reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  SK.depois = (ms, fn) => { const t = setTimeout(fn, SK.reduzido() ? 0 : ms); timers.push(t); return t; };
  SK.cada = (ms, fn) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  SK.quadro = (fn) => { const q = requestAnimationFrame(fn); quadros.push(q); return q; };
  function limparTempo() { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); quadros.forEach(cancelAnimationFrame); timers = []; quadros = []; }

  const fmtN = new Intl.NumberFormat("pt-BR");
  SK.fmt = (n) => fmtN.format(Math.round(n));
  SK.contar = function (el, de, ate, ms) {
    if (SK.reduzido() || !ms) { el.textContent = SK.fmt(ate); return; }
    const t0 = performance.now();
    const passo = (t) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = SK.fmt(de + (ate - de) * e);
      if (p < 1) SK.quadro(passo);
    };
    SK.quadro(passo);
  };

  /* ---------- anúncio ---------- */
  let vivo;
  SK.anunciar = (t) => { if (!vivo) return; vivo.textContent = ""; setTimeout(() => (vivo.textContent = t), 30); };

  /* ---------- toggle ---------- */
  SK.toggle = function (rotulo, ligado, aoMudar) {
    const b = SK.el("button", { class: "toggle", type: "button", role: "switch", "aria-checked": ligado ? "true" : "false" },
      SK.el("span", { class: "toggle-trilho" }, SK.el("span", { class: "toggle-bola" })), SK.el("span", { class: "toggle-rotulo" }, rotulo));
    b.addEventListener("click", () => { const v = b.getAttribute("aria-checked") !== "true"; b.setAttribute("aria-checked", v ? "true" : "false"); aoMudar && aoMudar(v); });
    return b;
  };

  /* ---------- painel lateral ---------- */
  let painelEl, fundoEl, painelVoltar, painelAoFechar;
  SK.painel = {
    abrir({ titulo, sobre, corpo, rodape, aoFechar }) {
      const jaAberto = painelEl.classList.contains("aberto");
      if (!jaAberto) painelVoltar = document.activeElement;
      painelAoFechar = aoFechar;
      painelEl.querySelector(".painel-titulo").textContent = titulo || "";
      const s = painelEl.querySelector(".painel-sobre"); s.textContent = sobre || ""; s.hidden = !sobre;
      const c = painelEl.querySelector(".painel-corpo"); c.replaceChildren(); if (corpo) c.append(corpo); c.scrollTop = 0;
      const r = painelEl.querySelector(".painel-rodape"); r.replaceChildren(); if (rodape) r.append(rodape);
      painelEl.classList.add("aberto"); fundoEl.classList.add("aberto");
      painelEl.setAttribute("aria-hidden", "false");
      if (jaAberto) { c.classList.remove("entra"); void c.offsetWidth; c.classList.add("entra"); }
      setTimeout(() => painelEl.querySelector(".painel-fechar").focus({ preventScroll: true }), 30);
    },
    fechar() {
      if (!painelEl.classList.contains("aberto")) return;
      painelEl.classList.remove("aberto"); fundoEl.classList.remove("aberto");
      painelEl.setAttribute("aria-hidden", "true");
      const f = painelAoFechar; painelAoFechar = null; f && f();
      if (painelVoltar && painelVoltar.isConnected) painelVoltar.focus({ preventScroll: true });
    },
    aberto: () => painelEl.classList.contains("aberto"),
  };

  /* ---------- movimento: esqueletos, passos, escalonar ---------- */
  SK.esqueleto = function (forma) {
    const L = (c) => SK.el("span", { class: "esqueleto " + c, "aria-hidden": "true" });
    const raiz = SK.el("div", { class: "esq esq-" + (forma || "lista"), role: "status", "aria-label": "Carregando" });
    if (forma === "cartoes") for (let i = 0; i < 3; i++) raiz.append(SK.el("div", { class: "esq-cartao" }, L("esq-titulo"), L("esq-linha"), L("esq-linha esq-linha-curta"), L("esq-linha")));
    else if (forma === "tabela") for (let i = 0; i < 6; i++) raiz.append(SK.el("div", { class: "esq-fila" }, L("esq-linha"), L("esq-linha esq-linha-curta"), L("esq-linha esq-linha-curta"), L("esq-circulo")));
    else if (forma === "mapa" || forma === "bloco") raiz.append(L("esq-bloco"));
    else for (let i = 0; i < 4; i++) raiz.append(SK.el("div", { class: "esq-fila" }, L("esq-circulo"), L("esq-linha"), L("esq-linha esq-linha-curta")));
    return raiz;
  };
  SK.carregar = function (el, ms, montar, forma) {
    el.setAttribute("aria-busy", "true");
    el.replaceChildren(SK.esqueleto(forma));
    SK.depois(ms == null ? 360 : ms, () => {
      el.replaceChildren();
      el.removeAttribute("aria-busy");
      try { montar(el); } catch (err) { console.error(err); }
      el.classList.remove("carregou"); void el.offsetWidth; el.classList.add("carregou");
    });
  };
  SK.passos = function (el, rotulos, op) {
    const ms = (op && op.ms) || 420;
    const ol = SK.el("ol", { class: "passos-carga", "aria-live": "polite" });
    const lis = rotulos.map((r) => SK.el("li", { class: "pc pc-pendente" }, SK.el("span", { class: "pc-marca", "aria-hidden": "true" }, SK.el("span", { class: "pc-gira" }), SK.icone("check", "ico-sm")), SK.el("span", { class: "pc-txt" }, r)));
    ol.append(...lis);
    el.append(ol);
    return new Promise((fim) => {
      if (SK.reduzido()) { lis.forEach((li) => (li.className = "pc pc-feito")); fim(); return; }
      lis.forEach((li, i) => {
        setTimeout(() => (li.className = "pc pc-andando"), i * ms);
        setTimeout(() => { li.className = "pc pc-feito"; if (i === lis.length - 1) setTimeout(fim, 160); }, i * ms + ms * 0.8);
      });
    });
  };
  SK.escalonar = function (nos, passo) {
    const lista = nos instanceof Element ? [...nos.children] : [...nos];
    lista.forEach((n, i) => { n.style.setProperty("--atraso", Math.min(i, 12) * (passo || 45) + "ms"); n.classList.remove("entra"); void n.offsetWidth; n.classList.add("entra"); });
  };

  /* ---------- conversa: contrato com o Builder C ---------- */
  let chatImpl = null;
  const chatProvisorio = () => SK.painel.abrir({ titulo: "Pergunte ao cérebro", sobre: "Em breve", corpo: SK.el("p", { class: "t-pequeno texto-2" }, "A conversa com o cérebro ainda está sendo montada.") });
  SK.chat = {
    registrar(impl) { chatImpl = typeof impl === "function" ? { abrir: impl } : impl; },
    abrir(pergunta) { if (chatImpl && chatImpl.abrir) chatImpl.abrir(pergunta); else chatProvisorio(); },
    fechar() { if (chatImpl && chatImpl.fechar) chatImpl.fechar(); },
    alternar() { if (chatImpl && chatImpl.alternar) chatImpl.alternar(); else SK.chat.abrir(); },
    aberto() { return !!(chatImpl && chatImpl.aberto && chatImpl.aberto()); },
    disponivel() { return !!chatImpl; },
  };

  /* ---------- registro e rota ---------- */
  SK.ato = function (def) {
    if (typeof def.id !== "number" && typeof def.id !== "string") return;
    atos.set(def.id, def);
    if (typeof def.id === "string" && palco && !palco.querySelector('.ato[data-ato="' + def.id + '"]')) palco.append(SK.el("section", { class: "ato", "data-ato": def.id, hidden: true, "aria-label": def.titulo || def.id }));
  };
  const ids = () => [...atos.keys()].filter((k) => typeof k === "number").sort((a, b) => a - b);
  const ordem = (k) => (typeof k === "number" ? k : 9);
  SK.ir = (n) => { location.hash = n === 8 || n === "inicio" ? "#/inicio" : typeof n === "string" ? "#/" + n : "#/ato-" + n; };
  SK.proximo = () => { const l = ids(), i = l.indexOf(atual); if (i >= 0 && i < l.length - 1) SK.ir(l[i + 1]); };
  SK.anterior = () => { const l = ids(), i = l.indexOf(atual); if (i > 0) SK.ir(l[i - 1]); };

  let palco, navEl, barraEl, posEl;

  function aplicarPadroes(n) {
    const e = SK.estado;
    for (const k of ids()) {
      if (k >= ordem(n)) break;
      if (e.passados.includes(k)) continue;
      const a = atos.get(k);
      try { a.padrao && a.padrao(e, e.vistos.includes(k)); } catch (err) { console.error(err); }
      e.passados.push(k);
    }
  }

  // trilha de passos na primeira volta: 1 Cérebro … 5 Acessos, 6 Início (atos 3 a 8). Feitos: tique e clicáveis; atual: tinta; próximos: cinza.
  const PASSOS = { 3: "Cérebro", 4: "Buracos", 5: "Pergunta", 6: "Skill", 7: "Acessos", 8: "Início" };
  // depois da primeira volta: navegação normal
  const NAV_CASA = [["inicio", "Início", [8]], [3, "Cérebro", [3]], [4, "Buracos", [4, 5]], ["skills", "Skills", [6, "skills"]], [7, "Acessos", [7]]];
  function desenharNav() {
    navEl.replaceChildren();
    const e = SK.estado;
    document.body.classList.toggle("em-casa", !!e.casa);
    if (e.casa) {
      const ul = SK.el("ul", { class: "nav-casa" });
      for (const [rota, nome, cobre] of NAV_CASA) {
        const ativo = cobre.includes(atual);
        const href = rota === "inicio" ? "#/inicio" : rota === "skills" ? (atos.has("skills") ? "#/skills" : "#/ato-6") : "#/ato-" + rota;
        ul.append(SK.el("li", {}, SK.el("a", { href, class: "nav-item nav-casa-item", "aria-current": ativo ? "page" : null }, nome)));
      }
      navEl.append(ul);
      navEl.hidden = false;
      const eng = document.querySelector(".barra-config"); if (eng) { if (atual === "config") eng.setAttribute("aria-current", "page"); else eng.removeAttribute("aria-current"); }
      requestAnimationFrame(focarAbaAtiva);
      return;
    }
    const lim = e.alcancado;
    const ol = SK.el("ol", { class: "trilha" });
    for (const k of ids()) {
      if (k < 3) continue;
      const num = k - 2, estado = k === atual ? "atual" : k <= lim ? "feito" : "depois";
      const marca = SK.el("span", { class: "passo-marca num", "aria-hidden": "true" }, estado === "feito" ? SK.icone("check", "ico-sm") : String(num));
      const nome = SK.el("span", { class: "passo-nome" }, PASSOS[k] || NOMES[k]);
      const rot = "Passo " + num + " de 6: " + (PASSOS[k] || NOMES[k]) + (estado === "feito" ? ", feito" : estado === "depois" ? ", ainda não" : "");
      const href = k === 8 ? "#/inicio" : "#/ato-" + k;
      const item = estado === "depois"
        ? SK.el("span", { class: "nav-item passo passo-depois", "aria-disabled": "true", "aria-label": rot }, marca, nome)
        : SK.el("a", { href, class: "nav-item passo passo-" + estado, "aria-label": rot }, marca, nome);
      if (estado === "atual") item.setAttribute("aria-current", "page");
      ol.append(SK.el("li", { class: "passo-li passo-li-" + estado }, item));
    }
    navEl.append(ol);
    const eng = document.querySelector(".barra-config"); if (eng) { if (atual === "config") eng.setAttribute("aria-current", "page"); else eng.removeAttribute("aria-current"); }
    navEl.hidden = typeof atual === "number" && atual < 3;
    requestAnimationFrame(focarAbaAtiva);
  }

  // a aba ativa sempre inteira à vista; desbotado só na borda que corta
  function bordasNav() {
    const max = navEl.scrollWidth - navEl.clientWidth;
    navEl.classList.toggle("corta-esq", navEl.scrollLeft > 2);
    navEl.classList.toggle("corta-dir", max > 2 && navEl.scrollLeft < max - 2);
  }
  function focarAbaAtiva() {
    const a = navEl.querySelector('[aria-current="page"]');
    if (a) {
      const max = navEl.scrollWidth - navEl.clientWidth;
      if (max > 0) navEl.scrollLeft = Math.max(0, Math.min(max, a.offsetLeft + a.offsetWidth / 2 - navEl.clientWidth / 2));
    }
    bordasNav();
  }

  function mostrar(n) {
    if (!atos.has(n)) n = 0;
    const e = SK.estado;
    const antes = atual;
    if (atual !== null && atos.has(atual)) { const v = atos.get(atual); try { v.sair && v.sair(); } catch (err) { console.error(err); } }
    limparTempo();
    SK.painel.fechar();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    aplicarPadroes(n);
    if (!e.passados.includes(n)) { /* o ato atual não aplica o próprio padrão */ }
    if (!e.vistos.includes(n)) e.vistos.push(n);
    e.alcancado = Math.max(e.alcancado, Math.min(ordem(n), 8));
    if (n === 8 || typeof n === "string") e.casa = true;
    SK.salvar();
    atual = n;
    const a = atos.get(n);
    palco.querySelectorAll(".ato").forEach((s) => { s.hidden = true; s.replaceChildren(); });
    const sec = palco.querySelector('.ato[data-ato="' + n + '"]');
    document.body.dataset.ato = n;
    document.body.classList.toggle("com-app", ordem(n) >= 3);
    try { a.montar && a.montar(sec, D); } catch (err) { console.error(err); }
    sec.hidden = false;
    const tras = antes !== null && ordem(n) < ordem(antes);
    sec.classList.remove("ato-entra", "ato-frente", "ato-tras"); void sec.offsetWidth; sec.classList.add("ato-entra", tras ? "ato-tras" : "ato-frente");
    window.scrollTo(0, 0);
    desenharNav();
    document.title = (a.titulo || NOMES[n]) + " · skillstore";
    const h = sec.querySelector("h1");
    if (h && document.activeElement && document.activeElement !== document.body && !sec.contains(document.activeElement)) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    try { a.entrar && a.entrar(); } catch (err) { console.error(err); }
    document.dispatchEvent(new CustomEvent("sk:ato", { detail: { id: n } }));
  }

  function rota() {
    const h = location.hash;
    const m = /^#\/ato-(\d+)/.exec(h);
    if (m) return mostrar(Number(m[1]));
    if (/^#\/inicio/.test(h)) return mostrar(8);
    const nome = /^#\/([a-z][a-z0-9-]*)/.exec(h);
    if (nome && atos.has(nome[1])) return mostrar(nome[1]);
    mostrar(0);
  }

  // monta de novo a tela atual (depois de uma mudança de estado feita num painel)
  SK.recarregar = () => { if (atual !== null) mostrar(atual); };

  function reiniciar() {
    try { sessionStorage.removeItem(CHAVE); } catch (e) {}
    SK.estado = padraoEstado();
    Object.keys(navEl.dataset).forEach((k) => delete navEl.dataset[k]);
    document.dispatchEvent(new CustomEvent("sk:reiniciar"));
    if (location.hash === "#/ato-0") mostrar(0); else SK.ir(0);
  }

  function marca() {
    return SK.el("a", { href: "#/ato-0", class: "marca", "aria-label": "skillstore, início" }, SK.el("span", { class: "marca-nome" }, "skillstore"));
  }

  function construir() {
    palco = null;
    const app = document.getElementById("app");
    barraEl = SK.el("header", { class: "barra" });
    navEl = SK.el("nav", { class: "nav", "aria-label": "Áreas do cérebro", hidden: true });
    navEl.addEventListener("scroll", bordasNav, { passive: true });
    window.addEventListener("resize", () => requestAnimationFrame(focarAbaAtiva));
    posEl = SK.el("span", { class: "barra-pos t-micro num", "aria-live": "off" });
    const ctrl = SK.el("div", { class: "barra-ctrl" },
      SK.el("button", { class: "btn btn-quieto btn-sm barra-seta", type: "button", "aria-label": "Ato anterior", on: { click: SK.anterior } }, SK.icone("seta-esq", "ico-sm")),
      SK.el("button", { class: "btn btn-quieto btn-sm barra-seta", type: "button", "aria-label": "Próximo ato", on: { click: SK.proximo } }, SK.icone("seta", "ico-sm")),
      SK.el("button", { class: "btn btn-quieto btn-sm barra-reiniciar", type: "button", on: { click: reiniciar } }, SK.icone("reiniciar", "ico-sm"), SK.el("span", { class: "barra-reiniciar-txt" }, "Reiniciar")),
      SK.el("span", { class: "temas", role: "group", "aria-label": "Direção visual" }, ...TEMAS.map(([id, nome, cor]) => SK.el("button", { class: "tema-bt", type: "button", "data-tema": id, title: "Tema " + nome, "aria-label": "Tema " + nome, "aria-pressed": document.documentElement.dataset.tema === id ? "true" : "false", on: { click: () => SK.tema(id) } }, SK.el("span", { style: { background: cor } })))));
    const quem = SK.el("div", { class: "barra-quem", "aria-label": "Conta" }, SK.el("span", { class: "barra-empresa t-pequeno" }, D.empresa.nome), SK.el("span", { class: "avatar avatar-sm avatar-retrato", title: D.usuaria.nome }, SK.retrato()));
    const tag = SK.el("span", { class: "tag-prototipo", role: "note", title: "Protótipo · dados inventados", "aria-label": "Protótipo · dados inventados" },
      SK.el("span", { "aria-hidden": "true" }, "Protótipo"), SK.el("span", { class: "tag-prototipo-resto", "aria-hidden": "true" }, " · dados inventados"));
    const pergunte = SK.el("button", { class: "btn btn-secundario btn-sm barra-pergunte", type: "button", title: "Pergunte ao cérebro (Ctrl ou Cmd + K)", "aria-keyshortcuts": "Control+K Meta+K", on: { click: () => SK.chat.abrir() } }, SK.icone("chat", "ico-sm"), SK.el("span", {}, "Pergunte"));
    const engrenagem = SK.el("a", { class: "btn btn-quieto btn-sm barra-config", href: "#/config", "aria-label": "Configurações", title: "Configurações" }, SK.el("span", { class: "ico-engrenagem", "aria-hidden": "true" }));
    engrenagem.querySelector("span").append(SK.icone("engrenagem"));
    barraEl.append(marca(), navEl, SK.el("div", { class: "barra-dir" }, pergunte, quem, tag, engrenagem, ctrl));
    palco = SK.el("main", { id: "palco", class: "palco" });
    for (let k = 0; k <= 8; k++) palco.append(SK.el("section", { class: "ato", "data-ato": String(k), hidden: true, "aria-label": NOMES[k] }));
    for (const k of atos.keys()) if (typeof k === "string") palco.append(SK.el("section", { class: "ato", "data-ato": k, hidden: true, "aria-label": atos.get(k).titulo || k }));
    fundoEl = SK.el("div", { class: "painel-fundo", on: { click: () => SK.painel.fechar() } });
    painelEl = SK.el("aside", { class: "painel", role: "dialog", "aria-modal": "false", "aria-hidden": "true", "aria-labelledby": "painel-titulo" },
      SK.el("div", { class: "painel-topo" },
        SK.el("div", {}, SK.el("h2", { class: "painel-titulo", id: "painel-titulo" }), SK.el("p", { class: "painel-sobre" })),
        SK.el("button", { class: "painel-fechar", type: "button", "aria-label": "Fechar painel", on: { click: () => SK.painel.fechar() } }, SK.icone("fechar"))),
      SK.el("div", { class: "painel-corpo" }),
      SK.el("div", { class: "painel-rodape" }));
    vivo = SK.el("div", { class: "sr-only", "aria-live": "polite" });
    app.append(barraEl, palco, fundoEl, painelEl, vivo);
    painelEl.inert = true;
    new MutationObserver(() => { painelEl.inert = !painelEl.classList.contains("aberto"); }).observe(painelEl, { attributes: true, attributeFilter: ["class"] });
  }

  function provisorio(k) {
    return {
      id: k, titulo: NOMES[k],
      montar(el) {
        el.append(SK.el("div", { class: "ato-papel ato-provisorio" },
          SK.el("h1", { class: "t-titulo" }, NOMES[k]),
          SK.el("p", { class: "t-sub texto-2" }, "Esta parte está sendo montada."),
          SK.el("div", { class: "fila" }, SK.el("button", { class: "btn btn-secundario", type: "button", on: { click: SK.anterior } }, SK.icone("seta-esq", "ico-sm"), "Voltar"))));
      },
    };
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && SK.painel.aberto()) { SK.painel.fechar(); return; }
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === "k" || ev.key === "K") && !chatImpl && SK.estado.casa) { ev.preventDefault(); SK.chat.abrir(); return; }
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    if (SK.estado.casa) return;
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const t = ev.target;
    if (t && (t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='tablist'], [role='slider']") )) return;
    if (document.querySelector("dialog[open]") || SK.painel.aberto()) return;
    ev.preventDefault();
    ev.key === "ArrowRight" ? SK.proximo() : SK.anterior();
  });

  document.addEventListener("DOMContentLoaded", () => {
    construir();
    for (let k = 0; k <= 8; k++) if (!atos.has(k)) atos.set(k, provisorio(k));
    if (!atos.has("config")) { const pc = provisorio(3); pc.id = "config"; pc.titulo = "Configurações"; pc.montar = (el) => el.append(SK.el("div", { class: "ato-papel ato-provisorio" }, SK.el("h1", { class: "t-titulo" }, "Configurações"), SK.el("p", { class: "t-sub texto-2" }, "Esta parte está sendo montada."))); SK.ato(pc); }
    window.addEventListener("hashchange", rota);
    rota();
  });
})();
