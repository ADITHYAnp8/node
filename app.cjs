const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
// const router = express.Router();
const port = 3001;

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

 

// Define API endpoint to fetch main product names from advance_data
app.get('/advanceProductNames', (req, res) => {
  const query = `
    SELECT DISTINCT
      'Micro Finance Loan' AS microFinanceLoan,
      'Gold Loan' AS goldLoan,
      'Business Loan' AS businessLoan,
      'Clean Energy Loan' AS cleanEnergyLoan,
      'Mortgage Loan' AS mortgageLoan,
      'Loan Against Property' AS loanAgainstProperty,
      'Term Loan' AS termLoan,
      'Auto Loan' AS autoLoan,
      'Personal Loan' AS personalLoan,
      'Loan Against Deposit' AS loanAgainstDeposit,
      'CC OD Loan' AS ccOdLoan,
      'Agri Loan' AS agriLoan,
      'KCC Loan' AS kccLoan
    FROM advance_data`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching product names:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.status(200).json(results[0]);
  });
});


//To get Advance sub products
app.get('/advanceSubProductNames', (req, res) => {
  const query = `
    SELECT DISTINCT
      'Income Generation Loan' AS incomeGenerationLoan,
      'Utdhan Loan' AS utdhanLoan,
      'Business Loan AGORA BC' AS businessLoanAGORABC,
      'Pratheeksha kiran' AS pratheekshaKiran,
      'Monthly IGL Loan KAMAL' AS monthlyIGLLoanKAMAL,
      'ESAF Income Generation Loan' AS esafIncomeGenerationLoan,
      'ESAF Nano' AS esafNano,
      'ESAF GOLD LOAN GENERAL' AS esafGoldLoanGeneral,
      'ESAF GOLD LOAN 120 DAYS' AS esafGoldLoan120Days,
      'ESAF BUSINESS LOAN' AS esafBusinessLoan,
      'ESAF BUSINESS LOAN FORTNI' AS esafBusinessLoanFortni,
      'ESAF GENCLN ENGY PRD MTLY' AS esafGenclnEngyPrdMtly,
      'ESAF MICRO HOUSING LOAN' AS esafMicroHousingLoan,
      'ESAF MICRO HOUSING WEEKLY' AS esafMicroHousingWeekly,
      'ESAF MICRO HOUSING FORTNI' AS esafMicroHousingFortni,
      'ESAF LOAN AGAINST PROP' AS esafLoanAgainstProp,
      'ESAF LAP WEEKLY' AS esafLapWeekly,
      'ESAF LAP FORTNIGHTLY' AS esafLapFortnightly,
      'ESAF DREAM HOME LOAN' AS esafDreamHomeLoan,
      'ESAF AHL-MONTHLY' AS esafAhlMonthly,
      'ESAF Term Loan' AS esafTermLoan,
      'ESAF TWO WHEELER LOAN MTH' AS esafTwoWheelerLoanMth,
      'ESAF 3 WHEELER LOAN MTH' AS esafThreeWheelerLoanMth,
      'ESAF Car Loan New Direct' AS esafCarLoanNewDirect,
      'ESAF Car Loan Used Direct' AS esafCarLoanUsedDirect,
      'ESAF PERSONAL LOAN WEEKLY' AS esafPersonalLoanWeekly,
      'ESAF PERSONAL LOAN FORTNI' AS esafPersonalLoanFortni,
      'ESAF PERSONAL LOAN MTH' AS esafPersonalLoanMth,
      'ESAF PERSONAL LOAN' AS esafPersonalLoan,
      'ESAF LOAN AGAINST TD' AS esafLoanAgainstTd,
      'ESAF OD-AGAINST-FD' AS esafOdAgainstFd,
      'ESAF NEW CC OD' AS esafNewCcOd,
      'ESAF Salary Overdraft' AS esafSalaryOverdraft,
      'ESAF Loan against Gold for Agriculturist' AS esafLoanAgainstGoldForAgriculturist,
      'ELAGA75' AS elaga75,
      'ESAF GOLD LOAN GEN HALF YEARLY' AS esafGoldLoanGenHalfYearly,
      'ESAF BUSINESS LOAN WEEKLY' AS esafBusinessLoanWeekly,
      'ESAF LCV New Direct' AS esafLcvNewDirect,
      'ESAF LCV LOAN USED' AS esafLcvLoanUsed,
      'ESAF VEHICLE LOAN 2W' AS esafVehicleLoan2w,
      'ESAF KCC Credit' AS esafKccCredit
    FROM advance_data`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching product names:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    // Assuming results is an array of objects, simply return it
    res.status(200).json(results[0]);
  });
}); 



