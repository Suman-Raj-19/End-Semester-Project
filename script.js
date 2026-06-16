// Setting a demo task due in 1 hour so you can see the notification work immediately
const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

// 1. STATE MANAGEMENT
let boardData = JSON.parse(localStorage.getItem('kanbanDataFinal')) || [
    { id: 'todo', title: 'To Do', tasks: [
        { id: generateId(), text: 'Submit Kanban Project', dueDate: oneHourFromNow }
    ]},
    { id: 'in-progress', title: 'In Progress', tasks: [] },
    { id: 'done', title: 'Done', tasks: [] }
];

let searchQuery = '';

function saveState() {
    localStorage.setItem('kanbanDataFinal', JSON.stringify(boardData));
    checkNotifications();
}

// 2. RENDER LOGIC
const boardContainer = document.getElementById('board');

function renderBoard() {
    boardContainer.innerHTML = ''; 
    
    boardData.forEach(column => {
        // Filter tasks based on search input
        const filteredTasks = column.tasks.filter(task => 
            task.text.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const colEl = document.createElement('div');
        colEl.className = 'column';
        colEl.innerHTML = `
            <div class="column-header">
                <span>${column.title}</span>
                <span>${filteredTasks.length}</span>
            </div>
            <div class="task-list" data-col-id="${column.id}"></div>
            <div class="add-task-container">
                <input type="text" class="add-task-input" id="input-${column.id}" placeholder="Enter task...">
                <input type="datetime-local" class="add-task-date" id="date-${column.id}">
                <button class="btn-primary" onclick="addTask('${column.id}')">+ Add</button>
            </div>
        `;
        
        const taskListEl = colEl.querySelector('.task-list');
        
        filteredTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-card';
            taskEl.draggable = true;
            taskEl.dataset.taskId = task.id;

            // Date formatting and warning logic
            let dateHtml = '';
            if (task.dueDate) {
                const due = new Date(task.dueDate);
                const diffHours = (due - new Date()) / (1000 * 60 * 60);
                const isUrgent = diffHours > 0 && diffHours <= 2;
                
                dateHtml = `<div class="task-time ${isUrgent ? 'time-warning' : ''}">
                    🕒 ${due.toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'})}
                </div>`;
            }

            // Generate options for the mobile fallback dropdown
            let moveOptions = boardData.map(c => 
                `<option value="${c.id}" ${c.id === column.id ? 'selected disabled' : ''}>Move to: ${c.title}</option>`
            ).join('');

            taskEl.innerHTML = `
                <div class="task-header">
                    <span ondblclick="editTask('${column.id}', '${task.id}')">${task.text}</span>
                    <button class="delete-btn" onclick="deleteTask('${column.id}', '${task.id}')">✖</button>
                </div>
                ${dateHtml}
                <!-- Mobile Fallback Dropdown (Hidden on Desktop via CSS) -->
                <select class="mobile-move-select" onchange="mobileMoveTask('${column.id}', '${task.id}', this.value)">
                    <option value="" disabled selected>Change Status...</option>
                    ${moveOptions}
                </select>
            `;
            
            // Drag and Drop Events
            taskEl.addEventListener('dragstart', handleDragStart);
            taskEl.addEventListener('dragend', handleDragEnd);
            taskListEl.appendChild(taskEl);
        });

        taskListEl.addEventListener('dragover', handleDragOver);
        taskListEl.addEventListener('drop', handleDrop);
        boardContainer.appendChild(colEl);
    });
}

// 3. SEARCH LOGIC
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderBoard();
});

// 4. DROPDOWN & NOTIFICATION LOGIC
function toggleDropdown(id) {
    if(id === 'notifDropdown') document.getElementById('profileDropdown').classList.remove('show');
    if(id === 'profileDropdown') document.getElementById('notifDropdown').classList.remove('show');
    
    document.getElementById(id).classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.closest('.dropdown-wrapper')) {
        document.getElementById('profileDropdown').classList.remove('show');
        document.getElementById('notifDropdown').classList.remove('show');
    }
}

