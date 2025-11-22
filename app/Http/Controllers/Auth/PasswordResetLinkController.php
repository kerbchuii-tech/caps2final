<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => [
                'required',
                'email',
                function ($attribute, $value, $fail) {
                    if (!preg_match('/^[\w.+-]+@(gmail\.com|yahoo\.com)$/i', $value)) {
                        $fail(__('validation.regex', ['attribute' => $attribute]));
                    }
                },
            ],
        ]);

        $user = User::where('email', $request->email)->first();
        $redirect = match (optional($user)->role) {
            'guardian' => 'guardian',
            'admin' => 'admin',
            'auditor' => 'auditor',
            default => 'treasurer',
        };

        ResetPassword::createUrlUsing(function ($notifiable, string $token) use ($redirect) {
            return url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
                'redirect' => $redirect,
            ], false));
        });

        try {
            $status = Password::sendResetLink(
                $request->only('email')
            );
        } finally {
            ResetPassword::createUrlUsing(null);
        }

        if ($status == Password::RESET_LINK_SENT) {
            return back()->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }
}
