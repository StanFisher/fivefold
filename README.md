# FiveFold

**FiveFold** is a multi-child savings account management and reconciliation web app built with Next.js, TypeScript, Tailwind CSS, and SQLite.

It tracks individual sub-balances for children in a single pooled savings account (such as a high-yield savings account / HYSA), automates penny-exact proportional monthly interest calculations based on your account's APY, and reconciles balances in real time.

---

## Environments: Dev vs. Prod

FiveFold includes complete environment and database isolation so you can test updates and experiment with interest calculations safely without touching your real production family savings data.

| Environment | Database File | Command | Purpose |
| :--- | :--- | :--- | :--- |
| **Development** | `data/fivefold.dev.db` | `npm run dev` | Testing, experimenting, UI validation, test database wipes |
| **Production** | `data/fivefold.db` | `npm run prod:start` | Real family savings account management |
| **Testing** | `data/fivefold.test.db` | `npm test` | Automated unit and workflow test runs |

---

## Quick Start & Commands

### Development (Safe Testing)
```bash
# Start development server with dev database
npm run dev

# Reset dev database back to fresh setup
npm run dev:reset
```
*When running in development, an amber **DEV ENVIRONMENT** banner is displayed in the header with a 1-click test database reset tool.*

---

### Production
```bash
# Build and run production server
npm run prod:start

# Create a timestamped backup of the database before major updates
npm run prod:backup
```

---

### Automated Tests
```bash
npm test
```

---

## Git Workflow
- `dev` branch: Working branch for testing new features and updates.
- `main` branch: Stable production branch. Only push to `main` when updates are tested and approved.
