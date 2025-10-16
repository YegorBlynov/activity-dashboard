// Замените на ваши данные
const SPREADSHEET_ID = '13tjmIANix1oLMiloTeFyLmJ7MLYBPMVosBeDlnLEYlk';
const API_KEY = 'AIzaSyD0bpldnBfTiugPRWgYcJpUvsCj1Kxv9Uo';

// Диапазон всей таблицы, начиная с заголовков
const RANGE = 'A1:G'; // От A1 до колонки G (включая заголовки), до конца данных
// =============================

const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

const loadingOverlay = document.getElementById('loadingOverlay');
const chartsGrid = document.getElementById('chartsGrid');
const yearSelect = document.getElementById('yearSelect');
const monthSelect = document.getElementById('monthSelect');
const prevDayBtn = document.getElementById('prevDayBtn');
const todayBtn = document.getElementById('todayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');

let allData = []; // Все данные из таблицы
let uniqueYears = new Set();
let selectedDate = new Date(); // Текущая выбранная дата

const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Типы графиков и их настройки
const CHART_CONFIGS = [
    {
        id: 'steps',
        title: 'Шаги',
        dataColumn: 'Steps',
        targetColumn: 'Steps Target',
        color: ['#e53e3e', '#fbd38d'], // Красный, Светло-желтый
        unit: 'шагов',
        class: 'color-move'
    },
    {
        id: 'activeTime',
        title: 'Активное время',
        dataColumn: 'Active Time',
        targetColumn: 'Active Time Target',
        color: ['#68d391', '#c6f6d5'], // Зеленый, Светло-зеленый
        unit: 'мин',
        class: 'color-exercise'
    },
    {
        id: 'calories',
        title: 'Калории',
        dataColumn: 'Calories',
        targetColumn: 'Calories Target',
        color: ['#4299e1', '#b3e8ff'], // Синий, Светло-синий
        unit: 'ккал',
        class: 'color-stand'
    }
];

// Инициализация Chart.js плагина для подписей (если не установлен)
if (typeof ChartDataLabels === 'undefined') {
    console.warn('ChartDataLabels plugin not found. Please ensure it is loaded.');
} else {
    Chart.register(ChartDataLabels);
}


async function fetchData() {
    loadingOverlay.classList.add('active');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Сетевой ответ был не в порядке ' + response.statusText);
        }
        const json = await response.json();
        processData(json.values);
    } catch (error) {
        console.error('Возникла проблема с операцией fetch:', error);
        alert('Не удалось загрузить данные из Google Sheets. Проверьте консоль для получения дополнительной информации.');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

function processData(values) {
    if (!values || values.length < 2) {
        console.warn('Нет данных или только заголовки.');
        return;
    }

    const headers = values[0];
    allData = values.slice(1).map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = row[index] !== undefined ? row[index] : '';
        });
        return rowData;
    });

    // Извлекаем уникальные годы для выпадающего списка
    allData.forEach(item => {
        const dateStr = item['Date'];
        if (dateStr) {
            const dateParts = dateStr.split('.'); // 20.09.2021 -> [20, 09, 2021]
            if (dateParts.length === 3) {
                uniqueYears.add(parseInt(dateParts[2]));
            }
        }
    });

    populateYearSelector();
    updateDateSelectors(); // Устанавливаем текущий год/месяц по умолчанию
    renderChartsForDate(selectedDate);
}

function populateYearSelector() {
    yearSelect.innerHTML = ''; // Очищаем
    const sortedYears = Array.from(uniqueYears).sort((a, b) => b - a); // Сортируем по убыванию
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    // Выбираем текущий год или самый последний из доступных
    const currentYear = selectedDate.getFullYear();
    if (sortedYears.includes(currentYear)) {
        yearSelect.value = currentYear;
    } else if (sortedYears.length > 0) {
        yearSelect.value = sortedYears[0];
    }
}

function populateMonthSelector() {
    monthSelect.innerHTML = ''; // Очищаем
    MONTH_NAMES.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index; // Месяцы в JS 0-11
        option.textContent = name;
        monthSelect.appendChild(option);
    });
    monthSelect.value = selectedDate.getMonth(); // Выбираем текущий месяц
}


