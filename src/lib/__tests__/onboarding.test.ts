import { PRESET_COLORS, formatCurrency } from '../formatters';

function runOnboardingTests() {
  console.log('Running FiveFold Onboarding & Child Management Unit Tests...\n');
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

  // Test 1: Color palette integrity
  assert(PRESET_COLORS.length === 8, '8 preset colors available in palette');
  const hexRegex = /^#([A-Fa-f0-9]{6})$/;
  const allHexValid = PRESET_COLORS.every((c) => hexRegex.test(c.hex));
  assert(allHexValid, 'All preset colors are valid 6-character hex codes');

  // Test 2: Initial onboarding state simulation (1 child)
  interface ChildFormState {
    name: string;
    color: string;
    amount: string;
    percent: string;
  }

  let childrenData: ChildFormState[] = [
    { name: '', color: PRESET_COLORS[0].hex, amount: '', percent: '' },
  ];

  assert(childrenData.length === 1, 'Onboarding begins with exactly 1 blank child row');
  assert(childrenData[0].color === '#3B82F6', 'First child default color is Ocean Blue');

  // Test 3: Adding 4 more children (total 5) and verifying color rotation
  for (let i = 1; i < 5; i++) {
    const nextColorIndex = childrenData.length % PRESET_COLORS.length;
    childrenData.push({
      name: '',
      color: PRESET_COLORS[nextColorIndex].hex,
      amount: '',
      percent: '',
    });
  }

  assert(childrenData.length === 5, '5 children now present in state');
  assert(childrenData[1].color === '#10B981', 'Child 2 default color is Emerald');
  assert(childrenData[2].color === '#F59E0B', 'Child 3 default color is Amber');
  assert(childrenData[3].color === '#EC4899', 'Child 4 default color is Rose');
  assert(childrenData[4].color === '#8B5CF6', 'Child 5 default color is Purple');

  // Test 4: Modifying colors for newly added children (Simulating color selector popover click)
  function handleColorChange(index: number, newHex: string) {
    childrenData[index] = { ...childrenData[index], color: newHex };
  }

  // User changes Child 5 (index 4) color to Cyan (#06B6D4)
  handleColorChange(4, '#06B6D4');
  assert(childrenData[4].color === '#06B6D4', 'Child 5 color updated to Cyan');

  // User changes Child 1 (index 0) color to Teal (#14B8A6)
  handleColorChange(0, '#14B8A6');
  assert(childrenData[0].color === '#14B8A6', 'Child 1 color updated to Teal');

  // Test 5: Adding child beyond 8 rotates colors without crashing
  for (let i = 5; i < 12; i++) {
    const nextColorIndex = childrenData.length % PRESET_COLORS.length;
    childrenData.push({
      name: `Child ${i + 1}`,
      color: PRESET_COLORS[nextColorIndex].hex,
      amount: '',
      percent: '',
    });
  }
  assert(childrenData.length === 12, '12 children added dynamically');
  // Child 9 (index 8) should wrap around to PRESET_COLORS[0]
  assert(childrenData[8].color === PRESET_COLORS[0].hex, 'Child 9 wrapped around to first preset color');

  // Test 6: Removing children and verifying state integrity
  function handleRemoveChild(indexToRemove: number) {
    if (childrenData.length <= 1) return;
    childrenData = childrenData.filter((_, idx) => idx !== indexToRemove);
  }

  // Remove child at index 2
  const removedColor = childrenData[2].color;
  handleRemoveChild(2);
  assert(childrenData.length === 11, 'Child removed, length is 11');

  // Test 7: Split evenly logic with dynamic children count
  function simulateSplitEvenly(total: number, kids: ChildFormState[]): ChildFormState[] {
    const count = kids.length;
    const basePerKid = Math.floor((total / count) * 100) / 100;
    const totalBase = basePerKid * count;
    const remainderCents = Math.round((total - totalBase) * 100);

    return kids.map((c, idx) => {
      const extra = idx < remainderCents ? 0.01 : 0;
      const amt = (basePerKid + extra).toFixed(2);
      const pct = ((parseFloat(amt) / total) * 100).toFixed(1);
      return { ...c, amount: amt, percent: pct };
    });
  }

  // Test split on $1000 across 3 kids
  const testKids: ChildFormState[] = [
    { name: 'Alice', color: '#3B82F6', amount: '', percent: '' },
    { name: 'Bob', color: '#10B981', amount: '', percent: '' },
    { name: 'Charlie', color: '#F59E0B', amount: '', percent: '' },
  ];
  const splitResult = simulateSplitEvenly(1000, testKids);
  const sumAmounts = splitResult.reduce((sum, k) => sum + parseFloat(k.amount), 0);
  assert(Number(sumAmounts.toFixed(2)) === 1000, 'Split evenly sums to exact total: $333.34 + $333.33 + $333.33 = $1000.00');

  // Test 8: Validation logic
  function validateOnboarding(accountName: string, apy: number, total: number, kids: ChildFormState[]) {
    const currentAllocated = Number(kids.reduce((s, k) => s + (parseFloat(k.amount) || 0), 0).toFixed(2));
    const isBalanced = Math.abs(total - currentAllocated) < 0.01 && total > 0;
    const allNamesEntered = kids.length > 0 && kids.every((k) => k.name.trim().length > 0);
    const canSubmit = isBalanced && allNamesEntered && apy > 0 && accountName.trim().length > 0;
    return { canSubmit, isBalanced, allNamesEntered };
  }

  const v1 = validateOnboarding('Wealthfront', 5.0, 1000, splitResult);
  assert(v1.canSubmit === true, 'Valid onboarding form passes validation');

  const emptyKidNames = splitResult.map((k) => ({ ...k, name: '' }));
  const v2 = validateOnboarding('Wealthfront', 5.0, 1000, emptyKidNames);
  assert(v2.canSubmit === false && v2.allNamesEntered === false, 'Blank kid names block submission');

  console.log(`\nOnboarding Tests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runOnboardingTests();
