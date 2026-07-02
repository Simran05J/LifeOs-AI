import { useState } from 'react';
import PropTypes from 'prop-types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

function LoginPage({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Please enter a valid email';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (validate()) {
      onSubmit?.({ email, password });
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card" title="Welcome back" subtitle="Sign in to continue to LifeOS AI">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) {
                setErrors((current) => ({ ...current, email: '' }));
              }
            }}
            error={errors.email}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) {
                setErrors((current) => ({ ...current, password: '' }));
              }
            }}
            error={errors.password}
          />

          <div className="auth-links">
            <a href="#" className="auth-link">Forgot password?</a>
          </div>

          <Button type="submit" className="auth-submit">Login</Button>

          <p className="auth-footer">
            Don&apos;t have an account? <a href="#" className="auth-link">Sign up</a>
          </p>
        </form>
      </Card>
    </div>
  );
}

LoginPage.propTypes = {
  onSubmit: PropTypes.func,
};

export default LoginPage;
