/* eslint-disable no-await-in-loop */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// eslint-disable-next-line import/no-unresolved
import { readFile } from 'fs/promises';

import express from 'express';
import dotenv from 'dotenv';

import { get, keyTtl, set } from './cache.js';
import { parseFeed } from './parser.js';

dotenv.config();

const DELAY_MIN = 750;
const DELAY_MAX = 3000;

const {
  PORT: port = 3000,
  HOST: host = '127.0.0.1',
  BASE_URL: baseUrl = '',
  CACHE_FEEDS_TTL = 0,
  CACHE_FEED_TTL = 0,
  DELAY_PROBABILITY: defaultDelayProbability,
  ERROR_PROBABILITY: defaultErrorProbability,
} = process.env;

const cacheFeedsTtl = parseInt(CACHE_FEEDS_TTL, 10);
const cacheFeedTtl = parseInt(CACHE_FEED_TTL, 10);

export const router = express.Router();

const path = dirname(fileURLToPath(import.meta.url));

function getUrl(urlPath) {
  const url = new URL(urlPath, baseUrl || `http://${host}`);

  if (!baseUrl) {
    url.port = port;
  }

  return url;
}

async function mapFeeds(data) {
  const result = [];

  if (!Array.isArray(data)) {
    return result;
  }

  for (const item of data) {
    const { id, title, children } = item;

    if (!id) {
      return null;
    }

    const url = getUrl(id);
    const mappedChildren = await mapFeeds(children);

    result.push({
      id,
      url,
      title,
      children: mappedChildren,
    });
  }

  return result;
}

async function cachedMapFeeds(data) {
  const cacheKey = 'feeds';

  const cached = await get(cacheKey);

  if (cached) {
    return cached;
  }

  const result = await mapFeeds(data);

  await set(cacheKey, result, cacheFeedsTtl);

  return result;
}

async function cachedFeedsFile() {
  const cacheKey = 'feeds-file';

  const cached = await get(cacheKey);

  if (cached) {
    return cached;
  }

  const feedsFile = join(path, '../feeds.json');

  const data = await readFile(feedsFile, { encoding: 'utf8' });
  const json = JSON.parse(data.toString('utf8'));

  await set(cacheKey, json, cacheFeedsTtl);

  return json;
}

function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(); }, time);
  });
}

function mapFeedItems(items) {
  if (!items) {
    return [];
  }

  return items.map((item) => {
    if (!item.title && !item.body) {
      return null;
    }

    return {
      title: item.title || '',
      link: item.link || '',
      published: item.isoDate || '',
      publisher: item.creator || '',
      body: item.content || '',
    };
  }).filter(Boolean);
}

async function getFeed(id) {
  const json = await cachedFeedsFile();

  const flat = json.map((i) => [i, ...(i.children || [])]).flat();

  const item = flat.find((i) => i.id === id);

  if (!item) {
    return null;
  }

  const parsedFeed = await parseFeed(item.url);

  if (!parsedFeed) {
    return null;
  }

  const completeFeed = {
    title: item.title,
    age: 0,
    items: mapFeedItems(parsedFeed.items),
  };

  return completeFeed;
}

function randomDelay({ query = {} } = {}) {
  const { delay } = query;

  const parsedDelay = Number.parseFloat(delay || defaultDelayProbability);

  const rnd = Math.random();
  if (!Number.isNaN(parsedDelay) && rnd < parsedDelay) {
    console.info('Random delay!', parsedDelay, rnd);
    return Math.random() * (DELAY_MAX - DELAY_MIN) + DELAY_MIN;
  }

  return null;
}

function randomError({ query = {} } = {}) {
  const { error } = query;

  const parsedError = Number.parseFloat(error || defaultErrorProbability);

  const rnd = Math.random();
  if (!Number.isNaN(parsedError) && rnd < parsedError) {
    console.info('Random error!', parsedError, rnd);
    return true;
  }

  return false;
}

async function feeds(req, res) {
  const json = await cachedFeedsFile();
  const result = await cachedMapFeeds(json);

  const delay = randomDelay(req);
  const error = randomError(req);

  if (delay) {
    await sleep(delay);
  }

  if (error) {
    return res.status(500).json(null);
  }

  return res.json(result);
}

async function feed(req, res, next) {
  const { id } = req.params;

  const delay = randomDelay(req);
  const error = randomError(req);

  if (delay) {
    await sleep(delay);
  }

  if (error) {
    return res.status(500).json(null);
  }

  const cacheKey = `feed-${id}`;

  const cached = await get(cacheKey);

  if (cached) {
    const age = await keyTtl(cacheKey);
    cached.age = cacheFeedTtl - age;
    return res.json(cached);
  }

  const json = await getFeed(id);

  if (!json) {
    return next();
  }

  await set(cacheKey, json, cacheFeedTtl);

  return res.json(json);
}

function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.get('/', catchErrors(feeds));
router.get('/:id', catchErrors(feed));
