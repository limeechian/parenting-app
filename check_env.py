#!/usr/bin/env python3
"""
Check environment variables
"""

import os
from dotenv import load_dotenv

load_dotenv()

print("🔍 Checking Environment Variables")
print("=" * 40)

# Check required environment variables
required_vars = [
    "DATABASE_URL",
    "OPENAI_API_KEY", 
    "SECRET_KEY"
]

for var in required_vars:
    value = os.getenv(var)
    if value:
        # Mask sensitive values
        if "API_KEY" in var or "SECRET" in var or "PASSWORD" in var:
            masked_value = value[:10] + "..." + value[-5:] if len(value) > 15 else "***"
            print(f"✅ {var}: {masked_value}")
        else:
            print(f"✅ {var}: {value}")
    else:
        print(f"❌ {var}: NOT FOUND")

print("\n📋 Database URL Format:")
print("Expected: postgresql://username:password@host:port/database")
print("Example: postgresql://postgres:mypassword@localhost:5432/parenting_app")

print("\n🔧 If DATABASE_URL is missing:")
print("1. Check your .env file exists")
print("2. Make sure DATABASE_URL is set correctly")
print("3. Restart your terminal/IDE after adding it") 