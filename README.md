# 🚀 DevSprint Multi-Tenant Container Lab

Welcome to the **DevSprint** project! This repository powers a multi-tenant cloud setup on **Google Cloud Platform (GCP)** and **Supabase (PostgreSQL)** designed for independent student development.

---

## 🏗️ Architecture Overview

Each student works on their own dedicated Git branch. Pushing to your branch **automatically builds and deploys your own private container on GCP Cloud Run** while sharing a single Supabase database with zero data conflicts:

```
                      GitHub Monorepo
                             │
     ┌───────────────┬───────┴───────┬───────────────┐
     ▼               ▼               ▼               ▼
   main          student1        student2        student3
 (Instructor)        │               │               │
     │               │ (git push)    │ (git push)    │ (git push)
     ▼               ▼               ▼               ▼
Cloud Run:      Cloud Run:      Cloud Run:      Cloud Run:
 app-main      app-student1    app-student2    app-student3
     │               │               │               │
     └───────────────┼───────────────┼───────────────┘
                     ▼
          [Shared Supabase Database]
        ┌─────────────────────────────┐
        │ ├── schema "main_schema"    │
        │ ├── schema "student1"       │
        │ ├── schema "student2"       │
        │ └── schema "student3"       │
        └─────────────────────────────┘
```

---

## 👥 Branch & Service Mapping

| Branch | Cloud Run Service | Assigned Schema | Purpose |
| :--- | :--- | :--- | :--- |
| **`main`** | `app-main` | `main_schema` | Baseline reference code (Instructor) |
| **`student1`** | `app-student1` | `student1` | Student 1 workspace |
| **`student2`** | `app-student2` | `student2` | Student 2 workspace |
| **`student3`** | `app-student3` | `student3` | Student 3 workspace |

---

## 🔒 How Database Schema Isolation Works

You don't need to write complex SQL or worry about corrupting another student's tables.

When your Cloud Run container boots, it receives a `DATABASE_URL` configured for your schema. `server.js` sets the PostgreSQL search path:
```sql
SET search_path TO "your_schema", public;
```

### What this means for you:
* When you write:
  ```sql
  CREATE TABLE notes (...);
  SELECT * FROM notes;
  ```
  PostgreSQL automatically creates and queries **`<your_schema>.notes`**.
* Even if everyone creates a table named `notes` or `users`, they exist in **completely isolated schemas**. You will never see or overwrite each other's data!

---

## 💻 Quickstart for Students

### 1. Clone the repository
```bash
git clone https://github.com/padinadi01/DevSprintPt3.git
cd DevSprintPt3
```

### 2. Switch to your assigned branch
```bash
# If you are Student 1:
git checkout student1

# If you are Student 2:
git checkout student2

# If you are Student 3:
git checkout student3
```

### 3. Set up environment variables locally
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=8080
APP_NAME=Student 1 Service
DATABASE_URL=postgresql://postgres.kdepzstxneeufegoogrf:zhZFsaubb3efb161@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?schema=student1
```
*(Replace `?schema=student1` with your assigned schema name).*

### 4. Install dependencies and run locally
```bash
npm install
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser. You will see the live interactive dashboard and test adding items to your database!

---

## 🚀 How to Deploy Your Changes

Deploying is as simple as running `git push`:

```bash
# 1. Stage and commit your code
git add .
git commit -m "Add new student feature"

# 2. Push to your assigned branch
git push origin student1    # (replace student1 with your branch)
```

**That's it!** Google Cloud Build will automatically detect your push, build your Docker container, and deploy it to Cloud Run in about **90 seconds**.

---

## 📡 Included API Endpoints

The baseline project comes with ready-to-use REST API endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Web dashboard with live schema information & CRUD UI |
| `GET` | `/api/health` | Health check for Cloud Run monitoring |
| `GET` | `/api/schema-info` | Returns current database user, active schema, and tables |
| `GET` | `/api/notes` | Returns all items from your schema's `notes` table |
| `POST` | `/api/notes` | Inserts a new note (`{"title": "...", "content": "..."}`) |
| `DELETE` | `/api/notes/:id` | Deletes a note by its ID |

---

## 🛠️ Modifying the Application

To add your own database table or API:
1. Open [server.js](file:///c:/Users/micha/OneDrive/Documents/Projects/DevSprint/server.js).
2. Use standard SQL with the connection pool:
   ```javascript
   // Example: Fetching custom data
   app.get('/api/my-data', async (req, res) => {
     const result = await pool.query('SELECT * FROM my_table;');
     res.json(result.rows);
   });
   ```
3. Commit and push to your branch!
