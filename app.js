// DOM Elements
const DOM = {
    hardRefresh: document.getElementById('hardRefresh'),
    themeToggle: document.getElementById('themeToggle'),
    body: document.body,
    toggleSidebar: document.getElementById('toggleSidebar'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    liveClock: document.getElementById('liveClock'),
    customerSelect: document.getElementById('customerSelect'),
    startTimeInput: document.getElementById('startTime'),
    endTimeInput: document.getElementById('endTime'),
    amountInput: document.getElementById('amount'),
    addTransactionBtn: document.getElementById('addTransaction'),
    exportJSONBtn: document.getElementById('exportJSON'),
    exportCSVBtn: document.getElementById('exportCSV'),
    importDataInput: document.getElementById('importData'),
    historySearch: document.getElementById('historySearch'),
    clearSearchBtn: document.getElementById('clearSearch'),
    historyList: document.getElementById('historyList'),
    customerNameInput: document.getElementById('customerName'),
    customerContactInput: document.getElementById('customerContact'),
    addCustomerBtn: document.getElementById('addCustomer'),
    customerSearch: document.getElementById('customerSearch'),
    customerList: document.getElementById('customerList'),
    analyticsDashboard: document.getElementById('analyticsDashboard'),
    notification: document.getElementById('notification'),
    actionModal: document.getElementById('actionModal'),
    modalMessage: document.getElementById('modalMessage'),
    editForm: document.getElementById('editForm'),
    editField: document.getElementById('editField'),
    confirmAction: document.getElementById('confirmAction'),
    cancelAction: document.getElementById('cancelAction'),
    tabs: document.querySelectorAll('.tab-content'),
    currencySelect: document.getElementById('currencySelect'),
    rateType: document.getElementById('rateType'),
    rateAmount: document.getElementById('rateAmount'),
    bulkActions: document.getElementById('bulkActions'),
    bulkAddBtn: document.getElementById('bulkAddBtn'),
    selectedCount: document.getElementById('selectedCount'),
    historyCustomerFilter: document.getElementById('historyCustomerFilter'),
    historySummary: document.getElementById('historySummary'),
    bulkDeleteBtn: document.getElementById('bulkDeleteBtn')
};

// State
const state = {
    transactions: [],
    customers: [],
    actionTarget: null,
    lastDeleted: null,
    selectedTransactions: new Set(),
    paymentStatuses: new Map() // Store payment statuses
};

// IndexedDB Setup - Modified to be more robust
const dbName = 'TimeCalcDB';
const transactionStore = 'transactions';
const customerStore = 'customers';
let db;

/** Opens the IndexedDB database */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 3);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create transactions store if it doesn't exist
            if (!db.objectStoreNames.contains(transactionStore)) {
                const store = db.createObjectStore(transactionStore, { keyPath: 'id', autoIncrement: true });
                store.createIndex('customerId', 'customerId', { unique: false });
                store.createIndex('date', 'date', { unique: false });
            }

            // Create customers store if it doesn't exist
            if (!db.objectStoreNames.contains(customerStore)) {
                const store = db.createObjectStore(customerStore, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;

            // Handle database connection loss
            db.onerror = (event) => {
                console.error('Database error:', event.target.error);
                showNotification('Database error occurred', true);
            };

            resolve(db);
        };
    });
}

// Theme Toggle
DOM.themeToggle.addEventListener('click', () => {
    DOM.body.classList.toggle('dark-mode');
    const icon = DOM.themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
});

// Sidebar & Tabs
DOM.toggleSidebar.addEventListener('click', () => toggleSidebar(true));
DOM.sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
DOM.sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        switchTab(tab);
        toggleSidebar(false);
    });
});

/** Toggles sidebar visibility */
function toggleSidebar(show) {
    DOM.sidebar.classList.toggle('show', show);
    DOM.sidebarOverlay.classList.toggle('show', show);
    document.body.style.overflow = show ? 'hidden' : '';

    // Prevent the sidebar from being taller than viewport
    if (show) {
        const windowHeight = window.innerHeight;
        DOM.sidebar.style.maxHeight = `${windowHeight}px`;
    }
}

/** Switches between tabs */
function switchTab(tabId) {
    DOM.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.id === tabId);
        tab.style.display = tab.id === tabId ? 'block' : 'none';
    });
    DOM.sidebar.querySelectorAll('a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
    });
}

