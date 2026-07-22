# Backend setup (monorepo)

Backend lives in `../backend` relative to this file’s parent docs folder, i.e. repo root `backend/`.

Upstream basis: https://github.com/gurkanfikretgunak/masterfabric-go  
Local product copy: `backend/` (no nested `.git`)

## Run

```bash
cd backend
cp .env.example.studio .env
./dev.sh infra && ./dev.sh migrate
go run scripts/seed.go
make run
```

Pair with frontend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```
