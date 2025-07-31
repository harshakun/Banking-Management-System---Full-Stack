// 1. IMPORTS
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// 2. APP & MIDDLEWARE SETUP
const app = express();
app.use(express.json());
app.use(cors());

// 3. DATABASE CONFIG
const dbConfig = {
    user: 'UserHarsha',
    password: 'Harsha@2005',
    server: 'HARSHA-LAPTOP\\SQLEXPRESS',
    database: 'BANK_MANAGEMENT_SYSTEM',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// 4. SECURITY MIDDLEWARE (JWT Authentication)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, 'your_jwt_secret_key', (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden (invalid token)
        }
        req.user = user;
        next();
    });
};

// Test Database Connection on Startup
sql.connect(dbConfig)
   .then(() => console.log('Connected to SQL Server!'))
   .catch(err => console.error('Database Connection Failed!', err));

// =================================================================
// 5. API ENDPOINTS
// =================================================================

// ---------------------------------
// -- PUBLIC ROUTES (No Auth Needed)
// ---------------------------------

app.post('/api/login', async (req, res) => {
    const { loginId, password } = req.body; 
    try {
        const pool = await sql.connect(dbConfig);
        
        let result = await pool.request()
            .input('LoginId', sql.VarChar, loginId)
            .query('SELECT * FROM Account_Holder_Details WHERE Account_Number = @LoginId OR Aadhar_Number = @LoginId');

        let user = result.recordset[0];

        if (user) {
            // CRITICAL FIX: Reverted to plain text password comparison as requested.
            if (password !== user.Password) {
                return res.status(401).json({ message: 'Invalid password.' });
            }
            
            const token = jwt.sign(
                { accountNumber: user.Account_Number, name: user.Account_Holder_Name },
                'your_jwt_secret_key',
                { expiresIn: '1h' }
            );
            return res.status(200).json({ message: 'Login successful!', token: token });
        }

        result = await pool.request()
            .input('Aadhar_Number', sql.VarChar, loginId)
            .query('SELECT KYC_Status, Decline_Reason FROM Account_Opening_Form WHERE Aadhar_Number = @Aadhar_Number');
        
        const application = result.recordset[0];

        if (application) {
            if (application.KYC_Status === 'PENDING') {
                return res.status(403).json({ message: 'Your account application is still pending approval.' });
            } else if (application.KYC_Status === 'DECLINED') {
                return res.status(403).json({ message: `Your account application was declined. Reason: ${application.Decline_Reason}` });
            }
        }

        return res.status(404).json({ message: 'Account or Aadhar number not found. Please register.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

app.post('/api/open-account', async (req, res) => {
    try {
        const { accountType, holderName, dob, aadhar, mobile, balance, address, password } = req.body;
        
        if (balance < 1000) {
            return res.status(400).json({ message: "Opening balance must be at least 1000." });
        }
        
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Account_Type', sql.VarChar, accountType)
            .input('Account_Holder_Name', sql.VarChar, holderName)
            .input('DOB', sql.Date, dob)
            .input('Aadhar_Number', sql.VarChar, aadhar)
            .input('Mobile_Number', sql.VarChar, mobile)
            .input('Account_Opening_Balance', sql.Decimal(10, 2), balance)
            .input('Address', sql.VarChar, address)
            .input('Password', sql.NVarChar, password)
            .execute('Open_Account');
            
        res.status(201).json({ message: 'Account application submitted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during application.' });
    }
});

app.get('/api/application-status/:aadhar', async(req,res) => {
    try{
        const {aadhar} = req.params; 
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Aadhar_Number', sql.VarChar, aadhar)
            .query('SELECT KYC_Status, Decline_Reason FROM Account_Opening_Form WHERE Aadhar_Number = @Aadhar_Number');
        if(result.recordset.length === 0){
            return res.status(404).json({message:'Application not found for this Aadhar number.'});
        }
        res.status(200).json(result.recordset[0]);
    } catch(err) {
        console.error(err); 
        res.status(500).json({message:'Server error.'});
    }
});


// -----------------------------------------
// -- SECURE CUSTOMER ROUTES (Auth Required)
// -----------------------------------------

app.post('/api/make-transaction', authenticateToken, async (req, res) => {
    try {
        const { paymentType, amount } = req.body;
        const accountNumber = req.user.accountNumber; 
        
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Account_Number', sql.BigInt, accountNumber)
            .input('Payment_Type', sql.VarChar, paymentType)
            .input('Transaction_Amount', sql.Decimal(10, 2), amount)
            .execute('Make_Transaction');
        res.status(200).json({ message: 'Transaction successful!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during transaction.' });
    }
});

app.get('/api/account-details', authenticateToken, async (req, res) => {
    try {
        const accountNumber = req.user.accountNumber;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Account_Number', sql.BigInt, accountNumber)
            .execute('Get_Account_Details');
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch account details.' });
    }
});

app.get('/api/payment-statement/:months', authenticateToken, async (req, res) => {
    try {
        const { months } = req.params;
        const accountNumber = req.user.accountNumber;

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Months', sql.Int, months)
            .input('AccountNumber', sql.BigInt, accountNumber)
            .execute('Payment_Statement');
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch statement.' });
    }
});

app.delete('/api/account', authenticateToken, async (req, res) => {
    try {
        const accountNumber = req.user.accountNumber;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('AccountNumber', sql.BigInt, accountNumber)
            .execute('Delete_Account');
        res.status(200).json({ message: 'Your account has been successfully deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete account.' });
    }
});


// ---------------------------------
// -- ADMIN ROUTES (No Auth Yet)
// ---------------------------------

app.get('/api/pending-accounts', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT ID, Account_Holder_Name, Aadhar_Number FROM Account_Opening_Form WHERE KYC_Status = 'PENDING'");
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch pending accounts.' });
    }
});

app.post('/api/approve-account/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        const formResult = await pool.request().input('ID', sql.Int, id).query('SELECT Aadhar_Number FROM Account_Opening_Form WHERE ID = @ID');
        const aadharNumber = formResult.recordset[0].Aadhar_Number;
        await pool.request().input('ID', sql.Int, id).query(`UPDATE Account_Opening_Form SET KYC_Status = 'Approved' WHERE ID = @ID`);
        const accountResult = await pool.request().input('Aadhar_Number', sql.VarChar, aadharNumber).query('SELECT Account_Number FROM Account_Holder_Details WHERE Aadhar_Number = @Aadhar_Number');
        const newAccountNumber = accountResult.recordset[0].Account_Number;
        res.status(200).json({ message: `Account approved successfully! New Account Number is: ${newAccountNumber}`, accountNumber: newAccountNumber });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to approve account.' });
    }
});

app.post('/api/decline-account/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'A reason for declining is required.' });
        }
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('ID', sql.Int, id)
            .input('Reason', sql.NVarChar, reason)
            .query(`UPDATE Account_Opening_Form SET KYC_Status = 'DECLINED', Decline_Reason = @Reason WHERE ID = @ID`);
        res.status(200).json({ message: 'Application has been declined.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to decline application.' });
    }
});

app.get('/api/approved-accounts', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`SELECT b.Account_Number, ah.Account_Holder_Name, b.Account_Type, b.Current_Balance, b.Account_Opening_Date FROM Bank b JOIN Account_Holder_Details ah ON b.Account_Number = ah.Account_Number ORDER BY b.Account_Opening_Date DESC`);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch approved accounts.' });
    }
});

app.post('/api/admin/make-transaction', async (req, res) => {
    try {
        const { accountNumber, paymentType, amount } = req.body;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Account_Number', sql.BigInt, accountNumber)
            .input('Payment_Type', sql.VarChar, paymentType)
            .input('Transaction_Amount', sql.Decimal(10, 2), amount)
            .execute('Make_Transaction');
        res.status(200).json({ message: 'Transaction posted successfully by admin!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.originalError ? err.originalError.info.message : 'Error processing transaction.' });
    }
});

app.delete('/api/admin/account/:accountNumber', async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('AccountNumber', sql.BigInt, accountNumber)
            .execute('Delete_Account');
        res.status(200).json({ message: `Account ${accountNumber} has been successfully deleted.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete account.' });
    }
});


// =================================================================
// 6. SERVER LISTENER
// =================================================================
const PORT = 3001;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));