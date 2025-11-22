<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\Announcement;
use App\Models\AssignSchoolContribution;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\Donation;
use App\Models\SchoolYear;
use App\Models\SchoolYearContribution;
use App\Models\FundHistory;
use App\Models\Contribution;
use App\Models\GradeLevel;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Services\EasySendSMSService;
use Illuminate\Support\Str;
use App\Mail\NewUserCreated;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\StudentsImport;
use Carbon\Carbon;

class AdminController extends Controller
{
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

    // ==================== LOGIN / DASHBOARD ====================

    public function showLogin()
    {
        return Inertia::render('Admin/AdminLogin');
    }

    public function dashboard()
    {
        return Inertia::render('Admin/Dashboard');
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|confirmed|min:6',
        ]);

        $user = auth()->user();

        if ($user->role !== 'admin') {
            return back()->with('error', 'Only the admin can change this password.');
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return back()->with('error', 'Current password is incorrect.');
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return back()->with('success', 'Password updated successfully.');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', $credentials['username'])
            ->where('role', 'admin')
            ->where('status', 'active')
            ->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return back()
                ->withErrors(['username' => 'Invalid credentials'])
                ->withInput();
        }

        Auth::guard('admin')->login($user);
        $request->session()->regenerate();

        return redirect()->route('admin.dashboard');
    }

   public function dashboardData(Request $request)
{
    $adminGuard = Auth::guard('admin');

    if (!$adminGuard->check()) {
        return redirect()->route('admin.login');
    }

    $adminUser = $adminGuard->user();

    // Total Students & Guardians
    $totalStudents = Student::count();
    $totalGuardians = Guardian::count();

    // Totals sourced directly from canonical tables
    // Payments: all recorded cash payments
    $totalPayments = Payment::sum('amount_paid');

    // Donations: include CASH only (exclude in-kind from collected funds)
    $totalCashDonations = Donation::where('donation_type', 'cash')->sum('donation_amount');

    // Expenses: sum of all expense amounts
    $totalExpenses = Expense::sum('amount');

    // Funds collected = payments + cash donations
    $totalFundsCollected = $totalPayments + $totalCashDonations;
    $availableFunds = $totalFundsCollected - $totalExpenses;

    // Latest Announcements (take 5)
    $latestAnnouncements = Announcement::with('user:id,first_name,last_name,role')
        ->latest()
        ->take(5)
        ->get()
        ->map(fn($a) => [
            'id' => $a->id,
            'title' => $a->title,
            'announcement_date' => $a->announcement_date,
            'posted_by' => $a->user ? $a->user->first_name . ' ' . $a->user->last_name : 'N/A'
        ]);

    // Recent Payments (paginated by 10)
    $recentPayments = DB::table('payments')
        ->join('students', 'payments.student_id', '=', 'students.id')
        ->select(
            'payments.id',
            'students.first_name',
            'students.last_name',
            'payments.amount_paid',
            'payments.payment_date'
        )
        ->orderByDesc('payments.payment_date')
        ->paginate(10, ['*'], 'recentPaymentsPage')
        ->through(fn($p) => [
            'id' => $p->id,
            'student_name' => trim($p->first_name . ' ' . $p->last_name),
            'amount' => $p->amount_paid,
            'contributed_date' => $p->payment_date,
        ]);

    // Pending Expenses (take 5)
    $pendingExpenses = Expense::latest()
        ->take(5)
        ->get()
        ->map(fn($e) => [
            'id' => $e->id,
            'description' => $e->description,
            'received_by' => $e->received_by ?? 'N/A',
            'status' => $e->status ?? 'pending',
        ]);

    // Return to Inertia
    return Inertia::render('Admin/Dashboard', [
        'totalStudents' => $totalStudents,
        'totalGuardians' => $totalGuardians,
        'totalFundsCollected' => $totalFundsCollected,
        'totalExpenses' => $totalExpenses,
        'availableFunds' => $availableFunds,
        'latestAnnouncements' => $latestAnnouncements,
        'recentPayments' => $recentPayments,
        'pendingExpenses' => $pendingExpenses,
        'userRole' => $adminUser->role,
    ]);
}
    

    public function logout(Request $request)
    {
        Auth::guard('admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('admin.login')->with('success', 'You have been logged out.');
    }

    // ==================== REGISTRATION ====================
    public function showRegister()
    {
        return Inertia::render('Admin/AdminRegister');
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'username' => 'required|string|unique:users',
            'password' => 'required|confirmed|min:6',
        ]);

        $validated['password'] = bcrypt($validated['password']);
        $validated['role'] = 'admin';

        User::create($validated);

        return redirect('/admin/login')->with('success', 'Registration successful! Please login.');
    }

    // ==================== USERS ====================
    public function index()
    {
        $users = User::all();
        return Inertia::render('Admin/ManageUsers', ['users' => $users]);
    }


