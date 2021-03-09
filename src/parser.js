import fetch from 'node-fetch';
import Parser from 'rss-parser';

const parser = new Parser();

async function fetchFeed(url) {
  const result = await fetch(url);
  const text = await result.text();

  return text;
}

export async function parseFeed(feedUrl) {
  let feed;

  try {
    const url = new URL(feedUrl);
    const rss = await fetchFeed(url.href);
    feed = await parser.parseString(rss);
  } catch (e) {
    console.error('Unable to parse feed', feedUrl, e);
    return null;
  }

  return feed;
}
