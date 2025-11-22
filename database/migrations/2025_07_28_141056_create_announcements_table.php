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
    Schema::create('announcements', function (Blueprint $table) {
    $table->id();
    $table->string('title', 100); // 🔹 VARCHAR(100) instead of 255
    $table->text('message');
    $table->date('announcement_date');
    $table->enum('type', ['general', 'urgent'])->default('general');
    $table->unsignedBigInteger('created_by'); // ✅ Linked to users table
    $table->boolean('is_archived')->default(false);
    $table->timestamps();

    $table->foreign('created_by')
          ->references('id')
          ->on('users')
          ->onDelete('cascade');
});

}



    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
