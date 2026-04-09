// API service

const API_BASE = '';

export async function fetchInitData() {
    const response = await fetch(`${API_BASE}/api/init`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

export async function runProcessing() {
    const response = await fetch(`${API_BASE}/api/run`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

export function exportToCSV(assignments) {
    const headers = ['ID;Текст;Категория_ориг;Категория_AI;Уверенность_%;Приоритет;Сложность;Ответственный;Уровень;Статус'];
    
    const rows = assignments.map(r => {
        const text = `"${(r.text || '').replace(/"/g, '""')}"`;
        const status = r.is_correct ? 'Верно' : 'Ошибка';
        return [
            r.ticket_id,
            text,
            r.original_category,
            r.ai_category,
            (r.confidence * 100).toFixed(1),
            r.urgency,
            r.difficulty,
            r.assigned_to,
            r.employee_level,
            status
        ].join(';');
    });
    
    return [...headers, ...rows];
}