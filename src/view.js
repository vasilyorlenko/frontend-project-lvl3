/* eslint-disable no-param-reassign */

import onChange from 'on-change';
import i18next from 'i18next';
import { noop } from 'lodash';

const renderInput = (elements, options = { valid: true }) => {
  if (options.valid) {
    elements.input.classList.remove('is-invalid');
  } else {
    elements.input.classList.add('is-invalid');
  }
};

const clearFeedback = (elements) => {
  elements.feedback.classList.remove('text-success', 'text-danger');
  elements.feedback.textContent = '';
};

const renderFeedback = (elements, message, options = { success: false }) => {
  clearFeedback(elements);
  if (options.success) {
    elements.feedback.classList.add('text-success');
  } else {
    elements.feedback.classList.add('text-danger');
  }
  elements.feedback.textContent = message;
};

const renderModal = (elements, state) => {
  const id = state.modal.postId;
  const { title, description, link } = state.posts.find((post) => post.id === id);
  elements.modalTitle.textContent = title;
  elements.modalBody.textContent = description;
  elements.fullArticleBtn.setAttribute('href', link);
};

const renderFeeds = (elements, state) => {
  elements.feeds.innerHTML = '';

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

  elements.feeds.appendChild(feedsHeaderEl);
  elements.feeds.appendChild(feedListEl);
};

const renderPosts = (elements, state) => {
  elements.posts.innerHTML = '';

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
    const fw = state.ui.viewedPostIds.has(id) ? 'normal' : 'bold';
    linkEl.classList.add(`fw-${fw}`, `font-weight-${fw}`, 'text-decoration-none');
    linkEl.setAttribute('href', link);
    linkEl.setAttribute('role', 'link');
    linkEl.setAttribute('data-id', id);
    linkEl.setAttribute('target', '_blank');
    linkEl.setAttribute('rel', 'noopener noreferrer');
    linkEl.textContent = title;

    const buttonEl = document.createElement('button');
    buttonEl.classList.add('btn', 'btn-primary', 'btn-sm');
    buttonEl.setAttribute('type', 'button');
    buttonEl.setAttribute('role', 'button');
    buttonEl.setAttribute('data-id', id);
    buttonEl.setAttribute('data-bs-toggle', 'modal');
    buttonEl.setAttribute('data-bs-target', '#modal');
    buttonEl.textContent = 'Preview';

    listItemEl.appendChild(linkEl);
    listItemEl.appendChild(buttonEl);

    postListEl.appendChild(listItemEl);
  });

  elements.posts.appendChild(postsHeaderEl);
  elements.posts.appendChild(postListEl);
};

const validationStateActions = {
  validating_form: noop,
  validating_uniqueness: noop,
  passed: (elements) => {
    renderInput(elements);
    clearFeedback(elements);
  },
  failed: (elements, previousValue) => {
    renderInput(elements, { valid: false });
    switch (previousValue) {
      case 'validating_form':
        renderFeedback(elements, i18next.t('errorMessages.invalidUrl'));
        break;
      case 'validating_uniqueness':
        renderFeedback(elements, i18next.t('errorMessages.urlAlreadyAdded'));
        break;
      default:
        throw new Error(`Unknown state: ${previousValue}`);
    }
  },
};

const loadingStateActions = {
  requesting: (elements) => {
    elements.input.setAttribute('readonly', true);
    elements.submitBtn.disabled = true;
  },
  parsing: noop,
  finished: (elements, state) => {
    renderFeedback(elements, i18next.t('successMessage'), { success: true });
    renderFeeds(elements, state);
    renderPosts(elements, state);
    elements.input.removeAttribute('readonly');
    elements.submitBtn.disabled = false;
  },
  failed: (elements, _, previousValue) => {
    switch (previousValue) {
      case 'requesting':
        renderFeedback(elements, i18next.t('errorMessages.networkError'));
        break;
      case 'parsing':
        renderFeedback(elements, i18next.t('errorMessages.parsingError'));
        break;
      default:
        throw new Error(`Unknown state: ${previousValue}`);
    }
    elements.input.removeAttribute('readonly');
    elements.submitBtn.disabled = false;
  },
};

const updatingStateActions = {
  updating: noop,
  updated: renderPosts,
};

export default (elements, state) => onChange(state, (path, value, previousValue) => {
  switch (path) {
    case 'validation':
      validationStateActions[value](elements, previousValue);
      break;
    case 'loading':
      loadingStateActions[value](elements, state, previousValue);
      break;
    case 'updating':
      updatingStateActions[value](elements, state);
      break;
    case 'ui.viewedPostIds':
      renderPosts(elements, state);
      break;
    case 'modal.postId':
      renderModal(elements, state);
      break;
    default:
      noop();
  }
});
