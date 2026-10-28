"""In-memory WebSocket hub.

Works for a single process. For multiple workers/instances, publish events via
Redis pub/sub or MongoDB change streams and fan out from there.
"""
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[WebSocket, str] = {}  # ws -> role

    async def connect(self, ws: WebSocket, role: str) -> None:
        await ws.accept()
        self.connections[ws] = role

    def disconnect(self, ws: WebSocket) -> None:
        self.connections.pop(ws, None)

    async def broadcast(self, message: dict, roles: set[str] | None = None) -> None:
        for ws, role in list(self.connections.items()):
            if roles and role not in roles:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()
