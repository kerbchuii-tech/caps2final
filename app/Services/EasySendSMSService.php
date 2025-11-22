<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class EasySendSMSService
{
    protected $username;
    protected $password;

    public function __construct()
    {
        $this->username = config('services.easysendsms.username');
        $this->password = config('services.easysendsms.password');
    }

    public function sendSMS($to, $message, $sender = null)
    {
        $response = Http::asForm()->post('https://api.easysendsms.com/sms/send', [
            'username' => $this->username,
            'password' => $this->password,
            'to' => $to,
            'message' => $message,
            'sender' => $sender,
        ]);

        return $response->json();
    }
}
