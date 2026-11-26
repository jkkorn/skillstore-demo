/* atos-c.js · Builder C: "Pergunte ao cérebro" (chat), Configurações e o componente de chave de IA.
 *
 * COMPONENTE REUTILIZÁVEL (para o passo "Traga a sua IA" do onboarding)
 *   SK.chaves.linha(id, opcoes) -> HTMLElement   uma linha pronta, com marca, estado e ações.
 *     id       'dentro-claude' | 'dentro-chatgpt'   rodar dentro do assistente que o time já usa (lê SK.estado.skillEm)
 *              'claude' | 'chatgpt'                 chave de API (Console da Anthropic, Bedrock, Vertex / OpenAI, Azure)
 *              'copilot'                            só "Pelo Azure da empresa", sem chave
 *              'roteador'                           roteador da empresa (OpenRouter, Toqan Router ou compatível), com chave
 *     opcoes   { padrao: true      mostra "Padrão" / "Usar como padrão" quando conectada (padrão: true)
 *                aoMudar(ia)       chamado depois de conectar, desconectar ou trocar o padrão; ia = SK.estado.ia }
 *     A linha se redesenha sozinha quando outra linha muda o padrão (evento "sk:ia" em document).
 *   SK.chaves.ias                 [{ id, nome, de, dica }] as três IAs, na ordem.
 *   SK.chaves.estado()            garante e devolve SK.estado.ia (abaixo).
 *   SK.chaves.lista(opcoes)       os três jeitos, em grupos, dentro de <ul class="lista c-chaves">.
 *   Onboarding vazio: antes de desenhar, faça SK.estado.ia = { padrao: null } (nada conectado).
 *
 * CHAT
 *   SK.conversa.abrir(pergunta?) / .fechar() / .alternar() / .aberto()   o painel "Pergunte ao cérebro".
 *   Registrado na casca por SK.chat.registrar(SK.conversa): o botão "Pergunte" e Ctrl/Cmd+K abrem e fecham
 *   (depois do onboarding: SK.estado.casa ou alcancado >= 3). Configurações: SK.ato({ id: "config" }) em #/config.
 *
 * CAMPOS QUE ACRESCENTO EM SK.estado (criados na primeira leitura, voltam ao padrão com "Reiniciar")
 *   departamentos  [{ id, nome, pessoas, membros:[ids de pessoa], novo }]   os 8 times + os criados.
 *                  pessoas = quantas pessoas no total; membros = as pessoas com nome que estão nele.
 *                  Os 8 vêm de SK.dados.times com o mesmo id; criados têm novo:true e id "dep-<nome>".
 *                  Uma pessoa pode estar em mais de um departamento (o Douglas na Diretoria e no Financeiro).
 *   ia             { claude: null | { via:'chave', fim:'4f2a' }, chatgpt: …, copilot: (sempre null: só pelo Azure),
 *                    roteador: null | { via:'chave', fim } (NOVO), padrao: 'dentro' (NOVO valor) | 'claude' | 'chatgpt' | 'roteador' | null }
 *                  padrao null ou 'dentro' = rodar dentro do assistente que o time já usa. via:'conta' não existe mais.
 *                  padrão ao abrir direto: chave do Claude terminando em 4f2a conectada; padrao 'dentro'.
 *   c              { conversa: [ mensagens ] }  a conversa do chat (só do Builder C).
 *   Lê e escreve também: conectadas (fontes), skillEm (onde as skills vivem), b.verComo ("ver como Engenharia").
 * Texto de quem usa entra sempre como nó de texto.
 */