public function store(Request $request)
{
    $request->validate([
        'first_name' => 'required|string|max:255',
        'last_name' => 'required|string|max:255',
        'username' => 'required|string|max:255|unique:users,username',
        'role' => 'required|string|in:admin,treasurer,auditor,guardian',
        'email' => 'required|email|unique:users,email',
    ]);

    $password = Str::random(8);

    $user = User::create([
        'first_name' => $request->first_name,
        'last_name' => $request->last_name,
        'username' => $request->username,
        'password' => Hash::make($password),
        'role' => $request->role,
        'status' => 'active',
        'archived' => 1,
        'email' => $request->email,
    ]);

    $loginUrl = match($user->role) {
        'treasurer' => url('/treasurer/login'),
        'auditor' => url('/auditor/login'),
        default => url('/login'),
    };

    try {
        Mail::to($user->email)->send(new NewUserCreated($user, $password, $loginUrl));
    } catch (\Throwable $e) {
        Log::error('Failed to send new user credentials email.', [
            'user_id' => $user->id,
            'email' => $user->email,
            'error' => $e->getMessage(),
        ]);

        $user->delete();

        return back()->withErrors([
            'mail' => 'Unable to send credentials email. Please check the mail configuration and try again.',
        ])->withInput();
    }

    // Flash username and password to session
    return back()->with([
        'success' => 'User created successfully and login credentials sent to email.',
        'username' => $user->username,
        'password' => $password,
        'email' => $user->email,
    ]);
}

    public function toggleStatus($id)
    {
        $user = User::findOrFail($id);

        if ($user->status === 'active') {
            $user->status = 'inactive';
            $user->archived = 0;
        } else {
            $user->status = 'active';
            $user->archived = 1;
        }

        $user->save();

        return back();
    }

    public function archive($id)
    {
        $user = User::findOrFail($id);
        $user->archived = 0;
        $user->status = 'inactive';
        $user->save();
    }

    public function restore($id)
    {
        $user = User::findOrFail($id);
        $user->archived = 1;
        $user->status = 'active';
        $user->save();

        return back();
    }

    // ==================== GUARDIANS ====================
    public function toggleGuardianStatus($id)
    {
        $guardian = Guardian::findOrFail($id);
        if ($guardian->archived == 0) return back();
        $guardian->status = $guardian->status === 'active' ? 'inactive' : 'active';
        $guardian->save();
        return back();
    }

    public function archiveGuardian($id)
    {
        $guardian = Guardian::findOrFail($id);
        $guardian->archived = 0;
        $guardian->save();

        return response()->json([
            'success' => true,
        ]);
    }

    public function restoreGuardian($id)
    {
        $guardian = Guardian::findOrFail($id);
        $guardian->archived = 1;
        $guardian->save();

        return response()->json([
            'success' => true,
        ]);
    }
    protected $smsService;

    public function __construct(EasySendSMSService $smsService)
    {
        $this->smsService = $smsService;
    }

    public function storeGuardian(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:50',
            'middle_name' => 'nullable|string|max:50',
            'last_name' => 'required|string|max:50',
            'contact_number' => 'required|string|digits:11',
            'address' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'email' => [
                'required',
                'email',
                'regex:/^[\w.+-]+@(gmail\.com|yahoo\.com)$/i',
                'max:255',
                'unique:users,email',
            ],
        ]);

        $generatedPassword = Str::random(8);

        DB::beginTransaction();

        try {
            $user = User::create([
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name' => $validated['last_name'],
                'contact_number' => $validated['contact_number'],
                'address' => $validated['address'],
                'username' => $validated['username'],
                'email' => $validated['email'],
                'password' => bcrypt($generatedPassword),
                'role' => 'guardian',
                'status' => 'active',
                'archived' => 1,
            ]);

            $guardian = Guardian::create([
                'user_id' => $user->id,
                'created_by' => auth()->id(),
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name' => $validated['last_name'],
                'contact_number' => $validated['contact_number'],
                'address' => $validated['address'],
                'status' => 'active',
                'archived' => 1,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            \Log::error('Failed to save guardian.', [
                'payload' => $request->all(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to save guardian. Please try again.',
            ], 500);
        }

        $number = preg_replace('/\D/', '', $validated['contact_number']);
        if (str_starts_with($number, '0')) {
            $number = '+63' . substr($number, 1);
        } elseif (!str_starts_with($number, '+')) {
            $number = '+' . $number;
        }

        $loginLink = url('/guardian/login');

        $mailSent = true;
        $mailError = null;

        try {
            Mail::to($validated['email'])->send(new NewUserCreated($user, $generatedPassword, $loginLink));
        } catch (\Throwable $e) {
            $mailSent = false;
            $mailError = $e->getMessage();

            \Log::error('Failed to send guardian credentials email.', [
                'user_id' => $user->id,
                'guardian_id' => $guardian->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        $message = "Hello {$user->first_name}, your account has been created.\n"
            . "Username (email): {$user->username}\n"
            . "Password: {$generatedPassword}\n"
            . "Login here: {$loginLink}";

        $smsSent = true;
        $smsError = null;

        try {
            $response = $this->smsService->sendSMS($number, $message);
            \Log::info("SMS sent to guardian {$user->id}", ['response' => $response]);
        } catch (\Exception $e) {
            $smsSent = false;
            $smsError = $e->getMessage();

            \Log::error("SMS sending failed for guardian {$user->id}: {$e->getMessage()}", [
                'exception' => $e
            ]);
        }

        return response()->json([
            'success' => true,
            'mail_sent' => $mailSent,
            'mail_error' => $mailError,
            'sms_sent' => $smsSent,
            'sms_error' => $smsError,
            'guardian' => [
                'id' => $guardian->id,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'contact_number' => $user->contact_number,
                'address' => $user->address,
                'username' => $user->username,
                'email' => $user->email,
                'password' => $generatedPassword,
            ],
        ]);
    }

    public function updateGuardian(Request $request, $id)
    {
        $guardian = Guardian::with('user')->findOrFail($id);
        $user = $guardian->user;

        $validated = $request->validate([
            'first_name' => 'required|string|max:50',
            'middle_name' => 'nullable|string|max:50',
            'last_name' => 'required|string|max:50',
            'contact_number' => 'required|string|digits:11',
            'address' => 'required|string|max:255',
        ]);

        $guardian->update([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'contact_number' => $validated['contact_number'],
            'address' => $validated['address'],
        ]);

        if ($user) {
            $userColumns = Schema::getColumnListing($user->getTable());

            $user->first_name = $validated['first_name'];
            $user->last_name = $validated['last_name'];

            if (in_array('middle_name', $userColumns, true)) {
                $user->middle_name = $validated['middle_name'] ?? null;
            }

            if (in_array('contact_number', $userColumns, true)) {
                $user->contact_number = $validated['contact_number'];
            }

            if (in_array('address', $userColumns, true)) {
                $user->address = $validated['address'];
            }

            $user->save();
        }

        return response()->json([
            'success' => true,
            'guardian' => $guardian->fresh(['user']),
        ]);
    }

    // ==================== STUDENTS ====================
    public function toggleStudentStatus($id)
    {
        $student = Student::findOrFail($id);
        if ($student->archived == 0) return     back();
        $student->status = $student->status === 'active' ? 'inactive' : 'active';
        $student->save();
        return back();
    }
public function archives()
{
    $archivesData = $this->getArchivesData();

    return Inertia::render('Admin/Archives', [
        'archivesData' => $archivesData
    ]);
}

    public function storeStudent(Request $request)
    {
        $validated = $request->validate([
            'guardian_id'    => 'required|exists:guardians,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'section_id'     => 'nullable|exists:sections,id',
            'school_year_id' => 'required|exists:school_years,id',
            'lrn'            => [
                'required','string',
                Rule::unique('students','lrn')->where(function ($q) use ($request) {
                    return $q->where('school_year_id', (int) $request->input('school_year_id'));
                }),
            ],
            'first_name'     => 'required|string|max:255',
            'middle_name'    => 'nullable|string|max:255',
            'last_name'      => 'required|string|max:255',
        ]);

        $guardianId   = $validated['guardian_id'];
        $gradeLevelId = $validated['grade_level_id'];
        $schoolYearId = $validated['school_year_id'];

        $schoolYearContributions = $this->getOrCreateContributionsForGrade($schoolYearId, $gradeLevelId);

        $guardianStudentsThisYear = Student::where('guardian_id', $guardianId)
            ->where('school_year_id', $schoolYearId)
            ->count();

        $carryOverBalance = 0;

        if ($guardianStudentsThisYear === 0) {
            $existingStudents = Student::where('guardian_id', $guardianId)->get();

            foreach ($existingStudents as $oldStudent) {
                if ($oldStudent->school_year_id != $schoolYearId) {
                    $carryOverBalance += ($oldStudent->balance + $oldStudent->contribution_balance);
                    $oldStudent->update(['contribution_balance' => 0]);
                }
            }
        }

        if ($guardianStudentsThisYear === 0) {
            $newContributionBalance = $schoolYearContributions->sum(
                fn($syc) => $syc->total_amount ?? 0
            );
        } else {
            $newContributionBalance = $schoolYearContributions
                ->filter(fn($syc) => optional($syc->contribution)->mandatory)
                ->sum(fn($syc) => $syc->total_amount ?? 0);
        }

        $validated['balance'] = $carryOverBalance;
        $validated['contribution_balance'] = $newContributionBalance;

        $student = Student::create($validated);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'student' => $student->load(['guardian', 'gradeLevel', 'section', 'schoolYear']),
            ]);
        }

        return redirect()->route('admin.guardians.index')->with(
            'success',
            "Student <strong>{$student->first_name} {$student->last_name}</strong> added successfully. " .
            "Carried Balance: ₱" . number_format($carryOverBalance, 2) . ", " .
            "New Contribution Balance: ₱" . number_format($newContributionBalance, 2)
        );
    }

    public function updateStudent(Request $request, $id)
    {
        $student = Student::findOrFail($id);

        $validated = $request->validate([
            'guardian_id'    => 'required|exists:guardians,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'section_id'     => 'nullable|exists:sections,id',
            'school_year_id' => 'required|exists:school_years,id',
            'lrn'            => [
                'required','string',
                Rule::unique('students', 'lrn')
                    ->ignore($student->id)
                    ->where(function ($q) use ($request) {
                        return $q->where('school_year_id', (int) $request->input('school_year_id'));
                    }),
            ],
            'first_name'     => 'required|string|max:255',
            'middle_name'    => 'nullable|string|max:255',
            'last_name'      => 'required|string|max:255',
        ]);

        if (!array_key_exists('section_id', $validated)) {
            $validated['section_id'] = null;
        }

        $student->update($validated);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'student' => $student->fresh(['guardian', 'gradeLevel', 'section', 'schoolYear']),
            ]);
        }

        return redirect()->route('admin.guardians.index')->with('success', 'Student updated.');
    }

    public function search(Request $request)
    {
        $query = $request->input('q');

        $guardians = Guardian::where('first_name', 'like', "%{$query}%")
            ->orWhere('last_name', 'like', "%{$query}%")
            ->get();

        return response()->json($guardians);
    }

    public function manageGuardians()
    {
        $activeGuardians = Guardian::with('user')
            ->where('archived', 1)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($guardian) => [
                'id' => $guardian->id,
                'first_name' => $guardian->first_name,
                'middle_name' => $guardian->middle_name,
                'last_name' => $guardian->last_name,
                'contact_number' => $guardian->contact_number,
                'address' => $guardian->address,
                'status' => $guardian->status,
                'archived' => $guardian->archived,
                'username' => $guardian->user?->username,
                'email' => $guardian->user?->email,
            ]);

        $archivedGuardians = Guardian::with('user')
            ->where('archived', 0)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($guardian) => [
                'id' => $guardian->id,
                'first_name' => $guardian->first_name,
                'middle_name' => $guardian->middle_name,
                'last_name' => $guardian->last_name,
                'contact_number' => $guardian->contact_number,
                'address' => $guardian->address,
                'status' => $guardian->status,
                'archived' => $guardian->archived,
                'username' => $guardian->user?->username,
                'email' => $guardian->user?->email,
            ]);

        $students = Student::with(['guardian', 'gradeLevel', 'section', 'schoolYear'])->get();
        $gradeLevels = DB::table('grade_levels')->get();
        $sections = DB::table('sections')->get();
        $schoolYears = SchoolYear::all();

        return Inertia::render('Admin/AddGuardian', [
            'guardians' => $activeGuardians,
            'archivedGuardians' => $archivedGuardians,
            'students' => $students,
            'gradeLevels' => $gradeLevels,
            'sections' => $sections,
            'schoolYears' => $schoolYears,
        ]);
    }
    
    public function importedStudents()
    {
        $students = Student::with(['guardian', 'gradeLevel', 'section', 'schoolYear'])->orderByDesc('id')->get();
        $guardians = Guardian::orderBy('last_name')->get();
        $gradeLevels = DB::table('grade_levels')->get();
        $sections = DB::table('sections')->get();
        $schoolYears = SchoolYear::orderByDesc('id')->get();

        return Inertia::render('Admin/ImportedStudents', [
            'students' => $students,
            'guardians' => $guardians,
            'gradeLevels' => $gradeLevels,
            'sections' => $sections,
            'schoolYears' => $schoolYears,
        ]);
    }

    public function importStudents(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:xlsx,csv,txt',
            'school_year_id' => 'required|exists:school_years,id',
        ]);

        $file = $validated['file'];
        $ext = strtolower($file->getClientOriginalExtension());

        if (in_array($ext, ['csv', 'txt'], true)) {
            $path = $file->getRealPath();
            $handle = fopen($path, 'r');
            if ($handle === false) {
                return back()->withErrors(['file' => 'Unable to read uploaded file.']);
            }

            // Read header
            $headers = fgetcsv($handle);
            if (!$headers) {
                fclose($handle);
                return back()->withErrors(['file' => 'CSV has no header row.']);
            }
            $headers = array_map(function ($h) { return strtolower(trim($h)); }, $headers);

            $required = ['lrn','first_name','last_name'];
            foreach ($required as $req) {
                if (!in_array($req, $headers, true)) {
                    fclose($handle);
                    return back()->withErrors(['file' => "CSV missing required column: {$req}"]);
                }
            }

            $rows = [];
            $rowNum = 1;
            while (($row = fgetcsv($handle)) !== false) {
                $rowNum++;
                $data = [];
                foreach ($headers as $i => $key) {
                    $data[$key] = $row[$i] ?? null;
                }

                $lrn = trim((string)($data['lrn'] ?? ''));
                if ($lrn === '') {
                    continue;
                }

                $rows[] = [
                    'lrn' => $lrn,
                    'first_name' => trim((string)($data['first_name'] ?? '')),
                    'middle_name' => trim((string)($data['middle_name'] ?? '')),
                    'last_name' => trim((string)($data['last_name'] ?? '')),
                    'grade_level' => trim((string)($data['grade_level'] ?? '')),
                    'section' => trim((string)($data['section'] ?? '')),
                ];
            }

            fclose($handle);

            foreach ($rows as $row) {
                $lrn = $row['lrn'];
                $first = $row['first_name'];
                $middle = $row['middle_name'];
                $last = $row['last_name'];
                $gradeName = $row['grade_level'];
                $sectionName = $row['section'];

                $gradeId = null;
                if ($gradeName !== '') {
                    $gradeCategory = $this->deriveGradeCategory($gradeName);
                    $grade = \App\Models\GradeLevel::firstOrCreate(
                        ['name' => $gradeName],
                        ['description' => $gradeCategory]
                    );

                    if ($grade->description !== $gradeCategory) {
                        $grade->description = $gradeCategory;
                        $grade->save();
                    }
                    $gradeId = $grade->id;
                }

                $sectionId = null;
                if ($sectionName !== '' && $gradeId) {
                    $section = \App\Models\Section::firstOrCreate([
                        'name' => $sectionName,
                        'grade_level_id' => $gradeId,
                    ]);
                    $sectionId = $section->id;
                }

                $student = \App\Models\Student::where('lrn', $lrn)->latest('id')->first();

                if ($student) {
                    $targetYearId = (int) $validated['school_year_id'];
                    $movingToNewYear = (int) $student->school_year_id !== $targetYearId;

                    if ($movingToNewYear) {
                        // Preserve prior-year record by cloning a new row
                        $carryOver = (float) ($student->balance ?? 0) + (float) ($student->contribution_balance ?? 0);

                        $newStudent = $student->replicate();
                        $newStudent->grade_level_id = $gradeId ?: $student->grade_level_id;
                        $newStudent->section_id = $sectionId ?: $student->section_id;
                        $newStudent->school_year_id = $targetYearId;
                        $newStudent->first_name = $first ?: $student->first_name;
                        $newStudent->middle_name = $middle ?: $student->middle_name;
                        $newStudent->last_name = $last ?: $student->last_name;
                        $newStudent->balance = $carryOver;
                        $newStudent->contribution_balance = 0;
                        $newStudent->status = 'active';
                        $newStudent->save();

                        // Mark previous row as inactive to signal it belongs to an older school year
                        $student->status = 'inactive';
                        $student->archived = 0;
                        $student->save();
                    } else {
                        // Same school year → update basic info in place
                        $student->first_name = $first ?: $student->first_name;
                        $student->middle_name = $middle ?: $student->middle_name;
                        $student->last_name = $last ?: $student->last_name;
                        $student->grade_level_id = $gradeId ?: $student->grade_level_id;
                        $student->section_id = $sectionId ?: $student->section_id;
                        $student->status = 'active';
                        $student->save();
                    }

                    continue;
                }

                // If there is truly no prior record, create one (initial import)
                \App\Models\Student::create([
                    'guardian_id' => null,
                    'grade_level_id' => $gradeId,
                    'section_id' => $sectionId,
                    'school_year_id' => (int) $validated['school_year_id'],
                    'lrn' => $lrn,
                    'first_name' => $first,
                    'middle_name' => $middle ?: null,
                    'last_name' => $last,
                    'balance' => 0,
                    'contribution_balance' => 0,
                    'status' => 'active',
                    'archived' => 1,
                ]);
            }

            // If this was triggered via AJAX/JSON (e.g., axios), return JSON so the SPA can decide what to do next
            if ($request->ajax() || $request->expectsJson()) {
                return response()->json(['success' => true]);
            }
            // Otherwise, redirect to the Imported Students page
            return redirect()->route('admin.imported-students')->with('success', 'Students imported successfully (CSV).');
        }

        // If not CSV/TXT, attempt Excel import. Composer pulled an old Excel v1.1.5 in your environment,
        // which is incompatible with the modern Concerns API. Until a compatible package is installed,
        // please upload CSV instead.
        return back()->withErrors(['file' => 'XLSX import requires a compatible Excel library. For now, please upload a CSV, or install spatie/simple-excel.']);
    }

    public function assignStudentsToGuardian(Request $request, int $guardianId)
    {
        $data = $request->validate([
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'integer|exists:students,id',
        ]);

        $students = Student::whereIn('id', $data['student_ids'])->get();
        if ($students->isEmpty()) {
            return response()->json(['success' => true, 'assigned' => 0]);
        }

        // Preserve request order per student id to determine who is first
        $orderIndex = [];
        foreach ($data['student_ids'] as $pos => $sid) {
            $orderIndex[(int) $sid] = $pos;
        }

        $byYear = $students->groupBy('school_year_id');

        DB::transaction(function () use ($byYear, $guardianId, $orderIndex) {
            foreach ($byYear as $schoolYearId => $list) {
                // IDs in this batch for this school year
                $batchIds = $list->pluck('id')->all();

                // Count existing students of this guardian already in this year, excluding this batch
                $existingCount = Student::where('guardian_id', $guardianId)
                    ->where('school_year_id', (int) $schoolYearId)
                    ->where('archived', 1)
                    ->where('status', 'active')
                    ->whereNotIn('id', $batchIds)
                    ->count();

                // Order by the request order
                $ordered = $list->sortBy(function ($s) use ($orderIndex) {
                    return $orderIndex[(int) $s->id] ?? PHP_INT_MAX;
                })->values();

                // Always treat the first student in this batch as the 'first' for the waiver,
                // regardless of whether the guardian already has students in this school year.
                // Subsequent students get mandatory-only contributions.
                $currentCount = $existingCount;
                foreach ($ordered as $index => $student) {
                    // Link guardian
                    $student->guardian_id = $guardianId;

                    // Get contributions for this student's grade in this year
                    $syc = SchoolYearContribution::with('contribution')
                        ->where('school_year_id', (int) $schoolYearId)
                        ->where('grade_level_id', (int) $student->grade_level_id)
                        ->get();

                    // First in this batch gets full; others mandatory-only
                    $isFirstForYear = ($index === 0);

                    $amount = $syc->filter(function ($row) use ($isFirstForYear) {
                        if ($isFirstForYear) return true; // first student pays all
                        return (bool) optional($row->contribution)->mandatory === true; // siblings mandatory only
                    })->sum(function ($row) {
                        return (float) ($row->total_amount ?? optional($row->contribution)->amount ?? 0);
                    });

                    $student->contribution_balance = (float) $amount;
                    $student->save();

                    // Increment after processing this student
                    $currentCount++;
                }
            }
        });

        return response()->json(['success' => true, 'assigned' => $students->count()]);
    }

    // ==================== REPORTS (ADMIN) ====================
    public function reports()
    {
        // Ensure only logged-in admin
        if (!Auth::check() || Auth::user()->role !== 'admin') {
            return redirect()->route('admin.login');
        }

        $appTimezone = config('app.timezone', 'UTC');

        // Payments with student, grade, section, school year, and contribution
        $payments = Payment::with([
                'student:id,first_name,last_name,grade_level_id,section_id,school_year_id',
                'student.gradeLevel:id,name',
                'student.section:id,name',
                'student.schoolYear:id,name',
                'contribution:id,contribution_type'
            ])
            ->orderByDesc(
                DB::raw('COALESCE(payment_date, updated_at, created_at)')
            )
            ->orderByDesc('id')
            ->get()
            ->map(function ($p) use ($appTimezone) {
                $studentName = $p->student ? ($p->student->first_name . ' ' . $p->student->last_name) : null;

                $timestampSource = $p->created_at ?? $p->updated_at ?? $p->payment_date;
                $timestamp = $timestampSource ? Carbon::parse($timestampSource)->setTimezone($appTimezone) : null;
                $dateReference = $p->payment_date ? Carbon::parse($p->payment_date)->setTimezone($appTimezone) : $timestamp;
                return [
                    'id' => $p->id,
                    'amount_paid' => (float) $p->amount_paid,
                    'amount' => (float) $p->amount_paid, // convenience for front-end
                    'payment_date' => $dateReference ? $dateReference->toDateString() : null,
                    'date' => $dateReference ? $dateReference->toIso8601String() : null,
                    'student' => $p->student ? ['name' => $studentName] : null,
                    'student_name' => $studentName,
                    'grade_level_name' => optional($p->student->gradeLevel)->name ?? null,
                    'section_name' => optional($p->student->section)->name ?? null,
                    'school_year_name' => optional($p->student->schoolYear)->name ?? null,
                    'contribution' => $p->contribution ? ['contribution_type' => $p->contribution->contribution_type] : null,
                    'contribution_name' => $p->contribution->contribution_type ?? null,
                    'timestamp' => $timestamp ? $timestamp->toIso8601String() : null,
                    'created_at' => $p->created_at,
                    'updated_at' => $p->updated_at,
                ];
            })
            ->values()
            ->all();

        // Map of used in-kind quantities from expenses (Qty Used: X)
        $inKindUsageByDonation = Expense::whereNotNull('donation_id')
            ->select('donation_id', 'description')
            ->get()
            ->groupBy('donation_id')
            ->mapWithKeys(function ($expenses, $donationId) {
                $used = $expenses->sum(function ($expense) {
                    return $this->extractUsedQuantity($expense->description);
                });
                return [$donationId => $used];
            });

        // Donations
        $donations = Donation::latest('donation_date')
            ->get()
            ->map(function ($d) use ($inKindUsageByDonation, $appTimezone) {
                $donationQuantity = (float) ($d->donation_quantity ?? 0);
                $usedQuantity = (float) ($inKindUsageByDonation->get($d->id, 0));
                $damagedQuantity = (float) ($d->damaged_quantity ?? 0);
                $unusableQuantity = (float) ($d->unusable_quantity ?? 0);
                $remainingQuantity = max($donationQuantity - ($usedQuantity + $damagedQuantity + $unusableQuantity), 0);
                $timestampSource = $d->created_at ?? $d->updated_at ?? $d->donation_date;
                $timestamp = $timestampSource ? Carbon::parse($timestampSource)->setTimezone($appTimezone) : null;
                $dateReference = $d->donation_date
                    ? Carbon::parse($d->donation_date)->setTimezone($appTimezone)
                    : null;
                return [
                    'id' => $d->id,
                    'donated_by' => $d->donated_by,
                    'donation_type' => $d->donation_type,
                    'type' => $d->donation_type, // convenience
                    'donation_amount' => (float) $d->donation_amount,
                    'amount' => (float) $d->donation_amount,
                    'donation_quantity' => $donationQuantity,
                    'used_quantity' => $usedQuantity,
                    'usable_quantity' => $remainingQuantity,
                    'damaged_quantity' => $d->damaged_quantity !== null ? $damagedQuantity : null,
                    'unusable_quantity' => $d->unusable_quantity !== null ? $unusableQuantity : null,
                    'item_type' => $d->item_type,
                    'usage_status' => $d->usage_status,
                    'usage_notes' => $d->usage_notes,
                    'usage_location' => $d->usage_location,
                    'donation_description' => $d->donation_description,
                    'details' => $d->donation_description,
                    'received_by' => $d->received_by,
                    'donation_date' => $dateReference ? $dateReference->toDateString() : null,
                    'date' => $timestamp
                        ? $timestamp->toIso8601String()
                        : ($dateReference ? $dateReference->toIso8601String() : null),
                    'timestamp' => $timestamp ? $timestamp->toIso8601String() : null,
                ];
            })
            ->values()
            ->all();

        // Expenses with contribution or donation linkage
        $expenses = Expense::with(['contribution', 'donation'])
            ->latest('expense_date')
            ->get()
            ->map(function ($e) use ($appTimezone) {
                $timestampSource = $e->created_at ?? $e->updated_at ?? $e->expense_date;
                $timestamp = $timestampSource ? Carbon::parse($timestampSource)->setTimezone($appTimezone) : null;
                $dateReference = $e->expense_date
                    ? Carbon::parse($e->expense_date)->setTimezone($appTimezone)
                    : null;
                return [
                    'id' => $e->id,
                    'expense_type' => $e->expense_type,
                    'amount' => (float) $e->amount,
                    'expense_date' => $dateReference ? $dateReference->toDateString() : null,
                    'date' => $timestamp
                        ? $timestamp->toIso8601String()
                        : ($dateReference ? $dateReference->toIso8601String() : null),
                    'timestamp' => $timestamp ? $timestamp->toIso8601String() : null,
                    'description' => $e->description,
                    'contribution' => $e->contribution ? $e->contribution->only(['id', 'contribution_type']) : null,
                    'donation' => $e->donation ? [
                        'id' => $e->donation->id,
                        'donated_by' => $e->donation->donated_by,
                        'donation_type' => $e->donation->donation_type,
                        'item_type' => $e->donation->item_type,
                        'donation_amount' => $e->donation->donation_amount,
                        'donation_description' => $e->donation->donation_description,
                        'usage_status' => $e->donation->usage_status,
                        'usage_location' => $e->donation->usage_location,
                        'usage_notes' => $e->donation->usage_notes,
                    ] : null,
                ];
            })
            ->values()
            ->all();

        // Fund history (align with Treasurer funds view)
        $fundsHistoriesCollection = FundHistory::with([
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
            ->orderBy('fund_date')
            ->orderBy('id')
            ->get()
            ->map(function ($history) use ($appTimezone) {
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

                $type = $history->payment_id
                    ? 'payment'
                    : ($history->donation_id ? 'donation' : 'expense');

                $timestampSource = $history->created_at ?? $history->updated_at ?? $history->fund_date;
                $timestamp = $timestampSource ? Carbon::parse($timestampSource)->setTimezone($appTimezone) : null;
                $dateReference = $history->fund_date
                    ? Carbon::parse($history->fund_date)->setTimezone($appTimezone)
                    : null;

                return [
                    'id' => $history->id,
                    'fund_date' => $history->fund_date,
                    'date' => $timestamp
                        ? $timestamp->toIso8601String()
                        : ($dateReference ? $dateReference->toIso8601String() : null),
                    'timestamp' => $timestamp ? $timestamp->toIso8601String() : null,
                    'amount' => (float) $history->amount,
                    'fund_before' => (float) $history->balance_before,
                    'fund_after' => (float) $history->balance_after,
                    'balance_before' => (float) $history->balance_before,
                    'balance_after' => (float) $history->balance_after,
                    'fund_description' => $history->fund_description,
                    'details' => $history->fund_description,
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
                    'type' => $type,
                ];
            })
            ->values();

        $fundsHistories = $fundsHistoriesCollection->toArray();

        $fundSummary = [
            'payments' => (float) $fundsHistoriesCollection->where('type', 'payment')->sum('amount'),
            'donations' => (float) $fundsHistoriesCollection->where('type', 'donation')->filter(function ($item) {
                return strtolower($item['donation_type'] ?? '') !== 'in-kind';
            })->sum('amount'),
            'inKind' => (int) $fundsHistoriesCollection->where('type', 'donation')->filter(function ($item) {
                return strtolower($item['donation_type'] ?? '') === 'in-kind';
            })->count(),
            'expenses' => (float) $fundsHistoriesCollection->where('type', 'expense')->sum('amount'),
        ];
        $fundSummary['available'] = $fundSummary['payments'] + $fundSummary['donations'] - $fundSummary['expenses'];

        // Totals
        $totalPayments = (float) Payment::sum('amount_paid');
        $totalDonationsCash = (float) Donation::where('donation_type', '!=', 'in-kind')->sum('donation_amount');
        $totalDonationsInKind = (int) Donation::where('donation_type', 'in-kind')->count();
        $totalExpenses = (float) Expense::sum('amount');
        $available = $totalPayments + $totalDonationsCash - $totalExpenses;

        // Financial overview pieces
        $studentsCount = Student::count();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $totalCollectedActiveSchoolYear = 0.0;
        if ($activeSchoolYear) {
            $totalCollectedActiveSchoolYear = (float) Payment::whereHas('student', function ($q) use ($activeSchoolYear) {
                $q->where('school_year_id', $activeSchoolYear->id);
            })->sum('amount_paid');
        }

        // Student balances: mirror Treasurer view (carry-over from previous school years)
        $students = Student::with(['gradeLevel', 'section', 'schoolYear', 'guardian'])
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
            $gradeName = optional($student->gradeLevel)->name;
            $sectionName = optional($student->section)->name;
            $guardian = $student->guardian;
            $guardianName = $guardian
                ? trim(collect([$guardian->first_name ?? '', $guardian->middle_name ?? '', $guardian->last_name ?? ''])->filter()->implode(' '))
                : null;

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
                'grade_level_name' => $gradeName,
                'section_name' => $sectionName,
                'guardian_id' => $student->guardian_id,
                'guardian_name' => $guardianName,
                'total_payments' => (float) $totalPaid,
                'balance' => (float) $remainingBalance,
            ];
        })->values()->all();

        // Audit log: unify payments, donations, expenses into a single chronological list
        $auditPayments = Payment::latest('payment_date')->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'type' => 'payment',
                'date' => $p->payment_date,
                'amount' => (float) $p->amount_paid,
                'details' => 'Payment',
            ];
        })->values()->all();

        $auditDonations = Donation::latest('donation_date')->get()->map(function ($d) {
            return [
                'id' => $d->id,
                'type' => 'donation',
                'date' => $d->donation_date,
                'amount' => (float) $d->donation_amount,
                'details' => $d->donation_type . ' donation' . ($d->donated_by ? (' by ' . $d->donated_by) : ''),
            ];
        })->values()->all();

        $auditExpenses = Expense::latest('expense_date')->get()->map(function ($e) {
            return [
                'id' => $e->id,
                'type' => 'expense',
                'date' => $e->expense_date,
                'amount' => (float) $e->amount,
                'details' => $e->expense_type,
            ];
        })->values()->all();

        $auditLogs = collect($auditPayments)
            ->concat($auditDonations)
            ->concat($auditExpenses)
            ->sortByDesc('date')
            ->values()
            ->all();

        return Inertia::render('Admin/Reports', [
            'payments' => ['data' => $payments],
            'donations' => ['data' => $donations],
            'expenses' => ['data' => $expenses],
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
                'payments' => $totalPayments,
                'donationsCash' => $totalDonationsCash,
                'donationsInKind' => $totalDonationsInKind,
                'expenses' => $totalExpenses,
                'available' => $available,
            ],
        ]);
    }

      public function indexs()
    {
        $activeSchoolYear = SchoolYear::select('id', 'name', 'start_date', 'end_date')
            ->where('is_active', true)
            ->first();

        return Inertia::render('Admin/Announcement', [
            'auth' => ['user' => Auth::user()],
            'announcements' => Announcement::with('user:id,first_name,last_name,role')
                                          ->latest()
                                          ->get(),
            'activeSchoolYear' => $activeSchoolYear ? [
                'id' => $activeSchoolYear->id,
                'name' => $activeSchoolYear->name,
                'start_date' => $activeSchoolYear->start_date,
                'end_date' => $activeSchoolYear->end_date,
            ] : null,
        ]);
    }

      public function archiveAnnouncement($id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->is_archived = true;
        $announcement->save();

        return back()->with('success', 'Announcement archived.');
    }

    public function stores(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'announcement_date' => 'required|date',
            'type' => 'required|in:general,urgent',
        ]);

        Announcement::create([
            'title' => $request->title,
            'message' => $request->message,
            'announcement_date' => $request->announcement_date,
            'type' => $request->type,
            'created_by' => Auth::id(),
        ]);

        return back()->with('success', 'Announcement posted.');
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $announcement = Announcement::findOrFail($id);
        $announcement->update([
            'title' => $request->title,
            'message' => $request->message,
        ]);

        return back()->with('success', 'Announcement updated.');
    }



    // ==================== CONTRIBUTIONS ====================
    public function indexss()
    {
        $contributions = Contribution::all();
        return Inertia::render('Admin/Contributions', [
            'contributions' => $contributions,
        ]);
    }

    public function storess(Request $request)
    {
        $request->validate([
            'contribution_type' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0',
            'mandatory' => 'required|boolean',
        ]);

        Contribution::create([
            'contribution_type' => $request->contribution_type,
            'amount' => $request->amount,
            'mandatory' => $request->mandatory,
        ]);

        return redirect()->back()->with('success', 'Contribution saved successfully.');
    }

    public function updateContribution(Request $request, $id)
    {
        $request->validate([
            'contribution_type' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0',
            'mandatory' => 'required|boolean',
        ]);

        $contribution = Contribution::findOrFail($id);

        $contribution->update([
            'contribution_type' => $request->contribution_type,
            'amount' => $request->amount,
            'mandatory' => $request->mandatory,
        ]);

        $activeSchoolYearIds = SchoolYear::where('is_active', 1)->pluck('id');

        if ($activeSchoolYearIds->isNotEmpty()) {
            SchoolYearContribution::whereIn('school_year_id', $activeSchoolYearIds)
                ->where('contribution_id', $contribution->id)
                ->update(['total_amount' => $request->amount]);

            $sycTotals = SchoolYearContribution::with('contribution')
                ->whereIn('school_year_id', $activeSchoolYearIds)
                ->get()
                ->groupBy(fn ($syc) => $syc->school_year_id . '-' . $syc->grade_level_id)
                ->map(function ($group) {
                    $totalAll = $group->sum(fn ($syc) => (float) ($syc->total_amount ?? 0));
                    $totalMandatory = $group
                        ->filter(fn ($syc) => optional($syc->contribution)->mandatory)
                        ->sum(fn ($syc) => (float) ($syc->total_amount ?? 0));

                    return [
                        'all' => $totalAll,
                        'mandatory' => $totalMandatory,
                    ];
                });

            Student::whereIn('school_year_id', $activeSchoolYearIds)
                ->orderBy('guardian_id')
                ->orderBy('id')
                ->get()
                ->groupBy(fn ($student) => $student->guardian_id . ':' . $student->school_year_id)
                ->each(function ($students) use ($sycTotals) {
                    $isFirst = true;

                    foreach ($students as $student) {
                        $key = $student->school_year_id . '-' . $student->grade_level_id;
                        $totals = $sycTotals->get($key, ['all' => 0.0, 'mandatory' => 0.0]);

                        $newBalance = $isFirst ? $totals['all'] : $totals['mandatory'];

                        if (abs((float) $student->contribution_balance - (float) $newBalance) > 0.009) {
                            $student->contribution_balance = $newBalance;
                            $student->save();
                        }

                        $isFirst = false;
                    }
                });
        }

        return redirect()->back()->with('success', 'Contribution updated successfully.');
    }

    // ==================== EXPENSES ====================

   public function listExpenses()
{
    $expenses = Expense::with(['contribution', 'donation'])->latest()->get();

    // Calculate available funds per contribution
    $contributions = Contribution::all()->map(function ($c) {
        $totalPayments = Payment::where('contribution_id', $c->id)->sum('amount_paid');
        $totalExpenses = Expense::where('contribution_id', $c->id)->sum('amount');
        $remaining = $totalPayments - $totalExpenses;

        return [
            'id' => $c->id,
            'contribution_type' => $c->contribution_type,
            'total_payments' => (float) $totalPayments,
            'total_expenses' => (float) $totalExpenses,
            'available_funds' => (float) $remaining,
            'remaining_funds' => (float) $remaining,
        ];
    });

    $cashDonationsTotal = Donation::where('donation_type', 'cash')->sum('donation_amount');
    $cashDonationExpenses = Expense::whereNull('contribution_id')->sum('amount');
    $cashDonationsAvailable = max(($cashDonationsTotal - $cashDonationExpenses), 0);

    $inKindUsageByDonation = Expense::whereNotNull('donation_id')
        ->select('donation_id', 'description')
        ->get()
        ->groupBy('donation_id')
        ->mapWithKeys(function ($expenses, $donationId) {
            $used = $expenses->sum(function ($expense) {
                return $this->extractUsedQuantity($expense->description);
            });
            return [$donationId => $used];
        });

    $inKindDonations = Donation::where('donation_type', 'in-kind')
        ->orderByDesc('donation_date')
        ->get()
        ->map(function ($donation) use ($inKindUsageByDonation) {
            $donationQuantity = (float) ($donation->donation_quantity ?? 0);
            $usedQuantity = (float) ($inKindUsageByDonation->get($donation->id, 0));
            $damagedQuantity = (float) ($donation->damaged_quantity ?? 0);
            $unusableQuantity = (float) ($donation->unusable_quantity ?? 0);
            $remainingQuantity = max($donationQuantity - ($usedQuantity + $damagedQuantity + $unusableQuantity), 0);

            $donation->used_quantity = $usedQuantity;
            $donation->usable_quantity = $remainingQuantity;

            return $donation;
        });

    $donorCount = Donation::whereNotNull('donated_by')
        ->distinct('donated_by')
        ->count('donated_by');

    return Inertia::render('Admin/Expenses', [
        'expenses' => $expenses,
        'contributions' => $contributions,
        'cashDonationsAvailable' => (float) $cashDonationsAvailable,
        'cashDonationsTotal' => (float) $cashDonationsTotal,
        'cashDonationExpenses' => (float) $cashDonationExpenses,
        'inKindDonations' => $inKindDonations,
        'donorCount' => $donorCount,
    ]);
}

   public function saveExpense(Request $request)
{
    $validated = $request->validate([
        'expense_type' => 'required|string|max:50',
        'amount' => 'required|numeric|min:0',
        'expense_date' => 'required|date',
        'description' => 'nullable|string',
        'contribution_id' => 'nullable|exists:contributions,id',
        'donation_id' => 'nullable|exists:donations,id',
    ]);

    $hasContribution = !empty($validated['contribution_id']);
    $hasDonation = !empty($validated['donation_id']);

    if ($hasContribution && $hasDonation) {
        return response()->json([
            'success' => false,
            'message' => 'An expense can only be linked to a contribution or a donation, not both.',
        ], 422);
    }

    if ($hasContribution) {
        $totalPayments = Payment::where('contribution_id', $validated['contribution_id'])->sum('amount_paid');
        $totalExpenses = Expense::where('contribution_id', $validated['contribution_id'])->sum('amount');
        $available = $totalPayments - $totalExpenses;

        if ($validated['amount'] > $available) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient funds for the selected contribution.'
            ], 422);
        }
    }

    if ($hasDonation) {
        $donation = Donation::find($validated['donation_id']);
        if (!$donation || strtolower($donation->donation_type) !== 'in-kind') {
            return response()->json([
                'success' => false,
                'message' => 'Only in-kind donations can be linked to an expense.',
            ], 422);
        }
    }

    $expense = Expense::create([
        'expense_type' => $validated['expense_type'],
        'amount' => $validated['amount'],
        'expense_date' => $validated['expense_date'],
        'description' => $validated['description'],
        'contribution_id' => $hasContribution ? $validated['contribution_id'] : null,
        'donation_id' => $hasDonation ? $validated['donation_id'] : null,
    ]);

    $expense->load(['contribution', 'donation']);

    return response()->json([
        'success' => true,
        'expense' => $expense
    ]);
}

    // ==================== SCHOOL YEARS ====================

   public function listSchoolYears()
{
    $schoolYears = SchoolYear::latest()->get();

    return Inertia::render('Admin/SchoolYear', [
        'schoolYears' => $schoolYears
    ]);
}

