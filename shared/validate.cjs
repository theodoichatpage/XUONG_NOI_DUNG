'use strict';
// Minimal JSON Schema (2020-12 subset) validator with no dependencies.
// Supports: type, const, enum, required, properties, additionalProperties:false, items,
// minItems, maxItems, minLength, maxLength, pattern, minimum, maximum, format:date-time, $ref to #/$defs.
function validate(schema, value, root = schema, path = '$') {
  const errors = [];
  const at = (msg) => errors.push(path + ': ' + msg);
  if (schema.$ref) {
    const name = schema.$ref.replace(/^#\/\$defs\//, '');
    const def = root.$defs && root.$defs[name];
    if (!def) { at('unknown $ref ' + schema.$ref); return errors; }
    return validate(def, value, root, path);
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value;
    const ok = types.some(t => t === actual || (t === 'number' && actual === 'integer'));
    if (!ok) { at('expected ' + types.join('|') + ', got ' + actual); return errors; }
  }
  if ('const' in schema && value !== schema.const) at('must equal ' + JSON.stringify(schema.const));
  if (schema.enum && !schema.enum.includes(value)) at('must be one of ' + schema.enum.join(', '));
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) at('shorter than ' + schema.minLength);
    if (schema.maxLength != null && value.length > schema.maxLength) at('longer than ' + schema.maxLength);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) at('does not match ' + schema.pattern);
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) at('not a date-time');
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) at('below ' + schema.minimum);
    if (schema.maximum != null && value > schema.maximum) at('above ' + schema.maximum);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) at('fewer than ' + schema.minItems + ' items');
    if (schema.maxItems != null && value.length > schema.maxItems) at('more than ' + schema.maxItems + ' items');
    if (schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, root, path + '[' + i + ']')));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required || []) if (!(k in value)) at('missing ' + k);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) errors.push(...validate(props[k], v, root, path + '.' + k));
      else if (schema.additionalProperties === false) at('unexpected property ' + k);
    }
  }
  return errors;
}
module.exports = { validate };
