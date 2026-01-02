# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: run.py
# Description: To start the Uvicorn ASGI server for running the FastAPI application
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Application entry point for running the FastAPI server

This script starts the Uvicorn ASGI server to run the FastAPI application.
It's used for local development and can be run directly with: python run.py
"""
import uvicorn

if __name__ == "__main__":
    # Start the Uvicorn ASGI server
    # This runs the FastAPI application defined in main.py
    uvicorn.run(
        "main:app",  # Reference to the FastAPI app instance in main.py
        host="0.0.0.0",  # Listen on all network interfaces (accessible from any IP)
        port=8000,  # Port number for the API server
        reload=True,  # Enable auto-reload on code changes (development mode)
        log_level="info"  # Set logging level to INFO
    ) 