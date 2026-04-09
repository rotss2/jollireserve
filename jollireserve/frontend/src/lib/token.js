const KEY= "jr_token";
export function getToken() {
  return localStorage.getItem(KEY);
}

export function setToken(t) {
  localStorage.setItem(KEY, t);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}