// Live Clock
function updateClock() {
    DOM.liveClock.textContent = new Date().toLocaleTimeString('en-US', { hour12: true });
}
setInterval(updateClock, 1000);
updateClock();

// Initialize Inputs
const now = new Date();
DOM.startTimeInput.value = now.toISOString().slice(0, 16);
DOM.endTimeInput.value = now.toISOString().slice(0, 16);

// Utility Functions
function calculateDuration(start, end) {
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
}

/** Shows a notification */
function showNotification(message, isError = false, duration = 3000) {
    const notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';

    const notification = document.createElement('div');
    notification.className = 'notification';
    if (isError) notification.classList.add('error');

    notification.textContent = message;
    notificationContainer.appendChild(notification);
    document.body.appendChild(notificationContainer);

    // Show it
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove it after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notificationContainer.remove(), 300);
    }, duration);
}

// Transaction Management
async function addTransaction() {
    const customerId = parseInt(DOM.customerSelect.value);
    const startTime = new Date(DOM.startTimeInput.value);
    const endTime = new Date(DOM.endTimeInput.value);
    const currency = DOM.currencySelect.value;
    const rateType = DOM.rateType.value;
    const rateAmount = parseFloat(DOM.rateAmount.value) || 0;

    // Validation
    if (!customerId) {
        DOM.customerSelect.classList.add('error');
        showNotification('Please select a customer', true);
        return;
    }
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || endTime <= startTime) {
        DOM.startTimeInput.classList.add('error');
        DOM.endTimeInput.classList.add('error');
        showNotification('Invalid start or end time', true);
        return;
    }
    if (rateAmount <= 0) {
        DOM.rateAmount.classList.add('error');
        showNotification('Please enter a valid rate amount', true);
        return;
    }

    const duration = calculateDuration(startTime, endTime);
    let amount;

    if (rateType === 'hourly') {
        amount = (duration.hours + duration.minutes / 60) * rateAmount;
    } else {
        amount = duration.totalMinutes * rateAmount;
    }

    // Create transaction with ID
    const transaction = {
        id: Date.now(),  // Ensure unique ID
        customerId,
        start: startTime,
        end: endTime,
        amount,
        currency,
        rateType,
        rateAmount,
        duration,
        date: new Date()
    };

    // Add to state and save
    state.transactions.push(transaction);
    await saveToIndexedDB();

    // Show notifications
    showNotification('Transaction added successfully', false, 3000);

    // Reset form
    DOM.rateAmount.value = '';
    const now = new Date();
    DOM.startTimeInput.value = now.toISOString().slice(0, 16);
    DOM.endTimeInput.value = now.toISOString().slice(0, 16);

    // Update UI
    updateHistoryList();
    removeAnalytics(); // Remove analytics for now

    // Remove error classes
    [DOM.customerSelect, DOM.startTimeInput, DOM.endTimeInput, DOM.rateAmount]
        .forEach(el => el.classList.remove('error'));
}

// Function to remove analytics
function removeAnalytics() {
    const analyticsTab = document.querySelector('[data-tab="analytics"]');
    if (analyticsTab) {
        analyticsTab.parentElement.remove();
    }
    const analyticsSection = document.getElementById('analytics');
    if (analyticsSection) {
        analyticsSection.remove();
    }
}

