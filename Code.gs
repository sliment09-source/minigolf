/**
 * Minigolf – skóre  |  backend pro Google Sheets
 * ------------------------------------------------
 * Vloz tento kod do Apps Scriptu (Rozsireni > Apps Script), uloz,
 * spust jednou funkci `setup` a pak nasad jako webovou aplikaci:
 *   Nasadit > Nove nasazeni > Webova aplikace
 *   Spustit jako: Ja
 *   Kdo ma pristup: Kdokoli
 *
 * API (vsechno pres GET, kvuli CORS se pouziva JSONP):
 *   ?action=ping
 *   ?action=games
 *   ?action=game&id=g123
 *   ?action=newGame&payload={"datum":"2026-08-18","misto":"Poruba","hraci":["Tom"],"par":[2,...],"maxUderu":7}
 *   ?action=score&id=g123&hole=1&player=0&strokes=3        (strokes prazdne = smazat)
 *   ?action=updateGame&id=g123&payload={"misto":"...","hraci":[...],"stav":"finished"}
 *   ?action=deleteGame&id=g123
 * Kazdy pozadavek muze mit &callback=nazevFunkce pro JSONP.
 */

var SHEET_ID = '1oU98-VECumHUBgU2UBBM4INauyMLcQZo6Y6cvsxKM1c';

var GAMES = 'Hry';
var SCORES = 'Skore';

var GAMES_HEADER = ['id', 'datum', 'misto', 'hraci', 'par', 'maxUderu', 'stav', 'poznamka', 'vytvoreno', 'zmeneno'];
var SCORES_HEADER = ['idHry', 'jamka', 'hrac', 'jmeno', 'udery', 'zmeneno'];

/** Jednorazova priprava listu. Spust rucne z editoru. */
function setup() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  ensureSheet_(ss, GAMES, GAMES_HEADER);
  ensureSheet_(ss, SCORES, SCORES_HEADER);
  return 'Hotovo: listy ' + GAMES + ' a ' + SCORES + ' jsou pripravene.';
}

function ensureSheet_(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var first = sh.getRange(1, 1, 1, header.length).getValues()[0];
  if (String(first[0]).trim() !== header[0]) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
  }
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

function sheet_(name) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return ensureSheet_(ss, name, name === GAMES ? GAMES_HEADER : SCORES_HEADER);
}

/* ---------- routing ---------- */

function doGet(e) {
  return handle_(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var p = {};
  if (e && e.parameter) for (var k in e.parameter) p[k] = e.parameter[k];
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      for (var k2 in body) p[k2] = body[k2];
    } catch (err) { /* neni JSON, ignorujeme */ }
  }
  return handle_(p);
}

function handle_(p) {
  var action = p.action || 'ping';
  var out;
  try {
    switch (action) {
      case 'ping':       out = { ok: true, time: Date.now() }; break;
      case 'games':      out = { ok: true, games: listGames_() }; break;
      case 'game':       out = getGame_(p.id); break;
      case 'newGame':    out = newGame_(parsePayload_(p.payload)); break;
      case 'score':      out = setScore_(p.id, p.hole, p.player, p.strokes, p.jmeno); break;
      case 'updateGame': out = updateGame_(p.id, parsePayload_(p.payload)); break;
      case 'deleteGame': out = deleteGame_(p.id); break;
      default: throw new Error('Neznama akce: ' + action);
    }
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return reply_(out, p.callback);
}

function reply_(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function parsePayload_(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  return JSON.parse(raw);
}

/* ---------- cteni ---------- */

function listGames_() {
  var rows = sheet_(GAMES).getDataRange().getValues();
  var scoreRows = sheet_(SCORES).getDataRange().getValues();

  var totals = {}; // idHry -> { hracIdx: {soucet, jamky} }
  for (var s = 1; s < scoreRows.length; s++) {
    var r = scoreRows[s];
    if (!r[0]) continue;
    var udery = Number(r[4]);
    if (!udery) continue;
    var g = totals[r[0]] || (totals[r[0]] = {});
    var pi = Number(r[2]);
    var acc = g[pi] || (g[pi] = { soucet: 0, jamky: 0 });
    acc.soucet += udery;
    acc.jamky += 1;
  }

  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;
    var hraci = safeJson_(row[3], []);
    var t = totals[row[0]] || {};
    var vysledky = hraci.map(function (jmeno, idx) {
      var acc = t[idx] || { soucet: 0, jamky: 0 };
      return { jmeno: jmeno, soucet: acc.soucet, jamky: acc.jamky };
    });
    var maxJamek = 0;
    vysledky.forEach(function (v) { if (v.jamky > maxJamek) maxJamek = v.jamky; });
    out.push({
      id: row[0],
      datum: asDate_(row[1]),
      misto: row[2] || '',
      hraci: hraci,
      par: safeJson_(row[4], []),
      maxUderu: Number(row[5]) || 7,
      stav: row[6] || 'active',
      poznamka: row[7] || '',
      vytvoreno: asMillis_(row[8]),
      zmeneno: asMillis_(row[9]),
      vysledky: vysledky,
      odehranoJamek: maxJamek
    });
  }
  out.sort(function (a, b) {
    if (a.datum === b.datum) return b.vytvoreno - a.vytvoreno;
    return a.datum < b.datum ? 1 : -1;
  });
  return out;
}

function getGame_(id) {
  if (!id) throw new Error('Chybi id hry.');
  var rows = sheet_(GAMES).getDataRange().getValues();
  var found = null;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) { found = rows[i]; break; }
  }
  if (!found) throw new Error('Hra nenalezena: ' + id);

  var scoreRows = sheet_(SCORES).getDataRange().getValues();
  var skore = [];
  for (var s = 1; s < scoreRows.length; s++) {
    var r = scoreRows[s];
    if (r[0] !== id) continue;
    if (!Number(r[4])) continue;
    skore.push({ jamka: Number(r[1]), hrac: Number(r[2]), udery: Number(r[4]) });
  }

  return {
    ok: true,
    game: {
      id: found[0],
      datum: asDate_(found[1]),
      misto: found[2] || '',
      hraci: safeJson_(found[3], []),
      par: safeJson_(found[4], []),
      maxUderu: Number(found[5]) || 7,
      stav: found[6] || 'active',
      poznamka: found[7] || '',
      vytvoreno: asMillis_(found[8]),
      zmeneno: asMillis_(found[9])
    },
    skore: skore
  };
}

