# Minigolf – skóre

Webová aplikace na zapisování skóre na 18 jamek. Data se ukládají do Google Sheets, takže
hru vidí a může do ní zapisovat kdokoli, kdo má odkaz — na telefonu, tabletu i počítači.

## Co to umí

### Hra
- Nová hra: datum, místo, 1–12 hráčů, obrázek ke každému hráči
- Jednokolová nebo dvoukolová hra (dvě kola na každé jamce, vítězí součet obou)
- Našeptávání jmen z minulých her a tlačítko „hrát znovu se stejnou partou"
- Mřížka 18 jamek, otevřít se dá kterákoli, pořadí jamek je libovolné
- Klávesnice 1–10 plus tlačítko **Nedal** (jamka nedaná ani na 10. pokus = 12 bodů)
- Po zápisu skok na dalšího hráče; po dokončení kola skok do druhého kola, pak na další jamku
- Přejetí prstem doleva/doprava přepíná jamky
- Ukončením se hra uzamkne a zobrazí stupně vítězů; odemknout jde přes ⋯

### Přehledy
- Průběžné pořadí podle součtu úderů (žádný par, vyhrává nejnižší číslo)
- Karta se všemi jamkami; na telefonu otočená, aby se vešla bez posouvání
- Statistiky hry: průměry, obtížnost jamek, rozpis kdo co nahrál
- Kariéra napříč hrami: průměry, výhry, rekordy, vzájemné souboje hráč proti hráči
- Sdílení výsledku jako obrázek do chatu, nebo odkazem na živou hru

### Provoz
- Zápis se ukládá do Sheets okamžitě, bez čekání na potvrzení
- Změny ostatních se načtou po zavření jamky, každých 10 s a po návratu do appky
- Bez signálu se zápisy schovají do fronty a odešlou samy
- Světlý i tmavý motiv, přidání na plochu telefonu (PWA)

### Změna pravidel

Na začátku `<script>` v `index.html`:

```js
var HOLES = 18;       // počet jamek
var MAX_UDERU = 10;   // nejvyšší počet úderů, který jde zapsat
var NESPLNENO = 12;   // body za jamku, kterou hráč nedal
```

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
  - list `Skore`: `idHry`, `jamka`, `hrac` (index), `jmeno`, `udery`, `zmeneno`, `kolo`
