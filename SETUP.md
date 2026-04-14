# FinanceFlow - Expense Tracker Setup Guide

A comprehensive household expense tracking and budgeting application built with Next.js 16, Node.js API routes, and PostgreSQL.

## Features

- **Dashboard Overview**: Real-time financial summary with income, expenses, and net balance
- **Expense Tracking**: Categorize and record expenses with detailed information
- **Income Management**: Track multiple income sources with categories
- **Budget Management**: Set spending limits with customizable alert thresholds
- **Financial Goals**: Create and track long-term savings and financial objectives
- **Analytics Dashboard**: Visual insights with charts and spending trends
- **Dark Mode Support**: Complete light/dark theme implementation
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS and custom green palette

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Node.js API routes
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS with custom green/teal color palette
- **Components**: shadcn/ui with custom theme
- **Charts**: Recharts for data visualization
- **Theme**: next-themes for dark mode support

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Environment variables configured

## Installation

1. **Clone and Install Dependencies**
```bash
# Install dependencies
pnpm install
```

2. **Setup Database**
```bash
# Create PostgreSQL database and run schema
psql -U postgres -d your_database < scripts/schema.sql

# Or copy the SQL from scripts/schema.sql and run in your PostgreSQL client
```

3. **Configure Environment Variables**

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/financeflow_db

# Application
NODE_ENV=development
```

4. **Run Development Server**
```bash
pnpm dev
```

Visit `http://localhost:5173` to access the application.

## Project Structure

```
├── app/
│   ├── api/                 # API routes
│   │   ├── expenses/       # Expense endpoints
│   │   ├── income/         # Income endpoints
│   │   ├── categories/     # Category endpoints
│   │   ├── budgets/        # Budget endpoints
│   │   └── goals/          # Financial goals endpoints
│   ├── layout.tsx          # Root layout with theme provider
│   ├── globals.css         # Global styles and design tokens
│   └── page.tsx            # Main dashboard page
├── components/
│   ├── dashboard/          # Dashboard feature components
│   │   ├── overview.tsx
│   │   ├── expense-tracker.tsx
│   │   ├── income-tracker.tsx
│   │   ├── budget-manager.tsx
│   │   ├── financial-goals.tsx
│   │   └── analytics.tsx
│   ├── navigation.tsx       # Top navigation bar
│   ├── theme-provider.tsx  # Theme context provider
│   ├── theme-toggle.tsx    # Dark mode toggle button
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── db.ts               # Database connection utilities
│   └── types.ts            # TypeScript type definitions
└── scripts/
    └── schema.sql          # Database schema
```

## Database Schema

The application uses 7 main tables:

1. **users**: User accounts with preferences
2. **categories**: Expense and income categories
3. **expenses**: Expense records with categorization
4. **income**: Income records with sources
5. **budgets**: Budget limits with alert thresholds
6. **financial_goals**: Long-term savings goals
7. **transactions_history**: Audit trail of all transactions

All tables include proper relationships with cascade deletes and indexes for performance.

## API Endpoints

### Expenses
- `GET /api/expenses` - Fetch expenses (with month/year/category filters)
- `POST /api/expenses` - Create new expense

### Income
- `GET /api/income` - Fetch income (with month/year filters)
- `POST /api/income` - Record income

### Categories
- `GET /api/categories` - Fetch categories (with type filter: expense/income)
- `POST /api/categories` - Create new category

### Budgets
- `GET /api/budgets` - Fetch active budgets
- `POST /api/budgets` - Create new budget

### Goals
- `GET /api/goals` - Fetch financial goals
- `POST /api/goals` - Create new goal

All endpoints require `x-user-id` header for authentication.

## Design System

### Color Palette (Green/Teal Theme)

**Light Mode:**
- Background: #DAF1DE (Mint Cream)
- Foreground: #051F20 (Dark Teal)
- Primary: #235347 (Teal Green)
- Secondary: #8EB69B (Sage Green)

**Dark Mode:**
- Background: #051F20 (Dark Teal)
- Foreground: #DAF1DE (Mint Cream)
- Primary: #235347 (Teal Green)
- Secondary: #163832 (Deep Emerald)

### Typography
- Headings: Geist Sans
- Body: Geist Sans
- Mono: Geist Mono

## Features Guide

### Dashboard Overview
- View total income, expenses, and net balance for the current month
- Quick access to active budgets and financial goals
- Color-coded financial metrics

### Expense Tracker
- Add expenses with category, amount, date, and payment method
- Filter by month and category
- View total monthly spending
- Delete expenses from history

### Income Tracker
- Record income from various sources
- Categorize income streams
- Track monthly income totals
- View income history

### Budget Manager
- Create monthly, weekly, or yearly budgets
- Set custom alert thresholds
- Visual progress indicators
- Alert notifications when budget limits approached

### Financial Goals
- Set savings targets with deadlines
- Track progress toward goals
- Prioritize goals (low/medium/high)
- Monitor goal completion status

### Analytics
- Expense breakdown by category (pie chart)
- Monthly spending trends (line chart)
- Total spending, daily averages, and category counts
- Data visualization with interactive charts

### Theme Support
- Light mode (default)
- Dark mode with smooth transitions
- Automatic system preference detection
- Theme preference saved in localStorage

## Development Notes

### Adding New Features

1. **Database Changes**: Update `scripts/schema.sql` and run migrations
2. **API Routes**: Create new route handlers in `app/api/`
3. **Types**: Add interfaces to `lib/types.ts`
4. **Components**: Create components in `components/` with proper organization
5. **Styling**: Use design tokens from `globals.css` for consistency

### Styling Guidelines

- Use Tailwind CSS classes for all styling
- Leverage design tokens (--primary, --secondary, etc.) for colors
- Maintain responsive design with mobile-first approach
- Follow the existing component structure

### Database Best Practices

- Use parameterized queries to prevent SQL injection
- Add proper indexes for frequently queried columns
- Include cascade deletes for referential integrity
- Maintain audit trails with transactions_history table

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct in `.env.local`
- Ensure PostgreSQL server is running
- Check database exists and schema is initialized

### API Errors
- Check that `x-user-id` header is included in requests
- Verify request payload matches expected format
- Check database logs for SQL errors

### Theme Not Applying
- Clear browser cache and localStorage
- Verify theme provider is wrapped around children in layout
- Check that `suppressHydrationWarning` is set on `<html>`

## Future Enhancements

- User authentication and authorization
- Bill reminders and recurring transactions
- Export reports as PDF/CSV
- Mobile app with React Native
- Investment tracking
- Multi-currency support
- Data backup and restoration
- Advanced analytics with ML predictions

## License

MIT
