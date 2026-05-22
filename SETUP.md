# FinanceFlow - Expense Tracker Setup Guide

A household expense tracking and budgeting application split into a Next.js frontend, a Node.js backend API, and PostgreSQL.

## Features

- Dashboard overview with income, expenses, net balance, budgets, and goals
- Expense and income tracking
- Budget management with alert thresholds
- Financial goals
- Analytics charts
- Light/dark theme support
- Responsive dashboard UI

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js HTTP server
- Database: PostgreSQL
- Charts: Recharts

## Project Structure

```text
backend/
  server.js             Node.js API server
  package.json          Backend dependencies and scripts
  scripts/schema.sql    PostgreSQL schema

frontend/
  app/                  Next.js app routes
  components/           UI and dashboard components
  hooks/                React hooks
  lib/                  Frontend helpers and shared types
  public/               Static assets
  package.json          Frontend dependencies and scripts

package.json            Root convenience scripts
```

## Installation

Install dependencies for the root scripts, frontend, and backend:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

## Database Setup

Create a PostgreSQL database, then run:

```bash
npm run migrate
```

The migration command reads `DATABASE_URL` from `backend/.env` and applies `backend/scripts/schema.sql`.

## Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/financeflow_db
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Run The App

Run both services from the root:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Frontend: `http://localhost:5173`

Backend API: `http://localhost:4000`

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/demo`
- `GET /api/profile`
- `PATCH /api/profile`
- `GET /api/expenses`
- `POST /api/expenses`
- `DELETE /api/expenses/:id`
- `GET /api/income`
- `POST /api/income`
- `DELETE /api/income/:id`
- `GET /api/categories`
- `POST /api/categories`
- `DELETE /api/categories/:id`
- `GET /api/budgets`
- `POST /api/budgets`
- `DELETE /api/budgets/:id`
- `GET /api/goals`
- `POST /api/goals`
- `PATCH /api/goals/:id`
- `DELETE /api/goals/:id`
- `GET /api/reports`
- `GET /api/alerts`

Finance endpoints require an `x-user-id` header. Auth endpoints do not.

The demo sign-in button calls `POST /api/auth/demo`, creates a reusable demo account, and seeds sample categories, income, expenses, a budget, and a goal.

## Notes

- The frontend reads the backend URL from `NEXT_PUBLIC_API_URL`.
- The backend allows requests from `FRONTEND_ORIGIN`.
- The SQL schema lives in `backend/scripts/schema.sql`.
