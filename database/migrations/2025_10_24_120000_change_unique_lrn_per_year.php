<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Drop global unique index on `lrn` if it exists
        try {
            Schema::table('students', function (Blueprint $table) {
                $table->dropUnique('students_lrn_unique');
            });
        } catch (\Throwable $e) {
            // Some MySQL setups may use a different index name; try raw SQL as fallback
            try { DB::statement('ALTER TABLE `students` DROP INDEX `students_lrn_unique`'); } catch (\Throwable $e2) {}
        }

        // Add composite unique on (lrn, school_year_id)
        Schema::table('students', function (Blueprint $table) {
            // Ensure school_year_id exists before creating composite index
            if (!Schema::hasColumn('students', 'school_year_id')) return;
            $table->unique(['lrn', 'school_year_id'], 'students_lrn_school_year_unique');
        });
    }

    public function down(): void
    {
        // Drop composite unique
        try {
            Schema::table('students', function (Blueprint $table) {
                $table->dropUnique('students_lrn_school_year_unique');
            });
        } catch (\Throwable $e) {
            try { DB::statement('ALTER TABLE `students` DROP INDEX `students_lrn_school_year_unique`'); } catch (\Throwable $e2) {}
        }

        // Restore global unique on lrn
        Schema::table('students', function (Blueprint $table) {
            if (Schema::hasColumn('students', 'lrn')) {
                $table->unique('lrn');
            }
        });
    }
};
