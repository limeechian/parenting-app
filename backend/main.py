# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: main.py
# Description: To initialize FastAPI application, configure middleware, and register all API route handlers
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Main FastAPI application - Entry point for the ParenZing API

This module sets up the FastAPI application, configures middleware, exception handlers,
and includes all API routers. It serves as the central hub for all API endpoints.
"""
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import sys
import traceback
import time

from config import CORS_ORIGINS, logger
from dependencies import fastapi_users, get_current_user_flexible
from schemas.schemas import UserRead, UserCreate
from models.database import User

# Create FastAPI application instance with API documentation enabled
# This initializes the main application with metadata for Swagger/OpenAPI docs
app = FastAPI(
    title="ParenZing API",
    description="API for ParenZing parenting application. Use the 'Authorize' button to add your Bearer token.",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI endpoint
    redoc_url="/redoc"  # ReDoc endpoint
)

# Custom OpenAPI schema generator to add Bearer token security
# This customizes the OpenAPI/Swagger documentation to include authentication information
def custom_openapi():
    """
    Generate custom OpenAPI schema with Bearer token authentication
    
    This function customizes the OpenAPI schema to include JWT Bearer token
    authentication information, making it easier for developers to test
    authenticated endpoints in Swagger UI.
    
    Returns:
        dict: The OpenAPI schema dictionary
    """
    # Return cached schema if already generated
    if app.openapi_schema:
        return app.openapi_schema
    
    from fastapi.openapi.utils import get_openapi
    
    # Generate base OpenAPI schema from all registered routes
    openapi_schema = get_openapi(
        title="ParenZing API",
        version="1.0.0",
        description="API for ParenZing parenting application. Get your Bearer token from `/api/auth/jwt/login` endpoint.",
        routes=app.routes,
    )
    
    # Add Bearer token security scheme to the schema
    # This enables the "Authorize" button in Swagger UI
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT token. Get it from `/api/auth/jwt/login` endpoint. Format: Bearer <token>"
        }
    }
    
    # Apply security to all endpoints that use get_current_user_flexible
    # This will show the lock icon in Swagger UI for protected endpoints
    for path, path_item in openapi_schema.get("paths", {}).items():
        for method, operation in path_item.items():
            if isinstance(operation, dict) and "security" not in operation:
                # Check if endpoint requires authentication (has get_current_user_flexible dependency)
                # We'll mark protected endpoints manually or use a different approach
                pass
    
    # Cache the schema for future requests
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# Override the default OpenAPI schema generator
app.openapi = custom_openapi

# Request logging middleware for debugging and monitoring
# This middleware logs all incoming requests and their responses for debugging purposes
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Log all HTTP requests and responses for debugging
    
    This middleware intercepts all HTTP requests to log:
    - Request method, path, and headers
    - Response status code and processing time
    - Any exceptions that occur during request processing
    
    Args:
        request: The incoming HTTP request
        call_next: The next middleware/route handler in the chain
    
    Returns:
        Response: The HTTP response from the route handler
    """
    # Record start time to calculate request processing duration
    start_time = time.time()
    
    # Log request details to stdout (for development debugging)
    sys.stdout.write(f"\n{'='*80}\n")
    sys.stdout.write(f"🔵 MIDDLEWARE: NEW REQUEST RECEIVED\n")
    sys.stdout.write(f"🔵 MIDDLEWARE: Time: {time.time()}\n")
    sys.stdout.write(f"🔵 MIDDLEWARE: Method: {request.method}\n")
    sys.stdout.write(f"🔵 MIDDLEWARE: Path: {request.url.path}\n")
    sys.stdout.write(f"🔵 MIDDLEWARE: Full URL: {request.url}\n")
    sys.stdout.write(f"🔵 MIDDLEWARE: Origin: {request.headers.get('origin', 'NONE')}\n")
    sys.stdout.write(f"{'='*80}\n")
    sys.stdout.flush()
    
    # Also log to application logger
    logger.info(f"🔵 MIDDLEWARE: Request: {request.method} {request.url}")
    logger.info(f"🔵 MIDDLEWARE: Path: {request.url.path}")
    
    try:
        # Process the request through the next middleware/route handler
        response = await call_next(request)
        
        # Calculate request processing time
        elapsed = time.time() - start_time
        
        # Log response details
        sys.stdout.write(f"\n{'='*80}\n")
        sys.stdout.write(f"🔵 MIDDLEWARE: RESPONSE SENT\n")
        sys.stdout.write(f"🔵 MIDDLEWARE: Status: {response.status_code}\n")
        sys.stdout.write(f"🔵 MIDDLEWARE: Elapsed: {elapsed:.3f}s\n")
        sys.stdout.write(f"🔵 MIDDLEWARE: CORS Origin: {response.headers.get('access-control-allow-origin', 'NOT SET')}\n")
        sys.stdout.write(f"{'='*80}\n")
        sys.stdout.flush()
        
        logger.info(f"🔵 MIDDLEWARE: Response status: {response.status_code}")
        
        return response
    except Exception as e:
        # Log any exceptions that occur during request processing
        elapsed = time.time() - start_time
        sys.stdout.write(f"\n{'='*80}\n")
        sys.stdout.write(f"🔵 MIDDLEWARE: EXCEPTION IN MIDDLEWARE\n")
        sys.stdout.write(f"🔵 MIDDLEWARE: Error: {str(e)}\n")
        sys.stdout.write(f"🔵 MIDDLEWARE: Elapsed: {elapsed:.3f}s\n")
        sys.stdout.write(f"{'='*80}\n")
        sys.stdout.flush()
        traceback.print_exc()
        raise

