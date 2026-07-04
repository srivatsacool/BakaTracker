export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'auth0';
}
