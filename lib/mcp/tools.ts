import {
  breakdown,
  latestSnapshot,
  lineRows,
  portfolioCashflowPoints,
  type PortfolioData,
} from "@/lib/portfolio";
import { buildDssPayload } from "@/lib/dss";
import {
  getPortfolioForUser,
  addOrUpdateHolding,
  recordCashflow,
} from "./portfolio-service";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const AEGIS_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "aegis_get_portfolio_summary",
    description:
      "Get complete Aegis investment portfolio summary: total valuation (IDR), latest snapshot date, asset allocation breakdown by category (Crypto, US Stocks/VWRA, Gold, Cash), platform distribution, and risk metrics.",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Optional user ID to inspect if different from authenticated default.",
        },
      },
    },
  },
  {
    name: "aegis_list_holdings",
    description:
      "List all individual asset holdings in Aegis with units/amounts, latest price, total value, asset category, platform, liquidity, and risk factor.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Optional filter by platform (e.g. 'binance', 'ibkr', 'reksadana', 'bank').",
        },
        category: {
          type: "string",
          description: "Optional filter by account category (e.g. 'equity', 'crypto', 'cash', 'gold').",
        },
        activeOnly: {
          type: "boolean",
          description: "Whether to return only active holdings (default: true).",
        },
      },
    },
  },
  {
    name: "aegis_run_dss_rebalance",
    description:
      "Run the Decision Support System (DSS) rebalancing calculation. Compares current portfolio allocations against target allocations, identifies overweight/underweight asset classes, and generates actionable rebalancing advice.",
    inputSchema: {
      type: "object",
      properties: {
        snapshotId: {
          type: "string",
          description: "Optional specific snapshot ID to analyze (defaults to latest snapshot).",
        },
      },
    },
  },
  {
    name: "aegis_get_cashflow",
    description:
      "Retrieve monthly cashflow history including income sources, expense allocations, and net savings rate into the portfolio.",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Optional filter for a specific year (e.g. 2026).",
        },
      },
    },
  },
  {
    name: "aegis_get_snapshots",
    description:
      "Get historical net worth and portfolio valuation snapshots over time for trend analysis, compound growth, and drawdown tracking.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of recent snapshots to return (default: 12).",
        },
      },
    },
  },
  {
    name: "aegis_add_or_update_holding",
    description:
      "Add a new investment asset or update an existing holding in Aegis (e.g. when the user buys new assets or changes quantities).",
    inputSchema: {
      type: "object",
      properties: {
        asset: {
          type: "string",
          description: "Asset name (e.g. 'Bitcoin', 'Vanguard FTSE All-World UCITS ETF', 'Emas Antam').",
        },
        assetSymbol: {
          type: "string",
          description: "Asset ticker or symbol (e.g. 'BTC', 'VWRA', 'PAXG', 'IDR').",
        },
        platform: {
          type: "string",
          description: "Platform/broker/wallet where the asset is held (e.g. 'IBKR', 'Binance', 'TokoCrypto', 'Bank Mandiri').",
        },
        accountCategory: {
          type: "string",
          description: "Category (e.g. 'Equities', 'Crypto', 'Commodities', 'Cash & Equivalents').",
        },
        riskFactor: {
          type: "string",
          description: "Risk rating (e.g. 'Very Low Risk', 'Low Risk', 'Medium Risk', 'High Risk', 'Very High Risk').",
        },
        liquidity: {
          type: "string",
          description: "Liquidity tier (e.g. 'Liquid (< 24h)', 'Semi-Liquid (2-7d)', 'Illiquid (> 7d)').",
        },
        notes: {
          type: "string",
          description: "Optional notes about the holding or strategy.",
        },
      },
      required: ["asset"],
    },
  },
  {
    name: "aegis_record_cashflow",
    description:
      "Record an income entry or expense/portfolio allocation for a given month in Aegis cashflow tracker.",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Year of the record (e.g. 2026).",
        },
        month: {
          type: "number",
          description: "Month number (1 - 12).",
        },
        type: {
          type: "string",
          enum: ["income", "allocation"],
          description: "Whether this entry is an income or an allocation/expense.",
        },
        categoryOrSourceName: {
          type: "string",
          description: "Name of the income source or expense category.",
        },
        amount: {
          type: "number",
          description: "Amount in IDR.",
        },
        notes: {
          type: "string",
          description: "Optional descriptive note.",
        },
      },
      required: ["year", "month", "type", "categoryOrSourceName", "amount"],
    },
  },
];

