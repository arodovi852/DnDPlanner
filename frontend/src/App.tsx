import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MainPage } from './pages/MainPage';
import { ProfilePage } from './pages/ProfilePage';

/**
 * En /main la propia página renderiza su Header (porque la variante
 * visual cambia según el estado de sesión). En el resto de rutas el
 * Header se renderiza globalmente aquí.
 */
function GlobalHeader() {
  const location = useLocation();
  if (location.pathname === '/main') return null;
  return <Header />;
}

/**
 * Componente raíz. Define el layout global y las rutas principales.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
          }}
        >
          <GlobalHeader />

          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/main" replace />} />
              <Route path="/main" element={<MainPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/main" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
