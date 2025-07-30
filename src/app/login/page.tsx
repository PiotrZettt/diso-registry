import LoginForm from '@/components/auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - DeFi ISO Registry',
  description: 'Sign in to your DeFi ISO Registry account',
};

export default function LoginPage() {
  return <LoginForm />;
}
