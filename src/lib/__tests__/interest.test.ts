import { calculateMonthlyInterest, distributePenniesExactly, isLeapYear, getDaysInYear, getDaysInMonth } from '../interest';
import { Child, Transaction } from '../types';

function runTests() {
  console.log('Running FiveFold Interest Engine Unit Tests...\n');
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

  // Test 1: Leap year check
  assert(isLeapYear(2024) === true, '2024 is a leap year');
  assert(isLeapYear(2025) === false, '2025 is not a leap year');
  assert(isLeapYear(2000) === true, '2000 is a leap year');
  assert(isLeapYear(1900) === false, '1900 is not a leap year');
  assert(getDaysInYear(2024) === 366, '2024 has 366 days');
  assert(getDaysInYear(2025) === 365, '2025 has 365 days');
  assert(getDaysInMonth(2026, 2) === 28, 'Feb 2026 has 28 days');
  assert(getDaysInMonth(2024, 2) === 29, 'Feb 2024 has 29 days');
  assert(getDaysInMonth(2026, 8) === 31, 'Aug 2026 has 31 days');

  // Test 2: Penny-exact distribution
  const items = [
    { id: 1, rawAmount: 1.2345 },
    { id: 2, rawAmount: 2.3456 },
    { id: 3, rawAmount: 3.4567 },
    { id: 4, rawAmount: 0.1234 },
    { id: 5, rawAmount: 1.0001 },
  ];
  const total = 8.16;
  const distributed = distributePenniesExactly(items, total);
  let distributedSum = 0;
  distributed.forEach((val) => {
    distributedSum += val;
  });
  distributedSum = Number(distributedSum.toFixed(2));
  assert(distributedSum === total, `Hamilton-Hare sum matches total exactly: ${distributedSum} === ${total}`);

  // Test 3: Random Monte Carlo test for 1,000 simulated months with 5 kids
  let allExact = true;
  for (let iter = 0; iter < 1000; iter++) {
    const rawList = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      rawAmount: Math.random() * 50,
    }));
    const totalRaw = rawList.reduce((s, x) => s + x.rawAmount, 0);
    const targetTotal = Number((Math.round(totalRaw * 100) / 100).toFixed(2));
    const dist = distributePenniesExactly(rawList, targetTotal);
    let sumCheck = 0;
    dist.forEach((v) => (sumCheck += v));
    sumCheck = Number(sumCheck.toFixed(2));
    if (sumCheck !== targetTotal) {
      allExact = false;
      break;
    }
  }
  assert(allExact, '1,000 Monte Carlo simulations verify 0 penny drift');

  // Test 4: Calculate monthly interest with initial balances and APY
  const children: Child[] = [
    { id: 1, name: 'Emma', color: '#3B82F6', sortOrder: 0, createdAt: '2026-01-01' },
    { id: 2, name: 'Liam', color: '#10B981', sortOrder: 1, createdAt: '2026-01-01' },
    { id: 3, name: 'Sophia', color: '#F59E0B', sortOrder: 2, createdAt: '2026-01-01' },
    { id: 4, name: 'Lucas', color: '#EC4899', sortOrder: 3, createdAt: '2026-01-01' },
    { id: 5, name: 'Olivia', color: '#8B5CF6', sortOrder: 4, createdAt: '2026-01-01' },
  ];

  const transactions: Transaction[] = [
    {
      id: 1,
      date: '2026-08-01',
      type: 'INITIAL',
      totalAmount: 10000,
      description: 'Initial balance',
      createdAt: '2026-08-01T00:00:00Z',
      splits: [
        { childId: 1, amount: 2000 },
        { childId: 2, amount: 2000 },
        { childId: 3, amount: 2000 },
        { childId: 4, amount: 2000 },
        { childId: 5, amount: 2000 },
      ],
    },
  ];

  // For August 2026 (31 days, 365 days in 2026), 5.0% APY on $10,000
  // Daily interest = 10000 * 0.05 / 365 = 1.369863 per day
  // For 31 days = 42.46575... => rounds to $42.47 total
  // Each child with $2000 gets 20% => $42.47 * 0.2 = $8.494 => 2 kids get $8.50, 3 get $8.49 => sum = 8.50*2 + 8.49*3 = 17.00 + 25.47 = $42.47
  const preview = calculateMonthlyInterest(children, transactions, 5.0, 2026, 8);
  assert(preview.totalCalculatedInterest === 42.47, `Total calculated interest is $42.47 (got ${preview.totalCalculatedInterest})`);
  const kidsSum = Number(preview.childAllocations.reduce((s, c) => s + c.calculatedInterest, 0).toFixed(2));
  assert(kidsSum === 42.47, `Kids sum is exact to the penny ($42.47 === ${kidsSum})`);

  // Test 5: Mid-month deposit
  // Emma gets a $1,000 deposit on Aug 16
  const transactionsWithDeposit: Transaction[] = [
    ...transactions,
    {
      id: 2,
      date: '2026-08-16',
      type: 'DEPOSIT',
      totalAmount: 1000,
      description: 'Birthday money for Emma',
      createdAt: '2026-08-16T12:00:00Z',
      splits: [{ childId: 1, amount: 1000 }],
    },
  ];

  const previewDeposit = calculateMonthlyInterest(children, transactionsWithDeposit, 5.0, 2026, 8);
  const emmaAllocation = previewDeposit.childAllocations.find((c) => c.childId === 1)!;
  const liamAllocation = previewDeposit.childAllocations.find((c) => c.childId === 2)!;

  assert(emmaAllocation.calculatedInterest > liamAllocation.calculatedInterest, 'Emma accrued more interest than Liam due to mid-month deposit');
  assert(emmaAllocation.averageDailyBalance > 2000, `Emma average daily balance reflected deposit: ${emmaAllocation.averageDailyBalance}`);

  const totalWithDeposit = Number(previewDeposit.childAllocations.reduce((s, c) => s + c.calculatedInterest, 0).toFixed(2));
  assert(totalWithDeposit === previewDeposit.totalCalculatedInterest, `Allocation after mid-month deposit is penny-exact ($${totalWithDeposit} === $${previewDeposit.totalCalculatedInterest})`);

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
