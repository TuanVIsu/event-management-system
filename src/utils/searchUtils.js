export const normalizeText = (value = '') => {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

export const matchesNaturalQuery = (query, haystack) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const normalizedHaystack = normalizeText(haystack);
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  const compactHaystack = normalizedHaystack.replace(/\s+/g, '');

  return normalizedHaystack.includes(normalizedQuery) || compactHaystack.includes(compactQuery);
};

export const getTopEventMatch = (query, events = []) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  const scoredEvents = events
    .map((event) => {
      const haystack = `${event?.name || ''} ${event?.description || ''} ${event?.category || ''} ${event?.id || ''}`;
      const normalizedHaystack = normalizeText(haystack);
      const compactQuery = normalizedQuery.replace(/\s+/g, '');
      const compactHaystack = normalizedHaystack.replace(/\s+/g, '');
      const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
      const matchedWords = queryWords.filter((word) => normalizedHaystack.includes(word));

      let score = 0;
      if (normalizedHaystack.includes(normalizedQuery)) score += 10;
      if (compactHaystack.includes(compactQuery)) score += 8;
      score += matchedWords.length;

      return { event, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.event?.name || '').localeCompare(b.event?.name || ''));

  return scoredEvents[0]?.event ?? null;
};
