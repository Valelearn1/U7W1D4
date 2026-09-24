# Progetto base - BE + FE (JSX) + PostgreSQL

Scheletro di partenza, pronto per il deploy su Render.

| Parte | Tecnologia | In locale | Su Render |
|---|---|---|---|
| Backend | Spring Boot 4.1.1, Java 25, Maven wrapper | `be` sulla 8080 | Web Service (Docker) |
| Frontend | React 19, Vite, JavaScript (JSX), Tailwind 4 | `fe` sulla 5173 | Static Site |
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
   cd be && .\mvnw.cmd spring-boot:run
   cd fe && npm install && npm run dev
   ```
3. http://localhost:5173 - il riquadro deve mostrare `biblioteca`.

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
  src/lib/api.js            base delle fetch, da VITE_API_URL
  src/App.jsx               pagina di prova
  .env.example
```
