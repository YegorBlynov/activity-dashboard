// ====== КОНФИГУРАЦИЯ ========
const SPREADSHEET_ID = '13tjmIANix1oLMiloTeFyLmJ7MLYBPMVosBeDlnLEYlk';
const API_KEY = 'AIzaSyD0bpldnBfTiugPRWgYcJpUvsCj1Kxv9Uo';
const RANGE = 'A1:G';
// =============================

// ====== ЦВЕТА ===============
const COLORS = {
    steps: '#BEFF26',
    activeTime: '#00E6FF',
    calories: '#FF355E',
};
// =============================

const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

const loadingOverlay = document.getElementById('loadingOverlay');
const monthsContainer = document.getElementById('monthsContainer');
const detailsPopup = document.getElementById('detailsPopup');
const detailsDate = document.getElementById('detailsDate');
const detailsStats = document.getElementById('detailsStats');
const closePopupBtn = document.getElementById('closePopupBtn');

let allData = [];
const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ---

/**
 * Преобразует HEX-цвет в формат RGBA.
 * @param {string} hex - Цвет в формате #RRGGBB.
 * @param {number} alpha - Прозрачность от 0 до 1.
 * @returns {string} - Цвет в формате rgba(r, g, b, alpha).
 */
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
        if (!response.ok) throw new Error('Network response was not ok');
        const json = await response.json();
        processData(json.values);
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Не удалось загрузить данные из Google Sheets.');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

function processData(values) {
    if (!values || values.length < 2) return;
    const headers = values[0];
    allData = values.slice(1).map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = row[index] || '';
        });
        const dateParts = rowData['Date'].split('.');
        if (dateParts.length === 3) {
            rowData.dateObject = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        }
        return rowData;
    }).filter(d => d.dateObject);
    renderAllMonths();
}

function renderAllMonths() {
    if (allData.length === 0) return;
    allData.sort((a, b) => a.dateObject - b.dateObject);
    const firstDate = allData[0].dateObject;
    const lastDate = new Date();
    let currentDateIterator = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);

    while (currentDateIterator <= lastDate) {
        const year = currentDateIterator.getFullYear();
        const month = currentDateIterator.getMonth();
        const monthBlock = document.createElement('div');
        monthBlock.classList.add('month-block');
        const title = document.createElement('h2');
        title.classList.add('month-title');
        title.textContent = `${MONTH_NAMES[month]} ${year}`;
        monthBlock.appendChild(title);
        const monthData = allData.filter(d => d.dateObject.getFullYear() === year && d.dateObject.getMonth() === month);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let fullyClosedDays = 0;
        const totals = { steps: 0, activeTime: 0, calories: 0 };
        if (monthData.length > 0) {
            fullyClosedDays = monthData.reduce((count, dayData) => {
                const steps = parseFloat(dayData['Steps']) || 0;
                const stepsTarget = parseFloat(dayData['Steps Target']) || 1;
                const activeTime = parseFloat(dayData['Active Time']) || 0;
                const activeTimeTarget = parseFloat(dayData['Active Time Target']) || 1;
                const calories = parseFloat(dayData['Calories']) || 0;
                const caloriesTarget = parseFloat(dayData['Calories Target']) || 1;
                if (steps >= stepsTarget && activeTime >= activeTimeTarget && calories >= caloriesTarget) {
                    return count + 1;
                }
                return count;
            }, 0);
            monthData.forEach(dayData => {
                totals.steps += parseFloat(dayData['Steps']) || 0;
                totals.activeTime += parseFloat(dayData['Active Time']) || 0;
                totals.calories += parseFloat(dayData['Calories']) || 0;
            });
        }
        const statsContainer = document.createElement('div');
        statsContainer.classList.add('month-stats');
        const targetReachedEl = document.createElement('p');
        targetReachedEl.textContent = `Цель достигнута: ${fullyClosedDays} / ${daysInMonth} дней`;
        const totalsEl = document.createElement('p');
        totalsEl.textContent = `${totals.steps.toLocaleString('ru-RU')} шагов | ${totals.activeTime.toLocaleString('ru-RU')} мин | ${totals.calories.toLocaleString('ru-RU')} кал`;
        statsContainer.appendChild(targetReachedEl);
        statsContainer.appendChild(totalsEl);
        monthBlock.appendChild(statsContainer);
        const grid = document.createElement('div');
        grid.classList.add('calendar-grid');
        renderMonthGrid(grid, year, month);
        monthBlock.appendChild(grid);
        monthsContainer.appendChild(monthBlock);
        currentDateIterator.setMonth(currentDateIterator.getMonth() + 1);
    }
    window.scrollTo(0, document.body.scrollHeight);
}