function updateHistoryList(filter = '') {
    DOM.historyList.innerHTML = '';
    const searchTerm = filter.toLowerCase().trim();

    const filtered = state.transactions.filter(t => {
        const customer = state.customers.find(c => c.id === t.customerId);
        const customerName = customer?.name?.toLowerCase() || '';
        const date = t.date.toLocaleDateString();
        const amount = t.amount.toString();
        const time = `${t.start.toLocaleTimeString()} - ${t.end.toLocaleTimeString()}`;

        return customerName.includes(searchTerm) ||
            date.toLowerCase().includes(searchTerm) ||
            amount.includes(searchTerm) ||
            time.toLowerCase().includes(searchTerm);
    }).sort((a, b) => b.date - a.date);

    if (filtered.length === 0) {
        DOM.historyList.innerHTML = `
            <div class="no-results">
                No transactions found${searchTerm ? ` for "${filter}"` : ''}
            </div>`;
        return;
    }

    filtered.forEach(t => {
        const customer = state.customers.find(c => c.id === t.customerId);
        const item = document.createElement('div');
        item.classList.add('history-item');
        item.innerHTML = `
            <div class="history-content ${t.combined ? 'combined-transaction' : ''}">
                <input type="checkbox" class="history-checkbox" data-id="${t.id}">
                <strong>${customer?.name || 'Unknown'} - ${t.date.toLocaleDateString()}</strong>
                <span class="payment-status ${state.paymentStatuses.get(t.id) === 'paid' ? 'status-paid' : 'status-due'}">
                    ${state.paymentStatuses.get(t.id) === 'paid' ? 
                        '<i class="fas fa-check-circle"></i> Paid' : 
                        '<i class="fas fa-clock"></i> Due'}
                </span>
                <button class="payment-toggle" data-id="${t.id}">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <div>${t.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                     ${t.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div>Duration: ${t.duration.hours}h ${t.duration.minutes}m</div>
                <div>Rate: ${t.currency} ${t.rateAmount} (${t.rateType})</div>
                <div>Amount: ${t.currency} ${t.amount.toFixed(2)}</div>
                ${t.timeSlots ? `
                    <div class="combined-slots">
                        <strong>Combined Transactions:</strong>
                        ${t.timeSlots.map(slot => `
                            <div class="combined-slot-item">
                                <span>${slot.date.toLocaleDateString()}</span>
                                <span>${new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                      ${new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="history-actions">
                <button class="delete-btn" data-id="${t.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

        const checkbox = item.querySelector('.history-checkbox');
        checkbox.checked = state.selectedTransactions.has(t.id);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                state.selectedTransactions.add(t.id);
            } else {
                state.selectedTransactions.delete(t.id);
            }
            updateBulkActionsVisibility();
        });

        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            state.actionTarget = { transaction: t, item, action: 'deleteTransaction' };
            DOM.modalMessage.textContent = 'Delete this transaction?';
            DOM.editForm.style.display = 'none';
            DOM.actionModal.classList.add('show');
        });

        // Add payment toggle handler
        const paymentToggle = item.querySelector('.payment-toggle');
        paymentToggle.addEventListener('click', () => togglePaymentStatus(t.id));

        DOM.historyList.appendChild(item);
    });

    // Update customer filter dropdown
    updateCustomerFilterDropdown();
    
    // Calculate and show summary if customer is selected
    const selectedCustomerId = parseInt(DOM.historyCustomerFilter.value);
    if (selectedCustomerId) {
        const customerTransactions = filtered.filter(t => t.customerId === selectedCustomerId);
        updateHistorySummary(customerTransactions);
    } else {
        DOM.historySummary.style.display = 'none';
    }
}

function updateCustomerFilterDropdown() {
    const currentValue = DOM.historyCustomerFilter.value;
    DOM.historyCustomerFilter.innerHTML = '<option value="">All Customers</option>';
    state.customers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        DOM.historyCustomerFilter.appendChild(option);
    });
    DOM.historyCustomerFilter.value = currentValue;
}

function updateHistorySummary(transactions) {
    if (transactions.length === 0) {
        DOM.historySummary.style.display = 'none';
        return;
    }

    const dates = transactions.map(t => t.date);
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));
    
    const totalMinutes = transactions.reduce((sum, t) => sum + t.duration.totalMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const currency = transactions[0].currency;

    const summary = DOM.historySummary.querySelector('.summary-details');
    summary.innerHTML = `
        <span class="date-range">Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</span>
        <span class="total-time">Total Time: ${hours}h ${minutes}m</span>
        <span class="total-amount">Total Amount: ${currency}${totalAmount.toFixed(2)}</span>
    `;
    
    DOM.historySummary.style.display = 'block';
}

// Customer Management
async function addCustomer() {
    const name = DOM.customerNameInput.value.trim();
    const contact = DOM.customerContactInput.value.trim();
    if (!name) {
        DOM.customerNameInput.classList.add('error');
        showNotification('Please enter a customer name', true);
        return;
    }
    DOM.customerNameInput.classList.remove('error');
    const customer = { name, contact, balance: 0 };
    state.customers.push(customer);
    await saveCustomersToIndexedDB();
    updateCustomerList();
    updateCustomerSelect();
    DOM.customerNameInput.value = '';
    DOM.customerContactInput.value = '';
    showNotification('Customer added successfully');
    scheduleAutoSave();
}

function updateCustomerList(filter = '') {
    DOM.customerList.innerHTML = '';
    const filtered = state.customers.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    filtered.forEach(c => {
        const item = document.createElement('div');
        item.classList.add('customer-item');
        item.innerHTML = `
            <div>${c.name} - ${c.contact || 'No contact'}<br>Balance: $${c.balance.toFixed(2)}</div>
            <div class="history-actions">
                <button class="edit-btn" data-id="${c.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" data-id="${c.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        editBtn.addEventListener('click', () => {
            state.actionTarget = { customer: c, item, action: 'editCustomer' };
            DOM.modalMessage.textContent = 'Edit Customer Name';
            DOM.editForm.style.display = 'block';
            DOM.editField.value = c.name;
            DOM.actionModal.classList.add('show');
        });
        deleteBtn.addEventListener('click', () => {
            state.actionTarget = { customer: c, item, action: 'deleteCustomer' };
            DOM.modalMessage.textContent = 'Delete this customer?';
            DOM.editForm.style.display = 'none';
            DOM.actionModal.classList.add('show');
        });
        DOM.customerList.appendChild(item);
    });
}

