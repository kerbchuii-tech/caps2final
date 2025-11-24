<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\Payment;
use App\Models\SchoolYearContribution;
use App\Models\Contribution;
use App\Models\SchoolYear;
use App\Models\Expense;
use App\Models\Donation;
use App\Models\FundHistory;
use App\Models\Announcement;
use App\Models\User;
use Carbon\Carbon;

class GuardianController extends Controller
{
    public function showLogin()
    {
        if (Auth::guard('guardian')->check()) {
            return redirect()->route('guardian.dashboard');
        }

        return Inertia::render('Guardian/GuardianLogin');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $credentials['username'])
            ->where('role', 'guardian')
            ->where('status', 'active')
            ->first();

        if ($user && Hash::check($credentials['password'], $user->password)) {
            Auth::guard('guardian')->login($user);
            $request->session()->regenerate();
            return redirect()->route('guardian.dashboard');
        }

        return back()->withErrors([
            'username' => 'Invalid credentials',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('guardian')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('guardian.login');
    }

    /**
     * Show Guardian Profile page
     */
    public function showProfile()
    {
        return $this->renderWithNotifications('Guardian/GuardianProfile', [
            'auth' => [
                'user' => Auth::guard('guardian')->user(),
            ],
        ]);
    }

    /**
     * Update Guardian password
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = Auth::guard('guardian')->user();

        if (!$user || !Hash::check($request->input('current_password'), $user->password)) {
            return back()->withErrors(['current_password' => 'The current password is incorrect.']);
        }

        $user->password = Hash::make($request->input('new_password'));
        $user->save();

        return back();
    }

    public function announcements(Request $request)
    {
        $activeSchoolYear = SchoolYear::active()->latest('start_date')->first()
            ?? SchoolYear::latest('start_date')->first();

        return $this->renderWithNotifications('Guardian/Announcements', [
            'announcements' => $this->getGuardianNotifications(),
            'highlight' => $request->query('highlight'),
            'activeSchoolYear' => $activeSchoolYear ? [
                'id' => $activeSchoolYear->id,
                'name' => $activeSchoolYear->name,
                'start_date' => $activeSchoolYear->start_date,
                'end_date' => $activeSchoolYear->end_date,
                'is_active' => (bool) $activeSchoolYear->is_active,
            ] : null,
        ]);
    }

    public function dashboard()
    {
        $user = auth('guardian')->user();
        $guardian = Guardian::where('user_id', optional($user)->id)->first();

        $schoolYear = SchoolYear::active()->latest('start_date')->first()
            ?? SchoolYear::latest('start_date')->first();

        if (!$guardian) {
            return $this->renderWithNotifications('Guardian/Dashboard', [
                'guardian' => null,
                'students' => [],
                'payments' => [],
                'schoolYear' => $schoolYear,
                'totalBalance' => 0,
                'missingGuardian' => true,
            ]);
        }

        $students = $schoolYear
            ? Student::with(['gradeLevel','section'])
                ->where('guardian_id', $guardian->id)
                ->where('school_year_id', $schoolYear->id)
                ->get()
            : collect();

        $linkedStudentIdsMap = $this->buildLinkedStudentIdsMap($guardian, $students);
        $allLinkedIds = $linkedStudentIdsMap->flatten()->unique();

        $payments = $allLinkedIds->isNotEmpty()
            ? Payment::whereIn('student_id', $allLinkedIds)->get()
            : collect();

        $paymentsByStudent = $payments
            ->groupBy('student_id')
            ->map(fn ($items) => $items->sum(fn ($payment) => (float) $payment->amount_paid));

        $students = $students->map(function ($student) use ($paymentsByStudent, $linkedStudentIdsMap) {
            $linkedIds = $linkedStudentIdsMap->get($student->id, collect([$student->id]));
            $totalPaid = $linkedIds->sum(fn ($id) => (float) ($paymentsByStudent->get($id, 0)));
            $student->total_paid = $totalPaid;
            $student->remaining_balance = (float) ($student->balance ?? 0) + (float) ($student->contribution_balance ?? 0);
            return $student;
        });

        // 🔹 Compute total contribution paid across students
        $totalContributions = $students->reduce(function ($sum, $s) {
            return $sum + (float) ($s->total_paid ?? 0);
        }, 0);

        // 🔹 Compute total balance = balance + contribution_balance
        $totalBalance = $students->reduce(function ($sum, $s) {
            return $sum
                + (float) $s->balance
                + (float) $s->contribution_balance;
        }, 0);

    return $this->renderWithNotifications('Guardian/Dashboard', [
        'guardian'      => $guardian,
        'students'      => $students,
        'payments'      => $payments,
        'schoolYear'    => $schoolYear,
        'totalBalance'  => $totalBalance, // ✅ pass to frontend
        'totalContributions' => $totalContributions,
        'missingGuardian' => false,
    ]);
}


public function myStudents()
{
    $user = auth('guardian')->user();
    $guardian = Guardian::where('user_id', optional($user)->id)->first();

    $schoolYear = SchoolYear::latest()->first();

    $timezone = config('app.timezone', 'UTC');

    if (!$guardian) {
        return $this->renderWithNotifications('Guardian/MyStudents', [
            'guardian' => null,
            'students' => [],
            'payments' => [],
            'schoolYearContributions' => [],
            'contributions' => [],
            'previousGrade7' => [],
            'schoolYear' => $schoolYear,
            'schoolYearCards' => [],
            'missingGuardian' => true,
            'appTimezone' => $timezone,
        ]);
    }

    if (!$schoolYear) {
        return $this->renderWithNotifications('Guardian/MyStudents', [
            'students' => [],
            'payments' => [],
            'schoolYearContributions' => [],
            'contributions' => [],
            'guardian' => $guardian,
            'previousGrade7' => [],
            'schoolYear' => null,
            'schoolYearCards' => [],
            'missingGuardian' => false,
            'appTimezone' => $timezone,
        ]);
    }

    $students = Student::with(['gradeLevel', 'section'])
        ->where('guardian_id', $guardian->id)
        ->where('school_year_id', $schoolYear->id)
        ->get();

    $payments = Payment::with(['student', 'contribution'])
        ->whereIn('student_id', $students->pluck('id'))
        ->where('school_year_id', $schoolYear->id)
        ->get();

    $schoolYearContributions = SchoolYearContribution::with('contribution')
        ->where('school_year_id', $schoolYear->id)
        ->get();

    $contributions = Contribution::all();

    // Determine billing status for each current-year student (billed if grade-level has assigned contributions)
    $sycByGrade = $schoolYearContributions->groupBy('grade_level_id');
    $students = $students->map(function ($s) use ($sycByGrade) {
        $gradeContribs = $sycByGrade->get($s->grade_level_id, collect());
        $s->is_billed = $gradeContribs->count() > 0;
        $s->billed_items_count = $gradeContribs->count();
        return $s;
    });

    // Fetch previous school year
    $previousGrade7 = collect();
    // Prefer start_date to find previous SY; fallback to ID if dates are missing
    if (!empty($schoolYear->start_date)) {
        $previousSchoolYear = SchoolYear::where('start_date', '<', $schoolYear->start_date)
            ->orderBy('start_date', 'desc')
            ->first();
    } else {
        $previousSchoolYear = SchoolYear::where('id', '<', $schoolYear->id)
            ->orderBy('id', 'desc')
            ->first();
    }

    if ($previousSchoolYear) {
        $previousGrade7 = Student::with(['gradeLevel', 'section'])
            ->where('guardian_id', $guardian->id)
            ->where('school_year_id', $previousSchoolYear->id)
            ->whereHas('gradeLevel', function ($q) {
                $q->where('name', 'Grade 7');
            })
            ->get();
    }

    // Build cards for ALL school years that have students for this guardian
    $schoolYearCards = [];
    $guardianStudentIds = Student::where('guardian_id', $guardian->id)->pluck('id');
    $syIdsFromStudents = Student::where('guardian_id', $guardian->id)
        ->distinct()
        ->pluck('school_year_id');

    $allGuardianPayments = Payment::with('contribution')
        ->whereIn('student_id', $guardianStudentIds)
        ->orderBy('payment_date', 'desc')
        ->get();
    $paymentsByStudent = $allGuardianPayments->groupBy('student_id');

    $syIdsFromPayments = $allGuardianPayments
        ->pluck('school_year_id')
        ->filter()
        ->unique()
        ->values();
    $syIds = $syIdsFromStudents->merge($syIdsFromPayments)->unique()->values();

    $allSchoolYears = SchoolYear::whereIn('id', $syIds)
        ->orderBy('start_date', 'desc')
        ->orderBy('id', 'desc')
        ->get();
    $schoolYearNameMap = $allSchoolYears->pluck('name', 'id');

    foreach ($allSchoolYears as $sy) {
        $yearStudents = Student::with(['gradeLevel', 'section'])
            ->where('guardian_id', $guardian->id)
            ->where('school_year_id', $sy->id)
            ->orderBy('id')
            ->get();

        $yearPayments = $allGuardianPayments
            ->where('school_year_id', $sy->id)
            ->values();

        $yearContribs = SchoolYearContribution::with('contribution')
            ->where('school_year_id', $sy->id)
            ->get()
            ->groupBy('grade_level_id');

        $studentsForCard = collect();

        // Map existing year students first (preserves linking order for waiver logic)
        $yearStudents->values()->each(function ($student, $index) use ($yearPayments, $yearContribs, $studentsForCard, $paymentsByStudent, $schoolYearNameMap, $timezone) {
            $gradeContribs = $yearContribs->get((int) $student->grade_level_id, collect());

            $assigned = $gradeContribs
                ->filter(function ($row) use ($index) {
                    if ($index === 0) {
                        return true;
                    }
                    return (bool) optional($row->contribution)->mandatory === true;
                })
                ->map(function ($row) {
                    $amount = (float) ($row->total_amount ?? optional($row->contribution)->amount ?? 0);
                    return [
                        'id' => $row->contribution_id,
                        'name' => optional($row->contribution)->contribution_type
                            ?? $row->contribution_type
                            ?? 'Contribution',
                        'amount' => $amount,
                        'mandatory' => (bool) optional($row->contribution)->mandatory,
                    ];
                })
                ->values();

            $carryOver = (float) ($student->balance ?? 0);
            $contributionBalance = (float) ($student->contribution_balance ?? 0);
            $currentYearBill = $contributionBalance;
            if ($currentYearBill <= 0 && $assigned->isNotEmpty()) {
                $currentYearBill = (float) $assigned->sum('amount');
            }
            $combinedBill = $carryOver + $currentYearBill;

            $studentAllPayments = $paymentsByStudent->get($student->id, collect());
            $totalPaidAllTime = $studentAllPayments
                ->sum(fn ($p) => (float) $p->amount_paid);
            $currentYearPaid = $yearPayments->where('student_id', $student->id)
                ->sum(fn ($p) => (float) $p->amount_paid);
            $outstandingAllYears = max(0, $combinedBill - $totalPaidAllTime);

            $paymentHistoryAll = $studentAllPayments
                ->map(function ($payment) use ($schoolYearNameMap, $timezone) {
                    $source = $payment->created_at ?? $payment->payment_date;
                    if ($source instanceof Carbon) {
                        $dateValue = $source->timezone($timezone)->toIso8601String();
                    } elseif ($source) {
                        $dateValue = Carbon::parse($source)->timezone($timezone)->toIso8601String();
                    } else {
                        $dateValue = null;
                    }
                    return [
                        'id' => $payment->id,
                        'amount' => (float) $payment->amount_paid,
                        'payment_date' => $dateValue,
                        'contribution' => optional($payment->contribution)->contribution_type,
                        'school_year_id' => $payment->school_year_id,
                        'school_year_name' => $schoolYearNameMap->get($payment->school_year_id) ?? '—',
                    ];
                })
                ->values()
                ->all();

            $studentsForCard->push([
                'id' => $student->id,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'grade' => optional($student->gradeLevel)->name,
                'section' => optional($student->section)->name,
                'balance' => $carryOver,
                'contribution_balance' => $contributionBalance,
                'total_paid' => $totalPaidAllTime,
                'current_year_paid' => $currentYearPaid,
                'carry_over_balance' => $carryOver,
                'current_year_charges' => $currentYearBill,
                'total_bill' => $combinedBill,
                'outstanding_all_years' => $outstandingAllYears,
                'remaining_balance' => $outstandingAllYears,
                'assigned_contributions' => $assigned,
                'payment_history' => $paymentHistoryAll,
            ]);
        });

        // Add students with payments but missing year-specific Student row
        $paymentStudentIds = $yearPayments->pluck('student_id')->unique();
        foreach ($paymentStudentIds as $sid) {
            if ($studentsForCard->contains(fn ($s) => (int) $s['id'] === (int) $sid)) {
                continue;
            }

            $base = Student::with(['gradeLevel', 'section'])->find($sid);
            if (!$base) {
                continue;
            }

            $studentAllPayments = $paymentsByStudent->get($sid, collect());
            $totalPaidAllTime = $studentAllPayments
                ->sum(fn ($p) => (float) $p->amount_paid);
            $currentYearPaid = $yearPayments->where('student_id', $sid)
                ->sum(fn ($p) => (float) $p->amount_paid);

            $gradeLevelId = (int) ($base->grade_level_id ?? 0);
            $assigned = $yearContribs->get($gradeLevelId, collect())
                ->map(function ($row) {
                    $amount = (float) ($row->total_amount ?? optional($row->contribution)->amount ?? 0);
                    return [
                        'id' => $row->contribution_id,
                        'name' => optional($row->contribution)->contribution_type
                            ?? $row->contribution_type
                            ?? 'Contribution',
                        'amount' => $amount,
                        'mandatory' => (bool) optional($row->contribution)->mandatory,
                    ];
                })
                ->values();

            $carryOver = (float) ($base->balance ?? 0);
            $contributionBalance = (float) ($base->contribution_balance ?? 0);
            $currentYearBill = $contributionBalance;
            if ($currentYearBill <= 0 && $assigned->isNotEmpty()) {
                $currentYearBill = (float) $assigned->sum('amount');
            }
            $combinedBill = $carryOver + $currentYearBill;
            $outstandingAllYears = max(0, $combinedBill - $totalPaidAllTime);

            $paymentHistoryAll = $studentAllPayments
                ->map(function ($payment) use ($schoolYearNameMap, $timezone) {
                    $source = $payment->created_at ?? $payment->payment_date;
                    if ($source instanceof Carbon) {
                        $dateValue = $source->timezone($timezone)->toIso8601String();
                    } elseif ($source) {
                        $dateValue = Carbon::parse($source)->timezone($timezone)->toIso8601String();
                    } else {
                        $dateValue = null;
                    }
                    return [
                        'id' => $payment->id,
                        'amount' => (float) $payment->amount_paid,
                        'payment_date' => $dateValue,
                        'contribution' => optional($payment->contribution)->contribution_type,
                        'school_year_id' => $payment->school_year_id,
                        'school_year_name' => $schoolYearNameMap->get($payment->school_year_id) ?? '—',
                    ];
                })
                ->values()
                ->all();

            $studentsForCard->push([
                'id' => $sid,
                'first_name' => $base->first_name,
                'last_name' => $base->last_name,
                'grade' => optional($base->gradeLevel)->name,
                'section' => optional($base->section)->name,
                'balance' => $carryOver,
                'contribution_balance' => $contributionBalance,
                'total_paid' => $totalPaidAllTime,
                'current_year_paid' => $currentYearPaid,
                'carry_over_balance' => $carryOver,
                'current_year_charges' => $currentYearBill,
                'total_bill' => $combinedBill,
                'outstanding_all_years' => $outstandingAllYears,
                'remaining_balance' => $outstandingAllYears,
                'assigned_contributions' => $assigned,
                'payment_history' => $paymentHistoryAll,
            ]);
        }

        $studentsForCard = $studentsForCard
            ->unique(function ($student) {
                $first = strtolower(trim($student['first_name'] ?? ''));
                $last = strtolower(trim($student['last_name'] ?? ''));
                $year = strtolower(trim($student['yearName'] ?? ''));
                return $year . '|' . $first . '|' . $last;
            })
            ->values();

        $schoolYearCards[] = [
            'id' => $sy->id,
            'name' => $sy->name,
            'is_active' => $schoolYear && $sy->id === $schoolYear->id,
            'students' => $studentsForCard,
        ];
    }

    $schoolYearCards = collect($schoolYearCards)->values()->all();

    return $this->renderWithNotifications('Guardian/MyStudents', [
        'guardian' => $guardian,
        'students' => $students,
        'payments' => $payments,
        'schoolYearContributions' => $schoolYearContributions,
        'contributions' => $contributions,
        'previousGrade7' => $previousGrade7,
        'schoolYear' => $schoolYear,
        'schoolYearCards' => $schoolYearCards,
        'appTimezone' => $timezone,
    ]);
}

public function contributions()
{
    $user = Auth::guard('guardian')->user();
    $guardian = Guardian::where('user_id', $user->id)->first();

    if (!$guardian) {
        return $this->renderWithNotifications('Guardian/Contributions', [
            'students' => [],
            'payments' => [],
            'schoolYearContributions' => [],
        ]);
    }

    $schoolYear = SchoolYear::latest()->first();

    if (!$schoolYear) {
        return $this->renderWithNotifications('Guardian/Contributions', [
            'guardian' => $guardian,
            'students' => [],
            'payments' => [],
            'schoolYearContributions' => [],
        ]);
    }

    // Get all students of this guardian, sorted by registration (ID)
    $students = $guardian->students()->with(['gradeLevel', 'section'])->orderBy('id')->get();

    // Get all payments for these students
    $payments = Payment::whereIn('student_id', $students->pluck('id'))->get();

    // Get all contributions assigned for the active school year
    $schoolYearContributions = SchoolYearContribution::with('contribution')
        ->where('school_year_id', $schoolYear->id)
        ->get();

    // Apply sibling logic and attach assigned contributions
    $students = $students->map(function ($student) use ($students, $schoolYearContributions, $payments) {
        $index = $students->search(fn($s) => $s->id === $student->id);

        $assignedContributions = $schoolYearContributions->filter(function ($c) use ($student, $index) {
            if ($c->grade_level_id !== $student->grade_level_id) return false;

            // Sibling logic: first student pays all, others pay only mandatory
            if ($index === 0) return true;
            return $c->contribution->mandatory ?? false;
        })->map(function($c) {
            // Ensure contribution object exists and has a name
            $c->contribution = $c->contribution ?? (object)[
                'name' => $c->contribution_type ?? 'Unnamed Contribution',
                'amount' => $c->contribution->amount ?? 0,
                'mandatory' => $c->contribution->mandatory ?? false,
            ];

            // Map DB column contribution_type to name
            $c->contribution->name = $c->contribution_type ?? $c->contribution->name;

            return $c;
        })->values();

        $totalPaid = $payments->where('student_id', $student->id)
            ->sum(fn($p) => floatval($p->amount_paid));

        $totalAmount = $assignedContributions->sum(fn($c) => floatval($c->amount ?? $c->contribution->amount ?? 0));

        $student->assigned_contributions = $assignedContributions;
        $student->total_paid = $totalPaid;
        $student->total_contribution = $totalAmount;
        $student->balance = max(0, $totalAmount - $totalPaid);

        return $student;
    });

    // Build cards for all school years (active and inactive) for this guardian
    $schoolYearCards = [];
    $guardianStudentIds = \App\Models\Student::where('guardian_id', $guardian->id)->pluck('id');
    $syIdsFromStudents = \App\Models\Student::where('guardian_id', $guardian->id)
        ->distinct()->pluck('school_year_id');
    $syIdsFromPayments = Payment::whereIn('student_id', $guardianStudentIds)
        ->distinct()->pluck('school_year_id');
    $syIds = $syIdsFromStudents->merge($syIdsFromPayments)->unique()->values();

    $allSchoolYears = SchoolYear::whereIn('id', $syIds)
        ->orderBy('start_date', 'desc')
        ->orderBy('id', 'desc')
        ->get();

    foreach ($allSchoolYears as $sy) {
        $yearStudents = \App\Models\Student::with(['gradeLevel','section'])
            ->where('guardian_id', $guardian->id)
            ->where('school_year_id', $sy->id)
            ->orderBy('id')
            ->get();

        $yearPayments = Payment::whereIn('student_id', $guardianStudentIds)
            ->where('school_year_id', $sy->id)
            ->get();

        $yearContribs = SchoolYearContribution::with('contribution')
            ->where('school_year_id', $sy->id)
            ->get();

        $cardStudents = [];

        // Map existing year students
        foreach ($yearStudents as $idx => $s) {
            $assigned = $yearContribs->filter(fn($c) => (int)$c->grade_level_id === (int)$s->grade_level_id);
            if ($idx > 0) {
                $assigned = $assigned->filter(fn($c) => (bool)optional($c->contribution)->mandatory === true);
            }
            // Normalize contribution object
            $assigned = $assigned->map(function($c){
                $c->contribution = $c->contribution ?? (object)[];
                $c->contribution->contribution_type = $c->contribution->contribution_type ?? ($c->contribution_type ?? 'Unnamed Contribution');
                $c->contribution->amount = $c->contribution->amount ?? ($c->amount ?? 0);
                return $c;
            })->values();

            $totalAmount = $assigned->sum(fn($c) => (float)($c->amount ?? optional($c->contribution)->amount ?? 0));
            $totalPaid = $yearPayments->where('student_id', $s->id)->sum(fn($p) => (float)$p->amount_paid);
            $balance = max(0, $totalAmount - $totalPaid);

            $cardStudents[] = [
                'id' => $s->id,
                'first_name' => $s->first_name,
                'last_name' => $s->last_name,
                'grade' => optional($s->gradeLevel)->name,
                'section' => optional($s->section)->name,
                'assigned_contributions' => $assigned->values(),
                'total_paid' => $totalPaid,
                'total_contribution' => $totalAmount,
                'balance' => $balance,
            ];
        }

        // Add students with payments but missing year-specific row
        $paymentStudentIds = $yearPayments->pluck('student_id')->unique();
        foreach ($paymentStudentIds as $sid) {
            if (collect($cardStudents)->contains(fn($x) => (int) $x['id'] === (int) $sid)) continue;
            $base = \App\Models\Student::with(['gradeLevel','section'])->find($sid);
            if (!$base) continue;

            $paidContribIds = $yearPayments->where('student_id', $sid)->pluck('contribution_id')->filter();
            $matchedContribs = $yearContribs->whereIn('contribution_id', $paidContribIds->all());
            $gradeLevelId = $matchedContribs->count() ? (int)$matchedContribs->first()->grade_level_id : ($base->grade_level_id ?? null);
            $assigned = $yearContribs->filter(fn($c) => (int)$c->grade_level_id === (int)$gradeLevelId);

            // Determine sibling index among this year's students
            $index = 0;
            if ($yearStudents->isNotEmpty()) {
                $pos = $yearStudents->search(fn($x) => $x->id === $sid);
                $index = $pos === false ? 0 : $pos;
            }
            if ($index > 0) {
                $assigned = $assigned->filter(fn($c) => (bool)optional($c->contribution)->mandatory === true);
            }

            $assigned = $assigned->map(function($c){
                $c->contribution = $c->contribution ?? (object)[];
                $c->contribution->contribution_type = $c->contribution->contribution_type ?? ($c->contribution_type ?? 'Unnamed Contribution');
                $c->contribution->amount = $c->contribution->amount ?? ($c->amount ?? 0);
                return $c;
            })->values();

            $totalAmount = $assigned->sum(fn($c) => (float)($c->amount ?? optional($c->contribution)->amount ?? 0));
            $totalPaid = $yearPayments->where('student_id', $sid)->sum(fn($p) => (float)$p->amount_paid);
            $balance = max(0, $totalAmount - $totalPaid);

            $cardStudents[] = [
                'id' => $sid,
                'first_name' => $base->first_name,
                'last_name' => $base->last_name,
                'grade' => optional(\App\Models\GradeLevel::find($gradeLevelId))->name ?? optional($base->gradeLevel)->name,
                'section' => optional($base->section)->name,
                'assigned_contributions' => $assigned->values(),
                'total_paid' => $totalPaid,
                'total_contribution' => $totalAmount,
                'balance' => $balance,
            ];
        }

        $cardStudents = collect($cardStudents)
            ->unique(function ($student) {
                $first = strtolower(trim($student['first_name'] ?? ''));
                $last = strtolower(trim($student['last_name'] ?? ''));
                return $first . '|' . $last;
            })
            ->values()
            ->all();

        $schoolYearCards[] = [
            'id' => $sy->id,
            'name' => $sy->name,
            'is_active' => $sy->id === $schoolYear->id,
            'students' => $cardStudents,
        ];
    }

    return $this->renderWithNotifications('Guardian/Contributions', [
        'guardian' => $guardian,
        'students' => $students,
        'payments' => $payments,
        'schoolYearContributions' => $schoolYearContributions,
    ]);
}

public function reports(Request $request)
{
    $timezone = config('app.timezone', 'UTC');

    $range = $this->resolveGuardianReportRange($request, $timezone);
    $rangeStart = $range['start'];
    $rangeEnd = $range['end'];
    $resolvedFilters = $range['filters'];

    $analyticsYear = (int) ($resolvedFilters['year'] ?? $rangeStart->format('Y'));

    $paymentsByMonth = Payment::selectRaw('MONTH(payment_date) as month, SUM(amount_paid) as total')
        ->whereYear('payment_date', $analyticsYear)
        ->groupBy('month')
        ->pluck('total', 'month')
        ->toArray();

    $donationsByMonth = Donation::selectRaw('MONTH(donation_date) as month, SUM(donation_amount) as total')
        ->where('donation_type', 'cash')
        ->whereYear('donation_date', $analyticsYear)
        ->groupBy('month')
        ->pluck('total', 'month')
        ->toArray();

    $expensesByMonth = Expense::selectRaw('MONTH(expense_date) as month, SUM(amount) as total')
        ->whereYear('expense_date', $analyticsYear)
        ->groupBy('month')
        ->pluck('total', 'month')
        ->toArray();

    $monthlyCollected = [];
    $monthlyExpenses = [];
    $monthlyAvailable = [];

    for ($m = 1; $m <= 12; $m++) {
        $payments = $paymentsByMonth[$m] ?? 0;
        $donations = $donationsByMonth[$m] ?? 0;
        $monthlyCollected[$m - 1] = $payments + $donations;
        $monthlyExpenses[$m - 1] = $expensesByMonth[$m] ?? 0;
        $monthlyAvailable[$m - 1] = $monthlyCollected[$m - 1] - $monthlyExpenses[$m - 1];
    }

    $rangeStartDate = $rangeStart->copy()->startOfDay();
    $rangeEndDate = $rangeEnd->copy()->endOfDay();

    $paymentsCollection = Payment::with(['student', 'contribution'])
        ->whereBetween('payment_date', [$rangeStartDate->toDateString(), $rangeEndDate->toDateString()])
        ->orderByDesc('payment_date')
        ->get();

    $paymentsTotalInRange = (float) $paymentsCollection->sum('amount_paid');

    $payments = $paymentsCollection->map(function ($payment) use ($timezone) {
        $primarySource = $payment->created_at ?? $payment->payment_date;
        $fallbackSource = $payment->payment_date ?? $payment->created_at;
        $dateSource = $primarySource ?: $fallbackSource;
        $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;
        return [
            'id' => $payment->id,
            'student_name' => optional($payment->student)
                ? trim($payment->student->first_name . ' ' . $payment->student->last_name)
                : '—',
            'contribution_name' => optional($payment->contribution)->contribution_type ?? 'N/A',
            'amount_paid' => (float) $payment->amount_paid,
            'payment_date' => $date ? $date->toIso8601String() : null,
        ];
    })->values();

    $donationsCollection = Donation::select(
        'id',
        'donated_by',
        'donation_type',
        'donation_amount',
        'donation_description',
        'received_by',
        'donation_date',
        'donation_quantity',
        'usable_quantity',
        'damaged_quantity',
        'unusable_quantity',
        'item_type',
        'usage_status',
        'usage_notes',
        'created_at'
    )
        ->whereBetween('donation_date', [$rangeStartDate->toDateString(), $rangeEndDate->toDateString()])
        ->orderByDesc('donation_date')
        ->get();

    $cashDonationsTotalInRange = (float) $donationsCollection
        ->filter(function ($donation) {
            return strcasecmp($donation->donation_type ?? '', 'in-kind') !== 0;
        })
        ->sum('donation_amount');

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

    $donations = $donationsCollection->map(function ($donation) use ($timezone, $usageByDonation) {
        $primarySource = $donation->created_at ?? $donation->donation_date;
        $fallbackSource = $donation->donation_date ?? $donation->created_at;
        $dateSource = $primarySource ?: $fallbackSource;
        $date = $dateSource ? Carbon::parse($dateSource)->timezone($timezone) : null;

        $donated = (float) ($donation->donation_quantity ?? 0);
        $used = (float) ($usageByDonation[$donation->id] ?? 0);
        $damaged = (float) ($donation->damaged_quantity ?? 0);
        $unusable = (float) ($donation->unusable_quantity ?? 0);
        $remaining = max($donated - $used - $damaged - $unusable, 0);

        return [
            'id' => $donation->id,
            'donated_by' => $donation->donated_by,
            'donation_type' => $donation->donation_type,
            'donation_amount' => (float) $donation->donation_amount,
            'donation_description' => $donation->donation_description,
            'received_by' => $donation->received_by,
            'donation_date' => $donation->donation_date,
            'donation_timestamp' => $date ? $date->toIso8601String() : null,
            'donation_quantity' => $donation->donation_quantity,
            'usable_quantity' => $donation->usable_quantity ?? round($remaining, 2),
            'damaged_quantity' => $donation->damaged_quantity,
            'unusable_quantity' => $donation->unusable_quantity,
            'item_type' => $donation->item_type,
            'usage_status' => $donation->usage_status,
            'usage_notes' => $donation->usage_notes,
            'used_quantity' => round($used, 2),
        ];
    })->values();

    $expenseTotalInRange = (float) Expense::whereBetween('expense_date', [$rangeStartDate->toDateString(), $rangeEndDate->toDateString()])
        ->sum('amount');

    $fundsHistoriesCollection = FundHistory::with(['donation', 'expense', 'payment.student'])
        ->where(function ($query) {
            $query->whereHas('donation')
                ->orWhereNotNull('payment_id')
                ->orWhereNotNull('expense_id');
        })
        ->whereBetween('fund_date', [$rangeStartDate->toDateString(), $rangeEndDate->toDateString()])
        ->orderBy('fund_date')
        ->orderBy('id')
        ->get();

    if ($fundsHistoriesCollection->isNotEmpty()) {
        $fundsHistories = $fundsHistoriesCollection->map(function ($history) use ($timezone) {
            $student = optional($history->payment)->student;
            $studentName = $student
                ? trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? ''))
                : null;

            $timestampSource = null;
            if ($history->payment) {
                $timestampSource = $history->payment->created_at ?? $history->payment->payment_date;
            } elseif ($history->donation) {
                $timestampSource = $history->donation->created_at ?? $history->donation->donation_date;
            } elseif ($history->expense) {
                $timestampSource = $history->expense->created_at ?? $history->expense->expense_date;
            }
            if (!$timestampSource) {
                $timestampSource = $history->created_at ?? $history->fund_date;
            }

            $fundDate = $timestampSource
                ? Carbon::parse($timestampSource)->timezone($timezone)
                : null;

            return [
                'id' => $history->id,
                'fund_date' => $history->fund_date,
                'fund_timestamp' => $fundDate ? $fundDate->toIso8601String() : null,
                'amount' => (float) $history->amount,
                'fund_description' => $history->fund_description,
                'balance_before' => (float) $history->balance_before,
                'balance_after' => (float) $history->balance_after,
                'payment_id' => $history->payment_id,
                'donation_id' => $history->donation_id,
                'donation_type' => optional($history->donation)->donation_type,
                'donated_by' => optional($history->donation)->donated_by,
                'expense_id' => $history->expense_id,
                'expense_type' => optional($history->expense)->expense_type,
                'student_name' => $studentName,
            ];
        })->values();
    } else {
        $hasFundHistoryData = FundHistory::query()->exists();
        $fundsHistories = $hasFundHistoryData
            ? collect()
            : collect($this->buildFallbackFundHistories());
    }

    $totalCollected = $paymentsTotalInRange + $cashDonationsTotalInRange;
    $totalExpenses = $expenseTotalInRange;
    $totalAvailable = $totalCollected - $totalExpenses;

    return $this->renderWithNotifications('Guardian/Report', [
        'reports' => [
            'totalCollected' => $totalCollected,
            'totalExpenses' => $totalExpenses,
            'totalAvailable' => $totalAvailable,
            'monthlyCollected' => $monthlyCollected,
            'monthlyExpenses' => $monthlyExpenses,
            'monthlyAvailable' => $monthlyAvailable,
        ],
        'payments' => $payments,
        'donations' => $donations,
        'fundsHistories' => $fundsHistories,
        'reportFilters' => $resolvedFilters,
    ]);
}

private function resolveGuardianReportRange(Request $request, string $timezone): array
{
    $now = Carbon::now($timezone);
    $rawType = strtolower(str_replace(['-', ' '], '_', $request->input('filter_type', 'month')));
    $type = in_array($rawType, ['month', 'year', 'date_range'], true) ? $rawType : 'month';

    $start = $now->copy()->startOfMonth();
    $end = $now->copy()->endOfMonth();
    $resolvedType = 'month';
    $resolvedMonth = $start->format('Y-m');
    $resolvedYear = $start->format('Y');

    if ($type === 'year') {
        $year = (int) ($request->input('filter_year') ?: $now->year);
        if ($year < 2000 || $year > 2100) {
            $year = (int) $now->year;
        }

        $start = Carbon::create($year, 1, 1, 0, 0, 0, $timezone)->startOfYear();
        $end = $start->copy()->endOfYear();
        $resolvedType = 'year';
        $resolvedYear = (string) $year;
        $resolvedMonth = sprintf('%04d-01', $year);
    } elseif ($type === 'date_range') {
        $startInput = $request->input('filter_start');
        $endInput = $request->input('filter_end');

        if ($startInput || $endInput) {
            try {
                $start = $startInput
                    ? Carbon::parse($startInput, $timezone)->startOfDay()
                    : Carbon::parse($endInput, $timezone)->copy()->startOfDay();
            } catch (\Exception $e) {
                $start = $now->copy()->startOfMonth();
            }

            try {
                $end = $endInput
                    ? Carbon::parse($endInput, $timezone)->endOfDay()
                    : $start->copy()->endOfDay();
            } catch (\Exception $e) {
                $end = $start->copy()->endOfMonth();
            }

            if ($start->greaterThan($end)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }

            $resolvedType = 'dateRange';
            $resolvedMonth = $start->format('Y-m');
            $resolvedYear = $start->format('Y');
        }
    } else {
        $monthInput = $request->input('filter_month');
        if ($monthInput && preg_match('/^\d{4}-\d{2}$/', $monthInput)) {
            [$year, $month] = array_map('intval', explode('-', $monthInput));
            $reference = Carbon::create($year, max(1, min(12, $month)), 1, 0, 0, 0, $timezone);
        } else {
            $reference = $now->copy();
        }

        $start = $reference->copy()->startOfMonth();
        $end = $reference->copy()->endOfMonth();
        $resolvedType = 'month';
        $resolvedMonth = $start->format('Y-m');
        $resolvedYear = $start->format('Y');
    }

    return [
        'start' => $start->copy()->startOfDay(),
        'end' => $end->copy()->endOfDay(),
        'filters' => [
            'type' => $resolvedType,
            'month' => $resolvedMonth,
            'year' => $resolvedYear,
            'start' => $start->copy()->startOfDay()->toDateString(),
            'end' => $end->copy()->endOfDay()->toDateString(),
        ],
    ];
}

private function buildLinkedStudentIdsMap(Guardian $guardian, $students)
{
    if ($students->isEmpty()) {
        return collect();
    }

    $allStudentsLite = Student::select('id', 'lrn', 'first_name', 'last_name', 'guardian_id')
        ->where('guardian_id', $guardian->id)
        ->get();

    $groupedIds = [];
    foreach ($allStudentsLite as $record) {
        $key = $this->buildStudentMergeKey($record);
        if (!isset($groupedIds[$key])) {
            $groupedIds[$key] = [];
        }
        $groupedIds[$key][] = $record->id;
    }

    return $students->mapWithKeys(function ($student) use ($groupedIds) {
        $key = $this->buildStudentMergeKey($student);
        $linkedIds = collect($groupedIds[$key] ?? [$student->id])->unique()->values();
        return [$student->id => $linkedIds];
    });
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

private function renderWithNotifications(string $component, array $props = [])
{
    $notifications = $this->getGuardianNotifications();

    $props = array_merge([
        'notifications' => $notifications,
    ], $props);

    if (!array_key_exists('announcements', $props)) {
        $props['announcements'] = $notifications;
    }

    return Inertia::render($component, $props);
}

private function buildFallbackFundHistories(): array
{
    $payments = Payment::with('student')
        ->select('id', 'amount_paid', 'payment_date', 'student_id', 'created_at')
        ->get()
        ->map(function (Payment $payment) {
            $date = $payment->payment_date
                ? Carbon::parse($payment->payment_date)
                : Carbon::parse($payment->created_at ?? now());

            $student = $payment->student;
            $studentName = $student
                ? trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? ''))
                : null;

            return [
                'key' => 'payment-' . $payment->id,
                'type' => 'payment',
                'amount' => (float) $payment->amount_paid,
                'date' => $date,
                'student_name' => $studentName,
                'student_id' => $payment->student_id,
                'model_id' => $payment->id,
            ];
        });

    $donations = Donation::select(
        'id',
        'donation_amount',
        'donation_date',
        'donated_by',
        'donation_type',
        'donation_description',
        'created_at'
    )->get()->map(function (Donation $donation) {
        $date = $donation->donation_date
            ? Carbon::parse($donation->donation_date)
            : Carbon::parse($donation->created_at ?? now());

        return [
            'key' => 'donation-' . $donation->id,
            'type' => 'donation',
            'amount' => (float) $donation->donation_amount,
            'date' => $date,
            'donation_type' => strtolower($donation->donation_type ?? ''),
            'donated_by' => $donation->donated_by,
            'donation_description' => $donation->donation_description,
            'model_id' => $donation->id,
        ];
    });

    $expenses = Expense::select(
        'id',
        'amount',
        'expense_date',
        'expense_type',
        'description',
        'created_at'
    )->get()->map(function (Expense $expense) {
        $date = $expense->expense_date
            ? Carbon::parse($expense->expense_date)
            : Carbon::parse($expense->created_at ?? now());

        return [
            'key' => 'expense-' . $expense->id,
            'type' => 'expense',
            'amount' => (float) $expense->amount,
            'date' => $date,
            'expense_type' => $expense->expense_type,
            'description' => $expense->description,
            'model_id' => $expense->id,
        ];
    });

    $combined = $payments
        ->concat($donations)
        ->concat($expenses)
        ->sortBy(function ($entry) {
            return $entry['date']->format('Y-m-d H:i:s') . $entry['key'];
        })
        ->values();

    $balance = 0;
    $histories = [];

    foreach ($combined as $entry) {
        $before = $balance;

        switch ($entry['type']) {
            case 'payment':
                $balance += $entry['amount'];
                break;
            case 'donation':
                if (($entry['donation_type'] ?? '') !== 'in-kind') {
                    $balance += $entry['amount'];
                }
                break;
            case 'expense':
                $balance -= $entry['amount'];
                break;
        }

        $after = $balance;

        $histories[] = [
            'id' => $entry['key'],
            'fund_date' => $entry['date']->format('Y-m-d'),
            'amount' => $entry['amount'],
            'fund_description' => match ($entry['type']) {
                'payment' => 'Payment by Student ID: ' . ($entry['student_id'] ?? 'N/A'),
                'donation' => 'Donation from ' . ($entry['donated_by'] ?? 'Unknown Donor'),
                'expense' => 'Expense: ' . ($entry['expense_type'] ?? 'General'),
            },
            'balance_before' => $before,
            'balance_after' => $after,
            'payment_id' => $entry['type'] === 'payment' ? $entry['model_id'] : null,
            'donation_id' => $entry['type'] === 'donation' ? $entry['model_id'] : null,
            'donation_type' => $entry['type'] === 'donation' ? $entry['donation_type'] : null,
            'donated_by' => $entry['type'] === 'donation' ? $entry['donated_by'] : null,
            'expense_id' => $entry['type'] === 'expense' ? $entry['model_id'] : null,
            'expense_type' => $entry['type'] === 'expense' ? $entry['expense_type'] : null,
            'student_name' => $entry['type'] === 'payment'
                ? ($entry['student_name'] ?? null)
                : null,
        ];
    }

    return $histories;
}

private function getGuardianNotifications()
{
    $notifications = Announcement::whereIn('type', ['guardian', 'general', 'urgent'])
        ->with('user:id,first_name,last_name')
        ->orderByDesc('announcement_date')
        ->orderByDesc('created_at')
        ->get()
        ->map(function (Announcement $announcement) {
            $postedBy = null;
            if ($announcement->relationLoaded('user') && $announcement->user) {
                $postedBy = trim($announcement->user->first_name . ' ' . $announcement->user->last_name);
            }

            return [
                'id' => $announcement->id,
                'title' => $announcement->title,
                'message' => $announcement->message,
                'announcement_date' => $announcement->announcement_date,
                'type' => $announcement->type,
                'posted_by' => $postedBy,
                'created_at' => $announcement->created_at,
            ];
        });
    return $notifications;
}

}
