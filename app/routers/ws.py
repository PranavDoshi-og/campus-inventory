from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from ..deps import user_from_token
from ..realtime import manager

router = APIRouter(tags=["realtime"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """Connect with ws://host/ws?token=<JWT>.

    Everyone receives `stock_update`; only organizers receive `alert`.
    """
    try:
        user = await user_from_token(token)
    except HTTPException:
        await websocket.close(code=4401)
        return
    await manager.connect(websocket, user["role"])
    try:
        while True:
            await websocket.receive_text()  # keep-alive; client messages ignored
    except WebSocketDisconnect:
        manager.disconnect(websocket)