public function saveSchoolYear(Request $request)
{
    $request->validate([
        'name' => 'required|string|max:20',
        'start_date' => 'nullable|date',
        'end_date' => 'nullable|date|after_or_equal:start_date',
    ]);

    // 🔹 Deactivate all school years
    SchoolYear::where('is_active', true)->update(['is_active' => false]);

    // 🔹 Create new school year
    $newSY = SchoolYear::create([
        'name' => $request->name,
        'start_date' => $request->start_date,
        'end_date' => $request->end_date,
        'is_active' => true,
    ]);

    // 🔹 Clone contributions from previous school year
    $this->cloneContributionsToNewSchoolYear($newSY->id);

    $schoolYears = SchoolYear::latest()->get();

    return Inertia::render('Admin/SchoolYear', [
        'schoolYears' => $schoolYears,
        'flash' => [
            'success' => 'New school year created and contributions cloned. Please use Manual Enrollment to assign students to grade levels, sections, and contributions.'
        ]
    ]);
}


  private function promoteStudents($newSchoolYearId)
{
    $students = Student::all();

    foreach ($students as $student) {
        $currentGradeId = $student->grade_level_id;

        // 🔹 Hanapin ang next grade level
        $nextGrade = GradeLevel::where('id', '>', $currentGradeId)
            ->orderBy('id')
            ->first();

        if (!$nextGrade) continue;

        // 🔹 Kunin contributions para sa bagong SY at next grade
        $schoolYearContributions = SchoolYearContribution::with('contribution')
            ->where('school_year_id', $newSchoolYearId)
            ->where('grade_level_id', $nextGrade->id)
            ->get();

        // 🔹 Ilan na students ng guardian sa bagong SY?
        $guardianStudentsThisYear = Student::where('guardian_id', $student->guardian_id)
            ->where('school_year_id', $newSchoolYearId)
            ->count();

        // 🔹 Carry-over balance rule
        $carryOverBalance = ($student->balance ?? 0) + ($student->contribution_balance ?? 0);

        // 🔹 Compute bagong contribution balance
        if ($guardianStudentsThisYear === 0) {
            // First student → lahat ng contributions
            $newContributionBalance = $schoolYearContributions->sum('total_amount');
        } else {
            // Next students → mandatory contributions lang
            $newContributionBalance = $schoolYearContributions
                ->filter(fn($syc) => $syc->contribution && $syc->contribution->mandatory)
                ->sum('total_amount');
        }

        // 🔹 Update student para sa bagong school year
        $student->update([
            'grade_level_id'       => $nextGrade->id,
            'school_year_id'       => $newSchoolYearId,
            'balance'              => $carryOverBalance,
            'contribution_balance' => $newContributionBalance,
            'status'               => 'active',
        ]);
    }
}

