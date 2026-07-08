import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CharactersPage } from './pages/CharactersPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { GalleryPage } from './pages/GalleryPage';
import { CameraPage } from './pages/CameraPage';
import { AdminPage } from './pages/AdminPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StoriesPage } from './pages/StoriesPage';
import { StoryCreatePage } from './pages/StoryCreatePage';
import { StoryDetailPage } from './pages/StoryDetailPage';
import { StoryReaderPage } from './pages/StoryReaderPage';
import { PublicStoriesPage } from './pages/PublicStoriesPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<CharactersPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/camera" element={<CameraPage />} />
            <Route path="/chat/:characterId" element={<ChatPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/stories/create" element={<StoryCreatePage />} />
            <Route path="/stories/public" element={<PublicStoriesPage />} />
            <Route path="/stories/:storyId" element={<StoryDetailPage />} />
            <Route path="/stories/:storyId/read/:chapterNumber?" element={<StoryReaderPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
