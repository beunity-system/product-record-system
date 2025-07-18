const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = process.env.PORT || 3020;

// 密码设置
const PASSWORD = 'BEU678';

// 中间件配置
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 使用 express-session
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000  // 30分钟自动过期
  }
}));

// SQLite 数据库
const db = new sqlite3.Database('./product_records.db', (err) => {
  if (err) console.error('无法连接到数据库:', err.message);
  else console.log('成功连接到数据库');
});

db.run(`
  CREATE TABLE IF NOT EXISTS product_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    product_name TEXT,
    quantity INTEGER,
    date TEXT,
    signature TEXT
  )
`);

// 登录页
app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login" style="margin:100px auto;width:300px;">
      <h2>Login</h2>
      <input type="password" name="password" placeholder="Enter password" required style="width:100%;padding:8px;">
      <button type="submit" style="margin-top:10px;padding:8px;width:100%;">Login</button>
    </form>
  `);
});

// 登录处理
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.send('<p>Wrong password. <a href="/login">Try again</a></p>');
  }
});

// 登出
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// 认证中间件
function requireLogin(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

// 表单页（带签名）
app.get('/', requireLogin, (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    body { font-family: Arial; margin: 0; padding: 20px; background: #f4f4f4; }
    .form-container {
      background: #fff; padding: 20px; border-radius: 8px;
      max-width: 500px; margin: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    label { display: block; margin-top: 10px; }
    input, canvas {
      width: 100%; padding: 8px; margin-top: 5px;
      border: 1px solid #ccc; border-radius: 4px;
    }
    canvas { cursor: crosshair; margin: 10px 0; touch-action: none; }
    .btn { padding: 10px; margin-top: 10px; border: none; border-radius: 4px; }
    .btn-submit { background: #4CAF50; color: white; }
    .btn-clear { background: #f44336; color: white; margin-left: 10px; }
  </style>
</head>
<body>
  <div class="form-container">
    <h1>Product Record</h1>
    <form method="POST" action="/submit">
      <label>Name:</label><input type="text" name="name" required>
      <label>Product Name:</label><input type="text" name="product_name" required>
      <label>Quantity:</label><input type="number" name="quantity" required>
      <label>Date:</label><input type="date" name="date" required>
      <label>Signature:</label>
      <canvas id="signatureCanvas" width="400" height="100"></canvas>
      <input type="hidden" name="signature" id="signatureData">
      <button class="btn btn-submit" type="submit">Submit</button>
      <button class="btn btn-clear" type="button" id="clearSignature">Clear</button>
    </form>
    <br>
    <a href="/records">View Records</a> |
    <a href="/logout" style="color:red;">Logout</a>
  </div>

  <script>
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    function fixCanvas() {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = 400 * ratio;
      canvas.height = 100 * ratio;
      canvas.style.width = "400px";
      canvas.style.height = "100px";
      ctx.scale(ratio, ratio);
    }
    fixCanvas();

    function getXY(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    canvas.addEventListener('mousedown', e => {
      isDrawing = true;
      const { x, y } = getXY(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
    canvas.addEventListener('mousemove', e => {
      if (!isDrawing) return;
      const { x, y } = getXY(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    });
    ['mouseup', 'mouseout'].forEach(evt =>
      canvas.addEventListener(evt, () => (isDrawing = false))
    );

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      isDrawing = true;
      const { x, y } = getXY(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!isDrawing) return;
      const { x, y } = getXY(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    }, { passive: false });
    ['touchend', 'touchcancel'].forEach(evt =>
      canvas.addEventListener(evt, () => (isDrawing = false))
    );

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

// 提交记录
app.post('/submit', (req, res) => {
  const { name, product_name, quantity, signature, date } = req.body;
  const query = `INSERT INTO product_records (name, date, product_name, quantity, signature) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [name, date, product_name, quantity, signature], function (err) {
    if (err) return res.status(500).send('Error saving record: ' + err.message);
    res.send(`<h1>Record Saved!</h1><p><a href="/">Back</a> | <a href="/records">View Records</a></p>`);
  });
});

// 查看记录
app.get('/records', requireLogin, (req, res) => {
  db.all('SELECT * FROM product_records', [], (err, rows) => {
    if (err) return res.status(500).send('Error loading records.');
    let html = '<h1>All Records</h1><table border="1" cellpadding="8" style="border-collapse:collapse;"><tr><th>ID</th><th>Name</th><th>Product</th><th>Qty</th><th>Date</th><th>Signature</th><th>Action</th></tr>';
    rows.forEach(row => {
      html += `<tr>
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.product_name}</td>
        <td>${row.quantity}</td>
        <td>${row.date}</td>
        <td><img src="${row.signature}" width="150"/></td>
        <td><a href="/delete/${row.id}" style="color:red;">Delete</a></td>
      </tr>`;
    });
    html += '</table><br><a href="/">Back</a> | <a href="/logout" style="color:red;">Logout</a>';
    res.send(html);
  });
});

// 删除记录
app.get('/delete/:id', requireLogin, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM product_records WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).send('Error deleting record.');
    res.redirect('/records');
  });
});

// 启动服务
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
