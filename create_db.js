const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 使用 path.resolve 来确保正确的数据库路径
const dbPath = path.resolve(__dirname, 'db', 'product_records.db');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('无法连接到数据库:', err.message);
    return;
  }
  console.log('成功连接到数据库');
});

// 创建表格
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS product_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      signature TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('创建表格失败:', err.message);
    } else {
      console.log('表格已创建或已存在');
    }
  });
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    console.error('关闭数据库失败:', err.message);
  } else {
    console.log('数据库连接已关闭');
  }
});
