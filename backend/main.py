from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sqlite3
from database import get_db
from llm_parser import parse_task, parse_day
import uuid
from datetime import date
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class TaskIn(BaseModel):
    title: str
    context: str | None = None
    priority: int = 2
    pomodoros: int = 1
    target_hour: str | None = None
    date: str | None = None

class TextoIn(BaseModel):
    texto: str

class FeedbackIn(BaseModel):
    date: str
    score: int
    notes: str | None = None

class DayTextIn(BaseModel):
    texto: str
    date: str | None = None

class TaskUpdate(BaseModel):
    status: str | None = None
    title: str | None = None
    context: str | None = None
    priority: int | None = None
    pomodoros: int | None = None
    target_hour: str | None = None
    position: int | None = None
    pomodoros_done: int | None = None

# Funciones auxiliares
def guardar_tarea(task: TaskIn) -> str:
    task_id = str(uuid.uuid4())
    task_date = task.date if task.date else str(date.today())
    with get_db() as conn:
        conn.execute("""
            INSERT INTO tasks (id, title, context, priority, pomodoros, target_hour, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (task_id, task.title, task.context, task.priority, task.pomodoros, task.target_hour, task_date))
        conn.commit()
    return task_id

@app.get("/")
def leer_raiz():
    return {"mensaje": "Hola, Agenda IA está funcionando"}

@app.post("/tasks")
def crear_tarea_endpoint(task: TaskIn):
    task_id = guardar_tarea(task)
    return {"id": task_id, "mensaje": "Tarea creada"}

@app.get("/agenda/{fecha}")
def listar_agenda(fecha: str):
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT * FROM tasks
            WHERE date = ?
            ORDER BY position, priority, target_hour
        """, (fecha,))
        tareas = cursor.fetchall()
        return [dict(t) for t in tareas]

@app.patch("/tasks/reorder")
def reordenar_tareas(orden: list[dict]):
    with get_db() as conn:
        for item in orden:
            conn.execute("UPDATE tasks SET position = ? WHERE id = ?", (item['position'], item['id']))
        conn.commit()
    return {"ok": True}

@app.post("/parse")
def parsear_texto(data: TextoIn):
    return parse_task(data.texto)

@app.post("/tasks/from-text")
def crear_tarea_desde_texto(data: TextoIn):
    parsed = parse_task(data.texto)
    tarea = TaskIn(
        title=parsed.get("title", "Sin título"),
        context=parsed.get("context"),
        priority=parsed.get("priority", 2),
        pomodoros=parsed.get("pomodoros", 1),
        target_hour=parsed.get("target_hour")
    )
    task_id = guardar_tarea(tarea)
    return {"id": task_id, "mensaje": "Tarea creada desde texto"}

@app.patch("/tasks/{task_id}")
def actualizar_tarea(task_id: str, updates: TaskUpdate):
    with get_db() as conn:
        # Construir dinámicamente la consulta UPDATE
        set_clauses = []
        values = []
        
        for field, value in updates.dict(exclude_unset=True).items():
            set_clauses.append(f"{field} = ?")
            values.append(value)
        
        if not set_clauses:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Si se cambia el status a 'done', actualizar done_at y registrar outcome
        if updates.status == 'done':
            set_clauses.append("done_at = CURRENT_TIMESTAMP")
        
        values.append(task_id)
        
        query = f"UPDATE tasks SET {', '.join(set_clauses)} WHERE id = ?"
        conn.execute(query, values)
        conn.commit()
        
        # Retornar la tarea actualizada
        cursor = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        task = cursor.fetchone()
        result = dict(task) if task else {"error": "Task not found"}

    if updates.status == 'done':
        from learner import record_task_outcome
        actual = updates.pomodoros_done if updates.pomodoros_done else 1
        record_task_outcome(task_id, was_completed=True, actual_pomodoros=actual)

    return result

@app.post("/feedback")
def guardar_feedback(fb: FeedbackIn):
    with get_db() as conn:
        cursor = conn.execute("SELECT COUNT(*) as total FROM tasks WHERE date = ?", (fb.date,))
        total = cursor.fetchone()['total']
        cursor = conn.execute("SELECT COUNT(*) as done FROM tasks WHERE date = ? AND status = 'done'", (fb.date,))
        done = cursor.fetchone()['done']

        conn.execute("""
            INSERT INTO feedback (date, score, notes, tasks_done, tasks_total)
            VALUES (?, ?, ?, ?, ?)
        """, (fb.date, fb.score, fb.notes, done, total))
        conn.commit()

    from learner import process_feedback
    learning_result = process_feedback(fb.date, fb.score, fb.notes)
    return {"ok": True, "learning": learning_result}


@app.post("/parse-day")
def parsear_dia(data: DayTextIn):
    return parse_day(data.texto)


@app.post("/tasks/from-day-text")
def crear_tareas_desde_dia(data: DayTextIn):
    task_date = data.date if data.date else str(date.today())
    parsed_tasks = parse_day(data.texto)
    saved = []
    for parsed in parsed_tasks:
        tarea = TaskIn(
            title=parsed.get("title", "Sin título"),
            context=parsed.get("context"),
            priority=parsed.get("priority", 2),
            pomodoros=parsed.get("pomodoros", 1),
            target_hour=parsed.get("target_hour"),
            date=task_date,
        )
        task_id = guardar_tarea(tarea)
        saved.append({"id": task_id, "title": tarea.title})
    return {"tasks": saved, "count": len(saved)}


@app.get("/agenda/{fecha}/plan")
def obtener_plan(fecha: str):
    from planner import generate_agenda
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM tasks WHERE date = ? AND status != 'done'", (fecha,)
        )
        tasks = [dict(t) for t in cursor.fetchall()]
    if not tasks:
        return []
    return generate_agenda(tasks, fecha)


@app.get("/learning/weights")
def obtener_pesos():
    from learner import get_planner_weights
    return get_planner_weights()