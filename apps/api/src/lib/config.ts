function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

export const config = {
  jwtSecret: required('JWT_SECRET'),
};
