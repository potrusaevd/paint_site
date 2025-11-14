// backend/db.js - вариант для SQL Authentication
const sql = require('mssql');
const config = {
    server: 'localhost\\SQLEXPRESS', 
    

    user: 'sa',
    password: 'doman12get', 

    database: 'Lime Ditails',

    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    
    driver: 'tedious' 
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Успешное подключение к MSSQL через Windows Authentication');
        return pool;
    })
    .catch(err => console.error('Ошибка подключения к базе данных! Проверьте конфигурацию: ', err));

module.exports = {
    sql, poolPromise
};