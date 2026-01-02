# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: sse_manager.py
# Description: To manage Server-Sent Events connections for real-time notification delivery
# First Written on: Sunday, 05-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Server-Sent Events (SSE) Connection Manager

This module manages active SSE (Server-Sent Events) connections for real-time
notifications. It allows the backend to push notifications to connected clients
without requiring them to poll for updates.

SSE is used for:
- Real-time notification delivery
- Message updates
- Connection heartbeat to keep connections alive
"""
import asyncio
from typing import Dict, Set, AsyncGenerator
from datetime import datetime
import json
from config import logger

class SSEManager:
    """
    Manages SSE connections for real-time notifications
    
    This class maintains a registry of active SSE connections per user.
    Each user can have multiple connections (e.g., multiple browser tabs).
    When a notification is sent, it's delivered to all active connections for that user.
    """
    
    def __init__(self):
        """
        Initialize the SSE manager
        
        Creates an empty connection registry and a lock for thread-safe operations.
        """
        # Map user_id -> Set of active connection queues
        # Each queue represents one SSE connection (e.g., one browser tab)
        self._connections: Dict[int, Set[asyncio.Queue]] = {}
        # Lock for thread-safe access to connections dictionary
        self._lock = asyncio.Lock()
    
    async def add_connection(self, user_id: int) -> asyncio.Queue:
        """Add a new SSE connection for a user"""
        queue = asyncio.Queue()
        
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(queue)
            logger.info(f"SSE connection added for user {user_id}. Total connections: {len(self._connections[user_id])}")
        
        return queue
    
    async def remove_connection(self, user_id: int, queue: asyncio.Queue):
        """Remove an SSE connection for a user"""
        async with self._lock:
            if user_id in self._connections:
                self._connections[user_id].discard(queue)
                if not self._connections[user_id]:
                    del self._connections[user_id]
                logger.info(f"SSE connection removed for user {user_id}. Remaining connections: {len(self._connections.get(user_id, set()))}")
    
    async def send_notification(self, user_id: int, notification_data: dict):
        """Send notification to all active connections for a user"""
        async with self._lock:
            connections = self._connections.get(user_id, set()).copy()
        
        if not connections:
            logger.debug(f"No active SSE connections for user {user_id}")
            return
        
        # Send to all connections for this user
        message = json.dumps(notification_data)
        disconnected = []
        
        for queue in connections:
            try:
                await queue.put(message)
            except Exception as e:
                logger.error(f"Error sending notification to queue: {e}")
                disconnected.append(queue)
        
        # Clean up disconnected queues
        if disconnected:
            async with self._lock:
                if user_id in self._connections:
                    for queue in disconnected:
                        self._connections[user_id].discard(queue)
                    if not self._connections[user_id]:
                        del self._connections[user_id]
        
        logger.info(f"Sent notification to {len(connections) - len(disconnected)} connection(s) for user {user_id}")
    
    async def send_message_update(self, user_id: int, message_data: dict):
        """Send message/conversation update to all active connections for a user"""
        # Reuse the same mechanism as notifications
        await self.send_notification(user_id, message_data)
    
    async def send_heartbeat(self, user_id: int):
        """Send heartbeat to keep connection alive"""
        async with self._lock:
            connections = self._connections.get(user_id, set()).copy()
        
        for queue in connections:
            try:
                await queue.put(": heartbeat\n\n")
            except Exception as e:
                logger.error(f"Error sending heartbeat: {e}")
    
    def get_active_connections_count(self, user_id: int = None) -> int:
        """Get count of active connections (for a user or total)"""
        if user_id:
            return len(self._connections.get(user_id, set()))
        return sum(len(conns) for conns in self._connections.values())
    
    async def event_generator(self, user_id: int) -> AsyncGenerator[str, None]:
        """Generate SSE events for a user"""
        queue = await self.add_connection(user_id)
        
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'timestamp': datetime.now().isoformat()})}\n\n"
            
            # Keep connection alive and send notifications
            while True:
                try:
                    # Wait for message with timeout for heartbeat
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    
                    if message == ": heartbeat\n\n":
                        yield message
                    else:
                        yield f"data: {message}\n\n"
                        
                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield ": heartbeat\n\n"
                except Exception as e:
                    logger.error(f"Error in event generator for user {user_id}: {e}")
                    break
                    
        finally:
            # Clean up connection
            await self.remove_connection(user_id, queue)
            logger.info(f"SSE event generator closed for user {user_id}")

# Global SSE manager instance
sse_manager = SSEManager()