function updateCustomerSelect() {
    DOM.customerSelect.innerHTML = '<option value="">Select Customer</option>';
    state.customers.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        DOM.customerSelect.appendChild(option);
    });
}

// Analytics
function updateAnalytics() {
    const totalEarnings = state.transactions.reduce((sum, t) => sum + t.amount, 0);
    const busiestDay = Object.entries(
        state.transactions.reduce((acc, t) => {
            const date = t.date.toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topCustomer = Object.entries(
        state.transactions.reduce((acc, t) => {
            acc[t.customerId] = (acc[t.customerId] || 0) + t.amount;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1])[0];
    const topCustomerName = state.customers.find(c => c.id === parseInt(topCustomer?.[0]))?.name || 'N/A';

    DOM.analyticsDashboard.innerHTML = `
        <div class="analytics-card">
            <h3>Total Earnings</h3>
            <p>$${totalEarnings.toFixed(2)}</p>
        </div>
        <div class="analytics-card">
            <h3>Busiest Day</h3>
            <p>${busiestDay}</p>
        </div>
        <div class="analytics-card">
            <h3>Top Customer</h3>
            <p>${topCustomerName}</p>
        </div>
    `;
}

// Modal Actions
DOM.confirmAction.addEventListener('click', async () => {
    const { transaction, item, customer, action } = state.actionTarget || {};
    if (action === 'deleteTransaction') {
        state.transactions = state.transactions.filter(t => t !== transaction);
        item.style.opacity = '0';
        setTimeout(() => {
            item.remove();
            DOM.actionModal.classList.remove('show');
        }, 300);
        showNotification('Transaction deleted');
    } else if (action === 'editCustomer') {
        const newName = DOM.editField.value.trim();
        if (!newName) {
            showNotification('Please enter a name', true);
            return;
        }
        customer.name = newName;
        updateCustomerList();
        updateCustomerSelect();
        showNotification('Customer updated');
    } else if (action === 'deleteCustomer') {
        state.transactions = state.transactions.filter(t => t.customerId !== customer.id);
        state.customers = state.customers.filter(c => c !== customer);
        item.style.opacity = '0';
        setTimeout(() => {
            item.remove();
            DOM.actionModal.classList.remove('show');
        }, 300);
        updateCustomerList();
        updateCustomerSelect();
        updateHistoryList();
        showNotification('Customer deleted');
    } else if (action === 'bulkDelete') {
        const { transactions } = state.actionTarget;
        state.transactions = state.transactions.filter(t => !transactions.includes(t.id));
        
        await saveToIndexedDB();
        updateHistoryList();
        state.selectedTransactions.clear();
        updateBulkActionsVisibility();
        
        DOM.actionModal.classList.remove('show');
        showNotification(`${transactions.length} transactions deleted`);
    }
    await saveToIndexedDB();
    await saveCustomersToIndexedDB();
    updateAnalytics();
    state.actionTarget = null;
});

DOM.cancelAction.addEventListener('click', () => {
    DOM.actionModal.classList.remove('show');
    state.actionTarget = null;
});

// IndexedDB Functions
async function saveToIndexedDB() {
    try {
        const db = await openDB();
        const tx = db.transaction(transactionStore, 'readwrite');
        const store = tx.objectStore(transactionStore);

        // Save all transactions
        await store.clear();
        const promises = state.transactions.map(t => {
            const serializedTransaction = {
                ...t,
                start: t.start.toISOString(),
                end: t.end.toISOString(),
                date: t.date.toISOString()
            };
            return store.add(serializedTransaction);
        });

        await Promise.all(promises);
        backupToLocalStorage(); // Backup to localStorage
        return true;
    } catch (error) {
        console.error('Error saving to IndexedDB:', error);
        backupToLocalStorage(); // Backup to localStorage even if IndexedDB fails
        return false;
    }
}

// Add this function to handle localStorage backup
function backupToLocalStorage() {
    try {
        const data = {
            transactions: state.transactions.map(t => ({
                ...t,
                start: t.start.toISOString(),
                end: t.end.toISOString(),
                date: t.date.toISOString()
            })),
            customers: state.customers
        };
        localStorage.setItem('timeCalcData', JSON.stringify(data));
    } catch (error) {
        console.error('LocalStorage backup failed:', error);
    }
}

async function loadFromIndexedDB() {
    try {
        // Try IndexedDB first
        const db = await openDB();
        const tx = db.transaction(transactionStore, 'readonly');
        const store = tx.objectStore(transactionStore);
        const transactions = await store.getAll();

        if (transactions.length === 0) {
            // If no data in IndexedDB, try localStorage
            const savedData = localStorage.getItem('timeCalcData');
            if (savedData) {
                const data = JSON.parse(savedData);
                state.transactions = data.transactions.map(t => ({
                    ...t,
                    start: new Date(t.start),
                    end: new Date(t.end),
                    date: new Date(t.date),
                    duration: calculateDuration(new Date(t.start), new Date(t.end))
                }));
                state.customers = data.customers;
            }
        } else {
            state.transactions = transactions.map(t => ({
                ...t,
                start: new Date(t.start),
                end: new Date(t.end),
                date: new Date(t.date),
                duration: calculateDuration(new Date(t.start), new Date(t.end))
            }));
        }

        updateHistoryList();
        return state.transactions;
    } catch (error) {
        console.error('Error loading from IndexedDB:', error);
        // Try localStorage as fallback
        try {
            const savedData = localStorage.getItem('timeCalcData');
            if (savedData) {
                const data = JSON.parse(savedData);
                state.transactions = data.transactions.map(t => ({
                    ...t,
                    start: new Date(t.start),
                    end: new Date(t.end),
                    date: new Date(t.date),
                    duration: calculateDuration(new Date(t.start), new Date(t.end))
                }));
                updateHistoryList();
            }
        } catch (localStorageError) {
            console.error('LocalStorage fallback failed:', localStorageError);
            showNotification('Failed to load data', true);
        }
        return state.transactions;
    }
}

async function saveCustomersToIndexedDB() {
    const db = await openDB();
    const tx = db.transaction(customerStore, 'readwrite');
    const store = tx.objectStore(customerStore);
    await store.clear();
    state.customers.forEach(c => store.put(c));
    return new Promise(resolve => tx.oncomplete = resolve);
}

async function loadCustomersFromIndexedDB() {
    const db = await openDB();
    const tx = db.transaction(customerStore, 'readonly');
    const store = tx.objectStore(customerStore);
    const request = store.getAll();
    return new Promise(resolve => {
        request.onsuccess = () => {
            state.customers = request.result;
            state.customers.forEach(c => {
                c.balance = state.transactions
                    .filter(t => t.customerId === c.id)
                    .reduce((sum, t) => sum + t.amount, 0);
            });
            updateCustomerList();
            updateCustomerSelect();
            resolve();
        };
    });
}

// Export Functions
DOM.exportJSONBtn.addEventListener('click', () => {
    const data = { transactions: state.transactions, customers: state.customers };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timecalc_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

DOM.exportCSVBtn.addEventListener('click', () => {
    const headers = ['Customer,Date,Start Time,End Time,Duration (min),Amount'];
    const rows = state.transactions.map(t => {
        const customer = state.customers.find(c => c.id === t.customerId);
        return `${customer?.name || 'Unknown'},${t.date.toLocaleDateString()},${t.start.toLocaleTimeString()},${t.end.toLocaleTimeString()},${t.duration.totalMinutes},${t.amount}`;
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timecalc_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

DOM.importDataInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);

            // Convert dates to Date objects
            state.transactions = data.transactions.map(t => ({
                ...t,
                start: new Date(t.start),
                end: new Date(t.end),
                date: new Date(t.date),
                duration: calculateDuration(new Date(t.start), new Date(t.end))
            }));

            state.customers = data.customers || [];

            // Save all imported data
            const db = await openDB();
            const tx = db.transaction([transactionStore, customerStore], 'readwrite');

            // Clear and save transactions
            await tx.objectStore(transactionStore).clear();
            for (const t of state.transactions) {
                const serialized = {
                    ...t,
                    start: t.start.toISOString(),
                    end: t.end.toISOString(),
                    date: t.date.toISOString()
                };
                await tx.objectStore(transactionStore).add(serialized);
            }

            // Clear and save customers
            await tx.objectStore(customerStore).clear();
            for (const c of state.customers) {
                await tx.objectStore(customerStore).add(c);
            }

            // Update UI
            updateHistoryList();
            updateCustomerList();
            updateCustomerSelect();

            showNotification('Data imported successfully');
        } catch (err) {
            console.error('Import error:', err);
            showNotification('Failed to import data. Please check file format.', true);
        }
        DOM.importDataInput.value = '';
    };
    reader.readAsText(file);
});

// Event Listeners
// Hard refresh button
DOM.hardRefresh.addEventListener('click', () => {
    if (confirm('Are you sure you want to refresh the page? Any unsaved changes will be lost.')) {
        window.location.reload(true);
    }
});
DOM.hardRefresh.addEventListener('click', () => {
    if (confirm('Are you sure you want to refresh the page? Any unsaved changes will be lost.')) {
        window.location.reload(true);
    }
});

DOM.addTransactionBtn.addEventListener('click', addTransaction);
DOM.addCustomerBtn.addEventListener('click', addCustomer);
let searchTimeout;
DOM.historySearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => updateHistoryList(DOM.historySearch.value), 300);
});
DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.historySearch.value = '';
    updateHistoryList();
});
DOM.customerSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => updateCustomerList(DOM.customerSearch.value), 300);
});

