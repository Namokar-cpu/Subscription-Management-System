import { BillingUnit } from '@prisma/client';

export function addBillingInterval(start: Date, unit: BillingUnit, intervalCount: number) {
  const end = new Date(start);
  if (unit === BillingUnit.DAY) {
    end.setUTCDate(end.getUTCDate() + intervalCount);
    return end;
  }
  if (unit === BillingUnit.WEEK) {
    end.setUTCDate(end.getUTCDate() + intervalCount * 7);
    return end;
  }

  const originalDay = end.getUTCDate();
  end.setUTCDate(1);
  if (unit === BillingUnit.MONTH) end.setUTCMonth(end.getUTCMonth() + intervalCount);
  else end.setUTCFullYear(end.getUTCFullYear() + intervalCount);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(originalDay, lastDay));
  return end;
}
