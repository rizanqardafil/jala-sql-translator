import mysql, { MysqlError, RowDataPacket } from 'mysql';

const db = mysql.createConnection({
  host: 'localhost', 
  user: 'root', 
  password: '', 
  database: 'chatgpt', 
});

export default db;
