# Incipit - biblioteca (BE + FE + PostgreSQL)

Catalogo di biblioteca: ricerca, scheda del libro, raccolta al banco e prestiti.
Pronto per il deploy su Render.

| Parte | Tecnologia | In locale | Su Render |
|---|---|---|---|
| Backend | Spring Boot 4.1.1, Java 25, Maven wrapper | `be` sulla 8080 | Web Service (Docker) |
| Frontend | React 19, Vite, JSX, Tailwind 4, react-router 8, Motion 13 | `fe` sulla 5173 | Static Site |
| Database | PostgreSQL | locale sulla 5432 | Render PostgreSQL |

## Endpoint

| Metodo | Percorso | Cosa fa |
|---|---|---|
| GET | `/api/stato` | nome del database collegato e ora del server |
| GET | `/actuator/health` | health check per Render |
| * | `/api/user`, `/api/book`, `/api/generi`, `/api/prestiti`, `/api/role`, `/api/costanti` | backend Biblioteca (JWT), vedi `be/postman/` |

## Avvio in locale

1. PostgreSQL sulla 5432 e database creato:
   ```
   createdb -U postgres biblioteca
   ```
   Credenziali diverse da `postgres` / `postgres`: copiare `be/.env.example` in `be/.env`
   e compilare `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `SUPERUSER_*`.
2. Doppio clic su `avvia.cmd`, oppure:
   ```
   cd be && .\mvnw.cmd spring-boot:run     (su macOS/Linux: ./mvnw spring-boot:run)
   cd fe && npm install && npm run dev
   ```
3. **Riempire il catalogo.** All'avvio il backend crea solo ruoli, costanti e
   SuperUser: generi e libri no. Con il backend acceso:
   ```
   cd fe && npm run semina
   ```
   Inserisce 187 libri e 28 generi da `fe/scripts/libri.json`, passando dalle API
   pubbliche (login come SuperUser, poi `newGenere` e `newLibro`). Rilanciarlo non
   crea duplicati: gli ISBN gia' presenti si limitano ad aggiungere copie.

   Gli ISBN sono reali e le copertine arrivano da Open Library, gia' risolte per
   CoverID nel campo `path` di ogni libro.

4. http://localhost:5173

### Account per la demo

`/register` assegna **sempre** il ruolo `User`: non ci si registra come Admin o
SuperUser.

- Il **SuperUser** lo crea il `DataInitializer` all'avvio, da `SUPERUSER_EMAIL`
  e `SUPERUSER_PASSWORD`. Ne esiste uno solo e non c'e' modo di crearne altri.
- L'**Admin** non si registra: ci si registra come `User` e poi un SuperUser
  promuove con `POST /api/role/grantAdmin/{id}`.

Per preparare i tre account in un colpo solo:

```
cd fe && npm run utenti
```

| Ruolo | Email | Password |
|---|---|---|
| User | `lettore@incipit.it` | `password123` |
| Admin | `bibliotecario@incipit.it` | `password123` |
| SuperUser | `superuser@biblioteca.it` | `changeme` |

I primi due sono di prova: in produzione vanno rimossi, e `SUPERUSER_*` cambiato.

Per promuovere un utente esistente:

```
npm run promuovi -- --elenca                     # id, email e ruoli di tutti
npm run promuovi -- --email mario@rossi.it       # -> Admin
npm run promuovi -- --email mario@rossi.it --revoca
```

Dopo una promozione **l'utente deve rifare il login**: i ruoli viaggiano dentro
il JWT e `RuoloService` revoca i token attivi.

### Chi puo' fare cosa

| Operazione | Ruolo minimo |
|---|---|
| Catalogo, ricerca, scheda libro | chiunque, anche anonimo |
| Elenco generi, propri prestiti, profilo | autenticato |
| Aprire/chiudere/estendere prestiti, nuovo libro, nuovo genere, leggere le regole, scheda iscritto | Admin |
| Modificare le regole, promuovere Admin, creare ruoli | SuperUser |

## Il frontend

| Percorso | Pagina |
|---|---|
| `/` | landing, manifesto che si scopre con lo scroll |
| `/catalogo` | ricerca, filtro per genere e disponibilita', paginazione |
| `/libro/:id` | scheda, con il libro che si apre in 3D |
| `/da-leggere` | lista personale del lettore (solo su quel browser) |
| `/banco` | riservata: la pila da registrare, un iscritto alla volta |
| `/prestiti` | i propri prestiti, con scadenze |
| `/profilo` | anagrafica, tessera, statistiche, consigli, storico |
| `/amministrazione` | riservata: prestiti, iscritti, catalogo, regole, ruoli |
| `/accedi`, `/registrati` | autenticazione JWT |

### Chi vede cosa

`POST /api/prestiti/NewPrestito` richiede `Admin` o `SuperUser` e un `userId`
nel corpo: e' l'operatore che apre il prestito per conto di qualcuno. Il
frontend rispecchia questo, invece di fingere il contrario.

**Il lettore** consulta il catalogo, tiene una lista *Da leggere* (localStorage,
solo su quel dispositivo, non prenota nulla), vede i propri prestiti e le
scadenze, e ha una **tessera** nel profilo: il codice che l'operatore usa per
identificarlo. Nessun pulsante che somigli a "prendi in prestito".

**L'operatore** ha due strade, entrambe una registrazione per libro:
- **il banco** (`/banco`), per quando l'iscritto porta una pila: si sceglie
  l'iscritto una volta e si registra tutto;
- **Presta subito**, dalla scheda del singolo libro.

Il selettore dell'iscritto ricostruisce l'elenco da `AllPrestiti` piu' una
cache locale di chi e' gia' passato, e accetta il codice della tessera: serve
perche' il backend non espone nessun elenco degli utenti.

## Deploy su Render

1. Repository Git con `be/`, `fe/`, `render.yaml` nella radice.
2. **New > Blueprint**, si sceglie la repo: nascono `app-db`, `app-be`, `app-fe`
   (rinominarli in `render.yaml` prima del primo deploy).
3. Dopo la prima build si impostano le variabili `sync: false` (URL senza `/` finale):

   | Servizio | Variabile | Valore |
   |---|---|---|
   | `app-be` | `ALLOWED_ORIGIN` | `https://app-fe.onrender.com` |
   | `app-be` | `SUPERUSER_EMAIL` | email del SuperUser |
   | `app-be` | `SUPERUSER_PASSWORD` | password del SuperUser |
   | `app-fe` | `VITE_API_URL` | `https://app-be.onrender.com` |

   `JWT_SECRET` e' generata da Render.

