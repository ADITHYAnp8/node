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

// API to calculate the sum of FTD COUNT
app.get('/customerSum', (req, res) => {
  const getCustomerSumQuery = 'SELECT SUM(CUST_MALE_CNT_FTD) as maleSum, SUM(CUST_FEMALE_CNT_FTD) as femaleSum, SUM(CUST_OTH_CNT_FTD) as otherSum, SUM(NON_INDIVIDUAL_CNT_FTD) as nonIndividualSum, SUM(SR_CITIZEN_CIF_FTD) as srSum, SUM(NRI_CIF_FTD) as NriSum, SUM(MBCUST_CIF_FTD) as MbSum,SUM(CUST_MALE_CNT_FTD) + SUM(CUST_FEMALE_CNT_FTD) + SUM(CUST_OTH_CNT_FTD) + SUM(NON_INDIVIDUAL_CNT_FTD) AS totalSum FROM customer_data;';
  db.query(getCustomerSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching customer sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    
    return res.status(200).json(results[0]); // Assuming you want a single object with sums
  });
});

// API to calculate the sum of PRE YEAR COUNT
app.get('/customerSumPrevY', (req, res) => {
  const getPrevCustomerSumQuery= 'SELECT SUM(CUST_MALE_CNT_PREV_FY) as maleSumPrevY, SUM(CUST_FEMALE_CNT_PREV_FY) as femaleSumPrevY, SUM(CUST_OTH_CNT_PREV_FY) as otherSumPrevY, SUM(NON_INDIVIDUAL_PREV_FY) as nonIndividualSumPrevY, SUM(SR_CITIZEN_CIF_PREV_FY) as srSumPrevY, SUM(NRI_CIF_PREV_FY) as NriSumPrevY, SUM(MBCUST_CIF_PREV_FY) as MbSumPrevY,SUM(CUST_MALE_CNT_PREV_FY) + SUM(CUST_FEMALE_CNT_PREV_FY) + SUM(CUST_OTH_CNT_PREV_FY) + SUM(NON_INDIVIDUAL_PREV_FY) AS totalSumPrevY FROM customer_data;';
  db.query(getPrevCustomerSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching customer sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    
    return res.status(200).json(results[0]); // Assuming you want a single object with sums
  });
});

// API to calculate the sum of PRE YEAR COUNT
app.get('/customerSumNew', (req, res) => {
  const getNewCustomerSumQuery= 'SELECT SUM(CUST_MALE_CNT_NEW_FY) as maleSumNew, SUM(CUST_FEMALE_CNT_NEW_FY) as femaleSumNew, SUM(CUST_OTH_CNT_NEW_FY) as otherSumNew, SUM(NON_INDIVIDUAL_NEW_FY) as nonIndividualSumNew, SUM(SR_CITIZEN_CIF_NEW_FY) as srSumNew, SUM(NRI_CIF_NEW_FY) as NriSumNew, SUM(MBCUST_CIF_NEW_FY) as MbSumNew,SUM(CUST_MALE_CNT_NEW_FY) + SUM(CUST_FEMALE_CNT_NEW_FY) + SUM(CUST_OTH_CNT_NEW_FY) + SUM(NON_INDIVIDUAL_NEW_FY) AS totalSumNew FROM customer_data;';
  db.query(getNewCustomerSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching customer sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    
    return res.status(200).json(results[0]); // Assuming you want a single object with sums
  });
}); 

// // Define API endpoint to fetch product names
// app.get('/advanceProductNames', (req, res) => {
//   const query = 'SELECT DISTINCT PRODUCT_GRPING FROM advance_data';
//   db.query(query, (err, results) => {
//     if (err) {
//       console.error('Error fetching product names:', err);
//       res.status(500).json({ error: 'Internal Server Error' });
//       return;
//     }
//     res.status(200).json(results.map(row => row.PRODUCT_GRPING));
//   });
// });


