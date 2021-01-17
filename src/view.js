import onChange from 'on-change';
import i18next from 'i18next';
import { noop } from 'lodash';

const feedsEl = document.querySelector('.feeds');
const postsEl = document.querySelector('.posts');
const inputEl = document.querySelector('input');
const submitBtnEl = document.querySelector('.rss-form .btn');
const feedbackEl = document.querySelector('.feedback');
const modalTitleEl = document.querySelector('.modal-title');
const modalBodyEl = document.querySelector('.modal-body');
const fullArticleBtnEl = document.querySelector('.full-article');

const renderInput = (options = { valid: true }) => {
  if (options.valid) {
    inputEl.classList.remove('is-invalid');
  } else {
    inputEl.classList.add('is-invalid');
  }
};

const clearFeedback = () => {
  feedbackEl.classList.remove('text-success', 'text-danger');
  feedbackEl.textContent = '';
};

const renderFeedback = (message, options = { success: false }) => {
  clearFeedback();
  if (options.success) {
    feedbackEl.classList.add('text-success');
  } else {
    feedbackEl.classList.add('text-danger');
  }
  feedbackEl.textContent = message;
};

const renderModal = (state) => {
  const id = state.modal.postId;
  const { title, description, link } = state.posts.find((post) => post.id === id);
  modalTitleEl.textContent = title;
  modalBodyEl.textContent = description;
  fullArticleBtnEl.setAttribute('href', link);
};

const renderFeeds = (state) => {
  feedsEl.innerHTML = '';

  const feedsHeaderEl = document.createElement('h2');
  feedsHeaderEl.textContent = 'Feeds';
  const feedListEl = document.createElement('ul');
  feedListEl.classList.add('list-group', 'mb-5');

  state.feeds.forEach(({ title, description }) => {
    const listItemEl = document.createElement('li');
    listItemEl.classList.add('list-group-item');

    const titleEl = document.createElement('h3');
    const descriptionEl = document.createElement('p');
    titleEl.textContent = title;
    descriptionEl.textContent = description;

    listItemEl.appendChild(titleEl);
    listItemEl.appendChild(descriptionEl);

    feedListEl.appendChild(listItemEl);
  });

  feedsEl.appendChild(feedsHeaderEl);
  feedsEl.appendChild(feedListEl);
};

const renderPosts = (state) => {
  postsEl.innerHTML = '';

  const postsHeaderEl = document.createElement('h2');
  postsHeaderEl.textContent = 'Posts';
  const postListEl = document.createElement('ul');
  postListEl.classList.add('list-group');

  state.posts.forEach(({ id, title, link }) => {
    const listItemEl = document.createElement('li');
    listItemEl.classList.add(
      'list-group-item', 'd-flex', 'justify-content-between', 'align-items-start',
    );

    const linkEl = document.createElement('a');
    const fontWeight = state.ui.viewedPostIds.has(id) ? 'normal' : 'bold';
    linkEl.classList.add(`fw-${fontWeight}`, 'text-decoration-none');
    linkEl.setAttribute('href', link);
    linkEl.setAttribute('data-id', id);
    linkEl.setAttribute('target', '_blank');
    linkEl.setAttribute('rel', 'noopener noreferrer');
    linkEl.textContent = title;

    const buttonEl = document.createElement('button');
    buttonEl.classList.add('btn', 'btn-primary', 'btn-sm');
    buttonEl.setAttribute('type', 'button');
    buttonEl.setAttribute('data-id', id);
    buttonEl.setAttribute('data-bs-toggle', 'modal');
    buttonEl.setAttribute('data-bs-target', '#modal');
    buttonEl.textContent = 'Preview';

    listItemEl.appendChild(linkEl);
    listItemEl.appendChild(buttonEl);

    postListEl.appendChild(listItemEl);
  });

  postsEl.appendChild(postsHeaderEl);
  postsEl.appendChild(postListEl);
};

const validationStateActions = {
  validating_form: noop,
  validating_uniqueness: noop,
  passed: () => {
    renderInput();
    clearFeedback();
  },
  failed: (previousValue) => {
    renderInput({ valid: false });
    switch (previousValue) {
      case 'validating_form':
        renderFeedback(i18next.t('errorMessages.invalidUrl'));
        break;
      case 'validating_uniqueness':
        renderFeedback(i18next.t('errorMessages.urlAlreadyAdded'));
        break;
      default:
        throw new Error(`Unknown state: ${previousValue}`);
    }
  },
};

const loadingStateActions = {
  requesting: () => {
    submitBtnEl.disabled = true;
  },
  parsing: noop,
  finished: (state) => {
    renderFeedback(i18next.t('successMessage'), { success: true });
    renderFeeds(state);
    renderPosts(state);
    submitBtnEl.disabled = false;
  },
  failed: (_, previousValue) => {
    switch (previousValue) {
      case 'requesting':
        renderFeedback(i18next.t('errorMessages.networkError'));
        break;
      case 'parsing':
        renderFeedback(i18next.t('errorMessages.parsingError'));
        break;
      default:
        throw new Error(`Unknown state: ${previousValue}`);
    }
    submitBtnEl.disabled = false;
  },
};

const updatingStateActions = {
  updating: noop,
  updated: (state) => renderPosts(state),
};

export default (state) => onChange(state, (path, value, previousValue) => {
  switch (path) {
    case 'validation':
      validationStateActions[value](previousValue);
      break;
    case 'loading':
      loadingStateActions[value](state, previousValue);
      break;
    case 'updating':
      updatingStateActions[value](state);
      break;
    case 'ui.viewedPostIds':
      renderPosts(state);
      break;
    case 'modal.postId':
      renderModal(state);
      break;
    default:
      noop();
  }
});
