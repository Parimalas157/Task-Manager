from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.auth.security import decode_access_token
from app.utils.ws_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/projects/{project_id}")
async def project_websocket(websocket: WebSocket, project_id: str, token: str = Query(...)):
    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    await manager.connect(project_id, websocket)
    try:
        while True:
            # Clients don't need to send anything; this just keeps the
            # connection alive and detects disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
