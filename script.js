// Compares two Moxfield deck exports. Cards are matched by name; a quantity
// change counts as cards removed or added. Images and prices come from Scryfall.

const $ = (id) => document.getElementById(id);
const status = (text) => ($('status').textContent = text);

// "1 Sol Ring (C21) 263 *F*" -> { qty, name, set, number }. Section headers,
// blank lines and comments don't match and are skipped.
const LINE = /^(\d+)x?\s+(.+?)(?:\s+\(([A-Za-z0-9]+)\)(?:\s+([^\s*]+))?)?((?:\s+\*[A-Za-z]+\*)*)\s*$/;
// Front face of a double-faced card: Moxfield writes "A / B", Scryfall "A // B".
const frontFace = (name) => name.split(/ \/\/? /)[0];

function parse(text) {
  const cards = new Map(); // lowercase name -> { name, qty, set, number }
  const skipped = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(LINE);
    if (!m) { skipped.push(line); continue; }
    const [, qty, name, set, number, marks] = m;
    const key = frontFace(name).toLowerCase(); // double-faced cards match by front face
    const card = cards.get(key) || { name, qty: 0, set, number, marks: marks.trim() };
    card.qty += Number(qty);
    cards.set(key, card);
  }
  return { cards, skipped };
}

// Scryfall's /cards/collection takes 75 cards per request. Looks up each card's
// exact printing when the list has one, and by name otherwise (or if that fails).
async function fetchCards(entries) {
  const found = new Map(); // lowercase name -> Scryfall card
  const lookup = async (ids) => {
    for (let i = 0; i < ids.length; i += 75) {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifiers: ids.slice(i, i + 75).map((x) => x.id) }),
      });
      if (!res.ok) throw new Error(`Scryfall returned ${res.status}`);
      const { data } = await res.json();
      for (const card of data) {
        const match = ids.find((x) => !found.has(x.key) && matches(x, card));
        if (match) found.set(match.key, card);
      }
      await new Promise((r) => setTimeout(r, 500)); // Scryfall allows 2 requests/second to /cards/collection
    }
  };
  const matches = (x, card) => x.id.set
    ? card.set === x.id.set.toLowerCase() && card.collector_number === x.id.collector_number
    : [card.name, card.name.split(' // ')[0]].some((n) => n.toLowerCase() === x.key);

  await lookup(entries.map(([key, c]) => ({
    key, id: c.set && c.number ? { set: c.set, collector_number: c.number } : { name: c.name },
  })));
  const missing = entries.filter(([key]) => !found.has(key));
  if (missing.length) await lookup(missing.map(([key, c]) => ({ key, id: { name: frontFace(c.name) } })));
  return found;
}

const price = (card) => Number(card?.prices?.usd || card?.prices?.usd_foil || card?.prices?.usd_etched) || null;
const money = (n) => `$${n.toFixed(2)}`;

function tile(name, qty, card) {
  const div = document.createElement('div');
  div.className = 'tile';
  const art = document.createElement('div');
  art.className = 'art';
  const src = card?.image_uris?.normal || card?.card_faces?.[0]?.image_uris?.normal;
  if (src) art.append(Object.assign(document.createElement('img'), { src, alt: name, loading: 'lazy' }));
  else art.append(Object.assign(document.createElement('span'), { textContent: name }));
  if (qty > 1) art.append(Object.assign(document.createElement('span'), { className: 'qty', textContent: `${qty}×` }));
  const p = price(card);
  const label = Object.assign(document.createElement('div'), {
    className: 'price',
    textContent: p === null ? 'No price' : qty > 1 ? `${money(p * qty)} (${money(p)} ea)` : money(p),
  });
  div.append(art, label);
  div.addEventListener('mouseenter', () => showCard(name, card));
  return div;
}

// The left-hand viewer: every face's image, with the price under it.
function showCard(name, card) {
  const faces = card?.image_uris ? [card.image_uris.large] : (card?.card_faces || []).map((f) => f.image_uris?.large).filter(Boolean);
  const p = price(card);
  $('viewer').replaceChildren(
    ...faces.map((src) => Object.assign(document.createElement('img'), { src, alt: name })),
    Object.assign(document.createElement('p'), { textContent: p === null ? 'No price' : money(p) }),
  );
}

