const normalizeIngredients = (ingredients: string) => {
  return ingredients
    .trim()
    .replace(/\s+/g, ' ')
    .split(',')
    .map((ingredient) => {
      let normalizedIngredient = ingredient.trim();
      return (
        normalizedIngredient.charAt(0).toUpperCase() +
        normalizedIngredient.slice(1).toLowerCase()
      );
    })
    .join(', ');
};

export default normalizeIngredients;
