import React, { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { usePage, useForm } from "@inertiajs/react";
import { PlusCircle, X, Receipt, Droplet, HandCoins, User } from "lucide-react";
import Swal from "sweetalert2";
import axios from "axios";

const ALL_CONTRIBUTIONS_VALUE = "__ALL_CONTRIBUTIONS__";
const CASH_DONATIONS_KEY = "__CASH_DONATIONS__";
const ROWS_PER_PAGE = 10;
const CUSTOM_CATEGORY_STORAGE_KEY = "admin_expense_categories";

const swalBaseClasses = {
  popup: "rounded-3xl shadow-2xl p-6 text-left",
  title: "text-lg font-bold text-slate-900",
  html: "text-slate-600",
  primaryBtn:
    "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-blue-600 !text-white hover:!bg-blue-700 focus-visible:!ring-2 focus-visible:!ring-blue-300",
  secondaryBtn:
    "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !border !border-slate-200 !text-slate-600 hover:!bg-slate-50",
  warnBtn:
    "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-red-500 !text-white hover:!bg-red-600 focus-visible:!ring-2 focus-visible:!ring-red-300",
};

const fireModal = (options, variant = "primary") => {
  const confirmClass =
    variant === "warn" ? swalBaseClasses.warnBtn : swalBaseClasses.primaryBtn;

  return Swal.fire({
    ...options,
    customClass: {
      popup: swalBaseClasses.popup,
      title: swalBaseClasses.title,
      htmlContainer: swalBaseClasses.html,
      confirmButton: confirmClass,
      cancelButton: swalBaseClasses.secondaryBtn,
      ...(options.customClass || {}),
    },
    buttonsStyling: false,
  });
};

export default function Expenses() {
  const {
    expenses: initialExpenses = [],
    contributions: initialContributions = [],
    cashDonationsAvailable = 0,
    cashDonationsTotal = 0,
    cashDonationExpenses = 0,
    inKindDonations = [],
    donorCount = 0,
  } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [expenses, setExpenses] = useState(initialExpenses || []);
  const [contributions, setContributions] = useState(
    initialContributions || []
  );
  const [cashPool, setCashPool] = useState({
    total: parseFloat(cashDonationsTotal) || 0,
    expenses: parseFloat(cashDonationExpenses) || 0,
    available: parseFloat(cashDonationsAvailable) || 0,
  });
  const [warning, setWarning] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [customCategories, setCustomCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usedQuantity, setUsedQuantity] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [quantityError, setQuantityError] = useState("");

  const Toast = useMemo(
    () =>
      Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: {
          popup:
            "rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 shadow-lg text-sm text-slate-800",
          title: "text-sm font-semibold text-slate-900",
        },
      }),
    []
  );

  const { data, setData, processing, reset } = useForm({
    expense_type: "",
    amount: "",
    expense_date: "",
    description: "",
    contribution_id: "",
    donation_id: "",
  });

  // Donation mode: 'cash' uses contribution/cash pool; 'in-kind' links a specific donation record
  const [donationType, setDonationType] = useState("cash");

  // ✅ Date formatter
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const extractInKindDetails = (description = "") => {
    const qtyMatch = description.match(/\(Qty\s*Used:\s*([0-9]+(?:\.[0-9]+)?)\)/i);
    const cleaned = description
      .replace(/\(Qty\s*Used:[^)]+\)/i, "")
      .replace(/\(Estimated:[^)]+\)/i, "")
      .trim();

    return {
      quantity: qtyMatch ? qtyMatch[1] : null,
      baseDescription: cleaned || (description || "-") || "-",
    };
  };

  const handleDonationTypeChange = (type) => {
    setDonationType(type);
    setWarning("");
    if (type === "in-kind") {
      // Clear contribution selection when switching to in-kind
      setData("contribution_id", "");
      setData("amount", "");
    } else {
      // Clear donation selection when switching back to cash
      setData("donation_id", "");
      setUsedQuantity("");
      setEstimatedCost("");
    }
  };

  // Calculate available funds considering already spent amounts
  const contributionsWithBalance = useMemo(() => {
    return (contributions || []).map((c) => ({
      ...c,
      total_payments: parseFloat(c.total_payments ?? 0),
      total_expenses: parseFloat(c.total_expenses ?? 0),
      available_funds: parseFloat(c.remaining_funds ?? c.available_funds ?? 0),
    }));
  }, [contributions]);

  const cashAvailable = Math.max(parseFloat(cashPool.available ?? 0) || 0, 0);
  const isCashSelected = data.contribution_id === CASH_DONATIONS_KEY;
  const isAllSelected = data.contribution_id === ALL_CONTRIBUTIONS_VALUE;

  const selectedContribution = contributionsWithBalance.find(
    (c) => c.id == data.contribution_id
  );

  const totalAvailableFunds = contributionsWithBalance.reduce((sum, contribution) => {
    const available = parseFloat(contribution.available_funds);
    return sum + (Number.isNaN(available) ? 0 : Math.max(available, 0));
  }, cashAvailable);

  const defaultCategories = useMemo(() => [], []);

  const fundsExpenses = useMemo(
    () =>
      (expenses || []).filter(
        (expense) =>
          !expense?.donation || expense?.donation?.donation_type !== "in-kind"
      ),
    [expenses]
  );

  const cashExpensesTotal = useMemo(
    () =>
      fundsExpenses.reduce((total, expense) => {
        const amount = Number(expense?.amount ?? 0);
        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [fundsExpenses]
  );

  const expenseCategories = useMemo(() => {
    const unique = new Set([...defaultCategories, ...customCategories]);
    (expenses || []).forEach((expense) => {
      if (expense?.expense_type) {
        unique.add(expense.expense_type);
      }
    });
    return Array.from(unique);
  }, [defaultCategories, expenses, customCategories]);

  const hasCategories = expenseCategories.length > 0;

  const selectedInKindDonation = useMemo(() => {
    try {
      return (inKindDonations || []).find((d) => String(d.id) === String(data.donation_id));
    } catch {
      return null;
    }
  }, [inKindDonations, data.donation_id]);

  const selectedDonationRemainingQty = useMemo(() => {
    if (!selectedInKindDonation) return null;
    const donated = Number(selectedInKindDonation.donation_quantity ?? 0);
    const used = Number(selectedInKindDonation.used_quantity ?? 0);
    const damaged = Number(selectedInKindDonation.damaged_quantity ?? 0);
    const unusable = Number(selectedInKindDonation.unusable_quantity ?? 0);
    const explicitRemaining = selectedInKindDonation.usable_quantity ?? selectedInKindDonation.remaining_quantity;

    const derivedRemaining = donated - used - damaged - unusable;
    const baseline = explicitRemaining != null ? Number(explicitRemaining) : derivedRemaining;

    const safeRemaining = Math.max(
      Math.min(Number.isFinite(baseline) ? baseline : derivedRemaining, derivedRemaining),
      0
    );
    return Number.isFinite(safeRemaining) ? safeRemaining : 0;
  }, [selectedInKindDonation]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setCustomCategories(parsed);
      }
    } catch (error) {
      setCustomCategories([]);
    }
  }, []);

  useEffect(() => {
    if (customCategories.length === 0) {
      localStorage.removeItem(CUSTOM_CATEGORY_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      CUSTOM_CATEGORY_STORAGE_KEY,
      JSON.stringify(customCategories)
    );
  }, [customCategories]);

  useEffect(() => {
    if (donationType !== "in-kind") {
      setQuantityError("");
      return;
    }
    const qty = parseFloat(usedQuantity);
    if (!Number.isFinite(qty) || qty <= 0 || selectedDonationRemainingQty == null) {
      setQuantityError("");
      return;
    }
    if (qty > selectedDonationRemainingQty) {
      setQuantityError(
        `Quantity used exceeds available usable quantity (${selectedDonationRemainingQty}).`
      );
    } else {
      setQuantityError("");
    }
  }, [donationType, usedQuantity, selectedDonationRemainingQty]);

  // Filter contributions based on entered amount
  const filteredContributions = contributionsWithBalance.map((c) => ({
    ...c,
    isDisabled:
      data.amount && parseFloat(data.amount) > parseFloat(c.available_funds),
  }));

  const handleContributionChange = (e) => {
    const contributionId = e.target.value;
    setData("contribution_id", contributionId);

    const currentAmount = parseFloat(data.amount);
    if (!data.amount || Number.isNaN(currentAmount)) {
      setWarning("");
    }

    if (contributionId === ALL_CONTRIBUTIONS_VALUE) {
      if (data.amount && !Number.isNaN(currentAmount)) {
        if (currentAmount > totalAvailableFunds) {
          setWarning(
            `Amount exceeds total available funds: ₱${totalAvailableFunds.toFixed(2)}`
          );
        } else {
          setWarning("");
        }
      }
      return;
    }

    if (contributionId === CASH_DONATIONS_KEY) {
      if (data.amount && !Number.isNaN(currentAmount)) {
        if (currentAmount > cashAvailable) {
          setWarning(
            `Amount exceeds available cash donations: ₱${cashAvailable.toFixed(2)}`
          );
        } else {
          setWarning("");
        }
      }
      return;
    }

    if (!contributionId) {
      setWarning("");
      return;
    }

    const nextContribution = contributionsWithBalance.find((c) => c.id == contributionId);
    if (!nextContribution) {
      setWarning("");
      return;
    }

    const available = parseFloat(nextContribution.available_funds);
    if (!isNaN(available) && currentAmount > available) {
      setWarning(
        `Amount exceeds available funds: ₱${available.toFixed(2)}`
      );
    } else {
      setWarning("");
    }
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setData("amount", val);

    const numericVal = parseFloat(val);
    if (!val || Number.isNaN(numericVal)) {
      setWarning("");
      return;
    }

    // No fund checks for in-kind linkage
    if (donationType === "in-kind") {
      setWarning("");
      return;
    }

    if (isAllSelected) {
      if (numericVal > totalAvailableFunds) {
        setWarning(
          `Amount exceeds total available funds: ₱${totalAvailableFunds.toFixed(2)}`
        );
      } else {
        setWarning("");
      }
      return;
    }

    if (isCashSelected) {
      if (numericVal > cashAvailable) {
        setWarning(
          `Amount exceeds available cash donations: ₱${cashAvailable.toFixed(2)}`
        );
      } else {
        setWarning("");
      }
      return;
    }

    if (
      selectedContribution &&
      numericVal > parseFloat(selectedContribution.available_funds)
    ) {
      setWarning(
        `Amount exceeds available funds: ₱${parseFloat(
          selectedContribution.available_funds
        ).toFixed(2)}`
      );
    } else {
      setWarning("");
    }
  };

  const validateExpenseForm = () => {
    const trimmedExpenseType =
      typeof data.expense_type === "string" ? data.expense_type.trim() : "";
    const trimmedDescription =
      typeof data.description === "string" ? data.description.trim() : "";
    const numericAmount = parseFloat(data.amount);
    const messages = [];

    if (!trimmedExpenseType) {
      messages.push("Expense category is required.");
    }

    if (donationType !== "in-kind") {
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        messages.push("Please enter a valid expense amount greater than zero.");
      }
    }

    if (!data.expense_date) {
      messages.push("Expense date is required.");
    }

    if (donationType === "in-kind" && !data.donation_id) {
      messages.push("Please select an in-kind donation.");
    }

    if (donationType === "in-kind") {
      const qty = parseFloat(usedQuantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        messages.push("Please enter a valid quantity used greater than zero.");
      }
      if (
        Number.isFinite(qty) &&
        qty > 0 &&
        selectedDonationRemainingQty != null &&
        qty > selectedDonationRemainingQty
      ) {
        messages.push(
          `Quantity used (${qty}) cannot exceed the available usable quantity (${selectedDonationRemainingQty}).`
        );
      }
    }

    if (messages.length > 0) {
      fireModal({
        icon: "error",
        title: "Invalid input",
        html: `<ul class="text-left space-y-1 text-sm text-slate-600">${messages
          .map((item) => `<li>${item}</li>`)
          .join("")}</ul>`,
      }, "warn");
      return null;
    }

    return {
      trimmedExpenseType,
      trimmedDescription,
      numericAmount,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationResult = validateExpenseForm();
    if (donationType === "in-kind" && quantityError) {
      fireModal({
        icon: "error",
        title: "Quantity exceeds available",
        text: quantityError,
      }, "warn");
      return;
    }

    if (!validationResult) {
      return;
    }

    const { trimmedExpenseType, trimmedDescription, numericAmount } =
      validationResult;

    if (trimmedExpenseType !== data.expense_type) {
      setData("expense_type", trimmedExpenseType);
    }

    if (trimmedDescription !== data.description) {
      setData("description", trimmedDescription);
    }

    const normalizedContributionId = donationType === "in-kind"
      ? null
      : isAllSelected
        ? null
        : isCashSelected
          ? null
          : data.contribution_id || null;

    const finalDescription = donationType === "in-kind"
      ? `${trimmedDescription}${trimmedDescription ? ' ' : ''}(Qty Used: ${parseFloat(usedQuantity)})${estimatedCost ? ` (Estimated: ₱${parseFloat(estimatedCost).toFixed(2)})` : ''}`
      : trimmedDescription;

    const sanitizedData = {
      ...data,
      contribution_id: normalizedContributionId,
      donation_id: donationType === "in-kind" ? (data.donation_id || null) : null,
      expense_type: trimmedExpenseType,
      description: finalDescription,
    };

    if (
      !isAllSelected &&
      selectedContribution &&
      numericAmount > parseFloat(selectedContribution.available_funds)
    ) {
      fireModal({
        icon: "error",
        title: "Insufficient funds",
        text: "Expense amount exceeds the available funds of the selected contribution.",
      }, "warn");
      return;
    }

    if (donationType !== "in-kind" && isCashSelected && numericAmount > cashAvailable) {
      fireModal({
        icon: "error",
        title: "Insufficient cash donations",
        text: "Expense amount exceeds the available cash donations.",
      }, "warn");
      return;
    }

    fireModal({
      title: "Save this expense?",
      html: `<p class="text-sm text-slate-600">${donationType === "in-kind"
        ? "This will log the selected in-kind donation usage."
        : "This will deduct the amount from the chosen funding source."}</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save it!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const previousContributionId = data.contribution_id;
          let createdExpenses = [];
          let cashAdjustment = 0;

          if (donationType !== "in-kind" && data.contribution_id === ALL_CONTRIBUTIONS_VALUE) {
            const eligibleSources = contributionsWithBalance
              .map((contribution) => {
                const available = Math.max(
                  parseFloat(contribution.available_funds) || 0,
                  0
                );
                return {
                  type: "contribution",
                  id: contribution.id,
                  available,
                };
              })
              .filter((source) => source.available > 0);

            if (cashAvailable > 0) {
              eligibleSources.push({
                type: "cash",
                id: CASH_DONATIONS_KEY,
                available: cashAvailable,
              });
            }

            if (eligibleSources.length === 0) {
              fireModal({
                icon: "error",
                title: "No funds available",
                text: "There are no contributions with available funds to cover this expense.",
              }, "warn");
              return;
            }

            const totalAvailableCents = eligibleSources.reduce((sum, source) => {
              return sum + Math.round(Math.max(source.available, 0) * 100);
            }, 0);

            const amountCents = Math.round(numericAmount * 100);
            if (amountCents > totalAvailableCents) {
              fireModal({
                icon: "error",
                title: "Insufficient total funds",
                text: "The combined available funds across all contributions are not enough to cover this expense.",
              }, "warn");
              return;
            }

            const allocations = [];
            let remaining = amountCents;

            eligibleSources.forEach((source, index) => {
              const remainingSlots = eligibleSources.length - index;
              let share = Math.floor(remaining / remainingSlots);
              const availableCents = Math.round(Math.max(source.available, 0) * 100);

              if (share > availableCents) {
                share = availableCents;
              }

              allocations.push({ source, share });
              remaining -= share;
            });

            if (remaining > 0) {
              fireModal({
                icon: "error",
                title: "Allocation failed",
                text: "Unable to distribute the expense across contributions without exceeding their available funds.",
              }, "warn");
              return;
            }

            for (const allocation of allocations) {
              if (allocation.share <= 0) {
                continue;
              }

              const amountShare = (allocation.share / 100).toFixed(2);
              const payload = {
                ...sanitizedData,
                contribution_id:
                  allocation.source.type === "contribution"
                    ? allocation.source.id
                    : null,
                amount: amountShare,
              };

              const response = await axios.post("/admin/expenses", payload);
              if (response.data?.expense) {
                createdExpenses.push(response.data.expense);
              }
            }

            if (createdExpenses.length === 0) {
              fireModal({
                icon: "error",
                title: "Expense not saved",
                text: "No expense entries were created for the selected contributions.",
              }, "warn");
              return;
            }

            setExpenses((prev) => [...createdExpenses, ...prev]);
          } else if (donationType !== "in-kind") {
            const res = await axios.post("/admin/expenses", {
              ...sanitizedData,
              amount: numericAmount.toFixed(2),
            });
            const newExpense = res.data.expense;
            setExpenses([newExpense, ...expenses]);
          } else {
            // In-kind: create a single expense linked to a specific donation
            const res = await axios.post("/admin/expenses", {
              ...sanitizedData,
              amount: "0.00",
            });
            const newExpense = res.data.expense;
            setExpenses([newExpense, ...expenses]);
          }

          const contributionAdjustments = {};

          if (isAllSelected) {
            createdExpenses.forEach((expense) => {
              const contributionId = expense.contribution_id || expense.contribution?.id;
              if (!contributionId) {
                const amount = parseFloat(expense.amount ?? 0);
                cashAdjustment += Number.isFinite(amount) ? amount : 0;
                return;
              }
              const amount = parseFloat(expense.amount ?? 0);
              contributionAdjustments[contributionId] =
                (contributionAdjustments[contributionId] ?? 0) + amount;
            });
          } else if (isCashSelected) {
            cashAdjustment += numericAmount;
          } else if (previousContributionId) {
            const amount = parseFloat(data.amount ?? 0);
            contributionAdjustments[previousContributionId] =
              (contributionAdjustments[previousContributionId] ?? 0) + amount;
          }

          const updatedContributions = (contributions || []).map((contribution) => {
            const delta = contributionAdjustments[contribution.id];
            if (!delta) return contribution;

            const totalExpenses = parseFloat(contribution.total_expenses ?? 0) + delta;
            const remainingFunds =
              parseFloat(contribution.remaining_funds ?? contribution.available_funds ?? 0) - delta;

            const safeRemaining = Number.isFinite(remainingFunds)
              ? Math.max(0, remainingFunds)
              : 0;

            return {
              ...contribution,
              total_expenses: totalExpenses,
              available_funds: safeRemaining,
              remaining_funds: safeRemaining,
            };
          });

          setContributions(updatedContributions);

          if (cashAdjustment > 0) {
            setCashPool((prev) => {
              const nextExpenses = (prev.expenses ?? 0) + cashAdjustment;
              const nextAvailable = Math.max((prev.available ?? 0) - cashAdjustment, 0);
              return {
                ...prev,
                expenses: nextExpenses,
                available: nextAvailable,
              };
            });
          }

          reset("expense_type", "amount", "expense_date", "description");

          if (donationType !== "in-kind" && isAllSelected) {
            setData("contribution_id", previousContributionId);
          } else if (donationType !== "in-kind" && isCashSelected) {
            const remainingCash = Math.max(cashAvailable - cashAdjustment, 0);
            setData("contribution_id", remainingCash > 0 ? CASH_DONATIONS_KEY : "");
          } else if (previousContributionId) {
            const stillAvailable = updatedContributions.find((c) => {
              const idMatches = String(c.id) === String(previousContributionId);
              const remaining = parseFloat(c.remaining_funds ?? c.available_funds ?? 0);
              return idMatches && remaining > 0;
            });

            setData("contribution_id", stillAvailable ? previousContributionId : "");
          } else if (donationType === "in-kind") {
            setData("donation_id", "");
          } else {
            setData("contribution_id", "");
          }

          setShowModal(false);
          setUsedQuantity("");
          setEstimatedCost("");
          setWarning("");

          Toast.fire({
            icon: "success",
            title: donationType !== "in-kind" && previousContributionId === ALL_CONTRIBUTIONS_VALUE
              ? "Expense split across contributions!"
              : "Expense added",
            text: donationType !== "in-kind" && previousContributionId === ALL_CONTRIBUTIONS_VALUE
              ? "Amount divided across available contributions."
              : "Expense saved successfully.",
          });
        } catch (err) {
          let errorMessage = err.response?.data?.message || "Something went wrong.";
          if (err.response?.status === 422) {
            const responseErrors = err.response?.data?.errors;
            if (responseErrors) {
              const firstError = Object.values(responseErrors)
                .flat()
                .find(Boolean);
              if (firstError) {
                errorMessage = firstError;
              }
            }
          }
          fireModal({
            icon: "error",
            title: "Unable to save",
            text: errorMessage,
          }, "warn");
        }
      }
    });
  };

  const handleCancel = () => {
    reset();
    setWarning("");
    setShowModal(false);
    setData("donation_id", "");
    setUsedQuantity("");
    setEstimatedCost("");
  };

  const normaliseCategory = (value = "") => value.trim().replace(/\s+/g, " ");

  const handleCategorySubmit = (e) => {
    e.preventDefault();
    const cleaned = normaliseCategory(newCategory);
    if (!cleaned) {
      setCategoryError("Category name is required.");
      return;
    }

    const exists = expenseCategories.some(
      (item) => item.toLowerCase() === cleaned.toLowerCase()
    );

    if (exists) {
      setCategoryError("Category already exists.");
      return;
    }

    fireModal({
      title: "Add this category?",
      text: `"${cleaned}" will be added to the shared category list.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, add it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      setCustomCategories((prev) => [...prev, cleaned]);
      setCategoryError("");
      setNewCategory("");
      setShowCategoryModal(false);
      setData("expense_type", cleaned);

      Toast.fire({
        icon: "success",
        title: "Category added",
        text: `"${cleaned}" is now available in the list.`,
      });
    });
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setNewCategory("");
    setCategoryError("");
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isInKindTab = activeTab === "in-kind";
  const isFundsTab = activeTab === "funds";

  const baseExpenses = useMemo(() => {
    if (isInKindTab) {
      return (expenses || []).filter((e) => e?.donation?.donation_type === "in-kind");
    }
    if (isFundsTab) {
      return (expenses || []).filter((e) => !e?.donation || e?.donation?.donation_type !== "in-kind");
    }
    return expenses || [];
  }, [expenses, isInKindTab, isFundsTab]);
  const filteredExpenses = baseExpenses.filter((expense) => {
    if (!normalizedSearch) return true;
    const values = [
      expense.expense_type,
      expense.description,
      expense.amount?.toString(),
      expense.expense_date,
      expense.contribution?.contribution_type,
      expense.donation?.donation_type,
      expense.donation?.donated_by,
      expense.donation?.donation_description,
      expense.donation?.received_by,
      expense.donation?.usage_status,
      expense.donation?.usage_location,
      expense.donation?.usage_notes,
    ];
    return values
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(normalizedSearch));
  });

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / ROWS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredExpenses.slice(start, start + ROWS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  const handleChangePage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const paginationSummaryStart = filteredExpenses.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const paginationSummaryEnd = Math.min(currentPage * ROWS_PER_PAGE, filteredExpenses.length);

  const paginationRange = useMemo(() => {
    const range = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) {
        range.push(i);
      }
      return range;
    }

    range.push(1);

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
      range.push("ellipsis-start");
    }

    for (let i = start; i <= end; i += 1) {
      range.push(i);
    }

    if (end < totalPages - 1) {
      range.push("ellipsis-end");
    }

    range.push(totalPages);

    return range;
  }, [currentPage, totalPages]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
            <h1 className="text-3xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Expenses
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expenses..."
                className="w-full sm:w-64 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <PlusCircle size={18} /> Add Categories
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                <PlusCircle size={18} /> Add Expense
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Cash Donations Available',
              value: cashPool.available,
              icon: Droplet,
              accent: 'bg-blue-50 text-blue-700 border-blue-100',
            },
            {
              label: 'Cash Expenses',
              value: cashExpensesTotal,
              icon: HandCoins,
              accent: 'bg-amber-50 text-amber-700 border-amber-100',
            },
            {
              label: 'Total Records',
              value: expenses.length,
              icon: Receipt,
              accent: 'bg-slate-50 text-slate-700 border-slate-100',
            },
            {
              label: 'Total Donors',
              value: donorCount,
              icon: User,
              accent: 'bg-violet-50 text-violet-700 border-violet-100',
            },
          ].map((card) => (
            <div key={card.label} className={`rounded-3xl border ${card.accent} px-5 py-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl ${card.accent} p-2.5 bg-white/40 shadow-inner`}>
                  <card.icon size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">
                    {typeof card.value === 'number' ? card.value.toLocaleString(undefined, { minimumFractionDigits: card.label.includes('Cash') ? 2 : 0, maximumFractionDigits: card.label.includes('Cash') ? 2 : 0 }) : card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
            {[
              { key: 'all', label: 'All' },
              { key: 'funds', label: 'Funds' },
              { key: 'in-kind', label: 'In-Kind' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-1.5 transition ${activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {filteredExpenses.length} item{filteredExpenses.length === 1 ? '' : 's'} shown
          </span>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-gray-700 text-left">
                {isInKindTab ? (
                  <>
                    <th className="p-4 font-semibold">Donation Type</th>
                    <th className="p-4 font-semibold">Item Type</th>
                    <th className="p-4 font-semibold">Expense Category</th>
                    <th className="p-4 font-semibold">Expense Date</th>
                    <th className="p-4 font-semibold">Used</th>
                    <th className="p-4 font-semibold">Expense Description</th>
                  </>
                ) : isFundsTab ? (
                  <>
                    <th className="p-4 font-semibold">Expense Category</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Expense Date</th>
                    <th className="p-4 font-semibold">Contribution / Source</th>
                    <th className="p-4 font-semibold">Expense Description</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 font-semibold">Expense Type</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Description</th>
                    <th className="p-4 font-semibold">Contribution</th>
                    <th className="p-4 font-semibold">Donation</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.length > 0 ? (
                paginatedExpenses.map((expense, idx) => (
                  <tr
                    key={expense.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}
                  >
                    {isInKindTab ? (
                      (() => {
                        const { quantity, baseDescription } = extractInKindDetails(expense.description || "");
                        return (
                          <>
                            <td className="p-4 text-gray-700">
                              {expense.donation?.donation_type ? expense.donation.donation_type.replace(/\b\w/g, (c) => c.toUpperCase()) : 'In-Kind'}
                            </td>
                            <td className="p-4">{expense.donation?.item_type || '-'}</td>
                            <td className="p-4">{expense.expense_type || '-'}</td>
                            <td className="p-4">{formatDate(expense.expense_date)}</td>
                            <td className="p-4">{quantity || '-'}</td>
                            <td className="p-4">{baseDescription}</td>
                          </>
                        );
                      })()
                    ) : isFundsTab ? (
                      <>
                        <td className="p-4">{expense.expense_type || '-'}</td>
                        <td className="p-4 text-green-700 font-semibold">₱{parseFloat(expense.amount || 0).toFixed(2)}</td>
                        <td className="p-4">{formatDate(expense.expense_date)}</td>
                        <td className="p-4 text-gray-700">
                          {expense.contribution?.contribution_type
                            ? expense.contribution.contribution_type
                            : (!expense.contribution && !expense.donation ? 'Cash Pool' : '-')}
                        </td>
                        <td className="p-4">{expense.description || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-4">{expense.expense_type}</td>
                        <td className="p-4 text-green-700 font-semibold">₱{parseFloat(expense.amount).toFixed(2)}</td>
                        <td className="p-4">{formatDate(expense.expense_date)}</td>
                        <td className="p-4">{expense.description || "-"}</td>
                        <td className="p-4 text-gray-700">
                          {expense.contribution ? expense.contribution.contribution_type : "N/A"}
                        </td>
                        <td className="p-4 text-gray-700">
                          {expense.donation ? (
                            expense.donation.donation_type === 'in-kind' ? (
                              <div className="leading-tight">
                                <div className="font-medium">
                                  In-Kind{expense.donation.donated_by ? ` - ${expense.donation.donated_by}` : ''}
                                </div>
                                {expense.donation.donation_description && (
                                  <div className="text-xs text-gray-600 truncate">
                                    {expense.donation.donation_description}
                                  </div>
                                )}
                                <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                                  {expense.donation.donation_date && (
                                    <span>Date: {formatDate(expense.donation.donation_date)}</span>
                                  )}
                                  {expense.donation.received_by && (
                                    <span>Received by: {expense.donation.received_by}</span>
                                  )}
                                  {expense.donation.usage_status && (
                                    <span>Status: {expense.donation.usage_status}</span>
                                  )}
                                  {expense.donation.usage_location && (
                                    <span>Location: {expense.donation.usage_location}</span>
                                  )}
                                  {expense.donation.usage_notes && (
                                    <span>Notes: {expense.donation.usage_notes}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                Cash{expense.donation.donated_by ? ` - ${expense.donation.donated_by}` : ''}
                              </div>
                            )
                          ) : (!expense.contribution ? 'Cash Pool' : '-')}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={isInKindTab ? 6 : (isFundsTab ? 5 : 6)}>
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold">{paginationSummaryStart}</span> - <span className="font-semibold">{paginationSummaryEnd}</span> of <span className="font-semibold">{filteredExpenses.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleChangePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              &lt;
            </button>
            {paginationRange.map((entry, index) => {
              if (typeof entry === "string") {
                return (
                  <span
                    key={`${entry}-${index}`}
                    className="w-9 h-9 flex items-center justify-center text-sm text-blue-400"
                  >
                    …
                  </span>
                );
              }

              const isActive = entry === currentPage;
              return (
                <button
                  key={entry}
                  onClick={() => handleChangePage(entry)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full border text-sm transition ${isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  {entry}
                </button>
              );
            })}
            <button
              onClick={() => handleChangePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[1050] bg-slate-900/30 backdrop-blur-sm flex items-start justify-center px-4 py-10 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
                  <h2 className="text-2xl font-semibold text-slate-900">New Expense</h2>
                </div>
                <button
                  onClick={handleCancel}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700">Source Type </label>
                  <div className="mt-2 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => handleDonationTypeChange("cash")}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${donationType === 'cash' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Cash / Contributions
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDonationTypeChange("in-kind")}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${donationType === 'in-kind' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      In-Kind Donation
                    </button>
                  </div>
                </div>

                {donationType === 'in-kind' ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Expense Category</label>
                        <select
                          value={data.expense_type}
                          onChange={(e) => setData("expense_type", e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          required
                          disabled={!hasCategories}
                        >
                          <option value="">
                            {hasCategories ? "Select category" : "No categories available"}
                          </option>
                          {expenseCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        {!hasCategories && (
                          <p className="text-sm text-gray-500 mt-1">
                            Please add an expense category first.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700">Select In-Kind Donation</label>
                        <select
                          value={data.donation_id}
                          onChange={(e) => setData('donation_id', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          required
                        >
                          <option value="">-- Choose an in-kind donation --</option>
                          {inKindDonations.map((d) => {
                            const donor = d.donated_by || 'Anonymous';
                            const date = d.donation_date
                              ? new Date(d.donation_date).toLocaleDateString('en-US')
                              : 'No date';
                            const itemType = d.item_type || (d.donation_description || 'In-Kind Item');
                            const qty = Number(d.donation_quantity ?? 0);
                            return (
                              <option key={d.id} value={d.id}>
                                {`${itemType} • Qty: ${qty} • Donor: ${donor} (${date})`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {inKindDonations.length > 0 && (
                      <div className="rounded-2xl border border-slate-100 bg-white/60 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Inventory</p>
                            <h4 className="text-base font-semibold text-slate-800">All In-Kind Donations</h4>
                          </div>
                          <span className="text-xs font-medium text-slate-500">Item Type • Qty Donated</span>
                        </div>
                        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                          {inKindDonations.map((donation) => (
                            <div
                              key={donation.id}
                              className="flex items-start justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-2 text-sm"
                            >
                              <div className="pr-4">
                                <div className="font-semibold text-slate-800">
                                  {donation.item_type || donation.donation_description || 'In-Kind Item'}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Donor: {donation.donated_by || 'Anonymous'}
                                </div>
                              </div>
                              <div className="text-right text-xs text-slate-600">
                                <div className="text-base font-semibold text-slate-900">
                                  {Number(donation.donation_quantity ?? 0)}
                                </div>
                                <div>Usable: {Number(donation.usable_quantity ?? 0)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedInKindDonation && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
                        <div className="font-medium text-gray-700 mb-1">Donation Details</div>
                        {selectedInKindDonation.donation_description && (
                          <div>Description: {selectedInKindDonation.donation_description}</div>
                        )}
                        {selectedInKindDonation.item_type && (
                          <div>Item Type: {selectedInKindDonation.item_type}</div>
                        )}
                        <div>
                          Total Donated: <strong>{Number(selectedInKindDonation.donation_quantity ?? 0)}</strong>
                        </div>
                        <div>Donated by: {selectedInKindDonation.donated_by || 'Anonymous'}</div>
                        {selectedInKindDonation.donation_date && (
                          <div>Date: {formatDate(selectedInKindDonation.donation_date)}</div>
                        )}
                        {selectedDonationRemainingQty != null && (
                          <div>
                            Usable Remaining: <strong>{selectedDonationRemainingQty}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Quantity Used</label>
                        <input
                          type="number"
                          step="1"
                          value={usedQuantity}
                          onChange={(e) => setUsedQuantity(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="0"
                          required
                        />
                        {quantityError && (
                          <p className="text-red-500 mt-1 text-sm">{quantityError}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Estimated Cost (optional)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={estimatedCost}
                          onChange={(e) => setEstimatedCost(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Expense Description</label>
                        <textarea
                          value={data.description}
                          onChange={(e) =>
                            setData("description", e.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="Enter expense details..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Expense Date</label>
                        <input
                          type="date"
                          value={data.expense_date}
                          onChange={(e) =>
                            setData("expense_date", e.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Expense Category</label>
                      <select
                        value={data.expense_type}
                        onChange={(e) => setData("expense_type", e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        required
                        disabled={!hasCategories}
                      >
                        <option value="">
                          {hasCategories ? "Select category" : "No categories available"}
                        </option>
                        {expenseCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {!hasCategories && (
                        <p className="text-sm text-gray-500 mt-1">
                          Please add an expense category first.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Expense Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={data.amount}
                        onChange={handleAmountChange}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="0.00"
                        max={
                          data.contribution_id === ALL_CONTRIBUTIONS_VALUE
                            ? totalAvailableFunds
                            : selectedContribution
                              ? selectedContribution.available_funds
                              : undefined
                        }
                        required
                      />
                      {warning && (
                        <p className="text-red-500 mt-1 text-sm">{warning}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Expense Date</label>
                      <input
                        type="date"
                        value={data.expense_date}
                        onChange={(e) =>
                          setData("expense_date", e.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Select Contribution</label>
                      <select
                        value={data.contribution_id}
                        onChange={handleContributionChange}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">-- None --</option>
                        {contributionsWithBalance.length > 0 && (
                          <option value={ALL_CONTRIBUTIONS_VALUE}>
                            Overall Funds (Payments + Cash Donations) - ₱{totalAvailableFunds.toFixed(2)} (auto split)
                          </option>
                        )}
                        <option value={CASH_DONATIONS_KEY}>
                          Cash Donations - ₱{cashAvailable.toFixed(2)}
                        </option>
                        {filteredContributions.map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            disabled={c.isDisabled}
                          >
                            {c.contribution_type} - ₱
                            {parseFloat(c.available_funds).toFixed(2)}
                            {c.isDisabled ? " (Insufficient funds)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Expense Description</label>
                      <textarea
                        value={data.description}
                        onChange={(e) =>
                          setData("description", e.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Enter expense details..."
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing || (donationType === 'in-kind' && Boolean(quantityError))}
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
                  >
                    {processing ? 'Saving…' : 'Add Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {showCategoryModal && (
          <div className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">New Category</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Expense Category</h2>
                </div>
                <button
                  onClick={handleCloseCategoryModal}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} className="mt-5 spacey-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Category Name</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      if (categoryError) setCategoryError("");
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g., Technology, Facilities"
                    autoFocus
                  />
                  {categoryError && (
                    <p className="text-red-500 text-sm mt-1">{categoryError}</p>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseCategoryModal}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                  >
                    Save Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
