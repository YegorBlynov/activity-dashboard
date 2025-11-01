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
const monthsContainer = document.getElementById('monthsContainer');
const detailsPopup = document.getElementById('detailsPopup');
const detailsDate = document.getElementById('detailsDate');
const detailsStats = document.getElementById('detailsStats');
const closePopupBtn = document.getElementById('closePopupBtn');
const spotlightOverlay = document.getElementById('spotlightOverlay');

const btnByMonth = document.getElementById('btnByMonth');
const btnByYear = document.getElementById('btnByYear');
const yearsContainer = document.getElementById('yearsContainer');

let allData = [];
const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const MONTH_NAMES_SHORT = [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

let hasRenderedYearlyView = false;

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

    allData.sort((a, b) => a.dateObject - b.dateObject);

    renderByMonthView();
}

// --- ✅ ОБНОВЛЕННАЯ ФУНКЦИЯ ПОДСЧЕТА СТАТИСТИКИ ---
// (Добавлена вспомогательная функция isDayClosed)

function isDayClosed(dayData) {
    const steps = parseFloat(dayData['Steps']) || 0;
    const stepsTarget = parseFloat(dayData['Steps Target']) || 1;
    const activeTime = parseFloat(dayData['Active Time']) || 0;
    const activeTimeTarget = parseFloat(dayData['Active Time Target']) || 1;
    const calories = parseFloat(dayData['Calories']) || 0;
    const caloriesTarget = parseFloat(dayData['Calories Target']) || 1;

    return steps >= stepsTarget && activeTime >= activeTimeTarget && calories >= caloriesTarget;
}

function calculateMonthStats(monthData) {
    let fullyClosedDays = 0;
    const totals = { steps: 0, activeTime: 0, calories: 0 };

    if (monthData.length > 0) {
        fullyClosedDays = monthData.reduce((count, dayData) => {
            if (isDayClosed(dayData)) {
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
    return { fullyClosedDays, totals };
}


// --- 1. ЛОГИКА ДЛЯ ПОМЕСЯЧНОГО ВИДА ---
function renderByMonthView() {
    // ... (Эта функция остается БЕЗ ИЗМЕНЕНИЙ)
    if (allData.length === 0) return;
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
        const { fullyClosedDays, totals } = calculateMonthStats(monthData);
        const statsContainer = document.createElement('div');
        statsContainer.classList.add('month-stats');
        statsContainer.innerHTML = `
            <p>Цель достигнута: ${fullyClosedDays} / ${daysInMonth} дней</p>
            <p>${totals.steps.toLocaleString('ru-RU')} шагов | ${totals.activeTime.toLocaleString('ru-RU')} мин | ${totals.calories.toLocaleString('ru-RU')} кал</p>
        `;
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
    // ... (Эта функция остается БЕЗ ИЗМЕНЕНИЙ)
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
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
        const currentDayData = allData.find(d => 
            d.dateObject.getFullYear() === year &&
            d.dateObject.getMonth() === month &&
            d.dateObject.getDate() === day
        );
        renderDayChart(chartContainer, currentDayData);
        if (currentDayData) {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', () => {
                cell.classList.add('selected');
                showDetailsPopup(currentDayData);
            });
        }
        gridContainer.appendChild(cell);
    }
}

function renderDayChart(container, data) {
    // ... (Эта функция остается БЕЗ ИЗМЕНЕНИЙ)
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
        { dataKey: 'Steps', targetKey: 'Steps Target', color: COLORS.steps, background: hexToRgba(COLORS.steps, 0.2), radius: outerRadius, cutout: outerRadius - ringThickness, borderRadius: 8, minFillPercentage: MIN_VISUAL_PERCENTAGE * 0.5 },
        { dataKey: 'Active Time', targetKey: 'Active Time Target', color: COLORS.activeTime, background: hexToRgba(COLORS.activeTime, 0.2), radius: middleRadius, cutout: middleRadius - ringThickness, borderRadius: 8, minFillPercentage: MIN_VISUAL_PERCENTAGE * 0.68 },
        { dataKey: 'Calories', targetKey: 'Calories Target', color: COLORS.calories, background: hexToRgba(COLORS.calories, 0.2), radius: innerRadius, cutout: innerRadius - ringThickness, borderRadius: 8, minFillPercentage: MIN_VISUAL_PERCENTAGE },
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


// --- 2. ✅ ОБНОВЛЕННАЯ ЛОГИКА ДЛЯ ПОГОДОВОГО ВИДА ---

function renderByYearView() {
    if (allData.length === 0) return;
    yearsContainer.innerHTML = '';

    const years = [...new Set(allData.map(d => d.dateObject.getFullYear()))].sort((a, b) => a - b);

    for (const year of years) {
        const yearBlock = document.createElement('div');
        yearBlock.classList.add('year-block');

        const yearTitle = document.createElement('h2');
        yearTitle.classList.add('year-title');
        yearTitle.textContent = year;
        yearBlock.appendChild(yearTitle);

        // --- Новая логика подсчета за год ---
        let totalClosedDaysInYear = 0;
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const totalDaysInYear = isLeap ? 366 : 365;
        // ---

        const monthsGrid = document.createElement('div');
        monthsGrid.classList.add('months-grid-yearly');

        for (let month = 0; month < 12; month++) {
            const monthCell = document.createElement('div');
            monthCell.classList.add('month-cell-yearly');

            const monthData = allData.filter(d => 
                d.dateObject.getFullYear() === year &&
                d.dateObject.getMonth() === month
            );
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const { fullyClosedDays } = calculateMonthStats(monthData);
            
            totalClosedDaysInYear += fullyClosedDays; // Суммируем для годового итога

            // --- Новая HTML-структура для заголовка месяца ---
            const headerWrapper = document.createElement('div');
            headerWrapper.classList.add('month-header-wrapper');

            const monthHeader = document.createElement('div');
            monthHeader.classList.add('month-header-yearly');
            monthHeader.textContent = MONTH_NAMES_SHORT[month];
            headerWrapper.appendChild(monthHeader);

            const monthStats = document.createElement('div');
            monthStats.classList.add('month-stats-yearly');
            monthStats.textContent = `${fullyClosedDays} / ${daysInMonth} д.`;
            headerWrapper.appendChild(monthStats);
            
            monthCell.appendChild(headerWrapper); // Добавляем обертку
            // --- Конец новой структуры ---

            const dayGrid = document.createElement('div');
            dayGrid.classList.add('day-grid-yearly');
            renderYearlyMonthGrid(dayGrid, year, month, daysInMonth);
            monthCell.appendChild(dayGrid);
            
            monthsGrid.appendChild(monthCell);
        }
        
        // --- Добавляем итоговую статистику за год ---
        const yearStatsEl = document.createElement('p');
        yearStatsEl.classList.add('year-stats');
        yearStatsEl.textContent = `Цель достигнута: ${totalClosedDaysInYear} / ${totalDaysInYear} дней`;
        yearBlock.appendChild(yearStatsEl);
        // ---
        
        yearBlock.appendChild(monthsGrid);
        yearsContainer.appendChild(yearBlock);
    }
}

function renderYearlyMonthGrid(gridContainer, year, month, daysInMonth) {
    // ... (Эта функция остается БЕЗ ИЗМЕНЕНИЙ)
    const firstDayOfMonth = new Date(year, month, 1);
    let startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    for (let i = 0; i < startOffset; i++) {
        gridContainer.appendChild(document.createElement('div'));
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell-yearly');
        const dayCircle = document.createElement('div');
        dayCircle.classList.add('day-circle');
        const canvas = document.createElement('canvas');
        dayCircle.appendChild(canvas);
        const currentDayData = allData.find(d => 
            d.dateObject.getFullYear() === year &&
            d.dateObject.getMonth() === month &&
            d.dateObject.getDate() === day
        );
        renderYearlyDayChart(canvas, currentDayData);
        const dateLabel = document.createElement('div');
        dateLabel.classList.add('day-circle-date');
        dateLabel.textContent = day;
        dayCell.appendChild(dayCircle);
        dayCell.appendChild(dateLabel);
        gridContainer.appendChild(dayCell);
    }
}

function renderYearlyDayChart(canvas, data) {
    // ... (Эта функция остается БЕЗ ИЗМЕНЕНИЙ)
    const isMobile = window.innerWidth <= 768;
    const dynamicBorderWidth = isMobile ? 1 : 2;
    let chartData, chartColors;
    const offColor = 'rgba(255, 255, 255, 0.1)';
    if (data) {
        const stepsDone = isDayClosed(data); // Используем новую функцию
        const timeDone = (parseFloat(data['Active Time']) || 0) >= (parseFloat(data['Active Time Target']) || 1);
        const calsDone = (parseFloat(data['Calories']) || 0) >= (parseFloat(data['Calories Target']) || 1);
        chartData = [1, 1, 1];
        chartColors = [
            stepsDone ? COLORS.steps : offColor,
            timeDone ? COLORS.activeTime : offColor,
            calsDone ? COLORS.calories : offColor
        ];
    } else {
        chartData = [1];
        chartColors = [offColor];
    }
    new Chart(canvas, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderColor: '#2C2C2F',
                borderWidth: dynamicBorderWidth,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '30%',
            rotation: -90,
            circumference: 360,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { duration: 0 },
            events: []
        }
    });
}


