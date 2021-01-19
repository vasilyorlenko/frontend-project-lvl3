import { string } from 'yup';
import { uniqueId, differenceWith } from 'lodash';
import axios from 'axios';
import i18next from 'i18next';
import resources from './locales';
import watch from './view.js';
import parse from './parse.js';

const getProxiedUrl = (url) => (
  `https://hexlet-allorigins.herokuapp.com/get?disableCache=true&url=${url}`
);

const isUrlUnique = (url, links) => !links
  .some((link) => link.includes(url) || url.includes(link));

const buildPosts = (feedId, items) => items.map((item) => {
  const {
    guid, pubDate, link, title, description,
  } = item;
  return {
    id: uniqueId(), feedId, guid, pubDate, link, title, description,
  };
});

const arePostsIdentical = (post1, post2) => {
  const {
    title, link, guid, pubDate,
  } = post1;
  const property = (pubDate && 'pubDate')
    || (guid && 'guid')
    || (link && 'link')
    || (title && 'title');
  return post1[property] === post2[property];
};

const beginUpdatingCycle = (state, interval = 5000) => {
  const update = () => setTimeout(() => {
    // eslint-disable-next-line
    state.updating = 'updating';
    const ids = state.feeds.map(({ id }) => id);
    const urls = state.feeds
      .map(({ url }) => getProxiedUrl(url));
    const promises = urls.map((url) => axios.get(url));

    Promise.allSettled(promises)
      .then((results) => results.map(
        ({ status, value }, i) => ({ status, response: value, id: ids[i] }),
      ))
      .then((results) => results.filter(({ status }) => status === 'fulfilled'))
      .then((results) => results.flatMap(({ response, id }) => {
        const { items } = parse(response.data.contents);
        return buildPosts(id, items);
      }))
      .then((posts) => differenceWith(posts, state.posts, arePostsIdentical))
      .then((newPosts) => {
        if (newPosts.length) {
          state.posts.unshift(...newPosts);
          // eslint-disable-next-line
          state.updating = 'updated';
        }
      })
      .finally(() => update());
  }, interval);

  update();
};

const runApp = () => {
  const elements = {
    feeds: document.querySelector('.feeds'),
    posts: document.querySelector('.posts'),
    form: document.querySelector('.rss-form'),
    input: document.querySelector('.rss-form .form-control'),
    submitBtn: document.querySelector('.rss-form .btn'),
    feedback: document.querySelector('.feedback'),
    modalTitle: document.querySelector('.modal-title'),
    modalBody: document.querySelector('.modal-body'),
    fullArticleBtn: document.querySelector('.full-article'),
  };

  const state = {
    validation: null,
    loading: null,
    updating: null,
    modal: {
      postId: null,
    },
    ui: {
      viewedPostIds: new Set(),
    },
    feeds: [],
    posts: [],
  };

  const watchedState = watch(elements, state);

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const { url } = Object.fromEntries(formData);

    watchedState.validation = 'validating_form';
    if (!string().url().isValidSync(url)) {
      watchedState.validation = 'failed';
      return;
    }

    watchedState.validation = 'validating_uniqueness';
    const links = watchedState.feeds.map((f) => f.url);
    if (!isUrlUnique(url, links)) {
      watchedState.validation = 'failed';
      return;
    }
    watchedState.validation = 'passed';

    watchedState.loading = 'requesting';
    const proxiedURL = getProxiedUrl(url);
    axios.get(proxiedURL)
      .then(({ data: { contents } }) => {
        watchedState.loading = 'parsing';
        return parse(contents);
      })
      .then(({ title, description, items }) => {
        const feedId = uniqueId();
        const feed = {
          id: feedId, title, description, url,
        };
        const posts = buildPosts(feedId, items);
        watchedState.feeds.unshift(feed);
        watchedState.posts.unshift(...posts);

        watchedState.loading = 'finished';
        if (watchedState.feeds.length === 1) {
          beginUpdatingCycle(watchedState);
        }
      })
      .catch((error) => {
        watchedState.loading = 'failed';
        console.error(error);
      });
  });

  elements.posts.addEventListener('click', (e) => {
    const id = e.target.dataset?.id;
    if (!id) {
      return;
    }
    watchedState.modal.postId = id;
    watchedState.ui.viewedPostIds.add(id);
  });
};

export default () => {
  i18next.init({ lng: 'en', resources }).then(() => runApp());
};
