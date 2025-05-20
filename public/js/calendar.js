document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (localStorage.getItem('exodusLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return; // Stop further execution
    }

    const userRole = localStorage.getItem('exodusUserRole');

    const monthYearDisplay = document.getElementById('monthYearDisplay');
    const calendarGrid = document.getElementById('calendarGrid');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const addEventBtn = document.getElementById('addEventBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const eventModal = document.getElementById('eventModal');
    const closeModalBtn = document.querySelector('.close-btn');
    const eventForm = document.getElementById('eventForm');
    const eventModalTitle = document.getElementById('eventModalTitle');
    const eventIdInput = document.getElementById('eventId');
    const deleteEventBtn = document.getElementById('deleteEventBtn');

    // Sample background images for empty days
    const emptyDayBackgrounds = [
        'images/bg-empty-1.jpg',
        'images/bg-empty-2.jpg',
        'images/bg-empty-3.jpg',
        // Add more image paths as needed
    ];
    let bgIndex = 0;

    let currentDate = new Date();
    let events = []; // This will hold events fetched from backend or localStorage

    // --- EVENT DATA HANDLING (Simulated with localStorage) ---
    // In a real app, events would be fetched from and saved to a backend.
    function loadEvents() {
        const storedEvents = localStorage.getItem('exodusCalendarEvents');
        events = storedEvents ? JSON.parse(storedEvents) : [
            // Sample initial event for testing
            {
                id: 'evt1',
                date: new Date().toISOString().split('T')[0], // today
                startTime: '10:00',
                endTime: '11:00',
                location: 'Main Hall',
                description: 'Team Meeting'
            }
        ];
        renderCalendar(currentDate);
    }

    function saveEvents() {
        localStorage.setItem('exodusCalendarEvents', JSON.stringify(events));
    }
    // --- END EVENT DATA HANDLING ---

    function renderCalendar(date) {
        calendarGrid.innerHTML = ''; // Clear previous grid
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed

        monthYearDisplay.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, ...

        // Add day headers (Sun, Mon, Tue...)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(dayName => {
            const dayHeaderEl = document.createElement('div');
            dayHeaderEl.classList.add('calendar-day-header');
            dayHeaderEl.textContent = dayName;
            calendarGrid.appendChild(dayHeaderEl);
        });

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'other-month');
            calendarGrid.appendChild(emptyCell);
        }

        // Add day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day');
            const dayNumberEl = document.createElement('span');
            dayNumberEl.classList.add('day-number');
            dayNumberEl.textContent = day;
            dayCell.appendChild(dayNumberEl);

            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(event => event.date === cellDateStr);

            if (dayEvents.length > 0) {
                dayEvents.forEach(event => {
                    const eventEl = document.createElement('div');
                    eventEl.classList.add('event-item');
                    eventEl.innerHTML = `
                        <span class="event-time">${event.startTime} - ${event.endTime}</span>
                        <span class="event-title">${event.description.substring(0,20)}${event.description.length > 20 ? '...' : ''}</span>
                    `;
                    eventEl.dataset.eventId = event.id;
                    eventEl.addEventListener('click', () => openEventModal(event));
                    dayCell.appendChild(eventEl);
                });
            } else {
                // Apply background image to empty day cells
                dayCell.classList.add('empty-day');
                dayCell.style.backgroundImage = `url('${emptyDayBackgrounds[bgIndex % emptyDayBackgrounds.length]}')`;
                bgIndex++;
            }
            
            if (userRole === 'admin') {
                dayCell.addEventListener('click', (e) => {
                    // Only open new event modal if clicking on the day cell itself, not an existing event
                    if (e.target === dayCell || e.target === dayNumberEl) {
                        openEventModal(null, cellDateStr); // Pass date for new event
                    }
                });
            }

            calendarGrid.appendChild(dayCell);
        }
    }

    function openEventModal(event = null, dateForNewEvent = null) {
        eventForm.reset();
        eventIdInput.value = '';
        deleteEventBtn.style.display = 'none';

        if (event) { // Editing existing event
            eventModalTitle.textContent = 'Edit Event';
            document.getElementById('eventDate').value = event.date;
            document.getElementById('startTime').value = event.startTime;
            document.getElementById('endTime').value = event.endTime;
            document.getElementById('location').value = event.location || '';
            document.getElementById('description').value = event.description;
            eventIdInput.value = event.id;
            if (userRole === 'admin') {
                deleteEventBtn.style.display = 'inline-block';
            }
            // Disable form fields if view-only user
            if (userRole === 'viewer') {
                eventForm.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => el.disabled = true);
                 deleteEventBtn.style.display = 'none';
            } else {
                 eventForm.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => el.disabled = false);
            }

        } else { // Adding new event
            eventModalTitle.textContent = 'Add New Event';
            if (dateForNewEvent) {
                document.getElementById('eventDate').value = dateForNewEvent;
            }
            // Ensure form is enabled for admin
            eventForm.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => el.disabled = false);
        }
        eventModal.style.display = 'block';
    }

    function closeEventModal() {
        eventModal.style.display = 'none';
    }

    // Event Listeners
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    if (addEventBtn) {
        if (userRole === 'admin') {
            addEventBtn.style.display = 'inline-block'; // Show button for admin
            addEventBtn.addEventListener('click', () => openEventModal());
        } else {
            addEventBtn.style.display = 'none'; // Hide for view-only
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('exodusUserRole');
            localStorage.removeItem('exodusLoggedIn');
            window.location.href = 'login.html';
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeEventModal);
    window.addEventListener('click', (event) => { // Close modal if click outside
        if (event.target == eventModal) {
            closeEventModal();
        }
    });

    if (eventForm && userRole === 'admin') {
        eventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = eventIdInput.value;
            const newEvent = {
                id: id || `evt${Date.now()}`, // Generate new ID if not editing
                date: document.getElementById('eventDate').value,
                startTime: document.getElementById('startTime').value,
                endTime: document.getElementById('endTime').value,
                location: document.getElementById('location').value,
                description: document.getElementById('description').value,
            };

            if (id) { // Editing existing event
                const index = events.findIndex(ev => ev.id === id);
                if (index > -1) events[index] = newEvent;
            } else { // Adding new event
                events.push(newEvent);
            }
            saveEvents();
            renderCalendar(currentDate);
            closeEventModal();
        });
    }
    
    if (deleteEventBtn && userRole === 'admin') {
        deleteEventBtn.addEventListener('click', () => {
            const id = eventIdInput.value;
            if (id && confirm('Are you sure you want to delete this event?')) {
                events = events.filter(event => event.id !== id);
                saveEvents();
                renderCalendar(currentDate);
                closeEventModal();
            }
        });
    }

    // Initial load
    loadEvents(); // This will also call renderCalendar
});