// Define API endpoint to fetch main product names from deposit_data
app.get('/depositProductNames', (req, res) => {
  const query = `
    SELECT DISTINCT
      'CA_Retail' AS caRetail,
      'CA_NRI' AS caNRI,
      'SA_MB' AS saMB,
      'SA_Retail' AS saRetail,
      'SA_NRI' AS saNRI,
      'TDA_MB' AS tdaMB
    FROM advance_data`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching sub-product names:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.status(200).json(results[0]);
  });
});



// Define API endpoint to fetch sub product names from deposit_data
app.get('/depositSubProductNames', (req, res) => {
  const query = `
    SELECT DISTINCT
      'Current account basic' AS currentAccountBasic,
      'Current account classic' AS currentAccountClassic,
      'CA Premium with sweep' AS caPremiumWithSweep,
      'CA Diamond with sweep' AS caDiamondWithSweep,
      'Basic agent' AS basicAgent,
      'Escrow account' AS escrowAccount,
      'CA Premium without sweep' AS caPremiumWithoutSweep,
      'CA Diamond without sweep' AS caDiamondWithoutSweep,
      'CAA NRE' AS caaNRE,
      'CA NRO' AS caNRO,
      'SB Lalith' AS sbLalith,
      'SB Mahila' AS sbMahila,
      'SB Regular' AS sbRegular,
      'SB Senior citizen' AS sbSeniorCitizen,
      'SB Premium with sweep(Expired)' AS sbPremiumWithSweepExpired,
      'SB Premium without sweep' AS sbPremiumWithoutSweep,
      'SB TASC' AS sbTASC,
      'SB NRE' AS sbNRE,
      'SB NRO' AS sbNRO,
      'SB NRE Prem sweep(Expired)' AS sbNREPremSweepExpired,
      'SB NRE Prem without sweep' AS sbNREPremWithoutSweep,
      'SB Student' AS sbStudent,
      'SB Salary account' AS sbSalaryAccount,
      'SB Staff' AS sbStaff,
      'SB Lalith Plus' AS sbLalithPlus,
      'SB Zero balance' AS sbZeroBalance,
      'SB Krishak bandhu' AS sbKrishakBandhu,
      'Recurring deposit weekly' AS recurringDepositWeekly,
      '525 - SB Salary standard' AS sbSalaryStandard
    FROM deposit_data`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching product names:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.status(200).json(results[0]);
  });
});



  app.post('/filteredAdvanceData', (req, res) => {
    const branchId = req.body.branchId;
    const branchName = req.body.branchName;
    const product = req.body.product;
    const productId = req.body.productID;

    let query = `
        SELECT BRANCH_NAME, BRANCH_ID, PRODUCT_GRPING, PROD_TYP_DESC,PROD_TYP,OS_FTD, CNT_FTD
        FROM customer.advance_data 
        WHERE 1`;

    const queryParams = [];

    if (branchId) {
        query += ` AND BRANCH_ID = ?`;
        queryParams.push(branchId);
    }

    if (branchName) {
        query += ` AND BRANCH_NAME = ?`;
        queryParams.push(branchName);
    }
  
    if (product) {
        query += ` AND PRODUCT_GRPING = ?`;           
        queryParams.push(product);
    }
    if (productId) {
      query += ` AND PRODUCT_GRPING = ?`;           
      queryParams.push(product);
  }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching filtered data:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        res.send(results);
    });
});

 
app.post('/filteredDepositData', (req, res) => {
  const branchId = req.body.branchId;
  const branchName = req.body.branchName;
  const product = req.body.product;
  
  let query = `
      SELECT BRANCH_NAME, BRANCH_ID, PRODUCT_GRPING, PROD_TYP_DESC, OS_FTD, CNT_FTD
      FROM customer.deposit_data 
      WHERE 1`;

  const queryParams = []; 

  if (branchId) {
      query += ` AND BRANCH_ID = ?`;
      queryParams.push(branchId);
  }

  if (branchName) {
      query += ` AND BRANCH_NAME = ?`;
      queryParams.push(branchName);
  }

  if (product) {
      query += ` AND PRODUCT_GRPING = ?`;           
      queryParams.push(product);
  }

  db.query(query, queryParams, (err, results) => {
      if (err) {
          console.error('Error fetching filtered data:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
      }

      res.send(results);
  });
});


app.get('/branchName', (req, res) => {
  const query = `SELECT DISTINCT BRANCH_NAME FROM customer.advance_data`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching branches:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    // Extract branch names from results array
    const branchNames = results.map(result => result.BRANCH_NAME);
    res.status(200).json(branchNames);
  });
});  


