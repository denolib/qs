import { assertEqual, test } from "https://deno.land/x/testing/mod.ts";
import { stringify } from "stringify.ts";
import * as utils from "utils.ts";
import { formats } from "formats.ts";

test({
  name: "stringifies a querystring object",
  fn: () => {
    assertEqual(stringify({ a: "b" }), "a=b");
    assertEqual(stringify({ a: 1 }), "a=1");
    assertEqual(stringify({ a: 1, b: 2 }), "a=1&b=2");
    assertEqual(stringify({ a: "A_Z" }), "a=A_Z");
    assertEqual(stringify({ a: "€" }), "a=%E2%82%AC");
    assertEqual(stringify({ a: "" }), "a=%EE%80%80");
    assertEqual(stringify({ a: "א" }), "a=%D7%90");
    assertEqual(stringify({ a: "𐐷" }), "a=%F0%90%90%B7");
  }
});

test({
  name: "adds query prefix",
  fn: () => {
    assertEqual(stringify({ a: "b" }, { addQueryPrefix: true }), "?a=b");
  }
});

test({
  name: "with query prefix, outputs blank string given an empty object",
  fn: () => {
    assertEqual(stringify({}, { addQueryPrefix: true }), "");
  }
});

test({
  name: "stringifies a nested object",
  fn: () => {
    assertEqual(stringify({ a: { b: "c" } }), "a%5Bb%5D=c");
    assertEqual(
      stringify({ a: { b: { c: { d: "e" } } } }),
      "a%5Bb%5D%5Bc%5D%5Bd%5D=e"
    );
  }
});

test({
  name: "stringifies a nested object with dots notation",
  fn: () => {
    assertEqual(stringify({ a: { b: "c" } }, { allowDots: true }), "a.b=c");
    assertEqual(
      stringify({ a: { b: { c: { d: "e" } } } }, { allowDots: true }),
      "a.b.c.d=e"
    );
  }
});

test({
  name: "stringifies an array value",
  fn: () => {
    assertEqual(
      stringify({ a: ["b", "c", "d"] }, { arrayFormat: "indices" }),
      "a%5B0%5D=b&a%5B1%5D=c&a%5B2%5D=d",
      "indices => indices"
    );
    assertEqual(
      stringify({ a: ["b", "c", "d"] }, { arrayFormat: "brackets" }),
      "a%5B%5D=b&a%5B%5D=c&a%5B%5D=d",
      "brackets => brackets"
    );
    assertEqual(
      stringify({ a: ["b", "c", "d"] }),
      "a%5B0%5D=b&a%5B1%5D=c&a%5B2%5D=d",
      "default => indices"
    );
  }
});

test({
  name: "omits nulls when asked",
  fn: () => {
    assertEqual(stringify({ a: "b", c: null }, { skipNulls: true }), "a=b");
  }
});

test({
  name: "omits nested nulls when asked",
  fn: () => {
    assertEqual(
      stringify({ a: { b: "c", d: null } }, { skipNulls: true }),
      "a%5Bb%5D=c"
    );
  }
});

test({
  name: "omits array indices when asked",
  fn: () => {
    assertEqual(
      stringify({ a: ["b", "c", "d"] }, { indices: false }),
      "a=b&a=c&a=d"
    );
  }
});

test({
  name: "stringifies a nested array value",
  fn: () => {
    assertEqual(
      stringify({ a: { b: ["c", "d"] } }, { arrayFormat: "indices" }),
      "a%5Bb%5D%5B0%5D=c&a%5Bb%5D%5B1%5D=d"
    );
    assertEqual(
      stringify({ a: { b: ["c", "d"] } }, { arrayFormat: "brackets" }),
      "a%5Bb%5D%5B%5D=c&a%5Bb%5D%5B%5D=d"
    );
    assertEqual(
      stringify({ a: { b: ["c", "d"] } }),
      "a%5Bb%5D%5B0%5D=c&a%5Bb%5D%5B1%5D=d"
    );
  }
});

