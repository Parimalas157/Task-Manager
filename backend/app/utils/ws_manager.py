from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    """Keeps track of active WebSocket connections, grouped by project_id,
    so task changes can be broadcast in real-time to everyone viewing the
    same board."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(project_id, []).append(websocket)

    def disconnect(self, project_id: str, websocket: WebSocket):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast(self, project_id: str, message: dict, exclude: WebSocket = None):
        connections = self.active_connections.get(project_id, [])
        payload = json.dumps(message, default=str)
        stale = []
        for connection in connections:
            if connection is exclude:
                continue
            try:
                await connection.send_text(payload)
            except Exception:
                stale.append(connection)
        for conn in stale:
            self.disconnect(project_id, conn)


manager = ConnectionManager()
