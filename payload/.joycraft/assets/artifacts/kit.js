(function artifactKit(global) {
  'use strict';

  function node(tag, attributes, children) {
    var element = document.createElement(tag);
    Object.keys(attributes || {}).forEach(function (key) {
      var value = attributes[key];
      if (value === undefined || value === null || value === false) return;
      if (key === 'class') element.className = value;
      else if (key === 'text') element.textContent = value;
      else if (key.indexOf('on') === 0) element.addEventListener(key.slice(2), value);
      else if (key === 'checked' || key === 'disabled' || key === 'required') element[key] = Boolean(value);
      else element.setAttribute(key, String(value));
    });
    (children || []).forEach(function (child) {
      if (child !== null && child !== undefined) element.append(child);
    });
    return element;
  }

  function text(value) { return document.createTextNode(value == null ? '' : String(value)); }

  function responseMap(responses) {
    return (responses || []).reduce(function (map, response) {
      if (response && response.id && response.answer) map[response.id] = { answer: response.answer, note: response.note || '' };
      return map;
    }, Object.create(null));
  }

  function copiedResponses(map) {
    return Object.keys(map).filter(function (id) { return map[id].answer; }).map(function (id) {
      return { id: id, answer: map[id].answer, note: map[id].note || undefined };
    });
  }

  function sameResponses(left, right) {
    var ids = new Set(Object.keys(left).concat(Object.keys(right)));
    return Array.from(ids).every(function (id) {
      var a = left[id] || {}; var b = right[id] || {};
      return (a.answer || '') === (b.answer || '') && (a.note || '') === (b.note || '');
    });
  }

  function mount(config) {
    if (!config || !config.element) throw new Error('JoycraftArtifacts.mount requires an element.');
    var root = config.element;
    var model = config.model || { schemaVersion: 1, title: 'Artifact', questions: [] };
    var transport = config.transport;
    var saved = Object.create(null);
    var draft = Object.create(null);
    var revision = model.source && model.source.revision;
    var viewRevision = model.source && model.source.viewRevision;
    var writable = false;
    var storage = 'memory';
    var loading = false;
    var saving = false;
    var destroyed = false;
    var copyFallback = '';
    var sourceChanged = false;
    var message = transport ? 'Loading saved responses…' : 'Read-only preview. A response transport is not available.';
    var messageKind = transport ? 'quiet' : 'notice';

    function isReadOnly(question) {
      return !writable || ['clarified', 'settled', 'backlogged', 'discarded'].indexOf(question.status) !== -1;
    }
    function dirty() { return !sameResponses(draft, saved); }
    function setMessage(kind, value) { messageKind = kind; message = value; }
    function statusLabel(status) {
      if (status === 'clarified') return 'Recorded in brief';
      if (status === 'backlogged') return 'Backlogged';
      if (status === 'discarded') return 'Discarded';
      if (status === 'settled') return 'Settled';
      return status === 'open' ? 'Open for response' : (status || 'Open for response');
    }
    function validation(question) {
      var answer = draft[question.id];
      if (!answer || !answer.answer) return 'Choose an option before saving.';
      var option = (question.options || []).filter(function (item) { return item.value === answer.answer; })[0];
      if (option && option.requiresNote && !String(answer.note || '').trim()) return 'Add a note for this custom response.';
      return '';
    }
    function envelope() {
      var answers = copiedResponses(saved);
      if (transport && typeof transport.exportResponses === 'function') return transport.exportResponses(answers);
      return { schemaVersion: 1, kind: 'joycraft-artifact-responses', artifactId: model.artifactId, source: model.source, answers: answers };
    }

    function unsavedAnswers() { return copiedResponses(draft).filter(function (item) {
        var q = model.questions.find(function (candidate) { return candidate.id === item.id; });
        return q && !isReadOnly(q) && !sameResponses({ value: item }, { value: saved[item.id] || {} });
      }); }

    async function save(question) {
      if (!transport || !writable || saving || loading || sourceChanged) return;
      var pendingAnswers = unsavedAnswers();
      var problem = question ? validation(question) : pendingAnswers.map(function (item) {
        var q = (model.questions || []).filter(function (candidate) { return candidate.id === item.id; })[0];
        return q && validation(q);
      }).filter(Boolean)[0];
      if (problem) { setMessage('error', problem); render(); return; }
      var answers = question ? (draft[question.id] && draft[question.id].answer ? [{ id: question.id, answer: draft[question.id].answer, note: draft[question.id].note || undefined }] : []) : pendingAnswers;
      if (!answers.length) { setMessage('quiet', 'No new answers to save.'); render(); return; }
      saving = true; setMessage('quiet', 'Saving selected responses…'); render();
      try {
        var result = await transport.save({ revision: revision, answers: answers });
        if (destroyed) return;
        applyLoaded(result, Boolean(question), answers.map(function (answer) { return answer.id; }));
        setMessage('success', (result && result.message) || 'Saved in artifact — awaiting brief sync.');
      } catch (error) {
        setMessage('error', 'Could not save. Your edits are still here. ' + (error && error.message ? error.message : 'Try refreshing before saving again.'));
      } finally { saving = false; render(); }
    }
    function applyLoaded(result, preserveDraft, confirmedIds) {
      confirmedIds = confirmedIds || [];
      if (!result) throw new Error('The response transport returned no state.');
      var oldRevision = revision;
      var oldViewRevision = viewRevision;
      var pending = Object.assign(Object.create(null), draft);
      var previouslySaved = Object.assign(Object.create(null), saved);
      model = result.model || model;
      revision = model.source && model.source.revision;
      viewRevision = model.source && model.source.viewRevision;
      writable = Boolean(result.writable);
      storage = result.storage || storage;
      saved = responseMap(result.responses);
      draft = Object.assign(Object.create(null), saved);
      var changedSource = oldViewRevision !== viewRevision || (!confirmedIds.length && oldRevision && revision && oldRevision !== revision);
      if (preserveDraft && !sameResponses(pending, previouslySaved)) {
        Object.keys(pending).forEach(function (id) {
          if (confirmedIds.indexOf(id) !== -1 || !model.questions.some(function (q) { return q.id === id && !isReadOnly(q); })) return;
          var before = previouslySaved[id] || { answer: '', note: '' };
          var after = pending[id] || { answer: '', note: '' };
          if (before.answer !== after.answer || (before.note || '') !== (after.note || '')) {
            if (changedSource) draft[id] = { answer: '', note: after.note || '' };
            else draft[id] = after;
          }
        });
        if (changedSource) {
          sourceChanged = true;
          setMessage('notice', 'The source changed. Your unsaved note text remains, but choose responses again before saving.');
        }
      }
      if (result.message && !sourceChanged) setMessage('notice', result.message);
    }
    async function refresh() {
      if (!transport || typeof transport.load !== 'function' || loading) return;
      loading = true; setMessage('quiet', 'Refreshing saved responses…'); render();
      try {
        var result = await transport.load();
        if (destroyed) return;
        applyLoaded(result, true);
        if (!result.message) setMessage('quiet', dirty() ? 'Saved responses refreshed; unsaved edits remain on screen.' : 'Saved responses refreshed.');
      } catch (error) {
        setMessage('error', 'Could not load saved responses. Nothing on screen was marked as saved. ' + (error && error.message ? error.message : ''));
      } finally { loading = false; render(); }
    }
    async function copySaved() {
      var payload = JSON.stringify(envelope(), null, 2);
      copyFallback = '';
      if (dirty()) setMessage('notice', 'Copy includes saved responses only. Unsaved edits are not included.');
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard access is unavailable.');
        await navigator.clipboard.writeText(payload);
        setMessage('success', dirty() ? 'Saved responses copied. Unsaved edits were not included.' : 'Saved responses copied.');
      } catch (error) {
        setMessage('notice', 'Clipboard was unavailable. Copy the saved-response text below.');
        copyFallback = payload;
      }
      render();
    }
    function downloadSaved() {
      if (dirty()) setMessage('notice', 'Download includes saved responses only. Unsaved edits are not included.');
      var blob = new Blob([JSON.stringify(envelope(), null, 2)], { type: 'application/json' });
      var link = node('a', { href: URL.createObjectURL(blob), download: (model.artifactId || 'artifact') + '-responses.json' });
      document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(link.href); render();
    }
    function countText() {
      var count = copiedResponses(saved).length;
      var total = (model.questions || []).length;
      if (storage === 'brief') return count + ' of ' + total + ' recorded in brief';
      if (storage === 'claude') return count + ' of ' + total + ' saved in artifact — awaiting brief sync';
      return count + ' of ' + total + ' prepared for export (not saved)';
    }
    function syncLiveUi() {
      var messageNode = root.querySelector('.jca-message');
      if (messageNode) { messageNode.className = 'jca-message jca-message-' + messageKind; messageNode.textContent = message; }
      var footer = root.querySelector('.jca-footer');
      if (footer) footer.textContent = writable ? (dirty() ? 'Unsaved response edits are on this page.' : countText() + '.') : 'Responses are read-only in this artifact.';
      root.querySelectorAll('[data-jca-save-all]').forEach(function (button) { button.disabled = !writable || saving || sourceChanged || !unsavedAnswers().length; });
    }
    function renderQuestion(question, index) {
      var current = draft[question.id] || { answer: '', note: '' };
      var readOnly = isReadOnly(question);
      var body = node('section', { class: 'jca-question', id: 'jca-question-' + question.id });
      body.append(node('div', { class: 'jca-question-kicker', text: 'Decision ' + (index + 1) }), node('h2', { text: question.question }));
      body.append(node('p', { class: 'jca-status jca-status-' + (question.status || 'open'), text: statusLabel(question.status) }));
      if (question.answer) body.append(node('p', { class: 'jca-recorded', text: 'Brief record: ' + question.answer }));
      (model.comparisons || []).filter(function (comparison) { return comparison.decisionId === question.id; }).forEach(function (comparison) { body.append(renderComparison(comparison)); });
      if (question.context || question.why || (question.affected || []).length) {
        var detail = node('details', { class: 'jca-details' }, [node('summary', { text: 'Context and impact' })]);
        if (question.context) detail.append(node('p', { text: question.context }));
        if (question.why) detail.append(node('p', { text: question.why }));
        if ((question.affected || []).length) detail.append(node('p', { text: 'Affected: ' + question.affected.join(', ') }));
        body.append(detail);
      }
      var fieldset = node('fieldset', { class: 'jca-options', disabled: readOnly });
      fieldset.append(node('legend', { text: readOnly ? 'Responses are read-only' : 'Choose one response' }));
      (question.options || []).forEach(function (option) {
        var id = 'jca-' + question.id + '-' + option.value;
        var radio = node('input', { type: 'radio', id: id, name: 'jca-answer-' + question.id, value: option.value, checked: current.answer === option.value,
          onchange: function () { draft[question.id] = { answer: option.value, note: (draft[question.id] || {}).note || '' }; setMessage('quiet', 'Unsaved changes.'); syncLiveUi(); syncNoteRequirement(); } });
        var label = node('label', { class: 'jca-option', for: id }, [radio, node('span', { class: 'jca-option-copy' }, [node('strong', { text: option.label }), option.description ? node('small', { text: option.description }) : null])]);
        fieldset.append(label);
      });
      body.append(fieldset);
      var note = node('textarea', { class: 'jca-note', id: 'jca-note-' + question.id, rows: 3, disabled: readOnly, placeholder: 'Optional note' });
      note.value = current.note || '';
      function syncNoteRequirement() {
        var selected = (question.options || []).find(function (option) { return option.value === (draft[question.id] || {}).answer; });
        var required = Boolean(selected && selected.requiresNote);
        note.required = required; note.setAttribute('aria-required', String(required));
        note.placeholder = required ? 'Describe your answer' : 'Optional note';
        noteLabel.textContent = required ? 'Note (required for this answer)' : 'Note';
      }
      var noteLabel = node('label', { class: 'jca-note-label', for: note.id, text: 'Note' });
      syncNoteRequirement();
      note.addEventListener('input', function () { draft[question.id] = { answer: (draft[question.id] || {}).answer || '', note: note.value }; setMessage('quiet', 'Unsaved changes.'); syncLiveUi(); });
      body.append(noteLabel, note);
      if (question.answer && question.note) body.append(node('p', { class: 'jca-recorded', text: 'Brief note: ' + question.note }));
      if (!readOnly) body.append(node('button', { class: 'jca-save-one', type: 'button', text: 'Save this response', disabled: saving || loading || sourceChanged, onclick: function () { save(question); } }));
      return body;
    }
    function renderComparison(comparison) {
      var section = node('section', { class: 'jca-comparison' }, [node('h2', { text: comparison.title || 'Comparison' })]);
      if (comparison.decisionId) section.append(node('p', { class: 'jca-caption', text: 'Decision: ' + comparison.decisionId }));
      var images = node('div', { class: 'jca-images' });
      (comparison.images || []).forEach(function (image) {
        var figure = node('figure');
        figure.append(node('img', { src: image.src, alt: image.alt || image.label || 'Comparison screenshot', loading: 'lazy' }));
        figure.append(node('figcaption', { text: image.label || image.caption || 'Screenshot' }));
        if (image.caption) figure.append(node('p', { class: 'jca-caption', text: image.caption }));
        images.append(figure);
      });
      section.append(images); return section;
    }
    function renderReview(review) {
      var section = node('section', { class: 'jca-review jca-review-' + String(review.result || 'UNVERIFIED').toLowerCase() });
      section.append(node('p', { class: 'jca-review-result', text: 'Recorded ' + (review.result || 'UNVERIFIED') }), node('h3', { text: review.title || 'Verification' }), node('p', { text: review.summary || '' }), node('p', { class: 'jca-caption', text: 'Historical record; not revalidated by this view.' }));
      if ((review.details || []).length || review.source) {
        var details = node('details', { class: 'jca-details' }, [node('summary', { text: 'Verification details' })]);
        (review.details || []).forEach(function (item) { details.append(node('p', { text: item })); });
        if (review.source) details.append(node('p', { text: 'Source: ' + review.source }));
        section.append(details);
      }
      return section;
    }
    function render() {
      if (destroyed) return;
      var focusedId = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : '';
      root.replaceChildren();
      var page = node('article', { class: 'joycraft-artifact', 'data-jca-theme': model.theme === 'dark' ? 'dark' : 'light' });
      if (document.documentElement.hasAttribute('data-jca-theme')) document.documentElement.setAttribute('data-jca-theme', model.theme === 'dark' ? 'dark' : 'light');
      var header = node('header', { class: 'jca-header' }, [node('p', { class: 'jca-eyebrow', text: 'Decision artifact' }), node('h1', { text: model.title || 'Artifact' })]);
      if (model.summary) header.append(node('p', { class: 'jca-summary', text: model.summary }));
      if (model.source && model.source.path) {
        var provenance = node('details', { class: 'jca-details jca-source' }, [node('summary', { text: 'Source provenance' }), node('p', { text: model.source.path }), model.source.revision ? node('p', { text: 'Revision: ' + model.source.revision }) : null]);
        header.append(provenance);
      }
      page.append(header);
      page.append(node('p', { class: 'jca-message jca-message-' + messageKind, role: messageKind === 'error' ? 'alert' : 'status', text: message }));
      var actions = node('div', { class: 'jca-actions' });
      if (transport) actions.append(node('button', { type: 'button', text: loading ? 'Refreshing…' : 'Refresh', disabled: loading || saving, onclick: refresh }));
      actions.append(node('button', { type: 'button', 'data-jca-save-all': '', text: 'Save selected answers', disabled: !writable || saving || sourceChanged || !unsavedAnswers().length, onclick: function () { save(); } }));
      if (sourceChanged) actions.append(node('button', { type: 'button', text: 'I reviewed the updated source', onclick: function () { sourceChanged = false; setMessage('notice', 'Review acknowledged. Select a response where needed, then save.'); render(); } }));
      actions.append(node('button', { type: 'button', text: 'Copy saved', onclick: copySaved }), node('button', { type: 'button', text: 'Download saved', onclick: downloadSaved }));
      page.append(actions);
      (model.questions || []).forEach(function (question, index) { page.append(renderQuestion(question, index)); });
      var unattachedComparisons = (model.comparisons || []).filter(function (comparison) { return !comparison.decisionId; });
      if (unattachedComparisons.length) { page.append(node('h2', { class: 'jca-section-title', text: 'Screenshots' })); unattachedComparisons.forEach(function (item) { page.append(renderComparison(item)); }); }
      if ((model.reviews || []).length) { page.append(node('h2', { class: 'jca-section-title', text: 'Verification summary' })); model.reviews.forEach(function (item) { page.append(renderReview(item)); }); }
      page.append(node('footer', { class: 'jca-footer', text: writable ? (dirty() ? 'Unsaved response edits are on this page.' : countText() + '.') : 'Responses are read-only in this artifact.' }));
      root.append(page);
      if (focusedId) {
        var focusTarget = document.getElementById(focusedId);
        if (focusTarget && !focusTarget.disabled) focusTarget.focus({ preventScroll: true });
      }
      if (copyFallback) {
        var fallback = node('textarea', { class: 'jca-copy-fallback', 'aria-label': 'Saved response data to copy' });
        fallback.value = copyFallback;
        root.append(fallback);
        fallback.focus(); fallback.select();
      }
    }
    render();
    if (transport && typeof transport.load === 'function') refresh();
    return { refresh: refresh, destroy: function () { destroyed = true; root.replaceChildren(); } };
  }

  global.JoycraftArtifacts = global.JoycraftArtifacts || {};
  global.JoycraftArtifacts.mount = mount;
})(window);