app.get('/branchId', (req, res) => {
  const query = `SELECT DISTINCT BRANCH_ID FROM customer.advance_data`;
  
  db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching branches:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      // Extract branch names from results array
      const branchId   = results.map(result => result.BRANCH_ID);
      res.status(200).json(branchId);
    });
  });  
  

app.get('/productName', (req, res) => {
const query = `SELECT DISTINCT PRODUCT_GRPING FROM customer.advance_data`;

db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching branches:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    // Extract branch names from results array
    const productName   = results.map(result => result.PRODUCT_GRPING);
    res.status(200).json(productName);
  });
});  


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
    // Convert each value to fixed two decimal points
    const formattedResults = Object.entries(results[0]).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'number' ? Number(value.toFixed(2)) : value;
      return acc;
    }, {});

    return res.status(200).json(formattedResults);
  });
});

// API endpoint to get data into the advance_data's table SUB PRODUCTS
app.get('/subProductAdvanceSum', (req, res) => {
  const getSubAdvanceSumQuery = ` SELECT SUM(CASE WHEN PROD_TYP_DESC = 'Income Generation Loan' THEN CNT_FTD ELSE 0 END) AS incGenLoCnt,SUM(CASE WHEN PROD_TYP_DESC = 'Income Generation Loan' THEN OS_FTD ELSE 0 END) AS incGenLoOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'Utdhan Loan' THEN CNT_FTD ELSE 0 END) AS UtdhanCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'Utdhan Loan' THEN OS_FTD ELSE 0 END) AS UtdhanOs,SUM(CASE WHEN PROD_TYP_DESC = 'Business Loan AGORA BC' THEN CNT_FTD ELSE 0 END) AS BusiLoaAGOBCCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'Business Loan AGORA BC' THEN OS_FTD ELSE 0 END) AS BusiLoaAGOBCOs,SUM(CASE WHEN PROD_TYP_DESC = 'Pratheeksha kiran' THEN CNT_FTD ELSE 0 END) AS PratheKirCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'Pratheeksha kiran' THEN OS_FTD ELSE 0 END) AS PratheKirOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'Monthly IGL Loan KAMAL' THEN CNT_FTD ELSE 0 END) AS monIGLLoaKAMACnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'Monthly IGL Loan KAMAL' THEN OS_FTD ELSE 0 END) AS monIGLLoaKAMAOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Income Generation Loan' THEN CNT_FTD ELSE 0 END) AS ESAincoGenLoaCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Income Generation Loan' THEN OS_FTD ELSE 0 END) AS ESAincoGenLoaOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Nano' THEN CNT_FTD ELSE 0 END) AS ESAFnanoCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Nano' THEN OS_FTD ELSE 0 END) AS ESAFnanoOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF GOLD LOAN GENERAL' THEN CNT_FTD ELSE 0 END) AS ESAgoLoGenCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF GOLD LOAN GENERAL' THEN OS_FTD ELSE 0 END) AS ESAgoLoGenOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF GOLD LOAN 120 DAYS' THEN CNT_FTD ELSE 0 END) AS ESAgoLo120Cnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF GOLD LOAN 120 DAYS' THEN OS_FTD ELSE 0 END) AS ESAgoLo120Os,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF BUSINESS LOAN' THEN CNT_FTD ELSE 0 END) AS ESAbusiLoCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF BUSINESS LOAN' THEN OS_FTD ELSE 0 END) AS ESAbusiLoOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF BUSINESS LOAN FORTNI' THEN CNT_FTD ELSE 0 END) AS ESAbusiLoaFortCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF BUSINESS LOAN FORTNI' THEN OS_FTD ELSE 0 END) AS ESAbusiLoaFortOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF GENCLN ENGY PRD MTLY' THEN CNT_FTD ELSE 0 END) AS GenEngyPrdMtlyCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF GENCLN ENGY PRD MTLY' THEN OS_FTD ELSE 0 END) AS GenEngyPrdMtlyOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF MICRO HOUSING LOAN' THEN CNT_FTD ELSE 0 END) AS McroHouLoaCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF MICRO HOUSING LOAN' THEN OS_FTD ELSE 0 END) AS McroHouLoaOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF MICRO HOUSING WEEKLY' THEN CNT_FTD ELSE 0 END) AS McroHouLoaWeekCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF MICRO HOUSING WEEKLY' THEN OS_FTD ELSE 0 END) AS McroHouLoaWeekOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF MICRO HOUSING FORTNI' THEN CNT_FTD ELSE 0 END) AS MicroHouFortCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF MICRO HOUSING FORTNI' THEN OS_FTD ELSE 0 END) AS MicroHouFortOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LOAN AGAINST PROP' THEN CNT_FTD ELSE 0 END) AS LoaAgaiPropCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LOAN AGAINST PROP' THEN OS_FTD ELSE 0 END) AS LoaAgaiPropOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LAP WEEKLY' THEN CNT_FTD ELSE 0 END) AS LapWeekCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LAP WEEKLY' THEN OS_FTD ELSE 0 END) AS LapWeekOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LAP FORTNIGHTLY' THEN CNT_FTD ELSE 0 END) AS LapFortNiCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LAP FORTNIGHTLY' THEN OS_FTD ELSE 0 END) AS LapFortNiOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF DREAM HOME LOAN' THEN CNT_FTD ELSE 0 END) AS DreHoLoaCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF DREAM HOME LOAN' THEN OS_FTD ELSE 0 END) AS DreHoLoaOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF AHL-MONTHLY' THEN CNT_FTD ELSE 0 END) AS AhlMonthCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF AHL-MONTHLY' THEN OS_FTD ELSE 0 END) AS AhlMonthOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Term Loan' THEN CNT_FTD ELSE 0 END) AS TermLoaCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Term Loan' THEN OS_FTD ELSE 0 END) AS TermLoaOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF TWO WHEELER LOAN MTH' THEN CNT_FTD ELSE 0 END) AS TwoWheeLoaCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF TWO WHEELER LOAN MTH' THEN OS_FTD ELSE 0 END) AS TwoWheeLoaOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF 3 WHEELER LOAN MTH' THEN CNT_FTD ELSE 0 END) AS Whee3LoaMthCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF 3 WHEELER LOAN MTH' THEN OS_FTD ELSE 0 END) AS Whee3LoaMthOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Car Loan New Direct' THEN CNT_FTD ELSE 0 END) AS CarLoaNewDireCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Car Loan New Direct' THEN OS_FTD ELSE 0 END) AS CarLoaNewDireOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Car Loan Used Direct' THEN CNT_FTD ELSE 0 END) AS CarLoaUsedDireCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Car Loan Used Direct' THEN OS_FTD ELSE 0 END) AS CarLoaUsedDireOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF PERSONAL LOAN WEEKLY' THEN CNT_FTD ELSE 0 END) AS PerLoaWeeCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF PERSONAL LOAN WEEKLY' THEN OS_FTD ELSE 0 END) AS PerLoaWeeOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF PERSONAL LOAN FORTNI' THEN CNT_FTD ELSE 0 END) AS PerLoaFortniCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF PERSONAL LOAN FORTNI' THEN OS_FTD ELSE 0 END) AS PerLoaFortniOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF PERSONAL LOAN MTH' THEN CNT_FTD ELSE 0 END) AS PerLoaMthCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF PERSONAL LOAN MTH' THEN OS_FTD ELSE 0 END) AS PerLoaMthOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF PERSONAL LOAN' THEN CNT_FTD ELSE 0 END) AS PerLoaCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF PERSONAL LOAN' THEN OS_FTD ELSE 0 END) AS PerLoaOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LOAN AGAINST TD' THEN CNT_FTD ELSE 0 END) AS LoaAgaiTDCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LOAN AGAINST TD' THEN OS_FTD ELSE 0 END) AS LoaAgaiTDOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF OD-AGAINST-FD' THEN CNT_FTD ELSE 0 END) AS ODagaiFDCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF OD-AGAINST-FD' THEN OS_FTD ELSE 0 END) AS ODagaiFDOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF NEW CC OD' THEN CNT_FTD ELSE 0 END) AS NewCCODCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF NEW CC OD' THEN OS_FTD ELSE 0 END) AS NewCCODOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Salary Overdraft' THEN CNT_FTD ELSE 0 END) AS SalOverCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Salary Overdraft' THEN OS_FTD ELSE 0 END) AS SalOverOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Loan against Gold for Agriculturist' THEN CNT_FTD ELSE 0 END) AS LoaAgaiGolAgriCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF Loan against Gold for Agriculturist' THEN OS_FTD ELSE 0 END) AS LoaAgaiGolAgriOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ELAGA75' THEN CNT_FTD ELSE 0 END) AS ELAGA75Cnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ELAGA75' THEN OS_FTD ELSE 0 END) AS ELAGA75Os,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF GOLD LOAN GEN HALF YEARLY' THEN CNT_FTD ELSE 0 END) AS GolLoaGenHalfYrCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF GOLD LOAN GEN HALF YEARLY' THEN OS_FTD ELSE 0 END) AS GolLoaGenHalfYrOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF BUSINESS LOAN WEEKLY' THEN CNT_FTD ELSE 0 END) AS BusiLoaWeeCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF BUSINESS LOAN WEEKLY' THEN OS_FTD ELSE 0 END) AS BusiLoaWeeOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LCV New Direct' THEN CNT_FTD ELSE 0 END) AS LCVNewDireCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LCV New Direct' THEN OS_FTD ELSE 0 END) AS LCVNewDireOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LCV LOAN USED' THEN CNT_FTD ELSE 0 END) AS LCVLoaUsedCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF LCV LOAN USED' THEN OS_FTD ELSE 0 END) AS LCVLoaUsedOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF VEHICLE LOAN 2W' THEN CNT_FTD ELSE 0 END) AS VehiLoa2WCnt,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF VEHICLE LOAN 2W' THEN OS_FTD ELSE 0 END) AS VehiLoa2WOs,SUM(CASE WHEN PROD_TYP_DESC = 'ESAF KCC Credit' THEN CNT_FTD ELSE 0 END) AS KCCcrediCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'ESAF KCC Credit' THEN OS_FTD ELSE 0 END) AS KCCcrediOs FROM advance_data;`;

  db.query(getSubAdvanceSumQuery, (error, results) => { 
    if (error) {
      console.error('Error fetching advance sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    // Convert each value to fixed two decimal points
    const formattedResults = Object.entries(results[0]).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'number' ? Number(value.toFixed(2)) : value;
      return acc;
    }, {});

    return res.status(200).json(formattedResults);
  });
});


