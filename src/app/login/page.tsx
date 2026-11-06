import { login } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <form action={login} className="card login-card">
        <h1>KM Dashboard</h1>
        <p className="sub" style={{ margin: 0 }}>เข้าสู่ระบบด้วยอีเมลบริษัท</p>
        {error && <div className="err">อีเมลหรือรหัสผ่านไม่ถูกต้อง</div>}
        <input name="email" type="email" placeholder="อีเมลบริษัท" autoComplete="username" required />
        <input name="password" type="password" placeholder="รหัสผ่าน" autoComplete="current-password" required />
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
    </main>
  );
}
