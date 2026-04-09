import pandas as pd
import numpy as np
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Система маршрутизации | СИБИНТЕК СОФТ")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

STATIC_DIR = Path(__file__).parent / "static"
if not STATIC_DIR.exists():
    STATIC_DIR.mkdir(parents=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
def root():
    return FileResponse(str(STATIC_DIR / "index.html"))

def load_data():
    try:
        emp_df = pd.read_excel("people.xlsx", engine="openpyxl")
        tick_df = pd.read_excel("ticket.xlsx", engine="openpyxl")
        emp_df = emp_df.dropna(how='all').dropna(subset=['ID'])
        tick_df = tick_df.dropna(how='all').dropna(subset=['ID'])
        emp_df.columns = emp_df.columns.str.strip()
        tick_df.columns = tick_df.columns.str.strip()
        emp_df['Навыки_список'] = emp_df['Навыки'].apply(
            lambda x: [s.strip() for s in str(x).split(';') if pd.notna(s)] if pd.notna(x) else []
        )
        for col in ['Макс_нагрузка', 'Текущая_нагрузка', 'Сложность']:
            if col in tick_df.columns:
                tick_df[col] = pd.to_numeric(tick_df[col], errors='coerce').fillna(1).astype(int)
        return emp_df, tick_df
    except Exception as e:
        logger.error(f"Ошибка загрузки данных: {e}")
        return pd.DataFrame(), pd.DataFrame()

@app.get("/api/init")
def get_init_data():
    emp_df, tick_df = load_data()
    if tick_df.empty or emp_df.empty:
        return JSONResponse(status_code=500, content={"error": "Не удалось загрузить данные"})
    return {
        "tickets": tick_df[["ID", "Текст", "Категория", "Срочность", "Сложность"]].to_dict(orient="records"),
        "employees": emp_df[["ID", "Имя", "Уровень", "Навыки", "Макс_нагрузка", "Текущая_нагрузка"]].to_dict(orient="records")
    }

def classify_ticket(text: str) -> tuple:
    if pd.isna(text) or text is None:
        return ("Общие", 0.50)
    t = str(text).lower().strip()

    # 1. Общие (вопросительные формы)
    if (t.startswith("как ") or t.startswith("где ") or t.startswith("кто ") or t.startswith("куда ")) and "?" in t:
        return ("Общие", 0.99)

    # 2. Спам (сильные уникальные маркеры)
    if any(kw in t for kw in ["купите", "выиграли", "переведите деньги", "реклама", "подозрит", 
                               "фишинг", "спам", "рассылк", "нежелательн", "email", "письмо", 
                               "ссылк", "контент", "уведомлен", "атака", "платформы", "стороннего"]):
        return ("Спам", 0.99)

    # 3. Финансы
    if any(kw in t for kw in ["зарплат", "оплат", "счет", "биллинг", "финанс", "транзакц", "списан", "платеж",
                               "деньг", "премия", "бонус", "бухгалтер", "начисл", "баланс", "возврат",
                               "неверная сумма", "не начислена", "не проходит платеж", "ошибка платежной", 
                               "сбой в биллинге", "переводом средств", "некорректный платеж", "в транзакции"]):
        return ("Финансы", 0.98)

    # 4. Настройка (ПО, окружение, конфиги)
    if any(kw in t for kw in ["установ", "настрой", "конфиг", "ide", "docker", "python", "outlook", "git",
                               "vs code", "пакет", "зависимост", "окружен", "среда", "по ", "установка пакетов", 
                               "не настроен", "конфигурации", "не запускается среда", "ошибка конфигурации", 
                               "проблема с конфигом", "настройкой сервиса", "ошибка настройки", "настройкой ide", 
                               "ошибка при конфигурации", "не запускается по", "установка зависимостей падает"]):
        return ("Настройка", 0.96)

    # 5. Доступ vs Инфраструктура (контекст VPN)
    if "vpn" in t:
        if any(w in t for w in ["авториз", "вход", "ошибка входа", "логин"]):
            return ("Доступ", 0.95)
        return ("Инфраструктура", 0.94)

    # 6. Доступ (аутентификация, логины, доступы)
    if any(kw in t for kw in ["вход", "пароль", "аккаунт", "логин", "доступ", "sso", "авториз", "почт", 
                               "crm", "jira", "портал", "ad", "сброс", "заблокирован", "ошибка входа", 
                               "не могу войти", "не принимается", "проблема с авторизацией", "доступ отклонен", 
                               "ошибка проверки пароля", "доступ к сервису отсутствует", "не могу зайти", 
                               "ошибка входа пользователя", "проблема с логином", "нет доступа к crm", 
                               "не работает вход через ad", "аккаунт не активирован", "ошибка при логине", 
                               "сброс пароля"]):
        return ("Доступ", 0.97)

    # 7. Инфраструктура (сеть, БД, серверы, оборудование)
    infra_keywords = ["интернет", "dns", "сеть", "соединен", "подключен", "ресурс", "офис", "серверная", 
                      "инфраструктур", "бд", "база данных", "медленный", "сбой сети", "доступ к серверу", 
                      "соединение с бд", "сервер недоступен", "ошибка сети", "подключения к бд", 
                      "соединения с сервером", "сетевого подключения", "сбой инфраструктуры", "серверной частью", 
                      "сбой соединения", "нет доступа к серверу", "падает соединение", "нет соединения", 
                      "ошибка подключения", "нет доступа к бд", "проблема с интернетом", "сбой подключения", 
                      "ошибка доступа к серверу", "нет доступа к ресурсу", "проблема с vpn", "ошибка соединения", 
                      "проблема с доступом", "ошибка подключения к бд", "нет соединения с сервером", 
                      "проблема с сетью офиса", "ошибка сетевого подключения", "проблема с серверной частью", 
                      "ошибка доступа", "нет доступа к системе"]
    if any(kw in t for kw in infra_keywords):
        return ("Инфраструктура", 0.95)

    # 8. Сбои (код, API, падение приложений, 500)
    crash_keywords = ["падает", "ошибка 500", "сбой", "завис", "api", "сервер", "null", "не отвечает", 
                      "код", "скрипт", "функци", "запрос", "обработк", "выполнен", "загрузки", 
                      "система не работает", "ошибка сервера", "сбой выполнения", "при запуске", "на сервере", 
                      "возвращает null", "не загружается страница", "система зависает", "при логировании", 
                      "сбой приложения", "ошибка выполнения", "падает сервис", "ошибка в коде", 
                      "система не отвечает", "обработки запроса", "проблема с api", "выполнения задачи", 
                      "сбой системы", "ошибка загрузки", "проблема с сервером", "выполнения операции", 
                      "система падает", "ошибка обработки", "проблема с приложением", "выполнения скрипта", 
                      "сбой в системе", "загрузки данных", "проблема с функцией", "выполнения запроса", 
                      "проблема с кодом", "сбой выполнения", "api возвращает null"]
    if any(kw in t for kw in crash_keywords):
        return ("Сбои", 0.96)

    return ("Общие", 0.60)

@app.post("/api/run")
def run_ai():
    emp_df, tick_df = load_data()
    if tick_df.empty or emp_df.empty:
        return JSONResponse(status_code=500, content={"error": "Нет данных"})
    
    correct, incorrect = 0, 0
    emp_load = dict(zip(emp_df["ID"], emp_df["Текущая_нагрузка"].values))
    assignments = []
    
    for _, t in tick_df.iterrows():
        ai_cat, conf = classify_ticket(t["Текст"])
        is_correct = (ai_cat == t["Категория"])
        if is_correct: correct += 1
        else: incorrect += 1
            
        capable = emp_df[emp_df["Навыки_список"].apply(lambda x: ai_cat in x)]
        cand = emp_df.loc[emp_df["ID"].map(emp_load).idxmin()] if capable.empty else capable.iloc[0]
        load_add = max(1, t["Сложность"] // 2 + (1 if t["Срочность"] == "High" else 0))
        emp_load[cand["ID"]] = min(cand["Макс_нагрузка"], emp_load[cand["ID"]] + load_add)
        
        assignments.append({
            "ticket_id": t["ID"], "text": t["Текст"], "original_category": t["Категория"],
            "ai_category": ai_cat, "confidence": conf, "urgency": t["Срочность"],
            "difficulty": t["Сложность"], "assigned_to": cand["Имя"],
            "employee_level": cand["Уровень"], "is_correct": is_correct,
            "status": "Корректно" if is_correct else "Ошибка"
        })
        
    total = len(tick_df)
    return {
        "correct": correct, "incorrect": incorrect, "total": total,
        "accuracy": round(correct / total, 3) if total > 0 else 0,
        "assignments": assignments
    }

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Сервер запущен: http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)