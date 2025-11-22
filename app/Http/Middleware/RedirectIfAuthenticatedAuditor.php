<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RedirectIfAuthenticatedAuditor
{
    public function handle(Request $request, Closure $next)
    {
        if (Auth::guard('auditor')->check()) {
            return redirect()->route('auditor.dashboard');
        }

        return $next($request);
    }
}
