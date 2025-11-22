<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('payments', 'school_year_id')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->unsignedBigInteger('school_year_id')->nullable()->after('contribution_id');
                $table->foreign('school_year_id')->references('id')->on('school_years')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('payments', 'school_year_id')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropForeign(['school_year_id']);
                $table->dropColumn('school_year_id');
            });
        }
    }
};