test({
  name: "stringifies a nested array value with dots notation",
  fn: () => {
    assertEqual(
      stringify(
        { a: { b: ["c", "d"] } },
        { allowDots: true, encode: false, arrayFormat: "indices" }
      ),
      "a.b[0]=c&a.b[1]=d",
      "indices: stringifies with dots + indices"
    );
    assertEqual(
      stringify(
        { a: { b: ["c", "d"] } },
        { allowDots: true, encode: false, arrayFormat: "brackets" }
      ),
      "a.b[]=c&a.b[]=d",
      "brackets: stringifies with dots + brackets"
    );
    assertEqual(
      stringify({ a: { b: ["c", "d"] } }, { allowDots: true, encode: false }),
      "a.b[0]=c&a.b[1]=d",
      "default: stringifies with dots + indices"
    );
  }
});

test({
  name: "stringifies an object inside an array",
  fn: () => {
    assertEqual(
      stringify({ a: [{ b: "c" }] }, { arrayFormat: "indices" }),
      "a%5B0%5D%5Bb%5D=c",
      "indices => brackets"
    );
    assertEqual(
      stringify({ a: [{ b: "c" }] }, { arrayFormat: "brackets" }),
      "a%5B%5D%5Bb%5D=c",
      "brackets => brackets"
    );
    assertEqual(
      stringify({ a: [{ b: "c" }] }),
      "a%5B0%5D%5Bb%5D=c",
      "default => indices"
    );

    assertEqual(
      stringify({ a: [{ b: { c: [1] } }] }, { arrayFormat: "indices" }),
      "a%5B0%5D%5Bb%5D%5Bc%5D%5B0%5D=1",
      "indices => indices"
    );

    assertEqual(
      stringify({ a: [{ b: { c: [1] } }] }, { arrayFormat: "brackets" }),
      "a%5B%5D%5Bb%5D%5Bc%5D%5B%5D=1",
      "brackets => brackets"
    );

    assertEqual(
      stringify({ a: [{ b: { c: [1] } }] }),
      "a%5B0%5D%5Bb%5D%5Bc%5D%5B0%5D=1",
      "default => indices"
    );
  }
});

test({
  name: "stringifies an array with mixed objects and primitives",
  fn: () => {
    assertEqual(
      stringify(
        { a: [{ b: 1 }, 2, 3] },
        { encode: false, arrayFormat: "indices" }
      ),
      "a[0][b]=1&a[1]=2&a[2]=3",
      "indices => indices"
    );
    assertEqual(
      stringify(
        { a: [{ b: 1 }, 2, 3] },
        { encode: false, arrayFormat: "brackets" }
      ),
      "a[][b]=1&a[]=2&a[]=3",
      "brackets => brackets"
    );
    assertEqual(
      stringify({ a: [{ b: 1 }, 2, 3] }, { encode: false }),
      "a[0][b]=1&a[1]=2&a[2]=3",
      "default => indices"
    );
  }
});

test({
  name: "stringifies an object inside an array with dots notation",
  fn: () => {
    assertEqual(
      stringify(
        { a: [{ b: "c" }] },
        { allowDots: true, encode: false, arrayFormat: "indices" }
      ),
      "a[0].b=c",
      "indices => indices"
    );
    assertEqual(
      stringify(
        { a: [{ b: "c" }] },
        { allowDots: true, encode: false, arrayFormat: "brackets" }
      ),
      "a[].b=c",
      "brackets => brackets"
    );
    assertEqual(
      stringify({ a: [{ b: "c" }] }, { allowDots: true, encode: false }),
      "a[0].b=c",
      "default => indices"
    );

    assertEqual(
      stringify(
        { a: [{ b: { c: [1] } }] },
        { allowDots: true, encode: false, arrayFormat: "indices" }
      ),
      "a[0].b.c[0]=1",
      "indices => indices"
    );
    assertEqual(
      stringify(
        { a: [{ b: { c: [1] } }] },
        { allowDots: true, encode: false, arrayFormat: "brackets" }
      ),
      "a[].b.c[]=1",
      "brackets => brackets"
    );
    assertEqual(
      stringify({ a: [{ b: { c: [1] } }] }, { allowDots: true, encode: false }),
      "a[0].b.c[0]=1",
      "default => indices"
    );
  }
});