/* ---------- zapis ---------- */

function newGame_(data) {
  var hraci = (data.hraci || []).map(function (h) { return String(h || '').trim(); })
    .filter(function (h) { return h.length > 0; });
  if (!hraci.length) throw new Error('Zadej aspon jednoho hrace.');

  var par = Array.isArray(data.par) && data.par.length === 18
    ? data.par.map(function (p) { return Number(p) || 2; })
    : repeat_(2, 18);

  var id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  var now = new Date();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sheet_(GAMES).appendRow([
      id,
      String(data.datum || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd')),
      String(data.misto || ''),
      JSON.stringify(hraci),
      JSON.stringify(par),
      Number(data.maxUderu) || 7,
      'active',
      String(data.poznamka || ''),
      now,
      now
    ]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, id: id, game: getGame_(id).game };
}

function setScore_(id, hole, player, strokes, jmeno) {
  if (!id) throw new Error('Chybi id hry.');
  var h = Number(hole), pi = Number(player);
  if (!(h >= 1 && h <= 18)) throw new Error('Jamka musi byt 1-18.');
  if (!(pi >= 0)) throw new Error('Neplatny hrac.');
  var val = (strokes === '' || strokes === null || strokes === undefined) ? '' : Number(strokes);
  if (val !== '' && !(val >= 1 && val <= 30)) throw new Error('Pocet uderu musi byt 1-30.');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(SCORES);
    var rows = sh.getDataRange().getValues();
    var target = -1;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id && Number(rows[i][1]) === h && Number(rows[i][2]) === pi) { target = i + 1; break; }
    }
    var now = new Date();
    if (val === '') {
      if (target > 0) sh.deleteRow(target);
    } else if (target > 0) {
      sh.getRange(target, 4, 1, 3).setValues([[jmeno || rows[target - 1][3] || '', val, now]]);
    } else {
      sh.appendRow([id, h, pi, jmeno || '', val, now]);
    }
    touchGame_(id, now);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, jamka: h, hrac: pi, udery: val === '' ? null : val };
}

function updateGame_(id, data) {
  if (!id) throw new Error('Chybi id hry.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(GAMES);
    var rows = sh.getDataRange().getValues();
    var target = -1;
    for (var i = 1; i < rows.length; i++) { if (rows[i][0] === id) { target = i + 1; break; } }
    if (target < 0) throw new Error('Hra nenalezena: ' + id);

    if (data.datum !== undefined) sh.getRange(target, 2).setValue(String(data.datum));
    if (data.misto !== undefined) sh.getRange(target, 3).setValue(String(data.misto));
    if (data.hraci !== undefined) {
      var hraci = data.hraci.map(function (x) { return String(x || '').trim(); })
        .filter(function (x) { return x.length > 0; });
      if (!hraci.length) throw new Error('Hra musi mit aspon jednoho hrace.');
      sh.getRange(target, 4).setValue(JSON.stringify(hraci));
    }
    if (data.par !== undefined) sh.getRange(target, 5).setValue(JSON.stringify(data.par));
    if (data.maxUderu !== undefined) sh.getRange(target, 6).setValue(Number(data.maxUderu) || 7);
    if (data.stav !== undefined) sh.getRange(target, 7).setValue(String(data.stav));
    if (data.poznamka !== undefined) sh.getRange(target, 8).setValue(String(data.poznamka));
    sh.getRange(target, 10).setValue(new Date());
  } finally {
    lock.releaseLock();
  }
  return { ok: true, game: getGame_(id).game };
}

function deleteGame_(id) {
  if (!id) throw new Error('Chybi id hry.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var gh = sheet_(GAMES);
    var grows = gh.getDataRange().getValues();
    for (var i = grows.length - 1; i >= 1; i--) {
      if (grows[i][0] === id) gh.deleteRow(i + 1);
    }
    var sh = sheet_(SCORES);
    var srows = sh.getDataRange().getValues();
    for (var j = srows.length - 1; j >= 1; j--) {
      if (srows[j][0] === id) sh.deleteRow(j + 1);
    }
  } finally {
    lock.releaseLock();
  }
  return { ok: true, id: id };
}

function touchGame_(id, when) {
  var sh = sheet_(GAMES);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) { sh.getRange(i + 1, 10).setValue(when || new Date()); return; }
  }
}

/* ---------- pomocne ---------- */

function safeJson_(raw, fallback) {
  if (raw === '' || raw === null || raw === undefined) return fallback;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

function asDate_(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

function asMillis_(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  var n = Number(v);
  if (!isNaN(n) && n > 0) return n;
  var d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function repeat_(value, n) {
  var a = [];
  for (var i = 0; i < n; i++) a.push(value);
  return a;
}
