<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateSchoolYearContributionsTable extends Migration
{
    public function up(): void
    {
        Schema::create('school_year_contributions', function (Blueprint $table) {
            $table->id();

            // 🔹 Foreign key to school_years
            $table->foreignId('school_year_id')
                ->constrained('school_years')
                ->cascadeOnDelete();

            // 🔹 Foreign key to grade_levels
            $table->foreignId('grade_level_id')
                ->constrained('grade_levels')
                ->cascadeOnDelete();

            // 🔹 Foreign key to contributions (contribution types)
            $table->foreignId('contribution_id')
                ->constrained('contributions')
                ->cascadeOnDelete();

            // 🔹 Total Balance instead of just amount
            $table->decimal('total_amount', 10, 2);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_year_contributions');
    }
}
