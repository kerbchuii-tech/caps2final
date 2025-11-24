<?php

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Middleware\RedirectIfAuthenticatedTreasurer;
use App\Http\Middleware\RedirectIfAuthenticatedGuardian;
use App\Http\Middleware\RedirectIfAuthenticatedAuditor;
use App\Http\Middleware\PreventBackHistory;

use App\Http\Controllers\AdminController;
use App\Http\Controllers\TreasurerController;
use App\Http\Controllers\TreasurerPasswordController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\GuardianController;
use App\Http\Controllers\AuditorController;

use App\Http\Controllers\EasySendSmsController;



/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// // Welcome Page
// Route::get('/', function () {
//     return Inertia::render('Welcome', [
//         'canLogin' => Route::has('login'),
//         'canRegister' => Route::has('register'),
//         'laravelVersion' => Application::VERSION,
//         'phpVersion' => PHP_VERSION,
//     ]);
// });

Route::get('/', function () {
    if (Auth::guard('treasurer')->check()) {
        return redirect()->route('treasurer.dashboard');
    }

    if (Auth::guard('guardian')->check()) {
        return redirect()->route('guardian.dashboard');
    }

    if (Auth::guard('auditor')->check()) {
        return redirect()->route('auditor.dashboard');
    }

    if (Auth::guard('admin')->check()) {
        return redirect()->route('admin.dashboard');
    }

    return redirect()->route('admin.login');
});

