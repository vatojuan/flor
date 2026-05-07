"""
Admin AI Agent — conversational assistant with database access.

Uses OpenAI function calling to translate natural language requests
into database queries and platform actions.
"""
import json
import logging
import os
from openai import OpenAI
from app.services.agent_tools import TOOL_DEFINITIONS, TOOL_FUNCTIONS

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
client = OpenAI(api_key=OPENAI_API_KEY, timeout=60)

SYSTEM_PROMPT = """Eres FAPY, el asistente inteligente de FAP Mendoza, una plataforma de recursos humanos.
Ayudas al admin a gestionar candidatos, ofertas de trabajo, y comunicaciones.

Capacidades:
- Buscar candidatos por rubro, nombre, habilidades o descripcion
- Buscar ofertas de trabajo activas o historicas
- Crear grupos de mailing guardados (quedan en la seccion Mailing > Grupos del admin)
- Ver que candidatos hacen match con una oferta especifica
- Armar grupos de candidatos para envio de emails
- Ver estadisticas de la plataforma
- Enviar emails masivos a grupos de candidatos (SOLO si el admin lo pide explicitamente)

Reglas:
- Responde siempre en espanol
- Se conciso pero amable
- Cuando muestres candidatos, incluye nombre, email, rubro y telefono si los tiene
- Cuando muestres ofertas, incluye titulo, rubro y cantidad de candidatos
- Si el admin pide enviar emails, SIEMPRE confirma antes de enviar mostrando la cantidad de destinatarios y el contenido
- Nunca inventes datos — usa las funciones para consultar la base de datos
- Si no encontras resultados, sugeri alternativas (otro rubro, busqueda mas amplia)
- Formatea las respuestas con markdown para mejor legibilidad
- Cuando muestres listas largas, usa tablas markdown
- Si el admin pide algo que no puedes hacer, explicale que funciones tenes disponibles

Contexto de la plataforma:
- Los candidatos (empleados) tienen: nombre, email, telefono, rubro, descripcion, CV
- Las ofertas tienen: titulo, descripcion, requisitos, rubro, fecha expiracion
- El matching usa similitud de embeddings + bonus por rubro coincidente
- Los rubros se asignan automaticamente al procesar CVs"""


def chat(messages: list[dict], max_iterations: int = 5) -> str:
    """
    Process a chat conversation with the admin agent.

    Args:
        messages: List of {role, content} dicts (conversation history)
        max_iterations: Max tool-calling loops to prevent infinite recursion

    Returns:
        The agent's text response
    """
    # Prepend system prompt
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    for _ in range(max_iterations):
        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=full_messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
                max_tokens=1500,
                temperature=0.4,
            )
        except Exception as e:
            logger.error("Agent chat error: %s", e)
            return "Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo."

        choice = response.choices[0]

        # If the model wants to call functions
        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            # Add the assistant's message with tool calls
            full_messages.append(choice.message)

            # Execute each tool call
            for tool_call in choice.message.tool_calls:
                fn_name = tool_call.function.name
                fn_args = json.loads(tool_call.function.arguments)

                logger.info("Agent calling %s with args: %s", fn_name, fn_args)

                fn = TOOL_FUNCTIONS.get(fn_name)
                if fn:
                    try:
                        result = fn(**fn_args)
                    except Exception as e:
                        logger.error("Tool %s failed: %s", fn_name, e)
                        result = {"error": str(e)}
                else:
                    result = {"error": f"Funcion {fn_name} no encontrada"}

                # Add tool result to conversation
                full_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, default=str, ensure_ascii=False),
                })

            # Continue the loop to let GPT process the results
            continue

        # Model returned a text response (no more tool calls)
        return choice.message.content or "No tengo respuesta para eso."

    return "Se alcanzo el limite de operaciones. Intenta con una consulta mas simple."