const SORTS = {
  price: (a, b, found) => (price(found.get(b.key)) || 0) - (price(found.get(a.key)) || 0),
  priceAsc: (a, b, found) => (price(found.get(a.key)) || 0) - (price(found.get(b.key)) || 0),
  name: () => 0,
  mv: (a, b, found) => (found.get(a.key)?.cmc ?? 99) - (found.get(b.key)?.cmc ?? 99),
  type: (a, b, found) => typeRank(found.get(a.key)) - typeRank(found.get(b.key)),
};

// Moxfield's grouping order; a card goes under its first matching type (front face only).
const TYPES = ['Creature', 'Planeswalker', 'Battle', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land'];
function typeRank(card) {
  const line = (card?.type_line || '').split(' // ')[0];
  const i = TYPES.findIndex((t) => line.includes(t));
  return i < 0 ? TYPES.length : i;
}

// Fills a grid with tiles.
function render(id, list, found) {
  const by = SORTS[$('sort').value];
  const grouped = $('group').value === 'type';
  const rank = (c) => typeRank(found.get(c.key));
  list.sort((a, b) => (grouped ? rank(a) - rank(b) : 0) || by(a, b, found) || a.name.localeCompare(b.name));
  // "Most common art" swaps New cards' images (not prices) for their most-printed artwork.
  const commonArtOn = id === 'added' && $('commonArt').checked;
  const tiles = list.map((c) => {
    const own = found.get(c.key), art = commonArtOn && commonArt.get(c.key);
    const el = tile(c.name, c.qty, art ? { ...own, image_uris: art.image_uris, card_faces: art.card_faces } : own);
    if (id !== 'same') { // old/new cards carry a ✕ / ✓ mark (see "Marking cards" below)
      el.item = c;
      el.classList.toggle('marked', !!c.marked);
    }
    return el;
  });
  // With grouping, a heading (type and card count) goes before each type's first card.
  $(id).replaceChildren(...list.flatMap((c, i) => {
    if (!grouped || (i && rank(list[i - 1]) === rank(c))) return [tiles[i]];
    const n = list.filter((x) => rank(x) === rank(c)).reduce((sum, x) => sum + x.qty, 0);
    return [Object.assign(document.createElement('div'), { className: 'group-label', textContent: `${TYPES[rank(c)] || 'Other'} (${n})` }), tiles[i]];
  }));
  $('n-' + id).textContent = `(${list.reduce((n, c) => n + c.qty, 0)})`;
}

let last = null; // the latest comparison, redrawn when the sort changes

function draw() {
  const { removed, added, same, found } = last;
  render('removed', removed, found);
  render('added', added, found);
  render('same', same, found);
  drawSelected();
}

const signed = (net) => `<b class="${net > 0 ? 'up' : net < 0 ? 'down' : ''}">${net >= 0 ? '+' : '−'}${money(Math.abs(net))}</b>`;

// Live total of the marked cards: ✕ old cards taken out, ✓ new cards put in.
function drawSelected() {
  const total = (list) => list.filter((c) => c.marked).reduce((sum, c) => sum + (price(last.found.get(c.key)) || 0) * c.qty, 0);
  const out = total(last.removed), inn = total(last.added);
  $('selected').innerHTML = `Removing <b>${money(out)}</b> · Adding <b>${money(inn)}</b> · Net ${signed(inn - out)}`;
}

$('sort').addEventListener('change', () => last && draw());
$('group').addEventListener('change', () => last && draw());
$('commonArt').addEventListener('change', () => last && draw());

// Light/dark toggle, remembered in this browser; defaults to the system setting.
// Solid sun / moon icons for the toggle (it offers the other mode).
const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 1.5v2.5M12 20v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M1.5 12H4M20 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('theme').innerHTML = theme === 'dark' ? `${SUN} Light mode` : `${MOON} Dark mode`;
  try { localStorage.setItem('theme', theme); } catch {}
}
let savedTheme = null;
try { savedTheme = localStorage.getItem('theme'); } catch {}
setTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

