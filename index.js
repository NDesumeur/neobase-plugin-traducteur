// Traducteur, plugin NeoBase autonome (permission « network » : service MyMemory, gratuit, sans compte).
const LANGS = {auto: 'Détecter la langue', fr: 'Français', en: 'Anglais', es: 'Espagnol', de: 'Allemand', it: 'Italien', pt: 'Portugais', nl: 'Néerlandais', ru: 'Russe', ja: 'Japonais', ko: 'Coréen', zh: 'Chinois', ar: 'Arabe', tr: 'Turc', pl: 'Polonais', sv: 'Suédois', da: 'Danois', no: 'Norvégien', fi: 'Finnois', el: 'Grec', cs: 'Tchèque', hu: 'Hongrois', ro: 'Roumain', uk: 'Ukrainien', he: 'Hébreu', hi: 'Hindi', th: 'Thaï', vi: 'Vietnamien'};
const chunks = t => { const out = []; let cur = ''; for (const s of t.match(/[^.!?\n]+[.!?\n]*|\n/g) || [t]) { if ((cur + s).length > 450 && cur) { out.push(cur); cur = ''; } cur += s; } if (cur) out.push(cur); return out; };
export default function (ctx) {
  const el = ctx.el;
  let timer = null, seq = 0;
  const S = el('style');
  S.textContent = `
    .tr{padding:18px;display:flex;flex-direction:column;gap:12px}
    .tr .main{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}
    .tr .box{flex:1;min-width:240px;display:flex;flex-direction:column;gap:8px;background:color-mix(in srgb,var(--line,#2a1d52) 35%,var(--bg0,#0b031c));padding:12px;box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e)}
    .tr select,.tr textarea{background:color-mix(in srgb,var(--bg0,#0b031c) 70%,#000);color:#fff;border:2px solid var(--line2,#3a2a6e);font:15px var(--text,sans-serif);padding:8px 10px;outline:0}
    .tr textarea{min-height:200px;resize:vertical}
    .tr button{font:12px var(--title,monospace);color:#fff;border:0;padding:9px 13px;cursor:pointer;background:color-mix(in srgb,var(--violet,#8a5cf0) 70%,#000)}
    .tr .swap{align-self:center}
    .tr .hint{color:var(--muted,#8f7bb8);font-size:13px}`;
  const from = el('select'), to = el('select');
  for (const [k, n] of Object.entries(LANGS)) { from.append(Object.assign(el('option', '', n), {value: k})); if (k !== 'auto') to.append(Object.assign(el('option', '', n), {value: k})); }
  from.value = 'auto'; to.value = 'fr';
  const inp = el('textarea'); inp.placeholder = 'Écris ou colle un texte…';
  const count = el('div', 'hint'), info = el('div', 'hint');
  const out = el('textarea'); out.readOnly = true; out.placeholder = 'Traduction';
  const copy = el('button', '', 'Copier'), swap = el('button', 'swap', '⇄');
  const b1 = el('div', 'box'); b1.append(from, inp, count);
  const b2 = el('div', 'box'); b2.append(to, out, copy);
  const main = el('div', 'main'); main.append(b1, swap, b2);
  const wrap = el('div', 'tr'); wrap.append(main, info, el('div', 'hint', 'Service MyMemory : environ 5 000 caractères par jour.'));
  ctx.view.append(S, wrap);

  async function run() {
    const text = inp.value, f = from.value, t = to.value, s = ++seq;
    count.textContent = text.length + ' caractères';
    if (!text.trim()) { out.value = ''; info.textContent = ''; return; }
    info.textContent = 'Traduction…';
    try {
      const parts = []; let detected = '';
      for (const c of chunks(text)) {
        if (!c.trim()) { parts.push(c); continue; }
        const d = JSON.parse((await ctx.net('https://api.mymemory.translated.net/get?langpair=' + encodeURIComponent((f === 'auto' ? 'autodetect' : f) + '|' + t) + '&q=' + encodeURIComponent(c))).body);
        if (d.responseStatus != 200) throw new Error(d.responseDetails || 'service indisponible');
        detected ||= d.responseData.detectedLanguage || '';
        parts.push(d.responseData.translatedText + (c.endsWith('\n') ? '\n' : ' '));
      }
      if (s !== seq) return;
      const tx = el('textarea'); tx.innerHTML = parts.join('').trim(); out.value = tx.value;
      info.textContent = f === 'auto' && detected ? 'Langue détectée : ' + (LANGS[detected.slice(0, 2).toLowerCase()] || detected) : '';
    } catch (e) { if (s === seq) info.textContent = 'Traduction impossible : ' + e.message; }
  }
  inp.oninput = () => { clearTimeout(timer); timer = setTimeout(run, 700); };
  from.onchange = to.onchange = run;
  swap.onclick = () => { if (from.value === 'auto') from.value = to.value === 'fr' ? 'en' : 'fr'; const a = from.value; from.value = to.value; to.value = a; if (out.value) inp.value = out.value; run(); };
  copy.onclick = async () => { try { await navigator.clipboard.writeText(out.value); ctx.ui.toast('Traduction copiée'); } catch { ctx.ui.toast('Copie impossible', true); } };
}
