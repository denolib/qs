# qs

![DenoLib](https://denolib.com/badge?scope=denolib&repo=qs)
[![Build Status](https://img.shields.io/travis/denolib/qs.svg)](https://travis-ci.org/denolib/qs)

A querystring parsing and stringifying library with some added security.

The **qs** module was ported from https://github.com/ljharb/qs

## Usage

```ts
import { parse, stringify } from "https://denolib.com/denolib/qs/mod.ts";

const obj = parse("a=c"); // { a: "c" }
const str = stringify(obj); // a=c
```
