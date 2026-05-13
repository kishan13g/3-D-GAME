const BASE_URL = 'http://localhost:8000/api';

function getToken() {
  return localStorage.getItem('access_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto refresh on 401
  if (res.status === 401) {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      const refreshRes = await fetch(`${BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('access_token', data.access);
        // Retry
        return request(endpoint, options);
      }
    }
    localStorage.clear();
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

const get  = (url)          => request(url);
const post = (url, body)    => request(url, { method: 'POST',  body: JSON.stringify(body) });
const patch= (url, body)    => request(url, { method: 'PATCH', body: JSON.stringify(body) });

// ─── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => post('/auth/register/', data),
  login:    (data) => post('/auth/login/',    data),
  me:       ()     => get('/auth/me/'),
  logout:   (refresh) => post('/auth/logout/', { refresh }),
};

// ─── Bets ─────────────────────────────────────────────────────
export const betsAPI = {
  placeBet:   (data) => post('/bets/place/', data),
  myBets:     ()     => get('/bets/my/'),
  openDraws:  ()     => get('/bets/draws/open/'),
  pastDraws:  ()     => get('/bets/draws/past/'),
};

// ─── Wallet ───────────────────────────────────────────────────
export const walletAPI = {
  myWallet:   ()      => get('/wallet/my/'),
  deposit:    (data)  => post('/wallet/deposit/',  data),
  withdraw:   (data)  => post('/wallet/withdraw/', data),
};

// ─── Admin ────────────────────────────────────────────────────
export const adminAPI = {
  stats:          ()               => get('/bets/admin/stats/'),
  users:          ()               => get('/auth/admin/users/'),
  toggleUser:     (id)             => patch(`/auth/admin/users/${id}/toggle/`),
  adjustWallet:   (id, data)       => patch(`/auth/admin/users/${id}/wallet/`, data),
  allBets:        (drawId)         => get(`/bets/admin/all/${drawId ? '?draw_id=' + drawId : ''}`),
  draws:          ()               => get('/bets/admin/draws/'),
  createDraw:     (data)           => post('/bets/admin/draws/create/', data),
  declareResult:  (id, wn)         => post(`/bets/admin/draws/${id}/declare/`, { winning_number: wn }),
  pendingTxns:    ()               => get('/wallet/admin/pending/'),
  approveRejectTxn: (id, action)   => post(`/wallet/admin/txn/${id}/action/`, { action }),
  transactions:   ()               => get('/auth/admin/transactions/'),
};
