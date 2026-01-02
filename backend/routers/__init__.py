# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: __init__.py
# Description: To export all API routers for different functional domains
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
API routers module

This module imports and exports all API routers for the application.
Each router handles a specific domain of functionality:
- auth: Authentication and user management
- profiles: User profile management (parent, child, professional)
- diary: Diary entry management
- chat: AI chat conversations
- insights: AI-generated insights and summaries
- communities: Community management
- posts: Community post management
- messages: Private messaging
- notifications: Notification management
- promotional_materials: Promotional content management
- admin: Admin-only operations
"""
from . import (
    auth, profiles, diary, chat, insights, communities, posts,
    messages, notifications, promotional_materials, admin
)

# Export all routers for use in main.py
__all__ = [
    "auth", "profiles", "diary", "chat", "insights", "communities",
    "posts", "messages", "notifications", "promotional_materials", "admin"
]

