<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FiveFold — AI Agent Guidelines & Architecture Instructions

## 1. Project Purpose & Core Domain
**FiveFold** is a multi-child savings account management and reconciliation web application designed for a single pooled high-yield savings account (Wealthfront Cash/Savings) across 5 children.
- **Automated APY Accrual**: Daily balance accrual based on account APY (`dailyRate = APY / 365 or 366`).
- **Hamilton-Hare Penny-Exact Allocation**: Guarantees zero rounding drift so the sum of children's interest credits equals the bank deposit penny-for-penny.
- **Reconciliation Engine**: Real-time validation of $\sum \text{child sub-balances} == \text{bank account balance}$.

---

## 2. STRICT ENVIRONMENT & DATABASE RULES

FiveFold maintains absolute database isolation between environments:

| Environment | Database File | Command | Rules for Agents |
| :--- | :--- | :--- | :--- |
| **Development** | `data/fivefold.dev.db` | `npm run dev` | Safe for testing, experimenting, modifying schemas, and database resets. |
| **Production** | `data/fivefold.db` | `npm run prod:start` | **PROTECTED REAL DATA**. NEVER wipe, delete, or reset `fivefold.db` unless explicitly instructed by the user. |
| **Testing** | `data/fivefold.test.db` | `npm test` | Automated tests run against this isolated database. |

- Environment is controlled by `FIVEFOLD_ENV` (`development` | `production` | `test`).
- `src/lib/db.ts` dynamically resolves the database path via `getEnvironmentInfo()`.
- Local `.db` files are strictly git-ignored.

---

## 3. STRICT GIT BRANCHING WORKFLOW

1. **Always Work on `dev`**:
   - All code edits, new features, and tests must be performed and committed on the `dev` branch.
2. **Never Push Directly to `main`**:
   - The `main` branch is reserved for verified production releases.
   - Do NOT merge `dev` into `main` or push to `main` until the user has explicitly tested the dev environment and given approval.
3. **Always Run Tests Before Pushing**:
   - Run `npm test` and `npm run build` to guarantee 0 regressions before committing.

---

## 4. Key Code Locations

- `src/lib/interest.ts`: Daily interest accrual math and Hamilton-Hare Largest Remainder algorithm.
- `src/lib/db.ts`: SQLite database schema, environment detection, backup tools, and queries.
- `src/lib/types.ts`: Domain models, settings, transactions, splits, and environment types.
- `src/components/Onboarding.tsx`: Guided onboarding flow for initial balance and APY setup.
- `src/components/Dashboard.tsx`: Main dashboard with 5 child cards, APY metrics, and dev indicators.
- `src/components/InterestModal.tsx`: Monthly interest preview and 1-click posting.
- `src/components/ReconciliationModal.tsx`: Bank statement reconciliation and discrepancy detection.
- `scripts/backup-db.ts`: Database backup utility saving snapshots into `data/backups/`.
- `scripts/reset-db.ts`: Database reset script for the active environment.
