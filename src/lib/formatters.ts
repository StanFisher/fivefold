export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const PRESET_COLORS = [
  { name: 'Ocean Blue', hex: '#3B82F6', bgLight: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  { name: 'Emerald', hex: '#10B981', bgLight: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { name: 'Amber', hex: '#F59E0B', bgLight: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  { name: 'Rose', hex: '#EC4899', bgLight: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  { name: 'Purple', hex: '#8B5CF6', bgLight: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  { name: 'Cyan', hex: '#06B6D4', bgLight: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  { name: 'Indigo', hex: '#6366F1', bgLight: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  { name: 'Teal', hex: '#14B8A6', bgLight: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
];