// API endpoint to get data into the advance_data's table MAIN PRODUCTS
app.get('/mainProductAdvanceSum', (req, res) => {
  const getAdvanceSumQuery = ` SELECT SUM(CASE WHEN PRODUCT_GRPING = 'Micro Fianance Loan' THEN CNT_FTD ELSE 0 END) AS MicroFinanceLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Micro Fianance Loan' THEN OS_FTD ELSE 0 END) AS MicroFinanceLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'Gold Loan' THEN CNT_FTD ELSE 0 END) AS GoldLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Gold Loan' THEN OS_FTD ELSE 0 END) AS GoldLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'Business Loan' THEN CNT_FTD ELSE 0 END) AS BusinessLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Business Loan' THEN OS_FTD ELSE 0 END) AS BusinessLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'Clean Energy Loan' THEN CNT_FTD ELSE 0 END) AS CleanEnergyLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Clean Energy Loan' THEN OS_FTD ELSE 0 END) AS CleanEnergyLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'Mortgage Loan' THEN CNT_FTD ELSE 0 END) AS MortgageLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Mortgage Loan' THEN OS_FTD ELSE 0 END) AS MortgageLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'Term Loan' THEN CNT_FTD ELSE 0 END) AS TermLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Term Loan' THEN OS_FTD ELSE 0 END) AS TermLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'Loan Against Deposit' THEN CNT_FTD ELSE 0 END) AS LoanAgainstDepoCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Loan Against Deposit' THEN OS_FTD ELSE 0 END) AS LoanAgainstDepoOs,SUM(CASE WHEN PRODUCT_GRPING = 'Loan Against Property' THEN CNT_FTD ELSE 0 END) AS LoanAgainstPropertyCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Loan Against Property' THEN OS_FTD ELSE 0 END) AS LoanAgainstPropertyOs,SUM(CASE WHEN PRODUCT_GRPING = 'Auto loan' THEN CNT_FTD ELSE 0 END) AS AutoLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Auto loan' THEN OS_FTD ELSE 0 END) AS AutoLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'Personal Loan' THEN CNT_FTD ELSE 0 END) AS PersonalLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Personal Loan' THEN OS_FTD ELSE 0 END) AS PersonalLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'CC OD Loan' THEN CNT_FTD ELSE 0 END) AS CcOdLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'CC OD Loan' THEN OS_FTD ELSE 0 END) AS CcOdLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'Agri Loan' THEN CNT_FTD ELSE 0 END) AS AgriLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'Agri Loan' THEN OS_FTD ELSE 0 END) AS AgriLoanOs,SUM(CASE WHEN PRODUCT_GRPING = 'KCC Loan' THEN CNT_FTD ELSE 0 END) AS KccLoanCnt,
  SUM(CASE WHEN PRODUCT_GRPING = 'KCC Loan' THEN OS_FTD ELSE 0 END) AS KccLoanOs FROM advance_data;`;

  db.query(getAdvanceSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching customer sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    
    return res.status(200).json(results[0]); // Assuming you want a single object with sums
  });
});

// API endpoint to get data into the advance_data's table SUB PRODUCTS
app.get('/subProductAdvanceSum', (req, res) => {
  const getSubAdvanceSumQuery = " SELECT SUM(CASE WHEN PRODUCT_GRPING = 'Agri Loan' THEN CNT_FTD ELSE 0 END) AS AgriLoanCnt,SUM(CASE WHEN PRODUCT_GRPING = 'Agri Loan' THEN OS_FTD ELSE 0 END) AS AgriLoanOs FROM advance_data;";

  db.query(getSubAdvanceSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching advance sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    
    return res.status(200).json(results[0]);
  });
});