4. **Manual Deploy** di entrambi (`VITE_API_URL` e' letta in fase di build).
5. **Riempire il catalogo in produzione**, dalla propria macchina:
   ```
   cd fe
   node scripts/semina.mjs --api https://app-be.onrender.com \
                           --email <SUPERUSER_EMAIL> --password <SUPERUSER_PASSWORD>
   ```
   Il primo tentativo puo' fallire: sul piano free il backend va in sospensione e
   il primo risveglio richiede una trentina di secondi. Basta rilanciare.

## Struttura

```
render.yaml                 blueprint: database + backend + frontend
avvia.cmd                   avvio locale
be/
  Dockerfile                usato solo da Render
  .env.example              variabili locali (copiare in .env)
  postman/                  collection e environment Postman
  src/main/java/com/example/demo/
    DemoApplication.java
    config/DatabaseUrl.java   DATABASE_URL -> formato JDBC
    config/DataInitializer.java  ruoli, costanti e SuperUser all'avvio
    security/SecurityConfig.java JWT + CORS (origini da ALLOWED_ORIGIN)
    controllers/              API Biblioteca + StatoController (prova)
    services/ repositories/ entities/ dto/
  src/main/resources/application.properties
fe/
  scripts/semina.mjs        riempie il catalogo via API (npm run semina)
  scripts/libri.json        187 libri con ISBN reali e copertine Open Library
  scripts/utenti-demo.mjs   crea gli account User e Admin (npm run utenti)
  scripts/promuovi.mjs      promuove/revoca Admin (npm run promuovi)
  src/App.jsx               le rotte
  src/lib/api.js            fetch, token JWT e traduzione degli errori
  src/lib/tema.js           tema chiaro/scuro
  src/components/
    Layout.jsx              header, logo cliccabile, menu per ruolo, tema
    Logo.jsx                la I col segnalibro, si disegna da sola
    Sessione.jsx            login, logout, ruoli
    Raccolta.jsx            banco (operatore) o Da leggere (lettore) + volo
    SelettoreIscritto.jsx   ricerca iscritto e lettura della tessera
    Tessera.jsx             la tessera con il codice dell'iscritto
    Prestiti.jsx            prestiti attivi, restituzione ed estensione
    AvvisoScadenze.jsx      banner per ritardi e scadenze vicine
    Consigli.jsx            proposte dagli autori gia' letti
    Copertina.jsx           path -> Open Library per ISBN -> copertina generata
    Toast.jsx               notifiche impilate
    Scheletro.jsx           placeholder con luccichio
    RivelaTesto.jsx         testo che si scopre con lo scroll
  src/pages/                Home, Catalogo, Libro, Banco, DaLeggere,
                            Prestiti, Profilo, Amministrazione,
                            Accedi, Registrati
  .env.example
```
