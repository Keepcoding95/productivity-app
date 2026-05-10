<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;

/**
 * Full API access without a verified inbox when running locally (no mail server).
 * Production and testing environments still use Laravel's normal verified gate.
 */
class VerifyEmailUnlessLocal extends EnsureEmailIsVerified
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle($request, Closure $next, $redirectToRoute = null)
    {
        if (app()->isLocal()) {
            return $next($request);
        }

        return parent::handle($request, $next, $redirectToRoute);
    }
}
