// DOM Elements
const expenseForm = document.getElementById('expense-form');
const expenseList = document.getElementById('expense-list');
const expenseChart = document.getElementById('expense-chart');
const monthlyTotalElement = document.getElementById('monthly-total');
const exportBtn = document.getElementById('export-btn');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');

// Chart instance
let chart = null;

// Set default date to today
document.getElementById('date').valueAsDate = new Date();

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    expenseForm.addEventListener('submit', handleFormSubmit);
    exportBtn.addEventListener('click', exportData);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        note: document.getElementById('note').value
    };
    
    try {
        const response = await fetch('/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Expense added successfully!');
            expenseForm.reset();
            document.getElementById('date').valueAsDate = new Date();
            fetchData();
        } else {
            showNotification('Error: ' + data.message, true);
        }
    } catch (error) {
        showNotification('Error: Could not connect to server', true);
        console.error('Error:', error);
    }
}

// Fetch data from the server
async function fetchData() {
    try {
        const response = await fetch('/data');
        const data = await response.json();
        
        if (data.success) {
            updateExpenseList(data.expenses);
            updateChart(data.categories);
            updateMonthlyTotal(data.monthly_total);
        } else {
            showNotification('Error: ' + data.message, true);
        }
    } catch (error) {
        showNotification('Error: Could not fetch data', true);
        console.error('Error:', error);
    }
}

// Update the expense list
function updateExpenseList(expenses) {
    expenseList.innerHTML = '';
    
    if (expenses.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" style="text-align: center;">No expenses found</td>';
        expenseList.appendChild(row);
        return;
    }
    
    expenses.forEach(expense => {
        const row = document.createElement('tr');
        
        // Format the date
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString();
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${expense.category}</td>
            <td>₹${parseFloat(expense.amount).toFixed(2)}</td>
            <td>${expense.note || '-'}</td>
        `;
        
        expenseList.appendChild(row);
    });
}

// Update the chart
function updateChart(categories) {
    // Prepare data for the chart
    const labels = categories.map(cat => cat.category);
    const data = categories.map(cat => cat.total);
    
    // Generate colors
    const backgroundColors = generateColors(categories.length);
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Create new chart
    chart = new Chart(expenseChart, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update the monthly total
function updateMonthlyTotal(total) {
    monthlyTotalElement.textContent = parseFloat(total).toFixed(2);
}

// Export data to CSV
function exportData() {
    window.location.href = '/export';
    showNotification('Exporting data...');
}

// Show notification
function showNotification(message, isError = false) {
    notificationMessage.textContent = message;
    notification.style.backgroundColor = isError ? '#EF4444' : '#10B981';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Generate colors for the chart
function generateColors(count) {
    const primaryColor = '#4F46E5';
    const secondaryColor = '#10B981';
    
    // If only two categories, use primary and secondary colors
    if (count === 2) {
        return [primaryColor, secondaryColor];
    }
    
    // For more categories, generate a color palette
    const colors = [primaryColor, secondaryColor];
    
    // Add more colors if needed
    const additionalColors = [
        '#F59E0B', // Amber
        '#EC4899', // Pink
        '#8B5CF6', // Purple
        '#06B6D4', // Cyan
        '#EF4444', // Red
        '#84CC16', // Lime
        '#3B82F6', // Blue
        '#F97316'  // Orange
    ];
    
    for (let i = 0; i < count - 2; i++) {
        colors.push(additionalColors[i % additionalColors.length]);
    }
    
    return colors;
}