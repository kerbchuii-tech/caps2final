<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donations', function (Blueprint $table) {
            $table->id();

            $table->string('donated_by'); // who donated
            $table->enum('donation_type', ['cash', 'in-kind']); // type of donation
            $table->decimal('donation_amount', 10, 2)->default(0); // cash value or estimated value
            $table->date('donation_date'); // when donation was given
            $table->text('donation_description')->nullable(); // details/remarks
            $table->string('received_by'); // who received the donation

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};
