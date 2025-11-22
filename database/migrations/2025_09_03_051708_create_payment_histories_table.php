<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payment_histories', function (Blueprint $table) {
            $table->id();

            // Foreign keys
            $table->unsignedBigInteger('payment_id');
            $table->unsignedBigInteger('school_year_contribution_id');

            // Payment details
            $table->decimal('amount_paid', 10, 2);
            $table->date('payment_date');

            // Balance tracking
            $table->decimal('balance_before', 10, 2)->default(0);
            $table->decimal('balance_after', 10, 2)->default(0);

            $table->timestamps();

            // Foreign key constraints
            $table->foreign('payment_id')
                  ->references('id')
                  ->on('payments')
                  ->onDelete('cascade');

            $table->foreign('school_year_contribution_id')
                  ->references('id')
                  ->on('school_year_contributions')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_histories');
    }
};
