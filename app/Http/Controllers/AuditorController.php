<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Payment;
use App\Models\Donation;
use App\Models\SchoolYear;
use App\Models\SchoolYearContribution;
use App\Models\Student;
use App\Models\Contribution;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AuditorController extends Controller
{
    public function showLogin()
    {
        if (Auth::guard('auditor')->check()) {
            return redirect()->route('auditor.dashboard');
        }

        return Inertia::render('Auditor/AuditorLogin');
    }

    private function extractUsedQuantity(?string $description): float
    {
        if (!$description) {
            return 0;
        }

        if (preg_match('/Qty\s*Used\s*:\s*([0-9]+(?:\.[0-9]+)?)/i', $description, $matches)) {
            return (float) $matches[1];
        }

        return 0;
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if (Auth::guard('auditor')->attempt($credentials, $request->boolean('remember'))) {
            $user = Auth::guard('auditor')->user();

            if ($user->role !== 'auditor') {
                Auth::guard('auditor')->logout();
                return back()->withErrors([
                    'username' => 'You do not have auditor access.',
                ]);
            }

            $request->session()->regenerate();
            return redirect()->route('auditor.dashboard');
        }

        return back()->withErrors([
            'username' => 'Invalid credentials.',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('auditor')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('auditor.login');
    }

    /**
     * Show Auditor Profile page
     */
    public function showProfile()
    {
        return Inertia::render('Auditor/AuditorProfile', [
            'auth' => [
                'user' => Auth::guard('auditor')->user(),
            ],
        ]);
    }

    /**
     * Update Auditor password
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = Auth::guard('auditor')->user();

        if (!$user || !Hash::check($request->input('current_password'), $user->password)) {
            return back()->withErrors(['current_password' => 'The current password is incorrect.']);
        }

        $user->password = Hash::make($request->input('new_password'));
        $user->save();

        return back();
    }

   public function dashboard()
{
    $auditor = Auth::guard('auditor')->user();

    // Active school year
    $schoolYear = SchoolYear::where('is_active', 1)->first();

    // Expenses filtered by school year (include donation-linked expenses even without school year)
    $expenses = Expense::with([
            'contribution.schoolYearContributions.schoolYear',
            'donation',
        ])
        ->when($schoolYear, function ($query) use ($schoolYear) {
            $query->where(function ($q) use ($schoolYear) {
                $q->whereHas('contribution.schoolYearContributions', function ($q2) use ($schoolYear) {
                    $q2->where('school_year_id', $schoolYear->id);
                })
                ->orWhereNotNull('donation_id')
                ->orWhere(function ($inner) {
                    $inner->whereNull('contribution_id')
                        ->whereNull('donation_id');
                });
            });
        })
        ->get();

    // Payments filtered by school year
    $payments = \App\Models\Payment::with(['contribution.schoolYearContributions.schoolYear'])
        ->when($schoolYear, function ($query) use ($schoolYear) {
            $query->whereHas('contribution.schoolYearContributions', function ($q) use ($schoolYear) {
                $q->where('school_year_id', $schoolYear->id);
            });
        })
        ->get();

    // Convert amounts to amount_paid if that is the correct field
    $payments = $payments->map(function ($p) {
        $p->amount = $p->amount_paid ?? 0;
        return $p;
    });

    $totalExpenses = (float) $expenses->sum('amount');
    $totalPayments = (float) $payments->sum('amount');

    $donations = Donation::all();
    $donationsCash = (float) $donations->where('donation_type', '!=', 'in-kind')->sum('donation_amount');
    $donationsInKind = (float) $donations->where('donation_type', 'in-kind')->sum('donation_amount');

    $totals = [
        'payments' => $totalPayments,
        'expenses' => $totalExpenses,
        'donationsCash' => $donationsCash,
        'donationsInKind' => $donationsInKind,
    ];
    $totals['overall'] = $totalPayments + $donationsCash + $donationsInKind;
    $totals['availableFunds'] = ($totalPayments + $donationsCash) - $totalExpenses;

    return Inertia::render('Auditor/Dashboard', [
        'auditor'    => $auditor,
        'expenses'   => $expenses,
        'payments'   => $payments,
        'donations'  => $donations,
        'schoolYear' => $schoolYear,
        'totals'     => $totals,
    ]);
}



    public function expenses()
    {
        $timezone = config('app.timezone', 'UTC');

        $expenses = Expense::with(['contribution', 'donation'])
            ->latest('expense_date')
            ->latest()
            ->get()
            ->map(function ($expense) use ($timezone) {
                $primarySource = $expense->created_at ?? $expense->expense_date;
                $fallbackSource = $expense->expense_date ?? $expense->created_at;
                $dateSource = $primarySource ?: $fallbackSource;
                $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
                return [
                    'id' => $expense->id,
                    'expense_type' => $expense->expense_type,
                    'amount' => (float) ($expense->amount ?? 0),
                    'expense_date' => $expense->expense_date,
                    'expense_timestamp' => $date ? $date->toIso8601String() : null,
                    'description' => $expense->description,
                    'created_at' => $expense->created_at,
                    'contribution' => $expense->contribution ? [
                        'id' => $expense->contribution->id,
                        'contribution_type' => $expense->contribution->contribution_type,
                    ] : null,
                    'donation' => $expense->donation ? [
                        'id' => $expense->donation->id,
                        'donation_type' => $expense->donation->donation_type,
                        'donated_by' => $expense->donation->donated_by,
                        'item_type' => $expense->donation->item_type,
                        'donation_amount' => (float) ($expense->donation->donation_amount ?? 0),
                        'donation_quantity' => (float) ($expense->donation->donation_quantity ?? 0),
                        'usable_quantity' => (float) ($expense->donation->usable_quantity ?? 0),
                        'damaged_quantity' => (float) ($expense->donation->damaged_quantity ?? 0),
                        'unusable_quantity' => (float) ($expense->donation->unusable_quantity ?? 0),
                        'usage_status' => $expense->donation->usage_status,
                        'usage_location' => $expense->donation->usage_location,
                        'usage_notes' => $expense->donation->usage_notes,
                    ] : null,
                ];
            })
            ->values();

        $cashDonationsTotal = (float) Donation::where('donation_type', 'cash')->sum('donation_amount');
        $cashDonationExpenses = (float) Expense::whereNull('contribution_id')->sum('amount');
        $cashDonationsAvailable = max($cashDonationsTotal - $cashDonationExpenses, 0);
        $donorCount = Donation::whereNotNull('donated_by')
            ->distinct('donated_by')
            ->count('donated_by');

        return Inertia::render('Auditor/Expenses', [
            'expenses' => $expenses,
            'cashDonationsAvailable' => $cashDonationsAvailable,
            'cashDonationExpenses' => $cashDonationExpenses,
            'cashDonationsTotal' => $cashDonationsTotal,
            'donorCount' => $donorCount,
        ]);
    }


public function funds()
{
    $timezone = config('app.timezone', 'UTC');

    $payments = Payment::with(['student:id,first_name,last_name', 'contribution:id,contribution_type'])
        ->latest('payment_date')
        ->get()
        ->map(function ($payment) use ($timezone) {
            $studentName = $payment->student
                ? trim(($payment->student->first_name ?? '') . ' ' . ($payment->student->last_name ?? ''))
                : 'N/A';

            $primarySource = $payment->created_at ?? $payment->payment_date;
            $fallbackSource = $payment->payment_date ?? $payment->created_at;
            $dateSource = $primarySource ?: $fallbackSource;
            $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;

            return [
                'id' => $payment->id,
                'student_name' => $studentName,
                'contribution_type' => optional($payment->contribution)->contribution_type,
                'amount' => (float) ($payment->amount_paid ?? 0),
                'payment_date' => $date ? $date->toIso8601String() : null,
            ];
        })
        ->values();

    $donations = Donation::orderByDesc('donation_date')
        ->get()
        ->map(function ($donation) use ($timezone) {
            $primarySource = $donation->created_at ?? $donation->donation_date;
            $fallbackSource = $donation->donation_date ?? $donation->created_at;
            $dateSource = $primarySource ?: $fallbackSource;
            $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;

            return [
                'id' => $donation->id,
                'donated_by' => $donation->donated_by,
                'donation_type' => $donation->donation_type,
                'donation_amount' => (float) ($donation->donation_amount ?? 0),
                'donation_quantity' => (float) ($donation->donation_quantity ?? 0),
                'usable_quantity' => $donation->usable_quantity,
                'damaged_quantity' => $donation->damaged_quantity,
                'unusable_quantity' => $donation->unusable_quantity,
                'item_type' => $donation->item_type,
                'donation_description' => $donation->donation_description,
                'usage_status' => $donation->usage_status,
                'received_by' => $donation->received_by,
                'donation_date' => $date ? $date->toIso8601String() : null,
            ];
        })
        ->values();

    $totals = [
        'payments' => (float) Payment::sum('amount_paid'),
        'donationsCash' => (float) Donation::where('donation_type', '!=', 'in-kind')->sum('donation_amount'),
        'donationsInKind' => (float) Donation::where('donation_type', 'in-kind')->sum('donation_amount'),
    ];
    $totals['overall'] = $totals['payments'] + $totals['donationsCash'];

    return Inertia::render('Auditor/Funds', [
        'payments' => $payments,
        'donations' => $donations,
        'totals' => $totals,
    ]);
}


public function reports()
{
    $timezone = config('app.timezone', 'UTC');

    // Payments with student + contribution relation (use payment_date and return full dataset)
    $payments = Payment::with(['student', 'contribution'])
        ->latest('payment_date')
        ->get()
        ->map(function ($payment) use ($timezone) {
            $primarySource = $payment->created_at ?? $payment->payment_date;
            $fallbackSource = $payment->payment_date ?? $payment->created_at;
            $dateSource = $primarySource ?: $fallbackSource;
            $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
            $timestamp = $date ? $date->toIso8601String() : null;
            return [
                'id' => $payment->id,
                'student' => $payment->student
                    ? ['name' => trim(($payment->student->first_name ?? '') . ' ' . ($payment->student->last_name ?? ''))]
                    : null,
                'contribution' => $payment->contribution
                    ? ['contribution_type' => $payment->contribution->contribution_type]
                    : null,
                'amount' => (float) ($payment->amount_paid ?? 0),
                'payment_date' => $payment->payment_date,
                'payment_timestamp' => $timestamp,
                'date' => $timestamp ?? $payment->payment_date,
            ];
        });

    // Donations (use donation_date and return full dataset)
    $donationsCollection = Donation::latest('donation_date')->get();

    $usageByDonation = $donationsCollection->isNotEmpty()
        ? Expense::whereIn('donation_id', $donationsCollection->pluck('id'))
            ->get()
            ->groupBy('donation_id')
            ->map(function ($expenses) {
                return $expenses->sum(function ($expense) {
                    return $this->extractUsedQuantity($expense->description);
                });
            })
        : collect();

    $donations = $donationsCollection
        ->map(function ($donation) use ($timezone, $usageByDonation) {
            $primarySource = $donation->created_at ?? $donation->donation_date;
            $fallbackSource = $donation->donation_date ?? $donation->created_at;
            $dateSource = $primarySource ?: $fallbackSource;
            $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
            $timestamp = $date ? $date->toIso8601String() : null;
            $donated = (float) ($donation->donation_quantity ?? 0);
            $used = (float) ($usageByDonation[$donation->id] ?? 0);
            $damaged = (float) ($donation->damaged_quantity ?? 0);
            $unusable = (float) ($donation->unusable_quantity ?? 0);
            $remaining = max($donated - $used - $damaged - $unusable, 0);
            return [
                'id' => $donation->id,
                'donated_by' => $donation->donated_by,
                'donation_type' => $donation->donation_type,
                'donation_amount' => (float) ($donation->donation_amount ?? 0),
                'donation_quantity' => $donation->donation_quantity,
                'usable_quantity' => $donation->usable_quantity ?? round($remaining, 2),
                'damaged_quantity' => $donation->damaged_quantity,
                'unusable_quantity' => $donation->unusable_quantity,
                'item_type' => $donation->item_type,
                'donation_description' => $donation->donation_description,
                'usage_status' => $donation->usage_status,
                'usage_notes' => $donation->usage_notes,
                'received_by' => $donation->received_by,
                'donation_date' => $donation->donation_date,
                'donation_timestamp' => $timestamp,
                'date' => $timestamp ?? $donation->donation_date,
                'used_quantity' => round($used, 2),
            ];
        });

    // Expenses (use expense_date and return full dataset)
    $expenses = Expense::with(['contribution', 'donation'])
        ->latest('expense_date')
        ->get()
        ->map(function ($expense) use ($timezone) {
            $primarySource = $expense->created_at ?? $expense->expense_date;
            $fallbackSource = $expense->expense_date ?? $expense->created_at;
            $dateSource = $primarySource ?: $fallbackSource;
            $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
            return [
                'id' => $expense->id,
                'expense_type' => $expense->expense_type,
                'description' => $expense->description,
                'amount' => (float) ($expense->amount ?? 0),
                'expense_date' => $expense->expense_date,
                'expense_timestamp' => $date ? $date->toIso8601String() : null,
                'date' => $date ? $date->toIso8601String() : $expense->expense_date,
                'contribution' => $expense->contribution
                    ? ['contribution_type' => $expense->contribution->contribution_type]
                    : null,
                'donation' => $expense->donation ? [
                    'id' => $expense->donation->id,
                    'donation_type' => $expense->donation->donation_type,
                    'donated_by' => $expense->donation->donated_by,
                    'item_type' => $expense->donation->item_type,
                    'donation_amount' => (float) ($expense->donation->donation_amount ?? 0),
                    'donation_description' => $expense->donation->donation_description,
                    'usable_quantity' => $expense->donation->usable_quantity,
                    'donation_quantity' => $expense->donation->donation_quantity,
                    'usage_status' => $expense->donation->usage_status,
                    'usage_location' => $expense->donation->usage_location,
                    'usage_notes' => $expense->donation->usage_notes,
                ] : null,
            ];
        });

    $cashDonationsTotal = (float) Donation::where('donation_type', 'cash')->sum('donation_amount');
    $cashDonationExpenses = (float) Expense::whereNull('contribution_id')->sum('amount');
    $cashDonationsAvailable = max($cashDonationsTotal - $cashDonationExpenses, 0);
    $donationsInKindCount = (int) Donation::where('donation_type', 'in-kind')->count();
    $donorCount = Donation::whereNotNull('donated_by')
        ->distinct('donated_by')
        ->count('donated_by');

    // Totals (full dataset; exclude in-kind from cash totals)
    $totals = [
        'payments' => (float) Payment::sum('amount_paid'),
        'donationsCash' => $cashDonationsTotal,
        'donationsInKind' => $donationsInKindCount,
        'expenses' => (float) Expense::sum('amount'),
    ];

    $available = $totals['payments'] + $totals['donationsCash'] - $totals['expenses'];

    $fundHistories = [];
    $runningBalance = 0;

    $paymentRows = Payment::with('student:id,first_name,last_name')
        ->select('id', 'amount_paid', 'payment_date', 'created_at')
        ->orderBy('payment_date')
        ->get()
        ->map(function ($p) use ($timezone) {
            $name = $p->student ? ($p->student->first_name . ' ' . $p->student->last_name) : null;
            $primarySource = $p->created_at ?? $p->payment_date;
            $fallbackSource = $p->payment_date ?? $p->created_at;
            $dateSource = $primarySource ?: $fallbackSource;
            $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
            $timestamp = $date ? $date->toIso8601String() : null;
            return [
                'id' => $p->id,
                'date' => $timestamp ?? $p->payment_date,
                'original_date' => $p->payment_date,
                'timestamp' => $timestamp,
                'amount' => (float) $p->amount_paid,
                'type' => 'payment',
                'donation_type' => null,
                'details' => $name ? "Payment by {$name}" : 'Payment',
            ];
        });

    $donationRows = Donation::select('id', 'donation_amount', 'donation_date', 'donated_by', 'donation_type', 'created_at')
        ->orderBy('donation_date')
        ->get()
        ->map(function ($d) use ($timezone) {
            $label = strtolower($d->donation_type) === 'in-kind' ? 'Donation (In-Kind)' : 'Donation (Cash)';
            if ($d->donated_by) {
                $label .= ' by ' . $d->donated_by;
            }
            $primarySource = $d->created_at ?? $d->donation_date;
            $fallbackSource = $d->donation_date ?? $d->created_at;
            $dateSource = $primarySource ?: $fallbackSource;
            $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
            $timestamp = $date ? $date->toIso8601String() : null;
            return [
                'id' => $d->id,
                'date' => $timestamp ?? $d->donation_date,
                'original_date' => $d->donation_date,
                'timestamp' => $timestamp,
                'amount' => (float) $d->donation_amount,
                'type' => 'donation',
                'donation_type' => $d->donation_type,
                'details' => $label,
            ];
        });

    $expenseRows = Expense::with('contribution')
        ->select('id', 'amount', 'expense_date', 'description', 'contribution_id', 'created_at')
        ->orderBy('expense_date')
        ->get()
        ->map(function ($e) use ($timezone) {
            $label = 'Expense';
            if ($e->description) {
                $label .= ': ' . $e->description;
            }
            if ($e->contribution && $e->contribution->contribution_type) {
                $label .= ' (' . $e->contribution->contribution_type . ')';
            }
            $primarySource = $e->created_at ?? $e->expense_date;
            $fallbackSource = $e->expense_date ?? $e->created_at;
            $dateSource = $primarySource ?: $fallbackSource;
            $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
            $timestamp = $date ? $date->toIso8601String() : null;
            return [
                'id' => $e->id,
                'date' => $timestamp ?? $e->expense_date,
                'original_date' => $e->expense_date,
                'timestamp' => $timestamp,
                'amount' => (float) $e->amount,
                'type' => 'expense',
                'donation_type' => null,
                'details' => $label,
            ];
        });

    $records = $paymentRows
        ->concat($donationRows)
        ->concat($expenseRows)
        ->sortBy('date')
        ->values();

    foreach ($records as $row) {
        $before = $runningBalance;
        if ($row['type'] === 'payment') {
            $runningBalance += $row['amount'] ?? 0;
        } elseif ($row['type'] === 'donation' && strtolower($row['donation_type'] ?? '') !== 'in-kind') {
            $runningBalance += $row['amount'] ?? 0;
        } elseif ($row['type'] === 'expense') {
            $runningBalance -= $row['amount'] ?? 0;
        }

        $fundHistories[] = [
            'id' => $row['id'],
            'fund_date' => $row['original_date'] ?? $row['date'],
            'date' => $row['date'],
            'fund_timestamp' => $row['timestamp'] ?? $row['date'],
            'amount' => (float) ($row['amount'] ?? 0),
            'type' => $row['type'],
            'donation_type' => $row['donation_type'] ?? null,
            'fund_before' => $before,
            'fund_after' => $runningBalance,
            'details' => $row['details'],
        ];
    }

    $fundsHistories = collect($fundHistories)->values();

    $studentsCount = Student::count();
    $activeSchoolYear = SchoolYear::where('is_active', true)->first();
    $totalCollectedActiveSchoolYear = 0.0;
    if ($activeSchoolYear) {
        $totalCollectedActiveSchoolYear = (float) Payment::whereHas('student', function ($q) use ($activeSchoolYear) {
            $q->where('school_year_id', $activeSchoolYear->id);
        })->sum('amount_paid');
    }

    $students = Student::with(['gradeLevel', 'section', 'schoolYear'])
        ->select('id', 'first_name', 'last_name', 'grade_level_id', 'section_id', 'school_year_id', 'guardian_id')
        ->orderBy('last_name')
        ->get();

    $schoolYearContributions = SchoolYearContribution::with(['contribution', 'gradeLevel', 'schoolYear'])
        ->get();

    $totalPaidByStudent = Payment::select('student_id', DB::raw('SUM(amount_paid) as total_paid'))
        ->groupBy('student_id')
        ->pluck('total_paid', 'student_id');

    $paymentSums = Payment::select('student_id', 'contribution_id', 'school_year_id', DB::raw('SUM(amount_paid) as total_paid'))
        ->groupBy('student_id', 'contribution_id', 'school_year_id')
        ->get()
        ->mapWithKeys(function ($row) {
            $key = $row->student_id . '|' . $row->contribution_id . '|' . ($row->school_year_id ?? 'null');
            return [$key => (float) $row->total_paid];
        });

    $firstStudentPerGuardian = $students
        ->filter(fn($s) => !is_null($s->guardian_id))
        ->groupBy('guardian_id')
        ->map(fn($group) => $group->sortBy('id')->first()->id);

    $studentBalances = $students->map(function ($student) use ($schoolYearContributions, $paymentSums, $firstStudentPerGuardian, $totalPaidByStudent) {
        $studentName = trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? ''));

        $totalPaid = (float) ($totalPaidByStudent[$student->id] ?? 0);

        $isFirstGuardianStudent = true;
        if (!is_null($student->guardian_id) && $firstStudentPerGuardian->has($student->guardian_id)) {
            $isFirstGuardianStudent = $firstStudentPerGuardian[$student->guardian_id] === $student->id;
        }

        // Carry-over computation (previous school years only)
        $previousSchoolYears = SchoolYear::where('id', '<', $student->school_year_id)->pluck('id');
        $carryOver = 0;
        if ($previousSchoolYears->isNotEmpty()) {
            $prevContributions = $schoolYearContributions
                ->where('grade_level_id', $student->grade_level_id)
                ->whereIn('school_year_id', $previousSchoolYears);

            $totalPrevRequired = $prevContributions
                ->filter(function ($syc) use ($isFirstGuardianStudent) {
                    if ($isFirstGuardianStudent) {
                        return true;
                    }
                    return optional($syc->contribution)->mandatory == 1;
                })
                ->sum(function ($syc) use ($isFirstGuardianStudent) {
                    $amount = $syc->total_amount ?? optional($syc->contribution)->amount ?? 0;
                    if (!$isFirstGuardianStudent && optional($syc->contribution)->mandatory != 1) {
                        return $amount * 0.5;
                    }
                    return $amount;
                });

            $totalPrevPaid = Payment::where('student_id', $student->id)
                ->whereIn('contribution_id', $prevContributions->pluck('contribution_id'))
                ->sum('amount_paid');

            $carryOver = max(0, $totalPrevRequired - $totalPrevPaid);
        }

        // Current/active year remaining balance based on assigned school year contributions
        $currentContributions = $schoolYearContributions
            ->where('grade_level_id', $student->grade_level_id)
            ->where('school_year_id', $student->school_year_id);

        $currentBalance = $currentContributions
            ->filter(function ($syc) use ($isFirstGuardianStudent) {
                if ($isFirstGuardianStudent) {
                    return true;
                }
                return optional($syc->contribution)->mandatory == 1;
            })
            ->reduce(function ($sum, $syc) use ($student, $paymentSums, $isFirstGuardianStudent) {
                $required = optional($syc->contribution)->amount ?? 0;
                if (!$isFirstGuardianStudent && optional($syc->contribution)->mandatory != 1) {
                    $required *= 0.5;
                }
                $key = $student->id . '|' . $syc->contribution_id . '|' . ($syc->school_year_id ?? 'null');
                $paid = $paymentSums[$key] ?? 0;
                return $sum + max(0, $required - $paid);
            }, 0);

        $remainingBalance = $carryOver + $currentBalance;

        return [
            'student_id' => $student->id,
            'student_name' => $studentName,
            'total_payments' => (float) $totalPaid,
            'balance' => (float) $remainingBalance,
        ];
    })->values();

    $auditPayments = Payment::latest('payment_date')->get()->map(function ($p) use ($timezone) {
        $primarySource = $p->created_at ?? $p->payment_date;
        $fallbackSource = $p->payment_date ?? $p->created_at;
        $dateSource = $primarySource ?: $fallbackSource;
        $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
        $timestamp = $date ? $date->toIso8601String() : null;
        return [
            'id' => $p->id,
            'type' => 'payment',
            'date' => $timestamp ?? $p->payment_date,
            'amount' => (float) $p->amount_paid,
            'details' => 'Payment',
        ];
    })->values()->toBase();

    $auditDonations = Donation::latest('donation_date')->get()->map(function ($d) use ($timezone) {
        $primarySource = $d->created_at ?? $d->donation_date;
        $fallbackSource = $d->donation_date ?? $d->created_at;
        $dateSource = $primarySource ?: $fallbackSource;
        $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
        $timestamp = $date ? $date->toIso8601String() : null;
        return [
            'id' => $d->id,
            'type' => 'donation',
            'date' => $timestamp ?? $d->donation_date,
            'amount' => (float) $d->donation_amount,
            'details' => $d->donation_type . ' donation' . ($d->donated_by ? (' by ' . $d->donated_by) : ''),
        ];
    })->values()->toBase();

    $auditExpenses = Expense::latest('expense_date')->get()->map(function ($e) use ($timezone) {
        $primarySource = $e->created_at ?? $e->expense_date;
        $fallbackSource = $e->expense_date ?? $e->created_at;
        $dateSource = $primarySource ?: $fallbackSource;
        $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
        $timestamp = $date ? $date->toIso8601String() : null;
        return [
            'id' => $e->id,
            'type' => 'expense',
            'date' => $timestamp ?? $e->expense_date,
            'amount' => (float) $e->amount,
            'details' => $e->expense_type,
        ];
    })->values()->toBase();

    $auditLogs = $auditPayments
        ->merge($auditDonations)
        ->merge($auditExpenses)
        ->sortByDesc('date')
        ->values();

    return Inertia::render('Auditor/Reports', [
        'payments' => ['data' => $payments],
        'donations' => ['data' => $donations],
        'expenses' => ['data' => $expenses],
        'cashDonationsAvailable' => $cashDonationsAvailable,
        'cashDonationExpenses' => $cashDonationExpenses,
        'cashDonationsTotal' => $cashDonationsTotal,
        'donorCount' => $donorCount,
        'fundsHistories' => $fundsHistories,
        'studentBalances' => $studentBalances,
        'auditLogs' => $auditLogs,
        'financial' => [
            'studentsCount' => $studentsCount,
            'activeSchoolYear' => $activeSchoolYear ? [
                'id' => $activeSchoolYear->id,
                'name' => $activeSchoolYear->name,
            ] : null,
            'totalCollectedActiveSchoolYear' => $totalCollectedActiveSchoolYear,
            'totalFundsAvailable' => $available,
        ],
        'totals' => [
            'payments' => $totals['payments'],
            'donationsCash' => $totals['donationsCash'],
            'donationsInKind' => $totals['donationsInKind'],
            'expenses' => $totals['expenses'],
            'available' => $available,
        ],
    ]);
}




}
