// Utility functions

export function getUrgencyClass(urgency) {
    const map = {
        'High': 'urgency-high',
        'Medium': 'urgency-medium',
        'Low': 'urgency-low'
    };
    return map[urgency] || 'urgency-low';
}

export function getLevelClass(level) {
    const map = {
        'Senior': 'level-senior',
        'Middle': 'level-middle',
        'Junior': 'level-junior'
    };
    return map[level] || 'level-junior';
}

export function formatConfidence(value) {
    return `${(value * 100).toFixed(0)}%`;
}

export function truncateText(text, maxLength = 200) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

export function showElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.remove('hidden');
}

export function hideElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
}

export function setTextContent(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

export function downloadCSV(data, filename) {
    const BOM = '\uFEFF';
    const csv = BOM + data.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}