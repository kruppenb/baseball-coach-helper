import { AuthProvider } from './auth/AuthContext'
import { AppShell } from './components/app-shell/AppShell'

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
