<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Contribution;
use App\Models\SchoolYearContribution;
use App\Models\Payment;
use App\Models\PaymentHistory;
use App\Models\Donation;
use App\Models\Fund;
use App\Models\FundHistory;
use App\Models\Expense;
use App\Models\Guardian;
use App\Models\GradeLevel;
use App\Models\SchoolYear;
use App\Models\Section;
use Carbon\Carbon; // ✅ tamang import

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class TreasurerController extends Controller
{
    /**
     * Show Treasurer login page
     */
    public function showLogin()
    {
        return Inertia::render('Treasurer/TreasurerLogin');
    }

    /**
     * Handle Treasurer login
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => ['required'],
            'password' => ['required'],
        ]);

        $user = \App\Models\User::where('username', $credentials['username'])
            ->where('role', 'treasurer')
            ->where('status', 'active')
            ->first();

        if ($user && Hash::check($credentials['password'], $user->password)) {
            Auth::guard('treasurer')->login($user);
            $request->session()->regenerate();
            return redirect()->route('treasurer.dashboard');
        }

        return back()->withErrors([
            'username' => 'Invalid Treasurer credentials or inactive account.',
        ]);
    }

    /**
     * Treasurer Dashboard
     */
public function dashboard()
{
    // ✅ Get the latest school year
    $schoolYear = SchoolYear::latest()->first();

    if (!$schoolYear) {
        return Inertia::render('Treasurer/Dashboard', [
            'summary' => [],
            'students' => [],
            'payments' => [],
            'schoolYearContributions' => [],
            'guardians' => [],
            'contributions' => [],
            'totalOutstandingBalance' => 0,
            'totalCollected' => 0,
        ]);
    }

    // ✅ Students (with guardian & grade level)
    $students = Student::with(['guardian', 'gradeLevel', 'section'])
        ->where('school_year_id', $schoolYear->id)
        ->get();

    // ✅ Payments (via student relationship)
    $payments = Payment::with(['student.guardian', 'contribution'])
        ->whereIn('student_id', $students->pluck('id'))
        ->get();

    // ✅ SchoolYearContributions
    $schoolYearContributions = SchoolYearContribution::with('contribution')
        ->where('school_year_id', $schoolYear->id)
        ->get();

    // ✅ Guardians
    $guardians = Guardian::with('students')->get();

    // ✅ All Contributions
    $contributions = Contribution::all();

    // ✅ Totals
    $totalCollected = $payments->sum('amount_paid');
    $totalOutstandingBalance = $students->sum(function ($s) {
        return floatval($s->balance) + floatval($s->contribution_balance);
    });

    // ✅ Summary
    $summary = [
        'students_count' => $students->count(),
        'payments_count' => $payments->count(),
        'contributions_count' => $contributions->count(),
    ];

    return Inertia::render('Treasurer/Dashboard', [
        'summary' => $summary,
        'students' => $students,
        'payments' => $payments,
        'schoolYearContributions' => $schoolYearContributions,
        'guardians' => $guardians,
        'contributions' => $contributions,
        'totalCollected' => $totalCollected,
        'totalOutstandingBalance' => $totalOutstandingBalance,
    ]);
}

    
    /**
     * Treasurer Logout
     */
    public function logout(Request $request)
    {
        Auth::guard('treasurer')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('treasurer.login');
    }

    /**
     * Show Treasurer Profile page
     */
    public function showProfile()
    {
        return Inertia::render('Treasurer/TreasurerProfile', [
            'auth' => [
                'user' => Auth::guard('treasurer')->user(),
            ],
        ]);
    }

    /**
     * Update Treasurer password
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = Auth::guard('treasurer')->user();

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return back()->withErrors(['current_password' => 'The current password is incorrect.']);
        }

        $user->password = Hash::make($request->input('new_password'));
        $user->save();

        return back();
    }

    // ---------------------------------------------------
    // Payments Management
    // ---------------------------------------------------

    /**
     * Show all payments
     */
public function index()
{
    $activeSchoolYear = SchoolYear::where('is_active', true)->first();
    if (!$activeSchoolYear) {
        $activeSchoolYear = SchoolYear::latest()->first();
    }

    $targetSchoolYearId = $activeSchoolYear?->id;

    $students = $targetSchoolYearId
        ? Student::with(['gradeLevel', 'section', 'schoolYear'])
            ->where('school_year_id', $targetSchoolYearId)
            ->where('archived', 1)
            ->get()
            ->map(function ($student) {
                $student->balance = (float) ($student->balance ?? 0);
                $student->contribution_balance = (float) ($student->contribution_balance ?? 0);
                $student->total_payable = $student->balance + $student->contribution_balance;
                return $student;
            })
        : collect();

    $linkedStudentIdsPool = collect();

    if ($students->isNotEmpty()) {
        $allStudentsLite = Student::select('id', 'lrn', 'first_name', 'last_name', 'guardian_id')->get();
        $groupedIds = [];

        foreach ($allStudentsLite as $record) {
            $key = $this->buildStudentMergeKey($record);
            if (!isset($groupedIds[$key])) {
                $groupedIds[$key] = [];
            }
            $groupedIds[$key][] = $record->id;
        }

        foreach ($students as $student) {
            $key = $this->buildStudentMergeKey($student);
            $linkedIds = collect($groupedIds[$key] ?? [$student->id])->unique()->values()->all();
            $student->setAttribute('linked_student_ids', $linkedIds);
        }

        $linkedStudentIdsPool = $students->pluck('linked_student_ids')->flatten()->unique();
    }

    $payments = $linkedStudentIdsPool->isNotEmpty()
        ? Payment::with([
            'student.gradeLevel',
            'student.section',
            'student.schoolYear',
            'contribution'
        ])
            ->whereIn('student_id', $linkedStudentIdsPool)
            ->latest()
            ->get()
        : collect();

    $schoolYearContributions = SchoolYearContribution::with(['contribution', 'gradeLevel', 'schoolYear'])
        ->orderByDesc('school_year_id')
        ->get();

    $guardians = Guardian::all();
    $schoolYears = SchoolYear::orderByDesc('id')->get();

    $studentBalances = [];

    foreach ($students as $student) {
        $linkedIds = collect($student->linked_student_ids ?? [$student->id]);
        $previousSchoolYears = SchoolYear::where('id', '<', $student->school_year_id)->pluck('id');

        if ($previousSchoolYears->isEmpty()) {
            $studentBalances[$student->id] = 0;
            continue;
        }

        $previousContributions = SchoolYearContribution::where('grade_level_id', $student->grade_level_id)
            ->whereIn('school_year_id', $previousSchoolYears)
            ->get();

        $totalPreviousContribution = $previousContributions->sum(fn($syc) => $syc->contribution->amount);

        $totalPreviousPayments = Payment::whereIn('student_id', $linkedIds)
            ->whereIn('contribution_id', $previousContributions->pluck('contribution_id'))
            ->sum('amount_paid');

        $studentBalances[$student->id] = $totalPreviousContribution - $totalPreviousPayments;
    }

    return Inertia::render('Treasurer/Payments', [
        'students' => $students,
        'payments' => $payments,
        'schoolYearContributions' => $schoolYearContributions,
        'guardians' => $guardians,
        'studentBalances' => $studentBalances,
        'schoolYears' => $schoolYears,
        'activeSchoolYear' => $activeSchoolYear,
    ]);
}


    /**
     * Store new payments
     */

public function store(Request $request)
{
    $request->validate([
        'student_id' => 'required|exists:students,id',
        'payments' => 'required|array|min:1',
        'payments.*.contribution_id' => 'required|exists:contributions,id',
        'payments.*.school_year_id' => 'required|exists:school_years,id',
        'payments.*.amount_paid' => 'required|numeric|min:1',
    ]);

    $student = Student::findOrFail($request->student_id);

    // Determine active school year (for student record sync only)
    $activeSchoolYear = SchoolYear::where('is_active', true)->first();

    if (!$activeSchoolYear) {
        return back()->withErrors(['school_year' => 'No active school year found.']);
    }

    // Check if contribution_balance already corresponds to the active year
    if ($student->school_year_id != $activeSchoolYear->id) {
        // Carry over last year's remaining balance
        $student->balance += $student->contribution_balance;
        // Reset contribution balance for new year
        $student->contribution_balance = 0;
        // Update assigned school year
        $student->school_year_id = $activeSchoolYear->id;
        $student->save();
    }

    foreach ($request->payments as $paymentData) {
        $contribution = Contribution::findOrFail($paymentData['contribution_id']);

        // Determine the correct school_year_id to apply this payment to
        // Rule: if there are unpaid balances in older years for this contribution, pay those first
        $targetSchoolYearId = $paymentData['school_year_id'];

        $gradeLevelId = $student->grade_level_id;
        $candidateYears = SchoolYearContribution::where('contribution_id', $contribution->id)
            ->where('grade_level_id', $gradeLevelId)
            ->pluck('school_year_id')
            ->unique()
            ->sort(); // oldest → newest

        foreach ($candidateYears as $syId) {
            if ($syId > $targetSchoolYearId) {
                // stop when we pass the requested year
                break;
            }

            $paidForYear = Payment::where('student_id', $student->id)
                ->where('contribution_id', $contribution->id)
                ->where('school_year_id', $syId)
                ->sum('amount_paid');

            $requiredForYear = SchoolYearContribution::where('contribution_id', $contribution->id)
                ->where('grade_level_id', $gradeLevelId)
                ->where('school_year_id', $syId)
                ->with('contribution')
                ->first();

            // Use effective amount (handles sibling discount like the frontend)
            $requiredAmountEff = $requiredForYear
                ? $this->effectiveContributionAmount($student, $requiredForYear->contribution)
                : 0;

            if ($requiredForYear && ($requiredAmountEff - $paidForYear) > 0) {
                // Found an older unpaid year → use it
                $targetSchoolYearId = $syId;
                break;
            }
        }

        // Locate the exact SYC row for accounting/history
        $schoolYearContribution = SchoolYearContribution::where('contribution_id', $contribution->id)
            ->where('grade_level_id', $gradeLevelId)
            ->where('school_year_id', $targetSchoolYearId)
            ->with('contribution')
            ->first();

        if (!$schoolYearContribution) {
            $syName = optional(SchoolYear::find($targetSchoolYearId))->name;
            return back()->withErrors([
                'payments' => "No School Year Contribution mapping found for {$contribution->contribution_type} (Grade {$student->gradeLevel->name}) for school year {$syName}.",
            ])->withInput();
        }

        // Total paid so far for this student/contribution in THIS specific year
        $totalPaidThisYear = Payment::where('student_id', $student->id)
            ->where('contribution_id', $contribution->id)
            ->where('school_year_id', $targetSchoolYearId)
            ->sum('amount_paid');

        // Remaining = effective required for this student in this year - total paid
        $requiredThisYearEff = $this->effectiveContributionAmount($student, $schoolYearContribution->contribution);
        $remainingThisYear = $requiredThisYearEff - $totalPaidThisYear;

        if ($paymentData['amount_paid'] > $remainingThisYear) {
            return back()->withErrors([
                'payments' => "Payment for {$contribution->contribution_type} exceeds remaining balance for {$schoolYearContribution->schoolYear->name}. Remaining: ₱{$remainingThisYear}",
            ])->withInput();
        }

        $amountToPay = $paymentData['amount_paid'];

        // Deduct from legacy running balances first (carry-over fields)
        if ($student->balance > 0) {
            if ($amountToPay >= $student->balance) {
                $amountToPay -= $student->balance;
                $student->balance = 0;
            } else {
                $student->balance -= $amountToPay;
                $amountToPay = 0;
            }
        }

        if ($amountToPay > 0) {
            if ($amountToPay >= $student->contribution_balance) {
                $amountToPay -= $student->contribution_balance;
                $student->contribution_balance = 0;
            } else {
                $student->contribution_balance -= $amountToPay;
                $amountToPay = 0;
            }
        }

        // Always record this payment as its own entry to avoid merging separate transactions
        $payment = Payment::create([
            'student_id' => $student->id,
            'contribution_id' => $contribution->id,
            'school_year_id' => $targetSchoolYearId,
            'amount_paid' => $paymentData['amount_paid'],
            'payment_date' => now(),
        ]);

        // ✅ Immediately reflect this payment in monthly Funds summary
        // This prevents needing to open Funds History to generate monthly totals
        $month = \Carbon\Carbon::parse($payment->payment_date)->format('Y-m');
        $fund = Fund::firstOrCreate(
            ['month' => $month],
            [
                'total_payments' => 0,
                'total_donations' => 0,
                'total_in_kind' => 0,
                'total_expenses' => 0,
                'total_funds' => 0,
            ]
        );

        $fund->total_payments = ($fund->total_payments ?? 0) + $paymentData['amount_paid'];
        $fund->total_funds =
            ($fund->total_payments ?? 0) +
            ($fund->total_donations ?? 0) -
            ($fund->total_expenses ?? 0);
        $fund->save();

        // Compute balance before/after within this year for history
        $lastHistory = PaymentHistory::where('school_year_contribution_id', $schoolYearContribution->id)
            ->whereHas('payment', function ($q) use ($student) {
                $q->where('student_id', $student->id);
            })
            ->latest('id')
            ->first();

        $balanceBefore = $lastHistory ? $lastHistory->balance_after : $requiredThisYearEff;
        $balanceAfter = $balanceBefore - $paymentData['amount_paid'];

        PaymentHistory::create([
            'payment_id' => $payment->id,
            'school_year_contribution_id' => $schoolYearContribution->id,
            'amount_paid' => $paymentData['amount_paid'],
            'payment_date' => $payment->payment_date,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
        ]);
    }

    $student->save();

    return redirect()->back()->with('success', 'Payments recorded successfully!');
}

/**
 * Compute effective contribution amount for a student.
 * Rule (per request): within the SAME guardian and SAME school year,
 *  - First child: pays ALL contributions.
 *  - Other children: pay MANDATORY contributions ONLY (no 50% on optional).
 */
private function effectiveContributionAmount(Student $student, Contribution $contribution): float
{
    // Determine first child among the guardian's students for THIS school year
    $guardianStudents = Student::where('guardian_id', $student->guardian_id)
        ->where('school_year_id', $student->school_year_id)
        ->orderBy('id')
        ->get();

    $firstStudent = $guardianStudents->first();

    $amount = (float) ($contribution->amount ?? 0);

    // If not the first child this year, only mandatory contributions apply
    if ($firstStudent && $student->id !== $firstStudent->id) {
        return intval($contribution->mandatory) === 1 ? $amount : 0.0;
    }

    // First child (or only child): full amount
    return $amount;
}

/**
 * Determine the correct active school year for a student
 */
private function getCorrectSchoolYear($student)
{
    $schoolYears = SchoolYearContribution::where('grade_level_id', $student->grade_level_id)
        ->pluck('school_year_id')
        ->unique()
        ->sort(); // oldest → newest

    foreach ($schoolYears as $syId) {
        $contributions = SchoolYearContribution::where('school_year_id', $syId)
            ->where('grade_level_id', $student->grade_level_id)
            ->get();

        $hasUnpaid = $contributions->contains(function ($syc) use ($student) {
            $totalPaid = Payment::where('student_id', $student->id)
                ->where('contribution_id', $syc->contribution_id)
                ->sum('amount_paid');

            $balance = $syc->contribution->amount - $totalPaid;
            return $balance > 0;
        });

        if ($hasUnpaid) return $syId;
    }

    // All paid → next school year
    $latestYear = $schoolYears->max();
    $nextYear = SchoolYear::where('id', '>', $latestYear)->orderBy('id')->value('id');
    return $nextYear ?: $latestYear;
}

private function buildStudentMergeKey($student): string
{
    $lrn = $this->normalizeLrn($student->lrn ?? null);
    if ($lrn !== '') {
        return 'lrn:' . $lrn;
    }

    $first = strtolower(trim((string) ($student->first_name ?? '')));
    $last = strtolower(trim((string) ($student->last_name ?? '')));
    $guardian = (int) ($student->guardian_id ?? 0);

    return "name:{$first}|{$last}|guardian:{$guardian}";
}

private function normalizeLrn(?string $lrn): string
{
    if ($lrn === null) {
        return '';
    }

    return preg_replace('/\s+/', '', (string) $lrn);
}



    // ---------------------------------------------------
    // Donations Management
    // ---------------------------------------------------

    public function donations()
    {
        $donations = Donation::latest()->get();

        $timezone = config('app.timezone', 'UTC');
        $donations = $donations->map(function ($donation) use ($timezone) {
            $donation->timestamp = optional($donation->created_at)?->timezone($timezone)->toIso8601String();
            return $donation;
        });

        $inKindDonations = $donations->where('donation_type', 'in-kind');
        $inKindSummary = collect();

        if ($inKindDonations->isNotEmpty()) {
            $usageByDonation = Expense::whereIn('donation_id', $inKindDonations->pluck('id'))
                ->get()
                ->groupBy('donation_id')
                ->map(function ($expenses) {
                    return $expenses->sum(function ($expense) {
                        return $this->extractUsedQuantity($expense->description);
                    });
                });

            $inKindSummary = $inKindDonations->map(function ($donation) use ($usageByDonation) {
                $donated = (float) ($donation->donation_quantity ?? 0);
                $used = (float) ($usageByDonation[$donation->id] ?? 0);
                $remaining = max($donated - $used, 0);

                return [
                    'id' => $donation->id,
                    'item' => $donation->donation_description ?: 'In-kind donation',
                    'donated_by' => $donation->donated_by,
                    'donation_date' => $donation->donation_date,
                    'received_by' => $donation->received_by,
                    'donated_quantity' => $donated,
                    'used_quantity' => $used,
                    'remaining_quantity' => $remaining,
                    'usage_status' => $donation->usage_status,
                    'usage_location' => $donation->usage_location,
                    'usage_notes' => $donation->usage_notes,
                ];
            })->values();
        }

        return Inertia::render('Treasurer/Donations', [
            'donations' => $donations,
            'inKindSummary' => $inKindSummary,
            'auth' => [
                'user' => Auth::guard('treasurer')->user(),
            ],
        ]);
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

    private function cleanInKindDescription(?string $description): ?string
    {
        if (!$description) {
            return null;
        }

        $cleaned = preg_replace('/\(Qty\s*Used:[^)]+\)/i', '', $description);
        $cleaned = preg_replace('/\(Estimated:[^)]+\)/i', '', $cleaned);
        $cleaned = trim(preg_replace('/\s{2,}/', ' ', $cleaned));

        return $cleaned !== '' ? $cleaned : null;
    }

    public function storeDonation(Request $request)
    {
        $validated = $request->validate([
            'donated_by' => 'required|string|max:255',
            'donation_type' => 'required|in:cash,in-kind',
            'donation_amount' => 'required|numeric|min:0',
            'donation_date' => 'required|date',
            'donation_quantity' => 'nullable|numeric|min:0|required_if:donation_type,in-kind',
            'donation_description' => 'nullable|string',
            'item_type' => 'nullable|string|max:255|required_if:donation_type,in-kind',
            'usage_status' => 'nullable|string|max:255',
            'usage_location' => 'nullable|string|max:255',
            'usage_notes' => 'nullable|string',
        ]);

    // ✅ Auto set received_by from logged-in Treasurer
    $treasurer = Auth::guard('treasurer')->user();
    $validated['received_by'] = $treasurer ? ($treasurer->first_name . ' ' . $treasurer->last_name) : null;

        if (($validated['donation_type'] ?? 'cash') !== 'in-kind') {
            $validated['usage_status'] = null;
            $validated['usage_location'] = null;
            $validated['usage_notes'] = null;
            $validated['donation_quantity'] = null;
            $validated['item_type'] = null;
        } else {
            $validated['usage_status'] = $validated['usage_status'] ?? 'Usable';
            $validated['donation_quantity'] = $validated['donation_quantity'] ?? 0;
        }

        Donation::create($validated);

    // update Funds
    $month = Carbon::parse($validated['donation_date'])->format('Y-m');
    $fund = Fund::firstOrCreate(['month' => $month], [
        'total_payments' => 0,
        'total_donations' => 0,
        'total_in_kind' => 0,
        'total_expenses' => 0,
        'total_funds' => 0,
    ]);

    if ($validated['donation_type'] === 'cash') {
        $fund->total_donations += $validated['donation_amount'];
    } else {
        $fund->total_in_kind += $validated['donation_amount'];
    }

    $fund->total_funds =
        ($fund->total_payments ?? 0) +
        ($fund->total_donations ?? 0) -
        ($fund->total_expenses ?? 0);

    $fund->save();

        return redirect()->back()->with('success', 'Donation recorded successfully.');
    }

    public function updateDonationStatus(Request $request, Donation $donation)
    {
        $request->validate([
            'usage_status' => 'required|string|max:255',
            'damaged_quantity' => 'nullable|numeric|min:0',
            'unusable_quantity' => 'nullable|numeric|min:0',
            'status_notes' => 'nullable|string',
        ]);

        if (strtolower($donation->donation_type) !== 'in-kind') {
            return back()->with('error', 'Only in-kind donations can be updated.');
        }

        $damaged = (float) $request->input('damaged_quantity', 0);
        $unusable = (float) $request->input('unusable_quantity', 0);

        $donatedQty = (float) ($donation->donation_quantity ?? 0);
        $usedQty = Expense::where('donation_id', $donation->id)
            ->get()
            ->sum(fn($expense) => $this->extractUsedQuantity($expense->description));

        $availableQty = max($donatedQty - $usedQty, 0);

        if (($damaged + $unusable) > $availableQty) {
            return back()
                ->withErrors([
                    'damaged_quantity' => 'Damaged/Unusable totals exceed the remaining donation quantity.',
                ])
                ->withInput();
        }

        $remainingQty = max($availableQty - $damaged - $unusable, 0);

        $donation->update([
            'usage_status' => $request->usage_status,
            'usage_notes' => $request->status_notes,
            'usable_quantity' => round($remainingQty, 2),
            'damaged_quantity' => $damaged,
            'unusable_quantity' => $unusable,
        ]);

        return redirect()->back()->with('success', 'Donation status updated.');
    }



    // ---------------------------------------------------
    // Funds Overview
    // ---------------------------------------------------



 public function overview()
    {
        // 🔹 Get funds ordered by latest month
        $funds = Fund::orderBy('month', 'desc')->get();

        return Inertia::render('Treasurer/Funds', [
            'funds' => $funds,
        ]);
    }

    // ---------------------------------------------------
    // Search
    // ---------------------------------------------------

    public function search(Request $request)
    {
        $query = $request->get('query');

        if (!$query) {
            return response()->json([]);
        }

        $guardians = Guardian::where('first_name', 'like', "%$query%")
            ->orWhere('middle_name', 'like', "%$query%")
            ->orWhere('last_name', 'like', "%$query%")
            ->get();

        return response()->json($guardians);
    }

    // ---------------------------------------------------
    // Payment Histories
    // ---------------------------------------------------
    public function paymentHistories()
    {
        $rawStudents = Student::with(['gradeLevel', 'section'])->get();
        $schoolYearContributions = SchoolYearContribution::with(['contribution', 'schoolYear'])->get();
        $histories = PaymentHistory::with([
            'payment.student',
            'schoolYearContribution.contribution',
            'schoolYearContribution.schoolYear'
        ])
            ->orderBy('payment_date', 'asc')
            ->get();

        $studentGroups = $rawStudents->groupBy(function ($student) {
            $lrn = trim((string) ($student->lrn ?? ''));
            if ($lrn !== '') {
                return $lrn;
            }

            $first = trim((string) ($student->first_name ?? ''));
            $last = trim((string) ($student->last_name ?? ''));
            $guardian = $student->guardian_id ?? 0;

            return strtolower($first . '|' . $last . '|' . $guardian);
        });

        $historiesByStudentId = $histories->groupBy(function ($history) {
            return optional($history->payment)->student_id;
        });

        $normalizedStudents = collect();
        $processed = [];

        $timezone = config('app.timezone', 'UTC');

        foreach ($studentGroups as $group) {
            $currentStudent = $group->sortByDesc('school_year_id')->first();
            if (!$currentStudent) {
                continue;
            }

            $normalizedStudents->push($currentStudent);

            $studentIds = $group->pluck('id');
            $studentHistories = $studentIds
                ->flatMap(function ($studentId) use ($historiesByStudentId) {
                    return $historiesByStudentId->get($studentId, collect());
                })
                ->sortBy('payment_date')
                ->values();

            $historyPayload = $studentHistories->map(function ($history) use ($timezone) {
                $contribution = optional($history->schoolYearContribution)->contribution;
                $paymentTimestamp = optional($history->payment)->created_at ?? $history->created_at;
                $displayTimestamp = $paymentTimestamp?->timezone($timezone)->toIso8601String();

                return [
                    'id'             => $history->id,
                    'payment_date'   => $displayTimestamp,
                    'contribution'   => $contribution->contribution_type ?? '',
                    'required'       => $contribution->amount ?? 0,
                    'amount_paid'    => (float) ($history->amount_paid ?? 0),
                    'balance_before' => (float) ($history->balance_before ?? 0),
                    'balance_after'  => (float) ($history->balance_after ?? 0),
                ];
            })->values();

            $totalPaid = $studentHistories->sum('amount_paid');
            $carryOver = (float) ($currentStudent->balance ?? 0);
            $currentBalance = (float) ($currentStudent->contribution_balance ?? 0);
            $totalBalanceBefore = $carryOver + $currentBalance;
            $totalBalanceAfter = max(0, $totalBalanceBefore - $totalPaid);
            $lastHistory = $studentHistories->last();
            $lastHistoryTimestamp = $lastHistory
                ? (optional($lastHistory->payment)->created_at ?? $lastHistory->created_at)
                : null;
            $lastPaymentIso = $lastHistoryTimestamp?->timezone($timezone)->toIso8601String();

            $processed[$currentStudent->id] = [
                'student_id'   => $currentStudent->id,
                'student_name' => trim(($currentStudent->first_name ?? '') . ' ' . ($currentStudent->last_name ?? '')),
                'grade_level'  => $currentStudent->gradeLevel->name ?? '-',
                'section'      => $currentStudent->section->name ?? '-',
                'histories'    => $historyPayload,
                'totals'       => [
                    'total_paid'           => (float) $totalPaid,
                    'total_balance_before' => $totalBalanceBefore,
                    'total_balance_after'  => $totalBalanceAfter,
                    'last_payment_date'    => $lastPaymentIso,
                ],
            ];
        }

        return Inertia::render('Treasurer/PaymentHistories', [
            'students'                => $normalizedStudents->values(),
            'paymentHistories'        => $processed,
            'schoolYearContributions' => $schoolYearContributions,
        ]);
    }
    




    // ---------------------------------------------------
    // Funds History
    // ---------------------------------------------------

public function fundsHistory()
{
    // ✅ Collect all records
    $timezone = config('app.timezone', 'UTC');

    $payments = Payment::select(
        'id',
        'amount_paid as amount',
        'payment_date as date',
        'student_id',
        'created_at',
        DB::raw("'payment' as type")
    )->get();

    $donations = Donation::select(
        'id',
        'donation_amount as amount',
        'donation_date as date',
        'donated_by',
        'donation_type',
        'created_at',
        DB::raw("'donation' as type")
    )->get();

    $expenses = Expense::with(['contribution', 'donation'])->select(
        'id',
        'amount',
        'expense_date as date',
        'description',
        'contribution_id',
        'donation_id',
        'created_at',
        DB::raw("'expense' as type")
    )->get();

    // ✅ Merge & sort by date
    $all = $payments->concat($donations)->concat($expenses)
        ->sortBy('date')
        ->values();

    $balance = 0;
    $histories = [];
    $monthlyTotals = [];

    foreach ($all as $row) {
        $month = \Carbon\Carbon::parse($row->date)->format('Y-m');
        $before = $balance;

        // ✅ Handle balance & monthly totals
        switch ($row->type) {
            case 'payment':
                $balance += $row->amount;
                $monthlyTotals[$month]['payments'] = ($monthlyTotals[$month]['payments'] ?? 0) + $row->amount;
                break;

            case 'donation':
                if (strtolower($row->donation_type) === 'cash') {
                    $balance += $row->amount;
                    $monthlyTotals[$month]['donations'] = ($monthlyTotals[$month]['donations'] ?? 0) + $row->amount;
                } else {
                    $monthlyTotals[$month]['in_kind_value'] = ($monthlyTotals[$month]['in_kind_value'] ?? 0) + $row->amount;
                }
                break;

            case 'expense':
                $balance -= $row->amount;
                $monthlyTotals[$month]['expenses'] = ($monthlyTotals[$month]['expenses'] ?? 0) + $row->amount;
                break;
        }

        $after = $balance;

        // ✅ Save/Update monthly fund summary
        $fund = Fund::updateOrCreate(
            ['month' => $month],
            [
                'total_payments' => $monthlyTotals[$month]['payments'] ?? 0,
                'total_donations' => $monthlyTotals[$month]['donations'] ?? 0,
                'total_in_kind' => $monthlyTotals[$month]['in_kind_value'] ?? 0,
                'total_expenses' => $monthlyTotals[$month]['expenses'] ?? 0,
                'total_funds' =>
                    ($monthlyTotals[$month]['payments'] ?? 0) +
                    ($monthlyTotals[$month]['donations'] ?? 0) -
                    ($monthlyTotals[$month]['expenses'] ?? 0),
            ]
        );

        // ✅ Generate description
        $description = match ($row->type) {
            'payment'  => 'Payment by Student ID: ' . $row->student_id,
            'donation' => 'Donation from ' . $row->donated_by .
                          ($row->donation_type === 'in-kind' ? ' (In-Kind)' : ' (Cash)'),
            'expense'  => 'Expense: ' . $row->description .
                          ($row->contribution ? ' (' . $row->contribution->name . ')' : ''),
        };

        // ✅ Save history record
        FundHistory::updateOrCreate(
            [
                'fund_id' => $fund->id,
                'payment_id' => $row->type === 'payment' ? $row->id : null,
                'donation_id' => $row->type === 'donation' ? $row->id : null,
                'expense_id' => $row->type === 'expense' ? $row->id : null,
            ],
            [
                'fund_date' => $row->date,
                'fund_description' => $description,
                'amount' => $row->amount,
                'balance_before' => $before,
                'balance_after' => $after,
            ]
        );

        // ✅ Prepare for frontend
        $linkedDonation = ($row->type === 'expense') ? $row->donation : null;
        $isInKindExpense = $linkedDonation && strtolower($linkedDonation->donation_type) === 'in-kind';

        $expenseSourceType = null;
        $expenseSourceLabel = null;

        if ($row->type === 'expense') {
            if ($isInKindExpense) {
                $expenseSourceType = 'in-kind';
                $expenseSourceLabel = $linkedDonation?->item_type ?: 'In-Kind Donation';
            } elseif ($row->contribution) {
                $expenseSourceType = 'contribution';
                $expenseSourceLabel = $row->contribution->contribution_type ?? $row->contribution->name;
            } else {
                $expenseSourceType = 'cash';
                $expenseSourceLabel = 'Cash Donation';
            }
        }

        $histories[] = [
            'fund_date' => $row->date,
            'fund_description' => $description,
            'amount' => $row->amount,
            'balance_before' => $before,
            'balance_after' => $after,
            'payment_id' => $row->type === 'payment' ? $row->id : null,
            'donation_id' => $row->type === 'donation' ? $row->id : null,
            'donation_type' => $row->type === 'donation' ? $row->donation_type : null,
            'expense_id' => $row->type === 'expense' ? $row->id : null,
            'contribution_name' => $row->type === 'expense' && $row->contribution ? $row->contribution->name : null,
            'expense_description' => $row->type === 'expense'
                ? ($linkedDonation ? $this->cleanInKindDescription($row->description) : $row->description)
                : null,
            'expense_in_kind' => $isInKindExpense,
            'expense_in_kind_donor' => $linkedDonation ? $linkedDonation->donated_by : null,
            'expense_in_kind_notes' => $linkedDonation ? $linkedDonation->donation_description : null,
            'expense_in_kind_item_type' => $linkedDonation ? $linkedDonation->item_type : null,
            'expense_in_kind_total' => $linkedDonation ? (float) ($linkedDonation->donation_amount ?? 0) : null,
            'expense_in_kind_used' => $row->type === 'expense'
                ? (float) $this->extractUsedQuantity($row->description)
                : null,
            'expense_source_type' => $expenseSourceType,
            'expense_source_label' => $expenseSourceLabel,
            'timestamp' => optional($row->created_at)?->timezone($timezone)->toIso8601String(),
        ];
    }

    // ✅ Grand totals
    $grandPayments = array_sum(array_column($monthlyTotals, 'payments'));
    $grandDonations = array_sum(array_column($monthlyTotals, 'donations'));
    $grandExpenses = array_sum(array_column($monthlyTotals, 'expenses'));
    $grandInKind = array_sum(array_column($monthlyTotals, 'in_kind_value'));
    $grandAvailable = ($grandPayments + $grandDonations) - $grandExpenses;

    return Inertia::render('Treasurer/FundsHistory', [
        'fundsHistories' => $histories,
        'totals' => [
            'payments' => $grandPayments,
            'donations' => $grandDonations,
            'inKind' => $grandInKind,
            'expenses' => $grandExpenses,
            'available' => $grandAvailable,
        ]
    ]);
}

 public function report()
{
    $timezone = config('app.timezone', 'UTC');

    // 🔹 Date range filters (default: current month)
    $start = request('start');
    $end = request('end');

    if ($start && $end) {
        $startDate = Carbon::parse($start)->startOfDay();
        $endDate = Carbon::parse($end)->endOfDay();
    } else {
        $startDate = now()->startOfMonth();
        $endDate = now()->endOfMonth();
    }

    $currentMonth = $startDate->month;
    $currentYear = $startDate->year;

    // Transactions BEFORE current month (exclude in-kind)
    $paymentsBefore = Payment::where('payment_date', '<', $startDate)
        ->sum('amount_paid');

    $donationsBefore = Donation::where('donation_type', '!=', 'in-kind')
        ->where('donation_date', '<', $startDate)
        ->sum('donation_amount');

    $expensesBefore = Expense::where('expense_date', '<', $startDate)
        ->sum('amount');

    $beginningBalance = $paymentsBefore + $donationsBefore - $expensesBefore;

    // Current month totals (exclude in-kind donations)
    $currentMonthPayments = Payment::whereBetween('payment_date', [$startDate, $endDate])
        ->sum('amount_paid');

    $currentMonthDonations = Donation::where('donation_type', '!=', 'in-kind')
        ->whereBetween('donation_date', [$startDate, $endDate])
        ->sum('donation_amount');

    $currentMonthExpenses = Expense::whereBetween('expense_date', [$startDate, $endDate])
        ->sum('amount');

    $available = $beginningBalance + $currentMonthPayments + $currentMonthDonations - $currentMonthExpenses;

    // Contributions with totals for selected date range
    $contributions = Contribution::with(['payments' => function ($q) use ($startDate, $endDate) {
        $q->whereBetween('payment_date', [$startDate, $endDate]);
    }])->get()->map(function ($c) {
        $c->totalPaid = $c->payments->sum('amount_paid');
        return $c;
    });
    $contributionMap = $contributions->keyBy('id');

    // Donations (show ALL donations including in-kind, for listing only)
    $donations = Donation::select(
        'id',
        'donated_by',
        'donation_type',
        'donation_amount',
        'donation_description',
        'received_by',
        'donation_date',
        'donation_quantity',
        'item_type',
        'usable_quantity',
        'damaged_quantity',
        'unusable_quantity',
        'usage_status',
        'usage_notes',
        'created_at'
    )
    ->whereBetween('donation_date', [$startDate, $endDate])
    ->get();

    if ($donations->isNotEmpty()) {
        $usageByDonation = Expense::whereIn('donation_id', $donations->pluck('id'))
            ->get()
            ->groupBy('donation_id')
            ->map(function ($expenses) {
                return $expenses->sum(function ($expense) {
                    return $this->extractUsedQuantity($expense->description);
                });
            });

        $donations = $donations->map(function ($donation) use ($timezone, $usageByDonation) {
            $donated = (float) ($donation->donation_quantity ?? 0);
            $used = (float) ($usageByDonation[$donation->id] ?? 0);
            $damaged = (float) ($donation->damaged_quantity ?? 0);
            $unusable = (float) ($donation->unusable_quantity ?? 0);
            $remaining = max($donated - $used - $damaged - $unusable, 0);

            $donation->used_quantity = round($used, 2);
            if ($donation->usable_quantity === null) {
                $donation->usable_quantity = round($remaining, 2);
            }

            $donation->timestamp = optional($donation->created_at)?->timezone($timezone)->toIso8601String();
            return $donation;
        });
    }

    // Payments with student + contribution
    $payments = Payment::with(['student', 'contribution'])
        ->whereBetween('payment_date', [$startDate, $endDate])
        ->get()
        ->map(function ($p) use ($timezone) {
            return [
                'id' => $p->id,
                'student_name' => $p->student->first_name . ' ' . $p->student->last_name,
                'contribution_name' => $p->contribution->contribution_type ?? 'N/A',
                'amount_paid' => $p->amount_paid,
                'payment_date' => $p->payment_date,
                'timestamp' => optional($p->created_at)?->timezone($timezone)->toIso8601String(),
            ];
        });

    // Fund histories (include all donations, even in-kind)
    $fundsHistories = FundHistory::with([
            'donation',
            'expense.contribution',
            'expense.donation',
            'payment.student',
        ])
        ->where(function ($q) {
            $q->whereHas('donation')
                ->orWhereNotNull('payment_id')
                ->orWhereNotNull('expense_id');
        })
        ->whereBetween('fund_date', [$startDate, $endDate])
        ->orderBy('fund_date')
        ->orderBy('id')
        ->get()
        ->map(function ($history) use ($timezone) {
            $payment = $history->payment;
            $donation = $history->donation;
            $expense = $history->expense;

            $student = $payment?->student;
            $studentName = $student
                ? trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? ''))
                : null;

            $linkedDonation = $expense?->donation;
            $isInKindExpense = $linkedDonation && strcasecmp($linkedDonation->donation_type ?? '', 'in-kind') === 0;

            $expenseSourceType = null;
            $expenseSourceLabel = null;

            if ($expense) {
                if ($isInKindExpense) {
                    $expenseSourceType = 'in-kind';
                    $expenseSourceLabel = $linkedDonation?->item_type ?: 'In-Kind Donation';
                } elseif ($expense->contribution) {
                    $expenseSourceType = 'contribution';
                    $expenseSourceLabel = $expense->contribution->contribution_type
                        ?? $expense->contribution->name;
                } else {
                    $expenseSourceType = 'cash';
                    $expenseSourceLabel = 'Cash Donation';
                }
            }

            $sourceTimestamp = $payment?->created_at
                ?? $donation?->created_at
                ?? $expense?->created_at
                ?? $history->created_at;

            return [
                'id' => $history->id,
                'fund_date' => $history->fund_date,
                'amount' => (float) $history->amount,
                'balance_before' => (float) $history->balance_before,
                'balance_after' => (float) $history->balance_after,
                'fund_description' => $history->fund_description,
                'payment_id' => $history->payment_id,
                'donation_id' => $history->donation_id,
                'donation_type' => $donation?->donation_type,
                'donated_by' => $donation?->donated_by,
                'expense_id' => $history->expense_id,
                'expense_type' => $expense?->expense_type,
                'student_name' => $studentName,
                'contribution_name' => $expense && $expense->contribution
                    ? ($expense->contribution->contribution_type ?? $expense->contribution->name)
                    : null,
                'expense_description' => $expense
                    ? ($isInKindExpense
                        ? $this->cleanInKindDescription($expense->description)
                        : $expense->description)
                    : null,
                'expense_in_kind' => $isInKindExpense,
                'expense_in_kind_donor' => $linkedDonation?->donated_by,
                'expense_in_kind_notes' => $linkedDonation?->donation_description,
                'expense_in_kind_item_type' => $linkedDonation?->item_type,
                'expense_in_kind_total' => $linkedDonation
                    ? (float) ($linkedDonation->donation_amount ?? 0)
                    : null,
                'expense_in_kind_used' => $expense
                    ? (float) $this->extractUsedQuantity($expense->description)
                    : null,
                'expense_source_type' => $expenseSourceType,
                'expense_source_label' => $expenseSourceLabel,
                'timestamp' => optional($sourceTimestamp)?->timezone($timezone)->toIso8601String(),
            ];
        })
        ->values();



    // Expenses list for the current month
    $expenses = Expense::with('contribution')
        ->whereBetween('expense_date', [$startDate, $endDate])
        ->get()
        ->map(function ($e) {
            return [
                'id' => $e->id,
                'expense_type' => $e->expense_type,
                'description' => $e->description ?? 'Miscellaneous',
                'amount' => $e->amount,
                'expense_date' => $e->expense_date,
                'contribution' => $e->contribution ? [
                    'contribution_type' => $e->contribution->contribution_type
                ] : null,
            ];
        });

    // School Year logic
    $schoolYearStart = $currentMonth >= 6 ? $currentYear : $currentYear - 1;
    $schoolYear = $schoolYearStart . '-' . ($schoolYearStart + 1);

    $summary = [
        'schoolYear' => $schoolYear,
        'beginningBalance' => $beginningBalance,
        'totalPayments' => $currentMonthPayments,
        'totalDonations' => $currentMonthDonations,
        'totalExpenses' => $currentMonthExpenses,
        'available' => $available,
    ];

  $totals = [
    'payments' => $payments->sum('amount_paid'),
    'donations' => $donations->where('donation_type', '!=', 'in-kind')->sum('donation_amount'),
    'inKind' => $donations->where('donation_type', 'in-kind')->count(),
    'expenses' => $expenses->sum('amount'),
];

// Compute available funds
$totals['available'] = $totals['payments'] + $totals['donations'] - $totals['expenses'];

    $selectedSectionId = request('section_id');

    $sectionsList = Section::with('gradeLevel')
        ->orderBy('grade_level_id')
        ->orderBy('name')
        ->get();

    $schoolYearsAll = SchoolYear::orderBy('id')->get();
    $schoolYearMap = $schoolYearsAll->keyBy('id');
    $previousYearMap = [];
    $lastYearRef = null;
    foreach ($schoolYearsAll as $schoolYearRow) {
        $previousYearMap[$schoolYearRow->id] = $lastYearRef ? $lastYearRef->id : null;
        $lastYearRef = $schoolYearRow;
    }

    $lastPaymentDates = Payment::select('student_id')
        ->selectRaw('MAX(payment_date) as last_payment_date')
        ->groupBy('student_id')
        ->pluck('last_payment_date', 'student_id');

    $sectionSummaries = [];
    $sectionDetails = [
        'paid' => [],
        'partial' => [],
        'unpaid' => [],
    ];
    $sectionStudentDetails = [];

    // Use each student's own school_year_id to compute per-year required and paid
    $studentsAll = Student::with(['gradeLevel', 'section', 'schoolYear'])->get();

    $syContribsAll = SchoolYearContribution::with(['contribution'])
        ->get()
        ->groupBy(function ($syc) {
            return $syc->school_year_id . '-' . $syc->grade_level_id;
        });

    $paymentSums = Payment::select('student_id', 'contribution_id', 'school_year_id')
        ->selectRaw('SUM(amount_paid) as total_paid')
        ->groupBy('student_id', 'contribution_id', 'school_year_id')
        ->get();

    $paymentsIndex = [];
    foreach ($paymentSums as $paymentRow) {
        $key = $paymentRow->student_id . '-' . $paymentRow->school_year_id . '-' . $paymentRow->contribution_id;
        $paymentsIndex[$key] = (float) $paymentRow->total_paid;
    }
    $paymentsByStudent = $paymentSums->groupBy('student_id');

    $studentStats = $studentsAll->map(function ($student) use ($syContribsAll, $paymentsIndex, $schoolYearMap, $previousYearMap, $lastPaymentDates, $paymentsByStudent, $contributionMap) {
        $syKey = $student->school_year_id . '-' . $student->grade_level_id;
        $relevant = $syContribsAll->get($syKey, collect());

        $required = 0;
        $paid = 0;
        $contributionsBreakdown = [];
        $carryOverBalance = (float) ($student->balance ?? 0);
        $currentSchoolYear = $schoolYearMap->get($student->school_year_id);
        $previousSchoolYearId = $previousYearMap[$student->school_year_id] ?? null;
        $previousSchoolYear = $previousSchoolYearId ? $schoolYearMap->get($previousSchoolYearId) : null;

        foreach ($relevant as $syc) {
            $contribution = $syc->contribution;
            if (!$contribution) {
                continue;
            }

            $requiredAmount = (float) $this->effectiveContributionAmount($student, $contribution);
            $key = $student->id . '-' . $student->school_year_id . '-' . $contribution->id;
            $paidAmount = (float) ($paymentsIndex[$key] ?? 0);

            if ($requiredAmount <= 0 && $paidAmount <= 0) {
                continue;
            }

            $paidForTotals = $requiredAmount > 0 ? min($paidAmount, $requiredAmount) : 0;
            $balanceAmount = max(0, $requiredAmount - $paidForTotals);

            $contributionsBreakdown[] = [
                'id' => $contribution->id,
                'name' => $contribution->contribution_type,
                'required' => $requiredAmount,
                'paid' => $paidForTotals,
                'paid_display' => $paidAmount,
                'balance' => $balanceAmount,
            ];

            $required += $requiredAmount;
            $paid += $paidForTotals;
        }

        usort($contributionsBreakdown, fn($a, $b) => strcmp($a['name'], $b['name']));

        $balance = max(0, (float) $required - (float) $paid);

        $lastPaymentDate = $lastPaymentDates[$student->id] ?? null;

        $paidHistory = [];
        $studentPaymentEntries = $paymentsByStudent->get($student->id, collect());
        foreach ($studentPaymentEntries as $paymentEntry) {
            $totalPaid = (float) ($paymentEntry->total_paid ?? 0);
            if ($totalPaid <= 0) {
                continue;
            }

            $contributionModel = $contributionMap->get($paymentEntry->contribution_id);
            if (!$contributionModel) {
                continue;
            }

            $paidHistory[] = [
                'id' => $paymentEntry->contribution_id,
                'name' => $contributionModel->contribution_type,
                'paid' => $totalPaid,
                'paid_display' => $totalPaid,
                'school_year_id' => $paymentEntry->school_year_id,
                'school_year_name' => optional($schoolYearMap->get($paymentEntry->school_year_id))->name,
            ];
        }

        return [
            'student_id' => $student->id,
            'student_name' => trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? '')),
            'grade_level_id' => $student->grade_level_id,
            'grade_level_name' => optional($student->gradeLevel)->name,
            'section_id' => $student->section_id,
            'section_name' => optional($student->section)->name,
            'required' => (float)$required,
            'paid' => (float)$paid,
            'balance' => (float)$balance,
            'contributions' => $contributionsBreakdown,
            'previous_balance' => $carryOverBalance,
            'last_payment_date' => $lastPaymentDate ? Carbon::parse($lastPaymentDate)->toDateString() : null,
            'current_school_year' => [
                'id' => $student->school_year_id,
                'name' => optional($currentSchoolYear)->name,
                'required' => (float)$required,
                'paid' => (float)$paid,
                'balance' => (float)$balance,
                'contributions' => $contributionsBreakdown,
            ],
            'previous_school_year' => [
                'id' => $previousSchoolYearId,
                'name' => optional($previousSchoolYear)->name,
                'carry_over' => $carryOverBalance,
            ],
            'paid_contributions' => $paidHistory,
        ];
    });

    foreach ($sectionsList as $sec) {
        $rows = $studentStats->where('section_id', $sec->id)->values();
        $totalRequired = (float) $rows->sum('required');
        $totalPaid = (float) $rows->sum('paid');
        $totalBalance = max(0, $totalRequired - $totalPaid);
        $paidRows = $rows->filter(fn($r) => $r['required'] > 0 && $r['balance'] <= 0)->values();
        $partialRows = $rows->filter(fn($r) => $r['required'] > 0 && $r['paid'] > 0 && $r['balance'] > 0)->values();
        $unpaidRows = $rows->filter(fn($r) => $r['required'] > 0 && ($r['paid'] ?? 0) <= 0 && $r['balance'] > 0)->values();
        $paidCount = $paidRows->count();
        $unpaidCount = $unpaidRows->count();

        $sectionSummaries[] = [
            'id' => $sec->id,
            'name' => $sec->name,
            'grade_level_name' => optional($sec->gradeLevel)->name,
            'total_students' => $rows->count(),
            'paid_students' => $paidCount,
            'unpaid_students' => $unpaidCount,
            'total_required' => $totalRequired,
            'total_paid' => $totalPaid,
            'total_balance' => $totalBalance,
            'carry_over_total' => (float) $rows->sum('previous_balance'),
        ];

        $sectionStudentDetails[$sec->id] = [
            'paid' => $paidRows->all(),
            'partial' => $partialRows->all(),
            'unpaid' => $unpaidRows->all(),
        ];
    }

    if ($selectedSectionId && isset($sectionStudentDetails[$selectedSectionId])) {
        $sectionDetails = $sectionStudentDetails[$selectedSectionId];
    }

    return inertia('Treasurer/Report', [
        'donations' => $donations, // all donations for listing
        'payments' => $payments,
        'fundsHistories' => $fundsHistories,
        'contributions' => $contributions,
        'expenses' => $expenses,
        'totals' => $totals,
        'summary' => $summary,
        'filters' => [
            'start' => $startDate->toDateString(),
            'end' => $endDate->toDateString(),
        ],
        'sections' => $sectionsList->map(function ($s) {
            return [
                'id' => $s->id,
                'name' => $s->name,
                'grade_level_name' => optional($s->gradeLevel)->name,
            ];
        }),
        'sectionSummaries' => $sectionSummaries,
        'sectionDetails' => $sectionDetails,
        'sectionStudentDetails' => $sectionStudentDetails,
        'selectedSectionId' => $selectedSectionId ? (int)$selectedSectionId : null,
    ]);
}


}
