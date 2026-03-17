<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\EloPayService;

class EloPayServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->mergeConfigFrom(
            __DIR__ . '/../config/elopay.php', 'elopay'
        );

        $this->app->singleton(EloPayService::class, function ($app) {
            return new EloPayService(config('elopay'));
        });
    }

    public function boot()
    {
        $this->publishes([
            __DIR__ . '/../config/elopay.php' => config_path('elopay.php'),
        ], 'elopay-config');
    }
}
