# FiveFold

**FiveFold** is a multi-child savings account management and reconciliation web app built with Next.js, TypeScript, Tailwind CSS, and SQLite.

It tracks individual sub-balances for 5 children in a single pooled savings account (such as a Wealthfront Cash / HYSA account), automates penny-exact proportional monthly interest calculations based on your account's APY, and reconciles balances in real time.

---

## Key Features

1. **Automated Wealthfront Daily APY Accrual**:
   - Accrues interest daily on each child's exact balance over the month at your configured APY.
   - Allocates monthly bank interest down to the penny using the **Largest Remainder (Hamilton-Hare) algorithm**, guaranteeing zero rounding drift.
   - Includes a 1-click **Post Monthly Interest** action with a true-up adjustment field if the bank statement differs by a cent.

2. **Streamlined Deposits & Withdrawals**:
   - Allocate deposits or withdrawals to a single child or split equally/custom across all 5 children.
   - Instant balance updates and transaction history.

3. **Bank Statement Reconciliation**:
   - Compare the sum of your 5 children's balances against your actual Wealthfront account balance anytime.
   - Immediate visual feedback on exact matches or discrepancies.

4. **Guided Onboarding**:
   - Input your account APY, current total account balance, 5 kids' names, and starting amounts (or percentage shares).

5. **100% Local & Private**:
   - Stored in a local SQLite database (`data/fivefold.db`) on your computer.

---

## Quick Start

### 1. Install Dependencies & Build
```bash
npm install
npm run build
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Tests
```bash
npm test
```
