import { Field, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Category } from './Category';
import { User } from './User';

@ObjectType()
@Entity()
export class Recipe extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  name!: string;

  @Field()
  @Column({ type: 'text' })
  description!: string;

  @Field()
  @Column()
  ingredients!: string;

  @Field(() => Category)
  @ManyToOne(() => Category, (category) => category.recipes)
  category: Category;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.recipes)
  user: User;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
