/* atos-a.js · o mapa do cérebro (SK.mapa) e os atos 0 a 3 (Builder A). */
(function () {
  const SK = window.SK, D = SK.dados, el = SK.el;
  const NS = "http://www.w3.org/2000/svg";

  /* =========================================================================================
   * SK.mapa.criar(container, { interativo, aoEscolher(tipo, id), ocultar:[timeIds] })
   *   -> { revelar(chaves, animar=true), tudo(conectadas, animar), chaves(), ocultar(ids), destruir() }
   * Layout desenhado: grade 3x3, a Marina no centro, um time por célula, gente de fora no anel da borda.
   * As pessoas de cada time ficam do lado mais perto da Marina. Nada de física: posições calculadas, sem tremor.
   * ========================================================================================= */
  const ORDEM = {
    diretoria: ["otavio", "paula", "douglas"], tesouraria: ["debora", "caio"], risco: ["livia", "tiago"], operacoes: ["sofia", "pedro"],
    atendimento: ["nina", "rafael", "igor"], engenharia: ["andre", "bianca", "marcos", "yuri"], comercial: ["lucas", "renan", "clara"], rh: ["helena"],
  };
  const medidor = document.createElement("canvas").getContext("2d");
  function largura(txt, px, peso) { medidor.font = (peso || 600) + " " + px + "px 'Inter Tight', sans-serif"; return medidor.measureText(txt).width; }
  const s = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); return e; };
  const txt = (attrs, t) => { const e = s("text", attrs); e.textContent = t; return e; };

  function chavesDoGoogle() {
    const k = new Set(["pessoa:marina"]);
    D.leitura.feed.forEach((f) => f.revela.forEach((x) => k.add(x)));
    return k;
  }
  function chavesDe(idInt) {
    const it = D.integracoes.find((x) => x.id === idInt);
    if (!it) return [];
    return [...it.acrescenta.pessoas.map((p) => "pessoa:" + p), ...it.acrescenta.escalas.map((e) => "escala:" + e), ...it.acrescenta.processos.map((p) => "proc:" + p)];
  }
  function chavesCompletas(conectadas) {
    const k = chavesDoGoogle();
    (conectadas || []).forEach((c) => chavesDe(c).forEach((x) => k.add(x)));
    return k;
  }

  function criarMapa(container, op) {
    op = op || {};
    const vis = new Set(["pessoa:marina"]);
    let ocultos = new Set(op.ocultar || []);
    const svg = s("svg", { class: "mapa-svg", role: op.interativo ? "group" : "img", "aria-label": "Mapa da Lume: pessoas, times e quem escala para quem" });
    const defs = s("defs", {});
    defs.innerHTML = '<filter id="m-brilho" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<marker id="m-ponto" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5"><circle cx="5" cy="5" r="3.2" fill="rgba(242,241,247,.75)"/></marker><marker id="m-seta" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1.5L8.5 5 1 8.5" fill="none" stroke="rgba(236,233,245,.7)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>';
    const camAnel = s("g", { class: "m-cam-anel" }), camPlacas = s("g", {}), camArestas = s("g", { class: "m-cam-arestas" }), camChips = s("g", {}), camNos = s("g", {});
    svg.append(defs, camAnel, camPlacas, camArestas, camChips, camNos);
    container.append(svg);
    const els = new Map(); // chave -> { g, tipo, cur, alvo }
    let fixo = null; // time em foco (clicado)
    let W = 0, H = 0, compacto = false, anim = null;

    function visivel(chave) {
      if (!vis.has(chave)) return false;
      const [tipo, id] = chave.split(/:(.+)/);
      if (tipo === "pessoa") { if (id === "marina") return true; const p = D.pessoas.find((x) => x.id === id); return !!p && !ocultos.has(p.time) && vis.has("time:" + p.time); }
      if (tipo === "time") return !ocultos.has(id);
      if (tipo === "ext") return true;
      if (tipo === "proc") { const p = D.processos.find((x) => x.id === id); return !!p && p.noMapa && !ocultos.has(p.time) && vis.has("time:" + p.time); }
      if (tipo === "escala") { const [a, b] = id.split(">"); return noVisivel(a) && noVisivel(b); }
      return false;
    }
    function noVisivel(id) { return D.externos.some((x) => x.id === id) ? visivel("ext:" + id) && vis.has("ext:" + id) : visivel("pessoa:" + id); }

    /* ---------- geometria ---------- */
    function layout() {
      const g = { nos: {}, times: {}, chips: {}, ext: {}, anel: null };
      const pad = compacto ? 38 : 44, ri = compacto ? 14 : 20;
      const cw = (W - 2 * pad) / 3, ch = (H - 2 * pad) / 3;
      const col = { l: 0, c: 1, r: 2 }, lin = { t: 0, m: 1, b: 2 };
      const cx = W / 2, cy = H / 2;
      g.nos.marina = { x: cx, y: cy, r: compacto ? 18 : 24 };
      g.raio = compacto ? 11 : 15;
      for (const t of D.times) {
        if (!visivel("time:" + t.id)) continue;
        const c = t.celula, x0 = pad + col[c[1]] * cw, y0 = pad + lin[c[0]] * ch, ccx = x0 + cw / 2, ccy = y0 + ch / 2;
        // anatomia igual em toda célula: nome e "N pessoas"; até 3 pessoas e "+N"; "Processos" e os chips
        const pessoas = (ORDEM[t.id] || []).filter((id) => visivel("pessoa:" + id)).slice(0, 3);
        const maisN = t.pessoas - pessoas.length - (t.id === "diretoria" ? 1 : 0);
        const procs = D.processos.filter((p) => p.time === t.id && visivel("proc:" + p.id));
        const r = g.raio;
        const slots = pessoas.length + (maisN > 0 ? 1 : 0);
        const sp = compacto ? Math.min(30, (cw - 8) / Math.max(1, slots)) : Math.max(46, Math.min(62, (cw - 16) / Math.max(1, slots)));
        const hLab = compacto ? 16 : 34; const hPes = compacto ? 2 * r + 2 : 2 * r + 20;
        const fazChip = (p) => {
          const largMax = Math.min(cw - 12, 300);
          let rot = p.nome + (p.semDono ? " · sem dono" : " · " + p.porMes + " por mês");
          if (largura(rot, 11.5) + 22 > largMax) rot = p.nome;
          while (largura(rot, 11.5) + 22 > largMax && rot.length > 6) rot = rot.slice(0, -2).trimEnd() + "…";
          return { id: p.id, rot, w: Math.ceil(largura(rot, 11.5) + 22), semDono: !!p.semDono };
        };
        const gap = compacto ? 6 : 7, rotP = 17;
        const altura = (n) => { const bl = [hLab, pessoas.length ? hPes : 0, n ? rotP + n * 24 + (n - 1) * 6 : 0].filter((x) => x > 0); return bl.reduce((x, y) => x + y, 0) + gap * (bl.length - 1) + (compacto ? 12 : 16); };
        let nChips = compacto ? 0 : Math.min(2, procs.length);
        while (nChips > 0 && altura(nChips) > ch - 18) nChips--;
        let chipsT;
        if (nChips < procs.length && nChips > 1) {
          chipsT = procs.slice(0, nChips - 1).map(fazChip);
          const resto = procs.length - chipsT.length;
          const rr = "+" + resto + (resto > 1 ? " processos" : " processo"); chipsT.push({ id: "mais-" + t.id, rot: rr, w: Math.ceil(largura(rr, 11.5) + 22), mais: true, time: t.id });
        } else chipsT = procs.slice(0, nChips).map(fazChip);
        const hChips = chipsT.length ? rotP + chipsT.length * 24 + (chipsT.length - 1) * 6 : 0;
        const ordem = ["lab", "pes", "chips"]; // mesma anatomia em toda célula: nome, pessoas, processos
        const blocos = { lab: hLab, pes: pessoas.length ? hPes : 0, chips: hChips };
        const usados = ordem.filter((b) => blocos[b] > 0);
        const total = usados.reduce((a, b) => a + blocos[b], 0) + gap * (usados.length - 1);
        let y = ccy - total / 2;
        const pos = {};
        for (const b of usados) { pos[b] = y; y += blocos[b] + gap; }
        const labW = Math.max(largura(t.nome, compacto ? 12 : 14, 600), compacto ? 0 : largura(t.pessoas + " pessoas", 12, 500));
        const pesW = slots ? (slots - 1) * sp + (compacto ? 2 * r : Math.max(2 * r, 44)) : 0;
        const chipsW = Math.max(0, ...chipsT.map((x) => x.w));
        const pw = Math.min(cw - 18, Math.max(labW, pesW, chipsW) + (compacto ? 14 : 28));
        const ph = Math.min(ch - 8, total + (compacto ? 12 : 16));
        g.times[t.id] = { x: ccx - pw / 2, y: ccy - ph / 2, w: pw, h: ph, lx: ccx, ly: pos.lab, linha: c[0], semN: compacto, py: chipsT.length ? pos.chips : -999 };
        // o "+N" fica do lado de dentro do mapa, longe das linhas que saem para gente de fora
        const maisAntes = false; // o "+N" fica sempre por último, à direita
        pessoas.forEach((id, i) => { g.nos[id] = { x: ccx + (i + (maisAntes ? 1 : 0) - (slots - 1) / 2) * sp, y: pos.pes + r + 1, r }; });
        if (maisN > 0 && pessoas.length) {
          const rr = "+" + maisN, w = Math.ceil(largura(rr, 11.5) + 18), slot = maisAntes ? 0 : slots - 1;
          g.chips["maisp-" + t.id] = { x: ccx + (slot - (slots - 1) / 2) * sp - w / 2, y: pos.pes + r + 1 - 12, w, rot: rr, mais: true, time: t.id, maisPessoas: true };
        }
        let yc = pos.chips + rotP;
        chipsT.forEach((cp) => { g.chips[cp.id] = { x: ccx - cp.w / 2, y: yc, w: cp.w, rot: cp.rot, semDono: cp.semDono, mais: cp.mais, time: t.id }; yc += 30; });
      }
      // gente de fora, no anel
      const exts = D.externos.filter((x) => vis.has("ext:" + x.id));
      if (exts.length) {
        g.anel = { x: ri, y: ri, w: W - 2 * ri, h: H - 2 * ri };
        const re = compacto ? 11 : 14;
        for (const x of exts) {
          let px, py;
          // cada contato de fora fica onde as linhas dele não cruzam título nem processo de nenhum time
          if (x.lado === "tr") { px = W - ri - (compacto ? 14 : 18); py = ri; }
          else if (x.lado === "mr") { px = W - ri; py = pad + 2 * ch; }
          else if (x.lado === "ml") { px = ri; py = g.nos.lucas ? g.nos.lucas.y : pad + 1.5 * ch; }
          else { px = W / 2; py = H - ri; }
          g.nos[x.id] = { x: px, y: py, r: re, ext: true, lado: x.lado };
        }
      }
      G = { pad, cw, ch, ri };
      return g;
    }
    let G = { pad: 0, cw: 0, ch: 0, ri: 0 };
    // linhas de quem é de fora: correm pelos vãos entre os times
    function caminhoFora(de, para, a, b) {
      const f = (n) => n.toFixed(1);
      if (false) { // (substituído por rota)
        const xg = b.x, sx = a.x + a.r + 3, rr = Math.min(10, Math.abs(a.y - b.y) / 2);
        return "M" + f(sx) + " " + f(a.y) + " L" + f(xg - rr) + " " + f(a.y) + " Q" + f(xg) + " " + f(a.y) + " " + f(xg) + " " + f(a.y - rr) + " L" + f(xg) + " " + f(b.y + b.r + 5);
      }
      if (de === "banco" && para === "marina") { // corre pelo vão entre Risco e Operações e entra na Marina pela direita
        const gx = G.pad + 2 * G.cw, gy = a.y, rr = 14;
        return "M" + f(a.x - a.r - 3) + " " + f(gy) + " L" + f(gx + rr) + " " + f(gy) + " Q" + f(gx) + " " + f(gy) + " " + f(gx) + " " + f(gy - rr) + " Q" + f(gx) + " " + f(b.y) + " " + f(b.x + b.r + 5) + " " + f(b.y);
      }
      return null;
    }

    // linhas entre times correm pelos vãos da grade e entram em cada pessoa pela esquerda:
    // nunca cruzam título, rótulo ou chip (as pessoas à esquerda de quem recebe ficam por baixo da linha)
    function poli(pts) {
      const f = (n) => n.toFixed(1);
      let d = "M" + f(pts[0][0]) + " " + f(pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
        const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y), rr = Math.min(9, l1 / 2, l2 / 2);
        if (rr < 0.5) { d += " L" + f(x) + " " + f(y); continue; }
        d += " L" + f(x - (x - px) / l1 * rr) + " " + f(y - (y - py) / l1 * rr) + " Q" + f(x) + " " + f(y) + " " + f(x + (nx - x) / l2 * rr) + " " + f(y + (ny - y) / l2 * rr);
      }
      const z = pts[pts.length - 1];
      return d + " L" + f(z[0]) + " " + f(z[1]);
    }
    const colDe = (x) => Math.max(0, Math.min(2, Math.floor((x - G.pad) / G.cw)));
    const vaoX = (col) => G.pad + col * G.cw;
    function vaoY(y) { const k = Math.max(0, Math.min(3, Math.round((y - G.pad) / G.ch))); return k === 0 ? G.pad - 6 : k === 3 ? G.pad + 3 * G.ch + 6 : G.pad + k * G.ch; }
    function rota(a, b, de, para) {
      const ds = ((de.charCodeAt(0) + para.charCodeAt(0) * 3) % 5 - 2) * 2.5; // linhas que dividem um vão não se sobrepõem
      const ext = (id) => D.externos.some((x) => x.id === id);
      if (para === "contabilidade") { // sai pela esquerda, sobe pelo vão, corre pela margem de cima até o contato
        const xa = vaoX(colDe(a.x)) + ds, yt = G.pad - 10;
        return poli([[a.x - a.r - 3, a.y], [xa, a.y], [xa, yt], [b.x, yt], [b.x, b.y + b.r + 5]]);
      }
      if (de === "agencia") return poli([[a.x + a.r + 3, a.y], [b.x - b.r - 5, b.y]]);
      const T = [b.x - b.r - 5, b.y], xb = vaoX(colDe(b.x)) + ds;
      if (ext(de)) { // vem do anel: corre pelo vão horizontal até o vão da coluna de quem recebe
        return poli([[a.x - a.r - 3, a.y], [xb, a.y], [xb, b.y], T]);
      }
      const S = [a.x - a.r - 3, a.y], xa = vaoX(colDe(a.x)) + ds;
      if (Math.abs(xa - xb) < 1) return poli([S, [xa, a.y], [xa, b.y], T]);
      const yh = vaoY((a.y + b.y) / 2) + ds;
      return poli([S, [xa, a.y], [xa, yh], [xb, yh], [xb, b.y], T]);
    }

    /* ---------- linhas suaves que desviam (X1) ----------
     * Cada linha testa algumas âncoras (a pessoa, quando ela está na beira certa da fileira; pontos da borda da placa
     * do time virados para o destino; os cantos) e fica com a curva que não cruza placa, rótulo nem chip. */
    const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
    function bez(A, C1, C2, B, t) { const u = 1 - t; return [u*u*u*A[0] + 3*u*u*t*C1[0] + 3*u*t*t*C2[0] + t*t*t*B[0], u*u*u*A[1] + 3*u*u*t*C1[1] + 3*u*t*t*C2[1] + t*t*t*B[1]]; }
    function ancoras(id, P, pos, placas) {
      const n = pos[id]; if (!n) return [];
      const ext = D.externos.some((x) => x.id === id);
      if (id === "marina" || ext) {
        const base = Math.atan2(P[1] - n.y, P[0] - n.x), out = [];
        for (const d of id === "marina" ? [0, 0.45, -0.45, 0.9, -0.9, 1.3, -1.3] : [0, 0.5, -0.5]) {
          const ang = base + d, ux = Math.cos(ang), uy = Math.sin(ang);
          out.push({ p: [n.x + ux * (n.r + 4), n.y + uy * (n.r + 4)], n: [ux, uy], tipo: "no", custo: Math.abs(d) * 30 });
        }
        return out;
      }
      const pe = D.pessoas.find((x) => x.id === id); const pl = pe && placas[pe.time];
      if (!pl) return [{ p: [n.x, n.y], n: unit(P[0] - n.x, P[1] - n.y), tipo: "no", custo: 0 }];
      const out = [], doTime = Object.keys(pos).filter((k) => { const q = D.pessoas.find((x) => x.id === k); return q && q.time === pe.time; });
      const xs = doTime.map((k) => pos[k].x), maisN = pl.temMais;
      if (P[0] < pl.x && n.x <= Math.min(...xs) + 0.5) out.push({ p: [n.x - n.r - 3, n.y], n: [-1, 0], tipo: "pessoa", custo: -40 });
      if (P[0] > pl.x + pl.w && !maisN && n.x >= Math.max(...xs) - 0.5) out.push({ p: [n.x + n.r + 3, n.y], n: [1, 0], tipo: "pessoa", custo: -40 });
      const x0 = pl.x, x1 = pl.x + pl.w, y0 = pl.y, y1 = pl.y + pl.h, cl = (v, a, b) => Math.max(a, Math.min(b, v));
      const lados = [];
      if (P[1] > y1) lados.push(["b", [0, 1]]); if (P[1] < y0) lados.push(["t", [0, -1]]);
      if (P[0] < x0) lados.push(["l", [-1, 0]]); if (P[0] > x1) lados.push(["r", [1, 0]]);
      for (const [l, nn] of lados) {
        const vals = l === "b" || l === "t" ? [cl(P[0], x0 + 18, x1 - 18), (x0 + x1) / 2, x0 + 18, x1 - 18] : [cl(P[1], y0 + 16, y1 - 16), (y0 + y1) / 2, y0 + 16, y1 - 16];
        vals.forEach((v, i) => out.push({ p: l === "b" ? [v, y1] : l === "t" ? [v, y0] : l === "l" ? [x0, v] : [x1, v], n: nn, tipo: "borda", custo: i * 6 }));
      }
      for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
        const [ux, uy] = unit(P[0] - cx, P[1] - cy);
        if ((cx === x0 ? ux < 0 : ux > 0) && (cy === y0 ? uy < 0 : uy > 0)) out.push({ p: [cx + (cx === x0 ? 2 : -2), cy + (cy === y0 ? 2 : -2)], n: [ux, uy], tipo: "borda", custo: 8 });
      }
      return out;
    }
    function rotaSuave(e, pos, placas, obst) {
      const a = pos[e.de], b = pos[e.para];
      const As = ancoras(e.de, [b.x, b.y], pos, placas), Bs = ancoras(e.para, [a.x, a.y], pos, placas);
      let melhor = null;
      for (const A of As) for (const B of Bs) {
        const dist = Math.hypot(B.p[0] - A.p[0], B.p[1] - A.p[1]), k = Math.max(24, Math.min(150, dist * 0.38));
        const C1 = [A.p[0] + A.n[0] * k, A.p[1] + A.n[1] * k], C2 = [B.p[0] + B.n[0] * k, B.p[1] + B.n[1] * k];
        let bate = 0;
        for (let i = 1; i < 40; i++) {
          const q = bez(A.p, C1, C2, B.p, i / 40);
          if (Math.hypot(q[0] - A.p[0], q[1] - A.p[1]) < 8 || Math.hypot(q[0] - B.p[0], q[1] - B.p[1]) < 10) continue;
          for (const o of obst) {
            if (o.dono && ((A.tipo === "pessoa" && o.dono === e.timeDe) || (B.tipo === "pessoa" && o.dono === e.timePara))) { if (o.placa) continue; }
            if (q[0] > o.x - 3 && q[0] < o.x + o.w + 3 && q[1] > o.y - 3 && q[1] < o.y + o.h + 3) { bate++; break; }
          }
          if (q[0] < 2 || q[1] < 2 || q[0] > W - 2 || q[1] > H - 2) bate++;
        }
        const custo = bate * 1000 + dist + A.custo + B.custo;
        if (!melhor || custo < melhor.custo) melhor = { custo, A, B, C1, C2 };
      }
      if (!melhor) return null;
      const f = (n) => n.toFixed(1), m = melhor;
      e.ancoraBorda = m.A.tipo === "borda";
      return "M" + f(m.A.p[0]) + " " + f(m.A.p[1]) + " C" + f(m.C1[0]) + " " + f(m.C1[1]) + " " + f(m.C2[0]) + " " + f(m.C2[1]) + " " + f(m.B.p[0]) + " " + f(m.B.p[1]);
    }

    function caminho(a, b, mesmaLinha) {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      let nx = -uy, ny = ux;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      // curva para o lado do centro do mapa
      const vc = (W / 2 - mx) * nx + (H / 2 - my) * ny;
      if (vc < 0) { nx = -nx; ny = -ny; }
      if (mesmaLinha) { nx = 0; ny = -1; } // dentro do time: arco por cima, entre o título e as pessoas
      const k = mesmaLinha ? Math.min(14, len * 0.3) : Math.max(10, Math.min(48, len * 0.12));
      const qx = mx + nx * k, qy = my + ny * k;
      // pontos de saída e chegada na borda dos nós, na direção da curva
      const ta = Math.hypot(qx - a.x, qy - a.y) || 1, tb = Math.hypot(qx - b.x, qy - b.y) || 1;
      const ax = a.x + ((qx - a.x) / ta) * (a.r + 3), ay = a.y + ((qy - a.y) / ta) * (a.r + 3);
      const bx = b.x + ((qx - b.x) / tb) * (b.r + 5), by = b.y + ((qy - b.y) / tb) * (b.r + 5);
      return "M" + ax.toFixed(1) + " " + ay.toFixed(1) + " Q" + qx.toFixed(1) + " " + qy.toFixed(1) + " " + bx.toFixed(1) + " " + by.toFixed(1);
    }

    /* ---------- elementos ---------- */
    function rotuloPessoa(id) { const p = D.pessoas.find((x) => x.id === id); return p ? p.nome + ", " + (D.times.find((t) => t.id === p.time) || {}).nome : id; }
    function interagir(g, tipo, id, rotulo) {
      if (!op.interativo) return;
      g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", rotulo);
      g.classList.add("m-clicavel");
      const ir = () => op.aoEscolher && op.aoEscolher(tipo, id);
      g.addEventListener("click", ir);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(); } });
      if (tipo === "time") {
        const on = () => { if (!fixo) focarTime(id); }, off = () => { if (!fixo) focarTime(null); };
        g.addEventListener("pointerenter", on); g.addEventListener("pointerleave", off); g.addEventListener("focus", on); g.addEventListener("blur", off);
      }
      if (tipo === "pessoa" || tipo === "externo") {
        const on = () => focar(id), off = () => focar(null);
        g.addEventListener("pointerenter", on); g.addEventListener("pointerleave", off); g.addEventListener("focus", on); g.addEventListener("blur", off);
      }
    }
    function focarTime(id) {
      svg.classList.toggle("m-foco-time", !!id);
      const doTime = (pid) => { const p = D.pessoas.find((x) => x.id === pid); return !!p && p.time === id; };
      els.forEach((e) => {
        let rel = false;
        if (id) {
          if (e.tipo === "time") rel = e.id === id;
          else if (e.tipo === "no") rel = doTime(e.id) || e.id === "marina";
          else if (e.tipo === "chip") rel = e.time === id;
          else if (e.tipo === "aresta") rel = doTime(e.de) || doTime(e.para);
        }
        e.g.classList.toggle("m-rel-time", rel);
      });
    }
    function focar(id) {
      svg.classList.toggle("m-foco", !!id);
      els.forEach((e, k) => {
        if (e.tipo === "aresta") e.g.classList.toggle("m-rel", !!id && (e.de === id || e.para === id));
        if (e.tipo === "no") e.g.classList.toggle("m-rel", !!id && (e.id === id || [...els.values()].some((a) => a.tipo === "aresta" && ((a.de === id && a.para === e.id) || (a.para === id && a.de === e.id)))));
      });
    }

    function criarNo(id, geo, novo) {
      const ext = D.externos.find((x) => x.id === id);
      const p = ext || D.pessoas.find((x) => x.id === id);
      const eu = id === "marina";
      const g = s("g", { class: "m-no" + (ext ? " m-ext" : "") + (eu ? " m-eu" : "") });
      const inner = s("g", { class: "m-no-in" + (novo ? " m-novo" : "") });
      if (novo && !eu) inner.append(s("circle", { class: "m-brilho", r: geo.r + 6, filter: "url(#m-brilho)" }));
      inner.append(s("circle", { class: "m-anel", r: geo.r + 5 }));
      inner.append(s("circle", { class: "m-bola", r: geo.r }));
      if (eu) {
        const rs = s("svg", { x: -geo.r, y: -geo.r, width: 2 * geo.r, height: 2 * geo.r, viewBox: "0 0 64 64", class: "m-retrato" });
        rs.innerHTML = SK.retratoSvg("mret" + Math.random().toString(36).slice(2, 7));
        inner.append(rs, s("circle", { class: "m-eu-aro", r: geo.r }));
      } else inner.append(txt({ class: "m-ini", "text-anchor": "middle", dy: "0.35em" }, p.iniciais));
      g.append(inner);
      const rot = s("g", { class: "m-rot" + (novo ? " m-novo-rot" : "") });
      if (eu) {
        rot.append(txt({ class: "m-nome m-nome-eu", "text-anchor": "middle", y: geo.r + 18 }, "Marina"));
        if (!compacto) rot.append(txt({ class: "m-sub", "text-anchor": "middle", y: geo.r + 33 }, "você · COO"));
      } else if (ext) {
        if (!compacto) {
          const lado = geo.lado;
          if (lado === "tr" || lado === "mr") rot.append(txt({ class: "m-nome m-nome-ext", "text-anchor": "end", x: -geo.r - 7, y: 4 }, p.curto));
          else rot.append(txt({ class: "m-nome m-nome-ext", "text-anchor": "start", x: -geo.r + 2, y: -geo.r - 7 }, p.curto));
        }
      } else if (!compacto) {
        rot.append(txt({ class: "m-nome", "text-anchor": "middle", y: geo.r + 15 }, p.primeiro));
      }
      g.append(rot);
      interagir(g, ext ? "externo" : "pessoa", id, ext ? p.nome : rotuloPessoa(id));
      camNos.append(g);
      return { g, tipo: "no", id };
    }
    function criarTime(t, geo, novo) {
      const g = s("g", { class: "m-time" + (novo ? " m-novo-suave" : "") });
      const placa = s("rect", { class: "m-placa", rx: compacto ? 10 : 14 });
      const lab = s("g", { class: "m-lab" });
      lab.append(txt({ class: "m-time-nome", "text-anchor": "middle" }, t.nome));
      if (!compacto) lab.append(txt({ class: "m-time-n", "text-anchor": "middle", y: 17 }, t.pessoas + " pessoas"));
      const procRot = txt({ class: "m-proc-rot", "text-anchor": "middle" }, "Processos");
      g.append(placa, lab, procRot);
      camPlacas.append(g);
      interagir(lab, "time", t.id, t.nome + ", " + t.pessoas + " pessoas");
      return { g, tipo: "time", id: t.id, placa, lab, procRot };
    }
    function criarChip(id, geo, novo) {
      const g = s("g", { class: "m-chip" + (geo.semDono ? " m-chip-sem" : "") + (geo.mais ? " m-chip-mais" : "") });
      const inner = s("g", { class: novo ? "m-novo-chip" : "" });
      inner.append(s("rect", { class: "m-chip-fundo", rx: 12, height: 24 }), txt({ class: "m-chip-txt", x: 11, y: 16 }, geo.rot));
      g.append(inner);
      camChips.append(g);
      if (geo.maisPessoas) { g.classList.add("m-chip-pessoas"); interagir(g, "time", geo.time, "Ver as " + D.times.find((t) => t.id === geo.time).pessoas + " pessoas de " + D.times.find((t) => t.id === geo.time).nome); }
      else if (geo.mais) interagir(g, "time", geo.time, "Ver todos os processos de " + D.times.find((t) => t.id === geo.time).nome);
      else interagir(g, "processo", id, "Processo: " + D.processos.find((p) => p.id === id).nome);
      return { g, tipo: "chip", id, rect: inner.firstChild, t: inner.lastChild, rot: geo.rot, time: geo.time };
    }
    function criarAresta(chave, novo) {
      const [a, b] = chave.slice(7).split(">");
      const ext = D.externos.some((x) => x.id === a || x.id === b);
      const principal = ext || a === "marina" || b === "marina"; // em repouso só aparece o que chega em você e o que liga gente de fora
      const p = s("path", { class: "m-aresta" + (ext ? " m-aresta-ext" : "") + (principal ? "" : " m-sec") + (novo ? " m-desenha" : ""), pathLength: ext ? null : "1" });
      camArestas.append(p);
      const e = { g: p, tipo: "aresta", de: a, para: b, ext };
      if (novo && !ext && !SK.reduzido()) setTimeout(() => p.setAttribute("marker-end", "url(#m-seta)"), 650);
      else p.setAttribute("marker-end", "url(#m-seta)");
      return e;
    }

    let anelEl = null;
    function sincronizar(animar) {
      const r = container.getBoundingClientRect();
      W = Math.max(280, Math.round(r.width)); H = Math.max(260, Math.round(r.height));
      const novoCompacto = W < 620 || H < 380;
      if (novoCompacto !== compacto) { compacto = novoCompacto; els.forEach((e) => e.g.remove()); els.clear(); if (anelEl) { anelEl.remove(); anelEl = null; } animar = false; }
      svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("width", W); svg.setAttribute("height", H);
      svg.classList.toggle("m-compacto", compacto);
      const geo = layout();
      const vivos = new Set();
      // anel
      if (geo.anel) {
        if (!anelEl) {
          anelEl = s("g", { class: "m-anel-fora" + (animar ? " m-novo-suave" : "") });
          anelEl.append(s("rect", { class: "m-anel-rect", rx: 22 }));
          const lab = s("g", { class: "m-anel-lab" });
          const tl = txt({ class: "m-anel-txt", x: 0, y: 4 }, "Gente de fora");
          lab.append(s("rect", { class: "m-anel-lab-fundo", x: -8, y: -9, height: 18, rx: 9, width: largura("Gente de fora", 11.5, 600) + 16 }), tl);
          anelEl.append(lab);
          camAnel.append(anelEl);
          interagir(lab, "fora", "fora", "Gente de fora: " + D.externos.length + " contatos");
        }
        const rc = anelEl.querySelector(".m-anel-rect");
        rc.setAttribute("x", geo.anel.x); rc.setAttribute("y", geo.anel.y); rc.setAttribute("width", geo.anel.w); rc.setAttribute("height", geo.anel.h);
        anelEl.querySelector(".m-anel-lab").setAttribute("transform", "translate(" + (geo.anel.x + 26) + " " + geo.anel.y + ")");
      } else if (anelEl) { anelEl.remove(); anelEl = null; }
      // times
      for (const t of D.times) {
        const k = "time:" + t.id, gt = geo.times[t.id];
        if (!gt) continue;
        vivos.add(k);
        let e = els.get(k);
        if (!e) { e = criarTime(t, gt, animar); e.cur = Object.assign({}, gt); els.set(k, e); }
        e.alvo = gt;
      }
      // nós
      for (const id of Object.keys(geo.nos)) {
        const ext = geo.nos[id].ext, k = (ext ? "ext:" : "pessoa:") + id;
        vivos.add(k);
        let e = els.get(k);
        if (!e) { e = criarNo(id, geo.nos[id], animar); e.cur = Object.assign({}, geo.nos[id]); els.set(k, e); }
        e.alvo = geo.nos[id];
      }
      // chips
      for (const id of Object.keys(geo.chips)) {
        const k = "chip:" + id, gc = geo.chips[id];
        vivos.add(k);
        let e = els.get(k);
        if (e && e.rot !== gc.rot) { e.g.remove(); els.delete(k); e = null; }
        if (!e) { e = criarChip(id, gc, animar); e.cur = Object.assign({}, gc); els.set(k, e); }
        e.alvo = gc;
      }
      // arestas
      for (const k of vis) {
        if (!k.startsWith("escala:") || !visivel(k)) continue;
        vivos.add(k);
        if (!els.has(k)) els.set(k, criarAresta(k, animar));
      }
      for (const [k, e] of [...els]) if (!vivos.has(k)) { e.g.remove(); els.delete(k); }
      animarPara(animar ? 520 : 0);
    }

    function aplicar(f) {
      const pos = {};
      els.forEach((e, k) => {
        if (!e.alvo) return;
        const c = {};
        for (const p in e.alvo) c[p] = typeof e.alvo[p] === "number" && typeof e.cur[p] === "number" ? e.cur[p] + (e.alvo[p] - e.cur[p]) * f : e.alvo[p];
        e.agora = c;
        if (e.tipo === "no") { e.g.setAttribute("transform", "translate(" + c.x.toFixed(1) + " " + c.y.toFixed(1) + ")"); pos[e.id] = c; }
        else if (e.tipo === "time") {
          e.placa.setAttribute("x", c.x.toFixed(1)); e.placa.setAttribute("y", c.y.toFixed(1)); e.placa.setAttribute("width", c.w.toFixed(1)); e.placa.setAttribute("height", c.h.toFixed(1));
          e.lab.setAttribute("transform", "translate(" + c.lx.toFixed(1) + " " + (c.ly + (compacto ? 12 : 14)).toFixed(1) + ")");
          const n = e.lab.querySelector(".m-time-n"); if (n) n.style.display = c.semN ? "none" : "";
          e.procRot.setAttribute("transform", "translate(" + c.lx.toFixed(1) + " " + (c.py + 11).toFixed(1) + ")"); e.procRot.style.display = c.py < 0 ? "none" : "";
        } else if (e.tipo === "chip") {
          e.g.setAttribute("transform", "translate(" + c.x.toFixed(1) + " " + c.y.toFixed(1) + ")"); e.rect.setAttribute("width", c.w.toFixed(1));
        }
      });
      // obstáculos: placas dos times (com título, rótulo e chips dentro), rótulos da Marina e de quem é de fora
      const placas = {}, obst = [];
      els.forEach((e) => { if (e.tipo === "time" && e.agora) { placas[e.id] = Object.assign({ temMais: els.has("chip:maisp-" + e.id) }, e.agora); obst.push({ x: e.agora.x, y: e.agora.y, w: e.agora.w, h: e.agora.h, dono: e.id, placa: true }); } });
      if (pos.marina) obst.push({ x: pos.marina.x - 42, y: pos.marina.y + pos.marina.r + 3, w: 84, h: compacto ? 18 : 34 });
      els.forEach((e) => { if (e.tipo === "no" && e.agora && e.agora.ext) { const n = e.agora; obst.push({ x: n.x - n.r - 2, y: n.y - n.r - 2, w: 2 * n.r + 4, h: 2 * n.r + 4, ext: e.id }); } });
      els.forEach((e) => {
        if (e.tipo !== "aresta") return;
        const a = pos[e.de], b = pos[e.para];
        if (!a || !b) return;
        const pa = D.pessoas.find((x) => x.id === e.de), pb = D.pessoas.find((x) => x.id === e.para);
        e.timeDe = pa && pa.time; e.timePara = pb && pb.time;
        const mesmoTime = pa && pb && pa.time === pb.time && e.de !== "marina" && e.para !== "marina";
        const ob = obst.filter((o) => o.ext !== e.de && o.ext !== e.para);
        const d = mesmoTime ? caminho(a, b, true) : rotaSuave(e, pos, placas, ob);
        if (d) e.g.setAttribute("d", d);
        e.g.setAttribute("marker-start", e.ancoraBorda && !mesmoTime ? "url(#m-ponto)" : "");
      });
    }
    function animarPara(ms) {
      if (anim) cancelAnimationFrame(anim);
      if (!ms || SK.reduzido()) { aplicar(1); els.forEach((e) => { if (e.alvo) e.cur = Object.assign({}, e.alvo); }); return; }
      const t0 = performance.now();
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / ms), f = 1 - Math.pow(1 - p, 3);
        aplicar(f);
        if (p < 1) anim = requestAnimationFrame(passo);
        else { els.forEach((e) => { if (e.alvo) e.cur = Object.assign({}, e.alvo); }); anim = null; }
      };
      anim = requestAnimationFrame(passo);
    }

    const ro = new ResizeObserver(() => { if (vis.size) sincronizar(false); });
    ro.observe(container);

    return {
      revelar(chaves, animar = true) { chaves.forEach((k) => vis.add(k)); sincronizar(animar); },
      tudo(conectadas, animar = false) { chavesCompletas(conectadas).forEach((k) => vis.add(k)); sincronizar(animar); },
      chaves: () => new Set(vis),
      ocultar(ids, animar = true) { ocultos = new Set(ids || []); sincronizar(animar); },
      redesenhar() { sincronizar(false); },
      focarTime(id) { fixo = id; focarTime(id); },
      destruir() { ro.disconnect(); if (anim) cancelAnimationFrame(anim); svg.remove(); },
    };
  }
  SK.mapa = { criar: criarMapa, chavesCompletas, chavesDe };

  /* ========================================================================================= */
  const icoFonte = (f) => SK.icone({ gmail: "gmail", drive: "drive", agenda: "agenda", site: "olho" }[f] || "fonte", "ico-sm");
  const nomeFonte = (f) => ({ gmail: "Gmail", drive: "Drive", agenda: "Agenda" }[f] || (D.integracoes.find((i) => i.id === f) || {}).nome || ({ site: "Site" }[f]) || f);
  function monograma(it, classe) { return SK.marca(it.id, { "mono-sm": "mf-sm", "mono-grande": "mf-lg" }[classe] || ""); }
  function gSigla() { const sv = SK.el("svg", { viewBox: "0 0 24 24", class: "ico g-ico", "aria-hidden": "true" }); sv.innerHTML = '<path d="M20 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.5a3.9 3.9 0 0 1-1.7 2.5v2.1h2.7c1.6-1.5 2.5-3.6 2.5-6.2z" fill="currentColor" stroke="none"/><path d="M12 20.5c2.3 0 4.2-.8 5.5-2.1l-2.7-2.1c-.7.5-1.7.8-2.8.8-2.2 0-4-1.5-4.7-3.4H4.5v2.2A8.5 8.5 0 0 0 12 20.5z" fill="currentColor" stroke="none" opacity=".8"/><path d="M7.3 13.7a5 5 0 0 1 0-3.4V8.1H4.5a8.5 8.5 0 0 0 0 7.8z" fill="currentColor" stroke="none" opacity=".6"/><path d="M12 6.9c1.3 0 2.4.4 3.3 1.3l2.4-2.4A8.3 8.3 0 0 0 12 3.5a8.5 8.5 0 0 0-7.5 4.6l2.8 2.2C8 8.4 9.8 6.9 12 6.9z" fill="currentColor" stroke="none" opacity=".9"/>'; return sv; }

  /* W1: medidor de cobertura do mapa (quanto do trabalho da Lume o mapa enxerga) */
  function cobMedidor(pequeno) {
    const fig = el("span", { class: "cob-fig num" }, "0%");
    const barra = el("span", { class: "cob-barra" }, el("span", { class: "cob-cheio" }));
    const frase = el("p", { class: "cob-frase" });
    const raiz = el("div", { class: "cobertura" + (pequeno ? " cobertura-sm" : ""), role: "group", "aria-label": "Cobertura do mapa" },
      el("div", { class: "cob-topo" }, el("span", { class: "cob-rot" }, "Cobertura do mapa"), fig), barra, frase);
    let atual = 0;
    function atualizar(conectadas, animar) {
      const v = D.coberturaDe(conectadas, suite().id);
      raiz.querySelector(".cob-cheio").style.width = v + "%";
      SK.contar({ set textContent(t) { fig.textContent = t + "%"; } }, atual, v, animar ? 700 : 0);
      if (!animar) fig.textContent = v + "%";
      frase.textContent = conectadas.length ? "Com mais " + conectadas.length + (conectadas.length > 1 ? " fontes" : " fonte") + ", vejo cerca de " + v + "% do trabalho da Lume." : "Só com o " + suite().nome + ": vejo cerca de " + v + "% do trabalho da Lume.";
      if (animar && v > atual) { raiz.classList.remove("cob-subiu"); void raiz.offsetWidth; raiz.classList.add("cob-subiu"); }
      atual = v;
    }
    return { el: raiz, atualizar };
  }

  const suite = () => D.suites[SK.estado.suite] || D.suites.google;
  function msSigla() { const sv = SK.el("svg", { viewBox: "0 0 24 24", class: "ico g-ico", "aria-hidden": "true" }); sv.innerHTML = '<rect x="3" y="3" width="8.4" height="8.4" fill="currentColor" stroke="none"/><rect x="12.6" y="3" width="8.4" height="8.4" fill="currentColor" stroke="none" opacity=".75"/><rect x="3" y="12.6" width="8.4" height="8.4" fill="currentColor" stroke="none" opacity=".6"/><rect x="12.6" y="12.6" width="8.4" height="8.4" fill="currentColor" stroke="none" opacity=".9"/>'; return sv; }

  /* estúdio: canvas à esquerda, papel à direita (atos 0 depois do login, 1 e 2) */
  function estudio(sec) {
    const ink = el("div", { class: "estudio-canvas canvas" });
    const mapaBox = el("div", { class: "estudio-mapa" });
    ink.append(mapaBox);
    const lado = el("div", { class: "estudio-lado papel" });
    const wrap = el("div", { class: "estudio" }, ink, lado);
    sec.append(wrap);
    return { wrap, ink, mapaBox, lado };
  }

  /* =============================== ATO 0 · Entrar =============================== */
  let mapa = null;
  SK.ato({
    id: 0, titulo: "Entrar",
    padrao(e) { e.conta = { nome: D.usuaria.nome, email: D.usuaria.email }; e.espacoCriado = true; if (!e.suite) e.suite = "google"; },
    montar(sec) {
      const e = SK.estado;
      if (e.espacoCriado) { montarEspaco(sec, false); return; }
      const google = el("button", { class: "btn btn-entrar btn-grande", type: "button", on: { click: () => escolherConta("google") } }, gSigla(), "Entrar com Google");
      const microsoft = el("button", { class: "btn btn-entrar btn-grande", type: "button", on: { click: () => escolherConta("microsoft") } }, msSigla(), "Entrar com Microsoft");
      sec.append(el("div", { class: "abertura" },
        el("div", { class: "abertura-in" },
          el("h1", { class: "abertura-titulo entra-lento" }, "Sua empresa, melhor a\u00a0cada\u00a0semana."),
          el("p", { class: "abertura-linha entra-lento", style: "--atraso:100ms" }, "Mostra onde o trabalho trava e quanto custa, ajuda a consertar e mede se melhorou. Toda semana, de\u00a0novo."),
          el("div", { class: "abertura-acao entra-lento", style: "--atraso:180ms" }, google, microsoft),
          el("p", { class: "abertura-ciclo entra-lento", style: "--atraso:260ms" }, el("span", { class: "ciclo-item" }, "Expõe os problemas"), el("span", { class: "ciclo-ponto", "aria-hidden": "true" }, " · "), el("span", { class: "ciclo-item" }, "Ajuda a consertar"), el("span", { class: "ciclo-ponto", "aria-hidden": "true" }, " · "), el("span", { class: "ciclo-item" }, "Mede o que melhorou")))));
      function escolherConta(qual) {
        e.suite = qual;
        const ms = qual === "microsoft";
        const dlg = el("dialog", { class: "dialogo dialogo-google", "aria-labelledby": "g-tit" });
        const nota = el("p", { class: "t-micro texto-2 g-nota", hidden: true }, "Neste protótipo, só a conta da Marina.");
        dlg.append(el("div", { class: "dialogo-corpo" },
          el("div", { class: "g-topo" }, ms ? msSigla() : gSigla(), el("span", { class: "t-pequeno texto-2" }, ms ? "Entrar com a conta Microsoft" : "Fazer login com o Google")),
          el("h2", { class: "g-tit", id: "g-tit" }, "Escolha uma conta"),
          el("p", { class: "t-pequeno texto-2" }, "para continuar no skillstore"),
          el("ul", { class: "lista g-contas" },
            el("li", {}, el("button", { class: "linha linha-botao g-conta", type: "button", on: { click: () => { dlg.close(); entrar(); } } },
              el("span", { class: "avatar" }, D.usuaria.iniciais),
              el("span", { class: "linha-principal" }, el("span", { class: "forte" }, D.usuaria.nome), el("span", { class: "t-pequeno texto-2 g-email" }, D.usuaria.email)))),
            el("li", {}, el("button", { class: "linha linha-botao g-conta", type: "button", on: { click: () => { nota.hidden = false; } } },
              el("span", { class: "avatar avatar-externo" }, SK.icone("pessoa", "ico-sm")),
              el("span", { class: "linha-principal" }, el("span", {}, "Usar outra conta"))))),
          nota,
          el("p", { class: "t-micro texto-2" }, (ms ? "A Microsoft" : "O Google") + " vai compartilhar seu nome, e-mail e foto com o skillstore.")));
        dlg.addEventListener("close", () => dlg.remove());
        sec.append(dlg);
        dlg.showModal();
      }
      function entrar() {
        e.conta = { nome: D.usuaria.nome, email: D.usuaria.email };
        e.espacoCriado = true; SK.salvar();
        sec.replaceChildren();
        montarEspaco(sec, true);
      }
    },
    sair() { if (mapa) { mapa.destruir(); mapa = null; } },
  });

  function montarEspaco(sec, animar) {
    const st = estudio(sec);
    st.wrap.classList.add("estudio-espaco");
    if (animar) st.ink.classList.add("canvas-chega");
    mapa = criarMapa(st.mapaBox, {});
    const passos = [
      ["Reconheci a empresa pelo domínio", D.empresa.nome, D.empresa.dominio],
      ["Você", D.usuaria.nome + ", " + D.usuaria.cargo, "do seu perfil e da sua assinatura de e-mail"],
      ["Criei o espaço da Lume", "Só você vê, até escolher quem mais vê", ""],
    ];
    const lista = el("ol", { class: "andaimes" });
    const btn = el("button", { class: "btn btn-primario btn-largo", type: "button", disabled: animar ? true : null, on: { click: () => SK.ir(1) } }, "Conectar o " + suite().nome, SK.icone("seta", "ico-sm"));
    const acao = el("div", { class: "lado-acao" }, btn);
    st.lado.append(el("div", { class: "lado-rolar" },
      el("h1", { class: "lado-titulo" }, animar ? "Montando seu espaço" : "Seu espaço está pronto"),
      lista), acao);
    const h1 = st.lado.querySelector("h1");
    const itens = passos.map((p) => {
      const li = el("li", { class: "andaime " + (animar ? "pendente" : "feito") },
        el("span", { class: "andaime-ico" }, el("span", { class: "girando-tinta", "aria-hidden": "true" }), SK.icone("check", "ico-sm")),
        el("div", {}, el("p", { class: "t-micro texto-2" }, p[0]), el("p", { class: "andaime-valor" }, p[1]), p[2] ? el("p", { class: "t-pequeno texto-2" }, p[2]) : null));
      lista.append(li);
      return li;
    });
    const fim = () => { h1.textContent = "Seu espaço está pronto"; btn.disabled = false; SK.anunciar("Seu espaço está pronto."); };
    if (animar) {
      SK.depois(300, () => mapa.revelar(["pessoa:marina"], true));
      itens.forEach((li, i) => {
        SK.depois(450 + i * 750, () => { li.classList.replace("pendente", "andando"); });
        SK.depois(450 + i * 750 + 600, () => { li.classList.replace("andando", "feito"); });
      });
      SK.depois(450 + 3 * 750 + 100, fim);
      SK.anunciar("Montando o espaço da Lume Pagamentos.");
    } else { mapa.revelar(["pessoa:marina"], false); }
  }

  /* =============================== ATO 1 · Permissões e "Traga a sua IA" =============================== */
  SK.ato({
    id: 1, titulo: "Permissões",
    padrao(e) { e.google = { gmail: true, drive: true, agenda: true }; e.permissoes = true; if (!e.suite) e.suite = "google"; },
    montar(sec) {
      const e = SK.estado, su = suite();
      const st = estudio(sec);
      st.wrap.classList.add("estudio-espaco");
      mapa = criarMapa(st.mapaBox, {});
      mapa.revelar(["pessoa:marina"], false);
      const lista = D[su.fontes];
      const fontes = el("ul", { class: "lista permissoes" });
      lista.forEach((f, i) => fontes.append(el("li", { class: "permissao entra", style: "--atraso:" + (80 + i * 60) + "ms" },
        el("span", { class: "permissao-ico" }, (window.SK_MARCAS || {})[f.id] ? SK.marca(f.id) : el("span", { class: "marca-f" }, SK.icone("agenda"))),
        el("span", { class: "permissao-estado", "aria-hidden": "true" }, el("span", { class: "girando-tinta" }), SK.icone("check", "ico-sm")),
        el("div", { class: "permissao-txt" }, el("p", { class: "forte" }, f.nome), el("p", { class: "t-pequeno" }, f.le), el("p", { class: "t-pequeno texto-2" }, f.naoLe)))));
      const rolar = el("div", { class: "lado-rolar" },
        el("h1", { class: "lado-titulo" }, "O que eu leio no seu " + su.nome),
        el("p", { class: "t-pequeno texto-2 lado-intro" }, "Para achar onde o trabalho trava e quanto custa, preciso de " + (lista.length === 4 ? "quatro" : "três") + " fontes."),
        fontes,
        el("p", { class: "confianca entra", style: "--atraso:320ms" }, SK.icone("cadeado", "ico-sm"), el("span", {}, "Só leitura. Você escolhe o que cada área vê.")));
      const acao = el("div", { class: "lado-acao" }, el("button", { class: "btn btn-primario btn-largo", type: "button", on: { click: (ev) => permitir(ev.currentTarget) } }, "Permitir e continuar", SK.icone("seta", "ico-sm")));
      st.lado.append(rolar, acao);
      if (e.permissoes) { suaIA(); return; }
      function permitir(b) {
        b.disabled = true;
        const linhas = [...fontes.querySelectorAll(".permissao")];
        linhas.forEach((li) => li.classList.add("pendente"));
        linhas.forEach((li, i) => {
          SK.depois(120 + i * 480, () => li.classList.replace("pendente", "andando"));
          SK.depois(120 + i * 480 + 380, () => li.classList.replace("andando", "feito"));
        });
        SK.depois(120 + linhas.length * 480 + 250, () => { e.google = { gmail: true, drive: true, agenda: true }; e.permissoes = true; SK.salvar(); suaIA(); });
      }
      // passo curto antes da leitura: a IA da empresa (conceito)
      function suaIA() {
        rolar.replaceChildren(
          el("h1", { class: "lado-titulo entra" }, "Traga a sua IA"),
          el("p", { class: "t-pequeno texto-2 lado-intro entra", style: "--atraso:40ms" }, "As skills rodam na IA da sua empresa."),
          el("span", { class: "tag-conceito tag-conceito-sm entra", style: "--atraso:60ms" }, "Conceito · ainda não disponível"));
        const caixa = el("div", { class: "sua-ia entra", style: "--atraso:100ms" });
        if (SK.chaves && SK.chaves.lista) {
          e.ia = e.ia && e.ia.padrao !== undefined && e.iaOnboarding ? e.ia : { padrao: null };
          e.iaOnboarding = true;
          try { caixa.append(SK.chaves.lista({ aoMudar: () => { SK.salvar(); atualizar(); } })); } catch (err) { console.error(err); caixa.append(ias()); }
        } else caixa.append(ias());
        rolar.append(caixa);
        const continuar = el("button", { class: "btn btn-primario btn-largo", type: "button", on: { click: () => SK.ir(2) } }, "Começar a leitura", SK.icone("seta", "ico-sm"));
        const pular = el("button", { class: "btn btn-quieto btn-largo", type: "button", on: { click: () => SK.ir(2) } }, "Pular por enquanto");
        acao.replaceChildren(el("div", { class: "pilha", style: "--gap:6px" }, continuar, pular));
        function atualizar() { const tem = e.ia && Object.keys(e.ia).some((k) => k !== "padrao" && e.ia[k]); pular.hidden = !!tem; }
        atualizar();
        SK.anunciar("Permissões concedidas. Traga a sua IA, ou pule por enquanto.");
      }
      function ias() {
        // reserva, se o componente do Builder C não estiver carregado
        const ul = el("ul", { class: "lista integ-lista" });
        [["claude", "Claude", "Anthropic"], ["chatgpt", "ChatGPT", "OpenAI"], ["copilot", "Microsoft Copilot", "Microsoft 365"]].forEach(([id, nome, de]) => {
          const acao = el("div", { class: "integ-acao" });
          const pronto = () => acao.replaceChildren(el("span", { class: "chip chip-ok" }, SK.icone("check", "ico-sm"), "Conectado"));
          if (e.ia && e.ia[id]) pronto();
          else acao.append(el("button", { class: "btn btn-secundario btn-sm", type: "button", "aria-label": "Conectar " + nome, on: { click: () => { e.ia = Object.assign({ padrao: null }, e.ia); e.ia[id] = { via: "conta", fim: "" }; if (!e.ia.padrao) e.ia.padrao = id; SK.salvar(); pronto(); } } }, "Conectar"));
          ul.append(el("li", { class: "integ" }, SK.marca(id === "copilot" ? "microsoft" : id, "mf-sm"), el("div", { class: "integ-txt" }, el("span", { class: "integ-nome forte" }, nome), el("span", { class: "integ-sub" }, de)), acao));
        });
        return ul;
      }
    },
    sair() { if (mapa) { mapa.destruir(); mapa = null; } },
  });

  /* =============================== ATO 2 · A leitura ao vivo =============================== */
  let leitura = null;
  SK.ato({
    id: 2, titulo: "A leitura ao vivo", nav: "A leitura",
    padrao(e, jaVisto) { e.leituraCompleta = true; if (!jaVisto && !e.conectadas.length) e.conectadas = ["intercom", "tldv"]; },
    montar(sec) {
      const e = SK.estado;
      const st = estudio(sec);
      st.wrap.classList.add("estudio-leitura");
      // contadores no canvas
      const cont = {};
      const numeros = el("div", { class: "contadores" });
      let rotReun = null;
      [["pessoas", "pessoas"], ["times", "times"], ["processos", "processos"], ["agenda", "reuniões"]].forEach(([k, r]) => {
        const v = el("span", { class: "numero-valor num" }, "0");
        cont[k] = { el: v, val: 0 };
        const rot = el("span", { class: "numero-rotulo" }, r);
        if (k === "agenda") rotReun = rot;
        numeros.append(el("div", { class: "numero" }, v, rot));
      });
      const lido = {};
      const linhaLida = el("p", { class: "lidos t-pequeno" });
      [["meses", "meses de e-mail"], ["conversas", "conversas"], ["documentos", "documentos"]].forEach(([k, r], i) => {
        const v = el("span", { class: "num forte" }, "0");
        lido[k] = v;
        if (i) linhaLida.append(el("span", { class: "lidos-sep", "aria-hidden": "true" }, "·"));
        linhaLida.append(el("span", { class: "lidos-item" }, v, " " + r));
      });
      st.ink.prepend(el("div", { class: "canvas-topo" }, numeros, linhaLida));
      mapa = criarMapa(st.mapaBox, {});

      // lado: status, feed, bandeja
      const status = el("p", { class: "status t-pequeno" }, el("span", { class: "status-ponto", "aria-hidden": "true" }), el("span", { class: "status-txt" }, "Lendo"));
      const feed = el("ol", { class: "feed", "aria-live": "polite", "aria-label": "O que eu entendi" });
      const bandeja = el("section", { class: "bandeja", hidden: true, "aria-labelledby": "bandeja-tit" });
      const cta = el("button", { class: "btn btn-primario btn-largo", type: "button", on: { click: () => { concluir(); SK.ir(3); } } }, "Ver o que eu já entendi", SK.icone("seta", "ico-sm"));
      st.lado.append(el("div", { class: "lado-rolar" },
        el("div", { class: "lado-cabeca" }, el("h1", { class: "lado-titulo" }, "Lendo a Lume"), status),
        el("div", { class: "feed-caixa" }, feed),
        bandeja), el("div", { class: "lado-acao" }, cta));

      const linhaFeed = (t, fonte) => {
        const li = el("li", { class: "feed-linha entra" + (fonte ? " feed-fonte" : "") }, fonte ? el("span", { class: "feed-tag" }, fonte) : null, el("span", {}, t));
        feed.prepend(li);
        [...feed.children].slice(3).forEach((x) => { if (x.classList.contains('sai')) return; x.classList.add('sai'); setTimeout(() => x.remove(), SK.reduzido() ? 0 : 240); });
      };
      const contadores = (alvo, ms) => { if (rotReun) rotReun.textContent = alvo.agenda ? "reuniões: " + alvo.reunioes + " decidem, " + (alvo.agenda - alvo.reunioes) + " alinham" : "reuniões"; for (const k in alvo) { const c = cont[k]; if (!c || c.val === alvo[k]) continue; SK.contar(c.el, c.val, alvo[k], ms); if (alvo[k] > c.val && ms) { c.el.classList.remove("pulsa"); void c.el.offsetWidth; c.el.classList.add("pulsa"); } c.val = alvo[k]; } };
      const extras = () => { const t = D.contagem(e.conectadas), b = D.base; return { pessoas: t.pessoas - b.pessoas, processos: t.processos - b.processos, reunioes: t.reunioes - b.reunioes }; };
      const N = D.leitura.feed.length;
      const alvoEm = (i) => { const f = i / (N - 1), x = extras(), times = D.times.filter((t) => mapa.chaves().has("time:" + t.id)).length;
        return { pessoas: Math.round(D.base.pessoas * f) + x.pessoas, times, processos: Math.round(D.base.processos * f) + x.processos, reunioes: Math.round(D.base.reunioes * f) + x.reunioes, agenda: Math.round(D.reunioesAgenda * f) }; };
      const lidosFim = () => { lido.meses.textContent = "18"; lido.conversas.textContent = SK.fmt(D.leitura.gmail.conversas); lido.documentos.textContent = SK.fmt(D.leitura.drive.documentos); };

      // bandeja de integrações
      const su = suite();
      const achadas = D.porGanho(su.id, D.integracoes.filter((i) => i.achada)), outras = D.porGanho(su.id, D.integracoes.filter((i) => !i.achada));
      const maior = achadas.find((i) => !e.conectadas.includes(i.id));
      const lAch = el("ul", { class: "lista integ-lista" }), lOut = el("ul", { class: "integ-grade" });
      const linhaInteg = (it, i) => {
        const ligado = e.conectadas.includes(it.id);
        const acao = ligado ? el("span", { class: "chip chip-ok" }, SK.icone("check", "ico-sm"), "Conectado")
          : el("button", { class: "btn btn-secundario btn-sm", type: "button", "aria-label": "Conectar " + it.nome, on: { click: () => consentir(it) } }, "Conectar");
        const topo = !ligado && maior && maior.id === it.id;
        const sub = ligado ? el("span", { class: "integ-sub integ-sub-ok" }, it.adicionou) : el("span", { class: "integ-sub" }, topo ? D.motivoDe(it.id, su.id) : it.acrescentaria);
        const ganho = el("span", { class: "integ-ganho num" + (ligado ? " integ-ganho-ok" : "") }, (ligado ? "" : "+") + D.ganhoDe(it.id, su.id) + " pontos");
        return el("li", { class: "integ entra" + (ligado ? " integ-ligado" : "") + (topo ? " integ-topo" : ""), style: "--atraso:" + i * 50 + "ms", "data-integ": it.id },
          monograma(it, "mono-sm"),
          el("div", { class: "integ-txt" }, el("span", { class: "integ-nome" }, el("span", { class: "forte" }, it.nome), topo ? el("span", { class: "chip chip-anil chip-mini" }, "Maior ganho") : null), it.conceito && !ligado ? el("span", { class: "tag-conceito tag-conceito-sm" }, "Conceito · ainda não disponível") : null, sub),
          el("div", { class: "integ-acao" }, ganho, acao));
      };
      const tileInteg = (it, i) => {
        const ligado = e.conectadas.includes(it.id);
        const conteudo = [monograma(it, "mono-sm"), el("span", { class: "tile-txt" }, el("span", { class: "forte" }, it.nome), el("span", { class: "integ-sub num" + (ligado ? " integ-sub-ok" : "") }, ligado ? "Conectado" : "+" + D.ganhoDe(it.id, su.id) + " pontos"))];
        return el("li", { class: "entra", style: "--atraso:" + (300 + i * 50) + "ms", "data-integ": it.id },
          ligado ? el("div", { class: "tile tile-ligado" }, ...conteudo)
            : el("button", { class: "tile", type: "button", title: "Acrescenta " + it.acrescentaria, "aria-label": "Conectar " + it.nome + ": acrescenta " + it.acrescentaria, on: { click: () => consentir(it) } }, ...conteudo));
      };
      const desenharBandeja = (animar) => {
        lAch.replaceChildren(...achadas.map(linhaInteg)); lOut.replaceChildren(...outras.map(tileInteg));
        if (!animar) bandeja.querySelectorAll(".entra").forEach((x) => x.classList.remove("entra"));
      };
      const med = cobMedidor(false);
      med.atualizar(e.conectadas, false);
      bandeja.append(med.el, el("h2", { class: "bandeja-tit", id: "bandeja-tit" }, "Achei estas ferramentas nos seus e-mails"), el("p", { class: "bandeja-dica" }, "Em ordem do quanto cada uma acrescenta ao mapa."), lAch, el("h3", { class: "bandeja-sub" }, "Outras que você pode conectar"), lOut);
      const mostrarBandeja = (animar) => { if (!bandeja.hidden) return; bandeja.hidden = false; desenharBandeja(animar); if (animar) bandeja.classList.add("entra"); };

      function conectar(it) {
        if (!e.conectadas.includes(it.id)) e.conectadas.push(it.id);
        SK.salvar();
        desenharBandeja(false);
        const li = bandeja.querySelector('[data-integ="' + it.id + '"]'); if (li) li.classList.add("acabou-de");
        mapa.revelar(chavesDe(it.id), true);
        med.atualizar(e.conectadas, true);
        linhaFeed(it.feed, it.nome);
        SK.anunciar(it.feed);
        contadores(alvoEm(e.leituraCompleta ? N - 1 : passo), 900);
      }
      function consentir(it) {
        const dlg = el("dialog", { class: "dialogo", "aria-labelledby": "c-tit" });
        const etapa1 = () => {
          dlg.replaceChildren(el("div", { class: "dialogo-corpo" },
            el("div", { class: "consent-topo" }, monograma(it, "mono-grande"), el("span", { class: "t-micro texto-2" }, "Passo 1 de 2")),
            el("h2", { class: "dialogo-tit", id: "c-tit" }, "Conectar " + it.nome),
            it.achada ? el("p", { class: "t-pequeno texto-2" }, it.evidencia) : null,
            it.como ? el("p", { class: "t-pequeno" }, it.como) : null,
            it.conceito ? el("span", { class: "tag-conceito tag-conceito-sm" }, "Conceito · ainda não disponível") : null,
            el("dl", { class: "consent-dl" }, el("dt", {}, "O que eu leio"), el("dd", {}, it.pede), el("dt", {}, "O que eu não leio"), el("dd", {}, it.naoPede)),
            el("p", { class: "confianca" }, SK.icone("cadeado", "ico-sm"), el("span", {}, "Só leitura. Você desconecta quando quiser."))),
            el("div", { class: "dialogo-acoes" },
              el("button", { class: "btn btn-quieto", type: "button", on: { click: () => dlg.close() } }, "Agora não"),
              el("button", { class: "btn btn-primario", type: "button", on: { click: etapa2 } }, it.grupos ? "Escolher conversas" : "Continuar no " + it.nome)));
          dlg.querySelector(".btn-primario").focus();
        };
        const etapa2 = () => {
          const formas = it.grupos ? el("div", { class: "pilha", style: "--gap:10px" },
            el("p", { class: "t-pequeno forte" }, "Marque as conversas que eu posso ler"),
            el("ul", { class: "lista grupos" }, ...it.grupos.map((g) => {
              const b = el("button", { class: "grupo", type: "button", role: "checkbox", "aria-checked": g.marcado ? "true" : "false", on: { click: () => b.setAttribute("aria-checked", b.getAttribute("aria-checked") === "true" ? "false" : "true") } },
                el("span", { class: "grupo-caixa", "aria-hidden": "true" }, SK.icone("check", "ico-sm")), el("span", { class: "linha-principal" }, el("span", { class: "forte" }, g.nome), el("span", { class: "t-pequeno texto-2" }, g.pessoas + " pessoas")));
              return el("li", {}, b);
            })),
            el("p", { class: "t-pequeno texto-2" }, "Ou envie a conversa exportada de um grupo (.zip).")) : null;
          const autorizar = el("button", { class: "btn btn-primario", type: "button", on: { click: () => {
            autorizar.disabled = true;
            const corpo = dlg.querySelector(".dialogo-corpo"), acoes = dlg.querySelector(".dialogo-acoes");
            acoes.hidden = true;
            const caixa = el("div", { class: "consent-passos" });
            corpo.append(caixa);
            SK.passos(caixa, ["Autorizando a leitura no " + it.nome, "Lendo o que " + it.nome + " acrescenta", "Atualizando o mapa"], { ms: 380 }).then(() => { if (dlg.open) { dlg.close(); conectar(it); } });
          } } }, "Autorizar leitura");
          dlg.replaceChildren(el("div", { class: "dialogo-corpo fornecedor" },
            el("div", { class: "consent-topo" }, el("span", { class: "fornecedor-par" }, monograma(it, "mono-grande"), el("span", { class: "fornecedor-liga", "aria-hidden": "true" }), SK.marca("cerebro", "mf-lg")), el("span", { class: "t-micro texto-2" }, "Passo 2 de 2")),
            el("p", { class: "t-micro texto-2" }, it.grupos ? "Skillstore para Mac · WhatsApp" : it.nome + " · conta " + D.empresa.nome),
            el("h2", { class: "dialogo-tit", id: "c-tit" }, it.grupos ? "Escolha o que eu leio" : "O Skillstore quer acesso de leitura"),
            it.conceito ? el("span", { class: "tag-conceito tag-conceito-sm" }, "Conceito · ainda não disponível") : null,
            formas,
            el("ul", { class: "consent-checks" }, el("li", {}, SK.icone("check", "ico-sm"), it.pede), el("li", {}, SK.icone("check", "ico-sm"), "Sem permissão para escrever, apagar ou enviar")),
            it.confianca ? el("p", { class: "confianca" }, SK.icone("cadeado", "ico-sm"), el("span", {}, it.confianca)) : null),
            el("div", { class: "dialogo-acoes" }, el("button", { class: "btn btn-quieto", type: "button", on: { click: () => dlg.close() } }, "Cancelar"), autorizar));
          autorizar.focus();
        };
        dlg.addEventListener("close", () => dlg.remove());
        sec.append(dlg);
        etapa1();
        dlg.showModal();
        dlg.querySelector(".btn-primario").focus();
      }

      let passo = 0;
      function concluir() {
        if (e.leituraCompleta && passo >= N - 1) return;
        e.leituraCompleta = true; SK.salvar();
      }
      leitura = { e, mapa, linhaFeed, contadores, alvoEm, N, lidosFim, lido, mostrarBandeja, desenharBandeja, status, setPasso: (i) => (passo = i) };
    },
    entrar() {
      const L = leitura, e = L.e;
      if (e.leituraCompleta) {
        L.mapa.tudo(e.conectadas, false);
        const linhas = [D.leitura.feed[D.leitura.feed.length - 1].texto];
        e.conectadas.forEach((c) => linhas.push(D.integracoes.find((i) => i.id === c).feed));
        D.leitura.feed.slice(-4, -1).reverse().forEach((f) => L.linhaFeed(f.texto));
        L.linhaFeed(D.leitura.feed[L.N - 1].texto);
        e.conectadas.forEach((c) => { const it = D.integracoes.find((i) => i.id === c); L.linhaFeed(it.feed, it.nome); });
        document.querySelectorAll(".feed-linha.entra").forEach((x) => x.classList.remove("entra"));
        L.setPasso(L.N - 1); L.contadores(L.alvoEm(L.N - 1), 0); L.lidosFim();
        L.status.classList.add("pronto"); L.status.querySelector(".status-txt").textContent = "Leitura completa";
        L.mostrarBandeja(false);
        return;
      }
      L.mapa.revelar(["pessoa:marina"], false);
      const ms = 1450, ini = 500;
      const meta = { meses: 18, conversas: D.leitura.gmail.conversas, documentos: D.leitura.drive.documentos };
      for (const k in meta) SK.contar(L.lido[k], 0, meta[k], SK.reduzido() ? 0 : ms * 5);
      D.leitura.feed.forEach((f, i) => SK.depois(ini + i * ms, () => {
        L.setPasso(i);
        if (f.revela.length) L.mapa.revelar(f.revela, true);
        L.linhaFeed(f.texto);
        L.contadores(L.alvoEm(i), 900);
        if (i === 2) L.mostrarBandeja(true);
        if (i === L.N - 1) { e.leituraCompleta = true; SK.salvar(); L.status.classList.add("pronto"); L.status.querySelector(".status-txt").textContent = "Leitura completa"; L.lidosFim(); }
      }));
      if (SK.reduzido()) { /* SK.depois já roda tudo em 0ms */ }
    },
    sair() { if (mapa) { mapa.destruir(); mapa = null; } leitura = null; },
  });

  /* =============================== ATO 3 · O cérebro =============================== */
  const pessoa = (id) => D.pessoas.find((p) => p.id === id) || D.externos.find((p) => p.id === id);
  const nomeDe = (id) => { const p = pessoa(id); return p ? p.nome : "Ninguém"; };
  const time = (id) => D.times.find((t) => t.id === id);
  let vista = "processos";

  function procsVisiveis() { const c = SK.estado.conectadas; return D.processos.filter((p) => ["gmail", "drive", "agenda"].includes(p.fonte) || c.includes(p.fonte)).sort((a, b) => b.porMes - a.porMes); }
  function pessoasVisiveis() { const c = SK.estado.conectadas; return D.pessoas.filter((p) => p.fonte === "gmail" || c.includes(p.fonte)); }
  function escalasVisiveis() { const c = SK.estado.conectadas; return D.escalas.filter((x) => ["gmail", "drive", "agenda"].includes(x.fonte) || c.includes(x.fonte)); }

  function secao(titulo, ...filhos) { return el("section", { class: "painel-secao" }, el("h3", { class: "painel-h" }, titulo), ...filhos); }
  function linhasClicaveis(itens) { return el("ul", { class: "lista painel-lista" }, ...itens.map(([prim, meta, fn, ico]) => el("li", {}, el("button", { class: "linha linha-botao", type: "button", on: { click: fn } }, ico || null, el("span", { class: "linha-principal" }, el("span", { class: "forte" }, prim), meta ? el("span", { class: "t-pequeno texto-2" }, meta) : null), SK.icone("seta", "ico-sm seta-linha"))))); }
  function marcadores(itens) { return el("ul", { class: "marcadores" }, ...itens.map((t) => el("li", {}, t))); }
  function fontesLista(fontes) {
    return el("ul", { class: "lista fontes-lista" }, ...fontes.map((f) => el("li", {}, el("div", { class: "fonte-linha" }, icoFonte(f.fonte), el("span", { class: "fonte-txt" }, el("span", { class: "fonte-rot" }, f.rotulo || nomeFonte(f.fonte)), el("span", {}, f.texto)), el("span", { class: "fonte-data" }, f.data)))));
  }

  function abrirPessoa(id) {
    const p = pessoa(id), ext = D.externos.includes(p);
    const esc = escalasVisiveis();
    const sobe = esc.filter((x) => x.de === id), recebe = esc.filter((x) => x.para === id);
    const reun = D.reunioes.filter((r) => r.pessoas.includes(id) || (p.reunioes || []).includes(r.id));
    const corpo = el("div", { class: "pilha", style: "--gap:28px" },
      secao("O que decide", marcadores(p.decide)),
      secao("O que espera por " + (ext ? "eles" : p.primeiro), marcadores(p.esperam)),
      reun.length ? secao("Reuniões", linhasClicaveis(reun.map((r) => [r.nome, r.quando, () => abrirReuniao(r.id), SK.icone("reuniao")]))) : null,
      (sobe.length || recebe.length) ? secao("Quem escala para quem", linhasClicaveis([
        ...sobe.map((x) => ["Leva para " + nomeDe(x.para), x.sobre + " · " + x.porMes + " por mês", () => abrirPessoa(x.para), SK.icone("seta")]),
        ...recebe.map((x) => ["Recebe de " + nomeDe(x.de), x.sobre + " · " + x.porMes + " por mês", () => abrirPessoa(x.de), SK.icone("seta-esq")]),
      ])) : null,
      secao("Fontes", fontesLista([...sobe, ...recebe].slice(0, 4).map((x) => ({ fonte: x.fonte, rotulo: nomeFonte(x.fonte) + " · " + x.porMes + (x.porMes > 1 ? " mensagens" : " mensagem") + " por mês", texto: nomeDe(x.de) + " para " + nomeDe(x.para) + ": " + x.sobre.toLowerCase() + ", " + x.porMes + " por mês.", data: "últimos 30 dias" })))));
    SK.painel.abrir({ titulo: p.nome, sobre: ext ? p.tipo + " · gente de fora" : p.cargo + " · " + time(p.time).nome, corpo });
  }
  function abrirTime(id, aoFechar) {
    const t = time(id);
    const ps = pessoasVisiveis().filter((p) => p.time === id);
    const pr = procsVisiveis().filter((p) => p.time === id);
    const reun = D.reunioes.filter((r) => r.pessoas.some((x) => ps.some((p) => p.id === x)));
    const decide = [...new Set(ps.flatMap((p) => p.decide).filter((x) => !/^Nada sozinh/.test(x)))];
    const esperam = [...new Set(ps.flatMap((p) => p.esperam))];
    const resto = t.pessoas - ps.length;
    const corpo = el("div", { class: "pilha", style: "--gap:28px" },
      el("div", { class: "painel-numeros" }, el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, String(t.pessoas)), el("span", { class: "numero-rotulo" }, "pessoas")), el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, String(pr.length)), el("span", { class: "numero-rotulo" }, "processos mapeados")), el("div", { class: "numero" }, el("span", { class: "numero-valor num" }, String(reun.length)), el("span", { class: "numero-rotulo" }, "reuniões"))),
      secao("Quem está no time", linhasClicaveis(ps.map((p) => [p.nome, p.cargo, () => abrirPessoa(p.id), p.id === "marina" ? el("span", { class: "avatar avatar-sm avatar-retrato" }, SK.retrato()) : el("span", { class: "avatar avatar-sm" }, p.iniciais)])),
        resto > 0 ? el("p", { class: "t-pequeno texto-2" }, "E mais " + resto + (resto > 1 ? " pessoas que aparecem pouco nos e-mails." : " pessoa que aparece pouco nos e-mails.")) : null),
      decide.length ? secao("O que o time decide", marcadores(decide)) : null,
      esperam.length ? secao("O que espera pelo time", marcadores(esperam)) : null,
      pr.length ? secao("Processos", linhasClicaveis(pr.map((p) => [p.nome, p.frequencia, () => abrirProcesso(p.id), SK.icone("processo")]))) : null,
      reun.length ? secao("Reuniões", linhasClicaveis(reun.map((r) => [r.nome, (r.tipo === "decide" ? "Decide" : "Alinha") + " · " + r.quando, () => abrirReuniao(r.id), SK.icone("reuniao")]))) : null);
    SK.painel.abrir({ titulo: t.nome, sobre: t.pessoas + " pessoas · " + pr.length + " processos", corpo, aoFechar });
    corpo.querySelectorAll(".painel-numeros .numero-valor").forEach((v) => SK.contar(v, 0, Number(v.textContent), 500));
  }
  function abrirFora() {
    const corpo = el("div", { class: "pilha", style: "--gap:28px" },
      el("p", { class: "t-pequeno texto-2" }, "Quem não é da Lume, mas decide ou espera por decisões dela."),
      secao("De fora", linhasClicaveis(D.externos.map((x) => [x.nome, x.esperam[0], () => abrirPessoa(x.id), el("span", { class: "avatar avatar-sm avatar-externo" }, x.iniciais)]))));
    SK.painel.abrir({ titulo: "Gente de fora", sobre: D.externos.length + " contatos externos", corpo });
  }
  function abrirProcesso(id) {
    const p = D.processos.find((x) => x.id === id);
    const corpo = el("div", { class: "pilha", style: "--gap:28px" },
      el("div", { class: "fila" }, el("span", { class: "chip" }, p.frequencia), el("span", { class: "chip" }, "Certeza " + p.certeza), p.semDono ? el("span", { class: "chip chip-brasa" }, "Sem dono") : null),
      el("dl", { class: "painel-dl" }, el("dt", {}, "Quem faz"), el("dd", {}, el("button", { class: "link", type: "button", on: { click: () => abrirPessoa(p.quem) } }, nomeDe(p.quem))), el("dt", {}, "Quem decide"), el("dd", {}, p.decide)),
      secao("Passos", el("ol", {}, ...p.passos.map((x) => el("li", {}, x)))),
      p.excecoes.length ? secao("Exceções", marcadores(p.excecoes)) : null,
      secao("Fontes", fontesLista(p.fontes)));
    SK.painel.abrir({ titulo: p.nome, sobre: time(p.time).nome + " · " + p.frequencia, corpo });
  }
  function abrirReuniao(id) {
    const r = D.reunioes.find((x) => x.id === id);
    const corpo = el("div", { class: "pilha", style: "--gap:28px" },
      secao("Quem vai", linhasClicaveis(r.pessoas.map((x) => { const p = pessoa(x); return [p.nome, p.cargo, () => abrirPessoa(x), x === "marina" ? el("span", { class: "avatar avatar-sm avatar-retrato" }, SK.retrato()) : el("span", { class: "avatar avatar-sm" }, p.iniciais)]; }))),
      secao("O que se decide ali", marcadores(r.decide)),
      secao("O que escala para fora", el("p", {}, r.escalaPara)),
      secao("Fontes", fontesLista(r.fontes)));
    SK.painel.abrir({ titulo: r.nome, sobre: r.quando, corpo });
  }
  SK.abrir = { pessoa: abrirPessoa, time: abrirTime, processo: abrirProcesso, reuniao: abrirReuniao, fora: abrirFora };

  /* W2: a primeira leitura, acima das abas (times e processos; nunca pessoas) */
  function resumoLeitura(c, sec) {
    const L = D.primeiraLeitura, e = SK.estado;
    const fig = (v, r) => { const n = el("span", { class: "numero-valor num" }, String(v)); SK.contar(n, 0, v, 700); return el("div", { class: "numero" }, n, el("span", { class: "numero-rotulo" }, r)); };
    const su = suite();
    const origem = e.conectadas.length ? "Isto veio do " + su.resumo + ", e de mais " + e.conectadas.length + (e.conectadas.length > 1 ? " fontes." : " fonte.") : "Isto veio só do " + su.resumo + ".";
    const grade = el("div", { class: "grade-cartoes resumo", style: "--min:280px" },
      el("section", { class: "cartao resumo-bloco entra", style: "--atraso:0ms" }, el("h2", { class: "resumo-tit" }, "Com pouco, já deu para ver"),
        el("div", { class: "resumo-figuras" }, fig(c.processos, "processos"), fig(c.pessoas, "pessoas envolvidas"), fig(c.times, "times")),
        el("p", { class: "t-pequeno texto-2" }, origem)),
      el("section", { class: "cartao resumo-bloco entra", style: "--atraso:60ms" }, el("h2", { class: "resumo-tit" }, "O que a Lume faz bem"),
        el("ul", { class: "resumo-lista" }, ...L.bem.map((t) => el("li", { class: "voz" }, el("span", { class: "resumo-marca resumo-bem", "aria-hidden": "true" }, SK.icone("check", "ico-sm")), el("span", {}, t))))),
      el("section", { class: "cartao resumo-bloco entra", style: "--atraso:120ms" }, el("h2", { class: "resumo-tit" }, "Onde o trabalho anda bem e onde trava"),
        el("ul", { class: "resumo-lista" }, ...L.andamento.map((x) => el("li", {}, el("span", { class: "resumo-marca " + (x.tipo === "bem" ? "resumo-bem" : "resumo-trava"), "aria-hidden": "true" }, x.tipo === "bem" ? SK.icone("check", "ico-sm") : el("span", { class: "resumo-ponto" })), el("span", {}, x.texto)))),
        el("button", { class: "link resumo-link", type: "button", on: { click: () => SK.ir(4) } }, "Ver onde trava")));
    const proximo = el("div", { class: "resumo-proximo" },
      el("p", { class: "resumo-proximo-txt" }, L.proximo),
      el("button", { class: "btn btn-secundario btn-sm", type: "button", on: { click: () => painelFontes(sec) } }, SK.icone("mais", "ico-sm"), "Conectar mais fontes"),
      el("div", { class: "resumo-perguntas" }, ...L.perguntas.map((q) => el("button", { class: "chip chip-pergunta", type: "button", on: { click: () => (q.ir === "buracos" ? SK.ir(4) : abrirProcesso(q.processo)) } }, q.texto))));
    return el("div", { class: "resumo-wrap" }, grade, proximo);
  }
  function painelFontes(sec, op) {
    const e = SK.estado;
    const med = cobMedidor(false); med.atualizar(e.conectadas, false);
    let mudou = false;
    const su = suite();
    const lista = el("ul", { class: "lista integ-lista" }, ...D.porGanho(su.id).map((it) => {
      const ligado = e.conectadas.includes(it.id);
      const acao = el("div", { class: "integ-acao" });
      const sub = el("span", { class: "integ-sub" + (ligado ? " integ-sub-ok" : "") }, ligado ? it.adicionou : "+ " + it.acrescentaria);
      const pronto = () => { const g = acao.querySelector(".integ-ganho"); acao.replaceChildren(...(g ? [g] : []), el("span", { class: "chip chip-ok" }, SK.icone("check", "ico-sm"), "Conectado")); if (g) { g.classList.add("integ-ganho-ok"); g.textContent = D.ganhoDe(it.id, su.id) + " pontos"; } sub.className = "integ-sub integ-sub-ok"; sub.textContent = it.adicionou; };
      if (ligado) pronto();
      else acao.append(el("button", { class: "btn btn-secundario btn-sm", type: "button", "aria-label": "Conectar " + it.nome, on: { click: (ev) => {
        const b = ev.currentTarget; b.disabled = true; b.replaceChildren(el("span", { class: "girando-tinta", style: { display: "block" } }));
        SK.depois(600, () => { if (!e.conectadas.includes(it.id)) e.conectadas.push(it.id); SK.salvar(); mudou = true; pronto(); med.atualizar(e.conectadas, true); SK.anunciar(it.feed); });
      } } }, "Conectar"));
      acao.prepend(el("span", { class: "integ-ganho num" + (ligado ? " integ-ganho-ok" : "") }, (ligado ? "" : "+") + D.ganhoDe(it.id, su.id) + " pontos"));
      return el("li", { class: "integ" }, SK.marca(it.id, "mf-sm"), el("div", { class: "integ-txt" }, el("span", { class: "integ-nome forte" }, it.nome), it.conceito ? el("span", { class: "tag-conceito tag-conceito-sm" }, "Conceito · ainda não disponível") : null, sub), acao);
    }));
    SK.painel.abrir({ titulo: "Conectar mais fontes", sobre: "Cada fonte mostra uma parte do trabalho que o e-mail não mostra.", corpo: el("div", { class: "pilha", style: "--gap:16px" }, med.el, lista),
      aoFechar: () => { if (op && op.aoFechar) { try { op.aoFechar(mudou); } catch (err) { console.error(err); } } if (mudou) SK.recarregar(); } });
  }

  SK.fontes = { abrir: (op) => painelFontes(null, op) };

  const ATO3 = {
    id: 3, titulo: "O cérebro",
    montar(sec) {
      const e = SK.estado;
      const c = D.contagem(e.conectadas);
      const nFontes = D[suite().fontes].length + e.conectadas.length;
      const med3 = cobMedidor(true); med3.atualizar(e.conectadas, false);
      const abas = el("div", { class: "segmentado", role: "tablist", "aria-label": "Formas de ver o cérebro" });
      const corpo = el("div", { class: "cerebro-corpo" });
      const VISTAS = [["processos", "Processos"], ["reunioes", "Reuniões"], ["pessoas", "Pessoas e times"]];
      VISTAS.forEach(([k, r]) => abas.append(el("button", { role: "tab", type: "button", id: "aba-" + k, "aria-selected": k === vista ? "true" : "false", "aria-controls": "vista", tabindex: k === vista ? "0" : "-1", on: { click: () => trocar(k), keydown: (ev) => {
        const i = VISTAS.findIndex((v) => v[0] === k);
        if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") { ev.preventDefault(); const n = VISTAS[(i + (ev.key === "ArrowRight" ? 1 : VISTAS.length - 1)) % VISTAS.length][0]; trocar(n); abas.querySelector("#aba-" + n).focus(); }
      } } }, r)));
      sec.append(el("div", { class: "cerebro" },
        el("div", { class: "cerebro-cabeca" },
          el("div", { class: "cerebro-tit" },
            el("h1", { class: "t-titulo" }, "O cérebro da Lume"),
            el("p", { class: "t-sub texto-2" }, c.pessoas + " pessoas, " + c.times + " times, " + c.processos + " processos e " + D.reunioesAgenda + " reuniões (" + c.reunioes + " decidem, " + (D.reunioesAgenda - c.reunioes) + " alinham), de " + nFontes + " fontes. Achei " + D.final.buracos + " lugares onde o trabalho trava.")),
          el("div", { class: "cerebro-acoes" }, med3.el, el("button", { class: "btn btn-primario btn-grande", type: "button", on: { click: () => SK.ir(4) } }, "Ver os " + D.final.buracos + " buracos", SK.icone("seta", "ico-sm")))),
        resumoLeitura(c, sec),
        el("div", { class: "cerebro-abas" }, abas, el("p", { class: "t-pequeno texto-2 cerebro-dica" }, "Clique em qualquer coisa para ver de onde veio.")),
        corpo));
      let primeira = true;
      function trocar(k) {
        vista = k;
        abas.querySelectorAll("[role=tab]").forEach((b) => { const sel = b.id === "aba-" + k; b.setAttribute("aria-selected", sel ? "true" : "false"); b.tabIndex = sel ? 0 : -1; });
        if (mapa) { mapa.destruir(); mapa = null; }
        corpo.replaceChildren();
        const v = el("div", { id: "vista", role: "tabpanel", "aria-labelledby": "aba-" + k, class: "vista" });
        corpo.append(v);
        SK.carregar(v, primeira ? 420 : 260, (x) => { if (k === "pessoas") vistaPessoas(x); else if (k === "processos") vistaProcessos(x); else vistaReunioes(x); }, k === "pessoas" ? "mapa" : k === "processos" ? "tabela" : "cartoes");
        primeira = false;
      }
      trocar(vista);
    },
    sair() { if (mapa) { mapa.destruir(); mapa = null; } },
  };
  SK.ato(ATO3);

  function vistaPessoas(v) {
    const box = el("div", { class: "cerebro-mapa canvas" });
    const mbox = el("div", { class: "cerebro-mapa-in" });
    box.append(mbox, el("div", { class: "legenda t-micro" },
      el("span", { class: "leg" }, el("span", { class: "leg-linha", "aria-hidden": "true" }), "quem escala para quem"),
      el("span", { class: "leg" }, el("span", { class: "leg-fora", "aria-hidden": "true" }), "gente de fora")));
    v.append(box);
    mapa = criarMapa(mbox, { interativo: true, aoEscolher: (tipo, id) => {
      if (tipo === "pessoa" || tipo === "externo") abrirPessoa(id);
      else if (tipo === "time") { mapa.focarTime(id); abrirTime(id, () => mapa && mapa.focarTime(null)); }
      else if (tipo === "processo") abrirProcesso(id); else if (tipo === "fora") abrirFora();
    } });
    mapa.tudo(SK.estado.conectadas, false);
  }
  function vistaProcessos(v) {
    const ps = procsVisiveis();
    const cab = el("div", { class: "tabela-cab t-micro", "aria-hidden": "true" }, el("span", {}, "Processo"), el("span", {}, "Com que frequência"), el("span", {}, "Quem faz"), el("span", {}, "Quem decide"), el("span", {}, "Certeza"), el("span", {}, "Fontes"));
    const lista = el("ul", { class: "lista tabela" }, ...ps.map((p, i) => el("li", { class: "entra", style: "--atraso:" + Math.min(i, 10) * 30 + "ms" }, el("button", { class: "linha linha-botao tabela-linha", type: "button", on: { click: () => abrirProcesso(p.id) } },
      el("span", { class: "tl-nome forte" }, p.nome, p.semDono ? el("span", { class: "chip chip-brasa chip-mini" }, "sem dono") : null),
      el("span", { class: "tl-freq num" }, p.frequencia),
      el("span", { class: "tl-quem" }, el("span", { class: "tl-rot" }, "Faz "), nomeDe(p.quem).split(" ")[0]),
      el("span", { class: "tl-aprova" }, el("span", { class: "tl-rot" }, "Decide "), p.aprova ? nomeDe(p.aprova).split(" ")[0] : "Ninguém"),
      el("span", { class: "tl-certeza" }, el("span", { class: "certeza certeza-" + (p.certeza === "alta" ? "alta" : "media"), "aria-hidden": "true" }), el("span", { class: "tl-rot" }, "Certeza"), p.certeza),
      el("span", { class: "tl-fontes" }, ...[...new Set(p.fontes.map((f) => f.fonte))].map((f) => el("span", { class: "fonte-mini", title: nomeFonte(f) }, f === "site" ? icoFonte(f) : SK.marca(f, "mf-xs"), el("span", { class: "sr-only" }, nomeFonte(f)))))))));
    v.append(el("div", { class: "cartao tabela-caixa" }, cab, lista, el("p", { class: "t-pequeno texto-2 tabela-pe" }, "Os " + ps.length + " mais frequentes de " + D.contagem(SK.estado.conectadas).processos + " processos.")));
  }
  function vistaReunioes(v) {
    const grade = el("div", { class: "grade-cartoes reunioes", style: "--min:300px" }, ...D.reunioes.map((r, i) => el("button", { class: "cartao reuniao entra", type: "button", style: "--atraso:" + i * 40 + "ms", on: { click: () => abrirReuniao(r.id) } },
      el("div", { class: "reuniao-topo" }, el("p", { class: "t-micro texto-2 reuniao-quando" }, el("span", { class: "chip chip-mini" + (r.tipo === "decide" ? " chip-decide" : "") }, r.tipo === "decide" ? "Decide" : "Alinha"), r.quando), el("span", { class: "avatares" }, ...r.pessoas.slice(0, 5).map((x) => x === "marina" ? el("span", { class: "avatar avatar-sm avatar-retrato", title: "Marina Duarte" }, SK.retrato()) : el("span", { class: "avatar avatar-sm" }, pessoa(x).iniciais)))),
      el("h2", { class: "reuniao-nome" }, r.nome),
      el("div", { class: "reuniao-bloco" }, el("p", { class: "t-micro texto-2" }, r.tipo === "decide" ? "O que se decide" : "O que se alinha"), el("p", { class: "t-pequeno" }, r.decide.join(". ") + ".")),
      el("div", { class: "reuniao-bloco reuniao-escala" }, el("p", { class: "t-micro texto-2" }, "Escala para"), el("p", { class: "t-pequeno" }, r.escalaPara)))));
    v.append(grade, el("p", { class: "t-pequeno texto-2 tabela-pe" }, D.reunioes.length + " de " + D.contagem(SK.estado.conectadas).reunioes + " reuniões que decidem."));
  }
})();
