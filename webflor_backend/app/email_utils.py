# app/email_utils.py
"""
Centralized email communication module for FAP Mendoza.

Uses professional HTML templates from app.services.email_templates
and handles SMTP connections securely.
"""
from __future__ import annotations

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Final, Dict

from dotenv import load_dotenv

from app.services.email_templates import (
    confirmation_email,
    credentials_email,
    match_notification,
    proposal_to_employer,
    application_confirmation,
    cancellation_warning,
)

load_dotenv()
logger = logging.getLogger(__name__)

# SMTP Configuration
SMTP_HOST: Final[str] = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT: Final[int] = int(os.getenv("SMTP_PORT", 587))
SMTP_USER: Final[str | None] = os.getenv("SMTP_USER")
SMTP_PASS: Final[str | None] = os.getenv("SMTP_PASS")
SMTP_TIMEOUT: Final[int] = int(os.getenv("SMTP_TIMEOUT", 20))

PUBLIC_WEB_BASE_URL: Final[str] = os.getenv("PUBLIC_WEB_BASE_URL", "https://fapmendoza.online")
ADMIN_EMAIL: Final[str | None] = os.getenv("ADMIN_EMAIL")


def send_email(to_email: str, subject: str, body: str, *, html: bool = True) -> bool:
    """Send an email via SMTP with SSL/STARTTLS."""
    if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS]):
        logger.error("SMTP configuration is incomplete")
        raise ValueError("Configuracion SMTP incompleta.")

    msg = MIMEMultipart("alternative")
    msg["From"] = f"FAP Mendoza <{SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html" if html else "plain", "utf-8"))

    try:
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT)
            server.starttls()

        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()

        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except smtplib.SMTPException as e:
        logger.error("SMTP error sending to %s: %s", to_email, e)
        raise
    except Exception as e:
        logger.error("Error sending email to %s: %s", to_email, e)
        raise


# High-level notification functions

def send_confirmation_email(user_email: str, confirmation_code: str):
    """Send account activation email."""
    confirm_url = f"{PUBLIC_WEB_BASE_URL}/cv/confirm?code={confirmation_code}"
    subject, body = confirmation_email(confirm_url)
    send_email(user_email, subject, body)


def send_credentials_email(user_email: str, name: str, password: str):
    """Send welcome email with login credentials."""
    subject, body = credentials_email(name, user_email, password)
    send_email(user_email, subject, body)


def send_match_notification(user_email: str, context: Dict[str, str]):
    """Notify candidate about a job match."""
    subject, body = match_notification(context)
    send_email(user_email, subject, body)


def send_proposal_to_employer(employer_email: str, context: Dict[str, str]):
    """Send candidate application to employer."""
    subject, body = proposal_to_employer(context)
    send_email(employer_email, subject, body)


def send_application_confirmation(user_email: str, context: Dict[str, str]):
    """Confirm to candidate that application was sent."""
    subject, body = application_confirmation(context)
    send_email(user_email, subject, body)


def send_cancellation_warning(user_email: str, context: Dict[str, str]):
    """Warn candidate about 5-minute window before sending."""
    subject, body = cancellation_warning(context)
    send_email(user_email, subject, body)


def send_admin_alert(subject: str, details: str):
    """Send system alert to administrators."""
    if not ADMIN_EMAIL:
        logger.warning("ADMIN_EMAIL not configured, cannot send alert")
        return

    full_subject = f"Alerta FAP Mendoza: {subject}"
    body = (
        f"<h2>Alerta del Sistema</h2>"
        f"<p><strong>Tipo:</strong> {subject}</p>"
        f"<p><strong>Detalles:</strong><br><pre>{details}</pre></p>"
    )
    try:
        send_email(ADMIN_EMAIL, full_subject, body, html=True)
    except Exception as e:
        logger.error("Failed to send admin alert: %s", e)