function checkNotifications() {
    const now = new Date();
    const urgentTasks = [];

    boardData.forEach(col => {
        if(col.id === 'done') return; // Do not notify for done tasks
        col.tasks.forEach(task => {
            if(task.dueDate) {
                const due = new Date(task.dueDate);
                const diffHours = (due - now) / (1000 * 60 * 60);
                if (diffHours > 0 && diffHours <= 2) {
                    urgentTasks.push(task);
                }
            }
        });
    });

    const badge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');
    
    if (urgentTasks.length > 0) {
        badge.innerText = urgentTasks.length;
        badge.style.display = 'block';
        notifList.innerHTML = urgentTasks.map(t => `
            <div class="dropdown-item" style="color: red; font-size:0.9rem;">
                ⚠️ ${t.text}
            </div>
        `).join('');
    } else {
        badge.style.display = 'none';
        notifList.innerHTML = `<div class="dropdown-item" style="color: grey; font-size:0.9rem;">No urgent tasks. Relax!</div>`;
    }
}

function logout() {
    alert("Logging out Suman@2005...");
    localStorage.removeItem('kanbanDataFinal');
    location.reload();
}

// 5. CRUD OPERATIONS
function generateId() { return '_' + Math.random().toString(36).substr(2, 9); }

function addTask(colId) {
    const inputEl = document.getElementById(`input-${colId}`);
    const dateEl = document.getElementById(`date-${colId}`);
    if (!inputEl.value.trim()) return;

    const column = boardData.find(c => c.id === colId);
    column.tasks.push({ 
        id: generateId(), 
        text: inputEl.value.trim(),
        dueDate: dateEl.value || ''
    });
    
    saveState();
    renderBoard();
}

function deleteTask(colId, taskId) {
    const column = boardData.find(c => c.id === colId);
    column.tasks = column.tasks.filter(t => t.id !== taskId);
    saveState();
    renderBoard();
}

function editTask(colId, taskId) {
    const column = boardData.find(c => c.id === colId);
    const task = column.tasks.find(t => t.id === taskId);
    const newText = prompt("Edit task text:", task.text);
    if (newText) {
        task.text = newText;
        saveState();
        renderBoard();
    }
}

// 6. MOBILE FALLBACK OPERATION
function mobileMoveTask(sourceColId, taskId, targetColId) {
    if (!targetColId || sourceColId === targetColId) return;

    const sourceCol = boardData.find(c => c.id === sourceColId);
    const taskIndex = sourceCol.tasks.findIndex(t => t.id === taskId);
    const task = sourceCol.tasks.splice(taskIndex, 1)[0];

    const targetCol = boardData.find(c => c.id === targetColId);
    targetCol.tasks.push(task);

    saveState();
    renderBoard();
}

// 7. DRAG AND DROP API
let draggedTaskId = null, sourceColId = null;

function handleDragStart(e) {
    draggedTaskId = e.target.dataset.taskId;
    sourceColId = e.target.closest('.task-list').dataset.colId;
    e.target.classList.add('dragging');
}

function handleDragEnd(e) { e.target.classList.remove('dragging'); }
function handleDragOver(e) { e.preventDefault(); }

function handleDrop(e) {
    e.preventDefault();
    const targetColId = e.currentTarget.dataset.colId;
    if (sourceColId === targetColId) return;

    const sourceCol = boardData.find(c => c.id === sourceColId);
    const taskIndex = sourceCol.tasks.findIndex(t => t.id === draggedTaskId);
    const taskToMove = sourceCol.tasks.splice(taskIndex, 1)[0];

    const targetCol = boardData.find(c => c.id === targetColId);
    targetCol.tasks.push(taskToMove);

    saveState();
    renderBoard();
}

// 8. INITIALIZATION
renderBoard();
checkNotifications();
setInterval(checkNotifications, 60000); // Har 1 minute mein notification check hogi