private function cloneContributionsToNewSchoolYear($newSchoolYearId)
{
    // Kunin ang latest pero hindi yung bagong gawa
    $previousSY = SchoolYear::latest()->skip(1)->first();

    if (!$previousSY) return; // Walang previous year

    // Kunin lahat ng contributions ng previous school year
    $oldContributions = SchoolYearContribution::where('school_year_id', $previousSY->id)->get();

    foreach ($oldContributions as $contribution) {
        SchoolYearContribution::create([
            'school_year_id' => $newSchoolYearId,
            'grade_level_id' => $contribution->grade_level_id,
            'contribution_id'=> $contribution->contribution_id,
            'total_amount'   => $contribution->total_amount,
        ]);
    }
}




private function getOrCreateContributionsForGrade($schoolYearId, $gradeLevelId)
{
    $syc = SchoolYearContribution::where('school_year_id', $schoolYearId)
        ->where('grade_level_id', $gradeLevelId)
        ->get();

    if ($syc->isEmpty()) {
        $defaultContributions = Contribution::all();
        foreach ($defaultContributions as $c) {
            $syc[] = SchoolYearContribution::create([
                'school_year_id'  => $schoolYearId,
                'grade_level_id'  => $gradeLevelId,
                'contribution_id' => $c->id,
                'total_amount'    => $c->amount,
            ]);
        }
    }

    return $syc;
}


