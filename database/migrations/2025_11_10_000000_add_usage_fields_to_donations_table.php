<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->string('usage_status')->nullable()->after('donation_description');
            $table->string('usage_location')->nullable()->after('usage_status');
            $table->text('usage_notes')->nullable()->after('usage_location');
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->dropColumn(['usage_status', 'usage_location', 'usage_notes']);
        });
    }
};
