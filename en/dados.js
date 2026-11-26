/* dados.js · TODOS os dados inventados do protótipo (Lume Pagamentos). Nada aqui é real.
 *
 * window.SK_DADOS (também em SK.dados e passado a montar(el, dados)):
 *   empresa        { nome, dominio, tamanho }
 *   usuaria        { id:'marina', nome, primeiro, cargo, email, iniciais, time }
 *   fontesGoogle   [{ id:'gmail'|'drive'|'agenda', nome, le, naoLe, numero, rotulo }]
 *   integracoes    [{ id, nome, sigla, achada, evidencia, pede, naoPede, passo2, acrescenta:{pessoas,externos,escalas,processos,contagem}, feed }]
 *                  curto = evidência curta ("312 emails"); adicionou = o que a fonte acrescentou, dito depois de conectar.
 *                  ordem = ordem do tray (achadas no e-mail primeiro). WhatsApp tem `como`, `conceito:true` (não construído), `confianca`, `grupos[]`, `formas[]`.
 *   times          [{ id, nome, pessoas, celula }]   celula = posição no mapa 3x3 ('tl','tc','tr','ml','mr','bl','bc','br'); o centro é a Marina.
 *   pessoas        [{ id, nome, primeiro, iniciais, time, cargo, fonte, decide[], esperam[], reunioes[] }]
 *                  fonte = 'gmail' (lida na leitura do Google) ou id da integração que a revela.
 *   externos       [{ id, nome, curto, iniciais, tipo, perto(time id), lado, fonte, decide[], esperam[], reunioes[] }]
 *                  "Gente de fora": escritório de contabilidade, agência de social media, gerente do banco adquirente.
 *   escalas        [{ de, para, sobre, porMes, fonte }]  "quem escala para quem" (ids de pessoas ou externos).
 *   processos      [{ id, nome, porMes, frequencia, time, quem, aprova, certeza:'alta'|'média', fonte, fontes[], passos[], decide, excecoes[], noMapa }]
 *                  aprova = id ou null (sem dono). fontes = [{ fonte, rotulo, texto, data }] evidência, linha a linha (rotulo: "Gmail · fio de 4 e-mails").
 *   reunioes       [{ id, tipo:"decide"|"alinha", nome, quando, pessoas[], decide[], escalaPara, fonte, fontes[] }]
 *   leitura        { gmail:{meses,conversas}, drive:{documentos,comentados}, agenda:{recorrentes}, feed:[{ texto, revela[] }] }
 *                  revela = ids prefixados: 'time:x', 'pessoa:x', 'ext:x', 'escala:de>para', 'proc:x'.
 *   base           contagem só com o Google { pessoas:58, times:8, processos:41, reunioes:11 }
 *   final          contagem do roteiro (Google + Intercom + tl;dv) { pessoas:61, times:8, processos:47, reunioes:14, buracos } (buracos = D.buracos.length)
 *   buracos        [{ id, titulo, porMes, frequencia, intensidade(0..1), dor, numeros, proposta, processo, sobreVoce }] 10 itens
 *   antecipacoesPorFaixa [{ faixa, quantos }] as 23 do mês: 11 abaixo de R$ 5 mil, 8 de R$ 5 mil a R$ 50 mil, 4 acima de R$ 50 mil
 *   pergunta       a troca do ato 5 (evidência, pergunta, porque, resposta, aprofunda, resposta2, regra, atualizados, espera)
 *   skill          { nome, versao, aprovadaPor, quando, regra[], destinos[] }
 *   uso            { semana:12, semChamar:10, paramNaExcecao:2, conversas[] }
 *   quemEQuem      { total, grupos[{ id, nome, n, amostra[], duvida? }] }  as contas do domínio (P3)
 *   areas          ['Operações','Tesouraria','Engenharia','RH','Diretoria']  guardrails padrão em guardrailsPadrao
 *   depois         textos do ato 8
 *   suites {google, microsoft} e fontesMicrosoft (X5). integracoes[].ganho / ganhoMicrosoft (pontos) e motivoGanho / motivoGanhoMicrosoft (X6).
 *   ganhoDe(id, suite), motivoDe(id, suite), porGanho(suite, lista) ordena por ganho; coberturaDe(conectadas, suite).
 *   cobertura / coberturaDe(conectadas)  % do trabalho que o mapa vê (40 só com Google). integracoes[].acrescentaria = o que conectar acrescenta.
 *   primeiraLeitura { bem[], andamento[{tipo,texto}], proximo, perguntas[] }  resumo do ato 3
 * Helper: SK_DADOS.contagem(conectadas[]) -> { pessoas, times, processos, reunioes } conforme as fontes conectadas.
 *         SK_DADOS.porId(id) -> pessoa, externo, time, processo ou reunião.
 */
