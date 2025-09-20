const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const { Pool } = require('pg');  // ✅ 改用 PostgreSQL
const app = express(); 
app.use(express.static('public'));
const port = 3020;

// 简单密码
const PASSWORD = process.env.FORM_PASSWORD;

// Basic Auth 中间件
function checkPassword(req, res, next) {
  const auth = req.headers['authorization'];

  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Enter password"');
    return res.status(401).send('Authentication required.');
  }

  const base64Credentials = auth.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (password === PASSWORD) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Enter password"');
    return res.status(401).send('Authentication failed.');
  }
}

// 中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ PostgreSQL 连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ 初始化表结构
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_records (
        id SERIAL PRIMARY KEY,
        name TEXT,
        product_name TEXT,
        quantity INTEGER,
        date TEXT,
        signature TEXT
      )
    `);
    console.log('成功连接并初始化数据库');
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
  }
})();

// 首页表单页面（保持不变）
app.get('/', checkPassword, (req, res) => {
  res.send(`...原本表单HTML代码保留...`);
});

// 提交表单
app.post('/submit', async (req, res) => {
  const { name, product_name, quantity, signature, date } = req.body;
  const query = `
    INSERT INTO product_records (name, date, product_name, quantity, signature)
    VALUES ($1, $2, $3, $4, $5)
  `;
  try {
    await pool.query(query, [name, date, product_name, quantity, signature]);
    res.send(`
      <h1>Record Saved!</h1>
      <p><a href="/">Back to Form</a> | <a href="/records">View Records</a></p>
    `);
  } catch (err) {
    res.status(500).send('Error saving record: ' + err.message);
  }
});

// 查看所有记录
app.get('/records', checkPassword, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM product_records ORDER BY id DESC');
    let html = '<h1>All Records</h1><table border="1" cellpadding="8" style="border-collapse: collapse;"><tr><th>ID</th><th>Name</th><th>Product</th><th>Qty</th><th>Date</th><th>Signature</th><th>Action</th></tr>';
    result.rows.forEach(row => {
      html += `<tr>
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.product_name}</td>
        <td>${row.quantity}</td>
        <td>${row.date}</td>
        <td><img src="${row.signature}" width="150" /></td>
        <td><a href="/delete/${row.id}" style="color:red;">Delete</a></td>
      </tr>`;
    });
    html += '</table><br><a href="/">Back to Form</a>';
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading records: ' + err.message);
  }
});

// 删除记录
app.get('/delete/:id', checkPassword, async (req, res) => {
  try {
    await pool.query('DELETE FROM product_records WHERE id = $1', [req.params.id]);
    res.redirect('/records');
  } catch (err) {
    res.status(500).send('Error deleting record: ' + err.message);
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