// API endpoint to get data into the deposit_data's table
app.get('/mainProductDepositSum', (req, res) => {
  const getDepositSumQuery = " SELECT SUM(CASE WHEN PRODUCT_GRPING = 'CA_Retail' THEN CNT_FTD ELSE 0 END) AS CARetailCnt,SUM(CASE WHEN PRODUCT_GRPING = 'CA_Retail' THEN OS_FTD ELSE 0 END) AS CARetailOs,SUM(CASE WHEN PRODUCT_GRPING = 'CA_NRI' THEN CNT_FTD ELSE 0 END) AS CANRICnt,SUM(CASE WHEN PRODUCT_GRPING = 'CA_NRI' THEN OS_FTD ELSE 0 END) AS CANRIOs,SUM(CASE WHEN PRODUCT_GRPING = 'SA_MB' THEN CNT_FTD ELSE 0 END) AS SAMBCnt,SUM(CASE WHEN PRODUCT_GRPING = 'SA_MB' THEN OS_FTD ELSE 0 END) AS SAMBOs,SUM(CASE WHEN PRODUCT_GRPING = 'SA_Retail' THEN CNT_FTD ELSE 0 END) AS SARetailCnt,SUM(CASE WHEN PRODUCT_GRPING = 'SA_Retail' THEN OS_FTD ELSE 0 END) AS SARetailOs,SUM(CASE WHEN PRODUCT_GRPING = 'SA_NRI' THEN CNT_FTD ELSE 0 END) AS SANRICnt,SUM(CASE WHEN PRODUCT_GRPING = 'SA_NRI' THEN OS_FTD ELSE 0 END) AS SANRIOs,SUM(CASE WHEN PRODUCT_GRPING = 'TDA_MB' THEN CNT_FTD ELSE 0 END) AS TDAMBCnt,SUM(CASE WHEN PRODUCT_GRPING = 'TDA_MB' THEN OS_FTD ELSE 0 END) AS TDAMBOs FROM deposit_data;";

  db.query(getDepositSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching advance sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    // Convert each value to fixed two decimal points
    const formattedResults = Object.entries(results[0]).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'number' ? Number(value.toFixed(2)) : value;
      return acc;
    }, {});

    return res.status(200).json(formattedResults);
  });
});