// ----------------------------
// Admin Authentication & Routes
// ----------------------------
Route::prefix('admin')->group(function () {
    // Login & Register
    Route::middleware(['guest:admin', PreventBackHistory::class])->group(function () {
        Route::get('login', [AdminController::class, 'showLogin'])->name('admin.login');
        Route::post('login', [AdminController::class, 'login'])->name('admin.login.post');
        Route::get('register', [AdminController::class, 'showRegister'])->name('admin.register');
        Route::post('register', [AdminController::class, 'register'])->name('admin.register.post');
    });

    // Authenticated Admin Routes
    Route::middleware('auth:admin')->name('admin.')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboardData'])->name('dashboard');
        Route::post('/logout', [AdminController::class, 'logout'])->name('logout');

        // Admin Profile
        Route::get('/profile', [AdminController::class, 'showProfile'])->name('profile');
        Route::put('/profile', [AdminController::class, 'updateProfile'])->name('profile.update');
        Route::put('/profile/password', [AdminController::class, 'updatePassword'])->name('profile.updatePassword');

        // Users
        Route::get('/manageusers', [AdminController::class, 'index'])->name('manageusers');
        Route::post('/users', [AdminController::class, 'store'])->name('users.store');
        Route::post('/users/{id}/toggle-status', [AdminController::class, 'toggleStatus'])->name('users.toggle-status');
        Route::post('/users/{id}/archive', [AdminController::class, 'archive'])->name('users.archive');
        Route::post('/users/{id}/restore', [AdminController::class, 'restore'])->name('users.restore');

        // Guardians
        Route::get('/addguardian', [AdminController::class, 'manageGuardians'])->name('guardians.index');
        Route::post('/guardians/store', [AdminController::class, 'storeGuardian'])->name('guardians.store');
        Route::put('/guardians/{id}', [AdminController::class, 'updateGuardian'])->name('guardians.update');
        Route::post('/guardians/{id}/toggle-status', [AdminController::class, 'toggleGuardianStatus'])->name('guardians.toggle-status');
        Route::post('/guardians/{id}/archive', [AdminController::class, 'archiveGuardian'])->name('guardians.archive');
        Route::post('/guardians/{id}/restore', [AdminController::class, 'restoreGuardian'])->name('guardians.restore');

        // Students
        Route::post('/students/store', [AdminController::class, 'storeStudent'])->name('students.store');
        Route::put('/students/{id}', [AdminController::class, 'updateStudent'])->name('students.update');
        Route::post('/students/{id}/toggle-status', [AdminController::class, 'toggleStudentStatus'])->name('students.toggle-status');
        Route::post('/students/{id}/archive', [AdminController::class, 'archiveStudent'])->name('students.archive');
        // Students Management
        Route::get('/imported-students', [AdminController::class, 'importedStudents'])->name('imported-students');
        Route::post('/students/import', [AdminController::class, 'importStudents'])->name('students.import');
        Route::post('/guardians/{id}/assign-students', [AdminController::class, 'assignStudentsToGuardian'])->name('guardians.assign-students');

        // Announcements
        Route::get('/announcement', [AdminController::class, 'indexs'])->name('announcement');
        Route::post('/announcement', [AdminController::class, 'stores'])->name('announcement.store');
        Route::put('/announcement/{id}', [AdminController::class, 'update'])->name('announcement.update');
        Route::post('/announcement/{id}/archive', [AdminController::class, 'archiveAnnouncement'])->name('announcement.archive');

        // Contributions
        Route::get('/contributions', [AdminController::class, 'indexss'])->name('contributions');
        Route::post('/contributions', [AdminController::class, 'storess'])->name('contributions.store');
        Route::put('/contributions/{id}', [AdminController::class, 'updateContribution'])->name('contributions.update');

        // Expenses
        Route::get('/expenses', [AdminController::class, 'listExpenses'])->name('expenses.index');
        Route::post('/expenses', [AdminController::class, 'saveExpense'])->name('expenses.store');

        // Reports (Admin)
        Route::get('/reports', [AdminController::class, 'reports'])->name('reports');

        // School Years
        Route::get('/schoolyear', [AdminController::class, 'listSchoolYears'])->name('schoolyear.list');
        Route::post('/schoolyear', [AdminController::class, 'saveSchoolYear'])->name('schoolyear.save');
       Route::put('/schoolyear/{id}/toggle-active', [AdminController::class, 'toggleActiveSchoolYear']);

        // Grade Levels & Sections
        Route::get('/gradelevel-section', [AdminController::class, 'gradeLevelAndSections'])->name('gradelevel-section');
        Route::get('/gradelevel/list', [AdminController::class, 'listGradeLevels'])->name('gradelevel.list');
        Route::get('/section/list', [AdminController::class, 'listSections'])->name('section.list');
        Route::post('/gradelevel/store', [AdminController::class, 'storeGradeLevel'])->name('gradelevel.store');
        Route::post('/section/store', [AdminController::class, 'storeSection'])->name('section.store');
        Route::put('/section/update/{id}', [AdminController::class, 'updateSection'])->name('section.update');
        Route::delete('/section/delete/{id}', [AdminController::class, 'deleteSection'])->name('section.delete');

        // School Year Contributions
        Route::get('/schoolyearcontributions', [AdminController::class, 'schoolYearContributions'])->name('schoolyearcontributions');
        Route::post('/schoolyearcontributions/store', [AdminController::class, 'storeSchoolYearContribution'])->name('schoolyearcontributions.store');
        Route::put('/schoolyearcontributions/{id}', [AdminController::class, 'updateSchoolYearContribution'])->name('schoolyearcontributions.update');
        Route::delete('/schoolyearcontributions/{id}', [AdminController::class, 'destroySchoolYearContribution'])->name('schoolyearcontributions.destroy');

        // // ✅ Archives route (FIXED)
        // Route::get('/archives', [AdminController::class, 'archives'])->name('admin.archives');
        Route::post('/admin/school-years/{id}/promote-students', [SchoolYearController::class, 'promoteStudents'])
    ->name('admin.school-years.promote');

        // Manual Enrollment
        Route::get('/enrollment', [AdminController::class, 'enrollment'])->name('enrollment.index');
        Route::get('/enrollment/{schoolYearId}/data', [AdminController::class, 'enrollmentData'])->name('enrollment.data');
        Route::post('/enrollment/finalize', [AdminController::class, 'finalizeEnrollment'])->name('enrollment.finalize');
        Route::post('/enrollment/assign-contributions', [AdminController::class, 'assignContributions'])->name('enrollment.assignContributions');
        Route::post('/enrollment/assign-contributions/grade', [AdminController::class, 'assignContributionsByGrade'])->name('enrollment.assignContributionsByGrade');

        // Extra Routes
        Route::get('/students/list', [AdminController::class, 'listStudents'])->name('students.list');
        Route::get('/guardians/search', [AdminController::class, 'search']);

        Route::post('/send-sms-easysend', [EasySendSmsController::class, 'send']);
    });
});



Route::prefix('admin')->name('admin.')->group(function() {
    Route::get('/records', [AdminController::class, 'record'])->name('records');
});





