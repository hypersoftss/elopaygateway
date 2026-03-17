<?php

use App\Http\Controllers\EloPayController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| ELOPAY Payment Routes
|--------------------------------------------------------------------------
|
| Add these routes to your routes/web.php file.
| Make sure to exclude callback routes from CSRF verification.
|
*/

// Pay-in
Route::post('/elopay/payin', [EloPayController::class, 'createPayin'])->name('elopay.payin');

// Callbacks (exclude from CSRF in VerifyCsrfToken middleware)
Route::post('/elopay/callback/payin',  [EloPayController::class, 'payinCallback'])->name('elopay.callback.payin');
Route::post('/elopay/callback/payout', [EloPayController::class, 'payoutCallback'])->name('elopay.callback.payout');

// Payout
Route::post('/elopay/payout', [EloPayController::class, 'createPayout'])->name('elopay.payout');
