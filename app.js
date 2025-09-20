const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const { Pool } = require('pg');  // 改用 PostgreSQL
const app = express();
app.use(express.static('public'));
const port = process.env.PORT || 3020;

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

// 首页表单页面
app.get('/', checkPassword, (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>
      body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f4f4f4; overflow-y: auto; }
      .form-container { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); width: 500px; max-width: 95vw; max-height: 95vh; overflow-y: auto; }
      h1 { text-align: center; }
      label { display: block; margin-top: 10px; }
      input, canvas { width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; }
      canvas { cursor: crosshair; touch-action: none; display: block; margin: 10px 0; }
      .btn { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; margin-top: 10px; border-radius: 4px; cursor: pointer; }
      .btn-clear { background-color: #f44336; margin-left: 10px; }
    </style>
  </head>
  <body>
    <div class="form-container">
      <div style="display: flex; align-items: center; gap: 10px; justify-content: center; margin-bottom: 20px;">
        <h1 style="margin: 0;">Beunity Product Record</h1>
      </div>
      <form method="POST" action="/submit">
        <label for="name">Name:</label>
        <input type="text" name="name" required>

        <label for="product_name">Product Name:</label>
        <input type="text" name="product_name" required>

        <label for="quantity">Quantity:</label>
        <input type="number" name="quantity" required>

        <label for="date">Date:</label>
        <input type="date" name="date" required>

        <label for="signature">Signature:</label>
        <canvas id="signatureCanvas" width="400" height="100"></canvas>
        <input type="hidden" name="signature" id="signatureData">

        <button type="submit" class="btn">Submit</button>
        <button type="button" class="btn btn-clear" id="clearSignature">Clear</button>
      </form>
    </div>
    <script>
      const canvas = document.getElementById('signatureCanvas');
      const ctx = canvas.getContext('2d');
      let isDrawing = false;

      function fixCanvas() {
        const ratio = window.devicePixelRatio || 1;
        const width = 400;
        const height = 100;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
      }
      fixCanvas();

      function getXY(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
      }

      function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getXY(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
      }

      function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getXY(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      function stopDrawing() { isDrawing = false; }

      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseout', stopDrawing);

      canvas.addEventListener('touchstart', startDrawing, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDrawing);
      canvas.addEventListener('touchcancel', stopDrawing);

      document.getElementById('clearSignature').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('signatureData').value = '';
      });

      document.querySelector('form').addEventListener('submit', () => {
        document.getElementById('signatureData').value = canvas.toDataURL();
      });
    </script>
  </body>
  </html>
  `);
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
