import os
import smtplib
from email.message import EmailMessage
import logging

logger = logging.getLogger('email_utils')

SMTP_HOST = os.environ.get('SMTP_HOST')
SMTP_PORT = int(os.environ.get('SMTP_PORT') or 587)
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASS = os.environ.get('SMTP_PASS')
FROM_EMAIL = os.environ.get('FROM_EMAIL') or (SMTP_USER or 'no-reply@example.com')


def send_otp_email(to_email: str, otp: str) -> None:
    """Send OTP email using SMTP. Raises on failure."""
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        logger.warning('SMTP not configured; skipping email send')
        return

    msg = EmailMessage()
    msg['Subject'] = 'Your verification code'
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    body = f"Your verification code is: {otp}\n\nThis code expires in 10 minutes."
    msg.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
        logger.info(f"Sent OTP email to {to_email}")
    except Exception:
        logger.exception(f"Failed to send OTP email to {to_email}")
        raise
