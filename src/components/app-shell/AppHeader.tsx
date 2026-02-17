import { useAuth } from '../../auth/useAuth';
import { getDisplayName } from '../../auth/types';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  onNewGame?: () => void;
}

export function AppHeader({ onNewGame }: AppHeaderProps) {
  const { user, isLoading } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.diamond} aria-hidden="true" />
        <h1 className={styles.title}>Lineup Builder</h1>
      </div>
      {!isLoading && (
        <div className={styles.authSection}>
          {onNewGame && (
            <button
              type="button"
              className={styles.newGameBtn}
              onClick={onNewGame}
            >
              New Game
            </button>
          )}
          <SyncStatusIndicator />
          {user ? (
            <>
              <span className={styles.userName}>{getDisplayName(user)}</span>
              <a
                className={styles.authLink}
                href="/.auth/logout?post_logout_redirect_uri=/"
              >
                Sign out
              </a>
            </>
          ) : (
            <a className={styles.authLink} href="/.auth/login/aad">
              Sign in with Microsoft
            </a>
          )}
        </div>
      )}
    </header>
  );
}
