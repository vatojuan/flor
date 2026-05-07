# app/routers/agent.py
"""
Admin Agent chat endpoint.
Authenticated admin sends messages, receives AI-powered responses
with access to platform data and actions.
"""
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.utils.auth_utils import get_current_admin
from app.services.admin_agent import chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatRequest(BaseModel):
    messages: list[dict]


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
def agent_chat(req: ChatRequest, admin=Depends(get_current_admin)):
    """
    Send a message to the admin AI agent.
    Messages should be a list of {role: "user"|"assistant", content: "..."}.
    """
    logger.info("Agent chat request from admin %s (%d messages)", admin.email, len(req.messages))
    reply = chat(req.messages)
    return ChatResponse(reply=reply)