test({
  name: "does not omit object keys when indices = false",
  fn: () => {
    assertEqual(
      stringify({ a: [{ b: "c" }] }, { indices: false }),
      "a%5Bb%5D=c"
    );
  }
});

test({
  name: "uses indices notation for arrays when indices=true",
  fn: () => {
    assertEqual(
      stringify({ a: ["b", "c"] }, { indices: true }),
      "a%5B0%5D=b&a%5B1%5D=c"
    );
  }
});

test({
  name: "uses indices notation for arrays when no arrayFormat is specified",
  fn: () => {
    assertEqual(stringify({ a: ["b", "c"] }), "a%5B0%5D=b&a%5B1%5D=c");
  }
});

test({
  name: "uses indices notation for arrays when no arrayFormat=indices",
  fn: () => {
    assertEqual(
      stringify({ a: ["b", "c"] }, { arrayFormat: "indices" }),
      "a%5B0%5D=b&a%5B1%5D=c"
    );
  }
});

test({
  name: "uses repeat notation for arrays when no arrayFormat=repeat",
  fn: () => {
    assertEqual(
      stringify({ a: ["b", "c"] }, { arrayFormat: "repeat" }),
      "a=b&a=c"
    );
  }
});

test({
  name: "uses brackets notation for arrays when no arrayFormat=brackets",
  fn: () => {
    assertEqual(
      stringify({ a: ["b", "c"] }, { arrayFormat: "brackets" }),
      "a%5B%5D=b&a%5B%5D=c"
    );
  }
});

test({
  name: "stringifies a complicated object",
  fn: () => {
    assertEqual(stringify({ a: { b: "c", d: "e" } }), "a%5Bb%5D=c&a%5Bd%5D=e");
  }
});

test({
  name: "stringifies an empty value",
  fn: () => {
    assertEqual(stringify({ a: "" }), "a=");
    assertEqual(stringify({ a: null }, { strictNullHandling: true }), "a");

    assertEqual(stringify({ a: "", b: "" }), "a=&b=");
    assertEqual(
      stringify({ a: null, b: "" }, { strictNullHandling: true }),
      "a&b="
    );

    assertEqual(stringify({ a: { b: "" } }), "a%5Bb%5D=");
    assertEqual(
      stringify({ a: { b: null } }, { strictNullHandling: true }),
      "a%5Bb%5D"
    );
    assertEqual(
      stringify({ a: { b: null } }, { strictNullHandling: false }),
      "a%5Bb%5D="
    );
  }
});

test({
  name: "stringifies a null object",
  fn: () => {
    var obj = Object.create(null);
    obj.a = "b";
    assertEqual(stringify(obj), "a=b");
  }
});

test({
  name: "returns an empty string for invalid input",
  fn: () => {
    assertEqual(stringify(undefined), "");
    assertEqual(stringify(false), "");
    assertEqual(stringify(null), "");
    assertEqual(stringify(""), "");
  }
});

test({
  name: "stringifies an object with a null object as a child",
  fn: () => {
    var obj = { a: Object.create(null) };

    obj.a.b = "c";
    assertEqual(stringify(obj), "a%5Bb%5D=c");
  }
});

test({
  name: "drops keys with a value of undefined",
  fn: () => {
    assertEqual(stringify({ a: undefined }), "");

    assertEqual(
      stringify({ a: { b: undefined, c: null } }, { strictNullHandling: true }),
      "a%5Bc%5D"
    );
    assertEqual(
      stringify(
        { a: { b: undefined, c: null } },
        { strictNullHandling: false }
      ),
      "a%5Bc%5D="
    );
    assertEqual(stringify({ a: { b: undefined, c: "" } }), "a%5Bc%5D=");
  }
});

test({
  name: "url encodes values",
  fn: () => {
    assertEqual(stringify({ a: "b c" }), "a=b%20c");
  }
});

test({
  name: "stringifies a date",
  fn: () => {
    var now = new Date();
    var str = "a=" + encodeURIComponent(now.toISOString());
    assertEqual(stringify({ a: now }), str);
  }
});