# CORS (Cross-Origin Resource Sharing) Middleware
# This middleware enables the API to accept requests from the frontend application
# running on different origins (domains/ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # List of allowed frontend origins
    allow_credentials=True,  # Allow cookies and authentication headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all request headers
    expose_headers=["*"],  # Expose all response headers to the frontend
)

# Global exception handler to ensure CORS headers are always set
# This handler catches any unhandled exceptions and ensures CORS headers
# are included in the error response so the frontend can receive it
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler that ensures CORS headers are always set
    
    This handler catches all unhandled exceptions and:
    1. Logs the error for debugging
    2. Returns a JSON error response
    3. Ensures CORS headers are set so the frontend can receive the error
    
    Args:
        request: The HTTP request that caused the exception
        exc: The exception that was raised
    
    Returns:
        JSONResponse: Error response with CORS headers
    """
    # Log error details to stdout and logger
    sys.stdout.write(f"\n{'='*80}\n")
    sys.stdout.write(f"❌ GLOBAL EXCEPTION HANDLER\n")
    sys.stdout.write(f"❌ Method: {request.method}\n")
    sys.stdout.write(f"❌ Path: {request.url.path}\n")
    sys.stdout.write(f"❌ Error: {str(exc)}\n")
    sys.stdout.write(f"{'='*80}\n")
    sys.stdout.flush()
    logger.error(f"ERROR in {request.method} {request.url.path}: {str(exc)}")
    traceback.print_exc()
    
    # Get the origin of the request to set appropriate CORS headers
    origin = request.headers.get("origin")
    allowed_origins = CORS_ORIGINS
    
    # Create error response
    response = JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "path": str(request.url.path)
        }
    )
    
    # Set CORS headers based on the request origin
    # If the origin is in the allowed list, use it; otherwise use the first allowed origin
    if origin and origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = allowed_origins[0]
    
    # Set additional CORS headers to allow credentials and all methods/headers
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Referer, Origin"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    HTTP exception handler with CORS headers
    
    Handles HTTP exceptions (404, 401, 403, etc.) and ensures
    CORS headers are included in the response.
    
    Args:
        request: The HTTP request
        exc: The HTTP exception that was raised
    
    Returns:
        JSONResponse: Error response with CORS headers
    """
    # Get the origin of the request to set appropriate CORS headers
    origin = request.headers.get("origin")
    allowed_origins = CORS_ORIGINS
    
    # Create error response with the exception's status code and detail
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    
    # Set CORS headers
    if origin and origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = allowed_origins[0]
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Referer, Origin"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Validation exception handler with CORS headers
    
    Handles request validation errors (422) when request data doesn't
    match the expected schema. Ensures CORS headers are included.
    
    Args:
        request: The HTTP request
        exc: The validation error that was raised
    
    Returns:
        JSONResponse: Validation error response with CORS headers
    """
    # Get the origin of the request to set appropriate CORS headers
    origin = request.headers.get("origin")
    allowed_origins = CORS_ORIGINS
    
    # Create validation error response (422 status code)
    response = JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}  # Include detailed validation errors
    )
    
    # Set CORS headers
    if origin and origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = allowed_origins[0]
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Referer, Origin"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

# Include FastAPI Users registration router
# This provides the standard user registration endpoint from fastapi-users library
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/api/auth",
    tags=["auth"]
)

# Import all custom API routers
# These routers contain the application-specific endpoints
from routers import (
    auth, profiles, diary, chat, insights, communities, posts, messages,
    notifications, promotional_materials, admin, coordinator, content_manager,
    public, resources, settings
)

# Include all custom routers with /api prefix for consistency
# All endpoints are prefixed with /api to maintain a consistent API structure

# Authentication endpoints (login, logout, token refresh, etc.)
app.include_router(auth.router, prefix="/api", tags=["auth"])

# User profile management endpoints (parent, child, professional profiles)
app.include_router(profiles.router, prefix="/api", tags=["profiles"])

# Diary entry endpoints (create, read, update diary entries)
app.include_router(diary.router, prefix="/api", tags=["diary"])

# AI chat endpoints (conversations with AI agents)
app.include_router(chat.router, prefix="/api", tags=["chat"])

# AI insights endpoints (monthly/weekly summaries, insights generation)
app.include_router(insights.router, prefix="/api", tags=["insights"])

# Community endpoints (create, join, manage communities)
app.include_router(communities.router, prefix="/api", tags=["communities"])

# Community post endpoints (create, read, comment on posts)
app.include_router(posts.router, prefix="/api", tags=["posts"])

# Private messaging endpoints (send/receive private messages)
app.include_router(messages.router, prefix="/api", tags=["messages"])

# Notification endpoints (get notifications, mark as read)
app.include_router(notifications.router, prefix="/api", tags=["notifications"])

# Promotional materials endpoints (for professionals to submit promotional content)
app.include_router(promotional_materials.router, prefix="/api", tags=["promotional-materials"])

# Admin endpoints (admin-only operations)
app.include_router(admin.router, prefix="/api", tags=["admin"])

# Coordinator endpoints (review and approve professional profiles/materials)
app.include_router(coordinator.router, prefix="/api", tags=["coordinator"])

# Content Manager endpoints (manage reported content, moderate communities)
app.include_router(content_manager.router, prefix="/api", tags=["content-manager"])

# Public endpoints (no authentication required - public information)
app.include_router(public.router, prefix="/api", tags=["public"])

# Resources endpoints (educational resources for parents - published only)
app.include_router(resources.router, prefix="/api", tags=["resources"])

# Settings endpoints (user notification preferences, account settings)
app.include_router(settings.router, prefix="/api", tags=["settings"])

# User info endpoint (used by frontend to check authentication)
# This endpoint allows the frontend to verify if a user is authenticated
# and get basic user information
@app.get("/api/me")
async def get_me(user: User = Depends(get_current_user_flexible)):
    """
    Get current authenticated user information
    
    This endpoint is used by the frontend to:
    - Verify if the user is authenticated
    - Get basic user information (ID, email, role, verification status)
    
    Args:
        user: The authenticated user (from dependency injection)
    
    Returns:
        dict: User information including ID, email, role, verification status
    """
    logger.info(f"User authenticated: {user.email} (ID: {user.user_id})")
    return {
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "is_active": user.is_active
    }

@app.get("/")
async def root():
    """
    Root endpoint - API status check
    
    Returns:
        dict: API name and status
    """
    return {"message": "ParenZing API", "status": "running"}

@app.get("/health")
async def health():
    """
    Health check endpoint
    
    Used by monitoring systems to check if the API is running.
    
    Returns:
        dict: Health status
    """
    return {"status": "healthy"}
