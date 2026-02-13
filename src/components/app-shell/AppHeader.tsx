import { useAuth } from '../../auth/useAuth';
import { getDisplayName } from '../../auth/types';
import styles from './AppHeader.module.css';

export function AppHeader() {
  const { user, isLoading } = useAuth();

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Lineup Builder</h1>
      {!isLoading && (
        <div className={styles.authSection}>
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