function renderMonthGrid(gridContainer, year, month) {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    for (let i = 0; i < startOffset; i++) {
        gridContainer.appendChild(document.createElement('div'));
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.classList.add('day-cell');
        const dateLabel = document.createElement('span');
        dateLabel.classList.add('date-label');
        dateLabel.textContent = day;
        cell.appendChild(dateLabel);
        const chartContainer = document.createElement('div');
        chartContainer.classList.add('chart-container');
        cell.appendChild(chartContainer);
        const currentDayData = allData.find(d => d.dateObject.getFullYear() === year && d.dateObject.getMonth() === month && d.dateObject.getDate() === day);
        renderDayChart(chartContainer, currentDayData);
        
        if (currentDayData) {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', () => {
                document.querySelectorAll('.day-cell.selected').forEach(selectedCell => {
                    selectedCell.classList.remove('selected');
                });
                cell.classList.add('selected');
                showDetailsPopup(currentDayData);
            });
        }
        gridContainer.appendChild(cell);
    }
}

// --- ФУНКЦИИ ДЛЯ POPUP ---

function showDetailsPopup(data) {
    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    detailsDate.textContent = data.dateObject.toLocaleDateString('ru-RU', dateOptions);

    const steps = parseFloat(data['Steps']) || 0;
    const stepsTarget = parseFloat(data['Steps Target']) || 1;
    const activeTime = parseFloat(data['Active Time']) || 0;
    const activeTimeTarget = parseFloat(data['Active Time Target']) || 1;
    const calories = parseFloat(data['Calories']) || 0;
    const caloriesTarget = parseFloat(data['Calories Target']) || 1;

    detailsStats.innerHTML = `
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

    detailsPopup.classList.add('visible');
}

function hideDetailsPopup() {
    detailsPopup.classList.remove('visible');
    document.querySelectorAll('.day-cell.selected').forEach(selectedCell => {
        selectedCell.classList.remove('selected');
    });
}


// --- ФУНКЦИЯ ОТРИСОВКИ КОЛЕЦ ---

function renderDayChart(container, data) {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const datasets = [];
    const ringThickness = 50;
    const ringGap = 5;
    const outerRadius = 100;
    const middleRadius = outerRadius - ringGap;
    const innerRadius = middleRadius - ringGap;
    
    const ringConfig = [
        { dataKey: 'Steps', targetKey: 'Steps Target', color: COLORS.steps, background: hexToRgba(COLORS.steps, 0.2), radius: outerRadius, cutout: outerRadius - ringThickness, borderRadius: 8 },
        { dataKey: 'Active Time', targetKey: 'Active Time Target', color: COLORS.activeTime, background: hexToRgba(COLORS.activeTime, 0.2), radius: middleRadius, cutout: middleRadius - ringThickness, borderRadius: 8 },
        { dataKey: 'Calories', targetKey: 'Calories Target', color: COLORS.calories, background: hexToRgba(COLORS.calories, 0.2), radius: innerRadius, cutout: innerRadius - ringThickness, borderRadius: 8 },
    ];
    
    ringConfig.forEach(config => {
        let chartData, chartColors, chartBorderRadius;
        if (data) {
            const value = parseFloat(data[config.dataKey]) || 0;
            const target = parseFloat(data[config.targetKey]) || 1;
            const percentage = (value / target) * 100;
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

// --- ЗАПУСК И ИНИЦИАЛИЗАЦИЯ ---
closePopupBtn.addEventListener('click', hideDetailsPopup);
fetchData();