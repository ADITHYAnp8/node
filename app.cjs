const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const port = 3000;

// Setup MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'customer',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1); // Exit the process on connection error
  } else {
    console.log('Connected to MySQL');
  }
});

// Middleware to parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, etc.)
app.use(express.static('public'));
app.use(cors());

// Logging middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/test', (req, res) => {
  console.log('test');
  res.send('success');
});

// SignUp endpoint
app.post('/signup', async (req, res) => {
  const { user_id, password, confirm_password, user_type } = req.body;

  console.log(`Received SignUp request for user: ${user_id}`);

  // Check if password and confirm_password match
  if (password !== confirm_password) {
    console.log('Passwords do not match');
    return res.status(400).send({ msg: 'Passwords do not match' });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the user_id is unique
    const checkUserQuery = 'SELECT * FROM user WHERE user_id = ?';
    db.query(checkUserQuery, [user_id], async (error, results) => {
      if (error) {
        console.error('Error checking user:', error);
        return res.status(500).send({ msg: 'Internal Server Error' });
      }

      if (results.length > 0) {
        console.log(`User ${user_id} already exists`);
        return res.status(400).send({ msg: 'User already exists' });
      }

      // Insert new user into the database with hashed password
        const insertUserQuery = 'INSERT INTO user (user_id, pass, user_type) VALUES (?, ?, ?)';
        db.query(insertUserQuery, [user_id, hashedPassword, user_type], (err, result) => {
          if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).send({ msg: 'Internal Server Error' });
          }

          console.log(`User ${user_id} successfully registered`);
          console.log('Insert result:', result);

          // Redirect to login page after successful signup
          //res.redirect('/login');
          res.status(200).send({msg:'success'});
        });

    });
  } catch (error) {
    console.error('Error hashing password:', error);
    return res.status(500).send({ msg: 'Internal Server Error' });
  }
});


// Login endpoint
app.post('/login', (req, res) => {
  const { user_id, password } = req.body;

  console.log(`Received Login request for user: ${user_id}`);

  // Check if user exists
  const loginUserQuery = 'SELECT * FROM user WHERE user_id = ?';
  db.query(loginUserQuery, [user_id], async (error, results) => {
    if (error) {
      console.error('Error checking login:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }

    try {
      if (results.length === 1) {
        const hashedPassword = results[0].pass;

        // Compare the provided password with the hashed password in the database
        bcrypt.compare(password, hashedPassword, (compareErr, passwordMatch) => {
          if (compareErr) {
            console.error('Error comparing passwords:', compareErr);
            return res.status(500).send({ msg: 'Internal Server Error' });
          }

          if (passwordMatch) {
            
            console.log(`User ${user_id} successfully logged in`);

            // Redirect to the dashboard after successful login
            res.status(200).send({ msg: 'Login successful' });
          } else {
            console.log(`Invalid credentials for user: ${user_id}`);
            res.status(401).send({ msg: 'Invalid credentials' });
          }
        });
      } else {
        console.log(`User ${user_id} not found`);
        res.status(401).send({ msg: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Unexpected error during login:', error);
      res.status(500).send({ msg: 'Internal Server Error' });
    }
  });
});

//getting data from db
//data fetching API model
app.get('/totaldeposit', (req, res) => {
  const getTotalDeposit = 'SELECT SUM(OS_FTD) AS deposit_total FROM deposit_data;'; // Change this query based on your table structure
  
  db.query(getTotalDeposit, (error, results) => {
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }

    return res.status(200).json(results);
  });
});

app.get('/totalAdvance', (req, res) => {
  const getTotalAdvance = 'SELECT SUM(OS_FTD) AS advance_total FROM advance_data;'; // Change this query based on your table structure
  
  db.query(getTotalAdvance, (error, results) => {
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }

    return res.status(200).json(results);
  });
});

app.get('/totalBusiness', (req, res) => {
  const getTotalBusiness = 'SELECT ((SELECT SUM(OS_FTD) FROM deposit_data) + (SELECT SUM(OS_FTD) FROM advance_data)) AS total_business;'; // Change this query based on your table structure
  
  db.query(getTotalBusiness, (error, results) => {
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }

    return res.status(200).json(results);
  });
});

// Event listener for MySQL connection error
db.on('error', (err) => {
  console.error('MySQL connection error:', err);

  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Attempting to reconnect to MySQL...');
    db.connect();
  } else {
    console.error('Unhandled MySQL connection error:', err);
    process.exit(1); // Exit the process on an unhandled connection error
  }
});

// Global error handler for unhandled exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1); // Exit the process on unhandled exception
});

// Global error handler for unhandled Promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // Exit the process on unhandled rejection
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Enable CORS with specific configuration
const corsOptions = {
  origin: '*', // Replace with your Angular app's domain
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Enable credentials (cookies, authorization headers, etc.)
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