// Add periodic auto-save
let autoSaveTimeout;
function scheduleAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(async () => {
        await saveToIndexedDB();
        await saveCustomersToIndexedDB();
    }, 1000); // Save after 1 second of inactivity
}

// Add error recovery
window.addEventListener('unhandledrejection', async (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (event.reason.name === 'QuotaExceededError') {
        showNotification('Storage quota exceeded. Try clearing some data.', true);
    }
});

// Initialize with better error handling
(async () => {
    try {
        await openDB();
        loadPaymentStatuses();
        await Promise.all([
            loadFromIndexedDB(),
            loadCustomersFromIndexedDB()
        ]);
        switchTab('calculator');
        removeAnalytics(); // Remove analytics on startup
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Failed to initialize application', true);
    }
})();

DOM.rateType.addEventListener('change', function() {
    const defaultRate = this.options[this.selectedIndex].getAttribute('data-default');
    DOM.rateAmount.value = defaultRate;
});

// Set initial default rate
DOM.rateAmount.value = DOM.rateType.options[DOM.rateType.selectedIndex].getAttribute('data-default');

function updateBulkActionsVisibility() {
    const hasSelected = state.selectedTransactions.size > 0;
    DOM.bulkActions.style.display = hasSelected ? 'flex' : 'none';
    DOM.selectedCount.textContent = `${state.selectedTransactions.size} items selected`;
}

