import { Child, MonthInterestPreview, Transaction } from './types';

/**
 * Checks if a given year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns number of days in a year (366 for leap, 365 otherwise).
 */
export function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * Returns number of days in a specific month (1-indexed month: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Formats a Date or year/month/day into YYYY-MM-DD string.
 */
export function formatDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Largest Remainder (Hamilton-Hare) Method for penny-exact distribution.
 * Distributes `totalAmount` across items based on their raw weights/amounts.
 */
export function distributePenniesExactly(
  items: { id: number; rawAmount: number }[],
  totalAmount: number
): Map<number, number> {
  const result = new Map<number, number>();
  if (items.length === 0) return result;

  const totalCents = Math.round(totalAmount * 100);
  let allocatedCentsSum = 0;

  const remainders: { id: number; floorCents: number; remainder: number }[] = [];

  for (const item of items) {
    const rawCents = item.rawAmount * 100;
    const floorCents = Math.floor(rawCents);
    const remainder = rawCents - floorCents;
    remainders.push({ id: item.id, floorCents, remainder });
    allocatedCentsSum += floorCents;
  }

  let unallocatedCents = totalCents - allocatedCentsSum;

  // Sort descending by decimal remainder
  remainders.sort((a, b) => b.remainder - a.remainder);

  for (const item of remainders) {
    let extra = 0;
    if (unallocatedCents > 0) {
      extra = 1;
      unallocatedCents--;
    } else if (unallocatedCents < 0) {
      extra = -1;
      unallocatedCents++;
    }
    const finalAmount = (item.floorCents + extra) / 100;
    result.set(item.id, Number(finalAmount.toFixed(2)));
  }

  return result;
}

/**
 * Calculates monthly interest preview for all children based on daily balances and APY.
 */
export function calculateMonthlyInterest(
  children: Child[],
  transactions: Transaction[],
  apy: number,
  year: number,
  month: number // 1 - 12
): MonthInterestPreview {
  const monthPeriod = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = getDaysInMonth(year, month);
  const daysInYear = getDaysInYear(year);
  const dailyRate = (apy / 100) / daysInYear;

  // Month name
  const monthDate = new Date(year, month - 1, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Check if an interest transaction has already been posted for this month period
  const existingInterestTx = transactions.find(
    (tx) => tx.type === 'INTEREST' && tx.monthPeriod === monthPeriod
  );
  const alreadyPosted = Boolean(existingInterestTx);

  // We only include transactions up to the end of this month, and exclude any existing interest for this month
  const relevantTransactions = transactions.filter((tx) => {
    if (tx.type === 'INTEREST' && tx.monthPeriod === monthPeriod) {
      return false;
    }
    return tx.date <= formatDate(year, month, daysInMonth);
  });

  // Calculate daily balance for each child on each day of the month
  const childDailyBalances: Map<number, number[]> = new Map();
  children.forEach((c) => childDailyBalances.set(c.id, []));

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDateStr = formatDate(year, month, day);

    // Sum all splits up to currentDateStr
    for (const child of children) {
      let balanceOnDate = 0;
      for (const tx of relevantTransactions) {
        if (tx.date <= currentDateStr) {
          const split = tx.splits.find((s) => s.childId === child.id);
          if (split) {
            balanceOnDate += split.amount;
          }
        }
      }
      childDailyBalances.get(child.id)!.push(balanceOnDate);
    }
  }

  // Calculate raw interest and average balance per child
  const rawInterestItems: { id: number; rawAmount: number }[] = [];
  const startBalances = new Map<number, number>();
  const endBalances = new Map<number, number>();
  const avgBalances = new Map<number, number>();

  for (const child of children) {
    const dailyBalances = childDailyBalances.get(child.id) || [];
    const startBal = dailyBalances[0] || 0;
    const endBal = dailyBalances[dailyBalances.length - 1] || 0;
    const sumDailyBalances = dailyBalances.reduce((sum, b) => sum + Math.max(0, b), 0);
    const avgBal = dailyBalances.length > 0 ? sumDailyBalances / dailyBalances.length : 0;

    let childRawInterest = 0;
    for (const dayBal of dailyBalances) {
      if (dayBal > 0) {
        childRawInterest += dayBal * dailyRate;
      }
    }

    rawInterestItems.push({ id: child.id, rawAmount: childRawInterest });
    startBalances.set(child.id, startBal);
    endBalances.set(child.id, endBal);
    avgBalances.set(child.id, avgBal);
  }

  const rawTotalInterest = rawInterestItems.reduce((sum, item) => sum + item.rawAmount, 0);
  const roundedTotalInterest = Number((Math.round(rawTotalInterest * 100) / 100).toFixed(2));

  // Distribute pennies exact to penny
  const distributedMap = distributePenniesExactly(rawInterestItems, roundedTotalInterest);

  const childAllocations = children.map((child) => {
    const allocated = distributedMap.get(child.id) || 0;
    return {
      childId: child.id,
      childName: child.name,
      childColor: child.color,
      startBalance: Number((startBalances.get(child.id) || 0).toFixed(2)),
      endBalance: Number((endBalances.get(child.id) || 0).toFixed(2)),
      averageDailyBalance: Number((avgBalances.get(child.id) || 0).toFixed(2)),
      calculatedInterest: allocated,
    };
  });

  return {
    monthPeriod,
    monthName,
    year,
    month,
    daysInMonth,
    apy,
    alreadyPosted,
    totalCalculatedInterest: roundedTotalInterest,
    childAllocations,
  };
}