public function toggleActive($id)
{
    $schoolYear = SchoolYear::findOrFail($id);

    if (!$schoolYear->is_active) {
        // Deactivate all
        SchoolYear::where('is_active', true)->update(['is_active' => false]);
        $schoolYear->update(['is_active' => true]);
    } else {
        $schoolYear->update(['is_active' => false]);
    }

    $schoolYears = SchoolYear::latest()->get();

    return back()->with([
        'schoolYears' => $schoolYears,
    ]);
}

public function toggleActiveSchoolYear($id)
{
    $schoolYear = SchoolYear::findOrFail($id);

    if (!$schoolYear->is_active) {
        SchoolYear::where('id', '!=', $schoolYear->id)->update(['is_active' => false]);
        $schoolYear->is_active = true;
        $schoolYear->save();
    } else {
        $schoolYear->is_active = false;
        $schoolYear->save();
        
        // 🔹 Reset balances for students who were in this archived school year
        Student::where('school_year_id', $schoolYear->id)
            ->update([
                'balance' => 0,
                'contribution_balance' => 0
            ]);
    }

    $schoolYears = SchoolYear::orderByDesc('id')->get();
    $archivesData = $this->getArchivesData();

    $activeSchoolYear = $schoolYears->firstWhere('is_active', true);

    return Inertia::render('Admin/SchoolYear', [
        'schoolYears' => $schoolYears,
        'activeSchoolYearId' => $activeSchoolYear ? $activeSchoolYear->id : null,
        'archivesData' => $archivesData,
        'message' => 'School year updated successfully.'
    ]);
}

