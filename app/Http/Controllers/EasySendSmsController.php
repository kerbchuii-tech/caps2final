<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\EasySendSMSService;

class EasySendSmsController extends Controller
{
    protected $smsService;

    public function __construct(EasySendSMSService $smsService)
    {
        $this->smsService = $smsService;
    }

    public function send(Request $request)
    {
        // Log incoming request for debugging
        \Log::info('SMS Request:', $request->all());

        // Validation
        $request->validate([
            'number' => 'required|regex:/^\+?\d+$/',
            'message' => 'required|string|max:1600',
        ], [
            'number.required' => 'Recipient number is required.',
            'number.regex' => 'Invalid phone number format. Include country code if necessary.',
            'message.required' => 'Message cannot be empty.',
            'message.max' => 'Message is too long (max 1600 characters).',
        ]);

        try {
            $response = $this->smsService->sendSMS($request->number, $request->message);

            if (!empty($response['success']) && $response['success']) {
                return response()->json(['success' => true]);
            }

            return response()->json([
                'success' => false,
                'message' => $response['error'] ?? 'SMS sending failed.'
            ], 500);

        } catch (\Exception $e) {
            \Log::error('SMS Error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to send SMS. ' . $e->getMessage(),
            ], 500);
        }
    }
}
