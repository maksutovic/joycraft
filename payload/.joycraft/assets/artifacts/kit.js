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

  // What a person decides from: the question, its options, and its recorded state.
  function questionSignature(question) {
    return JSON.stringify({
      question: question.question || '',
      options: (question.options || []).map(function (option) {
        return { value: option.value, label: option.label || '', description: option.description || '', example: option.example || '', tradeoff: option.tradeoff || '', recommended: Boolean(option.recommended), requiresNote: Boolean(option.requiresNote) };
      }),
      recommendation: question.recommendation || '',
      status: question.status || '',
      answer: question.answer == null ? null : question.answer,
      note: question.note == null ? '' : question.note
    });
  }

  // Questions that differ between two models: changed, added or removed, in display order.
  function changedQuestions(before, after) {
    var oldQuestions = (before && before.questions) || [];
    var newQuestions = (after && after.questions) || [];
    var oldById = Object.create(null);
    oldQuestions.forEach(function (question) { oldById[question.id] = question; });
    var newIds = Object.create(null);
    var changes = [];
    newQuestions.forEach(function (question) {
      newIds[question.id] = true;
      var previous = oldById[question.id];
      if (!previous) changes.push({ id: question.id, question: question.question || question.id, change: 'added' });
      else if (questionSignature(previous) !== questionSignature(question)) changes.push({ id: question.id, question: question.question || question.id, change: 'changed' });
    });
    oldQuestions.forEach(function (question) {
      if (!newIds[question.id]) changes.push({ id: question.id, question: question.question || question.id, change: 'removed' });
    });
    return changes;
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
    // Persistent notice after the brief changed under this page. It stays until dismissed,
    // so selecting options (which updates the status line) never hides it.
    var sourceNotice = null;
    // The notice element is created once and reused, so a re-render does not re-announce it.
    var noticeElement = null, noticeKey = '';
    var message = transport ? 'Loading saved responses…' : 'Read-only preview. A response transport is not available.';
    var messageKind = transport ? 'quiet' : 'notice';

    function isReadOnly(question) {
      return !writable || ['clarified', 'settled', 'backlogged', 'discarded'].indexOf(question.status) !== -1;
    }
    // A saved answer keeps its note open: the note can be added or changed and saved again.
    function canEditNote(question) {
      return writable && (!isReadOnly(question) || question.status === 'clarified');
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
        return q && canEditNote(q) && !sameResponses({ value: item }, { value: saved[item.id] || {} });
      }); }

    async function save(question) {
      if (!transport || !writable || saving || loading) return;
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
        if (sourceNotice && sourceNotice.conflict) sourceNotice.saved = true;
        setMessage('success', (result && result.message) || 'Saved in artifact — awaiting brief sync.');
      } catch (error) {
        if (error && error.conflict) await reloadAfterConflict(error);
        else setMessage('error', 'Could not save. Your edits are still here. ' + (error && error.message ? error.message : 'Try refreshing before saving again.'));
      } finally { saving = false; render(); }
    }
    // The source changed after this page loaded: reload it, keep drafts for unchanged
    // questions, and name the questions that changed in the persistent notice.
    async function reloadAfterConflict(error) {
      var reason = error && error.message ? error.message : 'The source changed after this page loaded.';
      if (typeof transport.load !== 'function') { setMessage('error', 'Not saved. ' + reason + ' Reload the page to continue.'); return; }
      try {
        var latest = await transport.load();
        if (destroyed) return;
        applyLoaded(latest, true);
      } catch (loadError) {
        setMessage('error', 'Not saved. ' + reason + ' Reloading the source also failed: ' + (loadError && loadError.message ? loadError.message : 'unknown error') + '. Your edits are still here.');
        return;
      }
      sourceNotice = sourceNotice || { changes: [], viewChanged: false };
      sourceNotice.conflict = reason;
      sourceNotice.saved = false;
      setMessage('error', 'Not saved: ' + reason + ' The page now shows the current source. Your other answers are kept; save again.');
    }
    function mergeNotice(changes, viewChanged) {
      var current = sourceNotice || { changes: [], viewChanged: false, conflict: '' };
      changes.forEach(function (change) {
        var existing = current.changes.filter(function (item) { return item.id === change.id; })[0];
        if (existing) { existing.question = change.question; if (change.change === 'removed' || existing.change !== 'added') existing.change = change.change; }
        else current.changes.push(change);
      });
      current.viewChanged = current.viewChanged || viewChanged;
      sourceNotice = current;
    }
    function changedIds() { return sourceNotice ? sourceNotice.changes.map(function (change) { return change.id; }) : []; }
    function applyLoaded(result, preserveDraft, confirmedIds) {
      confirmedIds = confirmedIds || [];
      if (!result) throw new Error('The response transport returned no state.');
      var oldModel = model;
      var oldViewRevision = viewRevision;
      var pending = Object.assign(Object.create(null), draft);
      var previouslySaved = Object.assign(Object.create(null), saved);
      model = result.model || model;
      revision = model.source && model.source.revision;
      viewRevision = model.source && model.source.viewRevision;
      writable = Boolean(result.writable);
      storage = result.storage || storage;
      saved = responseMap(result.responses);
      // Portable pages store only their own answers; start a recorded answer from the brief so its note can change.
      (model.questions || []).forEach(function (q) {
        if (q.status === 'clarified' && q.answer && !saved[q.id]) saved[q.id] = { answer: q.answer, note: q.note || '' };
      });
      draft = Object.assign(Object.create(null), saved);
      // Our own save changes the saved questions; any other difference came from elsewhere.
      var changes = changedQuestions(oldModel, model).filter(function (change) { return confirmedIds.indexOf(change.id) === -1; });
      var viewChanged = Boolean(oldViewRevision && viewRevision && oldViewRevision !== viewRevision);
      if (changes.length || viewChanged) mergeNotice(changes, viewChanged);
      // Only questions that changed in this load lose a pending choice; earlier ones were already re-chosen.
      var changed = changes.map(function (change) { return change.id; });
      if (preserveDraft && !sameResponses(pending, previouslySaved)) {
        Object.keys(pending).forEach(function (id) {
          if (confirmedIds.indexOf(id) !== -1) return;
          var question = (model.questions || []).filter(function (q) { return q.id === id; })[0];
          if (!question || !canEditNote(question)) return;
          var before = previouslySaved[id] || { answer: '', note: '' };
          var after = pending[id] || { answer: '', note: '' };
          if (before.answer === after.answer && (before.note || '') === (after.note || '')) return;
          // A changed question needs a fresh choice; its note text is kept. Unchanged questions keep the draft.
          if (changed.indexOf(id) !== -1) draft[id] = { answer: isReadOnly(question) ? ((saved[id] || {}).answer || '') : '', note: after.note || '' };
          else draft[id] = after;
        });
      }
      if (result.message) setMessage('notice', result.message);
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
      root.querySelectorAll('[data-jca-save-all]').forEach(function (button) { describeDisabled(button, saveAllBlocked()); });
    }
    function saveAllBlocked() {
      if (!writable) return 'Responses are read-only in this artifact.';
      if (saving) return 'A save is in progress.';
      if (loading) return 'Saved responses are still loading.';
      if (!unsavedAnswers().length) return 'Nothing to save: choose a response first.';
      return '';
    }
    function saveOneBlocked() {
      if (saving) return 'A save is in progress.';
      if (loading) return 'Saved responses are still loading.';
      return '';
    }
    // A disabled button says why: as its tooltip and as its accessible description.
    function describeDisabled(button, reason) {
      button.disabled = Boolean(reason);
      var reasonNode = button.jcaReason;
      if (reasonNode) reasonNode.textContent = reason || '';
      if (reason) {
        button.setAttribute('title', reason);
        if (reasonNode) button.setAttribute('aria-describedby', reasonNode.id);
      } else {
        button.removeAttribute('title');
        button.removeAttribute('aria-describedby');
      }
    }
    // Returns [button, hidden reason element]; both go into the page.
    function saveButton(attributes, reason, reasonId) {
      var button = node('button', Object.assign({ type: 'button' }, attributes));
      button.jcaReason = node('span', { id: reasonId, class: 'jca-visually-hidden' });
      describeDisabled(button, reason);
      return [button, button.jcaReason];
    }
    function renderSourceNotice() {
      if (!sourceNotice) { noticeElement = null; noticeKey = ''; return null; }
      var key = JSON.stringify(sourceNotice);
      if (noticeElement && key === noticeKey) return noticeElement;
      var blocked = sourceNotice.conflict && !sourceNotice.saved;
      if (!noticeElement) noticeElement = node('section', { role: 'alert', 'aria-labelledby': 'jca-source-notice-title' });
      noticeElement.className = 'jca-source-notice' + (blocked ? ' jca-source-notice-error' : '');
      noticeElement.replaceChildren();
      noticeKey = key;
      var banner = noticeElement;
      banner.append(node('h2', { id: 'jca-source-notice-title', text: blocked ? 'Not saved: the source changed after this page loaded'
        : sourceNotice.conflict ? 'The source changed after this page loaded; your later save went through' : 'The source changed after this page loaded' }));
      if (blocked) banner.append(node('p', { text: sourceNotice.conflict }));
      if (sourceNotice.changes.length) {
        banner.append(node('p', { text: sourceNotice.changes.length === 1 ? 'This question changed:' : 'These questions changed:' }));
        var list = node('ul');
        sourceNotice.changes.forEach(function (change) {
          var label = change.change === 'removed' ? ' (removed)' : change.change === 'added' ? ' (new)' : '';
          list.append(node('li', {}, [change.change === 'removed' ? text(change.question + label) : node('a', { href: '#jca-question-' + change.id, text: change.question + label })]));
        });
        banner.append(list);
        banner.append(node('p', { text: 'Choose again where a changed question needs it. Answers to other questions are kept and can be saved now.' }));
      } else {
        banner.append(node('p', { text: sourceNotice.viewChanged ? 'The screenshots or review on this page changed. No question changed; your answers are kept and can be saved now.' : 'No question on this page changed. Your answers are kept and can be saved now.' }));
      }
      banner.append(node('button', { type: 'button', text: 'Dismiss', onclick: function () { sourceNotice = null; setMessage('quiet', dirty() ? 'Unsaved changes.' : 'Source changes reviewed.'); render(); } }));
      return banner;
    }
    function renderQuestion(question, index) {
      var current = draft[question.id] || { answer: '', note: '' };
      var readOnly = isReadOnly(question);
      var body = node('section', { class: 'jca-question', id: 'jca-question-' + question.id });
      body.append(node('div', { class: 'jca-question-kicker', text: 'Decision ' + (index + 1) }), node('h2', { text: question.question }));
      if (changedIds().indexOf(question.id) !== -1) body.append(node('p', { class: 'jca-changed', text: 'Changed in the source since this page loaded. Check it and choose again if needed.' }));
      body.append(node('p', { class: 'jca-status jca-status-' + (question.status || 'open'), text: statusLabel(question.status) }));
      if (question.answer) body.append(node('p', { class: 'jca-recorded', text: 'Brief record: ' + question.answer }));
      (model.comparisons || []).filter(function (comparison) { return comparison.decisionId === question.id; }).forEach(function (comparison) { body.append(renderComparison(comparison)); });
      // Context comes before the choice, never behind a click: a person should not have to remember it.
      if (question.context || question.why) {
        body.append(node('div', { class: 'jca-context' }, [
          question.context ? node('p', { text: question.context }) : null,
          question.why ? node('p', { text: question.why }) : null
        ]));
      }
      if (question.details || (question.affected || []).length) {
        var detail = node('details', { class: 'jca-details' }, [node('summary', { text: 'More detail' })]);
        if (question.details) detail.append(node('p', { text: question.details }));
        if ((question.affected || []).length) detail.append(node('p', { text: 'Affected: ' + question.affected.join(', ') }));
        body.append(detail);
      }
      var fieldset = node('fieldset', { class: 'jca-options', disabled: readOnly });
      fieldset.append(node('legend', { text: readOnly ? 'Responses are read-only' : 'Choose one response' }));
      // The recommended option leads; "Something else" always closes the list.
      var rank = function (option) { return option.value === 'custom' ? 2 : option.recommended ? 0 : 1; };
      var ordered = (question.options || []).map(function (option, position) { return { option: option, position: position }; })
        .sort(function (left, right) { return rank(left.option) - rank(right.option) || left.position - right.position; })
        .map(function (item) { return item.option; });
      var optionLine = function (name, value) { return value ? node('small', { class: 'jca-option-line' }, [node('b', { text: name + ': ' }), text(value)]) : null; };
      ordered.forEach(function (option) {
        var id = 'jca-' + question.id + '-' + option.value;
        var radio = node('input', { type: 'radio', id: id, name: 'jca-answer-' + question.id, value: option.value, checked: current.answer === option.value,
          onchange: function () { draft[question.id] = { answer: option.value, note: (draft[question.id] || {}).note || '' }; setMessage('quiet', 'Unsaved changes.'); syncLiveUi(); syncNoteRequirement(); } });
        var title = node('strong', { text: option.label }, [option.recommended ? node('span', { class: 'jca-badge', text: 'Recommended' }) : null]);
        var label = node('label', { class: 'jca-option' + (option.recommended ? ' jca-option-recommended' : ''), for: id }, [radio, node('span', { class: 'jca-option-copy' }, [title, option.description ? node('small', { text: option.description }) : null, optionLine('Example', option.example), optionLine('Trade-off', option.tradeoff)])]);
        fieldset.append(label);
      });
      body.append(fieldset);
      var pick = (question.options || []).find(function (option) { return option.recommended; });
      if (pick && question.recommendation) body.append(node('p', { class: 'jca-recommendation' }, [node('b', { text: 'Recommendation: ' + pick.label + '. ' }), text(question.recommendation)]));
      var note = node('textarea', { class: 'jca-note', id: 'jca-note-' + question.id, rows: 3, disabled: !canEditNote(question), placeholder: 'Optional note' });
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
      if (canEditNote(question)) body.append.apply(body, saveButton({ class: 'jca-save-one', text: readOnly ? 'Save note' : 'Save this response', onclick: function () { save(question); } }, saveOneBlocked(), 'jca-save-reason-' + question.id));
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
      var notice = renderSourceNotice();
      if (notice) page.append(notice);
      page.append(node('p', { class: 'jca-message jca-message-' + messageKind, role: messageKind === 'error' ? 'alert' : 'status', text: message }));
      var actions = node('div', { class: 'jca-actions' });
      if (transport) actions.append(node('button', { type: 'button', text: loading ? 'Refreshing…' : 'Refresh', disabled: loading || saving, onclick: refresh }));
      actions.append.apply(actions, saveButton({ 'data-jca-save-all': '', text: 'Save selected answers', onclick: function () { save(); } }, saveAllBlocked(), 'jca-save-all-reason'));
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
  global.JoycraftArtifacts.changedQuestions = changedQuestions;
})(window);
