(function artifactTransports(global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var RESPONSE_KIND = 'joycraft-artifact-responses';
  var MAX_NOTE_LENGTH = 4000;
  var QUESTION_STATES = new Set(['open', 'assigned', 'clarified', 'settled', 'backlogged', 'discarded']);

  function fail(message) { throw new Error(message); }
  function nonempty(value) { return typeof value === 'string' && value.trim().length > 0; }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }

  function validateModel(model) {
    if (!model || typeof model !== 'object' || Array.isArray(model) || !nonempty(model.artifactId)) fail('Artifact model needs an artifactId.');
    if (!model.source || !nonempty(model.source.path) || !nonempty(model.source.revision) || (model.source.viewRevision !== undefined && !nonempty(model.source.viewRevision))) fail('Artifact model needs a source path and revision.');
    if (!Array.isArray(model.questions)) fail('Artifact model needs questions.');
    var ids = new Set();
    model.questions.forEach(function (question) {
      if (!question || typeof question !== 'object' || Array.isArray(question) || !nonempty(question.id) || ids.has(question.id)) fail('Questions need unique IDs.');
      if (!QUESTION_STATES.has(question.status)) fail('Question ' + question.id + ' has an invalid status.');
      if (!Array.isArray(question.options) || question.options.length < 1) fail('Question ' + question.id + ' needs declared options.');
      ids.add(question.id);
      var options = new Set();
      question.options.forEach(function (option) {
        if (!option || typeof option !== 'object' || Array.isArray(option) || !nonempty(option.value) || options.has(option.value)) fail('Question ' + question.id + ' has invalid options.');
        if (option.requiresNote !== undefined && typeof option.requiresNote !== 'boolean') fail('Question ' + question.id + ' has an invalid requiresNote flag.');
        options.add(option.value);
      });
    });
    return model;
  }

  function questionIndex(model) {
    return model.questions.reduce(function (index, question) { index[question.id] = question; return index; }, Object.create(null));
  }

  function validateAnswers(model, answers, mutation) {
    if (!Array.isArray(answers)) fail('Answers must be an array.');
    var questions = questionIndex(model);
    var seen = new Set();
    return answers.map(function (response) {
      if (!response || typeof response !== 'object' || Array.isArray(response) || !nonempty(response.id) || !nonempty(response.answer) || seen.has(response.id)) fail('Answers need unique question IDs and declared choices.');
      if (!own(questions, response.id)) fail('Answer refers to an unknown question.');
      var question = questions[response.id];
      if (mutation && ['backlogged', 'discarded', 'settled'].indexOf(question.status) !== -1) fail('This question is not open for responses.');
      var option = question.options.filter(function (candidate) { return candidate.value === response.answer; })[0];
      if (!option) fail('Answer is not one of the declared options.');
      var note = own(response, 'note') && response.note !== undefined ? response.note : undefined;
      if (note !== undefined && typeof note !== 'string') fail('Answer notes must be strings.');
      if (note !== undefined && note.length > MAX_NOTE_LENGTH) fail('Answer notes cannot exceed 4000 characters.');
      if (option.requiresNote && !nonempty(note)) fail('This answer requires a note.');
      if (mutation && question.status === 'clarified' && (question.answer !== response.answer || (question.note || '') !== (note || ''))) fail('Clarified responses can only be replayed exactly.');
      seen.add(response.id);
      var answer = { id: response.id, answer: response.answer };
      if (note !== undefined && note !== '') answer.note = note;
      return answer;
    });
  }

  function sourceMatches(model, source) {
    return source && source.path === model.source.path && source.revision === model.source.revision && source.viewRevision === model.source.viewRevision;
  }

  function envelope(model, answers) {
    return {
      schemaVersion: SCHEMA_VERSION,
      kind: RESPONSE_KIND,
      artifactId: model.artifactId,
      source: Object.assign({ path: model.source.path, revision: model.source.revision }, model.source.viewRevision === undefined ? {} : { viewRevision: model.source.viewRevision }),
      answers: validateAnswers(model, answers)
    };
  }

  function validateEnvelope(model, stored) {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) fail('Stored responses are malformed.');
    if (stored.schemaVersion !== SCHEMA_VERSION || stored.kind !== RESPONSE_KIND || stored.artifactId !== model.artifactId) fail('Stored responses belong to a different artifact.');
    if (!sourceMatches(model, stored.source)) fail('Stored responses belong to a different source revision. Reload the matching artifact.');
    return envelope(model, stored.answers);
  }

  function mergeAnswers(model, existing, incoming) {
    var values = Object.create(null);
    validateAnswers(model, existing || []).forEach(function (answer) { values[answer.id] = answer; });
    validateAnswers(model, incoming || []).forEach(function (answer) { values[answer.id] = answer; });
    return Object.keys(values).sort().map(function (id) { return values[id]; });
  }

  function result(model, answers, writable, message, storage) {
    return { model: model, responses: validateAnswers(model, answers || []), writable: Boolean(writable), message: message || '', storage: storage || 'memory' };
  }

  function responseRevision(model, revision) {
    if (revision !== model.source.revision) fail('Source changed. Refresh before saving responses.');
  }

  function requestedAnswers(model, request) {
    if (!request || !Array.isArray(request.answers) || request.answers.length === 0) fail('Choose at least one response before saving.');
    return validateAnswers(model, request.answers, true);
  }

  function portable(model, options) {
    validateModel(model);
    options = options || {}; // Intentionally memory-only: an export is the persistence boundary.
    var saved = [];
    var notice = 'Prepared for export; not saved to Claude or brief.';
    return {
      load: async function () { return result(model, saved, true, notice, 'memory'); },
      save: async function (request) {
        request = request || {};
        responseRevision(model, request.revision);
        saved = mergeAnswers(model, saved, requestedAnswers(model, request));
        return result(model, saved, true, notice, 'memory');
      },
      exportResponses: function (responses) { return envelope(model, responses === undefined ? saved : responses); }
    };
  }

  function local(model, options) {
    validateModel(model);
    options = options || {};
    if (!nonempty(options.token)) fail('Local transport needs an artifact token.');
    var request = options.fetch || global.fetch;
    if (typeof request !== 'function') fail('Local transport needs fetch.');
    function headers() { return { 'X-Artifact-Token': options.token, 'Content-Type': 'application/json' }; }
    async function call(path, init) {
      var response = await request(path, init);
      var payload;
      try { payload = await response.json(); } catch (_) { fail('Local response service returned invalid JSON.'); }
      if (!response || !response.ok) {
        var detail = payload && (payload.error || payload.message);
        fail(typeof detail === 'string' && detail ? detail : 'Local response service rejected the request' + (response && response.status ? ' (' + response.status + ')' : '') + '.');
      }
      return payload;
    }
    function decoded(payload) {
      if (!payload || typeof payload !== 'object') fail('Local response service returned no state.');
      var remoteModel = payload.model || model;
      validateModel(remoteModel);
      if (remoteModel.artifactId !== model.artifactId || remoteModel.source.path !== model.source.path) fail('Local response service returned another artifact.');
      model = remoteModel;
      return result(model, payload.responses || [], payload.writable !== false, payload.message, 'brief');
    }
    return {
      load: async function () { return decoded(await call('/state', { method: 'GET', headers: headers() })); },
      save: async function (requestBody) {
        requestBody = requestBody || {};
        responseRevision(model, requestBody.revision);
        var submitted = requestedAnswers(model, requestBody);
        await call('/answers', { method: 'POST', headers: headers(), body: JSON.stringify(Object.assign({ revision: requestBody.revision, answers: submitted }, model.source.viewRevision === undefined ? {} : { viewRevision: model.source.viewRevision })) });
        var verified = decoded(await call('/state', { method: 'GET', headers: headers() }));
        var verifiedById = new Map(verified.responses.map(function (answer) { return [answer.id, answer]; }));
        submitted.forEach(function (answer) {
          var actual = verifiedById.get(answer.id);
          if (!actual || actual.answer !== answer.answer || (actual.note || '') !== (answer.note || '')) fail('Local response service did not durably confirm every saved response.');
        });
        return verified;
      },
      exportResponses: function (responses) { return envelope(model, responses); }
    };
  }

  function unavailable(error) {
    return /sign.?in|unauth|permission|forbidden|not.?available|unsupported/i.test(String(error && error.message || error));
  }

  function claude(model, options) {
    validateModel(model);
    options = options || {};
    var host = options.host === undefined ? global.claude : options.host;
    var fallback = portable(model);
    var dbPromise;
    var usingFallback = false;
    var documentPrefix = 'joycraft-artifacts/' + encodeURIComponent(model.artifactId) + '/revisions/' + encodeURIComponent(model.source.revision) + '/views/' + encodeURIComponent(model.source.viewRevision || 'none') + '/decisions/';

    async function database() {
      if (usingFallback) return null;
      if (!dbPromise) dbPromise = Promise.resolve().then(function () {
        if (!host || typeof host.use !== 'function') return null;
        return host.use('db');
      });
      try {
        var db = await dbPromise;
        if (!db || typeof db.doc !== 'function') { usingFallback = true; return null; }
        return db;
      } catch (_) { usingFallback = true; return null; }
    }
    async function fallbackResult() { usingFallback = true; return fallback.load(); }
    function fromSnapshot(snapshot, id) {
      if (!snapshot) return [];
      if (snapshot.metadata && (snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache)) fail('Claude storage has not durably confirmed this response yet.');
      if (snapshot.exists === false) return [];
      if (typeof snapshot.data !== 'function') fail('Claude storage returned an unreadable response.');
      var answers = validateEnvelope(model, snapshot.data()).answers;
      if (answers.length !== 1 || answers[0].id !== id) fail('Claude storage returned a response under the wrong decision key.');
      return answers;
    }
    function documentFor(db, id) { return db.doc(documentPrefix + encodeURIComponent(id)); }
    async function readOne(db, id) { return fromSnapshot(await documentFor(db, id).get(), id)[0]; }
    async function readAll(db) {
      var answers = await Promise.all(model.questions.map(async function (question) { return readOne(db, question.id); }));
      return answers.filter(Boolean);
    }

    return {
      load: async function () {
        var db = await database();
        if (!db) return fallbackResult();
        try { return result(model, await readAll(db), true, 'Responses load from Claude artifact storage. They do not update the brief.', 'claude'); }
        catch (error) { if (unavailable(error)) return fallbackResult(); throw error; }
      },
      save: async function (requestBody) {
        requestBody = requestBody || {};
        responseRevision(model, requestBody.revision);
        var db = await database();
        if (!db) return fallback.save(requestBody);
        var submitted = requestedAnswers(model, requestBody);
        var saved = 0;
        for (var index = 0; index < submitted.length; index += 1) {
          var answer = submitted[index];
          try {
            await documentFor(db, answer.id).set(envelope(model, [answer]));
            var confirmed = await readOne(db, answer.id);
            if (!confirmed || confirmed.answer !== answer.answer || (confirmed.note || '') !== (answer.note || '')) fail('Claude storage did not durably confirm this response.');
            saved += 1;
          } catch (error) {
            fail('Saved ' + saved + ' of ' + submitted.length + '; refresh to see stored answers. ' + (error && error.message ? error.message : 'Claude storage failed.'));
          }
        }
        return result(model, await readAll(db), true, 'Saved in Claude artifact storage. This does not update the brief.', 'claude');
      },
      exportResponses: function (responses) { return envelope(model, responses); }
    };
  }

  global.JoycraftArtifactTransports = { local: local, claude: claude, portable: portable };
})(window);
