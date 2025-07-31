// 1. IMPORTS
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
// const bcrypt = require('bcryptjs'); // BCRYPT REMOVED
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
        return res.sendStatus(401);
    }

    jwt.verify(token, 'your_jwt_secret_key', (err, user) => {
        if (err) {
            return res.sendStatus(403);
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

// Endpoint to Login
app.post('/api/login', async (req, res) => {
    const { loginId, password } = req.body; 
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('LoginId', sql.VarChar, loginId)
            .query('SELECT * FROM Account_Holder_Details WHERE Account_Number = @LoginId OR Aadhar_Number = @LoginId');

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: 'Account or Aadhar number not found.' });
        }

        // INSECURE: Reverted to plain text password comparison.
        if (password !== user.Password) {
            return res.status(401).json({ message: 'Invalid password.' });
        }
        
        const token = jwt.sign(
            { accountNumber: user.Account_Number, name: user.Account_Holder_Name },
            'your_jwt_secret_key',
            { expiresIn: '1h' }
        );
        res.status(200).json({ message: 'Login successful!', token: token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Endpoint to Open an Account Application
app.post('/api/open-account', async (req, res) => {
    try {
        const { accountType, holderName, dob, aadhar, mobile, balance, address, password } = req.body;
        
        if (balance < 1000) {
            return res.status(400).json({ message: "Opening balance must be at least 1000." });
        }

        // Hashing logic has been removed.
        
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Account_Type', sql.VarChar, accountType)
            .input('Account_Holder_Name', sql.VarChar, holderName)
            .input('DOB', sql.Date, dob)
            .input('Aadhar_Number', sql.VarChar, aadhar)
            .input('Mobile_Number', sql.VarChar, mobile)
            .input('Account_Opening_Balance', sql.Decimal(10, 2), balance)
            .input('Address', sql.VarChar, address)
            .input('Password', sql.NVarChar, password) // Passing the plain text password
            .execute('Open_Account');
            
        res.status(201).json({ message: 'Account application submitted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during application.' });
    }
});


// -----------------------------------------
// -- SECURE CUSTOMER ROUTES (Auth Required)
// -----------------------------------------

// Endpoint to Make a Transaction
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

// Endpoint to Get a Customer's own Account Details
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

// Endpoint to Get a Customer's own Payment Statement
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
// --- Add these two endpoints to server.js ---

// SECURE CUSTOMER ROUTE: A user can delete their own account
app.delete('/api/account', authenticateToken, async (req, res) => {
    try {
        const accountNumber = req.user.accountNumber; // Get account number from the secure token
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

// ADMIN ROUTE: An admin can delete any account
app.delete('/api/admin/account/:accountNumber', async (req, res) => {
    try {
        const { accountNumber } = req.params; // Get account number from the URL
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


// ---------------------------------
// -- ADMIN ROUTES (No Auth Yet)
// ---------------------------------
// ... (admin routes remain the same)
app.get('/api/pending-accounts', async (req, res) => { try { const pool = await sql.connect(dbConfig); const result = await pool.request().query("SELECT ID, Account_Holder_Name, Aadhar_Number FROM Account_Opening_Form WHERE KYC_Status = 'PENDING'"); res.status(200).json(result.recordset); } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to fetch pending accounts.' }); } });
app.post('/api/approve-account/:id', async (req, res) => { try { const { id } = req.params; const pool = await sql.connect(dbConfig); const formResult = await pool.request().input('ID', sql.Int, id).query('SELECT Aadhar_Number FROM Account_Opening_Form WHERE ID = @ID'); const aadharNumber = formResult.recordset[0].Aadhar_Number; await pool.request().input('ID', sql.Int, id).query(`UPDATE Account_Opening_Form SET KYC_Status = 'Approved' WHERE ID = @ID`); const accountResult = await pool.request().input('Aadhar_Number', sql.VarChar, aadharNumber).query('SELECT Account_Number FROM Account_Holder_Details WHERE Aadhar_Number = @Aadhar_Number'); const newAccountNumber = accountResult.recordset[0].Account_Number; res.status(200).json({ message: `Account approved successfully! New Account Number is: ${newAccountNumber}`, accountNumber: newAccountNumber }); } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to approve account.' }); } });
app.get('/api/approved-accounts', async (req, res) => { try { const pool = await sql.connect(dbConfig); const result = await pool.request().query(`SELECT b.Account_Number, ah.Account_Holder_Name, b.Account_Type, b.Current_Balance, b.Account_Opening_Date FROM Bank b JOIN Account_Holder_Details ah ON b.Account_Number = ah.Account_Number ORDER BY b.Account_Opening_Date DESC`); res.status(200).json(result.recordset); } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to fetch approved accounts.' }); } });
app.post('/api/admin/make-transaction', async (req, res) => { try { const { accountNumber, paymentType, amount } = req.body; const pool = await sql.connect(dbConfig); await pool.request().input('Account_Number', sql.BigInt, accountNumber).input('Payment_Type', sql.VarChar, paymentType).input('Transaction_Amount', sql.Decimal(10, 2), amount).execute('Make_Transaction'); res.status(200).json({ message: 'Transaction posted successfully by admin!' }); } catch (err) { console.error(err); res.status(500).json({ message: err.originalError ? err.originalError.info.message : 'Error processing transaction.' }); } });


// =================================================================
// 6. SERVER LISTENER
// =================================================================
const PORT = 3001;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));