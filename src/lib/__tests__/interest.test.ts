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

  // Test 2: Penny-exact distribution with 5 kids
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

  // Test 3: Monte Carlo simulation with random child counts (1 to 25 children)
  let allExact = true;
  for (let iter = 0; iter < 1000; iter++) {
    const childCount = Math.floor(Math.random() * 25) + 1; // 1 to 25 kids
    const rawList = Array.from({ length: childCount }, (_, i) => ({
      id: i + 1,
      rawAmount: Math.random() * 100,
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
  assert(allExact, '1,000 Monte Carlo simulations verify 0 penny drift across 1 to 25 children');

  // Test 4: Single Child account interest calculation
  const singleChild: Child[] = [
    { id: 1, name: 'Solo', color: '#3B82F6', sortOrder: 0, createdAt: '2026-01-01' },
  ];
  const singleChildTx: Transaction[] = [
    {
      id: 1,
      date: '2026-08-01',
      type: 'INITIAL',
      totalAmount: 5000,
      description: 'Initial balance',
      createdAt: '2026-08-01T00:00:00Z',
      splits: [{ childId: 1, amount: 5000 }],
    },
  ];
  const singlePreview = calculateMonthlyInterest(singleChild, singleChildTx, 5.0, 2026, 8);
  assert(singlePreview.childAllocations.length === 1, '1 child allocation generated');
  assert(singlePreview.childAllocations[0].calculatedInterest === singlePreview.totalCalculatedInterest, 'Single child receives 100% of interest');

  // Test 5: 3 Children account calculation
  const threeChildren: Child[] = [
    { id: 1, name: 'Maya', color: '#3B82F6', sortOrder: 0, createdAt: '2026-01-01' },
    { id: 2, name: 'Noah', color: '#10B981', sortOrder: 1, createdAt: '2026-01-01' },
    { id: 3, name: 'Zoe', color: '#F59E0B', sortOrder: 2, createdAt: '2026-01-01' },
  ];
  const threeChildrenTx: Transaction[] = [
    {
      id: 1,
      date: '2026-08-01',
      type: 'INITIAL',
      totalAmount: 3000,
      description: 'Initial balance',
      createdAt: '2026-08-01T00:00:00Z',
      splits: [
        { childId: 1, amount: 1000 },
        { childId: 2, amount: 1000 },
        { childId: 3, amount: 1000 },
      ],
    },
  ];
  const threePreview = calculateMonthlyInterest(threeChildren, threeChildrenTx, 5.0, 2026, 8);
  const threeSum = Number(threePreview.childAllocations.reduce((s, c) => s + c.calculatedInterest, 0).toFixed(2));
  assert(threeSum === threePreview.totalCalculatedInterest, `3 children interest sum is exact ($${threeSum} === $${threePreview.totalCalculatedInterest})`);

  // Test 6: 7 Children account calculation
  const sevenChildren: Child[] = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    name: `Child ${i + 1}`,
    color: '#3B82F6',
    sortOrder: i,
    createdAt: '2026-01-01',
  }));
  const sevenChildrenTx: Transaction[] = [
    {
      id: 1,
      date: '2026-08-01',
      type: 'INITIAL',
      totalAmount: 7000,
      description: 'Initial balance',
      createdAt: '2026-08-01T00:00:00Z',
      splits: sevenChildren.map((c) => ({ childId: c.id, amount: 1000 })),
    },
  ];
  const sevenPreview = calculateMonthlyInterest(sevenChildren, sevenChildrenTx, 5.0, 2026, 8);
  const sevenSum = Number(sevenPreview.childAllocations.reduce((s, c) => s + c.calculatedInterest, 0).toFixed(2));
  assert(sevenSum === sevenPreview.totalCalculatedInterest, `7 children interest sum is exact ($${sevenSum} === $${sevenPreview.totalCalculatedInterest})`);

  // Test 7: 5 Children with mid-month deposit
  const fiveChildren: Child[] = [
    { id: 1, name: 'Emma', color: '#3B82F6', sortOrder: 0, createdAt: '2026-01-01' },
    { id: 2, name: 'Liam', color: '#10B981', sortOrder: 1, createdAt: '2026-01-01' },
    { id: 3, name: 'Sophia', color: '#F59E0B', sortOrder: 2, createdAt: '2026-01-01' },
    { id: 4, name: 'Lucas', color: '#EC4899', sortOrder: 3, createdAt: '2026-01-01' },
    { id: 5, name: 'Olivia', color: '#8B5CF6', sortOrder: 4, createdAt: '2026-01-01' },
  ];
  const fiveChildrenTx: Transaction[] = [
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

  const previewDeposit = calculateMonthlyInterest(fiveChildren, fiveChildrenTx, 5.0, 2026, 8);
  const emmaAllocation = previewDeposit.childAllocations.find((c) => c.childId === 1)!;
  const liamAllocation = previewDeposit.childAllocations.find((c) => c.childId === 2)!;

  assert(emmaAllocation.calculatedInterest > liamAllocation.calculatedInterest, 'Emma accrued more interest than Liam due to mid-month deposit');
  assert(emmaAllocation.averageDailyBalance > 2000, `Emma average daily balance reflected deposit: ${emmaAllocation.averageDailyBalance}`);

  const totalWithDeposit = Number(previewDeposit.childAllocations.reduce((s, c) => s + c.calculatedInterest, 0).toFixed(2));
  assert(totalWithDeposit === previewDeposit.totalCalculatedInterest, `Allocation after mid-month deposit is penny-exact ($${totalWithDeposit} === $${previewDeposit.totalCalculatedInterest})`);

  // Test 8: calculateInterestPostingDate
  const { calculateInterestPostingDate, allocateCustomInterest } = require('../interest');
  const augFirstOfNext = calculateInterestPostingDate(2026, 8, 'FIRST_OF_NEXT_MONTH');
  assert(augFirstOfNext === '2026-09-01', `August first of next month is 2026-09-01 (got ${augFirstOfNext})`);

  const augEndOfMonth = calculateInterestPostingDate(2026, 8, 'END_OF_MONTH');
  assert(augEndOfMonth === '2026-08-31', `August end of month is 2026-08-31 (got ${augEndOfMonth})`);

  const decFirstOfNext = calculateInterestPostingDate(2026, 12, 'FIRST_OF_NEXT_MONTH');
  assert(decFirstOfNext === '2027-01-01', `December first of next month rolls to 2027-01-01 (got ${decFirstOfNext})`);

  const febLeapEnd = calculateInterestPostingDate(2024, 2, 'END_OF_MONTH');
  assert(febLeapEnd === '2024-02-29', `Feb 2024 end of month is 2024-02-29 (got ${febLeapEnd})`);

  // Test 9: allocateCustomInterest with large custom total (e.g. $15.00 vs $0.67 base)
  const baseWeights = [
    { id: 1, weight: 0.47 },
    { id: 2, weight: 0.06 },
    { id: 3, weight: 0.05 },
    { id: 4, weight: 0.06 },
    { id: 5, weight: 0.03 },
  ];
  const customAlloc = allocateCustomInterest(baseWeights, 15.00);
  let customSum = 0;
  customAlloc.forEach((v: number) => (customSum += v));
  customSum = Number(customSum.toFixed(2));
  assert(customSum === 15.00, `Custom interest $15.00 allocation matches exactly: $${customSum} === $15.00`);
  assert(customAlloc.get(1)! > customAlloc.get(2)!, `Child 1 received largest share ($${customAlloc.get(1)})`);

  // Test 10: allocateCustomInterest with zero base weights (equal split fallback)
  const zeroWeights = [
    { id: 1, weight: 0 },
    { id: 2, weight: 0 },
    { id: 3, weight: 0 },
  ];
  const zeroAlloc = allocateCustomInterest(zeroWeights, 5.00);
  let zeroSum = 0;
  zeroAlloc.forEach((v: number) => (zeroSum += v));
  zeroSum = Number(zeroSum.toFixed(2));
  assert(zeroSum === 5.00, `Zero-weight custom allocation sums exactly to $5.00 (got $${zeroSum})`);
  assert(zeroAlloc.get(1) === 1.67 && zeroAlloc.get(2) === 1.67 && zeroAlloc.get(3) === 1.66, 'Zero-weight splits pennies 1.67 + 1.67 + 1.66 = 5.00');

  // Test 11: Monte Carlo simulations for allocateCustomInterest (1 to 25 kids with random weights & totals)
  let monteCarloCustomPassed = true;
  for (let iter = 0; iter < 1000; iter++) {
    const kidCount = Math.floor(Math.random() * 25) + 1;
    const weights = Array.from({ length: kidCount }, (_, i) => ({
      id: i + 1,
      weight: Math.random() * 50,
    }));
    const targetAmt = Number((Math.random() * 200 + 0.01).toFixed(2));
    const dist = allocateCustomInterest(weights, targetAmt);
    let checkSum = 0;
    dist.forEach((v: number) => (checkSum += v));
    checkSum = Number(checkSum.toFixed(2));
    if (Math.abs(checkSum - targetAmt) > 0.001) {
      monteCarloCustomPassed = false;
      console.error(`Monte Carlo failure: expected ${targetAmt}, got ${checkSum}`);
      break;
    }
  }
  assert(monteCarloCustomPassed, '1,000 Monte Carlo simulations verify 0 penny drift in allocateCustomInterest across 1 to 25 children');

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
