<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('funds_histories', function (Blueprint $table) {
            $table->id();

            // Link to Fund
            $table->foreignId('fund_id')
                  ->constrained('funds')
                  ->cascadeOnDelete();

            // Optional references to related tables
            $table->foreignId('donation_id')
                  ->nullable()
                  ->constrained('donations')
                  ->nullOnDelete();

            $table->foreignId('payment_id')
                  ->nullable()
                  ->constrained('payments')
                  ->nullOnDelete();

            $table->foreignId('expense_id')
                  ->nullable()
                  ->constrained('expenses')
                  ->nullOnDelete();

            $table->date('fund_date');
            $table->text('fund_description')->nullable();

            $table->decimal('amount', 10, 2);
            $table->decimal('balance_before', 10, 2);
            $table->decimal('balance_after', 10, 2);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('funds_histories');
    }
};
