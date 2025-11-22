<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop existing foreign keys first
        Schema::table('students', function (Blueprint $table) {
            try { $table->dropForeign(['guardian_id']); } catch (\Throwable $e) {}
            try { $table->dropForeign(['section_id']); } catch (\Throwable $e) {}
        });

        // Make columns nullable (raw SQL to avoid requiring doctrine/dbal)
        DB::statement('ALTER TABLE `students` MODIFY `guardian_id` BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE `students` MODIFY `section_id` BIGINT UNSIGNED NULL');

        // Recreate foreign keys with SET NULL on delete
        Schema::table('students', function (Blueprint $table) {
            $table->foreign('guardian_id')->references('id')->on('guardians')->nullOnDelete();
            $table->foreign('section_id')->references('id')->on('sections')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            try { $table->dropForeign(['guardian_id']); } catch (\Throwable $e) {}
            try { $table->dropForeign(['section_id']); } catch (\Throwable $e) {}
        });

        DB::statement('ALTER TABLE `students` MODIFY `guardian_id` BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE `students` MODIFY `section_id` BIGINT UNSIGNED NOT NULL');

        Schema::table('students', function (Blueprint $table) {
            $table->foreign('guardian_id')->references('id')->on('guardians')->cascadeOnDelete();
            $table->foreign('section_id')->references('id')->on('sections')->cascadeOnDelete();
        });
    }
};
