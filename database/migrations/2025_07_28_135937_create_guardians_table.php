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
        Schema::create('guardians', function (Blueprint $table) {
            $table->id();
            
            $table->string('first_name', 50);
            $table->string('middle_name', 50)->nullable();
            $table->string('last_name', 50);
            $table->string('contact_number', 50);
            $table->string('address', 50);
            $table->enum('status', ['active', 'inactive'])->default('active'); // Active/Inactive status
            $table->boolean('archived')->default(1); // 1 = not archived, 0 = archived

            // Relationship: who created this guardian (user_id)
            $table->unsignedBigInteger('created_by')->nullable();

            $table->timestamps();

            // Foreign key constraint
            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->nullOnDelete(); // if user deleted, set null
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guardians');
    }
};
