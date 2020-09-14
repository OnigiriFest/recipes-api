import { Resolver, Query, Mutation, Arg, Int } from 'type-graphql';
import { Category } from '../entities/Category';
import { getConnection, Like } from 'typeorm';

@Resolver()
export class CategoryResolver {
  @Query(() => Category, { nullable: true })
  getOneCategory(@Arg('id', () => Int) id: number) {
    return Category.findOne({ id }, { relations: ['recipes'] });
  }

  @Query(() => [Category])
  getCategories(@Arg('term', { nullable: true }) term: string) {
    if (term) {
      return Category.find({
        relations: ['recipes'],
        where: { name: Like(`%${term}%`) },
      });
    }

    return Category.find({ relations: ['recipes'] });
  }

  @Mutation(() => Category)
  createCategory(@Arg('name') name: string) {
    return Category.create({ name }).save();
  }

  @Mutation(() => Category)
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
  async deleteCategory(@Arg('id', () => Int) id: number) {
    const category = await Category.findOne(id);

    if (!category) {
      return false;
    }

    await Category.remove(category);
    return true;
  }
}
