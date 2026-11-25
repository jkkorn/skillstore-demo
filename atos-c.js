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
  const lista = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1]);
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
  const MS = { gmail: "Outlook", drive: "OneDrive", agenda: "Calendário" };
  const nomeFonte = (f) => (suite().id === "microsoft" && MS[f]) || ({ gmail: "Gmail", drive: "Drive", agenda: "Agenda", site: "Site" }[f] || (D.integracoes.find((i) => i.id === f) || {}).nome || f);
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
    { id: "claude", nome: "Claude", de: "Anthropic", onde: "Console da Anthropic, Amazon Bedrock ou Google Vertex", dica: "sk-ant-…" },
    { id: "chatgpt", nome: "ChatGPT", de: "OpenAI", onde: "Plataforma da OpenAI ou Azure", dica: "sk-…" },
    { id: "copilot", nome: "Microsoft Copilot", de: "Microsoft 365", onde: "Pelo Azure da empresa", semChave: true },
    { id: "roteador", nome: "Chave do roteador", de: "", onde: "OpenRouter, Toqan Router ou outro compatível", dica: "Chave do roteador", roteador: true },
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
      const status = el("p", { class: "c-chave-status t-pequeno" }, ...(ligado ? [ok(), "Conectado · as skills já vivem no " + d.nome] : ["Ainda não está no " + d.nome]));
      const acoes = el("div", { class: "c-chave-acoes" });
      if (op.padrao && padraoDe() === "dentro" && d.id === "claude") acoes.append(el("span", { class: "chip chip-anil" }, "Padrão"));
      if (document.getElementById("c-sec-skills")) acoes.append(btn("btn-quieto btn-sm", "Ver onde as skills vivem", () => irConfig("c-sec-skills")));
      else if (!ligado) acoes.append(btn("btn-secundario btn-sm", "Usar o " + d.nome, () => { const s = E(); s.skillEm = Object.assign({ claude: false, chatgpt: false, grok: false, slack: false }, s.skillEm); s.skillEm[d.id] = true; SK.salvar(); avisarIA("dentro", op); SK.anunciar("As skills vão viver no " + d.nome + "."); }));
      raiz.append(SK.marca(d.id, "c-chave-marca"), el("div", { class: "c-chave-txt" }, el("p", { class: "c-chave-nome" }, el("span", { class: "forte" }, "Rodar dentro do " + d.nome + " da sua empresa")), status), acoes);
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
      SK.anunciar(ia.nome + " conectado.");
    }
    function desenhar(recem) {
      const st = iaEstado(), c = ia.semChave ? null : st[id];
      raiz.replaceChildren();
      raiz.classList.toggle("ligada", !!c);
      const status = el("p", { class: "c-chave-status t-pequeno" });
      if (modo === "conferindo") status.append(el("span", { class: "c-gira", "aria-hidden": "true" }), "Conferindo a chave…");
      else if (c) status.append(ok(recem), "Conectado · chave terminando em ••••" + c.fim);
      else status.append(ia.onde);
      const titulo = el("p", { class: "c-chave-nome" }, el("span", { class: "forte" }, ia.nome), ia.de ? el("span", { class: "texto-2 t-pequeno" }, " · " + ia.de) : null);
      const txt = el("div", { class: "c-chave-txt" }, titulo, status, ia.roteador && !c && modo !== "conferindo" ? el("p", { class: "t-pequeno texto-2" }, "Se a empresa já controla modelos e gastos num roteador, as skills passam por ele.") : null,
        c && ia.roteador ? el("p", { class: "t-pequeno texto-2" }, ia.onde) : null);
      const acoes = el("div", { class: "c-chave-acoes" });
      if (ia.semChave || modo === "conferindo") { /* Copilot: pelo Azure da empresa, sem chave aqui */ }
      else if (c) {
        if (op.padrao) acoes.append(padraoDe() === id ? el("span", { class: "chip chip-anil" }, "Padrão")
          : btn("btn-quieto btn-sm", "Usar como padrão", () => { iaEstado().padrao = id; SK.salvar(); avisarIA(id, op); }));
        acoes.append(btn("btn-quieto btn-sm", "Desconectar", () => {
          const s = iaEstado(); s[id] = null; if (s.padrao === id) s.padrao = "dentro";
          SK.salvar(); desenhar(); avisarIA(id, op); const b = raiz.querySelector("button"); b && b.focus();
        }, el("span", { class: "sr-only" }, ia.nome + ": ")));
      } else if (modo === "ver") acoes.append(btn("btn-secundario btn-sm", "Colar a chave", () => { modo = "colar"; desenhar(); }, el("span", { class: "sr-only" }, ia.nome + ": ")));
      raiz.append(marcaIA(id), txt, acoes);
      if (modo === "colar") {
        const campo = el("input", { class: "c-campo", type: "password", id: "c-chave-" + id, autocomplete: "off", spellcheck: "false", placeholder: ia.dica, "aria-describedby": "c-chave-erro-" + id });
        const erro = el("p", { class: "c-erro t-pequeno", id: "c-chave-erro-" + id, "aria-live": "polite" });
        const enviar = (ev) => {
          ev.preventDefault();
          const v = campo.value.trim();
          if (v.length < 8) { erro.textContent = "Essa chave parece curta. Cole a chave inteira."; campo.focus(); return; }
          const fim = v.slice(-4); campo.value = ""; // não guardo a chave, só o fim dela
          modo = "conferindo"; desenhar(); depois(650, () => conectar(fim));
        };
        raiz.append(el("form", { class: "c-chave-form", on: { submit: enviar } },
          el("label", { class: "sr-only", for: "c-chave-" + id }, "Chave do " + ia.nome),
          campo,
          el("button", { class: "btn btn-secundario btn-sm", type: "submit" }, "Conectar"),
          btn("btn-quieto btn-sm", "Cancelar", () => { modo = "ver"; desenhar(); const b = raiz.querySelector(".btn-secundario"); b && b.focus(); }),
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
      grupo("Dentro do assistente que o time já usa", "As skills rodam dentro do assistente que o time já usa. Nós nunca tocamos na conta de vocês.", "Sem custo novo"),
      ...DENTRO.map((d) => linhaDentro(d, op)),
      grupo("Chave de API", "O uso é cobrado na conta da sua empresa."),
      ...["claude", "chatgpt", "copilot"].map((id) => linhaChave(id, op)),
      grupo("Roteador da empresa"),
      linhaChave("roteador", op)); },
  };

  /* ============================================================ fontes (Configurações e o painel do chat) */
  function coberturaEl() {
    const v = cobertura(), su = suite();
    return el("div", { class: "c-cob", role: "group", "aria-label": "Cobertura do mapa" },
      el("div", { class: "c-cob-topo" }, el("span", { class: "t-pequeno texto-2" }, "Cobertura do mapa"), el("span", { class: "c-cob-fig num" }, v + "%")),
      el("span", { class: "c-cob-barra" }, el("span", { class: "c-cob-cheio", style: { width: v + "%" } })),
      el("p", { class: "t-pequeno texto-2" }, "Quanto do trabalho da Lume eu enxergo. O " + su.nome + " dá a base de " + su.base + " pontos; cada fonte soma os dela."));
  }
  function listaFontes() {
    const raiz = el("div", { class: "pilha c-fontes", style: { "--gap": "20px" } });
    const c = conectadas(), su = suite(), base = D[su.fontes] || D.fontesGoogle;
    const ligadas = D.porGanho(su.id, D.integracoes.filter((i) => c.includes(i.id)));
    const faltam = D.porGanho(su.id, D.integracoes.filter((i) => !c.includes(i.id)));
    const linhaBase = el("li", { class: "linha c-fonte" },
      el("span", { class: "c-marcas3" }, ...base.map((f) => ((window.SK_MARCAS || {})[f.id] ? SK.marca(f.id, "mf-sm") : el("span", { class: "marca-f mf-sm" }, ic("agenda", "ico-sm"))))),
      el("div", { class: "linha-principal" }, el("span", { class: "forte" }, lista(base.map((f) => f.nome))), el("span", { class: "t-pequeno texto-2" }, "A base: o que eu li no seu " + su.nome + ".")),
      el("div", { class: "linha-meta" }, el("span", { class: "c-pontos num" }, su.base + " pontos")));
    const linha = (it, ligada, maior) => {
      const acao = el("div", { class: "linha-meta" }, el("span", { class: "c-pontos num" + (ligada ? "" : " c-pontos-mais") }, (ligada ? "" : "+") + pontos(it.id) + " pontos"));
      if (ligada) acao.append(el("span", { class: "chip chip-ok" }, ic("check", "ico-sm"), "Conectado"));
      else acao.append(el("button", { class: "btn btn-secundario btn-sm c-conectar", type: "button", "aria-label": "Conectar " + it.nome, on: { click: () => abrirFontes(it.id) } }, "Conectar"));
      const motivo = D.motivoDe(it.id, su.id);
      return el("li", { class: "linha c-fonte" + (maior ? " c-maior" : ""), "data-fonte": it.id },
        SK.marca(it.id, "mf-sm"),
        el("div", { class: "linha-principal" },
          el("span", { class: "c-fonte-nome" }, el("span", { class: "forte" }, it.nome), maior ? el("span", { class: "chip chip-anil c-tag-sm" }, "Maior ganho") : null, it.conceito ? el("span", { class: "tag-conceito c-tag-sm" }, "Conceito · ainda não disponível") : null),
          el("span", { class: "t-pequeno texto-2" }, ligada ? it.adicionou : maior && motivo ? motivo.charAt(0).toUpperCase() + motivo.slice(1) + "." : "Acrescenta " + it.acrescentaria + ".")),
        acao);
    };
    raiz.append(coberturaEl(),
      el("div", { class: "pilha", style: { "--gap": "8px" } }, el("h3", { class: "c-h3" }, "Conectadas · " + (base.length + ligadas.length)),
        el("ul", { class: "lista c-caixa" }, linhaBase, ...ligadas.map((i) => linha(i, true, false)))),
      faltam.length ? el("div", { class: "pilha", style: { "--gap": "8px" } }, el("h3", { class: "c-h3" }, "Para conectar · " + faltam.length),
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
        if (novas.length) { novas.forEach((it) => conversa().push({ quem: "cerebro", partes: [it.feed + " Cobertura agora: " + cobertura() + "%."], fontes: [{ f: it.id }], acao: null })); SK.salvar(); }
      }
      if (voltarAoChat) setTimeout(() => chat.abrir(), 80);
    };
    if (SK.fontes && SK.fontes.abrir) SK.fontes.abrir({ aoFechar });
    else { irConfig("c-sec-fontes"); return; }
    if (destaque) setTimeout(() => { const b = [...document.querySelectorAll(".painel button")].find((x) => x.getAttribute("aria-label") === "Conectar " + nomeFonte(destaque)); if (b) b.focus(); }, 360);
  }
  const remontar = () => (typeof SK.recarregar === "function" ? SK.recarregar() : window.dispatchEvent(new HashChangeEvent("hashchange"))); // a casca remonta o ato atual


  /* ============================================================ entendimento (casamento simples sobre dados.js) */
  const ALIAS_TIME = { operacoes: ["operacoes", "operacao", "ops"], tesouraria: ["tesouraria"], risco: ["risco"], atendimento: ["atendimento", "suporte"], engenharia: ["engenharia", "tecnologia"], comercial: ["comercial", "vendas"], rh: ["rh", "recursos humanos", "people"], diretoria: ["diretoria"] };
  const ALIAS_PROC = [
    ["repasse-retido", ["repasse retido", "repasses retidos", "retido", "retencao"]],
    ["troca-conta", ["troca de conta", "conta de recebimento", "troca"]],
    ["fechamento-mes", ["fechamento do mes", "contabilidade"]],
    ["primeira-resposta", ["primeira resposta", "1 hora", "uma hora", "promessa"]],
    ["antecipacao", ["antecipa"]], ["conciliacao", ["concilia"]], ["chargeback", ["chargeback", "disputa"]],
    ["incidente", ["incidente"]], ["taxa-especial", ["taxa"]], ["admissao", ["admiss", "contrata"]], ["caixa-diario", ["caixa"]],
    ["estorno", ["estorno"]], ["proposta", ["proposta"]], ["bloqueio", ["bloqueio"]], ["deploy", ["publicacao", "deploy", "app do lojista"]], ["liquidacao", ["liquidacao"]],
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
  const totalParaMim = () => paraMim().reduce((s, g) => s + (g.sobre === "Antecipação sob demanda" && E().regraAprovada ? 0 : g.porMes), 0);

  function responder(texto) {
    const t = norm(texto), e = E();
    // 1. criar departamento
    const mDep = /\bcri(?:e|ar|a|ei)\b.*\b(?:departamento|time|area)\b/.test(t);
    if (mDep) return criarDepPorTexto(texto);
    // 2. conectar fonte
    const fonte = acharFonte(t);
    if (fonte && tem(t, "conect", "ligar", "ligue", "adicion", "integr", "trazer", "traga")) return respConectar(fonte);
    if (tem(t, "conect", "fontes") && !fonte && !tem(t, "chave", "claude", "chatgpt", "copilot")) return { partes: ["Abri as fontes. As que mais acrescentam à cobertura estão em cima."], fontes: [], faz: { tipo: "fontes" } };
    // 3. ver como uma área
    if (/(como|visao|olhos)\s+(?:a |o |da |do )?(engenharia|rh|tesouraria|operacoes|diretoria|risco|comercial|atendimento)\s*(ve|enxerga|veria)?/.test(t) || /ver como/.test(t)) {
      const m = /(engenharia|rh|tesouraria|operacoes|diretoria|risco|comercial|atendimento)/.exec(t);
      if (!m || m[1] === "engenharia") return { partes: [], depoisDe: "acessos", fontes: [{ f: "drive", rotulo: "Drive · pasta \"RH / Admissões\"" }], faz: { tipo: "verEng" } };
      return { partes: ["Neste protótipo eu mostro a prévia como a Engenharia vê. As outras áreas seguem as marcas da matriz de Acessos."], fontes: [], acao: { rotulo: "Abrir Acessos", tipo: "ir", arg: 7 } };
    }
    // 4. a regra da antecipação
    if (tem(t, "regra") && tem(t, "antecipa", "tesouraria") || (tem(t, "abr") && tem(t, "antecipa"))) return respRegra();
    // 5. chave de IA
    if (tem(t, "chave", "claude", "chatgpt", "copilot", "openai", "anthropic")) {
      const st = iaEstado(), lig = IAS.filter((x) => !x.semChave && st[x.id]), dentro = DENTRO.filter((d) => E().skillEm && E().skillEm[d.id]);
      return { partes: ["Por padrão, as skills rodam dentro do assistente que o time já usa" + (dentro.length ? ": hoje no " + lista(dentro.map((d) => d.nome)) : "") + ". Sem custo novo, e nós nunca tocamos na conta de vocês.", lig.length ? "Também há " + pl(lig.length, "chave conectada", "chaves conectadas") + ": " + lista(lig.map((x) => x.nome)) + ". O uso é cobrado na conta da empresa." : "Se preferir, traga uma chave de API ou o roteador da empresa.", "Isto ainda é um conceito: no protótipo a chave não sai do navegador."], fontes: [], acao: { rotulo: "Abrir IA da empresa", tipo: "config", arg: "c-sec-ia" } };
    }
    // 6. quem aprova / decide / faz
    const proc = acharProc(t);
    if (/quem (aprova|decide|assina|faz|cuida|libera|resolve)/.test(t) || (proc && tem(t, "aprova", "decide"))) {
      if (!proc && acharTime(t)) return respTime(acharTime(t));
      if (!proc) return { partes: ["De qual processo? Por exemplo: antecipação, repasse retido, troca de conta ou conciliação."], fontes: [], sugerir: ["Quem aprova a antecipação?", "Quem aprova troca de conta agora?"] };
      return respQuem(proc, /quem (faz|cuida)/.test(t));
    }
    // 7. um buraco específico (fechar, virar skill, tirar da mesa)
    if (proc && tem(t, "buraco", "fechar", "feche", "resolver", "consertar", "virar skill", "vira skill", "tirar", "critério", "criterio", "cumprir")) return respBuraco(proc);
    // 8. buracos em geral
    if (tem(t, "buraco", "gargalo", "problema", "trava", "travando", "maior", "pior", "doi")) return respBuracos();
    // 9. o que espera por mim
    if (tem(t, "esperando", "espera", "pendente", "pendencia", "na minha mesa", "comigo", "depende de mim", "aguardando")) return respEspera();
    // 10. o que mudou
    if (tem(t, "mudou", "semana", "novidade", "de novo", "aconteceu", "resumo")) return respSemana();
    // 11. um time
    const time = acharTime(t);
    if (time) return respTime(time);
    if (proc) return respQuem(proc, false);
    if (tem(t, "processo", "quantos")) { const c = D.contagem(conectadas()); return { partes: ["Vejo " + c.processos + " processos em " + c.times + " times, de " + (nBase() + conectadas().length) + " fontes. Pergunte por um time e eu digo quantos são e quem faz."], fontes: [{ f: "gmail" }, { f: "drive" }, { f: "agenda" }], acao: { rotulo: "Abrir o cérebro", tipo: "ir", arg: 3 } }; }
    // 12. não sei: honesto
    return { partes: ["Isso eu ainda não sei responder neste protótipo. Sei dizer o que espera por você, quantos processos um time tem e quem faz, quem aprova cada processo, quais buracos estão abertos e o que mudou na semana. Também crio departamentos, conecto fontes e abro telas."], fontes: [], honesto: true };
  }

  function respEspera() {
    const g = paraMim(), e = E();
    const linhas = g.map((x) => x.sobre === "Antecipação sob demanda" && e.regraAprovada
      ? "Antecipação: só as exceções da regra que você aprovou. Esta semana " + pl(D.uso.paramNaExcecao, "parou", "pararam") + " no chargeback e chamaram você."
      : x.sobre + " · " + x.porMes + " por mês · " + lista(x.de));
    const tot = totalParaMim();
    return { partes: ["Esperam por você cerca de " + tot + " casos por mês, em " + pl(g.length, "assunto", "assuntos") + "."], lista: linhas,
      fontes: [{ f: "gmail", rotulo: "Gmail · quem escala para você" }, { f: "agenda", rotulo: "Agenda · Comitê de repasses" }],
      acao: e.regraAprovada ? { rotulo: "Ver a skill da antecipação", tipo: "ir", arg: 6 } : { rotulo: "Ver o buraco da antecipação", tipo: "ir", arg: 4 } };
  }
  function respTime(d) {
    const procs = procsVisiveis().filter((p) => p.time === d.id).sort((a, b) => b.porMes - a.porMes);
    const quem = [...new Set(procs.map((p) => p.quem))].map(nomeDe);
    if (d.novo) return { partes: [d.nome + ": " + pl(d.pessoas, "pessoa", "pessoas") + (d.membros.length ? " (" + lista(d.membros.map(nomeDe)) + ")" : "") + ". Você criou este departamento; ainda não liguei processos a ele."], fontes: [], acao: { rotulo: "Ver em Configurações", tipo: "config", arg: "c-sec-dep" } };
    return { partes: [d.nome + " tem " + d.pessoas + " pessoas. Vi " + pl(procs.length, "processo", "processos") + (procs.length ? ":" : ".")],
      lista: procs.map((p) => p.nome + " · " + p.frequencia + " · " + primeiroDe(p.quem) + " faz" + (p.aprova ? ", " + primeiroDe(p.aprova) + " aprova" : ", ninguém aprova")),
      depois: quem.length ? ["Quem faz: " + lista(quem) + "."] : [],
      fontes: [...new Set(procs.map((p) => p.fonte))].map((f) => ({ f })), acao: { rotulo: "Abrir " + d.nome, tipo: "time", arg: d.id } };
  }
  function respQuem(p, faz) {
    if (!visivelProc(p)) return { partes: ["Ainda não vejo " + p.nome.toLowerCase() + ". Aparece quando " + nomeFonte(p.fonte) + " estiver conectado."], fontes: [], acao: { rotulo: "Conectar o " + nomeFonte(p.fonte), tipo: "fontes", arg: p.fonte } };
    const regra = p.id === "antecipacao" ? regraAtual() : null;
    if (regra) return { partes: ["Desde que você aprovou a regra:"], lista: regra, depois: ["Usada " + D.uso.semana + " vezes esta semana, " + D.uso.semChamar + " sem te chamar."], fontes: fontesDe(p), acao: { rotulo: "Abrir a skill", tipo: "ir", arg: 6 }, processo: p.id };
    const partes = faz ? [p.nome + ": " + nomeDe(p.quem) + " faz, " + p.frequencia + ".", "Quem decide: " + p.decide] : [p.nome + ": " + p.decide.replace(/^Ninguém/, "ninguém")];
    const acao = p.semDono ? { rotulo: "Ver o buraco", tipo: "ir", arg: 4 } : { rotulo: "Abrir o processo", tipo: "processo", arg: p.id };
    return { partes, fontes: fontesDe(p), acao, processo: p.id };
  }
  function respRegra() {
    const p = D.processos.find((x) => x.id === "antecipacao"), regra = regraAtual();
    if (regra) return { partes: ["A regra da antecipação, " + D.skill.versao + ", aprovada por você:"], lista: regra, depois: ["Usada " + D.uso.semana + " vezes esta semana, " + D.uso.semChamar + " sem te chamar."], fontes: fontesDe(p), acao: { rotulo: "Abrir a skill", tipo: "ir", arg: 6 }, processo: p.id };
    return { partes: ["Ainda não tem regra escrita. Hoje você aprova toda antecipação, de qualquer valor: 23 por mês, e 19 ficam abaixo de R$ 50 mil."], fontes: fontesDe(p), acao: { rotulo: "Escrever a regra", tipo: "ir", arg: 5 }, processo: p.id };
  }
  function respBuraco(p) {
    const b = D.buracos.find((x) => x.processo === p.id);
    if (!b) return respQuem(p, false);
    if (b.id === "antecipacao" && E().buracoResolvido) return respRegra();
    const partes = [b.titulo + ". " + b.frequencia + ". " + b.dor];
    if (b.id === "conciliacao") partes.push("São 22 manhãs de 50 minutos: cerca de 18 horas por mês. Proposta: " + b.proposta.toLowerCase());
    else partes.push("Proposta: " + b.proposta.charAt(0).toLowerCase() + b.proposta.slice(1));
    return { partes, fontes: fontesDe(p), acao: b.id === "antecipacao" ? { rotulo: "Responder a pergunta", tipo: "ir", arg: 5 } : { rotulo: "Abrir o processo", tipo: "processo", arg: p.id }, processo: p.id };
  }
  function respBuracos() {
    const e = E();
    const abertos = D.buracos.filter((b) => !(b.id === "antecipacao" && e.buracoResolvido));
    const ord = abertos.slice().sort((a, b) => b.intensidade - a.intensidade);
    const maior = ord[0];
    return { partes: [(e.buracoResolvido ? "Estão abertos " + abertos.length + " de " + D.buracos.length + " buracos; o da antecipação encolheu com a regra." : "Estão abertos os " + D.buracos.length + " buracos que achei.") + " O que mais dói: " + maior.titulo.charAt(0).toLowerCase() + maior.titulo.slice(1) + ", " + maior.frequencia + ". " + maior.dor],
      lista: ord.slice(1, 4).map((b) => b.titulo + " · " + b.frequencia),
      fontes: fontesDe(D.processos.find((p) => p.id === maior.processo)).slice(0, 2), acao: { rotulo: "Ver os buracos", tipo: "ir", arg: 4 } };
  }
  function respSemana() {
    const e = E(), xs = [];
    conectadas().forEach((id) => { const it = D.integracoes.find((i) => i.id === id); if (it) xs.push(it.feed); });
    if (e.regraAprovada) xs.push("Você aprovou a regra da antecipação. Usada " + D.uso.semana + " vezes, " + D.uso.semChamar + " sem te chamar.");
    const em = Object.entries(e.skillEm || {}).filter(([, v]) => v).map(([k]) => ({ claude: "Claude", chatgpt: "ChatGPT", grok: "Grok", slack: "Slack" }[k]));
    if (em.length) xs.push("A skill vive no " + lista(em) + ".");
    if (e.guardrails && e.guardrails["Engenharia"] && !e.guardrails["Engenharia"].includes("RH")) xs.push("A Engenharia deixou de ver o RH.");
    deps().filter((d) => d.novo).forEach((d) => xs.push("Você criou o departamento " + d.nome + "."));
    const c = D.contagem(conectadas());
    return { partes: ["Hoje eu vejo " + c.pessoas + " pessoas, " + c.times + " times e " + c.processos + " processos, de " + (nBase() + conectadas().length) + " fontes." + (xs.length ? " O que mudou:" : " Nada mudou desde a primeira leitura.")], lista: xs,
      fontes: [{ f: "gmail" }, { f: "drive" }, { f: "agenda" }, ...conectadas().map((f) => ({ f }))], acao: { rotulo: "Abrir o cérebro", tipo: "ir", arg: 3 } };
  }
  function respConectar(it) {
    if (conectadas().includes(it.id)) return { partes: [it.nome + " já está conectado. " + it.feed], fontes: [{ f: it.id }], acao: { rotulo: "Ver as fontes", tipo: "fontes" } };
    const motivo = D.motivoDe(it.id, suite().id);
    return { partes: [it.nome + ": +" + pontos(it.id) + " pontos de cobertura" + (motivo ? ", porque " + motivo : "") + ". Peço: " + it.pede.charAt(0).toLowerCase() + it.pede.slice(1) + " " + it.naoPede, "Abri as fontes para você confirmar."],
      fontes: [], faz: { tipo: "fontes", arg: it.id }, acao: { rotulo: "Conectar o " + it.nome, tipo: "fontes", arg: it.id } };
  }
  function criarDepPorTexto(texto) {
    const m = /\b(?:departamento|time|área|area)\s+(?:de\s+|do\s+|da\s+|chamado\s+)?(.+?)(?:\s+com\s+(.+?))?[.!?]*\s*$/i.exec(texto);
    let nome = m && m[1] ? m[1].trim().replace(/^["“']|["”']$/g, "") : "";
    if (!nome) return { partes: ["Qual o nome? Por exemplo: crie o departamento Financeiro com o Douglas."], fontes: [] };
    nome = nome.charAt(0).toUpperCase() + nome.slice(1);
    if (nome.length > 40) nome = nome.slice(0, 40).trim();
    const ja = deps().find((d) => norm(d.nome) === norm(nome));
    if (ja) return { partes: ["Já existe um departamento " + ja.nome + ", com " + pl(ja.pessoas, "pessoa", "pessoas") + "."], fontes: [], acao: { rotulo: "Ver em Configurações", tipo: "config", arg: "c-sec-dep" } };
    const achados = [], faltou = [];
    if (m[2]) m[2].split(/\s*,\s*|\s+e\s+/).map((s) => s.replace(/^(o|a|os|as)\s+/i, "").trim()).filter(Boolean).forEach((n) => {
      const nn = norm(n);
      const p = D.pessoas.find((x) => norm(x.nome) === nn || norm(x.primeiro) === nn || norm(x.nome).startsWith(nn + " "));
      if (p) { if (!achados.includes(p.id)) achados.push(p.id); } else faltou.push(n);
    });
    const d = criarDep(nome, achados);
    const partes = ["Criei o departamento " + d.nome + (achados.length ? ", com " + lista(achados.map(nomeDe)) + "." : ", ainda sem ninguém.")];
    if (faltou.length) partes.push("Não achei " + lista(faltou.map((x) => "\"" + x + "\"")) + " entre as pessoas que li.");
    partes.push("Ele já aparece em Configurações, em Departamentos. Uma pessoa pode estar em mais de um departamento.");
    return { partes, fontes: [], acao: { rotulo: "Ver em Configurações", tipo: "config", arg: "c-sec-dep" } };
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
    espera: () => ({ texto: "O que está esperando por mim?", impacto: totalParaMim() + " casos por mês" }),
    troca: () => ({ texto: "Fechar o buraco da troca de conta", impacto: buraco("troca-conta").porMes + " lojistas por mês" }),
    conciliacao: () => ({ texto: "Virar skill a conciliação", impacto: horasConc() + " h por mês" }),
    fonte: () => { const f = proximaFonte(); return f && { texto: "Conectar o " + f.nome, impacto: "+" + pontos(f.id) + " pontos de cobertura" }; },
    antecipacao: () => (E().buracoResolvido ? null : { texto: "Tirar a antecipação da sua mesa", impacto: "R$ 1,2 milhão por mês" }),
    uso: () => (E().regraAprovada ? { texto: "Abra a regra de antecipação", impacto: D.uso.semChamar + " de " + D.uso.semana + " sem te chamar" } : null),
    eng: () => ({ texto: "Mostre como a Engenharia vê", impacto: E().guardrails && E().guardrails["Engenharia"] && E().guardrails["Engenharia"].includes("RH") ? "1 porta aberta no RH" : "RH fechado para ela" }),
    repasse: () => ({ texto: "Um critério para o repasse retido", impacto: buraco("repasse-retido").porMes + " lojistas por mês" }),
    resposta: () => ({ texto: "Cumprir a promessa de 1 hora", impacto: "55 de 60 conversas" }),
    dep: () => (deps().some((d) => norm(d.nome) === "financeiro") ? null : { texto: "Crie o departamento Financeiro com o Douglas", impacto: pessoa("douglas").decide.length + " decisões ganham um time" }),
    semana: () => ({ texto: "O que mudou esta semana?", impacto: (E().conectadas || []).length + (E().regraAprovada ? 1 : 0) > 0 ? pl((E().conectadas || []).length + (E().regraAprovada ? 1 : 0), "novidade", "novidades") : D.contagem(conectadas()).processos + " processos lidos" }),
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
    campo = el("input", { class: "c-entrada", type: "text", id: "c-entrada", autocomplete: "off", placeholder: "Pergunte sobre a Lume", "aria-label": "Pergunte ao cérebro" });
    const form = el("form", { class: "c-form", on: { submit: (ev) => { ev.preventDefault(); const v = campo.value.trim(); if (!v) return; campo.value = ""; perguntar(v); } } },
      campo, el("button", { class: "btn btn-primario c-enviar", type: "submit", "aria-label": "Enviar" }, ic("seta", "ico-sm")));
    sugEl = el("div", { class: "c-sugs", role: "group", "aria-label": "Sugestões" });
    painel = el("aside", { class: "c-chat papel", role: "dialog", "aria-modal": "false", "aria-labelledby": "c-chat-titulo", "aria-hidden": "true" },
      el("div", { class: "c-chat-topo" },
        SK.marca("cerebro", "mf-sm"),
        el("div", { class: "c-chat-tit" }, el("h2", { id: "c-chat-titulo", class: "c-chat-h" }, "Pergunte ao cérebro"), el("p", { class: "t-micro texto-2" }, "Respondo com o que li da Lume e mostro de onde veio.")),
        el("button", { class: "painel-fechar", type: "button", "aria-label": "Fechar o chat", on: { click: () => chat.fechar() } }, ic("fechar"))),
      fio,
      el("div", { class: "c-chat-pe" }, form, sugEl, el("p", { class: "t-micro texto-2 c-atalho" }, el("kbd", {}, /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"), el("kbd", {}, "K"), " abre e fecha")));
    painel.inert = true;
    document.body.append(painel);
  }

  function chipFonte(fx, processo) {
    const f = fx.f, rot = fx.rotulo || nomeFonte(f);
    const filhos = [GOOGLE.includes(f) ? ic(f, "ico-sm") : null, rot];
    if (processo) return el("button", { class: "chip c-fonte-chip", type: "button", title: "Ver a fonte", on: { click: () => executar({ tipo: "processo", arg: processo }) } }, ...filhos);
    return el("span", { class: "chip c-fonte-chip" }, ...filhos);
  }

  function balaoDela(texto) { return el("div", { class: "c-msg c-dela" }, el("p", { class: "c-balao" }, texto)); }
  function balaoCerebro(r, animar) {
    const corpo = el("div", { class: "c-resp" });
    const msg = el("div", { class: "c-msg c-cerebro" + (r.honesto ? " c-honesto" : "") }, SK.marca("cerebro", "mf-sm c-av"), corpo);
    const pars = (r.partes || []).map((p) => el("p", { class: "c-par" }, animar ? "" : p));
    const ul = r.lista && r.lista.length ? el("ul", { class: "c-lista" }, ...r.lista.map((x) => el("li", {}, x))) : null;
    const pos = (r.depois || []).map((p) => el("p", { class: "c-par" }, p));
    const fontes = r.fontes && r.fontes.length ? el("div", { class: "c-fontes-chips", "aria-label": "Fontes" }, ...r.fontes.slice(0, 4).map((f) => chipFonte(f, r.processo))) : null;
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
      el("div", { class: "c-resp" }, el("p", { class: "c-par" }, "Oi, " + D.usuaria.primeiro + ". Pergunte o que quiser sobre como a Lume trabalha. Eu respondo com o que li e mostro de onde veio.")));
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
    const pensando = el("div", { class: "c-msg c-cerebro c-pensando", "aria-label": "Pensando" }, SK.marca("cerebro", "mf-sm c-av"), el("span", { class: "c-pontos3", "aria-hidden": "true" }, el("i"), el("i"), el("i")));
    fio.append(pensando); rolar();
    let r;
    try { r = responder(texto); } catch (err) { console.error(err); r = { partes: ["Algo deu errado do meu lado. Tente de outro jeito."], fontes: [] }; }
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
          const g = E().guardrails && E().guardrails["Engenharia"], veRH = g ? g.includes("RH") : true;
          r.partes = ["Abri Acessos como a Engenharia vê. " + (veRH ? "Hoje ela ainda vê o RH: a pasta de admissão no Drive está compartilhada com ela." : "Ela não vê o RH: " + D.times.find((t) => t.id === "rh").pessoas + " pessoas e as skills do RH somem para ela.")];
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

  const SECOES = [["c-sec-ia", "IA da empresa"], ["c-sec-fontes", "Fontes"], ["c-sec-dep", "Departamentos"], ["c-sec-skills", "Onde as skills vivem"], ["c-sec-acessos", "Acessos"]];

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
      el("p", { class: "c-confianca t-pequeno" }, ic("cadeado", "ico-sm"), "A chave fica só no cofre da Lume. Nós nunca vemos o conteúdo das conversas."));
  }
  function secFontes() { return listaFontes(); }

  function secDeps() {
    const raiz = el("div", { class: "pilha", style: { "--gap": "14px" } });
    const ul = el("ul", { class: "lista c-caixa c-deps" });
    const criar = el("div", { class: "c-criar", hidden: true });
    const botaoCriar = btn("btn-primario", "Criar departamento", () => abrirCriar(), ic("mais", "ico-sm"));
    const topo = el("div", { class: "c-deps-topo" }, el("p", { class: "t-pequeno texto-2" }, pl(deps().length, "departamento", "departamentos") + ". Clique no nome para renomear; uma pessoa pode estar em mais de um."), botaoCriar);
    function avatares(d) {
      const ps = d.membros.map(pessoa).filter(Boolean);
      return el("span", { class: "avatares", "aria-hidden": "true" }, ...ps.slice(0, 4).map((p) => p.id === "marina" ? el("span", { class: "avatar avatar-sm avatar-retrato" }, SK.retrato()) : el("span", { class: "avatar avatar-sm" }, p.iniciais)));
    }
    function linhaDep(d, recem) {
      const li = el("li", { class: "c-dep" + (recem ? " c-recem" : ""), "data-dep": d.id });
      const nome = el("input", { class: "c-dep-nome", type: "text", value: d.nome, maxlength: "40", "aria-label": "Nome do departamento " + d.nome, spellcheck: "false" });
      const salvarNome = () => {
        const v = nome.value.trim();
        if (!v || deps().some((x) => x !== d && norm(x.nome) === norm(v))) { nome.value = d.nome; return; }
        if (v === d.nome) return;
        const g = E().guardrails; if (g && d.novo && g[d.nome]) { g[v] = g[d.nome].map((x) => (x === d.nome ? v : x)); delete g[d.nome]; }
        d.nome = v; nome.setAttribute("aria-label", "Nome do departamento " + v); SK.salvar(); SK.anunciar("Renomeado para " + v + ".");
        document.dispatchEvent(new CustomEvent("sk:departamentos", { detail: { renomeado: d.id } }));
      };
      nome.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); nome.blur(); } if (ev.key === "Escape") { ev.stopPropagation(); nome.value = d.nome; nome.blur(); } });
      nome.addEventListener("blur", salvarNome);
      const conta = el("span", { class: "c-dep-n num" }, pl(d.pessoas, "pessoa", "pessoas"));
      const gente = el("span", { class: "c-dep-gente" }, avatares(d), conta);
      const add = el("div", { class: "c-dep-add", hidden: true });
      const bAdd = el("button", { class: "btn btn-quieto btn-sm", type: "button", "aria-expanded": "false", on: { click: () => {
        const abrir = add.hidden;
        ul.querySelectorAll(".c-dep-add").forEach((x) => { x.hidden = true; }); ul.querySelectorAll("[aria-expanded]").forEach((x) => x.setAttribute("aria-expanded", "false"));
        if (abrir) { desenharAdd(); add.hidden = false; bAdd.setAttribute("aria-expanded", "true"); const f = add.querySelector("button"); f && f.focus(); }
      } } }, ic("mais", "ico-sm"), "Adicionar pessoa", el("span", { class: "sr-only" }, " a " + d.nome));
      function desenharAdd() {
        const fora = D.pessoas.filter((p) => !d.membros.includes(p.id) && (p.fonte === "gmail" || conectadas().includes(p.fonte)));
        add.replaceChildren(el("p", { class: "t-micro texto-2" }, "Pessoas que li"), el("div", { class: "fila", style: { "--gap": "6px" } }, ...fora.map((p) => el("button", { class: "chip c-pessoa-chip", type: "button", on: { click: () => {
          d.membros.push(p.id); d.pessoas += 1; SK.salvar();
          gente.replaceChildren(avatares(d), el("span", { class: "c-dep-n num" }, pl(d.pessoas, "pessoa", "pessoas")));
          SK.anunciar(p.nome + " entrou em " + d.nome + ".");
          desenharAdd(); const f = add.querySelector("button"); f ? f.focus() : bAdd.focus();
        } } }, p.nome, el("span", { class: "texto-2" }, " · " + (deps().find((x) => x.id === p.time) || {}).nome)))));
      }
      li.append(el("div", { class: "c-dep-linha" }, nome, d.novo ? el("span", { class: "chip chip-anil c-novo" }, "Novo") : null, gente, bAdd), add);
      return li;
    }
    function desenharLista(recem) { ul.replaceChildren(...deps().map((d) => linhaDep(d, d.id === recem))); }
    function abrirCriar() {
      const escolhidos = new Set();
      const campoN = el("input", { class: "c-campo", type: "text", id: "c-dep-novo", maxlength: "40", placeholder: "Ex.: Financeiro", autocomplete: "off" });
      const erro = el("p", { class: "c-erro t-pequeno", "aria-live": "polite" });
      const chips = el("div", { class: "fila", style: { "--gap": "6px" }, role: "group", "aria-label": "Quem faz parte" }, ...D.pessoas.filter((p) => p.fonte === "gmail" || conectadas().includes(p.fonte)).map((p) => {
        const c = el("button", { class: "chip c-pessoa-chip", type: "button", "aria-pressed": "false", on: { click: () => { const on = escolhidos.has(p.id); on ? escolhidos.delete(p.id) : escolhidos.add(p.id); c.setAttribute("aria-pressed", on ? "false" : "true"); } } }, p.nome);
        return c;
      }));
      const fechar = () => { criar.hidden = true; criar.replaceChildren(); botaoCriar.hidden = false; botaoCriar.focus(); };
      const form = el("form", { class: "pilha", style: { "--gap": "14px" }, on: { submit: (ev) => {
        ev.preventDefault();
        const v = campoN.value.trim();
        if (!v) { erro.textContent = "Dê um nome ao departamento."; campoN.focus(); return; }
        if (deps().some((x) => norm(x.nome) === norm(v))) { erro.textContent = "Já existe um departamento " + v + "."; campoN.focus(); return; }
        const d = criarDep(v.charAt(0).toUpperCase() + v.slice(1), [...escolhidos]);
        criar.hidden = true; criar.replaceChildren(); botaoCriar.hidden = false;
        desenharLista(d.id); topo.firstChild.textContent = pl(deps().length, "departamento", "departamentos") + ". Clique no nome para renomear; uma pessoa pode estar em mais de um.";
        SK.anunciar("Departamento " + d.nome + " criado.");
        const n = ul.querySelector('[data-dep="' + d.id + '"] .c-dep-nome'); if (n) { n.scrollIntoView({ block: "nearest", behavior: reduz() ? "auto" : "smooth" }); n.focus({ preventScroll: true }); }
      } } },
        el("div", { class: "pilha", style: { "--gap": "6px" } }, el("label", { class: "c-rot", for: "c-dep-novo" }, "Nome"), campoN, erro),
        el("div", { class: "pilha", style: { "--gap": "8px" } }, el("p", { class: "c-rot" }, "Quem faz parte"), chips),
        el("div", { class: "fila c-criar-acoes" }, el("button", { class: "btn btn-secundario", type: "submit" }, "Criar"), btn("btn-quieto", "Cancelar", fechar)));
      criar.replaceChildren(el("h3", { class: "c-h3" }, "Novo departamento"), form);
      criar.hidden = false; botaoCriar.hidden = true;
      criar.classList.remove("entra"); void criar.offsetWidth; criar.classList.add("entra");
      setTimeout(() => campoN.focus(), 30);
    }
    desenharLista();
    raiz.append(topo, criar, ul);
    return raiz;
  }

  const LUGARES = [
    { id: "claude", nome: "Claude", onde: "No Claude da Lume, pela conexão do cérebro." },
    { id: "chatgpt", nome: "ChatGPT", onde: "No ChatGPT da Lume, pela mesma conexão." },
    { id: "grok", nome: "Grok", onde: "No Grok da Lume, pela mesma conexão." },
    { id: "slack", nome: "Slack", onde: "No Slack, nos canais dos times e por mensagem." },
  ];
  function secSkills() {
    const e = E(); e.skillEm = e.skillEm || { claude: false, chatgpt: false, grok: false, slack: false };
    const nota = el("p", { class: "t-pequeno texto-2" });
    const escreverNota = () => {
      const lig = LUGARES.filter((l) => e.skillEm[l.id]).map((l) => l.nome);
      nota.textContent = e.regraAprovada
        ? D.skill.nome + " · " + D.skill.versao + (lig.length ? " vive no " + lista(lig) + "." : " não está em nenhum lugar ainda.")
        : "A primeira skill ainda não foi aprovada. O que você ligar aqui vale para ela e para as próximas.";
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
    const engRH = g["Engenharia"] ? g["Engenharia"].includes("RH") : true;
    return el("div", { class: "c-caixa c-acessos" },
      el("p", {}, "Cada área vê só as skills e os processos das áreas que você marcar. " + (engRH ? "Hoje a Engenharia ainda vê o RH." : "Hoje a Engenharia não vê o RH.")),
      el("button", { class: "btn btn-secundario btn-sm", type: "button", on: { click: () => SK.ir(7) } }, "Abrir Acessos", ic("seta", "ico-sm")));
  }

  function montarConfig(sec, semEspera) {
    deps(); iaEstado();
    const indice = el("nav", { class: "c-indice", "aria-label": "Seções de Configurações" }, el("ul", {}, ...SECOES.map(([id, nome]) => el("li", {}, el("a", { href: "#" + id, class: "c-indice-item", on: { click: (ev) => { ev.preventDefault(); irConfig(id); } } }, nome)))));
    const secs = [
      secao("c-sec-ia", "IA da empresa", "As skills rodam na IA da sua empresa. Escolha como.", el("span", { class: "tag-conceito" }, "Conceito · ainda não disponível"), secIA, 3, 0),
      secao("c-sec-fontes", "Fontes", "O que eu leio da Lume, o que cada fonte acrescenta e quanto do trabalho eu enxergo com ela.", null, secFontes, 4, 1),
      secao("c-sec-dep", "Departamentos", "Os times que eu achei, do jeito que a Lume chama. Crie os que faltam.", null, secDeps, 4, 2),
      secao("c-sec-skills", "Onde as skills vivem", "Onde as pessoas da Lume encontram as skills aprovadas.", null, secSkills, 3, 3),
      secao("c-sec-acessos", "Acessos", null, null, secAcessos, 1, 4),
    ];
    const raiz = el("div", { class: "ato-papel c-config" },
      el("div", { class: "ato-cabeca c-cabeca" }, el("div", { class: "pilha", style: { "--gap": "10px" } },
        el("h1", { class: "t-titulo" }, "Configurações"),
        el("p", { class: "t-sub texto-2" }, "Como o cérebro da Lume se conecta, quem está em cada área e onde as skills vivem."))),
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
    id: "config", titulo: "Configurações", nav: "Configurações",
    montar(sec) { montarConfig(sec); },
    sair() { const r = document.querySelector(".c-config"); if (r && r._io) r._io.disconnect(); },
  };
  SK.atoConfig = ATO_CONFIG;
  try { SK.ato(ATO_CONFIG); } catch (err) { console.error(err); }
})();
