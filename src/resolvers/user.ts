import * as bcrypt from 'bcryptjs';
import { createTokens } from '../utils/auth';
import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
  ObjectType,
  Field,
} from 'type-graphql';
import { User } from '../entities/User';
import { MyContext } from '../types';
import { isAuth } from '../middleware/isAuth';
import FieldError from '../utils/fieldError';

@ObjectType()
class Response {
  @Field(() => FieldError, { nullable: true })
  errors?: FieldError;

  @Field(() => Boolean)
  result: boolean;
}

const validateEmail = (email: string): boolean => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
};

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  @UseMiddleware(isAuth)
  me(@Ctx() { req }: MyContext) {
    return User.findOne(req.userId);
  }

  @Mutation(() => Response)
  async signUp(
    @Arg('email') email: string,
    @Arg('password') password: string
  ): Promise<Response> {
    const valid = validateEmail(email);

    if (!valid) {
      return {
        errors: { field: 'email', message: 'invalid email' },
        result: false,
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashedPassword }).save();

    return { result: true };
  }

  @Mutation(() => Response)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() { res }: MyContext
  ): Promise<Response> {
    const validEmail = validateEmail(email);

    if (!validEmail) {
      return {
        errors: { field: 'email', message: 'invalid email' },
        result: false,
      };
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return { result: false };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { result: false };
    }

    const { accessToken, refreshToken } = createTokens(user);

    res.cookie('refresh-token', refreshToken, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    res.cookie('access-token', accessToken, {
      expires: new Date(Date.now() + 1000 * 60 * 60),
    });

    return { result: true };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  logout(@Ctx() { res }: MyContext) {
    res.clearCookie('access-token');
    res.clearCookie('refresh-token');

    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async invalidateTokens(@Ctx() { req }: MyContext) {
    const user = await User.findOne(req.userId);
    if (!user) {
      return false;
    }

    user.count += 1;
    await user.save();

    return true;
  }
}
