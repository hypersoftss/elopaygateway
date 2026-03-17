# ELOPAY Laravel Integration Kit

## Quick Setup (5 Minutes)

### Step 1: Copy Files
```
├── app/
│   ├── Http/Controllers/EloPayController.php
│   ├── Providers/EloPayServiceProvider.php
│   └── Services/EloPayService.php
├── config/
│   └── elopay.php
```

### Step 2: Add to .env
```env
ELOPAY_MERCHANT_ID=YOUR_MERCHANT_ID
ELOPAY_API_KEY=YOUR_API_KEY
ELOPAY_PAYOUT_KEY=YOUR_PAYOUT_KEY
ELOPAY_TRADE_TYPE=INRUPI
ELOPAY_CURRENCY=INR
ELOPAY_CALLBACK_URL=https://yourdomain.com/elopay/callback/payin
ELOPAY_RETURN_URL=https://yourdomain.com/payment/success
```

### Step 3: Register Provider
Add to `config/app.php` → `providers`:
```php
App\Providers\EloPayServiceProvider::class,
```

### Step 4: Add Routes
Add the contents of `routes.php` to your `routes/web.php`.

### Step 5: CSRF Exclusion
In `app/Http/Middleware/VerifyCsrfToken.php`:
```php
protected $except = [
    'elopay/callback/*',
];
```

### Step 6: Use in Blade
```html
<form action="{{ route('elopay.payin') }}" method="POST">
    @csrf
    <input type="hidden" name="order_no" value="ORD_{{ time() }}">
    <input type="number" name="amount" placeholder="Amount" required>
    <button type="submit">Pay Now</button>
</form>
```

## That's it! 🎉
