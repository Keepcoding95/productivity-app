<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            // Kanban + complete/incomplete: todo | in_progress | review | done
            $table->string('status', 30)->default('todo');
            $table->date('due_date')->nullable();
            $table->time('due_time')->nullable();
            // Estimated time to complete, in minutes (for time-based filtering)
            $table->unsignedInteger('estimated_duration')->nullable();
            // Required energy for the task: low | medium | high (for EnergySelector + filtering)
            $table->string('energy_level', 20)->nullable();
            // Order within Kanban column / list (drag & drop)
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        
            // Indexes for filtering by user+status and user+due_date (dashboard, lists)
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'due_date']);
            $table->index(['project_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
