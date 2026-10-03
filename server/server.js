import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import pool from './db.js';
import { authenticate, allowRoles, asyncRoute } from './middleware.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }));

const roles = ['Admin', 'Store Officer', 'Unit Commander', 'Viewer'];
const validId = value => Number.isInteger(Number(value)) && Number(value) > 0;
const positiveInt = value => Number.isInteger(Number(value)) && Number(value) > 0;
const logAction = async (conn, userId, action, type, id, details='') =>
  conn.execute('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
    [userId, action, type, id || null, String(details).slice(0, 255)]);

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'GuardianCore demo' }));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const [rows] = await pool.execute(
    'SELECT id, name, email, password_hash, role, active FROM users WHERE email=? LIMIT 1', [email]);
  const user = rows[0];
  if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

app.get('/api/dashboard', authenticate, asyncRoute(async (req, res) => {
  const [[summary]] = await pool.query(`
    SELECT COUNT(*) totalItems, COALESCE(SUM(quantity),0) totalUnits,
    SUM(quantity <= min_stock) lowStock,
    SUM(condition_status='Under Maintenance') underMaintenance,
    SUM(condition_status='Damaged') damaged
    FROM inventory`);
  const [categories] = await pool.query(`
    SELECT category, COUNT(*) itemCount, COALESCE(SUM(quantity),0) units
    FROM inventory GROUP BY category ORDER BY category`);
  const [recent] = await pool.query(`
    SELECT t.id, i.name itemName, t.transaction_type type, t.quantity, t.note, t.created_at createdAt
    FROM transactions t JOIN inventory i ON i.id=t.item_id
    ORDER BY t.id DESC LIMIT 8`);
  res.json({ summary, categories, recent });
}));

app.get('/api/inventory', authenticate, asyncRoute(async (req, res) => {
  const q = `%${String(req.query.q || '').slice(0, 100)}%`;
  const [rows] = await pool.execute(
    `SELECT * FROM inventory WHERE name LIKE ? OR category LIKE ? ORDER BY name`, [q, q]);
  res.json(rows);
}));

app.post('/api/inventory', authenticate, allowRoles('Admin','Store Officer'), asyncRoute(async (req, res) => {
  const { name, category, quantity=0, min_stock=5, unit='units', condition_status='Available', location_label='Demo Store A' } = req.body;
  if (!String(name || '').trim() || !String(category || '').trim() ||
      !Number.isInteger(Number(quantity)) || Number(quantity)<0 ||
      !Number.isInteger(Number(min_stock)) || Number(min_stock)<0) {
    return res.status(400).json({ error: 'Enter a name, category, and valid non-negative quantities.' });
  }
  const [result] = await pool.execute(
    `INSERT INTO inventory (name,category,quantity,min_stock,unit,condition_status,location_label)
    VALUES (?,?,?,?,?,?,?)`,
    [String(name).trim(), String(category).trim(), Number(quantity), Number(min_stock),
    String(unit || 'units').slice(0,40), condition_status, String(location_label || 'Demo Store A').slice(0,120)]);
  await logAction(pool, req.user.id, 'CREATE', 'inventory', result.insertId, name);
  res.status(201).json({ id: result.insertId, message: 'Inventory item created.' });
}));

app.put('/api/inventory/:id', authenticate, allowRoles('Admin','Store Officer'), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const { name, category, min_stock, unit, condition_status, location_label } = req.body;
  if (!validId(id) || !String(name || '').trim() || !String(category || '').trim() ||
      !Number.isInteger(Number(min_stock)) || Number(min_stock)<0) {
    return res.status(400).json({ error: 'Invalid item details.' });
  }
  const [result] = await pool.execute(
    `UPDATE inventory SET name=?,category=?,min_stock=?,unit=?,condition_status=?,location_label=?
    WHERE id=?`,
    [String(name).trim(), String(category).trim(), Number(min_stock), String(unit || 'units'),
    condition_status, String(location_label || 'Demo Store A'), id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Item not found.' });
  await logAction(pool, req.user.id, 'UPDATE', 'inventory', id, name);
  res.json({ message: 'Inventory item updated.' });
}));

app.delete('/api/inventory/:id', authenticate, allowRoles('Admin'), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!validId(id)) return res.status(400).json({ error: 'Invalid item ID.' });
  try {
    const [result] = await pool.execute('DELETE FROM inventory WHERE id=?', [id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Item not found.' });
    await logAction(pool, req.user.id, 'DELETE', 'inventory', id);
    res.json({ message: 'Inventory item deleted.' });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Item has linked records and cannot be deleted.' });
    throw e;
  }
}));

