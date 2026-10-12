import { render, screen } from '@testing-library/react';
import App from './App';

test('첫 화면에 로그인 폼이 나온다', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
});
