export const environment = {
  production: true,
  apiUrl: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api'
};
