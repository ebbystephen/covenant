// --- Configuration ---
const TRACKING_ITEMS = [
    { id: 'morning_prayer', label: 'Morning Prayer' },
    { id: 'holy_mass', label: 'Holy Mass' },
    // Malayalam task labels (using placeholder for now, replace with actual Malayalam script)
    { id: 'udampadi_dhyanam', label: 'ഉടംമ്പടി ധ്യാനം', isTuesdayOnly: true },
    { id: 'bible_reading', label: 'Bible Reading' },
    { id: 'karunya_pravrithi', label: 'കാരുണ്യ പ്രവർത്തി' },
    { id: 'confession', label: 'Confession' }, // Special task for summary
    { id: 'night_prayer', label: 'Night Prayer' },
];

const STORAGE_KEY = 'covenantTrackerData';
const DAY_MS = 1000 * 60 * 60 * 24;

// --- DOM Elements ---
const dateInput = document.getElementById('covenant-date-input');
const setDateBtn = document.getElementById('set-date-btn');
const editDateBtn = document.getElementById('edit-date-btn');
const dateDisplay = document.getElementById('covenant-date-display');
const dateText = document.getElementById('covenant-date-text');
const datePickerContainer = document.getElementById('date-picker-container');
const logContainer = document.getElementById('daily-log-container');
const summaryConfession = document.getElementById('summary-confession');

let covenantStartDate = null;
let trackingData = {};

// --- Utility Functions ---
const getDayOfWeek = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const getFormattedDate = (date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getDaysAgo = (date) => {
    const diffTime = Math.abs(new Date().getTime() - date.getTime());
    return Math.floor(diffTime / DAY_MS);
};

const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        startDate: covenantStartDate ? covenantStartDate.toISOString().split('T')[0] : null,
        data: trackingData
    }));
};

const loadState = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const state = JSON.parse(stored);
        if (state.startDate) {
            covenantStartDate = new Date(state.startDate);
            trackingData = state.data || {};
            renderDateSetup();
            generateLog();
            updateSummary();
        }
    }
};

// --- Rendering Functions ---

// Renders the card for a single day (the professional, vertical idea)
const createDayCard = (date, tasks) => {
    const dateKey = date.toISOString().split('T')[0];
    const isToday = getFormattedDate(date) === getFormattedDate(new Date());
    const isTuesday = getDayOfWeek(date) === 'Tuesday';

    const card = document.createElement('div');
    card.className = 'day-card';
    if (isToday) card.style.border = '2px solid #28a745'; // Highlight today

    card.innerHTML = `
        <div class="card-header">
            ${getFormattedDate(date)}
            <span class="day-of-week">${getDayOfWeek(date)}</span>
        </div>
        <ul class="task-list">
            ${tasks.map(item => {
                const isChecked = trackingData[dateKey] && trackingData[dateKey][item.id];
                const isDisabled = item.isTuesdayOnly && !isTuesday;
                
                return `
                    <li class="task-item">
                        <span class="task-label">${item.label}</span>
                        <input 
                            type="checkbox" 
                            class="task-checkbox" 
                            data-date="${dateKey}" 
                            data-task="${item.id}"
                            ${isChecked ? 'checked' : ''}
                            ${isDisabled ? 'disabled' : ''}
                        >
                    </li>
                `;
            }).join('')}
        </ul>
    `;
    
    // Add event listener to handle saving checkbox changes
    card.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });

    return card;
};

// Generates the 3-month log in descending order
const generateLog = () => {
    if (!covenantStartDate) return;

    logContainer.innerHTML = '';
    
    // Determine the end date (3 months or today, whichever is sooner)
    const ninetyDaysMs = 90 * DAY_MS;
    const covenantEndDate = new Date(covenantStartDate.getTime() + ninetyDaysMs);
    const today = new Date();
    const endDate = today < covenantEndDate ? today : covenantEndDate;

    // Loop from the end date back to the start date (Descending order)
    let currentDate = endDate;
    while (currentDate >= covenantStartDate) {
        const card = createDayCard(currentDate, TRACKING_ITEMS);
        logContainer.appendChild(card);
        
        // Move to the previous day
        currentDate = new Date(currentDate.getTime() - DAY_MS);
    }
    
    if(logContainer.innerHTML === '') {
        logContainer.innerHTML = '<p class="placeholder-text">Tracking period has not yet started or has not been fully configured.</p>';
    }
};

// Updates the top summary bar (e.g., Last Confession: 10 days ago)
const updateSummary = () => {
    if (!covenantStartDate) {
        summaryConfession.textContent = 'N/A';
        return;
    }
    
    let lastConfessionDate = null;
    const today = new Date();
    const ninetyDaysMs = 90 * DAY_MS;
    const covenantEndDate = new Date(covenantStartDate.getTime() + ninetyDaysMs);
    const loopEndDate = today < covenantEndDate ? today : covenantEndDate;
    
    // Loop through the data in descending order to find the last occurrence
    let currentDate = loopEndDate;
    while (currentDate >= covenantStartDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        if (trackingData[dateKey] && trackingData[dateKey].confession) {
            lastConfessionDate = currentDate;
            break;
        }
        currentDate = new Date(currentDate.getTime() - DAY_MS);
    }

    if (lastConfessionDate) {
        const daysAgo = getDaysAgo(lastConfessionDate);
        summaryConfession.textContent = daysAgo === 0 ? 'Today' : `${daysAgo} days ago`;
    } else {
        summaryConfession.textContent = 'Never';
    }
    
    // You would add logic here for other summary items if needed.
};

// Hides/shows the date picker or the date display
const renderDateSetup = () => {
    if (covenantStartDate) {
        dateText.textContent = getFormattedDate(covenantStartDate);
        dateDisplay.classList.remove('hidden');
        datePickerContainer.classList.add('hidden');
        logContainer.querySelector('.placeholder-text')?.remove();
    } else {
        dateDisplay.classList.add('hidden');
        datePickerContainer.classList.remove('hidden');
    }
};

// --- Event Handlers ---
const handleSetDate = () => {
    const dateString = dateInput.value;
    if (dateString) {
        covenantStartDate = new Date(dateString);
        covenantStartDate.setHours(0, 0, 0, 0); // Normalize to start of day
        renderDateSetup();
        generateLog();
        updateSummary();
        saveState();
    } else {
        alert('Please select a valid date.');
    }
};

const handleEditDate = () => {
    // Allows user to re-select the date
    covenantStartDate = null;
    trackingData = {}; // Clear existing data if date is changed
    logContainer.innerHTML = '<p class="placeholder-text">Please set the Covenant Start Date to begin tracking.</p>';
    renderDateSetup();
    saveState();
};

const handleCheckboxChange = (event) => {
    const checkbox = event.target;
    const dateKey = checkbox.dataset.date;
    const taskId = checkbox.dataset.task;
    const isChecked = checkbox.checked;

    if (!trackingData[dateKey]) {
        trackingData[dateKey] = {};
    }
    trackingData[dateKey][taskId] = isChecked;
    
    saveState();
    updateSummary();
};

// --- Initialization ---
setDateBtn.addEventListener('click', handleSetDate);
editDateBtn.addEventListener('click', handleEditDate);

document.addEventListener('DOMContentLoaded', loadState);

