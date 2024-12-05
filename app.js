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
    password: 'Admin@123',   // Tu contraseña de MySQL
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

// Ruta para agregar una pizza al carrito
app.post('/carrito/pizza', (req, res) => {
    const { id_cliente, id_pizza, cantidad } = req.body;

    // Primero verificamos si el cliente ya tiene un carrito
    const queryCarrito = 'SELECT * FROM CarritoCompras WHERE id_cliente = ? AND total = 0';
    db.query(queryCarrito, [id_cliente], (err, carrito) => {
        if (err) {
            console.error('Error al verificar el carrito:', err);
            return res.status(500).json({ error: 'Error al verificar el carrito' });
        }

        if (carrito.length === 0) {
            return res.status(400).json({ error: 'El cliente no tiene un carrito activo' });
        }

        const id_carrito = carrito[0].id_carrito;

        // Obtener el precio de la pizza
        const queryPizza = 'SELECT * FROM Pizzas WHERE id_pizza = ?';
        db.query(queryPizza, [id_pizza], (err, pizza) => {
            if (err || pizza.length === 0) {
                return res.status(500).json({ error: 'Error al obtener la pizza' });
            }

            const precio_unitario = pizza[0].precio;

            // Insertamos el detalle del carrito
            const queryDetalle = 'INSERT INTO CarritoDetalle (id_carrito, id_pizza, cantidad, precio_unitario) VALUES (?, ?, ?, ?)';
            db.query(queryDetalle, [id_carrito, id_pizza, cantidad, precio_unitario], (err, result) => {
                if (err) {
                    console.error('Error al agregar pizza al carrito:', err);
                    return res.status(500).json({ error: 'Error al agregar pizza al carrito' });
                }

                // Actualizamos el total del carrito
                const nuevoTotal = cantidad * precio_unitario;
                const queryTotal = 'UPDATE CarritoCompras SET total = total + ? WHERE id_carrito = ?';
                db.query(queryTotal, [nuevoTotal, id_carrito], (err, result) => {
                    if (err) {
                        console.error('Error al actualizar el total del carrito:', err);
                        return res.status(500).json({ error: 'Error al actualizar el total del carrito' });
                    }

                    res.status(201).json({ message: 'Pizza agregada al carrito' });
                });
            });
        });
    });
});


// Ruta para agregar un producto al carrito
app.post('/carrito/producto', (req, res) => {
    const { id_cliente, id_producto, cantidad } = req.body;
    
    // Verificar si el cliente tiene un carrito
    const queryCarrito = 'SELECT * FROM CarritoCompras WHERE id_cliente = ? AND total = 0';
    db.query(queryCarrito, [id_cliente], (err, carrito) => {
        if (err) {
            console.error('Error al verificar el carrito:', err);
            return res.status(500).json({ error: 'Error al verificar el carrito' });
        }
        
        if (carrito.length === 0) {
            return res.status(400).json({ error: 'El cliente no tiene un carrito activo' });
        }
        
        const id_carrito = carrito[0].id_carrito;
        
        // Obtener el precio del producto
        const queryProducto = 'SELECT * FROM Productos WHERE id_producto = ?';
        db.query(queryProducto, [id_producto], (err, producto) => {
            if (err || producto.length === 0) {
                return res.status(500).json({ error: 'Error al obtener el producto' });
            }
            
            const precio_unitario = producto[0].precio;
            
            // Insertar el producto al carrito
            const queryDetalle = 'INSERT INTO CarritoDetalle (id_carrito, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)';
            db.query(queryDetalle, [id_carrito, id_producto, cantidad, precio_unitario], (err, result) => {
                if (err) {
                    console.error('Error al agregar producto al carrito:', err);
                    return res.status(500).json({ error: 'Error al agregar producto al carrito' });
                }
                
                // Actualizar el total del carrito
                const nuevoTotal = cantidad * precio_unitario;
                const queryTotal = 'UPDATE CarritoCompras SET total = total + ? WHERE id_carrito = ?';
                db.query(queryTotal, [nuevoTotal, id_carrito], (err, result) => {
                    if (err) {
                        console.error('Error al actualizar el total del carrito:', err);
                        return res.status(500).json({ error: 'Error al actualizar el total del carrito' });
                    }
                    
                    res.status(201).json({ message: 'Producto agregado al carrito' });
                });
            });
        });
    });
});

// Ruta para obtener el carrito de compras de un cliente
app.get('/carrito/:id_cliente', (req, res) => {
    const id_cliente = req.params.id_cliente;

    const queryCarrito = 'SELECT * FROM CarritoCompras WHERE id_cliente = ? AND total > 0';
    db.query(queryCarrito, [id_cliente], (err, carrito) => {
        if (err) {
            console.error('Error al obtener el carrito:', err);
            return res.status(500).json({ error: 'Error al obtener el carrito' });
        }
        
        if (carrito.length === 0) {
            return res.status(404).json({ message: 'El cliente no tiene un carrito' });
        }

        const id_carrito = carrito[0].id_carrito;
        
        // Obtener los detalles del carrito (pizzas y productos)
        const queryDetalles = `
            SELECT cd.*, p.nombre AS pizza_nombre, pr.nombre AS producto_nombre
            FROM CarritoDetalle cd
            LEFT JOIN Pizzas p ON cd.id_pizza = p.id_pizza
            LEFT JOIN Productos pr ON cd.id_producto = pr.id_producto
            WHERE cd.id_carrito = ?
        `;
        db.query(queryDetalles, [id_carrito], (err, detalles) => {
            if (err) {
                console.error('Error al obtener los detalles del carrito:', err);
                return res.status(500).json({ error: 'Error al obtener los detalles del carrito' });
            }

            res.json({
                carrito: carrito[0],
                detalles: detalles
            });
        });
    });
});



// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor API corriendo en http://localhost:${port}`);
});
