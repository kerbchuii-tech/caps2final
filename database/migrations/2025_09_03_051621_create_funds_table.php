<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('funds', function (Blueprint $table) {
            $table->id();
            $table->string('month', 7); // e.g. "2025-09"
            $table->decimal('total_payments', 12, 2)->default(0);
            $table->decimal('total_donations', 12, 2)->default(0);
            $table->decimal('total_in_kind', 12, 2)->default(0); // ✅ added here
            $table->decimal('total_expenses', 12, 2)->default(0);
            $table->decimal('total_funds', 12, 2)->default(0);
            $table->timestamps();

            $table->unique('month'); // ✅ ensure 1 record per month
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('funds');
    }
};
