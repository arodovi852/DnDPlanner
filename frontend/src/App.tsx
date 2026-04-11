import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CampaignProvider } from './context/CampaignContext';
import { UsersProvider } from './context/UsersContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MainPage } from './pages/MainPage';
import { ProfilePage } from './pages/ProfilePage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CreatorSelectorPage } from './pages/CreatorSelectorPage';
import { ChapterSelectorPage } from './pages/ChapterSelectorPage';
import { CharacterSelectorPage } from './pages/CharacterSelectorPage';
import { CharacterSheetPage } from './pages/CharacterSheetPage';
import { ChapterOrCharacterPage } from './pages/ChapterOrCharacterPage';
import { ChapterPage } from './pages/ChapterPage';
import { UsersPage } from './pages/UsersPage';
import { InvitePage } from './pages/InvitePage';

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
      <UsersProvider>
        <CampaignProvider>
          <BrowserRouter>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
              }}
            >
              <GlobalHeader />

              <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/main" replace />} />
                  <Route path="/main" element={<MainPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/creatorSelector" element={<CreatorSelectorPage />} />
                  <Route path="/chapterOrCharacter" element={<ChapterOrCharacterPage />} />
                  <Route path="/chapterSelector" element={<ChapterSelectorPage />} />
                  <Route path="/characterSelector" element={<CharacterSelectorPage />} />
                  <Route path="/character/:characterId" element={<CharacterSheetPage />} />
                  <Route path="/chapter/:chapterId" element={<ChapterPage />} />
                  <Route path="/invite/:token" element={<InvitePage />} />
                  <Route path="*" element={<Navigate to="/main" replace />} />
                </Routes>
              </main>

              <Footer />
            </div>
          </BrowserRouter>
        </CampaignProvider>
      </UsersProvider>
    </AuthProvider>
  );
}

export default App;
