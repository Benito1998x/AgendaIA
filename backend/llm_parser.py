import json
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

# Configurar Groq como primario (Google no disponible en Bolivia)
client = Groq(api_key=os.getenv("groq_api_key"))

def parse_task(user_input: str) -> dict:
    prompt = f"""
Parsea la siguiente tarea en lenguaje natural a JSON con este esquema exacto:
{{
  "title": "título corto y claro (máx 60 caracteres)",
  "priority": 1, 2 o 3  (1=urgente, 2=importante, 3=normal),
  "pomodoros": número entre 1 y 4 (estimación de ciclos de 25min),
  "target_hour": "HH:MM" o null si no se menciona hora,
  "context": "breve contexto adicional o null"
}}

Tarea: "{user_input}"

Responde SOLO con el JSON, sin texto adicional, sin markdown.
"""
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        texto = response.choices[0].message.content.strip()
        return _parse_json_response(texto, user_input)
    except Exception as e:
        print(f"Error con Groq: {e}")
        
    # Último fallback: respuesta por defecto
    return {
        "title": user_input,
        "priority": 2,
        "pomodoros": 1,
        "target_hour": None,
        "context": None
    }

def _clean_json_array(texto: str) -> list:
    """Limpia la respuesta LLM y garantiza una lista Python."""
    t = texto.strip()
    for prefix in ("```json", "```"):
        if t.startswith(prefix):
            t = t[len(prefix):]
    if t.endswith("```"):
        t = t[:-3]
    t = t.strip()
    data = json.loads(t)
    return data if isinstance(data, list) else [data]


def parse_day(texto: str) -> list[dict]:
    """Extrae TODAS las tareas de un texto de día en lenguaje natural. 1 llamada LLM."""
    prompt = f"""Eres un asistente de planificación. El usuario describe su día.
Extrae TODAS las tareas y devuelve un array JSON.

Reglas:
- Cada tarea = un objeto separado
- target_hour: hora exacta "HH:MM" | tiempo relativo → "mañana temprano"→"08:00", "mediodía"→"12:00", "tarde"→"16:00", "noche"→"20:00" | null si no hay hora
- priority: 1=urgente ("urgente","crítico","sí o sí"), 2=importante (reuniones,entregas), 3=opcional ("si da tiempo","cuando pueda")
- pomodoros: 1=llamada corta, 2=tarea media, 3=concentración extendida, 4=proyecto grande
- context: detalle relevante o null
- title: máx 60 chars, claro y concreto

Esquema de cada objeto:
{{"title":"string","priority":1|2|3,"pomodoros":1|2|3|4,"target_hour":"HH:MM"|null,"context":"string"|null}}

Texto: "{texto}"

Responde SOLO con el array JSON, sin markdown:"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        texto_resp = response.choices[0].message.content.strip()
        return _clean_json_array(texto_resp)
    except Exception as e:
        print(f"Error en parse_day: {e}")
        return [{
            "title": texto[:60],
            "priority": 2,
            "pomodoros": 1,
            "target_hour": None,
            "context": None
        }]


def _parse_json_response(texto: str, user_input: str) -> dict:
    try:
        if texto.startswith("```json"):
            texto = texto[7:]
        if texto.startswith("```"):
            texto = texto[3:]
        if texto.endswith("```"):
            texto = texto[:-3]
        return json.loads(texto.strip())
    except Exception as e:
        print(f"Error parseando respuesta: {e}")
        print(f"Respuesta cruda: {texto}")
        return {
            "title": user_input,
            "priority": 2,
            "pomodoros": 1,
            "target_hour": None,
            "context": None
        }
