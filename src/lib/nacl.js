var nacl = (function (window, document) {
    var Module = {};
    var nacl_raw = Module;
var ca = void 0, ea = !0, la = null, oa = !1, b;
try {
  this.Module = Module;
} catch (ra) {
  this.Module = Module = {};
}
var wa = "object" === typeof process && "function" === typeof require, Ba = "object" === typeof window, Da = "function" === typeof importScripts, Ha = !Ba && !wa && !Da;
if (wa) {
  Module.print = (function(a) {
    process.stdout.write(a + "\n");
  });
  Module.printErr = (function(a) {
    process.stderr.write(a + "\n");
  });
  var Ia = require("fs"), Ja = require("path");
  Module.read = (function(a) {
    var a = Ja.normalize(a), e = Ia.readFileSync(a).toString();
    !e && a != Ja.resolve(a) && (a = path.join(__dirname, "..", "src", a), e = Ia.readFileSync(a).toString());
    return e;
  });
  Module.load = (function(a) {
    Ka(read(a));
  });
  Module.arguments || (Module.arguments = process.argv.slice(2));
}
Ha && (Module.print = print, "undefined" != typeof printErr && (Module.printErr = printErr), Module.read = "undefined" != typeof read ? read : (function(a) {
  snarf(a);
}), Module.arguments || ("undefined" != typeof scriptArgs ? Module.arguments = scriptArgs : "undefined" != typeof arguments && (Module.arguments = arguments)));
Ba && !Da && (Module.print || (Module.print = (function(a) {
  console.log(a);
})), Module.printErr || (Module.printErr = (function(a) {
  console.log(a);
})));
if (Ba || Da) {
  Module.read = (function(a) {
    var e = new XMLHttpRequest;
    e.open("GET", a, oa);
    e.send(la);
    return e.responseText;
  }), Module.arguments || "undefined" != typeof arguments && (Module.arguments = arguments);
}
Da && (Module.print || (Module.print = (function() {})), Module.load = importScripts);
if (!Da && !Ba && !wa && !Ha) {
  throw "Unknown runtime environment. Where are we?";
}
function Ka(a) {
  eval.call(la, a);
}
"undefined" == !Module.load && Module.read && (Module.load = (function(a) {
  Ka(Module.read(a));
}));
Module.print || (Module.print = (function() {}));
Module.printErr || (Module.printErr = Module.print);
Module.arguments || (Module.arguments = []);
Module.print = Module.print;
Module.v = Module.printErr;
Module.preRun || (Module.preRun = []);
Module.postRun || (Module.postRun = []);
function Ob() {
  var a = [], e = 0;
  this.pa = (function(d) {
    d &= 255;
    e && (a.push(d), e--);
    if (0 == a.length) {
      if (128 > d) {
        return String.fromCharCode(d);
      }
      a.push(d);
      e = 191 < d && 224 > d ? 1 : 2;
      return "";
    }
    if (0 < e) {
      return "";
    }
    var d = a[0], f = a[1], g = a[2], d = 191 < d && 224 > d ? String.fromCharCode((d & 31) << 6 | f & 63) : String.fromCharCode((d & 15) << 12 | (f & 63) << 6 | g & 63);
    a.length = 0;
    return d;
  });
  this.qa = (function(a) {
    for (var a = unescape(encodeURIComponent(a)), e = [], g = 0; g < a.length; g++) {
      e.push(a.charCodeAt(g));
    }
    return e;
  });
}
function $b(a) {
  var e = c;
  c = c + a | 0;
  c = c + 3 >> 2 << 2;
  return e;
}
function jd(a) {
  var e = Zi;
  Zi = Zi + a | 0;
  Zi = Zi + 3 >> 2 << 2;
  if (Zi >= $i) {
    for (; $i <= Zi; ) {
      $i = 2 * $i + 4095 >> 12 << 12;
    }
    aj($i <= Math.pow(2, 30));
    var a = h, d = new ArrayBuffer($i);
    Module.HEAP8 = h = new Int8Array(d);
    Module.HEAP16 = hj = new Int16Array(d);
    Module.HEAP32 = k = new Int32Array(d);
    Module.HEAPU8 = m = new Uint8Array(d);
    Module.HEAPU16 = ij = new Uint16Array(d);
    Module.HEAPU32 = jj = new Uint32Array(d);
    Module.HEAPF32 = pj = new Float32Array(d);
    Module.HEAPF64 = qj = new Float64Array(d);
    h.set(a);
  }
  return e;
}
var Pj = 4, Qj = {}, jk, t;
function kk(a) {
  Module.print(a + ":\n" + Error().stack);
  throw "Assertion: " + a;
}
function aj(a, e) {
  a || kk("Assertion failed: " + e);
}
var sk = this;
Module.ccall = (function(a, e, d, f) {
  return tk(uk(a), e, d, f);
});
function uk(a) {
  try {
    var e = sk.Module["_" + a];
    e || (e = eval("_" + a));
  } catch (d) {}
  aj(e, "Cannot call unknown function " + a + " (perhaps LLVM optimizations or closure removed it?)");
  return e;
}
function tk(a, e, d, f) {
  function g(a, d) {
    if ("string" == d) {
      if (a === la || a === ca || 0 === a) {
        return 0;
      }
      i || (i = c);
      var e = $b(a.length + 1);
      vk(a, e);
      return e;
    }
    return "array" == d ? (i || (i = c), e = $b(a.length), wk(a, e), e) : a;
  }
  var i = 0, j = 0, f = f ? f.map((function(a) {
    return g(a, d[j++]);
  })) : [];
  a = a.apply(la, f);
  "string" == e ? e = xk(a) : (aj("array" != e), e = a);
  i && (c = i);
  return e;
}
Module.cwrap = (function(a, e, d) {
  var f = uk(a);
  return (function() {
    return tk(f, e, d, Array.prototype.slice.call(arguments));
  });
});
function yk(a, e, d) {
  d = d || "i8";
  "*" === d.charAt(d.length - 1) && (d = "i32");
  switch (d) {
   case "i1":
    h[a] = e;
    break;
   case "i8":
    h[a] = e;
    break;
   case "i16":
    hj[a >> 1] = e;
    break;
   case "i32":
    k[a >> 2] = e;
    break;
   case "i64":
    jk = [ e >>> 0, Math.min(Math.floor(e / 4294967296), 4294967295) >>> 0 ];
    k[a >> 2] = jk[0];
    k[a + 4 >> 2] = jk[1];
    break;
   case "float":
    pj[a >> 2] = e;
    break;
   case "double":
    qj[zk >> 3] = e;
    k[a >> 2] = k[zk >> 2];
    k[a + 4 >> 2] = k[zk + 4 >> 2];
    break;
   default:
    kk("invalid type for setValue: " + d);
  }
}
Module.setValue = yk;
Module.getValue = (function(a, e) {
  e = e || "i8";
  "*" === e.charAt(e.length - 1) && (e = "i32");
  switch (e) {
   case "i1":
    return h[a];
   case "i8":
    return h[a];
   case "i16":
    return hj[a >> 1];
   case "i32":
    return k[a >> 2];
   case "i64":
    return k[a >> 2];
   case "float":
    return pj[a >> 2];
   case "double":
    return k[zk >> 2] = k[a >> 2], k[zk + 4 >> 2] = k[a + 4 >> 2], qj[zk >> 3];
   default:
    kk("invalid type for setValue: " + e);
  }
  return la;
});
var Ak = 2, y = 3;
Module.ALLOC_NORMAL = 0;
Module.ALLOC_STACK = 1;
Module.ALLOC_STATIC = Ak;
Module.ALLOC_NONE = y;
function A(a, e, d, f) {
  var g, i;
  "number" === typeof a ? (g = ea, i = a) : (g = oa, i = a.length);
  var j = "string" === typeof e ? e : la, d = d == y ? f : [ Bk, $b, jd ][d === ca ? Ak : d](Math.max(i, j ? 1 : e.length));
  if (g) {
    f = d;
    aj(0 == (d & 3));
    for (a = d + (i & -4); f < a; f += 4) {
      k[f >> 2] = 0;
    }
    for (a = d + i; f < a; ) {
      h[f++ | 0] = 0;
    }
    return d;
  }
  if ("i8" === j) {
    return m.set(new Uint8Array(a), d), d;
  }
  for (var f = 0, l, n; f < i; ) {
    var p = a[f];
    "function" === typeof p && (p = Qj.Ca(p));
    g = j || e[f];
    0 === g ? f++ : ("i64" == g && (g = "i32"), yk(d + f, p, g), n !== g && (1 == Pj ? l = 1 : (l = {
      "%i1": 1,
      "%i8": 1,
      "%i16": 2,
      "%i32": 4,
      "%i64": 8,
      "%float": 4,
      "%double": 8
    }["%" + g], l || ("*" == g.charAt(g.length - 1) ? l = Pj : "i" == g[0] && (l = parseInt(g.substr(1)), aj(0 == l % 8), l /= 8))), n = g), f += l);
  }
  return d;
}
Module.allocate = A;
function xk(a, e) {
  for (var d = oa, f, g = 0; ; ) {
    f = m[a + g | 0];
    if (128 <= f) {
      d = ea;
    } else {
      if (0 == f && !e) {
        break;
      }
    }
    g++;
    if (e && g == e) {
      break;
    }
  }
  e || (e = g);
  var i = "";
  if (!d) {
    for (; 0 < e; ) {
      f = String.fromCharCode.apply(String, m.subarray(a, a + Math.min(e, 1024))), i = i ? i + f : f, a += 1024, e -= 1024;
    }
    return i;
  }
  d = new Ob;
  for (g = 0; g < e; g++) {
    f = m[a + g | 0], i += d.pa(f);
  }
  return i;
}
Module.Pointer_stringify = xk;
var h, m, hj, ij, k, jj, pj, qj, c, Zi, Ck = Module.TOTAL_STACK || 5242880, $i = Module.TOTAL_MEMORY || 16777216;
aj(!!Int32Array && !!Float64Array && !!(new Int32Array(1)).subarray && !!(new Int32Array(1)).set, "Cannot fallback to non-typed array case: Code is too specialized");
var Gk = new ArrayBuffer($i);
h = new Int8Array(Gk);
hj = new Int16Array(Gk);
k = new Int32Array(Gk);
m = new Uint8Array(Gk);
ij = new Uint16Array(Gk);
jj = new Uint32Array(Gk);
pj = new Float32Array(Gk);
qj = new Float64Array(Gk);
k[0] = 255;
aj(255 === m[0] && 0 === m[3], "Typed arrays 2 must be run on a little-endian system");
Module.HEAP = ca;
Module.HEAP8 = h;
Module.HEAP16 = hj;
Module.HEAP32 = k;
Module.HEAPU8 = m;
Module.HEAPU16 = ij;
Module.HEAPU32 = jj;
Module.HEAPF32 = pj;
Module.HEAPF64 = qj;
c = 4 * Math.ceil(.25);
var zk, Hk = A(12, "i8", 1);
zk = 8 * Math.ceil(Hk / 8);
aj(0 == zk % 8);
Zi = Ck;
aj(Zi < $i);
A(Ik("(null)"), "i8", 1);
function Jk(a) {
  for (; 0 < a.length; ) {
    var e = a.shift(), d = e.Ba;
    if ("number" === typeof d) {
      if (e.I === ca) {
        Kk[d]();
      } else {
        (e = [ e.I ]) && e.length ? Kk[d].apply(la, e) : Kk[d]();
      }
    } else {
      d(e.I === ca ? la : e.I);
    }
  }
}
var Lk = [], Mk = [];
function Ik(a, e, d) {
  a = (new Ob).qa(a);
  d && (a.length = d);
  e || a.push(0);
  return a;
}
Module.intArrayFromString = Ik;
Module.intArrayToString = (function(a) {
  for (var e = [], d = 0; d < a.length; d++) {
    var f = a[d];
    255 < f && (f &= 255);
    e.push(String.fromCharCode(f));
  }
  return e.join("");
});
function vk(a, e, d) {
  a = Ik(a, d);
  for (d = 0; d < a.length; ) {
    h[e + d | 0] = a[d], d += 1;
  }
}
Module.writeStringToMemory = vk;
function wk(a, e) {
  for (var d = 0; d < a.length; d++) {
    h[e + d | 0] = a[d];
  }
}
Module.writeArrayToMemory = wk;
Math.g || (Math.g = (function(a, e) {
  var d = a & 65535, f = e & 65535;
  return d * f + ((a >>> 16) * f + d * (e >>> 16) << 16) | 0;
}));
var Nk = 0, Ok = {}, Pk = oa, Qk = la;
Module.addRunDependency = (function(a) {
  Nk++;
  Module.monitorRunDependencies && Module.monitorRunDependencies(Nk);
  a ? (aj(!Ok[a]), Ok[a] = 1, Qk === la && "undefined" !== typeof setInterval && (Qk = setInterval((function() {
    var a = oa, d;
    for (d in Ok) {
      a || (a = ea, Module.v("still waiting on run dependencies:")), Module.v("dependency: " + d);
    }
    a && Module.v("(end of list)");
  }), 6e3))) : Module.v("warning: run dependency added without ID");
});
Module.removeRunDependency = (function(a) {
  Nk--;
  Module.monitorRunDependencies && Module.monitorRunDependencies(Nk);
  a ? (aj(Ok[a]), delete Ok[a]) : Module.v("warning: run dependency removed without ID");
  0 == Nk && (Qk !== la && (clearInterval(Qk), Qk = la), !Pk && Rk && Sk());
});
Module.preloadedImages = {};
Module.preloadedAudios = {};
aj(Zi == Ck);
aj(Ck == Ck);
Zi += 1416;
aj(Zi < $i);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5242880);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5242896);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5242912);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5242928);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5242944);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5242960);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5242976);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5242992);
A([ 101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107 ], "i8", y, 5243008);
A(16, "i8", y, 5243024);
A([ 27, 0, 0, 0, 19, 0, 0, 0, 44, 0, 0, 0, 10, 0, 0, 0, 163, 0, 0, 0, 229, 0, 0, 0, 156, 0, 0, 0, 237, 0, 0, 0, 167, 0, 0, 0, 41, 0, 0, 0, 99, 0, 0, 0, 8, 0, 0, 0, 93, 0, 0, 0, 33, 0, 0, 0, 6, 0, 0, 0, 33, 0, 0, 0, 235, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 15, 0, 0, 0 ], "i8", y, 5243040);
A([ 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0 ], "i8", y, 5243172);
A([ 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 252, 0, 0, 0 ], "i8", y, 5243300);
A([ 237, 0, 0, 0, 211, 0, 0, 0, 245, 0, 0, 0, 92, 0, 0, 0, 26, 0, 0, 0, 99, 0, 0, 0, 18, 0, 0, 0, 88, 0, 0, 0, 214, 0, 0, 0, 156, 0, 0, 0, 247, 0, 0, 0, 162, 0, 0, 0, 222, 0, 0, 0, 249, 0, 0, 0, 222, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0 ], "i8", y, 5243368);
A([ 106, 9, 230, 103, 243, 188, 201, 8, 187, 103, 174, 133, 132, 202, 167, 59, 60, 110, 243, 114, 254, 148, 248, 43, 165, 79, 245, 58, 95, 29, 54, 241, 81, 14, 82, 127, 173, 230, 130, 209, 155, 5, 104, 140, 43, 62, 108, 31, 31, 131, 217, 171, 251, 65, 189, 107, 91, 224, 205, 25, 19, 126, 33, 121 ], "i8", y, 5243496);
A([ 106, 9, 230, 103, 187, 103, 174, 133, 60, 110, 243, 114, 165, 79, 245, 58, 81, 14, 82, 127, 155, 5, 104, 140, 31, 131, 217, 171, 91, 224, 205, 25 ], "i8", y, 5243560);
A([ 106, 9, 230, 103, 243, 188, 201, 8, 187, 103, 174, 133, 132, 202, 167, 59, 60, 110, 243, 114, 254, 148, 248, 43, 165, 79, 245, 58, 95, 29, 54, 241, 81, 14, 82, 127, 173, 230, 130, 209, 155, 5, 104, 140, 43, 62, 108, 31, 31, 131, 217, 171, 251, 65, 189, 107, 91, 224, 205, 25, 19, 126, 33, 121 ], "i8", y, 5243592);
A([ 106, 9, 230, 103, 187, 103, 174, 133, 60, 110, 243, 114, 165, 79, 245, 58, 81, 14, 82, 127, 155, 5, 104, 140, 31, 131, 217, 171, 91, 224, 205, 25 ], "i8", y, 5243656);
A([ 246, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 63 ], "i8", y, 5243688);
A([ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], "i8", y, 5243720);
A([ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], "i8", y, 5243752);
A(32, "i8", y, 5243784);
A(32, "i8", y, 5243816);
A([ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], "i8", y, 5243848);
A([ 88, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102, 102 ], "i8", y, 5243880);
A([ 26, 213, 37, 143, 96, 45, 86, 201, 178, 167, 37, 149, 96, 199, 44, 105, 92, 220, 214, 253, 49, 226, 164, 192, 254, 83, 110, 205, 211, 54, 105, 33 ], "i8", y, 5243912);
A([ 163, 221, 183, 165, 179, 138, 222, 109, 245, 82, 81, 119, 128, 159, 240, 32, 125, 227, 171, 100, 142, 78, 234, 102, 101, 118, 139, 215, 15, 95, 135, 103 ], "i8", y, 5243944);
A([ 163, 120, 89, 19, 202, 77, 235, 117, 171, 216, 65, 65, 77, 10, 112, 0, 152, 232, 121, 119, 121, 64, 199, 140, 115, 254, 111, 43, 238, 108, 3, 82 ], "i8", y, 5243976);
A([ 3, 2, 1, 0, 7, 6, 5, 4, 11, 10, 9, 8, 15, 14, 13, 12 ], "i8", y, 5244008);
A([ 15, 10, 5, 0, 14, 9, 4, 3, 13, 8, 7, 2, 12, 11, 6, 1 ], "i8", y, 5244024);
A([ 1, 2, 3, 0, 6, 7, 4, 5, 11, 8, 9, 10, 12, 13, 14, 15 ], "i8", y, 5244040);
A([ 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8 ], "i8", y, 5244056);
A([ 12, 8, 4, 0, 13, 9, 5, 1, 14, 10, 6, 2, 15, 11, 7, 3 ], "i8", y, 5244072);
A([ 15, 11, 7, 3, 14, 10, 6, 2, 13, 9, 5, 1, 12, 8, 4, 0 ], "i8", y, 5244088);
A([ 3, 3, 3, 3, 7, 7, 7, 7, 11, 11, 11, 11, 15, 15, 15, 15 ], "i8", y, 5244104);
A([ 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15 ], "i8", y, 5244120);
A([ 51, 51, 51, 51, 51, 51, 51, 51, 51, 51, 51, 51, 51, 51, 51, 51 ], "i8", y, 5244136);
A([ 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85 ], "i8", y, 5244152);
A([ 253, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 15 ], "i8", y, 5244168);
A([ 254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 15 ], "i8", y, 5244200);
A([ 251, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 31 ], "i8", y, 5244232);
A([ 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], "i8", y, 5244264);
var Tk = {
  crypto: la
};
function Uk(a, e, d) {
  if (d) {
    throw {
      message: "_randombytes count overflow"
    };
  }
  m.set(Tk.crypto.randomBytes(e), a);
  return 0;
}
Module._randombytes = Uk;
function I(a, e, d) {
  a |= 0;
  e |= 0;
  d |= 0;
  if ((a & 3) == (e & 3)) {
    for (; a & 3; ) {
      if (0 == (d | 0)) {
        return;
      }
      h[a] = h[e];
      a = a + 1 | 0;
      e = e + 1 | 0;
      d = d - 1 | 0;
    }
    for (; 4 <= (d | 0); ) {
      k[a >> 2] = k[e >> 2], a = a + 4 | 0, e = e + 4 | 0, d = d - 4 | 0;
    }
  }
  for (; 0 < (d | 0); ) {
    h[a] = h[e], a = a + 1 | 0, e = e + 1 | 0, d = d - 1 | 0;
  }
}
function Vk(a, e, d) {
  var a = a | 0, e = e | 0, d = d | 0, f = 0, g = 0, i = 0, j = 0, f = a + d | 0;
  if (20 <= (d | 0)) {
    e &= 255;
    j = a & 3;
    g = e | e << 8 | e << 16 | e << 24;
    i = f & -4;
    if (j) {
      for (j = a + 4 - j | 0; (a | 0) < (j | 0); ) {
        h[a] = e, a = a + 1 | 0;
      }
    }
    for (; (a | 0) < (i | 0); ) {
      k[a >> 2] = g, a = a + 4 | 0;
    }
  }
  for (; (a | 0) < (f | 0); ) {
    h[a] = e, a = a + 1 | 0;
  }
}
function Bk(a) {
  return jd(a + 8) + 8 & 4294967288;
}
Module._malloc = Bk;
Module._free = (function() {});
var Wk = oa, Xk = oa, Yk = ca, Zk = ca;
function $k(a, e) {
  function d() {
    Xk = oa;
    (document.webkitFullScreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.mozFullscreenElement || document.fullScreenElement || document.fullscreenElement) === f ? (f.S = document.cancelFullScreen || document.mozCancelFullScreen || document.webkitCancelFullScreen, f.S = f.S.bind(document), Yk && f.Da(), Xk = ea, Zk && al()) : Zk && bl();
    if (Module.onFullScreen) {
      Module.onFullScreen(Xk);
    }
  }
  this.$ = a;
  this.ba = e;
  "undefined" === typeof this.$ && (this.$ = ea);
  "undefined" === typeof this.ba && (this.ba = oa);
  var f = Module.canvas;
  this.ja || (this.ja = ea, document.addEventListener("fullscreenchange", d, oa), document.addEventListener("mozfullscreenchange", d, oa), document.addEventListener("webkitfullscreenchange", d, oa));
  f.sa = f.requestFullScreen || f.mozRequestFullScreen || (f.webkitRequestFullScreen ? (function() {
    f.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
  }) : la);
  f.sa();
}
var cl = [];
function dl() {
  var a = Module.canvas;
  cl.forEach((function(e) {
    e(a.width, a.height);
  }));
}
function al() {
  var a = Module.canvas;
  this.wa = a.width;
  this.va = a.height;
  a.width = screen.width;
  a.height = screen.height;
  a = jj[SDL.screen + 0 * Pj >> 2];
  k[SDL.screen + 0 * Pj >> 2] = a | 8388608;
  dl();
}
function bl() {
  var a = Module.canvas;
  a.width = this.wa;
  a.height = this.va;
  a = jj[SDL.screen + 0 * Pj >> 2];
  k[SDL.screen + 0 * Pj >> 2] = a & -8388609;
  dl();
}
Module.RandomBytes = Tk;
Module.requestFullScreen = (function(a, e) {
  $k(a, e);
});
Module.requestAnimationFrame = (function(a) {
  window.requestAnimationFrame || (window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || window.setTimeout);
  window.requestAnimationFrame(a);
});
Module.pauseMainLoop = (function() {});
Module.resumeMainLoop = (function() {
  Wk && (Wk = oa, la());
});
var Kk = [ 0, 0 ];
function M(a, e) {
  return a >>> ((32 - e | 0) >>> 0) | a << e;
}
function O(a, e) {
  return a >>> ((32 - e | 0) >>> 0) | a << e;
}
function fl(a) {
  return m[a + 1 | 0] << 8 | m[a] | m[a + 2 | 0] << 16 | m[a + 3 | 0] << 24;
}
function gl(a, e) {
  h[a] = e & 255;
  h[a + 1 | 0] = e >>> 8 & 255;
  h[a + 2 | 0] = e >>> 16 & 255;
  h[a + 3 | 0] = e >>> 24 & 255;
}
function hl(a) {
  return m[a + 1 | 0] << 8 | m[a] | m[a + 2 | 0] << 16 | m[a + 3 | 0] << 24;
}
function il(a, e) {
  h[a] = e & 255;
  h[a + 1 | 0] = e >>> 8 & 255;
  h[a + 2 | 0] = e >>> 16 & 255;
  h[a + 3 | 0] = e >>> 24 & 255;
}
function jl(a, e, d, f, g) {
  var i = 0, j = c;
  c = c + 64 | 0;
  for (i = 2; ; ) {
    switch (i) {
     case 2:
      var l = j, n = l | 0, p = c;
      c = c + 256 | 0;
      var s = p | 0;
      I(n, 5243592, 64);
      var r = P(d, f, 128, 0), q = t, u = 0, i = 3;
      break;
     case 3:
      h[p + u | 0] = h[g + u | 0] ^ 54;
      i = u + 1 | 0;
      32 == (i | 0) ? i = 4 : (u = i, i = 3);
      break;
     case 4:
      Vk(p + 32 | 0, 54, 96);
      var B = l | 0, F = p | 0;
      kl(B, F, 128, 0);
      kl(B, e, d, f);
      var E = d & 127, x = f & 0, H = E, i = 0 == (E | 0) & 0 == (x | 0) ? 5 : 6;
      break;
     case 5:
      h[p + H | 0] = -128;
      var G = P(E, x, 1, 0), i = 8;
      break;
     case 6:
      var L = d & 127;
      I(s, e + (d - L | 0) | 0, L);
      h[p + H | 0] = -128;
      i = 0 > x >>> 0 | 0 == x >>> 0 & 112 > E >>> 0;
      L = P(E, x, 1, 0);
      i ? (G = L, i = 8) : i = 7;
      break;
     case 7:
      i = 247 > L >>> 0 ? 11 : 12;
      break;
     case 8:
      i = 119 > G >>> 0 ? 9 : 10;
      break;
     case 9:
      var i = d & 127, C = i + 1 | 0;
      Vk(p + (i + 1 | 0) | 0, 0, (119 < (i + 2 | 0) >>> 0 ? C : 118) - i | 0);
      i = 10;
      break;
     case 10:
      h[p + 119 | 0] = (q >>> 29 | 0) & 255;
      h[p + 120 | 0] = (q >>> 21 | 0) & 255;
      h[p + 121 | 0] = (q >>> 13 | 0) & 255;
      h[p + 122 | 0] = (q >>> 5 | 0) & 255;
      h[p + 123 | 0] = (r >>> 29 | q << 3) & 255;
      h[p + 124 | 0] = (r >>> 21 | q << 11) & 255;
      h[p + 125 | 0] = (r >>> 13 | q << 19) & 255;
      h[p + 126 | 0] = (r >>> 5 | q << 27) & 255;
      h[p + 127 | 0] = (r << 3 | 0) & 255;
      kl(B, F, 128, 0);
      var D = 0, i = 13;
      break;
     case 11:
      i = d & 127;
      Vk(p + (i + 1 | 0) | 0, 0, 246 - i | 0);
      i = 12;
      break;
     case 12:
      h[p + 247 | 0] = (q >>> 29 | 0) & 255;
      h[p + 248 | 0] = (q >>> 21 | 0) & 255;
      h[p + 249 | 0] = (q >>> 13 | 0) & 255;
      h[p + 250 | 0] = (q >>> 5 | 0) & 255;
      h[p + 251 | 0] = (r >>> 29 | q << 3) & 255;
      h[p + 252 | 0] = (r >>> 21 | q << 11) & 255;
      h[p + 253 | 0] = (r >>> 13 | q << 19) & 255;
      h[p + 254 | 0] = (r >>> 5 | q << 27) & 255;
      h[p + 255 | 0] = (r << 3 | 0) & 255;
      kl(B, F, 256, 0);
      D = 0;
      i = 13;
      break;
     case 13:
      h[p + D | 0] = h[g + D | 0] ^ 92;
      i = D + 1 | 0;
      32 == (i | 0) ? i = 14 : (D = i, i = 13);
      break;
     case 14:
      return Vk(p + 32 | 0, 92, 96), I(p + 128 | 0, n, 64), I(n, 5243592, 64), Vk(p + 192 | 0, 0, 64), h[p + 192 | 0] = -128, h[p + 254 | 0] = 6, kl(B, F, 256, 0), I(a, n, 32), c = j, 0;
    }
  }
}
function ll(a, e, d) {
  var f = c;
  c = c + 32 | 0;
  var g = f | 0;
  ml(g, d, e);
  nl(a, 5243024, g, 5243008);
  c = f;
  return 0;
}
function nl(a, e, d, f) {
  for (var g = 0, g = 2; ; ) {
    switch (g) {
     case 2:
      var i = fl(f), j = f + 4 | 0, l = fl(j), n = fl(e), p = e + 4 | 0, s = fl(p), r = e + 8 | 0, q = fl(r), u = e + 12 | 0, B = fl(u), F = f + 8 | 0, E = fl(F), x = f + 12 | 0, H = fl(x), G = H, L = fl(d + 28 | 0), C = fl(d + 24 | 0), D = fl(d + 20 | 0), Q = fl(d + 16 | 0), J = E, fa = B, K = q, N = s, ja = n, U = l, sa = fl(d + 12 | 0), Fa = fl(d + 8 | 0), Ca = fl(d + 4 | 0), Ea = fl(d), Z = i, da = 20, g = 3;
      break;
     case 3:
      var ma = M(Z + D | 0, 7) ^ sa, xa = M(ma + Z | 0, 9) ^ K, $ = M(xa + ma | 0, 13) ^ D, ga = M($ + xa | 0, 18) ^ Z, aa = M(Ea + U | 0, 7) ^ fa, ba = M(aa + U | 0, 9) ^ C, g = M(ba + aa | 0, 13) ^ Ea, S = M(g + ba | 0, 18) ^ U, R = M(ja + J | 0, 7) ^ L, ha = M(R + J | 0, 9) ^ Ca, pa = M(ha + R | 0, 13) ^ ja, z = M(pa + ha | 0, 18) ^ J, ia = M(Q + G | 0, 7) ^ Fa, ka = M(ia + G | 0, 9) ^ N, ta = M(ka + ia | 0, 13) ^ Q, na = M(ta + ka | 0, 18) ^ G, g = M(ia + ga | 0, 7) ^ g, ha = M(g + ga | 0, 9) ^ ha, ia = M(ha + g | 0, 13) ^ ia, ga = M(ia + ha | 0, 18) ^ ga, pa = M(S + ma | 0, 7) ^ pa, ka = M(pa + S | 0, 9) ^ ka, ma = M(ka + pa | 0, 13) ^ ma, S = M(ma + ka | 0, 18) ^ S, ta = M(z + aa | 0, 7) ^ ta, xa = M(ta + z | 0, 9) ^ xa, aa = M(xa + ta | 0, 13) ^ aa, z = M(aa + xa | 0, 18) ^ z, $ = M(na + R | 0, 7) ^ $, ba = M($ + na | 0, 9) ^ ba, R = M(ba + $ | 0, 13) ^ R, na = M(R + ba | 0, 18) ^ na, ya = da - 2 | 0;
      0 < (ya | 0) ? (G = na, L = R, C = ba, D = $, Q = ta, J = z, fa = aa, K = xa, N = ka, ja = pa, U = S, sa = ma, Fa = ia, Ca = ha, Ea = g, Z = ga, da = ya, g = 3) : g = 4;
      break;
     case 4:
      d = (S + l | 0) - fl(j) | 0;
      F = (z + E | 0) - fl(F) | 0;
      x = (na + H | 0) - fl(x) | 0;
      e = (pa + n | 0) - fl(e) | 0;
      p = (ka + s | 0) - fl(p) | 0;
      r = (xa + q | 0) - fl(r) | 0;
      u = (aa + B | 0) - fl(u) | 0;
      gl(a, (ga + i | 0) - fl(f) | 0);
      gl(a + 4 | 0, d);
      gl(a + 8 | 0, F);
      gl(a + 12 | 0, x);
      gl(a + 16 | 0, e);
      gl(a + 20 | 0, p);
      gl(a + 24 | 0, r);
      gl(a + 28 | 0, u);
      return;
    }
  }
}
function ol(a, e, d, f) {
  for (var g = 0, g = 2; ; ) {
    switch (g) {
     case 2:
      var i = hl(f), j = hl(d), l = hl(d + 4 | 0), n = hl(d + 8 | 0), p = hl(d + 12 | 0), s = hl(f + 4 | 0), r = hl(e), q = hl(e + 4 | 0), u = hl(e + 8 | 0), B = hl(e + 12 | 0), F = hl(f + 8 | 0), E = hl(d + 16 | 0), x = hl(d + 20 | 0), H = hl(d + 24 | 0), G = hl(d + 28 | 0), L = hl(f + 12 | 0), C = L, D = G, Q = H, J = x, fa = E, K = F, N = B, ja = u, U = q, sa = r, Fa = s, Ca = p, Ea = n, Z = l, da = j, ma = i, xa = 20, g = 3;
      break;
     case 3:
      var $ = O(ma + J | 0, 7) ^ Ca, ga = O($ + ma | 0, 9) ^ ja, aa = O(ga + $ | 0, 13) ^ J, ba = O(aa + ga | 0, 18) ^ ma, S = O(da + Fa | 0, 7) ^ N, R = O(S + Fa | 0, 9) ^ Q, ha = O(R + S | 0, 13) ^ da, pa = O(ha + R | 0, 18) ^ Fa, z = O(sa + K | 0, 7) ^ D, ia = O(z + K | 0, 9) ^ Z, ka = O(ia + z | 0, 13) ^ sa, ta = O(ka + ia | 0, 18) ^ K, na = O(fa + C | 0, 7) ^ Ea, ya = O(na + C | 0, 9) ^ U, La = O(ya + na | 0, 13) ^ fa, Qa = O(La + ya | 0, 18) ^ C, ha = O(na + ba | 0, 7) ^ ha, ia = O(ha + ba | 0, 9) ^ ia, na = O(ia + ha | 0, 13) ^ na, ba = O(na + ia | 0, 18) ^ ba, ka = O(pa + $ | 0, 7) ^ ka, ya = O(ka + pa | 0, 9) ^ ya, $ = O(ya + ka | 0, 13) ^ $, pa = O($ + ya | 0, 18) ^ pa, La = O(ta + S | 0, 7) ^ La, ga = O(La + ta | 0, 9) ^ ga, S = O(ga + La | 0, 13) ^ S, ta = O(S + ga | 0, 18) ^ ta, aa = O(Qa + z | 0, 7) ^ aa, R = O(aa + Qa | 0, 9) ^ R, z = O(R + aa | 0, 13) ^ z, Qa = O(z + R | 0, 18) ^ Qa, g = xa - 2 | 0;
      0 < (g | 0) ? (C = Qa, D = z, Q = R, J = aa, fa = La, K = ta, N = S, ja = ga, U = ya, sa = ka, Fa = pa, Ca = $, Ea = na, Z = ia, da = ha, ma = ba, xa = g, g = 3) : g = 4;
      break;
     case 4:
      e = ha + j | 0;
      l = ia + l | 0;
      n = na + n | 0;
      p = $ + p | 0;
      s = pa + s | 0;
      r = ka + r | 0;
      q = ya + q | 0;
      u = ga + u | 0;
      B = S + B | 0;
      F = ta + F | 0;
      E = La + E | 0;
      x = aa + x | 0;
      H = R + H | 0;
      G = z + G | 0;
      L = Qa + L | 0;
      il(a, ba + i | 0);
      il(a + 4 | 0, e);
      il(a + 8 | 0, l);
      il(a + 12 | 0, n);
      il(a + 16 | 0, p);
      il(a + 20 | 0, s);
      il(a + 24 | 0, r);
      il(a + 28 | 0, q);
      il(a + 32 | 0, u);
      il(a + 36 | 0, B);
      il(a + 40 | 0, F);
      il(a + 44 | 0, E);
      il(a + 48 | 0, x);
      il(a + 52 | 0, H);
      il(a + 56 | 0, G);
      il(a + 60 | 0, L);
      return;
    }
  }
}
function pl(a, e, d, f) {
  var g = 0, i = c;
  c = c + 64 | 0;
  for (g = 2; ; ) {
    switch (g) {
     case 2:
      var j = i, l = j | 0, n = c;
      c = c + 256 | 0;
      I(l, 5243496, 64);
      j |= 0;
      kl(j, e, d, f);
      var p = d & 127, s = f & 0, r = p, g = 0 == (p | 0) & 0 == (s | 0) ? 3 : 4;
      break;
     case 3:
      h[n + r | 0] = -128;
      var q = P(p, s, 1, 0), g = 6;
      break;
     case 4:
      var u = d & 127;
      I(n | 0, e + (d - u | 0) | 0, u);
      h[n + r | 0] = -128;
      g = 0 > s >>> 0 | 0 == s >>> 0 & 112 > p >>> 0;
      u = P(p, s, 1, 0);
      g ? (q = u, g = 6) : g = 5;
      break;
     case 5:
      g = 247 > u >>> 0 ? 9 : 10;
      break;
     case 6:
      g = 119 > q >>> 0 ? 7 : 8;
      break;
     case 7:
      var g = d & 127, B = g + 1 | 0;
      Vk(n + (g + 1 | 0) | 0, 0, (119 < (g + 2 | 0) >>> 0 ? B : 118) - g | 0);
      g = 8;
      break;
     case 8:
      h[n + 119 | 0] = (f >>> 29 | 0) & 255;
      h[n + 120 | 0] = (f >>> 21 | 0) & 255;
      h[n + 121 | 0] = (f >>> 13 | 0) & 255;
      h[n + 122 | 0] = (f >>> 5 | 0) & 255;
      h[n + 123 | 0] = (d >>> 29 | f << 3) & 255;
      h[n + 124 | 0] = (d >>> 21 | f << 11) & 255;
      h[n + 125 | 0] = (d >>> 13 | f << 19) & 255;
      h[n + 126 | 0] = (d >>> 5 | f << 27) & 255;
      h[n + 127 | 0] = (d << 3 | 0) & 255;
      kl(j, n | 0, 128, 0);
      g = 11;
      break;
     case 9:
      g = d & 127;
      Vk(n + (g + 1 | 0) | 0, 0, 246 - g | 0);
      g = 10;
      break;
     case 10:
      h[n + 247 | 0] = (f >>> 29 | 0) & 255;
      h[n + 248 | 0] = (f >>> 21 | 0) & 255;
      h[n + 249 | 0] = (f >>> 13 | 0) & 255;
      h[n + 250 | 0] = (f >>> 5 | 0) & 255;
      h[n + 251 | 0] = (d >>> 29 | f << 3) & 255;
      h[n + 252 | 0] = (d >>> 21 | f << 11) & 255;
      h[n + 253 | 0] = (d >>> 13 | f << 19) & 255;
      h[n + 254 | 0] = (d >>> 5 | f << 27) & 255;
      h[n + 255 | 0] = (d << 3 | 0) & 255;
      kl(j, n | 0, 256, 0);
      g = 11;
      break;
     case 11:
      return I(a, l, 64), c = i, 0;
    }
  }
}
function kl(a, e, d, f) {
  for (var g = 0, g = 2; ; ) {
    switch (g) {
     case 2:
      var i = ql(a), j = t, l = a + 8 | 0, n = ql(l), p = t, s = a + 16 | 0, r = ql(s), q = t, u = a + 24 | 0, B = ql(u), F = t, E = a + 32 | 0, x = ql(E), H = t, G = a + 40 | 0, L = ql(G), C = t, D = a + 48 | 0, Q = ql(D), J = t, fa = a + 56 | 0, K = ql(fa), N = t;
      if (0 < f >>> 0 | 0 == f >>> 0 & 127 < d >>> 0) {
        var ja = N, U = K, sa = J, Fa = Q, Ca = C, Ea = L, Z = H, da = x, ma = F, xa = B, $ = q, ga = r, aa = p, ba = n, S = j, R = i, ha = f, pa = d, z = e, g = 3;
      } else {
        var ia = N, ka = K, ta = J, na = Q, ya = C, La = L, Qa = H, rj = x, Rj = F, sj = B, Sj = q, kd = r, tj = p, ed = n, uj = j, Pb = i, g = 4;
      }
      break;
     case 3:
      var bj = ql(z), vj = t, ac = ql(z + 8 | 0), Qb = t, bc = ql(z + 16 | 0), Rb = t, cc = ql(z + 24 | 0), Sb = t, Tb = ql(z + 32 | 0), Ra = t, dc = ql(z + 40 | 0), Ub = t, fd = ql(z + 48 | 0), Sa = t, gd = ql(z + 56 | 0), Ma = t, ua = ql(z + 64 | 0), qa = t, ec = ql(z + 72 | 0), Vb = t, fc = ql(z + 80 | 0), Wb = t, gc = ql(z + 88 | 0), Xb = t, hc = ql(z + 96 | 0), Yb = t, ic = ql(z + 104 | 0), Na = t, w = ql(z + 112 | 0), v = t, za = ql(z + 120 | 0), va = t, wj = (da >>> 14 | Z << 18 | 0) ^ (da >>> 18 | Z << 14 | 0) ^ (Z >>> 9 | 0 | da << 23 | 0), kj = (Z >>> 14 | 0 | da << 18 | 0) ^ (Z >>> 18 | 0 | da << 14 | 0) ^ (0 | Z << 23 | da >>> 9), xj = da & Ea ^ Fa & (da ^ -1), lj = Z & Ca ^ sa & (Z ^ -1), Tj = P(U, ja, -685199838, 1116352408), Uj = P(Tj, t, xj, lj), yj = P(Uj, t, wj, kj), zj = P(yj, t, bj, vj), Aj = t, Bj = R & ba, Cj = S & aa, Vj = P((R >>> 28 | S << 4 | 0) ^ (S >>> 2 | 0 | R << 30 | 0) ^ (S >>> 7 | 0 | R << 25 | 0), (S >>> 28 | 0 | R << 4 | 0) ^ (0 | S << 30 | R >>> 2) ^ (0 | S << 25 | R >>> 7), (R ^ ba) & ga ^ Bj, (S ^ aa) & $ ^ Cj), cj = t, Aa = P(zj, Aj, xa, ma), Oa = t, Pa = P(Vj, cj, zj, Aj), Ga = t, Dj = (Aa >>> 14 | Oa << 18 | 0) ^ (Aa >>> 18 | Oa << 14 | 0) ^ (Oa >>> 9 | 0 | Aa << 23 | 0), hd = (Oa >>> 14 | 0 | Aa << 18 | 0) ^ (Oa >>> 18 | 0 | Aa << 14 | 0) ^ (0 | Oa << 23 | Aa >>> 9), lk = Aa & da ^ Ea & (Aa ^ -1), mk = Oa & Z ^ Ca & (Oa ^ -1), Wj = P(Fa, sa, 602891725, 1899447441), Ej = P(Wj, t, ac, Qb), mj = P(Ej, t, lk, mk), Dk = P(mj, t, Dj, hd), Ek = t, Fk = Pa & R, Ml = Ga & S, vs = P((Pa >>> 28 | Ga << 4 | 0) ^ (Ga >>> 2 | 0 | Pa << 30 | 0) ^ (Ga >>> 7 | 0 | Pa << 25 | 0), (Ga >>> 28 | 0 | Pa << 4 | 0) ^ (0 | Ga << 30 | Pa >>> 2) ^ (0 | Ga << 25 | Pa >>> 7), Pa & ba ^ Bj ^ Fk, Ga & aa ^ Cj ^ Ml), ws = t, ld = P(Dk, Ek, ga, $), md = t, nd = P(vs, ws, Dk, Ek), od = t, xs = (ld >>> 14 | md << 18 | 0) ^ (ld >>> 18 | md << 14 | 0) ^ (md >>> 9 | 0 | ld << 23 | 0), ys = (md >>> 14 | 0 | ld << 18 | 0) ^ (md >>> 18 | 0 | ld << 14 | 0) ^ (0 | md << 23 | ld >>> 9), zs = ld & Aa ^ da & (ld ^ -1), As = md & Oa ^ Z & (md ^ -1), Bs = P(Ea, Ca, -330482897, -1245643825), Cs = P(Bs, t, bc, Rb), Ds = P(Cs, t, zs, As), Nl = P(Ds, t, xs, ys), Ol = t, Pl = nd & Pa, Ql = od & Ga, Es = P((nd >>> 28 | od << 4 | 0) ^ (od >>> 2 | 0 | nd << 30 | 0) ^ (od >>> 7 | 0 | nd << 25 | 0), (od >>> 28 | 0 | nd << 4 | 0) ^ (0 | od << 30 | nd >>> 2) ^ (0 | od << 25 | nd >>> 7), nd & R ^ Fk ^ Pl, od & S ^ Ml ^ Ql), Fs = t, pd = P(Nl, Ol, ba, aa), qd = t, rd = P(Es, Fs, Nl, Ol), sd = t, Gs = (pd >>> 14 | qd << 18 | 0) ^ (pd >>> 18 | qd << 14 | 0) ^ (qd >>> 9 | 0 | pd << 23 | 0), Hs = (qd >>> 14 | 0 | pd << 18 | 0) ^ (qd >>> 18 | 0 | pd << 14 | 0) ^ (0 | qd << 23 | pd >>> 9), Is = pd & ld ^ Aa & (pd ^ -1), Js = qd & md ^ Oa & (qd ^ -1), Ks = P(da, Z, -2121671748, -373957723), Ls = P(Ks, t, cc, Sb), Ms = P(Ls, t, Is, Js), Rl = P(Ms, t, Gs, Hs), Sl = t, Tl = rd & nd, Ul = sd & od, Ns = P((rd >>> 28 | sd << 4 | 0) ^ (sd >>> 2 | 0 | rd << 30 | 0) ^ (sd >>> 7 | 0 | rd << 25 | 0), (sd >>> 28 | 0 | rd << 4 | 0) ^ (0 | sd << 30 | rd >>> 2) ^ (0 | sd << 25 | rd >>> 7), rd & Pa ^ Pl ^ Tl, sd & Ga ^ Ql ^ Ul), Os = t, td = P(Rl, Sl, R, S), ud = t, vd = P(Ns, Os, Rl, Sl), wd = t, Ps = (td >>> 14 | ud << 18 | 0) ^ (td >>> 18 | ud << 14 | 0) ^ (ud >>> 9 | 0 | td << 23 | 0), Qs = (ud >>> 14 | 0 | td << 18 | 0) ^ (ud >>> 18 | 0 | td << 14 | 0) ^ (0 | ud << 23 | td >>> 9), Rs = td & pd ^ ld & (td ^ -1), Ss = ud & qd ^ md & (ud ^ -1), Ts = P(Aa, Oa, -213338824, 961987163), Us = P(Ts, t, Tb, Ra), Vs = P(Us, t, Rs, Ss), Vl = P(Vs, t, Ps, Qs), Wl = t, Xl = vd & rd, Yl = wd & sd, Ws = P((vd >>> 28 | wd << 4 | 0) ^ (wd >>> 2 | 0 | vd << 30 | 0) ^ (wd >>> 7 | 0 | vd << 25 | 0), (wd >>> 28 | 0 | vd << 4 | 0) ^ (0 | wd << 30 | vd >>> 2) ^ (0 | wd << 25 | vd >>> 7), vd & nd ^ Tl ^ Xl, wd & od ^ Ul ^ Yl), Xs = t, xd = P(Vl, Wl, Pa, Ga), yd = t, zd = P(Ws, Xs, Vl, Wl), Ad = t, Ys = (xd >>> 14 | yd << 18 | 0) ^ (xd >>> 18 | yd << 14 | 0) ^ (yd >>> 9 | 0 | xd << 23 | 0), Zs = (yd >>> 14 | 0 | xd << 18 | 0) ^ (yd >>> 18 | 0 | xd << 14 | 0) ^ (0 | yd << 23 | xd >>> 9), $s = xd & td ^ pd & (xd ^ -1), at = yd & ud ^ qd & (yd ^ -1), bt = P(dc, Ub, -1241133031, 1508970993), ct = P(bt, t, ld, md), dt = P(ct, t, $s, at), Zl = P(dt, t, Ys, Zs), $l = t, am = zd & vd, bm = Ad & wd, et = P((zd >>> 28 | Ad << 4 | 0) ^ (Ad >>> 2 | 0 | zd << 30 | 0) ^ (Ad >>> 7 | 0 | zd << 25 | 0), (Ad >>> 28 | 0 | zd << 4 | 0) ^ (0 | Ad << 30 | zd >>> 2) ^ (0 | Ad << 25 | zd >>> 7), zd & rd ^ Xl ^ am, Ad & sd ^ Yl ^ bm), ft = t, Bd = P(Zl, $l, nd, od), Cd = t, Dd = P(et, ft, Zl, $l), Ed = t, gt = (Bd >>> 14 | Cd << 18 | 0) ^ (Bd >>> 18 | Cd << 14 | 0) ^ (Cd >>> 9 | 0 | Bd << 23 | 0), ht = (Cd >>> 14 | 0 | Bd << 18 | 0) ^ (Cd >>> 18 | 0 | Bd << 14 | 0) ^ (0 | Cd << 23 | Bd >>> 9), it = Bd & xd ^ td & (Bd ^ -1), jt = Cd & yd ^ ud & (Cd ^ -1), kt = P(fd, Sa, -1357295717, -1841331548), lt = P(kt, t, pd, qd), mt = P(lt, t, it, jt), cm = P(mt, t, gt, ht), dm = t, em = Dd & zd, fm = Ed & Ad, nt = P((Dd >>> 28 | Ed << 4 | 0) ^ (Ed >>> 2 | 0 | Dd << 30 | 0) ^ (Ed >>> 7 | 0 | Dd << 25 | 0), (Ed >>> 28 | 0 | Dd << 4 | 0) ^ (0 | Ed << 30 | Dd >>> 2) ^ (0 | Ed << 25 | Dd >>> 7), Dd & vd ^ am ^ em, Ed & wd ^ bm ^ fm), ot = t, Fd = P(cm, dm, rd, sd), Gd = t, Hd = P(nt, ot, cm, dm), Id = t, pt = (Fd >>> 14 | Gd << 18 | 0) ^ (Fd >>> 18 | Gd << 14 | 0) ^ (Gd >>> 9 | 0 | Fd << 23 | 0), qt = (Gd >>> 14 | 0 | Fd << 18 | 0) ^ (Gd >>> 18 | 0 | Fd << 14 | 0) ^ (0 | Gd << 23 | Fd >>> 9), rt = Fd & Bd ^ xd & (Fd ^ -1), st = Gd & Cd ^ yd & (Gd ^ -1), tt = P(gd, Ma, -630357736, -1424204075), ut = P(tt, t, td, ud), vt = P(ut, t, rt, st), gm = P(vt, t, pt, qt), hm = t, im = Hd & Dd, jm = Id & Ed, wt = P((Hd >>> 28 | Id << 4 | 0) ^ (Id >>> 2 | 0 | Hd << 30 | 0) ^ (Id >>> 7 | 0 | Hd << 25 | 0), (Id >>> 28 | 0 | Hd << 4 | 0) ^ (0 | Id << 30 | Hd >>> 2) ^ (0 | Id << 25 | Hd >>> 7), Hd & zd ^ em ^ im, Id & Ad ^ fm ^ jm), xt = t, Jd = P(gm, hm, vd, wd), Kd = t, Ld = P(wt, xt, gm, hm), Md = t, yt = (Jd >>> 14 | Kd << 18 | 0) ^ (Jd >>> 18 | Kd << 14 | 0) ^ (Kd >>> 9 | 0 | Jd << 23 | 0), zt = (Kd >>> 14 | 0 | Jd << 18 | 0) ^ (Kd >>> 18 | 0 | Jd << 14 | 0) ^ (0 | Kd << 23 | Jd >>> 9), At = Jd & Fd ^ Bd & (Jd ^ -1), Bt = Kd & Gd ^ Cd & (Kd ^ -1), Ct = P(ua, qa, -1560083902, -670586216), Dt = P(Ct, t, xd, yd), Et = P(Dt, t, At, Bt), km = P(Et, t, yt, zt), lm = t, mm = Ld & Hd, nm = Md & Id, Ft = P((Ld >>> 28 | Md << 4 | 0) ^ (Md >>> 2 | 0 | Ld << 30 | 0) ^ (Md >>> 7 | 0 | Ld << 25 | 0), (Md >>> 28 | 0 | Ld << 4 | 0) ^ (0 | Md << 30 | Ld >>> 2) ^ (0 | Md << 25 | Ld >>> 7), Ld & Dd ^ im ^ mm, Md & Ed ^ jm ^ nm), Gt = t, Nd = P(km, lm, zd, Ad), Od = t, Pd = P(Ft, Gt, km, lm), Qd = t, Ht = (Nd >>> 14 | Od << 18 | 0) ^ (Nd >>> 18 | Od << 14 | 0) ^ (Od >>> 9 | 0 | Nd << 23 | 0), It = (Od >>> 14 | 0 | Nd << 18 | 0) ^ (Od >>> 18 | 0 | Nd << 14 | 0) ^ (0 | Od << 23 | Nd >>> 9), Jt = Nd & Jd ^ Fd & (Nd ^ -1), Kt = Od & Kd ^ Gd & (Od ^ -1), Lt = P(ec, Vb, 1164996542, 310598401), Mt = P(Lt, t, Bd, Cd), Nt = P(Mt, t, Jt, Kt), om = P(Nt, t, Ht, It), pm = t, qm = Pd & Ld, rm = Qd & Md, Ot = P((Pd >>> 28 | Qd << 4 | 0) ^ (Qd >>> 2 | 0 | Pd << 30 | 0) ^ (Qd >>> 7 | 0 | Pd << 25 | 0), (Qd >>> 28 | 0 | Pd << 4 | 0) ^ (0 | Qd << 30 | Pd >>> 2) ^ (0 | Qd << 25 | Pd >>> 7), Pd & Hd ^ mm ^ qm, Qd & Id ^ nm ^ rm), Pt = t, Rd = P(om, pm, Dd, Ed), Sd = t, Td = P(Ot, Pt, om, pm), Ud = t, Qt = (Rd >>> 14 | Sd << 18 | 0) ^ (Rd >>> 18 | Sd << 14 | 0) ^ (Sd >>> 9 | 0 | Rd << 23 | 0), Rt = (Sd >>> 14 | 0 | Rd << 18 | 0) ^ (Sd >>> 18 | 0 | Rd << 14 | 0) ^ (0 | Sd << 23 | Rd >>> 9), St = Rd & Nd ^ Jd & (Rd ^ -1), Tt = Sd & Od ^ Kd & (Sd ^ -1), Ut = P(fc, Wb, 1323610764, 607225278), Vt = P(Ut, t, Fd, Gd), Wt = P(Vt, t, St, Tt), sm = P(Wt, t, Qt, Rt), tm = t, um = Td & Pd, vm = Ud & Qd, Xt = P((Td >>> 28 | Ud << 4 | 0) ^ (Ud >>> 2 | 0 | Td << 30 | 0) ^ (Ud >>> 7 | 0 | Td << 25 | 0), (Ud >>> 28 | 0 | Td << 4 | 0) ^ (0 | Ud << 30 | Td >>> 2) ^ (0 | Ud << 25 | Td >>> 7), Td & Ld ^ qm ^ um, Ud & Md ^ rm ^ vm), Yt = t, Vd = P(sm, tm, Hd, Id), Wd = t, Xd = P(Xt, Yt, sm, tm), Yd = t, Zt = (Vd >>> 14 | Wd << 18 | 0) ^ (Vd >>> 18 | Wd << 14 | 0) ^ (Wd >>> 9 | 0 | Vd << 23 | 0), $t = (Wd >>> 14 | 0 | Vd << 18 | 0) ^ (Wd >>> 18 | 0 | Vd << 14 | 0) ^ (0 | Wd << 23 | Vd >>> 9), au = Vd & Rd ^ Nd & (Vd ^ -1), bu = Wd & Sd ^ Od & (Wd ^ -1), cu = P(gc, Xb, -704662302, 1426881987), du = P(cu, t, Jd, Kd), eu = P(du, t, au, bu), wm = P(eu, t, Zt, $t), xm = t, ym = Xd & Td, zm = Yd & Ud, fu = P((Xd >>> 28 | Yd << 4 | 0) ^ (Yd >>> 2 | 0 | Xd << 30 | 0) ^ (Yd >>> 7 | 0 | Xd << 25 | 0), (Yd >>> 28 | 0 | Xd << 4 | 0) ^ (0 | Yd << 30 | Xd >>> 2) ^ (0 | Yd << 25 | Xd >>> 7), Xd & Pd ^ um ^ ym, Yd & Qd ^ vm ^ zm), gu = t, Zd = P(wm, xm, Ld, Md), $d = t, ae = P(fu, gu, wm, xm), be = t, hu = (Zd >>> 14 | $d << 18 | 0) ^ (Zd >>> 18 | $d << 14 | 0) ^ ($d >>> 9 | 0 | Zd << 23 | 0), iu = ($d >>> 14 | 0 | Zd << 18 | 0) ^ ($d >>> 18 | 0 | Zd << 14 | 0) ^ (0 | $d << 23 | Zd >>> 9), ju = Zd & Vd ^ Rd & (Zd ^ -1), ku = $d & Wd ^ Sd & ($d ^ -1), lu = P(hc, Yb, -226784913, 1925078388), mu = P(lu, t, Nd, Od), nu = P(mu, t, ju, ku), Am = P(nu, t, hu, iu), Bm = t, Cm = ae & Xd, Dm = be & Yd, ou = P((ae >>> 28 | be << 4 | 0) ^ (be >>> 2 | 0 | ae << 30 | 0) ^ (be >>> 7 | 0 | ae << 25 | 0), (be >>> 28 | 0 | ae << 4 | 0) ^ (0 | be << 30 | ae >>> 2) ^ (0 | be << 25 | ae >>> 7), ae & Td ^ ym ^ Cm, be & Ud ^ zm ^ Dm), pu = t, ce = P(Am, Bm, Pd, Qd), de = t, ee = P(ou, pu, Am, Bm), fe = t, qu = (ce >>> 14 | de << 18 | 0) ^ (ce >>> 18 | de << 14 | 0) ^ (de >>> 9 | 0 | ce << 23 | 0), ru = (de >>> 14 | 0 | ce << 18 | 0) ^ (de >>> 18 | 0 | ce << 14 | 0) ^ (0 | de << 23 | ce >>> 9), su = ce & Zd ^ Vd & (ce ^ -1), tu = de & $d ^ Wd & (de ^ -1), uu = P(ic, Na, 991336113, -2132889090), vu = P(uu, t, Rd, Sd), wu = P(vu, t, su, tu), Em = P(wu, t, qu, ru), Fm = t, Gm = ee & ae, Hm = fe & be, xu = P((ee >>> 28 | fe << 4 | 0) ^ (fe >>> 2 | 0 | ee << 30 | 0) ^ (fe >>> 7 | 0 | ee << 25 | 0), (fe >>> 28 | 0 | ee << 4 | 0) ^ (0 | fe << 30 | ee >>> 2) ^ (0 | fe << 25 | ee >>> 7), ee & Xd ^ Cm ^ Gm, fe & Yd ^ Dm ^ Hm), yu = t, ge = P(Em, Fm, Td, Ud), he = t, ie = P(xu, yu, Em, Fm), je = t, zu = (ge >>> 14 | he << 18 | 0) ^ (ge >>> 18 | he << 14 | 0) ^ (he >>> 9 | 0 | ge << 23 | 0), Au = (he >>> 14 | 0 | ge << 18 | 0) ^ (he >>> 18 | 0 | ge << 14 | 0) ^ (0 | he << 23 | ge >>> 9), Bu = ge & ce ^ Zd & (ge ^ -1), Cu = he & de ^ $d & (he ^ -1), Du = P(w, v, 633803317, -1680079193), Eu = P(Du, t, Vd, Wd), Fu = P(Eu, t, Bu, Cu), Im = P(Fu, t, zu, Au), Jm = t, Km = ie & ee, Lm = je & fe, Gu = P((ie >>> 28 | je << 4 | 0) ^ (je >>> 2 | 0 | ie << 30 | 0) ^ (je >>> 7 | 0 | ie << 25 | 0), (je >>> 28 | 0 | ie << 4 | 0) ^ (0 | je << 30 | ie >>> 2) ^ (0 | je << 25 | ie >>> 7), ie & ae ^ Gm ^ Km, je & be ^ Hm ^ Lm), Hu = t, ke = P(Im, Jm, Xd, Yd), le = t, me = P(Gu, Hu, Im, Jm), ne = t, Iu = (ke >>> 14 | le << 18 | 0) ^ (ke >>> 18 | le << 14 | 0) ^ (le >>> 9 | 0 | ke << 23 | 0), Ju = (le >>> 14 | 0 | ke << 18 | 0) ^ (le >>> 18 | 0 | ke << 14 | 0) ^ (0 | le << 23 | ke >>> 9), Ku = ke & ge ^ ce & (ke ^ -1), Lu = le & he ^ de & (le ^ -1), Mu = P(za, va, -815192428, -1046744716), Nu = P(Mu, t, Zd, $d), Ou = P(Nu, t, Ku, Lu), Mm = P(Ou, t, Iu, Ju), Nm = t, Om = me & ie, Pm = ne & je, Pu = P((me >>> 28 | ne << 4 | 0) ^ (ne >>> 2 | 0 | me << 30 | 0) ^ (ne >>> 7 | 0 | me << 25 | 0), (ne >>> 28 | 0 | me << 4 | 0) ^ (0 | ne << 30 | me >>> 2) ^ (0 | ne << 25 | me >>> 7), me & ee ^ Km ^ Om, ne & fe ^ Lm ^ Pm), Qu = t, oe = P(Mm, Nm, ae, be), pe = t, qe = P(Pu, Qu, Mm, Nm), re = t, Ru = (v >>> 29 | 0 | w << 3 | 0) ^ (w >>> 6 | v << 26) ^ (w >>> 19 | v << 13 | 0), Su = (0 | v << 3 | w >>> 29) ^ (v >>> 6 | 0) ^ (v >>> 19 | 0 | w << 13 | 0), Tu = P((ac >>> 8 | Qb << 24 | 0) ^ (ac >>> 7 | Qb << 25) ^ (ac >>> 1 | Qb << 31 | 0), (Qb >>> 8 | 0 | ac << 24 | 0) ^ (Qb >>> 7 | 0) ^ (Qb >>> 1 | 0 | ac << 31 | 0), bj, vj), Uu = P(Tu, t, ec, Vb), jc = P(Uu, t, Ru, Su), Ta = t, Vu = (va >>> 29 | 0 | za << 3 | 0) ^ (za >>> 6 | va << 26) ^ (za >>> 19 | va << 13 | 0), Wu = (0 | va << 3 | za >>> 29) ^ (va >>> 6 | 0) ^ (va >>> 19 | 0 | za << 13 | 0), Xu = P((bc >>> 8 | Rb << 24 | 0) ^ (bc >>> 7 | Rb << 25) ^ (bc >>> 1 | Rb << 31 | 0), (Rb >>> 8 | 0 | bc << 24 | 0) ^ (Rb >>> 7 | 0) ^ (Rb >>> 1 | 0 | bc << 31 | 0), ac, Qb), Yu = P(Xu, t, fc, Wb), kc = P(Yu, t, Vu, Wu), Ua = t, Zu = (Ta >>> 29 | 0 | jc << 3 | 0) ^ (jc >>> 6 | Ta << 26) ^ (jc >>> 19 | Ta << 13 | 0), $u = (0 | Ta << 3 | jc >>> 29) ^ (Ta >>> 6 | 0) ^ (Ta >>> 19 | 0 | jc << 13 | 0), av = P((cc >>> 8 | Sb << 24 | 0) ^ (cc >>> 7 | Sb << 25) ^ (cc >>> 1 | Sb << 31 | 0), (Sb >>> 8 | 0 | cc << 24 | 0) ^ (Sb >>> 7 | 0) ^ (Sb >>> 1 | 0 | cc << 31 | 0), bc, Rb), bv = P(av, t, gc, Xb), lc = P(bv, t, Zu, $u), Va = t, cv = (Ua >>> 29 | 0 | kc << 3 | 0) ^ (kc >>> 6 | Ua << 26) ^ (kc >>> 19 | Ua << 13 | 0), dv = (0 | Ua << 3 | kc >>> 29) ^ (Ua >>> 6 | 0) ^ (Ua >>> 19 | 0 | kc << 13 | 0), ev = P((Tb >>> 8 | Ra << 24 | 0) ^ (Tb >>> 7 | Ra << 25) ^ (Tb >>> 1 | Ra << 31 | 0), (Ra >>> 8 | 0 | Tb << 24 | 0) ^ (Ra >>> 7 | 0) ^ (Ra >>> 1 | 0 | Tb << 31 | 0), cc, Sb), fv = P(ev, t, hc, Yb), mc = P(fv, t, cv, dv), Wa = t, gv = (Va >>> 29 | 0 | lc << 3 | 0) ^ (lc >>> 6 | Va << 26) ^ (lc >>> 19 | Va << 13 | 0), hv = (0 | Va << 3 | lc >>> 29) ^ (Va >>> 6 | 0) ^ (Va >>> 19 | 0 | lc << 13 | 0), iv = P((dc >>> 8 | Ub << 24 | 0) ^ (dc >>> 7 | Ub << 25) ^ (dc >>> 1 | Ub << 31 | 0), (Ub >>> 8 | 0 | dc << 24 | 0) ^ (Ub >>> 7 | 0) ^ (Ub >>> 1 | 0 | dc << 31 | 0), Tb, Ra), jv = P(iv, t, ic, Na), nc = P(jv, t, gv, hv), Xa = t, kv = (Wa >>> 29 | 0 | mc << 3 | 0) ^ (mc >>> 6 | Wa << 26) ^ (mc >>> 19 | Wa << 13 | 0), lv = (0 | Wa << 3 | mc >>> 29) ^ (Wa >>> 6 | 0) ^ (Wa >>> 19 | 0 | mc << 13 | 0), mv = P((fd >>> 8 | Sa << 24 | 0) ^ (fd >>> 7 | Sa << 25) ^ (fd >>> 1 | Sa << 31 | 0), (Sa >>> 8 | 0 | fd << 24 | 0) ^ (Sa >>> 7 | 0) ^ (Sa >>> 1 | 0 | fd << 31 | 0), dc, Ub), nv = P(mv, t, w, v), oc = P(nv, t, kv, lv), Ya = t, ov = (Xa >>> 29 | 0 | nc << 3 | 0) ^ (nc >>> 6 | Xa << 26) ^ (nc >>> 19 | Xa << 13 | 0), pv = (0 | Xa << 3 | nc >>> 29) ^ (Xa >>> 6 | 0) ^ (Xa >>> 19 | 0 | nc << 13 | 0), qv = P((gd >>> 8 | Ma << 24 | 0) ^ (gd >>> 7 | Ma << 25) ^ (gd >>> 1 | Ma << 31 | 0), (Ma >>> 8 | 0 | gd << 24 | 0) ^ (Ma >>> 7 | 0) ^ (Ma >>> 1 | 0 | gd << 31 | 0), fd, Sa), rv = P(qv, t, za, va), pc = P(rv, t, ov, pv), Za = t, sv = (Ya >>> 29 | 0 | oc << 3 | 0) ^ (oc >>> 6 | Ya << 26) ^ (oc >>> 19 | Ya << 13 | 0), tv = (0 | Ya << 3 | oc >>> 29) ^ (Ya >>> 6 | 0) ^ (Ya >>> 19 | 0 | oc << 13 | 0), uv = P((ua >>> 8 | qa << 24 | 0) ^ (ua >>> 7 | qa << 25) ^ (ua >>> 1 | qa << 31 | 0), (qa >>> 8 | 0 | ua << 24 | 0) ^ (qa >>> 7 | 0) ^ (qa >>> 1 | 0 | ua << 31 | 0), gd, Ma), vv = P(uv, t, jc, Ta), qc = P(vv, t, sv, tv), $a = t, wv = (Za >>> 29 | 0 | pc << 3 | 0) ^ (pc >>> 6 | Za << 26) ^ (pc >>> 19 | Za << 13 | 0), xv = (0 | Za << 3 | pc >>> 29) ^ (Za >>> 6 | 0) ^ (Za >>> 19 | 0 | pc << 13 | 0), yv = P((ec >>> 8 | Vb << 24 | 0) ^ (ec >>> 7 | Vb << 25) ^ (ec >>> 1 | Vb << 31 | 0), (Vb >>> 8 | 0 | ec << 24 | 0) ^ (Vb >>> 7 | 0) ^ (Vb >>> 1 | 0 | ec << 31 | 0), ua, qa), zv = P(yv, t, kc, Ua), rc = P(zv, t, wv, xv), ab = t, Av = ($a >>> 29 | 0 | qc << 3 | 0) ^ (qc >>> 6 | $a << 26) ^ (qc >>> 19 | $a << 13 | 0), Bv = (0 | $a << 3 | qc >>> 29) ^ ($a >>> 6 | 0) ^ ($a >>> 19 | 0 | qc << 13 | 0), Cv = P((fc >>> 8 | Wb << 24 | 0) ^ (fc >>> 7 | Wb << 25) ^ (fc >>> 1 | Wb << 31 | 0), (Wb >>> 8 | 0 | fc << 24 | 0) ^ (Wb >>> 7 | 0) ^ (Wb >>> 1 | 0 | fc << 31 | 0), ec, Vb), Dv = P(Cv, t, lc, Va), sc = P(Dv, t, Av, Bv), bb = t, Ev = (ab >>> 29 | 0 | rc << 3 | 0) ^ (rc >>> 6 | ab << 26) ^ (rc >>> 19 | ab << 13 | 0), Fv = (0 | ab << 3 | rc >>> 29) ^ (ab >>> 6 | 0) ^ (ab >>> 19 | 0 | rc << 13 | 0), Gv = P((gc >>> 8 | Xb << 24 | 0) ^ (gc >>> 7 | Xb << 25) ^ (gc >>> 1 | Xb << 31 | 0), (Xb >>> 8 | 0 | gc << 24 | 0) ^ (Xb >>> 7 | 0) ^ (Xb >>> 1 | 0 | gc << 31 | 0), fc, Wb), Hv = P(Gv, t, mc, Wa), tc = P(Hv, t, Ev, Fv), cb = t, Iv = (bb >>> 29 | 0 | sc << 3 | 0) ^ (sc >>> 6 | bb << 26) ^ (sc >>> 19 | bb << 13 | 0), Jv = (0 | bb << 3 | sc >>> 29) ^ (bb >>> 6 | 0) ^ (bb >>> 19 | 0 | sc << 13 | 0), Kv = P((hc >>> 8 | Yb << 24 | 0) ^ (hc >>> 7 | Yb << 25) ^ (hc >>> 1 | Yb << 31 | 0), (Yb >>> 8 | 0 | hc << 24 | 0) ^ (Yb >>> 7 | 0) ^ (Yb >>> 1 | 0 | hc << 31 | 0), gc, Xb), Lv = P(Kv, t, nc, Xa), uc = P(Lv, t, Iv, Jv), db = t, Mv = (cb >>> 29 | 0 | tc << 3 | 0) ^ (tc >>> 6 | cb << 26) ^ (tc >>> 19 | cb << 13 | 0), Nv = (0 | cb << 3 | tc >>> 29) ^ (cb >>> 6 | 0) ^ (cb >>> 19 | 0 | tc << 13 | 0), Ov = P((ic >>> 8 | Na << 24 | 0) ^ (ic >>> 7 | Na << 25) ^ (ic >>> 1 | Na << 31 | 0), (Na >>> 8 | 0 | ic << 24 | 0) ^ (Na >>> 7 | 0) ^ (Na >>> 1 | 0 | ic << 31 | 0), hc, Yb), Pv = P(Ov, t, oc, Ya), vc = P(Pv, t, Mv, Nv), eb = t, Qv = (db >>> 29 | 0 | uc << 3 | 0) ^ (uc >>> 6 | db << 26) ^ (uc >>> 19 | db << 13 | 0), Rv = (0 | db << 3 | uc >>> 29) ^ (db >>> 6 | 0) ^ (db >>> 19 | 0 | uc << 13 | 0), Sv = P((w >>> 8 | v << 24 | 0) ^ (w >>> 7 | v << 25) ^ (w >>> 1 | v << 31 | 0), (v >>> 8 | 0 | w << 24 | 0) ^ (v >>> 7 | 0) ^ (v >>> 1 | 0 | w << 31 | 0), ic, Na), Tv = P(Sv, t, pc, Za), wc = P(Tv, t, Qv, Rv), fb = t, Uv = (eb >>> 29 | 0 | vc << 3 | 0) ^ (vc >>> 6 | eb << 26) ^ (vc >>> 19 | eb << 13 | 0), Vv = (0 | eb << 3 | vc >>> 29) ^ (eb >>> 6 | 0) ^ (eb >>> 19 | 0 | vc << 13 | 0), Wv = P((za >>> 8 | va << 24 | 0) ^ (za >>> 7 | va << 25) ^ (za >>> 1 | va << 31 | 0), (va >>> 8 | 0 | za << 24 | 0) ^ (va >>> 7 | 0) ^ (va >>> 1 | 0 | za << 31 | 0), w, v), Xv = P(Wv, t, qc, $a), xc = P(Xv, t, Uv, Vv), gb = t, Yv = (fb >>> 29 | 0 | wc << 3 | 0) ^ (wc >>> 6 | fb << 26) ^ (wc >>> 19 | fb << 13 | 0), Zv = (0 | fb << 3 | wc >>> 29) ^ (fb >>> 6 | 0) ^ (fb >>> 19 | 0 | wc << 13 | 0), $v = P((jc >>> 8 | Ta << 24 | 0) ^ (jc >>> 7 | Ta << 25) ^ (jc >>> 1 | Ta << 31 | 0), (Ta >>> 8 | 0 | jc << 24 | 0) ^ (Ta >>> 7 | 0) ^ (Ta >>> 1 | 0 | jc << 31 | 0), za, va), aw = P($v, t, rc, ab), yc = P(aw, t, Yv, Zv), hb = t, bw = (oe >>> 14 | pe << 18 | 0) ^ (oe >>> 18 | pe << 14 | 0) ^ (pe >>> 9 | 0 | oe << 23 | 0), cw = (pe >>> 14 | 0 | oe << 18 | 0) ^ (pe >>> 18 | 0 | oe << 14 | 0) ^ (0 | pe << 23 | oe >>> 9), dw = oe & ke ^ ge & (oe ^ -1), ew = pe & le ^ he & (pe ^ -1), fw = P(jc, Ta, -1628353838, -459576895), gw = P(fw, t, ce, de), hw = P(gw, t, dw, ew), Qm = P(hw, t, bw, cw), Rm = t, Sm = qe & me, Tm = re & ne, iw = P((qe >>> 28 | re << 4 | 0) ^ (re >>> 2 | 0 | qe << 30 | 0) ^ (re >>> 7 | 0 | qe << 25 | 0), (re >>> 28 | 0 | qe << 4 | 0) ^ (0 | re << 30 | qe >>> 2) ^ (0 | re << 25 | qe >>> 7), qe & ie ^ Om ^ Sm, re & je ^ Pm ^ Tm), jw = t, se = P(Qm, Rm, ee, fe), te = t, ue = P(iw, jw, Qm, Rm), ve = t, kw = (se >>> 14 | te << 18 | 0) ^ (se >>> 18 | te << 14 | 0) ^ (te >>> 9 | 0 | se << 23 | 0), lw = (te >>> 14 | 0 | se << 18 | 0) ^ (te >>> 18 | 0 | se << 14 | 0) ^ (0 | te << 23 | se >>> 9), mw = se & oe ^ ke & (se ^ -1), nw = te & pe ^ le & (te ^ -1), ow = P(kc, Ua, 944711139, -272742522), pw = P(ow, t, ge, he), qw = P(pw, t, mw, nw), Um = P(qw, t, kw, lw), Vm = t, Wm = ue & qe, Xm = ve & re, rw = P((ue >>> 28 | ve << 4 | 0) ^ (ve >>> 2 | 0 | ue << 30 | 0) ^ (ve >>> 7 | 0 | ue << 25 | 0), (ve >>> 28 | 0 | ue << 4 | 0) ^ (0 | ve << 30 | ue >>> 2) ^ (0 | ve << 25 | ue >>> 7), ue & me ^ Sm ^ Wm, ve & ne ^ Tm ^ Xm), sw = t, we = P(Um, Vm, ie, je), xe = t, ye = P(rw, sw, Um, Vm), ze = t, tw = (we >>> 14 | xe << 18 | 0) ^ (we >>> 18 | xe << 14 | 0) ^ (xe >>> 9 | 0 | we << 23 | 0), uw = (xe >>> 14 | 0 | we << 18 | 0) ^ (xe >>> 18 | 0 | we << 14 | 0) ^ (0 | xe << 23 | we >>> 9), vw = we & se ^ oe & (we ^ -1), ww = xe & te ^ pe & (xe ^ -1), xw = P(lc, Va, -1953704523, 264347078), yw = P(xw, t, ke, le), zw = P(yw, t, vw, ww), Ym = P(zw, t, tw, uw), Zm = t, $m = ye & ue, an = ze & ve, Aw = P((ye >>> 28 | ze << 4 | 0) ^ (ze >>> 2 | 0 | ye << 30 | 0) ^ (ze >>> 7 | 0 | ye << 25 | 0), (ze >>> 28 | 0 | ye << 4 | 0) ^ (0 | ze << 30 | ye >>> 2) ^ (0 | ze << 25 | ye >>> 7), ye & qe ^ Wm ^ $m, ze & re ^ Xm ^ an), Bw = t, Ae = P(Ym, Zm, me, ne), Be = t, Ce = P(Aw, Bw, Ym, Zm), De = t, Cw = (Ae >>> 14 | Be << 18 | 0) ^ (Ae >>> 18 | Be << 14 | 0) ^ (Be >>> 9 | 0 | Ae << 23 | 0), Dw = (Be >>> 14 | 0 | Ae << 18 | 0) ^ (Be >>> 18 | 0 | Ae << 14 | 0) ^ (0 | Be << 23 | Ae >>> 9), Ew = Ae & we ^ se & (Ae ^ -1), Fw = Be & xe ^ te & (Be ^ -1), Gw = P(mc, Wa, 2007800933, 604807628), Hw = P(Gw, t, oe, pe), Iw = P(Hw, t, Ew, Fw), bn = P(Iw, t, Cw, Dw), cn = t, dn = Ce & ye, en = De & ze, Jw = P((Ce >>> 28 | De << 4 | 0) ^ (De >>> 2 | 0 | Ce << 30 | 0) ^ (De >>> 7 | 0 | Ce << 25 | 0), (De >>> 28 | 0 | Ce << 4 | 0) ^ (0 | De << 30 | Ce >>> 2) ^ (0 | De << 25 | Ce >>> 7), Ce & ue ^ $m ^ dn, De & ve ^ an ^ en), Kw = t, Ee = P(bn, cn, qe, re), Fe = t, Ge = P(Jw, Kw, bn, cn), He = t, Lw = (Ee >>> 14 | Fe << 18 | 0) ^ (Ee >>> 18 | Fe << 14 | 0) ^ (Fe >>> 9 | 0 | Ee << 23 | 0), Mw = (Fe >>> 14 | 0 | Ee << 18 | 0) ^ (Fe >>> 18 | 0 | Ee << 14 | 0) ^ (0 | Fe << 23 | Ee >>> 9), Nw = Ee & Ae ^ we & (Ee ^ -1), Ow = Fe & Be ^ xe & (Fe ^ -1), Pw = P(nc, Xa, 1495990901, 770255983), Qw = P(Pw, t, se, te), Rw = P(Qw, t, Nw, Ow), fn = P(Rw, t, Lw, Mw), gn = t, hn = Ge & Ce, jn = He & De, Sw = P((Ge >>> 28 | He << 4 | 0) ^ (He >>> 2 | 0 | Ge << 30 | 0) ^ (He >>> 7 | 0 | Ge << 25 | 0), (He >>> 28 | 0 | Ge << 4 | 0) ^ (0 | He << 30 | Ge >>> 2) ^ (0 | He << 25 | Ge >>> 7), Ge & ye ^ dn ^ hn, He & ze ^ en ^ jn), Tw = t, Ie = P(fn, gn, ue, ve), Je = t, Ke = P(Sw, Tw, fn, gn), Le = t, Uw = (Ie >>> 14 | Je << 18 | 0) ^ (Ie >>> 18 | Je << 14 | 0) ^ (Je >>> 9 | 0 | Ie << 23 | 0), Vw = (Je >>> 14 | 0 | Ie << 18 | 0) ^ (Je >>> 18 | 0 | Ie << 14 | 0) ^ (0 | Je << 23 | Ie >>> 9), Ww = Ie & Ee ^ Ae & (Ie ^ -1), Xw = Je & Fe ^ Be & (Je ^ -1), Yw = P(oc, Ya, 1856431235, 1249150122), Zw = P(Yw, t, we, xe), $w = P(Zw, t, Ww, Xw), kn = P($w, t, Uw, Vw), ln = t, mn = Ke & Ge, nn = Le & He, ax = P((Ke >>> 28 | Le << 4 | 0) ^ (Le >>> 2 | 0 | Ke << 30 | 0) ^ (Le >>> 7 | 0 | Ke << 25 | 0), (Le >>> 28 | 0 | Ke << 4 | 0) ^ (0 | Le << 30 | Ke >>> 2) ^ (0 | Le << 25 | Ke >>> 7), Ke & Ce ^ hn ^ mn, Le & De ^ jn ^ nn), bx = t, Me = P(kn, ln, ye, ze), Ne = t, Oe = P(ax, bx, kn, ln), Pe = t, cx = (Me >>> 14 | Ne << 18 | 0) ^ (Me >>> 18 | Ne << 14 | 0) ^ (Ne >>> 9 | 0 | Me << 23 | 0), dx = (Ne >>> 14 | 0 | Me << 18 | 0) ^ (Ne >>> 18 | 0 | Me << 14 | 0) ^ (0 | Ne << 23 | Me >>> 9), ex = Me & Ie ^ Ee & (Me ^ -1), fx = Ne & Je ^ Fe & (Ne ^ -1), gx = P(pc, Za, -1119749164, 1555081692), hx = P(gx, t, Ae, Be), ix = P(hx, t, ex, fx), on = P(ix, t, cx, dx), pn = t, qn = Oe & Ke, rn = Pe & Le, jx = P((Oe >>> 28 | Pe << 4 | 0) ^ (Pe >>> 2 | 0 | Oe << 30 | 0) ^ (Pe >>> 7 | 0 | Oe << 25 | 0), (Pe >>> 28 | 0 | Oe << 4 | 0) ^ (0 | Pe << 30 | Oe >>> 2) ^ (0 | Pe << 25 | Oe >>> 7), Oe & Ge ^ mn ^ qn, Pe & He ^ nn ^ rn), kx = t, Qe = P(on, pn, Ce, De), Re = t, Se = P(jx, kx, on, pn), Te = t, lx = (Qe >>> 14 | Re << 18 | 0) ^ (Qe >>> 18 | Re << 14 | 0) ^ (Re >>> 9 | 0 | Qe << 23 | 0), mx = (Re >>> 14 | 0 | Qe << 18 | 0) ^ (Re >>> 18 | 0 | Qe << 14 | 0) ^ (0 | Re << 23 | Qe >>> 9), nx = Qe & Me ^ Ie & (Qe ^ -1), ox = Re & Ne ^ Je & (Re ^ -1), px = P(qc, $a, -2096016459, 1996064986), qx = P(px, t, Ee, Fe), rx = P(qx, t, nx, ox), sn = P(rx, t, lx, mx), tn = t, un = Se & Oe, vn = Te & Pe, sx = P((Se >>> 28 | Te << 4 | 0) ^ (Te >>> 2 | 0 | Se << 30 | 0) ^ (Te >>> 7 | 0 | Se << 25 | 0), (Te >>> 28 | 0 | Se << 4 | 0) ^ (0 | Te << 30 | Se >>> 2) ^ (0 | Te << 25 | Se >>> 7), Se & Ke ^ qn ^ un, Te & Le ^ rn ^ vn), tx = t, Ue = P(sn, tn, Ge, He), Ve = t, We = P(sx, tx, sn, tn), Xe = t, ux = (Ue >>> 14 | Ve << 18 | 0) ^ (Ue >>> 18 | Ve << 14 | 0) ^ (Ve >>> 9 | 0 | Ue << 23 | 0), vx = (Ve >>> 14 | 0 | Ue << 18 | 0) ^ (Ve >>> 18 | 0 | Ue << 14 | 0) ^ (0 | Ve << 23 | Ue >>> 9), wx = Ue & Qe ^ Me & (Ue ^ -1), xx = Ve & Re ^ Ne & (Ve ^ -1), yx = P(rc, ab, -295247957, -1740746414), zx = P(yx, t, Ie, Je), Ax = P(zx, t, wx, xx), wn = P(Ax, t, ux, vx), xn = t, yn = We & Se, zn = Xe & Te, Bx = P((We >>> 28 | Xe << 4 | 0) ^ (Xe >>> 2 | 0 | We << 30 | 0) ^ (Xe >>> 7 | 0 | We << 25 | 0), (Xe >>> 28 | 0 | We << 4 | 0) ^ (0 | Xe << 30 | We >>> 2) ^ (0 | Xe << 25 | We >>> 7), We & Oe ^ un ^ yn, Xe & Pe ^ vn ^ zn), Cx = t, Ye = P(wn, xn, Ke, Le), Ze = t, $e = P(Bx, Cx, wn, xn), af = t, Dx = (Ye >>> 14 | Ze << 18 | 0) ^ (Ye >>> 18 | Ze << 14 | 0) ^ (Ze >>> 9 | 0 | Ye << 23 | 0), Ex = (Ze >>> 14 | 0 | Ye << 18 | 0) ^ (Ze >>> 18 | 0 | Ye << 14 | 0) ^ (0 | Ze << 23 | Ye >>> 9), Fx = Ye & Ue ^ Qe & (Ye ^ -1), Gx = Ze & Ve ^ Re & (Ze ^ -1), Hx = P(sc, bb, 766784016, -1473132947), Ix = P(Hx, t, Me, Ne), Jx = P(Ix, t, Fx, Gx), An = P(Jx, t, Dx, Ex), Bn = t, Cn = $e & We, Dn = af & Xe, Kx = P(($e >>> 28 | af << 4 | 0) ^ (af >>> 2 | 0 | $e << 30 | 0) ^ (af >>> 7 | 0 | $e << 25 | 0), (af >>> 28 | 0 | $e << 4 | 0) ^ (0 | af << 30 | $e >>> 2) ^ (0 | af << 25 | $e >>> 7), $e & Se ^ yn ^ Cn, af & Te ^ zn ^ Dn), Lx = t, bf = P(An, Bn, Oe, Pe), cf = t, df = P(Kx, Lx, An, Bn), ef = t, Mx = (bf >>> 14 | cf << 18 | 0) ^ (bf >>> 18 | cf << 14 | 0) ^ (cf >>> 9 | 0 | bf << 23 | 0), Nx = (cf >>> 14 | 0 | bf << 18 | 0) ^ (cf >>> 18 | 0 | bf << 14 | 0) ^ (0 | cf << 23 | bf >>> 9), Ox = bf & Ye ^ Ue & (bf ^ -1), Px = cf & Ze ^ Ve & (cf ^ -1), Qx = P(tc, cb, -1728372417, -1341970488), Rx = P(Qx, t, Qe, Re), Sx = P(Rx, t, Ox, Px), En = P(Sx, t, Mx, Nx), Fn = t, Gn = df & $e, Hn = ef & af, Tx = P((df >>> 28 | ef << 4 | 0) ^ (ef >>> 2 | 0 | df << 30 | 0) ^ (ef >>> 7 | 0 | df << 25 | 0), (ef >>> 28 | 0 | df << 4 | 0) ^ (0 | ef << 30 | df >>> 2) ^ (0 | ef << 25 | df >>> 7), df & We ^ Cn ^ Gn, ef & Xe ^ Dn ^ Hn), Ux = t, ff = P(En, Fn, Se, Te), gf = t, hf = P(Tx, Ux, En, Fn), jf = t, Vx = (ff >>> 14 | gf << 18 | 0) ^ (ff >>> 18 | gf << 14 | 0) ^ (gf >>> 9 | 0 | ff << 23 | 0), Wx = (gf >>> 14 | 0 | ff << 18 | 0) ^ (gf >>> 18 | 0 | ff << 14 | 0) ^ (0 | gf << 23 | ff >>> 9), Xx = ff & bf ^ Ye & (ff ^ -1), Yx = gf & cf ^ Ze & (gf ^ -1), Zx = P(uc, db, -1091629340, -1084653625), $x = P(Zx, t, Ue, Ve), ay = P($x, t, Xx, Yx), In = P(ay, t, Vx, Wx), Jn = t, Kn = hf & df, Ln = jf & ef, by = P((hf >>> 28 | jf << 4 | 0) ^ (jf >>> 2 | 0 | hf << 30 | 0) ^ (jf >>> 7 | 0 | hf << 25 | 0), (jf >>> 28 | 0 | hf << 4 | 0) ^ (0 | jf << 30 | hf >>> 2) ^ (0 | jf << 25 | hf >>> 7), hf & $e ^ Gn ^ Kn, jf & af ^ Hn ^ Ln), cy = t, kf = P(In, Jn, We, Xe), lf = t, mf = P(by, cy, In, Jn), nf = t, dy = (kf >>> 14 | lf << 18 | 0) ^ (kf >>> 18 | lf << 14 | 0) ^ (lf >>> 9 | 0 | kf << 23 | 0), ey = (lf >>> 14 | 0 | kf << 18 | 0) ^ (lf >>> 18 | 0 | kf << 14 | 0) ^ (0 | lf << 23 | kf >>> 9), fy = kf & ff ^ bf & (kf ^ -1), gy = lf & gf ^ cf & (lf ^ -1), hy = P(vc, eb, 1034457026, -958395405), iy = P(hy, t, Ye, Ze), jy = P(iy, t, fy, gy), Mn = P(jy, t, dy, ey), Nn = t, On = mf & hf, Pn = nf & jf, ky = P((mf >>> 28 | nf << 4 | 0) ^ (nf >>> 2 | 0 | mf << 30 | 0) ^ (nf >>> 7 | 0 | mf << 25 | 0), (nf >>> 28 | 0 | mf << 4 | 0) ^ (0 | nf << 30 | mf >>> 2) ^ (0 | nf << 25 | mf >>> 7), mf & df ^ Kn ^ On, nf & ef ^ Ln ^ Pn), ly = t, of = P(Mn, Nn, $e, af), pf = t, qf = P(ky, ly, Mn, Nn), rf = t, my = (of >>> 14 | pf << 18 | 0) ^ (of >>> 18 | pf << 14 | 0) ^ (pf >>> 9 | 0 | of << 23 | 0), ny = (pf >>> 14 | 0 | of << 18 | 0) ^ (pf >>> 18 | 0 | of << 14 | 0) ^ (0 | pf << 23 | of >>> 9), oy = of & kf ^ ff & (of ^ -1), py = pf & lf ^ gf & (pf ^ -1), qy = P(wc, fb, -1828018395, -710438585), ry = P(qy, t, bf, cf), sy = P(ry, t, oy, py), Qn = P(sy, t, my, ny), Rn = t, Sn = qf & mf, Tn = rf & nf, ty = P((qf >>> 28 | rf << 4 | 0) ^ (rf >>> 2 | 0 | qf << 30 | 0) ^ (rf >>> 7 | 0 | qf << 25 | 0), (rf >>> 28 | 0 | qf << 4 | 0) ^ (0 | rf << 30 | qf >>> 2) ^ (0 | rf << 25 | qf >>> 7), qf & hf ^ On ^ Sn, rf & jf ^ Pn ^ Tn), uy = t, sf = P(Qn, Rn, df, ef), tf = t, uf = P(ty, uy, Qn, Rn), vf = t, vy = (sf >>> 14 | tf << 18 | 0) ^ (sf >>> 18 | tf << 14 | 0) ^ (tf >>> 9 | 0 | sf << 23 | 0), wy = (tf >>> 14 | 0 | sf << 18 | 0) ^ (tf >>> 18 | 0 | sf << 14 | 0) ^ (0 | tf << 23 | sf >>> 9), xy = sf & of ^ kf & (sf ^ -1), yy = tf & pf ^ lf & (tf ^ -1), zy = P(xc, gb, -536640913, 113926993), Ay = P(zy, t, ff, gf), By = P(Ay, t, xy, yy), Un = P(By, t, vy, wy), Vn = t, Wn = uf & qf, Xn = vf & rf, Cy = P((uf >>> 28 | vf << 4 | 0) ^ (vf >>> 2 | 0 | uf << 30 | 0) ^ (vf >>> 7 | 0 | uf << 25 | 0), (vf >>> 28 | 0 | uf << 4 | 0) ^ (0 | vf << 30 | uf >>> 2) ^ (0 | vf << 25 | uf >>> 7), uf & mf ^ Sn ^ Wn, vf & nf ^ Tn ^ Xn), Dy = t, wf = P(Un, Vn, hf, jf), xf = t, yf = P(Cy, Dy, Un, Vn), zf = t, Ey = (wf >>> 14 | xf << 18 | 0) ^ (wf >>> 18 | xf << 14 | 0) ^ (xf >>> 9 | 0 | wf << 23 | 0), Fy = (xf >>> 14 | 0 | wf << 18 | 0) ^ (xf >>> 18 | 0 | wf << 14 | 0) ^ (0 | xf << 23 | wf >>> 9), Gy = wf & sf ^ of & (wf ^ -1), Hy = xf & tf ^ pf & (xf ^ -1), Iy = P(yc, hb, 168717936, 338241895), Jy = P(Iy, t, kf, lf), Ky = P(Jy, t, Gy, Hy), Yn = P(Ky, t, Ey, Fy), Zn = t, $n = yf & uf, ao = zf & vf, Ly = P((yf >>> 28 | zf << 4 | 0) ^ (zf >>> 2 | 0 | yf << 30 | 0) ^ (zf >>> 7 | 0 | yf << 25 | 0), (zf >>> 28 | 0 | yf << 4 | 0) ^ (0 | zf << 30 | yf >>> 2) ^ (0 | zf << 25 | yf >>> 7), yf & qf ^ Wn ^ $n, zf & rf ^ Xn ^ ao), My = t, Af = P(Yn, Zn, mf, nf), Bf = t, Cf = P(Ly, My, Yn, Zn), Df = t, Ny = (gb >>> 29 | 0 | xc << 3 | 0) ^ (xc >>> 6 | gb << 26) ^ (xc >>> 19 | gb << 13 | 0), Oy = (0 | gb << 3 | xc >>> 29) ^ (gb >>> 6 | 0) ^ (gb >>> 19 | 0 | xc << 13 | 0), Py = P((kc >>> 8 | Ua << 24 | 0) ^ (kc >>> 7 | Ua << 25) ^ (kc >>> 1 | Ua << 31 | 0), (Ua >>> 8 | 0 | kc << 24 | 0) ^ (Ua >>> 7 | 0) ^ (Ua >>> 1 | 0 | kc << 31 | 0), jc, Ta), Qy = P(Py, t, sc, bb), zc = P(Qy, t, Ny, Oy), ib = t, Ry = (hb >>> 29 | 0 | yc << 3 | 0) ^ (yc >>> 6 | hb << 26) ^ (yc >>> 19 | hb << 13 | 0), Sy = (0 | hb << 3 | yc >>> 29) ^ (hb >>> 6 | 0) ^ (hb >>> 19 | 0 | yc << 13 | 0), Ty = P((lc >>> 8 | Va << 24 | 0) ^ (lc >>> 7 | Va << 25) ^ (lc >>> 1 | Va << 31 | 0), (Va >>> 8 | 0 | lc << 24 | 0) ^ (Va >>> 7 | 0) ^ (Va >>> 1 | 0 | lc << 31 | 0), kc, Ua), Uy = P(Ty, t, tc, cb), Ac = P(Uy, t, Ry, Sy), jb = t, Vy = (ib >>> 29 | 0 | zc << 3 | 0) ^ (zc >>> 6 | ib << 26) ^ (zc >>> 19 | ib << 13 | 0), Wy = (0 | ib << 3 | zc >>> 29) ^ (ib >>> 6 | 0) ^ (ib >>> 19 | 0 | zc << 13 | 0), Xy = P((mc >>> 8 | Wa << 24 | 0) ^ (mc >>> 7 | Wa << 25) ^ (mc >>> 1 | Wa << 31 | 0), (Wa >>> 8 | 0 | mc << 24 | 0) ^ (Wa >>> 7 | 0) ^ (Wa >>> 1 | 0 | mc << 31 | 0), lc, Va), Yy = P(Xy, t, uc, db), Bc = P(Yy, t, Vy, Wy), kb = t, Zy = (jb >>> 29 | 0 | Ac << 3 | 0) ^ (Ac >>> 6 | jb << 26) ^ (Ac >>> 19 | jb << 13 | 0), $y = (0 | jb << 3 | Ac >>> 29) ^ (jb >>> 6 | 0) ^ (jb >>> 19 | 0 | Ac << 13 | 0), az = P((nc >>> 8 | Xa << 24 | 0) ^ (nc >>> 7 | Xa << 25) ^ (nc >>> 1 | Xa << 31 | 0), (Xa >>> 8 | 0 | nc << 24 | 0) ^ (Xa >>> 7 | 0) ^ (Xa >>> 1 | 0 | nc << 31 | 0), mc, Wa), bz = P(az, t, vc, eb), Cc = P(bz, t, Zy, $y), lb = t, cz = (kb >>> 29 | 0 | Bc << 3 | 0) ^ (Bc >>> 6 | kb << 26) ^ (Bc >>> 19 | kb << 13 | 0), dz = (0 | kb << 3 | Bc >>> 29) ^ (kb >>> 6 | 0) ^ (kb >>> 19 | 0 | Bc << 13 | 0), ez = P((oc >>> 8 | Ya << 24 | 0) ^ (oc >>> 7 | Ya << 25) ^ (oc >>> 1 | Ya << 31 | 0), (Ya >>> 8 | 0 | oc << 24 | 0) ^ (Ya >>> 7 | 0) ^ (Ya >>> 1 | 0 | oc << 31 | 0), nc, Xa), fz = P(ez, t, wc, fb), Dc = P(fz, t, cz, dz), mb = t, gz = (lb >>> 29 | 0 | Cc << 3 | 0) ^ (Cc >>> 6 | lb << 26) ^ (Cc >>> 19 | lb << 13 | 0), hz = (0 | lb << 3 | Cc >>> 29) ^ (lb >>> 6 | 0) ^ (lb >>> 19 | 0 | Cc << 13 | 0), iz = P((pc >>> 8 | Za << 24 | 0) ^ (pc >>> 7 | Za << 25) ^ (pc >>> 1 | Za << 31 | 0), (Za >>> 8 | 0 | pc << 24 | 0) ^ (Za >>> 7 | 0) ^ (Za >>> 1 | 0 | pc << 31 | 0), oc, Ya), jz = P(iz, t, xc, gb), Ec = P(jz, t, gz, hz), nb = t, kz = (mb >>> 29 | 0 | Dc << 3 | 0) ^ (Dc >>> 6 | mb << 26) ^ (Dc >>> 19 | mb << 13 | 0), lz = (0 | mb << 3 | Dc >>> 29) ^ (mb >>> 6 | 0) ^ (mb >>> 19 | 0 | Dc << 13 | 0), mz = P((qc >>> 8 | $a << 24 | 0) ^ (qc >>> 7 | $a << 25) ^ (qc >>> 1 | $a << 31 | 0), ($a >>> 8 | 0 | qc << 24 | 0) ^ ($a >>> 7 | 0) ^ ($a >>> 1 | 0 | qc << 31 | 0), pc, Za), nz = P(mz, t, yc, hb), Fc = P(nz, t, kz, lz), ob = t, oz = (nb >>> 29 | 0 | Ec << 3 | 0) ^ (Ec >>> 6 | nb << 26) ^ (Ec >>> 19 | nb << 13 | 0), pz = (0 | nb << 3 | Ec >>> 29) ^ (nb >>> 6 | 0) ^ (nb >>> 19 | 0 | Ec << 13 | 0), qz = P((rc >>> 8 | ab << 24 | 0) ^ (rc >>> 7 | ab << 25) ^ (rc >>> 1 | ab << 31 | 0), (ab >>> 8 | 0 | rc << 24 | 0) ^ (ab >>> 7 | 0) ^ (ab >>> 1 | 0 | rc << 31 | 0), qc, $a), rz = P(qz, t, zc, ib), Gc = P(rz, t, oz, pz), pb = t, sz = (ob >>> 29 | 0 | Fc << 3 | 0) ^ (Fc >>> 6 | ob << 26) ^ (Fc >>> 19 | ob << 13 | 0), tz = (0 | ob << 3 | Fc >>> 29) ^ (ob >>> 6 | 0) ^ (ob >>> 19 | 0 | Fc << 13 | 0), uz = P((sc >>> 8 | bb << 24 | 0) ^ (sc >>> 7 | bb << 25) ^ (sc >>> 1 | bb << 31 | 0), (bb >>> 8 | 0 | sc << 24 | 0) ^ (bb >>> 7 | 0) ^ (bb >>> 1 | 0 | sc << 31 | 0), rc, ab), vz = P(uz, t, Ac, jb), Hc = P(vz, t, sz, tz), qb = t, wz = (pb >>> 29 | 0 | Gc << 3 | 0) ^ (Gc >>> 6 | pb << 26) ^ (Gc >>> 19 | pb << 13 | 0), xz = (0 | pb << 3 | Gc >>> 29) ^ (pb >>> 6 | 0) ^ (pb >>> 19 | 0 | Gc << 13 | 0), yz = P((tc >>> 8 | cb << 24 | 0) ^ (tc >>> 7 | cb << 25) ^ (tc >>> 1 | cb << 31 | 0), (cb >>> 8 | 0 | tc << 24 | 0) ^ (cb >>> 7 | 0) ^ (cb >>> 1 | 0 | tc << 31 | 0), sc, bb), zz = P(yz, t, Bc, kb), Ic = P(zz, t, wz, xz), rb = t, Az = (qb >>> 29 | 0 | Hc << 3 | 0) ^ (Hc >>> 6 | qb << 26) ^ (Hc >>> 19 | qb << 13 | 0), Bz = (0 | qb << 3 | Hc >>> 29) ^ (qb >>> 6 | 0) ^ (qb >>> 19 | 0 | Hc << 13 | 0), Cz = P((uc >>> 8 | db << 24 | 0) ^ (uc >>> 7 | db << 25) ^ (uc >>> 1 | db << 31 | 0), (db >>> 8 | 0 | uc << 24 | 0) ^ (db >>> 7 | 0) ^ (db >>> 1 | 0 | uc << 31 | 0), tc, cb), Dz = P(Cz, t, Cc, lb), Jc = P(Dz, t, Az, Bz), sb = t, Ez = (rb >>> 29 | 0 | Ic << 3 | 0) ^ (Ic >>> 6 | rb << 26) ^ (Ic >>> 19 | rb << 13 | 0), Fz = (0 | rb << 3 | Ic >>> 29) ^ (rb >>> 6 | 0) ^ (rb >>> 19 | 0 | Ic << 13 | 0), Gz = P((vc >>> 8 | eb << 24 | 0) ^ (vc >>> 7 | eb << 25) ^ (vc >>> 1 | eb << 31 | 0), (eb >>> 8 | 0 | vc << 24 | 0) ^ (eb >>> 7 | 0) ^ (eb >>> 1 | 0 | vc << 31 | 0), uc, db), Hz = P(Gz, t, Dc, mb), Kc = P(Hz, t, Ez, Fz), tb = t, Iz = (sb >>> 29 | 0 | Jc << 3 | 0) ^ (Jc >>> 6 | sb << 26) ^ (Jc >>> 19 | sb << 13 | 0), Jz = (0 | sb << 3 | Jc >>> 29) ^ (sb >>> 6 | 0) ^ (sb >>> 19 | 0 | Jc << 13 | 0), Kz = P((wc >>> 8 | fb << 24 | 0) ^ (wc >>> 7 | fb << 25) ^ (wc >>> 1 | fb << 31 | 0), (fb >>> 8 | 0 | wc << 24 | 0) ^ (fb >>> 7 | 0) ^ (fb >>> 1 | 0 | wc << 31 | 0), vc, eb), Lz = P(Kz, t, Ec, nb), Lc = P(Lz, t, Iz, Jz), ub = t, Mz = (tb >>> 29 | 0 | Kc << 3 | 0) ^ (Kc >>> 6 | tb << 26) ^ (Kc >>> 19 | tb << 13 | 0), Nz = (0 | tb << 3 | Kc >>> 29) ^ (tb >>> 6 | 0) ^ (tb >>> 19 | 0 | Kc << 13 | 0), Oz = P((xc >>> 8 | gb << 24 | 0) ^ (xc >>> 7 | gb << 25) ^ (xc >>> 1 | gb << 31 | 0), (gb >>> 8 | 0 | xc << 24 | 0) ^ (gb >>> 7 | 0) ^ (gb >>> 1 | 0 | xc << 31 | 0), wc, fb), Pz = P(Oz, t, Fc, ob), Mc = P(Pz, t, Mz, Nz), vb = t, Qz = (ub >>> 29 | 0 | Lc << 3 | 0) ^ (Lc >>> 6 | ub << 26) ^ (Lc >>> 19 | ub << 13 | 0), Rz = (0 | ub << 3 | Lc >>> 29) ^ (ub >>> 6 | 0) ^ (ub >>> 19 | 0 | Lc << 13 | 0), Sz = P((yc >>> 8 | hb << 24 | 0) ^ (yc >>> 7 | hb << 25) ^ (yc >>> 1 | hb << 31 | 0), (hb >>> 8 | 0 | yc << 24 | 0) ^ (hb >>> 7 | 0) ^ (hb >>> 1 | 0 | yc << 31 | 0), xc, gb), Tz = P(Sz, t, Gc, pb), Nc = P(Tz, t, Qz, Rz), wb = t, Uz = (vb >>> 29 | 0 | Mc << 3 | 0) ^ (Mc >>> 6 | vb << 26) ^ (Mc >>> 19 | vb << 13 | 0), Vz = (0 | vb << 3 | Mc >>> 29) ^ (vb >>> 6 | 0) ^ (vb >>> 19 | 0 | Mc << 13 | 0), Wz = P((zc >>> 8 | ib << 24 | 0) ^ (zc >>> 7 | ib << 25) ^ (zc >>> 1 | ib << 31 | 0), (ib >>> 8 | 0 | zc << 24 | 0) ^ (ib >>> 7 | 0) ^ (ib >>> 1 | 0 | zc << 31 | 0), yc, hb), Xz = P(Wz, t, Hc, qb), Oc = P(Xz, t, Uz, Vz), xb = t, Yz = (Af >>> 14 | Bf << 18 | 0) ^ (Af >>> 18 | Bf << 14 | 0) ^ (Bf >>> 9 | 0 | Af << 23 | 0), Zz = (Bf >>> 14 | 0 | Af << 18 | 0) ^ (Bf >>> 18 | 0 | Af << 14 | 0) ^ (0 | Bf << 23 | Af >>> 9), $z = Af & wf ^ sf & (Af ^ -1), aA = Bf & xf ^ tf & (Bf ^ -1), bA = P(zc, ib, 1188179964, 666307205), cA = P(bA, t, of, pf), dA = P(cA, t, $z, aA), bo = P(dA, t, Yz, Zz), co = t, eo = Cf & yf, fo = Df & zf, eA = P((Cf >>> 28 | Df << 4 | 0) ^ (Df >>> 2 | 0 | Cf << 30 | 0) ^ (Df >>> 7 | 0 | Cf << 25 | 0), (Df >>> 28 | 0 | Cf << 4 | 0) ^ (0 | Df << 30 | Cf >>> 2) ^ (0 | Df << 25 | Cf >>> 7), Cf & uf ^ $n ^ eo, Df & vf ^ ao ^ fo), fA = t, Ef = P(bo, co, qf, rf), Ff = t, Gf = P(eA, fA, bo, co), Hf = t, gA = (Ef >>> 14 | Ff << 18 | 0) ^ (Ef >>> 18 | Ff << 14 | 0) ^ (Ff >>> 9 | 0 | Ef << 23 | 0), hA = (Ff >>> 14 | 0 | Ef << 18 | 0) ^ (Ff >>> 18 | 0 | Ef << 14 | 0) ^ (0 | Ff << 23 | Ef >>> 9), iA = Ef & Af ^ wf & (Ef ^ -1), jA = Ff & Bf ^ xf & (Ff ^ -1), kA = P(Ac, jb, 1546045734, 773529912), lA = P(kA, t, sf, tf), mA = P(lA, t, iA, jA), go = P(mA, t, gA, hA), ho = t, io = Gf & Cf, jo = Hf & Df, nA = P((Gf >>> 28 | Hf << 4 | 0) ^ (Hf >>> 2 | 0 | Gf << 30 | 0) ^ (Hf >>> 7 | 0 | Gf << 25 | 0), (Hf >>> 28 | 0 | Gf << 4 | 0) ^ (0 | Hf << 30 | Gf >>> 2) ^ (0 | Hf << 25 | Gf >>> 7), Gf & yf ^ eo ^ io, Hf & zf ^ fo ^ jo), oA = t, If = P(go, ho, uf, vf), Jf = t, Kf = P(nA, oA, go, ho), Lf = t, pA = (If >>> 14 | Jf << 18 | 0) ^ (If >>> 18 | Jf << 14 | 0) ^ (Jf >>> 9 | 0 | If << 23 | 0), qA = (Jf >>> 14 | 0 | If << 18 | 0) ^ (Jf >>> 18 | 0 | If << 14 | 0) ^ (0 | Jf << 23 | If >>> 9), rA = If & Ef ^ Af & (If ^ -1), sA = Jf & Ff ^ Bf & (Jf ^ -1), tA = P(Bc, kb, 1522805485, 1294757372), uA = P(tA, t, wf, xf), vA = P(uA, t, rA, sA), ko = P(vA, t, pA, qA), lo = t, mo = Kf & Gf, no = Lf & Hf, wA = P((Kf >>> 28 | Lf << 4 | 0) ^ (Lf >>> 2 | 0 | Kf << 30 | 0) ^ (Lf >>> 7 | 0 | Kf << 25 | 0), (Lf >>> 28 | 0 | Kf << 4 | 0) ^ (0 | Lf << 30 | Kf >>> 2) ^ (0 | Lf << 25 | Kf >>> 7), Kf & Cf ^ io ^ mo, Lf & Df ^ jo ^ no), xA = t, Mf = P(ko, lo, yf, zf), Nf = t, Of = P(wA, xA, ko, lo), Pf = t, yA = (Mf >>> 14 | Nf << 18 | 0) ^ (Mf >>> 18 | Nf << 14 | 0) ^ (Nf >>> 9 | 0 | Mf << 23 | 0), zA = (Nf >>> 14 | 0 | Mf << 18 | 0) ^ (Nf >>> 18 | 0 | Mf << 14 | 0) ^ (0 | Nf << 23 | Mf >>> 9), AA = Mf & If ^ Ef & (Mf ^ -1), BA = Nf & Jf ^ Ff & (Nf ^ -1), CA = P(Cc, lb, -1651133473, 1396182291), DA = P(CA, t, Af, Bf), EA = P(DA, t, AA, BA), oo = P(EA, t, yA, zA), po = t, qo = Of & Kf, ro = Pf & Lf, FA = P((Of >>> 28 | Pf << 4 | 0) ^ (Pf >>> 2 | 0 | Of << 30 | 0) ^ (Pf >>> 7 | 0 | Of << 25 | 0), (Pf >>> 28 | 0 | Of << 4 | 0) ^ (0 | Pf << 30 | Of >>> 2) ^ (0 | Pf << 25 | Of >>> 7), Of & Gf ^ mo ^ qo, Pf & Hf ^ no ^ ro), GA = t, Qf = P(oo, po, Cf, Df), Rf = t, Sf = P(FA, GA, oo, po), Tf = t, HA = (Qf >>> 14 | Rf << 18 | 0) ^ (Qf >>> 18 | Rf << 14 | 0) ^ (Rf >>> 9 | 0 | Qf << 23 | 0), IA = (Rf >>> 14 | 0 | Qf << 18 | 0) ^ (Rf >>> 18 | 0 | Qf << 14 | 0) ^ (0 | Rf << 23 | Qf >>> 9), JA = Qf & Mf ^ If & (Qf ^ -1), KA = Rf & Nf ^ Jf & (Rf ^ -1), LA = P(Dc, mb, -1951439906, 1695183700), MA = P(LA, t, Ef, Ff), NA = P(MA, t, JA, KA), so = P(NA, t, HA, IA), to = t, uo = Sf & Of, vo = Tf & Pf, OA = P((Sf >>> 28 | Tf << 4 | 0) ^ (Tf >>> 2 | 0 | Sf << 30 | 0) ^ (Tf >>> 7 | 0 | Sf << 25 | 0), (Tf >>> 28 | 0 | Sf << 4 | 0) ^ (0 | Tf << 30 | Sf >>> 2) ^ (0 | Tf << 25 | Sf >>> 7), Sf & Kf ^ qo ^ uo, Tf & Lf ^ ro ^ vo), PA = t, Uf = P(so, to, Gf, Hf), Vf = t, Wf = P(OA, PA, so, to), Xf = t, QA = (Uf >>> 14 | Vf << 18 | 0) ^ (Uf >>> 18 | Vf << 14 | 0) ^ (Vf >>> 9 | 0 | Uf << 23 | 0), RA = (Vf >>> 14 | 0 | Uf << 18 | 0) ^ (Vf >>> 18 | 0 | Uf << 14 | 0) ^ (0 | Vf << 23 | Uf >>> 9), SA = Uf & Qf ^ Mf & (Uf ^ -1), TA = Vf & Rf ^ Nf & (Vf ^ -1), UA = P(Ec, nb, 1014477480, 1986661051), VA = P(UA, t, If, Jf), WA = P(VA, t, SA, TA), wo = P(WA, t, QA, RA), xo = t, yo = Wf & Sf, zo = Xf & Tf, XA = P((Wf >>> 28 | Xf << 4 | 0) ^ (Xf >>> 2 | 0 | Wf << 30 | 0) ^ (Xf >>> 7 | 0 | Wf << 25 | 0), (Xf >>> 28 | 0 | Wf << 4 | 0) ^ (0 | Xf << 30 | Wf >>> 2) ^ (0 | Xf << 25 | Wf >>> 7), Wf & Of ^ uo ^ yo, Xf & Pf ^ vo ^ zo), YA = t, Yf = P(wo, xo, Kf, Lf), Zf = t, $f = P(XA, YA, wo, xo), ag = t, ZA = (Yf >>> 14 | Zf << 18 | 0) ^ (Yf >>> 18 | Zf << 14 | 0) ^ (Zf >>> 9 | 0 | Yf << 23 | 0), $A = (Zf >>> 14 | 0 | Yf << 18 | 0) ^ (Zf >>> 18 | 0 | Yf << 14 | 0) ^ (0 | Zf << 23 | Yf >>> 9), aB = Yf & Uf ^ Qf & (Yf ^ -1), bB = Zf & Vf ^ Rf & (Zf ^ -1), cB = P(Fc, ob, 1206759142, -2117940946), dB = P(cB, t, Mf, Nf), eB = P(dB, t, aB, bB), Ao = P(eB, t, ZA, $A), Bo = t, Co = $f & Wf, Do = ag & Xf, fB = P(($f >>> 28 | ag << 4 | 0) ^ (ag >>> 2 | 0 | $f << 30 | 0) ^ (ag >>> 7 | 0 | $f << 25 | 0), (ag >>> 28 | 0 | $f << 4 | 0) ^ (0 | ag << 30 | $f >>> 2) ^ (0 | ag << 25 | $f >>> 7), $f & Sf ^ yo ^ Co, ag & Tf ^ zo ^ Do), gB = t, bg = P(Ao, Bo, Of, Pf), cg = t, dg = P(fB, gB, Ao, Bo), eg = t, hB = (bg >>> 14 | cg << 18 | 0) ^ (bg >>> 18 | cg << 14 | 0) ^ (cg >>> 9 | 0 | bg << 23 | 0), iB = (cg >>> 14 | 0 | bg << 18 | 0) ^ (cg >>> 18 | 0 | bg << 14 | 0) ^ (0 | cg << 23 | bg >>> 9), jB = bg & Yf ^ Uf & (bg ^ -1), kB = cg & Zf ^ Vf & (cg ^ -1), lB = P(Gc, pb, 344077627, -1838011259), mB = P(lB, t, Qf, Rf), nB = P(mB, t, jB, kB), Eo = P(nB, t, hB, iB), Fo = t, Go = dg & $f, Ho = eg & ag, oB = P((dg >>> 28 | eg << 4 | 0) ^ (eg >>> 2 | 0 | dg << 30 | 0) ^ (eg >>> 7 | 0 | dg << 25 | 0), (eg >>> 28 | 0 | dg << 4 | 0) ^ (0 | eg << 30 | dg >>> 2) ^ (0 | eg << 25 | dg >>> 7), dg & Wf ^ Co ^ Go, eg & Xf ^ Do ^ Ho), pB = t, fg = P(Eo, Fo, Sf, Tf), gg = t, hg = P(oB, pB, Eo, Fo), ig = t, qB = (fg >>> 14 | gg << 18 | 0) ^ (fg >>> 18 | gg << 14 | 0) ^ (gg >>> 9 | 0 | fg << 23 | 0), rB = (gg >>> 14 | 0 | fg << 18 | 0) ^ (gg >>> 18 | 0 | fg << 14 | 0) ^ (0 | gg << 23 | fg >>> 9), sB = fg & bg ^ Yf & (fg ^ -1), tB = gg & cg ^ Zf & (gg ^ -1), uB = P(Hc, qb, 1290863460, -1564481375), vB = P(uB, t, Uf, Vf), wB = P(vB, t, sB, tB), Io = P(wB, t, qB, rB), Jo = t, Ko = hg & dg, Lo = ig & eg, xB = P((hg >>> 28 | ig << 4 | 0) ^ (ig >>> 2 | 0 | hg << 30 | 0) ^ (ig >>> 7 | 0 | hg << 25 | 0), (ig >>> 28 | 0 | hg << 4 | 0) ^ (0 | ig << 30 | hg >>> 2) ^ (0 | ig << 25 | hg >>> 7), hg & $f ^ Go ^ Ko, ig & ag ^ Ho ^ Lo), yB = t, jg = P(Io, Jo, Wf, Xf), kg = t, lg = P(xB, yB, Io, Jo), mg = t, zB = (jg >>> 14 | kg << 18 | 0) ^ (jg >>> 18 | kg << 14 | 0) ^ (kg >>> 9 | 0 | jg << 23 | 0), AB = (kg >>> 14 | 0 | jg << 18 | 0) ^ (kg >>> 18 | 0 | jg << 14 | 0) ^ (0 | kg << 23 | jg >>> 9), BB = jg & fg ^ bg & (jg ^ -1), CB = kg & gg ^ cg & (kg ^ -1), DB = P(Ic, rb, -1136513023, -1474664885), EB = P(DB, t, Yf, Zf), FB = P(EB, t, BB, CB), Mo = P(FB, t, zB, AB), No = t, Oo = lg & hg, Po = mg & ig, GB = P((lg >>> 28 | mg << 4 | 0) ^ (mg >>> 2 | 0 | lg << 30 | 0) ^ (mg >>> 7 | 0 | lg << 25 | 0), (mg >>> 28 | 0 | lg << 4 | 0) ^ (0 | mg << 30 | lg >>> 2) ^ (0 | mg << 25 | lg >>> 7), lg & dg ^ Ko ^ Oo, mg & eg ^ Lo ^ Po), HB = t, ng = P(Mo, No, $f, ag), og = t, pg = P(GB, HB, Mo, No), qg = t, IB = (ng >>> 14 | og << 18 | 0) ^ (ng >>> 18 | og << 14 | 0) ^ (og >>> 9 | 0 | ng << 23 | 0), JB = (og >>> 14 | 0 | ng << 18 | 0) ^ (og >>> 18 | 0 | ng << 14 | 0) ^ (0 | og << 23 | ng >>> 9), KB = ng & jg ^ fg & (ng ^ -1), LB = og & kg ^ gg & (og ^ -1), MB = P(Jc, sb, -789014639, -1035236496), NB = P(MB, t, bg, cg), OB = P(NB, t, KB, LB), Qo = P(OB, t, IB, JB), Ro = t, So = pg & lg, To = qg & mg, PB = P((pg >>> 28 | qg << 4 | 0) ^ (qg >>> 2 | 0 | pg << 30 | 0) ^ (qg >>> 7 | 0 | pg << 25 | 0), (qg >>> 28 | 0 | pg << 4 | 0) ^ (0 | qg << 30 | pg >>> 2) ^ (0 | qg << 25 | pg >>> 7), pg & hg ^ Oo ^ So, qg & ig ^ Po ^ To), QB = t, rg = P(Qo, Ro, dg, eg), sg = t, tg = P(PB, QB, Qo, Ro), ug = t, RB = (rg >>> 14 | sg << 18 | 0) ^ (rg >>> 18 | sg << 14 | 0) ^ (sg >>> 9 | 0 | rg << 23 | 0), SB = (sg >>> 14 | 0 | rg << 18 | 0) ^ (sg >>> 18 | 0 | rg << 14 | 0) ^ (0 | sg << 23 | rg >>> 9), TB = rg & ng ^ jg & (rg ^ -1), UB = sg & og ^ kg & (sg ^ -1), VB = P(Kc, tb, 106217008, -949202525), WB = P(VB, t, fg, gg), XB = P(WB, t, TB, UB), Uo = P(XB, t, RB, SB), Vo = t, Wo = tg & pg, Xo = ug & qg, YB = P((tg >>> 28 | ug << 4 | 0) ^ (ug >>> 2 | 0 | tg << 30 | 0) ^ (ug >>> 7 | 0 | tg << 25 | 0), (ug >>> 28 | 0 | tg << 4 | 0) ^ (0 | ug << 30 | tg >>> 2) ^ (0 | ug << 25 | tg >>> 7), tg & lg ^ So ^ Wo, ug & mg ^ To ^ Xo), ZB = t, vg = P(Uo, Vo, hg, ig), wg = t, xg = P(YB, ZB, Uo, Vo), yg = t, $B = (vg >>> 14 | wg << 18 | 0) ^ (vg >>> 18 | wg << 14 | 0) ^ (wg >>> 9 | 0 | vg << 23 | 0), aC = (wg >>> 14 | 0 | vg << 18 | 0) ^ (wg >>> 18 | 0 | vg << 14 | 0) ^ (0 | wg << 23 | vg >>> 9), bC = vg & rg ^ ng & (vg ^ -1), cC = wg & sg ^ og & (wg ^ -1), dC = P(Lc, ub, -688958952, -778901479), eC = P(dC, t, jg, kg), fC = P(eC, t, bC, cC), Yo = P(fC, t, $B, aC), Zo = t, $o = xg & tg, ap = yg & ug, gC = P((xg >>> 28 | yg << 4 | 0) ^ (yg >>> 2 | 0 | xg << 30 | 0) ^ (yg >>> 7 | 0 | xg << 25 | 0), (yg >>> 28 | 0 | xg << 4 | 0) ^ (0 | yg << 30 | xg >>> 2) ^ (0 | yg << 25 | xg >>> 7), xg & pg ^ Wo ^ $o, yg & qg ^ Xo ^ ap), hC = t, zg = P(Yo, Zo, lg, mg), Ag = t, Bg = P(gC, hC, Yo, Zo), Cg = t, iC = (zg >>> 14 | Ag << 18 | 0) ^ (zg >>> 18 | Ag << 14 | 0) ^ (Ag >>> 9 | 0 | zg << 23 | 0), jC = (Ag >>> 14 | 0 | zg << 18 | 0) ^ (Ag >>> 18 | 0 | zg << 14 | 0) ^ (0 | Ag << 23 | zg >>> 9), kC = zg & vg ^ rg & (zg ^ -1), lC = Ag & wg ^ sg & (Ag ^ -1), mC = P(Mc, vb, 1432725776, -694614492), nC = P(mC, t, ng, og), oC = P(nC, t, kC, lC), bp = P(oC, t, iC, jC), cp = t, dp = Bg & xg, ep = Cg & yg, pC = P((Bg >>> 28 | Cg << 4 | 0) ^ (Cg >>> 2 | 0 | Bg << 30 | 0) ^ (Cg >>> 7 | 0 | Bg << 25 | 0), (Cg >>> 28 | 0 | Bg << 4 | 0) ^ (0 | Cg << 30 | Bg >>> 2) ^ (0 | Cg << 25 | Bg >>> 7), Bg & tg ^ $o ^ dp, Cg & ug ^ ap ^ ep), qC = t, Dg = P(bp, cp, pg, qg), Eg = t, Fg = P(pC, qC, bp, cp), Gg = t, rC = (Dg >>> 14 | Eg << 18 | 0) ^ (Dg >>> 18 | Eg << 14 | 0) ^ (Eg >>> 9 | 0 | Dg << 23 | 0), sC = (Eg >>> 14 | 0 | Dg << 18 | 0) ^ (Eg >>> 18 | 0 | Dg << 14 | 0) ^ (0 | Eg << 23 | Dg >>> 9), tC = Dg & zg ^ vg & (Dg ^ -1), uC = Eg & Ag ^ wg & (Eg ^ -1), vC = P(Nc, wb, 1467031594, -200395387), wC = P(vC, t, rg, sg), xC = P(wC, t, tC, uC), fp = P(xC, t, rC, sC), gp = t, hp = Fg & Bg, ip = Gg & Cg, yC = P((Fg >>> 28 | Gg << 4 | 0) ^ (Gg >>> 2 | 0 | Fg << 30 | 0) ^ (Gg >>> 7 | 0 | Fg << 25 | 0), (Gg >>> 28 | 0 | Fg << 4 | 0) ^ (0 | Gg << 30 | Fg >>> 2) ^ (0 | Gg << 25 | Fg >>> 7), Fg & xg ^ dp ^ hp, Gg & yg ^ ep ^ ip), zC = t, Hg = P(fp, gp, tg, ug), Ig = t, Jg = P(yC, zC, fp, gp), Kg = t, AC = (Hg >>> 14 | Ig << 18 | 0) ^ (Hg >>> 18 | Ig << 14 | 0) ^ (Ig >>> 9 | 0 | Hg << 23 | 0), BC = (Ig >>> 14 | 0 | Hg << 18 | 0) ^ (Ig >>> 18 | 0 | Hg << 14 | 0) ^ (0 | Ig << 23 | Hg >>> 9), CC = Hg & Dg ^ zg & (Hg ^ -1), DC = Ig & Eg ^ Ag & (Ig ^ -1), EC = P(Oc, xb, 851169720, 275423344), FC = P(EC, t, vg, wg), GC = P(FC, t, CC, DC), jp = P(GC, t, AC, BC), kp = t, lp = Jg & Fg, mp = Kg & Gg, HC = P((Jg >>> 28 | Kg << 4 | 0) ^ (Kg >>> 2 | 0 | Jg << 30 | 0) ^ (Kg >>> 7 | 0 | Jg << 25 | 0), (Kg >>> 28 | 0 | Jg << 4 | 0) ^ (0 | Kg << 30 | Jg >>> 2) ^ (0 | Kg << 25 | Jg >>> 7), Jg & Bg ^ hp ^ lp, Kg & Cg ^ ip ^ mp), IC = t, Lg = P(jp, kp, xg, yg), Mg = t, Ng = P(HC, IC, jp, kp), Og = t, JC = (wb >>> 29 | 0 | Nc << 3 | 0) ^ (Nc >>> 6 | wb << 26) ^ (Nc >>> 19 | wb << 13 | 0), KC = (0 | wb << 3 | Nc >>> 29) ^ (wb >>> 6 | 0) ^ (wb >>> 19 | 0 | Nc << 13 | 0), LC = P((Ac >>> 8 | jb << 24 | 0) ^ (Ac >>> 7 | jb << 25) ^ (Ac >>> 1 | jb << 31 | 0), (jb >>> 8 | 0 | Ac << 24 | 0) ^ (jb >>> 7 | 0) ^ (jb >>> 1 | 0 | Ac << 31 | 0), zc, ib), MC = P(LC, t, Ic, rb), Pc = P(MC, t, JC, KC), yb = t, NC = (xb >>> 29 | 0 | Oc << 3 | 0) ^ (Oc >>> 6 | xb << 26) ^ (Oc >>> 19 | xb << 13 | 0), OC = (0 | xb << 3 | Oc >>> 29) ^ (xb >>> 6 | 0) ^ (xb >>> 19 | 0 | Oc << 13 | 0), PC = P((Bc >>> 8 | kb << 24 | 0) ^ (Bc >>> 7 | kb << 25) ^ (Bc >>> 1 | kb << 31 | 0), (kb >>> 8 | 0 | Bc << 24 | 0) ^ (kb >>> 7 | 0) ^ (kb >>> 1 | 0 | Bc << 31 | 0), Ac, jb), QC = P(PC, t, Jc, sb), Qc = P(QC, t, NC, OC), zb = t, RC = (yb >>> 29 | 0 | Pc << 3 | 0) ^ (Pc >>> 6 | yb << 26) ^ (Pc >>> 19 | yb << 13 | 0), SC = (0 | yb << 3 | Pc >>> 29) ^ (yb >>> 6 | 0) ^ (yb >>> 19 | 0 | Pc << 13 | 0), TC = P((Cc >>> 8 | lb << 24 | 0) ^ (Cc >>> 7 | lb << 25) ^ (Cc >>> 1 | lb << 31 | 0), (lb >>> 8 | 0 | Cc << 24 | 0) ^ (lb >>> 7 | 0) ^ (lb >>> 1 | 0 | Cc << 31 | 0), Bc, kb), UC = P(TC, t, Kc, tb), Rc = P(UC, t, RC, SC), Ab = t, VC = (zb >>> 29 | 0 | Qc << 3 | 0) ^ (Qc >>> 6 | zb << 26) ^ (Qc >>> 19 | zb << 13 | 0), WC = (0 | zb << 3 | Qc >>> 29) ^ (zb >>> 6 | 0) ^ (zb >>> 19 | 0 | Qc << 13 | 0), XC = P((Dc >>> 8 | mb << 24 | 0) ^ (Dc >>> 7 | mb << 25) ^ (Dc >>> 1 | mb << 31 | 0), (mb >>> 8 | 0 | Dc << 24 | 0) ^ (mb >>> 7 | 0) ^ (mb >>> 1 | 0 | Dc << 31 | 0), Cc, lb), YC = P(XC, t, Lc, ub), Sc = P(YC, t, VC, WC), Bb = t, ZC = (Ab >>> 29 | 0 | Rc << 3 | 0) ^ (Rc >>> 6 | Ab << 26) ^ (Rc >>> 19 | Ab << 13 | 0), $C = (0 | Ab << 3 | Rc >>> 29) ^ (Ab >>> 6 | 0) ^ (Ab >>> 19 | 0 | Rc << 13 | 0), aD = P((Ec >>> 8 | nb << 24 | 0) ^ (Ec >>> 7 | nb << 25) ^ (Ec >>> 1 | nb << 31 | 0), (nb >>> 8 | 0 | Ec << 24 | 0) ^ (nb >>> 7 | 0) ^ (nb >>> 1 | 0 | Ec << 31 | 0), Dc, mb), bD = P(aD, t, Mc, vb), Tc = P(bD, t, ZC, $C), Cb = t, cD = (Bb >>> 29 | 0 | Sc << 3 | 0) ^ (Sc >>> 6 | Bb << 26) ^ (Sc >>> 19 | Bb << 13 | 0), dD = (0 | Bb << 3 | Sc >>> 29) ^ (Bb >>> 6 | 0) ^ (Bb >>> 19 | 0 | Sc << 13 | 0), eD = P((Fc >>> 8 | ob << 24 | 0) ^ (Fc >>> 7 | ob << 25) ^ (Fc >>> 1 | ob << 31 | 0), (ob >>> 8 | 0 | Fc << 24 | 0) ^ (ob >>> 7 | 0) ^ (ob >>> 1 | 0 | Fc << 31 | 0), Ec, nb), fD = P(eD, t, Nc, wb), Uc = P(fD, t, cD, dD), Db = t, gD = (Cb >>> 29 | 0 | Tc << 3 | 0) ^ (Tc >>> 6 | Cb << 26) ^ (Tc >>> 19 | Cb << 13 | 0), hD = (0 | Cb << 3 | Tc >>> 29) ^ (Cb >>> 6 | 0) ^ (Cb >>> 19 | 0 | Tc << 13 | 0), iD = P((Gc >>> 8 | pb << 24 | 0) ^ (Gc >>> 7 | pb << 25) ^ (Gc >>> 1 | pb << 31 | 0), (pb >>> 8 | 0 | Gc << 24 | 0) ^ (pb >>> 7 | 0) ^ (pb >>> 1 | 0 | Gc << 31 | 0), Fc, ob), jD = P(iD, t, Oc, xb), Vc = P(jD, t, gD, hD), Eb = t, kD = (Db >>> 29 | 0 | Uc << 3 | 0) ^ (Uc >>> 6 | Db << 26) ^ (Uc >>> 19 | Db << 13 | 0), lD = (0 | Db << 3 | Uc >>> 29) ^ (Db >>> 6 | 0) ^ (Db >>> 19 | 0 | Uc << 13 | 0), mD = P((Hc >>> 8 | qb << 24 | 0) ^ (Hc >>> 7 | qb << 25) ^ (Hc >>> 1 | qb << 31 | 0), (qb >>> 8 | 0 | Hc << 24 | 0) ^ (qb >>> 7 | 0) ^ (qb >>> 1 | 0 | Hc << 31 | 0), Gc, pb), nD = P(mD, t, Pc, yb), Wc = P(nD, t, kD, lD), Fb = t, oD = (Eb >>> 29 | 0 | Vc << 3 | 0) ^ (Vc >>> 6 | Eb << 26) ^ (Vc >>> 19 | Eb << 13 | 0), pD = (0 | Eb << 3 | Vc >>> 29) ^ (Eb >>> 6 | 0) ^ (Eb >>> 19 | 0 | Vc << 13 | 0), qD = P((Ic >>> 8 | rb << 24 | 0) ^ (Ic >>> 7 | rb << 25) ^ (Ic >>> 1 | rb << 31 | 0), (rb >>> 8 | 0 | Ic << 24 | 0) ^ (rb >>> 7 | 0) ^ (rb >>> 1 | 0 | Ic << 31 | 0), Hc, qb), rD = P(qD, t, Qc, zb), Xc = P(rD, t, oD, pD), Gb = t, sD = (Fb >>> 29 | 0 | Wc << 3 | 0) ^ (Wc >>> 6 | Fb << 26) ^ (Wc >>> 19 | Fb << 13 | 0), tD = (0 | Fb << 3 | Wc >>> 29) ^ (Fb >>> 6 | 0) ^ (Fb >>> 19 | 0 | Wc << 13 | 0), uD = P((Jc >>> 8 | sb << 24 | 0) ^ (Jc >>> 7 | sb << 25) ^ (Jc >>> 1 | sb << 31 | 0), (sb >>> 8 | 0 | Jc << 24 | 0) ^ (sb >>> 7 | 0) ^ (sb >>> 1 | 0 | Jc << 31 | 0), Ic, rb), vD = P(uD, t, Rc, Ab), Yc = P(vD, t, sD, tD), Hb = t, wD = (Gb >>> 29 | 0 | Xc << 3 | 0) ^ (Xc >>> 6 | Gb << 26) ^ (Xc >>> 19 | Gb << 13 | 0), xD = (0 | Gb << 3 | Xc >>> 29) ^ (Gb >>> 6 | 0) ^ (Gb >>> 19 | 0 | Xc << 13 | 0), yD = P((Kc >>> 8 | tb << 24 | 0) ^ (Kc >>> 7 | tb << 25) ^ (Kc >>> 1 | tb << 31 | 0), (tb >>> 8 | 0 | Kc << 24 | 0) ^ (tb >>> 7 | 0) ^ (tb >>> 1 | 0 | Kc << 31 | 0), Jc, sb), zD = P(yD, t, Sc, Bb), Zc = P(zD, t, wD, xD), Ib = t, AD = (Hb >>> 29 | 0 | Yc << 3 | 0) ^ (Yc >>> 6 | Hb << 26) ^ (Yc >>> 19 | Hb << 13 | 0), BD = (0 | Hb << 3 | Yc >>> 29) ^ (Hb >>> 6 | 0) ^ (Hb >>> 19 | 0 | Yc << 13 | 0), CD = P((Lc >>> 8 | ub << 24 | 0) ^ (Lc >>> 7 | ub << 25) ^ (Lc >>> 1 | ub << 31 | 0), (ub >>> 8 | 0 | Lc << 24 | 0) ^ (ub >>> 7 | 0) ^ (ub >>> 1 | 0 | Lc << 31 | 0), Kc, tb), DD = P(CD, t, Tc, Cb), $c = P(DD, t, AD, BD), Jb = t, ED = (Ib >>> 29 | 0 | Zc << 3 | 0) ^ (Zc >>> 6 | Ib << 26) ^ (Zc >>> 19 | Ib << 13 | 0), FD = (0 | Ib << 3 | Zc >>> 29) ^ (Ib >>> 6 | 0) ^ (Ib >>> 19 | 0 | Zc << 13 | 0), GD = P((Mc >>> 8 | vb << 24 | 0) ^ (Mc >>> 7 | vb << 25) ^ (Mc >>> 1 | vb << 31 | 0), (vb >>> 8 | 0 | Mc << 24 | 0) ^ (vb >>> 7 | 0) ^ (vb >>> 1 | 0 | Mc << 31 | 0), Lc, ub), HD = P(GD, t, Uc, Db), ad = P(HD, t, ED, FD), Kb = t, ID = (Jb >>> 29 | 0 | $c << 3 | 0) ^ ($c >>> 6 | Jb << 26) ^ ($c >>> 19 | Jb << 13 | 0), JD = (0 | Jb << 3 | $c >>> 29) ^ (Jb >>> 6 | 0) ^ (Jb >>> 19 | 0 | $c << 13 | 0), KD = P((Nc >>> 8 | wb << 24 | 0) ^ (Nc >>> 7 | wb << 25) ^ (Nc >>> 1 | wb << 31 | 0), (wb >>> 8 | 0 | Nc << 24 | 0) ^ (wb >>> 7 | 0) ^ (wb >>> 1 | 0 | Nc << 31 | 0), Mc, vb), LD = P(KD, t, Vc, Eb), bd = P(LD, t, ID, JD), Lb = t, MD = (Kb >>> 29 | 0 | ad << 3 | 0) ^ (ad >>> 6 | Kb << 26) ^ (ad >>> 19 | Kb << 13 | 0), ND = (0 | Kb << 3 | ad >>> 29) ^ (Kb >>> 6 | 0) ^ (Kb >>> 19 | 0 | ad << 13 | 0), OD = P((Oc >>> 8 | xb << 24 | 0) ^ (Oc >>> 7 | xb << 25) ^ (Oc >>> 1 | xb << 31 | 0), (xb >>> 8 | 0 | Oc << 24 | 0) ^ (xb >>> 7 | 0) ^ (xb >>> 1 | 0 | Oc << 31 | 0), Nc, wb), PD = P(OD, t, Wc, Fb), cd = P(PD, t, MD, ND), Mb = t, QD = (Lb >>> 29 | 0 | bd << 3 | 0) ^ (bd >>> 6 | Lb << 26) ^ (bd >>> 19 | Lb << 13 | 0), RD = (0 | Lb << 3 | bd >>> 29) ^ (Lb >>> 6 | 0) ^ (Lb >>> 19 | 0 | bd << 13 | 0), SD = P((Pc >>> 8 | yb << 24 | 0) ^ (Pc >>> 7 | yb << 25) ^ (Pc >>> 1 | yb << 31 | 0), (yb >>> 8 | 0 | Pc << 24 | 0) ^ (yb >>> 7 | 0) ^ (yb >>> 1 | 0 | Pc << 31 | 0), Oc, xb), TD = P(SD, t, Xc, Gb), dd = P(TD, t, QD, RD), Nb = t, UD = (Lg >>> 14 | Mg << 18 | 0) ^ (Lg >>> 18 | Mg << 14 | 0) ^ (Mg >>> 9 | 0 | Lg << 23 | 0), VD = (Mg >>> 14 | 0 | Lg << 18 | 0) ^ (Mg >>> 18 | 0 | Lg << 14 | 0) ^ (0 | Mg << 23 | Lg >>> 9), WD = Lg & Hg ^ Dg & (Lg ^ -1), XD = Mg & Ig ^ Eg & (Mg ^ -1), YD = P(Pc, yb, -1194143544, 430227734), ZD = P(YD, t, zg, Ag), $D = P(ZD, t, WD, XD), np = P($D, t, UD, VD), op = t, pp = Ng & Jg, qp = Og & Kg, aE = P((Ng >>> 28 | Og << 4 | 0) ^ (Og >>> 2 | 0 | Ng << 30 | 0) ^ (Og >>> 7 | 0 | Ng << 25 | 0), (Og >>> 28 | 0 | Ng << 4 | 0) ^ (0 | Og << 30 | Ng >>> 2) ^ (0 | Og << 25 | Ng >>> 7), Ng & Fg ^ lp ^ pp, Og & Gg ^ mp ^ qp), bE = t, Pg = P(np, op, Bg, Cg), Qg = t, Rg = P(aE, bE, np, op), Sg = t, cE = (Pg >>> 14 | Qg << 18 | 0) ^ (Pg >>> 18 | Qg << 14 | 0) ^ (Qg >>> 9 | 0 | Pg << 23 | 0), dE = (Qg >>> 14 | 0 | Pg << 18 | 0) ^ (Qg >>> 18 | 0 | Pg << 14 | 0) ^ (0 | Qg << 23 | Pg >>> 9), eE = Pg & Lg ^ Hg & (Pg ^ -1), fE = Qg & Mg ^ Ig & (Qg ^ -1), gE = P(Qc, zb, 1363258195, 506948616), hE = P(gE, t, Dg, Eg), iE = P(hE, t, eE, fE), rp = P(iE, t, cE, dE), sp = t, tp = Rg & Ng, up = Sg & Og, jE = P((Rg >>> 28 | Sg << 4 | 0) ^ (Sg >>> 2 | 0 | Rg << 30 | 0) ^ (Sg >>> 7 | 0 | Rg << 25 | 0), (Sg >>> 28 | 0 | Rg << 4 | 0) ^ (0 | Sg << 30 | Rg >>> 2) ^ (0 | Sg << 25 | Rg >>> 7), Rg & Jg ^ pp ^ tp, Sg & Kg ^ qp ^ up), kE = t, Tg = P(rp, sp, Fg, Gg), Ug = t, Vg = P(jE, kE, rp, sp), Wg = t, lE = (Tg >>> 14 | Ug << 18 | 0) ^ (Tg >>> 18 | Ug << 14 | 0) ^ (Ug >>> 9 | 0 | Tg << 23 | 0), mE = (Ug >>> 14 | 0 | Tg << 18 | 0) ^ (Ug >>> 18 | 0 | Tg << 14 | 0) ^ (0 | Ug << 23 | Tg >>> 9), nE = Tg & Pg ^ Lg & (Tg ^ -1), oE = Ug & Qg ^ Mg & (Ug ^ -1), pE = P(Rc, Ab, -544281703, 659060556), qE = P(pE, t, Hg, Ig), rE = P(qE, t, nE, oE), vp = P(rE, t, lE, mE), wp = t, xp = Vg & Rg, yp = Wg & Sg, sE = P((Vg >>> 28 | Wg << 4 | 0) ^ (Wg >>> 2 | 0 | Vg << 30 | 0) ^ (Wg >>> 7 | 0 | Vg << 25 | 0), (Wg >>> 28 | 0 | Vg << 4 | 0) ^ (0 | Wg << 30 | Vg >>> 2) ^ (0 | Wg << 25 | Vg >>> 7), Vg & Ng ^ tp ^ xp, Wg & Og ^ up ^ yp), tE = t, Xg = P(vp, wp, Jg, Kg), Yg = t, Zg = P(sE, tE, vp, wp), $g = t, uE = (Xg >>> 14 | Yg << 18 | 0) ^ (Xg >>> 18 | Yg << 14 | 0) ^ (Yg >>> 9 | 0 | Xg << 23 | 0), vE = (Yg >>> 14 | 0 | Xg << 18 | 0) ^ (Yg >>> 18 | 0 | Xg << 14 | 0) ^ (0 | Yg << 23 | Xg >>> 9), wE = Xg & Tg ^ Pg & (Xg ^ -1), xE = Yg & Ug ^ Qg & (Yg ^ -1), yE = P(Sc, Bb, -509917016, 883997877), zE = P(yE, t, Lg, Mg), AE = P(zE, t, wE, xE), zp = P(AE, t, uE, vE), Ap = t, Bp = Zg & Vg, Cp = $g & Wg, BE = P((Zg >>> 28 | $g << 4 | 0) ^ ($g >>> 2 | 0 | Zg << 30 | 0) ^ ($g >>> 7 | 0 | Zg << 25 | 0), ($g >>> 28 | 0 | Zg << 4 | 0) ^ (0 | $g << 30 | Zg >>> 2) ^ (0 | $g << 25 | Zg >>> 7), Zg & Rg ^ xp ^ Bp, $g & Sg ^ yp ^ Cp), CE = t, ah = P(zp, Ap, Ng, Og), bh = t, ch = P(BE, CE, zp, Ap), dh = t, DE = (ah >>> 14 | bh << 18 | 0) ^ (ah >>> 18 | bh << 14 | 0) ^ (bh >>> 9 | 0 | ah << 23 | 0), EE = (bh >>> 14 | 0 | ah << 18 | 0) ^ (bh >>> 18 | 0 | ah << 14 | 0) ^ (0 | bh << 23 | ah >>> 9), FE = ah & Xg ^ Tg & (ah ^ -1), GE = bh & Yg ^ Ug & (bh ^ -1), HE = P(Tc, Cb, -976659869, 958139571), IE = P(HE, t, Pg, Qg), JE = P(IE, t, FE, GE), Dp = P(JE, t, DE, EE), Ep = t, Fp = ch & Zg, Gp = dh & $g, KE = P((ch >>> 28 | dh << 4 | 0) ^ (dh >>> 2 | 0 | ch << 30 | 0) ^ (dh >>> 7 | 0 | ch << 25 | 0), (dh >>> 28 | 0 | ch << 4 | 0) ^ (0 | dh << 30 | ch >>> 2) ^ (0 | dh << 25 | ch >>> 7), ch & Vg ^ Bp ^ Fp, dh & Wg ^ Cp ^ Gp), LE = t, eh = P(Dp, Ep, Rg, Sg), fh = t, gh = P(KE, LE, Dp, Ep), hh = t, ME = (eh >>> 14 | fh << 18 | 0) ^ (eh >>> 18 | fh << 14 | 0) ^ (fh >>> 9 | 0 | eh << 23 | 0), NE = (fh >>> 14 | 0 | eh << 18 | 0) ^ (fh >>> 18 | 0 | eh << 14 | 0) ^ (0 | fh << 23 | eh >>> 9), OE = eh & ah ^ Xg & (eh ^ -1), PE = fh & bh ^ Yg & (fh ^ -1), QE = P(Uc, Db, -482243893, 1322822218), RE = P(QE, t, Tg, Ug), SE = P(RE, t, OE, PE), Hp = P(SE, t, ME, NE), Ip = t, Jp = gh & ch, Kp = hh & dh, TE = P((gh >>> 28 | hh << 4 | 0) ^ (hh >>> 2 | 0 | gh << 30 | 0) ^ (hh >>> 7 | 0 | gh << 25 | 0), (hh >>> 28 | 0 | gh << 4 | 0) ^ (0 | hh << 30 | gh >>> 2) ^ (0 | hh << 25 | gh >>> 7), gh & Zg ^ Fp ^ Jp, hh & $g ^ Gp ^ Kp), UE = t, ih = P(Hp, Ip, Vg, Wg), jh = t, kh = P(TE, UE, Hp, Ip), lh = t, VE = (ih >>> 14 | jh << 18 | 0) ^ (ih >>> 18 | jh << 14 | 0) ^ (jh >>> 9 | 0 | ih << 23 | 0), WE = (jh >>> 14 | 0 | ih << 18 | 0) ^ (jh >>> 18 | 0 | ih << 14 | 0) ^ (0 | jh << 23 | ih >>> 9), XE = ih & eh ^ ah & (ih ^ -1), YE = jh & fh ^ bh & (jh ^ -1), ZE = P(Vc, Eb, 2003034995, 1537002063), $E = P(ZE, t, Xg, Yg), aF = P($E, t, XE, YE), Lp = P(aF, t, VE, WE), Mp = t, Np = kh & gh, Op = lh & hh, bF = P((kh >>> 28 | lh << 4 | 0) ^ (lh >>> 2 | 0 | kh << 30 | 0) ^ (lh >>> 7 | 0 | kh << 25 | 0), (lh >>> 28 | 0 | kh << 4 | 0) ^ (0 | lh << 30 | kh >>> 2) ^ (0 | lh << 25 | kh >>> 7), kh & ch ^ Jp ^ Np, lh & dh ^ Kp ^ Op), cF = t, mh = P(Lp, Mp, Zg, $g), nh = t, oh = P(bF, cF, Lp, Mp), ph = t, dF = (mh >>> 14 | nh << 18 | 0) ^ (mh >>> 18 | nh << 14 | 0) ^ (nh >>> 9 | 0 | mh << 23 | 0), eF = (nh >>> 14 | 0 | mh << 18 | 0) ^ (nh >>> 18 | 0 | mh << 14 | 0) ^ (0 | nh << 23 | mh >>> 9), fF = mh & ih ^ eh & (mh ^ -1), gF = nh & jh ^ fh & (nh ^ -1), hF = P(Wc, Fb, -692930397, 1747873779), iF = P(hF, t, ah, bh), jF = P(iF, t, fF, gF), Pp = P(jF, t, dF, eF), Qp = t, Rp = oh & kh, Sp = ph & lh, kF = P((oh >>> 28 | ph << 4 | 0) ^ (ph >>> 2 | 0 | oh << 30 | 0) ^ (ph >>> 7 | 0 | oh << 25 | 0), (ph >>> 28 | 0 | oh << 4 | 0) ^ (0 | ph << 30 | oh >>> 2) ^ (0 | ph << 25 | oh >>> 7), oh & gh ^ Np ^ Rp, ph & hh ^ Op ^ Sp), lF = t, qh = P(Pp, Qp, ch, dh), rh = t, sh = P(kF, lF, Pp, Qp), th = t, mF = (qh >>> 14 | rh << 18 | 0) ^ (qh >>> 18 | rh << 14 | 0) ^ (rh >>> 9 | 0 | qh << 23 | 0), nF = (rh >>> 14 | 0 | qh << 18 | 0) ^ (rh >>> 18 | 0 | qh << 14 | 0) ^ (0 | rh << 23 | qh >>> 9), oF = qh & mh ^ ih & (qh ^ -1), pF = rh & nh ^ jh & (rh ^ -1), qF = P(Xc, Gb, 1575990012, 1955562222), rF = P(qF, t, eh, fh), sF = P(rF, t, oF, pF), Tp = P(sF, t, mF, nF), Up = t, Vp = sh & oh, Wp = th & ph, tF = P((sh >>> 28 | th << 4 | 0) ^ (th >>> 2 | 0 | sh << 30 | 0) ^ (th >>> 7 | 0 | sh << 25 | 0), (th >>> 28 | 0 | sh << 4 | 0) ^ (0 | th << 30 | sh >>> 2) ^ (0 | th << 25 | sh >>> 7), sh & kh ^ Rp ^ Vp, th & lh ^ Sp ^ Wp), uF = t, uh = P(Tp, Up, gh, hh), vh = t, wh = P(tF, uF, Tp, Up), xh = t, vF = (uh >>> 14 | vh << 18 | 0) ^ (uh >>> 18 | vh << 14 | 0) ^ (vh >>> 9 | 0 | uh << 23 | 0), wF = (vh >>> 14 | 0 | uh << 18 | 0) ^ (vh >>> 18 | 0 | uh << 14 | 0) ^ (0 | vh << 23 | uh >>> 9), xF = uh & qh ^ mh & (uh ^ -1), yF = vh & rh ^ nh & (vh ^ -1), zF = P(Yc, Hb, 1125592928, 2024104815), AF = P(zF, t, ih, jh), BF = P(AF, t, xF, yF), Xp = P(BF, t, vF, wF), Yp = t, Zp = wh & sh, $p = xh & th, CF = P((wh >>> 28 | xh << 4 | 0) ^ (xh >>> 2 | 0 | wh << 30 | 0) ^ (xh >>> 7 | 0 | wh << 25 | 0), (xh >>> 28 | 0 | wh << 4 | 0) ^ (0 | xh << 30 | wh >>> 2) ^ (0 | xh << 25 | wh >>> 7), wh & oh ^ Vp ^ Zp, xh & ph ^ Wp ^ $p), DF = t, yh = P(Xp, Yp, kh, lh), zh = t, Ah = P(CF, DF, Xp, Yp), Bh = t, EF = (yh >>> 14 | zh << 18 | 0) ^ (yh >>> 18 | zh << 14 | 0) ^ (zh >>> 9 | 0 | yh << 23 | 0), FF = (zh >>> 14 | 0 | yh << 18 | 0) ^ (zh >>> 18 | 0 | yh << 14 | 0) ^ (0 | zh << 23 | yh >>> 9), GF = yh & uh ^ qh & (yh ^ -1), HF = zh & vh ^ rh & (zh ^ -1), IF = P(Zc, Ib, -1578062990, -2067236844), JF = P(IF, t, mh, nh), KF = P(JF, t, GF, HF), aq = P(KF, t, EF, FF), bq = t, cq = Ah & wh, dq = Bh & xh, LF = P((Ah >>> 28 | Bh << 4 | 0) ^ (Bh >>> 2 | 0 | Ah << 30 | 0) ^ (Bh >>> 7 | 0 | Ah << 25 | 0), (Bh >>> 28 | 0 | Ah << 4 | 0) ^ (0 | Bh << 30 | Ah >>> 2) ^ (0 | Bh << 25 | Ah >>> 7), Ah & sh ^ Zp ^ cq, Bh & th ^ $p ^ dq), MF = t, Ch = P(aq, bq, oh, ph), Dh = t, Eh = P(LF, MF, aq, bq), Fh = t, NF = (Ch >>> 14 | Dh << 18 | 0) ^ (Ch >>> 18 | Dh << 14 | 0) ^ (Dh >>> 9 | 0 | Ch << 23 | 0), OF = (Dh >>> 14 | 0 | Ch << 18 | 0) ^ (Dh >>> 18 | 0 | Ch << 14 | 0) ^ (0 | Dh << 23 | Ch >>> 9), PF = Ch & yh ^ uh & (Ch ^ -1), QF = Dh & zh ^ vh & (Dh ^ -1), RF = P($c, Jb, 442776044, -1933114872), SF = P(RF, t, qh, rh), TF = P(SF, t, PF, QF), eq = P(TF, t, NF, OF), fq = t, gq = Eh & Ah, hq = Fh & Bh, UF = P((Eh >>> 28 | Fh << 4 | 0) ^ (Fh >>> 2 | 0 | Eh << 30 | 0) ^ (Fh >>> 7 | 0 | Eh << 25 | 0), (Fh >>> 28 | 0 | Eh << 4 | 0) ^ (0 | Fh << 30 | Eh >>> 2) ^ (0 | Fh << 25 | Eh >>> 7), Eh & wh ^ cq ^ gq, Fh & xh ^ dq ^ hq), VF = t, Gh = P(eq, fq, sh, th), Hh = t, Ih = P(UF, VF, eq, fq), Jh = t, WF = (Gh >>> 14 | Hh << 18 | 0) ^ (Gh >>> 18 | Hh << 14 | 0) ^ (Hh >>> 9 | 0 | Gh << 23 | 0), XF = (Hh >>> 14 | 0 | Gh << 18 | 0) ^ (Hh >>> 18 | 0 | Gh << 14 | 0) ^ (0 | Hh << 23 | Gh >>> 9), YF = Gh & Ch ^ yh & (Gh ^ -1), ZF = Hh & Dh ^ zh & (Hh ^ -1), $F = P(ad, Kb, 593698344, -1866530822), aG = P($F, t, uh, vh), bG = P(aG, t, YF, ZF), iq = P(bG, t, WF, XF), jq = t, kq = Ih & Eh, lq = Jh & Fh, cG = P((Ih >>> 28 | Jh << 4 | 0) ^ (Jh >>> 2 | 0 | Ih << 30 | 0) ^ (Jh >>> 7 | 0 | Ih << 25 | 0), (Jh >>> 28 | 0 | Ih << 4 | 0) ^ (0 | Jh << 30 | Ih >>> 2) ^ (0 | Jh << 25 | Ih >>> 7), Ih & Ah ^ gq ^ kq, Jh & Bh ^ hq ^ lq), dG = t, Kh = P(iq, jq, wh, xh), Lh = t, Mh = P(cG, dG, iq, jq), Nh = t, eG = (Kh >>> 14 | Lh << 18 | 0) ^ (Kh >>> 18 | Lh << 14 | 0) ^ (Lh >>> 9 | 0 | Kh << 23 | 0), fG = (Lh >>> 14 | 0 | Kh << 18 | 0) ^ (Lh >>> 18 | 0 | Kh << 14 | 0) ^ (0 | Lh << 23 | Kh >>> 9), gG = Kh & Gh ^ Ch & (Kh ^ -1), hG = Lh & Hh ^ Dh & (Lh ^ -1), iG = P(bd, Lb, -561857047, -1538233109), jG = P(iG, t, yh, zh), kG = P(jG, t, gG, hG), mq = P(kG, t, eG, fG), nq = t, oq = Mh & Ih, pq = Nh & Jh, lG = P((Mh >>> 28 | Nh << 4 | 0) ^ (Nh >>> 2 | 0 | Mh << 30 | 0) ^ (Nh >>> 7 | 0 | Mh << 25 | 0), (Nh >>> 28 | 0 | Mh << 4 | 0) ^ (0 | Nh << 30 | Mh >>> 2) ^ (0 | Nh << 25 | Mh >>> 7), Mh & Eh ^ kq ^ oq, Nh & Fh ^ lq ^ pq), mG = t, Oh = P(mq, nq, Ah, Bh), Ph = t, Qh = P(lG, mG, mq, nq), Rh = t, nG = (Oh >>> 14 | Ph << 18 | 0) ^ (Oh >>> 18 | Ph << 14 | 0) ^ (Ph >>> 9 | 0 | Oh << 23 | 0), oG = (Ph >>> 14 | 0 | Oh << 18 | 0) ^ (Ph >>> 18 | 0 | Oh << 14 | 0) ^ (0 | Ph << 23 | Oh >>> 9), pG = Oh & Kh ^ Gh & (Oh ^ -1), qG = Ph & Lh ^ Hh & (Ph ^ -1), rG = P(cd, Mb, -1295615723, -1090935817), sG = P(rG, t, Ch, Dh), tG = P(sG, t, pG, qG), qq = P(tG, t, nG, oG), rq = t, sq = Qh & Mh, tq = Rh & Nh, uG = P((Qh >>> 28 | Rh << 4 | 0) ^ (Rh >>> 2 | 0 | Qh << 30 | 0) ^ (Rh >>> 7 | 0 | Qh << 25 | 0), (Rh >>> 28 | 0 | Qh << 4 | 0) ^ (0 | Rh << 30 | Qh >>> 2) ^ (0 | Rh << 25 | Qh >>> 7), Qh & Ih ^ oq ^ sq, Rh & Jh ^ pq ^ tq), vG = t, Sh = P(qq, rq, Eh, Fh), Th = t, Uh = P(uG, vG, qq, rq), Vh = t, wG = (Sh >>> 14 | Th << 18 | 0) ^ (Sh >>> 18 | Th << 14 | 0) ^ (Th >>> 9 | 0 | Sh << 23 | 0), xG = (Th >>> 14 | 0 | Sh << 18 | 0) ^ (Th >>> 18 | 0 | Sh << 14 | 0) ^ (0 | Th << 23 | Sh >>> 9), yG = Sh & Oh ^ Kh & (Sh ^ -1), zG = Th & Ph ^ Lh & (Th ^ -1), AG = P(dd, Nb, -479046869, -965641998), BG = P(AG, t, Gh, Hh), CG = P(BG, t, yG, zG), uq = P(CG, t, wG, xG), vq = t, wq = Uh & Qh, xq = Vh & Rh, DG = P((Uh >>> 28 | Vh << 4 | 0) ^ (Vh >>> 2 | 0 | Uh << 30 | 0) ^ (Vh >>> 7 | 0 | Uh << 25 | 0), (Vh >>> 28 | 0 | Uh << 4 | 0) ^ (0 | Vh << 30 | Uh >>> 2) ^ (0 | Vh << 25 | Uh >>> 7), Uh & Mh ^ sq ^ wq, Vh & Nh ^ tq ^ xq), EG = t, Wh = P(uq, vq, Ih, Jh), Xh = t, Yh = P(DG, EG, uq, vq), Zh = t, FG = (Mb >>> 29 | 0 | cd << 3 | 0) ^ (cd >>> 6 | Mb << 26) ^ (cd >>> 19 | Mb << 13 | 0), GG = (0 | Mb << 3 | cd >>> 29) ^ (Mb >>> 6 | 0) ^ (Mb >>> 19 | 0 | cd << 13 | 0), HG = P((Qc >>> 8 | zb << 24 | 0) ^ (Qc >>> 7 | zb << 25) ^ (Qc >>> 1 | zb << 31 | 0), (zb >>> 8 | 0 | Qc << 24 | 0) ^ (zb >>> 7 | 0) ^ (zb >>> 1 | 0 | Qc << 31 | 0), Pc, yb), IG = P(HG, t, Yc, Hb), id = P(IG, t, FG, GG), Zb = t, JG = (Nb >>> 29 | 0 | dd << 3 | 0) ^ (dd >>> 6 | Nb << 26) ^ (dd >>> 19 | Nb << 13 | 0), KG = (0 | Nb << 3 | dd >>> 29) ^ (Nb >>> 6 | 0) ^ (Nb >>> 19 | 0 | dd << 13 | 0), LG = P((Rc >>> 8 | Ab << 24 | 0) ^ (Rc >>> 7 | Ab << 25) ^ (Rc >>> 1 | Ab << 31 | 0), (Ab >>> 8 | 0 | Rc << 24 | 0) ^ (Ab >>> 7 | 0) ^ (Ab >>> 1 | 0 | Rc << 31 | 0), Qc, zb), MG = P(LG, t, Zc, Ib), Xj = P(MG, t, JG, KG), Fj = t, NG = (Zb >>> 29 | 0 | id << 3 | 0) ^ (id >>> 6 | Zb << 26) ^ (id >>> 19 | Zb << 13 | 0), OG = (0 | Zb << 3 | id >>> 29) ^ (Zb >>> 6 | 0) ^ (Zb >>> 19 | 0 | id << 13 | 0), PG = P((Sc >>> 8 | Bb << 24 | 0) ^ (Sc >>> 7 | Bb << 25) ^ (Sc >>> 1 | Bb << 31 | 0), (Bb >>> 8 | 0 | Sc << 24 | 0) ^ (Bb >>> 7 | 0) ^ (Bb >>> 1 | 0 | Sc << 31 | 0), Rc, Ab), QG = P(PG, t, $c, Jb), Yj = P(QG, t, NG, OG), Gj = t, RG = (Fj >>> 29 | 0 | Xj << 3 | 0) ^ (Xj >>> 6 | Fj << 26) ^ (Xj >>> 19 | Fj << 13 | 0), SG = (0 | Fj << 3 | Xj >>> 29) ^ (Fj >>> 6 | 0) ^ (Fj >>> 19 | 0 | Xj << 13 | 0), TG = P((Tc >>> 8 | Cb << 24 | 0) ^ (Tc >>> 7 | Cb << 25) ^ (Tc >>> 1 | Cb << 31 | 0), (Cb >>> 8 | 0 | Tc << 24 | 0) ^ (Cb >>> 7 | 0) ^ (Cb >>> 1 | 0 | Tc << 31 | 0), Sc, Bb), UG = P(TG, t, ad, Kb), Zj = P(UG, t, RG, SG), Hj = t, VG = (Gj >>> 29 | 0 | Yj << 3 | 0) ^ (Yj >>> 6 | Gj << 26) ^ (Yj >>> 19 | Gj << 13 | 0), WG = (0 | Gj << 3 | Yj >>> 29) ^ (Gj >>> 6 | 0) ^ (Gj >>> 19 | 0 | Yj << 13 | 0), XG = P((Uc >>> 8 | Db << 24 | 0) ^ (Uc >>> 7 | Db << 25) ^ (Uc >>> 1 | Db << 31 | 0), (Db >>> 8 | 0 | Uc << 24 | 0) ^ (Db >>> 7 | 0) ^ (Db >>> 1 | 0 | Uc << 31 | 0), Tc, Cb), YG = P(XG, t, bd, Lb), $j = P(YG, t, VG, WG), Ij = t, ZG = (Hj >>> 29 | 0 | Zj << 3 | 0) ^ (Zj >>> 6 | Hj << 26) ^ (Zj >>> 19 | Hj << 13 | 0), $G = (0 | Hj << 3 | Zj >>> 29) ^ (Hj >>> 6 | 0) ^ (Hj >>> 19 | 0 | Zj << 13 | 0), aH = P((Vc >>> 8 | Eb << 24 | 0) ^ (Vc >>> 7 | Eb << 25) ^ (Vc >>> 1 | Eb << 31 | 0), (Eb >>> 8 | 0 | Vc << 24 | 0) ^ (Eb >>> 7 | 0) ^ (Eb >>> 1 | 0 | Vc << 31 | 0), Uc, Db), bH = P(aH, t, cd, Mb), ak = P(bH, t, ZG, $G), Jj = t, cH = (Ij >>> 29 | 0 | $j << 3 | 0) ^ ($j >>> 6 | Ij << 26) ^ ($j >>> 19 | Ij << 13 | 0), dH = (0 | Ij << 3 | $j >>> 29) ^ (Ij >>> 6 | 0) ^ (Ij >>> 19 | 0 | $j << 13 | 0), eH = P((Wc >>> 8 | Fb << 24 | 0) ^ (Wc >>> 7 | Fb << 25) ^ (Wc >>> 1 | Fb << 31 | 0), (Fb >>> 8 | 0 | Wc << 24 | 0) ^ (Fb >>> 7 | 0) ^ (Fb >>> 1 | 0 | Wc << 31 | 0), Vc, Eb), fH = P(eH, t, dd, Nb), bk = P(fH, t, cH, dH), Kj = t, gH = (Jj >>> 29 | 0 | ak << 3 | 0) ^ (ak >>> 6 | Jj << 26) ^ (ak >>> 19 | Jj << 13 | 0), hH = (0 | Jj << 3 | ak >>> 29) ^ (Jj >>> 6 | 0) ^ (Jj >>> 19 | 0 | ak << 13 | 0), iH = P((Xc >>> 8 | Gb << 24 | 0) ^ (Xc >>> 7 | Gb << 25) ^ (Xc >>> 1 | Gb << 31 | 0), (Gb >>> 8 | 0 | Xc << 24 | 0) ^ (Gb >>> 7 | 0) ^ (Gb >>> 1 | 0 | Xc << 31 | 0), Wc, Fb), jH = P(iH, t, id, Zb), ck = P(jH, t, gH, hH), Lj = t, kH = (Kj >>> 29 | 0 | bk << 3 | 0) ^ (bk >>> 6 | Kj << 26) ^ (bk >>> 19 | Kj << 13 | 0), lH = (0 | Kj << 3 | bk >>> 29) ^ (Kj >>> 6 | 0) ^ (Kj >>> 19 | 0 | bk << 13 | 0), mH = P((Yc >>> 8 | Hb << 24 | 0) ^ (Yc >>> 7 | Hb << 25) ^ (Yc >>> 1 | Hb << 31 | 0), (Hb >>> 8 | 0 | Yc << 24 | 0) ^ (Hb >>> 7 | 0) ^ (Hb >>> 1 | 0 | Yc << 31 | 0), Xc, Gb), nH = P(mH, t, Xj, Fj), dk = P(nH, t, kH, lH), Mj = t, oH = (Lj >>> 29 | 0 | ck << 3 | 0) ^ (ck >>> 6 | Lj << 26) ^ (ck >>> 19 | Lj << 13 | 0), pH = (0 | Lj << 3 | ck >>> 29) ^ (Lj >>> 6 | 0) ^ (Lj >>> 19 | 0 | ck << 13 | 0), qH = P((Zc >>> 8 | Ib << 24 | 0) ^ (Zc >>> 7 | Ib << 25) ^ (Zc >>> 1 | Ib << 31 | 0), (Ib >>> 8 | 0 | Zc << 24 | 0) ^ (Ib >>> 7 | 0) ^ (Ib >>> 1 | 0 | Zc << 31 | 0), Yc, Hb), rH = P(qH, t, Yj, Gj), nk = P(rH, t, oH, pH), ek = t, sH = (Mj >>> 29 | 0 | dk << 3 | 0) ^ (dk >>> 6 | Mj << 26) ^ (dk >>> 19 | Mj << 13 | 0), tH = (0 | Mj << 3 | dk >>> 29) ^ (Mj >>> 6 | 0) ^ (Mj >>> 19 | 0 | dk << 13 | 0), uH = P(($c >>> 8 | Jb << 24 | 0) ^ ($c >>> 7 | Jb << 25) ^ ($c >>> 1 | Jb << 31 | 0), (Jb >>> 8 | 0 | $c << 24 | 0) ^ (Jb >>> 7 | 0) ^ (Jb >>> 1 | 0 | $c << 31 | 0), Zc, Ib), vH = P(uH, t, Zj, Hj), ok = P(vH, t, sH, tH), fk = t, wH = (ek >>> 29 | 0 | nk << 3 | 0) ^ (nk >>> 6 | ek << 26) ^ (nk >>> 19 | ek << 13 | 0), xH = (0 | ek << 3 | nk >>> 29) ^ (ek >>> 6 | 0) ^ (ek >>> 19 | 0 | nk << 13 | 0), yH = P((ad >>> 8 | Kb << 24 | 0) ^ (ad >>> 7 | Kb << 25) ^ (ad >>> 1 | Kb << 31 | 0), (Kb >>> 8 | 0 | ad << 24 | 0) ^ (Kb >>> 7 | 0) ^ (Kb >>> 1 | 0 | ad << 31 | 0), $c, Jb), zH = P(yH, t, $j, Ij), pk = P(zH, t, wH, xH), gk = t, AH = (fk >>> 29 | 0 | ok << 3 | 0) ^ (ok >>> 6 | fk << 26) ^ (ok >>> 19 | fk << 13 | 0), BH = (0 | fk << 3 | ok >>> 29) ^ (fk >>> 6 | 0) ^ (fk >>> 19 | 0 | ok << 13 | 0), CH = P((bd >>> 8 | Lb << 24 | 0) ^ (bd >>> 7 | Lb << 25) ^ (bd >>> 1 | Lb << 31 | 0), (Lb >>> 8 | 0 | bd << 24 | 0) ^ (Lb >>> 7 | 0) ^ (Lb >>> 1 | 0 | bd << 31 | 0), ad, Kb), DH = P(CH, t, ak, Jj), qk = P(DH, t, AH, BH), hk = t, EH = (gk >>> 29 | 0 | pk << 3 | 0) ^ (pk >>> 6 | gk << 26) ^ (pk >>> 19 | gk << 13 | 0), FH = (0 | gk << 3 | pk >>> 29) ^ (gk >>> 6 | 0) ^ (gk >>> 19 | 0 | pk << 13 | 0), GH = P((cd >>> 8 | Mb << 24 | 0) ^ (cd >>> 7 | Mb << 25) ^ (cd >>> 1 | Mb << 31 | 0), (Mb >>> 8 | 0 | cd << 24 | 0) ^ (Mb >>> 7 | 0) ^ (Mb >>> 1 | 0 | cd << 31 | 0), bd, Lb), HH = P(GH, t, bk, Kj), rk = P(HH, t, EH, FH), ik = t, IH = (hk >>> 29 | 0 | qk << 3 | 0) ^ (qk >>> 6 | hk << 26) ^ (qk >>> 19 | hk << 13 | 0), JH = (0 | hk << 3 | qk >>> 29) ^ (hk >>> 6 | 0) ^ (hk >>> 19 | 0 | qk << 13 | 0), KH = (dd >>> 8 | Nb << 24 | 0) ^ (dd >>> 7 | Nb << 25) ^ (dd >>> 1 | Nb << 31 | 0), LH = (Nb >>> 8 | 0 | dd << 24 | 0) ^ (Nb >>> 7 | 0) ^ (Nb >>> 1 | 0 | dd << 31 | 0), MH = (ik >>> 29 | 0 | rk << 3 | 0) ^ (rk >>> 6 | ik << 26) ^ (rk >>> 19 | ik << 13 | 0), NH = (0 | ik << 3 | rk >>> 29) ^ (ik >>> 6 | 0) ^ (ik >>> 19 | 0 | rk << 13 | 0), OH = (id >>> 8 | Zb << 24 | 0) ^ (id >>> 7 | Zb << 25) ^ (id >>> 1 | Zb << 31 | 0), PH = (Zb >>> 8 | 0 | id << 24 | 0) ^ (Zb >>> 7 | 0) ^ (Zb >>> 1 | 0 | id << 31 | 0), QH = (Wh >>> 14 | Xh << 18 | 0) ^ (Wh >>> 18 | Xh << 14 | 0) ^ (Xh >>> 9 | 0 | Wh << 23 | 0), RH = (Xh >>> 14 | 0 | Wh << 18 | 0) ^ (Xh >>> 18 | 0 | Wh << 14 | 0) ^ (0 | Xh << 23 | Wh >>> 9), SH = Wh & Sh ^ Oh & (Wh ^ -1), TH = Xh & Th ^ Ph & (Xh ^ -1), UH = P(id, Zb, -366583396, -903397682), VH = P(UH, t, Kh, Lh), WH = P(VH, t, SH, TH), yq = P(WH, t, QH, RH), zq = t, Aq = Yh & Uh, Bq = Zh & Vh, XH = P((Yh >>> 28 | Zh << 4 | 0) ^ (Zh >>> 2 | 0 | Yh << 30 | 0) ^ (Zh >>> 7 | 0 | Yh << 25 | 0), (Zh >>> 28 | 0 | Yh << 4 | 0) ^ (0 | Zh << 30 | Yh >>> 2) ^ (0 | Zh << 25 | Yh >>> 7), Yh & Qh ^ wq ^ Aq, Zh & Rh ^ xq ^ Bq), YH = t, $h = P(yq, zq, Mh, Nh), ai = t, bi = P(XH, YH, yq, zq), ci = t, ZH = ($h >>> 14 | ai << 18 | 0) ^ ($h >>> 18 | ai << 14 | 0) ^ (ai >>> 9 | 0 | $h << 23 | 0), $H = (ai >>> 14 | 0 | $h << 18 | 0) ^ (ai >>> 18 | 0 | $h << 14 | 0) ^ (0 | ai << 23 | $h >>> 9), aI = $h & Wh ^ Sh & ($h ^ -1), bI = ai & Xh ^ Th & (ai ^ -1), cI = P(Xj, Fj, 566280711, -779700025), dI = P(cI, t, Oh, Ph), eI = P(dI, t, aI, bI), Cq = P(eI, t, ZH, $H), Dq = t, Eq = bi & Yh, Fq = ci & Zh, fI = P((bi >>> 28 | ci << 4 | 0) ^ (ci >>> 2 | 0 | bi << 30 | 0) ^ (ci >>> 7 | 0 | bi << 25 | 0), (ci >>> 28 | 0 | bi << 4 | 0) ^ (0 | ci << 30 | bi >>> 2) ^ (0 | ci << 25 | bi >>> 7), bi & Uh ^ Aq ^ Eq, ci & Vh ^ Bq ^ Fq), gI = t, di = P(Cq, Dq, Qh, Rh), ei = t, fi = P(fI, gI, Cq, Dq), gi = t, hI = (di >>> 14 | ei << 18 | 0) ^ (di >>> 18 | ei << 14 | 0) ^ (ei >>> 9 | 0 | di << 23 | 0), iI = (ei >>> 14 | 0 | di << 18 | 0) ^ (ei >>> 18 | 0 | di << 14 | 0) ^ (0 | ei << 23 | di >>> 9), jI = di & $h ^ Wh & (di ^ -1), kI = ei & ai ^ Xh & (ei ^ -1), lI = P(Yj, Gj, -840897762, -354779690), mI = P(lI, t, Sh, Th), nI = P(mI, t, jI, kI), Gq = P(nI, t, hI, iI), Hq = t, Iq = fi & bi, Jq = gi & ci, oI = P((fi >>> 28 | gi << 4 | 0) ^ (gi >>> 2 | 0 | fi << 30 | 0) ^ (gi >>> 7 | 0 | fi << 25 | 0), (gi >>> 28 | 0 | fi << 4 | 0) ^ (0 | gi << 30 | fi >>> 2) ^ (0 | gi << 25 | fi >>> 7), fi & Yh ^ Eq ^ Iq, gi & Zh ^ Fq ^ Jq), pI = t, hi = P(Gq, Hq, Uh, Vh), ii = t, ji = P(oI, pI, Gq, Hq), ki = t, qI = (hi >>> 14 | ii << 18 | 0) ^ (hi >>> 18 | ii << 14 | 0) ^ (ii >>> 9 | 0 | hi << 23 | 0), rI = (ii >>> 14 | 0 | hi << 18 | 0) ^ (ii >>> 18 | 0 | hi << 14 | 0) ^ (0 | ii << 23 | hi >>> 9), sI = hi & di ^ $h & (hi ^ -1), tI = ii & ei ^ ai & (ii ^ -1), uI = P(Zj, Hj, -294727304, -176337025), vI = P(uI, t, Wh, Xh), wI = P(vI, t, sI, tI), Kq = P(wI, t, qI, rI), Lq = t, Mq = ji & fi, Nq = ki & gi, xI = P((ji >>> 28 | ki << 4 | 0) ^ (ki >>> 2 | 0 | ji << 30 | 0) ^ (ki >>> 7 | 0 | ji << 25 | 0), (ki >>> 28 | 0 | ji << 4 | 0) ^ (0 | ki << 30 | ji >>> 2) ^ (0 | ki << 25 | ji >>> 7), ji & bi ^ Iq ^ Mq, ki & ci ^ Jq ^ Nq), yI = t, li = P(Kq, Lq, Yh, Zh), mi = t, ni = P(xI, yI, Kq, Lq), oi = t, zI = (li >>> 14 | mi << 18 | 0) ^ (li >>> 18 | mi << 14 | 0) ^ (mi >>> 9 | 0 | li << 23 | 0), AI = (mi >>> 14 | 0 | li << 18 | 0) ^ (mi >>> 18 | 0 | li << 14 | 0) ^ (0 | mi << 23 | li >>> 9), BI = li & hi ^ di & (li ^ -1), CI = mi & ii ^ ei & (mi ^ -1), DI = P($j, Ij, 1914138554, 116418474), EI = P(DI, t, $h, ai), FI = P(EI, t, BI, CI), Oq = P(FI, t, zI, AI), Pq = t, Qq = ni & ji, Rq = oi & ki, GI = P((ni >>> 28 | oi << 4 | 0) ^ (oi >>> 2 | 0 | ni << 30 | 0) ^ (oi >>> 7 | 0 | ni << 25 | 0), (oi >>> 28 | 0 | ni << 4 | 0) ^ (0 | oi << 30 | ni >>> 2) ^ (0 | oi << 25 | ni >>> 7), ni & fi ^ Mq ^ Qq, oi & gi ^ Nq ^ Rq), HI = t, pi = P(Oq, Pq, bi, ci), qi = t, ri = P(GI, HI, Oq, Pq), si = t, II = (pi >>> 14 | qi << 18 | 0) ^ (pi >>> 18 | qi << 14 | 0) ^ (qi >>> 9 | 0 | pi << 23 | 0), JI = (qi >>> 14 | 0 | pi << 18 | 0) ^ (qi >>> 18 | 0 | pi << 14 | 0) ^ (0 | qi << 23 | pi >>> 9), KI = pi & li ^ hi & (pi ^ -1), LI = qi & mi ^ ii & (qi ^ -1), MI = P(ak, Jj, -1563912026, 174292421), NI = P(MI, t, di, ei), OI = P(NI, t, KI, LI), Sq = P(OI, t, II, JI), Tq = t, Uq = ri & ni, Vq = si & oi, PI = P((ri >>> 28 | si << 4 | 0) ^ (si >>> 2 | 0 | ri << 30 | 0) ^ (si >>> 7 | 0 | ri << 25 | 0), (si >>> 28 | 0 | ri << 4 | 0) ^ (0 | si << 30 | ri >>> 2) ^ (0 | si << 25 | ri >>> 7), ri & ji ^ Qq ^ Uq, si & ki ^ Rq ^ Vq), QI = t, ti = P(Sq, Tq, fi, gi), ui = t, vi = P(PI, QI, Sq, Tq), wi = t, RI = (ti >>> 14 | ui << 18 | 0) ^ (ti >>> 18 | ui << 14 | 0) ^ (ui >>> 9 | 0 | ti << 23 | 0), SI = (ui >>> 14 | 0 | ti << 18 | 0) ^ (ui >>> 18 | 0 | ti << 14 | 0) ^ (0 | ui << 23 | ti >>> 9), TI = ti & pi ^ li & (ti ^ -1), UI = ui & qi ^ mi & (ui ^ -1), VI = P(bk, Kj, -1090974290, 289380356), WI = P(VI, t, hi, ii), XI = P(WI, t, TI, UI), Wq = P(XI, t, RI, SI), Xq = t, Yq = vi & ri, Zq = wi & si, YI = P((vi >>> 28 | wi << 4 | 0) ^ (wi >>> 2 | 0 | vi << 30 | 0) ^ (wi >>> 7 | 0 | vi << 25 | 0), (wi >>> 28 | 0 | vi << 4 | 0) ^ (0 | wi << 30 | vi >>> 2) ^ (0 | wi << 25 | vi >>> 7), vi & ni ^ Uq ^ Yq, wi & oi ^ Vq ^ Zq), ZI = t, xi = P(Wq, Xq, ji, ki), yi = t, zi = P(YI, ZI, Wq, Xq), Ai = t, $I = (xi >>> 14 | yi << 18 | 0) ^ (xi >>> 18 | yi << 14 | 0) ^ (yi >>> 9 | 0 | xi << 23 | 0), aJ = (yi >>> 14 | 0 | xi << 18 | 0) ^ (yi >>> 18 | 0 | xi << 14 | 0) ^ (0 | yi << 23 | xi >>> 9), bJ = xi & ti ^ pi & (xi ^ -1), cJ = yi & ui ^ qi & (yi ^ -1), dJ = P(ck, Lj, 320620315, 460393269), eJ = P(dJ, t, li, mi), fJ = P(eJ, t, bJ, cJ), $q = P(fJ, t, $I, aJ), ar = t, br = zi & vi, cr = Ai & wi, gJ = P((zi >>> 28 | Ai << 4 | 0) ^ (Ai >>> 2 | 0 | zi << 30 | 0) ^ (Ai >>> 7 | 0 | zi << 25 | 0), (Ai >>> 28 | 0 | zi << 4 | 0) ^ (0 | Ai << 30 | zi >>> 2) ^ (0 | Ai << 25 | zi >>> 7), zi & ri ^ Yq ^ br, Ai & si ^ Zq ^ cr), hJ = t, Bi = P($q, ar, ni, oi), Ci = t, Di = P(gJ, hJ, $q, ar), Ei = t, iJ = (Bi >>> 14 | Ci << 18 | 0) ^ (Bi >>> 18 | Ci << 14 | 0) ^ (Ci >>> 9 | 0 | Bi << 23 | 0), jJ = (Ci >>> 14 | 0 | Bi << 18 | 0) ^ (Ci >>> 18 | 0 | Bi << 14 | 0) ^ (0 | Ci << 23 | Bi >>> 9), kJ = Bi & xi ^ ti & (Bi ^ -1), lJ = Ci & yi ^ ui & (Ci ^ -1), mJ = P(dk, Mj, 587496836, 685471733), nJ = P(mJ, t, pi, qi), oJ = P(nJ, t, kJ, lJ), dr = P(oJ, t, iJ, jJ), er = t, fr = Di & zi, gr = Ei & Ai, pJ = P((Di >>> 28 | Ei << 4 | 0) ^ (Ei >>> 2 | 0 | Di << 30 | 0) ^ (Ei >>> 7 | 0 | Di << 25 | 0), (Ei >>> 28 | 0 | Di << 4 | 0) ^ (0 | Ei << 30 | Di >>> 2) ^ (0 | Ei << 25 | Di >>> 7), Di & vi ^ br ^ fr, Ei & wi ^ cr ^ gr), qJ = t, Fi = P(dr, er, ri, si), Gi = t, Hi = P(pJ, qJ, dr, er), Ii = t, rJ = (Fi >>> 14 | Gi << 18 | 0) ^ (Fi >>> 18 | Gi << 14 | 0) ^ (Gi >>> 9 | 0 | Fi << 23 | 0), sJ = (Gi >>> 14 | 0 | Fi << 18 | 0) ^ (Gi >>> 18 | 0 | Fi << 14 | 0) ^ (0 | Gi << 23 | Fi >>> 9), tJ = Fi & Bi ^ xi & (Fi ^ -1), uJ = Gi & Ci ^ yi & (Gi ^ -1), vJ = P(nk, ek, 1086792851, 852142971), wJ = P(vJ, t, ti, ui), xJ = P(wJ, t, tJ, uJ), hr = P(xJ, t, rJ, sJ), ir = t, jr = Hi & Di, kr = Ii & Ei, yJ = P((Hi >>> 28 | Ii << 4 | 0) ^ (Ii >>> 2 | 0 | Hi << 30 | 0) ^ (Ii >>> 7 | 0 | Hi << 25 | 0), (Ii >>> 28 | 0 | Hi << 4 | 0) ^ (0 | Ii << 30 | Hi >>> 2) ^ (0 | Ii << 25 | Hi >>> 7), Hi & zi ^ fr ^ jr, Ii & Ai ^ gr ^ kr), zJ = t, Ji = P(hr, ir, vi, wi), Ki = t, Li = P(yJ, zJ, hr, ir), Mi = t, AJ = (Ji >>> 14 | Ki << 18 | 0) ^ (Ji >>> 18 | Ki << 14 | 0) ^ (Ki >>> 9 | 0 | Ji << 23 | 0), BJ = (Ki >>> 14 | 0 | Ji << 18 | 0) ^ (Ki >>> 18 | 0 | Ji << 14 | 0) ^ (0 | Ki << 23 | Ji >>> 9), CJ = Ji & Fi ^ Bi & (Ji ^ -1), DJ = Ki & Gi ^ Ci & (Ki ^ -1), EJ = P(ok, fk, 365543100, 1017036298), FJ = P(EJ, t, xi, yi), GJ = P(FJ, t, CJ, DJ), lr = P(GJ, t, AJ, BJ), mr = t, nr = Li & Hi, or = Mi & Ii, HJ = P((Li >>> 28 | Mi << 4 | 0) ^ (Mi >>> 2 | 0 | Li << 30 | 0) ^ (Mi >>> 7 | 0 | Li << 25 | 0), (Mi >>> 28 | 0 | Li << 4 | 0) ^ (0 | Mi << 30 | Li >>> 2) ^ (0 | Mi << 25 | Li >>> 7), Li & Di ^ jr ^ nr, Mi & Ei ^ kr ^ or), IJ = t, Ni = P(lr, mr, zi, Ai), Oi = t, Pi = P(HJ, IJ, lr, mr), Qi = t, JJ = (Ni >>> 14 | Oi << 18 | 0) ^ (Ni >>> 18 | Oi << 14 | 0) ^ (Oi >>> 9 | 0 | Ni << 23 | 0), KJ = (Oi >>> 14 | 0 | Ni << 18 | 0) ^ (Oi >>> 18 | 0 | Ni << 14 | 0) ^ (0 | Oi << 23 | Ni >>> 9), LJ = Ni & Ji ^ Fi & (Ni ^ -1), MJ = Oi & Ki ^ Gi & (Oi ^ -1), NJ = P(pk, gk, -1676669620, 1126000580), OJ = P(NJ, t, Bi, Ci), PJ = P(OJ, t, LJ, MJ), pr = P(PJ, t, JJ, KJ), qr = t, rr = Pi & Li, sr = Qi & Mi, QJ = P((Pi >>> 28 | Qi << 4 | 0) ^ (Qi >>> 2 | 0 | Pi << 30 | 0) ^ (Qi >>> 7 | 0 | Pi << 25 | 0), (Qi >>> 28 | 0 | Pi << 4 | 0) ^ (0 | Qi << 30 | Pi >>> 2) ^ (0 | Qi << 25 | Pi >>> 7), Pi & Hi ^ nr ^ rr, Qi & Ii ^ or ^ sr), RJ = t, Ri = P(pr, qr, Di, Ei), Si = t, Ti = P(QJ, RJ, pr, qr), Ui = t, SJ = (Ri >>> 14 | Si << 18 | 0) ^ (Ri >>> 18 | Si << 14 | 0) ^ (Si >>> 9 | 0 | Ri << 23 | 0), TJ = (Si >>> 14 | 0 | Ri << 18 | 0) ^ (Si >>> 18 | 0 | Ri << 14 | 0) ^ (0 | Si << 23 | Ri >>> 9), UJ = Ri & Ni ^ Ji & (Ri ^ -1), VJ = Si & Oi ^ Ki & (Si ^ -1), WJ = P(qk, hk, -885112138, 1288033470), XJ = P(WJ, t, Fi, Gi), YJ = P(XJ, t, UJ, VJ), tr = P(YJ, t, SJ, TJ), ur = t, vr = Ti & Pi, wr = Ui & Qi, ZJ = P((Ti >>> 28 | Ui << 4 | 0) ^ (Ui >>> 2 | 0 | Ti << 30 | 0) ^ (Ui >>> 7 | 0 | Ti << 25 | 0), (Ui >>> 28 | 0 | Ti << 4 | 0) ^ (0 | Ui << 30 | Ti >>> 2) ^ (0 | Ui << 25 | Ti >>> 7), Ti & Li ^ rr ^ vr, Ui & Mi ^ sr ^ wr), $J = t, Vi = P(tr, ur, Hi, Ii), Wi = t, Xi = P(ZJ, $J, tr, ur), Yi = t, aK = (Vi >>> 14 | Wi << 18 | 0) ^ (Vi >>> 18 | Wi << 14 | 0) ^ (Wi >>> 9 | 0 | Vi << 23 | 0), bK = (Wi >>> 14 | 0 | Vi << 18 | 0) ^ (Wi >>> 18 | 0 | Vi << 14 | 0) ^ (0 | Wi << 23 | Vi >>> 9), cK = Vi & Ri ^ Ni & (Vi ^ -1), dK = Wi & Si ^ Oi & (Wi ^ -1), eK = P(rk, ik, -60457430, 1501505948), fK = P(eK, t, Ji, Ki), gK = P(fK, t, cK, dK), xr = P(gK, t, aK, bK), yr = t, zr = Xi & Ti, Ar = Yi & Ui, hK = P((Xi >>> 28 | Yi << 4 | 0) ^ (Yi >>> 2 | 0 | Xi << 30 | 0) ^ (Yi >>> 7 | 0 | Xi << 25 | 0), (Yi >>> 28 | 0 | Xi << 4 | 0) ^ (0 | Yi << 30 | Xi >>> 2) ^ (0 | Yi << 25 | Xi >>> 7), Xi & Pi ^ vr ^ zr, Yi & Qi ^ wr ^ Ar), iK = t, dj = P(xr, yr, Li, Mi), ej = t, fj = P(hK, iK, xr, yr), gj = t, jK = (dj >>> 14 | ej << 18 | 0) ^ (dj >>> 18 | ej << 14 | 0) ^ (ej >>> 9 | 0 | dj << 23 | 0), kK = (ej >>> 14 | 0 | dj << 18 | 0) ^ (ej >>> 18 | 0 | dj << 14 | 0) ^ (0 | ej << 23 | dj >>> 9), lK = dj & Vi ^ Ri & (dj ^ -1), mK = ej & Wi ^ Si & (ej ^ -1), nK = P(cd, Mb, 987167468, 1607167915), oK = P(nK, t, KH, LH), pK = P(oK, t, ck, Lj), qK = P(pK, t, IH, JH), rK = P(qK, t, Ni, Oi), sK = P(rK, t, lK, mK), Br = P(sK, t, jK, kK), Cr = t, Dr = fj & Xi, Er = gj & Yi, tK = P((fj >>> 28 | gj << 4 | 0) ^ (gj >>> 2 | 0 | fj << 30 | 0) ^ (gj >>> 7 | 0 | fj << 25 | 0), (gj >>> 28 | 0 | fj << 4 | 0) ^ (0 | gj << 30 | fj >>> 2) ^ (0 | gj << 25 | fj >>> 7), fj & Ti ^ zr ^ Dr, gj & Ui ^ Ar ^ Er), uK = t, nj = P(Br, Cr, Pi, Qi), oj = t, Nj = P(tK, uK, Br, Cr), Oj = t, vK = (nj >>> 14 | oj << 18 | 0) ^ (nj >>> 18 | oj << 14 | 0) ^ (oj >>> 9 | 0 | nj << 23 | 0), wK = (oj >>> 14 | 0 | nj << 18 | 0) ^ (oj >>> 18 | 0 | nj << 14 | 0) ^ (0 | oj << 23 | nj >>> 9), xK = nj & dj ^ Vi & (nj ^ -1), yK = oj & ej ^ Wi & (oj ^ -1), zK = P(dd, Nb, 1246189591, 1816402316), AK = P(zK, t, OH, PH), BK = P(AK, t, dk, Mj), CK = P(BK, t, MH, NH), DK = P(CK, t, Ri, Si), EK = P(DK, t, xK, yK), Fr = P(EK, t, vK, wK), Gr = t, FK = (Nj >>> 28 | Oj << 4 | 0) ^ (Oj >>> 2 | 0 | Nj << 30 | 0) ^ (Oj >>> 7 | 0 | Nj << 25 | 0), GK = (Oj >>> 28 | 0 | Nj << 4 | 0) ^ (0 | Oj << 30 | Nj >>> 2) ^ (0 | Oj << 25 | Nj >>> 7), HK = P(Nj & (fj ^ Xi) ^ Dr, Oj & (gj ^ Yi) ^ Er, R, S), IK = P(HK, t, FK, GK), Hr = P(IK, t, Fr, Gr), Ir = t, Jr = P(Nj, Oj, ba, aa), Kr = t, Lr = P(fj, gj, ga, $), Mr = t, Nr = P(Xi, Yi, xa, ma), Or = t, JK = P(Ti, Ui, da, Z), Pr = P(JK, t, Fr, Gr), Qr = t, Rr = P(nj, oj, Ea, Ca), Sr = t, Tr = P(dj, ej, Fa, sa), Ur = t, Vr = P(Vi, Wi, U, ja), Wr = t, KK = z + 128 | 0, Xr = P(pa, ha, -128, -1), el = t;
      0 < el >>> 0 | 0 == el >>> 0 & 127 < Xr >>> 0 ? (ja = Wr, U = Vr, sa = Ur, Fa = Tr, Ca = Sr, Ea = Rr, Z = Qr, da = Pr, ma = Or, xa = Nr, $ = Mr, ga = Lr, aa = Kr, ba = Jr, S = Ir, R = Hr, ha = el, pa = Xr, z = KK, g = 3) : (ia = Wr, ka = Vr, ta = Ur, na = Tr, ya = Sr, La = Rr, Qa = Qr, rj = Pr, Rj = Or, sj = Nr, Sj = Mr, kd = Lr, tj = Kr, ed = Jr, uj = Ir, Pb = Hr, g = 4);
      break;
     case 4:
      return rl(a, Pb, uj), rl(l, ed, tj), rl(s, kd, Sj), rl(u, sj, Rj), rl(E, rj, Qa), rl(G, La, ya), rl(D, na, ta), rl(fa, ka, ia), 0;
    }
  }
}
function ql(a) {
  var e = m[a + 6 | 0], d = m[a + 5 | 0], f = m[a + 4 | 0];
  return t = 0 | e >>> 24 | (0 | d >>> 16) | (0 | f >>> 8) | m[a + 3 | 0] | m[a + 2 | 0] << 8 | 0 | m[a + 1 | 0] << 16 | 0 | m[a] << 24 | 0, e << 8 | 0 | m[a + 7 | 0] | (d << 16 | 0) | (f << 24 | 0) | 0;
}
function rl(a, e, d) {
  h[a + 7 | 0] = e & 255;
  h[a + 6 | 0] = (e >>> 8 | d << 24) & 255;
  h[a + 5 | 0] = (e >>> 16 | d << 16) & 255;
  h[a + 4 | 0] = (e >>> 24 | d << 8) & 255;
  h[a + 3 | 0] = d & 255;
  h[a + 2 | 0] = (d >>> 8 | 0) & 255;
  h[a + 1 | 0] = (d >>> 16 | 0) & 255;
  h[a] = (d >>> 24 | 0) & 255;
}
function sl(a, e) {
  for (var d = 0, d = 2; ; ) {
    switch (d) {
     case 2:
      var f = 0, g = 0, d = 3;
      break;
     case 3:
      var d = a + (f << 2) | 0, i = (k[d >> 2] + g | 0) + k[(e + (f << 2) | 0) >> 2] | 0;
      k[d >> 2] = i & 255;
      d = i >>> 8;
      i = f + 1 | 0;
      17 == (i | 0) ? d = 4 : (f = i, g = d, d = 3);
      break;
     case 4:
      return;
    }
  }
}
function tl(a, e, d, f, g) {
  var i = 0, j = c;
  c = c + 136 | 0;
  for (i = 2; ; ) {
    switch (i) {
     case 2:
      var l = j, n = j + 68, p = n, s = c;
      c = c + 68 | 0;
      var r = l | 0;
      k[r >> 2] = h[g] & 255;
      k[(l + 4 | 0) >> 2] = h[g + 1 | 0] & 255;
      k[(l + 8 | 0) >> 2] = h[g + 2 | 0] & 255;
      k[(l + 12 | 0) >> 2] = h[g + 3 | 0] & 15;
      k[(l + 16 | 0) >> 2] = h[g + 4 | 0] & 252;
      k[(l + 20 | 0) >> 2] = h[g + 5 | 0] & 255;
      k[(l + 24 | 0) >> 2] = h[g + 6 | 0] & 255;
      k[(l + 28 | 0) >> 2] = h[g + 7 | 0] & 15;
      k[(l + 32 | 0) >> 2] = h[g + 8 | 0] & 252;
      k[(l + 36 | 0) >> 2] = h[g + 9 | 0] & 255;
      k[(l + 40 | 0) >> 2] = h[g + 10 | 0] & 255;
      k[(l + 44 | 0) >> 2] = h[g + 11 | 0] & 15;
      k[(l + 48 | 0) >> 2] = h[g + 12 | 0] & 252;
      k[(l + 52 | 0) >> 2] = h[g + 13 | 0] & 255;
      k[(l + 56 | 0) >> 2] = h[g + 14 | 0] & 255;
      k[(l + 60 | 0) >> 2] = h[g + 15 | 0] & 15;
      k[(l + 64 | 0) >> 2] = 0;
      Vk(p, 0, 68);
      var q = s, i = 0 == (d | 0) & 0 == (f | 0) ? 7 : 3;
      break;
     case 3:
      var u = n | 0, B = s | 0, F = f, E = d, x = e, i = 4;
      break;
     case 4:
      Vk(q, 0, 68);
      if (0 == (E | 0) & 0 == (F | 0)) {
        var H = 0, G = 0, L = 0, i = 6;
      } else {
        var C = 0, i = 5;
      }
      break;
     case 5:
      k[(s + (C << 2) | 0) >> 2] = h[x + C | 0] & 255;
      var D = C + 1 | 0, Q = D;
      16 > D >>> 0 & (0 < F >>> 0 | 0 == F >>> 0 & Q >>> 0 < E >>> 0) ? (C = D, i = 5) : (H = D, G = 0, L = Q, i = 6);
      break;
     case 6:
      k[(s + (H << 2) | 0) >> 2] = 1;
      var J = x + H | 0, fa = (ul.p(E, F, L, G), k[zk >> 2]), K = k[zk + 4 >> 2];
      sl(u, B);
      a : {
        var N = u, ja = r, U = 0, sa = c;
        c = c + 68 | 0;
        for (U = 2; ; ) {
          switch (U) {
           case 2:
            var Fa = sa, Ca = 0, Ea = 1, U = 3;
            break;
           case 3:
            var Z = 0, da = 0, U = 4;
            break;
           case 4:
            var ma = Math.g(k[(ja + ((Ca - Z | 0) << 2) | 0) >> 2], k[(N + (Z << 2) | 0) >> 2]) + da | 0, xa = Z + 1 | 0;
            (xa | 0) == (Ea | 0) ? U = 5 : (Z = xa, da = ma, U = 4);
            break;
           case 5:
            var $ = Ca + 1 | 0;
            if (17 > $ >>> 0) {
              U = 6;
            } else {
              var ga = ma, U = 8;
            }
            break;
           case 6:
            var aa = Ca + 17 | 0, ba = $, S = ma, U = 7;
            break;
           case 7:
            var R = Math.g(320 * k[(N + (ba << 2) | 0) >> 2] & -1, k[(ja + ((aa - ba | 0) << 2) | 0) >> 2]) + S | 0, ha = ba + 1 | 0;
            17 == (ha | 0) ? (ga = R, U = 8) : (ba = ha, S = R, U = 7);
            break;
           case 8:
            k[(Fa + (Ca << 2) | 0) >> 2] = ga;
            var pa = Ea + 1 | 0;
            17 == ($ | 0) ? U = 9 : (Ca = $, Ea = pa, U = 3);
            break;
           case 9:
            I(N, Fa, 68);
            var z = N, ia = k[z >> 2];
            k[z >> 2] = ia & 255;
            var ka = z + 4 | 0, ta = k[ka >> 2] + (ia >>> 8) | 0;
            k[ka >> 2] = ta & 255;
            var na = z + 8 | 0, ya = k[na >> 2] + (ta >>> 8) | 0;
            k[na >> 2] = ya & 255;
            var La = z + 12 | 0, Qa = k[La >> 2] + (ya >>> 8) | 0;
            k[La >> 2] = Qa & 255;
            var rj = z + 16 | 0, Rj = k[rj >> 2] + (Qa >>> 8) | 0;
            k[rj >> 2] = Rj & 255;
            var sj = z + 20 | 0, Sj = k[sj >> 2] + (Rj >>> 8) | 0;
            k[sj >> 2] = Sj & 255;
            var kd = z + 24 | 0, tj = k[kd >> 2] + (Sj >>> 8) | 0;
            k[kd >> 2] = tj & 255;
            var ed = z + 28 | 0, uj = k[ed >> 2] + (tj >>> 8) | 0;
            k[ed >> 2] = uj & 255;
            var Pb = z + 32 | 0, bj = k[Pb >> 2] + (uj >>> 8) | 0;
            k[Pb >> 2] = bj & 255;
            var vj = z + 36 | 0, ac = k[vj >> 2] + (bj >>> 8) | 0;
            k[vj >> 2] = ac & 255;
            var Qb = z + 40 | 0, bc = k[Qb >> 2] + (ac >>> 8) | 0;
            k[Qb >> 2] = bc & 255;
            var Rb = z + 44 | 0, cc = k[Rb >> 2] + (bc >>> 8) | 0;
            k[Rb >> 2] = cc & 255;
            var Sb = z + 48 | 0, Tb = k[Sb >> 2] + (cc >>> 8) | 0;
            k[Sb >> 2] = Tb & 255;
            var Ra = z + 52 | 0, dc = k[Ra >> 2] + (Tb >>> 8) | 0;
            k[Ra >> 2] = dc & 255;
            var Ub = z + 56 | 0, fd = k[Ub >> 2] + (dc >>> 8) | 0;
            k[Ub >> 2] = fd & 255;
            var Sa = z + 60 | 0, gd = k[Sa >> 2] + (fd >>> 8) | 0;
            k[Sa >> 2] = gd & 255;
            var Ma = z + 64 | 0, ua = k[Ma >> 2] + (gd >>> 8) | 0;
            k[Ma >> 2] = ua & 3;
            var qa = k[z >> 2] + (5 * (ua >>> 2) & -1) | 0;
            k[z >> 2] = qa & 255;
            var ec = z + 4 | 0, Vb = k[ec >> 2] + (qa >>> 8) | 0;
            k[ec >> 2] = Vb & 255;
            var fc = z + 8 | 0, Wb = k[fc >> 2] + (Vb >>> 8) | 0;
            k[fc >> 2] = Wb & 255;
            var gc = z + 12 | 0, Xb = k[gc >> 2] + (Wb >>> 8) | 0;
            k[gc >> 2] = Xb & 255;
            var hc = z + 16 | 0, Yb = k[hc >> 2] + (Xb >>> 8) | 0;
            k[hc >> 2] = Yb & 255;
            var ic = z + 20 | 0, Na = k[ic >> 2] + (Yb >>> 8) | 0;
            k[ic >> 2] = Na & 255;
            var w = z + 24 | 0, v = k[w >> 2] + (Na >>> 8) | 0;
            k[w >> 2] = v & 255;
            var za = z + 28 | 0, va = k[za >> 2] + (v >>> 8) | 0;
            k[za >> 2] = va & 255;
            var wj = z + 32 | 0, kj = k[wj >> 2] + (va >>> 8) | 0;
            k[wj >> 2] = kj & 255;
            var xj = z + 36 | 0, lj = k[xj >> 2] + (kj >>> 8) | 0;
            k[xj >> 2] = lj & 255;
            var Tj = z + 40 | 0, Uj = k[Tj >> 2] + (lj >>> 8) | 0;
            k[Tj >> 2] = Uj & 255;
            var yj = z + 44 | 0, zj = k[yj >> 2] + (Uj >>> 8) | 0;
            k[yj >> 2] = zj & 255;
            var Aj = z + 48 | 0, Bj = k[Aj >> 2] + (zj >>> 8) | 0;
            k[Aj >> 2] = Bj & 255;
            var Cj = z + 52 | 0, Vj = k[Cj >> 2] + (Bj >>> 8) | 0;
            k[Cj >> 2] = Vj & 255;
            var cj = z + 56 | 0, Aa = k[cj >> 2] + (Vj >>> 8) | 0;
            k[cj >> 2] = Aa & 255;
            var Oa = z + 60 | 0, Pa = k[Oa >> 2] + (Aa >>> 8) | 0;
            k[Oa >> 2] = Pa & 255;
            k[Ma >> 2] = k[Ma >> 2] + (Pa >>> 8) | 0;
            c = sa;
            break a;
          }
        }
      }
      (E | 0) == (L | 0) & (F | 0) == (G | 0) ? i = 7 : (F = K, E = fa, x = J, i = 4);
      break;
     case 7:
      var Ga = n | 0;
      a : {
        for (var Dj = Ga, hd = 0, lk = c, hd = 2; ; ) {
          switch (hd) {
           case 2:
            var mk = Dj, Wj = c;
            c = c + 68 | 0;
            I(Wj, mk, 68);
            sl(Dj, 5243300);
            var Ej = -(k[(Dj + 64 | 0) >> 2] >>> 7) | 0, mj = 0, hd = 3;
            break;
           case 3:
            var Dk = Dj + (mj << 2) | 0, Ek = k[Dk >> 2];
            k[Dk >> 2] = (Ek ^ k[(Wj + (mj << 2) | 0) >> 2]) & Ej ^ Ek;
            var Fk = mj + 1 | 0;
            17 == (Fk | 0) ? hd = 4 : (mj = Fk, hd = 3);
            break;
           case 4:
            c = lk;
            break a;
          }
        }
      }
      k[(s | 0) >> 2] = h[g + 16 | 0] & 255;
      k[(s + 4 | 0) >> 2] = h[g + 17 | 0] & 255;
      k[(s + 8 | 0) >> 2] = h[g + 18 | 0] & 255;
      k[(s + 12 | 0) >> 2] = h[g + 19 | 0] & 255;
      k[(s + 16 | 0) >> 2] = h[g + 20 | 0] & 255;
      k[(s + 20 | 0) >> 2] = h[g + 21 | 0] & 255;
      k[(s + 24 | 0) >> 2] = h[g + 22 | 0] & 255;
      k[(s + 28 | 0) >> 2] = h[g + 23 | 0] & 255;
      k[(s + 32 | 0) >> 2] = h[g + 24 | 0] & 255;
      k[(s + 36 | 0) >> 2] = h[g + 25 | 0] & 255;
      k[(s + 40 | 0) >> 2] = h[g + 26 | 0] & 255;
      k[(s + 44 | 0) >> 2] = h[g + 27 | 0] & 255;
      k[(s + 48 | 0) >> 2] = h[g + 28 | 0] & 255;
      k[(s + 52 | 0) >> 2] = h[g + 29 | 0] & 255;
      k[(s + 56 | 0) >> 2] = h[g + 30 | 0] & 255;
      k[(s + 60 | 0) >> 2] = h[g + 31 | 0] & 255;
      k[(s + 64 | 0) >> 2] = 0;
      sl(Ga, s | 0);
      h[a] = k[(n | 0) >> 2] & 255;
      h[a + 1 | 0] = k[(n + 4 | 0) >> 2] & 255;
      h[a + 2 | 0] = k[(n + 8 | 0) >> 2] & 255;
      h[a + 3 | 0] = k[(n + 12 | 0) >> 2] & 255;
      h[a + 4 | 0] = k[(n + 16 | 0) >> 2] & 255;
      h[a + 5 | 0] = k[(n + 20 | 0) >> 2] & 255;
      h[a + 6 | 0] = k[(n + 24 | 0) >> 2] & 255;
      h[a + 7 | 0] = k[(n + 28 | 0) >> 2] & 255;
      h[a + 8 | 0] = k[(n + 32 | 0) >> 2] & 255;
      h[a + 9 | 0] = k[(n + 36 | 0) >> 2] & 255;
      h[a + 10 | 0] = k[(n + 40 | 0) >> 2] & 255;
      h[a + 11 | 0] = k[(n + 44 | 0) >> 2] & 255;
      h[a + 12 | 0] = k[(n + 48 | 0) >> 2] & 255;
      h[a + 13 | 0] = k[(n + 52 | 0) >> 2] & 255;
      h[a + 14 | 0] = k[(n + 56 | 0) >> 2] & 255;
      h[a + 15 | 0] = k[(n + 60 | 0) >> 2] & 255;
      c = j;
      return 0;
    }
  }
}
function vl(a, e, d, f, g) {
  var i = c;
  c = c + 16 | 0;
  var j = i | 0;
  tl(j, e, d, f, g);
  a = ((((h[j + 1 | 0] ^ h[a + 1 | 0] | h[j] ^ h[a] | h[j + 2 | 0] ^ h[a + 2 | 0] | h[j + 3 | 0] ^ h[a + 3 | 0] | h[j + 4 | 0] ^ h[a + 4 | 0] | h[j + 5 | 0] ^ h[a + 5 | 0] | h[j + 6 | 0] ^ h[a + 6 | 0] | h[j + 7 | 0] ^ h[a + 7 | 0] | h[j + 8 | 0] ^ h[a + 8 | 0] | h[j + 9 | 0] ^ h[a + 9 | 0] | h[j + 10 | 0] ^ h[a + 10 | 0] | h[j + 11 | 0] ^ h[a + 11 | 0] | h[j + 12 | 0] ^ h[a + 12 | 0] | h[j + 13 | 0] ^ h[a + 13 | 0] | h[j + 14 | 0] ^ h[a + 14 | 0] | h[j + 15 | 0] ^ h[a + 15 | 0]) & 255) + 511 | 0) >>> 8 & 1) - 1 | 0;
  c = i;
  return a;
}
function wl(a, e) {
  ml(a, e, 5244264);
  return 0;
}
function ml(a, e, d) {
  var f = 0, g = c;
  c = c + 416 | 0;
  for (f = 2; ; ) {
    switch (f) {
     case 2:
      var i = g, j = g + 384;
      I(j | 0, e, 32);
      var l = j | 0;
      h[l] &= -8;
      var n = j + 31 | 0;
      h[n] = h[n] & 63 | 64;
      var p = 0, f = 3;
      break;
     case 3:
      k[(i + (p << 2) | 0) >> 2] = h[d + p | 0] & 255;
      var s = p + 1 | 0;
      32 == (s | 0) ? f = 4 : (p = s, f = 3);
      break;
     case 4:
      var r = i | 0;
      a : {
        for (var q = r, u = l, B = 0, F = c, B = 2; ; ) {
          switch (B) {
           case 2:
            var E = q, x = c;
            c = c + 256 | 0;
            var H = x, G = c, L = c = c + 256 | 0, C = c = c + 256 | 0, D = c = c + 256 | 0, Q = c = c + 256 | 0, J = c = c + 256 | 0, fa = c = c + 256 | 0, K = c = c + 256 | 0, N = c = c + 256 | 0, ja = c = c + 256 | 0, U = c = c + 256 | 0, sa = c = c + 128 | 0, Fa = c = c + 128 | 0, Ca = c = c + 128 | 0;
            c = c + 128 | 0;
            I(H, E, 128);
            var Ea = G;
            k[(x + 128 | 0) >> 2] = 1;
            Vk(x + 132 | 0, 0, 124);
            var Z = G | 0;
            k[Z >> 2] = 1;
            Vk(G + 4 | 0, 0, 252);
            var da = L | 0, ma = C | 0, xa = x | 0, $ = J | 0, ga = L + 128 | 0, aa = J + 128 | 0, ba = fa | 0, S = C + 128 | 0, R = fa + 128 | 0, ha = K | 0, pa = K + 128 | 0, z = N | 0, ia = N + 128 | 0, ka = ja | 0, ta = ja + 128 | 0, na = U | 0, ya = sa | 0, La = Fa | 0, Qa = Ca | 0, rj = D | 0, Rj = D + 128 | 0, sj = Q | 0, Sj = Q + 128 | 0, kd = 254, B = 3;
            break;
           case 3:
            var tj = (h[u + ((kd | 0) / 8 & -1) | 0] & 255) >>> ((kd & 7) >>> 0) & 1;
            xl(da, ma, Z, xa, tj);
            yl($, da, ga);
            zl(aa, da, ga);
            yl(ba, ma, S);
            zl(R, ma, S);
            T(ha, $);
            T(pa, aa);
            Al(z, ba, aa);
            Al(ia, R, $);
            yl(ka, z, ia);
            zl(ta, z, ia);
            T(na, ta);
            zl(ya, ha, pa);
            b : {
              for (var ed = La, uj = ya, Pb = 0, Pb = 2; ; ) {
                switch (Pb) {
                 case 2:
                  var bj = 0, vj = 0, Pb = 3;
                  break;
                 case 3:
                  var ac = (121665 * k[(uj + (bj << 2) | 0) >> 2] & -1) + vj | 0;
                  k[(ed + (bj << 2) | 0) >> 2] = ac & 255;
                  var Qb = ac >>> 8, bc = bj + 1 | 0;
                  31 == (bc | 0) ? Pb = 4 : (bj = bc, vj = Qb, Pb = 3);
                  break;
                 case 4:
                  var Rb = (121665 * k[(uj + 124 | 0) >> 2] & -1) + Qb | 0;
                  k[(ed + 124 | 0) >> 2] = Rb & 127;
                  var cc = 0, Sb = ed, Tb = k[ed >> 2] + (19 * (Rb >>> 7) & -1) | 0, Pb = 5;
                  break;
                 case 5:
                  k[Sb >> 2] = Tb & 255;
                  var Ra = cc + 1 | 0, dc = ed + (Ra << 2) | 0, Ub = k[dc >> 2] + (Tb >>> 8) | 0;
                  31 == (Ra | 0) ? Pb = 6 : (cc = Ra, Sb = dc, Tb = Ub, Pb = 5);
                  break;
                 case 6:
                  k[(ed + 124 | 0) >> 2] = Ub;
                  break b;
                }
              }
            }
            yl(Qa, La, ha);
            Al(rj, ha, pa);
            Al(Rj, ya, Qa);
            T(sj, ka);
            Al(Sj, na, q);
            xl(Z, xa, rj, sj, tj);
            var fd = kd - 1 | 0;
            0 < (kd | 0) ? (kd = fd, B = 3) : B = 4;
            break;
           case 4:
            I(E, Ea, 256);
            c = F;
            break a;
          }
        }
      }
      var Sa = i + 128 | 0;
      a : {
        var gd = Sa, Ma = Sa, ua = 0, qa = c;
        c = c + 1280 | 0;
        for (ua = 2; ; ) {
          switch (ua) {
           case 2:
            var ec = qa + 128, Vb = qa + 256, fc = qa + 384, Wb = qa + 512, gc = qa + 640, Xb = qa + 768, hc = qa + 896, Yb = qa + 1024, ic = qa + 1152, Na = qa | 0;
            T(Na, Ma);
            var w = ic | 0;
            T(w, Na);
            var v = Yb | 0;
            T(v, w);
            var za = ec | 0;
            Al(za, v, Ma);
            var va = Vb | 0;
            Al(va, za, Na);
            T(v, va);
            var wj = fc | 0;
            Al(wj, v, za);
            T(v, wj);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            var kj = Wb | 0;
            Al(kj, v, wj);
            T(v, kj);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            var xj = gc | 0;
            Al(xj, w, kj);
            T(v, xj);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            Al(v, w, xj);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            var lj = Xb | 0;
            Al(lj, v, kj);
            T(v, lj);
            T(w, v);
            var Tj = 2, ua = 3;
            break;
           case 3:
            T(v, w);
            T(w, v);
            var Uj = Tj + 2 | 0;
            50 > (Uj | 0) ? (Tj = Uj, ua = 3) : ua = 4;
            break;
           case 4:
            var yj = hc | 0;
            Al(yj, w, lj);
            T(w, yj);
            T(v, w);
            var zj = 2, ua = 5;
            break;
           case 5:
            T(w, v);
            T(v, w);
            var Aj = zj + 2 | 0;
            100 > (Aj | 0) ? (zj = Aj, ua = 5) : ua = 6;
            break;
           case 6:
            Al(w, v, yj);
            T(v, w);
            T(w, v);
            var Bj = 2, ua = 7;
            break;
           case 7:
            T(v, w);
            T(w, v);
            var Cj = Bj + 2 | 0;
            50 > (Cj | 0) ? (Bj = Cj, ua = 7) : ua = 8;
            break;
           case 8:
            Al(v, w, lj);
            T(w, v);
            T(v, w);
            T(w, v);
            T(v, w);
            T(w, v);
            Al(gd, w, va);
            c = qa;
            break a;
          }
        }
      }
      var Vj = i + 256 | 0;
      Al(Vj, r, Sa);
      a : {
        for (var cj = Vj, Aa = 0, Oa = c, Aa = 2; ; ) {
          switch (Aa) {
           case 2:
            var Pa = cj, Ga = c;
            c = c + 128 | 0;
            I(Ga, Pa, 128);
            yl(cj, cj, 5243172);
            var Dj = -(k[(cj + 124 | 0) >> 2] >>> 7 & 1) | 0, hd = 0, Aa = 3;
            break;
           case 3:
            var lk = cj + (hd << 2) | 0, mk = k[lk >> 2];
            k[lk >> 2] = (mk ^ k[(Ga + (hd << 2) | 0) >> 2]) & Dj ^ mk;
            var Wj = hd + 1 | 0;
            32 == (Wj | 0) ? Aa = 4 : (hd = Wj, Aa = 3);
            break;
           case 4:
            c = Oa;
            break a;
          }
        }
      }
      var Ej = 0, f = 5;
      break;
     case 5:
      h[a + Ej | 0] = k[(i + ((Ej + 64 | 0) << 2) | 0) >> 2] & 255;
      var mj = Ej + 1 | 0;
      32 == (mj | 0) ? f = 6 : (Ej = mj, f = 5);
      break;
     case 6:
      c = g;
      return;
    }
  }
}
function yl(a, e, d) {
  for (var f = 0, f = 2; ; ) {
    switch (f) {
     case 2:
      var g = 0, i = 0, f = 3;
      break;
     case 3:
      var j = (k[(e + (g << 2) | 0) >> 2] + i | 0) + k[(d + (g << 2) | 0) >> 2] | 0;
      k[(a + (g << 2) | 0) >> 2] = j & 255;
      j >>>= 8;
      f = g + 1 | 0;
      31 == (f | 0) ? f = 4 : (g = f, i = j, f = 3);
      break;
     case 4:
      k[(a + 124 | 0) >> 2] = (k[(e + 124 | 0) >> 2] + j | 0) + k[(d + 124 | 0) >> 2] | 0;
      return;
    }
  }
}
function Bl(a) {
  for (var e = 0, e = 2; ; ) {
    switch (e) {
     case 2:
      var d = 0, f = 0, e = 3;
      break;
     case 3:
      var g = a + (d << 2) | 0, e = k[g >> 2] + f | 0;
      k[g >> 2] = e & 255;
      g = e >>> 8;
      e = d + 1 | 0;
      31 == (e | 0) ? e = 4 : (d = e, f = g, e = 3);
      break;
     case 4:
      var i = a + 124 | 0, j = k[i >> 2] + g | 0;
      k[i >> 2] = j & 127;
      var l = 0, j = 19 * (j >>> 7) & -1, e = 5;
      break;
     case 5:
      var n = a + (l << 2) | 0, e = k[n >> 2] + j | 0;
      k[n >> 2] = e & 255;
      n = e >>> 8;
      e = l + 1 | 0;
      31 == (e | 0) ? e = 6 : (l = e, j = n, e = 5);
      break;
     case 6:
      k[i >> 2] = k[i >> 2] + n | 0;
      return;
    }
  }
}
function xl(a, e, d, f, g) {
  for (var i = 0, i = 2; ; ) {
    switch (i) {
     case 2:
      var j = g - 1 | 0, l = 0, i = 3;
      break;
     case 3:
      var i = d + (l << 2) | 0, n = k[(f + (l << 2) | 0) >> 2], p = (n ^ k[i >> 2]) & j;
      k[(a + (l << 2) | 0) >> 2] = p ^ n;
      k[(e + (l << 2) | 0) >> 2] = p ^ k[i >> 2];
      i = l + 1 | 0;
      64 == (i | 0) ? i = 4 : (l = i, i = 3);
      break;
     case 4:
      return;
    }
  }
}
function zl(a, e, d) {
  for (var f = 0, f = 2; ; ) {
    switch (f) {
     case 2:
      var g = 0, i = 218, f = 3;
      break;
     case 3:
      var j = ((i + 65280 | 0) + k[(e + (g << 2) | 0) >> 2] | 0) - k[(d + (g << 2) | 0) >> 2] | 0;
      k[(a + (g << 2) | 0) >> 2] = j & 255;
      j >>>= 8;
      f = g + 1 | 0;
      31 == (f | 0) ? f = 4 : (g = f, i = j, f = 3);
      break;
     case 4:
      k[(a + 124 | 0) >> 2] = (k[(e + 124 | 0) >> 2] + j | 0) - k[(d + 124 | 0) >> 2] | 0;
      return;
    }
  }
}
function Cl(a, e) {
  for (var d = 0, d = 2; ; ) {
    switch (d) {
     case 2:
      var f = 0, d = 3;
      break;
     case 3:
      k[(a + (f << 2) | 0) >> 2] = h[e + f | 0] & 255;
      d = f + 1 | 0;
      32 == (d | 0) ? d = 4 : (f = d, d = 3);
      break;
     case 4:
      f = a + 124 | 0;
      k[f >> 2] &= 127;
      return;
    }
  }
}
function Dl(a, e, d) {
  for (var f = 0, f = 2; ; ) {
    switch (f) {
     case 2:
      var g = d & 255, i = 1 - d & 255, j = 0, f = 3;
      break;
     case 3:
      f = a + (j << 2) | 0;
      k[f >> 2] = Math.g(k[(e + (j << 2) | 0) >> 2], g) + Math.g(k[f >> 2], i) | 0;
      f = j + 1 | 0;
      32 == (f | 0) ? f = 4 : (j = f, f = 3);
      break;
     case 4:
      return;
    }
  }
}
function El(a) {
  for (var e = 0, e = 2; ; ) {
    switch (e) {
     case 2:
      var d = a + 124 | 0, f = 30, g = 127 == (k[d >> 2] | 0) & 1, e = 3;
      break;
     case 3:
      var i = g & (-(255 == (k[(a + (f << 2) | 0) >> 2] | 0) & 1) | 0), e = f - 1 | 0;
      1 < (e | 0) ? (f = e, g = i, e = 3) : e = 4;
      break;
     case 4:
      var j = a | 0, l = i & (-(236 < k[j >> 2] >>> 0 & 1) | 0);
      k[d >> 2] = (-127 * l & -1) + k[d >> 2] | 0;
      var n = -255 * l & -1, p = 30, e = 5;
      break;
     case 5:
      e = a + (p << 2) | 0;
      k[e >> 2] = k[e >> 2] + n | 0;
      e = p - 1 | 0;
      0 < (e | 0) ? (p = e, e = 5) : e = 6;
      break;
     case 6:
      k[j >> 2] = k[j >> 2] + (-237 * l & -1) | 0;
      return;
    }
  }
}
function Fl(a) {
  for (var e = 0, e = 2; ; ) {
    switch (e) {
     case 2:
      var d = a + 124 | 0, f = a | 0, g = k[d >> 2], e = g >>> 7;
      k[d >> 2] = g & 127;
      k[f >> 2] = (19 * e & -1) + k[f >> 2] | 0;
      g = 0;
      e = 3;
      break;
     case 3:
      var e = a + (g << 2) | 0, i = g + 1 | 0, j = a + (i << 2) | 0;
      k[j >> 2] = k[j >> 2] + (k[e >> 2] >>> 8) | 0;
      k[e >> 2] &= 255;
      31 == (i | 0) ? e = 4 : (g = i, e = 3);
      break;
     case 4:
      var l = k[d >> 2], e = l >>> 7;
      k[d >> 2] = l & 127;
      k[f >> 2] = (19 * e & -1) + k[f >> 2] | 0;
      l = 0;
      e = 5;
      break;
     case 5:
      e = a + (l << 2) | 0;
      i = l + 1 | 0;
      j = a + (i << 2) | 0;
      k[j >> 2] = k[j >> 2] + (k[e >> 2] >>> 8) | 0;
      k[e >> 2] &= 255;
      31 == (i | 0) ? e = 6 : (l = i, e = 5);
      break;
     case 6:
      var n = k[d >> 2], e = n >>> 7;
      k[d >> 2] = n & 127;
      k[f >> 2] = (19 * e & -1) + k[f >> 2] | 0;
      n = 0;
      e = 7;
      break;
     case 7:
      e = a + (n << 2) | 0;
      i = n + 1 | 0;
      j = a + (i << 2) | 0;
      k[j >> 2] = k[j >> 2] + (k[e >> 2] >>> 8) | 0;
      k[e >> 2] &= 255;
      31 == (i | 0) ? e = 8 : (n = i, e = 7);
      break;
     case 8:
      var p = k[d >> 2], e = p >>> 7;
      k[d >> 2] = p & 127;
      k[f >> 2] = (19 * e & -1) + k[f >> 2] | 0;
      p = 0;
      e = 9;
      break;
     case 9:
      e = a + (p << 2) | 0;
      i = p + 1 | 0;
      j = a + (i << 2) | 0;
      k[j >> 2] = k[j >> 2] + (k[e >> 2] >>> 8) | 0;
      k[e >> 2] &= 255;
      31 == (i | 0) ? e = 10 : (p = i, e = 9);
      break;
     case 10:
      return;
    }
  }
}
function Al(a, e, d) {
  for (var f = 0, f = 2; ; ) {
    switch (f) {
     case 2:
      var g = 0, i = 1, f = 3;
      break;
     case 3:
      var j = 0, l = 0, f = 4;
      break;
     case 4:
      var n = Math.g(k[(d + ((g - j | 0) << 2) | 0) >> 2], k[(e + (j << 2) | 0) >> 2]) + l | 0, f = j + 1 | 0;
      (f | 0) == (i | 0) ? f = 5 : (j = f, l = n, f = 4);
      break;
     case 5:
      var p = g + 1 | 0;
      if (32 > p >>> 0) {
        f = 6;
      } else {
        var s = n, f = 8;
      }
      break;
     case 6:
      var r = g + 32 | 0, q = p, u = n, f = 7;
      break;
     case 7:
      var f = Math.g(38 * k[(e + (q << 2) | 0) >> 2] & -1, k[(d + ((r - q | 0) << 2) | 0) >> 2]) + u | 0, B = q + 1 | 0;
      32 == (B | 0) ? (s = f, f = 8) : (q = B, u = f, f = 7);
      break;
     case 8:
      k[(a + (g << 2) | 0) >> 2] = s;
      f = i + 1 | 0;
      32 == (p | 0) ? f = 9 : (g = p, i = f, f = 3);
      break;
     case 9:
      Bl(a);
      return;
    }
  }
}
function T(a, e) {
  for (var d = 0, d = 2; ; ) {
    switch (d) {
     case 2:
      var f = 0, d = 3;
      break;
     case 3:
      if (0 == (f | 0)) {
        var g = 0, i = 1, j = 32, d = 6;
      } else {
        var l = 0, n = 0, p = f, d = 4;
      }
      break;
     case 4:
      var s = Math.g(k[(e + (p << 2) | 0) >> 2], k[(e + (l << 2) | 0) >> 2]) + n | 0, d = l + 1 | 0, r = f - d | 0;
      d >>> 0 < r >>> 0 ? (l = d, n = s, p = r, d = 4) : d = 5;
      break;
     case 5:
      d = f + 1 | 0;
      r = f + 32 | 0;
      if (31 > d >>> 0) {
        g = s, i = d, j = r, d = 6;
      } else {
        var q = s, u = d, d = 8;
      }
      break;
     case 6:
      var B = i, F = g, E = 31, d = 7;
      break;
     case 7:
      var d = Math.g(38 * k[(e + (B << 2) | 0) >> 2] & -1, k[(e + (E << 2) | 0) >> 2]) + F | 0, r = B + 1 | 0, x = j + (B ^ -1) | 0;
      r >>> 0 < x >>> 0 ? (B = r, F = d, E = x, d = 7) : (q = d, u = i, d = 8);
      break;
     case 8:
      var H = q << 1;
      if (0 == (f & 1 | 0)) {
        d = 9;
      } else {
        var G = H, d = 10;
      }
      break;
     case 9:
      d = f >>> 1;
      G = k[(e + (d << 2) | 0) >> 2];
      d = k[(e + ((d + 16 | 0) << 2) | 0) >> 2];
      G = (Math.g(G, G) + H | 0) + Math.g(38 * d & -1, d) | 0;
      d = 10;
      break;
     case 10:
      k[(a + (f << 2) | 0) >> 2] = G;
      32 == (u | 0) ? d = 11 : (f = u, d = 3);
      break;
     case 11:
      Bl(a);
      return;
    }
  }
}
function Gl(a, e, d, f, g, i) {
  for (var j = 0, j = 2; ; ) {
    switch (j) {
     case 2:
      if (0 > f >>> 0 | 0 == f >>> 0 & 32 > d >>> 0) {
        var l = -1, j = 4;
      } else {
        j = 3;
      }
      break;
     case 3:
      Hl(a, e, d, f, g, i);
      var j = a + 16 | 0, l = a + 32 | 0, n = P(d, f, -32, -1);
      tl(j, l, n, t, a);
      Vk(a, 0, 16);
      l = 0;
      j = 4;
      break;
     case 4:
      return l;
    }
  }
}
function Il(a, e, d, f, g, i) {
  var j = 0, l = c;
  c = c + 32 | 0;
  for (j = 2; ; ) {
    switch (j) {
     case 2:
      var n = l;
      if (0 > f >>> 0 | 0 == f >>> 0 & 32 > d >>> 0) {
        var p = -1, j = 5;
      } else {
        j = 3;
      }
      break;
     case 3:
      j = n | 0;
      Jl(j, 32, 0, g, i);
      var s = e + 16 | 0, r = e + 32 | 0, q = P(d, f, -32, -1);
      0 == (vl(s, r, q, t, j) | 0) ? j = 4 : (p = -1, j = 5);
      break;
     case 4:
      Hl(a, e, d, f, g, i);
      Vk(a, 0, 32);
      p = 0;
      j = 5;
      break;
     case 5:
      return c = l, p;
    }
  }
}
function Kl(a) {
  k[a >> 2] = 1;
  Vk(a + 4 | 0, 0, 124);
}
function Ll(a, e, d) {
  var f = 0, g = c;
  c = c + 128 | 0;
  for (f = 2; ; ) {
    switch (f) {
     case 2:
      var i = g;
      k[(i | 0) >> 2] = k[(e | 0) >> 2] + 474 | 0;
      k[(i + 124 | 0) >> 2] = k[(e + 124 | 0) >> 2] + 254 | 0;
      var j = 1, f = 3;
      break;
     case 3:
      k[(i + (j << 2) | 0) >> 2] = k[(e + (j << 2) | 0) >> 2] + 510 | 0;
      f = j + 1 | 0;
      if (31 == (f | 0)) {
        var l = 0, f = 4;
      } else {
        j = f, f = 3;
      }
      break;
     case 4:
      k[(a + (l << 2) | 0) >> 2] = k[(i + (l << 2) | 0) >> 2] - k[(d + (l << 2) | 0) >> 2] | 0;
      f = l + 1 | 0;
      32 == (f | 0) ? f = 5 : (l = f, f = 4);
      break;
     case 5:
      Fl(a);
      c = g;
      return;
    }
  }
}
function Yr(a, e, d) {
  for (var f = 0, f = 2; ; ) {
    switch (f) {
     case 2:
      var g = 0, f = 3;
      break;
     case 3:
      k[(a + (g << 2) | 0) >> 2] = k[(d + (g << 2) | 0) >> 2] + k[(e + (g << 2) | 0) >> 2] | 0;
      f = g + 1 | 0;
      32 == (f | 0) ? f = 4 : (g = f, f = 3);
      break;
     case 4:
      Fl(a);
      return;
    }
  }
}
function V(a, e, d) {
  var f = 0, g = c;
  c = c + 252 | 0;
  for (f = 2; ; ) {
    switch (f) {
     case 2:
      var i = g;
      Vk(i, 0, 252);
      var j = 0, f = 3;
      break;
     case 3:
      var l = k[(e + (j << 2) | 0) >> 2], n = 0, f = 4;
      break;
     case 4:
      f = i + ((n + j | 0) << 2) | 0;
      k[f >> 2] = k[f >> 2] + Math.g(k[(d + (n << 2) | 0) >> 2], l) | 0;
      f = n + 1 | 0;
      32 == (f | 0) ? f = 5 : (n = f, f = 4);
      break;
     case 5:
      f = j + 1 | 0;
      if (32 == (f | 0)) {
        var p = 32, f = 6;
      } else {
        j = f, f = 3;
      }
      break;
     case 6:
      f = p - 32 | 0;
      k[(a + (f << 2) | 0) >> 2] = (38 * k[(i + (p << 2) | 0) >> 2] & -1) + k[(i + (f << 2) | 0) >> 2] | 0;
      f = p + 1 | 0;
      63 == (f | 0) ? f = 7 : (p = f, f = 6);
      break;
     case 7:
      k[(a + 124 | 0) >> 2] = k[(i + 124 | 0) >> 2];
      a : {
        e = 0;
        for (e = 2; ; ) {
          switch (e) {
           case 2:
            var s = a + 124 | 0, r = a | 0, q = k[s >> 2], e = q >>> 7;
            k[s >> 2] = q & 127;
            k[r >> 2] = (19 * e & -1) + k[r >> 2] | 0;
            q = 0;
            e = 3;
            break;
           case 3:
            e = a + (q << 2) | 0;
            d = q + 1 | 0;
            i = a + (d << 2) | 0;
            k[i >> 2] = k[i >> 2] + (k[e >> 2] >>> 8) | 0;
            k[e >> 2] &= 255;
            31 == (d | 0) ? e = 4 : (q = d, e = 3);
            break;
           case 4:
            var u = k[s >> 2], e = u >>> 7;
            k[s >> 2] = u & 127;
            k[r >> 2] = (19 * e & -1) + k[r >> 2] | 0;
            u = 0;
            e = 5;
            break;
           case 5:
            e = a + (u << 2) | 0;
            d = u + 1 | 0;
            i = a + (d << 2) | 0;
            k[i >> 2] = k[i >> 2] + (k[e >> 2] >>> 8) | 0;
            k[e >> 2] &= 255;
            31 == (d | 0) ? e = 6 : (u = d, e = 5);
            break;
           case 6:
            break a;
          }
        }
      }
      c = g;
      return;
    }
  }
}
function W(a, e) {
  V(a, e, e);
}
function Zr(a) {
  for (var e = 0, e = 2; ; ) {
    switch (e) {
     case 2:
      var d = 1, f = 1 == (k[(a | 0) >> 2] | 0) & 1, e = 3;
      break;
     case 3:
      var g = f & (-(0 == (k[(a + (d << 2) | 0) >> 2] | 0) & 1) | 0), e = d + 1 | 0;
      32 == (e | 0) ? e = 4 : (d = e, f = g, e = 3);
      break;
     case 4:
      return g;
    }
  }
}
function $r(a, e) {
  for (var d = 0, d = 2; ; ) {
    switch (d) {
     case 2:
      var f = 0, d = 3;
      break;
     case 3:
      h[a + f | 0] = k[(e + (f << 2) | 0) >> 2] & 255;
      d = f + 1 | 0;
      32 == (d | 0) ? d = 4 : (f = d, d = 3);
      break;
     case 4:
      return;
    }
  }
}
function as(a) {
  var e = 0, d = c;
  c = c + 32 | 0;
  for (e = 2; ; ) {
    switch (e) {
     case 2:
      var f = d, g = 0, i = 0, e = 3;
      break;
     case 3:
      var e = k[(a + (i << 2) | 0) >> 2], j = k[(5243368 + (i << 2) | 0) >> 2], l = e >>> 0 < (j + g | 0) >>> 0 & 1;
      h[f + i | 0] = ((e - g | 0) - j | 0) & 255;
      e = i + 1 | 0;
      32 == (e | 0) ? e = 4 : (g = l, i = e, e = 3);
      break;
     case 4:
      var n = l ^ 1, p = 0, e = 5;
      break;
     case 5:
      e = a + (p << 2) | 0;
      k[e >> 2] = (h[f + p | 0] & 255 & (-n | 0)) + (k[e >> 2] & (-l | 0)) | 0;
      e = p + 1 | 0;
      32 == (e | 0) ? e = 6 : (p = e, e = 5);
      break;
     case 6:
      c = d;
      return;
    }
  }
}
function bs(a, e, d) {
  var f = 0, g = c;
  c = c + 2304 | 0;
  for (f = 2; ; ) {
    switch (f) {
     case 2:
      var i = g, j = g + 128, l = g + 2176;
      Kl(i);
      Kl(j | 0);
      var n = j + 128 | 0;
      I(n, e, 128);
      var p = j + 256 | 0;
      W(p, j + 128 | 0);
      V(j + 384 | 0, p, n);
      p = j + 512 | 0;
      W(p, j + 256 | 0);
      V(j + 640 | 0, p, n);
      p = j + 768 | 0;
      W(p, j + 384 | 0);
      V(j + 896 | 0, p, n);
      p = j + 1024 | 0;
      W(p, j + 512 | 0);
      V(j + 1152 | 0, p, n);
      p = j + 1280 | 0;
      W(p, j + 640 | 0);
      V(j + 1408 | 0, p, n);
      p = j + 1536 | 0;
      W(p, j + 768 | 0);
      V(j + 1664 | 0, p, n);
      p = j + 1792 | 0;
      W(p, j + 896 | 0);
      V(j + 1920 | 0, p, n);
      var n = l, p = j, s = 32, f = 3;
      break;
     case 3:
      var r = d + (s - 1 | 0) | 0, q = j + 128 | 0, u = 4, f = 4;
      break;
     case 4:
      W(i, i);
      W(i, i);
      W(i, i);
      W(i, i);
      f = (h[r] & 255) >>> (u >>> 0) & 15;
      I(n, p, 128);
      Dl(l, q, 1 == (f | 0) & 1);
      Dl(l, j + 256 | 0, 2 == (f | 0) & 1);
      Dl(l, j + 384 | 0, 3 == (f | 0) & 1);
      Dl(l, j + 512 | 0, 4 == (f | 0) & 1);
      Dl(l, j + 640 | 0, 5 == (f | 0) & 1);
      Dl(l, j + 768 | 0, 6 == (f | 0) & 1);
      Dl(l, j + 896 | 0, 7 == (f | 0) & 1);
      Dl(l, j + 1024 | 0, 8 == (f | 0) & 1);
      Dl(l, j + 1152 | 0, 9 == (f | 0) & 1);
      Dl(l, j + 1280 | 0, 10 == (f | 0) & 1);
      Dl(l, j + 1408 | 0, 11 == (f | 0) & 1);
      Dl(l, j + 1536 | 0, 12 == (f | 0) & 1);
      Dl(l, j + 1664 | 0, 13 == (f | 0) & 1);
      Dl(l, j + 1792 | 0, 14 == (f | 0) & 1);
      Dl(l, j + 1920 | 0, 15 == (f | 0) & 1);
      V(i, i, l);
      f = u - 4 | 0;
      -1 < (f | 0) ? (u = f, f = 4) : f = 5;
      break;
     case 5:
      f = s - 1 | 0;
      0 < (f | 0) ? (s = f, f = 3) : f = 6;
      break;
     case 6:
      I(a, i, 128);
      c = g;
      return;
    }
  }
}
function cs(a, e) {
  var d = 0, f = c;
  c = c + 1280 | 0;
  for (d = 2; ; ) {
    switch (d) {
     case 2:
      var g = f, d = f + 128, i = f + 256, j = f + 384, l = f + 512, n = f + 640, p = f + 768, s = f + 896, r = f + 1024, q = f + 1152;
      W(g, e);
      W(q, g);
      W(r, q);
      V(d, r, e);
      V(i, d, g);
      W(r, i);
      V(j, r, d);
      W(r, j);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      V(l, r, j);
      W(r, l);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      V(n, q, l);
      W(r, n);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      V(r, q, n);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      V(p, r, l);
      W(r, p);
      W(q, r);
      g = 2;
      d = 3;
      break;
     case 3:
      W(r, q);
      W(q, r);
      d = g + 2 | 0;
      50 > (d | 0) ? (g = d, d = 3) : d = 4;
      break;
     case 4:
      V(s, q, p);
      W(q, s);
      W(r, q);
      var u = 2, d = 5;
      break;
     case 5:
      W(q, r);
      W(r, q);
      d = u + 2 | 0;
      100 > (d | 0) ? (u = d, d = 5) : d = 6;
      break;
     case 6:
      V(q, r, s);
      W(r, q);
      W(q, r);
      var B = 2, d = 7;
      break;
     case 7:
      W(r, q);
      W(q, r);
      d = B + 2 | 0;
      50 > (d | 0) ? (B = d, d = 7) : d = 8;
      break;
     case 8:
      V(r, q, p);
      W(q, r);
      W(r, q);
      W(q, r);
      W(r, q);
      W(q, r);
      V(a, q, i);
      c = f;
      return;
    }
  }
}
function ds(a, e) {
  var d = c;
  c = c + 256 | 0;
  var f = d + 128, g = a + 256 | 0;
  Kl(g);
  Cl(f, 5243976);
  var i = m[e + 31 | 0] >>> 7, j = a + 128 | 0;
  Cl(j, e);
  var l = a | 0;
  W(l, j);
  V(d, l, f);
  Ll(l, l, g);
  Yr(d, g, d);
  cs(d, d);
  V(l, l, d);
  a : {
    g = 0;
    f = c;
    c = c + 352 | 0;
    for (g = 2; ; ) {
      switch (g) {
       case 2:
        var n = f, p = f + 32, s = f + 64, r = f + 96, q = f + 224;
        b : {
          var u = l, B = 0, g = c;
          c = c + 160 | 0;
          for (B = 2; ; ) {
            switch (B) {
             case 2:
              var F = g + 32, B = g | 0;
              I(B, 5243688, 32);
              bs(F, u, B);
              El(F);
              if (0 == (Zr(F) | 0)) {
                B = 3;
              } else {
                var E = 1, B = 4;
              }
              break;
             case 3:
              c : {
                E = 0;
                for (E = 2; ; ) {
                  switch (E) {
                   case 2:
                    var x = 1, H = 0 == (k[(F | 0) >> 2] | 0) & 1, E = 3;
                    break;
                   case 3:
                    var G = H & (-(0 == (k[(F + (x << 2) | 0) >> 2] | 0) & 1) | 0), E = x + 1 | 0;
                    32 == (E | 0) ? E = 4 : (x = E, H = G, E = 3);
                    break;
                   case 4:
                    E = G;
                    break c;
                  }
                }
                E = ca;
              }
              E = 0 != (E | 0);
              B = 4;
              break;
             case 4:
              u = E & 1;
              c = g;
              g = u;
              break b;
            }
          }
          g = ca;
        }
        if (0 == (g | 0)) {
          var L = -1, g = 11;
        } else {
          g = 3;
        }
        break;
       case 3:
        g = n | 0;
        I(g, 5244232, 32);
        var C = p | 0;
        I(C, 5244200, 32);
        var D = s | 0;
        I(D, 5244168, 32);
        Vk(r, 0, 128);
        bs(q, l, g);
        El(q);
        if (0 == (Zr(q) | 0)) {
          var Q = 0, g = 5;
        } else {
          g = 4;
        }
        break;
       case 4:
        bs(l, l, C);
        g = 9;
        break;
       case 5:
        k[(q + (Q << 2) | 0) >> 2] = k[(l + (Q << 2) | 0) >> 2] << 2;
        g = Q + 1 | 0;
        32 == (g | 0) ? g = 6 : (Q = g, g = 5);
        break;
       case 6:
        bs(q, q, D);
        var J = 0, g = 7;
        break;
       case 7:
        k[(l + (J << 2) | 0) >> 2] <<= 1;
        g = J + 1 | 0;
        32 == (g | 0) ? g = 8 : (J = g, g = 7);
        break;
       case 8:
        V(l, l, q);
        g = 9;
        break;
       case 9:
        El(l);
        0 == ((k[(l | 0) >> 2] ^ i & 255) & 1 | 0) ? (L = 0, g = 11) : g = 10;
        break;
       case 10:
        Ll(l, r, l);
        L = 0;
        g = 11;
        break;
       case 11:
        c = f;
        i = L;
        break a;
      }
    }
    i = ca;
  }
  V(a + 384 | 0, l, j);
  c = d;
  return i;
}
function es(a, e) {
  var d = c;
  c = c + 384 | 0;
  var f = d + 128, g = d + 256;
  cs(g, e + 256 | 0);
  V(d, e | 0, g);
  V(f, e + 128 | 0, g);
  a : {
    g = 0;
    for (g = 2; ; ) {
      switch (g) {
       case 2:
        var i = 0, g = 3;
        break;
       case 3:
        h[a + i | 0] = k[(f + (i << 2) | 0) >> 2] & 255;
        g = i + 1 | 0;
        32 == (g | 0) ? g = 4 : (i = g, g = 3);
        break;
       case 4:
        var j = a + 31 | 0, l = 30, n = 127 == h[j] << 24 >> 24 & 1, g = 5;
        break;
       case 5:
        var p = n & (-(-1 == h[a + l | 0] << 24 >> 24 & 1) | 0), g = l - 1 | 0;
        1 < (g | 0) ? (l = g, n = p, g = 5) : g = 6;
        break;
       case 6:
        var s = p & (-(236 < (h[a] & 255) & 1) | 0);
        h[j] = ((-127 * s & -1) + (h[j] & 255) | 0) & 255;
        var r = -255 * s & -1, q = 30, g = 7;
        break;
       case 7:
        g = a + q | 0;
        h[g] = ((h[g] & 255) + r | 0) & 255;
        g = q - 1 | 0;
        0 < (g | 0) ? (q = g, g = 7) : g = 8;
        break;
       case 8:
        h[a] = ((h[a] & 255) + (-237 * s & -1) | 0) & 255;
        break a;
      }
    }
  }
  f = i = c;
  c = c + 128 | 0;
  I(f, d, 128);
  El(f);
  c = i;
  i = a + 31 | 0;
  h[i] ^= (k[f >> 2] & 1) << 7;
  c = d;
}
function fs(a, e, d) {
  var f = c;
  c = c + 768 | 0;
  var g = f + 128, i = f + 256, j = f + 384, l = f + 512, n = f + 640;
  Cl(n, 5243976);
  var p = e + 128 | 0, s = e | 0;
  Ll(f, p, s);
  var r = d + 128 | 0, q = d | 0;
  Ll(l, r, q);
  V(f, f, l);
  Yr(g, s, p);
  Yr(l, q, r);
  V(g, g, l);
  V(i, e + 384 | 0, d + 384 | 0);
  V(i, i, n);
  Yr(i, i, i);
  V(j, e + 256 | 0, d + 256 | 0);
  Yr(j, j, j);
  Ll(a | 0, g, f);
  Ll(a + 384 | 0, j, i);
  Yr(a + 128 | 0, j, i);
  Yr(a + 256 | 0, g, f);
  c = f;
}
function gs(a, e) {
  hs(a, e);
  V(a + 384 | 0, e | 0, e + 256 | 0);
}
function is(a, e) {
  var d = c;
  c = c + 512 | 0;
  var f = d + 128, g = d + 256, i = d + 384, j = e | 0;
  W(d, j);
  var l = e + 128 | 0;
  W(f, l);
  W(g, e + 256 | 0);
  Yr(g, g, g);
  var n = c, p = c;
  c = c + 128 | 0;
  I(p, d, 128);
  Vk(i, 0, 128);
  Ll(i, i, p);
  c = n;
  n = a | 0;
  Yr(n, j, l);
  W(n, n);
  Ll(n, n, d);
  Ll(n, n, f);
  j = a + 128 | 0;
  Yr(j, i, f);
  Ll(a + 384 | 0, j, g);
  Ll(a + 256 | 0, i, f);
  c = d;
}
function js(a, e, d) {
  var f = 0, g = c;
  c = c + 3616 | 0;
  for (f = 2; ; ) {
    switch (f) {
     case 2:
      var i = g, j = g + 512, l = g + 2560, n = g + 3072, p = g + 3584;
      Cl(i | 0, 5243784);
      var s = i + 128 | 0;
      Cl(s, 5243752);
      var r = i + 256 | 0;
      Cl(r, 5243720);
      var q = i + 384 | 0;
      Cl(q, 5243816);
      $r(p | 0, d);
      var u = j, B = i;
      I(u, B, 512);
      var F = j + 512 | 0;
      I(F, e, 512);
      is(n, j + 512 | 0);
      var E = j + 1024 | 0;
      gs(E, n);
      fs(n, E, F);
      gs(j + 1536 | 0, n);
      var F = i, E = l, x = 32, f = 3;
      break;
     case 3:
      var H = h[p + (x - 1 | 0) | 0] & 255, G = 6, f = 4;
      break;
     case 4:
      is(n, F);
      hs(F, n);
      is(n, F);
      gs(i, n);
      var L = H >>> (G >>> 0) & 3;
      I(E, u, 512);
      var C = 1, f = 5;
      break;
     case 5:
      var f = l, D = j + (C << 9) | 0, Q = (C | 0) == (L | 0) & 1;
      Dl(f | 0, D | 0, Q);
      Dl(f + 128 | 0, D + 128 | 0, Q);
      Dl(f + 256 | 0, D + 256 | 0, Q);
      Dl(f + 384 | 0, D + 384 | 0, Q);
      f = C + 1 | 0;
      4 == (f | 0) ? f = 6 : (C = f, f = 5);
      break;
     case 6:
      fs(n, i, l);
      f = 0 == (G | 0) ? 7 : 8;
      break;
     case 7:
      gs(i, n);
      f = 9;
      break;
     case 8:
      hs(F, n);
      f = G - 2 | 0;
      -1 < (f | 0) ? (G = f, f = 4) : f = 9;
      break;
     case 9:
      f = x - 1 | 0;
      0 < (f | 0) ? (x = f, f = 3) : f = 10;
      break;
     case 10:
      I(a, B, 128);
      I(a + 128 | 0, s, 128);
      I(a + 256 | 0, r, 128);
      I(a + 384 | 0, q, 128);
      c = g;
      return;
    }
  }
}
function hs(a, e) {
  var d = e + 384 | 0;
  V(a | 0, e | 0, d);
  var f = e + 128 | 0;
  V(a + 128 | 0, e + 256 | 0, f);
  V(a + 256 | 0, f, d);
}
function ks(a, e) {
  var d = c;
  c = c + 512 | 0;
  Cl(d | 0, 5243912);
  Cl(d + 128 | 0, 5243880);
  Cl(d + 256 | 0, 5243848);
  Cl(d + 384 | 0, 5243944);
  js(a, d, e);
  c = d;
}
function ls(a, e) {
  var d = 0, f = c;
  c = c + 256 | 0;
  for (d = 2; ; ) {
    switch (d) {
     case 2:
      var g = f;
      Vk(g, 0, 256);
      var i = 0, d = 3;
      break;
     case 3:
      k[(g + (i << 2) | 0) >> 2] = h[e + i | 0] & 255;
      d = i + 1 | 0;
      32 == (d | 0) ? d = 4 : (i = d, d = 3);
      break;
     case 4:
      ms(a, g | 0);
      c = f;
      return;
    }
  }
}
function ms(a, e) {
  var d = 0, f = c;
  c = c + 528 | 0;
  for (d = 2; ; ) {
    switch (d) {
     case 2:
      var g = f, i = f + 264, j = f + 396;
      Vk(g, 0, 264);
      Vk(j, 0, 132);
      var l = 0, d = 3;
      break;
     case 3:
      var n = 5243040 + (l << 2) | 0, p = 0, d = 4;
      break;
     case 4:
      var s = p + l | 0, d = 30 < (s | 0) ? 5 : 6;
      break;
     case 5:
      d = g + (s << 2) | 0;
      k[d >> 2] = k[d >> 2] + Math.g(k[(e + ((p + 31 | 0) << 2) | 0) >> 2], k[n >> 2]) | 0;
      d = 6;
      break;
     case 6:
      d = p + 1 | 0;
      33 == (d | 0) ? d = 7 : (p = d, d = 4);
      break;
     case 7:
      d = l + 1 | 0;
      33 == (d | 0) ? d = 8 : (l = d, d = 3);
      break;
     case 8:
      var r = e, d = i, q = g + 128 | 0, u = k[q >> 2] + (k[(g + 124 | 0) >> 2] >>> 8) | 0;
      k[q >> 2] = u;
      q = g + 132 | 0;
      k[q >> 2] = (u >>> 8) + k[q >> 2] | 0;
      I(d, r, 132);
      r = 0;
      d = 9;
      break;
     case 9:
      var B = 5243368 + (r << 2) | 0, F = 0, d = 10;
      break;
     case 10:
      var E = F + r | 0, d = 33 > (E | 0) ? 11 : 12;
      break;
     case 11:
      d = j + (E << 2) | 0;
      k[d >> 2] = k[d >> 2] + Math.g(k[(g + ((F + 33 | 0) << 2) | 0) >> 2], k[B >> 2]) | 0;
      d = 12;
      break;
     case 12:
      d = F + 1 | 0;
      33 == (d | 0) ? d = 13 : (F = d, d = 10);
      break;
     case 13:
      d = r + 1 | 0;
      if (32 == (d | 0)) {
        var x = 0, d = 14;
      } else {
        r = d, d = 9;
      }
      break;
     case 14:
      d = j + (x << 2) | 0;
      u = x + 1 | 0;
      q = j + (u << 2) | 0;
      k[q >> 2] = k[q >> 2] + (k[d >> 2] >>> 8) | 0;
      k[d >> 2] &= 255;
      if (32 == (u | 0)) {
        var H = 0, G = 0, d = 15;
      } else {
        x = u, d = 14;
      }
      break;
     case 15:
      u = k[(i + (H << 2) | 0) >> 2];
      q = k[(j + (H << 2) | 0) >> 2];
      d = u >>> 0 < (q + G | 0) >>> 0 & 1;
      k[(a + (H << 2) | 0) >> 2] = ((u - G | 0) - q | 0) + (d << 8) | 0;
      u = H + 1 | 0;
      32 == (u | 0) ? d = 16 : (H = u, G = d, d = 15);
      break;
     case 16:
      as(a);
      as(a);
      c = f;
      return;
    }
  }
}
function ns(a, e) {
  var d = 0, f = c;
  c = c + 256 | 0;
  for (d = 2; ; ) {
    switch (d) {
     case 2:
      var g = f;
      Vk(g, 0, 256);
      var i = 0, d = 3;
      break;
     case 3:
      k[(g + (i << 2) | 0) >> 2] = h[e + i | 0] & 255;
      d = i + 1 | 0;
      64 == (d | 0) ? d = 4 : (i = d, d = 3);
      break;
     case 4:
      ms(a, g | 0);
      c = f;
      return;
    }
  }
}
function Jl(a, e, d, f, g) {
  var i = c;
  c = c + 32 | 0;
  var j = i | 0;
  nl(j, f, g, 5242880);
  a : {
    var f = f + 16 | 0, l = 0, g = c;
    c = c + 16 | 0;
    for (l = 2; ; ) {
      switch (l) {
       case 2:
        var n = g, p = n, s = c;
        c = c + 64 | 0;
        l = 0 == (e | 0) & 0 == (d | 0) ? 9 : 3;
        break;
       case 3:
        var l = n | 0, r = f, q = r | 0, r = r + 4 | 0, r = m[r] | m[r + 1 | 0] << 8 | m[r + 2 | 0] << 16 | m[r + 3 | 0] << 24 | 0;
        k[(l | 0) >> 2] = m[q] | m[q + 1 | 0] << 8 | m[q + 2 | 0] << 16 | m[q + 3 | 0] << 24 | 0;
        k[(l + 4 | 0) >> 2] = r;
        l = n + 8 | 0;
        k[(l | 0) >> 2] = 0;
        k[(l + 4 | 0) >> 2] = 0;
        if (0 < d >>> 0 | 0 == d >>> 0 & 63 < e >>> 0) {
          l = 4;
        } else {
          var u = a, B = d, F = e, l = 7;
        }
        break;
       case 4:
        var E = n, x = n + 8 | 0, H = d, G = e, L = a, l = 5;
        break;
       case 5:
        ol(L, E, j, 5242976);
        var C = (h[x] & 255) + 1 | 0;
        h[x] = C & 255;
        var D = p + 9 | 0, C = (h[D] & 255) + (C >>> 8) | 0;
        h[D] = C & 255;
        D = p + 10 | 0;
        C = (h[D] & 255) + (C >>> 8) | 0;
        h[D] = C & 255;
        D = p + 11 | 0;
        C = (h[D] & 255) + (C >>> 8) | 0;
        h[D] = C & 255;
        D = p + 12 | 0;
        C = (h[D] & 255) + (C >>> 8) | 0;
        h[D] = C & 255;
        D = p + 13 | 0;
        C = (h[D] & 255) + (C >>> 8) | 0;
        h[D] = C & 255;
        D = p + 14 | 0;
        C = (h[D] & 255) + (C >>> 8) | 0;
        h[D] = C & 255;
        D = p + 15 | 0;
        h[D] = ((h[D] & 255) + (C >>> 8) | 0) & 255;
        var D = P(G, H, -64, -1), C = t, Q = L + 64 | 0;
        0 < C >>> 0 | 0 == C >>> 0 & 63 < D >>> 0 ? (H = C, G = D, L = Q, l = 5) : l = 6;
        break;
       case 6:
        0 == (D | 0) & 0 == (C | 0) ? l = 9 : (u = Q, B = C, F = D, l = 7);
        break;
       case 7:
        ol(s | 0, n, j, 5242976);
        var J = 0, l = 8;
        break;
       case 8:
        h[u + J | 0] = h[s + J | 0];
        l = J + 1 | 0;
        q = 0 > (l | 0) ? -1 : 0;
        q >>> 0 < B >>> 0 | q >>> 0 == B >>> 0 & l >>> 0 < F >>> 0 ? (J = l, l = 8) : l = 9;
        break;
       case 9:
        c = g;
        break a;
      }
    }
  }
  c = i;
  return 0;
}
function Hl(a, e, d, f, g, i) {
  var j = c;
  c = c + 32 | 0;
  var l = j | 0;
  nl(l, g, i, 5242992);
  a : {
    var g = g + 16 | 0, n = 0, i = c;
    c = c + 16 | 0;
    for (n = 2; ; ) {
      switch (n) {
       case 2:
        var p = i, s = p, r = c;
        c = c + 64 | 0;
        n = 0 == (d | 0) & 0 == (f | 0) ? 11 : 3;
        break;
       case 3:
        var n = p | 0, q = g, u = q | 0, q = q + 4 | 0, q = m[q] | m[q + 1 | 0] << 8 | m[q + 2 | 0] << 16 | m[q + 3 | 0] << 24 | 0;
        k[(n | 0) >> 2] = m[u] | m[u + 1 | 0] << 8 | m[u + 2 | 0] << 16 | m[u + 3 | 0] << 24 | 0;
        k[(n + 4 | 0) >> 2] = q;
        n = p + 8 | 0;
        k[(n | 0) >> 2] = 0;
        k[(n + 4 | 0) >> 2] = 0;
        if (0 < f >>> 0 | 0 == f >>> 0 & 63 < d >>> 0) {
          n = 4;
        } else {
          var B = a, F = f, E = d, x = e, n = 9;
        }
        break;
       case 4:
        var H = r | 0, G = p, L = p + 8 | 0, C = e, D = f, Q = d, J = a, n = 5;
        break;
       case 5:
        ol(H, G, l, 5242960);
        var fa = 0, n = 6;
        break;
       case 6:
        h[J + fa | 0] = h[r + fa | 0] ^ h[C + fa | 0];
        n = fa + 1 | 0;
        64 == (n | 0) ? n = 7 : (fa = n, n = 6);
        break;
       case 7:
        var K = (h[L] & 255) + 1 | 0;
        h[L] = K & 255;
        var N = s + 9 | 0, K = (h[N] & 255) + (K >>> 8) | 0;
        h[N] = K & 255;
        N = s + 10 | 0;
        K = (h[N] & 255) + (K >>> 8) | 0;
        h[N] = K & 255;
        N = s + 11 | 0;
        K = (h[N] & 255) + (K >>> 8) | 0;
        h[N] = K & 255;
        N = s + 12 | 0;
        K = (h[N] & 255) + (K >>> 8) | 0;
        h[N] = K & 255;
        N = s + 13 | 0;
        K = (h[N] & 255) + (K >>> 8) | 0;
        h[N] = K & 255;
        N = s + 14 | 0;
        K = (h[N] & 255) + (K >>> 8) | 0;
        h[N] = K & 255;
        N = s + 15 | 0;
        h[N] = ((h[N] & 255) + (K >>> 8) | 0) & 255;
        var N = P(Q, D, -64, -1), K = t, ja = J + 64 | 0, U = C + 64 | 0;
        0 < K >>> 0 | 0 == K >>> 0 & 63 < N >>> 0 ? (C = U, D = K, Q = N, J = ja, n = 5) : n = 8;
        break;
       case 8:
        0 == (N | 0) & 0 == (K | 0) ? n = 11 : (B = ja, F = K, E = N, x = U, n = 9);
        break;
       case 9:
        ol(r | 0, p, l, 5242960);
        var sa = 0, n = 10;
        break;
       case 10:
        h[B + sa | 0] = h[r + sa | 0] ^ h[x + sa | 0];
        n = sa + 1 | 0;
        u = 0 > (n | 0) ? -1 : 0;
        u >>> 0 < F >>> 0 | u >>> 0 == F >>> 0 & n >>> 0 < E >>> 0 ? (sa = n, n = 10) : n = 11;
        break;
       case 11:
        c = i;
        break a;
      }
    }
  }
  c = j;
  return 0;
}
function os(a, e) {
  return ((((h[e + 1 | 0] ^ h[a + 1 | 0] | h[e] ^ h[a] | h[e + 2 | 0] ^ h[a + 2 | 0] | h[e + 3 | 0] ^ h[a + 3 | 0] | h[e + 4 | 0] ^ h[a + 4 | 0] | h[e + 5 | 0] ^ h[a + 5 | 0] | h[e + 6 | 0] ^ h[a + 6 | 0] | h[e + 7 | 0] ^ h[a + 7 | 0] | h[e + 8 | 0] ^ h[a + 8 | 0] | h[e + 9 | 0] ^ h[a + 9 | 0] | h[e + 10 | 0] ^ h[a + 10 | 0] | h[e + 11 | 0] ^ h[a + 11 | 0] | h[e + 12 | 0] ^ h[a + 12 | 0] | h[e + 13 | 0] ^ h[a + 13 | 0] | h[e + 14 | 0] ^ h[a + 14 | 0] | h[e + 15 | 0] ^ h[a + 15 | 0] | h[e + 16 | 0] ^ h[a + 16 | 0] | h[e + 17 | 0] ^ h[a + 17 | 0] | h[e + 18 | 0] ^ h[a + 18 | 0] | h[e + 19 | 0] ^ h[a + 19 | 0] | h[e + 20 | 0] ^ h[a + 20 | 0] | h[e + 21 | 0] ^ h[a + 21 | 0] | h[e + 22 | 0] ^ h[a + 22 | 0] | h[e + 23 | 0] ^ h[a + 23 | 0] | h[e + 24 | 0] ^ h[a + 24 | 0] | h[e + 25 | 0] ^ h[a + 25 | 0] | h[e + 26 | 0] ^ h[a + 26 | 0] | h[e + 27 | 0] ^ h[a + 27 | 0] | h[e + 28 | 0] ^ h[a + 28 | 0] | h[e + 29 | 0] ^ h[a + 29 | 0] | h[e + 30 | 0] ^ h[a + 30 | 0] | h[e + 31 | 0] ^ h[a + 31 | 0]) & 255) + 511 | 0) >>> 8 & 1) - 1 | 0;
}
function P(a, e, d, f) {
  var a = a | 0, g = 0, i = 0, g = a + (d | 0) >>> 0, i = (e | 0) + (f | 0) >>> 0;
  g >>> 0 < a >>> 0 && (i = i + 1 >>> 0);
  return t = i, g | 0;
}
Module._crypto_sign_keypair_from_raw_sk = (function(a, e) {
  var d = c;
  c = c + 640 | 0;
  var f = d + 128;
  h[e] &= -8;
  var g = e + 31 | 0;
  h[g] = h[g] & 63 | 64;
  ls(d, e);
  ks(f, d);
  es(a, f);
  c = d;
  return 0;
});
Module._crypto_auth_hmacsha512256 = jl;
Module._crypto_auth_hmacsha512256_verify = (function(a, e, d, f, g) {
  var i = c;
  c = c + 32 | 0;
  var j = i | 0;
  jl(j, e, d, f, g);
  a = os(a, j);
  c = i;
  return a;
});
Module._crypto_box_curve25519xsalsa20poly1305_afternm = (function(a, e, d, f, g, i) {
  return Gl(a, e, d, f, g, i);
});
Module._crypto_box_curve25519xsalsa20poly1305_open_afternm = (function(a, e, d, f, g, i) {
  return Il(a, e, d, f, g, i);
});
Module._crypto_box_curve25519xsalsa20poly1305_beforenm = ll;
Module._crypto_box_curve25519xsalsa20poly1305 = (function(a, e, d, f, g, i, j) {
  var l = c;
  c = c + 32 | 0;
  var n = l | 0;
  ll(n, i, j);
  a = Gl(a, e, d, f, g, n);
  c = l;
  return a;
});
Module._crypto_box_curve25519xsalsa20poly1305_open = (function(a, e, d, f, g, i, j) {
  var l = c;
  c = c + 32 | 0;
  var n = l | 0;
  ll(n, i, j);
  a = Il(a, e, d, f, g, n);
  c = l;
  return a;
});
Module._crypto_box_curve25519xsalsa20poly1305_keypair = (function(a, e) {
  Uk(e, 32, 0);
  wl(a, e);
  return 0;
});
Module._crypto_hash_sha512 = pl;
Module._crypto_hashblocks_sha512 = kl;
Module._crypto_onetimeauth_poly1305 = tl;
Module._crypto_onetimeauth_poly1305_verify = vl;
Module._crypto_scalarmult_curve25519_base = wl;
Module._crypto_secretbox_xsalsa20poly1305 = Gl;
Module._crypto_secretbox_xsalsa20poly1305_open = Il;
Module._crypto_sign_edwards25519sha512batch_keypair = (function(a, e) {
  var d = c;
  c = c + 640 | 0;
  var f = d + 128;
  Uk(e, 32, 0);
  pl(e, e, 32, 0);
  h[e] &= -8;
  var g = e + 31 | 0;
  h[g] = h[g] & 63 | 64;
  ls(d, e);
  ks(f, d);
  es(a, f);
  c = d;
  return 0;
});
Module._crypto_sign_edwards25519sha512batch = (function(a, e, d, f, g, i) {
  var j = 0, l = c;
  c = c + 928 | 0;
  for (j = 2; ; ) {
    switch (j) {
     case 2:
      var n = l, p = l + 128, s = l + 256, r = l + 384, q = l + 896, u = q | 0, B = c;
      c = c + 32 | 0;
      var F = B | 0, E = c, x = c = c + 64 | 0;
      c = c + 64 | 0;
      var j = P(f, g, 64, 0), H = t;
      k[(e | 0) >> 2] = j;
      k[(e + 4 | 0) >> 2] = H;
      if (0 == (f | 0) & 0 == (g | 0)) {
        var G = 0, L = 0, j = 4;
      } else {
        var C = 0, D = 0, j = 3;
      }
      break;
     case 3:
      j = h[d + D | 0];
      H = P(D, C, 32, 0);
      h[a + H | 0] = j;
      j = P(D, C, 1, 0);
      H = t;
      H >>> 0 < g >>> 0 | H >>> 0 == g >>> 0 & j >>> 0 < f >>> 0 ? (C = H, D = j, j = 3) : (L = G = 0, j = 4);
      break;
     case 4:
      j = P(L, G, 32, 0);
      h[a + L | 0] = h[i + j | 0];
      j = P(L, G, 1, 0);
      H = t;
      0 > H >>> 0 | 0 == H >>> 0 & 32 > j >>> 0 ? (G = H, L = j, j = 4) : j = 5;
      break;
     case 5:
      E |= 0;
      e = P(f, g, 32, 0);
      d = t;
      pl(E, a, e, d);
      ns(n, E);
      ks(r, n);
      es(q | 0, r);
      I(a, u, 32);
      r = x | 0;
      pl(r, a, e, d);
      ns(p, r);
      a : {
        q = r = p;
        x = 0;
        u = c;
        c = c + 256 | 0;
        for (x = 2; ; ) {
          switch (x) {
           case 2:
            var Q = u;
            Vk(Q, 0, 256);
            var J = 0, x = 3;
            break;
           case 3:
            var fa = k[(q + (J << 2) | 0) >> 2], K = 0, x = 4;
            break;
           case 4:
            x = Q + ((K + J | 0) << 2) | 0;
            k[x >> 2] = k[x >> 2] + Math.g(k[(n + (K << 2) | 0) >> 2], fa) | 0;
            x = K + 1 | 0;
            32 == (x | 0) ? x = 5 : (K = x, x = 4);
            break;
           case 5:
            x = J + 1 | 0;
            if (32 == (x | 0)) {
              var N = 0, x = 6;
            } else {
              J = x, x = 3;
            }
            break;
           case 6:
            x = Q + (N << 2) | 0;
            e = N + 1 | 0;
            d = Q + (e << 2) | 0;
            k[d >> 2] = k[d >> 2] + (k[x >> 2] >>> 8) | 0;
            k[x >> 2] &= 255;
            63 == (e | 0) ? x = 7 : (N = e, x = 6);
            break;
           case 7:
            ms(r, Q | 0);
            c = u;
            break a;
          }
        }
      }
      ls(s, i);
      a : {
        Q = i = p;
        J = 0;
        for (J = 2; ; ) {
          switch (J) {
           case 2:
            var ja = 0, J = 3;
            break;
           case 3:
            k[(i + (ja << 2) | 0) >> 2] = k[(s + (ja << 2) | 0) >> 2] + k[(Q + (ja << 2) | 0) >> 2] | 0;
            J = ja + 1 | 0;
            if (32 == (J | 0)) {
              var U = 0, J = 4;
            } else {
              ja = J, J = 3;
            }
            break;
           case 4:
            J = i + (U << 2) | 0;
            fa = U + 1 | 0;
            K = i + (fa << 2) | 0;
            k[K >> 2] = k[K >> 2] + (k[J >> 2] >>> 8) | 0;
            k[J >> 2] &= 255;
            31 == (fa | 0) ? J = 5 : (U = fa, J = 4);
            break;
           case 5:
            as(i);
            break a;
          }
        }
      }
      $r(B | 0, p);
      f = P(f, g, 32, 0);
      I(a + f | 0, F, 32);
      c = l;
      return 0;
    }
  }
});
Module._crypto_sign_edwards25519sha512batch_open = (function(a, e, d, f, g, i) {
  var j = 0, l = c;
  c = c + 1920 | 0;
  for (j = 2; ; ) {
    switch (j) {
     case 2:
      var n = l, p = l + 32, s = l + 64, r = l + 576, q = l + 1088, u = l + 1600, B = l + 1728, F = l + 1856;
      if (0 == (ds(s, d) | 0)) {
        j = 3;
      } else {
        var E = -1, j = 7;
      }
      break;
     case 3:
      0 == (ds(q, i) | 0) ? j = 4 : (E = -1, j = 7);
      break;
     case 4:
      var x = F | 0, H = P(f, g, -32, -1);
      pl(x, d, H, t);
      ns(u, x);
      js(s, s, u);
      var G = x = s, L = q, j = c;
      c = c + 512 | 0;
      fs(j, G, L);
      gs(x, j);
      c = j;
      x = n | 0;
      es(x, s);
      ls(B, d + H | 0);
      ks(r, B);
      H = p | 0;
      es(H, r);
      G = P(f, g, -64, -1);
      L = t;
      if (0 == (G | 0) & 0 == (L | 0)) {
        j = 6;
      } else {
        var C = 0, j = 5;
      }
      break;
     case 5:
      h[a + C | 0] = h[d + (C + 32 | 0) | 0];
      var j = C + 1 | 0, D = 0 > (j | 0) ? -1 : 0;
      D >>> 0 < L >>> 0 | D >>> 0 == L >>> 0 & j >>> 0 < G >>> 0 ? (C = j, j = 5) : j = 6;
      break;
     case 6:
      k[(e | 0) >> 2] = G;
      k[(e + 4 | 0) >> 2] = L;
      E = os(x, H);
      j = 7;
      break;
     case 7:
      return c = l, E;
    }
  }
});
Module._crypto_stream_xsalsa20 = Jl;
Module._crypto_stream_xsalsa20_xor = Hl;
var ul;
function X(a, e) {
  a != la && ("number" == typeof a ? this.k(a) : e == la && "string" != typeof a ? this.h(a, 256) : this.h(a, e));
}
function ps() {
  return new X(la);
}
function qs(a, e) {
  var d = rs[a.charCodeAt(e)];
  return d == la ? -1 : d;
}
function ss(a) {
  var e = ps();
  e.s(a);
  return e;
}
function Y(a, e) {
  this.d = a | 0;
  this.e = e | 0;
}
Y.P = {};
Y.s = (function(a) {
  if (-128 <= a && 128 > a) {
    var e = Y.P[a];
    if (e) {
      return e;
    }
  }
  e = new Y(a | 0, 0 > a ? -1 : 0);
  -128 <= a && 128 > a && (Y.P[a] = e);
  return e;
});
Y.k = (function(a) {
  return isNaN(a) || !isFinite(a) ? Y.ZERO : a <= -Y.R ? Y.MIN_VALUE : a + 1 >= Y.R ? Y.MAX_VALUE : 0 > a ? Y.k(-a).f() : new Y(a % Y.q | 0, a / Y.q | 0);
});
Y.o = (function(a, e) {
  return new Y(a, e);
});
Y.h = (function(a, e) {
  if (0 == a.length) {
    throw Error("number format error: empty string");
  }
  var d = e || 10;
  if (2 > d || 36 < d) {
    throw Error("radix out of range: " + d);
  }
  if ("-" == a.charAt(0)) {
    return Y.h(a.substring(1), d).f();
  }
  if (0 <= a.indexOf("-")) {
    throw Error('number format error: interior "-" character: ' + a);
  }
  for (var f = Y.k(Math.pow(d, 8)), g = Y.ZERO, i = 0; i < a.length; i += 8) {
    var j = Math.min(8, a.length - i), l = parseInt(a.substring(i, i + j), d);
    8 > j ? (j = Y.k(Math.pow(d, j)), g = g.multiply(j).add(Y.k(l))) : (g = g.multiply(f), g = g.add(Y.k(l)));
  }
  return g;
});
Y.F = 65536;
Y.xa = 16777216;
Y.q = Y.F * Y.F;
Y.ya = Y.q / 2;
Y.za = Y.q * Y.F;
Y.ea = Y.q * Y.q;
Y.R = Y.ea / 2;
Y.ZERO = Y.s(0);
Y.ONE = Y.s(1);
Y.Q = Y.s(-1);
Y.MAX_VALUE = Y.o(-1, 2147483647);
Y.MIN_VALUE = Y.o(0, -2147483648);
Y.da = Y.s(16777216);
b = Y.prototype;
b.C = (function() {
  return this.e * Y.q + this.ka();
});
b.toString = (function(a) {
  a = a || 10;
  if (2 > a || 36 < a) {
    throw Error("radix out of range: " + a);
  }
  if (this.t()) {
    return "0";
  }
  if (this.i()) {
    if (this.j(Y.MIN_VALUE)) {
      var e = Y.k(a), d = this.n(e), e = d.multiply(e).p(this);
      return d.toString(a) + e.d.toString(a);
    }
    return "-" + this.f().toString(a);
  }
  for (var d = Y.k(Math.pow(a, 6)), e = this, f = ""; ; ) {
    var g = e.n(d), i = e.p(g.multiply(d)).d.toString(a), e = g;
    if (e.t()) {
      return i + f;
    }
    for (; 6 > i.length; ) {
      i = "0" + i;
    }
    f = "" + i + f;
  }
});
b.ka = (function() {
  return 0 <= this.d ? this.d : Y.q + this.d;
});
b.t = (function() {
  return 0 == this.e && 0 == this.d;
});
b.i = (function() {
  return 0 > this.e;
});
b.X = (function() {
  return 1 == (this.d & 1);
});
b.j = (function(a) {
  return this.e == a.e && this.d == a.d;
});
b.Z = (function() {
  return 0 > this.J(Y.da);
});
b.la = (function(a) {
  return 0 < this.J(a);
});
b.ma = (function(a) {
  return 0 <= this.J(a);
});
b.J = (function(a) {
  if (this.j(a)) {
    return 0;
  }
  var e = this.i(), d = a.i();
  return e && !d ? -1 : !e && d ? 1 : this.p(a).i() ? -1 : 1;
});
b.f = (function() {
  return this.j(Y.MIN_VALUE) ? Y.MIN_VALUE : this.oa().add(Y.ONE);
});
b.add = (function(a) {
  var e = this.e >>> 16, d = this.e & 65535, f = this.d >>> 16, g = a.e >>> 16, i = a.e & 65535, j = a.d >>> 16, l;
  l = 0 + ((this.d & 65535) + (a.d & 65535));
  a = 0 + (l >>> 16);
  a += f + j;
  f = 0 + (a >>> 16);
  f += d + i;
  d = 0 + (f >>> 16);
  d = d + (e + g) & 65535;
  return Y.o((a & 65535) << 16 | l & 65535, d << 16 | f & 65535);
});
b.p = (function(a) {
  return this.add(a.f());
});
b.multiply = (function(a) {
  if (this.t() || a.t()) {
    return Y.ZERO;
  }
  if (this.j(Y.MIN_VALUE)) {
    return a.X() ? Y.MIN_VALUE : Y.ZERO;
  }
  if (a.j(Y.MIN_VALUE)) {
    return this.X() ? Y.MIN_VALUE : Y.ZERO;
  }
  if (this.i()) {
    return a.i() ? this.f().multiply(a.f()) : this.f().multiply(a).f();
  }
  if (a.i()) {
    return this.multiply(a.f()).f();
  }
  if (this.Z() && a.Z()) {
    return Y.k(this.C() * a.C());
  }
  var e = this.e >>> 16, d = this.e & 65535, f = this.d >>> 16, g = this.d & 65535, i = a.e >>> 16, j = a.e & 65535, l = a.d >>> 16, a = a.d & 65535, n, p, s, r;
  r = 0 + g * a;
  s = 0 + (r >>> 16);
  s += f * a;
  p = 0 + (s >>> 16);
  s = (s & 65535) + g * l;
  p += s >>> 16;
  s &= 65535;
  p += d * a;
  n = 0 + (p >>> 16);
  p = (p & 65535) + f * l;
  n += p >>> 16;
  p &= 65535;
  p += g * j;
  n += p >>> 16;
  p &= 65535;
  n = n + (e * a + d * l + f * j + g * i) & 65535;
  return Y.o(s << 16 | r & 65535, n << 16 | p);
});
b.n = (function(a) {
  if (a.t()) {
    throw Error("division by zero");
  }
  if (this.t()) {
    return Y.ZERO;
  }
  if (this.j(Y.MIN_VALUE)) {
    if (a.j(Y.ONE) || a.j(Y.Q)) {
      return Y.MIN_VALUE;
    }
    if (a.j(Y.MIN_VALUE)) {
      return Y.ONE;
    }
    var e = this.ta().n(a).shiftLeft(1);
    if (e.j(Y.ZERO)) {
      return a.i() ? Y.ONE : Y.Q;
    }
    var d = this.p(a.multiply(e));
    return e.add(d.n(a));
  }
  if (a.j(Y.MIN_VALUE)) {
    return Y.ZERO;
  }
  if (this.i()) {
    return a.i() ? this.f().n(a.f()) : this.f().n(a).f();
  }
  if (a.i()) {
    return this.n(a.f()).f();
  }
  for (var f = Y.ZERO, d = this; d.ma(a); ) {
    for (var e = Math.max(1, Math.floor(d.C() / a.C())), g = Math.ceil(Math.log(e) / Math.LN2), g = 48 >= g ? 1 : Math.pow(2, g - 48), i = Y.k(e), j = i.multiply(a); j.i() || j.la(d); ) {
      e -= g, i = Y.k(e), j = i.multiply(a);
    }
    i.t() && (i = Y.ONE);
    f = f.add(i);
    d = d.p(j);
  }
  return f;
});
b.aa = (function(a) {
  return this.p(this.n(a).multiply(a));
});
b.oa = (function() {
  return Y.o(~this.d, ~this.e);
});
b.shiftLeft = (function(a) {
  a &= 63;
  if (0 == a) {
    return this;
  }
  var e = this.d;
  return 32 > a ? Y.o(e << a, this.e << a | e >>> 32 - a) : Y.o(0, e << a - 32);
});
b.ta = (function() {
  var a;
  a = 1;
  if (0 == a) {
    return this;
  }
  var e = this.e;
  return 32 > a ? Y.o(this.d >>> a | e << 32 - a, e >> a) : Y.o(e >> a - 32, 0 <= e ? 0 : -1);
});
b = X.prototype;
b.H = (function(a, e, d, f) {
  for (var g = 0, i = 0; 0 <= --f; ) {
    var j = a * this[g++] + e[d] + i, i = Math.floor(j / 67108864);
    e[d++] = j & 67108863;
  }
  return i;
});
b.c = 26;
b.m = 67108863;
b.w = 67108864;
b.ca = Math.pow(2, 52);
b.N = 26;
b.O = 0;
var rs = [], ts, us;
ts = 48;
for (us = 0; 9 >= us; ++us) {
  rs[ts++] = us;
}
ts = 97;
for (us = 10; 36 > us; ++us) {
  rs[ts++] = us;
}
ts = 65;
for (us = 10; 36 > us; ++us) {
  rs[ts++] = us;
}
b = X.prototype;
b.copyTo = (function(a) {
  for (var e = this.a - 1; 0 <= e; --e) {
    a[e] = this[e];
  }
  a.a = this.a;
  a.b = this.b;
});
b.s = (function(a) {
  this.a = 1;
  this.b = 0 > a ? -1 : 0;
  0 < a ? this[0] = a : -1 > a ? this[0] = a + DV : this.a = 0;
});
b.h = (function(a, e) {
  var d;
  if (16 == e) {
    d = 4;
  } else {
    if (8 == e) {
      d = 3;
    } else {
      if (256 == e) {
        d = 8;
      } else {
        if (2 == e) {
          d = 1;
        } else {
          if (32 == e) {
            d = 5;
          } else {
            if (4 == e) {
              d = 2;
            } else {
              this.ia(a, e);
              return;
            }
          }
        }
      }
    }
  }
  this.b = this.a = 0;
  for (var f = a.length, g = oa, i = 0; 0 <= --f; ) {
    var j = 8 == d ? a[f] & 255 : qs(a, f);
    0 > j ? "-" == a.charAt(f) && (g = ea) : (g = oa, 0 == i ? this[this.a++] = j : i + d > this.c ? (this[this.a - 1] |= (j & (1 << this.c - i) - 1) << i, this[this.a++] = j >> this.c - i) : this[this.a - 1] |= j << i, i += d, i >= this.c && (i -= this.c));
  }
  8 == d && 0 != (a[0] & 128) && (this.b = -1, 0 < i && (this[this.a - 1] |= (1 << this.c - i) - 1 << i));
  this.r();
  g && X.ZERO.l(this, this);
});
b.r = (function() {
  for (var a = this.b & this.m; 0 < this.a && this[this.a - 1] == a; ) {
    --this.a;
  }
});
b.K = (function(a, e) {
  var d;
  for (d = this.a - 1; 0 <= d; --d) {
    e[d + a] = this[d];
  }
  for (d = a - 1; 0 <= d; --d) {
    e[d] = 0;
  }
  e.a = this.a + a;
  e.b = this.b;
});
b.ga = (function(a, e) {
  for (var d = a; d < this.a; ++d) {
    e[d - a] = this[d];
  }
  e.a = Math.max(this.a - a, 0);
  e.b = this.b;
});
b.Y = (function(a, e) {
  var d = a % this.c, f = this.c - d, g = (1 << f) - 1, i = Math.floor(a / this.c), j = this.b << d & this.m, l;
  for (l = this.a - 1; 0 <= l; --l) {
    e[l + i + 1] = this[l] >> f | j, j = (this[l] & g) << d;
  }
  for (l = i - 1; 0 <= l; --l) {
    e[l] = 0;
  }
  e[i] = j;
  e.a = this.a + i + 1;
  e.b = this.b;
  e.r();
});
b.ra = (function(a, e) {
  e.b = this.b;
  var d = Math.floor(a / this.c);
  if (d >= this.a) {
    e.a = 0;
  } else {
    var f = a % this.c, g = this.c - f, i = (1 << f) - 1;
    e[0] = this[d] >> f;
    for (var j = d + 1; j < this.a; ++j) {
      e[j - d - 1] |= (this[j] & i) << g, e[j - d] = this[j] >> f;
    }
    0 < f && (e[this.a - d - 1] |= (this.b & i) << g);
    e.a = this.a - d;
    e.r();
  }
});
b.l = (function(a, e) {
  for (var d = 0, f = 0, g = Math.min(a.a, this.a); d < g; ) {
    f += this[d] - a[d], e[d++] = f & this.m, f >>= this.c;
  }
  if (a.a < this.a) {
    for (f -= a.b; d < this.a; ) {
      f += this[d], e[d++] = f & this.m, f >>= this.c;
    }
    f += this.b;
  } else {
    for (f += this.b; d < a.a; ) {
      f -= a[d], e[d++] = f & this.m, f >>= this.c;
    }
    f -= a.b;
  }
  e.b = 0 > f ? -1 : 0;
  -1 > f ? e[d++] = this.w + f : 0 < f && (e[d++] = f);
  e.a = d;
  e.r();
});
b.na = (function(a) {
  var e = LK.D, d = this.abs(), f = e.abs(), g = d.a;
  for (a.a = g + f.a; 0 <= --g; ) {
    a[g] = 0;
  }
  for (g = 0; g < f.a; ++g) {
    a[g + d.a] = d.H(f[g], a, g, d.a);
  }
  a.b = 0;
  a.r();
  this.b != e.b && X.ZERO.l(a, a);
});
b.u = (function(a, e, d) {
  var f = a.abs();
  if (!(0 >= f.a)) {
    var g = this.abs();
    if (g.a < f.a) {
      e != la && e.s(0), d != la && this.copyTo(d);
    } else {
      d == la && (d = ps());
      var i = ps(), j = this.b, a = a.b, l = f[f.a - 1], n = 1, p;
      if (0 != (p = l >>> 16)) {
        l = p, n += 16;
      }
      if (0 != (p = l >> 8)) {
        l = p, n += 8;
      }
      if (0 != (p = l >> 4)) {
        l = p, n += 4;
      }
      if (0 != (p = l >> 2)) {
        l = p, n += 2;
      }
      0 != l >> 1 && (n += 1);
      l = this.c - n;
      0 < l ? (f.Y(l, i), g.Y(l, d)) : (f.copyTo(i), g.copyTo(d));
      f = i.a;
      g = i[f - 1];
      if (0 != g) {
        p = g * (1 << this.N) + (1 < f ? i[f - 2] >> this.O : 0);
        n = this.ca / p;
        p = (1 << this.N) / p;
        var s = 1 << this.O, r = d.a, q = r - f, u = e == la ? ps() : e;
        i.K(q, u);
        0 <= d.z(u) && (d[d.a++] = 1, d.l(u, d));
        X.ONE.K(f, u);
        for (u.l(i, i); i.a < f; ) {
          i[i.a++] = 0;
        }
        for (; 0 <= --q; ) {
          var B = d[--r] == g ? this.m : Math.floor(d[r] * n + (d[r - 1] + s) * p);
          if ((d[r] += i.H(B, d, q, f)) < B) {
            i.K(q, u);
            for (d.l(u, d); d[r] < --B; ) {
              d.l(u, d);
            }
          }
        }
        e != la && (d.ga(f, e), j != a && X.ZERO.l(e, e));
        d.a = f;
        d.r();
        0 < l && d.ra(l, d);
        0 > j && X.ZERO.l(d, d);
      }
    }
  }
});
b.toString = (function(a) {
  if (0 > this.b) {
    return "-" + this.f().toString(a);
  }
  if (16 == a) {
    a = 4;
  } else {
    if (8 == a) {
      a = 3;
    } else {
      if (2 == a) {
        a = 1;
      } else {
        if (32 == a) {
          a = 5;
        } else {
          if (4 == a) {
            a = 2;
          } else {
            return this.ua(a);
          }
        }
      }
    }
  }
  var e = (1 << a) - 1, d, f = oa, g = "", i = this.a, j = this.c - i * this.c % a;
  if (0 < i--) {
    if (j < this.c && 0 < (d = this[i] >> j)) {
      f = ea, g = "0123456789abcdefghijklmnopqrstuvwxyz".charAt(d);
    }
    for (; 0 <= i; ) {
      j < a ? (d = (this[i] & (1 << j) - 1) << a - j, d |= this[--i] >> (j += this.c - a)) : (d = this[i] >> (j -= a) & e, 0 >= j && (j += this.c, --i)), 0 < d && (f = ea), f && (g += "0123456789abcdefghijklmnopqrstuvwxyz".charAt(d));
    }
  }
  return f ? g : "0";
});
b.f = (function() {
  var a = ps();
  X.ZERO.l(this, a);
  return a;
});
b.abs = (function() {
  return 0 > this.b ? this.f() : this;
});
b.z = (function(a) {
  var e = this.b - a.b;
  if (0 != e) {
    return e;
  }
  var d = this.a, e = d - a.a;
  if (0 != e) {
    return 0 > this.b ? -e : e;
  }
  for (; 0 <= --d; ) {
    if (0 != (e = this[d] - a[d])) {
      return e;
    }
  }
  return 0;
});
X.ZERO = ss(0);
X.ONE = ss(1);
b = X.prototype;
b.ia = (function(a, e) {
  this.s(0);
  e == la && (e = 10);
  for (var d = this.T(e), f = Math.pow(e, d), g = oa, i = 0, j = 0, l = 0; l < a.length; ++l) {
    var n = qs(a, l);
    0 > n ? "-" == a.charAt(l) && 0 == this.L() && (g = ea) : (j = e * j + n, ++i >= d && (this.V(f), this.U(j), j = i = 0));
  }
  0 < i && (this.V(Math.pow(e, i)), this.U(j));
  g && X.ZERO.l(this, this);
});
b.T = (function(a) {
  return Math.floor(Math.LN2 * this.c / Math.log(a));
});
b.L = (function() {
  return 0 > this.b ? -1 : 0 >= this.a || 1 == this.a && 0 >= this[0] ? 0 : 1;
});
b.V = (function(a) {
  this[this.a] = this.H(a - 1, this, 0, this.a);
  ++this.a;
  this.r();
});
b.U = (function(a) {
  var e = 0;
  if (0 != a) {
    for (; this.a <= e; ) {
      this[this.a++] = 0;
    }
    for (this[e] += a; this[e] >= this.w; ) {
      this[e] -= this.w, ++e >= this.a && (this[this.a++] = 0), ++this[e];
    }
  }
});
b.ua = (function(a) {
  a == la && (a = 10);
  if (0 == this.L() || 2 > a || 36 < a) {
    return "0";
  }
  var e = this.T(a), e = Math.pow(a, e), d = ss(e), f = ps(), g = ps(), i = "";
  for (this.u(d, f, g); 0 < f.L(); ) {
    i = (e + g.W()).toString(a).substr(1) + i, f.u(d, f, g);
  }
  return g.W().toString(a) + i;
});
b.W = (function() {
  if (0 > this.b) {
    if (1 == this.a) {
      return this[0] - this.w;
    }
    if (0 == this.a) {
      return -1;
    }
  } else {
    if (1 == this.a) {
      return this[0];
    }
    if (0 == this.a) {
      return 0;
    }
  }
  return (this[1] & (1 << 32 - this.c) - 1) << this.c | this[0];
});
b.G = (function(a, e) {
  for (var d = 0, f = 0, g = Math.min(a.a, this.a); d < g; ) {
    f += this[d] + a[d], e[d++] = f & this.m, f >>= this.c;
  }
  if (a.a < this.a) {
    for (f += a.b; d < this.a; ) {
      f += this[d], e[d++] = f & this.m, f >>= this.c;
    }
    f += this.b;
  } else {
    for (f += this.b; d < a.a; ) {
      f += a[d], e[d++] = f & this.m, f >>= this.c;
    }
    f += a.b;
  }
  e.b = 0 > f ? -1 : 0;
  0 < f ? e[d++] = f : -1 > f && (e[d++] = this.w + f);
  e.a = d;
  e.r();
});
var LK = {
  p: (function(a, e, d, f) {
    a = (new Y(a, e)).p(new Y(d, f));
    k[zk >> 2] = a.d;
    k[zk + 4 >> 2] = a.e;
  }),
  multiply: (function(a, e, d, f) {
    a = (new Y(a, e)).multiply(new Y(d, f));
    k[zk >> 2] = a.d;
    k[zk + 4 >> 2] = a.e;
  }),
  abs: (function(a, e) {
    var d = new Y(a, e), d = d.i() ? d.f() : d;
    k[zk >> 2] = d.d;
    k[zk + 4 >> 2] = d.e;
  }),
  A: (function() {
    LK.ha || (LK.ha = ea, LK.D = new X, LK.D.h("4294967296", 10), LK.M = new X, LK.M.h("18446744073709551616", 10), LK.Fa = new X, LK.Ga = new X);
  }),
  B: (function(a, e) {
    var d = new X;
    d.h(e.toString(), 10);
    var f = new X;
    d.na(f);
    d = new X;
    d.h(a.toString(), 10);
    var g = new X;
    d.G(f, g);
    return g;
  }),
  Aa: (function(a, e, d, f, g) {
    LK.A();
    g ? (a = LK.B(a >>> 0, e >>> 0), f = LK.B(d >>> 0, f >>> 0), d = new X, a.u(f, d, la), f = new X, a = new X, d.u(LK.D, a, f), k[zk >> 2] = parseInt(f.toString()) | 0, k[zk + 4 >> 2] = parseInt(a.toString()) | 0) : (a = new Y(a, e), f = new Y(d, f), d = a.n(f), k[zk >> 2] = d.d, k[zk + 4 >> 2] = d.e);
  }),
  aa: (function(a, e, d, f, g) {
    LK.A();
    g ? (a = LK.B(a >>> 0, e >>> 0), f = LK.B(d >>> 0, f >>> 0), d = new X, a.u(f, la, d), f = new X, a = new X, d.u(LK.D, a, f), k[zk >> 2] = parseInt(f.toString()) | 0, k[zk + 4 >> 2] = parseInt(a.toString()) | 0) : (a = new Y(a, e), f = new Y(d, f), d = a.aa(f), k[zk >> 2] = d.d, k[zk + 4 >> 2] = d.e);
  }),
  stringify: (function(a, e, d) {
    a = (new Y(a, e)).toString();
    d && "-" == a[0] && (LK.A(), d = new X, d.h(a, 10), a = new X, LK.M.G(d, a), a = a.toString(10));
    return a;
  }),
  h: (function(a, e, d, f, g) {
    LK.A();
    var i = new X;
    i.h(a, e);
    a = new X;
    a.h(d, 10);
    d = new X;
    d.h(f, 10);
    g && 0 > i.z(X.ZERO) && (f = new X, i.G(LK.M, f), i = f);
    f = oa;
    0 > i.z(a) ? (i = a, f = ea) : 0 < i.z(d) && (i = d, f = ea);
    i = Y.h(i.toString());
    k[zk >> 2] = i.d;
    k[zk + 4 >> 2] = i.e;
    if (f) {
      throw "range error";
    }
  })
};
ul = LK;
Module.fa = (function(a) {
  function e() {
    for (var a = 0; 3 > a; a++) {
      f.push(0);
    }
  }
  var d = a.length + 1, f = [ A(Ik("/bin/this.program"), "i8", Ak) ];
  e();
  for (var g = 0; g < d - 1; g += 1) {
    f.push(A(Ik(a[g]), "i8", Ak)), e();
  }
  f.push(0);
  var f = A(f, "i32", Ak), i, a = c;
  try {
    i = Module._main(d, f, 0);
  } catch (j) {
    if ("ExitStatus" == j.name) {
      return j.status;
    }
    if ("SimulateInfiniteLoop" == j) {
      Module.noExitRuntime = ea;
    } else {
      throw j;
    }
  } finally {
    c = a;
  }
  return i;
});
function Sk(a) {
  function e() {
    var d = 0;
    Pk = ea;
    Module._main && (Jk(Lk), d = Module.fa(a), Module.noExitRuntime || Jk(Mk));
    if (Module.postRun) {
      for ("function" == typeof Module.postRun && (Module.postRun = [ Module.postRun ]); 0 < Module.postRun.length; ) {
        Module.postRun.pop()();
      }
    }
    return d;
  }
  a = a || Module.arguments;
  if (0 < Nk) {
    return Module.v("run() called, but dependencies remain, so not running"), 0;
  }
  if (Module.preRun) {
    "function" == typeof Module.preRun && (Module.preRun = [ Module.preRun ]);
    var d = Module.preRun;
    Module.preRun = [];
    for (var f = d.length - 1; 0 <= f; f--) {
      d[f]();
    }
    if (0 < Nk) {
      return 0;
    }
  }
  return Module.setStatus ? (Module.setStatus("Running..."), setTimeout((function() {
    setTimeout((function() {
      Module.setStatus("");
    }), 1);
    e();
  }), 1), 0) : e();
}
Module.run = Module.Ea = Sk;
if (Module.preInit) {
  for ("function" == typeof Module.preInit && (Module.preInit = [ Module.preInit ]); 0 < Module.preInit.length; ) {
    Module.preInit.pop()();
  }
}
Jk([]);
var Rk = ea;
Module.noInitialRun && (Rk = oa);
Rk && Sk();
Module._crypto_auth_hmacsha256_BYTES = 32;
Module._crypto_core_salsa2012_INPUTBYTES = 16;
Module._crypto_box_curve25519xsalsa20poly1305_ZEROBYTES = 32;
Module._crypto_core_salsa20_KEYBYTES = 32;
Module._crypto_core_hsalsa20_OUTPUTBYTES = 32;
Module._crypto_sign_edwards25519sha512batch_PUBLICKEYBYTES = 32;
Module._crypto_secretbox_xsalsa20poly1305_ZEROBYTES = 32;
Module._crypto_stream_salsa2012_NONCEBYTES = 8;
Module._crypto_scalarmult_curve25519_SCALARBYTES = 32;
Module._crypto_sign_edwards25519sha512batch_BYTES = 64;
Module._crypto_auth_hmacsha512256_BYTES = 32;
Module._crypto_core_salsa208_INPUTBYTES = 16;
Module._crypto_stream_xsalsa20_KEYBYTES = 32;
Module._crypto_stream_salsa2012_KEYBYTES = 32;
Module._crypto_stream_salsa20_KEYBYTES = 32;
Module._crypto_secretbox_xsalsa20poly1305_BOXZEROBYTES = 16;
Module._crypto_core_salsa20_INPUTBYTES = 16;
Module._crypto_hashblocks_sha256_BLOCKBYTES = 64;
Module._crypto_onetimeauth_poly1305_KEYBYTES = 32;
Module._crypto_auth_hmacsha512256_KEYBYTES = 32;
Module._crypto_hash_sha256_BYTES = 32;
Module._crypto_box_curve25519xsalsa20poly1305_BEFORENMBYTES = 32;
Module._crypto_box_curve25519xsalsa20poly1305_PUBLICKEYBYTES = 32;
Module._crypto_stream_salsa208_NONCEBYTES = 8;
Module._crypto_scalarmult_curve25519_BYTES = 32;
Module._crypto_hashblocks_sha512_STATEBYTES = 64;
Module._crypto_stream_salsa20_NONCEBYTES = 8;
Module._crypto_sign_edwards25519sha512batch_SECRETKEYBYTES = 64;
Module._crypto_core_salsa208_OUTPUTBYTES = 64;
Module._crypto_core_hsalsa20_INPUTBYTES = 16;
Module._crypto_stream_aes128ctr_BEFORENMBYTES = 1408;
Module._crypto_auth_hmacsha256_KEYBYTES = 32;
Module._crypto_verify_32_BYTES = 32;
Module._crypto_verify_16_BYTES = 16;
Module._crypto_box_curve25519xsalsa20poly1305_NONCEBYTES = 24;
Module._crypto_core_salsa2012_KEYBYTES = 32;
Module._crypto_box_curve25519xsalsa20poly1305_BOXZEROBYTES = 16;
Module._crypto_hashblocks_sha256_STATEBYTES = 32;
Module._crypto_secretbox_xsalsa20poly1305_KEYBYTES = 32;
Module._crypto_stream_xsalsa20_NONCEBYTES = 24;
Module._crypto_onetimeauth_poly1305_BYTES = 16;
Module._crypto_box_curve25519xsalsa20poly1305_SECRETKEYBYTES = 32;
Module._crypto_hash_sha512_BYTES = 64;
Module._crypto_core_salsa20_CONSTBYTES = 16;
Module._crypto_core_salsa2012_CONSTBYTES = 16;
Module._crypto_core_salsa2012_OUTPUTBYTES = 64;
Module._crypto_core_salsa20_OUTPUTBYTES = 64;
Module._crypto_core_hsalsa20_CONSTBYTES = 16;
Module._crypto_stream_salsa208_KEYBYTES = 32;
Module._crypto_stream_aes128ctr_NONCEBYTES = 16;
Module._crypto_core_salsa208_CONSTBYTES = 16;
Module._crypto_stream_aes128ctr_KEYBYTES = 16;
Module._crypto_core_hsalsa20_KEYBYTES = 32;
Module._crypto_secretbox_xsalsa20poly1305_NONCEBYTES = 24;
Module._crypto_core_salsa208_KEYBYTES = 32;
Module._crypto_hashblocks_sha512_BLOCKBYTES = 128;
Module._crypto_hash_BYTES = Module._crypto_hash_sha512_BYTES;
Module._crypto_sign = Module._crypto_sign_edwards25519sha512batch;
Module._crypto_stream_xor_afternm = Module._crypto_stream_xsalsa20_xor_afternm;
Module._crypto_box_PUBLICKEYBYTES = Module._crypto_box_curve25519xsalsa20poly1305_PUBLICKEYBYTES;
Module._crypto_box_SECRETKEYBYTES = Module._crypto_box_curve25519xsalsa20poly1305_SECRETKEYBYTES;
Module._crypto_box_open_afternm = Module._crypto_box_curve25519xsalsa20poly1305_open_afternm;
Module._crypto_sign_SECRETKEYBYTES = Module._crypto_sign_edwards25519sha512batch_SECRETKEYBYTES;
Module._crypto_box_beforenm = Module._crypto_box_curve25519xsalsa20poly1305_beforenm;
Module._crypto_secretbox = Module._crypto_secretbox_xsalsa20poly1305;
Module._crypto_hash = Module._crypto_hash_sha512;
Module._crypto_sign_PUBLICKEYBYTES = Module._crypto_sign_edwards25519sha512batch_PUBLICKEYBYTES;
Module._crypto_stream_xor = Module._crypto_stream_xsalsa20_xor;
Module._crypto_box = Module._crypto_box_curve25519xsalsa20poly1305;
Module._crypto_secretbox_ZEROBYTES = Module._crypto_secretbox_xsalsa20poly1305_ZEROBYTES;
Module._crypto_box_ZEROBYTES = Module._crypto_box_curve25519xsalsa20poly1305_ZEROBYTES;
Module._crypto_secretbox_KEYBYTES = Module._crypto_secretbox_xsalsa20poly1305_KEYBYTES;
Module._crypto_stream_beforenm = Module._crypto_stream_xsalsa20_beforenm;
Module._crypto_onetimeauth_verify = Module._crypto_onetimeauth_poly1305_verify;
Module._crypto_box_BOXZEROBYTES = Module._crypto_box_curve25519xsalsa20poly1305_BOXZEROBYTES;
Module._crypto_hashblocks = Module._crypto_hashblocks_sha512;
Module._crypto_stream = Module._crypto_stream_xsalsa20;
Module._crypto_onetimeauth_KEYBYTES = Module._crypto_onetimeauth_poly1305_KEYBYTES;
Module._crypto_box_afternm = Module._crypto_box_curve25519xsalsa20poly1305_afternm;
Module._crypto_secretbox_BOXZEROBYTES = Module._crypto_secretbox_xsalsa20poly1305_BOXZEROBYTES;
Module._crypto_hashblocks_BLOCKBYTES = Module._crypto_hashblocks_sha512_BLOCKBYTES;
Module._crypto_box_keypair = Module._crypto_box_curve25519xsalsa20poly1305_keypair;
Module._crypto_auth = Module._crypto_auth_hmacsha512256;
Module._crypto_box_BEFORENMBYTES = Module._crypto_box_curve25519xsalsa20poly1305_BEFORENMBYTES;
Module._crypto_secretbox_NONCEBYTES = Module._crypto_secretbox_xsalsa20poly1305_NONCEBYTES;
Module._crypto_stream_KEYBYTES = Module._crypto_stream_xsalsa20_KEYBYTES;
Module._crypto_box_NONCEBYTES = Module._crypto_box_curve25519xsalsa20poly1305_NONCEBYTES;
Module._crypto_auth_verify = Module._crypto_auth_hmacsha512256_verify;
Module._crypto_secretbox_open = Module._crypto_secretbox_xsalsa20poly1305_open;
Module._crypto_sign_BYTES = Module._crypto_sign_edwards25519sha512batch_BYTES;
Module._crypto_hashblocks_STATEBYTES = Module._crypto_hashblocks_sha512_STATEBYTES;
Module._crypto_auth_BYTES = Module._crypto_auth_hmacsha512256_BYTES;
Module._crypto_stream_BEFORENMBYTES = Module._crypto_stream_xsalsa20_BEFORENMBYTES;
Module._crypto_auth_KEYBYTES = Module._crypto_auth_hmacsha512256_KEYBYTES;
Module._crypto_stream_afternm = Module._crypto_stream_xsalsa20_afternm;
Module._crypto_sign_keypair = Module._crypto_sign_edwards25519sha512batch_keypair;
Module._crypto_sign_open = Module._crypto_sign_edwards25519sha512batch_open;
Module._crypto_onetimeauth_BYTES = Module._crypto_onetimeauth_poly1305_BYTES;
Module._crypto_box_open = Module._crypto_box_curve25519xsalsa20poly1305_open;
Module._crypto_stream_NONCEBYTES = Module._crypto_stream_xsalsa20_NONCEBYTES;
Module._crypto_onetimeauth = Module._crypto_onetimeauth_poly1305;
var nacl = (function () {
    'use strict';
    var exports = {};

    //---------------------------------------------------------------------------
    // Horrifying UTF-8 and hex codecs

    function encode_utf8(s) {
	return encode_latin1(unescape(encodeURIComponent(s)));
    }

    function encode_latin1(s) {
	var result = new Uint8Array(s.length);
	for (var i = 0; i < s.length; i++) {
	    var c = s.charCodeAt(i);
	    if ((c & 0xff) !== c) throw {message: "Cannot encode string in Latin1", str: s};
	    result[i] = (c & 0xff);
	}
	return result;
    }

    function decode_utf8(bs) {
	return decodeURIComponent(escape(decode_latin1(bs)));
    }

    function decode_latin1(bs) {
	var encoded = [];
	for (var i = 0; i < bs.length; i++) {
	    encoded.push(String.fromCharCode(bs[i]));
	}
	return encoded.join('');
    }

    function to_hex(bs) {
	var encoded = [];
	for (var i = 0; i < bs.length; i++) {
	    encoded.push("0123456789abcdef"[(bs[i] >> 4) & 15]);
	    encoded.push("0123456789abcdef"[bs[i] & 15]);
	}
	return encoded.join('');
    }

    //---------------------------------------------------------------------------

    function injectBytes(bs, leftPadding) {
	var p = leftPadding || 0;
	var address = nacl_raw._malloc(bs.length + p);
	nacl_raw.HEAPU8.set(bs, address + p);
	for (var i = address; i < address + p; i++) {
	    nacl_raw.HEAPU8[i] = 0;
	}
	return address;
    }

    function check_injectBytes(function_name, what, thing, expected_length, leftPadding) {
	check_length(function_name, what, thing, expected_length);
	return injectBytes(thing, leftPadding);
    }

    function extractBytes(address, length) {
	var result = new Uint8Array(length);
	result.set(nacl_raw.HEAPU8.subarray(address, address + length));
	return result;
    }

    //---------------------------------------------------------------------------

    function check(function_name, result) {
	if (result !== 0) {
	    throw {message: "nacl_raw." + function_name + " signalled an error"};
	}
    }

    function check_length(function_name, what, thing, expected_length) {
	if (thing.length !== expected_length) {
	    throw {message: "nacl." + function_name + " expected " +
	           expected_length + "-byte " + what + " but got length " + thing.length};
	}
    }

    function Target(length) {
	this.length = length;
	this.address = nacl_raw._malloc(length);
    }

    Target.prototype.extractBytes = function (offset) {
	var result = extractBytes(this.address + (offset || 0), this.length - (offset || 0));
	nacl_raw._free(this.address);
	this.address = null;
	return result;
    };

    function free_all(addresses) {
	for (var i = 0; i < addresses.length; i++) {
	    nacl_raw._free(addresses[i]);
	}
    }

    //---------------------------------------------------------------------------
    // Boxing

    function crypto_box_keypair() {
	var pk = new Target(nacl_raw._crypto_box_PUBLICKEYBYTES);
	var sk = new Target(nacl_raw._crypto_box_SECRETKEYBYTES);
	check("_crypto_box_keypair", nacl_raw._crypto_box_keypair(pk.address, sk.address));
	return {boxPk: pk.extractBytes(), boxSk: sk.extractBytes()};
    }

    function crypto_box_random_nonce() {
	return nacl_raw.RandomBytes.crypto.randomBytes(nacl_raw._crypto_box_NONCEBYTES);
    }

    function crypto_box(msg, nonce, pk, sk) {
	var m = injectBytes(msg, nacl_raw._crypto_box_ZEROBYTES);
	var na = check_injectBytes("crypto_box", "nonce", nonce, nacl_raw._crypto_box_NONCEBYTES);
	var pka = check_injectBytes("crypto_box", "pk", pk, nacl_raw._crypto_box_PUBLICKEYBYTES);
	var ska = check_injectBytes("crypto_box", "sk", sk, nacl_raw._crypto_box_SECRETKEYBYTES);
	var c = new Target(msg.length + nacl_raw._crypto_box_ZEROBYTES);
	check("_crypto_box", nacl_raw._crypto_box(c.address, m, c.length, 0, na, pka, ska));
	free_all([m, na, pka, ska]);
	return c.extractBytes(nacl_raw._crypto_box_BOXZEROBYTES);
    }

    function crypto_box_open(ciphertext, nonce, pk, sk) {
	var c = injectBytes(ciphertext, nacl_raw._crypto_box_BOXZEROBYTES);
	var na = check_injectBytes("crypto_box_open",
				   "nonce", nonce, nacl_raw._crypto_box_NONCEBYTES);
	var pka = check_injectBytes("crypto_box_open",
				    "pk", pk, nacl_raw._crypto_box_PUBLICKEYBYTES);
	var ska = check_injectBytes("crypto_box_open",
				    "sk", sk, nacl_raw._crypto_box_SECRETKEYBYTES);
	var m = new Target(ciphertext.length + nacl_raw._crypto_box_BOXZEROBYTES);
	check("_crypto_box_open", nacl_raw._crypto_box_open(m.address, c, m.length, 0, na, pka, ska));
	free_all([c, na, pka, ska]);
	return m.extractBytes(nacl_raw._crypto_box_ZEROBYTES);
    }

    function crypto_box_precompute(pk, sk) {
	var pka = check_injectBytes("crypto_box_precompute",
				    "pk", pk, nacl_raw._crypto_box_PUBLICKEYBYTES);
	var ska = check_injectBytes("crypto_box_precompute",
				    "sk", sk, nacl_raw._crypto_box_SECRETKEYBYTES);
	var k = new Target(nacl_raw._crypto_box_BEFORENMBYTES);
	check("_crypto_box_beforenm",
	      nacl_raw._crypto_box_beforenm(k.address, pka, ska));
	free_all([pka, ska]);
	return {boxK: k.extractBytes()};
    }

    function crypto_box_precomputed(msg, nonce, state) {
	var m = injectBytes(msg, nacl_raw._crypto_box_ZEROBYTES);
	var na = check_injectBytes("crypto_box_precomputed",
				   "nonce", nonce, nacl_raw._crypto_box_NONCEBYTES);
	var ka = check_injectBytes("crypto_box_precomputed",
				   "boxK", state.boxK, nacl_raw._crypto_box_BEFORENMBYTES);
	var c = new Target(msg.length + nacl_raw._crypto_box_ZEROBYTES);
	check("_crypto_box_afternm",
	      nacl_raw._crypto_box_afternm(c.address, m, c.length, 0, na, ka));
	free_all([m, na, ka]);
	return c.extractBytes(nacl_raw._crypto_box_BOXZEROBYTES);
    }

    function crypto_box_open_precomputed(ciphertext, nonce, state) {
	var c = injectBytes(ciphertext, nacl_raw._crypto_box_BOXZEROBYTES);
	var na = check_injectBytes("crypto_box_open_precomputed",
				   "nonce", nonce, nacl_raw._crypto_box_NONCEBYTES);
	var ka = check_injectBytes("crypto_box_open_precomputed",
				   "boxK", state.boxK, nacl_raw._crypto_box_BEFORENMBYTES);
	var m = new Target(ciphertext.length + nacl_raw._crypto_box_BOXZEROBYTES);
	check("_crypto_box_open_afternm",
	      nacl_raw._crypto_box_open_afternm(m.address, c, m.length, 0, na, ka));
	free_all([c, na, ka]);
	return m.extractBytes(nacl_raw._crypto_box_ZEROBYTES);
    }

    //---------------------------------------------------------------------------
    // Hashing

    function crypto_hash(bs) {
	var address = injectBytes(bs);
	var hash = new Target(nacl_raw._crypto_hash_BYTES);
	check("_crypto_hash", nacl_raw._crypto_hash(hash.address, address, bs.length, 0));
	nacl_raw._free(address);
	return hash.extractBytes();
    }

    function crypto_hash_string(s) {
	return crypto_hash(encode_utf8(s));
    }

    //---------------------------------------------------------------------------
    // Symmetric-key encryption

    function crypto_stream_random_nonce() {
	return nacl_raw.RandomBytes.crypto.randomBytes(nacl_raw._crypto_stream_NONCEBYTES);
    }

    function crypto_stream(len, nonce, key) {
	var na = check_injectBytes("crypto_stream",
				   "nonce", nonce, nacl_raw._crypto_stream_NONCEBYTES);
	var ka = check_injectBytes("crypto_stream",
				   "key", key, nacl_raw._crypto_stream_KEYBYTES);
	var out = new Target(len);
	check("_crypto_stream", nacl_raw._crypto_stream(out.address, len, 0, na, ka));
	free_all([na, ka]);
	return out.extractBytes();
    }

    function crypto_stream_xor(msg, nonce, key) {
	var na = check_injectBytes("crypto_stream_xor",
				   "nonce", nonce, nacl_raw._crypto_stream_NONCEBYTES);
	var ka = check_injectBytes("crypto_stream_xor",
				   "key", key, nacl_raw._crypto_stream_KEYBYTES);
	var ma = injectBytes(msg);
	var out = new Target(msg.length);
	check("_crypto_stream_xor",
	      nacl_raw._crypto_stream_xor(out.address, ma, msg.length, 0, na, ka));
	free_all([na, ka, ma]);
	return out.extractBytes();
    }

    //---------------------------------------------------------------------------
    // One-time authentication

    function crypto_onetimeauth(msg, key) {
	var ka = check_injectBytes("crypto_onetimeauth",
				   "key", key, nacl_raw._crypto_onetimeauth_KEYBYTES);
	var ma = injectBytes(msg);
	var authenticator = new Target(nacl_raw._crypto_onetimeauth_BYTES);
	check("_crypto_onetimeauth",
	      nacl_raw._crypto_onetimeauth(authenticator.address, ma, msg.length, 0, ka));
	free_all([ka, ma]);
	return authenticator.extractBytes();
    }

    function crypto_onetimeauth_verify(authenticator, msg, key) {
	if (authenticator.length != nacl_raw._crypto_onetimeauth_BYTES) return false;
	var ka = check_injectBytes("crypto_onetimeauth_verify",
				   "key", key, nacl_raw._crypto_onetimeauth_KEYBYTES);
	var ma = injectBytes(msg);
	var aa = injectBytes(authenticator);
	var result = nacl_raw._crypto_onetimeauth_verify(aa, ma, msg.length, 0, ka);
	free_all([ka, ma, aa]);
	return (result == 0);
    }

    //---------------------------------------------------------------------------
    // Authentication

    function crypto_auth(msg, key) {
	var ka = check_injectBytes("crypto_auth", "key", key, nacl_raw._crypto_auth_KEYBYTES);
	var ma = injectBytes(msg);
	var authenticator = new Target(nacl_raw._crypto_auth_BYTES);
	check("_crypto_auth", nacl_raw._crypto_auth(authenticator.address, ma, msg.length, 0, ka));
	free_all([ka, ma]);
	return authenticator.extractBytes();
    }

    function crypto_auth_verify(authenticator, msg, key) {
	if (authenticator.length != nacl_raw._crypto_auth_BYTES) return false;
	var ka = check_injectBytes("crypto_auth_verify",
				   "key", key, nacl_raw._crypto_auth_KEYBYTES);
	var ma = injectBytes(msg);
	var aa = injectBytes(authenticator);
	var result = nacl_raw._crypto_auth_verify(aa, ma, msg.length, 0, ka);
	free_all([ka, ma, aa]);
	return (result == 0);
    }

    //---------------------------------------------------------------------------
    // Authenticated symmetric-key encryption

    function crypto_secretbox_random_nonce() {
	return nacl_raw.RandomBytes.crypto.randomBytes(nacl_raw._crypto_secretbox_NONCEBYTES);
    }

    function crypto_secretbox(msg, nonce, key) {
	var m = injectBytes(msg, nacl_raw._crypto_secretbox_ZEROBYTES);
	var na = check_injectBytes("crypto_secretbox",
				   "nonce", nonce, nacl_raw._crypto_secretbox_NONCEBYTES);
	var ka = check_injectBytes("crypto_secretbox",
				   "key", key, nacl_raw._crypto_secretbox_KEYBYTES);
	var c = new Target(msg.length + nacl_raw._crypto_secretbox_ZEROBYTES);
	check("_crypto_secretbox", nacl_raw._crypto_secretbox(c.address, m, c.length, 0, na, ka));
	free_all([m, na, ka]);
	return c.extractBytes(nacl_raw._crypto_secretbox_BOXZEROBYTES);
    }

    function crypto_secretbox_open(ciphertext, nonce, key) {
	var c = injectBytes(ciphertext, nacl_raw._crypto_secretbox_BOXZEROBYTES);
	var na = check_injectBytes("crypto_secretbox_open",
				   "nonce", nonce, nacl_raw._crypto_secretbox_NONCEBYTES);
	var ka = check_injectBytes("crypto_secretbox_open",
				   "key", key, nacl_raw._crypto_secretbox_KEYBYTES);
	var m = new Target(ciphertext.length + nacl_raw._crypto_secretbox_BOXZEROBYTES);
	check("_crypto_secretbox_open",
	      nacl_raw._crypto_secretbox_open(m.address, c, m.length, 0, na, ka));
	free_all([c, na, ka]);
	return m.extractBytes(nacl_raw._crypto_secretbox_ZEROBYTES);
    }

    //---------------------------------------------------------------------------
    // Signing

    function crypto_sign_keypair() {
	var pk = new Target(nacl_raw._crypto_sign_PUBLICKEYBYTES);
	var sk = new Target(nacl_raw._crypto_sign_SECRETKEYBYTES);
	check("_crypto_sign_keypair", nacl_raw._crypto_sign_keypair(pk.address, sk.address));
	return {signPk: pk.extractBytes(), signSk: sk.extractBytes()};
    }

    function crypto_sign(msg, sk) {
	var ma = injectBytes(msg);
	var ska = check_injectBytes("crypto_sign", "sk", sk, nacl_raw._crypto_sign_SECRETKEYBYTES);
	var sm = new Target(msg.length + nacl_raw._crypto_sign_BYTES);
	var smlen = new Target(8);
	check("_crypto_sign",
	      nacl_raw._crypto_sign(sm.address, smlen.address, ma, msg.length, 0, ska));
	free_all([ma, ska]);
	sm.length = nacl_raw.HEAPU32[smlen.address >> 2];
	nacl_raw._free(smlen.address);
	return sm.extractBytes();
    }

    function crypto_sign_open(sm, pk) {
	var sma = injectBytes(sm);
	var pka = check_injectBytes("crypto_sign_open",
				    "pk", pk, nacl_raw._crypto_sign_PUBLICKEYBYTES);
	var m = new Target(sm.length);
	var mlen = new Target(8);
	if (nacl_raw._crypto_sign_open(m.address, mlen.address, sma, sm.length, 0, pka) === 0) {
	    free_all([sma, pka]);
	    m.length = nacl_raw.HEAPU32[mlen.address >> 2];
	    nacl_raw._free(mlen.address);
	    return m.extractBytes();
	} else {
	    free_all([sma, pka, m.address, mlen.address]);
	    return null;
	}
    }

    //---------------------------------------------------------------------------
    // Keys

    function crypto_sign_keypair_from_seed(bs) {
	// Hash the bytes to get a secret key. This will be MODIFIED IN
	// PLACE by the call to crypto_sign_keypair_from_raw_sk below.
	var hash = new Uint8Array(crypto_hash(bs));
	var ska = injectBytes(hash.subarray(0, nacl_raw._crypto_sign_SECRETKEYBYTES));
	var pk = new Target(nacl_raw._crypto_sign_PUBLICKEYBYTES);
	check("_crypto_sign_keypair_from_raw_sk",
	      nacl_raw._crypto_sign_keypair_from_raw_sk(pk.address, ska));
	var sk = extractBytes(ska, nacl_raw._crypto_sign_SECRETKEYBYTES);
	nacl_raw._free(ska);
	return {signPk: pk.extractBytes(), signSk: sk};
    }

    function crypto_box_keypair_from_seed(bs) {
	var hash = new Uint8Array(crypto_hash(bs));
	var ska = injectBytes(hash.subarray(0, nacl_raw._crypto_box_SECRETKEYBYTES));
	var pk = new Target(nacl_raw._crypto_box_PUBLICKEYBYTES);
	check("_crypto_scalarmult_curve25519_base",
	      nacl_raw._crypto_scalarmult_curve25519_base(pk.address, ska));
	var sk = extractBytes(ska, nacl_raw._crypto_box_SECRETKEYBYTES);
	nacl_raw._free(ska);
	return {boxPk: pk.extractBytes(), boxSk: sk};
    }

    //---------------------------------------------------------------------------

    exports.crypto_auth_BYTES = nacl_raw._crypto_auth_BYTES;
    exports.crypto_auth_KEYBYTES = nacl_raw._crypto_auth_KEYBYTES;
    exports.crypto_box_BEFORENMBYTES = nacl_raw._crypto_box_BEFORENMBYTES;
    exports.crypto_box_BOXZEROBYTES = nacl_raw._crypto_box_BOXZEROBYTES;
    exports.crypto_box_NONCEBYTES = nacl_raw._crypto_box_NONCEBYTES;
    exports.crypto_box_PUBLICKEYBYTES = nacl_raw._crypto_box_PUBLICKEYBYTES;
    exports.crypto_box_SECRETKEYBYTES = nacl_raw._crypto_box_SECRETKEYBYTES;
    exports.crypto_box_ZEROBYTES = nacl_raw._crypto_box_ZEROBYTES;
    exports.crypto_hash_BYTES = nacl_raw._crypto_hash_BYTES;
    exports.crypto_hashblocks_BLOCKBYTES = nacl_raw._crypto_hashblocks_BLOCKBYTES;
    exports.crypto_hashblocks_STATEBYTES = nacl_raw._crypto_hashblocks_STATEBYTES;
    exports.crypto_onetimeauth_BYTES = nacl_raw._crypto_onetimeauth_BYTES;
    exports.crypto_onetimeauth_KEYBYTES = nacl_raw._crypto_onetimeauth_KEYBYTES;
    exports.crypto_secretbox_BOXZEROBYTES = nacl_raw._crypto_secretbox_BOXZEROBYTES;
    exports.crypto_secretbox_KEYBYTES = nacl_raw._crypto_secretbox_KEYBYTES;
    exports.crypto_secretbox_NONCEBYTES = nacl_raw._crypto_secretbox_NONCEBYTES;
    exports.crypto_secretbox_ZEROBYTES = nacl_raw._crypto_secretbox_ZEROBYTES;
    exports.crypto_sign_BYTES = nacl_raw._crypto_sign_BYTES;
    exports.crypto_sign_PUBLICKEYBYTES = nacl_raw._crypto_sign_PUBLICKEYBYTES;
    exports.crypto_sign_SECRETKEYBYTES = nacl_raw._crypto_sign_SECRETKEYBYTES;
    exports.crypto_stream_BEFORENMBYTES = nacl_raw._crypto_stream_BEFORENMBYTES;
    exports.crypto_stream_KEYBYTES = nacl_raw._crypto_stream_KEYBYTES;
    exports.crypto_stream_NONCEBYTES = nacl_raw._crypto_stream_NONCEBYTES;

    exports.encode_utf8 = encode_utf8;
    exports.encode_latin1 = encode_latin1;
    exports.decode_utf8 = decode_utf8;
    exports.decode_latin1 = decode_latin1;
    exports.to_hex = to_hex;

    exports.crypto_box_keypair = crypto_box_keypair;
    exports.crypto_box_random_nonce = crypto_box_random_nonce;
    exports.crypto_box = crypto_box;
    exports.crypto_box_open = crypto_box_open;
    exports.crypto_box_precompute = crypto_box_precompute;
    exports.crypto_box_precomputed = crypto_box_precomputed;
    exports.crypto_box_open_precomputed = crypto_box_open_precomputed;

    exports.crypto_stream_random_nonce = crypto_stream_random_nonce;
    exports.crypto_stream = crypto_stream;
    exports.crypto_stream_xor = crypto_stream_xor;

    exports.crypto_onetimeauth = crypto_onetimeauth;
    exports.crypto_onetimeauth_verify = crypto_onetimeauth_verify;

    exports.crypto_auth = crypto_auth;
    exports.crypto_auth_verify = crypto_auth_verify;

    exports.crypto_secretbox_random_nonce = crypto_secretbox_random_nonce;
    exports.crypto_secretbox = crypto_secretbox;
    exports.crypto_secretbox_open = crypto_secretbox_open;

    exports.crypto_sign_keypair = crypto_sign_keypair;
    exports.crypto_sign = crypto_sign;
    exports.crypto_sign_open = crypto_sign_open;

    exports.crypto_hash = crypto_hash;
    exports.crypto_hash_string = crypto_hash_string;

    exports.crypto_sign_keypair_from_seed = crypto_sign_keypair_from_seed;
    exports.crypto_box_keypair_from_seed = crypto_box_keypair_from_seed;

    return exports;
})();
    var randomBytes;
    if (typeof module !== 'undefined' && module.exports) {
	// add node.js implementations
	var crypto = require('crypto');
	randomBytes = crypto.randomBytes;
    } else if (window && window.crypto && window.crypto.getRandomValues) {
	// add in-browser implementation
	randomBytes = function (count) {
	    var bs = new Uint8Array(count);
	    window.crypto.getRandomValues(bs);
	    return bs;
	};
    } else {
	randomBytes = function (count) {
	    throw { name: "No cryptographic random number generator",
		    message: "Your browser does not support cryptographic random number generation." };
	};
    }

    nacl_raw.RandomBytes.crypto = { "randomBytes": randomBytes };
    nacl.random_bytes = randomBytes;
    nacl.nacl_raw = nacl_raw;
    return nacl;
})((typeof window !== 'undefined') ? window : null, (typeof document !== 'undefined') ? document : null);

// export common.js module to allow one js file for browser and node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = nacl;
}
