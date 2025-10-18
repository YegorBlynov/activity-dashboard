// ====== КОНФИГУРАЦИЯ ========
const API_URL = '/.netlify/functions/getWeightData';
// =============================

const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

const loadingText = document.getElementById('loading-text');
const chartCanvas = document.getElementById('weightChart');
const btnAll = document.getElementById('btnAll');
const btnYear = document.getElementById('btnYear');

let fullDataset = [];
let weightChartInstance = null;

// --- ✅ 1. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ АДАПТИВНОСТИ ---
function getChartOptionsForScreenSize() {
    const isMobile = window.innerWidth <= 768;
    return {
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 8,
        borderWidth: isMobile ? 2 : 3,
    };
}

async function fetchData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const json = await response.json();
        processData(json.values);
    } catch (error) {
        console.error('Fetch error:', error);
        loadingText.textContent = 'Ошибка загрузки данных.';
    }
}

function processData(values) {
    if (!values || values.length < 2) {
        loadingText.textContent = 'Нет данных для отображения.';
        return;
    }
    const data = values.slice(1).map(row => {
        const dateParts = row[0].split('.');
        const weightValue = row[1] ? parseFloat(row[1].replace(',', '.')) : null;
        if (dateParts.length === 3 && weightValue !== null) {
            return {
                x: new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`),
                y: weightValue
            };
        }
        return null;
    }).filter(Boolean);

    fullDataset = data.sort((a, b) => a.x - b.x);
    loadingText.style.display = 'none';
    
    updateChart('all');
}

function updateChart(filterType) {
    let filteredData = [];
    const today = new Date();

    if (filterType === 'all') {
        filteredData = fullDataset;
    } else if (filterType === 'year') {
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        filteredData = fullDataset.filter(d => d.x >= oneYearAgo);
    }

    [btnAll, btnYear].forEach(btn => btn.classList.remove('active'));
    if (filterType === 'all') btnAll.classList.add('active');
    if (filterType === 'year') btnYear.classList.add('active');

    renderWeightChart(filteredData);
}

function renderWeightChart(data) {
    if (weightChartInstance) {
        weightChartInstance.destroy();
    }

    // ✅ 2. ПОЛУЧАЕМ АДАПТИВНЫЕ НАСТРОЙКИ ПЕРЕД ОТРИСОВКОЙ
    const chartConfig = getChartOptionsForScreenSize();

    const ctx = chartCanvas.getContext('2d');
    weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Вес',
                data: data,
                borderColor: '#BEFF26',
                backgroundColor: 'rgba(190, 255, 38, 0.2)',
                borderWidth: chartConfig.borderWidth, // Используем адаптивную толщину
                pointBackgroundColor: '#BEFF26',
                pointRadius: chartConfig.pointRadius, // Используем адаптивный радиус
                pointHoverRadius: chartConfig.pointHoverRadius, // Используем адаптивный радиус
                tension: 0.1,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        tooltipFormat: 'dd.MM.yyyy',
                        displayFormats: {
                            month: 'MM.yy'
                        }
                    },
                    ticks: { color: '#fff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: false,
                    ticks: { 
                        color: '#fff',
                        callback: function(value) { return value + ' кг'; }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
		    backgroundColor: '#000',
                    intersect: false,
		    displayColors: false,
                    callbacks: {
                        label: function(context) { return `Вес: ${context.parsed.y} кг`; }
                    }
                }
            }
        }
    });
}

// --- ОБРАБОТЧИКИ СОБЫТИЙ ---
btnAll.addEventListener('click', () => updateChart('all'));
btnYear.addEventListener('click', () => updateChart('year'));

// --- ✅ 3. ДОБАВЛЯЕМ СЛЕЖЕНИЕ ЗА ИЗМЕНЕНИЕМ РАЗМЕРА ОКНА ---
window.addEventListener('resize', () => {
    // Таймаут, чтобы не перерисовывать график слишком часто
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(() => {
        if (weightChartInstance) {
            // Перерисовываем с текущим активным фильтром
            const activeFilter = btnAll.classList.contains('active') ? 'all' : 'year';
            updateChart(activeFilter);
        }
    }, 250);
});

// Запускаем загрузку данных
fetchData();