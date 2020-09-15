import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import { Category } from '../entities/Category';
import { Recipe } from '../entities/Recipe';
import { User } from '../entities/User';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';
import FieldError from '../utils/fieldError';
import normalizeIngredients from '../utils/normalizeIngredients';

@ObjectType()
class RecipeResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Recipe, { nullable: true })
  recipe?: Recipe;
}

@InputType()
class RecipeInput {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  ingredients: string;

  @Field()
  categoryId: number;
}

@Resolver()
export class RecipeResolver {
  @Query(() => Recipe, { nullable: true })
  @UseMiddleware(isAuth)
  getOneRecipe(@Arg('id', () => Int) id: number) {
    return Recipe.findOne({ id }, { relations: ['category'] });
  }

  @Query(() => [Recipe], { nullable: true })
  @UseMiddleware(isAuth)
  async getRecipes(
    @Arg('term', { nullable: true }) term: string,
    @Arg('filter', { nullable: true }) filter: string
  ) {
    if (term && filter) {
      switch (filter) {
        case 'category':
          let result = await getConnection()
            .createQueryBuilder()
            .from(Recipe, 'recipe')
            .where('"categoryId" = :id', { id: parseInt(term) })
            .execute();
          return result;
        case 'name':
          return getConnection()
            .getRepository(Recipe)
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.category', 'category')
            .leftJoinAndSelect('r.user', 'user')
            .where('lower(r.name) like :name', {
              name: `%${term.toLowerCase()}%`,
            })
            .getMany();
        case 'ingredients':
          return getConnection()
            .getRepository(Recipe)
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.category', 'category')
            .leftJoinAndSelect('r.user', 'user')
            .where('lower(r.ingredients) like :ingredients', {
              ingredients: `%${term.toLowerCase()}%`,
            })
            .getMany();
        case 'description':
          return getConnection()
            .getRepository(Recipe)
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.category', 'category')
            .leftJoinAndSelect('r.user', 'user')
            .where('lower(r.description) like :description', {
              description: `%${term.toLowerCase()}%`,
            })
            .getMany();
        default:
          throw new Error("This filter doesn't exists");
      }
    } else if (term) {
      return getConnection()
        .getRepository(Recipe)
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.category', 'category')
        .leftJoinAndSelect('r.user', 'user')
        .where('lower(r.name) like :name', {
          name: `%${term.toLowerCase()}%`,
        })
        .getMany();
    }

    return Recipe.find({ relations: ['category', 'user'] });
  }

  @Query(() => [Recipe], { nullable: true })
  @UseMiddleware(isAuth)
  async getMyRecipes(@Ctx() { req }: MyContext) {
    const user = await User.findOne(req.userId);

    if (!user) {
      return null;
    }

    const recipes = await Recipe.find({
      where: { user },
      relations: ['category'],
    });

    return recipes;
  }

  @Mutation(() => RecipeResponse, { nullable: true })
  @UseMiddleware(isAuth)
  async createRecipe(
    @Arg('options') options: RecipeInput,
    @Ctx() { req }: MyContext
  ): Promise<RecipeResponse | null> {
    const { name, ingredients, description, categoryId } = options;

    const user = await User.findOne(req.userId);

    if (!user) {
      return null;
    }

    const category = await Category.findOne(categoryId);

    if (!category) {
      return {
        errors: [
          {
            field: 'categoryId',
            message: "this category doens't exists",
          },
        ],
      };
    }

    let normalizedIngredients = normalizeIngredients(ingredients);

    const recipe = await Recipe.create({
      name,
      description,
      ingredients: normalizedIngredients,
      category,
      user,
    }).save();

    return {
      recipe,
    };
  }

  @Mutation(() => RecipeResponse)
  @UseMiddleware(isAuth)
  async updateRecipe(
    @Arg('id', () => Int) id: number,
    @Arg('options') options: RecipeInput,
    @Ctx() { req }: MyContext
  ) {
    const { name, ingredients, description, categoryId } = options;

    const user = await User.findOne(req.userId);

    if (!user) {
      return null;
    }

    const category = await Category.findOne(categoryId);

    if (!category) {
      return {
        errors: {
          field: 'categoryId',
          message: "this category doens't exists",
        },
      };
    }

    const recipe = await Recipe.findOne(id, { relations: ['user'] });

    if (!recipe) {
      return null;
    }

    if (recipe.user.id !== user.id) {
      throw new Error('not authorized');
    }

    let normalizedIngredients = normalizeIngredients(ingredients);

    const result = await getConnection()
      .createQueryBuilder()
      .update(Recipe)
      .set({
        name,
        ingredients: normalizedIngredients,
        description,
        category,
      })
      .where('id = :id', { id })
      .returning('*')
      .execute();

    return { recipe: { ...result.raw[0], category, user } };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteRecipe(
    @Arg('id', () => Int) id: number,
    @Ctx() { req }: MyContext
  ) {
    const user = await User.findOne(req.userId);
    if (!user) {
      return false;
    }

    const recipe = await Recipe.findOne(id);

    if (!recipe) {
      return false;
    }

    if (recipe.user.id !== user.id) {
      throw new Error('not authorized');
    }

    await Recipe.remove(recipe);
    return true;
  }
}