private function getArchivesData()
{
    $archivedSchoolYears = SchoolYear::where('is_active', 0)->get();

    return $archivedSchoolYears->map(function ($schoolYear) {
        $start = $schoolYear->start_date . ' 00:00:00';
        $end   = $schoolYear->end_date . ' 23:59:59';

        // Student IDs are still needed for payments
        $studentIds = Student::where('school_year_id', $schoolYear->id)->pluck('id');

        // Build Payment Summary per Contribution for this School Year
        // 1) Count students per grade level for the school year
        $studentsPerGrade = Student::where('school_year_id', $schoolYear->id)
            ->select('grade_level_id', DB::raw('COUNT(*) as cnt'))
            ->groupBy('grade_level_id')
            ->pluck('cnt', 'grade_level_id');

        // 2) Fetch assigned contributions (with amounts) for all grade levels in this school year
        $syContributions = SchoolYearContribution::with(['contribution', 'gradeLevel'])
            ->where('school_year_id', $schoolYear->id)
            ->get();

        // 3) Expected contribution amounts per grade + contribution details
        $perContributionAmount = [];
        $perStudentTotalsByGrade = [];
        $contributionDetails = [];

        foreach ($syContributions as $syc) {
            $cid = $syc->contribution_id;
            $gradeId = $syc->grade_level_id;
            $perStudentAmount = (float) ($syc->total_amount ?? optional($syc->contribution)->amount ?? 0);

            if (!array_key_exists($cid, $perContributionAmount)) {
                $perContributionAmount[$cid] = $perStudentAmount;
            } elseif ((float) $perContributionAmount[$cid] === 0.0 && $perStudentAmount > 0) {
                $perContributionAmount[$cid] = $perStudentAmount;
            }

            $perStudentTotalsByGrade[$gradeId] = ($perStudentTotalsByGrade[$gradeId] ?? 0) + $perStudentAmount;

            if (!isset($contributionDetails[$cid])) {
                $contributionDetails[$cid] = [
                    'contribution_id' => $cid,
                    'contribution_type' => optional($syc->contribution)->contribution_type ?? 'Unknown',
                    'per_student_amount' => $perStudentAmount,
                    'expected_total' => 0,
                    'paid_total' => 0,
                    'balance_total' => 0,
                    'grade_breakdown' => [],
                ];
            }

            $studentCount = $studentsPerGrade[$gradeId] ?? 0;
            $expectedForGrade = $perStudentAmount * $studentCount;

            $contributionDetails[$cid]['grade_breakdown'][] = [
                'grade_level_id' => $gradeId,
                'grade_name' => optional($syc->gradeLevel)->name,
                'student_count' => $studentCount,
                'expected_total' => $expectedForGrade,
            ];

            $contributionDetails[$cid]['expected_total'] += $expectedForGrade;
        }

        // 4) Paid per contribution within this school year (use payment.school_year_id for reliable archive filtering)
        $paidRows = Payment::where('school_year_id', $schoolYear->id)
            ->select('contribution_id', DB::raw('SUM(amount_paid) as total_paid'))
            ->groupBy('contribution_id')
            ->get();

        $paidPerContribution = [];
        foreach ($paidRows as $row) {
            $paidPerContribution[$row->contribution_id] = (float) $row->total_paid;
        }

        foreach ($contributionDetails as $cid => &$detail) {
            $detail['per_student_amount'] = $detail['per_student_amount'] ?: ($perContributionAmount[$cid] ?? 0);
            $detail['paid_total'] = (float) ($paidPerContribution[$cid] ?? 0);
            $detail['balance_total'] = max($detail['expected_total'] - $detail['paid_total'], 0);
        }
        unset($detail);

        // 5) Build summary rows with names
        $contribNames = Contribution::pluck('contribution_type', 'id');
        $paymentSummary = [];
        $allContributionIds = array_unique(array_merge(array_keys($perContributionAmount), array_keys($paidPerContribution)));
        sort($allContributionIds);
        foreach ($allContributionIds as $cid) {
            $actual = (float) ($perContributionAmount[$cid] ?? (Contribution::find($cid)->amount ?? 0));
            $paid = (float) ($paidPerContribution[$cid] ?? 0);
            // If there are no archived students counted (due to promotion), use paid as the actual expected for display
            if ($actual === 0.0 && $paid > 0) {
                $actual = $paid;
            }
            $balance = $actual - $paid;
            $paymentSummary[] = [
                'contribution_id' => $cid,
                'contribution_type' => $contribNames[$cid] ?? 'Unknown',
                'actual' => $actual,
                'paid' => $paid,
                'balance' => $balance,
            ];
        }

        $paymentsPerStudent = Payment::where('school_year_id', $schoolYear->id)
            ->select('student_id', DB::raw('SUM(amount_paid) as total_paid'))
            ->groupBy('student_id')
            ->pluck('total_paid', 'student_id');

        $studentsCollection = Student::with(['guardian:id,first_name,last_name','gradeLevel:id,name','section:id,name'])
            ->where('school_year_id', $schoolYear->id)
            ->get(['id','guardian_id','grade_level_id','section_id','school_year_id','lrn','first_name','middle_name','last_name']);

        $gradeSectionSummary = [];
        $studentsCollection->groupBy(function ($student) {
            return ($student->grade_level_id ?? 'na') . '|' . ($student->section_id ?? 'na');
        })->each(function ($group) use (&$gradeSectionSummary, $paymentsPerStudent, $perStudentTotalsByGrade) {
            $first = $group->first();
            $gradeId = $first->grade_level_id;
            $sectionId = $first->section_id;
            $studentCount = $group->count();
            $expectedPerStudent = $perStudentTotalsByGrade[$gradeId] ?? 0;
            $expectedTotal = $expectedPerStudent * $studentCount;
            $paidTotal = $group->sum(function ($student) use ($paymentsPerStudent) {
                return (float) ($paymentsPerStudent[$student->id] ?? 0);
            });

            $gradeSectionSummary[] = [
                'grade_level_id' => $gradeId,
                'grade_name' => optional($first->gradeLevel)->name,
                'section_id' => $sectionId,
                'section_name' => optional($first->section)->name ?? 'Unassigned',
                'student_count' => $studentCount,
                'expected_total' => $expectedTotal,
                'paid_total' => $paidTotal,
                'balance' => max($expectedTotal - $paidTotal, 0),
            ];
        });

        $studentsData = $studentsCollection->map(function ($s) {
            return [
                'id' => $s->id,
                'lrn' => $s->lrn,
                'first_name' => $s->first_name,
                'middle_name' => $s->middle_name,
                'last_name' => $s->last_name,
                'grade' => $s->gradeLevel?->name,
                'section' => $s->section?->name,
                'guardian' => $s->guardian ? ($s->guardian->first_name . ' ' . $s->guardian->last_name) : null,
            ];
        });

        return [
            'school_year' => $schoolYear->toArray(),

            // Payments
            'payments' => Payment::whereIn('student_id', $studentIds)
                ->with('student:id,first_name,last_name')
                ->get()
                ->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'amount_paid' => $p->amount_paid,
                        'payment_date' => $p->payment_date,
                        'student' => $p->student ? $p->student->only('first_name', 'last_name') : null,
                    ];
                }),

            // Payments Summary (per contribution across the school year)
            'paymentSummary' => $paymentSummary,

            // Students for this archived school year (lightweight projection)
            'students' => $studentsData,

            'gradeSectionSummary' => $gradeSectionSummary,

            'contributionDetails' => array_values($contributionDetails),

            // Donations
            'donations' => Donation::whereBetween('donation_date', [$start, $end])
                ->get([
                    'id',
                    'donated_by',
                    'donation_type as type',
                    'donation_amount',
                    'received_by',
                    'donation_date'
                ])
                ->toArray(),

            // Expenses
            'expenses' => Expense::whereBetween('expense_date', [$start, $end])
                ->with(['contribution', 'donation'])
                ->get(['id', 'expense_type', 'amount', 'expense_date', 'description', 'contribution_id', 'donation_id'])
                ->map(function ($e) {
                    return [
                        'id' => $e->id,
                        'expense_type' => $e->expense_type,
                        'amount' => $e->amount,
                        'expense_date' => $e->expense_date,
                        'description' => $e->description,
                        // include linked contribution details when present
                        'contribution' => $e->contribution ? $e->contribution->only(['id', 'contribution_type']) : null,
                        // surface donation metadata so in-kind expenses appear in filters
                        'donation' => $e->donation ? [
                            'id' => $e->donation->id,
                            'donated_by' => $e->donation->donated_by,
                            'donation_type' => $e->donation->donation_type,
                            'donation_amount' => $e->donation->donation_amount,
                            'donation_description' => $e->donation->donation_description,
                            'usage_status' => $e->donation->usage_status,
                            'usage_location' => $e->donation->usage_location,
                            'usage_notes' => $e->donation->usage_notes,
                        ] : null,
                    ];
                })
                ->toArray(),
        ];
    });
}


