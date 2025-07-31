# 🏦 Bank Management System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tech Stack](https://img.shields.io/badge/tech-Node.js%2C%20Express%2C%20SQL%20Server-brightgreen)
![Status](https://img.shields.io/badge/status-complete-success)

A full-stack web application designed to simulate a modern banking environment, featuring separate, secure portals for both customers and bank administrators.

---
## ✨ Features

This project includes a wide range of features for a complete banking workflow:

#### **👤 Customer Portal**
* **Secure Registration & Login:** New users can register with their details, and log in securely using their Account Number or Aadhar Number.
* **Account Dashboard:** After logging in, users see a summary of their account details, including name, account number, and current balance.
* **Transactions:** Perform secure Credit (deposit) and Debit (withdrawal) transactions. The database prevents overdrafts.
* **Payment Statement:** View a detailed history of all transactions for a specified period.
* **Account Deletion:** Users can securely delete their own account after a confirmation prompt.

#### **🏦 Admin Portal**
* **KYC Management:** View a list of all pending new account applications.
* **Approve/Decline:** Approve new accounts (which generates the account number) or decline them with a required reason.
* **Account Overview:** View a table of all active, approved accounts in the bank.
* **Admin Transactions:** Post transactions (deposits/withdrawals) on behalf of any customer.
* **Admin Deletion:** Securely delete any customer account from the system.

#### **🔐 Security**
* **JWT Authentication:** Uses JSON Web Tokens for secure, stateless user sessions after login.
* **Protected Routes:** API endpoints are protected with middleware, ensuring a logged-in user can only access their own data.
* **Data Integrity:** Database-level rules (triggers and constraints) enforce business logic like preventing negative balances and ensuring unique Aadhar numbers.

---
## 🛠️ Tech Stack

* **Backend:** **Node.js**, **Express.js**
* **Database:** **Microsoft SQL Server**
* **Frontend:** **HTML5**, **CSS3**, **Vanilla JavaScript (ES6+)**
* **Authentication:** **JSON Web Tokens (JWT)**
* **UI Notifications:** **SweetAlert2**

---
## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites
* **Node.js** (v16 or higher)
* **SQL Server** (2019 or higher) with SSMS

### Installation
1.  **Clone the repository:**
    ```sh
    git clone [https://your-repository-url.git](https://your-repository-url.git)
    cd your-project-folder
    ```
2.  **Install NPM packages:**
    ```sh
    npm install
    ```
3.  **Database Setup:**
    * Open SQL Server Management Studio (SSMS).
    * Open the `database_setup.sql` file.
    * Execute the entire script to create the database, tables, stored procedures, and triggers.

4.  **Configure Environment Variables:**
    * In the root of the project, update the `dbConfig` object in `server.js` with your SQL Server credentials.

5.  **Run the Application:**
    * **Start the backend server:**
        ```sh
        node server.js
        ```
        Your API will be running on `http://localhost:3001`.
    * **Start the frontend:**
        * Make sure you have the **Live Server** extension installed in VS Code.
        * Right-click on `public/login.html` and select "Open with Live Server".

---
## 📋 API Endpoints

A brief overview of the available API endpoints:

| Method | Endpoint                             | Description                                  | Protected |
| :----- | :----------------------------------- | :------------------------------------------- | :-------- |
| `POST` | `/api/login`                         | Logs in a user and returns a JWT.            | No        |
| `POST` | `/api/open-account`                  | Submits a new account application.           | No        |
| `GET`  | `/api/application-status/:aadhar`    | Checks the status of an application.         | No        |
| `POST` | `/api/make-transaction`              | Makes a transaction for the logged-in user.  | **Yes** |
| `GET`  | `/api/account-details`               | Gets details for the logged-in user.         | **Yes** |
| `GET`  | `/api/payment-statement/:months`     | Gets a statement for the logged-in user.     | **Yes** |
| `DELETE`| `/api/account`                       | Deletes the logged-in user's account.        | **Yes** |
| `GET`  | `/api/pending-accounts`              | **[Admin]** Gets all pending applications.   | No        |
| `POST` | `/api/approve-account/:id`           | **[Admin]** Approves an application.         | No        |
| `POST` | `/api/decline-account/:id`           | **[Admin]** Declines an application.         | No        |
| `GET`  | `/api/approved-accounts`             | **[Admin]** Gets all approved accounts.      | No        |
| `POST` | `/api/admin/make-transaction`        | **[Admin]** Posts a transaction for a user.  | No        |
| `DELETE`| `/api/admin/account/:accountNumber`  | **[Admin]** Deletes a user account.          | No        |

---
---
## 🖼️ Screenshots

Here are a few glimpses of the application in action:

### Login Page
Welcome to the secure entry point of our Bank Management System.

<img width="90%" alt="Login Page" src="https://github.com/user-attachments/assets/ffab00b1-aca0-498f-a989-748680db7b44" />

### Account Creation Page
Prospective customers can easily submit their account opening application through this intuitive form.

<img width="90%" alt="Account Creation Page" src="https://github.com/user-attachments/assets/bceef2a0-348a-4d4b-bf48-0a81d7638a2f" />

### Customer Portal
Logged-in customers can view their account summary, make transactions, and manage their finances.

<img width="90%" alt="Customer View Page" src="https://github.com/user-attachments/assets/b74d5d64-7a27-40af-ab96-1497b3b5a9ba" />

### Bank Admin Portal
Bank administrators have a comprehensive view of accounts and can manage applications efficiently.

<img width="90%" alt="Bank View Page" src="https://github.com/user-attachments/assets/7989a4f0-f379-4a8a-8248-e5abc64c2e10" />

**Experience the full set of features by cloning the repository and running the project locally!**