$('compare').addEventListener('click', async () => {
  const before = parse($('old').value), after = parse($('new').value);
  if (!before.cards.size || !after.cards.size) return status('Paste a deck list into both boxes.');

  const same = [], removed = [], added = [];
  for (const key of new Set([...before.cards.keys(), ...after.cards.keys()])) {
    const o = before.cards.get(key), n = after.cards.get(key);
    const oq = o?.qty || 0, nq = n?.qty || 0, name = (n || o).name;
    if (Math.min(oq, nq)) same.push({ key, name, qty: Math.min(oq, nq) });
    if (oq > nq) removed.push({ key, name, qty: oq - nq });
    if (nq > oq) added.push({ key, name, qty: nq - oq });
  }

  $('compare').disabled = true;
  status('Looking up cards on Scryfall…');
  try {
    // One printing per card name, from the new list when it's in both.
    const entries = [...new Map([...before.cards, ...after.cards]).entries()];
    const found = await fetchCards(entries);

    last = { removed, added, same, found, before: before.cards, after: after.cards };
    $('modified').value = '';
    draw();
    $('results').hidden = false;
    $('lists').classList.remove('locked');
    $('lists').open = false;
    loadSetGuide(added);

    const notFound = entries.filter(([key]) => !found.has(key)).map(([, c]) => c.name);
    const skipped = [...before.skipped, ...after.skipped];
    status([
      notFound.length && `Not found on Scryfall: ${notFound.join(', ')}.`,
      skipped.length && `Skipped ${skipped.length} line(s) that aren't cards (e.g. "${skipped[0]}").`,
    ].filter(Boolean).join(' '));
  } catch (e) {
    status(`Couldn't reach Scryfall: ${e.message}`);
  } finally {
    $('compare').disabled = false;
  }
});

// --- Set guide / bulk finder ------------------------------------------------
// Every paper printing of the added cards, ~20 cards per Scryfall search
// (175 printings per page, 500ms apart for its 2 requests/second limit).
// Cards in more than MAX_SETS paper sets (Sol Ring, Command Tower…) are left
// out: they're easy to find anywhere and would cost many requests.
const MAX_SETS = 30;
let printings = []; // [{ key, set, setName, rarity }]
let skippedNote = '';
let guideRun = 0;   // ignores a slow load once a newer comparison has started

async function loadSetGuide(added) {
  const run = ++guideRun;
  $('setguide').hidden = !added.length;
  if (!added.length) return;
  printings = [];
  commonArt = new Map();
  $('sets').replaceChildren();
  $('sets-status').textContent = 'Finding every printing of the added cards…';
  const out = [];
  try {
    for (let i = 0; i < added.length; i += 20) {
      const q = '(' + added.slice(i, i + 20).map((c) => `!"${frontFace(c.name).replace(/"/g, '')}"`).join(' or ')
        + `) game:paper -is:secretlair papersets<=${MAX_SETS}`;
      let url = 'https://api.scryfall.com/cards/search?' + new URLSearchParams({ q, unique: 'prints' });
      while (url) {
        await new Promise((r) => setTimeout(r, 500));
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (res.status === 404) break; // none of these cards found
        if (!res.ok) throw new Error(`Scryfall returned ${res.status}`);
        const page = await res.json();
        for (const c of page.data) {
          // The List is filtered here: a -set: term in the query would make Scryfall
          // include non-tournament sets (World Championship decks, Collector's Edition).
          if (c.set === 'plst' || c.set === 'ulst') continue;
          if (/secret lair/i.test(c.set_name)) continue; // backs up -is:secretlair, which misses some Secret Lair sets
          const rarity = ['special', 'bonus'].includes(c.rarity) ? 'mythic' : c.rarity;
          out.push({ key: c.name.split(' // ')[0].toLowerCase(), set: c.set, setName: c.set_name, rarity,
            art: c.illustration_id || c.card_faces?.[0]?.illustration_id, image_uris: c.image_uris, card_faces: c.card_faces });
        }
        url = page.has_more ? page.next_page : null;
      }
    }
  } catch (e) {
    if (run === guideRun) $('sets-status').textContent = `Couldn't load printings: ${e.message}`;
    return;
  }
  if (run !== guideRun) return;
  printings = out;
  findCommonArt(added);
  const kept = new Set(out.map((p) => p.key));
  const skipped = added.filter((c) => !kept.has(c.key)).map((c) => c.name).sort();
  skippedNote = skipped.length ? `Not shown (in more than ${MAX_SETS} sets, so easy to find anywhere): ${skipped.join(', ')}.` : '';
  drawSetGuide();
}

