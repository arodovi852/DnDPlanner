import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MainPage } from './pages/MainPage';
import { ProfilePage } from './pages/ProfilePage';

/**
 * Componente raíz. Define el layout global (Header + contenido + Footer)
 * y las rutas principales de la aplicación.
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
            padding: 'var(--space-md)',
            gap: 'var(--space-md)',
          }}
        >
          <Header />

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
