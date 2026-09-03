import { getDb, updateSettings } from '../src/lib/db';

const db = getDb();
db.transaction(() => {
  db.prepare('DELETE FROM transaction_splits').run();
  db.prepare('DELETE FROM transactions').run();
  db.prepare('DELETE FROM children').run();
  db.prepare('DELETE FROM reconciliations').run();
  updateSettings({
    isOnboarded: false,
    lastReconciledBalance: null,
    lastReconciledDate: null,
    interestPostingDay: 'FIRST_OF_NEXT_MONTH',
  });
})();

console.log('Database reset to fresh state successfully.');
