import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { AccountSettings, Child, EnvironmentInfo, MonthInterestPreview, Transaction, TransactionSplit } from './types';
import { calculateMonthlyInterest } from './interest';

const DB_DIR = path.join(process.cwd(), 'data');

// Determine database file based on environment
export function getEnvironmentInfo(): EnvironmentInfo {
  const env = process.env.FIVEFOLD_ENV || process.env.NODE_ENV || 'development';
  if (env === 'test') {
    return { name: 'test', isDev: true, dbFileName: 'fivefold.test.db' };
  }
  if (env === 'production') {
    return { name: 'production', isDev: false, dbFileName: 'fivefold.db' };
  }
  return { name: 'development', isDev: true, dbFileName: 'fivefold.dev.db' };
}

export function getDbPath(): string {
  const info = getEnvironmentInfo();
  return path.join(DB_DIR, info.dbFileName);
}

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance: Database.Database | null = null;
let currentDbPath: string | null = null;

export function getDb(): Database.Database {
  const expectedPath = getDbPath();
  if (!dbInstance || currentDbPath !== expectedPath) {
    if (dbInstance) {
      try {
        dbInstance.close();
      } catch (e) {}
    }
    dbInstance = new Database(expectedPath);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    currentDbPath = expectedPath;
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      total_amount REAL NOT NULL,
      description TEXT,
      month_period TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reconciliations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      statement_balance REAL NOT NULL,
      calculated_balance REAL NOT NULL,
      difference REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

// ----------------------------------------------------
// BACKUP UTILITY
// ----------------------------------------------------

export function backupDatabase(): string {
  const db = getDb();
  const backupsDir = path.join(DB_DIR, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const envInfo = getEnvironmentInfo();
  const backupFileName = `${envInfo.name}-${timestamp}.db`;
  const backupFilePath = path.join(backupsDir, backupFileName);

  db.backup(backupFilePath);
  return backupFilePath;
}

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------

export function getSettings(): AccountSettings {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map = new Map<string, string>();
  rows.forEach((r) => map.set(r.key, r.value));

  return {
    apy: parseFloat(map.get('apy') || '5.0'),
    accountName: map.get('account_name') || 'Primary Savings',
    isOnboarded: map.get('is_onboarded') === 'true',
    lastReconciledDate: map.get('last_reconciled_date') || null,
    lastReconciledBalance: map.has('last_reconciled_balance')
      ? parseFloat(map.get('last_reconciled_balance')!)
      : null,
  };
}

export function updateSettings(partial: Partial<AccountSettings>): AccountSettings {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const run = db.transaction(() => {
    if (partial.apy !== undefined) {
      stmt.run('apy', partial.apy.toString());
    }
    if (partial.accountName !== undefined) {
      stmt.run('account_name', partial.accountName);
    }
    if (partial.isOnboarded !== undefined) {
      stmt.run('is_onboarded', partial.isOnboarded ? 'true' : 'false');
    }
    if (partial.lastReconciledDate !== undefined) {
      stmt.run('last_reconciled_date', partial.lastReconciledDate || '');
    }
    if (partial.lastReconciledBalance !== undefined) {
      stmt.run(
        'last_reconciled_balance',
        partial.lastReconciledBalance !== null ? partial.lastReconciledBalance.toString() : ''
      );
    }
  });

  run();
  return getSettings();
}

// ----------------------------------------------------
// CHILDREN
// ----------------------------------------------------

export function getChildren(): Child[] {
  const db = getDb();
  const childrenRows = db
    .prepare('SELECT id, name, color, sort_order as sortOrder, created_at as createdAt FROM children ORDER BY sort_order ASC, id ASC')
    .all() as Child[];

  // Calculate each child's current balance from transaction splits
  const splitSums = db
    .prepare('SELECT child_id, SUM(amount) as balance FROM transaction_splits GROUP BY child_id')
    .all() as { child_id: number; balance: number }[];

  const balanceMap = new Map<number, number>();
  splitSums.forEach((s) => balanceMap.set(s.child_id, Number(s.balance.toFixed(2))));

  const totalBalance = Array.from(balanceMap.values()).reduce((sum, b) => sum + (b > 0 ? b : 0), 0);

  return childrenRows.map((c) => {
    const balance = balanceMap.get(c.id) || 0;
    const percentage = totalBalance > 0 ? Number(((balance / totalBalance) * 100).toFixed(2)) : 0;
    return {
      ...c,
      balance,
      percentage,
    };
  });
}

export function updateChild(id: number, name: string, color: string): Child | null {
  const db = getDb();
  db.prepare('UPDATE children SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  const updated = getChildren().find((c) => c.id === id);
  return updated || null;
}

// ----------------------------------------------------
// TRANSACTIONS
// ----------------------------------------------------

export function getTransactions(options?: { childId?: number; limit?: number }): Transaction[] {
  const db = getDb();

  let query = `
    SELECT 
      id, date, type, total_amount as totalAmount, 
      description, month_period as monthPeriod, created_at as createdAt
    FROM transactions
  `;
  const params: unknown[] = [];

  if (options?.childId) {
    query += ` WHERE id IN (SELECT transaction_id FROM transaction_splits WHERE child_id = ?)`;
    params.push(options.childId);
  }

  query += ` ORDER BY date DESC, id DESC`;

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const txRows = db.prepare(query).all(...params) as Transaction[];

  if (txRows.length === 0) return [];

  const txIds = txRows.map((tx) => tx.id);
  const placeholders = txIds.map(() => '?').join(',');
  const splitsQuery = `
    SELECT 
      ts.id, ts.transaction_id as transactionId, ts.child_id as childId, 
      ts.amount, c.name as childName, c.color as childColor
    FROM transaction_splits ts
    JOIN children c ON ts.child_id = c.id
    WHERE ts.transaction_id IN (${placeholders})
    ORDER BY c.sort_order ASC, c.id ASC
  `;

  const splitRows = db.prepare(splitsQuery).all(...txIds) as (TransactionSplit & { transactionId: number })[];

  const splitsByTx = new Map<number, TransactionSplit[]>();
  splitRows.forEach((s) => {
    if (!splitsByTx.has(s.transactionId!)) {
      splitsByTx.set(s.transactionId!, []);
    }
    splitsByTx.get(s.transactionId!)!.push({
      id: s.id,
      transactionId: s.transactionId,
      childId: s.childId,
      childName: s.childName,
      childColor: s.childColor,
      amount: Number(s.amount.toFixed(2)),
    });
  });

  return txRows.map((tx) => ({
    ...tx,
    totalAmount: Number(tx.totalAmount.toFixed(2)),
    splits: splitsByTx.get(tx.id) || [],
  }));
}

export function createTransaction(data: {
  date: string;
  type: Transaction['type'];
  totalAmount: number;
  description: string;
  monthPeriod?: string | null;
  splits: { childId: number; amount: number }[];
}): Transaction {
  const db = getDb();
  const createdAt = new Date().toISOString();

  const insertTx = db.prepare(`
    INSERT INTO transactions (date, type, total_amount, description, month_period, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertSplit = db.prepare(`
    INSERT INTO transaction_splits (transaction_id, child_id, amount)
    VALUES (?, ?, ?)
  `);

  let newTxId = 0;

  const run = db.transaction(() => {
    const res = insertTx.run(
      data.date,
      data.type,
      data.totalAmount,
      data.description,
      data.monthPeriod || null,
      createdAt
    );
    newTxId = Number(res.lastInsertRowid);

    for (const split of data.splits) {
      insertSplit.run(newTxId, split.childId, split.amount);
    }
  });

  run();

  const created = getTransactions().find((tx) => tx.id === newTxId);
  if (!created) throw new Error('Failed to retrieve created transaction');
  return created;
}

export function deleteTransaction(id: number): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return res.changes > 0;
}

// ----------------------------------------------------
// ONBOARDING
// ----------------------------------------------------

export function completeOnboarding(data: {
  apy: number;
  accountName: string;
  children: { name: string; color: string; initialAmount: number }[];
  date?: string;
}): { success: boolean } {
  const db = getDb();
  const date = data.date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const run = db.transaction(() => {
    db.prepare('DELETE FROM transaction_splits').run();
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM children').run();
    db.prepare('DELETE FROM reconciliations').run();

    updateSettings({
      apy: data.apy,
      accountName: data.accountName,
      isOnboarded: true,
      lastReconciledDate: date,
      lastReconciledBalance: data.children.reduce((s, c) => s + c.initialAmount, 0),
    });

    const insertChild = db.prepare(`
      INSERT INTO children (name, color, sort_order, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const childIds: { id: number; initialAmount: number }[] = [];
    data.children.forEach((child, index) => {
      const res = insertChild.run(child.name, child.color, index, now);
      childIds.push({
        id: Number(res.lastInsertRowid),
        initialAmount: child.initialAmount,
      });
    });

    const totalAmount = data.children.reduce((s, c) => s + c.initialAmount, 0);
    const insertTx = db.prepare(`
      INSERT INTO transactions (date, type, total_amount, description, created_at)
      VALUES (?, 'INITIAL', ?, 'Initial Account Setup', ?)
    `);
    const txRes = insertTx.run(date, totalAmount, now);
    const txId = Number(txRes.lastInsertRowid);

    const insertSplit = db.prepare(`
      INSERT INTO transaction_splits (transaction_id, child_id, amount)
      VALUES (?, ?, ?)
    `);

    for (const item of childIds) {
      insertSplit.run(txId, item.id, item.initialAmount);
    }
  });

  run();
  return { success: true };
}

// ----------------------------------------------------
// INTEREST ACTIONS
// ----------------------------------------------------

export function getMonthInterestPreview(year: number, month: number): MonthInterestPreview {
  const settings = getSettings();
  const children = getChildren();
  const transactions = getTransactions();
  return calculateMonthlyInterest(children, transactions, settings.apy, year, month);
}

export function postMonthlyInterest(year: number, month: number, customAmount?: number): Transaction {
  const preview = getMonthInterestPreview(year, month);
  if (preview.alreadyPosted) {
    throw new Error(`Interest for ${preview.monthName} has already been posted.`);
  }

  const lastDay = new Date(year, month, 0).getDate();
  const postingDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  let splits = preview.childAllocations.map((c) => ({
    childId: c.childId,
    amount: c.calculatedInterest,
  }));
  let total = preview.totalCalculatedInterest;

  if (customAmount !== undefined && customAmount !== preview.totalCalculatedInterest) {
    total = customAmount;
    const items = preview.childAllocations.map((c) => ({
      id: c.childId,
      rawAmount: c.calculatedInterest,
    }));
    const { distributePenniesExactly } = require('./interest');
    const distributed = distributePenniesExactly(items, customAmount);
    splits = preview.childAllocations.map((c) => ({
      childId: c.childId,
      amount: distributed.get(c.childId) || 0,
    }));
  }

  return createTransaction({
    date: postingDate,
    type: 'INTEREST',
    totalAmount: total,
    description: `Monthly Interest - ${preview.monthName} (${preview.apy}% APY)`,
    monthPeriod: preview.monthPeriod,
    splits,
  });
}

// ----------------------------------------------------
// RECONCILIATION
// ----------------------------------------------------

export function recordReconciliation(statementBalance: number, date?: string) {
  const db = getDb();
  const reconDate = date || new Date().toISOString().split('T')[0];
  const children = getChildren();
  const totalLedgerBalance = Number(
    children.reduce((s, c) => s + (c.balance || 0), 0).toFixed(2)
  );
  const difference = Number((totalLedgerBalance - statementBalance).toFixed(2));
  const status = Math.abs(difference) < 0.009 ? 'MATCHED' : 'DISCREPANCY';
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO reconciliations (date, statement_balance, calculated_balance, difference, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(reconDate, statementBalance, totalLedgerBalance, difference, status, now);

  updateSettings({
    lastReconciledDate: reconDate,
    lastReconciledBalance: statementBalance,
  });

  return {
    date: reconDate,
    statementBalance,
    calculatedBalance: totalLedgerBalance,
    difference,
    status,
  };
}

export function getReconciliations() {
  const db = getDb();
  return db
    .prepare('SELECT id, date, statement_balance as statementBalance, calculated_balance as calculatedBalance, difference, status, created_at as createdAt FROM reconciliations ORDER BY id DESC LIMIT 20')
    .all();
}
