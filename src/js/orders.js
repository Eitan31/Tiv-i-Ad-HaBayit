// משתנים גלובליים
let currentOrders = [];
let filteredOrders = [];

// פונקציה לטעינת כל ההזמנות
async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        const orders = await response.json();
        currentOrders = orders;
        filteredOrders = orders;
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('אירעה שגיאה בטעינת ההזמנות');
    }
}

// פונקציה להצגת ההזמנות
function displayOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer) return;

    // קיבוץ הזמנות לפי ערים
    const ordersByCity = {};
    filteredOrders.forEach(order => {
        if (!ordersByCity[order.city]) {
            ordersByCity[order.city] = [];
        }
        ordersByCity[order.city].push(order);
    });

    let html = '';
    
    // יצירת תצוגה לכל עיר
    Object.keys(ordersByCity).sort().forEach(city => {
        const cityOrders = ordersByCity[city];
        html += `
            <div class="city-section">
                <h2 class="city-title">${city}</h2>
                <div class="orders-grid">
                    ${cityOrders.map(order => `
                        <div class="order-card ${order.status === 'pending' ? 'pending' : 'completed'}">
                            <div class="order-header">
                                <h3>${order.customerName}</h3>
                                <span class="order-date">${new Date(order.orderDate).toLocaleDateString('he-IL')}</span>
                            </div>
                            <div class="order-details">
                                <div class="items-list">
                                    ${order.items.map(item => `
                                        <div class="order-item">
                                            <span>${item.name}</span>
                                            <span>כמות: ${item.quantity}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="order-summary">
                                    <div class="total-amount">סה"כ: ₪${order.totalAmount}</div>
                                    <div class="order-status">
                                        סטטוס: 
                                        <span class="status-badge ${order.status}">
                                            ${order.status === 'pending' ? 'ממתין למשלוח' : 'נשלח'}
                                        </span>
                                    </div>
                                </div>
                                ${order.status === 'pending' ? `
                                    <button onclick="markAsDelivered(${order.id})" class="deliver-btn">
                                        סמן כנשלח
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    ordersContainer.innerHTML = html;
}

// פונקציה לסינון הזמנות
function filterOrders(filters) {
    filteredOrders = currentOrders.filter(order => {
        let matches = true;
        
        if (filters.city) {
            matches = matches && order.city === filters.city;
        }
        
        if (filters.status) {
            matches = matches && order.status === filters.status;
        }
        
        if (filters.dateFrom) {
            const orderDate = new Date(order.orderDate);
            const fromDate = new Date(filters.dateFrom);
            matches = matches && orderDate >= fromDate;
        }
        
        if (filters.dateTo) {
            const orderDate = new Date(order.orderDate);
            const toDate = new Date(filters.dateTo);
            matches = matches && orderDate <= toDate;
        }
        
        return matches;
    });
    
    displayOrders();
}

// פונקציה לסימון הזמנה כנשלחה
async function markAsDelivered(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'completed',
                deliveryDate: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            // עדכון ההזמנה ברשימה המקומית
            const orderIndex = currentOrders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                currentOrders[orderIndex].status = 'completed';
                currentOrders[orderIndex].deliveryDate = new Date().toISOString();
                filterOrders({}); // רענון התצוגה
            }
        } else {
            throw new Error('Failed to update order status');
        }
    } catch (error) {
        console.error('Error updating order:', error);
        alert('אירעה שגיאה בעדכון סטטוס ההזמנה');
    }
}

// פונקציה ליצירת הזמנה חדשה
async function createOrder(orderData) {
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...orderData,
                orderDate: new Date().toISOString(),
                status: 'pending'
            })
        });
        
        if (response.ok) {
            const newOrder = await response.json();
            currentOrders.push(newOrder);
            filterOrders({});
            return newOrder;
        } else {
            throw new Error('Failed to create order');
        }
    } catch (error) {
        console.error('Error creating order:', error);
        alert('אירעה שגיאה ביצירת ההזמנה');
        return null;
    }
}

// טעינת ההזמנות בטעינת הדף
document.addEventListener('DOMContentLoaded', loadOrders); 