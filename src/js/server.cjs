const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid'); // הוספת חבילה ליצירת מזהים ייחודיים
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// הוספת תמיכה ב-CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// הגדרת חיבור לבסיס הנתונים
const connection = mysql.createPool({
  host: process.env.DB_HOST || 'Eitan',
  user: process.env.DB_USER || 'Eitan',
  password: process.env.DB_PASSWORD || 'Eitan3187',
  database: process.env.DB_NAME || 'mystore',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// עדכון השדות maps ו-waze ל-TEXT
(async () => {
  try {
    const [result] = await connection.query('SELECT 1');
    console.log('Connected to the database.');

    // בדיקה אם העמודה admin_notes קיימת
    const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "admin_notes"');
    if (columns.length === 0) {
      // אם העמודה לא קיימת, נוסיף אותה
      await connection.query('ALTER TABLE users ADD COLUMN admin_notes JSON DEFAULT NULL');
      console.log('Added admin_notes column to users table.');
    }

    // בדיקה אם העמודה cart קיימת
    const [cartColumns] = await connection.query('SHOW COLUMNS FROM users LIKE "cart"');
    if (cartColumns.length === 0) {
      // אם העמודה לא קיימת, נוסיף אותה
      await connection.query('ALTER TABLE users ADD COLUMN cart JSON DEFAULT NULL');
      console.log('Added cart column to users table.');
    }

    // עדכון השדות maps ו-waze ל-TEXT
    await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN maps TEXT,
      MODIFY COLUMN waze TEXT;
    `);
    console.log('Updated table structure.');
  } catch (err) {
    console.error('Error:', err);
  }
})();

module.exports = { connection };

// הוספת הגדרות סטטיות לקבצים
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../../../assets')));

// קבלת כל המוצרים
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await connection.query('SELECT * FROM products');
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// הוספת מוצר חדש
app.post('/api/products', async (req, res) => {
    try {
        const { id, name, price, category, image, description, volume, storage, shelfLife } = req.body;
        const result = await connection.query(
            'INSERT INTO products (id, name, price, category, image, description, volume, storage, shelfLife) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, price, category, image, description, volume, storage, shelfLife]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: error.message });
    }
});

// מחיקת מוצר לפי ID
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await connection.query('DELETE FROM products WHERE id=?', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// עדכון פרטי מוצר
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, image, description } = req.body;
    await connection.query(
      'UPDATE products SET name=?, price=?, category=?, image=?, description=? WHERE id=?',
      [name, price, category, image, description, id]
    );
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// קבלת כל המשתמשים עם סידור לפי עיר ותפקיד
app.get('/api/users', async (req, res) => {
  const city = req.query.city;
  try {
        let query = `
            SELECT * FROM users 
            ORDER BY 
                CASE city
                    WHEN 'להבים' THEN 1
                    WHEN 'עומר' THEN 2
                    WHEN 'מיתר' THEN 3
                    WHEN 'כרמים' THEN 4
                    WHEN 'באר שבע' THEN 5
                    ELSE 6
                END,
                position DESC
        `;
        
    const values = [];
    if (city && city !== 'all') {
            query = `
                SELECT * FROM users 
                WHERE city = ?
                ORDER BY position DESC
            `;
      values.push(city);
    }

    const [rows] = await connection.execute(query, values);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// הוספת משתמש חדש
app.post('/api/users', async (req, res) => {
  const { name, phone, address, city, position, cart, purchases, password, notes, admin_notes, code, debt_balance} = req.body;

  if (!name || !phone || !address || !city) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const id = uuidv4();
  const location = encodeURIComponent(`${address}, ${city}, ישראל`);
  const maps = `https://www.google.com/maps/search/?api=1&query=${location}`;
  const waze = `https://waze.com/ul?q=${location}&navigate=yes`;

  // טיפול בהערות ו-JSON
  let processedNotes = notes;
  let processedAdminNotes = admin_notes;
  let processedCart = cart;
  let processedPurchases = purchases;

  // טיפול בהערות
  if (Array.isArray(notes)) {
    processedNotes = JSON.stringify(notes);
  } else if (typeof notes === 'string') {
    try {
      JSON.parse(notes);
      processedNotes = notes;
    } catch (e) {
      processedNotes = '[]';
    }
  } else {
    processedNotes = '[]';
  }

  // טיפול בהערות מנהל
  if (Array.isArray(admin_notes)) {
    processedAdminNotes = JSON.stringify(admin_notes);
  } else if (typeof admin_notes === 'string') {
    try {
      JSON.parse(admin_notes);
      processedAdminNotes = admin_notes;
    } catch (e) {
      processedAdminNotes = '[]';
    }
  } else {
    processedAdminNotes = '[]';
  }

  // טיפול בעגלה
  if (Array.isArray(cart)) {
    processedCart = JSON.stringify(cart);
  } else if (typeof cart === 'string') {
    try {
      JSON.parse(cart);
      processedCart = cart;
    } catch (e) {
      processedCart = '[]';
    }
  } else {
    processedCart = '[]';
  }

  // טיפול ברכישות
  if (Array.isArray(purchases)) {
    processedPurchases = JSON.stringify(purchases);
  } else if (typeof purchases === 'string') {
    try {
      JSON.parse(purchases);
      processedPurchases = purchases;
    } catch (e) {
      processedPurchases = '[]';
    }
  } else {
    processedPurchases = '[]';
  }

  console.log('Processing notes:', { notes, admin_notes, processedNotes, processedAdminNotes }); // לוג לבדיקה

  try {
    await connection.execute(
      `INSERT INTO users (id, name, phone, address, city, position, notes, admin_notes, cart, purchases, password, maps, waze, joinDate, code, debt_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        id, name, phone, address, city, position || 0, 
        processedNotes,
        processedAdminNotes,
        processedCart,
        processedPurchases,
        password || phone, maps, waze,
        code || '',
        debt_balance || 0
      ]
    );

    res.status(201).json({
      success: true,
      user: { 
        id, name, phone, address, city, position: position || 0, 
        notes: processedNotes,
        admin_notes: processedAdminNotes,
        cart: cart || [], 
        purchases: purchases || [], 
        password: password || phone, 
        maps, waze, 
        code: code || '',
        debt_balance: debt_balance || 0
      }
    });
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ error: 'Error adding user', details: err.message });
  }
});

// מחיקת משתמש לפי ID
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

// עדכון פרטי משתמש
app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        console.log('Updating user with ID:', userId);
        console.log('Request body:', req.body);
        
        // קבלת נתוני המשתמש הקיימים
        const [existingUser] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (!existingUser || existingUser.length === 0) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'משתמש לא נמצא' });
        }

        const currentUser = existingUser[0];
        const updatedData = req.body;

        console.log('Current user data:', currentUser);
        console.log('Updated data received:', updatedData);

        // אם מעדכנים רק את העגלה
        if (Object.keys(updatedData).length === 1 && updatedData.cart !== undefined) {
            try {
                const processedCart = Array.isArray(updatedData.cart) ? 
                    JSON.stringify(updatedData.cart) : 
                    (typeof updatedData.cart === 'string' ? updatedData.cart : '[]');

                console.log('Updating cart with:', processedCart);

                await connection.query(`
                    UPDATE users 
                    SET 
                        name = ?,
                        phone = ?,
                        address = ?,
                        city = ?,
                        position = ?,
                        password = ?,
                        code = ?,
                        debt_balance = ?,
                        notes = ?,
                        admin_notes = ?,
                        cart = ?,
                        purchases = ?,
                        maps = ?,
                        waze = ?
                    WHERE id = ?
                `, [
                    updatedData.name || currentUser.name,
                    updatedData.phone || currentUser.phone,
                    updatedData.address || currentUser.address,
                    updatedData.city || currentUser.city,
                    updatedData.position || currentUser.position || 0,
                    updatedData.password || currentUser.password,
                    updatedData.code || currentUser.code || '',
                    updatedData.debt_balance !== undefined && updatedData.debt_balance !== '' ? parseFloat(updatedData.debt_balance) : (parseFloat(currentUser.debt_balance) || 0),
                    typeof updatedData.notes === 'string' ? updatedData.notes : 
                          (Array.isArray(updatedData.notes) ? JSON.stringify(updatedData.notes) : 
                          (currentUser.notes || '[]')),
                    typeof updatedData.admin_notes === 'string' ? updatedData.admin_notes :
                                (Array.isArray(updatedData.admin_notes) ? JSON.stringify(updatedData.admin_notes) :
                                (currentUser.admin_notes || '[]')),
                    typeof updatedData.cart === 'string' ? updatedData.cart :
                          (Array.isArray(updatedData.cart) ? JSON.stringify(updatedData.cart) :
                          (currentUser.cart || '[]')),
                    typeof updatedData.purchases === 'string' ? updatedData.purchases :
                              (Array.isArray(updatedData.purchases) ? JSON.stringify(updatedData.purchases) :
                              (currentUser.purchases || '[]')),
                    updatedData.maps || currentUser.maps || '',
                    updatedData.waze || currentUser.waze || '',
                    userId
                ]);

                const [updatedUser] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
                console.log('Updated user:', updatedUser[0]);
                return res.json(updatedUser[0]);
            } catch (e) {
                console.error('Error processing cart:', e);
                return res.status(400).json({ 
                    error: 'שגיאה בעדכון העגלה',
                    details: e.message
                });
            }
        }

        // עיבוד שדות JSON
        const processedData = {
            name: updatedData.name ?? currentUser.name,
            phone: updatedData.phone ?? currentUser.phone,
            address: updatedData.address ?? currentUser.address,
            city: updatedData.city ?? currentUser.city,
            position: updatedData.position ?? currentUser.position ?? 0,
            password: updatedData.password ?? currentUser.password,
            code: updatedData.code ?? currentUser.code ?? '',
            debt_balance: updatedData.debt_balance !== undefined && updatedData.debt_balance !== '' ? parseFloat(updatedData.debt_balance) : (parseFloat(currentUser.debt_balance) || 0),
            notes: typeof updatedData.notes === 'string' ? updatedData.notes : 
                  (Array.isArray(updatedData.notes) ? JSON.stringify(updatedData.notes) : 
                  (currentUser.notes || '[]')),
            admin_notes: typeof updatedData.admin_notes === 'string' ? updatedData.admin_notes :
                        (Array.isArray(updatedData.admin_notes) ? JSON.stringify(updatedData.admin_notes) :
                        (currentUser.admin_notes || '[]')),
            cart: typeof updatedData.cart === 'string' ? updatedData.cart :
                  (Array.isArray(updatedData.cart) ? JSON.stringify(updatedData.cart) :
                  (currentUser.cart || '[]')),
            purchases: typeof updatedData.purchases === 'string' ? updatedData.purchases :
                      (Array.isArray(updatedData.purchases) ? JSON.stringify(updatedData.purchases) :
                      (currentUser.purchases || '[]')),
            maps: updatedData.maps ?? currentUser.maps ?? '',
            waze: updatedData.waze ?? currentUser.waze ?? ''
        };

        console.log('Processed data for update:', processedData);

        // עדכון הנתונים בדאטהבייס
        await connection.query(`
            UPDATE users 
            SET 
                name = ?,
                phone = ?,
                address = ?,
                city = ?,
                position = ?,
                password = ?,
                code = ?,
                debt_balance = ?,
                notes = ?,
                admin_notes = ?,
                cart = ?,
                purchases = ?,
                maps = ?,
                waze = ?
            WHERE id = ?
        `, [
            processedData.name || currentUser.name,
            processedData.phone || currentUser.phone,
            processedData.address || currentUser.address,
            processedData.city || currentUser.city,
            processedData.position || currentUser.position || 0,
            processedData.password || currentUser.password,
            processedData.code || currentUser.code || '',
            processedData.debt_balance !== undefined && processedData.debt_balance !== '' ? parseFloat(processedData.debt_balance) : (parseFloat(currentUser.debt_balance) || 0),
            typeof processedData.notes === 'string' ? processedData.notes : 
                  (Array.isArray(processedData.notes) ? JSON.stringify(processedData.notes) : 
                  (currentUser.notes || '[]')),
            typeof processedData.admin_notes === 'string' ? processedData.admin_notes :
                        (Array.isArray(processedData.admin_notes) ? JSON.stringify(processedData.admin_notes) :
                        (currentUser.admin_notes || '[]')),
            typeof processedData.cart === 'string' ? processedData.cart :
                  (Array.isArray(processedData.cart) ? JSON.stringify(processedData.cart) :
                  (currentUser.cart || '[]')),
            typeof processedData.purchases === 'string' ? processedData.purchases :
                      (Array.isArray(processedData.purchases) ? JSON.stringify(processedData.purchases) :
                      (currentUser.purchases || '[]')),
            processedData.maps || currentUser.maps || '',
            processedData.waze || currentUser.waze || '',
            userId
        ]);

        // החזרת הנתונים המעודכנים
        const [updatedUser] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
        console.log('Final updated user:', updatedUser[0]);
        res.json(updatedUser[0]);

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            error: 'שגיאה בעדכון המשתמש', 
            details: error.message,
            sqlError: error.sqlMessage
        });
    }
});

// עדכון חוב של משתמש
app.put('/api/users/:id/debt', async (req, res) => {
    try {
        const { id } = req.params;
        const { debt_balance } = req.body;
        
        await connection.query(
            'UPDATE users SET debt_balance=? WHERE id=?',
            [debt_balance, id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user debt:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// קבלת משתמשים עם חוב
app.get('/api/users/debtors', async (req, res) => {
    try {
        const [users] = await connection.query('SELECT * FROM users WHERE debt_balance > 0');
        res.json(users);
    } catch (error) {
        console.error('Error fetching debtors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// טעינת עמודים סטטיים
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../index.html'));
});

app.get('/cart.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../cart.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../admin.html'));
});

// קבלת מוצר ספציפי לפי ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [id]);
        
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(products[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// הגדרת נתיב לדף האדמין
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../../admin.html'));
});

// קבלת כל ההזמנות
app.get('/api/orders', async (req, res) => {
    try {
        const userId = req.query.userId;

        // בניית שאילתת ה-SQL
        let ordersQuery = 'SELECT * FROM orders';
        let queryParams = [];

        // מחזירים רק את ההזמנות של המשתמש הספציפי
        if (userId) {
            ordersQuery += ' WHERE customerId = ?';
            queryParams.push(userId);
        }

        ordersQuery += ' ORDER BY orderDate DESC';

        // שליפת ההזמנות
        const [orders] = await connection.query(ordersQuery, queryParams);
        
        // שליפת כל המשתמשים
        const [users] = await connection.query('SELECT * FROM users');
        
        // יצירת מפה של משתמשים לפי ID
        const usersMap = {};
        users.forEach(user => {
            usersMap[user.id] = user;
        });

        // שליפת כל המוצרים
        const [products] = await connection.query('SELECT * FROM products');
        
        // יצירת מפה של מוצרים לפי ID
        const productsMap = {};
        products.forEach(product => {
            productsMap[product.id] = product;
        });

        // עיבוד התוצאות
        const processedOrders = orders.map(order => {
            // קבלת פרטי המשתמש
            const user = usersMap[order.customerId];
            
            // המרת מחרוזת JSON למערך של פריטים
            let orderItems = [];
            try {
                // בדיקה אם items הוא כבר אובייקט
                if (typeof order.items === 'object' && !Array.isArray(order.items)) {
                    orderItems = [order.items];
                } else if (Array.isArray(order.items)) {
                    orderItems = order.items;
                } else {
                    orderItems = JSON.parse(order.items || '[]');
                }

                // הוספת פרטי מוצר מלאים לכל פריט
                orderItems = orderItems.map(item => {
                    const product = productsMap[item.id];
                    if (product) {
                        return {
                            ...item,
                            name: product.name,
                            price: product.price,
                            description: product.description,
                            img: product.img,
                            shelfLife: product.shelfLife,
                            storage: product.storage,
                            volume: product.volume
                        };
                    }
                    return item;
                });
            } catch (e) {
                console.error(`Error parsing items for order ${order.id}:`, e);
                return null;
            }

            return {
                id: order.id,
                customer: user ? {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    address: user.address,
                    city: user.city
                } : {
                    id: order.customerId,
                    name: 'לקוח לא נמצא',
                    phone: '',
                    address: '',
                    city: ''
                },
                items: orderItems,
                totalAmount: order.totalAmount || 0,
                status: order.status || 'בטיפול',
                orderDate: order.orderDate,
                notes: order.notes || ''
            };
        }).filter(order => order !== null);

        res.json(processedOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'שגיאה בטעינת ההזמנות', details: error.message });
    }
});

// יצירת הזמנה חדשה
app.post('/api/orders', async (req, res) => {
    try {
        const { customerId, items, totalAmount } = req.body;

        // בדיקת תקינות הנתונים
        if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'נתונים חסרים או לא תקינים' });
        }

        // בדיקה שהמשתמש קיים
        const [userRows] = await connection.query('SELECT * FROM users WHERE id = ?', [customerId]);
        if (!userRows || userRows.length === 0) {
            return res.status(404).json({ error: 'משתמש לא נמצא' });
        }
        const user = userRows[0];

        // יצירת תאריך בפורמט MySQL
        const now = new Date();
        const orderDate = now.toISOString().slice(0, 19).replace('T', ' ');

        // הכנסת ההזמנה לדאטהבייס
        const [orderResult] = await connection.query(
            'INSERT INTO orders (customerId, items, totalAmount, status, orderDate) VALUES (?, ?, ?, ?, ?)',
            [customerId, JSON.stringify(items), totalAmount, 'בטיפול', orderDate]
        );

        // עדכון הרכישות של המשתמש
        let purchases = [];
        try {
            if (user.purchases) {
                purchases = typeof user.purchases === 'string' ? 
                    JSON.parse(user.purchases) : user.purchases;
            }
        } catch (e) {
            console.error('Error parsing existing purchases:', e);
            purchases = [];
        }

        // הוספת ההזמנה החדשה לרכישות
        const newPurchase = {
            id: orderResult.insertId,
            date: orderDate,
            items: items,
            total: totalAmount,
            status: 'בטיפול'
        };
        purchases.push(newPurchase);

        // עדכון המשתמש בדאטהבייס
        await connection.query(
            'UPDATE users SET purchases = ?, cart = ?, debt_balance = debt_balance + ? WHERE id = ?',
            [
                JSON.stringify(purchases),
                '[]',  // ניקוי העגלה
                totalAmount,
                customerId
            ]
        );

        // שליפת ההזמנה שנוצרה
        const [newOrder] = await connection.query(
            'SELECT * FROM orders WHERE id = ?',
            [orderResult.insertId]
        );

        res.status(201).json({
            order: {
                ...newOrder[0],
                customer: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    address: user.address,
                    city: user.city
                }
            },
            message: 'ההזמנה נוצרה בהצלחה'
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'שגיאה ביצירת ההזמנה', details: error.message });
    }
});

// עדכון סטטוס הזמנה
app.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!status || !['בטיפול', 'אושרה', 'בוטלה'].includes(status)) {
            return res.status(400).json({ error: 'סטטוס לא תקין' });
        }

        await connection.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );

        res.json({ message: 'סטטוס ההזמנה עודכן בהצלחה' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'שגיאה בעדכון סטטוס ההזמנה' });
    }
});

// מחיקת הזמנה
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await connection.query('DELETE FROM orders WHERE id=?', [id]);
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// עדכון הזמנה
app.put('/api/orders/:id', async (req, res) => {
    try {
        const { customerId, items, totalAmount, status } = req.body;
        
        // וידוא שה-items הוא מערך של מזהי מוצרים
        let itemIds = items;
        if (typeof items === 'string') {
            itemIds = JSON.parse(items);
        }
        
        // בדיקה שההזמנה קיימת
        const [existingOrder] = await connection.query(
            'SELECT * FROM orders WHERE id = ?',
            [req.params.id]
        );

        if (existingOrder.length === 0) {
            return res.status(404).json({ 
                error: 'הזמנה לא נמצאה',
                orderId: req.params.id
            });
        }

        // בדיקה שכל המוצרים קיימים
        const [products] = await connection.query(
            'SELECT * FROM products WHERE id IN (?)',
            [itemIds]
        );

        if (products.length !== itemIds.length) {
            return res.status(400).json({ 
                error: 'חלק מהמוצרים לא נמצאו במערכת',
                missingProducts: itemIds.filter(id => !products.find(p => p.id === id))
            });
        }

        // בדיקה שהמשתמש קיים
        const [users] = await connection.query(
            'SELECT * FROM users WHERE id = ?',
            [customerId]
        );

        if (users.length === 0) {
            return res.status(400).json({ 
                error: 'משתמש לא נמצא',
                customerId
            });
        }

        // שמירת מזהי המוצרים כ-JSON
        const itemsJson = JSON.stringify(itemIds);

        await connection.query(
            'UPDATE orders SET customerId = ?, items = ?, totalAmount = ?, status = ? WHERE id = ?',
            [customerId, itemsJson, totalAmount, status, req.params.id]
        );

        // יצירת תשובה עם כל הפרטים
        const processedOrder = {
            id: parseInt(req.params.id),
            customer: {
                id: users[0].id,
                name: users[0].name,
                phone: users[0].phone,
                address: users[0].address,
                city: users[0].city
            },
            items: products.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                image: product.image,
                description: product.description,
                volume: product.volume,
                storage: product.storage,
                shelfLife: product.shelfLife
            })),
            totalAmount,
            status,
            orderDate: existingOrder[0].orderDate,
            notes: existingOrder[0].notes || ''
        };

        res.json(processedOrder);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'שגיאה בעדכון ההזמנה' });
    }
});

// עדכון שדה בודד במוצר
app.patch('/api/products/:id/field', async (req, res) => {
    try {
        const { id } = req.params;
        const { field, value } = req.body;
        
        // רשימת השדות המותרים לעדכון
        const allowedFields = ['name', 'price', 'category', 'image', 'description', 'volume', 'shelfLife', 'storage'];
        
        if (!allowedFields.includes(field)) {
            return res.status(400).json({ error: 'Invalid field name' });
        }

        await connection.query(
            `UPDATE products SET ${field}=? WHERE id=?`,
            [value, id]
        );
        
        res.json({ message: 'Field updated successfully' });
    } catch (error) {
        console.error('Error updating product field:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// הוספת נקודת קצה לסטטיסטיקות משתמשים
app.get('/api/users/stats', async (req, res) => {
    try {
        // סה"כ משתמשים
        const [totalResult] = await connection.query('SELECT COUNT(*) as total FROM users');
        
        // משתמשים חדשים השבוע
        const [newUsersResult] = await connection.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE joinDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        
        // משתמשים לפי ערים
        const [cityStats] = await connection.query(`
            SELECT city, COUNT(*) as count 
            FROM users 
            GROUP BY city
        `);

        res.json({
            total: totalResult[0].total,
            newUsers: newUsersResult[0].count,
            byCity: cityStats
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Error fetching user stats' });
    }
});

// עדכון מבנה טבלת הזמנות
app.get('/api/setup/update-orders', async (req, res) => {
    try {
        // בדיקת מבנה הטבלה הנוכחי
        const [columns] = await connection.query('DESCRIBE orders');
        const hasCustomerId = columns.some(col => col.Field === 'customerId');
        
        if (!hasCustomerId) {
            // גיבוי הטבלה הישנה
            await connection.query('CREATE TABLE orders_backup LIKE orders');
            await connection.query('INSERT INTO orders_backup SELECT * FROM orders');
            
            // הוספת עמודת customerId
            await connection.query('ALTER TABLE orders ADD COLUMN customerId CHAR(36)');
            
            // עדכון ה-customerId לפי שם הלקוח
            await connection.query(`
                UPDATE orders o
                JOIN users u ON o.customerName = u.name
                SET o.customerId = u.id
            `);
            
            // הוספת מפתח זר
            await connection.query('ALTER TABLE orders ADD FOREIGN KEY (customerId) REFERENCES users(id)');
            
            // הסרת עמודות מיותרות
            await connection.query('ALTER TABLE orders DROP COLUMN customerName');
            await connection.query('ALTER TABLE orders DROP COLUMN phone');
            await connection.query('ALTER TABLE orders DROP COLUMN address');
            
            res.json({ message: 'טבלת הזמנות עודכנה בהצלחה' });
        } else {
            res.json({ message: 'טבלת הזמנות כבר מעודכנת' });
        }
    } catch (error) {
        console.error('Error updating orders table:', error);
        res.status(500).json({ error: error.message });
    }
});

// נקודת קצה לבדיקה מפורטת
app.get('/api/debug/check', async (req, res) => {
    try {
        // בדיקת מבנה טבלת הזמנות
        const [ordersStructure] = await connection.query('DESCRIBE orders');
        
        // בדיקת דוגמת הזמנה
        const [orders] = await connection.query('SELECT * FROM orders LIMIT 1');
        const sampleOrder = orders[0];
        
        // בדיקת פרטי המשתמש של ההזמנה
        let userDetails = null;
        if (sampleOrder && sampleOrder.customerId) {
            const [users] = await connection.query(
                'SELECT * FROM users WHERE id = ?',
                [sampleOrder.customerId]
            );
            userDetails = users[0];
        }
        
        // בדיקת פרטי המוצרים של ההזמנה
        let itemsDetails = null;
        if (sampleOrder && sampleOrder.items) {
            try {
                const itemIds = JSON.parse(sampleOrder.items);
                const [products] = await connection.query(
                    'SELECT * FROM products WHERE id IN (?)',
                    [itemIds]
                );
                itemsDetails = products;
            } catch (e) {
                itemsDetails = { error: e.message, items: sampleOrder.items };
            }
        }
        
        res.json({
            ordersStructure,
            sampleOrder,
            userDetails,
            itemsDetails,
            debug: {
                hasCustomerId: sampleOrder ? !!sampleOrder.customerId : false,
                itemsFormat: sampleOrder ? typeof sampleOrder.items : null,
                itemsParsed: sampleOrder ? (() => {
                    try {
                        return JSON.parse(sampleOrder.items);
                    } catch (e) {
                        return null;
                    }
                })() : null
            }
        });
    } catch (error) {
        console.error('Error checking data:', error);
        res.status(500).json({ error: error.message });
    }
});

// תיקון מבנה טבלת הזמנות
app.get('/api/setup/fix-orders', async (req, res) => {
    try {
        // בדיקת מבנה הטבלה הנוכחי
        const [ordersStructure] = await connection.query('DESCRIBE orders');
        console.log('Current orders table structure:', ordersStructure);

        // יצירת טבלת גיבוי
        await connection.query('CREATE TABLE IF NOT EXISTS orders_backup_fix LIKE orders');
        await connection.query('INSERT INTO orders_backup_fix SELECT * FROM orders');
        console.log('Created backup table');

        // בדיקה אם צריך להוסיף עמודות
        const hasCustomerId = ordersStructure.some(col => col.Field === 'customerId');
        const hasItems = ordersStructure.some(col => col.Field === 'items');
        const hasTotalAmount = ordersStructure.some(col => col.Field === 'totalAmount');
        const hasStatus = ordersStructure.some(col => col.Field === 'status');
        const hasOrderDate = ordersStructure.some(col => col.Field === 'orderDate');
        const hasNotes = ordersStructure.some(col => col.Field === 'notes');

        // מערך של פעולות שצריך לבצע
        const actions = [];

        if (!hasCustomerId) {
            actions.push("ALTER TABLE orders ADD COLUMN customerId CHAR(36) NOT NULL AFTER id");
        }
        if (!hasItems) {
            actions.push("ALTER TABLE orders ADD COLUMN items TEXT NOT NULL AFTER customerId");
        }
        if (!hasTotalAmount) {
            actions.push("ALTER TABLE orders ADD COLUMN totalAmount DECIMAL(10,2) NOT NULL AFTER items");
        }
        if (!hasStatus) {
            actions.push("ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'חדשה' AFTER totalAmount");
        }
        if (!hasOrderDate) {
            actions.push("ALTER TABLE orders ADD COLUMN orderDate DATETIME DEFAULT CURRENT_TIMESTAMP AFTER status");
        }
        if (!hasNotes) {
            actions.push("ALTER TABLE orders ADD COLUMN notes TEXT AFTER orderDate");
        }

        // ביצוע כל הפעולות הנדרשות
        for (const action of actions) {
            console.log('Executing:', action);
            await connection.query(action);
        }

        // הוספת מפתח זר אם לא קיים
        const [foreignKeys] = await connection.query('SHOW CREATE TABLE orders');
        if (!foreignKeys[0]['Create Table'].includes('FOREIGN KEY (`customerId`) REFERENCES `users`')) {
            try {
                await connection.query('ALTER TABLE orders ADD FOREIGN KEY (customerId) REFERENCES users(id)');
                console.log('Added foreign key constraint');
            } catch (e) {
                console.error('Error adding foreign key:', e);
            }
        }

        // בדיקת המבנה החדש
        const [newStructure] = await connection.query('DESCRIBE orders');
        
        res.json({
            message: 'טבלת ההזמנות תוקנה בהצלחה',
            originalStructure: ordersStructure,
            newStructure: newStructure,
            actionsPerformed: actions
        });
    } catch (error) {
        console.error('Error fixing orders table:', error);
        res.status(500).json({ error: error.message });
    }
});

// תיקון טבלת הזמנות
app.get('/api/setup/fix-orders-table', async (req, res) => {
    try {
        // יצירת גיבוי
        console.log('Creating backup...');
        await connection.query('CREATE TABLE IF NOT EXISTS orders_backup_fix2 LIKE orders');
        await connection.query('INSERT INTO orders_backup_fix2 SELECT * FROM orders');

        // בדיקת מבנה נוכחי
        console.log('Checking current structure...');
        const [currentStructure] = await connection.query('DESCRIBE orders');
        console.log('Current structure:', currentStructure);

        // יצירת טבלה חדשה
        console.log('Creating new table structure...');
        await connection.query(`
            CREATE TABLE orders_new (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customerId CHAR(36) NOT NULL,
                items TEXT NOT NULL,
                totalAmount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'חדשה',
                orderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (customerId) REFERENCES users(id)
            )
        `);

        // העתקת נתונים
        console.log('Copying data...');
        await connection.query(`
            INSERT INTO orders_new (id, customerId, items, totalAmount, status, orderDate, notes)
            SELECT id, customerId, items, totalAmount, status, orderDate, notes
            FROM orders
        `);

        // החלפת טבלאות
        console.log('Replacing tables...');
        await connection.query('DROP TABLE orders');
        await connection.query('RENAME TABLE orders_new TO orders');

        // בדיקת מבנה חדש
        console.log('Checking new structure...');
        const [newStructure] = await connection.query('DESCRIBE orders');
        
        // בדיקת נתונים
        console.log('Checking data...');
        const [orders] = await connection.query('SELECT * FROM orders LIMIT 5');
        const [invalidCustomers] = await connection.query(`
            SELECT o.* 
            FROM orders o 
            LEFT JOIN users u ON o.customerId = u.id 
            WHERE u.id IS NULL
        `);
        
        res.json({
            message: 'טבלת ההזמנות תוקנה בהצלחה',
            newStructure,
            sampleOrders: orders,
            invalidCustomers: invalidCustomers,
            status: {
                backupCreated: true,
                tableRecreated: true,
                dataCopied: true
            }
        });
    } catch (error) {
        console.error('Error fixing orders table:', error);
        res.status(500).json({ error: error.message });
    }
});

// עדכון מבנה טבלת הזמנות
app.get('/api/setup/repair-orders', async (req, res) => {
    try {
        // יצירת גיבוי
        console.log('Creating backup...');
        await connection.query('CREATE TABLE IF NOT EXISTS orders_backup_repair LIKE orders');
        await connection.query('INSERT INTO orders_backup_repair SELECT * FROM orders');

        // בדיקת מבנה נוכחי
        console.log('Checking current structure...');
        const [currentStructure] = await connection.query('DESCRIBE orders');
        console.log('Current structure:', currentStructure);

        // יצירת טבלה חדשה
        console.log('Creating new table...');
        await connection.query(`DROP TABLE IF EXISTS orders_new`);
        await connection.query(`
            CREATE TABLE orders_new (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customerId CHAR(36),
                items TEXT,
                totalAmount DECIMAL(10,2),
                status VARCHAR(50) DEFAULT 'חדשה',
                orderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        `);

        // העתקת נתונים
        console.log('Copying data...');
        const [orders] = await connection.query('SELECT * FROM orders');
        
        for (const order of orders) {
            // בדיקת customerId
            if (!order.customerId) {
                console.log(`Missing customerId for order ${order.id}`);
                continue;
            }

            // בדיקת קיום המשתמש
            const [user] = await connection.query('SELECT id FROM users WHERE id = ?', [order.customerId]);
            if (user.length === 0) {
                console.log(`User not found for order ${order.id} (customerId: ${order.customerId})`);
                continue;
            }

            // בדיקת תקינות items
            let itemsJson = '[]';
            try {
                if (order.items) {
                    const items = JSON.parse(order.items);
                    if (Array.isArray(items)) {
                        itemsJson = JSON.stringify(items);
                    }
                }
            } catch (e) {
                console.log(`Invalid items for order ${order.id}:`, e.message);
            }

            // הכנסת הנתונים לטבלה החדשה
            await connection.query(`
                INSERT INTO orders_new 
                (id, customerId, items, totalAmount, status, orderDate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                order.id,
                order.customerId,
                itemsJson,
                order.totalAmount || 0,
                order.status || 'חדשה',
                order.orderDate || new Date(),
                order.notes || ''
            ]);
        }

        // החלפת טבלאות
        console.log('Replacing tables...');
        await connection.query('DROP TABLE orders');
        await connection.query('RENAME TABLE orders_new TO orders');

        // הוספת מפתח זר
        console.log('Adding foreign key...');
        await connection.query('ALTER TABLE orders ADD FOREIGN KEY (customerId) REFERENCES users(id)');

        // בדיקת הנתונים החדשים
        const [newOrders] = await connection.query(`
            SELECT 
                o.*,
                u.name as customerName
            FROM orders o
            LEFT JOIN users u ON o.customerId = u.id
            LIMIT 5
        `);

        res.json({
            message: 'טבלת ההזמנות תוקנה בהצלחה',
            ordersCount: orders.length,
            sampleOrders: newOrders
        });
    } catch (error) {
        console.error('Error repairing orders table:', error);
        res.status(500).json({ error: error.message });
    }
});

// עדכון מבנה טבלת הזמנות
app.get('/api/setup/repair-orders', async (req, res) => {
    try {
        // יצירת גיבוי
        console.log('Creating backup...');
        await connection.query('CREATE TABLE IF NOT EXISTS orders_backup_repair LIKE orders');
        await connection.query('INSERT INTO orders_backup_repair SELECT * FROM orders');

        // בדיקת מבנה נוכחי
        console.log('Checking current structure...');
        const [currentStructure] = await connection.query('DESCRIBE orders');
        console.log('Current structure:', currentStructure);

        // יצירת טבלה חדשה
        console.log('Creating new table...');
        await connection.query(`DROP TABLE IF EXISTS orders_new`);
        await connection.query(`
            CREATE TABLE orders_new (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customerId CHAR(36),
                items TEXT,
                totalAmount DECIMAL(10,2),
                status VARCHAR(50) DEFAULT 'חדשה',
                orderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        `);

        // העתקת נתונים
        console.log('Copying data...');
        const [orders] = await connection.query('SELECT * FROM orders');
        
        for (const order of orders) {
            // בדיקת customerId
            if (!order.customerId) {
                console.log(`Missing customerId for order ${order.id}`);
                continue;
            }

            // בדיקת קיום המשתמש
            const [user] = await connection.query('SELECT id FROM users WHERE id = ?', [order.customerId]);
            if (user.length === 0) {
                console.log(`User not found for order ${order.id} (customerId: ${order.customerId})`);
                continue;
            }

            // בדיקת תקינות items
            let itemsJson = '[]';
            try {
                if (order.items) {
                    const items = JSON.parse(order.items);
                    if (Array.isArray(items)) {
                        itemsJson = JSON.stringify(items);
                    }
                }
            } catch (e) {
                console.log(`Invalid items for order ${order.id}:`, e.message);
            }

            // הכנסת הנתונים לטבלה החדשה
            await connection.query(`
                INSERT INTO orders_new 
                (id, customerId, items, totalAmount, status, orderDate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                order.id,
                order.customerId,
                itemsJson,
                order.totalAmount || 0,
                order.status || 'חדשה',
                order.orderDate || new Date(),
                order.notes || ''
            ]);
        }

        // החלפת טבלאות
        console.log('Replacing tables...');
        await connection.query('DROP TABLE orders');
        await connection.query('RENAME TABLE orders_new TO orders');

        // הוספת מפתח זר
        console.log('Adding foreign key...');
        await connection.query('ALTER TABLE orders ADD FOREIGN KEY (customerId) REFERENCES users(id)');

        // בדיקת הנתונים החדשים
        const [newOrders] = await connection.query(`
            SELECT 
                o.*,
                u.name as customerName
            FROM orders o
            LEFT JOIN users u ON o.customerId = u.id
            LIMIT 5
        `);

        res.json({
            message: 'טבלת ההזמנות תוקנה בהצלחה',
            ordersCount: orders.length,
            sampleOrders: newOrders
        });
    } catch (error) {
        console.error('Error repairing orders table:', error);
        res.status(500).json({ error: error.message });
    }
});

// נקודת קצה לקבלת רשימת מנהלים
app.get('/api/admins', async (req, res) => {
    try {
        const [results] = await connection.query('SELECT user_id FROM admins');
        res.json(results.map(row => row.user_id));
    } catch (err) {
        console.error('שגיאה בקבלת מנהלים:', err);
        res.status(500).json({ success: false, message: 'שגיאה בקבלת מנהלים' });
    }
});

// נקודת קצה לעדכון רשימת מנהלים
app.post('/api/admins', async (req, res) => {
    try {
        const { adminIds } = req.body;
        
        // מחיקת כל המנהלים הקיימים
        await connection.query('DELETE FROM admins');
        
        // אם אין מנהלים חדשים להוסיף
        if (!adminIds || adminIds.length === 0) {
            return res.json({ success: true });
        }
        
        // הוספת המנהלים החדשים
        const values = adminIds.map(id => [id]);
        await connection.query('INSERT INTO admins (user_id) VALUES ?', [values]);
        res.json({ success: true });
    } catch (err) {
        console.error('שגיאה בעדכון מנהלים:', err);
        res.status(500).json({ success: false, message: 'שגיאה בעדכון מנהלים' });
    }
});

// קבלת משתמש ספציפי לפי ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Looking for user with ID:', id);
        
        const [users] = await connection.query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        
        if (users.length === 0) {
            console.log('User not found:', id);
            return res.status(404).json({ error: 'משתמש לא נמצא' });
        }
        
        console.log('Found user:', users[0]);
        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'שגיאה בטעינת פרטי משתמש' });
    }
});

// בדיקה אם הפורט תפוס
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying port ${port + 1}`);
        app.listen(port + 1);
    } else {
        console.error('Server error:', err);
    }
});



