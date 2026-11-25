/* dados.js · TODOS os dados inventados do protótipo (Lume Pagamentos). Nada aqui é real.
 *
 * window.SK_DADOS (também em SK.dados e passado a montar(el, dados)):
 *   empresa        { nome, dominio, tamanho }
 *   usuaria        { id:'marina', nome, primeiro, cargo, email, iniciais, time }
 *   fontesGoogle   [{ id:'gmail'|'drive'|'agenda', nome, le, naoLe, numero, rotulo }]
 *   integracoes    [{ id, nome, sigla, achada, evidencia, pede, naoPede, passo2, acrescenta:{pessoas,externos,escalas,processos,contagem}, feed }]
 *                  curto = evidência curta ("312 e-mails"); adicionou = o que a fonte acrescentou, dito depois de conectar.
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

  D.empresa = { nome: "Lume Pagamentos", dominio: "lumepagamentos.com.br", tamanho: "cerca de 60 pessoas" };
  D.usuaria = { id: "marina", nome: "Marina Duarte", primeiro: "Marina", cargo: "COO", email: "marina.duarte@lumepagamentos.com.br", iniciais: "MD", time: "diretoria" };

  D.fontesGoogle = [
    { id: "gmail", nome: "Gmail", le: "Quem escreve para quem, sobre o quê e quem responde.", naoLe: "Não leio anexos pessoais.", numero: "41.200", rotulo: "conversas em 18 meses" },
    { id: "drive", nome: "Drive", le: "Documentos de processo e planilhas compartilhadas, comentários incluídos.", naoLe: "Não abro pastas pessoais.", numero: "1.380", rotulo: "documentos, 212 com comentários" },
    { id: "agenda", nome: "Agenda", le: "Quem vai a quais reuniões e com que frequência.", naoLe: "Não leio eventos marcados como particulares.", numero: "96", rotulo: "reuniões recorrentes" },
  ];

  // X5: a mesma leitura com o Microsoft 365 (SK.estado.suite === "microsoft")
  D.suites = {
    google: { id: "google", nome: "Google", conta: "Google", entrar: "Entrar com Google", fontes: "fontesGoogle", resumo: "seu e-mail, agenda e Drive", base: 40 },
    microsoft: { id: "microsoft", nome: "Microsoft 365", conta: "Microsoft", entrar: "Entrar com Microsoft", fontes: "fontesMicrosoft", resumo: "seu e-mail, agenda, OneDrive e Teams", base: 45 },
  };
  D.fontesMicrosoft = [
    { id: "outlook", nome: "Outlook", le: "Quem escreve para quem, sobre o quê e quem responde.", naoLe: "Não leio anexos pessoais.", numero: "41.200", rotulo: "conversas em 18 meses" },
    { id: "onedrive", nome: "OneDrive e SharePoint", le: "Documentos de processo e planilhas compartilhadas, comentários incluídos.", naoLe: "Não abro pastas pessoais.", numero: "1.380", rotulo: "documentos, 212 com comentários" },
    { id: "calendario", nome: "Calendário", le: "Quem vai a quais reuniões e com que frequência.", naoLe: "Não leio eventos marcados como particulares.", numero: "96", rotulo: "reuniões recorrentes" },
    { id: "teams", nome: "Teams", le: "Canais dos times: quem decide o quê no dia a dia.", naoLe: "Não leio conversas privadas.", numero: "38", rotulo: "canais de time" },
  ];

  D.leitura = {
    gmail: { meses: 18, conversas: 41200 },
    drive: { documentos: 1380, comentados: 212 },
    agenda: { recorrentes: 96 },
    feed: [
      { texto: "Li 18 meses de e-mail da Lume. Começo por quem fala com você.", revela: [] },
      { texto: "Otávio, Paula e Douglas formam a Diretoria com você.", revela: ["time:diretoria", "pessoa:otavio", "pessoa:paula", "pessoa:douglas", "escala:marina>otavio"] },
      { texto: "Caio e Débora cuidam da Tesouraria.", revela: ["time:tesouraria", "pessoa:caio", "pessoa:debora", "escala:debora>caio"] },
      { texto: "Você aprova toda antecipação sob demanda, de qualquer valor. São 23 por mês.", revela: ["escala:caio>marina", "proc:antecipacao"] },
      { texto: "Sofia e Pedro tocam Operações. Pedro concilia os repasses toda manhã, à mão.", revela: ["time:operacoes", "pessoa:sofia", "pessoa:pedro", "escala:pedro>sofia", "proc:conciliacao"] },
      { texto: "Lívia e Tiago são o Risco. Chargeback passa pelo Tiago primeiro.", revela: ["time:risco", "pessoa:livia", "pessoa:tiago", "escala:tiago>livia", "proc:chargeback"] },
      { texto: "A reunião de terça decide os repasses retidos.", revela: ["escala:sofia>marina", "escala:livia>marina", "proc:repasse-retido"] },
      { texto: "Rafael coordena o Atendimento e leva os atrasos para a Sofia.", revela: ["time:atendimento", "pessoa:rafael", "escala:rafael>sofia", "proc:primeira-resposta"] },
      { texto: "Bianca e André são a Engenharia. Incidente de pagamento chega a você pela Bianca.", revela: ["time:engenharia", "pessoa:bianca", "pessoa:andre", "escala:andre>bianca", "escala:bianca>marina", "proc:incidente"] },
      { texto: "Lucas e Renan no Comercial. Taxa especial passa pela Paula.", revela: ["time:comercial", "pessoa:lucas", "pessoa:renan", "escala:renan>lucas", "escala:lucas>paula", "proc:taxa-especial"] },
      { texto: "Helena é o RH. Admissão passa pelo Otávio.", revela: ["time:rh", "pessoa:helena", "escala:helena>otavio", "proc:admissao"] },
      { texto: "Gente de fora também decide: a contabilidade recebe o fechamento da Tesouraria todo dia 5.", revela: ["ext:contabilidade", "escala:caio>contabilidade"] },
      { texto: "O Banco Aurora fala com você sobre a liquidação. A agência de social media fala com o Lucas.", revela: ["ext:banco", "ext:agencia", "escala:banco>marina", "escala:agencia>lucas"] },
      { texto: "Troca de conta de recebimento ficou sem dono desde outubro.", revela: ["proc:troca-conta"] },
      { texto: "Entendi 58 pessoas, 8 times, 41 processos e 11 reuniões que decidem.", revela: [] },
    ],
  };

  D.times = [
    { id: "diretoria", nome: "Diretoria", pessoas: 4, celula: "tc" },
    { id: "tesouraria", nome: "Tesouraria", pessoas: 4, celula: "tr" },
    { id: "risco", nome: "Risco", pessoas: 5, celula: "mr" },
    { id: "operacoes", nome: "Operações", pessoas: 11, celula: "br" },
    { id: "atendimento", nome: "Atendimento", pessoas: 9, celula: "bc" },
    { id: "engenharia", nome: "Engenharia", pessoas: 18, celula: "bl" },
    { id: "comercial", nome: "Comercial", pessoas: 7, celula: "ml" },
    { id: "rh", nome: "RH", pessoas: 3, celula: "tl" },
  ];

  const P = (id, nome, time, cargo, fonte, decide, esperam, reunioes) => {
    const partes = nome.split(" ");
    return { id, nome, primeiro: partes[0], iniciais: partes[0][0] + partes[partes.length - 1][0], time, cargo, fonte, decide, esperam, reunioes };
  };
  D.pessoas = [
    P("marina", "Marina Duarte", "diretoria", "COO", "gmail", ["Toda antecipação sob demanda, de qualquer valor", "Repasse retido acima de R$ 200 mil", "Incidente de pagamento que para a liquidação"], ["23 pedidos de antecipação por mês", "Repasses retidos levados à reunião de terça"], ["comite-repasses", "risco-semanal", "incidentes", "diretoria-mensal"]),
    P("otavio", "Otávio Reis", "diretoria", "CEO", "gmail", ["Admissões", "Orçamento anual", "Contrato com banco liquidante"], ["Admissões que o RH prepara"], ["diretoria-mensal"]),
    P("paula", "Paula Menezes", "diretoria", "CFO", "gmail", ["Taxa especial para lojista", "Fechamento do mês"], ["Propostas com taxa especial do Comercial"], ["diretoria-mensal", "pipeline"]),
    P("douglas", "Douglas Nery", "diretoria", "Diretor Financeiro", "gmail", ["Limite de caixa para antecipações", "Fechamento financeiro do mês"], ["O relatório de antecipações, que o Caio manda toda sexta"], ["diretoria-mensal"]),
    P("caio", "Caio Brandão", "tesouraria", "Coordenador de Tesouraria", "gmail", ["Prioridade dos pagamentos do dia"], ["Pedidos de antecipação, até a Marina aprovar"], ["comite-repasses", "fechamento-caixa"]),
    P("debora", "Débora Lins", "tesouraria", "Analista de Tesouraria", "gmail", ["Nada sozinha: prepara e confere"], ["O fechamento de caixa do dia, até o Caio validar"], ["fechamento-caixa"]),
    P("livia", "Lívia Sato", "risco", "Head de Risco", "gmail", ["Bloqueio cautelar de lojista", "Parte dos repasses retidos"], ["Análises de chargeback do Tiago"], ["comite-repasses", "risco-semanal"]),
    P("tiago", "Tiago Moura", "risco", "Analista de Risco", "gmail", ["Primeira análise de chargeback"], ["Disputas abertas pelos portadores"], ["risco-semanal"]),
    P("sofia", "Sofia Almeida", "operacoes", "Coordenadora de Operações", "gmail", ["Parte dos repasses retidos", "Escala do time de Operações"], ["Conciliação do Pedro", "Atrasos levados pelo Atendimento"], ["comite-repasses", "daily-operacoes", "incidentes"]),
    P("pedro", "Pedro Nunes", "operacoes", "Analista de Operações", "gmail", ["Nada sozinho: concilia e aponta diferenças"], ["O extrato do Banco Aurora, toda manhã"], ["daily-operacoes"]),
    P("rafael", "Rafael Prado", "atendimento", "Coordenador de Atendimento", "gmail", ["O que dizer ao lojista em atraso"], ["Casos que a Nina e o Igor não resolvem"], ["daily-operacoes", "incidentes"]),
    P("nina", "Nina Freitas", "atendimento", "Atendente", "intercom", ["Resposta de primeiro nível"], ["Conversas de lojistas no Intercom"], []),
    P("igor", "Igor Santos", "atendimento", "Atendente", "intercom", ["Resposta de primeiro nível"], ["Conversas de lojistas no Intercom"], []),
    P("bianca", "Bianca Torres", "engenharia", "Tech lead", "gmail", ["Quando um incidente vira crise"], ["Correções do André, até ela revisar"], ["incidentes"]),
    P("andre", "André Kim", "engenharia", "Engenheiro de plataforma", "gmail", ["Correções do gateway"], ["Alertas do gateway"], ["incidentes"]),
    P("marcos", "Marcos Ueda", "engenharia", "Engenheiro", "github", ["Revisão de código do conciliador"], ["Pedidos de mudança no conciliador, vindos de Operações"], []),
    P("yuri", "Yuri Castro", "engenharia", "Engenheiro", "github", ["Publicação do app do lojista"], ["Publicações do app, até a Bianca aprovar"], []),
    P("lucas", "Lucas Ferraz", "comercial", "Head Comercial", "gmail", ["Proposta padrão para lojista"], ["Aprovação de taxa especial pela Paula"], ["pipeline"]),
    P("renan", "Renan Costa", "comercial", "Executivo de contas", "gmail", ["Nada sozinho: negocia e leva ao Lucas"], ["Propostas fora do padrão, até o Lucas aprovar"], ["pipeline"]),
    P("clara", "Clara Dias", "comercial", "Executiva de contas", "tldv", ["Nada sozinha: negocia e leva ao Lucas"], ["Propostas fora do padrão, até o Lucas aprovar"], ["pipeline"]),
    P("helena", "Helena Vaz", "rh", "Head de Pessoas", "gmail", ["Processo seletivo", "Folha e benefícios"], ["Aprovação de admissão pelo Otávio"], []),
  ];

  D.externos = [
    { id: "contabilidade", nome: "Contabilidade · escritório externo", curto: "Contabilidade", iniciais: "CT", tipo: "Escritório de contabilidade", perto: "tesouraria", lado: "tr", fonte: "gmail", decide: ["Fechamento contábil do mês"], esperam: ["O fechamento do mês, que o Caio manda todo dia 5"], reunioes: [] },
    { id: "banco", nome: "Banco Aurora · gerente da conta", curto: "Banco Aurora", iniciais: "BA", tipo: "Banco liquidante, gerente da conta", perto: "risco", lado: "mr", fonte: "gmail", decide: ["Janela de liquidação do dia", "Limite da conta de liquidação"], esperam: ["A confirmação de liquidação do dia, que o Caio manda"], reunioes: ["diretoria-mensal"] },
    { id: "agencia", nome: "Agência de social media", curto: "Agência", iniciais: "AG", tipo: "Agência de social media", perto: "comercial", lado: "ml", fonte: "gmail", decide: ["Calendário de posts"], esperam: ["Campanhas, até o Lucas aprovar"], reunioes: [] },
  ];

  D.escalas = [
    { de: "marina", para: "otavio", sobre: "Decisões de diretoria", porMes: 6, fonte: "gmail" },
    { de: "debora", para: "caio", sobre: "Fechamento de caixa", porMes: 22, fonte: "gmail" },
    { de: "caio", para: "marina", sobre: "Antecipação sob demanda", porMes: 23, fonte: "gmail" },
    { de: "pedro", para: "sofia", sobre: "Diferenças na conciliação", porMes: 14, fonte: "gmail" },
    { de: "tiago", para: "livia", sobre: "Chargeback acima do limite", porMes: 11, fonte: "gmail" },
    { de: "sofia", para: "marina", sobre: "Repasse retido", porMes: 5, fonte: "gmail" },
    { de: "livia", para: "marina", sobre: "Repasse retido", porMes: 4, fonte: "gmail" },
    { de: "rafael", para: "sofia", sobre: "Lojista com repasse atrasado", porMes: 18, fonte: "gmail" },
    { de: "andre", para: "bianca", sobre: "Alerta do gateway", porMes: 8, fonte: "gmail" },
    { de: "bianca", para: "marina", sobre: "Incidente de pagamento", porMes: 2, fonte: "gmail" },
    { de: "renan", para: "lucas", sobre: "Proposta fora do padrão", porMes: 9, fonte: "gmail" },
    { de: "lucas", para: "paula", sobre: "Taxa especial", porMes: 6, fonte: "gmail" },
    { de: "helena", para: "otavio", sobre: "Admissão", porMes: 3, fonte: "gmail" },
    { de: "caio", para: "contabilidade", sobre: "Fechamento do mês, todo dia 5", porMes: 1, fonte: "gmail" },
    { de: "banco", para: "marina", sobre: "Janela de liquidação", porMes: 4, fonte: "gmail" },
    { de: "agencia", para: "lucas", sobre: "Aprovação de campanha", porMes: 4, fonte: "gmail" },
    // reveladas por integrações
    { de: "nina", para: "rafael", sobre: "Lojista pedindo prazo de repasse", porMes: 31, fonte: "intercom" },
    { de: "igor", para: "rafael", sobre: "Troca de conta de recebimento", porMes: 7, fonte: "intercom" },
    { de: "clara", para: "lucas", sobre: "Proposta fora do padrão", porMes: 5, fonte: "tldv" },
    { de: "paula", para: "otavio", sobre: "Fechamento do mês", porMes: 1, fonte: "tldv" },
    { de: "sofia", para: "livia", sobre: "Lojista suspeito", porMes: 6, fonte: "slack" },
    { de: "marcos", para: "andre", sobre: "Mudança no conciliador", porMes: 4, fonte: "github" },
    { de: "yuri", para: "bianca", sobre: "Publicação do app", porMes: 4, fonte: "github" },
    { de: "banco", para: "sofia", sobre: "Extrato e janela de liquidação", porMes: 20, fonte: "whatsapp" },
  ];

  const F = (fonte, texto, data) => ({ fonte, texto, data });
  D.processos = [
    { id: "antecipacao", nome: "Antecipação sob demanda", porMes: 23, frequencia: "23 por mês", time: "tesouraria", quem: "caio", aprova: "marina", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["Rafael (Atendimento) ou Lucas (Comercial) recebe o pedido do lojista e manda para a Tesouraria.", "Caio confere saldo a receber, limite e histórico do lojista na planilha \"Antecipações 2026\".", "Caio manda o pedido para a Marina por e-mail, com valor e taxa.", "Marina aprova. Hoje ela aprova todos, de qualquer valor: nenhum recusado em 6 meses.", "Débora executa a antecipação no banco no mesmo dia.", "Rafael avisa o lojista que o valor caiu."],
      decide: "Marina, nos 23 pedidos do mês, de qualquer valor. 19 de 23 ficam abaixo de R$ 50 mil.",
      excecoes: ["Lojista com chargeback nos últimos 90 dias: não está escrito. Hoje cada caso volta para a Marina sem critério.", "Pedido acima do limite de crédito do lojista: Caio recusa antes de chegar à Marina."],
      fontes: [{ fonte: "gmail", rotulo: "Gmail · fio de 4 e-mails", texto: "Caio para Marina: \"Pedido da Loja Ventana, R$ 38 mil, saldo ok. Pode seguir?\" Marina responde \"Pode.\" dois dias depois.", data: "12 a 14 nov" }, { fonte: "drive", rotulo: "Drive · planilha com comentário", texto: "\"Antecipações 2026\": 23 pedidos em outubro, coluna \"ok Marina\" em todos. Comentário do Caio: \"Abaixo de 50 mil precisa mesmo passar pela Marina?\"", data: "31 out" }, { fonte: "agenda", rotulo: "Agenda · reunião", texto: "Comitê de repasses de terça: antecipação parada há mais de 2 dias entra na pauta.", data: "18 nov" }] },
    { id: "repasse-retido", nome: "Repasse retido", porMes: 9, frequencia: "9 por mês", time: "operacoes", quem: "sofia", aprova: "marina", certeza: "média", fonte: "gmail", noMapa: true,
      passos: ["Pedro vê o repasse retido na conciliação da manhã e avisa a Sofia.", "Quem pega o caso decide liberar ou segurar: Sofia, Lívia ou Marina.", "Sofia libera quando o lojista está 6 meses sem disputa. Lívia segura até o Tiago analisar. Marina decide pelo tamanho do lojista.", "Acima de R$ 200 mil, o caso vai ao Comitê de repasses, na terça.", "Rafael avisa o lojista do que foi decidido."],
      decide: "Sofia, Lívia ou Marina, sem critério escrito. Acima de R$ 200 mil, o Comitê de repasses.",
      excecoes: ["Lojista entre os 20 maiores: o Comitê leva ao Otávio.", "Lojista com bloqueio cautelar do Risco: só a Lívia libera."],
      fontes: [{ fonte: "gmail", rotulo: "Gmail · fio de 5 e-mails", texto: "Sofia para Lívia: \"Libero o repasse da Casa Pirá ou seguro mais um dia?\" Lívia: \"Segura até o Tiago olhar.\"", data: "6 nov" }, { fonte: "agenda", rotulo: "Agenda · reunião", texto: "Comitê de repasses, toda terça às 10h, com Marina, Sofia, Lívia e Caio.", data: "recorrente" }, { fonte: "drive", rotulo: "Drive · documento com comentário", texto: "\"Política de repasse\" (2024) não fala de retenção. Comentário da Marina: \"Precisamos escrever isso.\"", data: "set" }] },
    { id: "conciliacao", nome: "Conciliação de repasse", porMes: 22, frequencia: "toda manhã, 22 por mês", time: "operacoes", quem: "pedro", aprova: "sofia", certeza: "alta", fonte: "drive", noMapa: true,
      passos: ["Pedro baixa o extrato do Banco Aurora às 8h.", "Pedro cruza o extrato com a planilha de repasses do dia, linha a linha: cerca de 50 minutos.", "Diferença até R$ 5 mil: Pedro corrige e anota na planilha.", "Diferença acima de R$ 5 mil: Pedro leva para a Sofia, que decide se segura o repasse.", "Sofia leva as diferenças abertas para o Daily de Operações, às 9h15."],
      decide: "Sofia, nas diferenças acima de R$ 5 mil.",
      excecoes: ["Extrato do banco atrasado: Pedro espera até as 10h e avisa o Caio.", "Diferença no mesmo lojista dois dias seguidos: vai para a Lívia, no Risco."],
      fontes: [{ fonte: "drive", rotulo: "Drive · planilha com comentário", texto: "\"Conciliação diária\": editada todo dia útil entre 8h e 9h. Comentário da Sofia: \"Acima de 5 mil, me chama antes de corrigir.\"", data: "19 nov" }, { fonte: "gmail", rotulo: "Gmail · fio de 3 e-mails", texto: "Pedro para Sofia: \"Diferença de R$ 1.240 no lote 3, sigo investigando.\"", data: "19 nov" }, { fonte: "agenda", rotulo: "Agenda · reunião", texto: "Daily de Operações, 9h15: as diferenças da conciliação são o primeiro assunto.", data: "todo dia útil" }] },
    { id: "chargeback", nome: "Análise de chargeback", porMes: 34, frequencia: "34 por mês", time: "risco", quem: "tiago", aprova: "livia", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["O portador abre a disputa e o aviso chega por e-mail ao Risco.", "Tiago pede ao lojista as provas da venda, com prazo interno de 5 dias.", "Tiago monta a defesa e responde à bandeira.", "Disputa acima de R$ 10 mil ou terceira do lojista no mês: vai para a Lívia.", "Lívia decide se defende, aceita ou pede bloqueio cautelar."],
      decide: "Tiago, até R$ 10 mil. Lívia, acima disso ou na terceira disputa do lojista no mês.",
      excecoes: ["Lojista com 3 disputas no mês: bloqueio cautelar, decidido pela Lívia.", "Prazo da bandeira vencendo em 2 dias: Tiago responde com o que tem."],
      fontes: [{ fonte: "gmail", rotulo: "Gmail · fio de 3 e-mails", texto: "Tiago para Lívia: \"3ª disputa da Loja Ventana no mês. Bloqueio cautelar?\"", data: "8 nov" }, { fonte: "drive", rotulo: "Drive · planilha com comentário", texto: "\"Disputas 2026\": 34 em outubro, 4 perderam o prazo. Comentário da Lívia: \"Precisamos de um alerta.\"", data: "31 out" }, { fonte: "agenda", rotulo: "Agenda · reunião", texto: "Risco semanal, quinta às 14h: bloqueios e limites de chargeback.", data: "recorrente" }] },
    { id: "primeira-resposta", nome: "Primeira resposta ao lojista", porMes: 60, frequencia: "60 conversas por mês", time: "atendimento", quem: "rafael", aprova: "rafael", certeza: "média", fonte: "gmail", noMapa: true,
      passos: ["O lojista escreve no chat ou por e-mail.", "Nina ou Igor responde o que já sabe: prazo de repasse, status de antecipação.", "Sem resposta pronta, o caso sobe para o Rafael.", "Atraso de repasse: Rafael pergunta à Sofia e volta ao lojista.", "Mediana da primeira resposta hoje: 2h26. A página de ajuda promete 1 hora."],
      decide: "Rafael, o que dizer ao lojista em atraso. A promessa de 1 hora ninguém revisou desde 2024.",
      excecoes: ["Lojista entre os 20 maiores: Lucas responde junto.", "Incidente de pagamento aberto: Rafael usa o texto que a Bianca manda."],
      fontes: [{ fonte: "site", rotulo: "Site · página de ajuda", texto: "\"Respondemos em até 1 hora.\"", data: "desde 2024" }, { fonte: "gmail", rotulo: "Gmail · fio de 6 e-mails", texto: "Rafael para Sofia: \"Lojista reclamando do repasse de sexta, o que eu digo?\"", data: "18 nov" }, { fonte: "agenda", rotulo: "Agenda · reunião", texto: "Daily de Operações: os atrasos de repasse do dia, com Rafael e Sofia.", data: "todo dia útil" }] },
    { id: "incidente", nome: "Incidente de pagamento", porMes: 2, frequencia: "2 por mês", time: "engenharia", quem: "bianca", aprova: "marina", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["André vê o alerta do gateway.", "Bianca avalia o impacto.", "Se a liquidação para, chama a Marina."],
      decide: "Bianca, se vira crise. Marina, se para a liquidação.", excecoes: [],
      fontes: [F("gmail", "Bianca para Marina: \"Gateway fora há 12 minutos, 340 transações na fila.\"", "3 nov")] },
    { id: "taxa-especial", nome: "Taxa especial para lojista", porMes: 6, frequencia: "6 por mês", time: "comercial", quem: "lucas", aprova: "paula", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["Lucas monta a proposta com a taxa que o lojista pediu.", "Paula aprova ou contrapropõe por e-mail."], decide: "Paula.", excecoes: [],
      fontes: [F("gmail", "Lucas para Paula: \"Taxa de 1,9% para a Rede Sol, volume de R$ 4 milhões.\"", "10 nov")] },
    { id: "admissao", nome: "Admissão", porMes: 2, frequencia: "2 por mês", time: "rh", quem: "helena", aprova: "otavio", certeza: "alta", fonte: "gmail", noMapa: true,
      passos: ["Helena conduz a seleção e manda a proposta ao Otávio.", "Otávio aprova e Helena faz a admissão."], decide: "Otávio.", excecoes: [],
      fontes: [F("gmail", "Helena para Otávio: \"Proposta para a vaga de analista de risco, ok?\"", "4 nov")] },
    { id: "troca-conta", nome: "Troca de conta de recebimento", porMes: 7, frequencia: "7 por mês", time: "operacoes", quem: "sofia", aprova: null, certeza: "média", fonte: "gmail", noMapa: true, semDono: true,
      passos: ["O lojista pede a troca pelo chat do Atendimento.", "Nina ou Igor pede o comprovante da nova conta.", "Até outubro, o gerente de Operações conferia o titular e aprovava.", "Desde que ele saiu, o pedido para na Sofia ou volta para o Atendimento sem resposta."],
      decide: "Ninguém, desde que o gerente de Operações saiu, em outubro.",
      excecoes: ["Conta nova em outro CNPJ: é o caminho preferido de fraude e hoje ninguém confere.", "Lojista com pressa: o Atendimento trocou sem aprovação 2 vezes em novembro."],
      fontes: [{ fonte: "gmail", rotulo: "Gmail · e-mail sem resposta", texto: "Rafael para Sofia: \"Quem aprova troca de conta agora?\"", data: "21 out" }, { fonte: "drive", rotulo: "Drive · procedimento com comentário", texto: "\"Troca de conta\": última edição em setembro, ainda diz que quem aprova é o gerente que saiu. Comentário do Rafael: \"Quem assina agora?\"", data: "set" }, { fonte: "agenda", rotulo: "Agenda · reunião", texto: "Revisão de incidentes de 8 nov: as duas trocas feitas sem aprovação entraram na pauta.", data: "8 nov" }] },
    { id: "fechamento-mes", nome: "Fechamento do mês com a contabilidade", porMes: 1, frequencia: "todo dia 5", time: "tesouraria", quem: "caio", aprova: "paula", certeza: "alta", fonte: "gmail", noMapa: false,
      passos: ["Débora fecha o caixa do mês.", "Caio manda para a contabilidade.", "Paula confere o balancete."], decide: "Paula.", excecoes: [],
      fontes: [F("gmail", "Caio para a contabilidade: \"Segue o fechamento de outubro.\"", "5 nov")] },
    { id: "caixa-diario", nome: "Fechamento de caixa diário", porMes: 22, frequencia: "todo dia útil", time: "tesouraria", quem: "debora", aprova: "caio", certeza: "alta", fonte: "drive", noMapa: false,
      passos: ["Débora confere entradas e saídas do dia.", "Caio valida e decide os pagamentos do dia seguinte."], decide: "Caio.", excecoes: [],
      fontes: [F("drive", "Planilha \"Caixa 2026\", aba do dia", "nov")] },
    // reveladas por integrações
    { id: "estorno", nome: "Estorno ao portador", porMes: 15, frequencia: "15 por mês", time: "atendimento", quem: "nina", aprova: "tiago", certeza: "média", fonte: "intercom", noMapa: true,
      passos: ["O portador pede estorno no chat e Nina abre o caso.", "Tiago confere a venda e decide o estorno."], decide: "Tiago.", excecoes: [],
      fontes: [F("intercom", "Conversa #48211: portador pede estorno, Nina encaminha ao Risco", "17 nov")] },
    { id: "proposta", nome: "Proposta comercial padrão", porMes: 14, frequencia: "14 por mês", time: "comercial", quem: "renan", aprova: "lucas", certeza: "alta", fonte: "tldv", noMapa: true,
      passos: ["Renan ou Clara negocia com o lojista e manda a proposta.", "Lucas aprova. Fora do padrão, vai para a Paula."], decide: "Lucas.", excecoes: ["Fora do padrão: Paula."],
      fontes: [F("tldv", "Gravação \"Lume x Rede Sol\": Lucas decide a taxa no fim da reunião", "10 nov")] },
    { id: "bloqueio", nome: "Bloqueio cautelar de lojista", porMes: 4, frequencia: "4 por mês", time: "risco", quem: "livia", aprova: "livia", certeza: "alta", fonte: "slack", noMapa: true,
      passos: ["Sofia ou Tiago aponta o lojista suspeito no canal #risco.", "Lívia decide o bloqueio e avisa o Rafael."], decide: "Lívia.", excecoes: [],
      fontes: [F("slack", "#risco: \"Bloqueando a Loja Ventana até a análise\"", "8 nov")] },
    { id: "deploy", nome: "Publicação do app do lojista", porMes: 8, frequencia: "8 por mês", time: "engenharia", quem: "yuri", aprova: "bianca", certeza: "alta", fonte: "github", noMapa: true,
      passos: ["Yuri abre a revisão do app do lojista.", "Bianca aprova e a publicação sai na quinta."], decide: "Bianca.", excecoes: [],
      fontes: [F("github", "Revisão #812 aprovada por Bianca", "20 nov")] },
    { id: "liquidacao", nome: "Confirmação de liquidação com o banco", porMes: 20, frequencia: "todo dia útil", time: "tesouraria", quem: "caio", aprova: "caio", certeza: "média", fonte: "whatsapp", noMapa: true,
      passos: ["O Banco Aurora manda a janela e o extrato do dia no grupo do WhatsApp.", "Pedro confere o extrato e Caio confirma a liquidação."], decide: "Caio, no grupo do WhatsApp.", excecoes: [],
      fontes: [F("whatsapp", "Grupo \"Lume liquidação\": \"Janela de hoje até 15h\"", "21 nov")] },
  ];

  D.reunioes = [
    { id: "comite-repasses", tipo: "decide", nome: "Comitê de repasses", quando: "Toda terça, 10h", pessoas: ["marina", "sofia", "livia", "caio"], decide: ["Repasses retidos acima de R$ 200 mil", "Lojista que volta a receber"], escalaPara: "Otávio, quando o lojista é dos 20 maiores", fonte: "agenda",
      fontes: [F("agenda", "Evento recorrente desde março, 4 convidados", "recorrente"), F("gmail", "Ata enviada por Sofia toda terça à tarde", "terças")] },
    { id: "daily-operacoes", tipo: "alinha", nome: "Daily de Operações", quando: "Todo dia útil, 9h15", pessoas: ["sofia", "pedro", "rafael"], decide: ["Diferenças da conciliação", "Quem avisa os lojistas em atraso"], escalaPara: "Marina, quando o atraso passa de 1 dia", fonte: "agenda",
      fontes: [F("agenda", "Evento diário, 15 minutos", "recorrente")] },
    { id: "risco-semanal", tipo: "decide", nome: "Risco semanal", quando: "Toda quinta, 14h", pessoas: ["livia", "tiago", "marina"], decide: ["Bloqueios cautelares", "Limites de chargeback"], escalaPara: "Marina, em bloqueio de lojista grande", fonte: "agenda",
      fontes: [F("agenda", "Evento recorrente, 3 convidados", "recorrente")] },
    { id: "fechamento-caixa", tipo: "decide", nome: "Fechamento de caixa", quando: "Todo dia útil, 17h", pessoas: ["caio", "debora"], decide: ["Pagamentos do dia seguinte"], escalaPara: "Paula, se o caixa fica negativo", fonte: "agenda",
      fontes: [F("agenda", "Evento diário, 2 convidados", "recorrente")] },
    { id: "incidentes", tipo: "alinha", nome: "Revisão de incidentes", quando: "Toda sexta, 16h", pessoas: ["bianca", "andre", "sofia", "rafael", "marina"], decide: ["O que avisar aos lojistas", "Correções da semana"], escalaPara: "Otávio, se houve perda", fonte: "agenda",
      fontes: [F("agenda", "Evento recorrente, 5 convidados", "recorrente")] },
    { id: "pipeline", tipo: "decide", nome: "Pipeline comercial", quando: "Toda segunda, 11h", pessoas: ["lucas", "renan", "paula"], decide: ["Taxas fora do padrão"], escalaPara: "Otávio, acima de R$ 10 milhões por mês", fonte: "agenda",
      fontes: [F("agenda", "Evento recorrente, 3 convidados", "recorrente")] },
    { id: "diretoria-mensal", tipo: "decide", nome: "Diretoria mensal", quando: "Primeira segunda do mês", pessoas: ["otavio", "marina", "paula"], decide: ["Orçamento", "Contratações"], escalaPara: "Conselho, quando muda o orçamento", fonte: "agenda",
      fontes: [F("agenda", "Evento recorrente, 3 convidados", "recorrente")] },
  ];

  D.base = { pessoas: 58, times: 8, processos: 41, reunioes: 11 };
  D.reunioesAgenda = 96; // 96 recorrentes na agenda: "reunioes" (11 ou 14) decidem, o resto alinha

  const I = (o) => o;
  D.integracoes = [
    I({ id: "intercom", ganho: 7, ganhoMicrosoft: 7, motivoGanho: "é onde o lojista fala com a Lume", motivoGanhoMicrosoft: "é onde o lojista fala com a Lume", acrescentaria: "o tempo real de resposta ao lojista", curto: "312 e-mails", adicionou: "+2 pessoas, tempo real de resposta", nome: "Intercom", sigla: "In", achada: true, evidencia: "Vi o Intercom citado em 312 e-mails.", emails: 312,
      pede: "Conversas com lojistas, quem responde e em quanto tempo.", naoPede: "Não leio dados de cartão.",
      acrescenta: { pessoas: ["nina", "igor"], escalas: ["nina>rafael", "igor>rafael"], processos: ["estorno"], contagem: { pessoas: 2, processos: 3, reunioes: 0 } },
      feed: "Com o Intercom: 2 pessoas no Atendimento e o tempo real de primeira resposta, 2h26." }),
    I({ id: "tldv", ganho: 6, ganhoMicrosoft: 6, motivoGanho: "as reuniões que decidem estão gravadas lá", motivoGanhoMicrosoft: "as reuniões que decidem estão gravadas lá", acrescentaria: "o que cada reunião decide", curto: "148 e-mails", adicionou: "+1 pessoa, quem decide em 9 reuniões", nome: "tl;dv", sigla: "tl", achada: true, evidencia: "Vi o tl;dv citado em 148 e-mails.", emails: 148,
      pede: "Gravações e transcrições das reuniões em que você está.", naoPede: "Não leio reuniões particulares.",
      acrescenta: { pessoas: ["clara"], escalas: ["clara>lucas", "paula>otavio"], processos: ["proposta"], contagem: { pessoas: 1, processos: 3, reunioes: 3 } },
      feed: "Com o tl;dv: 9 reuniões recorrentes, quem decide em cada uma." }),
    I({ id: "whatsapp", ganho: 8, ganhoMicrosoft: 8, motivoGanho: "a operação combina muita coisa por lá, longe do e-mail", motivoGanhoMicrosoft: "a operação combina muita coisa por lá, longe do e-mail", acrescentaria: "o que nunca chega ao e-mail", curto: "640 e-mails", adicionou: "+3 grupos, 2 decisões por dia", nome: "WhatsApp", sigla: "Wa", achada: true, evidencia: "Vi o WhatsApp citado em 640 e-mails.", emails: 640,
      como: "Muita coisa da operação passa pelo WhatsApp. No app do Mac, com a sua permissão, eu leio só as conversas que você marcar. Ou envie a conversa exportada de um grupo.",
      conceito: true, confianca: "Nada sai do seu Mac sem você ver.",
      grupos: [{ nome: "Operação · repasses", pessoas: 9, marcado: true }, { nome: "Tesouraria e contabilidade", pessoas: 5, marcado: true }, { nome: "Lume liquidação · Banco Aurora", pessoas: 4, marcado: false }],
      pede: "Só as conversas que você marcar no app do Mac.", naoPede: "Não leio nenhuma conversa que você não marcar.",
      formas: ["Marcar conversas no app do Mac", "Enviar conversa exportada"], linha: "pelo app do Mac, só o que você marcar",
      acrescenta: { pessoas: [], escalas: ["banco>sofia"], processos: ["liquidacao"], contagem: { pessoas: 0, processos: 2, reunioes: 0 } },
      feed: "Com o WhatsApp: 3 grupos de operação, 2 decisões por dia que não aparecem no e-mail." }),
    I({ id: "slack", ganho: 12, ganhoMicrosoft: 3, motivoGanho: "as decisões do dia a dia passam por lá", motivoGanhoMicrosoft: "o Teams já mostra quase tudo do dia a dia", acrescentaria: "onde as decisões acontecem no dia a dia", curto: "2.100 e-mails", adicionou: "+1 caminho de escala", nome: "Slack", sigla: "Sl", achada: true, evidencia: "Vi o Slack citado em 2.100 e-mails.", emails: 2100,
      pede: "Canais públicos dos times.", naoPede: "Não leio mensagens diretas.",
      acrescenta: { pessoas: [], escalas: ["sofia>livia"], processos: ["bloqueio"], contagem: { pessoas: 0, processos: 2, reunioes: 1 } },
      feed: "Com o Slack: um caminho de escala que não passa pelo e-mail, de Operações para o Risco." }),
    I({ id: "notion", ganho: 9, ganhoMicrosoft: 9, motivoGanho: "os procedimentos escritos estão lá, e vários envelheceram", motivoGanhoMicrosoft: "os procedimentos escritos estão lá, e vários envelheceram", acrescentaria: "documentação desatualizada: comparo o escrito com o feito", curto: "420 e-mails", adicionou: "+4 processos escritos", nome: "Notion", sigla: "No", achada: true, evidencia: "Vi o Notion citado em 420 e-mails.", emails: 420,
      pede: "Páginas de processo e procedimentos.", naoPede: "Não leio páginas privadas.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 4, reunioes: 0 } },
      feed: "Com o Notion: 4 processos escritos, 2 diferentes do que se faz hoje." }),
    I({ id: "github", ganho: 5, ganhoMicrosoft: 5, motivoGanho: "a Engenharia revisa e publica tudo por lá", motivoGanhoMicrosoft: "a Engenharia revisa e publica tudo por lá", acrescentaria: "como o código é revisado e onde trava", curto: "530 e-mails", adicionou: "+2 pessoas na Engenharia", nome: "GitHub", sigla: "Gh", achada: true, evidencia: "Vi o GitHub citado em 530 e-mails.", emails: 530,
      pede: "Quem revisa e publica o quê.", naoPede: "Não leio o código.",
      acrescenta: { pessoas: ["marcos", "yuri"], escalas: ["marcos>andre", "yuri>bianca"], processos: ["deploy"], contagem: { pessoas: 2, processos: 2, reunioes: 0 } },
      feed: "Com o GitHub: quem revisa e quem publica na Engenharia, 2 pessoas a mais." }),
    I({ id: "zendesk", ganho: 2, ganhoMicrosoft: 2, motivoGanho: "o histórico antigo do atendimento", motivoGanhoMicrosoft: "o histórico antigo do atendimento", acrescentaria: "o histórico antigo do atendimento", curto: "", adicionou: "+tickets até 2024", nome: "Zendesk", sigla: "Zd", achada: false, evidencia: "Não vi no seu e-mail.", emails: 0,
      pede: "Tickets antigos de atendimento.", naoPede: "Não leio dados de cartão.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 1, reunioes: 0 } },
      feed: "Com o Zendesk: tickets até 2024, de antes do Intercom. 1 processo antigo." }),
    I({ id: "granola", ganho: 3, ganhoMicrosoft: 3, motivoGanho: "as notas da Diretoria ficam lá", motivoGanhoMicrosoft: "as notas da Diretoria ficam lá", acrescentaria: "as decisões nas suas notas de reunião", curto: "", adicionou: "+notas da Diretoria", nome: "Granola", sigla: "Gr", achada: false, evidencia: "Não vi no seu e-mail.", emails: 0,
      pede: "Suas notas de reunião.", naoPede: "Não leio notas que você não compartilhar.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 0, reunioes: 1 } },
      feed: "Com o Granola: as notas da Diretoria mensal, com as decisões." }),
    I({ id: "cloudhumans", ganho: 2, ganhoMicrosoft: 2, motivoGanho: "o robô do atendimento", motivoGanhoMicrosoft: "o robô do atendimento", acrescentaria: "o que o robô resolve sem ninguém", curto: "", adicionou: "+o que o robô resolve", nome: "CloudHumans", sigla: "Ch", achada: false, evidencia: "Não vi no seu e-mail.", emails: 0,
      pede: "O que o robô de atendimento resolve e o que repassa.", naoPede: "Não leio dados de cartão.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 1, reunioes: 0 } },
      feed: "Com a CloudHumans: o que o robô resolve sozinho e o que passa para o Rafael." }),
    I({ id: "revenuecat", ganho: 1, ganhoMicrosoft: 1, motivoGanho: "as assinaturas do app", motivoGanhoMicrosoft: "as assinaturas do app", acrescentaria: "quem cancela e por quê", curto: "", adicionou: "+assinaturas do app", nome: "RevenueCat", sigla: "Rc", achada: false, evidencia: "Não vi no seu e-mail.", emails: 0,
      pede: "Assinaturas do app do lojista.", naoPede: "Não leio dados de cartão.",
      acrescenta: { pessoas: [], escalas: [], processos: [], contagem: { pessoas: 0, processos: 1, reunioes: 0 } },
      feed: "Com o RevenueCat: assinaturas do app do lojista e quem trata cancelamento." }),
  ];

  D.final = { pessoas: 61, times: 8, processos: 47, reunioes: 14, buracos: 9 };

  D.buracos = [
    { id: "antecipacao", titulo: "Antecipação sob demanda espera uma pessoa só", porMes: 23, frequencia: "23 por mês", intensidade: 0.92, processo: "antecipacao", sobreVoce: true,
      dor: "Mediana de 1,8 dia parado. R$ 1,2 milhão em pedidos esperando por mês.", numeros: { diasParado: 1.8, reaisEsperando: 1200000 },
      elogio: "Tudo passa por você porque confiam em você.", proposta: "Dizer até que valor a Tesouraria aprova sozinha." },
    { id: "primeira-resposta", titulo: "Promessa pública de 1 hora, prática de 2h26", porMes: 55, frequencia: "55 de 60 conversas", intensidade: 0.62, processo: "primeira-resposta",
      dor: "55 de 60 conversas passam de 1 hora. Mediana de 2h26.", numeros: { conversas: 55, de: 60, mediana: "2h26" }, proposta: "Mudar a promessa ou a escala do Atendimento." },
    { id: "troca-conta", titulo: "Troca de conta de recebimento ficou sem dono", porMes: 7, frequencia: "7 por mês", intensidade: 0.85, processo: "troca-conta",
      dor: "Alto risco de fraude. Ninguém aprova desde que o gerente saiu, em outubro.", numeros: {}, proposta: "Dar um dono e uma conferência de titular." },
    { id: "repasse-retido", titulo: "Repasse retido: três pessoas decidem de três jeitos", porMes: 9, frequencia: "9 por mês", intensidade: 0.58, processo: "repasse-retido",
      dor: "O mesmo caso tem resposta diferente conforme quem pega.", numeros: {}, proposta: "Escrever um critério único para liberar ou segurar." },
    { id: "conciliacao", titulo: "Conciliação de repasse feita à mão toda manhã", porMes: 22, frequencia: "22 por mês", intensidade: 0.4, processo: "conciliacao",
      dor: "50 minutos por dia, toda manhã.", numeros: { minutos: 50 }, proposta: "Automatizar o cruzamento e deixar só as diferenças." },
    { id: "taxa-especial", titulo: "Taxa especial espera a Paula por e-mail", porMes: 6, frequencia: "6 por mês", intensidade: 0.3, processo: "taxa-especial",
      dor: "3 dias em média até a resposta.", numeros: {}, proposta: "Faixa de taxa que o Lucas aprova sozinho." },
    { id: "chargeback", titulo: "Chargeback sem prazo de análise", porMes: 34, frequencia: "34 por mês", intensidade: 0.26, processo: "chargeback",
      dor: "4 disputas perderam o prazo do portador em outubro.", numeros: {}, proposta: "Prazo interno e alerta antes do vencimento." },
    { id: "incidente", titulo: "Aviso de incidente ao lojista sem modelo", porMes: 2, frequencia: "2 por mês", intensidade: 0.34, processo: "incidente",
      dor: "Cada aviso é escrito do zero, no meio da crise.", numeros: {}, proposta: "Um modelo de aviso pronto." },
    { id: "admissao", titulo: "Admissão sem lista de acessos", porMes: 2, frequencia: "2 por mês", intensidade: 0.18, processo: "admissao",
      dor: "Pessoa nova espera 2 dias por acessos.", numeros: {}, proposta: "Lista de acessos por cargo." },
    { id: "perguntas-repetidas", titulo: "As mesmas perguntas chegam em você toda semana", porMes: 14, frequencia: "14 por mês", intensidade: 0.5, processo: "antecipacao",
      dor: "14 perguntas por mês; 11 têm resposta na planilha. Cada uma te interrompe.", numeros: { perguntas: 14, naPlanilha: 11 },
      proposta: "Deixar o cérebro responder o que já está na planilha, com a origem ao lado." },
  ];
  // o número de buracos sai da lista (ninguém escreve à mão); atribuir não tem efeito
  Object.defineProperty(D.final, "buracos", { get: () => D.buracos.length, set: () => {}, enumerable: true });

  // as 23 antecipações do mês por faixa de valor (somam 23; 19 ficam abaixo de R$ 50 mil)
  D.antecipacoesPorFaixa = [
    { faixa: "abaixo de R$ 5 mil", quantos: 11 },
    { faixa: "de R$ 5 mil a R$ 50 mil", quantos: 8 },
    { faixa: "acima de R$ 50 mil", quantos: 4 },
  ];

  D.pergunta = {
    buraco: "antecipacao",
    evidencia: ["23 pedidos por mês", "Todos esperam a Marina", "19 de 23 abaixo de R$ 50 mil", "Nenhum recusado em 6 meses"],
    pergunta: "Abaixo de que valor a Tesouraria pode aprovar sozinha?",
    porque: "19 dos 23 pedidos do mês ficam abaixo de R$ 50 mil e nenhum foi recusado. É onde está a espera.",
    resposta: "Até R$ 50 mil a Tesouraria aprova. Acima disso, eu.",
    aprofunda: "E quando o lojista teve chargeback nos últimos 90 dias?",
    resposta2: "Aí sempre passa por mim, qualquer valor.",
    regra: ["Até R$ 50 mil, a Tesouraria aprova sozinha.", "Acima de R$ 50 mil, a Marina aprova.", "Lojista com chargeback nos últimos 90 dias: sempre a Marina, qualquer valor."],
    atualizados: ["antecipacao", "repasse-retido", "primeira-resposta"],
    espera: { antes: "1,8 dia", depois: "2 horas" },
  };

  D.skill = { nome: "Antecipação sob demanda", versao: "v1", aprovadaPor: "Marina", quando: "hoje",
    regra: D.pergunta.regra, destinos: [{ id: "claude", nome: "Claude" }, { id: "chatgpt", nome: "ChatGPT" }, { id: "grok", nome: "Grok" }, { id: "slack", nome: "Slack" }] };

  D.uso = { semana: 12, semChamar: 10, paramNaExcecao: 2,
    conversas: [{ quem: "Débora Lins", pergunta: "Pedido de antecipação da Loja Ventana, R$ 38 mil. Posso aprovar?", resposta: "Pode. Até R$ 50 mil a Tesouraria aprova. Antes, confira se a Loja Ventana teve chargeback nos últimos 90 dias: se teve, passa pela Marina." }] };

  D.areas = ["Operações", "Tesouraria", "Engenharia", "RH", "Diretoria"];
  D.guardrailsPadrao = { "Operações": D.areas.slice(), "Tesouraria": D.areas.slice(), "Engenharia": D.areas.slice(), "RH": D.areas.slice(), "Diretoria": D.areas.slice() };

  D.depois = {
    observando: { titulo: "Aprender observando", fontes: ["Computador", "Slack", "Agenda", "Docs e comentários"] },
    novo: "Vi a conciliação de repasse ser feita 3 vezes do mesmo jeito. Virar skill?",
    melhoria: "Juntar as etapas 3 e 4 economiza cerca de 20 minutos por caso.",
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
    bem: ["O fechamento de caixa sai todo dia útil, sem falhar, há 6 meses.", "O Risco responde todo chargeback dentro do prazo quando o caso chega no mesmo dia.", "A conciliação nunca atrasou um repasse."],
    andamento: [{ tipo: "bem", texto: "Risco: 34 análises por mês, quase todas no mesmo dia." }, { tipo: "trava", texto: "Tesouraria: 23 antecipações por mês esperam 1,8 dia." }],
    proximo: "Com Slack e Notion eu passo a ver decisões do dia a dia, documentação desatualizada e mais gargalos.",
    perguntas: [{ texto: "Quem aprova troca de conta desde outubro?", ir: "buracos" }, { texto: "A página de ajuda ainda promete 1 hora", processo: "primeira-resposta" }],
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
