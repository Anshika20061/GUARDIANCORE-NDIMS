# GuardianCore — National Defence Inventory Management System (Academic Demo)

A classroom prototype using React (Vite), Node.js/Express REST API, and MySQL.
Uses fictional, non-sensitive general-supply data only. Do not use real or classified
defence inventory, personnel, or location information.

## Implemented
- JWT login and role-based access (Admin, Store Officer, Unit Commander, Viewer)
- Dashboard metrics and low-stock alerts
- Inventory CRUD and search
- Receive/issue stock with transaction history and quantity validation
- Supplier records
- Allocation records
- Maintenance records
- CSV inventory export
- MySQL schema and demo seed data

## Not production-ready
This is an academic demonstration, not a system for real defence operations.
Before any real deployment, require a security review, HTTPS, strong secrets,
rate limiting, CSRF strategy where applicable, backups, monitoring, and proper
authorization review. The demo seed account is not suitable for production.
File upload, email/SMS alerts, expiry automation, and PDF reports are not
implemented in this MVP; describe these as future work unless you implement them.

## Requirements
- Node.js 20+
- MySQL 8+
- Git (optional for deployment)

## 1. Database setup
Create a MySQL database and user, then run `database/schema.sql` in MySQL Workbench.
Example:
```sql
CREATE DATABASE guardian_core;
CREATE USER 'guardian_app'@'localhost' IDENTIFIED BY 'choose_a_local_password';
GRANT ALL PRIVILEGES ON guardian_core.* TO 'guardian_app'@'localhost';
FLUSH PRIVILEGES;
```
Then open `database/schema.sql` and execute it while `guardian_core` is selected.
The schema creates tables and fictional demo inventory records. After installing backend dependencies,
run `npm run seed` once to create the demo login.

## 2. Backend setup
```bash
cd server
copy .env.example .env
npm install
npm run dev
```
On macOS/Linux, use `cp .env.example .env` instead of `copy`.
Edit `.env` with your local MySQL details and a new random JWT_SECRET.
API runs at http://localhost:5000

Demo login (after `npm run seed`): `admin@guardian.local` / `DemoPass123!`
Change this password and secret before any deployment. Demo credentials are for
local classroom testing only.

## 3. Frontend setup
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL printed in the terminal (usually http://localhost:5173).

## 4. Quick test
1. Sign in with the demo account.
2. Add a general supply item.
3. Receive stock, then issue a smaller quantity.
4. Check dashboard metrics and transaction history.
5. Add a supplier and an allocation record.
6. Check maintenance records and export inventory CSV.

## Deployment outline
- MySQL: use a managed MySQL provider and create the schema there.
- Backend: deploy `server` to a Node.js host such as Render. Set environment variables
  from `.env.example`; use `npm install` as build command and `npm start` as start command.
- Frontend: deploy `client` to a static host such as Netlify. Set `VITE_API_URL` to
  the deployed API base URL (e.g. `https://your-api.example.com/api`).
- Set backend `CLIENT_ORIGIN` to the deployed frontend URL.
- Never commit `.env`; use host secret settings. Free hosting/database plans can sleep,
  expire, or have storage limits. Verify provider terms before relying on persistence.

## Team presentation
Explain only the features that work in this build. Do not claim security certification,
real-time military tracking, production-grade security, or deployment unless verified.
