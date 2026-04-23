# Smart Expense Tracker (MERN)

This project is a simple MERN app where you can:

- View your current balance
- Add money (income)
- Add expenses
- See transaction history

## Project Structure

- `server` - Express + MongoDB API
- `client` - React app (Vite)

## 1) Setup Backend

```bash
cd server
npm install
cp .env.example .env
```

Update `.env` with your MongoDB connection string:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/SmartMonry
PORT=5000
```

Run backend:

```bash
npm run dev
```

## 2) Setup Frontend

```bash
cd client
npm install
```

Optional frontend env (`client/.env`):

```env
VITE_API_URL=http://localhost:5000/api
```

Run frontend:

```bash
npm run dev
```

## 3) Run Both Together (from root)

```bash
npm install
npm run dev
```

Open the app URL shown in terminal (usually `http://localhost:5173`).
