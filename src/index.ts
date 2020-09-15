import 'reflect-metadata';
import { ApolloServer } from 'apollo-server-express';
import { createConnection } from 'typeorm';
import express from 'express';
import path from 'path';
import { buildSchema } from 'type-graphql';
import { CategoryResolver } from './resolvers/category';
import { Category } from './entities/Category';
import { Recipe } from './entities/Recipe';
import { RecipeResolver } from './resolvers/recipe';
import { User } from './entities/User';
import dotenv from 'dotenv';
import { UserResolver } from './resolvers/user';
import cookieParser from 'cookie-parser';
import { verify } from 'jsonwebtoken';
import { createTokens } from './utils/auth';

declare global {
  namespace Express {
    export interface Request {
      userId?: number;
    }
  }
}

(async () => {
  dotenv.config();

  const conn = await createConnection({
    type: 'postgres',
    database: 'recipes',
    username: 'facundo',
    password: '',
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, './migrations/*')],
    entities: [Category, Recipe, User],
  });
  await conn.runMigrations();

  const app = express();

  app.use(cookieParser());

  app.use(async (req: any, res, next) => {
    const accessToken = req.cookies['access-token'];
    const refreshToken = req.cookies['refresh-token'];
    if (!accessToken && !refreshToken) {
      return next();
    }

    try {
      const data = verify(accessToken, process.env.ACCESS_SECRET!) as any;
      req.userId = data.userId;
      return next();
    } catch {}

    if (!refreshToken) {
      return next();
    }

    let data;

    try {
      data = verify(refreshToken, process.env.REFRESH_SECRET!) as any;
    } catch {
      return next();
    }

    const user = await User.findOne(data.userId);

    // token has been invalidated
    if (!user || user.count !== data.count) {
      return next();
    }

    const tokens = createTokens(user);

    res.cookie('refresh-token', tokens.refreshToken, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    res.cookie('access-token', tokens.accessToken, {
      expires: new Date(Date.now() + 1000 * 60 * 15),
    });

    req.userId = user.id;

    return next();
  });

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [CategoryResolver, RecipeResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
    }),
  });

  apolloServer.applyMiddleware({
    app,
  });

  app.listen(4000, () => {
    console.log('server started on localhost:4000');
  });
})();