(function () {
  const SK = window.SK, D = SK.dados, el = SK.el, ic = SK.icone;
  const E = () => SK.estado;
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const reduz = () => SK.reduzido();
  const depois = (ms, fn) => setTimeout(fn, reduz() ? 0 : ms); // timers do chat sobrevivem à troca de tela
  const btn = (classe, rotulo, aoClicar, ...extra) => el("button", { class: "btn " + classe, type: "button", on: { click: aoClicar } }, ...extra, rotulo);
  const pessoa = (id) => D.pessoas.find((p) => p.id === id) || D.externos.find((p) => p.id === id);
  const nomeDe = (id) => (pessoa(id) || {}).nome || id;
  const primeiroDe = (id) => { const p = pessoa(id); return p ? p.primeiro || p.curto || p.nome : id; };
  const lista = (xs) => (xs.length < 2 ? xs.join("") : xs.length === 2 ? xs.join(" and ") : xs.slice(0, -1).join(", ") + ", and " + xs[xs.length - 1]);
  const pl = (n, um, varios) => n + " " + (n === 1 ? um : varios);

  /* ============================================================ estado */
  function deps() {
    const e = E();
    if (!Array.isArray(e.departamentos)) {
      e.departamentos = D.times.map((t) => ({ id: t.id, nome: t.nome, pessoas: t.pessoas, membros: D.pessoas.filter((p) => p.time === t.id).map((p) => p.id), novo: false }));
      SK.salvar();
    }
    return e.departamentos;
  }
  function iaEstado() {
    const e = E();
    if (!e.ia || typeof e.ia !== "object") { e.ia = { claude: { via: "chave", fim: "4f2a" }, chatgpt: null, copilot: null, roteador: null, padrao: "dentro" }; SK.salvar(); }
    if (!("roteador" in e.ia)) e.ia.roteador = null;
    return e.ia;
  }
  function conversa() { const e = E(); e.c = e.c || {}; if (!Array.isArray(e.c.conversa)) e.c.conversa = []; return e.c.conversa; }
  const conectadas = () => E().conectadas || [];
  const GOOGLE = ["gmail", "drive", "agenda"];
  const procsVisiveis = () => D.processos.filter((p) => GOOGLE.includes(p.fonte) || p.fonte === "site" || conectadas().includes(p.fonte));
  const escalasVisiveis = () => D.escalas.filter((x) => GOOGLE.includes(x.fonte) || conectadas().includes(x.fonte));
  const suite = () => D.suites[E().suite] || D.suites.google;
  const MS = { gmail: "Outlook", drive: "OneDrive", agenda: "Calendar" };
  const nomeFonte = (f) => (suite().id === "microsoft" && MS[f]) || ({ gmail: "Gmail", drive: "Drive", agenda: "Calendar", site: "Website" }[f] || (D.integracoes.find((i) => i.id === f) || {}).nome || f);
  const pontos = (id) => D.ganhoDe(id, suite().id) || 0;
  const cobertura = () => D.coberturaDe(conectadas(), suite().id);
  const nBase = () => (D[suite().fontes] || D.fontesGoogle).length;

  /* ============================================================ SK.chaves: três jeitos honestos de rodar as skills
   * 1. Dentro do assistente que o time já usa (Claude, ChatGPT): sem custo novo; nunca tocamos na conta de vocês.
   *    "Conectado" quando o lugar está ligado em "Onde as skills vivem" (SK.estado.skillEm).
   * 2. Chave de API por fornecedor (cobrada na conta da empresa). Copilot: só pelo Azure da empresa, sem chave aqui.
   * 3. Roteador da empresa (OpenRouter, Toqan Router ou compatível), com chave.
   * Nada de entrar com a assinatura de alguém: assinatura é para os apps do próprio fornecedor. */
  const IAS = [
    { id: "claude", nome: "Claude", de: "Anthropic", onde: "Anthropic Console, Amazon Bedrock or Google Vertex", dica: "sk-ant-…" },
    { id: "chatgpt", nome: "ChatGPT", de: "OpenAI", onde: "OpenAI platform or Azure", dica: "sk-…" },
    { id: "copilot", nome: "Microsoft Copilot", de: "Microsoft 365", onde: "Through the company’s Azure", semChave: true },
    { id: "roteador", nome: "Router key", de: "", onde: "OpenRouter, Toqan Router or another compatible one", dica: "Router key", roteador: true },
  ];
  const DENTRO = [{ id: "claude", nome: "Claude" }, { id: "chatgpt", nome: "ChatGPT" }];
  const MARCA_IA = { copilot: "microsoft" };
  const padraoDe = () => { const st = iaEstado(); return st.padrao && (st.padrao === "dentro" || st[st.padrao]) ? st.padrao : "dentro"; };
  function marcaIA(id) {
    if (id === "roteador") return el("span", { class: "marca-f marca-f-letra c-chave-marca", "aria-hidden": "true" }, "Rt");
    return SK.marca(MARCA_IA[id] || id, "c-chave-marca");
  }
  function avisarIA(id, op) { document.dispatchEvent(new CustomEvent("sk:ia", { detail: { id } })); op && op.aoMudar && op.aoMudar(iaEstado()); }
  const aoIaRedesenha = (raiz, fn) => { const h = () => { if (!raiz.isConnected) { document.removeEventListener("sk:ia", h); return; } fn(); }; document.addEventListener("sk:ia", h); };
  const ok = (recem) => el("span", { class: "c-ok" + (recem ? " c-carimbo" : ""), "aria-hidden": "true" }, ic("check", "ico-sm"));

  // 1. dentro do assistente que o time já usa
  function linhaDentro(d, op) {
    op = Object.assign({ padrao: true }, op || {});
    const raiz = el("li", { class: "c-chave", "data-ia": "dentro-" + d.id });
    function desenhar() {
      const e = E(), ligado = !!(e.skillEm && e.skillEm[d.id]);
      raiz.replaceChildren();
      raiz.classList.toggle("ligada", ligado);
      const status = el("p", { class: "c-chave-status t-pequeno" }, ...(ligado ? [ok(), "Connected · skills already live in " + d.nome] : ["Not yet in " + d.nome]));
      const acoes = el("div", { class: "c-chave-acoes" });
      if (op.padrao && padraoDe() === "dentro" && d.id === "claude") acoes.append(el("span", { class: "chip chip-anil" }, "Default"));
      if (document.getElementById("c-sec-skills")) acoes.append(btn("btn-quieto btn-sm", "See where skills live", () => irConfig("c-sec-skills")));
      else if (!ligado) acoes.append(btn("btn-secundario btn-sm", "Use " + d.nome, () => { const s = E(); s.skillEm = Object.assign({ claude: false, chatgpt: false, grok: false, slack: false }, s.skillEm); s.skillEm[d.id] = true; SK.salvar(); avisarIA("dentro", op); SK.anunciar("Skills will live in " + d.nome + "."); }));
      raiz.append(SK.marca(d.id, "c-chave-marca"), el("div", { class: "c-chave-txt" }, el("p", { class: "c-chave-nome" }, el("span", { class: "forte" }, "Run in your company’s " + d.nome)), status), acoes);
    }
    aoIaRedesenha(raiz, desenhar);
    desenhar();
    return raiz;
  }

  // 2 e 3. chave de API por fornecedor, ou do roteador
  function linhaChave(id, op) {
    op = Object.assign({ padrao: true }, op || {});
    const ia = IAS.find((x) => x.id === id);
    const raiz = el("li", { class: "c-chave", "data-ia": id });
    let modo = "ver"; // ver | colar | conferindo
    function conectar(fim) {
      const st = iaEstado();
      st[id] = { via: "chave", fim };
      SK.salvar(); modo = "ver"; desenhar(true); avisarIA(id, op);
      SK.anunciar(ia.nome + " connected.");
    }
    function desenhar(recem) {
      const st = iaEstado(), c = ia.semChave ? null : st[id];
      raiz.replaceChildren();
      raiz.classList.toggle("ligada", !!c);
      const status = el("p", { class: "c-chave-status t-pequeno" });
      if (modo === "conferindo") status.append(el("span", { class: "c-gira", "aria-hidden": "true" }), "Checking the key…");
      else if (c) status.append(ok(recem), "Connected · key ending in ••••" + c.fim);
      else status.append(ia.onde);
      const titulo = el("p", { class: "c-chave-nome" }, el("span", { class: "forte" }, ia.nome), ia.de ? el("span", { class: "texto-2 t-pequeno" }, " · " + ia.de) : null);
      const txt = el("div", { class: "c-chave-txt" }, titulo, status, ia.roteador && !c && modo !== "conferindo" ? el("p", { class: "t-pequeno texto-2" }, "If the company already controls models and spend in a router, skills go through it.") : null,
        c && ia.roteador ? el("p", { class: "t-pequeno texto-2" }, ia.onde) : null);
      const acoes = el("div", { class: "c-chave-acoes" });
      if (ia.semChave || modo === "conferindo") { /* Copilot: pelo Azure da empresa, sem chave aqui */ }
      else if (c) {
        if (op.padrao) acoes.append(padraoDe() === id ? el("span", { class: "chip chip-anil" }, "Default")
          : btn("btn-quieto btn-sm", "Use as default", () => { iaEstado().padrao = id; SK.salvar(); avisarIA(id, op); }));
        acoes.append(btn("btn-quieto btn-sm", "Disconnect", () => {
          const s = iaEstado(); s[id] = null; if (s.padrao === id) s.padrao = "dentro";
          SK.salvar(); desenhar(); avisarIA(id, op); const b = raiz.querySelector("button"); b && b.focus();
        }, el("span", { class: "sr-only" }, ia.nome + ": ")));
      } else if (modo === "ver") acoes.append(btn("btn-secundario btn-sm", "Paste the key", () => { modo = "colar"; desenhar(); }, el("span", { class: "sr-only" }, ia.nome + ": ")));
      raiz.append(marcaIA(id), txt, acoes);
      if (modo === "colar") {
        const campo = el("input", { class: "c-campo", type: "password", id: "c-chave-" + id, autocomplete: "off", spellcheck: "false", placeholder: ia.dica, "aria-describedby": "c-chave-erro-" + id });
        const erro = el("p", { class: "c-erro t-pequeno", id: "c-chave-erro-" + id, "aria-live": "polite" });
        const enviar = (ev) => {
          ev.preventDefault();
          const v = campo.value.trim();
          if (v.length < 8) { erro.textContent = "That key looks short. Paste the whole key."; campo.focus(); return; }
          const fim = v.slice(-4); campo.value = ""; // não guardo a chave, só o fim dela
          modo = "conferindo"; desenhar(); depois(650, () => conectar(fim));
        };
        raiz.append(el("form", { class: "c-chave-form", on: { submit: enviar } },
          el("label", { class: "sr-only", for: "c-chave-" + id }, "Key for " + ia.nome),
          campo,
          el("button", { class: "btn btn-secundario btn-sm", type: "submit" }, "Connect"),
          btn("btn-quieto btn-sm", "Cancel", () => { modo = "ver"; desenhar(); const b = raiz.querySelector(".btn-secundario"); b && b.focus(); }),
          erro));
        setTimeout(() => campo.focus({ preventScroll: true }), 30);
      }
    }
    aoIaRedesenha(raiz, () => { if (modo === "ver") desenhar(); });
    desenhar();
    return raiz;
  }
  const grupo = (titulo, linha, chip) => el("li", { class: "c-chaves-grupo" }, el("p", { class: "c-chaves-grupo-tit" }, el("span", { class: "forte" }, titulo), chip ? el("span", { class: "chip chip-ok c-tag-sm" }, chip) : null), linha ? el("p", { class: "t-pequeno texto-2" }, linha) : null);
  SK.chaves = {
    ias: IAS,
    estado: iaEstado,
    linha: (id, op) => (/^dentro-/.test(id) ? linhaDentro(DENTRO.find((d) => "dentro-" + d.id === id), op) : linhaChave(id, op)),
    lista: (op) => { iaEstado(); return el("ul", { class: "lista c-chaves" },
      grupo("Inside the assistant the team already uses", "Skills run inside the assistant the team already uses. We never touch your account.", "No new cost"),
      ...DENTRO.map((d) => linhaDentro(d, op)),
      grupo("API key", "Usage is billed to your company’s account."),
      ...["claude", "chatgpt", "copilot"].map((id) => linhaChave(id, op)),
      grupo("Company router"),
      linhaChave("roteador", op)); },
  };

  /* ============================================================ fontes (Configurações e o painel do chat) */
  function coberturaEl() {
    const v = cobertura(), su = suite();
    return el("div", { class: "c-cob", role: "group", "aria-label": "Map coverage" },
      el("div", { class: "c-cob-topo" }, el("span", { class: "t-pequeno texto-2" }, "Map coverage"), el("span", { class: "c-cob-fig num" }, v + "%")),
      el("span", { class: "c-cob-barra" }, el("span", { class: "c-cob-cheio", style: { width: v + "%" } })),
      el("p", { class: "t-pequeno texto-2" }, "How much of Lume’s work I can see. " + su.nome + " gives the base of " + su.base + " points; each source adds its own."));
  }
  function listaFontes() {
    const raiz = el("div", { class: "pilha c-fontes", style: { "--gap": "20px" } });
    const c = conectadas(), su = suite(), base = D[su.fontes] || D.fontesGoogle;
    const ligadas = D.porGanho(su.id, D.integracoes.filter((i) => c.includes(i.id)));
    const faltam = D.porGanho(su.id, D.integracoes.filter((i) => !c.includes(i.id)));
    const linhaBase = el("li", { class: "linha c-fonte" },
      el("span", { class: "c-marcas3" }, ...base.map((f) => ((window.SK_MARCAS || {})[f.id] ? SK.marca(f.id, "mf-sm") : el("span", { class: "marca-f mf-sm" }, ic("agenda", "ico-sm"))))),
      el("div", { class: "linha-principal" }, el("span", { class: "forte" }, lista(base.map((f) => f.nome))), el("span", { class: "t-pequeno texto-2" }, "The base: what I read in " + su.nome + ".")),
      el("div", { class: "linha-meta" }, el("span", { class: "c-pontos num" }, su.base + " points")));
    const linha = (it, ligada, maior) => {
      const acao = el("div", { class: "linha-meta" }, el("span", { class: "c-pontos num" + (ligada ? "" : " c-pontos-mais") }, (ligada ? "" : "+") + pontos(it.id) + " points"));
      if (ligada) acao.append(el("span", { class: "chip chip-ok" }, ic("check", "ico-sm"), "Connected"));
      else acao.append(el("button", { class: "btn btn-secundario btn-sm c-conectar", type: "button", "aria-label": "Connect " + it.nome, on: { click: () => abrirFontes(it.id) } }, "Connect"));
      const motivo = D.motivoDe(it.id, su.id);
      return el("li", { class: "linha c-fonte" + (maior ? " c-maior" : ""), "data-fonte": it.id },
        SK.marca(it.id, "mf-sm"),
        el("div", { class: "linha-principal" },
          el("span", { class: "c-fonte-nome" }, el("span", { class: "forte" }, it.nome), maior ? el("span", { class: "chip chip-anil c-tag-sm" }, "Biggest gain") : null, it.conceito ? el("span", { class: "tag-conceito c-tag-sm" }, "Concept · not available yet") : null),
          el("span", { class: "t-pequeno texto-2" }, ligada ? it.adicionou : maior && motivo ? motivo.charAt(0).toUpperCase() + motivo.slice(1) + "." : "Adds " + it.acrescentaria + ".")),
        acao);
    };
    raiz.append(coberturaEl(),
      el("div", { class: "pilha", style: { "--gap": "8px" } }, el("h3", { class: "c-h3" }, "Connected · " + (base.length + ligadas.length)),
        el("ul", { class: "lista c-caixa" }, linhaBase, ...ligadas.map((i) => linha(i, true, false)))),
      faltam.length ? el("div", { class: "pilha", style: { "--gap": "8px" } }, el("h3", { class: "c-h3" }, "To connect · " + faltam.length),
        el("ul", { class: "lista c-caixa" }, ...faltam.map((i, k) => linha(i, false, k === 0)))) : null);
    return raiz;
  }
  // o painel de fontes é o do Builder A (SK.fontes.abrir); ao fechar com algo conectado, a casca remonta a tela (SK.recarregar)
  function abrirFontes(destaque) {
    const voltarAoChat = chat.aberto();
    if (voltarAoChat) chat.fechar(true);
    const antes = conectadas().slice();
    const aoFechar = (mudou) => {
      if (mudou) {
        const novas = conectadas().filter((x) => !antes.includes(x)).map((id) => D.integracoes.find((i) => i.id === id)).filter(Boolean);
        if (novas.length) { novas.forEach((it) => conversa().push({ quem: "cerebro", partes: [it.feed + " Coverage now: " + cobertura() + "%."], fontes: [{ f: it.id }], acao: null })); SK.salvar(); }
      }
      if (voltarAoChat) setTimeout(() => chat.abrir(), 80);
    };
    if (SK.fontes && SK.fontes.abrir) SK.fontes.abrir({ aoFechar });
    else { irConfig("c-sec-fontes"); return; }
    if (destaque) setTimeout(() => { const b = [...document.querySelectorAll(".painel button")].find((x) => x.getAttribute("aria-label") === "Connect " + nomeFonte(destaque)); if (b) b.focus(); }, 360);
  }
  const remontar = () => (typeof SK.recarregar === "function" ? SK.recarregar() : window.dispatchEvent(new HashChangeEvent("hashchange"))); // a casca remonta o ato atual


  /* ============================================================ entendimento (casamento simples sobre dados.js) */
  const ALIAS_TIME = { operacoes: ["operations", "ops"], tesouraria: ["treasury"], risco: ["risk"], atendimento: ["support", "customer support", "service"], engenharia: ["engineering", "tech", "technology"], comercial: ["sales", "commercial"], rh: ["hr", "human resources"], diretoria: ["leadership", "executive team", "executives", "management"] };
  const ALIAS_PROC = [
    ["repasse-retido", ["held payout", "payout hold", "withheld", "retention"]],
    ["troca-conta", ["account change", "change of account", "change of payout account", "payout account", "change account", "switch account"]],
    ["fechamento-mes", ["month-end", "month end", "monthly close", "accounting"]],
    ["primeira-resposta", ["first reply", "first response", "1 hour", "1-hour", "one hour", "promise"]],
    ["antecipacao", ["advance"]], ["conciliacao", ["reconcil"]], ["chargeback", ["chargeback", "dispute"]],
    ["incidente", ["incident"]], ["taxa-especial", ["special rate", "special fee"]], ["admissao", ["hire", "hiring", "onboarding"]], ["caixa-diario", ["cash close", "daily cash", "cash"]],
    ["estorno", ["refund"]], ["proposta", ["proposal"]], ["bloqueio", ["block"]], ["deploy", ["publishing", "release", "deploy", "merchant app"]], ["liquidacao", ["settlement"]],
  ];
  const tem = (t, ...xs) => xs.some((x) => (x instanceof RegExp ? x.test(t) : t.includes(x)));
  function acharTime(t) {
    const criado = deps().find((d) => d.novo && new RegExp("\\b" + norm(d.nome).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(t));
    if (criado) return criado;
    for (const [id, xs] of Object.entries(ALIAS_TIME)) if (xs.some((x) => new RegExp("\\b" + x + "\\b").test(t))) return deps().find((d) => d.id === id) || null;
    return null;
  }
  function acharProc(t) { for (const [id, xs] of ALIAS_PROC) if (xs.some((x) => t.includes(x))) return D.processos.find((p) => p.id === id); return null; }
  function acharFonte(t) {
    const al = { tldv: ["tldv", "tl;dv", "tl dv"], cloudhumans: ["cloudhumans", "cloud humans"], revenuecat: ["revenuecat", "revenue cat"] };
    return D.integracoes.find((i) => (al[i.id] || [norm(i.nome)]).some((x) => t.includes(x))) || null;
  }
  const visivelProc = (p) => GOOGLE.includes(p.fonte) || p.fonte === "site" || conectadas().includes(p.fonte);
  const fontesDe = (p) => (p.fontes || []).map((f) => ({ f: f.fonte, rotulo: f.rotulo || nomeFonte(f.fonte) + " · " + (f.data || "") }));
  const regraAtual = () => (E().regraAprovada ? ((E().b && Array.isArray(E().b.regra) && E().b.regra.length) ? E().b.regra : D.pergunta.regra) : null);

  function paraMim() {
    const xs = escalasVisiveis().filter((x) => x.para === "marina");
    const grupos = new Map();
    xs.forEach((x) => { const g = grupos.get(x.sobre) || { sobre: x.sobre, porMes: 0, de: [] }; g.porMes += x.porMes; g.de.push(primeiroDe(x.de)); grupos.set(x.sobre, g); });
    return [...grupos.values()].sort((a, b) => b.porMes - a.porMes);
  }
  const totalParaMim = () => paraMim().reduce((s, g) => s + (g.sobre === "On-demand advance" && E().regraAprovada ? 0 : g.porMes), 0);

  function responder(texto) {
    const t = norm(texto), e = E();
    // 1. criar departamento
    const mDep = /\b(?:create|add|make|set up|new)\b.*\b(?:department|team|area)\b/.test(t);
    if (mDep) return criarDepPorTexto(texto);
    // 2. conectar fonte
    const fonte = acharFonte(t);
    if (fonte && tem(t, "connect", "link", "add ", "integrat", "bring", "hook up", "plug", "enable", "turn on")) return respConectar(fonte);
    if (tem(t, "connect", "sources") && !fonte && !tem(t, /\bkey\b/, "claude", "chatgpt", "copilot")) return { partes: ["I opened the sources. The ones that add the most to coverage are at the top."], fontes: [], faz: { tipo: "fontes" } };
    // 3. ver como uma área
    if (/\b(?:how|as|like|eyes of|view of)\s+(?:the\s+)?(engineering|hr|treasury|operations|executive team|leadership|risk|sales|support)\b/.test(t) || /view as|see it as|see as/.test(t)) {
      const m = /(engineering|hr|treasury|operations|executive team|leadership|risk|sales|support)/.exec(t);
      if (!m || m[1] === "engineering") return { partes: [], depoisDe: "acessos", fontes: [{ f: "drive", rotulo: "Drive · folder “HR / Hires”" }], faz: { tipo: "verEng" } };
      return { partes: ["In this prototype I show the preview as Engineering sees it. The other areas follow the marks in the Access matrix."], fontes: [], acao: { rotulo: "Open Access", tipo: "ir", arg: 7 } };
    }
    // 4. a regra da antecipação
    if (tem(t, "rule") && tem(t, "advance", "treasury") || (tem(t, "open") && tem(t, "advance"))) return respRegra();
    // 5. chave de IA
    if (tem(t, /\bkeys?\b/, "claude", "chatgpt", "copilot", "openai", "anthropic")) {
      const st = iaEstado(), lig = IAS.filter((x) => !x.semChave && st[x.id]), dentro = DENTRO.filter((d) => E().skillEm && E().skillEm[d.id]);
      return { partes: ["By default, skills run inside the assistant the team already uses" + (dentro.length ? ": today in " + lista(dentro.map((d) => d.nome)) : "") + ". No new cost, and we never touch your account.", lig.length ? "There " + (lig.length === 1 ? "is also " : "are also ") + pl(lig.length, "key connected", "keys connected") + ": " + lista(lig.map((x) => x.nome)) + ". Usage is billed to the company account." : "If you prefer, bring an API key or the company router.", "This is still a concept: in the prototype the key never leaves the browser."], fontes: [], acao: { rotulo: "Open Company AI", tipo: "config", arg: "c-sec-ia" } };
    }
    // 6. quem aprova / decide / faz
    const proc = acharProc(t);
    if (/who (approves|decides|signs|does|handles|owns|releases|resolves|is responsible|looks after)/.test(t) || (proc && tem(t, "approve", "decide"))) {
      if (!proc && acharTime(t)) return respTime(acharTime(t));
      if (!proc) return { partes: ["Which process? For example: advance, held payout, account change or reconciliation."], fontes: [], sugerir: ["Who approves the advance?", "Who approves account changes now?"] };
      return respQuem(proc, /who (does|handles|owns|looks after)/.test(t));
    }
    // 7. um buraco específico (fechar, virar skill, tirar da mesa)
    if (proc && tem(t, "gap", "close", "fix", "solve", "resolve", "skill", "take ", "off your desk", "rule", "criteria", "criterion", "keep ", "meet ", "deliver")) return respBuraco(proc);
    // 8. buracos em geral
    if (tem(t, "gap", "bottleneck", "problem", "stuck", "biggest", "worst", "hurts", "pain")) return respBuracos();
    // 9. o que espera por mim
    if (tem(t, "waiting", "waits", "pending", "on my desk", "on me", "with me", "depends on me", "awaiting")) return respEspera();
    // 10. o que mudou
    if (tem(t, "changed", "this week", "week", "news", "what is new", "happened", "summary", "update")) return respSemana();
    // 11. um time
    const time = acharTime(t);
    if (time) return respTime(time);
    if (proc) return respQuem(proc, false);
    if (tem(t, "process", "how many")) { const c = D.contagem(conectadas()); return { partes: ["I see " + c.processos + " processes in " + c.times + " teams, from " + (nBase() + conectadas().length) + " sources. Ask about a team and I will say how many there are and who does them."], fontes: [{ f: "gmail" }, { f: "drive" }, { f: "agenda" }], acao: { rotulo: "Open the brain", tipo: "ir", arg: 3 } }; }
    // 12. não sei: honesto
    return { partes: ["I can’t answer that yet in this prototype. I can tell you what is waiting for you, how many processes a team has and who does them, who approves each process, which gaps are open and what changed this week. I also create departments, connect sources and open screens."], fontes: [], honesto: true };
  }

  function respEspera() {
    const g = paraMim(), e = E();
    const linhas = g.map((x) => x.sobre === "On-demand advance" && e.regraAprovada
      ? "Advance: only the exceptions to the rule you approved. This week " + pl(D.uso.paramNaExcecao, "stopped", "stopped") + " at chargeback and called you."
      : x.sobre + " · " + x.porMes + " a month · " + lista(x.de));
    const tot = totalParaMim();
    return { partes: ["Waiting for you: about " + tot + " cases a month, across " + pl(g.length, "topic", "topics") + "."], lista: linhas,
      fontes: [{ f: "gmail", rotulo: "Gmail · who escalates to you" }, { f: "agenda", rotulo: "Calendar · Payouts committee" }],
      acao: e.regraAprovada ? { rotulo: "See the advance skill", tipo: "ir", arg: 6 } : { rotulo: "See the advance gap", tipo: "ir", arg: 4 } };
  }
  function respTime(d) {
    const procs = procsVisiveis().filter((p) => p.time === d.id).sort((a, b) => b.porMes - a.porMes);
    const quem = [...new Set(procs.map((p) => p.quem))].map(nomeDe);
    if (d.novo) return { partes: [d.nome + ": " + pl(d.pessoas, "person", "people") + (d.membros.length ? " (" + lista(d.membros.map(nomeDe)) + ")" : "") + ". You created this department; I have not linked any processes to it yet."], fontes: [], acao: { rotulo: "See in Settings", tipo: "config", arg: "c-sec-dep" } };
    return { partes: [d.nome + " has " + d.pessoas + " people. I saw " + pl(procs.length, "process", "processes") + (procs.length ? ":" : ".")],
      lista: procs.map((p) => p.nome + " · " + p.frequencia + " · " + primeiroDe(p.quem) + " does" + (p.aprova ? ", " + primeiroDe(p.aprova) + " approves" : ", nobody approves")),
      depois: quem.length ? ["Who does it: " + lista(quem) + "."] : [],
      fontes: [...new Set(procs.map((p) => p.fonte))].map((f) => ({ f })), acao: { rotulo: "Open " + d.nome, tipo: "time", arg: d.id } };
  }
  function respQuem(p, faz) {
    if (!visivelProc(p)) return { partes: ["I don’t see " + p.nome.toLowerCase() + ". It shows up once " + nomeFonte(p.fonte) + " is connected."], fontes: [], acao: { rotulo: "Connect " + nomeFonte(p.fonte), tipo: "fontes", arg: p.fonte } };
    const regra = p.id === "antecipacao" ? regraAtual() : null;
    if (regra) return { partes: ["Since you approved the rule:"], lista: regra, depois: ["Used " + D.uso.semana + " times this week, " + D.uso.semChamar + " without calling you."], fontes: fontesDe(p), acao: { rotulo: "Open the skill", tipo: "ir", arg: 6 }, processo: p.id };
    const partes = faz ? [p.nome + ": " + nomeDe(p.quem) + " does, " + p.frequencia + ".", "Who decides: " + p.decide] : [p.nome + ": " + p.decide.replace(/^Nobody/, "nobody")];
    const acao = p.semDono ? { rotulo: "See the gap", tipo: "ir", arg: 4 } : { rotulo: "Open the process", tipo: "processo", arg: p.id };
    return { partes, fontes: fontesDe(p), acao, processo: p.id };
  }
  function respRegra() {
    const p = D.processos.find((x) => x.id === "antecipacao"), regra = regraAtual();
    if (regra) return { partes: ["The advance rule, " + D.skill.versao + ", approved by you:"], lista: regra, depois: ["Used " + D.uso.semana + " times this week, " + D.uso.semChamar + " without calling you."], fontes: fontesDe(p), acao: { rotulo: "Open the skill", tipo: "ir", arg: 6 }, processo: p.id };
    return { partes: ["No rule is written yet. Today you approve every advance, whatever the amount: 23 a month, and 19 are below R$ 50,000."], fontes: fontesDe(p), acao: { rotulo: "Write the rule", tipo: "ir", arg: 5 }, processo: p.id };
  }
  function respBuraco(p) {
    const b = D.buracos.find((x) => x.processo === p.id);
    if (!b) return respQuem(p, false);
    if (b.id === "antecipacao" && E().buracoResolvido) return respRegra();
    const partes = [b.titulo + ". " + b.frequencia + ". " + b.dor];
    if (b.id === "conciliacao") partes.push("That is 22 mornings of 50 minutes: about 18 hours a month. Proposal: " + b.proposta.toLowerCase());
    else partes.push("Proposal: " + b.proposta.charAt(0).toLowerCase() + b.proposta.slice(1));
    return { partes, fontes: fontesDe(p), acao: b.id === "antecipacao" ? { rotulo: "Answer the question", tipo: "ir", arg: 5 } : { rotulo: "Open the process", tipo: "processo", arg: p.id }, processo: p.id };
  }
  function respBuracos() {
    const e = E();
    const abertos = D.buracos.filter((b) => !(b.id === "antecipacao" && e.buracoResolvido));
    const ord = abertos.slice().sort((a, b) => b.intensidade - a.intensidade);
    const maior = ord[0];
    return { partes: [(e.buracoResolvido ? "There are " + abertos.length + " of " + D.buracos.length + " gaps open; the advance one shrank with the rule." : "The " + D.buracos.length + " gaps I found are open.") + " What hurts most: " + maior.titulo.charAt(0).toLowerCase() + maior.titulo.slice(1) + ", " + maior.frequencia + ". " + maior.dor],
      lista: ord.slice(1, 4).map((b) => b.titulo + " · " + b.frequencia),
      fontes: fontesDe(D.processos.find((p) => p.id === maior.processo)).slice(0, 2), acao: { rotulo: "See the gaps", tipo: "ir", arg: 4 } };
  }
  function respSemana() {
    const e = E(), xs = [];
    conectadas().forEach((id) => { const it = D.integracoes.find((i) => i.id === id); if (it) xs.push(it.feed); });
    if (e.regraAprovada) xs.push("You approved the advance rule. Used " + D.uso.semana + " times, " + D.uso.semChamar + " without calling you.");
    const em = Object.entries(e.skillEm || {}).filter(([, v]) => v).map(([k]) => ({ claude: "Claude", chatgpt: "ChatGPT", grok: "Grok", slack: "Slack" }[k]));
    if (em.length) xs.push("The skill lives in " + lista(em) + ".");
    if (e.guardrails && e.guardrails["Engineering"] && !e.guardrails["Engineering"].includes("HR")) xs.push("Engineering no longer sees HR.");
    deps().filter((d) => d.novo).forEach((d) => xs.push("You created the department " + d.nome + "."));
    const c = D.contagem(conectadas());
    return { partes: ["Today I see " + c.pessoas + " people, " + c.times + " teams and " + c.processos + " processes, from " + (nBase() + conectadas().length) + " sources." + (xs.length ? " What changed:" : " Nothing has changed since the first reading.")], lista: xs,
      fontes: [{ f: "gmail" }, { f: "drive" }, { f: "agenda" }, ...conectadas().map((f) => ({ f }))], acao: { rotulo: "Open the brain", tipo: "ir", arg: 3 } };
  }
  function respConectar(it) {
    if (conectadas().includes(it.id)) return { partes: [it.nome + " is already connected. " + it.feed], fontes: [{ f: it.id }], acao: { rotulo: "See the sources", tipo: "fontes" } };
    const motivo = D.motivoDe(it.id, suite().id);
    return { partes: [it.nome + ": +" + pontos(it.id) + " coverage points" + (motivo ? ", because " + motivo : "") + ". I ask for: " + it.pede.charAt(0).toLowerCase() + it.pede.slice(1) + " " + it.naoPede, "I opened the sources so you can confirm."],
      fontes: [], faz: { tipo: "fontes", arg: it.id }, acao: { rotulo: "Connect " + it.nome, tipo: "fontes", arg: it.id } };
  }
  function criarDepPorTexto(texto) {
    const m = (/\b(?:department|team|area)\s+(?:called\s+|named\s+)(.+?)(?:\s+with\s+(.+?))?[.!?]*\s*$/i.exec(texto) || /\b(?:create|add|make|set up|new)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(.+?)\s+(?:department|team|area)(?:\s+with\s+(.+?))?[.!?]*\s*$/i.exec(texto) || /\b(?:department|team|area)\s+(.+?)(?:\s+with\s+(.+?))?[.!?]*\s*$/i.exec(texto));
    let nome = m && m[1] ? m[1].trim().replace(/^["“']|["”']$/g, "") : "";
    if (!nome) return { partes: ["What is it called? For example: create the Finance department with Douglas."], fontes: [] };
    nome = nome.charAt(0).toUpperCase() + nome.slice(1);
    if (nome.length > 40) nome = nome.slice(0, 40).trim();
    const ja = deps().find((d) => norm(d.nome) === norm(nome));
    if (ja) return { partes: ["There is already a department " + ja.nome + ", with " + pl(ja.pessoas, "person", "people") + "."], fontes: [], acao: { rotulo: "See in Settings", tipo: "config", arg: "c-sec-dep" } };
    const achados = [], faltou = [];
    if (m[2]) m[2].split(/\s*,\s*|\s+and\s+/).map((s) => s.replace(/^(the)\s+/i, "").trim()).filter(Boolean).forEach((n) => {
      const nn = norm(n);
      const p = D.pessoas.find((x) => norm(x.nome) === nn || norm(x.primeiro) === nn || norm(x.nome).startsWith(nn + " "));
      if (p) { if (!achados.includes(p.id)) achados.push(p.id); } else faltou.push(n);
    });
    const d = criarDep(nome, achados);
    const partes = ["I created the department " + d.nome + (achados.length ? ", with " + lista(achados.map(nomeDe)) + "." : ", with nobody in it yet.")];
    if (faltou.length) partes.push("I did not find " + lista(faltou.map((x) => "\"" + x + "\"")) + " among the people I read.");
    partes.push("It already shows in Settings, under Departments. A person can be in more than one department.");
    return { partes, fontes: [], acao: { rotulo: "See in Settings", tipo: "config", arg: "c-sec-dep" } };
  }
  function criarDep(nome, membros) {
    const ds = deps();
    let id = "dep-" + norm(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), k = 2;
    while (ds.some((d) => d.id === id)) id = id.replace(/-\d+$/, "") + "-" + k++;
    const d = { id, nome, pessoas: membros.length, membros: membros.slice(), novo: true };
    ds.push(d);
    // guardrails: o novo departamento vê o que é dele; quem já existe não ganha acesso a ele sem você marcar
    const g = E().guardrails;
    if (g && typeof g === "object" && !g[nome]) g[nome] = [nome];
    SK.salvar();
    document.dispatchEvent(new CustomEvent("sk:departamentos", { detail: { criado: id } }));
    return d;
  }

  /* ============================================================ sugestões (mudam com a tela; cada uma com o impacto) */
  const buraco = (id) => D.buracos.find((b) => b.id === id);
  const horasConc = () => Math.round((buraco("conciliacao").porMes * buraco("conciliacao").numeros.minutos) / 60);
  const proximaFonte = () => D.porGanho(suite().id, D.integracoes.filter((i) => !conectadas().includes(i.id) && !i.conceito))[0];
  const SUG = {
    espera: () => ({ texto: "What is waiting on me?", impacto: totalParaMim() + " cases a month" }),
    troca: () => ({ texto: "Close the account-change gap", impacto: buraco("troca-conta").porMes + " merchants a month" }),
    conciliacao: () => ({ texto: "Make reconciliation a skill", impacto: horasConc() + " h a month" }),
    fonte: () => { const f = proximaFonte(); return f && { texto: "Connect " + f.nome, impacto: "+" + pontos(f.id) + " coverage points" }; },
    antecipacao: () => (E().buracoResolvido ? null : { texto: "Take advances off your desk", impacto: "R$ 1.2 million a month" }),
    uso: () => (E().regraAprovada ? { texto: "Open the advance rule", impacto: D.uso.semChamar + " of " + D.uso.semana + " without calling you" } : null),
    eng: () => ({ texto: "Show how Engineering sees it", impacto: E().guardrails && E().guardrails["Engineering"] && E().guardrails["Engineering"].includes("HR") ? "1 open door into HR" : "HR closed to them" }),
    repasse: () => ({ texto: "One rule for held payouts", impacto: buraco("repasse-retido").porMes + " merchants a month" }),
    resposta: () => ({ texto: "Keep the 1-hour promise", impacto: "55 of 60 conversations" }),
    dep: () => (deps().some((d) => norm(d.nome) === "finance") ? null : { texto: "Create the Finance department with Douglas", impacto: pessoa("douglas").decide.length + " decisions gain a team" }),
    semana: () => ({ texto: "What changed this week?", impacto: (E().conectadas || []).length + (E().regraAprovada ? 1 : 0) > 0 ? pl((E().conectadas || []).length + (E().regraAprovada ? 1 : 0), "update", "updates") : D.contagem(conectadas()).processos + " processes read" }),
  };
  const POR_TELA = {
    3: ["espera", "fonte", "troca", "conciliacao"], 4: ["troca", "conciliacao", "antecipacao", "uso", "resposta"], 5: ["espera", "repasse", "troca", "fonte"],
    6: ["uso", "semana", "conciliacao", "eng"], 7: ["eng", "dep", "troca", "semana"], 8: ["conciliacao", "semana", "fonte", "dep"],
    config: ["dep", "fonte", "eng", "semana"],
  };
  const RESERVA = ["espera", "troca", "conciliacao", "fonte", "repasse", "resposta", "semana", "dep"];
  function sugestoes() {
    const n = atoAtual();
    const ordem = [...(POR_TELA[n] || []), ...RESERVA];
    const vistos = new Set(), out = [];
    for (const k of ordem) { if (out.length >= 4 || vistos.has(k)) continue; vistos.add(k); const s = SUG[k](); if (s) out.push(s); }
    return out;
  }

  /* ============================================================ o painel do chat */
  let painel, fio, campo, sugEl, aberto = false, voltarFoco = null, escrevendo = null;
  function atoAtual() {
    if (/^#\/config/.test(location.hash)) return "config";
    const n = Number(document.body.dataset.ato);
    return Number.isFinite(n) ? n : 0;
  }
  const liberado = () => !!E().casa || (E().alcancado || 0) >= 3 || atoAtual() === "config";

  function construir() {
    if (painel) return;
    fio = el("div", { class: "c-fio", role: "log", "aria-live": "polite", "aria-relevant": "additions", tabindex: "-1" });
    campo = el("input", { class: "c-entrada", type: "text", id: "c-entrada", autocomplete: "off", placeholder: "Ask about Lume", "aria-label": "Ask the brain" });
    const form = el("form", { class: "c-form", on: { submit: (ev) => { ev.preventDefault(); const v = campo.value.trim(); if (!v) return; campo.value = ""; perguntar(v); } } },
      campo, el("button", { class: "btn btn-primario c-enviar", type: "submit", "aria-label": "Send" }, ic("seta", "ico-sm")));
    sugEl = el("div", { class: "c-sugs", role: "group", "aria-label": "Suggestions" });
    painel = el("aside", { class: "c-chat papel", role: "dialog", "aria-modal": "false", "aria-labelledby": "c-chat-titulo", "aria-hidden": "true" },
      el("div", { class: "c-chat-topo" },
        SK.marca("cerebro", "mf-sm"),
        el("div", { class: "c-chat-tit" }, el("h2", { id: "c-chat-titulo", class: "c-chat-h" }, "Ask the brain"), el("p", { class: "t-micro texto-2" }, "I answer with what I read about Lume and show where it came from.")),
        el("button", { class: "painel-fechar", type: "button", "aria-label": "Close the chat", on: { click: () => chat.fechar() } }, ic("fechar"))),
      fio,
      el("div", { class: "c-chat-pe" }, form, sugEl, el("p", { class: "t-micro texto-2 c-atalho" }, el("kbd", {}, /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"), el("kbd", {}, "K"), " opens and closes")));
    painel.inert = true;
    document.body.append(painel);
  }

  function chipFonte(fx, processo) {
    const f = fx.f, rot = fx.rotulo || nomeFonte(f);
    const filhos = [GOOGLE.includes(f) ? ic(f, "ico-sm") : null, rot];
    if (processo) return el("button", { class: "chip c-fonte-chip", type: "button", title: "See the source", on: { click: () => executar({ tipo: "processo", arg: processo }) } }, ...filhos);
    return el("span", { class: "chip c-fonte-chip" }, ...filhos);
  }

  function balaoDela(texto) { return el("div", { class: "c-msg c-dela" }, el("p", { class: "c-balao" }, texto)); }
  function balaoCerebro(r, animar) {
    const corpo = el("div", { class: "c-resp" });
    const msg = el("div", { class: "c-msg c-cerebro" + (r.honesto ? " c-honesto" : "") }, SK.marca("cerebro", "mf-sm c-av"), corpo);
    const pars = (r.partes || []).map((p) => el("p", { class: "c-par" }, animar ? "" : p));
    const ul = r.lista && r.lista.length ? el("ul", { class: "c-lista" }, ...r.lista.map((x) => el("li", {}, x))) : null;
    const pos = (r.depois || []).map((p) => el("p", { class: "c-par" }, p));
    const fontes = r.fontes && r.fontes.length ? el("div", { class: "c-fontes-chips", "aria-label": "Sources" }, ...r.fontes.slice(0, 4).map((f) => chipFonte(f, r.processo))) : null;
    const acao = r.acao ? el("div", { class: "c-acao" }, el("button", { class: "btn btn-secundario btn-sm", type: "button", on: { click: () => executar(r.acao) } }, r.acao.rotulo, ic("seta", "ico-sm"))) : null;
    const sugs = r.sugerir ? el("div", { class: "fila c-mini-sugs", style: { "--gap": "6px" } }, ...r.sugerir.map((s) => el("button", { class: "chip", type: "button", on: { click: () => perguntar(s) } }, s))) : null;
    const resto = [ul, ...pos, fontes, sugs, acao].filter(Boolean);
    corpo.append(...pars, ...resto);
    if (animar) {
      resto.forEach((x) => (x.hidden = true));
      return { msg, tocar: (fim) => digitar(pars, r.partes, () => { resto.forEach((x, i) => { x.hidden = false; x.classList.add("entra"); x.style.setProperty("--atraso", i * 60 + "ms"); }); rolar(); fim && fim(); }) };
    }
    return { msg };
  }
  function digitar(pars, textos, fim) {
    if (reduz()) { pars.forEach((p, i) => (p.textContent = textos[i])); fim(); return; }
    const filas = textos.map((t) => t.split(/(\s+)/));
    let i = 0, j = 0, parar = false;
    const passo = () => {
      if (parar) return;
      if (i >= pars.length) { escrevendo = null; fim(); return; }
      const ws = filas[i];
      pars[i].textContent += ws.slice(j, j + 2).join(""); j += 2;
      if (j >= ws.length) { i++; j = 0; }
      rolar();
      setTimeout(passo, 26);
    };
    escrevendo = () => { parar = true; pars.forEach((p, k) => (p.textContent = textos[k])); escrevendo = null; fim(); };
    passo();
  }
  const rolar = () => { if (fio) fio.scrollTop = fio.scrollHeight; };

  function desenharFio() {
    fio.replaceChildren(boasVindas());
    conversa().forEach((m) => fio.append(m.quem === "ela" ? balaoDela(m.texto) : balaoCerebro(m, false).msg));
    rolar();
  }
  function boasVindas() {
    return el("div", { class: "c-msg c-cerebro" }, SK.marca("cerebro", "mf-sm c-av"),
      el("div", { class: "c-resp" }, el("p", { class: "c-par" }, "Hi, " + D.usuaria.primeiro + ". Ask me anything about how Lume works. I answer with what I have read and show where it came from.")));
  }
  function desenharSugs() {
    sugEl.replaceChildren(...sugestoes().map((s, i) => el("button", { class: "c-sug entra", type: "button", style: { "--atraso": i * 40 + "ms" }, on: { click: () => perguntar(s.texto) } },
      el("span", { class: "c-sug-txt" }, s.texto), el("span", { class: "c-sug-imp num" }, s.impacto))));
  }

  function perguntar(texto) {
    if (escrevendo) escrevendo();
    construir(); if (!aberto) chat.abrir();
    const e = E();
    conversa().push({ quem: "ela", texto }); SK.salvar();
    fio.append(balaoDela(texto)); rolar();
    const pensando = el("div", { class: "c-msg c-cerebro c-pensando", "aria-label": "Thinking" }, SK.marca("cerebro", "mf-sm c-av"), el("span", { class: "c-pontos3", "aria-hidden": "true" }, el("i"), el("i"), el("i")));
    fio.append(pensando); rolar();
    let r;
    try { r = responder(texto); } catch (err) { console.error(err); r = { partes: ["Something went wrong on my side. Try another way."], fontes: [] }; }
    setTimeout(() => {
      pensando.remove();
      const finalizar = () => {
        const m = Object.assign({ quem: "cerebro" }, r); delete m.faz; delete m.depoisDe;
        if (m.partes.length) { conversa().push(m); SK.salvar(); }
        const b = balaoCerebro(m, true); fio.append(b.msg);
        b.tocar(() => { desenharSugs(); if (r.faz) depois(250, () => executar(r.faz)); });
      };
      if (r.depoisDe === "acessos") {
        executar({ tipo: "verEng" });
        setTimeout(() => { // a tela já aplicou as marcas padrão: leio o estado de verdade
          const g = E().guardrails && E().guardrails["Engineering"], veRH = g ? g.includes("HR") : true;
          r.partes = ["I opened Access as Engineering sees it. " + (veRH ? "Today they still see HR: the hiring folder in Drive is shared with them." : "They don’t see HR: " + D.times.find((t) => t.id === "rh").pessoas + " people and HR skills disappear for them.")];
          finalizar();
        }, 120);
        return;
      }
      finalizar();
    }, reduz() ? 0 : 400);
  }

  function executar(a) {
    if (!a) return;
    const estreito = innerWidth < 900;
    if (a.tipo === "ir") { SK.ir(a.arg); if (estreito) chat.fechar(); }
    else if (a.tipo === "processo") { if (SK.abrir && SK.abrir.processo) { chat.fechar(true); SK.abrir.processo(a.arg); } }
    else if (a.tipo === "time") {
      const d = deps().find((x) => x.id === a.arg);
      if (d && !d.novo && SK.abrir && SK.abrir.time) { chat.fechar(true); SK.abrir.time(a.arg); } else irConfig("c-sec-dep");
    }
    else if (a.tipo === "fontes") abrirFontes(a.arg);
    else if (a.tipo === "config") { irConfig(a.arg); if (estreito) chat.fechar(); }
    else if (a.tipo === "verEng") { const e = E(); e.b = e.b || {}; e.b.verComo = "engenharia"; SK.salvar(); if (atoAtual() === 7) remontar(); else SK.ir(7); if (estreito) chat.fechar(); }
  }

  const chat = {
    abrir(pergunta) {
      if (!liberado()) return;
      construir();
      if (SK.painel && SK.painel.aberto()) SK.painel.fechar();
      if (!aberto) {
        voltarFoco = document.activeElement;
        aberto = true; painel.inert = false; painel.setAttribute("aria-hidden", "false");
        desenharFio(); desenharSugs();
        void painel.offsetWidth; painel.classList.add("aberto"); document.body.classList.add("c-chat-aberto");
        document.dispatchEvent(new CustomEvent("sk:chat", { detail: { aberto: true } }));
      }
      setTimeout(() => campo.focus({ preventScroll: true }), 40);
      setTimeout(() => { if (aberto && !painel.contains(document.activeElement)) campo.focus({ preventScroll: true }); }, 360);
      if (typeof pergunta === "string" && pergunta.trim()) perguntar(pergunta.trim());
    },
    fechar(semFoco) {
      if (!aberto) return;
      if (escrevendo) escrevendo();
      aberto = false; painel.classList.remove("aberto"); painel.setAttribute("aria-hidden", "true"); painel.inert = true;
      document.body.classList.remove("c-chat-aberto");
      if (!semFoco && voltarFoco && voltarFoco.isConnected) voltarFoco.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent("sk:chat", { detail: { aberto: false } }));
    },
    alternar() { aberto ? chat.fechar() : chat.abrir(); },
    aberto: () => aberto,
    perguntar: (t) => chat.abrir(t),
  };
  SK.conversa = chat;
  if (SK.chat && typeof SK.chat.registrar === "function") SK.chat.registrar(chat);
  else SK.chat = chat;

  document.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === "k" || ev.key === "K")) {
      if (!liberado()) return;
      ev.preventDefault(); ev.stopPropagation(); chat.alternar(); return;
    }
    if (ev.key === "Escape" && aberto && !(SK.painel && SK.painel.aberto()) && !document.querySelector("dialog[open]")) { ev.stopPropagation(); chat.fechar(); }
  }, true);
  document.addEventListener("sk:ato", () => { if (aberto) desenharSugs(); });
  window.addEventListener("hashchange", () => { if (aberto) setTimeout(desenharSugs, 30); });
  document.addEventListener("sk:reiniciar", () => { if (aberto) chat.fechar(true); });

  /* ============================================================ Configurações */
  function irConfig(secao) {
    const rolarPara = () => { const s = secao && document.getElementById(secao); if (s) { s.scrollIntoView({ behavior: reduz() ? "auto" : "smooth", block: "start" }); const h = s.querySelector("h2"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } } };
    if (atoAtual() === "config") { rolarPara(); return; }
    SK.ir("config");
    setTimeout(rolarPara, reduz() ? 80 : 650);
  }
  SK.configuracoes = { ir: irConfig };

  const SECOES = [["c-sec-ia", "Company AI"], ["c-sec-fontes", "Sources"], ["c-sec-dep", "Departments"], ["c-sec-skills", "Where skills live"], ["c-sec-acessos", "Access"]];

  function esqueleto(linhas) {
    return el("div", { class: "c-esq-bloco", "aria-hidden": "true" }, ...Array.from({ length: linhas }, (_, i) => el("div", { class: "c-esq-linha" }, el("span", { class: "c-esq c-esq-q" }), el("span", { class: "pilha", style: { "--gap": "8px", flex: "1" } }, el("span", { class: "c-esq", style: { width: (62 - i * 9) + "%" } }), el("span", { class: "c-esq c-esq-fino", style: { width: (40 + i * 7) + "%" } })))));
  }
  function secao(id, titulo, sobre, extraCabeca, corpoFn, linhasEsq, i) {
    const corpo = el("div", { class: "c-sec-corpo" }, typeof SK.esqueleto === "function" ? SK.esqueleto("lista") : esqueleto(linhasEsq));
    const s = el("section", { class: "c-sec entra", id, "aria-labelledby": id + "-h", style: { "--atraso": 60 * i + "ms" } },
      el("div", { class: "c-sec-cabeca" }, el("div", { class: "pilha", style: { "--gap": "6px" } }, el("div", { class: "fila", style: { "--gap": "10px" } }, el("h2", { class: "c-h2", id: id + "-h" }, titulo), extraCabeca), sobre ? el("p", { class: "texto-2 c-sobre" }, sobre) : null)),
      corpo);
    s._carregar = () => { corpo.replaceChildren(corpoFn()); corpo.classList.add("c-chega"); };
    return s;
  }

  function secIA() {
    return el("div", { class: "pilha", style: { "--gap": "14px" } },
      el("div", { class: "c-caixa" }, SK.chaves.lista({ padrao: true })),
      el("p", { class: "c-confianca t-pequeno" }, ic("cadeado", "ico-sm"), "The key stays only in Lume’s vault. We never see the content of conversations."));
  }
  function secFontes() { return listaFontes(); }

  function secDeps() {
    const raiz = el("div", { class: "pilha", style: { "--gap": "14px" } });
    const ul = el("ul", { class: "lista c-caixa c-deps" });
    const criar = el("div", { class: "c-criar", hidden: true });
    const botaoCriar = btn("btn-primario", "Create department", () => abrirCriar(), ic("mais", "ico-sm"));
    const topo = el("div", { class: "c-deps-topo" }, el("p", { class: "t-pequeno texto-2" }, pl(deps().length, "department", "departments") + ". Click a name to rename it; a person can be in more than one."), botaoCriar);
    function avatares(d) {
      const ps = d.membros.map(pessoa).filter(Boolean);
      return el("span", { class: "avatares", "aria-hidden": "true" }, ...ps.slice(0, 4).map((p) => p.id === "marina" ? el("span", { class: "avatar avatar-sm avatar-retrato" }, SK.retrato()) : el("span", { class: "avatar avatar-sm" }, p.iniciais)));
    }
    function linhaDep(d, recem) {
      const li = el("li", { class: "c-dep" + (recem ? " c-recem" : ""), "data-dep": d.id });
      const nome = el("input", { class: "c-dep-nome", type: "text", value: d.nome, maxlength: "40", "aria-label": "Department name " + d.nome, spellcheck: "false" });
      const salvarNome = () => {
        const v = nome.value.trim();
        if (!v || deps().some((x) => x !== d && norm(x.nome) === norm(v))) { nome.value = d.nome; return; }
        if (v === d.nome) return;
        const g = E().guardrails; if (g && d.novo && g[d.nome]) { g[v] = g[d.nome].map((x) => (x === d.nome ? v : x)); delete g[d.nome]; }
        d.nome = v; nome.setAttribute("aria-label", "Department name " + v); SK.salvar(); SK.anunciar("Renamed to " + v + ".");
        document.dispatchEvent(new CustomEvent("sk:departamentos", { detail: { renomeado: d.id } }));
      };
      nome.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); nome.blur(); } if (ev.key === "Escape") { ev.stopPropagation(); nome.value = d.nome; nome.blur(); } });
      nome.addEventListener("blur", salvarNome);
      const conta = el("span", { class: "c-dep-n num" }, pl(d.pessoas, "person", "people"));
      const gente = el("span", { class: "c-dep-gente" }, avatares(d), conta);
      const add = el("div", { class: "c-dep-add", hidden: true });
      const bAdd = el("button", { class: "btn btn-quieto btn-sm", type: "button", "aria-expanded": "false", on: { click: () => {
        const abrir = add.hidden;
        ul.querySelectorAll(".c-dep-add").forEach((x) => { x.hidden = true; }); ul.querySelectorAll("[aria-expanded]").forEach((x) => x.setAttribute("aria-expanded", "false"));
        if (abrir) { desenharAdd(); add.hidden = false; bAdd.setAttribute("aria-expanded", "true"); const f = add.querySelector("button"); f && f.focus(); }
      } } }, ic("mais", "ico-sm"), "Add person", el("span", { class: "sr-only" }, " a " + d.nome));
      function desenharAdd() {
        const fora = D.pessoas.filter((p) => !d.membros.includes(p.id) && (p.fonte === "gmail" || conectadas().includes(p.fonte)));
        add.replaceChildren(el("p", { class: "t-micro texto-2" }, "People I read"), el("div", { class: "fila", style: { "--gap": "6px" } }, ...fora.map((p) => el("button", { class: "chip c-pessoa-chip", type: "button", on: { click: () => {
          d.membros.push(p.id); d.pessoas += 1; SK.salvar();
          gente.replaceChildren(avatares(d), el("span", { class: "c-dep-n num" }, pl(d.pessoas, "person", "people")));
          SK.anunciar(p.nome + " joined " + d.nome + ".");
          desenharAdd(); const f = add.querySelector("button"); f ? f.focus() : bAdd.focus();
        } } }, p.nome, el("span", { class: "texto-2" }, " · " + (deps().find((x) => x.id === p.time) || {}).nome)))));
      }
      li.append(el("div", { class: "c-dep-linha" }, nome, d.novo ? el("span", { class: "chip chip-anil c-novo" }, "New") : null, gente, bAdd), add);
      return li;
    }
    function desenharLista(recem) { ul.replaceChildren(...deps().map((d) => linhaDep(d, d.id === recem))); }
    function abrirCriar() {
      const escolhidos = new Set();
      const campoN = el("input", { class: "c-campo", type: "text", id: "c-dep-novo", maxlength: "40", placeholder: "E.g. Finance", autocomplete: "off" });
      const erro = el("p", { class: "c-erro t-pequeno", "aria-live": "polite" });
      const chips = el("div", { class: "fila", style: { "--gap": "6px" }, role: "group", "aria-label": "Who belongs" }, ...D.pessoas.filter((p) => p.fonte === "gmail" || conectadas().includes(p.fonte)).map((p) => {
        const c = el("button", { class: "chip c-pessoa-chip", type: "button", "aria-pressed": "false", on: { click: () => { const on = escolhidos.has(p.id); on ? escolhidos.delete(p.id) : escolhidos.add(p.id); c.setAttribute("aria-pressed", on ? "false" : "true"); } } }, p.nome);
        return c;
      }));
      const fechar = () => { criar.hidden = true; criar.replaceChildren(); botaoCriar.hidden = false; botaoCriar.focus(); };
      const form = el("form", { class: "pilha", style: { "--gap": "14px" }, on: { submit: (ev) => {
        ev.preventDefault();
        const v = campoN.value.trim();
        if (!v) { erro.textContent = "Give the department a name."; campoN.focus(); return; }
        if (deps().some((x) => norm(x.nome) === norm(v))) { erro.textContent = "There is already a department " + v + "."; campoN.focus(); return; }
        const d = criarDep(v.charAt(0).toUpperCase() + v.slice(1), [...escolhidos]);
        criar.hidden = true; criar.replaceChildren(); botaoCriar.hidden = false;
        desenharLista(d.id); topo.firstChild.textContent = pl(deps().length, "department", "departments") + ". Click a name to rename it; a person can be in more than one.";
        SK.anunciar("Department " + d.nome + " created.");
        const n = ul.querySelector('[data-dep="' + d.id + '"] .c-dep-nome'); if (n) { n.scrollIntoView({ block: "nearest", behavior: reduz() ? "auto" : "smooth" }); n.focus({ preventScroll: true }); }
      } } },
        el("div", { class: "pilha", style: { "--gap": "6px" } }, el("label", { class: "c-rot", for: "c-dep-novo" }, "Name"), campoN, erro),
        el("div", { class: "pilha", style: { "--gap": "8px" } }, el("p", { class: "c-rot" }, "Who belongs"), chips),
        el("div", { class: "fila c-criar-acoes" }, el("button", { class: "btn btn-secundario", type: "submit" }, "Create"), btn("btn-quieto", "Cancel", fechar)));
      criar.replaceChildren(el("h3", { class: "c-h3" }, "New department"), form);
      criar.hidden = false; botaoCriar.hidden = true;
      criar.classList.remove("entra"); void criar.offsetWidth; criar.classList.add("entra");
      setTimeout(() => campoN.focus(), 30);
    }
    desenharLista();
    raiz.append(topo, criar, ul);
    return raiz;
  }

  const LUGARES = [
    { id: "claude", nome: "Claude", onde: "In Lume’s Claude, through the brain connection." },
    { id: "chatgpt", nome: "ChatGPT", onde: "In Lume’s ChatGPT, through the same connection." },
    { id: "grok", nome: "Grok", onde: "In Lume’s Grok, through the same connection." },
    { id: "slack", nome: "Slack", onde: "In Slack, in team channels and by message." },
  ];
  function secSkills() {
    const e = E(); e.skillEm = e.skillEm || { claude: false, chatgpt: false, grok: false, slack: false };
    const nota = el("p", { class: "t-pequeno texto-2" });
    const escreverNota = () => {
      const lig = LUGARES.filter((l) => e.skillEm[l.id]).map((l) => l.nome);
      nota.textContent = e.regraAprovada
        ? D.skill.nome + " · " + D.skill.versao + (lig.length ? " lives in " + lista(lig) + "." : " is not anywhere yet.")
        : "The first skill has not been approved yet. Whatever you turn on here applies to it and the next ones.";
    };
    escreverNota();
    const ul = el("ul", { class: "lista c-caixa" }, ...LUGARES.map((l) => {
      const t = SK.toggle(l.nome, !!e.skillEm[l.id], (v) => { e.skillEm[l.id] = v; SK.salvar(); escreverNota(); document.dispatchEvent(new CustomEvent("sk:ia", { detail: { id: "dentro" } })); });
      t.setAttribute("aria-describedby", "c-onde-" + l.id);
      return el("li", { class: "linha c-lugar" }, SK.marca(l.id, "mf-sm"), el("div", { class: "linha-principal" }, t, el("span", { class: "t-pequeno texto-2", id: "c-onde-" + l.id }, l.onde)));
    }));
    return el("div", { class: "pilha", style: { "--gap": "12px" } }, ul, nota);
  }
  function secAcessos() {
    const g = E().guardrails || {};
    const engRH = g["Engineering"] ? g["Engineering"].includes("HR") : true;
    return el("div", { class: "c-caixa c-acessos" },
      el("p", {}, "Each area sees only the skills and processes of the areas you tick. " + (engRH ? "Today Engineering still sees HR." : "Today Engineering does not see HR.")),
      el("button", { class: "btn btn-secundario btn-sm", type: "button", on: { click: () => SK.ir(7) } }, "Open Access", ic("seta", "ico-sm")));
  }

  function montarConfig(sec, semEspera) {
    deps(); iaEstado();
    const indice = el("nav", { class: "c-indice", "aria-label": "Settings sections" }, el("ul", {}, ...SECOES.map(([id, nome]) => el("li", {}, el("a", { href: "#" + id, class: "c-indice-item", on: { click: (ev) => { ev.preventDefault(); irConfig(id); } } }, nome)))));
    const secs = [
      secao("c-sec-ia", "Company AI", "Skills run on your company’s AI. Choose how.", el("span", { class: "tag-conceito" }, "Concept · not available yet"), secIA, 3, 0),
      secao("c-sec-fontes", "Sources", "What I read at Lume, what each source adds and how much of the work I can see with it.", null, secFontes, 4, 1),
      secao("c-sec-dep", "Departments", "The teams I found, as Lume calls them. Create the ones that are missing.", null, secDeps, 4, 2),
      secao("c-sec-skills", "Where skills live", "Where Lume’s people find the approved skills.", null, secSkills, 3, 3),
      secao("c-sec-acessos", "Access", null, null, secAcessos, 1, 4),
    ];
    const raiz = el("div", { class: "ato-papel c-config" },
      el("div", { class: "ato-cabeca c-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Settings"),
        el("p", { class: "t-sub texto-2" }, "How Lume’s brain connects, who is in each area and where skills live."))),
      el("div", { class: "c-config-grade" }, indice, el("div", { class: "c-secoes" }, ...secs)));
    sec.append(raiz);
    const carregar = () => secs.forEach((s, i) => (semEspera ? s._carregar() : depois(500 + i * 70, s._carregar)));
    carregar();
    // marca a seção à vista no índice
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((ents) => ents.forEach((x) => { if (x.isIntersecting) indice.querySelectorAll("a").forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + x.target.id ? "true" : "false")); }), { rootMargin: "-30% 0px -60% 0px" });
      secs.forEach((s) => io.observe(s));
      raiz._io = io;
    }
  }
  const ATO_CONFIG = {
    id: "config", titulo: "Settings", nav: "Settings",
    montar(sec) { montarConfig(sec); },
    sair() { const r = document.querySelector(".c-config"); if (r && r._io) r._io.disconnect(); },
  };
  SK.atoConfig = ATO_CONFIG;
  try { SK.ato(ATO_CONFIG); } catch (err) { console.error(err); }
})();
