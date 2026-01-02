# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: __init__.py
# Description: To export utility helper functions used throughout the application
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""Utility functions"""
from .helpers import (
    get_openai_embedding,
    generate_verification_token,
    send_verification_email,
    create_verification_record,
    generate_conversation_title,
    calculate_age_from_birthdate,
    extract_entry_data_by_type,
    fetch_relevant_diary_entries,
    format_diary_entries_for_context,
    generate_conversation_summary,
    normalize_string_array,
    merge_and_normalize_diary_array,
    verify_firebase_token,
    clean_response
)

__all__ = [
    "get_openai_embedding",
    "generate_verification_token",
    "send_verification_email",
    "create_verification_record",
    "generate_conversation_title",
    "calculate_age_from_birthdate",
    "extract_entry_data_by_type",
    "fetch_relevant_diary_entries",
    "format_diary_entries_for_context",
    "generate_conversation_summary",
    "normalize_string_array",
    "merge_and_normalize_diary_array",
    "verify_firebase_token",
    "clean_response"
]

