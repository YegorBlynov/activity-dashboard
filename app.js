// ====== КОНФИГУРАЦИЯ ========
const API_URL = '/.netlify/functions/getActivityData';
// =============================

// ====== ЦВЕТА ===============
const COLORS = {
    steps: '#BEFF26',
    activeTime: '#00E6FF',
    calories: '#FF355E',
};
// =============================

const loadingOverlay = document.getElementById('loadingOverlay');
const todayWidget = document.getElementById('todayWidget');
const widgetDate = document.getElementById('widgetDate');
const widgetStats = document.getElementById('widgetStats');
const chartContainer = document.getElementById('chartContainer');
const chartDateLabel = document.getElementById('chartDateLabel');


// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ---
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- ОСНОВНАЯ ЛОГИКА ---
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Сетевой ответ был не в порядке');
        }
        const json = await response.json();
        processData(json.values);
    } catch (error) {
        console.error('Возникла проблема с операцией fetch:', error);
        loadingOverlay.textContent = 'Ошибка загрузки данных.';
    }
}

function processData(values) {
    if (!values || values.length < 2) {
        loadingOverlay.textContent = 'Нет данных для отображения.';
        return;
    }
    const headers = values[0];
    const allData = values.slice(1).map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = row[index] || '';
        });
        return rowData;
    });
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateToSearch = `${day}.${month}.${year}`;
    const todayData = allData.find(item => item['Date'] === dateToSearch);
    
    renderTodayWidget(todayData);
}

function renderTodayWidget(data) {
    const today = new Date();
    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    widgetDate.textContent = today.toLocaleDateString('ru-RU', dateOptions);

    chartDateLabel.textContent = today.getDate();
    renderDayChart(chartContainer, data);

    let statsHTML = '';
    if (data) {
        const steps = parseFloat(data['Steps']) || 0;
        const stepsTarget = parseFloat(data['Steps Target']) || 1;
        const activeTime = parseFloat(data['Active Time']) || 0;
        const activeTimeTarget = parseFloat(data['Active Time Target']) || 1;
        const calories = parseFloat(data['Calories']) || 0;
        const caloriesTarget = parseFloat(data['Calories Target']) || 1;
        
        statsHTML = `
            <div class="stat-item">
                <span class="icon" style="background-color: ${COLORS.steps};"></span>
                ${steps.toLocaleString('ru-RU')} / ${stepsTarget.toLocaleString('ru-RU')} <span class="label">шагов</span>
            </div>
            <div class="stat-item">
                <span class="icon" style="background-color: ${COLORS.activeTime};"></span>
                ${activeTime.toLocaleString('ru-RU')} / ${activeTimeTarget.toLocaleString('ru-RU')} <span class="label">мин</span>
            </div>
            <div class="stat-item">
                <span class="icon" style="background-color: ${COLORS.calories};"></span>
                ${calories.toLocaleString('ru-RU')} / ${caloriesTarget.toLocaleString('ru-RU')} <span class="label">кал</span>
            </div>
        `;
    } else {
        statsHTML = '<p>Нет данных за сегодня.</p>';
    }
    widgetStats.innerHTML = statsHTML;
    
    loadingOverlay.style.opacity = '0';
    todayWidget.style.display = 'flex';
}


// --- ФУНКЦИЯ ОТРИСОВКИ КОЛЕЦ ---
function renderDayChart(container, data) {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const datasets = [];
    const ringThickness = 50;
    const ringGap = 5;
    const outerRadius = 98;
    const middleRadius = outerRadius - ringGap;
    const innerRadius = middleRadius - ringGap;
    
    const MIN_VISUAL_PERCENTAGE = 7;

    const ringConfig = [
        { 
            dataKey: 'Steps', targetKey: 'Steps Target', color: COLORS.steps, background: hexToRgba(COLORS.steps, 0.2), radius: outerRadius, cutout: outerRadius - ringThickness, borderRadius: 8,
            minFillPercentage: MIN_VISUAL_PERCENTAGE * 0.5
        },
        { 
            dataKey: 'Active Time', targetKey: 'Active Time Target', color: COLORS.activeTime, background: hexToRgba(COLORS.activeTime, 0.2), radius: middleRadius, cutout: middleRadius - ringThickness, borderRadius: 8,
            minFillPercentage: MIN_VISUAL_PERCENTAGE * 0.68
        },
        { 
            dataKey: 'Calories', targetKey: 'Calories Target', color: COLORS.calories, background: hexToRgba(COLORS.calories, 0.2), radius: innerRadius, cutout: innerRadius - ringThickness, borderRadius: 8,
            minFillPercentage: MIN_VISUAL_PERCENTAGE 
        },
    ];
    
    ringConfig.forEach(config => {
        let chartData, chartColors, chartBorderRadius;
        if (data) {
            const value = parseFloat(data[config.dataKey]) || 0;
            const target = parseFloat(data[config.targetKey]) || 1;
            const calculatedPercentage = (value / target) * 100;
            const minFill = config.minFillPercentage;
            const percentage = value > 0 ? Math.max(minFill, calculatedPercentage) : 0;
            
            if (percentage > 0) {
                chartData = [Math.min(percentage, 100), 100 - Math.min(percentage, 100)];
                chartColors = [config.color, config.background];
                if (percentage >= 100) {
                    chartBorderRadius = 0;
                } else {
                    chartBorderRadius = config.borderRadius;
                }
            } else {
                chartData = [100];
                chartColors = [config.background];
                chartBorderRadius = 0;
            }
        } else {
            chartData = [100];
            chartColors = [config.background];
            chartBorderRadius = 0;
        }
        datasets.push({
            data: chartData,
            backgroundColor: chartColors,
            borderColor: 'transparent',
            borderWidth: 0,
            radius: `${config.radius}%`,
            cutout: `${config.cutout}%`,
            borderRadius: chartBorderRadius,
        });
    });

    new Chart(canvas, {
        type: 'doughnut',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            rotation: 0,
            circumference: 360,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { duration: 0 },
            events: []
        }
    });
}

// Запускаем загрузку данных
fetchData();