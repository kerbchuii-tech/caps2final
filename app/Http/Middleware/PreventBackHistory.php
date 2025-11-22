<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PreventBackHistory
{
    public function handle(Request $request, Closure $next)
    {
        $path = $request->path();

        $dashboardRoute = match (true) {
            $request->is('admin/login', 'admin/register') && Auth::guard('admin')->check() => 'admin.dashboard',
            $request->is('treasurer/login') && Auth::guard('treasurer')->check() => 'treasurer.dashboard',
            $request->is('guardian/login') && Auth::guard('guardian')->check() => 'guardian.dashboard',
            $request->is('auditor/login') && Auth::guard('auditor')->check() => 'auditor.dashboard',
            default => null,
        };

        if ($dashboardRoute) {
            return redirect()->route($dashboardRoute);
        }

        $response = $next($request);

        if (method_exists($response, 'headers')) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', 'Sat, 01 Jan 2000 00:00:00 GMT');
        }

        return $response;
    }
}
