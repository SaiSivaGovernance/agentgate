import { DOCUMENTS, ROLES } from './catalog.mjs';

export function isRole(role) { return ROLES.some((candidate) => candidate.id === role); }

export function accessDecision(session, document) {
  if (session.revoked.has(document.id)) return { access: false, reason: 'Revoked for this session. Restore the source to make it eligible again.' };
  if (!document.roles.includes(session.role)) return { access: false, reason: `The ${session.role} role has no permission to retrieve this source.` };
  return { access: true, reason: document.fields.some((field) => field.restricted)
    ? 'Permitted with contact and payment identifiers masked before retrieval.'
    : 'Permitted by this role’s source access policy.' };
}

export function visibleSource(session, document) {
  if (!accessDecision(session, document).access) return null;
  const maskedFields = [];
  const fields = document.fields.map((field) => {
    if (field.restricted) maskedFields.push(`${document.id}.${field.key}`);
    return { key: field.key, label: field.label, value: field.restricted ? '[MASKED]' : field.value };
  });
  return { id: document.id, title: document.title, fields, maskedFields,
    excerpt: fields.map((field) => `${field.label}: ${field.value}`).join('\n') };
}

function words(value) { return new Set(value.toLowerCase().normalize('NFKC').match(/[a-z]+/g) || []); }

export function retrieve(session, question) {
  const terms = words(question);
  // Lexical topic matching is deliberately explicit and inspectable in this lab.
  const relevant = DOCUMENTS.filter((document) => document.topics.some((term) => terms.has(term)));
  const allowed = relevant.filter((document) => accessDecision(session, document).access).map((document) => visibleSource(session, document));
  const denied = relevant.filter((document) => !accessDecision(session, document).access).map((document) => document.id);
  return { relevant: relevant.map((document) => document.id), allowed, denied,
    maskedFields: allowed.flatMap((source) => source.maskedFields) };
}

function normalized(value) { return String(value).toLowerCase().normalize('NFKC').replace(/[^a-z0-9]/g, ''); }

export function outputViolations(session, text, authorizedIds) {
  const haystack = normalized(text);
  const ids = new Set(authorizedIds);
  const visibleValues = new Set(DOCUMENTS.filter((document) => ids.has(document.id) && accessDecision(session, document).access).flatMap((document) => document.fields.filter((field) => !field.restricted).map((field) => normalized(field.value))));
  const violations = [];
  for (const document of DOCUMENTS) {
    const readable = ids.has(document.id) && accessDecision(session, document).access;
    for (const field of document.fields) {
      if ((!readable || field.restricted) && !visibleValues.has(normalized(field.value)) && normalized(field.value).length >= 7 && haystack.includes(normalized(field.value))) {
        // Never return the blocked value itself in diagnostics or receipts.
        violations.push(`${document.id}.${field.key}`);
      }
    }
  }
  return [...new Set(violations)];
}

export function unsafeInstruction(question) {
  return /(?:ignore|override|bypass|disable)\b[\s\S]{0,100}\b(?:instruction|policy|policies|permission|security|rule|mask)|(?:system|developer)\s+(?:prompt|message)|(?:base64|hex|rot13|encode|decode)\b|\b(?:curl|fetch|execute|run)\b[\s\S]{0,60}\b(?:url|command|shell|script|sql)|https?:\/\//i.test(question);
}