public function record()
{
    return Inertia::render('Admin/Record', [
        'archivesData' => $this->getArchivesData(),
    ]);
}



 // ==================== GRADE LEVELS ====================
protected function normalizeGradeIdentifier(?string $value): ?string
{
    if ($value === null) {
        return null;
    }

    $normalized = strtolower(trim($value));
    // Remove leading "grade" label if present
    $normalized = preg_replace('/^grade\s*/i', '', $normalized ?? '');
    // Keep only digits and dot separators so "Grade 7" and "7" match, but "7" and "7.1" differ
    $normalized = preg_replace('/[^0-9.]/', '', $normalized ?? '');
    // Trim stray dots
    $normalized = trim($normalized ?? '', '.');

    return strlen($normalized ?? '') ? $normalized : strtolower(trim($value));
}

protected function deriveGradeCategory(?string $value): string
{
    $normalized = $this->normalizeGradeIdentifier($value);
    if (!$normalized) {
        return 'Junior High School';
    }

    $numericPortion = (float) $normalized;

    return $numericPortion >= 11 ? 'Senior High School' : 'Junior High School';
}

public function listGradeLevels()
{
    $gradeLevels = GradeLevel::orderByRaw("CAST(SUBSTRING(name, 7) AS UNSIGNED) ASC")->get();
    return response()->json(['gradeLevels' => $gradeLevels]);
}

public function storeGradeLevel(Request $request)
{
    $request->validate([
        'names' => 'required|array', // multiple grades
        'names.*' => 'required|string|max:255',
        'description' => 'required|string|max:255',
    ]);

    $grades = $request->names;

    // ✅ Define grade order
    $gradeOrder = [
        "Grade 7" => 7,
        "Grade 8" => 8,
        "Grade 9" => 9,
        "Grade 10" => 10,
        "Grade 11" => 11,
        "Grade 12" => 12,
    ];

    // ✅ Sort grades by order
    usort($grades, function($a, $b) use ($gradeOrder) {
        return ($gradeOrder[$a] ?? 999) - ($gradeOrder[$b] ?? 999);
    });

    $existingNormalized = GradeLevel::all()
        ->map(fn ($gradeLevel) => $this->normalizeGradeIdentifier($gradeLevel->name))
        ->filter()
        ->values()
        ->all();

    $normalizedToInsert = [];
    $duplicates = [];

    foreach ($grades as $grade) {
        $normalized = $this->normalizeGradeIdentifier($grade);

        if (in_array($normalized, $existingNormalized, true)) {
            $duplicates[] = $grade;
            continue;
        }

        // Avoid duplicates within the same request payload
        $normalizedToInsert[$normalized] = $grade;
    }

    if (!empty($duplicates)) {
        return response()->json([
            'error' => 'Grade level(s) already exist: ' . implode(', ', array_unique($duplicates)),
        ], 422);
    }

    $insertedGrades = [];

    foreach ($normalizedToInsert as $grade) {
        $gl = GradeLevel::create([
            'name' => $grade,
            'description' => $request->description,
        ]);
        $insertedGrades[] = $gl;
    }

    // ✅ Always return sorted list
    $gradeLevels = GradeLevel::orderByRaw("CAST(SUBSTRING(name, 7) AS UNSIGNED) ASC")->get();

    return response()->json([
        'message' => 'Grade level(s) added successfully.',
        'insertedGrades' => $insertedGrades,
        'gradeLevels' => $gradeLevels
    ]);
}

// ==================== SECTIONS ====================
public function listSections()
{
    $sections = Section::with('gradeLevel')
        ->join('grade_levels', 'sections.grade_level_id', '=', 'grade_levels.id')
        ->orderByRaw("CAST(SUBSTRING(grade_levels.name, 7) AS UNSIGNED) ASC") // by Grade number
        ->orderBy('sections.name', 'ASC') // alphabetical by section name
        ->select('sections.*')
        ->get();

    return response()->json(['sections' => $sections]);
}

public function storeSection(Request $request)
{
    $validated = $request->validate([
        'grade_level_id' => 'required|exists:grade_levels,id',
        'name' => 'required|string|max:255',
    ]);

    $exists = Section::where('name', $validated['name'])
        ->where('grade_level_id', $validated['grade_level_id'])
        ->exists();

    if ($exists) {
        return response()->json(['error' => 'This section already exists in this grade level'], 422);
    }

    $section = Section::create($validated);
    $section->load('gradeLevel');

    return response()->json([
        'message' => 'Section added successfully',
        'section' => $section
    ]);
}

 
 
 public function updateSection(Request $request, $id)
 {
     // Validate incoming data
     $validated = $request->validate([
         'name' => 'required|string|max:255',
         'grade_level_id' => 'nullable|exists:grade_levels,id',
     ]);
 
     $section = Section::findOrFail($id);
 
     // Determine target grade level (keep current if not provided)
     $targetGradeLevelId = $validated['grade_level_id'] ?? $section->grade_level_id;
 
     // Prevent duplicate name within the same grade level
     $exists = Section::where('name', $validated['name'])
         ->where('grade_level_id', $targetGradeLevelId)
         ->where('id', '!=', $section->id)
         ->exists();
 
     if ($exists) {
         return response()->json([
             'error' => 'This section already exists in this grade level'
         ], 422);
     }
 
     $section->name = $validated['name'];
     $section->grade_level_id = $targetGradeLevelId;
     $section->save();
 
     $section->load('gradeLevel');
 
     return response()->json([
         'message' => 'Section updated successfully',
         'section' => $section,
     ]);
 }