// Top 15 sets by how many different added cards have a printing there, at the checked rarities.
function drawSetGuide() {
  const rarities = new Set([...document.querySelectorAll('.rarities input:checked')].map((box) => box.value));
  const names = new Map(last.added.map((c) => [c.key, c.name]));
  const sets = new Map(); // set code -> { name, keys }
  for (const p of printings) {
    if (!rarities.has(p.rarity) || !names.has(p.key)) continue;
    if (!sets.has(p.set)) sets.set(p.set, { name: p.setName, keys: new Set() });
    sets.get(p.set).keys.add(p.key);
  }
  const top = [...sets.entries()].sort((a, b) => b[1].keys.size - a[1].keys.size || a[1].name.localeCompare(b[1].name)).slice(0, 15);
  const max = top[0]?.[1].keys.size || 1;
  const rows = top.map(([code, { name, keys }]) => {
    const row = Object.assign(document.createElement('div'), { className: 'set-row' });
    const label = Object.assign(document.createElement('div'), { textContent: `${name} (${code.toUpperCase()})` });
    const bar = Object.assign(document.createElement('div'), { className: 'bar', textContent: `${keys.size} of ${names.size}` });
    bar.style.width = `${(100 * keys.size) / max}%`;
    // Each name shows its card in the preview on hover, like the card grids.
    const list = Object.assign(document.createElement('div'), { className: 'names' });
    [...keys].sort((x, y) => names.get(x).localeCompare(names.get(y))).forEach((k, i) => {
      const span = Object.assign(document.createElement('span'), { textContent: names.get(k) });
      span.addEventListener('mouseenter', () => showCard(names.get(k), last.found.get(k)));
      list.append(...(i ? [', ', span] : [span]));
    });
    const right = document.createElement('div');
    right.append(bar, list);
    row.append(label, right);
    return row;
  });
  // Top 5 shown; the rest behind a "show more" toggle.
  const more = document.createElement('details');
  more.append(Object.assign(document.createElement('summary'), { textContent: `Show ${rows.length - 5} more sets` }), ...rows.slice(5));
  $('sets').replaceChildren(...rows.slice(0, 5), ...(rows.length > 5 ? [more] : []));
  $('sets-status').textContent = [top.length ? '' : 'No sets match the checked rarities.', skippedNote].filter(Boolean).join(' ');
}

document.querySelectorAll('.rarities input').forEach((box) => box.addEventListener('change', () => printings.length && drawSetGuide()));

// --- Modified decklist --------------------------------------------------------
// The old list, minus the ✕ old cards, plus the ✓ new cards, in Moxfield's export
// layout: commanders first, then everything else alphabetically.
$('generate').addEventListener('click', () => {
  if (!last) return;
  const deck = new Map([...last.before].map(([key, c]) => [key, { ...c }]));
  for (const c of last.removed) {
    if (!c.marked) continue;
    const card = deck.get(c.key);
    card.qty -= c.qty;
    if (card.qty <= 0) deck.delete(c.key);
  }
  for (const c of last.added) {
    if (!c.marked) continue;
    if (deck.has(c.key)) deck.get(c.key).qty += c.qty;
    else deck.set(c.key, { ...last.after.get(c.key), qty: c.qty });
  }
  const cmd = [...commanders(last.before), ...commanders(last.after)].filter((k) => deck.has(k));
  const rest = [...deck.keys()].filter((k) => !cmd.includes(k)).sort((a, b) => a.localeCompare(b));
  $('modified').value = [...new Set([...cmd, ...rest])].map((k) => deck.get(k))
    .map((c) => `${c.qty} ${c.name}` + (c.set ? ` (${c.set})` + (c.number ? ` ${c.number}` : '') : '') + (c.marks ? ` ${c.marks}` : ''))
    .join('\n');
});

