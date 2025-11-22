<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'username' => 'admin',
                'password' => Hash::make('admin11'),
                'role' => 'admin',
                'status' => 'active',
                'archived' => 1,
            ]
        );
    }
}