// API endpoint to geet data into the deposit_data's table
app.get('/mainProductDepositSum', (req, res) => {
  const getDepositSumQuery = " SELECT SUM(CASE WHEN PRODUCT_GRPING = 'CA_Retail' THEN CNT_FTD ELSE 0 END) AS CARetailCnt,SUM(CASE WHEN PRODUCT_GRPING = 'CA_Retail' THEN OS_FTD ELSE 0 END) AS CARetailOs,SUM(CASE WHEN PRODUCT_GRPING = 'CA_NRI' THEN CNT_FTD ELSE 0 END) AS CANRICnt,SUM(CASE WHEN PRODUCT_GRPING = 'CA_NRI' THEN OS_FTD ELSE 0 END) AS CANRIOs,SUM(CASE WHEN PRODUCT_GRPING = 'SA_MB' THEN CNT_FTD ELSE 0 END) AS SAMBCnt,SUM(CASE WHEN PRODUCT_GRPING = 'SA_MB' THEN OS_FTD ELSE 0 END) AS SAMBOs,SUM(CASE WHEN PRODUCT_GRPING = 'SA_Retail' THEN CNT_FTD ELSE 0 END) AS SARetailCnt,SUM(CASE WHEN PRODUCT_GRPING = 'SA_Retail' THEN OS_FTD ELSE 0 END) AS SARetailOs,SUM(CASE WHEN PRODUCT_GRPING = 'SA_NRI' THEN CNT_FTD ELSE 0 END) AS SANRICnt,SUM(CASE WHEN PRODUCT_GRPING = 'SA_NRI' THEN OS_FTD ELSE 0 END) AS SANRIOs,SUM(CASE WHEN PRODUCT_GRPING = 'TDA_MB' THEN CNT_FTD ELSE 0 END) AS TDAMBCnt,SUM(CASE WHEN PRODUCT_GRPING = 'TDA_MB' THEN OS_FTD ELSE 0 END) AS TDAMBOs FROM deposit_data;";

  db.query(getDepositSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching advance sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    
    return res.status(200).json(results[0]);
  });
});

