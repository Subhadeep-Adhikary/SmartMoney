import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "income",
        "expense",
        "deposit",
        "withdraw",
        "debt_received",
        "debt_taken",
        "debt_received_clear",
        "debt_taken_clear"
      ],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ["food", "entertainment", "travel", "shopping", "daily_necessities", "other"],
      default: null
    },
    savingsSection: {
      type: String,
      enum: ["bank", "liquid_money", "stock", "other"],
      default: null
    },
    debtSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
