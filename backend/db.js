// backend/db.js - вариант для SQL Authentication
const sql = require('mssql');
const config = {
    user: 'sa',
    password: 'doman12get',
    server: '46.72.143.250',
    port: 1433,
    database: 'Lime Ditails',
    options: {
        encrypt: false, // или true если SSL
        trustServerCertificate: true
    }
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


