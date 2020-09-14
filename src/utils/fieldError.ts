import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export default class FieldError {
  @Field()
  field: String;
  @Field()
  message: string;
}
