import { User } from '../entities/User';
import { sign } from 'jsonwebtoken';

export const createTokens = (user: User) => {
  const refreshToken = sign(
    { userId: user.id, count: user.count },
    process.env.REFRESH_SECRET!,
    {
      expiresIn: '7d',
    }
  );

  const accessToken = sign({ userId: user.id }, process.env.ACCESS_SECRET!, {
    expiresIn: '60min',
  });

  return { refreshToken, accessToken };
};
