// Importar dependencias
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Crear una instancia de Express
const app = express();
const port = 3000;

// Middleware para manejar JSON en el cuerpo de las solicitudes
app.use(express.json());
app.use(cors());

// Crear una conexión con la base de datos MySQL
const db = mysql.createConnection({
    host: 'localhost',  // Dirección del servidor MySQL
    user: 'root',       // Tu usuario de MySQL
    password: 'root',   // Tu contraseña de MySQL
    database: 'PizzeriaDB'
});

// Conectar con la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error de conexión a MySQL:', err);
    } else {
        console.log('Conexión exitosa a la base de datos');
    }
});

// Ruta POST para registrar un nuevo usuario
app.post('/registro', (req, res) => {
    const { nombre, email, telefono, direccion, usuario, contraseña } = req.body;

    // Validación de campos
    if (!nombre || !email || !usuario || !contraseña) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Hashear la contraseña
    bcrypt.hash(contraseña, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error al hashear la contraseña:', err);
            return res.status(500).json({ error: 'Error al procesar la contraseña' });
        }

        // Insertar el nuevo usuario en la base de datos
        const sql = 'INSERT INTO Clientes (nombre, email, telefono, direccion, usuario, contraseña) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [nombre, email, telefono, direccion, usuario, hashedPassword], (err, result) => {
            if (err) {
                console.error('Error al registrar el cliente:', err);
                return res.status(500).json({ error: 'Error al registrar el cliente' });
            }

            res.status(201).json({ id_cliente: result.insertId, mensaje: 'Usuario registrado con éxito' });
        });
    });
});

// Ruta POST para iniciar sesión
app.post('/login', (req, res) => {
    const { usuario, contraseña } = req.body;

    // Validación de campos
    if (!usuario || !contraseña) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Buscar el usuario en la base de datos
    const sql = 'SELECT * FROM Clientes WHERE usuario = ?';
    db.query(sql, [usuario], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).json({ error: 'Error al buscar el usuario' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Comparar la contraseña ingresada con la contraseña almacenada (hasheada)
        bcrypt.compare(contraseña, results[0].contraseña, (err, isMatch) => {
            if (err) {
                console.error('Error al comparar contraseñas:', err);
                return res.status(500).json({ error: 'Error al verificar la contraseña' });
            }

            if (!isMatch) {
                return res.status(401).json({ error: 'Contraseña incorrecta' });
            }

            // Si las contraseñas coinciden
            res.status(200).json({ mensaje: 'Inicio de sesión exitoso', id_cliente: results[0].id_cliente });
        });
    });
});

// Obtener todos los clientes
app.get('/pizzas', (req, res) => {
    const sql = 'SELECT * FROM Pizzas';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener los clientes:', err);
            res.status(500).json({ error: 'Error al obtener los clientes' });
        } else {
            res.json(results);
        }
    });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor API corriendo en http://localhost:${port}`);
});
