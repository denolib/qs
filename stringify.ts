import * as utils from "utils.ts";
import { formats } from "formats.ts";

interface StringifyOptions {
  addQueryPrefix?: boolean;
  allowDots?: boolean;
  charset?: string;
  charsetSentinel?: boolean;
  delimiter?: string;
  encode?: boolean;
  encoder?: typeof utils.encode;
  encodeValuesOnly?: boolean;
  // deprecated
  indices?: boolean;
  serializeDate?: (data: Date) => string | number;
  skipNulls?: boolean;
  strictNullHandling?: boolean;
  format?;
  sort?: Function;
  filter?;
  arrayFormat?: string;
}

const arrayPrefixGenerators = {
  brackets: (prefix: string) => `${prefix}[]`,
  indices: (prefix: string, key: string) => `${prefix}[${key}]`,
  repeat: (prefix: string) => prefix
};

const isArray = Array.isArray;
const push = Array.prototype.push;
function pushToArray(arr, valueOrArray) {
  push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray]);
}

const toISO = Date.prototype.toISOString;

const defaults: StringifyOptions = {
  addQueryPrefix: false,
  allowDots: false,
  charset: "utf-8",
  charsetSentinel: false,
  delimiter: "&",
  encode: true,
  encoder: utils.encode,
  encodeValuesOnly: false,
  // deprecated
  indices: false,
  serializeDate(date) {
    return toISO.call(date);
  },
  skipNulls: false,
  strictNullHandling: false
};

function _stringify(
  object,
  prefix,
  generateArrayPrefix,
  strictNullHandling,
  skipNulls,
  encoder,
  filter,
  sort,
  allowDots,
  serializeDate,
  formatter,
  encodeValuesOnly,
  charset
) {
  let obj = object;
  if (typeof filter === "function") {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate(obj);
  }

  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly
        ? encoder(prefix, defaults.encoder, charset)
        : prefix;
    }

    obj = "";
  }

  if (
    typeof obj === "string" ||
    typeof obj === "number" ||
    typeof obj === "boolean" ||
    utils.isBuffer(obj)
  ) {
    if (encoder) {
      const keyValue = encodeValuesOnly
        ? prefix
        : encoder(prefix, defaults.encoder, charset);
      return [
        formatter(keyValue) +
          "=" +
          formatter(encoder(obj, defaults.encoder, charset))
      ];
    }
    return [formatter(prefix) + "=" + formatter(String(obj))];
  }

  const values = [];

  if (typeof obj === "undefined") {
    return values;
  }

  let objKeys;
  if (Array.isArray(filter)) {
    objKeys = filter;
  } else {
    const keys = Object.keys(obj);
    objKeys = sort ? keys.sort(sort) : keys;
  }

  for (let i = 0; i < objKeys.length; ++i) {
    const key = objKeys[i];

    if (skipNulls && obj[key] === null) {
      continue;
    }

    if (Array.isArray(obj)) {
      pushToArray(
        values,
        _stringify(
          obj[key],
          generateArrayPrefix(prefix, key),
          generateArrayPrefix,
          strictNullHandling,
          skipNulls,
          encoder,
          filter,
          sort,
          allowDots,
          serializeDate,
          formatter,
          encodeValuesOnly,
          charset
        )
      );
    } else {
      pushToArray(
        values,
        _stringify(
          obj[key],
          prefix + (allowDots ? "." + key : "[" + key + "]"),
          generateArrayPrefix,
          strictNullHandling,
          skipNulls,
          encoder,
          filter,
          sort,
          allowDots,
          serializeDate,
          formatter,
          encodeValuesOnly,
          charset
        )
      );
    }
  }

  return values;
}

export function stringify(object, opts?: StringifyOptions) {
  let obj = object;
  const options = (opts ? utils.assign({}, opts) : {}) as StringifyOptions;

  if (
    options.encoder !== null &&
    options.encoder !== undefined &&
    typeof options.encoder !== "function"
  ) {
    throw new TypeError("Encoder has to be a function.");
  }

  const delimiter =
    typeof options.delimiter === "undefined"
      ? defaults.delimiter
      : options.delimiter;
  const strictNullHandling =
    typeof options.strictNullHandling === "boolean"
      ? options.strictNullHandling
      : defaults.strictNullHandling;
  const skipNulls =
    typeof options.skipNulls === "boolean"
      ? options.skipNulls
      : defaults.skipNulls;
  const encode =
    typeof options.encode === "boolean" ? options.encode : defaults.encode;
  const encoder =
    typeof options.encoder === "function" ? options.encoder : defaults.encoder;
  const sort = typeof options.sort === "function" ? options.sort : null;
  const allowDots =
    typeof options.allowDots === "undefined"
      ? defaults.allowDots
      : !!options.allowDots;
  const serializeDate =
    typeof options.serializeDate === "function"
      ? options.serializeDate
      : defaults.serializeDate;
  const encodeValuesOnly =
    typeof options.encodeValuesOnly === "boolean"
      ? options.encodeValuesOnly
      : defaults.encodeValuesOnly;
  const charset = options.charset || defaults.charset;
  if (
    typeof options.charset !== "undefined" &&
    options.charset !== "utf-8" &&
    options.charset !== "iso-8859-1"
  ) {
    throw new Error(
      "The charset option must be either utf-8, iso-8859-1, or undefined"
    );
  }

  if (typeof options.format === "undefined") {
    options.format = formats["default"];
  } else if (
    !Object.prototype.hasOwnProperty.call(formats.formatters, options.format)
  ) {
    throw new TypeError("Unknown format option provided.");
  }
  const formatter = formats.formatters[options.format];
  let objKeys;
  let filter;

  if (typeof options.filter === "function") {
    filter = options.filter;
    obj = filter("", obj);
  } else if (Array.isArray(options.filter)) {
    filter = options.filter;
    objKeys = filter;
  }

  const keys = [];

  if (typeof obj !== "object" || obj === null) {
    return "";
  }

  let arrayFormat;
  if (options.arrayFormat in arrayPrefixGenerators) {
    arrayFormat = options.arrayFormat;
  } else if ("indices" in options) {
    arrayFormat = options.indices ? "indices" : "repeat";
  } else {
    arrayFormat = "indices";
  }

  const generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

  if (!objKeys) {
    objKeys = Object.keys(obj);
  }

  if (sort) {
    objKeys.sort(sort);
  }

  for (let i = 0; i < objKeys.length; ++i) {
    const key = objKeys[i];

    if (skipNulls && obj[key] === null) {
      continue;
    }
    pushToArray(
      keys,
      _stringify(
        obj[key],
        key,
        generateArrayPrefix,
        strictNullHandling,
        skipNulls,
        encode ? encoder : null,
        filter,
        sort,
        allowDots,
        serializeDate,
        formatter,
        encodeValuesOnly,
        charset
      )
    );
  }

  const joined = keys.join(delimiter);
  let prefix = options.addQueryPrefix === true ? "?" : "";

  if (options.charsetSentinel) {
    if (charset === "iso-8859-1") {
      // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
      prefix += "utf8=%26%2310003%3B&";
    } else {
      // encodeURIComponent('✓')
      prefix += "utf8=%E2%9C%93&";
    }
  }

  return joined.length > 0 ? prefix + joined : "";
}