test({
  name: "stringifies the weird object from qs",
  fn: () => {
    assertEqual(
      stringify({ "my weird field": "~q1!2\"'w$5&7/z8)?" }),
      "my%20weird%20field=~q1%212%22%27w%245%267%2Fz8%29%3F"
    );
  }
});

test({
  name: "skips properties that are part of the object prototype",
  fn: () => {
    Object.prototype["crash"] = "test";
    assertEqual(stringify({ a: "b" }), "a=b");
    assertEqual(stringify({ a: { b: "c" } }), "a%5Bb%5D=c");
    delete Object.prototype["crash"];
  }
});

test({
  name: "stringifies boolean values",
  fn: () => {
    assertEqual(stringify({ a: true }), "a=true");
    assertEqual(stringify({ a: { b: true } }), "a%5Bb%5D=true");
    assertEqual(stringify({ b: false }), "b=false");
    assertEqual(stringify({ b: { c: false } }), "b%5Bc%5D=false");
  }
});

// test({ name: 'stringifies buffer values', fn: () => {
//   assertEqual(stringify({ a: SaferBuffer.from('test') }), 'a=test')
//   assertEqual(stringify({ a: { b: SaferBuffer.from('test') } }), 'a%5Bb%5D=test')
// }})

test({
  name: "stringifies an object using an alternative delimiter",
  fn: () => {
    assertEqual(stringify({ a: "b", c: "d" }, { delimiter: ";" }), "a=b;c=d");
  }
});

// test({ name: "doesn'test { name: blow up when Buffer global is missing", fn: () => {
//   var tempBuffer = global.Buffer
//   delete global.Buffer
//   var result = stringify({ a: 'b', c: 'd' })
//   global.Buffer = tempBuffer
//   assertEqual(result, 'a=b&c=d')
// }})

test({
  name: "selects properties when filter=array",
  fn: () => {
    assertEqual(stringify({ a: "b" }, { filter: ["a"] }), "a=b");
    assertEqual(stringify({ a: 1 }, { filter: [] }), "");

    assertEqual(
      stringify(
        { a: { b: [1, 2, 3, 4], c: "d" }, c: "f" },
        { filter: ["a", "b", 0, 2], arrayFormat: "indices" }
      ),
      "a%5Bb%5D%5B0%5D=1&a%5Bb%5D%5B2%5D=3",
      "indices => indices"
    );
    assertEqual(
      stringify(
        { a: { b: [1, 2, 3, 4], c: "d" }, c: "f" },
        { filter: ["a", "b", 0, 2], arrayFormat: "brackets" }
      ),
      "a%5Bb%5D%5B%5D=1&a%5Bb%5D%5B%5D=3",
      "brackets => brackets"
    );
    assertEqual(
      stringify(
        { a: { b: [1, 2, 3, 4], c: "d" }, c: "f" },
        { filter: ["a", "b", 0, 2] }
      ),
      "a%5Bb%5D%5B0%5D=1&a%5Bb%5D%5B2%5D=3",
      "default => indices"
    );
  }
});

test({
  name: "supports custom representations when filter=function",
  fn: () => {
    var calls = 0;
    var obj = { a: "b", c: "d", e: { f: new Date(1257894000000) } };
    var filterFunc = function(prefix, value) {
      calls += 1;
      if (calls === 1) {
        assertEqual(prefix, "", "prefix is empty");
        assertEqual(value, obj);
      } else if (prefix === "c") {
        return void 0;
      } else if (value instanceof Date) {
        assertEqual(prefix, "e[f]");
        return value.getTime();
      }
      return value;
    };

    assertEqual(
      stringify(obj, { filter: filterFunc }),
      "a=b&e%5Bf%5D=1257894000000"
    );
    assertEqual(calls, 5);
  }
});

test({
  name: "can disable uri encoding",
  fn: () => {
    assertEqual(stringify({ a: "b" }, { encode: false }), "a=b");
    assertEqual(stringify({ a: { b: "c" } }, { encode: false }), "a[b]=c");
    assertEqual(
      stringify(
        { a: "b", c: null },
        { strictNullHandling: true, encode: false }
      ),
      "a=b&c"
    );
  }
});

