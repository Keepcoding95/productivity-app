<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthEmailAndPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_sends_email_verification_notification(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Tester',
            'email' => 'verify-me@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated();
        $user = User::where('email', 'verify-me@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_signed_verification_link_marks_email_verified(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addHour(),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ],
        );

        $this->get($url)->assertRedirect();

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_forgot_password_sends_reset_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_forgot_password_returns_ok_for_unknown_email(): void
    {
        Notification::fake();

        $this->postJson('/api/forgot-password', [
            'email' => 'nobody@example.com',
        ])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_reset_password_changes_password(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'password' => bcrypt('old-password'),
        ]);

        $this->postJson('/api/forgot-password', ['email' => $user->email]);

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $n) use (&$token) {
            $token = $n->token;

            return true;
        });

        $this->assertNotNull($token);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk();

        $user->refresh();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('new-password-123', $user->password));
    }

    public function test_authenticated_user_can_resend_verification(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/email/verification-notification')->assertOk();

        Notification::assertSentTo($user, VerifyEmail::class);
    }
}