// Moxfield lists the commander first, and a second commander right after it
// (partners, backgrounds…). The second card counts only if Scryfall's card
// text shows both can pair.
const PAIR_TEXT = /\b(Partner|Friends forever|Choose a Background|Doctor's companion)\b/;
const canPair = (card) => PAIR_TEXT.test(card?.oracle_text || card?.card_faces?.[0]?.oracle_text || '')
  || /\b(Background|Time Lord Doctor)\b/.test(card?.type_line || '');
function commanders(cards) {
  const [first, second] = cards.keys();
  return first === undefined ? [] : [first, ...(second && canPair(last.found.get(first)) && canPair(last.found.get(second)) ? [second] : [])];
}

// --- Most common art ----------------------------------------------------------
// From the set guide's printings (no extra requests): each added card's artwork
// used by the most printings. Skipped on a tie, when the list's own printing
// already uses it, or for cards the set guide skips (in more than MAX_SETS sets).
let commonArt = new Map(); // key -> a printing with that artwork

function findCommonArt(added) {
  commonArt = new Map();
  for (const c of added) {
    const counts = new Map();
    for (const p of printings) if (p.key === c.key && p.art) counts.set(p.art, (counts.get(p.art) || 0) + 1);
    const [[top, n] = [], [, second] = []] = [...counts].sort((a, b) => b[1] - a[1]);
    const own = last.found.get(c.key);
    if (!top || n === second || top === (own?.illustration_id || own?.card_faces?.[0]?.illustration_id)) continue;
    commonArt.set(c.key, printings.find((p) => p.key === c.key && p.art === top));
  }
  if ($('commonArt').checked) draw();
}

// Development only (config.js): start with the test decks filled in.
if (ENV === 'development') {
  $('old').value = SAMPLE_OLD;
  $('new').value = SAMPLE_NEW;
}

// --- Marking cards ------------------------------------------------------------
// Click toggles one Old/New card's mark. Click-and-drag draws a rectangle, and every
// card it touches takes the opposite of the starting card's state (mark or unmark a
// group); cards the rectangle leaves again go back to how they were. Holding the
// cursor near the top or bottom of the window scrolls the page, and the rectangle
// (anchored to the page, not the window) keeps growing.
const DRAG_START = 5;  // px of movement before a click becomes a drag
const EDGE = 60;       // px from the window edge where scrolling starts
const MAX_SCROLL = 20; // px per frame at the very edge
let drag = null;

const setMark = (tile, on) => tile.classList.toggle('marked', (tile.item.marked = on));

for (const id of ['removed', 'added']) {
  $(id).addEventListener('pointerdown', (e) => {
    const start = e.target.closest('.tile');
    if (!start || e.button !== 0) return;
    e.preventDefault(); // no text selection or image dragging
    const tiles = [...$(id).querySelectorAll('.tile')];
    drag = { start, x: e.pageX, y: e.pageY, cx: e.clientX, cy: e.clientY, tiles,
      before: tiles.map((t) => !!t.item.marked), target: !start.item.marked, box: null };
  });
}

// Redraws the rectangle from the start point to the cursor, in page coordinates.
function updateDrag() {
  const x = drag.cx + scrollX, y = drag.cy + scrollY;
  const left = Math.min(drag.x, x), right = Math.max(drag.x, x);
  const top = Math.min(drag.y, y), bottom = Math.max(drag.y, y);
  Object.assign(drag.box.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
  drag.tiles.forEach((t, i) => {
    const r = t.getBoundingClientRect();
    const hit = r.left + scrollX < right && r.right + scrollX > left && r.top + scrollY < bottom && r.bottom + scrollY > top;
    setMark(t, hit ? drag.target : drag.before[i]);
  });
  drawSelected();
}

// While dragging, scroll when the cursor is near the top or bottom edge (faster closer in).
function autoScroll() {
  if (!drag?.box) return;
  const down = drag.cy - (innerHeight - EDGE), up = EDGE - drag.cy;
  const step = down > 0 ? Math.min(down, EDGE) / EDGE * MAX_SCROLL : up > 0 ? -Math.min(up, EDGE) / EDGE * MAX_SCROLL : 0;
  if (step) {
    scrollBy(0, step);
    updateDrag();
  }
  requestAnimationFrame(autoScroll);
}

window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.cx = e.clientX;
  drag.cy = e.clientY;
  if (!drag.box) {
    if (Math.hypot(e.pageX - drag.x, e.pageY - drag.y) < DRAG_START) return;
    drag.box = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'marquee' }));
    requestAnimationFrame(autoScroll);
  }
  updateDrag();
});

function endDrag(e) {
  if (!drag) return;
  if (drag.box) drag.box.remove();
  else if (e.type === 'pointerup') setMark(drag.start, drag.target); // a plain click
  drag = null;
  drawSelected();
}
window.addEventListener('scroll', () => drag?.box && updateDrag()); // wheel/trackpad scrolling mid-drag
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
