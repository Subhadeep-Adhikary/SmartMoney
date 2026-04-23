import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const EXPENSE_CATEGORIES = [
  { value: "food", label: "Food", color: "#ff8a65" },
  { value: "entertainment", label: "Entertainment", color: "#9575cd" },
  { value: "travel", label: "Travel", color: "#4db6ac" },
  { value: "shopping", label: "Shopping", color: "#64b5f6" },
  { value: "daily_necessities", label: "Daily Necessities", color: "#aed581" },
  { value: "other", label: "Other", color: "#f6bf63" }
];
const SAVINGS_SECTIONS = [
  { value: "bank", label: "Bank", color: "#4f8ef7" },
  { value: "liquid_money", label: "Liquid Cash", color: "#27ae60" },
  { value: "stock", label: "Stock", color: "#f39c12" },
  { value: "other", label: "Other", color: "#9b59b6" }
];
const ANALYSIS_RANGES = [
  { key: "daily", label: "Daily", title: "Daily Expenses" },
  { key: "weekly", label: "Weekly", title: "Weekly Expenses" },
  { key: "monthly", label: "Monthly", title: "Monthly Expenses" }
];
const CALENDAR_WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const DEBT_CATEGORIES = [
  { value: "debt_received", label: "Taken" },
  { value: "debt_taken", label: "Given" }
];
const DEBT_CLEAR_TYPES = [
  { value: "debt_received_clear", label: "Taken Debt" },
  { value: "debt_taken_clear", label: "Given Debt" }
];
const DEFAULT_ANALYSIS_LIMITS = { low: 500, medium: 2000, high: 5000 };
const ANALYSIS_LIMITS_KEY = "expense_analysis_limits";
const APP_THEME_KEY = "smart_money_theme";
const FUTURE_EXPENSE_GOALS_KEY = "future_expense_goals";

const loadInitialTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem(APP_THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value || 0);

const formatDateTime = (value) => new Date(value).toLocaleString();
const formatDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};
const formatAxisTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

const loadSavedAnalysisLimits = () => {
  if (typeof window === "undefined") {
    return DEFAULT_ANALYSIS_LIMITS;
  }

  try {
    const saved = window.localStorage.getItem(ANALYSIS_LIMITS_KEY);
    if (!saved) {
      return DEFAULT_ANALYSIS_LIMITS;
    }

    const parsed = JSON.parse(saved);
    if (
      typeof parsed.low === "number" &&
      typeof parsed.medium === "number" &&
      typeof parsed.high === "number" &&
      parsed.low >= 0 &&
      parsed.low < parsed.medium &&
      parsed.medium < parsed.high
    ) {
      return parsed;
    }
  } catch (_error) {
    return DEFAULT_ANALYSIS_LIMITS;
  }

  return DEFAULT_ANALYSIS_LIMITS;
};

