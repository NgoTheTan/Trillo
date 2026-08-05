# Trillo - Project Management Application 📋

Trillo là một ứng dụng quản lý công việc và dự án theo mô hình Kanban (tương tự Trello), hỗ trợ kéo thả thẻ, quản lý bảng công việc, danh sách, bình luận, checklist và cập nhật thời gian thực qua WebSocket.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### **Backend**
- **Language & Framework:** Java 21, Spring Boot 4.1.0
- **Database:** PostgreSQL
- **ORM & Data Access:** Spring Data JPA / Hibernate
- **Security & Auth:** Spring Security, JWT (JSON Web Token)
- **Real-time:** Spring WebSocket (STOMP)
- **API Documentation:** OpenAPI 3.0 / Swagger UI (springdoc-openapi)
- **Build Tool:** Maven

### **Frontend**
- **Framework & Language:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Lucide React Icons
- **State Management:** Zustand, TanStack React Query v5
- **Drag & Drop:** `@hello-pangea/dnd`
- **Routing:** React Router v7/v8
- **Form & Validation:** React Hook Form, Zod
- **Notifications:** React Hot Toast
- **HTTP Client:** Axios

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```text
Trillo/
├── backend/                  # Nguồn mã backend Spring Boot
│   ├── src/                  # Controller, Service, Entity, Repository, Security...
│   ├── pom.xml               # Cấu hình Maven & dependencies
│   └── application.properties# Cấu hình database & app
├── frontend/                 # Nguồn mã frontend React + Vite
│   ├── src/                  # Components, Pages, Hooks, Store, Services...
│   ├── package.json          # Cấu hình npm & dependencies
│   ├── vite.config.ts        # Cấu hình Vite
│   └── index.html            # Entry point HTML
├── .gitignore                # Git ignore root
└── README.md                 # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt Và Chạy Dự Án

### **Yêu Cầu Tiền Đề (Prerequisites)**
- **Java Development Kit (JDK):** Version 21 trở lên
- **Node.js:** Version 18.x trở lên & **npm**
- **PostgreSQL:** Server PostgreSQL đang chạy local hoặc remote

---

### **1. Cấu Hình & Chạy Backend**

1. Chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```

2. Cấu hình cơ sở dữ liệu PostgreSQL trong `src/main/resources/application.properties` (hoặc tạo database tên `trillo_db`):
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/trillo_db
   spring.datasource.username=postgres
   spring.datasource.password=your_password
   ```

3. Biên dịch và khởi chạy Spring Boot application:
   - Sử dụng Maven Wrapper:
     ```bash
     ./mvnw spring-boot:run
     ```
   - Hoặc trên Windows PowerShell:
     ```powershell
     .\mvnw.cmd spring-boot:run
     ```

4. Server Backend sẽ chạy mặc định tại: `http://localhost:8080`
   - Swagger UI API Docs: `http://localhost:8080/swagger-ui.html`

---

### **2. Cấu Hình & Chạy Frontend**

1. Chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```

2. Cài đặt các gói phụ thuộc (Dependencies):
   ```bash
   npm install
   ```

3. Khởi chạy Development Server:
   ```bash
   npm run dev
   ```

4. Truy cập ứng dụng giao diện tại: `http://localhost:5173` (hoặc port do Vite hiển thị).

---

## 📌 Chức Năng Chính (Key Features)

- 🔒 **Xác thực người dùng:** Đăng ký, đăng nhập bảo mật bằng JWT Authentication.
- 🗂️ **Quản lý Bảng (Board):** Tạo, chỉnh sửa, xóa và quản lý các bảng công việc cá nhân hoặc nhóm.
- 📋 **Danh sách & Thẻ (Lists & Cards):** Tạo danh sách công việc và thêm/sửa/xóa các thẻ chi tiết.
- 🖐️ **Drag & Drop:** Kéo thả linh hoạt thẻ giữa các danh sách hoặc thay đổi thứ tự danh sách.
- ☑️ **Checklist & Bình luận:** Theo dõi tiến độ công việc với danh sách kiểm tra và trao đổi qua bình luận.
- ⚡ **Real-time Updates:** Cập nhật thay đổi tức thì giữa các thành viên qua WebSocket.

---

## 📄 Giấy Phép (License)

Dự án được phát triển phục vụ mục đích học tập và nghiên cứu.
