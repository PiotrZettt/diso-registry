import RegisterForm from '@/components/auth/RegisterForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - DeFi ISO Registry',
  description: 'Create your DeFi ISO Registry account',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
