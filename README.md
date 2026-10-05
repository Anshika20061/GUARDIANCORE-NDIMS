# GuardianCore — National Defence Inventory Management System

An academic inventory-management prototype built with React, Node.js/Express, and MySQL. The project demonstrates authentication, role-based access, inventory management, stock transactions, operational records, reporting, and an AI-powered inventory assistant.

> **Academic Demo / Non-Production**
>
> GuardianCore uses fictional, non-sensitive general-supply data only. It is not intended for real defence operations. Do not use real or classified defence inventory, personnel, infrastructure, or location information.

---

## Features

### Authentication & Access Control

* JWT-based authentication
* Role-based access control
* Supported roles:

  * Admin
  * Store Officer
  * Unit Commander
  * Viewer
* Protected API routes
* Session-based frontend token storage

### Dashboard

* Total inventory items
* Total stock quantity
* Low-stock indicators
* Damaged inventory
* Items under maintenance
* Operational inventory overview

### Inventory Management

* Add inventory items
* Edit inventory items
* Delete inventory items
* Search inventory
* Category and condition tracking
* Minimum-stock thresholds
* Location labels
* Unit tracking

### Stock Transactions

* Receive stock
* Issue stock
* Quantity validation
* Transaction history
* Transaction notes
* Automatic inventory quantity updates

### Operational Records

* Supplier records
* Allocation records
* Maintenance records
* Inventory condition tracking

### Reports

* Inventory CSV export
* Dashboard statistics
* Transaction history

### Guardian AI

GuardianCore includes an AI-powered assistant integrated into the dashboard.

The assistant can:

* Answer questions about current inventory
* Identify low-stock items
* Summarize inventory data
* Discuss damaged or maintained items
* Summarize recent transactions
* Compare inventory information
* Explain operational data

The AI assistant uses the application's current MySQL data as context and communicates with an external AI model through OpenRouter.

The OpenRouter API key is kept on the backend and is **never exposed to the frontend**.

---

## Technology Stack

### Frontend

* React
* Vite
* JavaScript
* Lucide React
* CSS

### Backend

* Node.js
* Express
* JWT
* bcryptjs
* Helmet
* CORS
* Express Rate Limit

### Database

* MySQL 8+
* mysql2

### AI

* OpenRouter API
* `openrouter/free` model router

---

## Project Structure

```text
GUARDIANCORE-NDIMS/
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Chatbot.jsx
│   │   ├── styles.css
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── server/
│   ├── server.js
│   ├── db.js
│   ├── middleware.js
│   ├── seed-admin.js
│   ├── package.json
│   ├── .env.example
│   └── ...
│
├── database/
│   └── schema.sql
│
└── README.md
```

---

# Requirements

* Node.js 20+
* MySQL 8+
* npm
* Git (optional)

---

# Installation

## 1. Clone the repository

```bash
git clone https://github.com/Anshika20061/GUARDIANCORE-NDIMS.git
cd GUARDIANCORE-NDIMS
```

---

# 2. Database Setup

Open MySQL Workbench or the MySQL command line.

Create the database and application user:

```sql
CREATE DATABASE guardian_core;

CREATE USER 'guardian_app'@'localhost'
IDENTIFIED BY 'choose_a_local_password';

GRANT ALL PRIVILEGES ON guardian_core.*
TO 'guardian_app'@'localhost';

FLUSH PRIVILEGES;
```

Select the `guardian_core` database and execute:

```text
database/schema.sql
```

The schema creates the required tables and fictional demo inventory data.

---

# 3. Backend Setup

Open a terminal:

```bash
cd server
npm install
```

Create your environment file:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Configure `.env`:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=guardian_app
DB_PASSWORD=your_mysql_password
DB_NAME=guardian_core

JWT_SECRET=your_random_secret
JWT_EXPIRES_IN=2h

OPENROUTER_API_KEY=your_openrouter_api_key
```

### Important

Never commit `.env` to GitHub.

The OpenRouter API key must remain on the backend.

Then start the backend:

```bash
npm run dev
```

The API will run at:

```text
http://localhost:5000
```

---

# 4. Create the Demo Admin Account

From the `server` directory:

```bash
node seed-admin.js
```

Demo credentials:

```text
Email: admin@guardian.local
Password: DemoPass123!
```

These credentials are intended only for local academic testing.

Change the password and JWT secret before any deployment.

---

# 5. Frontend Setup

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Vite will normally start the frontend at:

```text
http://localhost:5173
```

Open the URL shown in the terminal.

---

# 6. Running the Complete Application

You need two terminals.

### Terminal 1 — Backend

```bash
cd server
npm run dev
```

### Terminal 2 — Frontend

```bash
cd client
npm run dev
```

Then open:

```text
http://localhost:5173
```

Sign in using the demo account.

---

# Guardian AI Setup

Guardian AI requires an OpenRouter API key.

Create/configure the key and place it in the backend `.env` file:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
```

The frontend does **not** communicate directly with OpenRouter.

The request flow is:

```text
React Chatbot
      │
      ▼
GuardianCore Express API
      │
      ├── Authenticate user
      │
      ├── Read inventory data from MySQL
      │
      └── Send relevant context to OpenRouter
                │
                ▼
           AI response
                │
                ▼
          React Chatbot
```

The AI route is:

```text
POST /api/ai/chat
```

It requires an authenticated user.

Example request:

```json
{
  "message": "Which items are low on stock?"
}
```

---

# Example Guardian AI Questions

You can ask:

```text
Which items are currently low on stock?
```

```text
How many total units do we have?
```

```text
Which items are damaged?
```

```text
What inventory is under maintenance?
```

```text
Show me the most recent transactions.
```

```text
Which items have the lowest stock?
```

