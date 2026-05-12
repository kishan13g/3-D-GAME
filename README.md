# Pick-3 Betting Game — Full Stack Setup

## Tech Stack
- Backend:  Django 4.2 + DRF + Simple JWT
- Frontend: React 18 + Vite
- Database: PostgreSQL (SQLite fallback available)

---

## Backend Setup

```bash
cd backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Create PostgreSQL database
psql -U postgres
CREATE DATABASE pick3db;
CREATE USER pick3user WITH PASSWORD 'pick3pass';
GRANT ALL PRIVILEGES ON DATABASE pick3db TO pick3user;
\q

# OR use SQLite (easier for dev):
# Uncomment DATABASES sqlite section in settings.py

# 3. Add __init__.py files
touch pick3_game/__init__.py accounts/__init__.py bets/__init__.py wallet/__init__.py draws/__init__.py
touch accounts/admin.py bets/admin.py wallet/admin.py
touch accounts/apps.py  bets/apps.py  wallet/apps.py

# 4. Run migrations
python manage.py makemigrations accounts bets wallet
python manage.py migrate

# 5. Create admin user
python manage.py shell
>>> from django.contrib.auth.models import User
>>> u = User.objects.create_superuser('admin', 'admin@pick3.com', 'admin123')
>>> u.profile.role = 'admin'
>>> u.profile.save()
>>> exit()

# 6. Start server
python manage.py runserver
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## API Endpoints Summary

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register/ | Register new user |
| POST | /api/auth/login/    | Login → JWT tokens |
| GET  | /api/auth/me/       | Current user info |

### Bets (User)
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/bets/place/      | Place a bet |
| GET  | /api/bets/my/         | My bets history |
| GET  | /api/bets/draws/open/ | Open draws |
| GET  | /api/bets/draws/past/ | Past results |

### Wallet (User)
| Method | URL | Description |
|--------|-----|-------------|
| GET  | /api/wallet/my/       | Balance + transactions |
| POST | /api/wallet/deposit/  | Request deposit |
| POST | /api/wallet/withdraw/ | Request withdrawal |

### Admin
| Method | URL | Description |
|--------|-----|-------------|
| GET  | /api/auth/admin/users/            | All users |
| GET  | /api/bets/admin/stats/            | Stats |
| POST | /api/bets/admin/draws/create/     | Create draw |
| POST | /api/bets/admin/draws/{id}/declare/ | Declare result → auto payout |
| GET  | /api/wallet/admin/pending/        | Pending deposits/withdrawals |
| POST | /api/wallet/admin/txn/{id}/action/ | Approve/Reject txn |

---

## Payout Rules (configurable in settings.py)

| Bet Type | Match | Payout |
|----------|-------|--------|
| Straight | Exact 123 = 123 | 500x |
| Box (6-way) | Any order, all unique: 123 = 321 | 80x |
| Box (3-way) | Any order, pair: 112 = 121 | 160x |
| Front Pair | First 2 digits: 12X | 50x |

---

## Features

### User Panel
- Register / Login (JWT)
- Wallet with deposit/withdrawal requests
- Place bets (Straight / Box / Front Pair)
- View my bet history + results
- See past draw results

### Admin Panel
- Dashboard stats (total bets, payout, house profit)
- Create draws (date + time)
- Declare winning number → auto process all bets + credit winners
- User management + wallet credit/debit
- Approve/reject deposit/withdrawal requests
- View all bets by draw