public function gradeLevelAndSections()
{
    $gradeLevels = GradeLevel::orderByRaw("CAST(SUBSTRING(name, 7) AS UNSIGNED) ASC")->get();

    $sections = Section::with('gradeLevel')
        ->join('grade_levels', 'sections.grade_level_id', '=', 'grade_levels.id')
        ->orderByRaw("CAST(SUBSTRING(grade_levels.name, 7) AS UNSIGNED) ASC") // by grade
        ->orderBy('sections.name', 'ASC') // alphabetical
        ->select('sections.*')
        ->get();

    return Inertia::render('Admin/GradeLevelAndSection', [
        'gradeLevels' => $gradeLevels,
        'sections' => $sections
    ]);
}


    // ==================== SCHOOL YEAR CONTRIBUTIONS ====================

        public function schoolYearContributions()
        {
            $schoolYearContributions = SchoolYearContribution::with([
                'schoolYear', 'gradeLevel', 'contribution'
            ])->get();

            return Inertia::render('Admin/SchoolYearContributions', [
                'schoolYears' => SchoolYear::all(),
                'gradeLevels' => GradeLevel::all(),
                'contributions' => Contribution::all(),
                'schoolYearContributions' => $schoolYearContributions,
            ]);
        }

    public function storeSchoolYearContribution(Request $request)
    {
        $request->validate([
            'school_year_id' => 'required|exists:school_years,id',
            'grade_level_ids' => 'required|array|min:1',
            'grade_level_ids.*' => 'exists:grade_levels,id',
            'contribution_ids' => 'required|array|min:1',
            'contribution_ids.*' => 'exists:contributions,id',
            'total_amount' => 'required|numeric|min:0',
        ]);

        foreach ($request->grade_level_ids as $gradeLevelId) {
            foreach ($request->contribution_ids as $contributionId) {
                $exists = SchoolYearContribution::where('school_year_id', $request->school_year_id)
                    ->where('grade_level_id', $gradeLevelId)
                    ->where('contribution_id', $contributionId)
                    ->exists();

                if (!$exists) {
                    SchoolYearContribution::create([
                        'school_year_id' => $request->school_year_id,
                        'grade_level_id' => $gradeLevelId,
                        'contribution_id' => $contributionId,
                        'total_amount' => Contribution::find($contributionId)->amount,
                    ]);
                }
            }
        }

        // Redirect to index route so the browser URL is a GET route (prevents 405 on reload)
        return redirect()->route('admin.schoolyearcontributions')
            ->with('success', 'Contributions assigned successfully.');
    }

    public function updateSchoolYearContribution(Request $request, $id)
    {
        $syContribution = SchoolYearContribution::findOrFail($id);

        $validated = $request->validate([
            'total_amount' => 'required|numeric|min:0',
        ]);

        $syContribution->update([
            'total_amount' => $validated['total_amount'],
        ]);

        return redirect()->route('admin.schoolyearcontributions')
            ->with('success', 'Contribution updated successfully.');
    }

    public function destroySchoolYearContribution($id)
    {
        $syContribution = SchoolYearContribution::findOrFail($id);

        $syContribution->delete();

        return redirect()->route('admin.schoolyearcontributions')
            ->with('success', 'Contribution removed successfully.');
    }

    // ==================== MANUAL ENROLLMENT ====================
    public function enrollment()
    {
        return Inertia::render('Admin/Enrollment', [
            'schoolYears' => SchoolYear::orderByDesc('is_active')->orderByDesc('id')->get(),
            'gradeLevels' => GradeLevel::orderByRaw("CAST(SUBSTRING(name, 7) AS UNSIGNED) ASC")->get(),
            'sections' => Section::orderBy('name')->get(),
            'students' => Student::with(['guardian','gradeLevel','section','schoolYear'])->get(),
        ]);
    }

    public function enrollmentData($schoolYearId)
    {
        $schoolYear = SchoolYear::findOrFail($schoolYearId);
        $students = Student::with(['guardian','gradeLevel','section'])
            ->where('school_year_id', $schoolYear->id)
            ->get();

        // Fallback: if no students yet in selected school year, display from most recent previous school year
        if ($students->isEmpty()) {
            $prevSY = SchoolYear::where('id', '<', $schoolYear->id)->orderByDesc('id')->first();
            if ($prevSY) {
                $students = Student::with(['guardian','gradeLevel','section'])
                    ->where('school_year_id', $prevSY->id)
                    ->get();
            }
        }

        return response()->json([
            'schoolYear' => $schoolYear,
            'students' => $students,
        ]);
    }

    public function finalizeEnrollment(Request $request)
    {
        $data = $request->validate([
            'assignments' => 'required|array|min:1',
            'assignments.*.student_id' => 'required|exists:students,id',
            'assignments.*.grade_level_id' => 'required|exists:grade_levels,id',
            'assignments.*.section_id' => 'nullable|exists:sections,id',
            'assignments.*.school_year_id' => 'required|exists:school_years,id',
        ]);

        // Prepare students map and group by guardian for sibling rule ordering
        $students = Student::whereIn('id', collect($data['assignments'])->pluck('student_id'))->get()->keyBy('id');
        $assignmentsByGuardian = collect($data['assignments'])->groupBy(function ($a) use ($students) {
            $s = $students[$a['student_id']] ?? null;
            return $s ? $s->guardian_id : null;
        });

        DB::transaction(function () use ($assignmentsByGuardian, $students) {
            foreach ($assignmentsByGuardian as $guardianId => $assignments) {
                // Determine existing count of students already in the target school year per guardian
                // Exclude the current batch's student IDs for that school year so the first student of this batch
                // correctly receives the full contribution and subsequent siblings receive mandatory-only.
                $byTargetYear = [];
                // Collect batch student IDs per target school year for this guardian
                $batchIdsByYear = [];
                foreach ($assignments as $a) {
                    $sid = (int) $a['student_id'];
                    $targetSY = (int) $a['school_year_id'];
                    if (!isset($batchIdsByYear[$targetSY])) {
                        $batchIdsByYear[$targetSY] = [];
                    }
                    $batchIdsByYear[$targetSY][] = $sid;
                }
                foreach ($batchIdsByYear as $targetSY => $batchIds) {
                    $existingCount = Student::where('guardian_id', $guardianId)
                        ->where('school_year_id', (int) $targetSY)
                        ->whereNotIn('id', $batchIds)
                        ->count();
                    $byTargetYear[$targetSY] = $existingCount;
                }

                // Stable order by student id
                $ordered = collect($assignments)->sortBy('student_id')->values();

                foreach ($ordered as $a) {
                    $student = $students[$a['student_id']] ?? null;
                    if (!$student) continue;

                    $targetSY = (int) $a['school_year_id'];
                    $targetGradeId = (int) $a['grade_level_id'];
                    $targetSectionId = $a['section_id'] ?? null;

                    // Carry-over from last year only if moving to a different school year
                    $carryOver = 0.0;
                    $movingToNewYear = (int) $student->school_year_id !== $targetSY;
                    if ($movingToNewYear) {
                        $carryOver = (float) ($student->balance ?? 0) + (float) ($student->contribution_balance ?? 0);
                    }

                    // Compute new contribution balance for target grade/year
                    $syContrib = SchoolYearContribution::with('contribution')
                        ->where('school_year_id', $targetSY)
                        ->where('grade_level_id', $targetGradeId)
                        ->get();

                    // Determine sibling rule based on per-guardian count for that target year
                    $currentCount = $byTargetYear[$targetSY] ?? 0; // students already in target SY before this assignment
                    $isFirstForGuardianThisYear = ($currentCount === 0);

                    $newContributionBalance = $syContrib->filter(function ($syc) use ($isFirstForGuardianThisYear) {
                        if ($isFirstForGuardianThisYear) return true; // first student pays all
                        return (bool) optional($syc->contribution)->mandatory === true; // others mandatory only
                    })->sum(function ($syc) {
                        return (float) ($syc->total_amount ?? optional($syc->contribution)->amount ?? 0);
                    });

                    if ($movingToNewYear) {
                        // Clone the student so previous school year record remains intact
                        $newStudent = $student->replicate();
                        $newStudent->grade_level_id = $targetGradeId;
                        $newStudent->section_id = $targetSectionId ?: null;
                        $newStudent->school_year_id = $targetSY;
                        $newStudent->balance = $carryOver;
                        $newStudent->contribution_balance = $newContributionBalance;
                        $newStudent->status = 'active';
                        $newStudent->save();

                        // Mark previous year's row as inactive to signal it belongs to an archived year
                        $student->status = 'inactive';
                        $student->archived = 0;
                        $student->save();
                    } else {
                        // Same school year → update the existing row
                        $student->grade_level_id = $targetGradeId;
                        $student->section_id = $targetSectionId ?: null;
                        $student->balance = $carryOver > 0 ? $carryOver : $student->balance;
                        $student->contribution_balance = $newContributionBalance;
                        $student->school_year_id = $targetSY;
                        $student->status = $student->status ?: 'active';
                        $student->save();
                    }

                    // Increment guardian's count for this year for next siblings
                    $byTargetYear[$targetSY] = ($byTargetYear[$targetSY] ?? 0) + 1;
                }
            }
        });

        return response()->json(['success' => true]);
    }

    public function assignContributions(Request $request)
    {
        $validated = $request->validate([
            'school_year_id' => 'required|exists:school_years,id',
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'required|exists:students,id',
        ]);

        $schoolYearId = (int) $validated['school_year_id'];
        $students = Student::whereIn('id', $validated['student_ids'])->get();

        // Preserve the request order for sibling waiver
        $orderIndex = [];
        foreach ($validated['student_ids'] as $pos => $sid) {   
            $orderIndex[(int)$sid] = $pos;
        }

        $byGuardian = $students->groupBy('guardian_id');

        DB::transaction(function () use ($byGuardian, $schoolYearId, $orderIndex) {
            foreach ($byGuardian as $guardianId => $group) {
                // IDs of students being processed for this guardian
                $batchIds = $group->pluck('id')->all();
                // Existing count EXCLUDING the current batch
                $existingCount = Student::where('guardian_id', $guardianId)
                    ->where('school_year_id', $schoolYearId)
                    ->where('archived', 1)
                    ->where('status', 'active')
                    ->whereNotIn('id', $batchIds)
                    ->count();

                // Order students by their position in the request payload
                $ordered = $group->sortBy(function ($s) use ($orderIndex) {
                    return $orderIndex[(int)$s->id] ?? PHP_INT_MAX;
                })->values();
                // Running counter to ensure first-in-batch gets full
                $currentCount = $existingCount;
                foreach ($ordered as $index => $student) {
                    $syc = SchoolYearContribution::with('contribution')
                        ->where('school_year_id', $schoolYearId)
                        ->where('grade_level_id', $student->grade_level_id)
                        ->get();

                    $isFirstForYear = ($currentCount === 0);

                    $amount = $syc->filter(function ($c) use ($isFirstForYear) {
                        if ($isFirstForYear) return true; // first student pays all
                        return (bool) optional($c->contribution)->mandatory === true; // siblings mandatory only
                    })->sum(function ($c) {
                        return (float) ($c->total_amount ?? optional($c->contribution)->amount ?? 0);
                    });

                    $student->contribution_balance = $amount;
                    $student->school_year_id = $schoolYearId;
                    $student->save();

                    $currentCount++;
                }
            }
        });

        return response()->json(['success' => true]);
    }

    public function assignContributionsByGrade(Request $request)
    {
        $validated = $request->validate([
            'school_year_id' => 'required|exists:school_years,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
        ]);

        $schoolYearId = (int) $validated['school_year_id'];
        $gradeLevelId = (int) $validated['grade_level_id'];

        $students = Student::where('school_year_id', $schoolYearId)
            ->where('grade_level_id', $gradeLevelId)
            ->get();

        $byGuardian = $students->groupBy('guardian_id');

        DB::transaction(function () use ($byGuardian, $schoolYearId, $gradeLevelId) {
            foreach ($byGuardian as $guardianId => $group) {
                // IDs of students being processed for this guardian
                $batchIds = $group->pluck('id')->all();
                // Existing count EXCLUDING the current batch
                $existingCount = Student::where('guardian_id', $guardianId)
                    ->where('school_year_id', $schoolYearId)
                    ->where('archived', 1)
                    ->where('status', 'active')
                    ->whereNotIn('id', $batchIds)
                    ->count();
                // For grade-wide assignment, keep a stable order by id per guardian
                $ordered = $group->sortBy('id')->values();
                $currentCount = $existingCount;
                foreach ($ordered as $index => $student) {
                    $syc = SchoolYearContribution::with('contribution')
                        ->where('school_year_id', $schoolYearId)
                        ->where('grade_level_id', $gradeLevelId)
                        ->get();

                    $isFirstForYear = ($currentCount === 0);

                    $amount = $syc->filter(function ($c) use ($isFirstForYear) {
                        if ($isFirstForYear) return true; // first student pays all
                        return (bool) optional($c->contribution)->mandatory === true; // siblings mandatory only
                    })->sum(function ($c) {
                        return (float) ($c->total_amount ?? optional($c->contribution)->amount ?? 0);
                    });

                    $student->contribution_balance = $amount;
                    $student->save();

                    $currentCount++;
                }
            }
        });

        return response()->json(['success' => true]);
    }

    // Show Admin Profile
public function showProfile()
{
    $user = Auth::user();
    return Inertia::render('Admin/AdminProfile', [
        'auth' => ['user' => $user]
    ]);
}

// Update Admin Profile (name, email)
public function updateProfile(Request $request)
{
    $user = Auth::user();

    $validated = $request->validate([
        'first_name' => 'required|string|max:255',
        'last_name' => 'required|string|max:255',
        'email' => 'required|email|max:255|unique:users,email,' . $user->id,
    ]);

    $user->update($validated);

    return back()->with('success', 'Profile updated successfully.');
}

public function sendTextbeltSms(Request $request)
{
    $request->validate([
        'number' => 'required|string',
        'message' => 'required|string|max:160',
    ]);

    $number = $request->input('number');
    $message = $request->input('message');

    $response = Http::post('https://textbelt.com/text', [
        'phone' => $number,
        'message' => $message,
        'key' => 'textbelt', // Free tier
    ]);

    $data = $response->json();

    if ($data['success']) {
        return response()->json([
            'success' => true,
            'message' => 'SMS sent successfully!'
        ]);
    }

    return response()->json([
        'success' => false,
        'message' => $data['error'] ?? 'Failed to send SMS'
    ], 500);
}
// Change Password

}