function formatIdr(value: number): string {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

export async function executeAegisTool(
  toolName: string,
  args: Record<string, any>,
  userId: string,
): Promise<{ text: string; isError?: boolean }> {
  try {
    const portfolio = await getPortfolioForUser(userId);

    switch (toolName) {
      case "aegis_get_portfolio_summary": {
        const latest = portfolio.snapshots[0] ?? latestSnapshot(portfolio);
        const rows = lineRows(portfolio, latest);
        const totalVal = latest ? latest.totalValue : rows.reduce((s, r) => s + r.value, 0);

        const categoryBreakdown = breakdown(rows, "accountCategory");
        const platformBreakdown = breakdown(rows, "platform");

        const summary = {
          user: portfolio.profile.displayName || userId,
          currency: "IDR",
          totalNetWorth: formatIdr(totalVal),
          totalNetWorthRaw: totalVal,
          latestSnapshotDate: latest?.date ?? "No snapshot recorded yet",
          totalHoldingsCount: portfolio.holdings.length,
          activeHoldingsCount: portfolio.holdings.filter((h) => h.active).length,
          assetAllocation: categoryBreakdown.map((item) => ({
            category: item.name,
            value: formatIdr(item.value),
            percentage: totalVal > 0 ? `${((item.value / totalVal) * 100).toFixed(1)}%` : "0%",
          })),
          platformDistribution: platformBreakdown.slice(0, 6).map((item) => ({
            platform: item.name,
            value: formatIdr(item.value),
            percentage: totalVal > 0 ? `${((item.value / totalVal) * 100).toFixed(1)}%` : "0%",
          })),
          topHoldings: rows.slice(0, 5).map((row) => ({
            asset: row.holding.asset,
            symbol: row.holding.assetSymbol,
            value: formatIdr(row.value),
            share: totalVal > 0 ? `${((row.value / totalVal) * 100).toFixed(1)}%` : "0%",
            platform: row.holding.platform,
          })),
        };

        return {
          text: JSON.stringify(summary, null, 2),
        };
      }

      case "aegis_list_holdings": {
        const latest = portfolio.snapshots[0] ?? latestSnapshot(portfolio);
        const rows = lineRows(portfolio, latest);
        const activeOnly = args.activeOnly ?? true;

        let holdings = portfolio.holdings;
        if (activeOnly) {
          holdings = holdings.filter((h) => h.active);
        }

        if (args.platform) {
          const p = String(args.platform).toLowerCase();
          holdings = holdings.filter((h) => h.platform.toLowerCase().includes(p));
        }

        if (args.category) {
          const c = String(args.category).toLowerCase();
          holdings = holdings.filter((h) => h.accountCategory.toLowerCase().includes(c));
        }

        const enrichedHoldings = holdings.map((h) => {
          const line = rows.find((r) => r.holdingId === h.id);
          return {
            id: h.id,
            asset: h.asset,
            symbol: h.assetSymbol,
            amount: line ? line.amount : 0,
            price: line ? line.price : 0,
            currentValue: line ? formatIdr(line.value) : "Rp 0",
            currentValueRaw: line ? line.value : 0,
            platform: h.platform,
            category: h.accountCategory,
            riskFactor: h.riskFactor,
            liquidity: h.liquidity,
            active: h.active,
            notes: h.notes,
          };
        });

        enrichedHoldings.sort((a, b) => b.currentValueRaw - a.currentValueRaw);

        return {
          text: JSON.stringify(
            {
              totalHoldings: enrichedHoldings.length,
              holdings: enrichedHoldings,
            },
            null,
            2,
          ),
        };
      }

      case "aegis_run_dss_rebalance": {
        const dss = buildDssPayload(portfolio, args.snapshotId);
        if (!dss) {
          return {
            text: "No snapshot data available in Aegis to run DSS rebalance analysis.",
          };
        }

        const totalVal = dss.total;
        const rebalanceAnalysis = dss.categories.map((cat) => {
          const currentShare = totalVal > 0 ? (cat.value / totalVal) * 100 : 0;
          const deltaPercent = currentShare - cat.target;
          const isOver = deltaPercent > cat.threshold;
          const isUnder = deltaPercent < -cat.threshold;
          const targetValue = (cat.target / 100) * totalVal;
          const deltaValue = cat.value - targetValue;

          let status = "Balanced";
          let actionRecommendation = "Maintain current allocation.";

          if (isOver) {
            status = "Overweight";
            actionRecommendation = `Reduce/Trim ${formatIdr(Math.abs(deltaValue))} (${deltaPercent.toFixed(1)}% above target).`;
          } else if (isUnder) {
            status = "Underweight";
            actionRecommendation = `DCA/Add ${formatIdr(Math.abs(deltaValue))} (${Math.abs(deltaPercent).toFixed(1)}% below target).`;
          }

          return {
            category: cat.name,
            currentValue: formatIdr(cat.value),
            currentShare: `${currentShare.toFixed(1)}%`,
            targetShare: `${cat.target.toFixed(1)}%`,
            threshold: `±${cat.threshold}%`,
            status,
            delta: formatIdr(deltaValue),
            recommendation: actionRecommendation,
          };
        });

        const result = {
          portfolioTotal: formatIdr(totalVal),
          weightedRiskScore: dss.weightedRiskScore.toFixed(2),
          riskLabel: dss.riskLabel,
          rebalanceRecommendations: rebalanceAnalysis,
          warnings: dss.warnings,
        };

        return {
          text: JSON.stringify(result, null, 2),
        };
      }

      case "aegis_get_cashflow": {
        let records = portfolio.cashflow.records;
        if (args.year) {
          records = records.filter((r) => r.year === Number(args.year));
        }

        const summary = records.map((rec) => {
          const totalIncome = rec.incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
          const totalAllocation = rec.allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
          const net = totalIncome - totalAllocation;
          return {
            period: `${rec.year}-${String(rec.month).padStart(2, "0")}`,
            totalIncome: formatIdr(totalIncome),
            totalAllocated: formatIdr(totalAllocation),
            netDifference: formatIdr(net),
            notes: rec.notes,
            incomesDetail: rec.incomes,
            allocationsDetail: rec.allocations,
          };
        });

        return {
          text: JSON.stringify(
            {
              count: summary.length,
              cashflowHistory: summary,
            },
            null,
            2,
          ),
        };
      }

      case "aegis_get_snapshots": {
        const limit = args.limit || 12;
        const snapshots = portfolio.snapshots
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit)
          .map((s) => ({
            id: s.id,
            date: s.date,
            totalValue: formatIdr(s.totalValue),
            totalValueRaw: s.totalValue,
            notes: s.notes,
            holdingsCount: s.lines.length,
          }));

        return {
          text: JSON.stringify(
            {
              count: snapshots.length,
              snapshots,
            },
            null,
            2,
          ),
        };
      }

      case "aegis_add_or_update_holding": {
        const res = await addOrUpdateHolding(userId, {
          asset: args.asset,
          assetSymbol: args.assetSymbol || args.asset,
          platform: args.platform || "Manual",
          accountCategory: args.accountCategory || "General",
          riskFactor: args.riskFactor || "Medium Risk",
          liquidity: args.liquidity || "Semi-Liquid (2-7d)",
          notes: args.notes || "",
        });

        return {
          text: JSON.stringify(res, null, 2),
        };
      }

      case "aegis_record_cashflow": {
        const res = await recordCashflow(userId, {
          year: Number(args.year),
          month: Number(args.month),
          type: args.type,
          categoryOrSourceName: args.categoryOrSourceName,
          amount: Number(args.amount),
          notes: args.notes,
        });

        return {
          text: JSON.stringify(res, null, 2),
        };
      }

      default:
        return {
          text: `Unknown tool: '${toolName}'`,
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      text: `Error executing ${toolName}: ${error?.message || String(error)}`,
      isError: true,
    };
  }
}
