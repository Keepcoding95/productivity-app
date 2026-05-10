<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dedupe deadline reminders at DB level (concurrent command runs).
     * reminder_calendar_date stores the task's due date (the calendar day the reminder is about).
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('reminder_kind', 20)->nullable()->after('message');
            $table->date('reminder_calendar_date')->nullable()->after('reminder_kind');

            $table->unique(
                ['task_id', 'type', 'reminder_kind', 'reminder_calendar_date'],
                'notifications_deadline_reminder_dedupe',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropUnique('notifications_deadline_reminder_dedupe');
            $table->dropColumn(['reminder_kind', 'reminder_calendar_date']);
        });
    }
};
