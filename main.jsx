// Login component доторх submit function-ийг БҮТНЭЭР нь устгаад
// доорх кодоор солиорой.

async function submit(e) {
  e.preventDefault();
  setError('');

  // ===== DEMO LOGIN (Backend шаардлагагүй) =====
  // admin@demo.mn / password123
  // cashier@demo.mn / password123
  // accountant@demo.mn / password123

  const demoUsers = {
    'admin@demo.mn': {
      id: 'demo-admin',
      name: 'Admin',
      email: 'admin@demo.mn',
      role: 'admin'
    },
    'cashier@demo.mn': {
      id: 'demo-cashier',
      name: 'Cashier',
      email: 'cashier@demo.mn',
      role: 'cashier'
    },
    'accountant@demo.mn': {
      id: 'demo-accountant',
      name: 'Accountant',
      email: 'accountant@demo.mn',
      role: 'accountant'
    }
  };

  // Нууц үг бүгдэд нь password123
  if (demoUsers[email] && password === 'password123') {
    const user = demoUsers[email];

    // Demo token хадгалах
    localStorage.setItem('token', 'demo-token-' + Date.now());
    localStorage.setItem('user', JSON.stringify(user));

    // App руу нэвтрүүлэх
    onLogin(user);
    return;
  }

  // Хэрэв буруу мэдээлэл оруулбал
  setError('Имэйл эсвэл нууц үг буруу байна');

  // ===== Жинхэнэ Backend API ашиглах код (дараа нь хэрэглэх боломжтой) =====
  /*
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password
      })
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    onLogin(data.user);
  } catch (err) {
    setError(err.message || 'Нэвтрэх үед алдаа гарлаа');
  }
  */
}