// --- 3. ЛОГИКА POPUP И ПЕРЕКЛЮЧАТЕЛЕЙ ---
function showDetailsPopup(data) {
    // ... (Эта функция остается БЕЗ ИЗМЕНЕНИЙ)
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
    spotlightOverlay.classList.add('visible');
}

function hideDetailsPopup() {
    // ... (Эта функция остается БЕЗ ИЗМЕНЕНИЙ)
    detailsPopup.classList.remove('visible');
    spotlightOverlay.classList.remove('visible');
    document.querySelectorAll('.day-cell.selected').forEach(selectedCell => {
        selectedCell.classList.remove('selected');
    });
}

// --- ЗАПУСК И ИНИЦИАЛИЗАЦИЯ ---
closePopupBtn.addEventListener('click', hideDetailsPopup);
window.addEventListener('scroll', hideDetailsPopup);

document.addEventListener('click', (event) => {
    if (!detailsPopup.classList.contains('visible')) return;
    const clickedOnDayCell = event.target.closest('.day-cell');
    const clickedInPopup = event.target.closest('.details-popup');
    if (!clickedOnDayCell && !clickedInPopup) {
        hideDetailsPopup();
    }
});

btnByMonth.addEventListener('click', () => {
    btnByMonth.classList.add('active');
    btnByYear.classList.remove('active');
    monthsContainer.style.display = 'block';
    yearsContainer.style.display = 'none';
});

btnByYear.addEventListener('click', () => {
    btnByYear.classList.add('active');
    btnByMonth.classList.remove('active');
    
    if (!hasRenderedYearlyView) {
        renderByYearView();
        hasRenderedYearlyView = true;
    }

    monthsContainer.style.display = 'none';
    yearsContainer.style.display = 'block';
});

fetchData();