# Istruzioni per Claude Code su questo progetto

Mercato Digitale Comunale — web app React/TypeScript + Supabase per la gestione delle bancarelle di un mercato comunale. Per il contesto completo leggi prima [SVILUPPO.md](SVILUPPO.md) (diario di sviluppo: fasi, decisioni, ostacoli risolti) e [README.md](README.md) (setup e funzionalità).

## Mantenere aggiornato SVILUPPO.md

Dopo aver completato un lavoro non banale su questo progetto (nuova funzionalità, modifica allo schema database, refactor rilevante, fix di un problema non ovvio) — sia in questa sessione sia in VS Code — aggiungi una voce a `SVILUPPO.md` prima di chiudere il lavoro:

- Nuova sezione `## Fase N — <titolo breve> (<data>)` in fondo al file, prima di "Stato attuale"
- Poche righe: cosa è cambiato e perché, non un elenco esaustivo di ogni file toccato
- Se il lavoro corrisponde a un commit git, cita l'hash quando disponibile
- Aggiorna anche la sezione "Stato attuale" se sono cambiate cose come: schema database, variabili d'ambiente richieste, stato del remote git

Non serve aggiornarlo per micro-modifiche (typo, piccolo fix di stile, aggiustamenti che non cambiano comportamento o architettura).

## Altre convenzioni del progetto

- Interfaccia e testi utente in italiano (personale comunale non tecnico)
- Il percorso del progetto contiene una `&` (`01_Ricerca&Sviluppo`): `npm run dev`/`npm run build` da terminale possono rompersi su Windows per via di `cmd.exe`. Se succede, lancia direttamente `node node_modules/vite/bin/vite.js` (dev) o `... build`.
- `.env` non è versionato: contiene le chiavi Supabase reali. `.env.example` documenta le variabili disponibili.
- Le tabelle Supabase hanno RLS attiva per soli utenti autenticati — non serve la chiave `service_role` nel frontend.
