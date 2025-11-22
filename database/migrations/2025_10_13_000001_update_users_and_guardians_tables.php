<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'email')) {
                $table->string('email')->unique()->nullable();
            }
            if (!Schema::hasColumn('users', 'contact_number')) {
                $table->string('contact_number', 20)->nullable();
            }
            if (!Schema::hasColumn('users', 'address')) {
                $table->string('address', 255)->nullable();
            }
            if (!Schema::hasColumn('users', 'middle_name')) {
                $table->string('middle_name', 50)->nullable();
            }
        });

        Schema::table('guardians', function (Blueprint $table) {
            if (!Schema::hasColumn('guardians', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            }
            if (Schema::hasColumn('guardians', 'contact_number')) {
                $table->string('contact_number', 20)->change();
            }
            if (Schema::hasColumn('guardians', 'address')) {
                $table->string('address', 255)->change();
            }
            if (!Schema::hasColumn('guardians', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('guardians', function (Blueprint $table) {
            if (Schema::hasColumn('guardians', 'created_by')) {
                $table->dropConstrainedForeignId('created_by');
            }
            if (Schema::hasColumn('guardians', 'user_id')) {
                $table->dropConstrainedForeignId('user_id');
            }
            if (Schema::hasColumn('guardians', 'contact_number')) {
                $table->string('contact_number', 50)->change();
            }
            if (Schema::hasColumn('guardians', 'address')) {
                $table->string('address', 50)->change();
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'middle_name')) {
                $table->dropColumn('middle_name');
            }
            if (Schema::hasColumn('users', 'address')) {
                $table->dropColumn('address');
            }
            if (Schema::hasColumn('users', 'contact_number')) {
                $table->dropColumn('contact_number');
            }
            if (Schema::hasColumn('users', 'email')) {
                $table->dropColumn('email');
            }
        });
    }
};
