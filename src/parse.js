export default (text) => {
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(text, 'text/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    throw new Error('Parsing failed!');
  }
  const title = doc.querySelector('title')?.textContent;
  const description = doc.querySelector('description')?.textContent;
  // RSS
  const items = [...doc.querySelectorAll('item')].map((item) => {
    const itemTitle = item.querySelector('title')?.textContent;
    const itemDescription = item.querySelector('description')?.textContent;
    const link = item.querySelector('link')?.textContent;
    const guid = item.querySelector('guid')?.textContent;
    const pubDate = item.querySelector('pubDate')?.textContent;
    return {
      title: itemTitle, description: itemDescription, link, guid, pubDate,
    };
  });
  // ATOM
  const entries = [...doc.querySelectorAll('entry')].map((entry) => {
    const entryTitle = entry.querySelector('title')?.textContent;
    const entryDescription = entry.querySelector('summary')?.textContent;
    const link = entry.querySelector('link')?.getAttribute('href');
    const guid = entry.querySelector('id')?.textContent;
    const pubDate = entry.querySelector('published')?.textContent;
    return {
      title: entryTitle, description: entryDescription, link, guid, pubDate,
    };
  });

  return { title, description, items: (items.length && items) || entries };
};
