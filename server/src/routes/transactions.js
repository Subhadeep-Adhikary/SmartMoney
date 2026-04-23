import express from "express";
import Transaction from "../models/Transaction.js";

const router = express.Router();
const EXPENSE_CATEGORIES = [
  "food",
  "entertainment",
  "travel",
  "shopping",
  "daily_necessities",
  "other"
];
const SAVINGS_SECTIONS = ["bank", "liquid_money", "stock", "other"];

router.get("/", async (_req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transactions." });
  }
});

router.get("/summary", async (_req, res) => {
  try {
    const result = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ["$type", "income"] }, "$amount", 0]
            }
          },
          totalExpense: {
            $sum: {
              $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0]
            }
          },
          savingsAdded: {
            $sum: {
              $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0]
            }
          },
          savingsWithdrawn: {
            $sum: {
              $cond: [{ $eq: ["$type", "withdraw"] }, "$amount", 0]
            }
          },
          debtReceived: {
            $sum: {
              $cond: [{ $eq: ["$type", "debt_received"] }, "$amount", 0]
            }
          },
          debtReceivedCleared: {
            $sum: {
              $cond: [{ $eq: ["$type", "debt_received_clear"] }, "$amount", 0]
            }
          },
          debtTaken: {
            $sum: {
              $cond: [{ $eq: ["$type", "debt_taken"] }, "$amount", 0]
            }
          },
          debtTakenCleared: {
            $sum: {
              $cond: [{ $eq: ["$type", "debt_taken_clear"] }, "$amount", 0]
            }
          }
        }
      }
    ]);

    const savingsBySectionAgg = await Transaction.aggregate([
      {
        $match: {
          type: { $in: ["deposit", "withdraw"] },
          savingsSection: { $in: SAVINGS_SECTIONS }
        }
      },
      {
        $group: {
          _id: "$savingsSection",
          added: {
            $sum: {
              $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0]
            }
          },
          withdrawn: {
            $sum: {
              $cond: [{ $eq: ["$type", "withdraw"] }, "$amount", 0]
            }
          }
        }
      }
    ]);

    const savingsBySection = SAVINGS_SECTIONS.reduce((acc, section) => {
      acc[section] = 0;
      return acc;
    }, {});

    savingsBySectionAgg.forEach((item) => {
      savingsBySection[item._id] = (item.added || 0) - (item.withdrawn || 0);
    });

    const totals = result[0] || {
      totalIncome: 0,
      totalExpense: 0,
      savingsAdded: 0,
      savingsWithdrawn: 0,
      debtReceived: 0,
      debtReceivedCleared: 0,
      debtTaken: 0,
      debtTakenCleared: 0
    };
    const debtReceivedOutstanding = totals.debtReceived - totals.debtReceivedCleared;
    const debtTakenOutstanding = totals.debtTaken - totals.debtTakenCleared;

    res.json({
      totalIncome: totals.totalIncome,
      totalExpense: totals.totalExpense,
      balance: totals.totalIncome - totals.totalExpense,
      savingsAdded: totals.savingsAdded,
      savingsWithdrawn: totals.savingsWithdrawn,
      savingsBalance: totals.savingsAdded - totals.savingsWithdrawn,
      savingsBySection,
      debtReceived: debtReceivedOutstanding,
      debtTaken: debtTakenOutstanding,
      netDebt: debtReceivedOutstanding - debtTakenOutstanding
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch summary." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, amount, description, category, savingsSection, debtSourceId } = req.body;
    const parsedAmount = Number(amount);

    if (
      ![
        "income",
        "expense",
        "deposit",
        "withdraw",
        "debt_received",
        "debt_taken",
        "debt_received_clear",
        "debt_taken_clear"
      ].includes(type)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Type must be income, expense, deposit, withdraw, debt_received, debt_taken, debt_received_clear, or debt_taken_clear."
        });
    }

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0." });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Description is required." });
    }

    if (type === "expense" && !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message:
          "Expense category must be one of: food, entertainment, travel, shopping, daily_necessities, other."
      });
    }

    if (["deposit", "withdraw"].includes(type) && !SAVINGS_SECTIONS.includes(savingsSection)) {
      return res.status(400).json({
        message: "Savings section must be one of: bank, liquid_money, stock, other."
      });
    }

    if (type === "withdraw") {
      const savings = await Transaction.aggregate([
        {
          $match: {
            savingsSection
          }
        },
        {
          $group: {
            _id: null,
            savingsAdded: {
              $sum: {
                $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0]
              }
            },
            savingsWithdrawn: {
              $sum: {
                $cond: [{ $eq: ["$type", "withdraw"] }, "$amount", 0]
              }
            }
          }
        }
      ]);

      const totals = savings[0] || { savingsAdded: 0, savingsWithdrawn: 0 };
      const availableSavings = totals.savingsAdded - totals.savingsWithdrawn;

      if (parsedAmount > availableSavings) {
        return res.status(400).json({ message: "Insufficient savings balance." });
      }
    }

    if (["debt_received_clear", "debt_taken_clear"].includes(type)) {
      const clearTargetType = type === "debt_received_clear" ? "debt_received" : "debt_taken";
      const clearType = type;
      let availableToClear = 0;

      if (debtSourceId) {
        const sourceDebt = await Transaction.findById(debtSourceId);

        if (!sourceDebt) {
          return res.status(400).json({ message: "Debt entry not found." });
        }

        if (sourceDebt.type !== clearTargetType) {
          return res.status(400).json({ message: "Invalid debt clear target." });
        }

        const sourceSummary = await Transaction.aggregate([
          {
            $match: {
              debtSourceId: sourceDebt._id,
              type: clearType
            }
          },
          {
            $group: {
              _id: null,
              totalCleared: { $sum: "$amount" }
            }
          }
        ]);

        const sourceCleared = sourceSummary[0]?.totalCleared || 0;
        availableToClear = sourceDebt.amount - sourceCleared;
      } else {
        const debtSummary = await Transaction.aggregate([
          {
            $group: {
              _id: null,
              totalDebt: {
                $sum: {
                  $cond: [{ $eq: ["$type", clearTargetType] }, "$amount", 0]
                }
              },
              totalCleared: {
                $sum: {
                  $cond: [{ $eq: ["$type", clearType] }, "$amount", 0]
                }
              }
            }
          }
        ]);

        const debtTotals = debtSummary[0] || { totalDebt: 0, totalCleared: 0 };
        availableToClear = debtTotals.totalDebt - debtTotals.totalCleared;
      }

      if (availableToClear <= 0) {
        return res.status(400).json({ message: "No debt available to clear." });
      }

      if (parsedAmount > availableToClear) {
        return res.status(400).json({ message: "Clear amount exceeds pending debt." });
      }
    }

    const transaction = await Transaction.create({
      type,
      amount: parsedAmount,
      description: description.trim(),
      category: type === "expense" ? category : null,
      savingsSection: ["deposit", "withdraw"].includes(type) ? savingsSection : null,
      debtSourceId: ["debt_received_clear", "debt_taken_clear"].includes(type) && debtSourceId
        ? debtSourceId
        : null
    });

    return res.status(201).json(transaction);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create transaction." });
  }
});

export default router;
