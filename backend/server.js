const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3001;

const {
  DB_HOST = "localhost",
  DB_USER = "root",
  DB_PASSWORD = "admin123",
  DB_NAME = "tienda_perritos",
  DB_PORT = 3306,
} = process.env;

app.use(cors());
app.use(express.json());

let pool;

/**
 * Espera algunos milisegundos.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Inicializa la base de datos:
 * 1. Espera a que MySQL esté disponible.
 * 2. Crea la base de datos si no existe.
 * 3. Crea la tabla productos si no existe.
 * 4. Inserta productos iniciales si la tabla está vacía.
 * 5. Crea el pool definitivo usando la base de datos.
 */
async function initDb() {
  let tempPool;
  let conn;

  try {
    tempPool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: Number(DB_PORT),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    conn = await tempPool.getConnection();

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await conn.query(`USE \`${DB_NAME}\``);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(255),
        precio DECIMAL(10,2) NOT NULL,
        stock INT NOT NULL
      )
    `);

    const [rows] = await conn.query("SELECT COUNT(*) AS total FROM productos");

    if (rows[0].total === 0) {
      await conn.query(`
        INSERT INTO productos (nombre, descripcion, precio, stock) VALUES
        ('Alimento Cachorro Premium', 'Sabor pollo, razas pequeñas', 19990, 15),
        ('Alimento Adulto Light', 'Control de peso, razas medianas', 17990, 8),
        ('Snacks Dentales', 'Ayuda a la limpieza dental', 5990, 30)
      `);

      console.log("Productos iniciales insertados.");
    }

    if (conn) {
      conn.release();
    }

    await tempPool.end();

    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: Number(DB_PORT),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log("Base de datos inicializada correctamente.");
  } catch (err) {
    if (conn) {
      conn.release();
    }

    if (tempPool) {
      await tempPool.end().catch(() => {});
    }

    console.error("Error al inicializar la BD:", err.message);
    throw err;
  }
}

/**
 * Reintenta la conexión porque en ECS MySQL puede tardar más que el backend.
 */
async function initDbWithRetry(retries = 20, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`Intentando conectar a MySQL... intento ${i}/${retries}`);
      await initDb();

      if (!pool) {
        throw new Error("El pool MySQL no se inicializó.");
      }

      console.log("MySQL conectado correctamente.");
      return;
    } catch (error) {
      console.error(`Intento ${i}/${retries} falló: ${error.message}`);

      if (i === retries) {
        throw error;
      }

      await sleep(delay);
    }
  }
}

/**
 * Valida que el pool esté listo antes de usarlo.
 */
function getPool() {
  if (!pool) {
    throw new Error("La conexión a MySQL aún no está lista.");
  }

  return pool;
}

function handleError(res, error, message = "Error interno del servidor") {
  console.error(error);
  res.status(500).json({ message });
}

app.get("/api/productos", async (req, res) => {
  try {
    const db = getPool();

    const [rows] = await db.query(
      "SELECT id, nombre, descripcion, precio, stock FROM productos ORDER BY id DESC"
    );

    res.json(rows);
  } catch (err) {
    handleError(res, err, "No se pudieron obtener los productos.");
  }
});

app.get("/api/productos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const db = getPool();

    const [rows] = await db.query(
      "SELECT id, nombre, descripcion, precio, stock FROM productos WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    handleError(res, err, "No se pudo obtener el producto.");
  }
});

app.post("/api/productos", async (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;

  if (!nombre || precio == null || stock == null) {
    return res.status(400).json({
      message: "Nombre, precio y stock son obligatorios.",
    });
  }

  try {
    const db = getPool();

    const [result] = await db.query(
      "INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)",
      [nombre, descripcion || null, precio, stock]
    );

    const nuevoId = result.insertId;

    const [rows] = await db.query(
      "SELECT id, nombre, descripcion, precio, stock FROM productos WHERE id = ?",
      [nuevoId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    handleError(res, err, "No se pudo crear el producto.");
  }
});

app.put("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock } = req.body;

  if (!nombre || precio == null || stock == null) {
    return res.status(400).json({
      message: "Nombre, precio y stock son obligatorios.",
    });
  }

  try {
    const db = getPool();

    const [result] = await db.query(
      "UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ? WHERE id = ?",
      [nombre, descripcion || null, precio, stock, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    const [rows] = await db.query(
      "SELECT id, nombre, descripcion, precio, stock FROM productos WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    handleError(res, err, "No se pudo actualizar el producto.");
  }
});

app.delete("/api/productos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const db = getPool();

    const [result] = await db.query("DELETE FROM productos WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    res.json({ message: "Producto eliminado correctamente." });
  } catch (err) {
    handleError(res, err, "No se pudo eliminar el producto.");
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend de tienda de perritos en ejecución.",
  });
});

/**
 * Inicia el backend solamente cuando MySQL ya está listo.
 */
async function startServer() {
  try {
    await initDbWithRetry();

    app.listen(PORT, () => {
      console.log(`Servidor backend escuchando en puerto ${PORT}`);
    });
  } catch (error) {
    console.error(
      "No se pudo iniciar el backend porque MySQL no está disponible:",
      error
    );

    process.exit(1);
  }
}

startServer();