// API endpoint to get data into the deposit_data's table SUB PRODUCTS
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
  SUM(CASE WHEN PROD_TYP_DESC = 'SB Krishak bandhu' THEN OS_FTD ELSE 0 END) AS SBkriBanOs,SUM(CASE WHEN PROD_TYP_DESC = '525-SB Salary standard ' THEN CNT_FTD ELSE 0 END) AS SBsalStanCnt,SUM(CASE WHEN PROD_TYP_DESC = '525-SB Salary standard' THEN OS_FTD ELSE 0 END) AS SBsalStanOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE' THEN CNT_FTD ELSE 0 END) AS SBNRECnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE' THEN OS_FTD ELSE 0 END) AS SBNREOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRO' THEN CNT_FTD ELSE 0 END) AS SBNROCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRO' THEN OS_FTD ELSE 0 END) AS SBNROOs,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE Prem sweep(Expired)' THEN CNT_FTD ELSE 0 END) AS SBNREpremsweeexpCnt,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE Prem sweep(Expired)' THEN OS_FTD ELSE 0 END) AS SBNREpremsweeexpOs,SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE Prem without sweep' THEN CNT_FTD ELSE 0 END) AS SBNREpremwithoutsweeCnt,
  SUM(CASE WHEN PROD_TYP_DESC = 'SB NRE Prem without sweep' THEN OS_FTD ELSE 0 END) AS SBNREpremwithoutsweeOs,SUM(CASE WHEN PROD_TYP_DESC = 'Recurring deposit weekly' THEN CNT_FTD ELSE 0 END) AS RecurDepoWeeCnt,SUM(CASE WHEN PROD_TYP_DESC = 'Recurring deposit weekly' THEN OS_FTD ELSE 0 END) AS RecurDepoWeeOs FROM deposit_data;`;

  db.query(getSubDepositSumQuery, (error, results) => {
    if (error) {
      console.error('Error fetching advance sum:', error);
      return res.status(500).send({ msg: 'Internal Server Error' });
    }
    // Convert each value to fixed two decimal points
    const formattedResults = Object.entries(results[0]).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'number' ? Number(value.toFixed(2)) : value;
      return acc;
    }, {});

    return res.status(200).json(formattedResults);
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