test({
  name: "can sort the keys",
  fn: () => {
    var sort = function(a, b) {
      return a.localeCompare(b);
    };
    assertEqual(
      stringify({ a: "c", z: "y", b: "f" }, { sort: sort }),
      "a=c&b=f&z=y"
    );
    assertEqual(
      stringify({ a: "c", z: { j: "a", i: "b" }, b: "f" }, { sort: sort }),
      "a=c&b=f&z%5Bi%5D=b&z%5Bj%5D=a"
    );
  }
});

test({
  name: "can sort the keys at depth 3 or more too",
  fn: () => {
    var sort = function(a, b) {
      return a.localeCompare(b);
    };
    assertEqual(
      stringify(
        {
          a: "a",
          z: { zj: { zjb: "zjb", zja: "zja" }, zi: { zib: "zib", zia: "zia" } },
          b: "b"
        },
        { sort: sort, encode: false }
      ),
      "a=a&b=b&z[zi][zia]=zia&z[zi][zib]=zib&z[zj][zja]=zja&z[zj][zjb]=zjb"
    );
    assertEqual(
      stringify(
        {
          a: "a",
          z: { zj: { zjb: "zjb", zja: "zja" }, zi: { zib: "zib", zia: "zia" } },
          b: "b"
        },
        { sort: null, encode: false }
      ),
      "a=a&z[zj][zjb]=zjb&z[zj][zja]=zja&z[zi][zib]=zib&z[zi][zia]=zia&b=b"
    );
  }
});

// test({ name: 'can stringify with custom encoding', fn: () => {
//   assertEqual(
//     stringify(
//       { 県: '大阪府', '': '' },
//       {
//         encoder: function(str) {
//           if (str.length === 0) {
//             return ''
//           }
//           var buf = iconv.encode(str, 'shiftjis')
//           var result = []
//           for (var i = 0; i < buf.length; ++i) {
//             result.push(buf.readUInt8(i).toString(16))
//           }
//           return '%' + result.join('%')
//         }
//       }
//     ),
//     '%8c%a7=%91%e5%8d%e3%95%7b&='
//   )
// }})

test({
  name: "receives the default encoder as a second argument",
  fn: () => {
    stringify(
      { a: 1 },
      {
        encoder: function(str, defaultEncoder) {
          assertEqual(defaultEncoder, utils.encode);
        }
      }
    );
  }
});

test({
  name: "throws error with wrong encoder",
  fn: () => {
    try {
      stringify({}, { encoder: "string" as any });
    } catch (e) {
      assertEqual(e, new TypeError("Encoder has to be a function."));
    }
  }
});

// test({ name: 'can use custom encoder for a buffer object', fn: () => {
//   assertEqual(
//     stringify(
//       { a: SaferBuffer.from([1]) },
//       {
//         encoder: function(buffer) {
//           if (typeof buffer === 'string') {
//             return buffer
//           }
//           return String.fromCharCode(buffer.readUInt8(0) + 97)
//         }
//       }
//     ),
//     'a=b'
//   )
// }})

test({
  name: "serializeDate option",
  fn: () => {
    var date = new Date();
    assertEqual(
      stringify({ a: date }),
      "a=" + date.toISOString().replace(/:/g, "%3A"),
      "default is toISOString"
    );

    var mutatedDate = new Date();
    mutatedDate.toISOString = function() {
      throw new SyntaxError();
    };
    try {
      mutatedDate.toISOString();
    } catch (e) {
      assertEqual(e, new SyntaxError());
    }
    assertEqual(
      stringify({ a: mutatedDate }),
      "a=" + Date.prototype.toISOString.call(mutatedDate).replace(/:/g, "%3A"),
      "toISOString works even when method is not locally present"
    );

    var specificDate = new Date(6);
    assertEqual(
      stringify(
        { a: specificDate },
        {
          serializeDate: function(d) {
            return d.getTime() * 7;
          }
        }
      ),
      "a=42",
      "custom serializeDate function called"
    );
  }
});

test({
  name: "RFC 1738 spaces serialization",
  fn: () => {
    assertEqual(stringify({ a: "b c" }, { format: formats.RFC1738 }), "a=b+c");
    assertEqual(
      stringify({ "a b": "c d" }, { format: formats.RFC1738 }),
      "a+b=c+d"
    );
  }
});

