import { completeOnboarding, getChildren, getSettings, createTransaction, postMonthlyInterest, getMonthInterestPreview, recordReconciliation, getTransactions, deleteTransaction } from '../db';

function runDbTests() {
  console.log('Running FiveFold Database & Workflow Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test Onboarding with 3 children (dynamic child count verification)
  const threeKidOnboarding = completeOnboarding({
    apy: 5.0,
    accountName: 'Family Savings 3 Kids',
    date: '2026-08-01',
    children: [
      { name: 'Maya', color: '#3B82F6', initialAmount: 1000 },
      { name: 'Noah', color: '#10B981', initialAmount: 2000 },
      { name: 'Zoe', color: '#F59E0B', initialAmount: 3000 },
    ],
  });
  assert(threeKidOnboarding.success === true, 'Onboarding with 3 children succeeded');
  const threeKids = getChildren();
  assert(threeKids.length === 3, '3 children created in database');
  const threeTotal = threeKids.reduce((s, c) => s + (c.balance || 0), 0);
  assert(threeTotal === 6000, `Total 3-kid balance is $6,000.00 (got ${threeTotal})`);

  // 2. Test Onboarding with 1 child
  const singleOnboarding = completeOnboarding({
    apy: 4.5,
    accountName: 'Solo Account',
    date: '2026-08-01',
    children: [
      { name: 'Solo', color: '#3B82F6', initialAmount: 5000 },
    ],
  });
  assert(singleOnboarding.success === true, 'Onboarding with 1 child succeeded');
  const singleKid = getChildren();
  assert(singleKid.length === 1, '1 child created in database');
  assert(singleKid[0].percentage === 100, 'Single child has 100% share');

  // 3. Test Full Onboarding with 5 children
  const onboardingRes = completeOnboarding({
    apy: 5.0,
    accountName: 'High-Yield Savings Account',
    date: '2026-08-01',
    children: [
      { name: 'Alex', color: '#3B82F6', initialAmount: 1500 },
      { name: 'Sam', color: '#10B981', initialAmount: 2500 },
      { name: 'Jordan', color: '#F59E0B', initialAmount: 1000 },
      { name: 'Taylor', color: '#EC4899', initialAmount: 3000 },
      { name: 'Morgan', color: '#8B5CF6', initialAmount: 2000 },
    ],
  });

  assert(onboardingRes.success === true, 'Onboarding with 5 children succeeded');

  const settings = getSettings();
  assert(settings.isOnboarded === true, 'Settings shows onboarded');
  assert(settings.apy === 5.0, 'Settings APY is 5.0%');

  const children = getChildren();
  assert(children.length === 5, '5 children created');
  const totalBalance = children.reduce((s, c) => s + (c.balance || 0), 0);
  assert(totalBalance === 10000, `Total initial balance is $10,000.00 (got ${totalBalance})`);

  const alex = children.find((c) => c.name === 'Alex')!;
  assert(alex.balance === 1500, 'Alex balance is $1500');
  assert(alex.percentage === 15, 'Alex percentage is 15%');

  // 4. Add single deposit
  const depositTx = createTransaction({
    date: '2026-08-10',
    type: 'DEPOSIT',
    totalAmount: 500,
    description: 'Chore allowance for Sam',
    splits: [{ childId: children.find((c) => c.name === 'Sam')!.id, amount: 500 }],
  });
  assert(depositTx.id > 0, 'Deposit transaction created');

  const samAfterDep = getChildren().find((c) => c.name === 'Sam')!;
  assert(samAfterDep.balance === 3000, `Sam balance updated to $3000 (got ${samAfterDep.balance})`);

  // 5. Add split deposit across all 5 kids ($250 grandparent gift = $50 each)
  const splitDeposit = createTransaction({
    date: '2026-08-15',
    type: 'DEPOSIT',
    totalAmount: 250,
    description: 'Gift from Grandparents',
    splits: children.map((c) => ({ childId: c.id, amount: 50 })),
  });
  assert(splitDeposit.splits.length === 5, 'Split deposit has 5 splits');

  // 6. Add withdrawal for Taylor ($100 for concert ticket)
  const taylor = children.find((c) => c.name === 'Taylor')!;
  const withdrawTx = createTransaction({
    date: '2026-08-20',
    type: 'WITHDRAWAL',
    totalAmount: 100,
    description: 'Concert ticket',
    splits: [{ childId: taylor.id, amount: -100 }],
  });
  assert(withdrawTx.id > 0, 'Withdrawal transaction created');

  // 7. Test Interest Preview for August 2026
  const preview = getMonthInterestPreview(2026, 8);
  assert(preview.alreadyPosted === false, 'August interest is not yet posted');
  assert(preview.totalCalculatedInterest > 0, `August interest calculated: $${preview.totalCalculatedInterest}`);
  assert(preview.childAllocations.length === 5, 'All 5 children have interest allocations');

  // 8. Post Monthly Interest
  const interestTx = postMonthlyInterest(2026, 8);
  assert(interestTx.type === 'INTEREST', 'Interest transaction posted');
  assert(interestTx.splits.length === 5, 'Interest split amongst 5 children');

  const previewAfter = getMonthInterestPreview(2026, 8);
  assert(previewAfter.alreadyPosted === true, 'August interest now marked as already posted');

  // 9. Reconciliation check
  const newChildren = getChildren();
  const currentTotal = Number(newChildren.reduce((s, c) => s + (c.balance || 0), 0).toFixed(2));
  const recon = recordReconciliation(currentTotal, '2026-08-31');
  assert(recon.status === 'MATCHED', 'Reconciliation matched exact balance');
  assert(recon.difference === 0, 'Reconciliation difference is $0.00');

  console.log(`\nDatabase Workflow Tests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runDbTests();
