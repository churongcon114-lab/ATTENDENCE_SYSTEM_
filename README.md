# Student Attendance System

## Requirements
- Node.js 20+ (khuyên dùng LTS)
- npm
#docker
docker build -t attendance-fe .
docker run --rm -p 8080:80 attendance-fe
Stop : docker stop attendance-fe-web
docker rm attendance-fe-web

## Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
#docker
docker build -t attendance-fe .
docker run --rm -p 8080:80 attendance-fe
Stop : docker stop attendance-fe-web
docker rm attendance-fe-web
