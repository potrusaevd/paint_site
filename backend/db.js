// backend/db.js - вариант для SQL Authentication
const sql = require('mssql');
const config = {
    user: 'sa',
    password: 'doman12get',
    server: '91.190.73.253', // например 95.128.45.67
    database: 'Lime Ditails',
    options: {
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
