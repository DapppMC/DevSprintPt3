# DevSprint Monorepo

Multi-tenant container development project deployed on **Google Cloud Run** with isolated **Supabase PostgreSQL** schemas.

## Branch & Service Mapping

| Branch | Cloud Run Service | Assigned Database User | Database Schema |
| :--- | :--- | :--- | :--- |
| `main` | `app-main` | `postgres` | `main_schema` |
| `student1` | `app-student1` | `student1_user` | `student1` |
| `student2` | `app-student2` | `student2_user` | `student2` |
| `student3` | `app-student3` | `student3_user` | `student3` |

---

## Instructions for Students

1. **Clone the repository:**
   ```bash
   git clone <REPO_URL>
   cd DevSprint
   ```

2. **Switch to your assigned branch:**
   ```bash
   # If you are Student 1:
   git checkout student1
   ```

3. **Install dependencies locally (optional):**
   ```bash
   npm install
   ```

4. **Deploying your changes:**
   Simply commit and push to your assigned branch:
   ```bash
   git add .
   git commit -m "Update student app"
   git push origin <your-branch-name>
   ```
   Google Cloud Build will automatically build and deploy your container within ~1-2 minutes.
