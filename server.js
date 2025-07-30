const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- ⚠️ UPDATE THIS SECTION ---
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

sql.connect(dbConfig).then(() => console.log('Connected to SQL Server!')).catch(err => console.error('Database Connection Failed!', err));

// == API ENDPOINTS ==

// Endpoint to Open an Account Application
app.post('/api/open-account', async (req, res) => {
    try {
        const { accountType, holderName, dob, aadhar, mobile, balance, address } = req.body;
        if (balance < 1000) return res.status(400).json({ message: "Opening balance must be at least 1000." });
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Account_Type', sql.VarChar, accountType)
            .input('Account_Holder_Name', sql.VarChar, holderName)
            .input('DOB', sql.Date, dob)
            .input('Aadhar_Number', sql.VarChar, aadhar)
            .input('Mobile_Number', sql.VarChar, mobile)
            .input('Account_Opening_Balance', sql.Decimal(10, 2), balance)
            .input('Address', sql.VarChar, address)
            .execute('Open_Account');
        res.status(201).json({ message: 'Account application submitted successfully!' });
    } catch (err) { res.status(500).json({ message: 'Server error.' }); }
});

// Endpoint to Make a Transaction
app.post('/api/make-transaction', async (req, res) => {
    try {
        const { accountNumber, paymentType, amount } = req.body;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Account_Number', sql.BigInt, accountNumber)
            .input('Payment_Type', sql.VarChar, paymentType)
            .input('Transaction_Amount', sql.Decimal(10, 2), amount)
            .execute('Make_Transaction');
        res.status(200).json({ message: 'Transaction successful!' });
    } catch (err) { res.status(500).json({ message: 'Server error.' }); }
});

// Endpoint to Get Account Details
app.get('/api/account-details/:accountNumber', async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('Account_Number', sql.BigInt, accountNumber).execute('Get_Account_Details');
        res.status(200).json(result.recordset[0]);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch account details.' }); }
});

// Endpoint to Get Payment Statement
app.get('/api/payment-statement/:accountNumber/:months', async (req, res) => {
    try {
        const { accountNumber, months } = req.params;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('Months', sql.Int, months).input('AccountNumber', sql.BigInt, accountNumber).execute('Payment_Statement');
        res.status(200).json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch statement.' }); }
});

// Endpoint to Get Pending KYC Applications
app.get('/api/pending-accounts', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT ID, Account_Holder_Name, Aadhar_Number FROM Account_Opening_Form WHERE KYC_Status = 'PENDING'");
        res.status(200).json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Failed to fetch pending accounts.' }); }
});

// Endpoint to Approve an Account
app.post('/api/approve-account/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        await pool.request().query(`UPDATE Account_Opening_Form SET KYC_Status = 'Approved' WHERE ID = ${id}`);
        res.status(200).json({ message: 'Account approved successfully!' });
    } catch (err) { res.status(500).json({ message: 'Failed to approve account.' }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));