<#
PowerShell helper to set common environment variables for this project in the current session.
Copy and edit values below, then run this script in the backend folder:
    .\set-env.ps1

This sets variables only for the current PowerShell session. To make them permanent, add to System/User env or use a .env loader.
#>

# MongoDB (example)
$env:MONGO_URI = "mongodb://127.0.0.1:27017/bus_booking"

# JWT secret
$env:JWT_SECRET = "replace_with_a_secure_secret"

# Mailer: Use real SMTP or Ethereal preview
# Set USE_ETHEREAL to true to use Ethereal (dev preview only)
$env:USE_ETHEREAL = "false"

# If USE_ETHEREAL is false, fill the SMTP settings below
$env:SMTP_HOST = "smtp.gmail.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "you@gmail.com"
$env:SMTP_PASS = "your_app_password_here"
$env:MAIL_FROM = "\"No Reply <no-reply@yourdomain.com>\""

Write-Host "Environment variables set for current session. (Not saved permanently)"
Write-Host "SMTP_HOST=$($env:SMTP_HOST), USE_ETHEREAL=$($env:USE_ETHEREAL)"

# Tip: after editing values, run this script to apply them. To run explicitly allow script execution if restricted.
# If execution policy blocks script, you can dot-source the file instead:
#    . .\set-env.ps1