(function () {
  const D = {};

  D.empresa = { nome: "Lume Pagamentos", dominio: "lumepagamentos.com.br", tamanho: "about 60 people" };
  D.usuaria = { id: "marina", nome: "Marina Duarte", primeiro: "Marina", cargo: "COO", email: "marina.duarte@lumepagamentos.com.br", iniciais: "MD", time: "diretoria" };

  D.fontesGoogle = [
    { id: "gmail", nome: "Gmail", le: "Who writes to whom, about what, and who answers.", naoLe: "I don’t read personal attachments.", numero: "41.200", rotulo: "conversations over 18 months" },
    { id: "drive", nome: "Drive", le: "Process documents and shared spreadsheets, comments included.", naoLe: "I don’t open personal folders.", numero: "1.380", rotulo: "documents, 212 with comments" },
    { id: "agenda", nome: "Calendar", le: "Who goes to which meetings, and how often.", naoLe: "I don’t read events marked private.", numero: "96", rotulo: "recurring meetings" },
  ];

  // X5: a mesma leitura com o Microsoft 365 (SK.estado.suite === "microsoft")
  D.suites = {
    google: { id: "google", nome: "Google", conta: "Google", entrar: "Sign in with Google", fontes: "fontesGoogle", resumo: "your email, calendar and Drive", base: 40 },
    microsoft: { id: "microsoft", nome: "Microsoft 365", conta: "Microsoft", entrar: "Sign in with Microsoft", fontes: "fontesMicrosoft", resumo: "your email, calendar, OneDrive and Teams", base: 45 },
  };
  D.fontesMicrosoft = [
    { id: "outlook", nome: "Outlook", le: "Who writes to whom, about what, and who answers.", naoLe: "I don’t read personal attachments.", numero: "41.200", rotulo: "conversations over 18 months" },
    { id: "onedrive", nome: "OneDrive and SharePoint", le: "Process documents and shared spreadsheets, comments included.", naoLe: "I don’t open personal folders.", numero: "1.380", rotulo: "documents, 212 with comments" },
    { id: "calendario", nome: "Calendar", le: "Who goes to which meetings, and how often.", naoLe: "I don’t read events marked private.", numero: "96", rotulo: "recurring meetings" },
    { id: "teams", nome: "Teams", le: "Team channels: who decides what, day to day.", naoLe: "I don’t read private conversations.", numero: "38", rotulo: "team channels" },
  ];

  D.leitura = {
    gmail: { meses: 18, conversas: 41200 },
    drive: { documentos: 1380, comentados: 212 },
    agenda: { recorrentes: 96 },
    feed: [
      { texto: "I read 18 months of Lume’s email. I start with the people who write to you.", revela: [] },
      { texto: "Otávio, Paula and Douglas make up Leadership with you.", revela: ["time:diretoria", "pessoa:otavio", "pessoa:paula", "pessoa:douglas", "escala:marina>otavio"] },
      { texto: "Caio and Débora run Treasury.", revela: ["time:tesouraria", "pessoa:caio", "pessoa:debora", "escala:debora>caio"] },
      { texto: "You approve every on-demand advance, whatever the amount. That is 23 a month.", revela: ["escala:caio>marina", "proc:antecipacao"] },
      { texto: "Sofia and Pedro run Operations. Pedro reconciles the payouts every morning, by hand.", revela: ["time:operacoes", "pessoa:sofia", "pessoa:pedro", "escala:pedro>sofia", "proc:conciliacao"] },
      { texto: "Lívia and Tiago are Risk. Chargebacks go through Tiago first.", revela: ["time:risco", "pessoa:livia", "pessoa:tiago", "escala:tiago>livia", "proc:chargeback"] },
      { texto: "The Tuesday meeting decides on held payouts.", revela: ["escala:sofia>marina", "escala:livia>marina", "proc:repasse-retido"] },
      { texto: "Rafael leads Support and takes delays to Sofia.", revela: ["time:atendimento", "pessoa:rafael", "escala:rafael>sofia", "proc:primeira-resposta"] },
      { texto: "Bianca and André are Engineering. Payment incidents reach you through Bianca.", revela: ["time:engenharia", "pessoa:bianca", "pessoa:andre", "escala:andre>bianca", "escala:bianca>marina", "proc:incidente"] },
      { texto: "Lucas and Renan are in Sales. Special rates go through Paula.", revela: ["time:comercial", "pessoa:lucas", "pessoa:renan", "escala:renan>lucas", "escala:lucas>paula", "proc:taxa-especial"] },
      { texto: "Helena is HR. Hires go through Otávio.", revela: ["time:rh", "pessoa:helena", "escala:helena>otavio", "proc:admissao"] },
      { texto: "People outside the company decide too: the accounting firm gets Treasury’s close every 5th.", revela: ["ext:contabilidade", "escala:caio>contabilidade"] },
      { texto: "Banco Aurora talks to you about settlement. The social media agency talks to Lucas.", revela: ["ext:banco", "ext:agencia", "escala:banco>marina", "escala:agencia>lucas"] },
      { texto: "Changing the payout account has had no owner since October.", revela: ["proc:troca-conta"] },
      { texto: "I found 58 people, 8 teams, 41 processes and 11 meetings that decide.", revela: [] },
    ],
  };

  D.times = [
    { id: "diretoria", nome: "Leadership", pessoas: 4, celula: "tc" },
    { id: "tesouraria", nome: "Treasury", pessoas: 4, celula: "tr" },
    { id: "risco", nome: "Risk", pessoas: 5, celula: "mr" },
    { id: "operacoes", nome: "Operations", pessoas: 11, celula: "br" },
    { id: "atendimento", nome: "Support", pessoas: 9, celula: "bc" },
    { id: "engenharia", nome: "Engineering", pessoas: 18, celula: "bl" },
    { id: "comercial", nome: "Sales", pessoas: 7, celula: "ml" },
    { id: "rh", nome: "HR", pessoas: 3, celula: "tl" },
  ];

  const P = (id, nome, time, cargo, fonte, decide, esperam, reunioes) => {
    const partes = nome.split(" ");
    return { id, nome, primeiro: partes[0], iniciais: partes[0][0] + partes[partes.length - 1][0], time, cargo, fonte, decide, esperam, reunioes };
  };
  D.pessoas = [
    P("marina", "Marina Duarte", "diretoria", "COO", "gmail", ["Every on-demand advance, whatever the amount", "Held payout above R$ 200,000", "Payment incident that stops settlement"], ["23 advance requests a month", "Held payouts taken to the Tuesday meeting"], ["comite-repasses", "risco-semanal", "incidentes", "diretoria-mensal"]),
    P("otavio", "Otávio Reis", "diretoria", "CEO", "gmail", ["Hires", "Annual budget", "Contract with the settlement bank"], ["Hires that HR prepares"], ["diretoria-mensal"]),
    P("paula", "Paula Menezes", "diretoria", "CFO", "gmail", ["Special rate for a merchant", "Month-end close"], ["Proposals with a special rate from Sales"], ["diretoria-mensal", "pipeline"]),
    P("douglas", "Douglas Nery", "diretoria", "Finance Director", "gmail", ["Cash limit for advances", "Month-end financial close"], ["The advances report, which Caio sends every Friday"], ["diretoria-mensal"]),
    P("caio", "Caio Brandão", "tesouraria", "Treasury Coordinator", "gmail", ["Priority of the day’s payments"], ["Advance requests, until Marina approves"], ["comite-repasses", "fechamento-caixa"]),
    P("debora", "Débora Lins", "tesouraria", "Treasury Analyst", "gmail", ["Nothing on her own: prepares and checks"], ["The day’s cash close, until Caio signs off"], ["fechamento-caixa"]),
    P("livia", "Lívia Sato", "risco", "Head of Risk", "gmail", ["Precautionary block of a merchant", "Part of the held payouts"], ["Tiago’s chargeback reviews"], ["comite-repasses", "risco-semanal"]),
    P("tiago", "Tiago Moura", "risco", "Risk Analyst", "gmail", ["First review of a chargeback"], ["Disputes opened by cardholders"], ["risco-semanal"]),
    P("sofia", "Sofia Almeida", "operacoes", "Operations Coordinator", "gmail", ["Part of the held payouts", "Operations team schedule"], ["Pedro’s reconciliation", "Delays brought by Support"], ["comite-repasses", "daily-operacoes", "incidentes"]),
    P("pedro", "Pedro Nunes", "operacoes", "Operations Analyst", "gmail", ["Nothing on his own: reconciles and flags differences"], ["The Banco Aurora statement, every morning"], ["daily-operacoes"]),
    P("rafael", "Rafael Prado", "atendimento", "Support Coordinator", "gmail", ["What to tell a merchant whose payout is late"], ["Cases that Nina and Igor can’t resolve"], ["daily-operacoes", "incidentes"]),
    P("nina", "Nina Freitas", "atendimento", "Support Agent", "intercom", ["First-level reply"], ["Merchant conversations in Intercom"], []),
    P("igor", "Igor Santos", "atendimento", "Support Agent", "intercom", ["First-level reply"], ["Merchant conversations in Intercom"], []),
    P("bianca", "Bianca Torres", "engenharia", "Tech Lead", "gmail", ["When an incident becomes a crisis"], ["André’s fixes, until she reviews them"], ["incidentes"]),
    P("andre", "André Kim", "engenharia", "Platform Engineer", "gmail", ["Gateway fixes"], ["Gateway alerts"], ["incidentes"]),
    P("marcos", "Marcos Ueda", "engenharia", "Engineer", "github", ["Code review of the reconciler"], ["Change requests for the reconciler, coming from Operations"], []),
    P("yuri", "Yuri Castro", "engenharia", "Engineer", "github", ["Publishing the merchant app"], ["App releases, until Bianca approves"], []),
    P("lucas", "Lucas Ferraz", "comercial", "Head of Sales", "gmail", ["Standard proposal for a merchant"], ["Approval of a special rate by Paula"], ["pipeline"]),
    P("renan", "Renan Costa", "comercial", "Account Executive", "gmail", ["Nothing on his own: negotiates and takes it to Lucas"], ["Off-standard proposals, until Lucas approves"], ["pipeline"]),
    P("clara", "Clara Dias", "comercial", "Account Executive", "tldv", ["Nothing on her own: negotiates and takes it to Lucas"], ["Off-standard proposals, until Lucas approves"], ["pipeline"]),
    P("helena", "Helena Vaz", "rh", "Head of People", "gmail", ["Hiring process", "Payroll and benefits"], ["Approval of a hire by Otávio"], []),
  ];

  D.externos = [
    { id: "contabilidade", nome: "Accounting · outside firm", curto: "Accounting", iniciais: "CT", tipo: "Accounting firm", perto: "tesouraria", lado: "tr", fonte: "gmail", decide: ["Accounting close of the month"], esperam: ["The month-end close, which Caio sends on the 5th"], reunioes: [] },
    { id: "banco", nome: "Banco Aurora · account manager", curto: "Banco Aurora", iniciais: "BA", tipo: "Settlement bank, account manager", perto: "risco", lado: "mr", fonte: "gmail", decide: ["Settlement window of the day", "Settlement account limit"], esperam: ["The day’s settlement confirmation, which Caio sends"], reunioes: ["diretoria-mensal"] },
    { id: "agencia", nome: "Social media agency", curto: "Agency", iniciais: "AG", tipo: "Social media agency", perto: "comercial", lado: "ml", fonte: "gmail", decide: ["Post calendar"], esperam: ["Campaigns, until Lucas approves"], reunioes: [] },
  ];

  D.escalas = [
    { de: "marina", para: "otavio", sobre: "Leadership decisions", porMes: 6, fonte: "gmail" },
    { de: "debora", para: "caio", sobre: "Cash close", porMes: 22, fonte: "gmail" },
    { de: "caio", para: "marina", sobre: "On-demand advance", porMes: 23, fonte: "gmail" },
    { de: "pedro", para: "sofia", sobre: "Reconciliation differences", porMes: 14, fonte: "gmail" },
    { de: "tiago", para: "livia", sobre: "Chargeback above the limit", porMes: 11, fonte: "gmail" },
    { de: "sofia", para: "marina", sobre: "Held payout", porMes: 5, fonte: "gmail" },
    { de: "livia", para: "marina", sobre: "Held payout", porMes: 4, fonte: "gmail" },
    { de: "rafael", para: "sofia", sobre: "Merchant with a late payout", porMes: 18, fonte: "gmail" },
    { de: "andre", para: "bianca", sobre: "Gateway alert", porMes: 8, fonte: "gmail" },
    { de: "bianca", para: "marina", sobre: "Payment incident", porMes: 2, fonte: "gmail" },
    { de: "renan", para: "lucas", sobre: "Off-standard proposal", porMes: 9, fonte: "gmail" },
    { de: "lucas", para: "paula", sobre: "Special rate", porMes: 6, fonte: "gmail" },
    { de: "helena", para: "otavio", sobre: "Hire", porMes: 3, fonte: "gmail" },
    { de: "caio", para: "contabilidade", sobre: "Month-end close, every 5th", porMes: 1, fonte: "gmail" },
    { de: "banco", para: "marina", sobre: "Settlement window", porMes: 4, fonte: "gmail" },
    { de: "agencia", para: "lucas", sobre: "Campaign approval", porMes: 4, fonte: "gmail" },
    // reveladas por integrações
    { de: "nina", para: "rafael", sobre: "Merchant asking for a payout extension", porMes: 31, fonte: "intercom" },
    { de: "igor", para: "rafael", sobre: "Change of payout account", porMes: 7, fonte: "intercom" },
    { de: "clara", para: "lucas", sobre: "Off-standard proposal", porMes: 5, fonte: "tldv" },
    { de: "paula", para: "otavio", sobre: "Month-end close", porMes: 1, fonte: "tldv" },
    { de: "sofia", para: "livia", sobre: "Suspicious merchant", porMes: 6, fonte: "slack" },
    { de: "marcos", para: "andre", sobre: "Change to the reconciler", porMes: 4, fonte: "github" },
    { de: "yuri", para: "bianca", sobre: "App release", porMes: 4, fonte: "github" },
    { de: "banco", para: "sofia", sobre: "Statement and settlement window", porMes: 20, fonte: "whatsapp" },
  ];

  const F = (fonte, texto, data) => ({ fonte, texto, data });
  D.processos = [
    { id: "antecipacao", nome: "On-demand advance", porMes: 23, frequencia: "23 a month", time: "tesouraria", quem: "caio", aprova: "marina", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["Rafael (Support) or Lucas (Sales) receives the merchant’s request and sends it to Treasury.", "Caio checks the balance due, the limit and the merchant’s history in the “Advances 2026” spreadsheet.", "Caio sends the request to Marina by email, with the amount and the rate.", "Marina approves. Today she approves all of them, whatever the amount: none refused in 6 months.", "Débora carries out the advance at the bank the same day.", "Rafael tells the merchant the money has arrived."],
      decide: "Marina, on all 23 requests of the month, whatever the amount. 19 of 23 are below R$ 50,000.",
      excecoes: ["Merchant with a chargeback in the last 90 days: not written down. Today every case goes back to Marina with no criteria.", "Request above the merchant’s credit limit: Caio refuses before it reaches Marina."],
      fontes: [{ fonte: "gmail", rotulo: "Gmail · thread of 4 emails", texto: "Caio to Marina: “Loja Ventana request, R$ 38,000, balance ok. Can I go ahead?” Marina answers “Go ahead.” two days later.", data: "12 to 14 Nov" }, { fonte: "drive", rotulo: "Drive · spreadsheet with a comment", texto: "“Advances 2026”: 23 requests in October, an “ok Marina” column on every one. Caio’s comment: “Below 50,000, does it really need to go through Marina?”", data: "31 Oct" }, { fonte: "agenda", rotulo: "Calendar · meeting", texto: "Tuesday payouts committee: an advance stuck for more than 2 days goes on the agenda.", data: "18 Nov" }] },
    { id: "repasse-retido", nome: "Held payout", porMes: 9, frequencia: "9 a month", time: "operacoes", quem: "sofia", aprova: "marina", certeza: "média", fonte: "gmail", noMapa: true,
      passos: ["Pedro sees the held payout in the morning reconciliation and tells Sofia.", "Whoever picks up the case decides to release or hold: Sofia, Lívia or Marina.", "Sofia releases when the merchant has gone 6 months without a dispute. Lívia holds until Tiago has reviewed it. Marina decides by the size of the merchant.", "Above R$ 200,000, the case goes to the Payouts committee, on Tuesday.", "Rafael tells the merchant what was decided."],
      decide: "Sofia, Lívia or Marina, with no written criteria. Above R$ 200,000, the Payouts committee.",
      excecoes: ["Merchant among the top 20: the committee takes it to Otávio.", "Merchant under a precautionary block from Risk: only Lívia can release."],
      fontes: [{ fonte: "gmail", rotulo: "Gmail · thread of 5 emails", texto: "Sofia to Lívia: “Do I release Casa Pirá’s payout or hold it one more day?” Lívia: “Hold it until Tiago looks.”", data: "6 Nov" }, { fonte: "agenda", rotulo: "Calendar · meeting", texto: "Payouts committee, every Tuesday at 10 am, with Marina, Sofia, Lívia and Caio.", data: "recurring" }, { fonte: "drive", rotulo: "Drive · document with a comment", texto: "“Payout policy” (2024) says nothing about holds. Marina’s comment: “We need to write this down.”", data: "set" }] },
    { id: "conciliacao", nome: "Payout reconciliation", porMes: 22, frequencia: "every morning, 22 a month", time: "operacoes", quem: "pedro", aprova: "sofia", certeza: "alta", fonte: "drive", noMapa: true,
      passos: ["Pedro downloads the Banco Aurora statement at 8 am.", "Pedro matches the statement against the day’s payout spreadsheet, line by line: about 50 minutes.", "Difference up to R$ 5,000: Pedro fixes it and notes it in the spreadsheet.", "Difference above R$ 5,000: Pedro takes it to Sofia, who decides whether to hold the payout.", "Sofia brings the open differences to the Operations daily, at 9:15 am."],
      decide: "Sofia, on differences above R$ 5,000.",
      excecoes: ["Bank statement late: Pedro waits until 10 am and tells Caio.", "Difference on the same merchant two days in a row: goes to Lívia, in Risk."],
      fontes: [{ fonte: "drive", rotulo: "Drive · spreadsheet with a comment", texto: "“Daily reconciliation”: edited every working day between 8 and 9 am. Sofia’s comment: “Above 5,000, call me before you fix it.”", data: "19 Nov" }, { fonte: "gmail", rotulo: "Gmail · thread of 3 emails", texto: "Pedro to Sofia: “R$ 1,240 difference in batch 3, still investigating.”", data: "19 Nov" }, { fonte: "agenda", rotulo: "Calendar · meeting", texto: "Operations daily, 9:15 am: reconciliation differences are the first topic.", data: "every working day" }] },
    { id: "chargeback", nome: "Chargeback review", porMes: 34, frequencia: "34 a month", time: "risco", quem: "tiago", aprova: "livia", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["The cardholder opens the dispute and the notice reaches Risk by email.", "Tiago asks the merchant for proof of the sale, with an internal deadline of 5 days.", "Tiago builds the defense and replies to the card network.", "Dispute above R$ 10,000, or the merchant’s third of the month: goes to Lívia.", "Lívia decides whether to defend, accept or ask for a precautionary block."],
      decide: "Tiago, up to R$ 10,000. Lívia, above that or on the merchant’s third dispute in the month.",
      excecoes: ["Merchant with 3 disputes in the month: precautionary block, decided by Lívia.", "Card network deadline in 2 days: Tiago replies with what he has."],
      fontes: [{ fonte: "gmail", rotulo: "Gmail · thread of 3 emails", texto: "Tiago to Lívia: “3rd dispute from Loja Ventana this month. Precautionary block?”", data: "8 Nov" }, { fonte: "drive", rotulo: "Drive · spreadsheet with a comment", texto: "“Disputes 2026”: 34 in October, 4 missed the deadline. Lívia’s comment: “We need an alert.”", data: "31 Oct" }, { fonte: "agenda", rotulo: "Calendar · meeting", texto: "Weekly Risk, Thursday at 2 pm: blocks and chargeback limits.", data: "recurring" }] },
    { id: "primeira-resposta", nome: "First reply to the merchant", porMes: 60, frequencia: "60 conversations a month", time: "atendimento", quem: "rafael", aprova: "rafael", certeza: "média", fonte: "gmail", noMapa: true,
      passos: ["The merchant writes in the chat or by email.", "Nina or Igor answers what they already know: payout timing, advance status.", "No ready answer: the case goes up to Rafael.", "Late payout: Rafael asks Sofia and goes back to the merchant.", "Median first reply today: 2 h 26 min. The help page promises 1 hour."],
      decide: "Rafael, what to tell a late merchant. Nobody has reviewed the 1-hour promise since 2024.",
      excecoes: ["Merchant among the top 20: Lucas answers too.", "Payment incident open: Rafael uses the text Bianca sends."],
      fontes: [{ fonte: "site", rotulo: "Website · help page", texto: "“We reply within 1 hour.”", data: "since 2024" }, { fonte: "gmail", rotulo: "Gmail · thread of 6 emails", texto: "Rafael to Sofia: “Merchant complaining about Friday’s payout, what do I say?”", data: "18 Nov" }, { fonte: "agenda", rotulo: "Calendar · meeting", texto: "Operations daily: the day’s late payouts, with Rafael and Sofia.", data: "every working day" }] },
    { id: "incidente", nome: "Payment incident", porMes: 2, frequencia: "2 a month", time: "engenharia", quem: "bianca", aprova: "marina", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["André sees the gateway alert.", "Bianca assesses the impact.", "If settlement stops, she calls Marina."],
      decide: "Bianca, if it becomes a crisis. Marina, if settlement stops.", excecoes: [],
      fontes: [F("gmail", "Bianca to Marina: “Gateway down for 12 minutes, 340 transactions in the queue.”", "3 Nov")] },
    { id: "taxa-especial", nome: "Special rate for a merchant", porMes: 6, frequencia: "6 a month", time: "comercial", quem: "lucas", aprova: "paula", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["Lucas builds the proposal with the rate the merchant asked for.", "Paula approves or counter-offers by email."], decide: "Paula.", excecoes: [],
      fontes: [F("gmail", "Lucas to Paula: “1.9% rate for Rede Sol, volume of R$ 4 million.”", "10 Nov")] },
    { id: "admissao", nome: "Hire", porMes: 2, frequencia: "2 a month", time: "rh", quem: "helena", aprova: "otavio", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["Helena runs the selection and sends the offer to Otávio.", "Otávio approves and Helena completes the hire."], decide: "Otávio.", excecoes: [],
      fontes: [F("gmail", "Helena to Otávio: “Offer for the risk analyst role, ok?”", "4 Nov")] },
    { id: "troca-conta", nome: "Change of payout account", porMes: 7, frequencia: "7 a month", time: "operacoes", quem: "sofia", aprova: null, certeza: "média", fonte: "gmail", noMapa: true, semDono: true,
      passos: ["The merchant asks for the change in the Support chat.", "Nina or Igor asks for proof of the new account.", "Until October, the Operations manager checked the account holder and approved.", "Since he left, the request stops at Sofia or goes back to Support unanswered."],
      decide: "Nobody, since the Operations manager left, in October.",
      excecoes: ["New account under a different company tax ID (CNPJ): the favorite fraud route, and today nobody checks.", "Merchant in a hurry: Support changed it without approval 2 times in November."],
      fontes: [{ fonte: "gmail", rotulo: "Gmail · unanswered email", texto: "Rafael to Sofia: “Who approves account changes now?”", data: "21 Oct" }, { fonte: "drive", rotulo: "Drive · procedure with a comment", texto: "“Account change”: last edited in September, still says the manager who left approves. Rafael’s comment: “Who signs now?”", data: "set" }, { fonte: "agenda", rotulo: "Calendar · meeting", texto: "Incident review of 8 Nov: the two changes made without approval went on the agenda.", data: "8 Nov" }] },
    { id: "fechamento-mes", nome: "Month-end close with accounting", porMes: 1, frequencia: "every 5th", time: "tesouraria", quem: "caio", aprova: "paula", certeza: "alta", fonte: "gmail", noMapa: false,
      passos: ["Débora closes the month’s cash.", "Caio sends it to accounting.", "Paula checks the trial balance."], decide: "Paula.", excecoes: [],
      fontes: [F("gmail", "Caio to accounting: “Here is the October close.”", "5 Nov")] },
    { id: "caixa-diario", nome: "Daily cash close", porMes: 22, frequencia: "every working day", time: "tesouraria", quem: "debora", aprova: "caio", certeza: "alta", fonte: "drive", noMapa: false,
      passos: ["Débora checks the day’s money in and out.", "Caio signs off and decides the next day’s payments."], decide: "Caio.", excecoes: [],
      fontes: [F("drive", "“Cash 2026” spreadsheet, tab of the day", "nov")] },
    // reveladas por integrações
    { id: "estorno", nome: "Refund to the cardholder", porMes: 15, frequencia: "15 a month", time: "atendimento", quem: "nina", aprova: "tiago", certeza: "média", fonte: "intercom", noMapa: true,
      passos: ["The cardholder asks for a refund in the chat and Nina opens the case.", "Tiago checks the sale and decides on the refund."], decide: "Tiago.", excecoes: [],
      fontes: [F("intercom", "Conversation #48211: cardholder asks for a refund, Nina passes it to Risk", "17 Nov")] },
    { id: "proposta", nome: "Standard sales proposal", porMes: 14, frequencia: "14 a month", time: "comercial", quem: "renan", aprova: "lucas", certeza: "alta", fonte: "tldv", noMapa: true,
      passos: ["Renan or Clara negotiates with the merchant and sends the proposal.", "Lucas approves. If it is off-standard, it goes to Paula."], decide: "Lucas.", excecoes: ["Off-standard: Paula."],
      fontes: [F("tldv", "Recording “Lume x Rede Sol”: Lucas decides the rate at the end of the meeting", "10 Nov")] },
    { id: "bloqueio", nome: "Precautionary block of a merchant", porMes: 4, frequencia: "4 a month", time: "risco", quem: "livia", aprova: "livia", certeza: "alta", fonte: "slack", noMapa: true,
      passos: ["Sofia or Tiago flags the suspicious merchant in the #risco channel.", "Lívia decides on the block and tells Rafael."], decide: "Lívia.", excecoes: [],
      fontes: [F("slack", "#risco: \"Blocking Loja Ventana until the review\"", "8 Nov")] },
    { id: "deploy", nome: "Publishing the merchant app", porMes: 8, frequencia: "8 a month", time: "engenharia", quem: "yuri", aprova: "bianca", certeza: "alta", fonte: "github", noMapa: true,
      passos: ["Yuri opens the review of the merchant app.", "Bianca approves and the release goes out on Thursday."], decide: "Bianca.", excecoes: [],
      fontes: [F("github", "Review #812 approved by Bianca", "20 Nov")] },
    { id: "liquidacao", nome: "Settlement confirmation with the bank", porMes: 20, frequencia: "every working day", time: "tesouraria", quem: "caio", aprova: "caio", certeza: "média", fonte: "whatsapp", noMapa: true,
      passos: ["Banco Aurora sends the day’s window and statement in the WhatsApp group.", "Pedro checks the statement and Caio confirms the settlement."], decide: "Caio, in the WhatsApp group.", excecoes: [],
      fontes: [F("whatsapp", "Group “Lume settlement”: “Today’s window until 3 pm”", "21 Nov")] },
  ];

  D.reunioes = [
    { id: "comite-repasses", tipo: "decide", nome: "Payouts committee", quando: "Every Tuesday, 10 am", pessoas: ["marina", "sofia", "livia", "caio"], decide: ["Held payouts above R$ 200,000", "Merchant who gets paid again"], escalaPara: "Otávio, when the merchant is in the top 20", fonte: "agenda",
      fontes: [F("agenda", "Recurring event since March, 4 guests", "recurring"), F("gmail", "Minutes sent by Sofia every Tuesday afternoon", "Tuesdays")] },
    { id: "daily-operacoes", tipo: "alinha", nome: "Operations daily", quando: "Every working day, 9:15 am", pessoas: ["sofia", "pedro", "rafael"], decide: ["Reconciliation differences", "Who tells late merchants"], escalaPara: "Marina, when the delay goes past 1 day", fonte: "agenda",
      fontes: [F("agenda", "Daily event, 15 minutes", "recurring")] },
    { id: "risco-semanal", tipo: "decide", nome: "Weekly Risk", quando: "Every Thursday, 2 pm", pessoas: ["livia", "tiago", "marina"], decide: ["Precautionary blocks", "Chargeback limits"], escalaPara: "Marina, on a block of a large merchant", fonte: "agenda",
      fontes: [F("agenda", "Recurring event, 3 guests", "recurring")] },
    { id: "fechamento-caixa", tipo: "decide", nome: "Cash close", quando: "Every working day, 5 pm", pessoas: ["caio", "debora"], decide: ["Next day’s payments"], escalaPara: "Paula, if cash goes negative", fonte: "agenda",
      fontes: [F("agenda", "Daily event, 2 guests", "recurring")] },
    { id: "incidentes", tipo: "alinha", nome: "Incident review", quando: "Every Friday, 4 pm", pessoas: ["bianca", "andre", "sofia", "rafael", "marina"], decide: ["What to tell merchants", "The week’s fixes"], escalaPara: "Otávio, if there was a loss", fonte: "agenda",
      fontes: [F("agenda", "Recurring event, 5 guests", "recurring")] },
    { id: "pipeline", tipo: "decide", nome: "Sales pipeline", quando: "Every Monday, 11 am", pessoas: ["lucas", "renan", "paula"], decide: ["Off-standard rates"], escalaPara: "Otávio, above R$ 10 million a month", fonte: "agenda",
      fontes: [F("agenda", "Recurring event, 3 guests", "recurring")] },
    { id: "diretoria-mensal", tipo: "decide", nome: "Monthly Leadership", quando: "First Monday of the month", pessoas: ["otavio", "marina", "paula"], decide: ["Budget", "Hiring"], escalaPara: "Board, when the budget changes", fonte: "agenda",
      fontes: [F("agenda", "Recurring event, 3 guests", "recurring")] },
  ];

  D.base = { pessoas: 58, times: 8, processos: 41, reunioes: 11 };
  D.reunioesAgenda = 96; // 96 recorrentes na agenda: "reunioes" (11 ou 14) decidem, o resto alinha

  const I = (o) => o;
  D.integracoes = [
    I({ id: "intercom", ganho: 7, ganhoMicrosoft: 7, motivoGanho: "where merchants talk to Lume", motivoGanhoMicrosoft: "where merchants talk to Lume", acrescentaria: "the real merchant response time", curto: "312 emails", adicionou: "+2 people, real response time", nome: "Intercom", sigla: "In", achada: true, evidencia: "I saw Intercom mentioned in 312 emails.", emails: 312,
      pede: "Merchant conversations, who answers and how fast.", naoPede: "I don’t read card data.",
      acrescenta: { pessoas: ["nina", "igor"], escalas: ["nina>rafael", "igor>rafael"], processos: ["estorno"], contagem: { pessoas: 2, processos: 3, reunioes: 0 } },
      feed: "With Intercom: 2 people in Support and the real first-reply time, 2 h 26 min." }),
    I({ id: "tldv", ganho: 6, ganhoMicrosoft: 6, motivoGanho: "the meetings that decide are recorded there", motivoGanhoMicrosoft: "the meetings that decide are recorded there", acrescentaria: "what each meeting decides", curto: "148 emails", adicionou: "+1 person, who decides in 9 meetings", nome: "tl;dv", sigla: "tl", achada: true, evidencia: "I saw tl;dv mentioned in 148 emails.", emails: 148,
      pede: "Recordings and transcripts of the meetings you attend.", naoPede: "I don’t read private meetings.",
      acrescenta: { pessoas: ["clara"], escalas: ["clara>lucas", "paula>otavio"], processos: ["proposta"], contagem: { pessoas: 1, processos: 3, reunioes: 3 } },
      feed: "With tl;dv: 9 recurring meetings, who decides in each." }),
    I({ id: "whatsapp", ganho: 8, ganhoMicrosoft: 8, motivoGanho: "operations settles a lot there, away from email", motivoGanhoMicrosoft: "operations settles a lot there, away from email", acrescentaria: "what never reaches email", curto: "640 emails", adicionou: "+3 groups, 2 decisions a day", nome: "WhatsApp", sigla: "Wa", achada: true, evidencia: "I saw WhatsApp mentioned in 640 emails.", emails: 640,
      como: "A lot of operations goes through WhatsApp. In the Mac app, with your permission, I read only the chats you mark. Or send an exported chat from a group.",
      conceito: true, confianca: "Nothing leaves your Mac without you seeing it.",
      grupos: [{ nome: "Operations · payouts", pessoas: 9, marcado: true }, { nome: "Treasury and accounting", pessoas: 5, marcado: true }, { nome: "Lume settlement · Banco Aurora", pessoas: 4, marcado: false }],
      pede: "Only the chats you mark in the Mac app.", naoPede: "I don’t read any chat you don’t mark.",
      formas: ["Mark chats in the Mac app", "Send an exported chat"], linha: "through the Mac app, only what you mark",
      acrescenta: { pessoas: [], escalas: ["banco>sofia"], processos: ["liquidacao"], contagem: { pessoas: 0, processos: 2, reunioes: 0 } },
      feed: "With WhatsApp: 3 operations groups, 2 decisions a day that never show up in email." }),
    I({ id: "slack", ganho: 12, ganhoMicrosoft: 3, motivoGanho: "day-to-day decisions go through there", motivoGanhoMicrosoft: "Teams already shows almost everything day to day", acrescentaria: "where decisions happen day to day", curto: "2.100 e-mails", adicionou: "+1 escalation path", nome: "Slack", sigla: "Sl", achada: true, evidencia: "I saw Slack mentioned in 2,100 emails.", emails: 2100,
      pede: "Public team channels.", naoPede: "I don’t read direct messages.",
      acrescenta: { pessoas: [], escalas: ["sofia>livia"], processos: ["bloqueio"], contagem: { pessoas: 0, processos: 2, reunioes: 1 } },
      feed: "With Slack: an escalation path that skips email, from Operations to Risk." }),
    I({ id: "notion", ganho: 9, ganhoMicrosoft: 9, motivoGanho: "the written procedures are there, and several have aged", motivoGanhoMicrosoft: "the written procedures are there, and several have aged", acrescentaria: "outdated docs, written vs. done", curto: "420 emails", adicionou: "+4 written processes", nome: "Notion", sigla: "No", achada: true, evidencia: "I saw Notion mentioned in 420 emails.", emails: 420,
      pede: "Process and procedure pages.", naoPede: "I don’t read private pages.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 4, reunioes: 0 } },
      feed: "With Notion: 4 written processes, 2 different from what is done today." }),
    I({ id: "github", ganho: 5, ganhoMicrosoft: 5, motivoGanho: "Engineering reviews and publishes everything there", motivoGanhoMicrosoft: "Engineering reviews and publishes everything there", acrescentaria: "how code is reviewed and stalls", curto: "530 emails", adicionou: "+2 people in Engineering", nome: "GitHub", sigla: "Gh", achada: true, evidencia: "I saw GitHub mentioned in 530 emails.", emails: 530,
      pede: "Who reviews and publishes what.", naoPede: "I don’t read the code.",
      acrescenta: { pessoas: ["marcos", "yuri"], escalas: ["marcos>andre", "yuri>bianca"], processos: ["deploy"], contagem: { pessoas: 2, processos: 2, reunioes: 0 } },
      feed: "With GitHub: who reviews and who publishes in Engineering, 2 more people." }),
    I({ id: "zendesk", ganho: 2, ganhoMicrosoft: 2, motivoGanho: "the old support history", motivoGanhoMicrosoft: "the old support history", acrescentaria: "the old support history", curto: "", adicionou: "+tickets up to 2024", nome: "Zendesk", sigla: "Zd", achada: false, evidencia: "Not seen in your email.", emails: 0,
      pede: "Old support tickets.", naoPede: "I don’t read card data.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 1, reunioes: 0 } },
      feed: "With Zendesk: tickets up to 2024, from before Intercom. 1 old process." }),
    I({ id: "granola", ganho: 3, ganhoMicrosoft: 3, motivoGanho: "Leadership’s notes live there", motivoGanhoMicrosoft: "Leadership’s notes live there", acrescentaria: "the decisions in your meeting notes", curto: "", adicionou: "+Leadership notes", nome: "Granola", sigla: "Gr", achada: false, evidencia: "Not seen in your email.", emails: 0,
      pede: "Your meeting notes.", naoPede: "I don’t read notes you don’t share.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 0, reunioes: 1 } },
      feed: "With Granola: the monthly Leadership notes, with the decisions." }),
    I({ id: "cloudhumans", ganho: 2, ganhoMicrosoft: 2, motivoGanho: "the support bot", motivoGanhoMicrosoft: "the support bot", acrescentaria: "what the bot resolves with no one’s help", curto: "", adicionou: "+what the bot resolves", nome: "CloudHumans", sigla: "Ch", achada: false, evidencia: "Not seen in your email.", emails: 0,
      pede: "What the support bot resolves and what it hands off.", naoPede: "I don’t read card data.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 1, reunioes: 0 } },
      feed: "With CloudHumans: what the bot resolves on its own and what goes to Rafael." }),
    I({ id: "revenuecat", ganho: 1, ganhoMicrosoft: 1, motivoGanho: "the app subscriptions", motivoGanhoMicrosoft: "the app subscriptions", acrescentaria: "who cancels and why", curto: "", adicionou: "+app subscriptions", nome: "RevenueCat", sigla: "Rc", achada: false, evidencia: "Not seen in your email.", emails: 0,
      pede: "Merchant app subscriptions.", naoPede: "I don’t read card data.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 1, reunioes: 0 } },
      feed: "With RevenueCat: merchant app subscriptions and who handles cancellations." }),
  ];

  D.final = { pessoas: 61, times: 8, processos: 47, reunioes: 14, buracos: 9 };

  D.buracos = [
    { id: "antecipacao", titulo: "On-demand advances wait for one person", porMes: 23, frequencia: "23 a month", intensidade: 0.92, processo: "antecipacao", sobreVoce: true,
      dor: "Median of 1.8 days stuck. R$ 1.2 million in requests waiting each month.", numeros: { diasParado: 1.8, reaisEsperando: 1200000 },
      elogio: "Everything goes through you because they trust you.", proposta: "Say up to what amount Treasury approves on its own." },
    { id: "primeira-resposta", titulo: "Public promise of 1 hour, in practice 2 h 26 min", porMes: 55, frequencia: "55 of 60 conversations", intensidade: 0.62, processo: "primeira-resposta",
      dor: "55 of 60 conversations take more than 1 hour. Median 2 h 26 min.", numeros: { conversas: 55, de: 60, mediana: "2h26" }, proposta: "Change the promise or Support staffing." },
    { id: "troca-conta", titulo: "Change of payout account has no owner", porMes: 7, frequencia: "7 a month", intensidade: 0.85, processo: "troca-conta",
      dor: "High fraud risk. Nobody has approved since the manager left, in October.", numeros: {}, proposta: "Give it an owner and an account-holder check." },
    { id: "repasse-retido", titulo: "Held payout: three people decide three ways", porMes: 9, frequencia: "9 a month", intensidade: 0.58, processo: "repasse-retido",
      dor: "The same case gets a different answer depending on who picks it up.", numeros: {}, proposta: "Write one rule for releasing or holding." },
    { id: "conciliacao", titulo: "Payout reconciliation done by hand every morning", porMes: 22, frequencia: "22 a month", intensidade: 0.4, processo: "conciliacao",
      dor: "50 minutes a day, every morning.", numeros: { minutos: 50 }, proposta: "Automate the matching and leave only the differences." },
    { id: "taxa-especial", titulo: "Special rate waits for Paula by email", porMes: 6, frequencia: "6 a month", intensidade: 0.3, processo: "taxa-especial",
      dor: "3 days on average to get an answer.", numeros: {}, proposta: "A rate band that Lucas approves on his own." },
    { id: "chargeback", titulo: "Chargeback with no review deadline", porMes: 34, frequencia: "34 a month", intensidade: 0.26, processo: "chargeback",
      dor: "4 disputes missed the deadline in October.", numeros: {}, proposta: "An internal deadline and an alert before it expires." },
    { id: "incidente", titulo: "Incident notice to merchants has no template", porMes: 2, frequencia: "2 a month", intensidade: 0.34, processo: "incidente",
      dor: "Each notice is written from scratch, in the middle of the crisis.", numeros: {}, proposta: "A ready-made notice template." },
    { id: "admissao", titulo: "Hiring without an access list", porMes: 2, frequencia: "2 a month", intensidade: 0.18, processo: "admissao",
      dor: "A new person waits 2 days for access.", numeros: {}, proposta: "An access list by role." },
    { id: "perguntas-repetidas", titulo: "The same questions reach you every week", porMes: 14, frequencia: "14 a month", intensidade: 0.5, processo: "antecipacao",
      dor: "14 questions a month; 11 have an answer in the spreadsheet. Each one interrupts you.", numeros: { perguntas: 14, naPlanilha: 11 },
      proposta: "Let the brain answer what is already in the spreadsheet, with the source beside it." },
  ];
  // o número de buracos sai da lista (ninguém escreve à mão); atribuir não tem efeito
  Object.defineProperty(D.final, "buracos", { get: () => D.buracos.length, set: () => {}, enumerable: true });

  // as 23 antecipações do mês por faixa de valor (somam 23; 19 ficam abaixo de R$ 50 mil)
  D.antecipacoesPorFaixa = [
    { faixa: "below R$ 5,000", quantos: 11 },
    { faixa: "R$ 5,000 to R$ 50,000", quantos: 8 },
    { faixa: "above R$ 50,000", quantos: 4 },
  ];

  D.pergunta = {
    buraco: "antecipacao",
    evidencia: ["23 requests a month", "Everyone waits for Marina", "19 of 23 below R$ 50,000", "None refused in 6 months"],
    pergunta: "Below what amount can Treasury approve on its own?",
    porque: "19 of the month’s 23 requests are below R$ 50,000 and none was refused. That is where the wait is.",
    resposta: "Treasury approves up to R$ 50,000. Above that, me.",
    aprofunda: "And when the merchant has had a chargeback in the last 90 days?",
    resposta2: "Then it always comes to me, whatever the amount.",
    regra: ["Up to R$ 50,000, Treasury approves on its own.", "Above R$ 50,000, Marina approves.", "Merchant with a chargeback in the last 90 days: always Marina, whatever the amount."],
    atualizados: ["antecipacao", "repasse-retido", "primeira-resposta"],
    espera: { antes: "1.8 days", depois: "2 hours" },
  };

  D.skill = { nome: "On-demand advance", versao: "v1", aprovadaPor: "Marina", quando: "today",
    regra: D.pergunta.regra, destinos: [{ id: "claude", nome: "Claude" }, { id: "chatgpt", nome: "ChatGPT" }, { id: "grok", nome: "Grok" }, { id: "slack", nome: "Slack" }] };

  D.uso = { semana: 12, semChamar: 10, paramNaExcecao: 2,
    conversas: [{ quem: "Débora Lins", pergunta: "Loja Ventana advance request, R$ 38,000. Can I approve it?", resposta: "Yes. Treasury approves up to R$ 50,000. First check whether Loja Ventana had a chargeback in the last 90 days: if so, it goes through Marina." }] };

  // Quem é quem (P3): as contas do domínio, em grupos, para a pessoa confirmar logo depois de entrar. Somam 61.
  D.quemEQuem = {
    total: 61,
    grupos: [
      { id: "pessoas", nome: "People", n: 54, amostra: ["Otávio Reis", "Paula Menezes", "Caio Brandão", "Lívia Sato", "Sofia Almeida", "Rafael Prado"],
        duvida: { conta: "notas@", texto: "Looks like a bot: sends about 400 emails a month and never replies.", opcoes: ["It is a person", "It is an agent"], sugerida: "It is an agent" } },
      { id: "caixas", nome: "Shared mailboxes", n: 3, amostra: ["suporte@", "financeiro@", "repasses@"],
        duvida: { conta: "financeiro@", texto: "Who looks after this mailbox?", opcoes: ["Treasury", "Leadership", "Operations"], sugerida: "Treasury" } },
      { id: "agentes", nome: "Agents and bots", n: 2, amostra: ["relatorios@", "alertas-gateway@"] },
      { id: "paradas", nome: "Unused for 90 days", n: 2, amostra: ["the Operations manager who left in October", "an internship account"] },
    ],
  };

  D.areas = ["Operations", "Treasury", "Engineering", "HR", "Leadership"];
  D.guardrailsPadrao = { "Operations": D.areas.slice(), "Treasury": D.areas.slice(), "Engineering": D.areas.slice(), "HR": D.areas.slice(), "Leadership": D.areas.slice() };

  D.depois = {
    observando: { titulo: "Learn by watching", fontes: ["Computer", "Slack", "Calendar", "Docs and comments"] },
    novo: "I saw payout reconciliation done 3 times the same way. Make it a skill?",
    melhoria: "Merging steps 3 and 4 saves about 20 minutes a case.",
    ciclo: ["ler", "mapear", "buracos", "perguntas", "skills", "uso", "ler de novo"],
  };

  // W1: quanto do trabalho da Lume o mapa enxerga, por fonte conectada (pontos percentuais; teto 95)
  D.cobertura = { base: 40, teto: 95, porFonte: { slack: 12, notion: 9, intercom: 7, tldv: 6, github: 5, whatsapp: 8, zendesk: 2, granola: 3, cloudhumans: 2, revenuecat: 1 } };
  // X6: o ganho de cada fonte em pontos de cobertura, pela suíte (os mesmos números para a tela de Configurações)
  D.ganhoDe = function (id, suite) { const it = D.integracoes.find((x) => x.id === id); if (!it) return 0; return suite === "microsoft" ? it.ganhoMicrosoft : it.ganho; };
  D.motivoDe = function (id, suite) { const it = D.integracoes.find((x) => x.id === id); if (!it) return ""; return suite === "microsoft" ? it.motivoGanhoMicrosoft : it.motivoGanho; };
  D.porGanho = function (suite, lista) { return (lista || D.integracoes).slice().sort((a, b) => D.ganhoDe(b.id, suite) - D.ganhoDe(a.id, suite)); };
  D.coberturaDe = function (conectadas, suite) { const s = D.suites[suite] || D.suites.google; let c = s.base; (conectadas || []).forEach((id) => (c += D.ganhoDe(id, s.id))); return Math.min(D.cobertura.teto, c); };
  // W2: a primeira leitura (times e processos, nunca pessoas; o que vai bem ao lado do que trava)
  D.primeiraLeitura = {
    bem: ["The cash close goes out every working day, without fail, for 6 months.", "Risk answers every chargeback within the deadline when the case arrives the same day.", "Reconciliation has never delayed a payout."],
    andamento: [{ tipo: "bem", texto: "Risk: 34 reviews a month, almost all the same day." }, { tipo: "trava", texto: "Treasury: 23 advances a month wait 1.8 days." }],
    proximo: "With Slack and Notion I start to see day-to-day decisions, outdated documentation and more bottlenecks.",
    perguntas: [{ texto: "Who has approved account changes since October?", ir: "buracos" }, { texto: "The help page still promises 1 hour", processo: "primeira-resposta" }],
  };

  D.contagem = function (conectadas) {
    const c = Object.assign({}, D.base);
    (conectadas || []).forEach((id) => {
      const it = D.integracoes.find((x) => x.id === id);
      if (!it) return;
      c.pessoas += it.acrescenta.contagem.pessoas;
      c.processos += it.acrescenta.contagem.processos;
      c.reunioes += it.acrescenta.contagem.reunioes;
    });
    return c;
  };
  D.porId = function (id) {
    return D.pessoas.find((x) => x.id === id) || D.externos.find((x) => x.id === id) || D.times.find((x) => x.id === id) || D.processos.find((x) => x.id === id) || D.reunioes.find((x) => x.id === id) || null;
  };

  window.SK_DADOS = D;
})();
