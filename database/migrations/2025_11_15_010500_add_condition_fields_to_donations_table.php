<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            if (!Schema::hasColumn('donations', 'usable_quantity')) {
                $table->decimal('usable_quantity', 12, 2)->nullable()->after('donation_quantity');
            }
            if (!Schema::hasColumn('donations', 'damaged_quantity')) {
                $table->decimal('damaged_quantity', 12, 2)->nullable()->after('usable_quantity');
            }
            if (!Schema::hasColumn('donations', 'unusable_quantity')) {
                $table->decimal('unusable_quantity', 12, 2)->nullable()->after('damaged_quantity');
            }
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            if (Schema::hasColumn('donations', 'usable_quantity')) {
                $table->dropColumn('usable_quantity');
            }
            if (Schema::hasColumn('donations', 'damaged_quantity')) {
                $table->dropColumn('damaged_quantity');
            }
            if (Schema::hasColumn('donations', 'unusable_quantity')) {
                $table->dropColumn('unusable_quantity');
            }
        });
    }
};
