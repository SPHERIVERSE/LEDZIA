# LEDZIA 🎓
**Next-Generation Institutional Attendance Management System**

Traditional institutional attendance tracking suffers from severe inefficiencies, consuming valuable instructional time and remaining vulnerable to human error and proxy attendance. **LEDZIA** is a cloud-native, highly secure attendance management ecosystem built to bridge the gap between administrative compliance and classroom efficiency.

By providing faculty with a dual-mode capture system—a high-speed **Manual Roster** and a cryptographically secure, rolling **QR Code** engine—LEDZIA eliminates administrative friction while guaranteeing absolute data integrity. Coupled with instant Excel/CSV data exports, bulk student enrollment, and real-time performance analytics, LEDZIA modernizes the classroom experience from the ground up.

---

## 📐 Software Engineering Principles

LEDZIA was architected with a rigorous focus on enterprise-grade software engineering methodologies to ensure scalability, security, and maintainability.

### 1. Iterative & Incremental SDLC (Agile)
Instead of a rigid Waterfall approach, development followed an Iterative and Incremental lifecycle. This allowed for the continuous integration of complex modules—such as the cryptographic QR engine and client-side CSV parsing—without halting the deployment of core MVP features like manual attendance capture and user authentication.

### 2. Separation of Concerns (SoC)
The backend architecture strictly decouples the application into distinct layers:
* **Controllers (Routing):** Intercept network requests and validate input payload parameters.
* **Services (Business Logic):** Handle complex transactional logic, token generation, and authorization checks.
* **Repositories (Data Access):** Managed entirely by Prisma ORM to abstract SQL queries and ensure type safety.

