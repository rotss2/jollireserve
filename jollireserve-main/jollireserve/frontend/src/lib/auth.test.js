import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules before importing the module under test
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('./token', () => ({
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
}));

import api from './api';
import { setToken, clearToken, getToken } from './token';
import { login, signup, logout, getMe } from './auth';

// Helper to reset mocks
const resetAll = () => {
  vi.clearAllMocks();
};

describe('auth lib', () => {
  beforeEach(() => {
    resetAll();
  });

  it('should call API with correct endpoint and payload for login', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 't1', user: { id: 1, email: 'a@b.com' } } });

    await login('a@b.com', 'pw');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pw' });
  });

  it('should set token and return user on successful login', async () => {
    const user = { id: 2, email: 'user@test.com' };
    api.post.mockResolvedValueOnce({ data: { token: 'jwt-token', user } });

    const result = await login('user@test.com', 'secret');

    expect(setToken).toHaveBeenCalledWith('jwt-token');
    expect(result).toEqual(user);
  });

  it('should call API with correct endpoint and payload for signup', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 't2', user: { id: 3, email: 'n@e.com' } } });

    await signup('Name', 'n@e.com', 'pw');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/register', { name: 'Name', email: 'n@e.com', password: 'pw' });
  });

  it('should set token and return user on successful signup', async () => {
    const user = { id: 10, email: 'new@test.com' };
    api.post.mockResolvedValueOnce({ data: { token: 'signup-token', user } });

    const result = await signup('New', 'new@test.com', 'pw');

    expect(setToken).toHaveBeenCalledWith('signup-token');
    expect(result).toEqual(user);
  });

  it('should call clearToken on logout', async () => {
    await logout();
    expect(clearToken).toHaveBeenCalledTimes(1);
  });

  it('should return null from getMe when no token is present', async () => {
    getToken.mockReturnValueOnce(null);

    const result = await getMe();

    expect(result).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should call /auth/me when token exists in getMe', async () => {
    getToken.mockReturnValueOnce('abc123');
    api.get.mockResolvedValueOnce({ data: { user: { id: 5 } } });

    await getMe();

    expect(api.get).toHaveBeenCalledTimes(1);
    const [url] = api.get.mock.calls[0];
    expect(url).toBe('/auth/me');
  });

  it('should return res.data.user when available in getMe', async () => {
    getToken.mockReturnValueOnce('tok');
    const user = { id: 7, email: 'x@y.com' };
    api.get.mockResolvedValueOnce({ data: { user } });

    const result = await getMe();

    expect(result).toEqual(user);
  });

  it('should fall back to res.data when res.data.user is undefined in getMe', async () => {
    getToken.mockReturnValueOnce('tok');
    const data = { id: 8, email: 'fallback@y.com' };
    api.get.mockResolvedValueOnce({ data });

    const result = await getMe();

    expect(result).toEqual(data);
  });

  it('should propagate API errors and not set token on failed login/signup/getMe', async () => {
    // login failure
    api.post.mockRejectedValueOnce(new Error('login failed'));
    await expect(login('a', 'b')).rejects.toThrow('login failed');
    expect(setToken).not.toHaveBeenCalled();

    // signup failure
    api.post.mockRejectedValueOnce(new Error('signup failed'));
    await expect(signup('n', 'e', 'p')).rejects.toThrow('signup failed');
    expect(setToken).not.toHaveBeenCalled();

    // getMe failure
    getToken.mockReturnValueOnce('tok');
    api.get.mockRejectedValueOnce(new Error('getMe failed'));
    await expect(getMe()).rejects.toThrow('getMe failed');
  });
});
