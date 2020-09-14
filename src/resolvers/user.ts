import * as bcrypt from 'bcryptjs';
import { createTokens } from '../utils/auth';
import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { User } from '../entities/User';
import { MyContext } from '../types';

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!(req as any).userId) {
      return null;
    }

    return User.findOne((req as any).userId);
  }

  @Mutation(() => Boolean)
  async signUp(@Arg('email') email: string, @Arg('password') password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashedPassword }).save();

    return true;
  }

  @Mutation(() => Boolean)
  async login(
    @Arg('email') email: String,
    @Arg('password') password: string,
    @Ctx() { res }: MyContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return false;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return false;
    }

    const { accessToken, refreshToken } = createTokens(user);

    res.cookie('refresh-token', refreshToken, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    res.cookie('access-token', accessToken, {
      expires: new Date(Date.now() + 1000 * 60 * 60),
    });

    return true;
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { res }: MyContext) {
    res.clearCookie('access-token');
    res.clearCookie('refresh-token');

    return true;
  }

  @Mutation(() => Boolean)
  async invalidateTokens(@Ctx() { req }: MyContext) {
    if (!(req as any).userId) {
      return false;
    }

    const user = await User.findOne((req as any).userId);
    if (!user) {
      return false;
    }

    user.count += 1;
    await user.save();

    return true;
  }
}