### 3. Database Normalization & Integrity (3NF)
The relational schema adheres to the Third Normal Form (3NF) to eliminate data redundancy. 
* **Parent-Child Isolation:** A class `Session` (the specific event) is isolated from the `AttendanceRecord` (the individual student's status).
* **Hardware-Level Constraints:** A compound unique constraint (`@@unique([sessionId, studentId])`) acts as an impenetrable wall, physically preventing the database from ever accepting duplicate attendance states, regardless of network race conditions or frontend bugs.

### 4. Fail-Soft Engineering & Transactional Batching
System reliability is prioritized through "Fail-Soft" mechanisms.
* **Bulk CSV Import:** Utilizes encapsulated error handling to ensure that a single malformed row (e.g., a duplicate roll number) does not crash an entire 100-student batch process.
* **Atomic Transactions:** Manual mode saves entire classroom rosters simultaneously. If a network failure occurs midway, the transaction rolls back, preventing corrupted or half-saved attendance lists.

### 5. Security by Design ("Stub Account" Pattern)
Security was built into the foundational data model, not tacked on at the end. To facilitate bulk CSV enrollments, the schema allows for "Stub Accounts" with mathematically `null` passwords. These pre-provisioned accounts cannot be compromised via brute-force attacks and can only be claimed via a secure email OTP verification flow.


## ✨ Core Features

* **Cryptographic QR Engine (Automated Mode):** A Rolling Authentication Protocol for large lecture halls. It projects a time-sensitive, cryptographically signed JWT (JSON Web Token) that rotates every 10 seconds. The server enforces a 35-second Time-To-Live (TTL) to absorb network latency while mathematically blocking remote proxy attacks.
* **High-Speed Manual Roster (Fallback Mode):** A robust manual interface utilizing offline-ready client state management. It executes atomic backend batch-processing to save entire classroom rosters in a single database transaction, preventing orphaned or corrupted data.
* **Intelligent Bulk Enrollment:** Drag-and-drop `.csv` and `.xlsx` uploads processed entirely client-side using `SheetJS`. The system normalizes messy headers (e.g., matching "Email Address" to "email") before securely sending the payload to the server.
* **Real-Time Analytics & Matrix Export:** Instant, single-click generation of matrix-formatted attendance grids (columns representing dates, rows representing students). Outputs directly to ERP-ready Excel files without touching the backend server.

---

## 🛠️ Technology Stack

**Frontend Architecture (Client)**
* **Framework:** [Next.js](https://nextjs.org/) (React)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Premium Glassmorphism UI)
* **Data Parsing:** `xlsx` (SheetJS) for zero-latency client-side spreadsheet extraction
* **State & Networking:** React Hooks, Axios

**Backend Architecture (Server)**
* **Framework:** [NestJS](https://nestjs.com/) (Node.js) - Enforcing strict modularity
* **Security:** `bcrypt` (Hashing) & `@nestjs/jwt` (Stateless Authorization)
* **API Design:** RESTful architecture with custom Guards and Interceptors

**Database Layer**
* **RDBMS:** [PostgreSQL](https://www.postgresql.org/)
* **ORM:** [Prisma](https://www.prisma.io/) for strictly typed database querying
* **Architecture:** Adheres to 3NF, utilizing cascading deletions and compound constraints (`@@unique`) for uncompromisable data integrity.

---

# 🚀 Getting Started (Local Development)



## Prerequisites



Before you begin, ensure you have the following installed on your machine:



* **Node.js** (v18 or higher)

* **PostgreSQL** (Local instance or a cloud provider like Supabase or Neon)

* A package manager (`npm`, `yarn`, or `pnpm`)



---



## 1. Clone the Repository



```bash

git clone https://github.com/yourusername/ledzia.git

cd ledzia

```



---



## 2. Backend Setup



Navigate to the backend directory, install dependencies, and configure your database.



```bash

cd apps/backend

npm install



# Duplicate the example environment file

cp .env.example .env

```



Open the backend `.env` file and configure:



* `DATABASE_URL` → PostgreSQL connection string

* `JWT_SECRET` → Secure cryptographic secret key



Run the database migrations and generate the Prisma client:



```bash

# Apply Prisma migrations

npx prisma migrate dev --name init



# Generate Prisma Client

npx prisma generate

```



Start the NestJS development server:



```bash

npm run start:dev

```



---



## 3. Frontend Setup



Open a new terminal window and navigate to the frontend directory.



```bash

cd apps/frontend

npm install



# Duplicate the example environment file

cp .env.example .env.local

```



Open `.env.local` and ensure:



```env

NEXT_PUBLIC_API_URL=http://localhost:3001

```



> If testing on physical devices, replace the URL with your Ngrok tunnel URL.



Start the Next.js development server:



```bash

npm run dev

```



The application will now be available at:



```text

http://localhost:3000

```



---



# 🔒 Security & Architecture Principles



LEDZIA was built using an **Iterative and Incremental SDLC** with a strong emphasis on enterprise-grade software engineering practices and **Fail-Soft** system design.



## Data Immutability (Hardware-Level)



The database relies on strict compound unique constraints:



```prisma

@@unique([sessionId, studentId])

```



Rather than application-level `if/else` checks, these constraints ensure attendance records **cannot be duplicated**, even under heavy network load or race conditions.



---



## Secure Pre-Provisioning (Stub Accounts)



Bulk-enrolled students are created with **null passwords**.



This ensures that accounts remain inaccessible and immune to brute-force attacks until they are officially claimed and verified through the institutional OTP onboarding process.



---



## Transactional Batching



Manual attendance saves are executed as **single atomic database transactions**.



If a network failure occurs while saving a large class roster (e.g., 100 students), the entire transaction rolls back automatically, preventing:



* Partial saves

* Corrupted records

* Fragmented attendance data



---



# 🗺️ Roadmap & Future Scope



While the MVP focuses on core attendance management, the architecture is designed to scale into a broader institutional platform.



## Planned Features



* [ ] **Biometric Hardware Integration**



  * Extend session verification to support RFID readers and fingerprint scanners.



* [ ] **Institution Manager Panel**



  * Introduce multi-tenancy and role-based analytics for Department Heads and administrators.



* [ ] **Automated Warning System**



  * Scheduled CRON jobs to automatically flag and notify students who fall below the mandatory attendance threshold.



---



# 👥 Contributors



## 👥 Contributors

| Name | Roll No. | Role / Contribution |
| :--- | :--- | :--- |
| **Kukil Nath** | 230710007028 | Lead Web Developer & Manual Attendance Module |
| **Kaushik Nath** | 230710007024 | System Architect & Cryptographic QR Security |
| **Himangshu Das** | 230710007015 | Database Architecture & Relational Schema Design |
| **Abhinav Pritam Neog** | 230711507071 | Prisma ORM Integration & Transaction Optimization |

---



# 📄 License



This project is licensed under the **MIT License**.