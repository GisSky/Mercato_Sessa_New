# Diario di sviluppo — Mercato Digitale Comunale

Questo file ricostruisce, fase per fase, come è stato costruito il progetto: cosa è stato fatto, perché, e in quale commit. Serve come promemoria per riprendere il lavoro dopo una pausa, ed è complementare al [README.md](README.md) (che invece spiega *come installare e usare* l'app oggi, non la sua storia).

> Nota: le fasi 2 e 3 sono state svolte in sessioni/ambienti diversi da quello che ha scritto questo diario (probabilmente VS Code con l'estensione Claude), per cui i dettagli sono ricostruiti dai messaggi di commit e dal codice, non da memoria diretta.
>
> I link ai commit qui sotto puntano al repository GitHub del progetto.

---

## Fase 0 — Punto di partenza (11 agosto 2026)

Richiesta iniziale: una web app gestionale per un Comune, per gestire le bancarelle di un mercato, con Supabase come database. La cartella di lavoro (`Gestione_Mercato_Calude_CODE`) esisteva già ma era **vuota**.

Decisioni prese subito, insieme all'utente:
- Stack: **React + Vite + TypeScript** (scelto tra questa opzione e "HTML/JS semplice")
- Nessun progetto Supabase esistente → serviva crearlo da zero

## Fase 1 — Impianto base (commit [`b6306c7`](https://github.com/GisSky/Mercato_Sessa_New/commit/b6306c7), 11 ago 2026)

- Scaffolding con `npm create vite` (template `react-ts`)
- Aggiunte le librerie: `@supabase/supabase-js`, `react-router-dom`, `leaflet` + `react-leaflet`, Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Ostacoli tecnici incontrati e risolti**:
  - Node.js non era installato sulla macchina → installato dall'utente (Chocolatey) durante la sessione
  - Il percorso del progetto contiene una `&` (`01_Ricerca&Sviluppo`), che rompe `npm run dev`/`npm run build` quando Windows li esegue tramite `cmd.exe` (interpreta `&` come separatore di comandi). Aggirato lanciando Vite direttamente con `node node_modules/vite/bin/vite.js`, configurato in `.claude/launch.json`
- Schema database iniziale (`supabase/schema.sql`): tabelle `operatori`, `bancarelle`, `assegnazioni`, con Row Level Security (solo utenti autenticati) e dati di esempio
- Pagine create: Login, Dashboard (conteggi liberi/occupati/riservati), Mappa (Leaflet, bancarelle colorate per stato, click per dettagli/assegnazione), Operatori (CRUD + ricerca + export CSV), Assegnazioni (storico + export CSV)
- **Setup Supabase reale**: creato il progetto (`GisSky's Org`), eseguito lo schema SQL, creato un utente di test, configurato `.env` — verificato il login e le pagine funzionanti
- **Supporto poligoni**: `geometry_geojson` esteso da solo `Point` a `Point | Polygon | MultiPolygon`, la mappa disegna forme piene colorate per i poligoni
- **Importazione bancarelle da file** (pagina "Importa"): caricamento diretto di GeoJSON o shapefile zippato (libreria `shpjs`), con anteprima, validazione coordinate WGS84, e uno **step di mappatura manuale dei campi** (aggiunto dopo aver scoperto che i campi della feature class ArcGIS dell'utente — `ID posto`, `Stato`, `Superficie mq`... — non coincidevano con i nomi attesi). Gestito anche il caso "file non convertibile" (es. File Geodatabase `.gdb`) con istruzioni per la conversione via QGIS/`ogr2ogr`
- Pagina `CambiaPassword` già presente in questo commit

## Fase 2 — Multi-mercato e dashboard grafica (commit [`dca1ced`](https://github.com/GisSky/Mercato_Sessa_New/commit/dca1ced), 14 ago 2026)

- Nuova tabella **`mercati`** (piazze/mercati fisici distinti — prima l'app assumeva un solo mercato implicito)
- `bancarelle.mercato_id` collega ogni posto al suo mercato
- Nuovo hook `useMercati` e possibilità di scegliere/creare un mercato direttamente durante l'importazione
- Nuova pagina **Bancarelle**: elenco/modifica dedicata (prima la gestione passava solo dalla mappa), con `BancarellaFormModal`
- **Dashboard arricchita**: gauge e grafici a barre (componenti custom in `components/charts/`) su occupazione posti, copertura operatori, tipologie, composizione per mercato

## Fase 3 — Ortofoto, import operatori, fix login (commit [`3284621`](https://github.com/GisSky/Mercato_Sessa_New/commit/3284621), 17 ago 2026)

- **Livello ortofoto opzionale sulla Mappa**: sorgente WMS oppure ArcGIS ImageServer, configurabile via variabili d'ambiente (`VITE_WMS_ORTOFOTO_*` / `VITE_ESRI_ORTOFOTO_*`) — se non impostate, la mappa resta solo con lo sfondo stradale OpenStreetMap
- **Import operatori da file** (CSV/Excel): nuovo pannello `OperatoriImportPanel` + `utils/importOperatori.ts`, oltre all'inserimento manuale già esistente
- Anteprima mappa per riga nella pagina Bancarelle (`BancarellaMapPreview`)
- Fix: redirect automatico alla pagina Cambia password dopo aver cliccato il link di recupero password ricevuto via email

---

## Fase 4 — Consolidamento del repository (24 agosto 2026)

- Allineata la documentazione alle funzionalità effettivamente presenti: multi-mercato, gestione bancarelle, import operatori e ortofoto opzionale.
- Aggiunti al controllo versione `CLAUDE.md` e questo diario, così che regole operative e cronologia seguano il codice.
- Verificato che `.env` e gli altri file locali con credenziali siano esclusi da Git; nessuna credenziale risulta tracciata.
- Corretta un'incompatibilità TypeScript nel layer ArcGIS ImageServer: il layer ora estende esplicitamente `L.TileLayer`, mantenendo invariata la generazione delle richieste `exportImage`.
- Controllo qualità: type-check e build di produzione completati; lint senza errori, con tre avvisi non bloccanti. Vite segnala inoltre un bundle JavaScript grande, da ottimizzare prima del rilascio pubblico.

---

## Stato attuale

- Repository consolidato con remote GitHub `github.com/GisSky/Mercato_Sessa_New`
- Il nome del remote ("Sessa") suggerisce che il mercato di destinazione reale sia quello del Comune di Sessa (Aurunca?) — da confermare
- Database Supabase configurato e popolato (dati di esempio + eventuali importazioni reali fatte nel frattempo)
- L'app è un MVP operativo per un singolo ente; ruoli e isolamento multi-Comune restano da progettare prima della produzione SaaS

## Come riprendere il lavoro

1. Apri la cartella in VS Code (o in questa sessione)
2. `npm install` per allineare le dipendenze
3. Verifica che `.env` contenga URL/anon key Supabase corretti (non è versionato su git)
4. `npm run dev` per avviare il server locale (se lanci da terminale e hai lo stesso problema della `&` nel percorso, usa `node node_modules/vite/bin/vite.js` invece di `npm run dev`)
5. Per lo stato del database (tabelle, righe, eventuali migrazioni SQL non ancora applicate), usa il connettore Supabase MCP se disponibile, oppure la dashboard di Supabase direttamente

Per l'installazione da zero su una macchina nuova, segui invece il [README.md](README.md).
