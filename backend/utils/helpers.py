# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: helpers.py
# Description: To provide utility helper functions for email sending, token generation, and data processing
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Helper utility functions

This module provides various utility functions used throughout the application:
- Email sending (verification, password reset, notifications)
- Token generation and verification
- Diary entry processing and formatting
- AI recommendation fetching
- Profile helpers
- Response cleaning and formatting

These functions are shared across multiple routers and endpoints.
"""
import secrets
import smtplib
import logging
import jwt
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct, case
from langchain_openai import ChatOpenAI
from sqlalchemy import text

from config import (
    OPENAI_API_KEY, SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
    FROM_EMAIL, FRONTEND_URL, EMAIL_LOGO_URL, STATIC_ASSETS_BUCKET, 
    SUPABASE_URL, supabase, logger
)
import openai
from models.database import DiaryEntry, EmailVerification, PasswordReset

# Firebase token verification
def verify_firebase_token(token: str):
    """Verify Firebase ID token (currently returns decoded without verification for debugging)"""
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded
    except Exception as e:
        logger.error(f"Token decode failed: {e}")
        return None

# OpenAI embeddings
async def get_openai_embedding(text: str) -> list[float]:
    """Get embedding from OpenAI using the configured client"""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured")
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# Email verification helpers
def generate_verification_token() -> str:
    """Generate a secure random token for email verification"""
    return secrets.token_urlsafe(32)

def get_email_logo_url() -> str:
    """Get the logo URL for emails - from env var or Supabase Storage"""
    # If EMAIL_LOGO_URL is set in env, use it
    if EMAIL_LOGO_URL:
        logger.info(f"📧 Using EMAIL_LOGO_URL from env: {EMAIL_LOGO_URL}")
        return EMAIL_LOGO_URL
    
    # Otherwise, try to get it from Supabase Storage
    logo_path = "logos/parenzing-side-logo-400x100-black.png"
    logger.info(f"🔍 Attempting to get logo URL from Supabase Storage...")
    logger.info(f"   Bucket: {STATIC_ASSETS_BUCKET}")
    logger.info(f"   Path: {logo_path}")
    logger.info(f"   SUPABASE_URL: {SUPABASE_URL}")
    
    try:
        public_url_result = supabase.storage.from_(STATIC_ASSETS_BUCKET).get_public_url(logo_path)
        logger.info(f"   Raw result type: {type(public_url_result)}")
        logger.info(f"   Raw result: {public_url_result}")
        
        # Handle different response formats
        if isinstance(public_url_result, dict):
            public_url = public_url_result.get('publicUrl') or public_url_result.get('public_url')
            logger.info(f"   Extracted from dict: {public_url}")
        else:
            public_url = str(public_url_result)
            logger.info(f"   Converted to string: {public_url}")
        
        if public_url and public_url != 'None' and public_url.strip():
            # Strip trailing query parameters (like '?') that Supabase sometimes adds
            public_url = public_url.rstrip('?&')
            logger.info(f"✅ Using Supabase Storage URL: {public_url}")
            return public_url
        else:
            logger.warning(f"⚠️ Invalid URL returned: {public_url}")
    except Exception as e:
        logger.error(f"❌ Failed to get logo URL from Supabase Storage: {e}")
        logger.error(f"   Exception type: {type(e)}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
    
    # Fallback to a default URL
    fallback_url = f"{SUPABASE_URL}/storage/v1/object/public/{STATIC_ASSETS_BUCKET}/logos/parenzing-side-logo-400x100-black.png"
    logger.warning(f"⚠️ Using fallback logo URL: {fallback_url}")
    logger.warning("   Consider setting EMAIL_LOGO_URL in .env or verifying Supabase Storage setup")
    return fallback_url

def send_verification_email(email: str, token: str, display_name: str = None) -> bool:
    """Send verification email to user"""
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.error(f"SMTP credentials not configured. SMTP_USERNAME: {SMTP_USERNAME}, SMTP_PASSWORD: {'***' if SMTP_PASSWORD else None}")
            return False
            
        verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
        greeting_name = display_name if display_name else email.split('@')[0]
        subject = "Verify Your Email - ParenZing"
        
        # Get logo URL from Supabase Storage or env var
        logo_url = get_email_logo_url()
        logger.info(f"📧 Email logo URL: {logo_url}")  # Debug log to verify URL
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Email Verification</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {{ font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #32332D; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }}
                .header {{ background-color: #FAEFE2; padding: 30px 20px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .logo {{ max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; }}
                .header-title {{ color: #32332D; font-size: 28px; font-weight: 600; margin: 0; }}
                .content {{ background-color: #F5F5F5; padding: 40px 30px 20px; border-radius: 0 0 8px 8px; }}
                .greeting {{ color: #32332D; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; }}
                .button {{ display: inline-block; background-color: #0F5648; color: #F5F5F5 !important; padding: 12px 44px; text-decoration: none; border-radius: 50px; margin: 20px 0; font-size: 16px; font-weight: 600; transition: background-color 0.3s ease; }}
                .button:hover {{ background-color: #0d4a3d; }}
                .link-text {{ word-break: break-all; color: #326586; background-color: #ffffff; padding: 12px; border-radius: 6px; font-size: 13px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #AA855B; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="{logo_url}" alt="ParenZing Logo" class="logo">
                    <h1 class="header-title">Welcome to ParenZing!!</h1>
                </div>
                <div class="content">
                    <h2 class="greeting">Hi {greeting_name},</h2>
                    <p>Thank you for signing up for ParenZing!! To complete your registration, please verify your email address by clicking the button below:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify Email Address</a>
                    </div>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p class="link-text">{verification_link}</p>
                    
                    <p><strong>This link will expire in 24 hours.</strong></p>
                    
                    <p>If you didn't create an account with ParenZing, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2025 ParenZing. All rights reserved.</p>
                    <p>Building stronger families together</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        logger.info(f"Attempting to send email via {SMTP_SERVER}:{SMTP_PORT} with username: {SMTP_USERNAME}")
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
        
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Verification email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        return False

async def create_verification_record(user_id: int, email: str, db: AsyncSession) -> str:
    """Create email verification record and return token"""
    token = generate_verification_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    verification = EmailVerification(
        user_id=user_id,
        email=email,
        verification_token=token,
        expires_at=expires_at,
        is_used=False,
        is_verified=False
    )
    
    db.add(verification)
    await db.commit()
    await db.refresh(verification)
    
    return token

# Password reset helpers
def send_password_reset_email(email: str, token: str, display_name: str = None) -> bool:
    """Send password reset email to user"""
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.error(f"SMTP credentials not configured. SMTP_USERNAME: {SMTP_USERNAME}, SMTP_PASSWORD: {'***' if SMTP_PASSWORD else None}")
            return False
            
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        greeting_name = display_name if display_name else email.split('@')[0]
        subject = "Reset Your Password - ParenZing"
        
        # Get logo URL from Supabase Storage or env var
        logo_url = get_email_logo_url()
        logger.info(f"📧 Email logo URL: {logo_url}")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {{ font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #32332D; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }}
                .header {{ background-color: #FAEFE2; padding: 30px 20px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .logo {{ max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; }}
                .header-title {{ color: #32332D; font-size: 28px; font-weight: 600; margin: 0; }}
                .content {{ background-color: #F5F5F5; padding: 40px 30px 20px; border-radius: 0 0 8px 8px; }}
                .greeting {{ color: #32332D; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; }}
                .button {{ display: inline-block; background-color: #0F5648; color: #F5F5F5 !important; padding: 12px 44px; text-decoration: none; border-radius: 50px; margin: 20px 0; font-size: 16px; font-weight: 600; transition: background-color 0.3s ease; }}
                .button:hover {{ background-color: #0d4a3d; }}
                .link-text {{ word-break: break-all; color: #326586; background-color: #ffffff; padding: 12px; border-radius: 6px; font-size: 13px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #AA855B; font-size: 14px; }}
                .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="{logo_url}" alt="ParenZing Logo" class="logo">
                    <h1 class="header-title">Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2 class="greeting">Hi {greeting_name},</h2>
                    <p>We received a request to reset your password for your ParenZing account. Click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </div>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p class="link-text">{reset_link}</p>
                    
                    <div class="warning">
                        <p><strong>⚠️ Important:</strong></p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>This link will expire in 1 hour.</li>
                            <li>If you didn't request a password reset, please ignore this email.</li>
                            <li>Your password will remain unchanged if you don't click the link.</li>
                        </ul>
                    </div>
                    
                    <p>For security reasons, please do not share this link with anyone.</p>
                </div>
                <div class="footer">
                    <p>© 2025 ParenZing. All rights reserved.</p>
                    <p>Building stronger families together</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        logger.info(f"Attempting to send password reset email via {SMTP_SERVER}:{SMTP_PORT} with username: {SMTP_USERNAME}")
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
        
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Password reset email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {e}")
        return False

async def create_password_reset_record(user_id: int, email: str, db: AsyncSession) -> str:
    """Create password reset record and return token"""
    token = generate_verification_token()  # Reuse same token generator
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # 1 hour expiration
    
    reset_record = PasswordReset(
        user_id=user_id,
        email=email,
        reset_token=token,
        expires_at=expires_at,
        used_at=None
    )
    
    db.add(reset_record)
    await db.commit()
    await db.refresh(reset_record)
    
    return token


# Professional status update email helpers
def send_professional_approval_email(email: str, business_name: str, display_name: str = None) -> bool:
    """Send approval email to professional user"""
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.error(f"SMTP credentials not configured. SMTP_USERNAME: {SMTP_USERNAME}, SMTP_PASSWORD: {'***' if SMTP_PASSWORD else None}")
            return False
            
        greeting_name = display_name if display_name else (business_name if business_name else email.split('@')[0])
        subject = "Professional Application Approved - ParenZing"
        
        # Get logo URL from Supabase Storage or env var
        logo_url = get_email_logo_url()
        logger.info(f"📧 Email logo URL: {logo_url}")
        
        dashboard_link = f"{FRONTEND_URL}/professional-dashboard"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Application Approved</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {{ font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #32332D; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }}
                .header {{ background-color: #FAEFE2; padding: 30px 20px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .logo {{ max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; }}
                .header-title {{ color: #32332D; font-size: 28px; font-weight: 600; margin: 0; }}
                .content {{ background-color: #F5F5F5; padding: 40px 30px 20px; border-radius: 0 0 8px 8px; }}
                .greeting {{ color: #32332D; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; }}
                .button {{ display: inline-block; background-color: #0F5648; color: #F5F5F5 !important; padding: 12px 44px; text-decoration: none; border-radius: 50px; margin: 20px 0; font-size: 16px; font-weight: 600; transition: background-color 0.3s ease; }}
                .button:hover {{ background-color: #0d4a3d; }}
                .success-box {{ background-color: #E8F5E9; border: 2px solid #0F5648; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                .success-box p {{ margin: 0; color: #0F5648; font-weight: 500; }}
                .footer {{ text-align: center; margin-top: 30px; color: #AA855B; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="{logo_url}" alt="ParenZing Logo" class="logo">
                    <h1 class="header-title">Application Approved!</h1>
                </div>
                <div class="content">
                    <h2 class="greeting">Hi {greeting_name},</h2>
                    <p>Great news! Your professional application has been reviewed and approved by our team.</p>
                    
                    <div class="success-box">
                        <p>✓ Your professional profile is now live and visible to parents on ParenZing!</p>
                    </div>
                    
                    <p>You can now:</p>
                    <ul style="color: #32332D; line-height: 2;">
                        <li>Access your professional dashboard</li>
                        <li>Manage your profile and services</li>
                        <li>Connect with parents seeking your expertise</li>
                        <li>Submit promotional materials for review</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="{dashboard_link}" class="button">Go to Dashboard</a>
                    </div>
                    
                    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    
                    <p>Welcome to ParenZing!</p>
                </div>
                <div class="footer">
                    <p>© 2025 ParenZing. All rights reserved.</p>
                    <p>Building stronger families together</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        logger.info(f"Attempting to send professional approval email via {SMTP_SERVER}:{SMTP_PORT} with username: {SMTP_USERNAME}")
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
        
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Professional approval email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send professional approval email to {email}: {e}")
        return False

def send_professional_rejection_email(email: str, business_name: str, rejection_reason: str, display_name: str = None) -> bool:
    """Send rejection email to professional user with reason"""
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.error(f"SMTP credentials not configured. SMTP_USERNAME: {SMTP_USERNAME}, SMTP_PASSWORD: {'***' if SMTP_PASSWORD else None}")
            return False
            
        greeting_name = display_name if display_name else (business_name if business_name else email.split('@')[0])
        subject = "Professional Application Update - ParenZing"
        
        # Get logo URL from Supabase Storage or env var
        logo_url = get_email_logo_url()
        logger.info(f"📧 Email logo URL: {logo_url}")
        
        dashboard_link = f"{FRONTEND_URL}/professional-dashboard"
        resubmit_link = f"{FRONTEND_URL}/professional-profile-submission"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Application Update</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {{ font-family: 'Poppins', Arial, sans-serif; line-height: 1.6; color: #32332D; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }}
                .header {{ background-color: #FAEFE2; padding: 30px 20px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .logo {{ max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; }}
                .header-title {{ color: #32332D; font-size: 28px; font-weight: 600; margin: 0; }}
                .content {{ background-color: #F5F5F5; padding: 40px 30px 20px; border-radius: 0 0 8px 8px; }}
                .greeting {{ color: #32332D; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; }}
                .button {{ display: inline-block; background-color: #F2742C; color: #F5F5F5 !important; padding: 12px 44px; text-decoration: none; border-radius: 50px; margin: 20px 0; font-size: 16px; font-weight: 600; transition: background-color 0.3s ease; }}
                .button:hover {{ background-color: #E55A1F; }}
                .info-box {{ background-color: #FFF4E6; border: 2px solid #F2742C; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                .info-box p {{ margin: 0 0 10px 0; color: #32332D; }}
                .info-box .reason {{ background-color: #FFFFFF; padding: 15px; border-radius: 6px; margin-top: 10px; color: #64635E; font-size: 14px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #AA855B; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="{logo_url}" alt="ParenZing Logo" class="logo">
                    <h1 class="header-title">Application Update</h1>
                </div>
                <div class="content">
                    <h2 class="greeting">Hi {greeting_name},</h2>
                    <p>Thank you for your interest in joining ParenZing as a professional service provider.</p>
                    
                    <div class="info-box">
                        <p style="font-weight: 600; color: #F2742C; margin-bottom: 10px;">Your application requires additional information:</p>
                        <div class="reason">
                            {rejection_reason}
                        </div>
                    </div>
                    
                    <p>We encourage you to review the feedback above and resubmit your application with the requested updates. Our team is here to help you through the process.</p>
                    
                    <div style="text-align: center;">
                        <a href="{resubmit_link}" class="button">Update Application</a>
                    </div>
                    
                    <p>If you have any questions about the feedback or need clarification, please don't hesitate to contact our support team.</p>
                    
                    <p>We look forward to working with you!</p>
                </div>
                <div class="footer">
                    <p>© 2025 ParenZing. All rights reserved.</p>
                    <p>Building stronger families together</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        logger.info(f"Attempting to send professional rejection email via {SMTP_SERVER}:{SMTP_PORT} with username: {SMTP_USERNAME}")
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
        
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Professional rejection email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send professional rejection email to {email}: {e}")
        return False

# Conversation helpers
async def generate_conversation_title(query: str, child_name: str = None) -> str:
    """Generate a descriptive title for the conversation using AI"""
    try:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, max_tokens=250)
        prompt = f"""
        Generate a concise, descriptive title (max 50 characters) for a parenting conversation.
        
        User's question: {query}
        Child's name: {child_name if child_name else 'General'}
        
        The title should be:
        - Descriptive of the main topic
        - Under 50 characters
        - Professional but friendly
        - Include child's name if provided
        
        Examples:
        - "Liam's Bedtime Struggles"
        - "Managing Tantrums"
        - "General Parenting Tips"
        
        Title:"""
        
        response = await llm.ainvoke(prompt)
        title = response.content.strip().strip('"').strip("'")
        return title[:50]
    except Exception as e:
        print(f"Error generating title: {e}")
        return query[:50] + "..." if len(query) > 50 else query

async def generate_conversation_summary(conversation_id: int, db: AsyncSession) -> str:
    """Generate a summary of the conversation using AI"""
    try:
        messages_sql = text('''
            SELECT query, response, agent_type, generated_at
            FROM ai_chat_interactions
            WHERE conversation_id = :conversation_id
            ORDER BY generated_at
        ''')
        
        result = await db.execute(messages_sql, {"conversation_id": conversation_id})
        messages = result.fetchall()
        
        if not messages:
            return "No messages in conversation"
        
        if len(messages) <= 2:
            conversation_text = ""
            for i, msg in enumerate(messages, 1):
                conversation_text += f"Message {i}:\n"
                conversation_text += f"User: {msg.query}\n"
                conversation_text += f"AI ({msg.agent_type}): {msg.response}\n\n"
            
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, max_tokens=250)
            prompt = f"""
            Generate a brief summary (max 100 words) of this short parenting conversation.
            
            Conversation:
            {conversation_text}
            
            The summary should:
            - Briefly describe the main topic
            - Mention the agent involved
            - Be concise and clear
            
            Summary:"""
            
            response = await llm.ainvoke(prompt)
            summary = response.content.strip()
            return summary[:200]
        
        conversation_text = ""
        for i, msg in enumerate(messages, 1):
            conversation_text += f"Message {i}:\n"
            conversation_text += f"User: {msg.query}\n"
            conversation_text += f"AI ({msg.agent_type}): {msg.response}\n\n"
        
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, max_tokens=250)
        prompt = f"""
        Generate a comprehensive summary (max 200 words) of this parenting conversation.
        
        Conversation:
        {conversation_text}
        
        The summary should:
        - Highlight the main topics discussed
        - Mention which agents were involved
        - Include key insights and recommendations
        - Be professional and informative
        - Be under 200 words
        
        Summary:"""
        
        response = await llm.ainvoke(prompt)
        summary = response.content.strip()
        return summary
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Summary generation failed"

# Profile helpers
def calculate_age_from_birthdate(birthdate: Optional[date]) -> Optional[int]:
    """Calculate age from birthdate"""
    if not birthdate:
        return None
    today = date.today()
    age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
    return age

# Diary helpers
def normalize_string_array(value) -> list[str]:
    """Normalize string array, removing duplicates and invalid values"""
    try:
        if value is None:
            return []
        if not isinstance(value, (list, tuple)):
            return []
        cleaned = []
        seen = set()
        for item in value:
            if item is None:
                continue
            text = str(item).strip()
            text = " ".join(text.split())
            if not text:
                continue
            low = text.lower()
            if low in ("other", "none"):
                continue
            if low not in seen:
                seen.add(low)
                if len(text) > 40:
                    text = text[:40]
                cleaned.append(text)
        return cleaned[:20]
    except Exception:
        return []

def merge_and_normalize_diary_array(array_field: Optional[list[str]], custom_field: Optional[str]) -> list[str]:
    """Merge array field with custom field and normalize for diary entries"""
    combined = []
    if array_field:
        combined.extend(array_field)
    if custom_field and custom_field.strip():
        combined.append(custom_field.strip())
    return normalize_string_array(combined)

def extract_entry_data_by_type(entry: DiaryEntry) -> Dict[str, Any]:
    """Extract entry data based on entry_type, only including relevant fields"""
    entry_type = entry.entry_type or "free-form"
    
    base_data = {
        "entry_id": entry.entry_id,
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
        "date": entry.entry_date.isoformat() if entry.entry_date else None,
        "entry_type": entry_type,
        "type": entry_type,
        "title": entry.title,
        "content": entry.content,
        "parent_mood": entry.parent_mood,
        "child_mood": entry.child_mood,
        "tags": entry.tags or [],
    }
    
    if entry_type == "daily-behavior":
        base_data.update({
            "observed_behaviors": entry.observed_behaviors or [],
            "challenges": entry.challenges_encountered or [],
            "challenges_encountered": entry.challenges_encountered or [],
            "strategies": entry.strategies_used or [],
            "strategies_used": entry.strategies_used or [],
            "time_of_day": entry.time_of_day,
            "duration": entry.duration,
            "effectiveness": entry.effectiveness,
        })
    elif entry_type == "emotional-tracking":
        base_data.update({
            "emotion_intensity": entry.emotion_intensity,
            "stress_level": entry.stress_level,
            "triggers_identified": entry.triggers_identified or [],
            "coping_strategies": entry.coping_strategies or [],
            "physical_symptoms": entry.physical_symptoms or [],
            "environmental_factors": entry.environmental_factors,
        })
    elif entry_type == "intervention-tracking":
        base_data.update({
            "situation_description": entry.situation_description,
            "intervention_used": entry.intervention_used,
            "immediate_outcome": entry.immediate_outcome,
            "effectiveness_rating": entry.effectiveness_rating,
            "would_use_again": entry.would_use_again,
        })
    elif entry_type == "milestone-progress":
        base_data.update({
            "skills": entry.skills_observed or [],
            "skills_observed": entry.skills_observed or [],
            "improvements": entry.improvements_observed,
            "improvements_observed": entry.improvements_observed,
            "setbacks": entry.setbacks_concerns,
            "setbacks_concerns": entry.setbacks_concerns,
            "next_goals": entry.next_goals,
            "professional_recommendations": entry.professional_recommendations,
        })
    
    return base_data

async def fetch_relevant_diary_entries(
    user_id: int,
    child_id: Optional[int],
    query: str,
    db: AsyncSession,
    diary_window_days: Optional[int] = None,
    diary_types: Optional[List[str]] = None,
    per_type_limit: Optional[int] = None,
    overall_limit: Optional[int] = None,
) -> tuple[List[Dict[str, Any]], Dict[str, int], int]:
    """Adaptive per-type diary retrieval with caps and trend overflow reporting"""
    try:
        if child_id is None:
            print("DEBUG: General Parenting mode - no diary entries fetched")
            return [], {}, 0
        
        default_days_by_type: Dict[str, int] = {
            "milestone-progress": 90,
            "intervention-tracking": 90,
            "daily-behavior": 30,
            "emotional-tracking": 30,
            "free-form": 60,
        }
        default_caps_by_type: Dict[str, int] = {
            "milestone-progress": 10,
            "intervention-tracking": 10,
            "daily-behavior": 12,
            "emotional-tracking": 12,
            "free-form": 6,
        }
        overall_cap = overall_limit if isinstance(overall_limit, int) and overall_limit > 0 else 40
        types_to_fetch = diary_types or list(default_days_by_type.keys())

        today = date.today()
        all_entries: List[Dict[str, Any]] = []
        overflow_by_type: Dict[str, int] = {}

        for t in types_to_fetch:
            window_days = diary_window_days if isinstance(diary_window_days, int) and diary_window_days > 0 else default_days_by_type.get(t, 30)
            cap_for_type = per_type_limit if isinstance(per_type_limit, int) and per_type_limit > 0 else default_caps_by_type.get(t, 6)

            since_date = today - timedelta(days=window_days)
            filters = [DiaryEntry.user_id == user_id, DiaryEntry.entry_type == t, DiaryEntry.entry_date >= since_date]
            if child_id is not None:
                filters.append(DiaryEntry.child_id == child_id)

            count_stmt = select(func.count()).where(and_(*filters))
            total_for_type = (await db.execute(count_stmt)).scalar() or 0

            stmt = (
                select(DiaryEntry)
                .where(and_(*filters))
                .order_by(DiaryEntry.entry_date.desc(), DiaryEntry.created_at.desc())
                .limit(cap_for_type)
            )
            result = await db.execute(stmt)
            for entry in result.scalars().all():
                entry_data = extract_entry_data_by_type(entry)
                all_entries.append(entry_data)

            overflow = max(total_for_type - cap_for_type, 0)
            if overflow:
                overflow_by_type[t] = overflow

        all_entries.sort(key=lambda e: (e.get("entry_date") or ""), reverse=True)
        overall_trimmed = 0
        if len(all_entries) > overall_cap:
            overall_trimmed = len(all_entries) - overall_cap
            all_entries = all_entries[:overall_cap]

        print(f"DEBUG: Fetched {len(all_entries)} diary entries (overall_trimmed={overall_trimmed}, overflow_by_type={overflow_by_type})")
        return all_entries, overflow_by_type, overall_trimmed

    except Exception as e:
        print(f"ERROR: Failed to fetch diary entries: {e}")
        return [], {}, 0

async def format_diary_entries_for_context(entries: List[Dict[str, Any]], overflow_by_type: Optional[Dict[str, int]] = None, overall_trimmed: int = 0) -> str:
    """Format diary entries into a readable context string for AI agents"""
    if not entries:
        return ""
    
    context_lines = ["DIARY ENTRIES CONTEXT:\n"]
    
    entries_by_type = {}
    for entry in entries:
        entry_type = entry.get("entry_type", "free-form")
        if entry_type not in entries_by_type:
            entries_by_type[entry_type] = []
        entries_by_type[entry_type].append(entry)
    
    for entry_type, type_entries in entries_by_type.items():
        context_lines.append(f"\n{entry_type.upper().replace('-', ' ')} ENTRIES ({len(type_entries)} entries):")
        
        for entry in type_entries[:5]:
            entry_date = entry.get("entry_date", "Unknown date")
            title = entry.get("title", "No title")
            content = entry.get("content", "")
            
            context_lines.append(f"\n- Entry from {entry_date}: {title}")
            
            if entry_type == "daily-behavior":
                behaviors = entry.get("observed_behaviors", [])
                challenges = entry.get("challenges_encountered", [])
                strategies = entry.get("strategies_used", [])
                effectiveness = entry.get("effectiveness", "")
                
                if behaviors:
                    context_lines.append(f"  Behaviors observed: {', '.join(behaviors)}")
                if challenges:
                    context_lines.append(f"  Challenges: {', '.join(challenges)}")
                if strategies:
                    context_lines.append(f"  Strategies used: {', '.join(strategies)}")
                if effectiveness:
                    context_lines.append(f"  Effectiveness: {effectiveness}")
                if content:
                    context_lines.append(f"  Notes: {content[:100]}...")
                    
            elif entry_type == "emotional-tracking":
                parent_mood = entry.get("parent_mood", "")
                child_mood = entry.get("child_mood", "")
                emotion_intensity = entry.get("emotion_intensity")
                stress_level = entry.get("stress_level")
                triggers = entry.get("triggers_identified", [])
                coping = entry.get("coping_strategies", [])
                
                if parent_mood:
                    context_lines.append(f"  Parent mood: {parent_mood}")
                if child_mood:
                    context_lines.append(f"  Child mood: {child_mood}")
                if emotion_intensity:
                    context_lines.append(f"  Emotion intensity: {emotion_intensity}/10")
                if stress_level:
                    context_lines.append(f"  Stress level: {stress_level}/10")
                if triggers:
                    context_lines.append(f"  Triggers: {', '.join(triggers)}")
                if coping:
                    context_lines.append(f"  Coping strategies: {', '.join(coping)}")
                if content:
                    context_lines.append(f"  Context: {content[:100]}...")
                    
            elif entry_type == "intervention-tracking":
                situation = entry.get("situation_description", "")
                intervention = entry.get("intervention_used", "")
                outcome = entry.get("immediate_outcome", "")
                rating = entry.get("effectiveness_rating")
                would_use_again = entry.get("would_use_again")
                
                if situation:
                    context_lines.append(f"  Situation: {situation[:100]}...")
                if intervention:
                    context_lines.append(f"  Intervention: {intervention[:100]}...")
                if outcome:
                    context_lines.append(f"  Outcome: {outcome[:100]}...")
                if rating:
                    context_lines.append(f"  Effectiveness rating: {rating}/10")
                if would_use_again is not None:
                    context_lines.append(f"  Would use again: {'Yes' if would_use_again else 'No'}")
                    
            elif entry_type == "milestone-progress":
                skills = entry.get("skills_observed", [])
                improvements = entry.get("improvements_observed", "")
                setbacks = entry.get("setbacks_concerns", "")
                next_goals = entry.get("next_goals", "")
                
                if skills:
                    context_lines.append(f"  Skills observed: {', '.join(skills)}")
                if improvements:
                    context_lines.append(f"  Improvements: {improvements[:100]}...")
                if setbacks:
                    context_lines.append(f"  Setbacks/concerns: {setbacks[:100]}...")
                if next_goals:
                    context_lines.append(f"  Next goals: {next_goals[:100]}...")
                if content:
                    context_lines.append(f"  Progress notes: {content[:100]}...")
            else:
                if content:
                    context_lines.append(f"  Content: {content[:150]}...")
        
        if overflow_by_type and overflow_by_type.get(entry_type, 0) > 0:
            extra = overflow_by_type[entry_type]
            context_lines.append(f"  (+{extra} more entries in this category within the lookback window)")
    
    context_lines.append("\n---")
    if overall_trimmed and overall_trimmed > 0:
        context_lines.append(f"Note: Showing the most recent entries across categories; +{overall_trimmed} older entries were not included to keep context concise.")
    
    diary_context = "\n".join(context_lines)
    print(f"DEBUG: Formatted diary context length: {len(diary_context)}")
    return diary_context

def clean_response(text: str) -> str:
    """Clean up the AI response by removing markdown and normalizing spacing."""
    if not text:
        return text

    text = text.replace('**', '')
    text = text.replace('*', '')
    text = text.replace('`', '')

    text = text.replace('\r\n', '\n').replace('\r', '\n')

    text = re.sub(r'(\d+\.\s*)', r'\n\n\1', text)
    text = re.sub(r'([•\-*]\s)', r'\n\n\1', text)
    text = re.sub(r'(References:)', r'\n\n\1', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    transition_phrases = [
        r'These strategies',
        r'Remember',
        r'In summary',
        r'In conclusion',
        r'Additionally',
        r'Furthermore',
        r'Finally',
        r'Overall',
        r'Keep in mind',
        r'It\'s important to',
    ]

    for phrase in transition_phrases:
        pattern = r'([.!?])\s+(?=' + phrase + r'\b)'
        replacement = r'\1\n\n'
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    lines = text.split('\n')
    processed_lines = []

    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped:
            if processed_lines and processed_lines[-1].strip():
                processed_lines.append('')
            continue

        if re.match(r'^\d+\.', line_stripped):
            if processed_lines and processed_lines[-1].strip():
                processed_lines.append('')
            processed_lines.append(line_stripped)
        else:
            is_transition = any(re.match(phrase, line_stripped, re.IGNORECASE) for phrase in transition_phrases)
            if is_transition and processed_lines and processed_lines[-1].strip():
                processed_lines.append('')
            processed_lines.append(line_stripped)

    result = '\n'.join(processed_lines)
    result = re.sub(r'\n{3,}', '\n\n', result)
    result = result.strip()

    return result

# AI Recommendations Helper Functions

def analyze_query_for_recommendations(query: str, selected_agent: str) -> Dict[str, bool]:
    """
    Analyze user query to determine which recommendation types to fetch.
    
    Args:
        query: User's question/query
        selected_agent: Selected agent ID (e.g., 'community_connector', 'child_development')
    
    Returns:
        Dictionary with 'professionals', 'resources', 'communities' boolean flags
    """
    query_lower = query.lower()
    
    # Check explicit mentions (PRIORITY: explicit requests override agent defaults)
    professional_keywords = [
        'professional', 'therapist', 'doctor', 'counselor', 'service', 
        'therapy', 'specialist', 'expert', 'help me find',
        'pediatrician', 'psychologist', 'psychiatrist', 'clinician'
    ]
    # Check for phrase "recommend a professional/therapist/doctor" separately to avoid false matches
    professional_phrases = [
        'recommend a professional', 'recommend a therapist', 'recommend a doctor',
        'recommend a counselor', 'recommend a specialist', 'recommend a psychologist'
    ]
    needs_professionals = (
        any(kw in query_lower for kw in professional_keywords) or
        any(phrase in query_lower for phrase in professional_phrases)
    )
    
    resource_keywords = [
        'resource', 'article', 'articles', 'video', 'guide', 'guides', 
        'learn', 'read', 'watch', 'information', 'educational', 'content', 
        'material', 'training method', 'training methods', 'sleep training',
        'bedtime routine', 'bedtime routines', 'book', 'books', 'tutorial',
        'tutorials', 'documentation', 'reference'
    ]
    needs_resources = any(kw in query_lower for kw in resource_keywords)
    
    community_keywords = [
        'community', 'communities', 'group', 'support group', 'other parents', 
        'connect', 'share', 'discuss', 'forum', 'network'
    ]
    needs_communities = any(kw in query_lower for kw in community_keywords)
    
    # Log detection for debugging
    logger.info(f"Recommendation analysis for query: '{query[:100]}...'")
    logger.info(f"  - Professional keywords detected: {needs_professionals}")
    logger.info(f"  - Resource keywords detected: {needs_resources}")
    logger.info(f"  - Community keywords detected: {needs_communities}")
    
    # CRITICAL: If user explicitly asks for a specific type, prioritize that
    # Don't let agent defaults override explicit requests
    # Priority order: resources > professionals > communities (if multiple mentioned, use priority)
    # But if only one type is mentioned, use that exclusively
    
    # Count how many types are explicitly mentioned
    explicit_count = sum([needs_resources, needs_professionals, needs_communities])
    
    logger.info(f"Explicit count: {explicit_count} (resources={needs_resources}, professionals={needs_professionals}, communities={needs_communities})")
    
    if explicit_count == 1:
        # Only one type mentioned - use that exclusively
        if needs_resources:
            logger.info("Only resources mentioned - returning resources only")
            return {
                'professionals': False,
                'resources': True,
                'communities': False
            }
        elif needs_professionals:
            logger.info("Only professionals mentioned - returning professionals only")
            return {
                'professionals': True,
                'resources': False,
                'communities': False
            }
        elif needs_communities:
            logger.info("Only communities mentioned - returning communities only")
            return {
                'professionals': False,
                'resources': False,
                'communities': True
            }
    elif explicit_count > 1:
        # Multiple types mentioned - include all explicitly mentioned types
        logger.info(f"Multiple types mentioned - returning all: professionals={needs_professionals}, resources={needs_resources}, communities={needs_communities}")
        return {
            'professionals': needs_professionals,
            'resources': needs_resources,
            'communities': needs_communities
        }
    
    # Agent-based defaults (only if no explicit requests)
    # CRITICAL: ONLY Community Connector handles recommendations
    # Other agents (Child Development, Crisis Intervention, Parenting Style) provide advice but do NOT fetch recommendations
    if selected_agent == "community_connector":
        # Community Connector handles ALL resource types (professionals, resources, communities)
        # If no explicit mention, still fetch all (it's the agent's specialty)
        if not (needs_professionals or needs_resources or needs_communities):
            logger.info("No explicit mentions - Community Connector defaulting to all types")
            needs_professionals = True
            needs_resources = True
            needs_communities = True
        else:
            # This shouldn't happen if explicit_count logic worked, but as a safeguard:
            logger.warning(f"Explicit mentions detected but explicit_count was 0 - this shouldn't happen")
    else:
        # Other agents do NOT fetch recommendations - they provide advice only
        # If user explicitly asks for resources/professionals/communities but wrong agent selected,
        # we still respect the explicit request (will be handled by Community Connector in context)
        # But we don't fetch recommendations for non-Community-Connector agents
        logger.info(f"Non-Community-Connector agent ({selected_agent}) - no recommendations")
        needs_professionals = False
        needs_resources = False
        needs_communities = False
    
    result = {
        'professionals': needs_professionals,
        'resources': needs_resources,
        'communities': needs_communities
    }
    
    logger.info(f"Final recommendation decision: professionals={result['professionals']}, resources={result['resources']}, communities={result['communities']}")
    
    return result

async def fetch_matching_professionals(
    diary_topics: List[str],
    child_profile: Optional[Dict[str, Any]],
    parent_location: Optional[str],
    db: AsyncSession,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """
    Fetch matching professionals based on diary topics, child profile, and location.
    
    Args:
        diary_topics: List of topics extracted from diary entries
        child_profile: Child profile dict with developmental_stage, special_needs, etc.
        parent_location: Parent's city/state for location matching
        db: Database session
        limit: Maximum number of results
    
    Returns:
        List of professional profile dictionaries
    """
    from models.database import ProfessionalProfile, ProfessionalService
    from config import logger
    
    try:
        logger.info(f"fetch_matching_professionals - topics: {diary_topics}, location: {parent_location}, child_stage: {child_profile.get('developmental_stage') if child_profile else None}")
        
        query = select(ProfessionalProfile).where(
            ProfessionalProfile.profile_status == 'approved'
        )
        
        # Build filters for matching (location is optional, but specialization/developmental stage help)
        filters = []
        
        # Match by specializations (from diary topics or query topics)
        if diary_topics:
            # Convert diary topics to potential specialization matches
            specialization_filters = []
            for topic in diary_topics:
                topic_lower = topic.lower()
                # Check if topic matches common specializations
                specialization_filters.append(
                    func.array_to_string(ProfessionalProfile.specializations, ', ').ilike(f"%{topic_lower}%")
                )
            
            if specialization_filters:
                filters.append(or_(*specialization_filters))
        
        # Match by target developmental stages
        if child_profile and child_profile.get('developmental_stage'):
            child_stage = child_profile['developmental_stage']
            filters.append(
                func.array_to_string(ProfessionalProfile.target_developmental_stages, ', ').ilike(f"%{child_stage}%")
            )
        
        # Match by location (city/state) - optional but preferred
        if parent_location:
            location_lower = parent_location.lower()
            location_filter = or_(
                func.lower(ProfessionalProfile.city).ilike(f"%{location_lower}%"),
                func.lower(ProfessionalProfile.state).ilike(f"%{location_lower}%")
            )
            filters.append(location_filter)
        
        # Apply filters: if we have any filters, use OR logic (match any condition)
        # This ensures we get results even if location doesn't match
        if filters:
            query = query.where(or_(*filters))
        
        # Order by: location match first (if location provided), then by relevance
        if parent_location:
            location_lower = parent_location.lower()
            # Add ordering to prioritize location matches
            location_priority = case(
                (
                    or_(
                        func.lower(ProfessionalProfile.city).ilike(f"%{location_lower}%"),
                        func.lower(ProfessionalProfile.state).ilike(f"%{location_lower}%")
                    ),
                    1
                ),
                else_=2
            )
            query = query.order_by(location_priority)
        
        query = query.limit(limit)
        logger.info(f"Executing query for professionals with filters: {len(filters)} filters applied")
        result = await db.execute(query)
        profiles = result.scalars().all()
        logger.info(f"Found {len(profiles)} matching professional profiles")
        
        professionals = []
        for profile in profiles:
            # Fetch services for this professional (top 2-3)
            services_result = await db.execute(
                select(ProfessionalService)
                .where(ProfessionalService.profile_id == profile.professional_id)
                .limit(3)
            )
            services = services_result.scalars().all()
            
            services_list = []
            for service in services:
                services_list.append({
                    "service_id": service.service_id,
                    "service_name": service.service_name,
                    "service_description": service.service_description,
                    "service_category": service.service_category,
                    "service_type": service.service_type,
                    "price_range": service.price_range
                })
            
            professionals.append({
                "professional_id": profile.professional_id,
                "business_name": profile.business_name,
                "professional_type": profile.professional_type,
                "specializations": profile.specializations or [],
                "city": profile.city,
                "state": profile.state,
                "contact_phone": profile.contact_phone,
                "contact_email": profile.contact_email,
                "website_url": profile.website_url,
                "profile_image_url": profile.profile_image_url,
                "bio": profile.bio,
                "services": services_list  # Include services
            })
        
        return professionals
    except Exception as e:
        logger.error(f"Error fetching matching professionals: {e}")
        return []

async def fetch_matching_resources(
    diary_topics: List[str],
    child_profile: Optional[Dict[str, Any]],
    db: AsyncSession,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """
    Fetch matching resources based on diary topics, tags, and child profile.
    
    Args:
        diary_topics: List of topics extracted from diary entries
        child_profile: Child profile dict with developmental_stage
        db: Database session
        limit: Maximum number of results
    
    Returns:
        List of resource dictionaries
    """
    from models.database import Resource
    
    try:
        query = select(Resource).where(Resource.status == 'published')
        
        # Match by tags (from diary topics)
        if diary_topics:
            tag_filters = []
            for topic in diary_topics:
                topic_lower = topic.lower()
                tag_filters.append(
                    func.array_to_string(Resource.tags, ', ').ilike(f"%{topic_lower}%")
                )
            
            if tag_filters:
                query = query.where(or_(*tag_filters))
        
        # Match by target developmental stages
        if child_profile and child_profile.get('developmental_stage'):
            child_stage = child_profile['developmental_stage']
            query = query.where(
                func.array_to_string(Resource.target_developmental_stages, ', ').ilike(f"%{child_stage}%")
            )
        
        query = query.order_by(Resource.published_at.desc()).limit(limit)
        result = await db.execute(query)
        resources = result.scalars().all()
        
        resource_list = []
        for resource in resources:
            resource_list.append({
                "resource_id": resource.resource_id,
                "title": resource.title,
                "description": resource.description,
                "resource_type": resource.resource_type,
                "category": resource.category,
                "tags": resource.tags or [],
                "external_url": resource.external_url,
                "thumbnail_url": resource.thumbnail_url,
                "excerpt": resource.excerpt
            })
        
        return resource_list
    except Exception as e:
        logger.error(f"Error fetching matching resources: {e}")
        return []

async def fetch_matching_communities(
    diary_topics: List[str],
    child_profile: Optional[Dict[str, Any]],
    db: AsyncSession,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """
    Fetch matching communities based on diary topics and child profile.
    
    Args:
        diary_topics: List of topics extracted from diary entries
        child_profile: Child profile dict with developmental_stage, age
        db: Database session
        limit: Maximum number of results
    
    Returns:
        List of community dictionaries
    """
    from models.database import Community, CommunityTaxonomy, CommunityTaxonomyAssignment
    
    try:
        # Start with visible communities
        query = select(Community).where(Community.status == 'visible')
        
        # Match by topic taxonomies (from diary topics)
        if diary_topics:
            # Get taxonomy IDs for matching topics
            topic_taxonomies_query = select(CommunityTaxonomy.taxonomy_id).where(
                and_(
                    CommunityTaxonomy.taxonomy_type == 'topic',
                    CommunityTaxonomy.is_active == True,
                    or_(*[CommunityTaxonomy.label.ilike(f"%{topic}%") for topic in diary_topics])
                )
            )
            topic_taxonomy_result = await db.execute(topic_taxonomies_query)
            topic_taxonomy_ids = [row[0] for row in topic_taxonomy_result.all()]
            
            if topic_taxonomy_ids:
                # Get communities with these topic taxonomies
                community_ids_query = select(
                    distinct(CommunityTaxonomyAssignment.community_id)
                ).where(
                    CommunityTaxonomyAssignment.taxonomy_id.in_(topic_taxonomy_ids)
                )
                community_ids_result = await db.execute(community_ids_query)
                community_ids = [row[0] for row in community_ids_result.all()]
                
                if community_ids:
                    query = query.where(Community.community_id.in_(community_ids))
        
        # Match by age group/stage (if child profile available)
        if child_profile and child_profile.get('developmental_stage'):
            child_stage = child_profile['developmental_stage']
            # Map developmental stage to taxonomy labels
            stage_mapping = {
                'newborn': 'newborn',
                'infant': 'infant',
                'toddler': 'toddler',
                'early_childhood': 'early childhood',
                'middle_childhood': 'middle childhood'
            }
            stage_label = stage_mapping.get(child_stage.lower())
            
            if stage_label:
                stage_taxonomies_query = select(CommunityTaxonomy.taxonomy_id).where(
                    and_(
                        CommunityTaxonomy.taxonomy_type.in_(['age_group', 'stage']),
                        CommunityTaxonomy.is_active == True,
                        CommunityTaxonomy.label.ilike(f"%{stage_label}%")
                    )
                )
                stage_taxonomy_result = await db.execute(stage_taxonomies_query)
                stage_taxonomy_ids = [row[0] for row in stage_taxonomy_result.all()]
                
                if stage_taxonomy_ids:
                    community_ids_query = select(
                        distinct(CommunityTaxonomyAssignment.community_id)
                    ).where(
                        CommunityTaxonomyAssignment.taxonomy_id.in_(stage_taxonomy_ids)
                    )
                    community_ids_result = await db.execute(community_ids_query)
                    stage_community_ids = [row[0] for row in community_ids_result.all()]
                    
                    if stage_community_ids:
                        # Combine with existing query
                        if diary_topics and topic_taxonomy_ids:
                            # Intersect: communities matching both topics AND stage
                            query = query.where(Community.community_id.in_(stage_community_ids))
                        else:
                            # Use stage communities if no topic match
                            query = query.where(Community.community_id.in_(stage_community_ids))
        
        query = query.order_by(Community.created_at.desc()).limit(limit)
        result = await db.execute(query)
        communities = result.scalars().all()
        
        community_list = []
        for community in communities:
            community_list.append({
                "community_id": community.community_id,
                "name": community.name,
                "description": community.description,
                "cover_image_url": community.cover_image_url
            })
        
        return community_list
    except Exception as e:
        logger.error(f"Error fetching matching communities: {e}")
        return []

def format_recommendations_for_context(
    professionals: List[Dict[str, Any]],
    resources: List[Dict[str, Any]],
    communities: List[Dict[str, Any]]
) -> str:
    """
    Format recommendations as context text for AI agents.
    
    Args:
        professionals: List of professional dictionaries
        resources: List of resource dictionaries
        communities: List of community dictionaries
    
    Returns:
        Formatted context string (empty if no recommendations)
    """
    context_parts = []
    
    if professionals:
        context_parts.append("\n\n=== AVAILABLE PROFESSIONAL SERVICES (USE ONLY THESE - DO NOT INVENT OTHERS) ===")
        for prof in professionals:
            specializations = ', '.join(prof.get('specializations', [])[:3])  # Top 3
            location = f"{prof.get('city', '')}, {prof.get('state', '')}".strip(', ')
            contact_phone = prof.get('contact_phone', '')
            email = prof.get('contact_email', '')
            website = prof.get('website_url', '')
            bio = prof.get('bio', '')[:150] if prof.get('bio') else ''
            
            # Build services info
            services_info = ""
            if prof.get('services') and len(prof.get('services', [])) > 0:
                services_list = []
                for service in prof.get('services', [])[:2]:  # Top 2 services
                    service_parts = [service.get('service_name', 'Service')]
                    if service.get('service_category'):
                        service_parts.append(f"({service.get('service_category')})")
                    if service.get('service_type'):
                        service_parts.append(f"- {service.get('service_type')}")
                    if service.get('price_range'):
                        service_parts.append(f"- {service.get('price_range')}")
                    services_list.append(' '.join(service_parts))
                services_info = f" Services: {', '.join(services_list)}"
            
            contact_info = []
            if contact_phone:
                contact_info.append(f"Phone: {contact_phone}")
            if email:
                contact_info.append(f"Email: {email}")
            if website:
                contact_info.append(f"Website: {website}")
            contact_str = f" Contact: {', '.join(contact_info)}" if contact_info else ""
            
            context_parts.append(
                f"- {prof.get('business_name', 'Professional')} ({prof.get('professional_type', 'Service')}): "
                f"Specializes in {specializations}. Location: {location}.{services_info}{contact_str}"
                f"{' Bio: ' + bio + '...' if bio else ''}"
            )
    
    if resources:
        context_parts.append("\n\n=== AVAILABLE RESOURCES (USE ONLY THESE - DO NOT INVENT OTHERS) ===")
        for resource in resources:
            resource_type = resource.get('resource_type', 'resource').title()
            tags = ', '.join(resource.get('tags', [])[:3])  # Top 3 tags
            description = resource.get('description', resource.get('excerpt', ''))[:150] if resource.get('description') or resource.get('excerpt') else ''
            context_parts.append(
                f"- {resource.get('title', 'Resource')} ({resource_type}): "
                f"{description}... "
                f"Tags: {tags}"
            )
    
    if communities:
        context_parts.append("\n\n=== AVAILABLE COMMUNITIES (USE ONLY THESE - DO NOT INVENT OTHERS) ===")
        for community in communities:
            description = community.get('description', '')[:150] if community.get('description') else 'Parent support community'
            context_parts.append(
                f"- {community.get('name', 'Community')}: {description}..."
            )
    
    return "\n".join(context_parts) if context_parts else ""