DOM.bulkAddBtn.addEventListener('click', async () => {
    const selectedTransactions = Array.from(state.selectedTransactions);
    const transactions = selectedTransactions.map(id => 
        state.transactions.find(t => t.id === id)
    ).filter(t => t);

    if (transactions.length === 0) {
        showNotification('No transactions selected', true);
        return;
    }

    // Group transactions by customer
    const groupedByCustomer = transactions.reduce((acc, t) => {
        if (!acc[t.customerId]) {
            acc[t.customerId] = [];
        }
        acc[t.customerId].push(t);
        return acc;
    }, {});

    // Create one combined transaction per customer
    for (const [customerId, customerTransactions] of Object.entries(groupedByCustomer)) {
        const firstTransaction = customerTransactions[0];
        
        // Calculate total duration in minutes
        const totalMinutes = customerTransactions.reduce((sum, t) => 
            sum + t.duration.totalMinutes, 0);
        
        // Calculate total amount
        const totalAmount = customerTransactions.reduce((sum, t) => 
            sum + t.amount, 0);

        const timeSlots = customerTransactions.map(t => ({
            start: t.start,
            end: t.end,
            date: t.date
        }));

        const combinedTransaction = {
            id: Date.now() + Math.random(),
            customerId: parseInt(customerId),
            start: new Date(Math.min(...customerTransactions.map(t => t.start))),
            end: new Date(Math.max(...customerTransactions.map(t => t.end))),
            amount: totalAmount,
            currency: firstTransaction.currency,
            rateType: firstTransaction.rateType,
            rateAmount: firstTransaction.rateAmount,
            duration: {
                hours: Math.floor(totalMinutes / 60),
                minutes: totalMinutes % 60,
                totalMinutes: totalMinutes
            },
            date: new Date(),
            timeSlots: timeSlots,
            combined: true // Mark as combined transaction
        };

        state.transactions.push(combinedTransaction);
    }

    // Clear selections and update UI
    state.selectedTransactions.clear();
    await saveToIndexedDB();
    
    // Switch to history tab and show the new combined transactions
    switchTab('history');
    updateHistoryList();
    updateBulkActionsVisibility();
    
    showNotification('Transactions combined and added successfully');
});

