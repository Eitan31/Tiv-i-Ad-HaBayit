const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid'); // הוספת חבילה ליצירת מזהים ייחודיים
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// הגדרת חיבור לבסיס הנתונים
const connection = mysql.createPool({
  host: 'Eitan',
  user: 'Eitan',
  password: 'Eitan3187',
  database: 'mystore',
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
app.use('/images', express.static(path.join(__dirname, '../../assets')));

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
  const location = encodeURIComponent(`${address} ${city}`);
  const maps = `https://goo.gl/maps?q=${location}`;
  const waze = `https://waz.li/${location}`;

  // טיפול ב-notes ו-admin_notes
  let processedNotes = Array.isArray(notes) ? JSON.stringify(notes) : JSON.stringify([]);
  let processedAdminNotes = Array.isArray(admin_notes) ? JSON.stringify(admin_notes) : JSON.stringify([]);

  console.log('Processing notes:', { notes, admin_notes, processedNotes, processedAdminNotes }); // לוג לבדיקה

  try {
    await connection.execute(
      `INSERT INTO users (id, name, phone, address, city, position, notes, admin_notes, cart, purchases, password, maps, waze, joinDate, code, debt_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        id, name, phone, address, city, position || 0, 
        processedNotes,
        processedAdminNotes,
        JSON.stringify(cart || []), 
        JSON.stringify(purchases || []),
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
    const { id } = req.params;
    try {
        // בדיקה שהמשתמש קיים
        const [existingUser] = await connection.execute(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (existingUser.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { name, phone, address, city, position, notes, admin_notes, password, code, debt_balance } = req.body;

        // יצירת כתובות מפות בפורמט מקוצר
        const maps = `https://maps.google.com/?q=${encodeURIComponent(address + ' ' + city)}`;
        const waze = `https://waze.com/ul?q=${encodeURIComponent(address + ' ' + city)}&navigate=yes`;

        // טיפול ב-notes ו-admin_notes
        let processedNotes = notes;
        if (Array.isArray(notes)) {
            processedNotes = JSON.stringify(notes);
        } else if (typeof notes === 'string') {
            try {
                // בדיקה אם זו מחרוזת JSON תקינה
                JSON.parse(notes);
                processedNotes = notes;
            } catch (e) {
                processedNotes = '[]';
            }
        } else {
            processedNotes = '[]';
        }

        let processedAdminNotes = admin_notes;
        if (Array.isArray(admin_notes)) {
            processedAdminNotes = JSON.stringify(admin_notes);
        } else if (typeof admin_notes === 'string') {
            try {
                // בדיקה אם זו מחרוזת JSON תקינה
                JSON.parse(admin_notes);
                processedAdminNotes = admin_notes;
            } catch (e) {
                processedAdminNotes = '[]';
            }
        } else {
            processedAdminNotes = '[]';
        }

        // עדכון המשתמש
        await connection.execute(
            `UPDATE users 
             SET name = ?, 
                 phone = ?, 
                 address = ?, 
                 city = ?, 
                 position = ?, 
                 notes = ?, 
                 admin_notes = ?,
                 password = ?, 
                 maps = ?, 
                 waze = ?, 
                 code = ?, 
                 debt_balance = ?
             WHERE id = ?`,
            [
                name, 
                phone, 
                address, 
                city, 
                position || 0, 
                processedNotes,
                processedAdminNotes, 
                password || phone, 
                maps, 
                waze, 
                code || '', 
                debt_balance || 0, 
                id
            ]
        );

        // קבלת המשתמש המעודכן
        const [updatedUser] = await connection.execute(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        res.json(updatedUser[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            error: 'Error updating user',
            details: error.message,
            stack: error.stack 
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
  res.sendFile(path.join(__dirname, '../../index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

app.get('/cart.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../cart.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin.html'));
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
        // בדיקה אם הטבלה קיימת
        const [tables] = await connection.query('SHOW TABLES LIKE "orders"');
        if (tables.length === 0) {
            // אם הטבלה לא קיימת, ניצור אותה
            await connection.query(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customerName VARCHAR(255) NOT NULL,
                    items TEXT NOT NULL,
                    totalAmount DECIMAL(10,2) NOT NULL,
                    status VARCHAR(50) DEFAULT 'חדשה',
                    orderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                    phone VARCHAR(20),
                    address VARCHAR(255),
                    notes TEXT
                )
            `);
            // נחזיר מערך ריק אם הטבלה נוצרה עכשיו
            return res.json([]);
        }

        const [orders] = await connection.query('SELECT * FROM orders');
        const formattedOrders = orders.map(order => ({
            ...order,
            items: JSON.parse(order.items || '[]')
        }));
        res.json(formattedOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: error.stack 
        });
    }
});

// הוספת הזמנה חדשה
app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, items, totalAmount, status = 'חדשה', phone, address, notes } = req.body;
        const [result] = await connection.query(
            'INSERT INTO orders (customerName, items, totalAmount, status, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [customerName, JSON.stringify(items), totalAmount, status, phone || null, address || null, notes || null]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error adding order:', error);
        res.status(500).json({ error: 'Internal server error' });
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
        const { id } = req.params;
        const { customerName, items, totalAmount, status } = req.body;
        await connection.query(
            'UPDATE orders SET customerName=?, items=?, totalAmount=?, status=? WHERE id=?',
            [customerName, JSON.stringify(items), totalAmount, status, id]
        );
        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Internal server error' });
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

// קבלת משתמש ספציפי לפי ID
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// נתיב לבדיקת משתמש קיים
app.post('/api/users/check', async (req, res) => {
    const { name, phone } = req.body;
    
    try {
        const [users] = await connection.query(
            'SELECT * FROM users WHERE name = ? OR phone = ?',
            [name, phone]
        );
        
        res.json(users.length > 0);
    } catch (error) {
        console.error('Error checking user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// נתיב להתחברות
app.post('/api/users/login', async (req, res) => {
    const { identifier, password } = req.body;
    
    try {
        // הדפסת הפרמטרים שהתקבלו
        console.log('Login attempt:', { identifier, password });

        const [users] = await connection.query(
            'SELECT * FROM users WHERE (name = ? OR phone = ?) AND password = ?',
            [identifier, identifier, password]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'שם משתמש או סיסמה שגויים' 
            });
        }
        
        const user = users[0];
        console.log('Found user:', user); // לוג של המשתמש שנמצא

        // המרת הערות מ-JSON למערך אם צריך
        let userNotes = user.notes;
        try {
            if (typeof user.notes === 'string') {
                userNotes = JSON.parse(user.notes);
            }
        } catch (e) {
            console.log('Error parsing notes:', e);
            userNotes = user.notes || '';
        }

        res.json({ 
            success: true, 
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                city: user.city,
                address: user.address,
                position: user.position,
                notes: userNotes,
                joinDate: user.joinDate,
                debt: user.debt_balance || 0
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'שגיאה בהתחברות' 
        });
    }
});

// קבלת משתמש ספציפי לפי ID
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user' });
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

// הפעלת השרת
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
