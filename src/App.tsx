import { AuthProvider } from './auth/AuthContext'
import { SyncProvider } from './sync/SyncContext'
import { AppShell } from './components/app-shell/AppShell'

function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <AppShell />
      </SyncProvider>
    </AuthProvider>
  )
}

export default App
