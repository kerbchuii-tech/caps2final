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
        // Create users table
    Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('first_name', 50);   // 🔹 VARCHAR(50)
    $table->string('last_name', 50);    // 🔹 VARCHAR(50)
    $table->string('username', 100)->unique(); // 🔹 VARCHAR(50)
    $table->string('password', 100);     // 🔹 VARCHAR(50)
    $table->enum('role', ['admin', 'treasurer', 'auditor', 'guardian']); // added guardian
    $table->enum('status', ['active', 'inactive'])->default('active');   // Active/Inactive status
    $table->boolean('archived')->default(1); // 1 = not archived, 0 = archived
    $table->rememberToken();
    $table->timestamps();
});




        // Create password_reset_tokens table
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Create sessions table
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
