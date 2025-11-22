<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ config('app.name') }} &mdash; Notification</title>
    <style>
        :root { color-scheme: light; }
        @media (prefers-color-scheme: dark) {
            body { background: #111827 !important; }
        }
        body {
            margin: 0;
            padding: 0;
            background: #e8eefc;
            font-family: 'Poppins', 'Segoe UI', Tahoma, sans-serif;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
        }
        table { border-collapse: collapse; }
        a { color: inherit; }
    </style>
</head>
<body>
@php
    $levelColor = [
        'success' => '#16a34a',
        'error' => '#dc2626',
        'info' => '#2563eb',
    ][$level ?? 'info'] ?? '#2563eb';
    $appName = config('app.name', 'Laravel');
    $appDisplayName = $appName === 'Laravel' ? 'SPTA Treasurer Portal' : $appName;
    $appUrl = config('app.url') ? rtrim(config('app.url'), '/') : null;
@endphp
    <table role="presentation" width="100%" style="padding: 44px 14px; background: linear-gradient(150deg,#e8eefc 0%,#dde3ff 45%,#e0f2fe 100%);">
        <tr>
            <td align="center">
                <table role="presentation" width="620" style="max-width:620px;background:#ffffff;border-radius:32px;overflow:hidden;box-shadow:0 28px 60px rgba(15,23,42,0.15);">
                    <tr>
                        <td style="background:linear-gradient(140deg,#0b40b3,#1e50d5,#2d6cf6);padding:56px 48px 44px;color:#f8fafc;position:relative;">
                            <div style="text-transform:uppercase;letter-spacing:0.22em;font-size:11px;font-weight:600;background:rgba(15,23,42,0.26);padding:10px 24px;border-radius:999px;display:inline-block;">
                                Alubijid Comprehensive NHS
                            </div>
                            <h1 style="margin:30px 0 14px;font-size:32px;line-height:1.3;font-weight:800;max-width:460px;">
                                {{ $appDisplayName }}
                            </h1>
                            <p style="margin:0;font-size:16px;line-height:1.75;max-width:520px;opacity:0.95;">
                                Seamless password recovery for School Parent-Teachers Association treasurers, guardians, administrators, and auditors.
                            </p>
                            <div style="margin-top:34px;display:inline-flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);padding:14px 24px;border-radius:18px;backdrop-filter:blur(8px);font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">
                                <span style="display:inline-block;width:10px;height:10px;background:#22d3ee;border-radius:999px;"></span>
                                Reset Alert
                            </div>
                            <div style="margin-top:34px;height:6px;width:140px;border-radius:999px;background:rgba(255,255,255,0.42);"></div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:52px 48px 42px;font-size:15px;color:#1e293b;">
                            <p style="margin:0 0 22px;font-size:20px;font-weight:700;color:#0f172a;">
                                {{ $greeting ?? __('Hello!') }}
                            </p>

                            @foreach ($introLines ?? [] as $line)
                                <p style="margin:0 0 18px;line-height:1.75;">{!! nl2br(e($line)) !!}</p>
                            @endforeach

                            @isset($actionText)
                                <div style="margin:48px 0 38px;text-align:center;">
                                    <a href="{{ $actionUrl }}" style="display:inline-block;padding:17px 44px;border-radius:999px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;background:{{ $levelColor }};box-shadow:0 26px 44px rgba(37,99,235,0.30);">
                                        {{ $actionText }}
                                    </a>
                                </div>
                            @endisset

                            @foreach ($outroLines ?? [] as $line)
                                <p style="margin:0 0 18px;line-height:1.75;">{!! nl2br(e($line)) !!}</p>
                            @endforeach

                            <p style="margin:32px 0 0;font-size:15px;">
                                {{ $salutation ?? __('Warm regards,') }}<br>{{ $appDisplayName }}
                            </p>

                            @isset($subcopy)
                                <div style="margin-top:28px;padding:18px 20px;border-radius:18px;border:1px solid #e2e8f0;background:#f8fafc;">
                                    <strong>{{ __('Button not working?') }}</strong><br>
                                    {!! nl2br(e($subcopy)) !!}
                                </div>
                            @elseif(isset($actionText))
                                <div style="margin-top:28px;padding:18px 20px;border-radius:18px;border:1px solid #e2e8f0;background:#f8fafc;">
                                    <strong>{{ __('Button not working?') }}</strong><br>
                                    {{ __('Copy and paste this link into your browser:') }}<br>
                                    <a href="{{ $actionUrl }}" style="color:#2563eb;word-break:break-word;text-decoration:none;">{{ $displayableActionUrl }}</a>
                                </div>
                            @endisset
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 42px 44px;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">
                            {{ __('You are receiving this email because an action was requested for your account. If you did not initiate it, you can safely ignore this message.') }}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
