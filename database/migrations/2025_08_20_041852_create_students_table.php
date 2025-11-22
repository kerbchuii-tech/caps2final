<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();

            // Guardian FK
            $table->unsignedBigInteger('guardian_id');

            // Grade Level FK
            $table->foreignId('grade_level_id')
                ->constrained('grade_levels')
                ->cascadeOnDelete();

            // Section FK
            $table->foreignId('section_id')
                ->constrained('sections')
                ->cascadeOnDelete();

            // School Year FK
            $table->foreignId('school_year_id')
                ->constrained('school_years')
                ->cascadeOnDelete();

            $table->string('lrn', 50)->unique();
            $table->string('first_name', 50);
            $table->string('middle_name', 50)->nullable();
            $table->string('last_name', 50);

            $table->decimal('balance', 10, 2)->default(0);               // General balance
            $table->decimal('contribution_balance', 10, 2)->default(0);  // Contribution balance

            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->boolean('archived')->default(1); // 1 = not archived, 0 = archived
            $table->timestamps();

            // Guardian FK constraint
            $table->foreign('guardian_id')
                ->references('id')
                ->on('guardians')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