app.post('/api/inventory/:id/stock', authenticate, allowRoles('Admin','Store Officer'), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const { type, quantity, note='' } = req.body;
  if (!validId(id) || !['Received','Issued'].includes(type) || !positiveInt(quantity)) {
    return res.status(400).json({ error: 'Choose Received or Issued and enter a positive quantity.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT quantity FROM inventory WHERE id=? FOR UPDATE', [id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: 'Item not found.' }); }
    const oldQty = rows[0].quantity;
    if (type === 'Issued' && Number(quantity) > oldQty) {
      await conn.rollback(); return res.status(400).json({ error: 'Insufficient stock.' });
    }
    const newQty = type === 'Received' ? oldQty + Number(quantity) : oldQty - Number(quantity);
    await conn.execute('UPDATE inventory SET quantity=? WHERE id=?', [newQty, id]);
    await conn.execute(
      'INSERT INTO transactions (item_id,user_id,transaction_type,quantity,note) VALUES (?,?,?,?,?)',
      [id, req.user.id, type, Number(quantity), String(note).slice(0,255)]);
    await conn.execute(
      'INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)',
      [req.user.id, type.toUpperCase(), 'inventory', id, `Quantity ${quantity}`]);
    await conn.commit();
    res.json({ message: `Stock ${type.toLowerCase()} successfully.`, quantity: newQty });
  } catch (e) {
    await conn.rollback(); throw e;
  } finally { conn.release(); }
}));

app.get('/api/transactions', authenticate, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT t.id, i.name itemName, u.name userName, t.transaction_type type,
    t.quantity, t.note, t.created_at createdAt
    FROM transactions t JOIN inventory i ON i.id=t.item_id
    LEFT JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 200`);
  res.json(rows);
}));

app.get('/api/suppliers', authenticate, asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM suppliers ORDER BY name');
  res.json(rows);
}));
app.post('/api/suppliers', authenticate, allowRoles('Admin','Store Officer'), asyncRoute(async (req, res) => {
  const { name, contact='', email='', address='' } = req.body;
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Supplier name is required.' });
  const [r] = await pool.execute('INSERT INTO suppliers (name,contact,email,address) VALUES (?,?,?,?)',
    [String(name).trim(), String(contact).slice(0,100), String(email).slice(0,190), String(address).slice(0,255)]);
  res.status(201).json({ id: r.insertId, message: 'Supplier added.' });
}));

app.get('/api/allocations', authenticate, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT a.*, i.name item_name FROM allocations a JOIN inventory i ON i.id=a.item_id ORDER BY a.id DESC`);
  res.json(rows);
}));
app.post('/api/allocations', authenticate, allowRoles('Admin','Unit Commander','Store Officer'), asyncRoute(async (req, res) => {
  const { item_id, unit_label, quantity, allocation_date, note='' } = req.body;
  if (!validId(item_id) || !String(unit_label || '').trim() || !positiveInt(quantity) || !allocation_date)
    return res.status(400).json({ error: 'Complete all required allocation fields.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [items] = await conn.execute('SELECT quantity FROM inventory WHERE id=? FOR UPDATE', [Number(item_id)]);
    if (!items.length || Number(quantity)>items[0].quantity) {
      await conn.rollback(); return res.status(400).json({ error: 'Item not found or insufficient stock.' });
    }
    await conn.execute('UPDATE inventory SET quantity=quantity-? WHERE id=?', [Number(quantity), Number(item_id)]);
    await conn.execute('INSERT INTO allocations (item_id,unit_label,quantity,allocation_date,note) VALUES (?,?,?,?,?)',
      [Number(item_id), String(unit_label).slice(0,120), Number(quantity), allocation_date, String(note).slice(0,255)]);
    await conn.execute('INSERT INTO transactions (item_id,user_id,transaction_type,quantity,note) VALUES (?,?,?,?,?)',
      [Number(item_id), req.user.id, 'Issued', Number(quantity), `Allocation: ${unit_label}`]);
    await conn.commit();
    res.status(201).json({ message: 'Allocation recorded and stock reduced.' });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}));

app.get('/api/maintenance', authenticate, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT m.*, i.name item_name FROM maintenance m JOIN inventory i ON i.id=m.item_id ORDER BY m.id DESC`);
  res.json(rows);
}));
app.post('/api/maintenance', authenticate, allowRoles('Admin','Store Officer'), asyncRoute(async (req, res) => {
  const { item_id, maintenance_type, due_date=null, status='Scheduled', note='' } = req.body;
  if (!validId(item_id) || !String(maintenance_type || '').trim())
    return res.status(400).json({ error: 'Select an item and enter maintenance type.' });
  await pool.execute('INSERT INTO maintenance (item_id,maintenance_type,due_date,status,note) VALUES (?,?,?,?,?)',
    [Number(item_id), String(maintenance_type).slice(0,120), due_date || null, status, String(note).slice(0,255)]);
  res.status(201).json({ message: 'Maintenance record added.' });
}));

app.get('/api/reports/inventory.csv', authenticate, asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT id,name,category,quantity,min_stock,unit,condition_status,location_label FROM inventory ORDER BY name');
  const fields = ['id','name','category','quantity','min_stock','unit','condition_status','location_label'];
  const csvCell = v => `"${String(v ?? '').replaceAll('"','""')}"`;
  const csv = [fields.join(','), ...rows.map(row => fields.map(f => csvCell(row[f])).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
  res.send(csv);
}));

app.get('/api/audit', authenticate, allowRoles('Admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT a.*, u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 200`);
  res.json(rows);
}));

app.use((req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error. Check backend logs and database configuration.' });
});

const port = Number(process.env.PORT || 5001);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('replace_with')) {
  console.error('Set a unique JWT_SECRET in server/.env before starting.');
  process.exit(1);
}
app.listen(port, () => console.log(`GuardianCore API listening on port ${port}`));
