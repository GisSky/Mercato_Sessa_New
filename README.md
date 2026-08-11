# Mercato Digitale Comunale

Web app gestionale per il Comune per la gestione delle bancarelle di un mercato: operatori, posti/bancarelle su mappa interattiva, assegnazioni e pagamenti.

Stack: **React + Vite + TypeScript**, **Supabase** (database, auth), **Leaflet** (mappa), **Tailwind CSS** (stile).

## 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com), crea un account/organizzazione e un **nuovo progetto**.
2. Scegli una password sicura per il database e attendi che il progetto sia pronto (1-2 minuti).
3. Nel menu laterale vai su **Project Settings → API**: qui trovi:
   - **Project URL** (es. `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public key**

## 2. Crea le tabelle

1. Nel progetto Supabase, apri **SQL Editor**.
2. Copia e incolla tutto il contenuto del file [`supabase/schema.sql`](supabase/schema.sql) di questo repository ed esegui (**Run**).
3. Questo crea le tabelle `operatori`, `bancarelle`, `assegnazioni`, le policy di sicurezza (RLS) e inserisce alcuni dati di esempio.

   > **Importante**: i dati di esempio nella tabella `bancarelle` usano coordinate GPS fittizie (Roma). Prima di usare l'app in produzione, sostituiscile con le coordinate reali della piazza/mercato del tuo Comune (o cancella i dati di esempio e inseriscine di nuovi tramite Supabase Table Editor).

## 3. Crea un utente per il login

L'app richiede il login. In Supabase:

1. Vai su **Authentication → Users → Add user**.
2. Crea un utente con email e password per ogni dipendente comunale che deve accedere (oppure disabilita la conferma email in **Authentication → Providers → Email** per test rapidi).

## 4. Configura le variabili d'ambiente

Nel file `.env` nella radice del progetto (già creato, da compilare) inserisci:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=la-tua-chiave-anon-pubblica
```

## 5. Installa ed avvia

```bash
npm install
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173) e accedi con l'utente creato al passo 3.

## Funzionalità

- **Login**: autenticazione tramite Supabase Auth (email/password).
- **Dashboard**: totale posti, liberi, occupati, riservati.
- **Mappa interattiva** (Leaflet): bancarelle colorate per stato (verde = libero, rosso = occupato, giallo = riservato). Click su una bancarella per vedere i dettagli, assegnare un operatore o liberare il posto. Filtri per stato e tipologia.
- **Operatori**: tabella con ricerca (nome, cognome, codice, CF/P.IVA, email), form di inserimento/modifica, eliminazione, esportazione CSV.
- **Assegnazioni**: storico assegnazioni operatore–bancarella con stato pagamento, filtro per stato pagamento, esportazione CSV.
- **Importa bancarelle**: caricamento diretto dall'app di un file GeoJSON o di uno shapefile compresso (.zip), con anteprima e importazione in blocco.

## Struttura del database

- **operatori**: anagrafica degli operatori del mercato.
- **bancarelle**: i posti del mercato, con stato (`libero`/`occupato`/`riservato`), tipologia, superficie e posizione geografica (`geometry_geojson`, GeoJSON `Point`, `Polygon` o `MultiPolygon` — la mappa disegna un pallino per i `Point` e la forma piena per `Polygon`/`MultiPolygon`).
- **assegnazioni**: collega un operatore a una bancarella per una data di mercato, con stato pagamento (`pagato`/`non_pagato`/`in_attesa`).

## Importare le bancarelle da uno shapefile poligonale (o File Geodatabase)

Se hai già i poligoni delle bancarelle in uno shapefile, puoi importarli direttamente al posto (o in aggiunta) dei dati di esempio. Ci sono due modi:

### Opzione A — dall'app (consigliata)

Nella pagina **Importa bancarelle** (visibile dopo il login) puoi caricare direttamente:

- un file **GeoJSON** (`.geojson`/`.json`), oppure
- uno **shapefile compresso in .zip** (contenente almeno `.shp`, `.dbf`, `.shx`, idealmente anche `.prj`).

> **File Geodatabase Esri (.gdb)**: non sono supportati direttamente — è un formato a cartella multi-file per cui non esiste una libreria affidabile lato browser. Esportane prima il layer in GeoJSON con QGIS (click destro sul layer → `Esporta` → `Salva oggetti geometrici con nome...` → CRS `EPSG:4326`) oppure con `ogr2ogr`:
> ```bash
> ogr2ogr -f GeoJSON -t_srs EPSG:4326 bancarelle.geojson percorso/mercato.gdb NOME_LAYER
> ```
> poi carica il file `.geojson` risultante come nell'opzione A. La stessa conversione vale anche per MapInfo TAB, KML, DXF e qualunque altro formato letto da GDAL/OGR.

L'app mostra un'anteprima delle bancarelle riconosciute (e di quelle scartate, con il motivo) prima di importarle. L'importazione usa la sessione dell'utente loggato (le policy RLS già configurate permettono agli utenti autenticati di scrivere), quindi **non serve nessuna chiave segreta**.

Prima di caricare, assicurati che:

1. Lo shapefile sia in coordinate **WGS84 (EPSG:4326)**. Se è in un altro sistema di riferimento (es. Gauss-Boaga, UTM), riproiettalo prima con QGIS (click destro sul layer → `Esporta` → `Salva oggetti geometrici con nome...` → CRS `EPSG:4326`) o con `ogr2ogr`:
   ```bash
   ogr2ogr -f GeoJSON -t_srs EPSG:4326 bancarelle.geojson bancarelle.shp
   ```
2. La tabella attributi contenga i campi:

   | Campo | Obbligatorio | Note |
   |---|---|---|
   | `id_posto` | Sì | Identificativo univoco del posto (es. `A-01`) |
   | `stato` | No | `libero` / `occupato` / `riservato` (default `libero`) |
   | `tipologia` | No | Es. `Alimentare`, `Abbigliamento`… |
   | `superficie` | No | Numero (mq) |
   | `note` | No | Testo libero |

L'importazione fa un **upsert** per `id_posto`: le bancarelle con lo stesso `id_posto` vengono aggiornate, le nuove vengono create.

### Opzione B — da riga di comando

Per importazioni molto grandi o automatizzate, è disponibile anche uno script Node ([`scripts/import-bancarelle.js`](scripts/import-bancarelle.js)) che legge un file GeoJSON già convertito e lo importa con la stessa logica di upsert:

```bash
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-bancarelle.js bancarelle.geojson
```

Richiede la chiave **service_role** (Project Settings → API), che bypassa la RLS: usala solo da terminale, in locale, mai nel frontend o nel file `.env` dell'app.

## Note sulla sicurezza

- Le tabelle hanno **Row Level Security** attiva: solo gli utenti autenticati (login effettuato) possono leggere/scrivere i dati.
- La chiave `anon` è pubblica per design (usata dal client Supabase), la sicurezza è garantita dalle policy RLS e dall'obbligo di login.
- Non committare mai il file `.env` con le chiavi reali (è già escluso da `.gitignore`).

## Build di produzione

```bash
npm run build
```

I file compilati vengono generati in `dist/`, pronti per essere pubblicati su un hosting statico (es. Vercel, Netlify, o il server web del Comune).
