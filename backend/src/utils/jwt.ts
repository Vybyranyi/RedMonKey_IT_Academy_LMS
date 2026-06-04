import jwt from 'jsonwebtoken';


export interface TokenPayload {
  userId: string;
  role: 'admin' | 'teacher' | 'student';
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || '', {
    expiresIn: '7d', 
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || '', {
    expiresIn: '7d', 
  });
};