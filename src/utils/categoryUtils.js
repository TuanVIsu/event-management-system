export const normalizeCategoryOptions = (criteria = []) => {
  if (!Array.isArray(criteria)) return [];

  return criteria
    .map((item) => {
      const name = item?.title || item?.name || '';
      if (!name) return null;

      return {
        id: item?.id ?? name,
        name,
        maxPoints: Number(item?.max_points ?? item?.maxPoints ?? 0),
      };
    })
    .filter(Boolean);
};

export const getCategoryMaxPoints = (categoryName, categories = []) => {
  const normalized = normalizeCategoryOptions(categories);
  const found = normalized.find((category) => category.name === categoryName);
  const maxPoints = found ? found.maxPoints : 100;
  return Math.min(Math.max(Number(maxPoints) || 0, 0), 100);
};

export const clampPointsToCategoryLimit = (value, categoryName, categories = []) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), getCategoryMaxPoints(categoryName, categories));
};
