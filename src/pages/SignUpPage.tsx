import AuthPage from './AuthPage';

// Thin wrapper so /signup can render the same Auth experience, defaulted to sign-up mode.
export default function SignUpPage() {
  return <AuthPage initialMode="signup" />;
}