DOM.bulkDeleteBtn.addEventListener('click', async () => {
    const selectedTransactions = Array.from(state.selectedTransactions);
    if (selectedTransactions.length === 0) {
        showNotification('No transactions selected', true);
        return;
    }

    DOM.modalMessage.textContent = `Delete ${selectedTransactions.length} selected transactions?`;
    DOM.editForm.style.display = 'none';
    DOM.actionModal.classList.add('show');

    // Store bulk delete info for confirmation
    state.actionTarget = { 
        action: 'bulkDelete',
        transactions: selectedTransactions
    };
});

DOM.historyCustomerFilter.addEventListener('change', () => {
    updateHistoryList(DOM.historySearch.value);
});

// Add payment status toggle function
function togglePaymentStatus(transactionId) {
    DOM.modalMessage.textContent = 'Update Payment Status';
    DOM.editForm.innerHTML = `
        <div class="payment-modal-content">
            <div class="payment-option ${state.paymentStatuses.get(transactionId) === 'paid' ? 'selected' : ''}" 
                 data-status="paid">
                <i class="fas fa-check-circle"></i>
                <div>Paid</div>
            </div>
            <div class="payment-option ${state.paymentStatuses.get(transactionId) === 'due' ? 'selected' : ''}" 
                 data-status="due">
                <i class="fas fa-clock"></i>
                <div>Due</div>
            </div>
        </div>
    `;
    DOM.editForm.style.display = 'block';
    DOM.actionModal.classList.add('show');

    // Add click handlers for payment options
    const options = DOM.editForm.querySelectorAll('.payment-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const status = option.dataset.status;
            state.paymentStatuses.set(transactionId, status);
            savePaymentStatuses();
            updateHistoryList(DOM.historySearch.value);
            DOM.actionModal.classList.remove('show');
            showNotification(`Payment status updated to ${status}`);
        });
    });

    state.actionTarget = { action: 'updatePayment', transactionId };
}

// Save payment statuses
function savePaymentStatuses() {
    localStorage.setItem('paymentStatuses', 
        JSON.stringify(Array.from(state.paymentStatuses.entries())));
}

// Load payment statuses
function loadPaymentStatuses() {
    const saved = localStorage.getItem('paymentStatuses');
    if (saved) {
        state.paymentStatuses = new Map(JSON.parse(saved));
    }
}
