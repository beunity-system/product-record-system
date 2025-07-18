// 引入模块
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3020;

// 中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 数据库连接
const db = new sqlite3.Database('./product_records.db', (err) => {
  if (err) {
    console.error('无法连接到数据库:', err.message);
  } else {
    console.log('成功连接到数据库');
  }
});

// 初始化表结构
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

// 首页表单页面，绑定 '/'
app.get('/', (req, res) => {
  res.redirect('/records');
});`
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <style>
          body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f4f4f4;
          }

          .form-container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            width: 500px;
          }
          h1 {
            text-align: center;
          }
          label {
            display: block;
            margin-top: 10px;
          }
          input, canvas {
            width: 100%;
            padding: 8px;
            margin-top: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          canvas {
            cursor: crosshair;
            touch-action: none;
            display: block;
            margin: 10px 0;
          }
          .btn {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            margin-top: 10px;
            border-radius: 4px;
            cursor: pointer;
          }
          .btn-clear {
            background-color: #f44336;
            margin-left: 10px;
          }
        </style>
      </head>
      <body>
        <div class="form-container">
          <h1>Product Record Form</h1>
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
            return {
              x: clientX - rect.left,
              y: clientY - rect.top
            };
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

          function stopDrawing() {
            isDrawing = false;
          }

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
app.post('/submit', (req, res) => {
  const { name, product_name, quantity, signature, date } = req.body;
  const query = `
    INSERT INTO product_records (name, date, product_name, quantity, signature)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [name, date, product_name, quantity, signature], function(err) {
    if (err) {
      return res.status(500).send('Error saving record: ' + err.message);
    }

    res.send(`
      <h1>Record Saved!</h1>
      <p><a href="/">Back to Form</a> | <a href="/records">View Records</a></p>
    `);
  });
});

// 查看所有记录页面
app.get('/records', (req, res) => {
  db.all('SELECT * FROM product_records', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Error loading records.');
    }

    let html = '<h1>All Records</h1><table border="1" cellpadding="8"><tr><th>ID</th><th>Name</th><th>Product</th><th>Qty</th><th>Date</th><th>Signature</th><th>Action</th></tr>';
    rows.forEach(row => {
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
  });
});

// 删除记录
app.get('/delete/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM product_records WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).send('Error deleting record: ' + err.message);
    }
    res.redirect('/records');
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
