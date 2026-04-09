document.addEventListener('DOMContentLoaded', () => {
    let lastResults = null;

    const els = {
        runBtn: document.getElementById('runBtn'),
        exportBtn: document.getElementById('exportBtn'),
        loader: document.getElementById('loader'),
        stats: document.getElementById('stats'),
        resultsSection: document.getElementById('results-section'),
        bodyTickets: document.getElementById('body-tickets'),
        bodyEmployees: document.getElementById('body-employees'),
        bodyResults: document.getElementById('body-results'),
        ticketCount: document.getElementById('ticket-count'),
        empCount: document.getElementById('emp-count'),
        resultCount: document.getElementById('result-count'),
        statTotal: document.getElementById('stat-total'),
        statCorrect: document.getElementById('stat-correct'),
        statIncorrect: document.getElementById('stat-incorrect'),
        statAccuracy: document.getElementById('stat-accuracy')
    };

    const getUrgencyClass = (u) => u === 'High' ? 'bg-red-100 text-red-700' : u === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
    const getLevelClass = (l) => l === 'Senior' ? 'bg-indigo-100 text-indigo-700' : l === 'Middle' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600';
    const setText = (el, val) => { if(el) el.textContent = val; };
    const show = (el) => { if(el) el.classList.remove('hidden'); };
    const hide = (el) => { if(el) el.classList.add('hidden'); };

    function renderTickets(tickets) {
        setText(els.ticketCount, `(${tickets?.length || 0})`);
        if (!tickets?.length) {
            els.bodyTickets.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Нет данных</td></tr>';
            return;
        }
        els.bodyTickets.innerHTML = tickets.slice(0, 100).map(t => `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-mono text-xs text-slate-500">${t.ID}</td>
                <td class="px-4 py-3 max-w-[180px] truncate" title="${t.Текст}">${t.Текст}</td>
                <td class="px-4 py-3"><span class="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded">${t.Категория}</span></td>
                <td class="px-4 py-3"><span class="${getUrgencyClass(t.Срочность)} px-2 py-0.5 rounded text-xs">${t.Срочность}</span></td>
            </tr>`).join('');
    }

    function renderEmployees(emps) {
        setText(els.empCount, `(${emps?.length || 0})`);
        if (!emps?.length) {
            els.bodyEmployees.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Нет данных</td></tr>';
            return;
        }
        els.bodyEmployees.innerHTML = emps.map(e => `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">${e.Имя}</td>
                <td class="px-4 py-3"><span class="${getLevelClass(e.Уровень)} px-2 py-0.5 rounded text-xs">${e.Уровень}</span></td>
                <td class="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate">${e.Навыки}</td>
                <td class="px-4 py-3 text-xs">${e.Текущая_нагрузка}/${e.Макс_нагрузка}</td>
            </tr>`).join('');
    }

    function renderResults(assignments) {
        setText(els.resultCount, `(${assignments?.length || 0})`);
        if (!assignments?.length) {
            els.bodyResults.innerHTML = '<tr><td colspan="9" class="px-4 py-8 text-center text-slate-400">Нет данных</td></tr>';
            return;
        }
        els.bodyResults.innerHTML = assignments.map(r => `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-mono text-xs text-slate-500">${r.ticket_id}</td>
                <td class="px-4 py-3 max-w-[200px] truncate" title="${r.text}">${r.text}</td>
                <td class="px-4 py-3"><span class="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded">${r.original_category}</span></td>
                <td class="px-4 py-3"><span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">${r.ai_category}</span></td>
                <td class="px-4 py-3 text-xs">${(r.confidence * 100).toFixed(0)}%</td>
                <td class="px-4 py-3"><span class="${getUrgencyClass(r.urgency)} px-2 py-0.5 rounded text-xs">${r.urgency}</span></td>
                <td class="px-4 py-3 font-medium">${r.assigned_to}</td>
                <td class="px-4 py-3"><span class="${getLevelClass(r.employee_level)} px-2 py-0.5 rounded text-xs">${r.employee_level}</span></td>
                <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-medium ${r.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${r.status}</span></td>
            </tr>`).join('');
    }

    async function loadInitData() {
        try {
            const res = await fetch('/api/init');
            if (!res.ok) throw new Error('Ошибка загрузки данных');
            const data = await res.json();
            renderTickets(data.tickets);
            renderEmployees(data.employees);
        } catch (err) {
            console.error(err);
            alert('Не удалось загрузить таблицы. Проверьте консоль.');
        }
    }

    async function runProcessing() {
        hide(els.stats);
        hide(els.resultsSection);
        hide(els.exportBtn);
        show(els.loader);
        els.runBtn.disabled = true;
        els.runBtn.textContent = 'Обработка...';

        try {
            const res = await fetch('/api/run', { method: 'POST' });
            if (!res.ok) throw new Error('Ошибка сервера');
            const data = await res.json();

            setText(els.statTotal, data.total);
            setText(els.statCorrect, data.correct);
            setText(els.statIncorrect, data.incorrect);
            setText(els.statAccuracy, `${(data.accuracy * 100).toFixed(1)}%`);

            lastResults = data.assignments;
            renderResults(data.assignments);

            show(els.stats);
            show(els.resultsSection);
            show(els.exportBtn);
        } catch (err) {
            console.error(err);
            alert('Ошибка при обработке: ' + err.message);
        } finally {
            hide(els.loader);
            els.runBtn.disabled = false;
            els.runBtn.textContent = 'Запустить обработку';
        }
    }

    function exportToCSV() {
        if (!lastResults?.length) return alert('Нет данных для экспорта');
        const headers = ['ID;Текст;Категория_ориг;Категория_AI;Уверенность_%;Приоритет;Сложность;Ответственный;Уровень;Статус'];
        const rows = lastResults.map(r => {
            const text = `"${(r.text || '').replace(/"/g, '""')}"`;
            const status = r.is_correct ? 'Корректно' : 'Ошибка';
            return [r.ticket_id, text, r.original_category, r.ai_category, (r.confidence*100).toFixed(1), r.urgency, r.difficulty, r.assigned_to, r.employee_level, status].join(';');
        });
        const csv = '\uFEFF' + [headers.join('\n'), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `routing_report_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    els.runBtn.addEventListener('click', runProcessing);
    els.exportBtn.addEventListener('click', exportToCSV);
    loadInitData();
});