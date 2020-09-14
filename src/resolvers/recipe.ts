import FieldError from '../utils/fieldError';
import {
  Arg,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  InputType,
  UseMiddleware,
  Ctx,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import { Category } from '../entities/Category';
import { Recipe } from '../entities/Recipe';
import normalizeIngredients from '../utils/normalizeIngredients';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';
import { User } from '../entities/User';

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
  getOneRecipe(@Arg('id', () => Int) id: number) {
    return Recipe.findOne({ id }, { relations: ['category'] });
  }

  @Query(() => [Recipe])
  getRecipes() {
    return Recipe.find({ relations: ['category'] });
  }

  @Query(() => [Recipe], { nullable: true })
  @UseMiddleware(isAuth)
  async getMyRecipes(@Ctx() { req }: MyContext) {
    const user = await User.findOne((req as any).userId);

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
  ) {
    const { name, ingredients, description, categoryId } = options;

    const user = await User.findOne((req as any).userId);

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

    let normalizedIngredients = normalizeIngredients(ingredients);

    const recipe = Recipe.create({
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

    const user = await User.findOne((req as any).userId);

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
  async deleteRecipe(@Arg('id', () => Int) id: number) {
    const recipe = await Recipe.findOne(id);

    if (!recipe) {
      return false;
    }

    await Recipe.remove(recipe);
    return true;
  }
}
