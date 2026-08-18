# Minigolf – skóre

Webová aplikace na zapisování skóre na 18 jamek. Data se ukládají do Google Sheets, takže
hru vidí a může do ní zapisovat kdokoli, kdo má odkaz — na telefonu, tabletu i počítači.

## Co to umí

- Nová hra: datum, místo, 1–12 hráčů
- Mřížka 18 jamek — otevřít se dá kterákoli, pořadí jamek je libovolné
- Zápis úderů velkou klávesnicí 1–10, přepínání hráčů uvnitř jamky
- Tlačítko **Nedal** pro jamku nedanou ani na 10. pokus — počítá se za 12 bodů a všude svítí jako červené NE
- Po zápisu appka sama skočí na dalšího hráče, kterému na jamce chybí skóre
- Průběžné pořadí podle součtu úderů (žádný par, vyhrává nejnižší číslo)
- Karta se všemi jamkami, sloupcem NE a součtem; na telefonu otočená (jamky pod sebou)
- Historie her — rozehrané a dohrané zvlášť, řazené podle data
- Data se načítají jen na vyžádání tlačítkem ⟳, aby appka nic nepřepisovala během psaní
- Funguje i bez signálu — zápisy se uloží a odešlou se, jakmile je internet zpátky
- Sdílení odkazu na konkrétní hru (`?game=...`)
- Přidání na plochu telefonu (PWA), světlý i tmavý režim

### Ovládání na mobilu

- Klepnutí na jamku otevře zápis, přejetí prstem doleva/doprava přepne na sousední jamku
- Na kartě otevřeš jamku klepnutím na její řádek
- Tečka vpravo nahoře ukazuje stav ukládání: zelená uloženo, modrá ukládám, červená čeká na odeslání

### Změna pravidel

Na začátku `<script>` v `index.html` jsou dvě proměnné:

```js
var MAX_UDERU = 10;   // nejvyšší počet úderů, který jde zapsat
var NESPLNENO = 12;   // body za jamku, kterou hráč nedal
```

Appka se podle nich přizpůsobí, včetně popisků a klávesnice.

## Nasazení – 3 kroky

### 1. Backend v Google Sheets

1. Otevři svůj sheet → **Rozšíření → Apps Script**
2. Smaž tam všechno a vlož obsah souboru `Code.gs`
3. Ulož (Ctrl+S)
4. Nahoře vyber funkci **`setup`** a klikni **Spustit**. Odklikni oprávnění.
   Vytvoří se listy `Hry` a `Skore`.
5. **Nasadit → Nové nasazení → typ: Webová aplikace**
   - Spustit jako: **Já**
   - Kdo má přístup: **Kdokoli**
6. Zkopíruj adresu, která končí na `/exec`

> V `index.html` je už zapsaná tvoje funkční adresa
> `.../AKfycbzSf9KrcYgfbif7SPNiCpZ_mElxpQkH7_EMbHL95GGt-IoARk4aOds7ot5VtGGMPZZ-/exec`,
> takže nemusíš měnit nic. Kdyby ses někdy potřeboval přepojit jinam, uprav řádek
> `var API_URL = ...` v `index.html`, nebo adresu vlož přímo v appce přes ozubené kolečko
> vpravo nahoře (uloží se v prohlížeči a má přednost před kódem).

> Pozor na dvě věci při dalších úpravách skriptu: změny se projeví až přes
> **Nasadit → Spravovat nasazení → tužka → Verze: Nová verze**, a **Kdo má přístup**
> musí zůstat na **Kdokoli** (ne „Kdokoliv s účtem Google" — ta volba vyžaduje přihlášení
> a appka se přes ni nespojí).

### 2. Nahrání na GitHub

Nahraj do repozitáře soubory `index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`
(soubor `Code.gs` klidně taky, jen pro pořádek — na webu se nepoužívá).

```bash
git add .
git commit -m "Minigolf scorekeeper"
git push
```

### 3. Zapnutí GitHub Pages

V repozitáři: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**

Za chvíli appka běží na `https://tvojejmeno.github.io/nazev-repa/`.

## Poznámky

- Aplikace komunikuje se Sheets přes JSONP, protože Apps Script neumí spolehlivě CORS.
  Proto všechny požadavky jdou jako GET — funguje to i ze statického GitHub Pages.
- Kdo zná adresu appky, může zapisovat. Heslo tam schválně není — na hřišti by jen zdržovalo.
  Kdybys chtěl zámek, dá se do `Code.gs` přidat kontrola sdíleného kódu.
- Změny v Apps Scriptu se projeví až po **Nasadit → Spravovat nasazení → Nová verze**.
- Struktura dat:
  - list `Hry`: `id`, `datum`, `misto`, `hraci` (JSON), `par` (JSON), `maxUderu`, `stav`, `poznamka`, `vytvoreno`, `zmeneno`
  - list `Skore`: `idHry`, `jamka`, `hrac` (index), `jmeno`, `udery`, `zmeneno`
