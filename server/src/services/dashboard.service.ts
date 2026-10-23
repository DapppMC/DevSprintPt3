import { LOW_STOCK_THRESHOLD } from '../lib/constants';
import { db } from '../lib/db';
import { endOfDayWib, startOfDayWib } from '../lib/dates';
import type { DashboardDto } from '../types/dto';
import { toProductDto } from './product.service';
import { saleSummaryInclude, toSaleSummaryDto } from './sale.service';
import { getFallbackDashboard } from '../lib/fallback-data';
import { getDatabaseStatus, markDatabaseDown, markDatabaseUp } from '../lib/db-health';

export async function getDashboard(options?: { maskFinancials?: boolean }): Promise<DashboardDto> {
  if (!getDatabaseStatus()) {
    return getFallbackDashboard(options?.maskFinancials);
  }

  try {
    const now = new Date();
    const lowStockWhere = { stock: { lte: LOW_STOCK_THRESHOLD }, isActive: true };

    const [totalProducts, stockSum, todaySales, lowStockCount, latestSales, lowStockProducts] =
      await Promise.all([
        db.product.count(),
        db.product.aggregate({ _sum: { stock: true } }),
        options?.maskFinancials
          ? Promise.resolve({ _sum: { total: null } })
          : db.sale.aggregate({
              _sum: { total: true },
              where: { createdAt: { gte: startOfDayWib(now), lt: endOfDayWib(now) } },
            }),
        db.product.count({ where: lowStockWhere }),
        options?.maskFinancials
          ? Promise.resolve([])
          : db.sale.findMany({
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: saleSummaryInclude,
            }),
        db.product.findMany({
          where: lowStockWhere,
          orderBy: [{ stock: 'asc' }, { name: 'asc' }],
          take: 10,
        }),
      ]);

    markDatabaseUp();

    return {
      totalProducts,
      totalUnits: stockSum._sum.stock ?? 0,
      todaySalesTotal: options?.maskFinancials ? null : todaySales._sum.total?.toNumber() ?? 0,
      lowStockCount,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      latestSales: options?.maskFinancials ? [] : latestSales.map(toSaleSummaryDto),
      lowStockProducts: lowStockProducts.map((p) =>
        toProductDto(p, { hidePurchasePrice: options?.maskFinancials }),
      ),
    };
  } catch (err) {
    console.warn(
      '[Dashboard] Database query failed, activating fast demo fallback:',
      (err as Error).message,
    );
    markDatabaseDown();
    return getFallbackDashboard(options?.maskFinancials);
  }
}
