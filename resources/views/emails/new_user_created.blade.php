<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your New Account</title>
    <style>
        body {
            font-family: 'Inter', 'Segoe UI', sans-serif;
            background: #f4f6f8;
            margin: 0;
            padding: 30px 12px;
            color: #1f2937;
        }
        .container {
            max-width: 640px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
            border: 1px solid #e5e7eb;
        }
        .header {
            background: #0f172a;
            color: #f8fafc;
            padding: 28px 32px;
            border-radius: 16px 16px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }
        .body {
            padding: 32px;
        }
        p {
            margin: 0 0 16px;
            font-size: 16px;
            line-height: 1.6;
            color: #333333;
        }
        .details {
            margin: 24px 0;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 16px 20px;
            background: #fdfdfd;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 9px 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 15px;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 12px;
            color: #666666;
            color: #6b7280;
        }
        .detail-value {
            font-weight: 600;
            color: #111827;
            font-size: 15px;
        }
        .button-wrapper {
            text-align: center;
            margin-top: 30px;
        }
        a.button {
            display: inline-block;
            padding: 13px 30px;
            border-radius: 8px;
            background: #1d4ed8;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            letter-spacing: 0.03em;
        }
        .support-note {
            margin-top: 28px;
            padding: 16px 18px;
            border-left: 3px solid #1d4ed8;
            background: #f6f7fb;
            color: #1f2937;
            font-size: 14px;
        }
        .footer {
            padding: 24px 32px 32px;
            text-align: center;
            font-size: 13px;
            color: #94a3b8;
            border-top: 1px solid #e5e7eb;
        }
        @media only screen and (max-width: 620px) {
            .header, .body, .footer {
                padding: 24px;
            }
            .detail-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SPTA ACCOUNT NOTICE</h1>
        </div>

        <div class="body">
            <p>Dear {{ $user->first_name ?? 'Client' }},</p>
            <p>This message confirms that your credentials for the SPTA Portal have been issued. Please review the information below and sign in at your earliest convenience.</p>

            <div class="details">
                <div class="detail-row">
                    <div class="detail-label">Username </div>
                    <div class="detail-value">{{ $user->username }}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Temporary Password </div>
                    <div class="detail-value">{{ $password }}</div>
                </div>
            </div>

            <div class="support-note">
                For security, change the temporary password immediately after logging in. If you did not request or expect this account, contact the SPTA Support Desk at once.
            </div>

             <div class="button-wrapper">
                <a href="{{ $loginUrl }}" class="button">Proceed to Portal</a>
            </div>

            <p style="margin-top:24px;">Sincerely,<br>SPTA Admin</p>
        </div>

        <div class="footer">
            This email was sent automatically by the SPTA system. Please do not reply.
        </div>
    </div>
</body>
</html>
