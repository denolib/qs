const has = Object.prototype.hasOwnProperty;

const hexTable = (() => {
  const array = [] as string[];
  for (let i = 0; i < 256; ++i) {
    array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
  }
  return array;
})();

function compactQueue(queue) {
  while (queue.length > 1) {
    const item = queue.pop();
    const obj = item.obj[item.prop];

    if (Array.isArray(obj)) {
      const compacted = [];

      for (let j = 0; j < obj.length; ++j) {
        if (typeof obj[j] !== "undefined") {
          compacted.push(obj[j]);
        }
      }

      item.obj[item.prop] = compacted;
    }
  }
}

export function arrayToObject(source, options) {
  const obj = options && options.plainObjects ? Object.create(null) : {};
  for (let i = 0; i < source.length; ++i) {
    if (typeof source[i] !== "undefined") {
      obj[i] = source[i];
    }
  }

  return obj;
}

export function merge(target, source, options?) {
  if (!source) {
    return target;
  }

  if (typeof source !== "object") {
    if (Array.isArray(target)) {
      target.push(source);
    } else if (typeof target === "object") {
      if (
        (options && (options.plainObjects || options.allowPrototypes)) ||
        !has.call(Object.prototype, source)
      ) {
        target[source] = true;
      }
    } else {
      return [target, source];
    }

    return target;
  }

  if (typeof target !== "object") {
    return [target].concat(source);
  }

  let mergeTarget = target;
  if (Array.isArray(target) && !Array.isArray(source)) {
    mergeTarget = arrayToObject(target, options);
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    source.forEach(function(item, i) {
      if (has.call(target, i)) {
        if (
          target[i] &&
          typeof target[i] === "object" &&
          item &&
          typeof item === "object"
        ) {
          target[i] = merge(target[i], item, options);
        } else {
          target.push(item);
        }
      } else {
        target[i] = item;
      }
    });
    return target;
  }

  return Object.keys(source).reduce(function(acc, key) {
    const value = source[key];

    if (has.call(acc, key)) {
      acc[key] = merge(acc[key], value, options);
    } else {
      acc[key] = value;
    }
    return acc;
  }, mergeTarget);
}

export function assign(target, source) {
  return Object.keys(source).reduce(function(acc, key) {
    acc[key] = source[key];
    return acc;
  }, target);
}

export function decode(str: string, decoder: any, charset: string) {
  const strWithoutPlus = str.replace(/\+/g, " ");
  if (charset === "iso-8859-1") {
    // unescape never throws, no try...catch needed:
    return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
  }
  // utf-8
  try {
    return decodeURIComponent(strWithoutPlus);
  } catch (e) {
    return strWithoutPlus;
  }
}
export function encode(str, defaultEncoder, charset) {
  // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
  // It has been adapted here for stricter adherence to RFC 3986
  if (str.length === 0) {
    return str;
  }

  const string = typeof str === "string" ? str : String(str);

  if (charset === "iso-8859-1") {
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
      return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
    });
  }

  let out = "";
  for (let i = 0; i < string.length; ++i) {
    let c = string.charCodeAt(i);

    if (
      c === 0x2d || // -
      c === 0x2e || // .
      c === 0x5f || // _
      c === 0x7e || // ~
      (c >= 0x30 && c <= 0x39) || // 0-9
      (c >= 0x41 && c <= 0x5a) || // a-z
      (c >= 0x61 && c <= 0x7a) // A-Z
    ) {
      out += string.charAt(i);
      continue;
    }

    if (c < 0x80) {
      out = out + hexTable[c];
      continue;
    }

    if (c < 0x800) {
      out = out + (hexTable[0xc0 | (c >> 6)] + hexTable[0x80 | (c & 0x3f)]);
      continue;
    }

    if (c < 0xd800 || c >= 0xe000) {
      out =
        out +
        (hexTable[0xe0 | (c >> 12)] +
          hexTable[0x80 | ((c >> 6) & 0x3f)] +
          hexTable[0x80 | (c & 0x3f)]);
      continue;
    }

    i += 1;
    c = 0x10000 + (((c & 0x3ff) << 10) | (string.charCodeAt(i) & 0x3ff));
    out +=
      hexTable[0xf0 | (c >> 18)] +
      hexTable[0x80 | ((c >> 12) & 0x3f)] +
      hexTable[0x80 | ((c >> 6) & 0x3f)] +
      hexTable[0x80 | (c & 0x3f)];
  }

  return out;
}

export function compact(value) {
  const queue = [{ obj: { o: value }, prop: "o" }];
  const refs = [];

  for (let i = 0; i < queue.length; ++i) {
    const item = queue[i];
    const obj = item.obj[item.prop];

    const keys = Object.keys(obj);
    for (let j = 0; j < keys.length; ++j) {
      const key = keys[j];
      const val = obj[key];
      if (typeof val === "object" && val !== null && refs.indexOf(val) === -1) {
        queue.push({ obj: obj, prop: key });
        refs.push(val);
      }
    }
  }

  compactQueue(queue);

  return value;
}

export function isRegExp(obj) {
  return Object.prototype.toString.call(obj) === "[object RegExp]";
}

export function isBuffer(obj) {
  if (obj === null || typeof obj === "undefined") {
    return false;
  }

  return !!(
    obj.constructor &&
    obj.constructor.isBuffer &&
    obj.constructor.isBuffer(obj)
  );
}

export function combine(a, b) {
  return [].concat(a, b);
}
