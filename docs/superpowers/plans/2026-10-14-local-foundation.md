# Local Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Môi trường local có backend/frontend khởi chạy, SQL bootstrap và hướng dẫn kiểm chứng rõ ràng.

**Architecture:** Express tách config/routes/controllers/services; Sequelize kết nối SQL Server. React/Vite hiển thị trạng thái health thực, database bootstrap có version và archive/audit guards.

**Tech Stack:** Node 22.12+ (máy hiện tại 24), JavaScript ESM, Express 5, Sequelize 6/tedious, React, Vite, Ant Design.

**Spec:** `docs/superpowers/specs/2026-10-14-local-foundation-design.md`.

## Global Constraints

- Theo yêu cầu người dùng trong Prompt: làm trực tiếp main, không worktree/PR, chỉ local.
- Không sửa hai tài liệu nguồn; không overwrite .env hiện có, không commit secrets/node_modules.
- Không tuyên bố AT nghiệp vụ hoặc SQL đã đạt khi chưa thực thi được.

## Task 1: Cấu hình và API nền tảng

- [x] Tạo .gitignore, package/scripts và .env.example; setup sinh JWT ngẫu nhiên, giữ .env cũ.
- [x] Viết và chạy test health/config: API sống không cần DB; readiness 503 khi DB lỗi và 200 khi query thành công; lỗi không lộ thông tin kết nối; không log payload.
- [x] Tạo config/db, controller/service/route health, lỗi chung và server loopback.
- [x] Cài dependencies, chạy npm test và script kiểm tra kết nối DB. (Kết nối DB của app chờ SQL credentials.)

## Task 2: SQL bootstrap và seed

- [x] Tạo database script, schema 12 module, archive tables, triggers, indexes và marker phiên bản.
- [x] Seed 5 roles/6 users/1 branch cùng danh mục tối thiểu trong transaction, bcrypt password, không overwrite user hiện có.
- [x] Kết nối SQLEXPRESS, backup schema cũ, reset bảng theo yêu cầu, chạy SQL/seed và verify trực tiếp.

## Task 3: Frontend và hướng dẫn

- [x] Tạo React/Vite/Ant Design, Axios/Query/Router và trang kiểm tra môi trường responsive.
- [x] Viết README local, kiến trúc module, quick-check HTTP, báo cáo verification.
- [x] npm run build, npm test, smoke SQL/API/frontend; review và sửa lỗi đáng kể.
- [x] Commit riêng file đã tạo lên main; giữ nguyên thay đổi tài liệu nguồn của người dùng.