test({
  name: "RFC 3986 spaces serialization",
  fn: () => {
    assertEqual(
      stringify({ a: "b c" }, { format: formats.RFC3986 }),
      "a=b%20c"
    );
    assertEqual(
      stringify({ "a b": "c d" }, { format: formats.RFC3986 }),
      "a%20b=c%20d"
    );
  }
});

test({
  name: "Backward compatibility to RFC 3986",
  fn: () => {
    assertEqual(stringify({ a: "b c" }), "a=b%20c");
  }
});

test({
  name: "Edge cases and unknown formats",
  fn: () => {
    const err = new TypeError("Unknown format option provided.");
    ["UFO1234", false, 1234, null, {}, []].forEach(function(format) {
      try {
        stringify({ a: "b c" }, { format });
      } catch (e) {
        assertEqual(e, err);
      }
    });
  }
});

test({
  name: "encodeValuesOnly",
  fn: () => {
    assertEqual(
      stringify(
        { a: "b", c: ["d", "e=f"], f: [["g"], ["h"]] },
        { encodeValuesOnly: true }
      ),
      "a=b&c[0]=d&c[1]=e%3Df&f[0][0]=g&f[1][0]=h"
    );
    assertEqual(
      stringify({ a: "b", c: ["d", "e"], f: [["g"], ["h"]] }),
      "a=b&c%5B0%5D=d&c%5B1%5D=e&f%5B0%5D%5B0%5D=g&f%5B1%5D%5B0%5D=h"
    );
  }
});

test({
  name: "encodeValuesOnly - strictNullHandling",
  fn: () => {
    assertEqual(
      stringify(
        { a: { b: null } },
        { encodeValuesOnly: true, strictNullHandling: true }
      ),
      "a[b]"
    );
  }
});

test({
  name: "throws if an invalid charset is specified",
  fn: () => {
    try {
      stringify({ a: "b" }, { charset: "foobar" });
    } catch (e) {
      assertEqual(
        e,
        new TypeError(
          "The charset option must be either utf-8, iso-8859-1, or undefined"
        )
      );
    }
  }
});

test({
  name: "respects a charset of iso-8859-1",
  fn: () => {
    assertEqual(stringify({ æ: "æ" }, { charset: "iso-8859-1" }), "%E6=%E6");
  }
});

test({
  name: "encodes unrepresentable chars as numeric entities in iso-8859-1 mode",
  fn: () => {
    assertEqual(
      stringify({ a: "☺" }, { charset: "iso-8859-1" }),
      "a=%26%239786%3B"
    );
  }
});

test({
  name: "respects an explicit charset of utf-8 (the default)",
  fn: () => {
    assertEqual(stringify({ a: "æ" }, { charset: "utf-8" }), "a=%C3%A6");
  }
});

test({
  name: "adds the right sentinel when instructed to and the charset is utf-8",
  fn: () => {
    assertEqual(
      stringify({ a: "æ" }, { charsetSentinel: true, charset: "utf-8" }),
      "utf8=%E2%9C%93&a=%C3%A6"
    );
  }
});

test({
  name:
    "adds the right sentinel when instructed to and the charset is iso-8859-1",
  fn: () => {
    assertEqual(
      stringify({ a: "æ" }, { charsetSentinel: true, charset: "iso-8859-1" }),
      "utf8=%26%2310003%3B&a=%E6"
    );
  }
});

test({
  name: "does not mutate the options argument",
  fn: () => {
    var options = {};
    stringify({}, options);
    assertEqual(options, {});
  }
});

test({
  name: "strictNullHandling works with custom filter",
  fn: () => {
    var filter = function(prefix, value) {
      return value;
    };

    var options = { strictNullHandling: true, filter: filter };
    assertEqual(stringify({ key: null }, options), "key");
  }
});

test({
  name: "strictNullHandling works with null serializeDate",
  fn: () => {
    var serializeDate = function() {
      return null;
    };
    var options = { strictNullHandling: true, serializeDate: serializeDate };
    var date = new Date();
    assertEqual(stringify({ key: date }, options), "key");
  }
});