// ----------------------------
// Treasurer Authentication & Routes
// ----------------------------
Route::prefix('treasurer')->group(function () {
    // Login & Password Update
    Route::middleware([RedirectIfAuthenticatedTreasurer::class, 'guest:treasurer', PreventBackHistory::class])->group(function () {
        Route::get('/login', [TreasurerController::class, 'showLogin'])->name('treasurer.login');
        Route::post('/login', [TreasurerController::class, 'login'])->name('treasurer.login.post');
    });
    Route::post('/password/update', [TreasurerController::class, 'update'])->name('treasurer.password.update');

    // Authenticated Treasurer Routes
    Route::middleware('auth:treasurer')->name('treasurer.')->group(function () {
        Route::get('/dashboard', [TreasurerController::class, 'dashboard'])->name('dashboard');
        Route::post('/logout', [TreasurerController::class, 'logout'])->name('logout');

        // Treasurer Profile
        Route::get('/profile', [TreasurerController::class, 'showProfile'])->name('profile');
        Route::put('/profile/password', [TreasurerController::class, 'updatePassword'])->name('profile.updatePassword');

        // Payments
        Route::get('/payments', [TreasurerController::class, 'index'])->name('payments.index');
        Route::post('/payments', [TreasurerController::class, 'store'])->name('payments.store');

        // Donations
        Route::get('/donations', [TreasurerController::class, 'donations'])->name('donations');
        Route::post('/donations/store', [TreasurerController::class, 'storeDonation'])->name('donations.store');
        Route::put('/donations/{donation}/update-status', [TreasurerController::class, 'updateDonationStatus'])->name('donations.updateStatus');

        // Funds
        Route::get('/funds', [TreasurerController::class, 'overview'])->name('funds.overview');

        // Payment & Fund Histories
        Route::get('/payment-histories', [TreasurerController::class, 'paymentHistories'])->name('paymentHistories');
        Route::get('/funds-histories', [TreasurerController::class, 'fundsHistory'])->name('fundsHistories');
        Route::post('/funds-histories', [TreasurerController::class, 'storesss']);
        Route::put('/funds-histories/{id}', [TreasurerController::class, 'update']);
        Route::delete('/funds-histories/{id}', [TreasurerController::class, 'destroy']);
        
        // ✅ Fixed: plural "reports"
        Route::get('/reports', [TreasurerController::class, 'report'])->name('reports');
    });
});

Route::prefix('guardian')->group(function () {
    Route::middleware([RedirectIfAuthenticatedGuardian::class, 'guest:guardian', PreventBackHistory::class])->group(function () {
        Route::get('/login', [GuardianController::class, 'showLogin'])->name('guardian.login');
        Route::post('/login', [GuardianController::class, 'login'])->name('guardian.login.post');
    });

    Route::middleware('auth:guardian')->group(function () {
        Route::get('/dashboard', [GuardianController::class, 'dashboard'])->name('guardian.dashboard');
        // Guardian Profile
        Route::get('/profile', [GuardianController::class, 'showProfile'])->name('guardian.profile');
        Route::put('/profile/password', [GuardianController::class, 'updatePassword'])->name('guardian.profile.updatePassword');
        Route::get('/mystudents', [GuardianController::class, 'myStudents'])->name('guardian.mystudents');
        Route::get('/contributions', [GuardianController::class, 'contributions'])->name('guardian.contributions');
        Route::get('/reports', [GuardianController::class, 'reports'])->name('guardian.reports');
        Route::get('/announcements', [GuardianController::class, 'announcements'])->name('guardian.announcements');
        Route::post('/logout', [GuardianController::class, 'logout'])->name('guardian.logout');
    });
});

//auditor
Route::prefix('auditor')->group(function () {
    Route::middleware([RedirectIfAuthenticatedAuditor::class, 'guest:auditor', PreventBackHistory::class])->group(function () {
        Route::get('/login', [AuditorController::class, 'showLogin'])->name('auditor.login');
        Route::post('/login', [AuditorController::class, 'login'])->name('auditor.login.post');
    });

    Route::middleware('auth:auditor')->group(function () {
      Route::get('/dashboard', [AuditorController::class, 'dashboard'])->name('auditor.dashboard');
      // Auditor Profile
      Route::get('/profile', [AuditorController::class, 'showProfile'])->name('auditor.profile');
      Route::put('/profile/password', [AuditorController::class, 'updatePassword'])->name('auditor.profile.updatePassword');

      Route::get('/expenses', [AuditorController::class, 'expenses'])->name('auditor.expenses');
      Route::get('/funds', [AuditorController::class, 'funds'])->name('auditor.funds');
      Route::get('/reports', [AuditorController::class, 'reports'])->name('auditor.reports');
      Route::post('/logout', [AuditorController::class, 'logout'])->name('auditor.logout');
    });
});

Route::middleware('auth:admin')->group(function () {
    Route::get('/students/list', [AdminController::class, 'listStudents'])->name('students.list');
    Route::get('/guardians/search', [AdminController::class, 'search']);
});

require __DIR__.'/auth.php';