import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Int,
  UseMiddleware,
} from 'type-graphql';
import { Category } from '../entities/Category';
import { getConnection, Like } from 'typeorm';
import { isAuth } from '../middleware/isAuth';

@Resolver()
export class CategoryResolver {
  @Query(() => Category, { nullable: true })
  @UseMiddleware(isAuth)
  getOneCategory(@Arg('id', () => Int) id: number) {
    return Category.findOne({ id });
  }

  @Query(() => [Category])
  @UseMiddleware(isAuth)
  getCategories(@Arg('term', { nullable: true }) term: string) {
    if (term) {
      return Category.find({
        where: { name: Like(`%${term}%`) },
      });
    }

    return Category.find();
  }

  @Mutation(() => Category)
  @UseMiddleware(isAuth)
  createCategory(@Arg('name') name: string) {
    return Category.create({ name }).save();
  }

  @Mutation(() => Category)
  @UseMiddleware(isAuth)
  async updateCategory(
    @Arg('id', () => Int) id: number,
    @Arg('name') name: string
  ) {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Category)
      .set({ name })
      .where('id = :id', { id })
      .returning('*')
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteCategory(@Arg('id', () => Int) id: number) {
    const category = await Category.findOne(id);

    if (!category) {
      return false;
    }

    await Category.remove(category);
    return true;
  }
}
