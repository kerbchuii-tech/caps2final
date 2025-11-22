<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        if ($request->expectsJson()) {
            return null;
        }

        // Redirect admin area to the admin login page
        if ($request->is('admin') || $request->is('admin/*')) {
            return route('admin.login');
        }

        // Redirect treasurer area to the treasurer login page
        if ($request->is('treasurer') || $request->is('treasurer/*')) {
            return route('treasurer.login');
        }

        // Redirect guardian area to the guardian login page
        if ($request->is('guardian') || $request->is('guardian/*')) {
            return route('guardian.login');
        }

        // Redirect auditor area to the auditor login page
        if ($request->is('auditor') || $request->is('auditor/*')) {
            return route('auditor.login');
        }

        // Fallback to the default login route
        return route('login');
    }
}
