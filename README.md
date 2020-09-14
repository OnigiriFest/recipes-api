How to start the app:

First go to index.ts file and modify the database info with your credentials in the following json object:
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
  
 Then install dependiencies with yarn/npm install
 
 After that run yarn watch and yarn dev OR yarn start
 
 Lastly go to graphql http://localhost:4000/graphql -> Settings and set "request.credentials" to "include"
 