function updateDateSelectors() {
    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth();

    if (!uniqueYears.has(currentYear) && uniqueYears.size > 0) {
        // Если выбранный год не существует, выбираем самый последний
        selectedDate.setFullYear(Array.from(uniqueYears).sort((a, b) => b - a)[0]);
        yearSelect.value = selectedDate.getFullYear();
    } else {
        yearSelect.value = currentYear;
    }

    populateMonthSelector(); // Обновить месяцы на основе выбранного года
    monthSelect.value = currentMonth;
}

function renderChartsForDate(date) {
    chartsGrid.innerHTML = ''; // Очищаем старые графики

    // Форматируем дату для поиска в таблице (день.месяц.год)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы в JS 0-11
    const year = date.getFullYear();
    const dateToSearch = `${day}.${month}.${year}`;

    const dailyData = allData.find(item => item['Date'] === dateToSearch);

    const chartCard = document.createElement('div');
    chartCard.classList.add('chart-card');
    chartsGrid.appendChild(chartCard);

    const dateTitle = document.createElement('h2');
    dateTitle.textContent = `${day}.${month}.${year}`;
    chartCard.appendChild(dateTitle);

    const dailyChartsContainer = document.createElement('div');
    dailyChartsContainer.style.display = 'flex';
    dailyChartsContainer.style.gap = '20px';
    dailyChartsContainer.style.flexWrap = 'wrap';
    dailyChartsContainer.style.justifyContent = 'center';
    chartCard.appendChild(dailyChartsContainer);


    if (!dailyData) {
        dailyChartsContainer.innerHTML = '<p>Нет данных за этот день.</p>';
        return;
    }

    CHART_CONFIGS.forEach(config => {
        const value = parseFloat(dailyData[config.dataColumn]) || 0;
        const target = parseFloat(dailyData[config.targetColumn]) || 0;

        createDoughnutChart(dailyChartsContainer, config.id, config.title, value, target, config.color, config.unit, config.class);
    });
}

function createDoughnutChart(parentContainer, id, title, value, target, colors, unit, className) {
    const card = document.createElement('div');
    card.classList.add('chart-card');
    card.style.flexShrink = 0; // Не сжимать карточку
    card.style.width = '200px'; // Фиксированная ширина для колец
    card.style.padding = '10px';
    card.style.boxShadow = 'none'; // Уберем тень с внутренней карточки
    parentContainer.appendChild(card);

    const chartTitle = document.createElement('h3');
    chartTitle.textContent = title;
    chartTitle.classList.add(className);
    card.appendChild(chartTitle);

    const chartWrapper = document.createElement('div');
    chartWrapper.classList.add('chart-canvas-wrapper');
    card.appendChild(chartWrapper);

    const canvas = document.createElement('canvas');
    canvas.id = `chart-${id}-${selectedDate.getTime()}`; // Уникальный ID для каждого графика
    chartWrapper.appendChild(canvas);

    const centerText = document.createElement('div');
    centerText.classList.add('chart-center-text');
    centerText.classList.add(className); // Добавляем класс для цвета
    centerText.innerHTML = `<span>${value}</span>`; // <span class="color-move">150</span>
    chartWrapper.appendChild(centerText);

    let completion = target > 0 ? Math.min(value / target * 100, 100) : 0;
    let remaining = 100 - completion;

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Выполнено', 'Осталось'],
            datasets: [{
                data: [completion, remaining],
                backgroundColor: [colors[0], colors[1]], // Основной цвет, фоновый цвет
                borderColor: [colors[0], colors[1]],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%', // Толщина кольца
            rotation: -90, // Начало кольца сверху
            circumference: 360, // Полное кольцо
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false // Отключаем тултипы
                },
                datalabels: { // Отключаем плагин datalabels, текст будет в центре
                    display: false,
                }
            }
        }
    });
}


// ====== Обработчики событий ======

yearSelect.addEventListener('change', () => {
    selectedDate.setFullYear(parseInt(yearSelect.value));
    renderChartsForDate(selectedDate);
});

monthSelect.addEventListener('change', () => {
    selectedDate.setMonth(parseInt(monthSelect.value));
    renderChartsForDate(selectedDate);
});

prevDayBtn.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    updateDateSelectors();
    renderChartsForDate(selectedDate);
});

nextDayBtn.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    updateDateSelectors();
    renderChartsForDate(selectedDate);
});

todayBtn.addEventListener('click', () => {
    selectedDate = new Date(); // Устанавливаем на текущую дату
    updateDateSelectors();
    renderChartsForDate(selectedDate);
});

// Запускаем загрузку данных при старте
fetchData();