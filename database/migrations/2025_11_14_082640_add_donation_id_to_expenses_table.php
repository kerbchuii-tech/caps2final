<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (!Schema::hasColumn('expenses', 'donation_id')) {
                $table->unsignedBigInteger('donation_id')->nullable()->after('contribution_id');
                $table->foreign('donation_id')->references('id')->on('donations')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (Schema::hasColumn('expenses', 'donation_id')) {
                $table->dropForeign(['donation_id']);
                $table->dropColumn('donation_id');
            }
        });
    }
};