const loadSavedFutureExpenseGoals = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(FUTURE_EXPENSE_GOALS_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          typeof item?.title === "string" &&
          item.title.trim() &&
          Number(item.targetAmount) > 0
      )
      .map((item) => ({
        id: String(item.id || `goal-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
        title: item.title.trim(),
        targetAmount: Number(item.targetAmount),
        targetDate: item.targetDate ? String(item.targetDate) : "",
        createdAt: item.createdAt || new Date().toISOString()
      }));
  } catch (_error) {
    return [];
  }
};

const getCategoryMeta = (value) =>
  EXPENSE_CATEGORIES.find((item) => item.value === value) ||
  EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

const getSavingsSectionMeta = (value) =>
  SAVINGS_SECTIONS.find((item) => item.value === value) || SAVINGS_SECTIONS[0];

const getSavingsSectionLabel = (value) => getSavingsSectionMeta(value).label;
const getSavingsSectionIconPath = (value) => {
  const icons = {
    bank: "M3 21h18M5 21V10l7-4 7 4v11M9 14h2m2 0h2",
    stock: "M4 18h16M6 14l4-4 3 2 5-6M16 8h3v3",
    liquid_money: "M4 7h16v10H4zM16 12h4M7 11h5M7 14h3",
    other: "M6 6h4v4H6zM14 6h4v4h-4zM6 14h4v4H6zM14 14h4v4h-4z"
  };
  return icons[value] || icons.other;
};
const getDebtLabel = (value) => DEBT_CATEGORIES.find((item) => item.value === value)?.label || "Taken";
const getDebtClearLabel = (value) =>
  DEBT_CLEAR_TYPES.find((item) => item.value === value)?.label || "Taken Debt";
const getDebtCounterparty = (item) => {
  const text = item?.description || "";
  const takenMatch = text.match(/Debt Taken from\s+(.+)/i);
  if (takenMatch?.[1]) {
    return takenMatch[1].trim();
  }
  const givenMatch = text.match(/Debt Given to\s+(.+)/i);
  if (givenMatch?.[1]) {
    return givenMatch[1].trim();
  }
  return "Unknown";
};
const getDebtHistoryCounterparty = (item) => {
  if (["debt_received", "debt_taken"].includes(item?.type)) {
    return getDebtCounterparty(item);
  }
  const clearMatch = (item?.description || "").match(/-\s*(.+)$/);
  return clearMatch?.[1] ? clearMatch[1].trim() : "-";
};
const getDebtHistoryTypeLabel = (type) => {
  if (type === "debt_received") {
    return "Taken";
  }
  if (type === "debt_taken") {
    return "Given";
  }
  if (type === "debt_received_clear") {
    return "Taken Cleared";
  }
  if (type === "debt_taken_clear") {
    return "Given Cleared";
  }
  return "Debt";
};

const getSpendingLevel = (total, limits) => {
  if (total <= limits.low) {
    return {
      key: "low",
      label: "Low",
      note: `Spending is low (up to ${formatCurrency(limits.low)}).`
    };
  }
  if (total <= limits.medium) {
    return {
      key: "medium",
      label: "Medium",
      note: `Spending is medium (${formatCurrency(limits.low)} to ${formatCurrency(
        limits.medium
      )}).`
    };
  }
  return {
    key: "high",
    label: "High",
    note: `Spending is high (above ${formatCurrency(limits.medium)}).`
  };
};

const buildPieGradient = (slices, total) => {
  if (!total || slices.length === 0) {
    return "conic-gradient(#e9eef5 0deg 360deg)";
  }

  let currentAngle = 0;
  const parts = slices.map((slice) => {
    const start = currentAngle;
    const end = start + (slice.amount / total) * 360;
    currentAngle = end;
    return `${slice.color} ${start}deg ${end}deg`;
  });

  if (currentAngle < 360) {
    parts.push(`#e9eef5 ${currentAngle}deg 360deg`);
  }

  return `conic-gradient(${parts.join(", ")})`;
};

const buildSmoothPath = (points) => {
  if (!points || points.length === 0) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    path += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }

  return path;
};

function UIIcon({ path, viewBox = "0 0 24 24" }) {
  return (
    <svg className="ui-icon" viewBox={viewBox} fill="none" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function Popup({ title, onClose, children }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(event) => event.stopPropagation()}>
        <div className="popup-head">
          <h3>{title}</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AnalysisPieChart({ title, data }) {
  const gradient = buildPieGradient(data.slices, data.total);

  return (
    <article className="analysis-card">
      <div className="analysis-head">
        <h3>{title}</h3>
        <span className={`level-badge level-${data.level.key}`}>{data.level.label}</span>
      </div>

      <div className="pie-wrap">
        <div className="pie-chart" style={{ background: gradient }}>
          <div className="pie-center">
            <strong>{formatCurrency(data.total)}</strong>
            <small>Total</small>
          </div>
        </div>
      </div>

      <p className="analysis-note">{data.level.note}</p>
      <small className="analysis-count">Entries: {data.count}</small>

      {data.slices.length === 0 ? (
        <p className="empty">No expense data for this period.</p>
      ) : (
        <ul className="analysis-legend">
          {data.slices.map((slice) => (
            <li key={`${title}-${slice.value}`}>
              <span className="legend-left">
                <span className="legend-dot" style={{ background: slice.color }} />
                {slice.label}
              </span>
              <span>
                {formatCurrency(slice.amount)} ({((slice.amount / data.total) * 100).toFixed(1)}
                %)
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    savingsAdded: 0,
    savingsWithdrawn: 0,
    savingsBalance: 0,
    savingsBySection: {
      bank: 0,
      liquid_money: 0,
      stock: 0,
      other: 0
    },
    debtReceived: 0,
    debtTaken: 0,
    netDebt: 0
  });
  const [mainForm, setMainForm] = useState({
    type: "expense",
    amount: "",
    description: "",
    category: "food"
  });
  const [savingsForm, setSavingsForm] = useState({
    type: "deposit",
    amount: "",
    savingsSection: "bank"
  });
  const [debtForm, setDebtForm] = useState({
    type: "debt_received",
    amount: "",
    counterparty: "",
    deductFromSavings: false,
    savingsSection: "bank"
  });
  const [clearDebtForm, setClearDebtForm] = useState({
    type: "debt_received_clear",
    mode: "partial",
    amount: "",
    debtSourceId: "",
    counterparty: "",
    remainingAmount: 0,
    receivingOption: "main",
    returnSavingsSection: "bank"
  });
  const [mainLoading, setMainLoading] = useState(false);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [debtLoading, setDebtLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisLimits, setAnalysisLimits] = useState(loadSavedAnalysisLimits);
  const [analysisLimitForm, setAnalysisLimitForm] = useState(() => {
    const saved = loadSavedAnalysisLimits();
    return {
      low: String(saved.low),
      medium: String(saved.medium),
      high: String(saved.high)
    };
  });
  const [analysisError, setAnalysisError] = useState("");
  const [theme, setTheme] = useState(loadInitialTheme);
  const [currentPage, setCurrentPage] = useState("main");
  const [analysisRange, setAnalysisRange] = useState("daily");
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [activePopup, setActivePopup] = useState(null);
  const [pendingSavingsTransfer, setPendingSavingsTransfer] = useState(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(null);
  const [hoveredSavingsPoint, setHoveredSavingsPoint] = useState(null);
  const [hoveredAnalysisPoint, setHoveredAnalysisPoint] = useState(null);
  const [debtClearAnimation, setDebtClearAnimation] = useState(null);
  const [futureExpenseGoals, setFutureExpenseGoals] = useState(loadSavedFutureExpenseGoals);
  const [futureExpenseForm, setFutureExpenseForm] = useState({
    title: "",
    targetAmount: "",
    targetDate: ""
  });
  const [futureExpenseError, setFutureExpenseError] = useState("");
  const [futurePayLoadingId, setFuturePayLoadingId] = useState(null);
  const [savingsZoom, setSavingsZoom] = useState(1);
  const [analysisZoom, setAnalysisZoom] = useState(1);

  const fetchData = async () => {
    setError("");
    try {
      const [summaryRes, txRes] = await Promise.all([
        fetch(`${API_BASE}/transactions/summary`),
        fetch(`${API_BASE}/transactions`)
      ]);

      if (!summaryRes.ok || !txRes.ok) {
        throw new Error("Could not load data.");
      }

      const [summaryData, txData] = await Promise.all([
        summaryRes.json(),
        txRes.json()
      ]);

      setSummary(summaryData);
      setTransactions(txData);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ANALYSIS_LIMITS_KEY, JSON.stringify(analysisLimits));
    }
  }, [analysisLimits]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    window.localStorage.setItem(APP_THEME_KEY, theme);
    document.body.classList.toggle("dark-theme", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FUTURE_EXPENSE_GOALS_KEY, JSON.stringify(futureExpenseGoals));
    }
  }, [futureExpenseGoals]);

  useEffect(() => {
    if (!activePopup || typeof window === "undefined") {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActivePopup(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePopup]);

  const isInvalidForm = (formData) => {
    const amountInvalid = !formData.amount || Number(formData.amount) <= 0;
    if (amountInvalid) {
      return true;
    }
    if (formData.type === "income" && !formData.description.trim()) {
      return true;
    }
    if (formData.type === "expense" && !formData.category) {
      return true;
    }
    if (["deposit", "withdraw"].includes(formData.type) && !formData.savingsSection) {
      return true;
    }
    if (["debt_received", "debt_taken"].includes(formData.type)) {
      if (!formData.counterparty || !formData.counterparty.trim()) {
        return true;
      }
      if (formData.type === "debt_taken" && formData.deductFromSavings) {
        return !formData.savingsSection;
      }
      return false;
    }
    if (["debt_received_clear", "debt_taken_clear"].includes(formData.type)) {
      if (formData.type === "debt_taken_clear" && formData.receivingOption === "savings") {
        return !formData.returnSavingsSection;
      }
      return false;
    }
    return false;
  };

  const saveTransaction = async (
    formData,
    setFormState,
    setLoadingState,
    defaultState
  ) => {
    if (isInvalidForm(formData)) {
      return false;
    }

    setLoadingState(true);
    setError("");

    try {
      const requestDescription =
        ["deposit", "withdraw"].includes(formData.type)
          ? `${formData.type === "deposit" ? "Added to" : "Withdrawn from"} ${getSavingsSectionLabel(
              formData.savingsSection
            )}`
          : formData.type === "expense"
            ? formData.description.trim() || `Expense (${getCategoryLabel(formData.category)})`
          : ["debt_received", "debt_taken"].includes(formData.type)
            ? `Debt ${formData.type === "debt_received" ? "Taken from" : "Given to"} ${
                formData.counterparty.trim()
              }`
          : ["debt_received_clear", "debt_taken_clear"].includes(formData.type)
            ? `Debt Cleared (${getDebtClearLabel(formData.type)})${
                formData.counterparty ? ` - ${formData.counterparty}` : ""
              }`
          : formData.description.trim();

      const res = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: formData.type,
          amount: Number(formData.amount),
          description: requestDescription,
          category: formData.type === "expense" ? formData.category : undefined,
          savingsSection:
            ["deposit", "withdraw"].includes(formData.type)
              ? formData.savingsSection
              : undefined,
          debtSourceId:
            ["debt_received_clear", "debt_taken_clear"].includes(formData.type)
              ? formData.debtSourceId
              : undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to save transaction.");
      }

      setFormState(defaultState);
      await fetchData();
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      return false;
    } finally {
      setLoadingState(false);
    }
  };

  const openMainPopup = (type) => {
    setMainForm((prev) => ({
      ...prev,
      type,
      amount: "",
      description: "",
      category: type === "expense" ? prev.category || "food" : ""
    }));
    setActivePopup("main");
  };

  const openSavingsPopup = (type) => {
    setSavingsForm({
      type,
      amount: "",
      savingsSection: "bank"
    });
    setPendingSavingsTransfer(null);
    setActivePopup("savings");
  };

  const createTransactionRecord = async (payload) => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to save transaction.");
      }

      return true;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      return false;
    }
  };

  const createMainReductionExpense = async (amount, savingsSection) => {
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "expense",
          amount: Number(amount),
          description: `Transfer to savings (${getSavingsSectionLabel(savingsSection)})`,
          category: "other"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to reduce main money.");
      }

      return true;
    } catch (err) {
      setError(err.message || "Savings added but failed to reduce main money.");
      return false;
    }
  };

  const createMainIncome = async (amount, savingsSection) => {
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "income",
          amount: Number(amount),
          description: `Withdrawal from savings (${getSavingsSectionLabel(savingsSection)})`
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to add to main money.");
      }

      return true;
    } catch (err) {
      setError(err.message || "Savings withdrawn but failed to add to main money.");
      return false;
    }
  };

  const openDebtPopup = (type = "debt_received") => {
    setDebtForm({
      type,
      amount: "",
      counterparty: ""
    });
    setActivePopup("debt");
  };

  const openClearDebtPopup = (targetType, debtEntry = null) => {
    setClearDebtForm({
      type: targetType === "debt_taken" ? "debt_taken_clear" : "debt_received_clear",
      mode: "partial",
      amount: "",
      debtSourceId: debtEntry?._id || "",
      counterparty: debtEntry?.counterparty || "",
      remainingAmount: Number(debtEntry?.remainingAmount || 0)
    });
    setActivePopup("clearDebt");
  };

  const openLimitsPopup = () => {
    setAnalysisLimitForm({
      low: String(analysisLimits.low),
      medium: String(analysisLimits.medium),
      high: String(analysisLimits.high)
    });
    setAnalysisError("");
    setActivePopup("limits");
  };

  const handleMainSubmit = async (event) => {
    event.preventDefault();
    const didSave = await saveTransaction(mainForm, setMainForm, setMainLoading, {
      type: mainForm.type,
      amount: "",
      description: "",
      category: mainForm.type === "expense" ? mainForm.category || "food" : ""
    });
    if (didSave) {
      setActivePopup(null);
    }
  };

  const handleSavingsSubmit = async (event) => {
    event.preventDefault();
    const { type } = savingsForm;

    if (type === "deposit") {
      setPendingSavingsTransfer({ ...savingsForm });
      setActivePopup("reduceMainConfirm");
      return;
    }

    if (type === "withdraw") {
      setPendingWithdrawal({ ...savingsForm });
      setActivePopup("addMainConfirm");
      return;
    }

    const didSave = await saveTransaction(savingsForm, setSavingsForm, setSavingsLoading, {
      type,
      amount: "",
      savingsSection: "bank"
    });
    if (didSave) {
      setActivePopup(null);
    }
  };

  const confirmSavingsWithdrawal = async (addToMain) => {
    if (!pendingWithdrawal) {
      setActivePopup(null);
      return;
    }

    const { amount, savingsSection } = pendingWithdrawal;
    const didSave = await saveTransaction(
      pendingWithdrawal,
      setSavingsForm,
      setSavingsLoading,
      {
        type: "withdraw",
        amount: "",
        savingsSection: "bank"
      }
    );

    if (didSave && addToMain) {
      const didAdd = await createMainIncome(amount, savingsSection);
      if (didAdd) {
        await fetchData();
      }
    }

    if (didSave) {
      setPendingWithdrawal(null);
      setActivePopup(null);
    }
  };

  const confirmSavingsTransfer = async (reduceFromMain) => {
    if (!pendingSavingsTransfer) {
      setActivePopup(null);
      return;
    }

    const { amount, savingsSection } = pendingSavingsTransfer;
    const didSave = await saveTransaction(
      pendingSavingsTransfer,
      setSavingsForm,
      setSavingsLoading,
      {
        type: "deposit",
        amount: "",
        savingsSection: "bank"
      }
    );

    if (didSave && reduceFromMain) {
      const didReduce = await createMainReductionExpense(amount, savingsSection);
      if (didReduce) {
        await fetchData();
      }
    }

    if (didSave) {
      setPendingSavingsTransfer(null);
      setActivePopup(null);
    }
  };

  const handleDebtSubmit = async (event) => {
    event.preventDefault();
    setDebtLoading(true);
    setError("");

    if (debtForm.type === "debt_taken" && debtForm.deductFromSavings) {
      const withdrawPayload = {
        type: "withdraw",
        amount: Number(debtForm.amount),
        description: `Debt given from savings (${getSavingsSectionLabel(debtForm.savingsSection)})`,
        savingsSection: debtForm.savingsSection
      };
      const withdrawDone = await createTransactionRecord(withdrawPayload);
      if (!withdrawDone) {
        setDebtLoading(false);
        return;
      }
    }

    const didSave = await saveTransaction(debtForm, setDebtForm, setDebtLoading, {
      type: debtForm.type,
      amount: "",
      counterparty: "",
      deductFromSavings: false,
      savingsSection: "bank"
    });
    if (didSave) {
      setActivePopup(null);
    }
  };

  const handleClearDebtSubmit = async (event) => {
    event.preventDefault();
    const selectedDebtCard = clearDebtForm.debtSourceId
      ? debtOutstandingCards.find(
          (item) => String(item._id) === String(clearDebtForm.debtSourceId)
        )
      : null;
    const outstanding = clearDebtForm.remainingAmount
      ? Number(clearDebtForm.remainingAmount)
      : clearDebtForm.type === "debt_taken_clear"
        ? summary.debtTaken
        : summary.debtReceived;

    if (outstanding <= 0) {
      setError("No debt available to clear.");
      return;
    }

    const amountToClear =
      clearDebtForm.mode === "complete" ? outstanding : Number(clearDebtForm.amount);

    if (!amountToClear || amountToClear <= 0) {
      setError("Please enter a valid clear amount.");
      return;
    }

    if (amountToClear > outstanding) {
      setError("Clear amount exceeds pending debt.");
      return;
    }

    const didSave = await saveTransaction(
      { ...clearDebtForm, amount: amountToClear },
      setClearDebtForm,
      setDebtLoading,
      {
        type: clearDebtForm.type,
        mode: "partial",
        amount: "",
        debtSourceId: "",
        counterparty: "",
        remainingAmount: 0
      }
    );

    if (didSave) {
      if (clearDebtForm.type === "debt_taken_clear") {
        const receivedAmount = amountToClear;
        if (clearDebtForm.receivingOption === "savings") {
          await createTransactionRecord({
            type: "deposit",
            amount: receivedAmount,
            description: `Repayment deposited to savings (${getSavingsSectionLabel(
              clearDebtForm.returnSavingsSection
            )})`,
            savingsSection: clearDebtForm.returnSavingsSection
          });
        } else {
          await createTransactionRecord({
            type: "income",
            amount: receivedAmount,
            description: `Repayment received from ${clearDebtForm.counterparty}`
          });
        }
      }

      if (
        clearDebtForm.mode === "complete" &&
        clearDebtForm.debtSourceId &&
        selectedDebtCard
      ) {
        const animationId = String(selectedDebtCard._id);
        const baseRemaining = Number(selectedDebtCard.remainingAmount) || 0;
        setDebtClearAnimation({
          id: animationId,
          card: selectedDebtCard,
          remainingAmount: baseRemaining,
          isPopping: false
        });

        setTimeout(() => {
          setDebtClearAnimation((prev) =>
            prev && prev.id === animationId ? { ...prev, remainingAmount: 0 } : prev
          );
        }, 20);

        setTimeout(() => {
          setDebtClearAnimation((prev) =>
            prev && prev.id === animationId ? { ...prev, isPopping: true } : prev
          );
        }, 560);

        setTimeout(() => {
          setDebtClearAnimation((prev) => (prev && prev.id === animationId ? null : prev));
        }, 980);
      }
      setActivePopup(null);
    }
  };

  const applyAnalysisLimits = (event) => {
    event.preventDefault();

    const low = Number(analysisLimitForm.low);
    const medium = Number(analysisLimitForm.medium);
    const high = Number(analysisLimitForm.high);

    if ([low, medium, high].some((value) => Number.isNaN(value) || value < 0)) {
      setAnalysisError("Please enter valid non-negative numbers for all limits.");
      return;
    }

    if (!(low < medium && medium < high)) {
      setAnalysisError("Use increasing values: Low < Medium < High.");
      return;
    }

    setAnalysisLimits({ low, medium, high });
    setAnalysisError("");
    setActivePopup(null);
  };

  const handleFutureExpenseSubmit = (event) => {
    event.preventDefault();
    setFutureExpenseError("");

    const title = futureExpenseForm.title.trim();
    const targetAmount = Number(futureExpenseForm.targetAmount);

    if (!title) {
      setFutureExpenseError("Please enter what you are saving for.");
      return;
    }

    if (Number.isNaN(targetAmount) || targetAmount <= 0) {
      setFutureExpenseError("Please enter a valid target amount.");
      return;
    }

    setFutureExpenseGoals((prev) => [
      ...prev,
      {
        id: `goal-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        title,
        targetAmount,
        targetDate: futureExpenseForm.targetDate || "",
        createdAt: new Date().toISOString()
      }
    ]);
    setFutureExpenseForm({
      title: "",
      targetAmount: "",
      targetDate: ""
    });
    setActivePopup(null);
  };

  useEffect(() => {
    if (futureExpenseError) {
      const timer = setTimeout(() => {
        setFutureExpenseError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [futureExpenseError]);

  const removeFutureExpenseGoal = (goalId) => {
    setFutureExpenseGoals((prev) => prev.filter((goal) => goal.id !== goalId));
  };

  const handleFutureExpensePay = async (goal) => {
    if (!goal || !goal.targetAmount) {
      setError("Invalid scheduled expense.");
      return;
    }

    const amount = Number(goal.targetAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Invalid scheduled payment amount.");
      return;
    }

    if (Number(summary.savingsBalance) < amount) {
      setError("Not enough savings available to pay this scheduled expense.");
      return;
    }

    setFuturePayLoadingId(goal.id);
    const didWithdraw = await createTransactionRecord({
      type: "withdraw",
      amount,
      description: `Pay scheduled expense: ${goal.title}`,
      savingsSection: "bank"
    });

    setFuturePayLoadingId(null);
    if (!didWithdraw) {
      return;
    }

    setFutureExpenseGoals((prev) => prev.filter((item) => item.id !== goal.id));
    await fetchData();
  };

  const mainSubmitDisabled = useMemo(
    () => mainLoading || isInvalidForm(mainForm),
    [mainLoading, mainForm]
  );

  const savingsSubmitDisabled = useMemo(
    () => savingsLoading || isInvalidForm(savingsForm),
    [savingsLoading, savingsForm]
  );

  const debtSubmitDisabled = useMemo(
    () => debtLoading || isInvalidForm(debtForm),
    [debtLoading, debtForm]
  );

  const mainFinanceTransactions = useMemo(
    () =>
      transactions
        .filter((item) => ["income", "expense"].includes(item.type))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [transactions]
  );

  const savingsTransactions = useMemo(
    () =>
      transactions
        .filter((item) => ["deposit", "withdraw"].includes(item.type))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [transactions]
  );


  const debtOutstandingCards = useMemo(() => {
    const debtEntries = transactions
      .filter((item) => ["debt_received", "debt_taken"].includes(item.type))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((item) => ({
        ...item,
        remainingAmount: Number(item.amount) || 0,
        counterparty: getDebtCounterparty(item)
      }));

    const clearEntries = transactions
      .filter((item) => ["debt_received_clear", "debt_taken_clear"].includes(item.type))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const debtById = new Map(debtEntries.map((item) => [String(item._id), item]));

    clearEntries.forEach((clearItem) => {
      const targetDebtType = clearItem.type === "debt_received_clear" ? "debt_received" : "debt_taken";
      let remainingToApply = Number(clearItem.amount) || 0;
      const sourceId = clearItem.debtSourceId ? String(clearItem.debtSourceId) : "";

      if (sourceId && debtById.has(sourceId)) {
        const sourceDebt = debtById.get(sourceId);
        if (sourceDebt.type === targetDebtType && sourceDebt.remainingAmount > 0) {
          const applied = Math.min(sourceDebt.remainingAmount, remainingToApply);
          sourceDebt.remainingAmount -= applied;
          remainingToApply -= applied;
        }
      }

      if (remainingToApply > 0) {
        debtEntries.forEach((entry) => {
          if (remainingToApply <= 0 || entry.type !== targetDebtType || entry.remainingAmount <= 0) {
            return;
          }
          const applied = Math.min(entry.remainingAmount, remainingToApply);
          entry.remainingAmount -= applied;
          remainingToApply -= applied;
        });
      }
    });

    return debtEntries
      .filter((item) => item.remainingAmount > 0)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [transactions]);

  const debtDisplayCards = useMemo(() => {
    if (!debtClearAnimation) {
      return debtOutstandingCards;
    }

    const hasLiveCard = debtOutstandingCards.some(
      (item) => String(item._id) === String(debtClearAnimation.id)
    );

    if (hasLiveCard) {
      return debtOutstandingCards;
    }

    return [
      {
        ...debtClearAnimation.card,
        remainingAmount: debtClearAnimation.remainingAmount,
        __isFxCard: true
      },
      ...debtOutstandingCards
    ];
  }, [debtOutstandingCards, debtClearAnimation]);

  const getCategoryLabel = (category) =>
    EXPENSE_CATEGORIES.find((item) => item.value === category)?.label || "Other";

  const savingsSectionChart = useMemo(() => {
    const slices = SAVINGS_SECTIONS.map((section) => ({
      ...section,
      amount: Math.max(0, Number(summary.savingsBySection?.[section.value] || 0))
    })).filter((section) => section.amount > 0);

    const total = slices.reduce((sum, section) => sum + section.amount, 0);
    return {
      slices,
      total,
      gradient: buildPieGradient(slices, total)
    };
  }, [summary.savingsBySection]);

  const savingsTrend = useMemo(() => {
    const ordered = [...savingsTransactions].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    let running = 0;
    const timeline = ordered.map((item) => {
      const delta = item.type === "deposit" ? Number(item.amount) : -Number(item.amount);
      running += delta;
      return {
        id: item._id,
        time: new Date(item.createdAt).getTime(),
        label: formatDateTime(item.createdAt),
        value: running,
        delta,
        entryType: item.type
      };
    });

    if (timeline.length === 0) {
      return {
        points: "",
        path: "",
        markerPoints: [],
        yTicks: [],
        xTicks: [],
        axisLeft: 56,
        axisRight: 596,
        axisTop: 20,
        axisBottom: 178,
        chartWidth: 620,
        chartHeight: 210,
        min: 0,
        max: 0,
        startLabel: "-",
        endLabel: "-",
        latest: 0
      };
    }

    const width = 620;
    const height = 210;
    const paddingLeft = 56;
    const paddingRight = 24;
    const paddingTop = 20;
    const paddingBottom = 32;
    const axisLeft = paddingLeft;
    const axisRight = width - paddingRight;
    const axisTop = paddingTop;
    const axisBottom = height - paddingBottom;
    const min = Math.min(...timeline.map((p) => p.value), 0);
    const max = Math.max(...timeline.map((p) => p.value), 0);
    const xSpan = Math.max(timeline[timeline.length - 1].time - timeline[0].time, 1);
    const ySpan = Math.max(max - min, 1);

    const markerPoints = timeline.map((point, index) => {
      const x = axisLeft + ((point.time - timeline[0].time) / xSpan) * (axisRight - axisLeft);
      const y = axisBottom - ((point.value - min) / ySpan) * (axisBottom - axisTop);
      return {
        ...point,
        index,
        x,
        y
      };
    });

    const points = markerPoints
      .map((point) => {
        const x = axisLeft + ((point.time - timeline[0].time) / xSpan) * (axisRight - axisLeft);
        const y = axisBottom - ((point.value - min) / ySpan) * (axisBottom - axisTop);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    const yTickValues = [min, min + (max - min) / 2, max].map((value) => Number(value.toFixed(2)));
    const yTicks = yTickValues.map((value) => ({
      value,
      label: formatCurrency(value),
      y: axisBottom - ((value - min) / ySpan) * (axisBottom - axisTop)
    }));

    const startTime = timeline[0].time;
    const endTime = timeline[timeline.length - 1].time;
    const midTime = startTime + (endTime - startTime) / 2;
    const xTicks = [
      { time: startTime, label: formatAxisTime(startTime), x: axisLeft },
      {
        time: midTime,
        label: formatAxisTime(midTime),
        x: axisLeft + ((midTime - startTime) / xSpan) * (axisRight - axisLeft)
      },
      { time: endTime, label: formatAxisTime(endTime), x: axisRight }
    ];

    return {
      points,
      path: buildSmoothPath(markerPoints),
      markerPoints,
      yTicks,
      xTicks,
      axisLeft,
      axisRight,
      axisTop,
      axisBottom,
      chartWidth: width,
      chartHeight: height,
      min,
      max,
      startLabel: timeline[0].label,
      endLabel: timeline[timeline.length - 1].label,
      latest: timeline[timeline.length - 1].value
    };
  }, [savingsTransactions]);

  const totalMoney = useMemo(
    () => summary.balance + summary.savingsBalance + summary.netDebt,
    [summary.balance, summary.savingsBalance, summary.netDebt]
  );

  const futureExpensePlan = useMemo(() => {
    const orderedGoals = [...futureExpenseGoals].sort((a, b) => {
      if (a.targetDate && b.targetDate) {
        return new Date(a.targetDate) - new Date(b.targetDate);
      }
      if (a.targetDate) {
        return -1;
      }
      if (b.targetDate) {
        return 1;
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const savingsBalance = Math.max(0, Number(summary.savingsBalance) || 0);
    let availableSavings = savingsBalance;

    const goals = orderedGoals.map((goal) => {
      const targetAmount = Math.max(0, Number(goal.targetAmount) || 0);
      const allocatedAmount = Math.min(availableSavings, targetAmount);
      availableSavings = Math.max(0, availableSavings - allocatedAmount);
      const remainingAmount = Math.max(0, targetAmount - allocatedAmount);
      const progress = targetAmount > 0 ? (allocatedAmount / targetAmount) * 100 : 0;

      return {
        ...goal,
        targetAmount,
        allocatedAmount,
        remainingAmount,
        progress
      };
    });

    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalRemaining = Math.max(0, totalTarget - savingsBalance);
    const overallProgress = totalTarget > 0 ? Math.min(100, (savingsBalance / totalTarget) * 100) : 0;
    const coveredCount = goals.filter((goal) => goal.remainingAmount <= 0).length;

    return {
      goals,
      totalTarget,
      totalRemaining,
      overallProgress,
      coveredCount
    };
  }, [futureExpenseGoals, summary.savingsBalance]);

  const analysisData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenseTx = transactions.filter((item) => item.type === "expense");

    const buildPeriodData = (list) => {
      const totalsByCategory = {};
      let total = 0;

      list.forEach((item) => {
        const amount = Number(item.amount) || 0;
        const category = getCategoryMeta(item.category).value;
        totalsByCategory[category] = (totalsByCategory[category] || 0) + amount;
        total += amount;
      });

      const slices = EXPENSE_CATEGORIES.map((cat) => ({
        ...cat,
        amount: totalsByCategory[cat.value] || 0
      })).filter((cat) => cat.amount > 0);

      return {
        total,
        count: list.length,
        slices,
        level: getSpendingLevel(total, analysisLimits)
      };
    };

    const dailyTx = expenseTx.filter((item) => {
      const date = new Date(item.createdAt);
      return date >= startOfToday && date <= now;
    });

    const weeklyTx = expenseTx.filter((item) => {
      const date = new Date(item.createdAt);
      return date >= startOfWeek && date <= now;
    });

    const monthlyTx = expenseTx.filter((item) => {
      const date = new Date(item.createdAt);
      return date >= startOfMonth && date <= now;
    });

    return {
      daily: buildPeriodData(dailyTx),
      weekly: buildPeriodData(weeklyTx),
      monthly: buildPeriodData(monthlyTx)
    };
  }, [transactions, analysisLimits]);

  const activeAnalysisConfig =
    ANALYSIS_RANGES.find((item) => item.key === analysisRange) || ANALYSIS_RANGES[0];
  const activeAnalysisData = analysisData[activeAnalysisConfig.key];
  const activeAnalysisTrend = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let start = startOfToday;
    if (analysisRange === "weekly") {
      start = startOfWeek;
    } else if (analysisRange === "monthly") {
      start = startOfMonth;
    }

    const ordered = transactions
      .filter((item) => {
        if (!["income", "expense"].includes(item.type)) {
          return false;
        }
        const date = new Date(item.createdAt);
        return date >= start && date <= now;
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let running = 0;
    const timeline = ordered.map((item) => {
      const amount = Number(item.amount) || 0;
      const delta = item.type === "income" ? amount : -amount;
      running += delta;
      return {
        id: item._id,
        time: new Date(item.createdAt).getTime(),
        label: formatDateTime(item.createdAt),
        value: running,
        amount,
        delta,
        txType: item.type,
        category: item.type === "income" ? "Income" : `Expense (${getCategoryLabel(item.category)})`
      };
    });

    if (timeline.length === 0) {
      return {
        points: "",
        path: "",
        markerPoints: [],
        segments: [],
        startLabel: "-",
        endLabel: "-",
        latest: 0
      };
    }

    const width = 560;
    const height = 220;
    const padding = 24;
    const min = 0;
    const max = Math.max(...timeline.map((p) => p.value), 1);
    const xSpan = Math.max(timeline[timeline.length - 1].time - timeline[0].time, 1);
    const ySpan = Math.max(max - min, 1);

    const markerPoints = timeline.map((point, index) => {
      const x = padding + ((point.time - timeline[0].time) / xSpan) * (width - padding * 2);
      const y =
        height - padding - ((point.value - min) / ySpan) * (height - padding * 2);
      return {
        ...point,
        index,
        x,
        y
      };
    });

    const points = markerPoints
      .map((point) => {
        const x = padding + ((point.time - timeline[0].time) / xSpan) * (width - padding * 2);
        const y =
          height - padding - ((point.value - min) / ySpan) * (height - padding * 2);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    const segments = markerPoints.slice(1).map((point, index) => ({
      x1: markerPoints[index].x,
      y1: markerPoints[index].y,
      x2: point.x,
      y2: point.y,
      txType: point.txType,
      key: `${markerPoints[index].id || index}-${point.id || index + 1}`
    }));

    return {
      points,
      path: buildSmoothPath(markerPoints),
      markerPoints,
      segments,
      startLabel: timeline[0].label,
      endLabel: timeline[timeline.length - 1].label,
      latest: timeline[timeline.length - 1].value
    };
  }, [transactions, analysisRange]);

  useEffect(() => {
    setHoveredSavingsPoint(null);
  }, [savingsTrend.points]);

  useEffect(() => {
    setHoveredAnalysisPoint(null);
  }, [activeAnalysisTrend.points, analysisRange]);

  const analysisExpenseCalendar = useMemo(() => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const totalsByDay = {};
    transactions.forEach((item) => {
      if (item.type !== "expense") {
        return;
      }
      const date = new Date(item.createdAt);
      if (date < monthStart || date > monthEnd) {
        return;
      }
      const day = date.getDate();
      totalsByDay[day] = (totalsByDay[day] || 0) + (Number(item.amount) || 0);
    });

    const getLevelKey = (total) => {
      if (total <= 0) {
        return "none";
      }
      if (total <= analysisLimits.low) {
        return "low";
      }
      if (total <= analysisLimits.medium) {
        return "medium";
      }
      if (total <= analysisLimits.high) {
        return "elevated";
      }
      return "high";
    };

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmpty = monthStart.getDay();
    const cells = [];

    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push({ type: "empty", key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const total = Number(totalsByDay[day] || 0);
      cells.push({
        type: "day",
        key: `day-${day}`,
        day,
        total,
        levelKey: getLevelKey(total)
      });
    }

    return {
      monthLabel: `${MONTH_NAMES[month]} ${year}`,
      cells,
      canGoNext: calendarMonthOffset < 0
    };
  }, [transactions, analysisLimits, calendarMonthOffset]);

  return (
    <main className={`container ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      <section className="panel">
        <div className="app-brand">
          <div className="app-brand-main">
            <div className="app-logo" aria-hidden="true">
              <span>{"\u20B9"}</span>
            </div>
            <div>
              <h1>Smart Money</h1>
              <p>Use quick buttons to log transactions and view your money insights.</p>
            </div>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <UIIcon
              path={
                theme === "dark"
                  ? "M12 3v2m0 14v2M5.64 5.64l1.41 1.41m9.9 9.9 1.41 1.41M3 12h2m14 0h2M5.64 18.36l1.41-1.41m9.9-9.9 1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"
                  : "M20.354 15.354A9 9 0 0 1 8.646 3.646a9 9 0 1 0 11.708 11.708z"
              }
            />
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>

        <div className="page-tabs">
          <button
            type="button"
            className={`tab-btn ${currentPage === "main" ? "active-tab" : ""}`}
            onClick={() => setCurrentPage("main")}
          >
            <UIIcon path="M3 11.5L12 4l9 7.5M6.5 10v9h11v-9" />
            Main Money
          </button>
          <button
            type="button"
            className={`tab-btn ${currentPage === "savings" ? "active-tab" : ""}`}
            onClick={() => setCurrentPage("savings")}
          >
            <UIIcon path="M4 7h16v12H4zM8 7V5h8v2" />
            Savings
          </button>
          <button
            type="button"
            className={`tab-btn ${currentPage === "future" ? "active-tab" : ""}`}
            onClick={() => setCurrentPage("future")}
          >
            <UIIcon path="M4 6h16v14H4zM8 3v6m8-6v6M7 13h4m2 0h4m-9 4h4" />
            Future Plan
          </button>
          <button
            type="button"
            className={`tab-btn ${currentPage === "debt" ? "active-tab" : ""}`}
            onClick={() => setCurrentPage("debt")}
          >
            <UIIcon path="M7 6h10v12H7zM4 9h3m10 0h3" />
            Debt
          </button>
          <button
            type="button"
            className={`tab-btn ${currentPage === "analysis" ? "active-tab" : ""}`}
            onClick={() => setCurrentPage("analysis")}
          >
            <UIIcon path="M4 18h16M7 15l3-3 3 2 4-5" />
            Analysis
          </button>
        </div>

        {currentPage !== "analysis" && (
          <div
            className={`summary-grid ${
              currentPage === "savings" ? "savings-summary-grid" : ""
            }`}
          >
            {currentPage === "savings" ? (
              <>
                <article className="card savings">
                  <UIIcon path="M4 7h16v12H4zM8 7V5h8v2" />
                  <span>Savings Balance</span>
                  <strong>{formatCurrency(summary.savingsBalance)}</strong>
                </article>
              </>
            ) : currentPage === "future" ? (
              <>
                <article className="card savings">
                  <UIIcon path="M4 7h16v12H4zM8 7V5h8v2" />
                  <span>Savings Balance</span>
                  <strong>{formatCurrency(summary.savingsBalance)}</strong>
                </article>
                <article className="card balance">
                  <UIIcon path="M4 6h16v14H4zM8 3v6m8-6v6" />
                  <span>Planned Expenses</span>
                  <strong>{formatCurrency(futureExpensePlan.totalTarget)}</strong>
                </article>
                <article className="card expense">
                  <UIIcon path="M5 12h14M8 9l-3 3 3 3" />
                  <span>Still to Save</span>
                  <strong>{formatCurrency(futureExpensePlan.totalRemaining)}</strong>
                </article>
              </>
            ) : currentPage === "debt" ? (
              <>
              <article className="card balance">
                  <UIIcon path="M7 6h10v12H7zM4 9h3m10 0h3" />
                  <span>Net Debt</span>
                  <strong>{formatCurrency(summary.netDebt)}</strong>
                </article>
                <article className="card income">
                  <UIIcon path="M12 5v14M6 11l6-6 6 6" />
                  <span>Given Debt</span>
                  <strong>{formatCurrency(summary.debtTaken)}</strong>
                </article>
                <article className="card expense">
                  <UIIcon path="M5 12h14M8 9l-3 3 3 3" />
                  <span>Taken Debt</span>
                  <strong>{formatCurrency(summary.debtReceived)}</strong>
                </article>
              </>
            ) : (
              <>
                <article className="card balance">
                  <UIIcon path="M3 11.5L12 4l9 7.5M6.5 10v9h11v-9" />
                  <span>Main Balance</span>
                  <strong>{formatCurrency(summary.balance)}</strong>
                </article>
                <article className="card income">
                  <UIIcon path="M12 5v14M6 11l6-6 6 6" />
                  <span>Total Income</span>
                  <strong>{formatCurrency(summary.totalIncome)}</strong>
                </article>
                <article className="card expense">
                  <UIIcon path="M5 12h14M8 9l-3 3 3 3" />
                  <span>Total Expense</span>
                  <strong>{formatCurrency(summary.totalExpense)}</strong>
                </article>
                {currentPage !== "main" && (
                  <article className="card savings">
                    <UIIcon path="M4 7h16v12H4zM8 7V5h8v2" />
                    <span>Savings Balance</span>
                    <strong>{formatCurrency(summary.savingsBalance)}</strong>
                  </article>
                )}
              </>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {currentPage === "main" && (
          <section className="window-card">
            <h2>
              <UIIcon path="M3 11.5L12 4l9 7.5M6.5 10v9h11v-9" />
              Main Money Window
            </h2>
            <div className="action-row">
              <button
                type="button"
                className="action-btn add-btn"
                onClick={() => openMainPopup("income")}
              >
                <UIIcon path="M12 5v14M5 12h14" />
                  Add Money
              </button>
              <button
                type="button"
                className="action-btn spend-btn"
                onClick={() => openMainPopup("expense")}
              >
                <UIIcon path="M5 12h14" />
                 Add Expense
              </button>
            </div>

            <section className="expense-scroll-card records-scroll-card">
              <h3>Previous Records</h3>
              <div className="expense-header">
                <span>Time</span>
                <span>Category</span>
                <span>Amount</span>
              </div>
              <div className="expense-scroll">
                {mainFinanceTransactions.length === 0 ? (
                  <p className="empty">No finance entries yet.</p>
                ) : (
                  mainFinanceTransactions.map((item) => (
                    <div className="expense-row" key={item._id}>
                      <span>{formatDateTime(item.createdAt)}</span>
                      <span>{item.type === "income" ? "Income" : getCategoryLabel(item.category)}</span>
                      <span className={item.type === "income" ? "plus" : "minus"}>
                        {item.type === "income" ? "+" : "-"} {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        )}

        {currentPage === "savings" && (
          <section className="window-card savings-window">
            <h2>
              <UIIcon path="M4 7h16v12H4zM8 7V5h8v2" />
              Savings Window
            </h2>
            <p className="savings-stats">
              Added: {formatCurrency(summary.savingsAdded)} | Withdrawn:{" "}
              {formatCurrency(summary.savingsWithdrawn)}
            </p>
            <div className="action-row">
              <button
                type="button"
                className="action-btn add-btn"
                onClick={() => openSavingsPopup("deposit")}
              >
                <UIIcon path="M12 5v14M5 12h14" />
                 Add
              </button>
              <button
                type="button"
                className="action-btn spend-btn"
                onClick={() => openSavingsPopup("withdraw")}
              >
                <UIIcon path="M5 12h14" />
                 Withdraw
              </button>
            </div>

            <div className="savings-visual-wrap">
              <div className="savings-pie-wrap">
                <div className="savings-pie-chart" style={{ background: savingsSectionChart.gradient }}>
                  <div className="savings-pie-center">
                    <strong>{formatCurrency(summary.savingsBalance)}</strong>
                    <small>Total Savings</small>
                  </div>
                </div>
              </div>
              <div className="savings-mini-grid">
                {SAVINGS_SECTIONS.map((section) => (
                  <div key={section.value} className="savings-mini-card">
                    <div className="savings-mini-head">
                      <UIIcon path={getSavingsSectionIconPath(section.value)} />
                      <span className="legend-left">
                        <span className="legend-dot" style={{ background: section.color }} />
                        {section.label}
                      </span>
                    </div>
                    <strong>{formatCurrency(summary.savingsBySection?.[section.value] || 0)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <section className="savings-trend-card">
              <div className="trend-head">
                <h3>Savings Amount Over Time</h3>
                <span>{formatCurrency(savingsTrend.latest)}</span>
              </div>

              {savingsTransactions.length === 0 ? (
                <p className="empty">No savings transactions yet.</p>
              ) : (
                <>
                <div className="trend-graph-wrap">
                  <svg viewBox="0 0 620 210" preserveAspectRatio="none" className="trend-graph">
                    {savingsTrend.yTicks.map((tick, index) => (
                      <g key={`s-y-${index}`}>
                        <line
                          x1={savingsTrend.axisLeft}
                          y1={tick.y}
                          x2={savingsTrend.axisRight}
                          y2={tick.y}
                          className="trend-grid-line"
                        />
                        <text
                          x={savingsTrend.axisLeft - 6}
                          y={tick.y + 3}
                          textAnchor="end"
                          className="trend-tick-text"
                        >
                          {tick.label}
                        </text>
                      </g>
                    ))}
                    {savingsTrend.xTicks.map((tick, index) => (
                      <g key={`s-x-${index}`}>
                        <line
                          x1={tick.x}
                          y1={savingsTrend.axisBottom}
                          x2={tick.x}
                          y2={savingsTrend.axisBottom + 4}
                          className="axis-line"
                        />
                        <text
                          x={tick.x}
                          y={savingsTrend.axisBottom + 16}
                          textAnchor="middle"
                          className="trend-tick-text"
                        >
                          {tick.label}
                        </text>
                      </g>
                    ))}
                    <line
                      x1={savingsTrend.axisLeft}
                      y1={savingsTrend.axisBottom}
                      x2={savingsTrend.axisRight}
                      y2={savingsTrend.axisBottom}
                      className="axis-line"
                    />
                    <line
                      x1={savingsTrend.axisLeft}
                      y1={savingsTrend.axisTop}
                      x2={savingsTrend.axisLeft}
                      y2={savingsTrend.axisBottom}
                      className="axis-line"
                    />
                    <text
                      x={(savingsTrend.axisLeft + savingsTrend.axisRight) / 2}
                      y={savingsTrend.chartHeight - 4}
                      textAnchor="middle"
                      className="trend-axis-label"
                    >
                      Time
                    </text>
                    <text
                      x={14}
                      y={savingsTrend.chartHeight / 2}
                      textAnchor="middle"
                      transform={`rotate(-90 14 ${savingsTrend.chartHeight / 2})`}
                      className="trend-axis-label"
                    >
                      Amount (INR)
                    </text>
                    <path d={savingsTrend.path} className="trend-line" />
                    {savingsTrend.markerPoints.map((point) => (
                      <circle
                        key={point.id || `s-point-${point.index}`}
                        cx={point.x}
                        cy={point.y}
                        r={4}
                        className={`trend-marker ${
                          point.entryType === "deposit"
                            ? "trend-marker-deposit"
                            : "trend-marker-withdraw"
                        }`}
                        onMouseEnter={() => setHoveredSavingsPoint(point)}
                        onMouseLeave={() => setHoveredSavingsPoint(null)}
                      />
                    ))}
                  </svg>
                  {hoveredSavingsPoint && (
                    <div
                      key={hoveredSavingsPoint.id || `hover-s-${hoveredSavingsPoint.index}`}
                      className={`chart-hover-tooltip ${
                        hoveredSavingsPoint.entryType === "deposit"
                          ? "tooltip-positive"
                          : "tooltip-negative"
                      } ${hoveredSavingsPoint.y < 58 ? "tooltip-below" : "tooltip-above"}`}
                      style={{
                        left: `${(hoveredSavingsPoint.x / savingsTrend.chartWidth) * 100}%`,
                        top: `${(hoveredSavingsPoint.y / savingsTrend.chartHeight) * 100}%`
                      }}
                    >
                      <strong>
                        {hoveredSavingsPoint.entryType === "deposit"
                          ? "Deposit Marker"
                          : "Withdraw Marker"}
                      </strong>
                      <span>{hoveredSavingsPoint.label}</span>
                      <span>
                        {hoveredSavingsPoint.entryType === "deposit"
                          ? `Significance: savings grew by ${formatCurrency(
                              hoveredSavingsPoint.delta
                            )}, reaching ${formatCurrency(hoveredSavingsPoint.value)}.`
                          : `Significance: savings dropped by ${formatCurrency(
                              Math.abs(hoveredSavingsPoint.delta)
                            )}, ending at ${formatCurrency(hoveredSavingsPoint.value)}.`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="trend-meta">
                  <small>Start: {savingsTrend.startLabel}</small>
                  <small>End: {savingsTrend.endLabel}</small>
                  <small>Min: {formatCurrency(savingsTrend.min)}</small>
                  <small>Max: {formatCurrency(savingsTrend.max)}</small>
                </div>
              </>
            )}
            </section>

            <section className="expense-scroll-card records-scroll-card">
              <h3>Previous Savings Records</h3>
              <div className="records-header">
                <span>Time</span>
                <span>Type</span>
                <span>Category</span>
                <span>Amount</span>
              </div>
              <div className="expense-scroll">
                {savingsTransactions.length === 0 ? (
                  <p className="empty">No savings records yet.</p>
                ) : (
                  savingsTransactions.map((item) => (
                    <div className="records-row" key={item._id}>
                      <span>{formatDateTime(item.createdAt)}</span>
                      <span>{item.type === "deposit" ? "Added" : "Withdrawn"}</span>
                      <span>{getSavingsSectionLabel(item.savingsSection)}</span>
                      <span className={item.type === "deposit" ? "plus" : "minus"}>
                        {item.type === "deposit" ? "+" : "-"} {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        )}

        {currentPage === "future" && (
          <section className="window-card future-window">
            <h2>
              <UIIcon path="M4 6h16v14H4zM8 3v6m8-6v6M7 13h4m2 0h4m-9 4h4" />
              Future Expense Scheduling
            </h2>
            <p className="savings-stats">
              This progress uses your current savings balance:{" "}
              <strong>{formatCurrency(summary.savingsBalance)}</strong>
            </p>

            <div className="action-row">
              <button
                type="button"
                className="action-btn add-btn"
                onClick={() => setActivePopup("futureExpense")}
              >
                <UIIcon path="M12 5v14M5 12h14" />
                Schedule New Expense
              </button>
            </div>



            <section className="future-goals-card">
              <div className="trend-head">
                <h3>Scheduled Expenses</h3>
                <span>
                  Overall Progress: {futureExpensePlan.overallProgress.toFixed(1)}% (
                  {futureExpensePlan.coveredCount}/{futureExpensePlan.goals.length} covered)
                </span>
              </div>
              {futureExpensePlan.goals.length === 0 ? (
                <p className="empty">No future expenses scheduled yet.</p>
              ) : (
                <div className="future-goals-grid">
                  {futureExpensePlan.goals.map((goal) => (
                    <article key={goal.id} className="future-goal-card">
                      <div className="future-goal-head">
                        <div>
                          <strong>{goal.title}</strong>
                          <small>
                            {goal.targetDate
                              ? `Target Date: ${formatDate(goal.targetDate)}`
                              : "Target Date: Flexible"}
                          </small>
                        </div>
                        <div className="future-goal-actions">
                          <button
                            type="button"
                            className="future-pay-btn action-btn add-btn"
                            disabled={
                              futurePayLoadingId === goal.id ||
                              Number(summary.savingsBalance) < Number(goal.targetAmount)
                            }
                            onClick={() => handleFutureExpensePay(goal)}
                          >
                            {futurePayLoadingId === goal.id ? "Paying..." : "Pay"}
                          </button>
                          <button
                            type="button"
                            className="future-remove-btn"
                            onClick={() => removeFutureExpenseGoal(goal.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="future-goal-meta">
                        <small>
                          Saved for this plan: {formatCurrency(goal.allocatedAmount)} /{" "}
                          {formatCurrency(goal.targetAmount)}
                        </small>
                        <small>{goal.progress.toFixed(1)}%</small>
                      </div>
                      <div className="future-progress-track">
                        <span
                          className="future-progress-fill"
                          style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                        />
                      </div>
                      <small className={goal.remainingAmount > 0 ? "minus" : "plus"}>
                        {goal.remainingAmount > 0
                          ? `Need ${formatCurrency(goal.remainingAmount)} more`
                          : "Goal is fully covered by current savings"}
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {currentPage === "debt" && (
          <section className="window-card debt-window-scroll">
            <h2>
              <UIIcon path="M7 6h10v12H7zM4 9h3m10 0h3" />
              Debt Window
            </h2>
            <div className="action-row debt-action-row">
              <button
                type="button"
                className="action-btn add-btn"
                onClick={() => openDebtPopup("debt_taken")}
              >
                <UIIcon path="M12 5v14M5 12h14" />
                Given
              </button>
              <button
                type="button"
                className="action-btn spend-btn"
                onClick={() => openDebtPopup("debt_received")}
              >
                <UIIcon path="M12 5v14M6 11l6-6 6 6" />
                Taken
              </button>
            </div>

            <section className="debt-follow-list">
              <h3>Debt Following List</h3>
              {debtDisplayCards.length === 0 ? (
                <p className="empty">No pending debt entries.</p>
              ) : (
                <div className="debt-follow-grid">
                  {debtDisplayCards.map((item) => {
                    const animationState =
                      debtClearAnimation && String(debtClearAnimation.id) === String(item._id)
                        ? debtClearAnimation
                        : null;
                    const isGiven = item.type === "debt_taken";
                    const totalAmount = Number(item.amount) || 0;
                    const remainingAmount = animationState
                      ? Number(animationState.remainingAmount) || 0
                      : Number(item.remainingAmount) || 0;
                    const remainingPercent =
                      totalAmount > 0 ? (remainingAmount / totalAmount) * 100 : 0;
                    const coinPercent = Math.min(97, Math.max(3, remainingPercent));
                    return (
                      <article
                        key={item._id}
                        className={`debt-follow-card ${
                          isGiven ? "debt-follow-given" : "debt-follow-taken"
                        } ${animationState?.isPopping ? "debt-clearing-out" : ""}`}
                      >
                        <div className="debt-follow-top">
                          <span className="chip debt-type-chip">{isGiven ? "Given" : "Taken"}</span>
                          <small>{formatDateTime(item.createdAt)}</small>
                        </div>
                        <strong>{formatCurrency(remainingAmount)}</strong>
                        <p className="debt-follow-party">
                          {isGiven ? "To" : "From"}: {item.counterparty}
                        </p>
                        <div className="debt-progress-meta">
                          <small>
                            Remaining {formatCurrency(remainingAmount)} / {formatCurrency(totalAmount)}
                          </small>
                          <small>{Math.round(remainingPercent)}%</small>
                        </div>
                        <div className="debt-progress-track-wrap">
                          <span
                            className="debt-progress-coin"
                            style={{ left: `${coinPercent}%` }}
                            aria-hidden="true"
                          >
                            {"\u{1FA99}"}
                          </span>
                          <div className="debt-progress-track">
                            <span
                              className={`debt-progress-fill ${
                                isGiven ? "debt-progress-fill-given" : "debt-progress-fill-taken"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, remainingPercent))}%` }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`action-btn ${isGiven ? "add-btn" : "spend-btn"} debt-clear-btn`}
                          disabled={Boolean(animationState)}
                          onClick={() =>
                            openClearDebtPopup(isGiven ? "debt_taken" : "debt_received", item)
                          }
                        >
                          Clear
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

          </section>
        )}

        {currentPage === "analysis" && (
          <section className="window-card analysis-window">
            <h2>
              <UIIcon path="M4 18h16M7 15l3-3 3 2 4-5" />
              Expense Analysis Window
            </h2>
            <section className="analysis-total-money">
              <h3>
                <UIIcon path="M12 5v14M5 12h14" />
                Total Money
              </h3>
              <div className="analysis-money-grid">
                <article className="money-mini-card total">
                  <UIIcon path="M12 5v14M5 12h14" />
                  <span>Total Money</span>
                  <strong>{formatCurrency(totalMoney)}</strong>
                </article>
                <article className="money-mini-card">
                  <UIIcon path="M3 11.5L12 4l9 7.5M6.5 10v9h11v-9" />
                  <span>Main Balance</span>
                  <strong>{formatCurrency(summary.balance)}</strong>
                </article>
                <article className="money-mini-card">
                  <UIIcon path="M4 7h16v12H4zM8 7V5h8v2" />
                  <span>Savings Balance</span>
                  <strong>{formatCurrency(summary.savingsBalance)}</strong>
                </article>
                <article className="money-mini-card">
                  <UIIcon path="M7 6h10v12H7zM4 9h3m10 0h3" />
                  <span>Net Debt</span>
                  <strong>{formatCurrency(summary.netDebt)}</strong>
                </article>
              </div>
            </section>

            <div className="analysis-limit-row">
              <div className="limit-chip">Low: {formatCurrency(analysisLimits.low)}</div>
              <div className="limit-chip">Medium: {formatCurrency(analysisLimits.medium)}</div>
              <div className="limit-chip">High: {formatCurrency(analysisLimits.high)}</div>
              <button type="button" className="tab-btn" onClick={openLimitsPopup}>
                <UIIcon path="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.2 2.2m8.4 8.4 2.2 2.2m0-12.8-2.2 2.2m-8.4 8.4-2.2 2.2" />
                Customize Limits
              </button>
            </div>

            <div className="analysis-chart-switch">
              <div className="analysis-range-nav" role="tablist" aria-label="Analysis Range">
                {ANALYSIS_RANGES.map((range) => (
                  <button
                    key={range.key}
                    type="button"
                    className={`analysis-range-btn ${
                      analysisRange === range.key ? "active-range-btn" : ""
                    }`}
                    onClick={() => setAnalysisRange(range.key)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <div className="analysis-charts-row">
                <AnalysisPieChart title={activeAnalysisConfig.title} data={activeAnalysisData} />
                <article className="analysis-line-card">
                  <div className="analysis-head">
                    <h3>{activeAnalysisConfig.label} Finance Trend</h3>
                    <span className="analysis-count">
                      {formatCurrency(activeAnalysisTrend.latest)}
                    </span>
                  </div>
                  {activeAnalysisTrend.points ? (
                    <>
                      <div className="analysis-line-wrap">
                        <svg
                          viewBox="0 0 560 220"
                          preserveAspectRatio="none"
                          className="analysis-line-svg"
                        >
                          <line
                            x1="24"
                            y1="196"
                            x2="536"
                            y2="196"
                            className="analysis-axis-line"
                          />
                          <line
                            x1="24"
                            y1="24"
                            x2="24"
                            y2="196"
                            className="analysis-axis-line"
                          />
                          {activeAnalysisTrend.segments.map((segment) => (
                            <line
                              key={segment.key}
                              x1={segment.x1}
                              y1={segment.y1}
                              x2={segment.x2}
                              y2={segment.y2}
                              className={`analysis-segment ${
                                segment.txType === "income"
                                  ? "analysis-segment-income"
                                  : "analysis-segment-expense"
                              }`}
                            />
                          ))}
                          {activeAnalysisTrend.markerPoints.map((point) => (
                            <circle
                              key={point.id || `a-point-${point.index}`}
                              cx={point.x}
                              cy={point.y}
                              r={4}
                              className={`analysis-marker ${
                                point.txType === "income"
                                  ? "analysis-marker-income"
                                  : "analysis-marker-expense"
                              }`}
                              onMouseEnter={() => setHoveredAnalysisPoint(point)}
                              onMouseLeave={() => setHoveredAnalysisPoint(null)}
                            />
                          ))}
                        </svg>
                        {hoveredAnalysisPoint && (
                          <div
                            className={`chart-hover-tooltip ${
                              hoveredAnalysisPoint.txType === "income"
                                ? "tooltip-positive"
                                : "tooltip-negative"
                            } ${hoveredAnalysisPoint.y < 58 ? "tooltip-below" : "tooltip-above"}`}
                            style={{
                              left: `${(hoveredAnalysisPoint.x / 560) * 100}%`,
                              top: `${(hoveredAnalysisPoint.y / 220) * 100}%`
                            }}
                          >
                            <strong>
                              {hoveredAnalysisPoint.txType === "income"
                                ? "Income Marker"
                                : "Expense Marker"}
                            </strong>
                            <span>{hoveredAnalysisPoint.label}</span>
                            <span>
                              {hoveredAnalysisPoint.txType === "income"
                                ? `Main balance moved up by ${formatCurrency(
                                    Math.abs(hoveredAnalysisPoint.delta)
                                  )}.`
                                : `Main balance moved down by ${formatCurrency(
                                    Math.abs(hoveredAnalysisPoint.delta)
                                  )}.`}
                            </span>
                            <span>
                              Current state:{" "}
                              {hoveredAnalysisPoint.value > 0
                                ? `Positive (${formatCurrency(hoveredAnalysisPoint.value)})`
                                : hoveredAnalysisPoint.value < 0
                                  ? `Negative (${formatCurrency(hoveredAnalysisPoint.value)})`
                                  : "Neutral (₹0.00)"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="trend-meta">
                        <small>Start: {activeAnalysisTrend.startLabel}</small>
                        <small>End: {activeAnalysisTrend.endLabel}</small>
                      </div>
                    </>
                  ) : (
                    <p className="empty">No expense data for this period.</p>
                  )}
                </article>
              </div>
            </div>

            <section className="analysis-calendar-card">
              <div className="analysis-head calendar-head">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() => setCalendarMonthOffset((prev) => prev - 1)}
                  aria-label="Show previous month"
                >
                  {"<"}
                </button>
                <h3>Expense Calendar ({analysisExpenseCalendar.monthLabel})</h3>
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() => setCalendarMonthOffset((prev) => Math.min(0, prev + 1))}
                  disabled={!analysisExpenseCalendar.canGoNext}
                  aria-label="Show next month"
                >
                  {">"}
                </button>
              </div>
              <div className="calendar-legend-row">
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot cal-low" />
                  Low
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot cal-medium" />
                  Medium
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot cal-none" />
                  No Expense
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot cal-elevated" />
                  High
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot cal-high" />
                  Very High
                </span>
              </div>
              <div className="calendar-grid-wrap">
                {CALENDAR_WEEK_DAYS.map((dayName) => (
                  <div key={`head-${dayName}`} className="calendar-week-head">
                    {dayName}
                  </div>
                ))}
                {analysisExpenseCalendar.cells.map((cell) =>
                  cell.type === "empty" ? (
                    <div key={cell.key} className="calendar-cell calendar-empty" aria-hidden="true" />
                  ) : (
                    <div key={cell.key} className={`calendar-cell cal-${cell.levelKey}`}>
                      <span className="calendar-day">{cell.day}</span>
                      <small>{cell.total > 0 ? formatCurrency(cell.total) : "-"}</small>
                    </div>
                  )
                )}
              </div>
            </section>
          </section>
        )}
      </section>

      {activePopup === "main" && (
        <Popup
          title={mainForm.type === "expense" ? "Add Expense" : "Add Money"}
          onClose={() => setActivePopup(null)}
        >
          <form className="transaction-form popup-form" onSubmit={handleMainSubmit}>
            <p className="popup-type">
              Type:{" "}
              <strong>{mainForm.type === "expense" ? "Expense" : "Add Money"}</strong>
            </p>

            {mainForm.type === "expense" && (
              <div className="field-row">
                <label htmlFor="main-category">Expense Category</label>
                <select
                  id="main-category"
                  value={mainForm.category}
                  onChange={(e) =>
                    setMainForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                >
                  {EXPENSE_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field-row">
              <label htmlFor="main-amount">Amount</label>
              <input
                id="main-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter amount"
                value={mainForm.amount}
                onChange={(e) => setMainForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="field-row">
              <label htmlFor="main-description">
                Description {mainForm.type === "expense" ? "(optional)" : ""}
              </label>
              <input
                id="main-description"
                type="text"
                placeholder={
                  mainForm.type === "expense"
                    ? "Optional note (groceries, fuel...)"
                    : "Salary, freelance, bonus..."
                }
                value={mainForm.description}
                onChange={(e) =>
                  setMainForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <button type="submit" disabled={mainSubmitDisabled}>
              {mainLoading ? "Saving..." : "Save"}
            </button>
          </form>
        </Popup>
      )}

      {activePopup === "savings" && (
        <Popup
          title={savingsForm.type === "withdraw" ? "Withdraw Savings" : "Add to Savings"}
          onClose={() => setActivePopup(null)}
        >
          <form className="transaction-form popup-form" onSubmit={handleSavingsSubmit}>
            <p className="popup-type">
              Type:{" "}
              <strong>{savingsForm.type === "withdraw" ? "Withdraw Money" : "Add Money"}</strong>
            </p>

            <div className="field-row">
              <label htmlFor="savings-section">Category</label>
              <select
                id="savings-section"
                value={savingsForm.savingsSection}
                onChange={(e) =>
                  setSavingsForm((prev) => ({ ...prev, savingsSection: e.target.value }))
                }
              >
                {SAVINGS_SECTIONS.map((section) => (
                  <option key={section.value} value={section.value}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <label htmlFor="savings-amount">Amount</label>
              <input
                id="savings-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter amount"
                value={savingsForm.amount}
                onChange={(e) =>
                  setSavingsForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            <button type="submit" disabled={savingsSubmitDisabled}>
              {savingsLoading ? "Saving..." : "Save"}
            </button>
          </form>
        </Popup>
      )}

      {activePopup === "reduceMainConfirm" && (
        <Popup
          title="Reduce from Main Money?"
          onClose={() => {
            setPendingSavingsTransfer(null);
            setActivePopup(null);
          }}
        >
          <div className="transaction-form popup-form">
            <p className="popup-type">
              Savings amount added. Do you want to reduce the same amount from main money?
            </p>
            <div className="choice-row">
              <button
                type="button"
                className="choice-btn choice-yes active-choice"
                onClick={() => confirmSavingsTransfer(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className="choice-btn choice-no active-choice"
                onClick={() => confirmSavingsTransfer(false)}
              >
                No
              </button>
            </div>
          </div>
        </Popup>
      )}

      {activePopup === "debt" && (
        <Popup title="Add Debt Entry" onClose={() => setActivePopup(null)}>
          <form className="transaction-form popup-form" onSubmit={handleDebtSubmit}>
            <div className="field-row">
              <label htmlFor="debt-type">Category</label>
              <select
                id="debt-type"
                value={debtForm.type}
                onChange={(e) => setDebtForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                {DEBT_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <label htmlFor="debt-amount">Amount</label>
              <input
                id="debt-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter amount"
                value={debtForm.amount}
                onChange={(e) => setDebtForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="field-row">
              <label htmlFor="debt-counterparty">
                {debtForm.type === "debt_received" ? "From" : "To"}
              </label>
              <input
                id="debt-counterparty"
                type="text"
                placeholder={
                  debtForm.type === "debt_received"
                    ? "Who gave you money?"
                    : "Whom did you give money?"
                }
                value={debtForm.counterparty}
                onChange={(e) =>
                  setDebtForm((prev) => ({ ...prev, counterparty: e.target.value }))
                }
              />
            </div>

            {debtForm.type === "debt_taken" && (
              <>
                <div className="field-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={debtForm.deductFromSavings}
                      onChange={(e) =>
                        setDebtForm((prev) => ({
                          ...prev,
                          deductFromSavings: e.target.checked
                        }))
                      }
                    />
                    Deduct this amount from savings now
                  </label>
                </div>
                {debtForm.deductFromSavings && (
                  <div className="field-row">
                    <label htmlFor="debt-savings-section">Savings Section</label>
                    <select
                      id="debt-savings-section"
                      value={debtForm.savingsSection}
                      onChange={(e) =>
                        setDebtForm((prev) => ({ ...prev, savingsSection: e.target.value }))
                      }
                    >
                      {SAVINGS_SECTIONS.map((section) => (
                        <option key={section.value} value={section.value}>
                          {section.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <button type="submit" disabled={debtSubmitDisabled}>
              {debtLoading ? "Saving..." : "Save"}
            </button>
          </form>
        </Popup>
      )}

      {activePopup === "clearDebt" && (
        <Popup title="Clear Debt" onClose={() => setActivePopup(null)}>
          <form className="transaction-form popup-form" onSubmit={handleClearDebtSubmit}>
            <p className="popup-type">
              Debt: <strong>{getDebtClearLabel(clearDebtForm.type)}</strong>
            </p>
            {clearDebtForm.counterparty && (
              <p className="popup-type">
                {clearDebtForm.type === "debt_taken_clear" ? "To" : "From"}:{" "}
                <strong>{clearDebtForm.counterparty}</strong>
              </p>
            )}
            {clearDebtForm.remainingAmount > 0 && (
              <p className="popup-type">
                Pending Amount: <strong>{formatCurrency(clearDebtForm.remainingAmount)}</strong>
              </p>
            )}
            {clearDebtForm.type === "debt_taken_clear" && (
              <div className="field-row">
                <label>Repayment Allocation</label>
                <div className="choice-row">
                  <button
                    type="button"
                    className={`choice-btn ${
                      clearDebtForm.receivingOption === "main" ? "active-choice" : ""
                    }`}
                    onClick={() =>
                      setClearDebtForm((prev) => ({ ...prev, receivingOption: "main" }))
                    }
                  >
                    Main Balance
                  </button>
                  <button
                    type="button"
                    className={`choice-btn ${
                      clearDebtForm.receivingOption === "savings" ? "active-choice" : ""
                    }`}
                    onClick={() =>
                      setClearDebtForm((prev) => ({ ...prev, receivingOption: "savings" }))
                    }
                  >
                    Savings
                  </button>
                </div>
              </div>
            )}
            {clearDebtForm.type === "debt_taken_clear" &&
              clearDebtForm.receivingOption === "savings" && (
                <div className="field-row">
                  <label htmlFor="clear-return-savings-section">Savings Section</label>
                  <select
                    id="clear-return-savings-section"
                    value={clearDebtForm.returnSavingsSection}
                    onChange={(e) =>
                      setClearDebtForm((prev) => ({
                        ...prev,
                        returnSavingsSection: e.target.value
                      }))
                    }
                  >
                    {SAVINGS_SECTIONS.map((section) => (
                      <option key={section.value} value={section.value}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            <div className="field-row">
              <label>Clear Type</label>
              <div className="choice-row">
                <button
                  type="button"
                  className={`choice-btn choice-yes ${
                    clearDebtForm.mode === "partial" ? "active-choice" : ""
                  }`}
                  onClick={() => setClearDebtForm((prev) => ({ ...prev, mode: "partial" }))}
                >
                  Partially
                </button>
                <button
                  type="button"
                  className={`choice-btn choice-no ${
                    clearDebtForm.mode === "complete" ? "active-choice" : ""
                  }`}
                  onClick={() => setClearDebtForm((prev) => ({ ...prev, mode: "complete" }))}
                >
                  Completely
                </button>
              </div>
            </div>

            {clearDebtForm.mode === "partial" ? (
              <div className="field-row">
                <label htmlFor="clear-debt-amount">Amount</label>
                <input
                  id="clear-debt-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter clear amount"
                  value={clearDebtForm.amount}
                  onChange={(e) =>
                    setClearDebtForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                />
              </div>
            ) : (
              <p className="popup-type">
                Entire selected pending debt will be cleared.
              </p>
            )}

            <button type="submit" disabled={debtLoading}>
              {debtLoading ? "Saving..." : "Save"}
            </button>
          </form>
        </Popup>
      )}

      {activePopup === "limits" && (
        <Popup title="Customize Expense Limits" onClose={() => setActivePopup(null)}>
          <form className="transaction-form popup-form" onSubmit={applyAnalysisLimits}>
            <div className="field-row">
              <label htmlFor="low-limit">Low Limit</label>
              <input
                id="low-limit"
                type="number"
                min="0"
                step="0.01"
                value={analysisLimitForm.low}
                onChange={(e) =>
                  setAnalysisLimitForm((prev) => ({ ...prev, low: e.target.value }))
                }
              />
            </div>

            <div className="field-row">
              <label htmlFor="medium-limit">Medium Limit</label>
              <input
                id="medium-limit"
                type="number"
                min="0"
                step="0.01"
                value={analysisLimitForm.medium}
                onChange={(e) =>
                  setAnalysisLimitForm((prev) => ({ ...prev, medium: e.target.value }))
                }
              />
            </div>

            <div className="field-row">
              <label htmlFor="high-limit">High Limit</label>
              <input
                id="high-limit"
                type="number"
                min="0"
                step="0.01"
                value={analysisLimitForm.high}
                onChange={(e) =>
                  setAnalysisLimitForm((prev) => ({ ...prev, high: e.target.value }))
                }
              />
            </div>

            {analysisError && <p className="error">{analysisError}</p>}
            <button type="submit">Apply Limits</button>
          </form>
        </Popup>
      )}
      {activePopup === "futureExpense" && (
        <Popup
          title="Schedule a Future Expense"
          onClose={() => {
            setActivePopup(null);
            setFutureExpenseForm({
              title: "",
              targetAmount: "",
              targetDate: ""
            });
          }}
        >
          <form className="transaction-form future-form" onSubmit={handleFutureExpenseSubmit}>
            <div className="future-form-grid">
              <div className="field-row">
                <label htmlFor="future-expense-title">Saving For</label>
                <input
                  id="future-expense-title"
                  type="text"
                  placeholder="Bike, trip, fees, emergency fund..."
                  value={futureExpenseForm.title}
                  onChange={(event) =>
                    setFutureExpenseForm((prev) => ({
                      ...prev,
                      title: event.target.value
                    }))
                  }
                />
              </div>
              <div className="field-row">
                <label htmlFor="future-expense-target">Target Amount</label>
                <input
                  id="future-expense-target"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter target amount"
                  value={futureExpenseForm.targetAmount}
                  onChange={(event) =>
                    setFutureExpenseForm((prev) => ({
                      ...prev,
                      targetAmount: event.target.value
                    }))
                  }
                />
              </div>
              <div className="field-row">
                <label htmlFor="future-expense-date">Target Date (optional)</label>
                <input
                  id="future-expense-date"
                  type="date"
                  value={futureExpenseForm.targetDate}
                  onChange={(event) =>
                    setFutureExpenseForm((prev) => ({
                      ...prev,
                      targetDate: event.target.value
                    }))
                  }
                />
              </div>
            </div>
            {futureExpenseError && <p className="error">{futureExpenseError}</p>}
            <button type="submit" className="future-add-btn">
              Save Future Expense
            </button>
          </form>
        </Popup>
      )}
          {activePopup === "addMainConfirm" && (
        <Popup title="Confirm Savings Withdrawal" onClose={() => setActivePopup(null)}>
          <div className="confirm-dialog">
            <p>
              Do you want to add <strong>{formatCurrency(pendingWithdrawal?.amount)}</strong> to
              your main money balance as income?
            </p>
            <p className="confirm-note">
              This helps keep your main balance accurate after withdrawing money from savings.
            </p>
            <div className="action-row">
              <button
                type="button"
                className="action-btn"
                onClick={() => confirmSavingsWithdrawal(true)}
              >
                Yes, Add
              </button>
              <button
                type="button"
                className="action-btn spend-btn"
                onClick={() => confirmSavingsWithdrawal(false)}
              >
                No, Just Withdraw
              </button>
            </div>
          </div>
        </Popup>
      )}
    </main>
  );
}

export default App;
