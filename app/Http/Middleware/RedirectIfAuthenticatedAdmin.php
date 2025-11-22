<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RedirectIfAuthenticatedAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $adminGuard = Auth::guard('admin');

        if ($adminGuard->check()) {
            return redirect()->route('admin.dashboard');
        }

        return $next($request);
    }
}