The assistant is designed to use the supplied GuardianCore data rather than inventing inventory information.

---

# Quick Application Test

After starting both servers:

1. Sign in using the demo account.
2. Check the dashboard metrics.
3. Open Guardian AI.
4. Ask a question about the inventory.
5. Add a general-supply inventory item.
6. Receive stock.
7. Issue a smaller quantity.
8. Verify the transaction history.
9. Add a supplier.
10. Create an allocation record.
11. Check maintenance records.
12. Export the inventory as CSV.

---

# Common Errors & Fixes

## 1. Blank / White Frontend Page

### Cause

An error in a React component can prevent the application from rendering.

One issue encountered during development was using React state without importing React.

### Fix

Make sure the component imports React and the required hooks:

```jsx
import React, { useState } from "react";
```

Check the browser developer console for the actual React error if the page becomes blank.

---

## 2. `401 Unauthorized` from `/api/ai/chat`

### Cause

The chatbot must send the same authentication token that the main application uses.

GuardianCore stores its JWT in:

```text
sessionStorage
```

under:

```text
gc_token
```

### Correct frontend token retrieval

```js
const token = sessionStorage.getItem("gc_token");
```

Using:

```js
localStorage.getItem("token");
```

will result in the AI request being unauthenticated.

---

## 3. `API route not found`

### Cause

The backend may not be running, or the frontend may be using the wrong API URL.

Check that the backend is running:

```text
http://localhost:5000
```

And verify the frontend API configuration.

The default API URL is:

```text
http://localhost:5000/api
```

---

## 4. OpenRouter API Errors

If the chatbot authenticates successfully but cannot generate an answer, check the backend terminal.

Possible causes include:

* Missing `OPENROUTER_API_KEY`
* Invalid API key
* OpenRouter service/network issue
* Rate limit reached
* Temporary model availability issue

The API key should only exist in the backend `.env`.

---

## 5. Chatbot Takes a Few Seconds to Respond

This is expected with the current architecture.

Each AI request performs several operations:

```text
Frontend request
      ↓
Authentication
      ↓
MySQL inventory query
      ↓
MySQL transaction query
      ↓
Guardian AI context creation
      ↓
OpenRouter request
      ↓
AI processing
      ↓
Response
      ↓
Frontend
```

The response time can therefore be longer than a normal local database request.

The current implementation prioritizes functionality and simplicity over minimum AI latency.

---

## 6. MySQL Connection Error

Check:

* MySQL Server is running
* Database exists
* Username is correct
* Password is correct
* Port is correct
* `guardian_core` exists

Default local configuration:

```text
Host: 127.0.0.1
Port: 3306
Database: guardian_core
```

---

# Security Notes

This project is an academic demonstration.

It is **not production-ready**.

Before any real deployment, a proper security review would be required, including:

* HTTPS
* Strong randomly generated secrets
* Secure secret management
* Database security review
* Detailed authorization review
* CSRF strategy where applicable
* Rate limiting review
* Input validation
* Logging and monitoring
* Database backups
* Secure deployment configuration
* Dependency auditing
* Error-handling review
* Infrastructure security
* Proper production authentication strategy

Never commit:

```text
.env
```

or any API keys, passwords, JWT secrets, database credentials, or other secrets.

---

# Current Limitations

The current MVP does not include:

* File uploads
* Email alerts
* SMS alerts
* Automated expiry notifications
* PDF report generation
* Real-time multi-user synchronization
* Persistent AI conversation history
* AI-powered inventory modification
* Production deployment configuration

These should be considered future improvements rather than implemented features.

---

# AI Limitations

Guardian AI is an assistant for interpreting the application's inventory data.

It does not directly modify inventory, create transactions, delete records, or perform administrative actions.

The assistant should not be treated as an authoritative operational or defence decision-making system.

AI responses can also take longer than standard application requests because they require an external model request.

---

# Academic Scope

GuardianCore was developed as an academic demonstration of a full-stack inventory management system.

The project demonstrates:

* React frontend development
* REST API development
* MySQL database integration
* Authentication
* Role-based authorization
* CRUD operations
* Transaction management
* Dashboard analytics
* CSV reporting
* External AI API integration
* Secure server-side API-key handling

All inventory and operational information used by the project should remain fictional and non-sensitive.

---

# Deployment Outline

For a demonstration deployment:

### Backend

The `server` directory can be deployed to a Node.js hosting platform.

Set the required environment variables through the hosting provider's secret/environment-variable system.

Start command:

```bash
npm start
```

### Frontend

The `client` directory can be deployed to a static hosting platform.

Configure:

```env
VITE_API_URL=https://your-api.example.com/api
```

The backend must then allow the deployed frontend origin through:

```env
CLIENT_ORIGIN=https://your-frontend.example.com
```

Never upload `.env` files containing real credentials.

---

# Development Notes

The project was developed and tested locally using:

* React/Vite
* Node.js
* Express
* MySQL
* VS Code
* Windows

The local development configuration uses:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Database: guardian_core
```

---

# Future Improvements

Possible future enhancements include:

* Faster AI responses through optimized database context
* Persistent AI conversation history
* Streaming AI responses
* More granular role permissions
* Advanced inventory analytics
* PDF reporting
* Automated low-stock notifications
* Expiry tracking
* File/document management
* Audit-log improvements
* Production-grade deployment
* Automated testing
* CI/CD
* Improved mobile responsiveness

---

# Disclaimer

GuardianCore is an academic software project.

It is not affiliated with, endorsed by, or intended for use by any military or government organization.

The project contains fictional inventory data and should not be populated with classified, restricted, sensitive, or operational defence information.

Use this project only for educational, demonstration, and development purposes.