// API endpoint to get data into the advance_data's table SUB PRODUCTS
app.get('/subProductDepositSum', (req, res) => {
  const getSubDepositSumQuery = ` SELECT SUM(CASE WHEN PROD_TYP_DESC = 'Current account basic' THEN CNT_FTD ELSE 0 END) AS CurrentBasicCnt,SUM(CASE WHEN PROD_TYP_DESC = 'Current account basic' THEN OS_FTD ELSE 0 END) AS CurrentBasicOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'Current account classic' THEN CNT_FTD ELSE 0 END) AS CurrentClassicCnt,SUM(CASE WHEN PROD_TYP_DESC = 'Current account classic' THEN OS_FTD ELSE 0 END) AS CurrentClassicOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'CA Premium with sweep' THEN CNT_FTD ELSE 0 END) AS CAPrewithSweeCnt,SUM(CASE WHEN PROD_TYP_DESC = 'CA Premium with sweep' THEN OS_FTD ELSE 0 END) AS CAPrewithSweeOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'Basic agent' THEN CNT_FTD ELSE 0 END) AS basicAgentCnt,SUM(CASE WHEN PROD_TYP_DESC = 'Basic agent' THEN OS_FTD ELSE 0 END) AS basicAgentOs,SUM(CASE WHEN PROD_TYP_DESC = 'Escrow account' THEN CNT_FTD ELSE 0 END) AS EscrowAccountCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'Escrow account' THEN OS_FTD ELSE 0 END) AS EscrowAccountOs,SUM(CASE WHEN PROD_TYP_DESC = 'CA Premium without sweep' THEN CNT_FTD ELSE 0 END) AS CAPrewithoutSweeCnt,SUM(CASE WHEN PROD_TYP_DESC = 'CA Premium without sweep' THEN OS_FTD ELSE 0 END) AS CAPrewithoutSweeOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'CA Diamond without sweep' THEN CNT_FTD ELSE 0 END) AS CADiawithoutSweeCnt,SUM(CASE WHEN PROD_TYP_DESC = 'CA Diamond without sweep' THEN OS_FTD ELSE 0 END) AS CADiawithoutSweeOs,SUM(CASE WHEN PROD_TYP_DESC = 'CAA NRE' THEN CNT_FTD ELSE 0 END) AS CAANRECnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'CAA NRE' THEN OS_FTD ELSE 0 END) AS CAANREOs,SUM(CASE WHEN PROD_TYP_DESC = 'CA NRO' THEN CNT_FTD ELSE 0 END) AS CANROCnt,SUM(CASE WHEN PROD_TYP_DESC = 'CA NRO' THEN OS_FTD ELSE 0 END) AS CANROOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Lalith' THEN CNT_FTD ELSE 0 END) AS SBlalithCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Lalith' THEN OS_FTD ELSE 0 END) AS SBlalithOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Mahila' THEN CNT_FTD ELSE 0 END) AS SBmahilaCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB Mahila' THEN OS_FTD ELSE 0 END) AS SBmahilaOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Regular' THEN CNT_FTD ELSE 0 END) AS SBregularCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Regular' THEN OS_FTD ELSE 0 END) AS SBregularOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Senior citizen' THEN CNT_FTD ELSE 0 END) AS SBseniorCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB Senior citizen' THEN OS_FTD ELSE 0 END) AS SBseniorOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Premium with sweep(Expired)' THEN CNT_FTD ELSE 0 END) AS SBPrewithSweeExpCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB Premium with sweep(Expired)' THEN OS_FTD ELSE 0 END) AS SBPrewithSweeExpOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Premium without sweep' THEN CNT_FTD ELSE 0 END) AS SBPrewithoutSweeCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Premium without sweep' THEN OS_FTD ELSE 0 END) AS SBPrewithoutSweeOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB TASC' THEN CNT_FTD ELSE 0 END) AS SBTASCCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB TASC' THEN OS_FTD ELSE 0 END) AS SBTASCOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Student' THEN CNT_FTD ELSE 0 END) AS SBstuCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Student' THEN OS_FTD ELSE 0 END) AS SBstuOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Salary account' THEN CNT_FTD ELSE 0 END) AS SBsalAccCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB Salary account' THEN OS_FTD ELSE 0 END) AS SBsalAccOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Staff' THEN CNT_FTD ELSE 0 END) AS SBstaffCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Staff' THEN OS_FTD ELSE 0 END) AS SBstaffOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Lalith Plus' THEN CNT_FTD ELSE 0 END) AS SBlalithplusCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB Lalith Plus' THEN OS_FTD ELSE 0 END) AS SBlalithplusOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Zero balance' THEN CNT_FTD ELSE 0 END) AS SBzeroBalCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB Zero balance' THEN OS_FTD ELSE 0 END) AS SBzeroBalOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB Krishak bandhu' THEN CNT_FTD ELSE 0 END) AS SBkriBanCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Krishak bandhu' THEN OS_FTD ELSE 0 END) AS SBkriBanOs,SUM(CASE WHEN PROD_TYP_DESC = '525-SB Salary standard ' THEN CNT_FTD ELSE 0 END) AS 525SBsalStanCnt,SUM(CASE WHEN PROD_TYP_DESC = '525-SB Salary standard' THEN OS_FTD ELSE 0 END) AS 525SBsalStanOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE' THEN CNT_FTD ELSE 0 END) AS SBNRECnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE' THEN OS_FTD ELSE 0 END) AS SBNREOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRO' THEN CNT_FTD ELSE 0 END) AS SBNROCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRO' THEN OS_FTD ELSE 0 END) AS SBNROOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE Prem sweep(Expired)' THEN CNT_FTD ELSE 0 END) AS SBNREpremsweeexpCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE Prem sweep(Expired)' THEN OS_FTD ELSE 0 END) AS SBNREpremsweeexpOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE Prem without sweep' THEN CNT_FTD ELSE 0 END) AS SBNREpremwithoutsweeCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE Prem without sweep' THEN OS_FTD ELSE 0 END) AS SBNREpremwithoutsweeOs,SUM(CASE WHEN PROD_TYP_DESC = 'Recurring deposit weekly' THEN CNT_FTD ELSE 0 END) AS RecurDepoWeeCnt,SUM(CASE WHEN PROD_TYP_DESC = 'Recurring deposit weekly' THEN OS_FTD ELSE 0 END) AS RecurDepoWeeOs FROM deposit_data;`;

  db.query(getSubDepositSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching advance sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    
    return res.status(200).json(results[0]);
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
