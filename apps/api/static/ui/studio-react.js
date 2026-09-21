//#region \0rolldown/runtime.js
var e = Object.create, t = Object.defineProperty, n = Object.getOwnPropertyDescriptor, r = Object.getOwnPropertyNames, i = Object.getPrototypeOf, a = Object.prototype.hasOwnProperty, o = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), s = (e, i, o, s) => {
	if (i && typeof i == "object" || typeof i == "function") for (var c = r(i), l = 0, u = c.length, d; l < u; l++) d = c[l], !a.call(e, d) && d !== o && t(e, d, {
		get: ((e) => i[e]).bind(null, d),
		enumerable: !(s = n(i, d)) || s.enumerable
	});
	return e;
}, c = (n, r, o) => (o = n == null ? {} : e(i(n)), s(r || !n || !n.__esModule || !a.call(n, "default") ? t(o, "default", {
	value: n,
	enumerable: !0
}) : o, n)), l = /* @__PURE__ */ o(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.portal"), r = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), o = Symbol.for("react.consumer"), s = Symbol.for("react.context"), c = Symbol.for("react.forward_ref"), l = Symbol.for("react.suspense"), u = Symbol.for("react.memo"), d = Symbol.for("react.lazy"), f = Symbol.for("react.activity"), p = Symbol.iterator;
	function m(e) {
		return typeof e != "object" || !e ? null : (e = p && e[p] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var h = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	}, g = Object.assign, _ = {};
	function v(e, t, n) {
		this.props = e, this.context = t, this.refs = _, this.updater = n || h;
	}
	v.prototype.isReactComponent = {}, v.prototype.setState = function(e, t) {
		if (typeof e != "object" && typeof e != "function" && e != null) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, e, t, "setState");
	}, v.prototype.forceUpdate = function(e) {
		this.updater.enqueueForceUpdate(this, e, "forceUpdate");
	};
	function y() {}
	y.prototype = v.prototype;
	function b(e, t, n) {
		this.props = e, this.context = t, this.refs = _, this.updater = n || h;
	}
	var x = b.prototype = new y();
	x.constructor = b, g(x, v.prototype), x.isPureReactComponent = !0;
	var S = Array.isArray;
	function C() {}
	var w = {
		H: null,
		A: null,
		T: null,
		S: null
	}, T = Object.prototype.hasOwnProperty;
	function E(e, n, r) {
		var i = r.ref;
		return {
			$$typeof: t,
			type: e,
			key: n,
			ref: i === void 0 ? null : i,
			props: r
		};
	}
	function ee(e, t) {
		return E(e.type, t, e.props);
	}
	function D(e) {
		return typeof e == "object" && !!e && e.$$typeof === t;
	}
	function te(e) {
		var t = {
			"=": "=0",
			":": "=2"
		};
		return "$" + e.replace(/[=:]/g, function(e) {
			return t[e];
		});
	}
	var ne = /\/+/g;
	function re(e, t) {
		return typeof e == "object" && e && e.key != null ? te("" + e.key) : t.toString(36);
	}
	function ie(e) {
		switch (e.status) {
			case "fulfilled": return e.value;
			case "rejected": throw e.reason;
			default: switch (typeof e.status == "string" ? e.then(C, C) : (e.status = "pending", e.then(function(t) {
				e.status === "pending" && (e.status = "fulfilled", e.value = t);
			}, function(t) {
				e.status === "pending" && (e.status = "rejected", e.reason = t);
			})), e.status) {
				case "fulfilled": return e.value;
				case "rejected": throw e.reason;
			}
		}
		throw e;
	}
	function ae(e, r, i, a, o) {
		var s = typeof e;
		(s === "undefined" || s === "boolean") && (e = null);
		var c = !1;
		if (e === null) c = !0;
		else switch (s) {
			case "bigint":
			case "string":
			case "number":
				c = !0;
				break;
			case "object": switch (e.$$typeof) {
				case t:
				case n:
					c = !0;
					break;
				case d: return c = e._init, ae(c(e._payload), r, i, a, o);
			}
		}
		if (c) return o = o(e), c = a === "" ? "." + re(e, 0) : a, S(o) ? (i = "", c != null && (i = c.replace(ne, "$&/") + "/"), ae(o, r, i, "", function(e) {
			return e;
		})) : o != null && (D(o) && (o = ee(o, i + (o.key == null || e && e.key === o.key ? "" : ("" + o.key).replace(ne, "$&/") + "/") + c)), r.push(o)), 1;
		c = 0;
		var l = a === "" ? "." : a + ":";
		if (S(e)) for (var u = 0; u < e.length; u++) a = e[u], s = l + re(a, u), c += ae(a, r, i, s, o);
		else if (u = m(e), typeof u == "function") for (e = u.call(e), u = 0; !(a = e.next()).done;) a = a.value, s = l + re(a, u++), c += ae(a, r, i, s, o);
		else if (s === "object") {
			if (typeof e.then == "function") return ae(ie(e), r, i, a, o);
			throw r = String(e), Error("Objects are not valid as a React child (found: " + (r === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : r) + "). If you meant to render a collection of children, use an array instead.");
		}
		return c;
	}
	function oe(e, t, n) {
		if (e == null) return e;
		var r = [], i = 0;
		return ae(e, r, "", "", function(e) {
			return t.call(n, e, i++);
		}), r;
	}
	function se(e) {
		if (e._status === -1) {
			var t = e._result;
			t = t(), t.then(function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 1, e._result = t);
			}, function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 2, e._result = t);
			}), e._status === -1 && (e._status = 0, e._result = t);
		}
		if (e._status === 1) return e._result.default;
		throw e._result;
	}
	var O = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	}, k = {
		map: oe,
		forEach: function(e, t, n) {
			oe(e, function() {
				t.apply(this, arguments);
			}, n);
		},
		count: function(e) {
			var t = 0;
			return oe(e, function() {
				t++;
			}), t;
		},
		toArray: function(e) {
			return oe(e, function(e) {
				return e;
			}) || [];
		},
		only: function(e) {
			if (!D(e)) throw Error("React.Children.only expected to receive a single React element child.");
			return e;
		}
	};
	e.Activity = f, e.Children = k, e.Component = v, e.Fragment = r, e.Profiler = a, e.PureComponent = b, e.StrictMode = i, e.Suspense = l, e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = w, e.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(e) {
			return w.H.useMemoCache(e);
		}
	}, e.cache = function(e) {
		return function() {
			return e.apply(null, arguments);
		};
	}, e.cacheSignal = function() {
		return null;
	}, e.cloneElement = function(e, t, n) {
		if (e == null) throw Error("The argument must be a React element, but you passed " + e + ".");
		var r = g({}, e.props), i = e.key;
		if (t != null) for (a in t.key !== void 0 && (i = "" + t.key), t) !T.call(t, a) || a === "key" || a === "__self" || a === "__source" || a === "ref" && t.ref === void 0 || (r[a] = t[a]);
		var a = arguments.length - 2;
		if (a === 1) r.children = n;
		else if (1 < a) {
			for (var o = Array(a), s = 0; s < a; s++) o[s] = arguments[s + 2];
			r.children = o;
		}
		return E(e.type, i, r);
	}, e.createContext = function(e) {
		return e = {
			$$typeof: s,
			_currentValue: e,
			_currentValue2: e,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		}, e.Provider = e, e.Consumer = {
			$$typeof: o,
			_context: e
		}, e;
	}, e.createElement = function(e, t, n) {
		var r, i = {}, a = null;
		if (t != null) for (r in t.key !== void 0 && (a = "" + t.key), t) T.call(t, r) && r !== "key" && r !== "__self" && r !== "__source" && (i[r] = t[r]);
		var o = arguments.length - 2;
		if (o === 1) i.children = n;
		else if (1 < o) {
			for (var s = Array(o), c = 0; c < o; c++) s[c] = arguments[c + 2];
			i.children = s;
		}
		if (e && e.defaultProps) for (r in o = e.defaultProps, o) i[r] === void 0 && (i[r] = o[r]);
		return E(e, a, i);
	}, e.createRef = function() {
		return { current: null };
	}, e.forwardRef = function(e) {
		return {
			$$typeof: c,
			render: e
		};
	}, e.isValidElement = D, e.lazy = function(e) {
		return {
			$$typeof: d,
			_payload: {
				_status: -1,
				_result: e
			},
			_init: se
		};
	}, e.memo = function(e, t) {
		return {
			$$typeof: u,
			type: e,
			compare: t === void 0 ? null : t
		};
	}, e.startTransition = function(e) {
		var t = w.T, n = {};
		w.T = n;
		try {
			var r = e(), i = w.S;
			i !== null && i(n, r), typeof r == "object" && r && typeof r.then == "function" && r.then(C, O);
		} catch (e) {
			O(e);
		} finally {
			t !== null && n.types !== null && (t.types = n.types), w.T = t;
		}
	}, e.unstable_useCacheRefresh = function() {
		return w.H.useCacheRefresh();
	}, e.use = function(e) {
		return w.H.use(e);
	}, e.useActionState = function(e, t, n) {
		return w.H.useActionState(e, t, n);
	}, e.useCallback = function(e, t) {
		return w.H.useCallback(e, t);
	}, e.useContext = function(e) {
		return w.H.useContext(e);
	}, e.useDebugValue = function() {}, e.useDeferredValue = function(e, t) {
		return w.H.useDeferredValue(e, t);
	}, e.useEffect = function(e, t) {
		return w.H.useEffect(e, t);
	}, e.useEffectEvent = function(e) {
		return w.H.useEffectEvent(e);
	}, e.useId = function() {
		return w.H.useId();
	}, e.useImperativeHandle = function(e, t, n) {
		return w.H.useImperativeHandle(e, t, n);
	}, e.useInsertionEffect = function(e, t) {
		return w.H.useInsertionEffect(e, t);
	}, e.useLayoutEffect = function(e, t) {
		return w.H.useLayoutEffect(e, t);
	}, e.useMemo = function(e, t) {
		return w.H.useMemo(e, t);
	}, e.useOptimistic = function(e, t) {
		return w.H.useOptimistic(e, t);
	}, e.useReducer = function(e, t, n) {
		return w.H.useReducer(e, t, n);
	}, e.useRef = function(e) {
		return w.H.useRef(e);
	}, e.useState = function(e) {
		return w.H.useState(e);
	}, e.useSyncExternalStore = function(e, t, n) {
		return w.H.useSyncExternalStore(e, t, n);
	}, e.useTransition = function() {
		return w.H.useTransition();
	}, e.version = "19.2.8";
})), u = /* @__PURE__ */ o(((e, t) => {
	t.exports = l();
})), d = /* @__PURE__ */ o(((e) => {
	function t(e, t) {
		var n = e.length;
		e.push(t);
		a: for (; 0 < n;) {
			var r = n - 1 >>> 1, a = e[r];
			if (0 < i(a, t)) e[r] = t, e[n] = a, n = r;
			else break a;
		}
	}
	function n(e) {
		return e.length === 0 ? null : e[0];
	}
	function r(e) {
		if (e.length === 0) return null;
		var t = e[0], n = e.pop();
		if (n !== t) {
			e[0] = n;
			a: for (var r = 0, a = e.length, o = a >>> 1; r < o;) {
				var s = 2 * (r + 1) - 1, c = e[s], l = s + 1, u = e[l];
				if (0 > i(c, n)) l < a && 0 > i(u, c) ? (e[r] = u, e[l] = n, r = l) : (e[r] = c, e[s] = n, r = s);
				else if (l < a && 0 > i(u, n)) e[r] = u, e[l] = n, r = l;
				else break a;
			}
		}
		return t;
	}
	function i(e, t) {
		var n = e.sortIndex - t.sortIndex;
		return n === 0 ? e.id - t.id : n;
	}
	if (e.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
		var a = performance;
		e.unstable_now = function() {
			return a.now();
		};
	} else {
		var o = Date, s = o.now();
		e.unstable_now = function() {
			return o.now() - s;
		};
	}
	var c = [], l = [], u = 1, d = null, f = 3, p = !1, m = !1, h = !1, g = !1, _ = typeof setTimeout == "function" ? setTimeout : null, v = typeof clearTimeout == "function" ? clearTimeout : null, y = typeof setImmediate < "u" ? setImmediate : null;
	function b(e) {
		for (var i = n(l); i !== null;) {
			if (i.callback === null) r(l);
			else if (i.startTime <= e) r(l), i.sortIndex = i.expirationTime, t(c, i);
			else break;
			i = n(l);
		}
	}
	function x(e) {
		if (h = !1, b(e), !m) {
			if (n(c) !== null) m = !0, S || (S = !0, D());
			else {
				var t = n(l);
				t !== null && re(x, t.startTime - e);
			}
		}
	}
	var S = !1, C = -1, w = 5, T = -1;
	function E() {
		return g ? !0 : !(e.unstable_now() - T < w);
	}
	function ee() {
		if (g = !1, S) {
			var t = e.unstable_now();
			T = t;
			var i = !0;
			try {
				a: {
					m = !1, h && (h = !1, v(C), C = -1), p = !0;
					var a = f;
					try {
						b: {
							for (b(t), d = n(c); d !== null && !(d.expirationTime > t && E());) {
								var o = d.callback;
								if (typeof o == "function") {
									d.callback = null, f = d.priorityLevel;
									var s = o(d.expirationTime <= t);
									if (t = e.unstable_now(), typeof s == "function") {
										d.callback = s, b(t), i = !0;
										break b;
									}
									d === n(c) && r(c), b(t);
								} else r(c);
								d = n(c);
							}
							if (d !== null) i = !0;
							else {
								var u = n(l);
								u !== null && re(x, u.startTime - t), i = !1;
							}
						}
						break a;
					} finally {
						d = null, f = a, p = !1;
					}
					i = void 0;
				}
			} finally {
				i ? D() : S = !1;
			}
		}
	}
	var D;
	if (typeof y == "function") D = function() {
		y(ee);
	};
	else if (typeof MessageChannel < "u") {
		var te = new MessageChannel(), ne = te.port2;
		te.port1.onmessage = ee, D = function() {
			ne.postMessage(null);
		};
	} else D = function() {
		_(ee, 0);
	};
	function re(t, n) {
		C = _(function() {
			t(e.unstable_now());
		}, n);
	}
	e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(e) {
		e.callback = null;
	}, e.unstable_forceFrameRate = function(e) {
		0 > e || 125 < e ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : w = 0 < e ? Math.floor(1e3 / e) : 5;
	}, e.unstable_getCurrentPriorityLevel = function() {
		return f;
	}, e.unstable_next = function(e) {
		switch (f) {
			case 1:
			case 2:
			case 3:
				var t = 3;
				break;
			default: t = f;
		}
		var n = f;
		f = t;
		try {
			return e();
		} finally {
			f = n;
		}
	}, e.unstable_requestPaint = function() {
		g = !0;
	}, e.unstable_runWithPriority = function(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: break;
			default: e = 3;
		}
		var n = f;
		f = e;
		try {
			return t();
		} finally {
			f = n;
		}
	}, e.unstable_scheduleCallback = function(r, i, a) {
		var o = e.unstable_now();
		switch (typeof a == "object" && a ? (a = a.delay, a = typeof a == "number" && 0 < a ? o + a : o) : a = o, r) {
			case 1:
				var s = -1;
				break;
			case 2:
				s = 250;
				break;
			case 5:
				s = 1073741823;
				break;
			case 4:
				s = 1e4;
				break;
			default: s = 5e3;
		}
		return s = a + s, r = {
			id: u++,
			callback: i,
			priorityLevel: r,
			startTime: a,
			expirationTime: s,
			sortIndex: -1
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (v(C), C = -1) : h = !0, re(x, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, S || (S = !0, D()))), r;
	}, e.unstable_shouldYield = E, e.unstable_wrapCallback = function(e) {
		var t = f;
		return function() {
			var n = f;
			f = t;
			try {
				return e.apply(this, arguments);
			} finally {
				f = n;
			}
		};
	};
})), f = /* @__PURE__ */ o(((e, t) => {
	t.exports = d();
})), p = /* @__PURE__ */ o(((e) => {
	var t = u();
	function n(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function r() {}
	var i = {
		d: {
			f: r,
			r: function() {
				throw Error(n(522));
			},
			D: r,
			C: r,
			L: r,
			m: r,
			X: r,
			S: r,
			M: r
		},
		p: 0,
		findDOMNode: null
	}, a = Symbol.for("react.portal");
	function o(e, t, n) {
		var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: a,
			key: r == null ? null : "" + r,
			children: e,
			containerInfo: t,
			implementation: n
		};
	}
	var s = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function c(e, t) {
		if (e === "font") return "";
		if (typeof t == "string") return t === "use-credentials" ? t : "";
	}
	e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = i, e.createPortal = function(e, t) {
		var r = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
		if (!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11) throw Error(n(299));
		return o(e, t, null, r);
	}, e.flushSync = function(e) {
		var t = s.T, n = i.p;
		try {
			if (s.T = null, i.p = 2, e) return e();
		} finally {
			s.T = t, i.p = n, i.d.f();
		}
	}, e.preconnect = function(e, t) {
		typeof e == "string" && (t ? (t = t.crossOrigin, t = typeof t == "string" ? t === "use-credentials" ? t : "" : void 0) : t = null, i.d.C(e, t));
	}, e.prefetchDNS = function(e) {
		typeof e == "string" && i.d.D(e);
	}, e.preinit = function(e, t) {
		if (typeof e == "string" && t && typeof t.as == "string") {
			var n = t.as, r = c(n, t.crossOrigin), a = typeof t.integrity == "string" ? t.integrity : void 0, o = typeof t.fetchPriority == "string" ? t.fetchPriority : void 0;
			n === "style" ? i.d.S(e, typeof t.precedence == "string" ? t.precedence : void 0, {
				crossOrigin: r,
				integrity: a,
				fetchPriority: o
			}) : n === "script" && i.d.X(e, {
				crossOrigin: r,
				integrity: a,
				fetchPriority: o,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0
			});
		}
	}, e.preinitModule = function(e, t) {
		if (typeof e == "string") {
			if (typeof t == "object" && t) {
				if (t.as == null || t.as === "script") {
					var n = c(t.as, t.crossOrigin);
					i.d.M(e, {
						crossOrigin: n,
						integrity: typeof t.integrity == "string" ? t.integrity : void 0,
						nonce: typeof t.nonce == "string" ? t.nonce : void 0
					});
				}
			} else t ?? i.d.M(e);
		}
	}, e.preload = function(e, t) {
		if (typeof e == "string" && typeof t == "object" && t && typeof t.as == "string") {
			var n = t.as, r = c(n, t.crossOrigin);
			i.d.L(e, n, {
				crossOrigin: r,
				integrity: typeof t.integrity == "string" ? t.integrity : void 0,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0,
				type: typeof t.type == "string" ? t.type : void 0,
				fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0,
				referrerPolicy: typeof t.referrerPolicy == "string" ? t.referrerPolicy : void 0,
				imageSrcSet: typeof t.imageSrcSet == "string" ? t.imageSrcSet : void 0,
				imageSizes: typeof t.imageSizes == "string" ? t.imageSizes : void 0,
				media: typeof t.media == "string" ? t.media : void 0
			});
		}
	}, e.preloadModule = function(e, t) {
		if (typeof e == "string") {
			if (t) {
				var n = c(t.as, t.crossOrigin);
				i.d.m(e, {
					as: typeof t.as == "string" && t.as !== "script" ? t.as : void 0,
					crossOrigin: n,
					integrity: typeof t.integrity == "string" ? t.integrity : void 0
				});
			} else i.d.m(e);
		}
	}, e.requestFormReset = function(e) {
		i.d.r(e);
	}, e.unstable_batchedUpdates = function(e, t) {
		return e(t);
	}, e.useFormState = function(e, t, n) {
		return s.H.useFormState(e, t, n);
	}, e.useFormStatus = function() {
		return s.H.useHostTransitionStatus();
	}, e.version = "19.2.8";
})), m = /* @__PURE__ */ o(((e, t) => {
	function n() {
		if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = p();
})), h = /* @__PURE__ */ o(((e) => {
	var t = f(), n = u(), r = m();
	function i(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function a(e) {
		return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
	}
	function o(e) {
		var t = e, n = e;
		if (e.alternate) for (; t.return;) t = t.return;
		else {
			e = t;
			do
				t = e, t.flags & 4098 && (n = t.return), e = t.return;
			while (e);
		}
		return t.tag === 3 ? n : null;
	}
	function s(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function c(e) {
		if (e.tag === 31) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function l(e) {
		if (o(e) !== e) throw Error(i(188));
	}
	function d(e) {
		var t = e.alternate;
		if (!t) {
			if (t = o(e), t === null) throw Error(i(188));
			return t === e ? e : null;
		}
		for (var n = e, r = t;;) {
			var a = n.return;
			if (a === null) break;
			var s = a.alternate;
			if (s === null) {
				if (r = a.return, r !== null) {
					n = r;
					continue;
				}
				break;
			}
			if (a.child === s.child) {
				for (s = a.child; s;) {
					if (s === n) return l(a), e;
					if (s === r) return l(a), t;
					s = s.sibling;
				}
				throw Error(i(188));
			}
			if (n.return !== r.return) n = a, r = s;
			else {
				for (var c = !1, u = a.child; u;) {
					if (u === n) {
						c = !0, n = a, r = s;
						break;
					}
					if (u === r) {
						c = !0, r = a, n = s;
						break;
					}
					u = u.sibling;
				}
				if (!c) {
					for (u = s.child; u;) {
						if (u === n) {
							c = !0, n = s, r = a;
							break;
						}
						if (u === r) {
							c = !0, r = s, n = a;
							break;
						}
						u = u.sibling;
					}
					if (!c) throw Error(i(189));
				}
			}
			if (n.alternate !== r) throw Error(i(190));
		}
		if (n.tag !== 3) throw Error(i(188));
		return n.stateNode.current === n ? e : t;
	}
	function p(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e;
		for (e = e.child; e !== null;) {
			if (t = p(e), t !== null) return t;
			e = e.sibling;
		}
		return null;
	}
	var h = Object.assign, g = Symbol.for("react.element"), _ = Symbol.for("react.transitional.element"), v = Symbol.for("react.portal"), y = Symbol.for("react.fragment"), b = Symbol.for("react.strict_mode"), x = Symbol.for("react.profiler"), S = Symbol.for("react.consumer"), C = Symbol.for("react.context"), w = Symbol.for("react.forward_ref"), T = Symbol.for("react.suspense"), E = Symbol.for("react.suspense_list"), ee = Symbol.for("react.memo"), D = Symbol.for("react.lazy"), te = Symbol.for("react.activity"), ne = Symbol.for("react.memo_cache_sentinel"), re = Symbol.iterator;
	function ie(e) {
		return typeof e != "object" || !e ? null : (e = re && e[re] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var ae = Symbol.for("react.client.reference");
	function oe(e) {
		if (e == null) return null;
		if (typeof e == "function") return e.$$typeof === ae ? null : e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case y: return "Fragment";
			case x: return "Profiler";
			case b: return "StrictMode";
			case T: return "Suspense";
			case E: return "SuspenseList";
			case te: return "Activity";
		}
		if (typeof e == "object") switch (e.$$typeof) {
			case v: return "Portal";
			case C: return e.displayName || "Context";
			case S: return (e._context.displayName || "Context") + ".Consumer";
			case w:
				var t = e.render;
				return e = e.displayName, e ||= (e = t.displayName || t.name || "", e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
			case ee: return t = e.displayName || null, t === null ? oe(e.type) || "Memo" : t;
			case D:
				t = e._payload, e = e._init;
				try {
					return oe(e(t));
				} catch {}
		}
		return null;
	}
	var se = Array.isArray, O = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, k = r.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ce = {
		pending: !1,
		data: null,
		method: null,
		action: null
	}, le = [], ue = -1;
	function de(e) {
		return { current: e };
	}
	function fe(e) {
		0 > ue || (e.current = le[ue], le[ue] = null, ue--);
	}
	function A(e, t) {
		ue++, le[ue] = e.current, e.current = t;
	}
	var pe = de(null), me = de(null), he = de(null), ge = de(null);
	function _e(e, t) {
		switch (A(he, t), A(me, e), A(pe, null), t.nodeType) {
			case 9:
			case 11:
				e = (e = t.documentElement) && (e = e.namespaceURI) ? Vd(e) : 0;
				break;
			default: if (e = t.tagName, t = t.namespaceURI) t = Vd(t), e = Hd(t, e);
			else switch (e) {
				case "svg":
					e = 1;
					break;
				case "math":
					e = 2;
					break;
				default: e = 0;
			}
		}
		fe(pe), A(pe, e);
	}
	function ve() {
		fe(pe), fe(me), fe(he);
	}
	function ye(e) {
		e.memoizedState !== null && A(ge, e);
		var t = pe.current, n = Hd(t, e.type);
		t !== n && (A(me, e), A(pe, n));
	}
	function be(e) {
		me.current === e && (fe(pe), fe(me)), ge.current === e && (fe(ge), Qf._currentValue = ce);
	}
	var xe, Se;
	function j(e) {
		if (xe === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			xe = t && t[1] || "", Se = -1 < e.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < e.stack.indexOf("@") ? "@unknown:0:0" : "";
		}
		return "\n" + xe + e + Se;
	}
	var Ce = !1;
	function we(e, t) {
		if (!e || Ce) return "";
		Ce = !0;
		var n = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			var r = { DetermineComponentFrameRoot: function() {
				try {
					if (t) {
						var n = function() {
							throw Error();
						};
						if (Object.defineProperty(n.prototype, "props", { set: function() {
							throw Error();
						} }), typeof Reflect == "object" && Reflect.construct) {
							try {
								Reflect.construct(n, []);
							} catch (e) {
								var r = e;
							}
							Reflect.construct(e, [], n);
						} else {
							try {
								n.call();
							} catch (e) {
								r = e;
							}
							e.call(n.prototype);
						}
					} else {
						try {
							throw Error();
						} catch (e) {
							r = e;
						}
						(n = e()) && typeof n.catch == "function" && n.catch(function() {});
					}
				} catch (e) {
					if (e && r && typeof e.stack == "string") return [e.stack, r.stack];
				}
				return [null, null];
			} };
			r.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
			var i = Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot, "name");
			i && i.configurable && Object.defineProperty(r.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
			var a = r.DetermineComponentFrameRoot(), o = a[0], s = a[1];
			if (o && s) {
				var c = o.split("\n"), l = s.split("\n");
				for (i = r = 0; r < c.length && !c[r].includes("DetermineComponentFrameRoot");) r++;
				for (; i < l.length && !l[i].includes("DetermineComponentFrameRoot");) i++;
				if (r === c.length || i === l.length) for (r = c.length - 1, i = l.length - 1; 1 <= r && 0 <= i && c[r] !== l[i];) i--;
				for (; 1 <= r && 0 <= i; r--, i--) if (c[r] !== l[i]) {
					if (r !== 1 || i !== 1) do
						if (r--, i--, 0 > i || c[r] !== l[i]) {
							var u = "\n" + c[r].replace(" at new ", " at ");
							return e.displayName && u.includes("<anonymous>") && (u = u.replace("<anonymous>", e.displayName)), u;
						}
					while (1 <= r && 0 <= i);
					break;
				}
			}
		} finally {
			Ce = !1, Error.prepareStackTrace = n;
		}
		return (n = e ? e.displayName || e.name : "") ? j(n) : "";
	}
	function Te(e, t) {
		switch (e.tag) {
			case 26:
			case 27:
			case 5: return j(e.type);
			case 16: return j("Lazy");
			case 13: return e.child !== t && t !== null ? j("Suspense Fallback") : j("Suspense");
			case 19: return j("SuspenseList");
			case 0:
			case 15: return we(e.type, !1);
			case 11: return we(e.type.render, !1);
			case 1: return we(e.type, !0);
			case 31: return j("Activity");
			default: return "";
		}
	}
	function Ee(e) {
		try {
			var t = "", n = null;
			do
				t += Te(e, n), n = e, e = e.return;
			while (e);
			return t;
		} catch (e) {
			return "\nError generating stack: " + e.message + "\n" + e.stack;
		}
	}
	var De = Object.prototype.hasOwnProperty, Oe = t.unstable_scheduleCallback, ke = t.unstable_cancelCallback, Ae = t.unstable_shouldYield, je = t.unstable_requestPaint, Me = t.unstable_now, Ne = t.unstable_getCurrentPriorityLevel, Pe = t.unstable_ImmediatePriority, Fe = t.unstable_UserBlockingPriority, Ie = t.unstable_NormalPriority, Le = t.unstable_LowPriority, Re = t.unstable_IdlePriority, ze = t.log, Be = t.unstable_setDisableYieldValue, Ve = null, He = null;
	function Ue(e) {
		if (typeof ze == "function" && Be(e), He && typeof He.setStrictMode == "function") try {
			He.setStrictMode(Ve, e);
		} catch {}
	}
	var We = Math.clz32 ? Math.clz32 : qe, Ge = Math.log, Ke = Math.LN2;
	function qe(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (Ge(e) / Ke | 0) | 0;
	}
	var Je = 256, Ye = 262144, Xe = 4194304;
	function Ze(e) {
		var t = e & 42;
		if (t !== 0) return t;
		switch (e & -e) {
			case 1: return 1;
			case 2: return 2;
			case 4: return 4;
			case 8: return 8;
			case 16: return 16;
			case 32: return 32;
			case 64: return 64;
			case 128: return 128;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072: return e & 261888;
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return e & 3932160;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return e & 62914560;
			case 67108864: return 67108864;
			case 134217728: return 134217728;
			case 268435456: return 268435456;
			case 536870912: return 536870912;
			case 1073741824: return 0;
			default: return e;
		}
	}
	function Qe(e, t, n) {
		var r = e.pendingLanes;
		if (r === 0) return 0;
		var i = 0, a = e.suspendedLanes, o = e.pingedLanes;
		e = e.warmLanes;
		var s = r & 134217727;
		return s === 0 ? (s = r & ~a, s === 0 ? o === 0 ? n || (n = r & ~e, n !== 0 && (i = Ze(n))) : i = Ze(o) : i = Ze(s)) : (r = s & ~a, r === 0 ? (o &= s, o === 0 ? n || (n = s & ~e, n !== 0 && (i = Ze(n))) : i = Ze(o)) : i = Ze(r)), i === 0 ? 0 : t !== 0 && t !== i && (t & a) === 0 && (a = i & -i, n = t & -t, a >= n || a === 32 && n & 4194048) ? t : i;
	}
	function $e(e, t) {
		return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
	}
	function et(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 4:
			case 8:
			case 64: return t + 250;
			case 16:
			case 32:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return t + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return -1;
			case 67108864:
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824: return -1;
			default: return -1;
		}
	}
	function tt() {
		var e = Xe;
		return Xe <<= 1, !(Xe & 62914560) && (Xe = 4194304), e;
	}
	function nt(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function rt(e, t) {
		e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
	}
	function it(e, t, n, r, i, a) {
		var o = e.pendingLanes;
		e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
		var s = e.entanglements, c = e.expirationTimes, l = e.hiddenUpdates;
		for (n = o & ~n; 0 < n;) {
			var u = 31 - We(n), d = 1 << u;
			s[u] = 0, c[u] = -1;
			var f = l[u];
			if (f !== null) for (l[u] = null, u = 0; u < f.length; u++) {
				var p = f[u];
				p !== null && (p.lane &= -536870913);
			}
			n &= ~d;
		}
		r !== 0 && at(e, r, 0), a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t));
	}
	function at(e, t, n) {
		e.pendingLanes |= t, e.suspendedLanes &= ~t;
		var r = 31 - We(t);
		e.entangledLanes |= t, e.entanglements[r] = e.entanglements[r] | 1073741824 | n & 261930;
	}
	function ot(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - We(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	function st(e, t) {
		var n = t & -t;
		return n = n & 42 ? 1 : ct(n), (n & (e.suspendedLanes | t)) === 0 ? n : 0;
	}
	function ct(e) {
		switch (e) {
			case 2:
				e = 1;
				break;
			case 8:
				e = 4;
				break;
			case 32:
				e = 16;
				break;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				e = 128;
				break;
			case 268435456:
				e = 134217728;
				break;
			default: e = 0;
		}
		return e;
	}
	function lt(e) {
		return e &= -e, 2 < e ? 8 < e ? e & 134217727 ? 32 : 268435456 : 8 : 2;
	}
	function ut() {
		var e = k.p;
		return e === 0 ? (e = window.event, e === void 0 ? 32 : mp(e.type)) : e;
	}
	function dt(e, t) {
		var n = k.p;
		try {
			return k.p = e, t();
		} finally {
			k.p = n;
		}
	}
	var ft = Math.random().toString(36).slice(2), pt = "__reactFiber$" + ft, mt = "__reactProps$" + ft, ht = "__reactContainer$" + ft, gt = "__reactEvents$" + ft, _t = "__reactListeners$" + ft, vt = "__reactHandles$" + ft, yt = "__reactResources$" + ft, bt = "__reactMarker$" + ft;
	function xt(e) {
		delete e[pt], delete e[mt], delete e[gt], delete e[_t], delete e[vt];
	}
	function St(e) {
		var t = e[pt];
		if (t) return t;
		for (var n = e.parentNode; n;) {
			if (t = n[ht] || n[pt]) {
				if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = df(e); e !== null;) {
					if (n = e[pt]) return n;
					e = df(e);
				}
				return t;
			}
			e = n, n = e.parentNode;
		}
		return null;
	}
	function Ct(e) {
		if (e = e[pt] || e[ht]) {
			var t = e.tag;
			if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e;
		}
		return null;
	}
	function wt(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
		throw Error(i(33));
	}
	function Tt(e) {
		var t = e[yt];
		return t ||= e[yt] = {
			hoistableStyles: /* @__PURE__ */ new Map(),
			hoistableScripts: /* @__PURE__ */ new Map()
		}, t;
	}
	function Et(e) {
		e[bt] = !0;
	}
	var Dt = /* @__PURE__ */ new Set(), Ot = {};
	function kt(e, t) {
		At(e, t), At(e + "Capture", t);
	}
	function At(e, t) {
		for (Ot[e] = t, e = 0; e < t.length; e++) Dt.add(t[e]);
	}
	var jt = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), Mt = {}, Nt = {};
	function Pt(e) {
		return De.call(Nt, e) ? !0 : De.call(Mt, e) ? !1 : jt.test(e) ? Nt[e] = !0 : (Mt[e] = !0, !1);
	}
	function Ft(e, t, n) {
		if (Pt(t)) {
			if (n === null) e.removeAttribute(t);
			else {
				switch (typeof n) {
					case "undefined":
					case "function":
					case "symbol":
						e.removeAttribute(t);
						return;
					case "boolean":
						var r = t.toLowerCase().slice(0, 5);
						if (r !== "data-" && r !== "aria-") {
							e.removeAttribute(t);
							return;
						}
				}
				e.setAttribute(t, "" + n);
			}
		}
	}
	function It(e, t, n) {
		if (n === null) e.removeAttribute(t);
		else {
			switch (typeof n) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(t);
					return;
			}
			e.setAttribute(t, "" + n);
		}
	}
	function Lt(e, t, n, r) {
		if (r === null) e.removeAttribute(n);
		else {
			switch (typeof r) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(n);
					return;
			}
			e.setAttributeNS(t, n, "" + r);
		}
	}
	function Rt(e) {
		switch (typeof e) {
			case "bigint":
			case "boolean":
			case "number":
			case "string":
			case "undefined": return e;
			case "object": return e;
			default: return "";
		}
	}
	function zt(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function Bt(e, t, n) {
		var r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
		if (!e.hasOwnProperty(t) && r !== void 0 && typeof r.get == "function" && typeof r.set == "function") {
			var i = r.get, a = r.set;
			return Object.defineProperty(e, t, {
				configurable: !0,
				get: function() {
					return i.call(this);
				},
				set: function(e) {
					n = "" + e, a.call(this, e);
				}
			}), Object.defineProperty(e, t, { enumerable: r.enumerable }), {
				getValue: function() {
					return n;
				},
				setValue: function(e) {
					n = "" + e;
				},
				stopTracking: function() {
					e._valueTracker = null, delete e[t];
				}
			};
		}
	}
	function Vt(e) {
		if (!e._valueTracker) {
			var t = zt(e) ? "checked" : "value";
			e._valueTracker = Bt(e, t, "" + e[t]);
		}
	}
	function Ht(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = zt(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	function Ut(e) {
		if (e ||= typeof document < "u" ? document : void 0, e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	var Wt = /[\n"\\]/g;
	function Gt(e) {
		return e.replace(Wt, function(e) {
			return "\\" + e.charCodeAt(0).toString(16) + " ";
		});
	}
	function Kt(e, t, n, r, i, a, o, s) {
		e.name = "", o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" ? e.type = o : e.removeAttribute("type"), t == null ? o !== "submit" && o !== "reset" || e.removeAttribute("value") : o === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + Rt(t)) : e.value !== "" + Rt(t) && (e.value = "" + Rt(t)), t == null ? n == null ? r != null && e.removeAttribute("value") : Jt(e, o, Rt(n)) : Jt(e, o, Rt(t)), i == null && a != null && (e.defaultChecked = !!a), i != null && (e.checked = i && typeof i != "function" && typeof i != "symbol"), s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" ? e.name = "" + Rt(s) : e.removeAttribute("name");
	}
	function qt(e, t, n, r, i, a, o, s) {
		if (a != null && typeof a != "function" && typeof a != "symbol" && typeof a != "boolean" && (e.type = a), t != null || n != null) {
			if (!(a !== "submit" && a !== "reset" || t != null)) {
				Vt(e);
				return;
			}
			n = n == null ? "" : "" + Rt(n), t = t == null ? n : "" + Rt(t), s || t === e.value || (e.value = t), e.defaultValue = t;
		}
		r ??= i, r = typeof r != "function" && typeof r != "symbol" && !!r, e.checked = s ? e.checked : !!r, e.defaultChecked = !!r, o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" && (e.name = o), Vt(e);
	}
	function Jt(e, t, n) {
		t === "number" && Ut(e.ownerDocument) === e || e.defaultValue === "" + n || (e.defaultValue = "" + n);
	}
	function Yt(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + Rt(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function M(e, t, n) {
		if (t != null && (t = "" + Rt(t), t !== e.value && (e.value = t), n == null)) {
			e.defaultValue !== t && (e.defaultValue = t);
			return;
		}
		e.defaultValue = n == null ? "" : "" + Rt(n);
	}
	function Xt(e, t, n, r) {
		if (t == null) {
			if (r != null) {
				if (n != null) throw Error(i(92));
				if (se(r)) {
					if (1 < r.length) throw Error(i(93));
					r = r[0];
				}
				n = r;
			}
			n ??= "", t = n;
		}
		n = Rt(t), e.defaultValue = n, r = e.textContent, r === n && r !== "" && r !== null && (e.value = r), Vt(e);
	}
	function Zt(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var Qt = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
	function $t(e, t, n) {
		var r = t.indexOf("--") === 0;
		n == null || typeof n == "boolean" || n === "" ? r ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : r ? e.setProperty(t, n) : typeof n != "number" || n === 0 || Qt.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px";
	}
	function en(e, t, n) {
		if (t != null && typeof t != "object") throw Error(i(62));
		if (e = e.style, n != null) {
			for (var r in n) !n.hasOwnProperty(r) || t != null && t.hasOwnProperty(r) || (r.indexOf("--") === 0 ? e.setProperty(r, "") : r === "float" ? e.cssFloat = "" : e[r] = "");
			for (var a in t) r = t[a], t.hasOwnProperty(a) && n[a] !== r && $t(e, a, r);
		} else for (var o in t) t.hasOwnProperty(o) && $t(e, o, t[o]);
	}
	function tn(e) {
		if (e.indexOf("-") === -1) return !1;
		switch (e) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return !1;
			default: return !0;
		}
	}
	var nn = /* @__PURE__ */ new Map([
		["acceptCharset", "accept-charset"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"],
		["crossOrigin", "crossorigin"],
		["accentHeight", "accent-height"],
		["alignmentBaseline", "alignment-baseline"],
		["arabicForm", "arabic-form"],
		["baselineShift", "baseline-shift"],
		["capHeight", "cap-height"],
		["clipPath", "clip-path"],
		["clipRule", "clip-rule"],
		["colorInterpolation", "color-interpolation"],
		["colorInterpolationFilters", "color-interpolation-filters"],
		["colorProfile", "color-profile"],
		["colorRendering", "color-rendering"],
		["dominantBaseline", "dominant-baseline"],
		["enableBackground", "enable-background"],
		["fillOpacity", "fill-opacity"],
		["fillRule", "fill-rule"],
		["floodColor", "flood-color"],
		["floodOpacity", "flood-opacity"],
		["fontFamily", "font-family"],
		["fontSize", "font-size"],
		["fontSizeAdjust", "font-size-adjust"],
		["fontStretch", "font-stretch"],
		["fontStyle", "font-style"],
		["fontVariant", "font-variant"],
		["fontWeight", "font-weight"],
		["glyphName", "glyph-name"],
		["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
		["glyphOrientationVertical", "glyph-orientation-vertical"],
		["horizAdvX", "horiz-adv-x"],
		["horizOriginX", "horiz-origin-x"],
		["imageRendering", "image-rendering"],
		["letterSpacing", "letter-spacing"],
		["lightingColor", "lighting-color"],
		["markerEnd", "marker-end"],
		["markerMid", "marker-mid"],
		["markerStart", "marker-start"],
		["overlinePosition", "overline-position"],
		["overlineThickness", "overline-thickness"],
		["paintOrder", "paint-order"],
		["panose-1", "panose-1"],
		["pointerEvents", "pointer-events"],
		["renderingIntent", "rendering-intent"],
		["shapeRendering", "shape-rendering"],
		["stopColor", "stop-color"],
		["stopOpacity", "stop-opacity"],
		["strikethroughPosition", "strikethrough-position"],
		["strikethroughThickness", "strikethrough-thickness"],
		["strokeDasharray", "stroke-dasharray"],
		["strokeDashoffset", "stroke-dashoffset"],
		["strokeLinecap", "stroke-linecap"],
		["strokeLinejoin", "stroke-linejoin"],
		["strokeMiterlimit", "stroke-miterlimit"],
		["strokeOpacity", "stroke-opacity"],
		["strokeWidth", "stroke-width"],
		["textAnchor", "text-anchor"],
		["textDecoration", "text-decoration"],
		["textRendering", "text-rendering"],
		["transformOrigin", "transform-origin"],
		["underlinePosition", "underline-position"],
		["underlineThickness", "underline-thickness"],
		["unicodeBidi", "unicode-bidi"],
		["unicodeRange", "unicode-range"],
		["unitsPerEm", "units-per-em"],
		["vAlphabetic", "v-alphabetic"],
		["vHanging", "v-hanging"],
		["vIdeographic", "v-ideographic"],
		["vMathematical", "v-mathematical"],
		["vectorEffect", "vector-effect"],
		["vertAdvY", "vert-adv-y"],
		["vertOriginX", "vert-origin-x"],
		["vertOriginY", "vert-origin-y"],
		["wordSpacing", "word-spacing"],
		["writingMode", "writing-mode"],
		["xmlnsXlink", "xmlns:xlink"],
		["xHeight", "x-height"]
	]), rn = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function an(e) {
		return rn.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
	}
	function on() {}
	var sn = null;
	function cn(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var ln = null, un = null;
	function dn(e) {
		var t = Ct(e);
		if (t && (e = t.stateNode)) {
			var n = e[mt] || null;
			a: switch (e = t.stateNode, t.type) {
				case "input":
					if (Kt(e, n.value, n.defaultValue, n.defaultValue, n.checked, n.defaultChecked, n.type, n.name), t = n.name, n.type === "radio" && t != null) {
						for (n = e; n.parentNode;) n = n.parentNode;
						for (n = n.querySelectorAll("input[name=\"" + Gt("" + t) + "\"][type=\"radio\"]"), t = 0; t < n.length; t++) {
							var r = n[t];
							if (r !== e && r.form === e.form) {
								var a = r[mt] || null;
								if (!a) throw Error(i(90));
								Kt(r, a.value, a.defaultValue, a.defaultValue, a.checked, a.defaultChecked, a.type, a.name);
							}
						}
						for (t = 0; t < n.length; t++) r = n[t], r.form === e.form && Ht(r);
					}
					break a;
				case "textarea":
					M(e, n.value, n.defaultValue);
					break a;
				case "select": t = n.value, t != null && Yt(e, !!n.multiple, t, !1);
			}
		}
	}
	var fn = !1;
	function pn(e, t, n) {
		if (fn) return e(t, n);
		fn = !0;
		try {
			return e(t);
		} finally {
			if (fn = !1, (ln !== null || un !== null) && (bu(), ln && (t = ln, e = un, un = ln = null, dn(t), e))) for (t = 0; t < e.length; t++) dn(e[t]);
		}
	}
	function mn(e, t) {
		var n = e.stateNode;
		if (n === null) return null;
		var r = n[mt] || null;
		if (r === null) return null;
		n = r[t];
		a: switch (t) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(r = !r.disabled) || (e = e.type, r = e !== "button" && e !== "input" && e !== "select" && e !== "textarea"), e = !r;
				break a;
			default: e = !1;
		}
		if (e) return null;
		if (n && typeof n != "function") throw Error(i(231, t, typeof n));
		return n;
	}
	var hn = !(typeof window > "u" || window.document === void 0 || window.document.createElement === void 0), gn = !1;
	if (hn) try {
		var _n = {};
		Object.defineProperty(_n, "passive", { get: function() {
			gn = !0;
		} }), window.addEventListener("test", _n, _n), window.removeEventListener("test", _n, _n);
	} catch {
		gn = !1;
	}
	var vn = null, yn = null, bn = null;
	function xn() {
		if (bn) return bn;
		var e, t = yn, n = t.length, r, i = "value" in vn ? vn.value : vn.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return bn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function N(e) {
		var t = e.keyCode;
		return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
	}
	function Sn() {
		return !0;
	}
	function Cn() {
		return !1;
	}
	function wn(e) {
		function t(t, n, r, i, a) {
			for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e.hasOwnProperty(o) && (t = e[o], this[o] = t ? t(i) : i[o]);
			return this.isDefaultPrevented = (i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented) ? Sn : Cn, this.isPropagationStopped = Cn, this;
		}
		return h(t.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var e = this.nativeEvent;
				e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = Sn);
			},
			stopPropagation: function() {
				var e = this.nativeEvent;
				e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = Sn);
			},
			persist: function() {},
			isPersistent: Sn
		}), t;
	}
	var Tn = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(e) {
			return e.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	}, En = wn(Tn), Dn = h({}, Tn, {
		view: 0,
		detail: 0
	}), On = wn(Dn), kn, An, jn, Mn = h({}, Dn, {
		screenX: 0,
		screenY: 0,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		getModifierState: Un,
		button: 0,
		buttons: 0,
		relatedTarget: function(e) {
			return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
		},
		movementX: function(e) {
			return "movementX" in e ? e.movementX : (e !== jn && (jn && e.type === "mousemove" ? (kn = e.screenX - jn.screenX, An = e.screenY - jn.screenY) : An = kn = 0, jn = e), kn);
		},
		movementY: function(e) {
			return "movementY" in e ? e.movementY : An;
		}
	}), Nn = wn(Mn), Pn = wn(h({}, Mn, { dataTransfer: 0 })), Fn = wn(h({}, Dn, { relatedTarget: 0 })), In = wn(h({}, Tn, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Ln = wn(h({}, Tn, { clipboardData: function(e) {
		return "clipboardData" in e ? e.clipboardData : window.clipboardData;
	} })), Rn = wn(h({}, Tn, { data: 0 })), zn = {
		Esc: "Escape",
		Spacebar: " ",
		Left: "ArrowLeft",
		Up: "ArrowUp",
		Right: "ArrowRight",
		Down: "ArrowDown",
		Del: "Delete",
		Win: "OS",
		Menu: "ContextMenu",
		Apps: "ContextMenu",
		Scroll: "ScrollLock",
		MozPrintableKey: "Unidentified"
	}, Bn = {
		8: "Backspace",
		9: "Tab",
		12: "Clear",
		13: "Enter",
		16: "Shift",
		17: "Control",
		18: "Alt",
		19: "Pause",
		20: "CapsLock",
		27: "Escape",
		32: " ",
		33: "PageUp",
		34: "PageDown",
		35: "End",
		36: "Home",
		37: "ArrowLeft",
		38: "ArrowUp",
		39: "ArrowRight",
		40: "ArrowDown",
		45: "Insert",
		46: "Delete",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NumLock",
		145: "ScrollLock",
		224: "Meta"
	}, Vn = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function Hn(e) {
		var t = this.nativeEvent;
		return t.getModifierState ? t.getModifierState(e) : (e = Vn[e]) ? !!t[e] : !1;
	}
	function Un() {
		return Hn;
	}
	var Wn = wn(h({}, Dn, {
		key: function(e) {
			if (e.key) {
				var t = zn[e.key] || e.key;
				if (t !== "Unidentified") return t;
			}
			return e.type === "keypress" ? (e = N(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Bn[e.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: Un,
		charCode: function(e) {
			return e.type === "keypress" ? N(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? N(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		}
	})), Gn = wn(h({}, Mn, {
		pointerId: 0,
		width: 0,
		height: 0,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: 0,
		isPrimary: 0
	})), Kn = wn(h({}, Dn, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: Un
	})), qn = wn(h({}, Tn, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Jn = wn(h({}, Mn, {
		deltaX: function(e) {
			return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
		},
		deltaY: function(e) {
			return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	})), Yn = wn(h({}, Tn, {
		newState: 0,
		oldState: 0
	})), Xn = [
		9,
		13,
		27,
		32
	], Zn = hn && "CompositionEvent" in window, Qn = null;
	hn && "documentMode" in document && (Qn = document.documentMode);
	var $n = hn && "TextEvent" in window && !Qn, er = hn && (!Zn || Qn && 8 < Qn && 11 >= Qn), tr = " ", nr = !1;
	function rr(e, t) {
		switch (e) {
			case "keyup": return Xn.indexOf(t.keyCode) !== -1;
			case "keydown": return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function ir(e) {
		return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
	}
	var ar = !1;
	function or(e, t) {
		switch (e) {
			case "compositionend": return ir(t);
			case "keypress": return t.which === 32 ? (nr = !0, tr) : null;
			case "textInput": return e = t.data, e === tr && nr ? null : e;
			default: return null;
		}
	}
	function sr(e, t) {
		if (ar) return e === "compositionend" || !Zn && rr(e, t) ? (e = xn(), bn = yn = vn = null, ar = !1, e) : null;
		switch (e) {
			case "paste": return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend": return er && t.locale !== "ko" ? null : t.data;
			default: return null;
		}
	}
	var cr = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0
	};
	function lr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!cr[e.type] : t === "textarea";
	}
	function ur(e, t, n, r) {
		ln ? un ? un.push(r) : un = [r] : ln = r, t = Ed(t, "onChange"), 0 < t.length && (n = new En("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var dr = null, fr = null;
	function pr(e) {
		yd(e, 0);
	}
	function mr(e) {
		if (Ht(wt(e))) return e;
	}
	function hr(e, t) {
		if (e === "change") return t;
	}
	var gr = !1;
	if (hn) {
		var _r;
		if (hn) {
			var vr = "oninput" in document;
			if (!vr) {
				var yr = document.createElement("div");
				yr.setAttribute("oninput", "return;"), vr = typeof yr.oninput == "function";
			}
			_r = vr;
		} else _r = !1;
		gr = _r && (!document.documentMode || 9 < document.documentMode);
	}
	function br() {
		dr && (dr.detachEvent("onpropertychange", xr), fr = dr = null);
	}
	function xr(e) {
		if (e.propertyName === "value" && mr(fr)) {
			var t = [];
			ur(t, fr, e, cn(e)), pn(pr, t);
		}
	}
	function Sr(e, t, n) {
		e === "focusin" ? (br(), dr = t, fr = n, dr.attachEvent("onpropertychange", xr)) : e === "focusout" && br();
	}
	function Cr(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return mr(fr);
	}
	function wr(e, t) {
		if (e === "click") return mr(t);
	}
	function Tr(e, t) {
		if (e === "input" || e === "change") return mr(t);
	}
	function Er(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var Dr = typeof Object.is == "function" ? Object.is : Er;
	function Or(e, t) {
		if (Dr(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!De.call(t, i) || !Dr(e[i], t[i])) return !1;
		}
		return !0;
	}
	function kr(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function Ar(e, t) {
		var n = kr(e);
		e = 0;
		for (var r; n;) {
			if (n.nodeType === 3) {
				if (r = e + n.textContent.length, e <= t && r >= t) return {
					node: n,
					offset: t - e
				};
				e = r;
			}
			a: {
				for (; n;) {
					if (n.nextSibling) {
						n = n.nextSibling;
						break a;
					}
					n = n.parentNode;
				}
				n = void 0;
			}
			n = kr(n);
		}
	}
	function jr(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? jr(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function Mr(e) {
		e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
		for (var t = Ut(e.document); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = Ut(e.document);
		}
		return t;
	}
	function Nr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	var Pr = hn && "documentMode" in document && 11 >= document.documentMode, Fr = null, Ir = null, Lr = null, Rr = !1;
	function P(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		Rr || Fr == null || Fr !== Ut(r) || (r = Fr, "selectionStart" in r && Nr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), Lr && Or(Lr, r) || (Lr = r, r = Ed(Ir, "onSelect"), 0 < r.length && (t = new En("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = Fr)));
	}
	function zr(e, t) {
		var n = {};
		return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
	}
	var Br = {
		animationend: zr("Animation", "AnimationEnd"),
		animationiteration: zr("Animation", "AnimationIteration"),
		animationstart: zr("Animation", "AnimationStart"),
		transitionrun: zr("Transition", "TransitionRun"),
		transitionstart: zr("Transition", "TransitionStart"),
		transitioncancel: zr("Transition", "TransitionCancel"),
		transitionend: zr("Transition", "TransitionEnd")
	}, Vr = {}, Hr = {};
	hn && (Hr = document.createElement("div").style, "AnimationEvent" in window || (delete Br.animationend.animation, delete Br.animationiteration.animation, delete Br.animationstart.animation), "TransitionEvent" in window || delete Br.transitionend.transition);
	function Ur(e) {
		if (Vr[e]) return Vr[e];
		if (!Br[e]) return e;
		var t = Br[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in Hr) return Vr[e] = t[n];
		return e;
	}
	var Wr = Ur("animationend"), Gr = Ur("animationiteration"), Kr = Ur("animationstart"), qr = Ur("transitionrun"), Jr = Ur("transitionstart"), Yr = Ur("transitioncancel"), Xr = Ur("transitionend"), F = /* @__PURE__ */ new Map(), Zr = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	Zr.push("scrollEnd");
	function Qr(e, t) {
		F.set(e, t), kt(t, [e]);
	}
	var $r = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	}, ei = [], ti = 0, ni = 0;
	function ri() {
		for (var e = ti, t = ni = ti = 0; t < e;) {
			var n = ei[t];
			ei[t++] = null;
			var r = ei[t];
			ei[t++] = null;
			var i = ei[t];
			ei[t++] = null;
			var a = ei[t];
			if (ei[t++] = null, r !== null && i !== null) {
				var o = r.pending;
				o === null ? i.next = i : (i.next = o.next, o.next = i), r.pending = i;
			}
			a !== 0 && si(n, i, a);
		}
	}
	function ii(e, t, n, r) {
		ei[ti++] = e, ei[ti++] = t, ei[ti++] = n, ei[ti++] = r, ni |= r, e.lanes |= r, e = e.alternate, e !== null && (e.lanes |= r);
	}
	function ai(e, t, n, r) {
		return ii(e, t, n, r), ci(e);
	}
	function oi(e, t) {
		return ii(e, null, null, t), ci(e);
	}
	function si(e, t, n) {
		e.lanes |= n;
		var r = e.alternate;
		r !== null && (r.lanes |= n);
		for (var i = !1, a = e.return; a !== null;) a.childLanes |= n, r = a.alternate, r !== null && (r.childLanes |= n), a.tag === 22 && (e = a.stateNode, e === null || e._visibility & 1 || (i = !0)), e = a, a = a.return;
		return e.tag === 3 ? (a = e.stateNode, i && t !== null && (i = 31 - We(n), e = a.hiddenUpdates, r = e[i], r === null ? e[i] = [t] : r.push(t), t.lane = n | 536870912), a) : null;
	}
	function ci(e) {
		if (50 < du) throw du = 0, fu = null, Error(i(185));
		for (var t = e.return; t !== null;) e = t, t = e.return;
		return e.tag === 3 ? e.stateNode : null;
	}
	var li = {};
	function ui(e, t, n, r) {
		this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
	}
	function di(e, t, n, r) {
		return new ui(e, t, n, r);
	}
	function fi(e) {
		return e = e.prototype, !(!e || !e.isReactComponent);
	}
	function pi(e, t) {
		var n = e.alternate;
		return n === null ? (n = di(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 65011712, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
	}
	function mi(e, t) {
		e.flags &= 65011714;
		var n = e.alternate;
		return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}), e;
	}
	function hi(e, t, n, r, a, o) {
		var s = 0;
		if (r = e, typeof e == "function") fi(e) && (s = 1);
		else if (typeof e == "string") s = Uf(e, n, pe.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
		else a: switch (e) {
			case te: return e = di(31, n, t, a), e.elementType = te, e.lanes = o, e;
			case y: return I(n.children, a, o, t);
			case b:
				s = 8, a |= 24;
				break;
			case x: return e = di(12, n, t, a | 2), e.elementType = x, e.lanes = o, e;
			case T: return e = di(13, n, t, a), e.elementType = T, e.lanes = o, e;
			case E: return e = di(19, n, t, a), e.elementType = E, e.lanes = o, e;
			default:
				if (typeof e == "object" && e) switch (e.$$typeof) {
					case C:
						s = 10;
						break a;
					case S:
						s = 9;
						break a;
					case w:
						s = 11;
						break a;
					case ee:
						s = 14;
						break a;
					case D:
						s = 16, r = null;
						break a;
				}
				s = 29, n = Error(i(130, e === null ? "null" : typeof e, "")), r = null;
		}
		return t = di(s, n, t, a), t.elementType = e, t.type = r, t.lanes = o, t;
	}
	function I(e, t, n, r) {
		return e = di(7, e, r, t), e.lanes = n, e;
	}
	function gi(e, t, n) {
		return e = di(6, e, null, t), e.lanes = n, e;
	}
	function _i(e) {
		var t = di(18, null, null, 0);
		return t.stateNode = e, t;
	}
	function vi(e, t, n) {
		return t = di(4, e.children === null ? [] : e.children, e.key, t), t.lanes = n, t.stateNode = {
			containerInfo: e.containerInfo,
			pendingChildren: null,
			implementation: e.implementation
		}, t;
	}
	var yi = /* @__PURE__ */ new WeakMap();
	function bi(e, t) {
		if (typeof e == "object" && e) {
			var n = yi.get(e);
			return n === void 0 ? (t = {
				value: e,
				source: t,
				stack: Ee(t)
			}, yi.set(e, t), t) : n;
		}
		return {
			value: e,
			source: t,
			stack: Ee(t)
		};
	}
	var xi = [], Si = 0, Ci = null, wi = 0, Ti = [], Ei = 0, Di = null, Oi = 1, ki = "";
	function Ai(e, t) {
		xi[Si++] = wi, xi[Si++] = Ci, Ci = e, wi = t;
	}
	function ji(e, t, n) {
		Ti[Ei++] = Oi, Ti[Ei++] = ki, Ti[Ei++] = Di, Di = e;
		var r = Oi;
		e = ki;
		var i = 32 - We(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - We(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, Oi = 1 << 32 - We(t) + i | n << i | r, ki = a + e;
		} else Oi = 1 << a | n << i | r, ki = e;
	}
	function Mi(e) {
		e.return !== null && (Ai(e, 1), ji(e, 1, 0));
	}
	function Ni(e) {
		for (; e === Ci;) Ci = xi[--Si], xi[Si] = null, wi = xi[--Si], xi[Si] = null;
		for (; e === Di;) Di = Ti[--Ei], Ti[Ei] = null, ki = Ti[--Ei], Ti[Ei] = null, Oi = Ti[--Ei], Ti[Ei] = null;
	}
	function Pi(e, t) {
		Ti[Ei++] = Oi, Ti[Ei++] = ki, Ti[Ei++] = Di, Oi = t.id, ki = t.overflow, Di = e;
	}
	var Fi = null, L = null, R = !1, Ii = null, Li = !1, Ri = Error(i(519));
	function zi(e) {
		throw Gi(bi(Error(i(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", "")), e)), Ri;
	}
	function Bi(e) {
		var t = e.stateNode, n = e.type, r = e.memoizedProps;
		switch (t[pt] = e, t[mt] = r, n) {
			case "dialog":
				Q("cancel", t), Q("close", t);
				break;
			case "iframe":
			case "object":
			case "embed":
				Q("load", t);
				break;
			case "video":
			case "audio":
				for (n = 0; n < _d.length; n++) Q(_d[n], t);
				break;
			case "source":
				Q("error", t);
				break;
			case "img":
			case "image":
			case "link":
				Q("error", t), Q("load", t);
				break;
			case "details":
				Q("toggle", t);
				break;
			case "input":
				Q("invalid", t), qt(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0);
				break;
			case "select":
				Q("invalid", t);
				break;
			case "textarea": Q("invalid", t), Xt(t, r.value, r.defaultValue, r.children);
		}
		n = r.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || !0 === r.suppressHydrationWarning || Md(t.textContent, n) ? (r.popover != null && (Q("beforetoggle", t), Q("toggle", t)), r.onScroll != null && Q("scroll", t), r.onScrollEnd != null && Q("scrollend", t), r.onClick != null && (t.onclick = on), t = !0) : t = !1, t || zi(e, !0);
	}
	function Vi(e) {
		for (Fi = e.return; Fi;) switch (Fi.tag) {
			case 5:
			case 31:
			case 13:
				Li = !1;
				return;
			case 27:
			case 3:
				Li = !0;
				return;
			default: Fi = Fi.return;
		}
	}
	function Hi(e) {
		if (e !== Fi) return !1;
		if (!R) return Vi(e), R = !0, !1;
		var t = e.tag, n;
		if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = n === "form" || n === "button" || Ud(e.type, e.memoizedProps)), n = !n), n && L && zi(e), Vi(e), t === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(317));
			L = uf(e);
		} else if (t === 31) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(317));
			L = uf(e);
		} else t === 27 ? (t = L, Zd(e.type) ? (e = lf, lf = null, L = e) : L = t) : L = Fi ? cf(e.stateNode.nextSibling) : null;
		return !0;
	}
	function Ui() {
		L = Fi = null, R = !1;
	}
	function Wi() {
		var e = Ii;
		return e !== null && (Zl === null ? Zl = e : Zl.push.apply(Zl, e), Ii = null), e;
	}
	function Gi(e) {
		Ii === null ? Ii = [e] : Ii.push(e);
	}
	var Ki = de(null), qi = null, Ji = null;
	function Yi(e, t, n) {
		A(Ki, t._currentValue), t._currentValue = n;
	}
	function Xi(e) {
		e._currentValue = Ki.current, fe(Ki);
	}
	function Zi(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function Qi(e, t, n, r) {
		var a = e.child;
		for (a !== null && (a.return = e); a !== null;) {
			var o = a.dependencies;
			if (o !== null) {
				var s = a.child;
				o = o.firstContext;
				a: for (; o !== null;) {
					var c = o;
					o = a;
					for (var l = 0; l < t.length; l++) if (c.context === t[l]) {
						o.lanes |= n, c = o.alternate, c !== null && (c.lanes |= n), Zi(o.return, n, e), r || (s = null);
						break a;
					}
					o = c.next;
				}
			} else if (a.tag === 18) {
				if (s = a.return, s === null) throw Error(i(341));
				s.lanes |= n, o = s.alternate, o !== null && (o.lanes |= n), Zi(s, n, e), s = null;
			} else s = a.child;
			if (s !== null) s.return = a;
			else for (s = a; s !== null;) {
				if (s === e) {
					s = null;
					break;
				}
				if (a = s.sibling, a !== null) {
					a.return = s.return, s = a;
					break;
				}
				s = s.return;
			}
			a = s;
		}
	}
	function $i(e, t, n, r) {
		e = null;
		for (var a = t, o = !1; a !== null;) {
			if (!o) {
				if (a.flags & 524288) o = !0;
				else if (a.flags & 262144) break;
			}
			if (a.tag === 10) {
				var s = a.alternate;
				if (s === null) throw Error(i(387));
				if (s = s.memoizedProps, s !== null) {
					var c = a.type;
					Dr(a.pendingProps.value, s.value) || (e === null ? e = [c] : e.push(c));
				}
			} else if (a === ge.current) {
				if (s = a.alternate, s === null) throw Error(i(387));
				s.memoizedState.memoizedState !== a.memoizedState.memoizedState && (e === null ? e = [Qf] : e.push(Qf));
			}
			a = a.return;
		}
		e !== null && Qi(t, e, n, r), t.flags |= 262144;
	}
	function ea(e) {
		for (e = e.firstContext; e !== null;) {
			if (!Dr(e.context._currentValue, e.memoizedValue)) return !0;
			e = e.next;
		}
		return !1;
	}
	function ta(e) {
		qi = e, Ji = null, e = e.dependencies, e !== null && (e.firstContext = null);
	}
	function na(e) {
		return ia(qi, e);
	}
	function ra(e, t) {
		return qi === null && ta(e), ia(e, t);
	}
	function ia(e, t) {
		var n = t._currentValue;
		if (t = {
			context: t,
			memoizedValue: n,
			next: null
		}, Ji === null) {
			if (e === null) throw Error(i(308));
			Ji = t, e.dependencies = {
				lanes: 0,
				firstContext: t
			}, e.flags |= 524288;
		} else Ji = Ji.next = t;
		return n;
	}
	var aa = typeof AbortController < "u" ? AbortController : function() {
		var e = [], t = this.signal = {
			aborted: !1,
			addEventListener: function(t, n) {
				e.push(n);
			}
		};
		this.abort = function() {
			t.aborted = !0, e.forEach(function(e) {
				return e();
			});
		};
	}, oa = t.unstable_scheduleCallback, sa = t.unstable_NormalPriority, ca = {
		$$typeof: C,
		Consumer: null,
		Provider: null,
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0
	};
	function la() {
		return {
			controller: new aa(),
			data: /* @__PURE__ */ new Map(),
			refCount: 0
		};
	}
	function ua(e) {
		e.refCount--, e.refCount === 0 && oa(sa, function() {
			e.controller.abort();
		});
	}
	var da = null, fa = 0, z = 0, pa = null;
	function ma(e, t) {
		if (da === null) {
			var n = da = [];
			fa = 0, z = dd(), pa = {
				status: "pending",
				value: void 0,
				then: function(e) {
					n.push(e);
				}
			};
		}
		return fa++, t.then(ha, ha), t;
	}
	function ha() {
		if (--fa === 0 && da !== null) {
			pa !== null && (pa.status = "fulfilled");
			var e = da;
			da = null, z = 0, pa = null;
			for (var t = 0; t < e.length; t++) (0, e[t])();
		}
	}
	function ga(e, t) {
		var n = [], r = {
			status: "pending",
			value: null,
			reason: null,
			then: function(e) {
				n.push(e);
			}
		};
		return e.then(function() {
			r.status = "fulfilled", r.value = t;
			for (var e = 0; e < n.length; e++) (0, n[e])(t);
		}, function(e) {
			for (r.status = "rejected", r.reason = e, e = 0; e < n.length; e++) (0, n[e])(void 0);
		}), r;
	}
	var _a = O.S;
	O.S = function(e, t) {
		eu = Me(), typeof t == "object" && t && typeof t.then == "function" && ma(e, t), _a !== null && _a(e, t);
	};
	var va = de(null);
	function ya() {
		var e = va.current;
		return e === null ? q.pooledCache : e;
	}
	function ba(e, t) {
		t === null ? A(va, va.current) : A(va, t.pool);
	}
	function B() {
		var e = ya();
		return e === null ? null : {
			parent: ca._currentValue,
			pool: e
		};
	}
	var xa = Error(i(460)), Sa = Error(i(474)), Ca = Error(i(542)), wa = { then: function() {} };
	function Ta(e) {
		return e = e.status, e === "fulfilled" || e === "rejected";
	}
	function Ea(e, t, n) {
		switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(on, on), t = n), t.status) {
			case "fulfilled": return t.value;
			case "rejected": throw e = t.reason, Aa(e), e;
			default:
				if (typeof t.status == "string") t.then(on, on);
				else {
					if (e = q, e !== null && 100 < e.shellSuspendCounter) throw Error(i(482));
					e = t, e.status = "pending", e.then(function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "fulfilled", n.value = e;
						}
					}, function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "rejected", n.reason = e;
						}
					});
				}
				switch (t.status) {
					case "fulfilled": return t.value;
					case "rejected": throw e = t.reason, Aa(e), e;
				}
				throw Oa = t, xa;
		}
	}
	function Da(e) {
		try {
			var t = e._init;
			return t(e._payload);
		} catch (e) {
			throw typeof e == "object" && e && typeof e.then == "function" ? (Oa = e, xa) : e;
		}
	}
	var Oa = null;
	function ka() {
		if (Oa === null) throw Error(i(459));
		var e = Oa;
		return Oa = null, e;
	}
	function Aa(e) {
		if (e === xa || e === Ca) throw Error(i(483));
	}
	var ja = null, Ma = 0;
	function Na(e) {
		var t = Ma;
		return Ma += 1, ja === null && (ja = []), Ea(ja, e, t);
	}
	function Pa(e, t) {
		t = t.props.ref, e.ref = t === void 0 ? null : t;
	}
	function Fa(e, t) {
		throw t.$$typeof === g ? Error(i(525)) : (e = Object.prototype.toString.call(t), Error(i(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
	}
	function Ia(e) {
		function t(t, n) {
			if (e) {
				var r = t.deletions;
				r === null ? (t.deletions = [n], t.flags |= 16) : r.push(n);
			}
		}
		function n(n, r) {
			if (!e) return null;
			for (; r !== null;) t(n, r), r = r.sibling;
			return null;
		}
		function r(e) {
			for (var t = /* @__PURE__ */ new Map(); e !== null;) e.key === null ? t.set(e.index, e) : t.set(e.key, e), e = e.sibling;
			return t;
		}
		function a(e, t) {
			return e = pi(e, t), e.index = 0, e.sibling = null, e;
		}
		function o(t, n, r) {
			return t.index = r, e ? (r = t.alternate, r === null ? (t.flags |= 67108866, n) : (r = r.index, r < n ? (t.flags |= 67108866, n) : r)) : (t.flags |= 1048576, n);
		}
		function s(t) {
			return e && t.alternate === null && (t.flags |= 67108866), t;
		}
		function c(e, t, n, r) {
			return t === null || t.tag !== 6 ? (t = gi(n, e.mode, r), t.return = e, t) : (t = a(t, n), t.return = e, t);
		}
		function l(e, t, n, r) {
			var i = n.type;
			return i === y ? d(e, t, n.props.children, r, n.key) : t !== null && (t.elementType === i || typeof i == "object" && i && i.$$typeof === D && Da(i) === t.type) ? (t = a(t, n.props), Pa(t, n), t.return = e, t) : (t = hi(n.type, n.key, n.props, null, e.mode, r), Pa(t, n), t.return = e, t);
		}
		function u(e, t, n, r) {
			return t === null || t.tag !== 4 || t.stateNode.containerInfo !== n.containerInfo || t.stateNode.implementation !== n.implementation ? (t = vi(n, e.mode, r), t.return = e, t) : (t = a(t, n.children || []), t.return = e, t);
		}
		function d(e, t, n, r, i) {
			return t === null || t.tag !== 7 ? (t = I(n, e.mode, r, i), t.return = e, t) : (t = a(t, n), t.return = e, t);
		}
		function f(e, t, n) {
			if (typeof t == "string" && t !== "" || typeof t == "number" || typeof t == "bigint") return t = gi("" + t, e.mode, n), t.return = e, t;
			if (typeof t == "object" && t) {
				switch (t.$$typeof) {
					case _: return n = hi(t.type, t.key, t.props, null, e.mode, n), Pa(n, t), n.return = e, n;
					case v: return t = vi(t, e.mode, n), t.return = e, t;
					case D: return t = Da(t), f(e, t, n);
				}
				if (se(t) || ie(t)) return t = I(t, e.mode, n, null), t.return = e, t;
				if (typeof t.then == "function") return f(e, Na(t), n);
				if (t.$$typeof === C) return f(e, ra(e, t), n);
				Fa(e, t);
			}
			return null;
		}
		function p(e, t, n, r) {
			var i = t === null ? null : t.key;
			if (typeof n == "string" && n !== "" || typeof n == "number" || typeof n == "bigint") return i === null ? c(e, t, "" + n, r) : null;
			if (typeof n == "object" && n) {
				switch (n.$$typeof) {
					case _: return n.key === i ? l(e, t, n, r) : null;
					case v: return n.key === i ? u(e, t, n, r) : null;
					case D: return n = Da(n), p(e, t, n, r);
				}
				if (se(n) || ie(n)) return i === null ? d(e, t, n, r, null) : null;
				if (typeof n.then == "function") return p(e, t, Na(n), r);
				if (n.$$typeof === C) return p(e, t, ra(e, n), r);
				Fa(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case _: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case v: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case D: return r = Da(r), m(e, t, n, r, i);
				}
				if (se(r) || ie(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				if (typeof r.then == "function") return m(e, t, n, Na(r), i);
				if (r.$$typeof === C) return m(e, t, n, ra(t, r), i);
				Fa(t, r);
			}
			return null;
		}
		function h(i, a, s, c) {
			for (var l = null, u = null, d = a, h = a = 0, g = null; d !== null && h < s.length; h++) {
				d.index > h ? (g = d, d = null) : g = d.sibling;
				var _ = p(i, d, s[h], c);
				if (_ === null) {
					d === null && (d = g);
					break;
				}
				e && d && _.alternate === null && t(i, d), a = o(_, a, h), u === null ? l = _ : u.sibling = _, u = _, d = g;
			}
			if (h === s.length) return n(i, d), R && Ai(i, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(i, s[h], c), d !== null && (a = o(d, a, h), u === null ? l = d : u.sibling = d, u = d);
				return R && Ai(i, h), l;
			}
			for (d = r(d); h < s.length; h++) g = m(d, i, h, s[h], c), g !== null && (e && g.alternate !== null && d.delete(g.key === null ? h : g.key), a = o(g, a, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(i, e);
			}), R && Ai(i, h), l;
		}
		function g(a, s, c, l) {
			if (c == null) throw Error(i(151));
			for (var u = null, d = null, h = s, g = s = 0, _ = null, v = c.next(); h !== null && !v.done; g++, v = c.next()) {
				h.index > g ? (_ = h, h = null) : _ = h.sibling;
				var y = p(a, h, v.value, l);
				if (y === null) {
					h === null && (h = _);
					break;
				}
				e && h && y.alternate === null && t(a, h), s = o(y, s, g), d === null ? u = y : d.sibling = y, d = y, h = _;
			}
			if (v.done) return n(a, h), R && Ai(a, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(a, v.value, l), v !== null && (s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
				return R && Ai(a, g), u;
			}
			for (h = r(h); !v.done; g++, v = c.next()) v = m(h, a, g, v.value, l), v !== null && (e && v.alternate !== null && h.delete(v.key === null ? g : v.key), s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(a, e);
			}), R && Ai(a, g), u;
		}
		function b(e, r, o, c) {
			if (typeof o == "object" && o && o.type === y && o.key === null && (o = o.props.children), typeof o == "object" && o) {
				switch (o.$$typeof) {
					case _:
						a: {
							for (var l = o.key; r !== null;) {
								if (r.key === l) {
									if (l = o.type, l === y) {
										if (r.tag === 7) {
											n(e, r.sibling), c = a(r, o.props.children), c.return = e, e = c;
											break a;
										}
									} else if (r.elementType === l || typeof l == "object" && l && l.$$typeof === D && Da(l) === r.type) {
										n(e, r.sibling), c = a(r, o.props), Pa(c, o), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							o.type === y ? (c = I(o.props.children, e.mode, c, o.key), c.return = e, e = c) : (c = hi(o.type, o.key, o.props, null, e.mode, c), Pa(c, o), c.return = e, e = c);
						}
						return s(e);
					case v:
						a: {
							for (l = o.key; r !== null;) {
								if (r.key === l) {
									if (r.tag === 4 && r.stateNode.containerInfo === o.containerInfo && r.stateNode.implementation === o.implementation) {
										n(e, r.sibling), c = a(r, o.children || []), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							c = vi(o, e.mode, c), c.return = e, e = c;
						}
						return s(e);
					case D: return o = Da(o), b(e, r, o, c);
				}
				if (se(o)) return h(e, r, o, c);
				if (ie(o)) {
					if (l = ie(o), typeof l != "function") throw Error(i(150));
					return o = l.call(o), g(e, r, o, c);
				}
				if (typeof o.then == "function") return b(e, r, Na(o), c);
				if (o.$$typeof === C) return b(e, r, ra(e, o), c);
				Fa(e, o);
			}
			return typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint" ? (o = "" + o, r !== null && r.tag === 6 ? (n(e, r.sibling), c = a(r, o), c.return = e, e = c) : (n(e, r), c = gi(o, e.mode, c), c.return = e, e = c), s(e)) : n(e, r);
		}
		return function(e, t, n, r) {
			try {
				Ma = 0;
				var i = b(e, t, n, r);
				return ja = null, i;
			} catch (t) {
				if (t === xa || t === Ca) throw t;
				var a = di(29, t, null, e.mode);
				return a.lanes = r, a.return = e, a;
			}
		};
	}
	var La = Ia(!0), Ra = Ia(!1), za = !1;
	function Ba(e) {
		e.updateQueue = {
			baseState: e.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: {
				pending: null,
				lanes: 0,
				hiddenCallbacks: null
			},
			callbacks: null
		};
	}
	function Va(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			callbacks: null
		});
	}
	function Ha(e) {
		return {
			lane: e,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function Ua(e, t, n) {
		var r = e.updateQueue;
		if (r === null) return null;
		if (r = r.shared, K & 2) {
			var i = r.pending;
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, t = ci(e), si(e, null, n), t;
		}
		return ii(e, r, t, n), ci(e);
	}
	function Wa(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194048)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, ot(e, n);
		}
	}
	function Ga(e, t) {
		var n = e.updateQueue, r = e.alternate;
		if (r !== null && (r = r.updateQueue, n === r)) {
			var i = null, a = null;
			if (n = n.firstBaseUpdate, n !== null) {
				do {
					var o = {
						lane: n.lane,
						tag: n.tag,
						payload: n.payload,
						callback: null,
						next: null
					};
					a === null ? i = a = o : a = a.next = o, n = n.next;
				} while (n !== null);
				a === null ? i = a = t : a = a.next = t;
			} else i = a = t;
			n = {
				baseState: r.baseState,
				firstBaseUpdate: i,
				lastBaseUpdate: a,
				shared: r.shared,
				callbacks: r.callbacks
			}, e.updateQueue = n;
			return;
		}
		e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
	}
	var Ka = !1;
	function qa() {
		if (Ka) {
			var e = pa;
			if (e !== null) throw e;
		}
	}
	function Ja(e, t, n, r) {
		Ka = !1;
		var i = e.updateQueue;
		za = !1;
		var a = i.firstBaseUpdate, o = i.lastBaseUpdate, s = i.shared.pending;
		if (s !== null) {
			i.shared.pending = null;
			var c = s, l = c.next;
			c.next = null, o === null ? a = l : o.next = l, o = c;
			var u = e.alternate;
			u !== null && (u = u.updateQueue, s = u.lastBaseUpdate, s !== o && (s === null ? u.firstBaseUpdate = l : s.next = l, u.lastBaseUpdate = c));
		}
		if (a !== null) {
			var d = i.baseState;
			o = 0, u = l = c = null, s = a;
			do {
				var f = s.lane & -536870913, p = f !== s.lane;
				if (p ? (Y & f) === f : (r & f) === f) {
					f !== 0 && f === z && (Ka = !0), u !== null && (u = u.next = {
						lane: 0,
						tag: s.tag,
						payload: s.payload,
						callback: null,
						next: null
					});
					a: {
						var m = e, g = s;
						f = t;
						var _ = n;
						switch (g.tag) {
							case 1:
								if (m = g.payload, typeof m == "function") {
									d = m.call(_, d, f);
									break a;
								}
								d = m;
								break a;
							case 3: m.flags = m.flags & -65537 | 128;
							case 0:
								if (m = g.payload, f = typeof m == "function" ? m.call(_, d, f) : m, f == null) break a;
								d = h({}, d, f);
								break a;
							case 2: za = !0;
						}
					}
					f = s.callback, f !== null && (e.flags |= 64, p && (e.flags |= 8192), p = i.callbacks, p === null ? i.callbacks = [f] : p.push(f));
				} else p = {
					lane: f,
					tag: s.tag,
					payload: s.payload,
					callback: s.callback,
					next: null
				}, u === null ? (l = u = p, c = d) : u = u.next = p, o |= f;
				if (s = s.next, s === null) {
					if (s = i.shared.pending, s === null) break;
					p = s, s = p.next, p.next = null, i.lastBaseUpdate = p, i.shared.pending = null;
				}
			} while (1);
			u === null && (c = d), i.baseState = c, i.firstBaseUpdate = l, i.lastBaseUpdate = u, a === null && (i.shared.lanes = 0), Gl |= o, e.lanes = o, e.memoizedState = d;
		}
	}
	function Ya(e, t) {
		if (typeof e != "function") throw Error(i(191, e));
		e.call(t);
	}
	function Xa(e, t) {
		var n = e.callbacks;
		if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) Ya(n[e], t);
	}
	var Za = de(null), Qa = de(0);
	function $a(e, t) {
		e = Ul, A(Qa, e), A(Za, t), Ul = e | t.baseLanes;
	}
	function eo() {
		A(Qa, Ul), A(Za, Za.current);
	}
	function to() {
		Ul = Qa.current, fe(Za), fe(Qa);
	}
	var no = de(null), ro = null;
	function V(e) {
		var t = e.alternate;
		A(co, co.current & 1), A(no, e), ro === null && (t === null || Za.current !== null || t.memoizedState !== null) && (ro = e);
	}
	function io(e) {
		A(co, co.current), A(no, e), ro === null && (ro = e);
	}
	function ao(e) {
		e.tag === 22 ? (A(co, co.current), A(no, e), ro === null && (ro = e)) : oo(e);
	}
	function oo() {
		A(co, co.current), A(no, no.current);
	}
	function so(e) {
		fe(no), ro === e && (ro = null), fe(co);
	}
	var co = de(0);
	function lo(e) {
		for (var t = e; t !== null;) {
			if (t.tag === 13) {
				var n = t.memoizedState;
				if (n !== null && (n = n.dehydrated, n === null || af(n) || of(n))) return t;
			} else if (t.tag === 19 && (t.memoizedProps.revealOrder === "forwards" || t.memoizedProps.revealOrder === "backwards" || t.memoizedProps.revealOrder === "unstable_legacy-backwards" || t.memoizedProps.revealOrder === "together")) {
				if (t.flags & 128) return t;
			} else if (t.child !== null) {
				t.child.return = t, t = t.child;
				continue;
			}
			if (t === e) break;
			for (; t.sibling === null;) {
				if (t.return === null || t.return === e) return null;
				t = t.return;
			}
			t.sibling.return = t.return, t = t.sibling;
		}
		return null;
	}
	var uo = 0, H = null, U = null, fo = null, po = !1, mo = !1, ho = !1, go = 0, _o = 0, vo = null, yo = 0;
	function bo() {
		throw Error(i(321));
	}
	function xo(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!Dr(e[n], t[n])) return !1;
		return !0;
	}
	function So(e, t, n, r, i, a) {
		return uo = a, H = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, O.H = e === null || e.memoizedState === null ? zs : Bs, ho = !1, a = n(r, i), ho = !1, mo && (a = wo(t, n, r, i)), Co(e), a;
	}
	function Co(e) {
		O.H = Rs;
		var t = U !== null && U.next !== null;
		if (uo = 0, fo = U = H = null, po = !1, _o = 0, vo = null, t) throw Error(i(300));
		e === null || rc || (e = e.dependencies, e !== null && ea(e) && (rc = !0));
	}
	function wo(e, t, n, r) {
		H = e;
		var a = 0;
		do {
			if (mo && (vo = null), _o = 0, mo = !1, 25 <= a) throw Error(i(301));
			if (a += 1, fo = U = null, e.updateQueue != null) {
				var o = e.updateQueue;
				o.lastEffect = null, o.events = null, o.stores = null, o.memoCache != null && (o.memoCache.index = 0);
			}
			O.H = Vs, o = t(n, r);
		} while (mo);
		return o;
	}
	function To() {
		var e = O.H, t = e.useState()[0];
		return t = typeof t.then == "function" ? Mo(t) : t, e = e.useState()[0], (U === null ? null : U.memoizedState) !== e && (H.flags |= 1024), t;
	}
	function Eo() {
		var e = go !== 0;
		return go = 0, e;
	}
	function Do(e, t, n) {
		t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
	}
	function Oo(e) {
		if (po) {
			for (e = e.memoizedState; e !== null;) {
				var t = e.queue;
				t !== null && (t.pending = null), e = e.next;
			}
			po = !1;
		}
		uo = 0, fo = U = H = null, mo = !1, _o = go = 0, vo = null;
	}
	function ko() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return fo === null ? H.memoizedState = fo = e : fo = fo.next = e, fo;
	}
	function Ao() {
		if (U === null) {
			var e = H.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = U.next;
		var t = fo === null ? H.memoizedState : fo.next;
		if (t !== null) fo = t, U = e;
		else {
			if (e === null) throw H.alternate === null ? Error(i(467)) : Error(i(310));
			U = e, e = {
				memoizedState: U.memoizedState,
				baseState: U.baseState,
				baseQueue: U.baseQueue,
				queue: U.queue,
				next: null
			}, fo === null ? H.memoizedState = fo = e : fo = fo.next = e;
		}
		return fo;
	}
	function jo() {
		return {
			lastEffect: null,
			events: null,
			stores: null,
			memoCache: null
		};
	}
	function Mo(e) {
		var t = _o;
		return _o += 1, vo === null && (vo = []), e = Ea(vo, e, t), t = H, (fo === null ? t.memoizedState : fo.next) === null && (t = t.alternate, O.H = t === null || t.memoizedState === null ? zs : Bs), e;
	}
	function No(e) {
		if (typeof e == "object" && e) {
			if (typeof e.then == "function") return Mo(e);
			if (e.$$typeof === C) return na(e);
		}
		throw Error(i(438, String(e)));
	}
	function Po(e) {
		var t = null, n = H.updateQueue;
		if (n !== null && (t = n.memoCache), t == null) {
			var r = H.alternate;
			r !== null && (r = r.updateQueue, r !== null && (r = r.memoCache, r != null && (t = {
				data: r.data.map(function(e) {
					return e.slice();
				}),
				index: 0
			})));
		}
		if (t ??= {
			data: [],
			index: 0
		}, n === null && (n = jo(), H.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = ne;
		return t.index++, n;
	}
	function Fo(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function Io(e) {
		return Lo(Ao(), U, e);
	}
	function Lo(e, t, n) {
		var r = e.queue;
		if (r === null) throw Error(i(311));
		r.lastRenderedReducer = n;
		var a = e.baseQueue, o = r.pending;
		if (o !== null) {
			if (a !== null) {
				var s = a.next;
				a.next = o.next, o.next = s;
			}
			t.baseQueue = a = o, r.pending = null;
		}
		if (o = e.baseState, a === null) e.memoizedState = o;
		else {
			t = a.next;
			var c = s = null, l = null, u = t, d = !1;
			do {
				var f = u.lane & -536870913;
				if (f === u.lane ? (uo & f) === f : (Y & f) === f) {
					var p = u.revertLane;
					if (p === 0) l !== null && (l = l.next = {
						lane: 0,
						revertLane: 0,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}), f === z && (d = !0);
					else if ((uo & p) === p) {
						u = u.next, p === z && (d = !0);
						continue;
					} else f = {
						lane: 0,
						revertLane: u.revertLane,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}, l === null ? (c = l = f, s = o) : l = l.next = f, H.lanes |= p, Gl |= p;
					f = u.action, ho && n(o, f), o = u.hasEagerState ? u.eagerState : n(o, f);
				} else p = {
					lane: f,
					revertLane: u.revertLane,
					gesture: u.gesture,
					action: u.action,
					hasEagerState: u.hasEagerState,
					eagerState: u.eagerState,
					next: null
				}, l === null ? (c = l = p, s = o) : l = l.next = p, H.lanes |= f, Gl |= f;
				u = u.next;
			} while (u !== null && u !== t);
			if (l === null ? s = o : l.next = c, !Dr(o, e.memoizedState) && (rc = !0, d && (n = pa, n !== null))) throw n;
			e.memoizedState = o, e.baseState = s, e.baseQueue = l, r.lastRenderedState = o;
		}
		return a === null && (r.lanes = 0), [e.memoizedState, r.dispatch];
	}
	function Ro(e) {
		var t = Ao(), n = t.queue;
		if (n === null) throw Error(i(311));
		n.lastRenderedReducer = e;
		var r = n.dispatch, a = n.pending, o = t.memoizedState;
		if (a !== null) {
			n.pending = null;
			var s = a = a.next;
			do
				o = e(o, s.action), s = s.next;
			while (s !== a);
			Dr(o, t.memoizedState) || (rc = !0), t.memoizedState = o, t.baseQueue === null && (t.baseState = o), n.lastRenderedState = o;
		}
		return [o, r];
	}
	function zo(e, t, n) {
		var r = H, a = Ao(), o = R;
		if (o) {
			if (n === void 0) throw Error(i(407));
			n = n();
		} else n = t();
		var s = !Dr((U || a).memoizedState, n);
		if (s && (a.memoizedState = n, rc = !0), a = a.queue, us(Ho.bind(null, r, a, e), [e]), a.getSnapshot !== t || s || fo !== null && fo.memoizedState.tag & 1) {
			if (r.flags |= 2048, as(9, { destroy: void 0 }, Vo.bind(null, r, a, n, t), null), q === null) throw Error(i(349));
			o || uo & 127 || Bo(r, t, n);
		}
		return n;
	}
	function Bo(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = H.updateQueue, t === null ? (t = jo(), H.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function Vo(e, t, n, r) {
		t.value = n, t.getSnapshot = r, Uo(t) && Wo(e);
	}
	function Ho(e, t, n) {
		return n(function() {
			Uo(t) && Wo(e);
		});
	}
	function Uo(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !Dr(e, n);
		} catch {
			return !0;
		}
	}
	function Wo(e) {
		var t = oi(e, 2);
		t !== null && hu(t, e, 2);
	}
	function Go(e) {
		var t = ko();
		if (typeof e == "function") {
			var n = e;
			if (e = n(), ho) {
				Ue(!0);
				try {
					n();
				} finally {
					Ue(!1);
				}
			}
		}
		return t.memoizedState = t.baseState = e, t.queue = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: Fo,
			lastRenderedState: e
		}, t;
	}
	function Ko(e, t, n, r) {
		return e.baseState = n, Lo(e, U, typeof r == "function" ? r : Fo);
	}
	function qo(e, t, n, r, a) {
		if (Fs(e)) throw Error(i(485));
		if (e = t.action, e !== null) {
			var o = {
				payload: a,
				action: e,
				next: null,
				isTransition: !0,
				status: "pending",
				value: null,
				reason: null,
				listeners: [],
				then: function(e) {
					o.listeners.push(e);
				}
			};
			O.T === null ? o.isTransition = !1 : n(!0), r(o), n = t.pending, n === null ? (o.next = t.pending = o, Jo(t, o)) : (o.next = n.next, t.pending = n.next = o);
		}
	}
	function Jo(e, t) {
		var n = t.action, r = t.payload, i = e.state;
		if (t.isTransition) {
			var a = O.T, o = {};
			O.T = o;
			try {
				var s = n(i, r), c = O.S;
				c !== null && c(o, s), Yo(e, t, s);
			} catch (n) {
				Zo(e, t, n);
			} finally {
				a !== null && o.types !== null && (a.types = o.types), O.T = a;
			}
		} else try {
			a = n(i, r), Yo(e, t, a);
		} catch (n) {
			Zo(e, t, n);
		}
	}
	function Yo(e, t, n) {
		typeof n == "object" && n && typeof n.then == "function" ? n.then(function(n) {
			Xo(e, t, n);
		}, function(n) {
			return Zo(e, t, n);
		}) : Xo(e, t, n);
	}
	function Xo(e, t, n) {
		t.status = "fulfilled", t.value = n, Qo(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Jo(e, n)));
	}
	function Zo(e, t, n) {
		var r = e.pending;
		if (e.pending = null, r !== null) {
			r = r.next;
			do
				t.status = "rejected", t.reason = n, Qo(t), t = t.next;
			while (t !== r);
		}
		e.action = null;
	}
	function Qo(e) {
		e = e.listeners;
		for (var t = 0; t < e.length; t++) (0, e[t])();
	}
	function $o(e, t) {
		return t;
	}
	function es(e, t) {
		if (R) {
			var n = q.formState;
			if (n !== null) {
				a: {
					var r = H;
					if (R) {
						if (L) {
							b: {
								for (var i = L, a = Li; i.nodeType !== 8;) {
									if (!a) {
										i = null;
										break b;
									}
									if (i = cf(i.nextSibling), i === null) {
										i = null;
										break b;
									}
								}
								a = i.data, i = a === "F!" || a === "F" ? i : null;
							}
							if (i) {
								L = cf(i.nextSibling), r = i.data === "F!";
								break a;
							}
						}
						zi(r);
					}
					r = !1;
				}
				r && (t = n[0]);
			}
		}
		return n = ko(), n.memoizedState = n.baseState = t, r = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: $o,
			lastRenderedState: t
		}, n.queue = r, n = Ms.bind(null, H, r), r.dispatch = n, r = Go(!1), a = Ps.bind(null, H, !1, r.queue), r = ko(), i = {
			state: t,
			dispatch: null,
			action: e,
			pending: null
		}, r.queue = i, n = qo.bind(null, H, i, a, n), i.dispatch = n, r.memoizedState = e, [
			t,
			n,
			!1
		];
	}
	function ts(e) {
		return ns(Ao(), U, e);
	}
	function ns(e, t, n) {
		if (t = Lo(e, t, $o)[0], e = Io(Fo)[0], typeof t == "object" && t && typeof t.then == "function") try {
			var r = Mo(t);
		} catch (e) {
			throw e === xa ? Ca : e;
		}
		else r = t;
		t = Ao();
		var i = t.queue, a = i.dispatch;
		return n !== t.memoizedState && (H.flags |= 2048, as(9, { destroy: void 0 }, rs.bind(null, i, n), null)), [
			r,
			a,
			e
		];
	}
	function rs(e, t) {
		e.action = t;
	}
	function is(e) {
		var t = Ao(), n = U;
		if (n !== null) return ns(t, n, e);
		Ao(), t = t.memoizedState, n = Ao();
		var r = n.queue.dispatch;
		return n.memoizedState = e, [
			t,
			r,
			!1
		];
	}
	function as(e, t, n, r) {
		return e = {
			tag: e,
			create: n,
			deps: r,
			inst: t,
			next: null
		}, t = H.updateQueue, t === null && (t = jo(), H.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e), e;
	}
	function os() {
		return Ao().memoizedState;
	}
	function ss(e, t, n, r) {
		var i = ko();
		H.flags |= e, i.memoizedState = as(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r);
	}
	function cs(e, t, n, r) {
		var i = Ao();
		r = r === void 0 ? null : r;
		var a = i.memoizedState.inst;
		U !== null && r !== null && xo(r, U.memoizedState.deps) ? i.memoizedState = as(t, a, n, r) : (H.flags |= e, i.memoizedState = as(1 | t, a, n, r));
	}
	function ls(e, t) {
		ss(8390656, 8, e, t);
	}
	function us(e, t) {
		cs(2048, 8, e, t);
	}
	function ds(e) {
		H.flags |= 4;
		var t = H.updateQueue;
		if (t === null) t = jo(), H.updateQueue = t, t.events = [e];
		else {
			var n = t.events;
			n === null ? t.events = [e] : n.push(e);
		}
	}
	function fs(e) {
		var t = Ao().memoizedState;
		return ds({
			ref: t,
			nextImpl: e
		}), function() {
			if (K & 2) throw Error(i(440));
			return t.impl.apply(void 0, arguments);
		};
	}
	function ps(e, t) {
		return cs(4, 2, e, t);
	}
	function ms(e, t) {
		return cs(4, 4, e, t);
	}
	function hs(e, t) {
		if (typeof t == "function") {
			e = e();
			var n = t(e);
			return function() {
				typeof n == "function" ? n() : t(null);
			};
		}
		if (t != null) return e = e(), t.current = e, function() {
			t.current = null;
		};
	}
	function gs(e, t, n) {
		n = n == null ? null : n.concat([e]), cs(4, 4, hs.bind(null, t, e), n);
	}
	function _s() {}
	function vs(e, t) {
		var n = Ao();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return t !== null && xo(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function ys(e, t) {
		var n = Ao();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		if (t !== null && xo(t, r[1])) return r[0];
		if (r = e(), ho) {
			Ue(!0);
			try {
				e();
			} finally {
				Ue(!1);
			}
		}
		return n.memoizedState = [r, t], r;
	}
	function bs(e, t, n) {
		return n === void 0 || uo & 1073741824 && !(Y & 261930) ? e.memoizedState = t : (e.memoizedState = n, e = mu(), H.lanes |= e, Gl |= e, n);
	}
	function xs(e, t, n, r) {
		return Dr(n, t) ? n : Za.current === null ? !(uo & 42) || uo & 1073741824 && !(Y & 261930) ? (rc = !0, e.memoizedState = n) : (e = mu(), H.lanes |= e, Gl |= e, t) : (e = bs(e, n, r), Dr(e, t) || (rc = !0), e);
	}
	function Ss(e, t, n, r, i) {
		var a = k.p;
		k.p = a !== 0 && 8 > a ? a : 8;
		var o = O.T, s = {};
		O.T = s, Ps(e, !1, t, n);
		try {
			var c = i(), l = O.S;
			l !== null && l(s, c), typeof c == "object" && c && typeof c.then == "function" ? Ns(e, t, ga(c, r), pu(e)) : Ns(e, t, r, pu(e));
		} catch (n) {
			Ns(e, t, {
				then: function() {},
				status: "rejected",
				reason: n
			}, pu());
		} finally {
			k.p = a, o !== null && s.types !== null && (o.types = s.types), O.T = o;
		}
	}
	function Cs() {}
	function ws(e, t, n, r) {
		if (e.tag !== 5) throw Error(i(476));
		var a = Ts(e).queue;
		Ss(e, a, t, ce, n === null ? Cs : function() {
			return Es(e), n(r);
		});
	}
	function Ts(e) {
		var t = e.memoizedState;
		if (t !== null) return t;
		t = {
			memoizedState: ce,
			baseState: ce,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: Fo,
				lastRenderedState: ce
			},
			next: null
		};
		var n = {};
		return t.next = {
			memoizedState: n,
			baseState: n,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: Fo,
				lastRenderedState: n
			},
			next: null
		}, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
	}
	function Es(e) {
		var t = Ts(e);
		t.next === null && (t = e.alternate.memoizedState), Ns(e, t.next.queue, {}, pu());
	}
	function Ds() {
		return na(Qf);
	}
	function Os() {
		return Ao().memoizedState;
	}
	function ks() {
		return Ao().memoizedState;
	}
	function As(e) {
		for (var t = e.return; t !== null;) {
			switch (t.tag) {
				case 24:
				case 3:
					var n = pu();
					e = Ha(n);
					var r = Ua(t, e, n);
					r !== null && (hu(r, t, n), Wa(r, t, n)), t = { cache: la() }, e.payload = t;
					return;
			}
			t = t.return;
		}
	}
	function js(e, t, n) {
		var r = pu();
		n = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, Fs(e) ? Is(t, n) : (n = ai(e, t, n, r), n !== null && (hu(n, e, r), Ls(n, t, r)));
	}
	function Ms(e, t, n) {
		Ns(e, t, n, pu());
	}
	function Ns(e, t, n, r) {
		var i = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (Fs(e)) Is(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, Dr(s, o)) return ii(e, t, i, 0), q === null && ri(), !1;
			} catch {}
			if (n = ai(e, t, i, r), n !== null) return hu(n, e, r), Ls(n, t, r), !0;
		}
		return !1;
	}
	function Ps(e, t, n, r) {
		if (r = {
			lane: 2,
			revertLane: dd(),
			gesture: null,
			action: r,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, Fs(e)) {
			if (t) throw Error(i(479));
		} else t = ai(e, n, r, 2), t !== null && hu(t, e, 2);
	}
	function Fs(e) {
		var t = e.alternate;
		return e === H || t !== null && t === H;
	}
	function Is(e, t) {
		mo = po = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function Ls(e, t, n) {
		if (n & 4194048) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, ot(e, n);
		}
	}
	var Rs = {
		readContext: na,
		use: No,
		useCallback: bo,
		useContext: bo,
		useEffect: bo,
		useImperativeHandle: bo,
		useLayoutEffect: bo,
		useInsertionEffect: bo,
		useMemo: bo,
		useReducer: bo,
		useRef: bo,
		useState: bo,
		useDebugValue: bo,
		useDeferredValue: bo,
		useTransition: bo,
		useSyncExternalStore: bo,
		useId: bo,
		useHostTransitionStatus: bo,
		useFormState: bo,
		useActionState: bo,
		useOptimistic: bo,
		useMemoCache: bo,
		useCacheRefresh: bo
	};
	Rs.useEffectEvent = bo;
	var zs = {
		readContext: na,
		use: No,
		useCallback: function(e, t) {
			return ko().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: na,
		useEffect: ls,
		useImperativeHandle: function(e, t, n) {
			n = n == null ? null : n.concat([e]), ss(4194308, 4, hs.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return ss(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			ss(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = ko();
			t = t === void 0 ? null : t;
			var r = e();
			if (ho) {
				Ue(!0);
				try {
					e();
				} finally {
					Ue(!1);
				}
			}
			return n.memoizedState = [r, t], r;
		},
		useReducer: function(e, t, n) {
			var r = ko();
			if (n !== void 0) {
				var i = n(t);
				if (ho) {
					Ue(!0);
					try {
						n(t);
					} finally {
						Ue(!1);
					}
				}
			} else i = t;
			return r.memoizedState = r.baseState = i, e = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: i
			}, r.queue = e, e = e.dispatch = js.bind(null, H, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = ko();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: function(e) {
			e = Go(e);
			var t = e.queue, n = Ms.bind(null, H, t);
			return t.dispatch = n, [e.memoizedState, n];
		},
		useDebugValue: _s,
		useDeferredValue: function(e, t) {
			return bs(ko(), e, t);
		},
		useTransition: function() {
			var e = Go(!1);
			return e = Ss.bind(null, H, e.queue, !0, !1), ko().memoizedState = e, [!1, e];
		},
		useSyncExternalStore: function(e, t, n) {
			var r = H, a = ko();
			if (R) {
				if (n === void 0) throw Error(i(407));
				n = n();
			} else {
				if (n = t(), q === null) throw Error(i(349));
				Y & 127 || Bo(r, t, n);
			}
			a.memoizedState = n;
			var o = {
				value: n,
				getSnapshot: t
			};
			return a.queue = o, ls(Ho.bind(null, r, o, e), [e]), r.flags |= 2048, as(9, { destroy: void 0 }, Vo.bind(null, r, o, n, t), null), n;
		},
		useId: function() {
			var e = ko(), t = q.identifierPrefix;
			if (R) {
				var n = ki, r = Oi;
				n = (r & ~(1 << 32 - We(r) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = go++, 0 < n && (t += "H" + n.toString(32)), t += "_";
			} else n = yo++, t = "_" + t + "r_" + n.toString(32) + "_";
			return e.memoizedState = t;
		},
		useHostTransitionStatus: Ds,
		useFormState: es,
		useActionState: es,
		useOptimistic: function(e) {
			var t = ko();
			t.memoizedState = t.baseState = e;
			var n = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: null,
				lastRenderedState: null
			};
			return t.queue = n, t = Ps.bind(null, H, !0, n), n.dispatch = t, [e, t];
		},
		useMemoCache: Po,
		useCacheRefresh: function() {
			return ko().memoizedState = As.bind(null, H);
		},
		useEffectEvent: function(e) {
			var t = ko(), n = { impl: e };
			return t.memoizedState = n, function() {
				if (K & 2) throw Error(i(440));
				return n.impl.apply(void 0, arguments);
			};
		}
	}, Bs = {
		readContext: na,
		use: No,
		useCallback: vs,
		useContext: na,
		useEffect: us,
		useImperativeHandle: gs,
		useInsertionEffect: ps,
		useLayoutEffect: ms,
		useMemo: ys,
		useReducer: Io,
		useRef: os,
		useState: function() {
			return Io(Fo);
		},
		useDebugValue: _s,
		useDeferredValue: function(e, t) {
			return xs(Ao(), U.memoizedState, e, t);
		},
		useTransition: function() {
			var e = Io(Fo)[0], t = Ao().memoizedState;
			return [typeof e == "boolean" ? e : Mo(e), t];
		},
		useSyncExternalStore: zo,
		useId: Os,
		useHostTransitionStatus: Ds,
		useFormState: ts,
		useActionState: ts,
		useOptimistic: function(e, t) {
			return Ko(Ao(), U, e, t);
		},
		useMemoCache: Po,
		useCacheRefresh: ks
	};
	Bs.useEffectEvent = fs;
	var Vs = {
		readContext: na,
		use: No,
		useCallback: vs,
		useContext: na,
		useEffect: us,
		useImperativeHandle: gs,
		useInsertionEffect: ps,
		useLayoutEffect: ms,
		useMemo: ys,
		useReducer: Ro,
		useRef: os,
		useState: function() {
			return Ro(Fo);
		},
		useDebugValue: _s,
		useDeferredValue: function(e, t) {
			var n = Ao();
			return U === null ? bs(n, e, t) : xs(n, U.memoizedState, e, t);
		},
		useTransition: function() {
			var e = Ro(Fo)[0], t = Ao().memoizedState;
			return [typeof e == "boolean" ? e : Mo(e), t];
		},
		useSyncExternalStore: zo,
		useId: Os,
		useHostTransitionStatus: Ds,
		useFormState: is,
		useActionState: is,
		useOptimistic: function(e, t) {
			var n = Ao();
			return U === null ? (n.baseState = e, [e, n.queue.dispatch]) : Ko(n, U, e, t);
		},
		useMemoCache: Po,
		useCacheRefresh: ks
	};
	Vs.useEffectEvent = fs;
	function Hs(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : h({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var Us = {
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = pu(), i = Ha(r);
			i.payload = t, n != null && (i.callback = n), t = Ua(e, i, r), t !== null && (hu(t, e, r), Wa(t, e, r));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = pu(), i = Ha(r);
			i.tag = 1, i.payload = t, n != null && (i.callback = n), t = Ua(e, i, r), t !== null && (hu(t, e, r), Wa(t, e, r));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = pu(), r = Ha(n);
			r.tag = 2, t != null && (r.callback = t), t = Ua(e, r, n), t !== null && (hu(t, e, n), Wa(t, e, n));
		}
	};
	function Ws(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Or(n, r) || !Or(i, a) : !0;
	}
	function Gs(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && Us.enqueueReplaceState(t, t.state, null);
	}
	function Ks(e, t) {
		var n = t;
		if ("ref" in t) for (var r in n = {}, t) r !== "ref" && (n[r] = t[r]);
		if (e = e.defaultProps) for (var i in n === t && (n = h({}, n)), e) n[i] === void 0 && (n[i] = e[i]);
		return n;
	}
	function qs(e) {
		$r(e);
	}
	function Js(e) {
		console.error(e);
	}
	function Ys(e) {
		$r(e);
	}
	function Xs(e, t) {
		try {
			var n = e.onUncaughtError;
			n(t.value, { componentStack: t.stack });
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Zs(e, t, n) {
		try {
			var r = e.onCaughtError;
			r(n.value, {
				componentStack: n.stack,
				errorBoundary: t.tag === 1 ? t.stateNode : null
			});
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Qs(e, t, n) {
		return n = Ha(n), n.tag = 3, n.payload = { element: null }, n.callback = function() {
			Xs(e, t);
		}, n;
	}
	function $s(e) {
		return e = Ha(e), e.tag = 3, e;
	}
	function ec(e, t, n, r) {
		var i = n.type.getDerivedStateFromError;
		if (typeof i == "function") {
			var a = r.value;
			e.payload = function() {
				return i(a);
			}, e.callback = function() {
				Zs(t, n, r);
			};
		}
		var o = n.stateNode;
		o !== null && typeof o.componentDidCatch == "function" && (e.callback = function() {
			Zs(t, n, r), typeof i != "function" && (ru === null ? ru = /* @__PURE__ */ new Set([this]) : ru.add(this));
			var e = r.stack;
			this.componentDidCatch(r.value, { componentStack: e === null ? "" : e });
		});
	}
	function tc(e, t, n, r, a) {
		if (n.flags |= 32768, typeof r == "object" && r && typeof r.then == "function") {
			if (t = n.alternate, t !== null && $i(t, n, a, !0), n = no.current, n !== null) {
				switch (n.tag) {
					case 31:
					case 13: return ro === null ? Du() : n.alternate === null && Wl === 0 && (Wl = 3), n.flags &= -257, n.flags |= 65536, n.lanes = a, r === wa ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = /* @__PURE__ */ new Set([r]) : t.add(r), Gu(e, r, a)), !1;
					case 22: return n.flags |= 65536, r === wa ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
						transitions: null,
						markerInstances: null,
						retryQueue: /* @__PURE__ */ new Set([r])
					}, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = /* @__PURE__ */ new Set([r]) : n.add(r)), Gu(e, r, a)), !1;
				}
				throw Error(i(435, n.tag));
			}
			return Gu(e, r, a), Du(), !1;
		}
		if (R) return t = no.current, t === null ? (r !== Ri && (t = Error(i(423), { cause: r }), Gi(bi(t, n))), e = e.current.alternate, e.flags |= 65536, a &= -a, e.lanes |= a, r = bi(r, n), a = Qs(e.stateNode, r, a), Ga(e, a), Wl !== 4 && (Wl = 2)) : (!(t.flags & 65536) && (t.flags |= 256), t.flags |= 65536, t.lanes = a, r !== Ri && (e = Error(i(422), { cause: r }), Gi(bi(e, n)))), !1;
		var o = Error(i(520), { cause: r });
		if (o = bi(o, n), Xl === null ? Xl = [o] : Xl.push(o), Wl !== 4 && (Wl = 2), t === null) return !0;
		r = bi(r, n), n = t;
		do {
			switch (n.tag) {
				case 3: return n.flags |= 65536, e = a & -a, n.lanes |= e, e = Qs(n.stateNode, r, e), Ga(n, e), !1;
				case 1: if (t = n.type, o = n.stateNode, !(n.flags & 128) && (typeof t.getDerivedStateFromError == "function" || o !== null && typeof o.componentDidCatch == "function" && (ru === null || !ru.has(o)))) return n.flags |= 65536, a &= -a, n.lanes |= a, a = $s(a), ec(a, e, n, r), Ga(n, a), !1;
			}
			n = n.return;
		} while (n !== null);
		return !1;
	}
	var nc = Error(i(461)), rc = !1;
	function ic(e, t, n, r) {
		t.child = e === null ? Ra(t, null, n, r) : La(t, e.child, n, r);
	}
	function ac(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		if ("ref" in r) {
			var o = {};
			for (var s in r) s !== "ref" && (o[s] = r[s]);
		} else o = r;
		return ta(t), r = So(e, t, n, o, a, i), s = Eo(), e !== null && !rc ? (Do(e, t, i), kc(e, t, i)) : (R && s && Mi(t), t.flags |= 1, ic(e, t, r, i), t.child);
	}
	function oc(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !fi(a) && a.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = a, sc(e, t, a, r, i)) : (e = hi(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, !Ac(e, i)) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Or : n, n(o, r) && e.ref === t.ref) return kc(e, t, i);
		}
		return t.flags |= 1, e = pi(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function sc(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Or(a, r) && e.ref === t.ref) {
				if (rc = !1, t.pendingProps = r = a, Ac(e, i)) e.flags & 131072 && (rc = !0);
				else return t.lanes = e.lanes, kc(e, t, i);
			}
		}
		return hc(e, t, n, r, i);
	}
	function cc(e, t, n, r) {
		var i = r.children, a = e === null ? null : e.memoizedState;
		if (e === null && t.stateNode === null && (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), r.mode === "hidden") {
			if (t.flags & 128) {
				if (a = a === null ? n : a.baseLanes | n, e !== null) {
					for (r = t.child = e.child, i = 0; r !== null;) i = i | r.lanes | r.childLanes, r = r.sibling;
					r = i & ~a;
				} else r = 0, t.child = null;
				return uc(e, t, a, n, r);
			}
			if (n & 536870912) t.memoizedState = {
				baseLanes: 0,
				cachePool: null
			}, e !== null && ba(t, a === null ? null : a.cachePool), a === null ? eo() : $a(t, a), ao(t);
			else return r = t.lanes = 536870912, uc(e, t, a === null ? n : a.baseLanes | n, n, r);
		} else a === null ? (e !== null && ba(t, null), eo(), oo(t)) : (ba(t, a.cachePool), $a(t, a), oo(t), t.memoizedState = null);
		return ic(e, t, i, n), t.child;
	}
	function lc(e, t) {
		return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), t.sibling;
	}
	function uc(e, t, n, r, i) {
		var a = ya();
		return a = a === null ? null : {
			parent: ca._currentValue,
			pool: a
		}, t.memoizedState = {
			baseLanes: n,
			cachePool: a
		}, e !== null && ba(t, null), eo(), ao(t), e !== null && $i(e, t, r, !0), t.childLanes = i, null;
	}
	function dc(e, t) {
		return t = wc({
			mode: t.mode,
			children: t.children
		}, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
	}
	function fc(e, t, n) {
		return La(t, e.child, null, n), e = dc(t, t.pendingProps), e.flags |= 2, so(t), t.memoizedState = null, e;
	}
	function pc(e, t, n) {
		var r = t.pendingProps, a = !!(t.flags & 128);
		if (t.flags &= -129, e === null) {
			if (R) {
				if (r.mode === "hidden") return e = dc(t, r), t.lanes = 536870912, lc(null, e);
				if (io(t), (e = L) ? (e = rf(e, Li), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Di === null ? null : {
						id: Oi,
						overflow: ki
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = _i(e), n.return = t, t.child = n, Fi = t, L = null)) : e = null, e === null) throw zi(t);
				return t.lanes = 536870912, null;
			}
			return dc(t, r);
		}
		var o = e.memoizedState;
		if (o !== null) {
			var s = o.dehydrated;
			if (io(t), a) {
				if (t.flags & 256) t.flags &= -257, t = fc(e, t, n);
				else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
				else throw Error(i(558));
			} else if (rc || $i(e, t, n, !1), a = (n & e.childLanes) !== 0, rc || a) {
				if (r = q, r !== null && (s = st(r, n), s !== 0 && s !== o.retryLane)) throw o.retryLane = s, oi(e, s), hu(r, e, s), nc;
				Du(), t = fc(e, t, n);
			} else e = o.treeContext, L = cf(s.nextSibling), Fi = t, R = !0, Ii = null, Li = !1, e !== null && Pi(t, e), t = dc(t, r), t.flags |= 4096;
			return t;
		}
		return e = pi(e.child, {
			mode: r.mode,
			children: r.children
		}), e.ref = t.ref, t.child = e, e.return = t, e;
	}
	function mc(e, t) {
		var n = t.ref;
		if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
		else {
			if (typeof n != "function" && typeof n != "object") throw Error(i(284));
			(e === null || e.ref !== n) && (t.flags |= 4194816);
		}
	}
	function hc(e, t, n, r, i) {
		return ta(t), n = So(e, t, n, r, void 0, i), r = Eo(), e !== null && !rc ? (Do(e, t, i), kc(e, t, i)) : (R && r && Mi(t), t.flags |= 1, ic(e, t, n, i), t.child);
	}
	function gc(e, t, n, r, i, a) {
		return ta(t), t.updateQueue = null, n = wo(t, r, n, i), Co(e), r = Eo(), e !== null && !rc ? (Do(e, t, a), kc(e, t, a)) : (R && r && Mi(t), t.flags |= 1, ic(e, t, n, a), t.child);
	}
	function _c(e, t, n, r, i) {
		if (ta(t), t.stateNode === null) {
			var a = li, o = n.contextType;
			typeof o == "object" && o && (a = na(o)), a = new n(r, a), t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, a.updater = Us, t.stateNode = a, a._reactInternals = t, a = t.stateNode, a.props = r, a.state = t.memoizedState, a.refs = {}, Ba(t), o = n.contextType, a.context = typeof o == "object" && o ? na(o) : li, a.state = t.memoizedState, o = n.getDerivedStateFromProps, typeof o == "function" && (Hs(t, n, o, r), a.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof a.getSnapshotBeforeUpdate == "function" || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (o = a.state, typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount(), o !== a.state && Us.enqueueReplaceState(a, a.state, null), Ja(t, r, a, i), qa(), a.state = t.memoizedState), typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !0;
		} else if (e === null) {
			a = t.stateNode;
			var s = t.memoizedProps, c = Ks(n, s);
			a.props = c;
			var l = a.context, u = n.contextType;
			o = li, typeof u == "object" && u && (o = na(u));
			var d = n.getDerivedStateFromProps;
			u = typeof d == "function" || typeof a.getSnapshotBeforeUpdate == "function", s = t.pendingProps !== s, u || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (s || l !== o) && Gs(t, a, r, o), za = !1;
			var f = t.memoizedState;
			a.state = f, Ja(t, r, a, i), qa(), l = t.memoizedState, s || f !== l || za ? (typeof d == "function" && (Hs(t, n, d, r), l = t.memoizedState), (c = za || Ws(t, n, c, r, f, l, o)) ? (u || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount()), typeof a.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), a.props = r, a.state = l, a.context = o, r = c) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			a = t.stateNode, Va(e, t), o = t.memoizedProps, u = Ks(n, o), a.props = u, d = t.pendingProps, f = a.context, l = n.contextType, c = li, typeof l == "object" && l && (c = na(l)), s = n.getDerivedStateFromProps, (l = typeof s == "function" || typeof a.getSnapshotBeforeUpdate == "function") || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (o !== d || f !== c) && Gs(t, a, r, c), za = !1, f = t.memoizedState, a.state = f, Ja(t, r, a, i), qa();
			var p = t.memoizedState;
			o !== d || f !== p || za || e !== null && e.dependencies !== null && ea(e.dependencies) ? (typeof s == "function" && (Hs(t, n, s, r), p = t.memoizedState), (u = za || Ws(t, n, u, r, f, p, c) || e !== null && e.dependencies !== null && ea(e.dependencies)) ? (l || typeof a.UNSAFE_componentWillUpdate != "function" && typeof a.componentWillUpdate != "function" || (typeof a.componentWillUpdate == "function" && a.componentWillUpdate(r, p, c), typeof a.UNSAFE_componentWillUpdate == "function" && a.UNSAFE_componentWillUpdate(r, p, c)), typeof a.componentDidUpdate == "function" && (t.flags |= 4), typeof a.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = p), a.props = r, a.state = p, a.context = c, r = u) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return a = r, mc(e, t), r = !!(t.flags & 128), a || r ? (a = t.stateNode, n = r && typeof n.getDerivedStateFromError != "function" ? null : a.render(), t.flags |= 1, e !== null && r ? (t.child = La(t, e.child, null, i), t.child = La(t, null, n, i)) : ic(e, t, n, i), t.memoizedState = a.state, e = t.child) : e = kc(e, t, i), e;
	}
	function vc(e, t, n, r) {
		return Ui(), t.flags |= 256, ic(e, t, n, r), t.child;
	}
	var yc = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null
	};
	function bc(e) {
		return {
			baseLanes: e,
			cachePool: B()
		};
	}
	function xc(e, t, n) {
		return e = e === null ? 0 : e.childLanes & ~n, t && (e |= Jl), e;
	}
	function Sc(e, t, n) {
		var r = t.pendingProps, a = !1, o = !!(t.flags & 128), s;
		if ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : !!(co.current & 2)), s && (a = !0, t.flags &= -129), s = !!(t.flags & 32), t.flags &= -33, e === null) {
			if (R) {
				if (a ? V(t) : oo(t), (e = L) ? (e = rf(e, Li), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Di === null ? null : {
						id: Oi,
						overflow: ki
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = _i(e), n.return = t, t.child = n, Fi = t, L = null)) : e = null, e === null) throw zi(t);
				return of(e) ? t.lanes = 32 : t.lanes = 536870912, null;
			}
			var c = r.children;
			return r = r.fallback, a ? (oo(t), a = t.mode, c = wc({
				mode: "hidden",
				children: c
			}, a), r = I(r, a, n, null), c.return = t, r.return = t, c.sibling = r, t.child = c, r = t.child, r.memoizedState = bc(n), r.childLanes = xc(e, s, n), t.memoizedState = yc, lc(null, r)) : (V(t), Cc(t, c));
		}
		var l = e.memoizedState;
		if (l !== null && (c = l.dehydrated, c !== null)) {
			if (o) t.flags & 256 ? (V(t), t.flags &= -257, t = Tc(e, t, n)) : t.memoizedState === null ? (oo(t), c = r.fallback, a = t.mode, r = wc({
				mode: "visible",
				children: r.children
			}, a), c = I(c, a, n, null), c.flags |= 2, r.return = t, c.return = t, r.sibling = c, t.child = r, La(t, e.child, null, n), r = t.child, r.memoizedState = bc(n), r.childLanes = xc(e, s, n), t.memoizedState = yc, t = lc(null, r)) : (oo(t), t.child = e.child, t.flags |= 128, t = null);
			else if (V(t), of(c)) {
				if (s = c.nextSibling && c.nextSibling.dataset, s) var u = s.dgst;
				s = u, r = Error(i(419)), r.stack = "", r.digest = s, Gi({
					value: r,
					source: null,
					stack: null
				}), t = Tc(e, t, n);
			} else if (rc || $i(e, t, n, !1), s = (n & e.childLanes) !== 0, rc || s) {
				if (s = q, s !== null && (r = st(s, n), r !== 0 && r !== l.retryLane)) throw l.retryLane = r, oi(e, r), hu(s, e, r), nc;
				af(c) || Du(), t = Tc(e, t, n);
			} else af(c) ? (t.flags |= 192, t.child = e.child, t = null) : (e = l.treeContext, L = cf(c.nextSibling), Fi = t, R = !0, Ii = null, Li = !1, e !== null && Pi(t, e), t = Cc(t, r.children), t.flags |= 4096);
			return t;
		}
		return a ? (oo(t), c = r.fallback, a = t.mode, l = e.child, u = l.sibling, r = pi(l, {
			mode: "hidden",
			children: r.children
		}), r.subtreeFlags = l.subtreeFlags & 65011712, u === null ? (c = I(c, a, n, null), c.flags |= 2) : c = pi(u, c), c.return = t, r.return = t, r.sibling = c, t.child = r, lc(null, r), r = t.child, c = e.child.memoizedState, c === null ? c = bc(n) : (a = c.cachePool, a === null ? a = B() : (l = ca._currentValue, a = a.parent === l ? a : {
			parent: l,
			pool: l
		}), c = {
			baseLanes: c.baseLanes | n,
			cachePool: a
		}), r.memoizedState = c, r.childLanes = xc(e, s, n), t.memoizedState = yc, lc(e.child, r)) : (V(t), n = e.child, e = n.sibling, n = pi(n, {
			mode: "visible",
			children: r.children
		}), n.return = t, n.sibling = null, e !== null && (s = t.deletions, s === null ? (t.deletions = [e], t.flags |= 16) : s.push(e)), t.child = n, t.memoizedState = null, n);
	}
	function Cc(e, t) {
		return t = wc({
			mode: "visible",
			children: t
		}, e.mode), t.return = e, e.child = t;
	}
	function wc(e, t) {
		return e = di(22, e, null, t), e.lanes = 0, e;
	}
	function Tc(e, t, n) {
		return La(t, e.child, null, n), e = Cc(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function Ec(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), Zi(e.return, t, n);
	}
	function Dc(e, t, n, r, i, a) {
		var o = e.memoizedState;
		o === null ? e.memoizedState = {
			isBackwards: t,
			rendering: null,
			renderingStartTime: 0,
			last: r,
			tail: n,
			tailMode: i,
			treeForkCount: a
		} : (o.isBackwards = t, o.rendering = null, o.renderingStartTime = 0, o.last = r, o.tail = n, o.tailMode = i, o.treeForkCount = a);
	}
	function Oc(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		r = r.children;
		var o = co.current, s = !!(o & 2);
		if (s ? (o = o & 1 | 2, t.flags |= 128) : o &= 1, A(co, o), ic(e, t, r, n), r = R ? wi : 0, !s && e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
			if (e.tag === 13) e.memoizedState !== null && Ec(e, n, t);
			else if (e.tag === 19) Ec(e, n, t);
			else if (e.child !== null) {
				e.child.return = e, e = e.child;
				continue;
			}
			if (e === t) break a;
			for (; e.sibling === null;) {
				if (e.return === null || e.return === t) break a;
				e = e.return;
			}
			e.sibling.return = e.return, e = e.sibling;
		}
		switch (i) {
			case "forwards":
				for (n = t.child, i = null; n !== null;) e = n.alternate, e !== null && lo(e) === null && (i = n), n = n.sibling;
				n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), Dc(t, !1, i, n, a, r);
				break;
			case "backwards":
			case "unstable_legacy-backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && lo(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				Dc(t, !0, n, null, a, r);
				break;
			case "together":
				Dc(t, !1, null, null, void 0, r);
				break;
			default: t.memoizedState = null;
		}
		return t.child;
	}
	function kc(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), Gl |= t.lanes, (n & t.childLanes) === 0) {
			if (e !== null) {
				if ($i(e, t, n, !1), (n & t.childLanes) === 0) return null;
			} else return null;
		}
		if (e !== null && t.child !== e.child) throw Error(i(153));
		if (t.child !== null) {
			for (e = t.child, n = pi(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = pi(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function Ac(e, t) {
		return (e.lanes & t) !== 0 || (e = e.dependencies, !!(e !== null && ea(e)));
	}
	function jc(e, t, n) {
		switch (t.tag) {
			case 3:
				_e(t, t.stateNode.containerInfo), Yi(t, ca, e.memoizedState.cache), Ui();
				break;
			case 27:
			case 5:
				ye(t);
				break;
			case 4:
				_e(t, t.stateNode.containerInfo);
				break;
			case 10:
				Yi(t, t.type, t.memoizedProps.value);
				break;
			case 31:
				if (t.memoizedState !== null) return t.flags |= 128, io(t), null;
				break;
			case 13:
				var r = t.memoizedState;
				if (r !== null) return r.dehydrated === null ? (n & t.child.childLanes) === 0 ? (V(t), e = kc(e, t, n), e === null ? null : e.sibling) : Sc(e, t, n) : (V(t), t.flags |= 128, null);
				V(t);
				break;
			case 19:
				var i = !!(e.flags & 128);
				if (r = (n & t.childLanes) !== 0, r ||= ($i(e, t, n, !1), (n & t.childLanes) !== 0), i) {
					if (r) return Oc(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), A(co, co.current), r) break;
				return null;
			case 22: return t.lanes = 0, cc(e, t, n, t.pendingProps);
			case 24: Yi(t, ca, e.memoizedState.cache);
		}
		return kc(e, t, n);
	}
	function Mc(e, t, n) {
		if (e !== null) {
			if (e.memoizedProps !== t.pendingProps) rc = !0;
			else {
				if (!Ac(e, n) && !(t.flags & 128)) return rc = !1, jc(e, t, n);
				rc = !!(e.flags & 131072);
			}
		} else rc = !1, R && t.flags & 1048576 && ji(t, wi, t.index);
		switch (t.lanes = 0, t.tag) {
			case 16:
				a: {
					var r = t.pendingProps;
					if (e = Da(t.elementType), t.type = e, typeof e == "function") fi(e) ? (r = Ks(e, r), t.tag = 1, t = _c(null, t, e, r, n)) : (t.tag = 0, t = hc(null, t, e, r, n));
					else {
						if (e != null) {
							var a = e.$$typeof;
							if (a === w) {
								t.tag = 11, t = ac(null, t, e, r, n);
								break a;
							}
							if (a === ee) {
								t.tag = 14, t = oc(null, t, e, r, n);
								break a;
							}
						}
						throw t = oe(e) || e, Error(i(306, t, ""));
					}
				}
				return t;
			case 0: return hc(e, t, t.type, t.pendingProps, n);
			case 1: return r = t.type, a = Ks(r, t.pendingProps), _c(e, t, r, a, n);
			case 3:
				a: {
					if (_e(t, t.stateNode.containerInfo), e === null) throw Error(i(387));
					r = t.pendingProps;
					var o = t.memoizedState;
					a = o.element, Va(e, t), Ja(t, r, null, n);
					var s = t.memoizedState;
					if (r = s.cache, Yi(t, ca, r), r !== o.cache && Qi(t, [ca], n, !0), qa(), r = s.element, o.isDehydrated) {
						if (o = {
							element: r,
							isDehydrated: !1,
							cache: s.cache
						}, t.updateQueue.baseState = o, t.memoizedState = o, t.flags & 256) {
							t = vc(e, t, r, n);
							break a;
						}
						if (r !== a) {
							a = bi(Error(i(424)), t), Gi(a), t = vc(e, t, r, n);
							break a;
						}
						switch (e = t.stateNode.containerInfo, e.nodeType) {
							case 9:
								e = e.body;
								break;
							default: e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
						}
						for (L = cf(e.firstChild), Fi = t, R = !0, Ii = null, Li = !0, n = Ra(t, null, r, n), t.child = n; n;) n.flags = n.flags & -3 | 4096, n = n.sibling;
					} else {
						if (Ui(), r === a) {
							t = kc(e, t, n);
							break a;
						}
						ic(e, t, r, n);
					}
					t = t.child;
				}
				return t;
			case 26: return mc(e, t), e === null ? (n = kf(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : R || (n = t.type, e = t.pendingProps, r = Bd(he.current).createElement(n), r[pt] = t, r[mt] = e, Pd(r, n, e), Et(r), t.stateNode = r) : t.memoizedState = kf(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
			case 27: return ye(t), e === null && R && (r = t.stateNode = ff(t.type, t.pendingProps, he.current), Fi = t, Li = !0, a = L, Zd(t.type) ? (lf = a, L = cf(r.firstChild)) : L = a), ic(e, t, t.pendingProps.children, n), mc(e, t), e === null && (t.flags |= 4194304), t.child;
			case 5: return e === null && R && ((a = r = L) && (r = tf(r, t.type, t.pendingProps, Li), r === null ? a = !1 : (t.stateNode = r, Fi = t, L = cf(r.firstChild), Li = !1, a = !0)), a || zi(t)), ye(t), a = t.type, o = t.pendingProps, s = e === null ? null : e.memoizedProps, r = o.children, Ud(a, o) ? r = null : s !== null && Ud(a, s) && (t.flags |= 32), t.memoizedState !== null && (a = So(e, t, To, null, null, n), Qf._currentValue = a), mc(e, t), ic(e, t, r, n), t.child;
			case 6: return e === null && R && ((e = n = L) && (n = nf(n, t.pendingProps, Li), n === null ? e = !1 : (t.stateNode = n, Fi = t, L = null, e = !0)), e || zi(t)), null;
			case 13: return Sc(e, t, n);
			case 4: return _e(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = La(t, null, r, n) : ic(e, t, r, n), t.child;
			case 11: return ac(e, t, t.type, t.pendingProps, n);
			case 7: return ic(e, t, t.pendingProps, n), t.child;
			case 8: return ic(e, t, t.pendingProps.children, n), t.child;
			case 12: return ic(e, t, t.pendingProps.children, n), t.child;
			case 10: return r = t.pendingProps, Yi(t, t.type, r.value), ic(e, t, r.children, n), t.child;
			case 9: return a = t.type._context, r = t.pendingProps.children, ta(t), a = na(a), r = r(a), t.flags |= 1, ic(e, t, r, n), t.child;
			case 14: return oc(e, t, t.type, t.pendingProps, n);
			case 15: return sc(e, t, t.type, t.pendingProps, n);
			case 19: return Oc(e, t, n);
			case 31: return pc(e, t, n);
			case 22: return cc(e, t, n, t.pendingProps);
			case 24: return ta(t), r = na(ca), e === null ? (a = ya(), a === null && (a = q, o = la(), a.pooledCache = o, o.refCount++, o !== null && (a.pooledCacheLanes |= n), a = o), t.memoizedState = {
				parent: r,
				cache: a
			}, Ba(t), Yi(t, ca, a)) : ((e.lanes & n) !== 0 && (Va(e, t), Ja(t, null, null, n), qa()), a = e.memoizedState, o = t.memoizedState, a.parent === r ? (r = o.cache, Yi(t, ca, r), r !== a.cache && Qi(t, [ca], n, !0)) : (a = {
				parent: r,
				cache: r
			}, t.memoizedState = a, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = a), Yi(t, ca, r))), ic(e, t, t.pendingProps.children, n), t.child;
			case 29: throw t.pendingProps;
		}
		throw Error(i(156, t.tag));
	}
	function Nc(e) {
		e.flags |= 4;
	}
	function Pc(e, t, n, r, i) {
		if ((t = !!(e.mode & 32)) && (t = !1), t) {
			if (e.flags |= 16777216, (i & 335544128) === i) {
				if (e.stateNode.complete) e.flags |= 8192;
				else if (wu()) e.flags |= 8192;
				else throw Oa = wa, Sa;
			}
		} else e.flags &= -16777217;
	}
	function Fc(e, t) {
		if (t.type !== "stylesheet" || t.state.loading & 4) e.flags &= -16777217;
		else if (e.flags |= 16777216, !Wf(t)) {
			if (wu()) e.flags |= 8192;
			else throw Oa = wa, Sa;
		}
	}
	function Ic(e, t) {
		t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag === 22 ? 536870912 : tt(), e.lanes |= t, Yl |= t);
	}
	function Lc(e, t) {
		if (!R) switch (e.tailMode) {
			case "hidden":
				t = e.tail;
				for (var n = null; t !== null;) t.alternate !== null && (n = t), t = t.sibling;
				n === null ? e.tail = null : n.sibling = null;
				break;
			case "collapsed":
				n = e.tail;
				for (var r = null; n !== null;) n.alternate !== null && (r = n), n = n.sibling;
				r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
		}
	}
	function W(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 65011712, r |= i.flags & 65011712, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function Rc(e, t, n) {
		var r = t.pendingProps;
		switch (Ni(t), t.tag) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return W(t), null;
			case 1: return W(t), null;
			case 3: return n = t.stateNode, r = null, e !== null && (r = e.memoizedState.cache), t.memoizedState.cache !== r && (t.flags |= 2048), Xi(ca), ve(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (Hi(t) ? Nc(t) : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Wi())), W(t), null;
			case 26:
				var a = t.type, o = t.memoizedState;
				return e === null ? (Nc(t), o === null ? (W(t), Pc(t, a, null, r, n)) : (W(t), Fc(t, o))) : o ? o === e.memoizedState ? (W(t), t.flags &= -16777217) : (Nc(t), W(t), Fc(t, o)) : (e = e.memoizedProps, e !== r && Nc(t), W(t), Pc(t, a, e, r, n)), null;
			case 27:
				if (be(t), n = he.current, a = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && Nc(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(i(166));
						return W(t), null;
					}
					e = pe.current, Hi(t) ? Bi(t, e) : (e = ff(a, r, n), t.stateNode = e, Nc(t));
				}
				return W(t), null;
			case 5:
				if (be(t), a = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && Nc(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(i(166));
						return W(t), null;
					}
					if (o = pe.current, Hi(t)) Bi(t, o);
					else {
						var s = Bd(he.current);
						switch (o) {
							case 1:
								o = s.createElementNS("http://www.w3.org/2000/svg", a);
								break;
							case 2:
								o = s.createElementNS("http://www.w3.org/1998/Math/MathML", a);
								break;
							default: switch (a) {
								case "svg":
									o = s.createElementNS("http://www.w3.org/2000/svg", a);
									break;
								case "math":
									o = s.createElementNS("http://www.w3.org/1998/Math/MathML", a);
									break;
								case "script":
									o = s.createElement("div"), o.innerHTML = "<script><\/script>", o = o.removeChild(o.firstChild);
									break;
								case "select":
									o = typeof r.is == "string" ? s.createElement("select", { is: r.is }) : s.createElement("select"), r.multiple ? o.multiple = !0 : r.size && (o.size = r.size);
									break;
								default: o = typeof r.is == "string" ? s.createElement(a, { is: r.is }) : s.createElement(a);
							}
						}
						o[pt] = t, o[mt] = r;
						a: for (s = t.child; s !== null;) {
							if (s.tag === 5 || s.tag === 6) o.appendChild(s.stateNode);
							else if (s.tag !== 4 && s.tag !== 27 && s.child !== null) {
								s.child.return = s, s = s.child;
								continue;
							}
							if (s === t) break a;
							for (; s.sibling === null;) {
								if (s.return === null || s.return === t) break a;
								s = s.return;
							}
							s.sibling.return = s.return, s = s.sibling;
						}
						t.stateNode = o;
						a: switch (Pd(o, a, r), a) {
							case "button":
							case "input":
							case "select":
							case "textarea":
								r = !!r.autoFocus;
								break a;
							case "img":
								r = !0;
								break a;
							default: r = !1;
						}
						r && Nc(t);
					}
				}
				return W(t), Pc(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
			case 6:
				if (e && t.stateNode != null) e.memoizedProps !== r && Nc(t);
				else {
					if (typeof r != "string" && t.stateNode === null) throw Error(i(166));
					if (e = he.current, Hi(t)) {
						if (e = t.stateNode, n = t.memoizedProps, r = null, a = Fi, a !== null) switch (a.tag) {
							case 27:
							case 5: r = a.memoizedProps;
						}
						e[pt] = t, e = !!(e.nodeValue === n || r !== null && !0 === r.suppressHydrationWarning || Md(e.nodeValue, n)), e || zi(t, !0);
					} else e = Bd(e).createTextNode(r), e[pt] = t, t.stateNode = e;
				}
				return W(t), null;
			case 31:
				if (n = t.memoizedState, e === null || e.memoizedState !== null) {
					if (r = Hi(t), n !== null) {
						if (e === null) {
							if (!r) throw Error(i(318));
							if (e = t.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(557));
							e[pt] = t;
						} else Ui(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						W(t), e = !1;
					} else n = Wi(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
					if (!e) return t.flags & 256 ? (so(t), t) : (so(t), null);
					if (t.flags & 128) throw Error(i(558));
				}
				return W(t), null;
			case 13:
				if (r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (a = Hi(t), r !== null && r.dehydrated !== null) {
						if (e === null) {
							if (!a) throw Error(i(318));
							if (a = t.memoizedState, a = a === null ? null : a.dehydrated, !a) throw Error(i(317));
							a[pt] = t;
						} else Ui(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						W(t), a = !1;
					} else a = Wi(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = a), a = !0;
					if (!a) return t.flags & 256 ? (so(t), t) : (so(t), null);
				}
				return so(t), t.flags & 128 ? (t.lanes = n, t) : (n = r !== null, e = e !== null && e.memoizedState !== null, n && (r = t.child, a = null, r.alternate !== null && r.alternate.memoizedState !== null && r.alternate.memoizedState.cachePool !== null && (a = r.alternate.memoizedState.cachePool.pool), o = null, r.memoizedState !== null && r.memoizedState.cachePool !== null && (o = r.memoizedState.cachePool.pool), o !== a && (r.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), Ic(t, t.updateQueue), W(t), null);
			case 4: return ve(), e === null && Sd(t.stateNode.containerInfo), W(t), null;
			case 10: return Xi(t.type), W(t), null;
			case 19:
				if (fe(co), r = t.memoizedState, r === null) return W(t), null;
				if (a = !!(t.flags & 128), o = r.rendering, o === null) {
					if (a) Lc(r, !1);
					else {
						if (Wl !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
							if (o = lo(e), o !== null) {
								for (t.flags |= 128, Lc(r, !1), e = o.updateQueue, t.updateQueue = e, Ic(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;) mi(n, e), n = n.sibling;
								return A(co, co.current & 1 | 2), R && Ai(t, r.treeForkCount), t.child;
							}
							e = e.sibling;
						}
						r.tail !== null && Me() > tu && (t.flags |= 128, a = !0, Lc(r, !1), t.lanes = 4194304);
					}
				} else {
					if (!a) {
						if (e = lo(o), e !== null) {
							if (t.flags |= 128, a = !0, e = e.updateQueue, t.updateQueue = e, Ic(t, e), Lc(r, !0), r.tail === null && r.tailMode === "hidden" && !o.alternate && !R) return W(t), null;
						} else 2 * Me() - r.renderingStartTime > tu && n !== 536870912 && (t.flags |= 128, a = !0, Lc(r, !1), t.lanes = 4194304);
					}
					r.isBackwards ? (o.sibling = t.child, t.child = o) : (e = r.last, e === null ? t.child = o : e.sibling = o, r.last = o);
				}
				return r.tail === null ? (W(t), null) : (e = r.tail, r.rendering = e, r.tail = e.sibling, r.renderingStartTime = Me(), e.sibling = null, n = co.current, A(co, a ? n & 1 | 2 : n & 1), R && Ai(t, r.treeForkCount), e);
			case 22:
			case 23: return so(t), to(), r = t.memoizedState !== null, e === null ? r && (t.flags |= 8192) : e.memoizedState !== null !== r && (t.flags |= 8192), r ? n & 536870912 && !(t.flags & 128) && (W(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : W(t), n = t.updateQueue, n !== null && Ic(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), r = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (r = t.memoizedState.cachePool.pool), r !== n && (t.flags |= 2048), e !== null && fe(va), null;
			case 24: return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), Xi(ca), W(t), null;
			case 25: return null;
			case 30: return null;
		}
		throw Error(i(156, t.tag));
	}
	function zc(e, t) {
		switch (Ni(t), t.tag) {
			case 1: return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return Xi(ca), ve(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 26:
			case 27:
			case 5: return be(t), null;
			case 31:
				if (t.memoizedState !== null) {
					if (so(t), t.alternate === null) throw Error(i(340));
					Ui();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 13:
				if (so(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(i(340));
					Ui();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return fe(co), null;
			case 4: return ve(), null;
			case 10: return Xi(t.type), null;
			case 22:
			case 23: return so(t), to(), e !== null && fe(va), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 24: return Xi(ca), null;
			case 25: return null;
			default: return null;
		}
	}
	function Bc(e, t) {
		switch (Ni(t), t.tag) {
			case 3:
				Xi(ca), ve();
				break;
			case 26:
			case 27:
			case 5:
				be(t);
				break;
			case 4:
				ve();
				break;
			case 31:
				t.memoizedState !== null && so(t);
				break;
			case 13:
				so(t);
				break;
			case 19:
				fe(co);
				break;
			case 10:
				Xi(t.type);
				break;
			case 22:
			case 23:
				so(t), to(), e !== null && fe(va);
				break;
			case 24: Xi(ca);
		}
	}
	function Vc(e, t) {
		try {
			var n = t.updateQueue, r = n === null ? null : n.lastEffect;
			if (r !== null) {
				var i = r.next;
				n = i;
				do {
					if ((n.tag & e) === e) {
						r = void 0;
						var a = n.create, o = n.inst;
						r = a(), o.destroy = r;
					}
					n = n.next;
				} while (n !== i);
			}
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Hc(e, t, n) {
		try {
			var r = t.updateQueue, i = r === null ? null : r.lastEffect;
			if (i !== null) {
				var a = i.next;
				r = a;
				do {
					if ((r.tag & e) === e) {
						var o = r.inst, s = o.destroy;
						if (s !== void 0) {
							o.destroy = void 0, i = t;
							var c = n, l = s;
							try {
								l();
							} catch (e) {
								Z(i, c, e);
							}
						}
					}
					r = r.next;
				} while (r !== a);
			}
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Uc(e) {
		var t = e.updateQueue;
		if (t !== null) {
			var n = e.stateNode;
			try {
				Xa(t, n);
			} catch (t) {
				Z(e, e.return, t);
			}
		}
	}
	function Wc(e, t, n) {
		n.props = Ks(e.type, e.memoizedProps), n.state = e.memoizedState;
		try {
			n.componentWillUnmount();
		} catch (n) {
			Z(e, t, n);
		}
	}
	function Gc(e, t) {
		try {
			var n = e.ref;
			if (n !== null) {
				switch (e.tag) {
					case 26:
					case 27:
					case 5:
						var r = e.stateNode;
						break;
					case 30:
						r = e.stateNode;
						break;
					default: r = e.stateNode;
				}
				typeof n == "function" ? e.refCleanup = n(r) : n.current = r;
			}
		} catch (n) {
			Z(e, t, n);
		}
	}
	function Kc(e, t) {
		var n = e.ref, r = e.refCleanup;
		if (n !== null) {
			if (typeof r == "function") try {
				r();
			} catch (n) {
				Z(e, t, n);
			} finally {
				e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
			}
			else if (typeof n == "function") try {
				n(null);
			} catch (n) {
				Z(e, t, n);
			}
			else n.current = null;
		}
	}
	function qc(e) {
		var t = e.type, n = e.memoizedProps, r = e.stateNode;
		try {
			a: switch (t) {
				case "button":
				case "input":
				case "select":
				case "textarea":
					n.autoFocus && r.focus();
					break a;
				case "img": n.src ? r.src = n.src : n.srcSet && (r.srcset = n.srcSet);
			}
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Jc(e, t, n) {
		try {
			var r = e.stateNode;
			Fd(r, e.type, n, t), r[mt] = t;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Yc(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Zd(e.type) || e.tag === 4;
	}
	function Xc(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || Yc(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.tag === 27 && Zd(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Zc(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(e, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(e), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = on));
		else if (r !== 4 && (r === 27 && Zd(e.type) && (n = e.stateNode, t = null), e = e.child, e !== null)) for (Zc(e, t, n), e = e.sibling; e !== null;) Zc(e, t, n), e = e.sibling;
	}
	function Qc(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
		else if (r !== 4 && (r === 27 && Zd(e.type) && (n = e.stateNode), e = e.child, e !== null)) for (Qc(e, t, n), e = e.sibling; e !== null;) Qc(e, t, n), e = e.sibling;
	}
	function $c(e) {
		var t = e.stateNode, n = e.memoizedProps;
		try {
			for (var r = e.type, i = t.attributes; i.length;) t.removeAttributeNode(i[0]);
			Pd(t, r, n), t[pt] = e, t[mt] = n;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	var el = !1, tl = !1, nl = !1, rl = typeof WeakSet == "function" ? WeakSet : Set, il = null;
	function al(e, t) {
		if (e = e.containerInfo, Rd = sp, e = Mr(e), Nr(e)) {
			if ("selectionStart" in e) var n = {
				start: e.selectionStart,
				end: e.selectionEnd
			};
			else a: {
				n = (n = e.ownerDocument) && n.defaultView || window;
				var r = n.getSelection && n.getSelection();
				if (r && r.rangeCount !== 0) {
					n = r.anchorNode;
					var a = r.anchorOffset, o = r.focusNode;
					r = r.focusOffset;
					try {
						n.nodeType, o.nodeType;
					} catch {
						n = null;
						break a;
					}
					var s = 0, c = -1, l = -1, u = 0, d = 0, f = e, p = null;
					b: for (;;) {
						for (var m; f !== n || a !== 0 && f.nodeType !== 3 || (c = s + a), f !== o || r !== 0 && f.nodeType !== 3 || (l = s + r), f.nodeType === 3 && (s += f.nodeValue.length), (m = f.firstChild) !== null;) p = f, f = m;
						for (;;) {
							if (f === e) break b;
							if (p === n && ++u === a && (c = s), p === o && ++d === r && (l = s), (m = f.nextSibling) !== null) break;
							f = p, p = f.parentNode;
						}
						f = m;
					}
					n = c === -1 || l === -1 ? null : {
						start: c,
						end: l
					};
				} else n = null;
			}
			n ||= {
				start: 0,
				end: 0
			};
		} else n = null;
		for (zd = {
			focusedElem: e,
			selectionRange: n
		}, sp = !1, il = t; il !== null;) if (t = il, e = t.child, t.subtreeFlags & 1028 && e !== null) e.return = t, il = e;
		else for (; il !== null;) {
			switch (t = il, o = t.alternate, e = t.flags, t.tag) {
				case 0:
					if (e & 4 && (e = t.updateQueue, e = e === null ? null : e.events, e !== null)) for (n = 0; n < e.length; n++) a = e[n], a.ref.impl = a.nextImpl;
					break;
				case 11:
				case 15: break;
				case 1:
					if (e & 1024 && o !== null) {
						e = void 0, n = t, a = o.memoizedProps, o = o.memoizedState, r = n.stateNode;
						try {
							var h = Ks(n.type, a);
							e = r.getSnapshotBeforeUpdate(h, o), r.__reactInternalSnapshotBeforeUpdate = e;
						} catch (e) {
							Z(n, n.return, e);
						}
					}
					break;
				case 3:
					if (e & 1024) {
						if (e = t.stateNode.containerInfo, n = e.nodeType, n === 9) ef(e);
						else if (n === 1) switch (e.nodeName) {
							case "HEAD":
							case "HTML":
							case "BODY":
								ef(e);
								break;
							default: e.textContent = "";
						}
					}
					break;
				case 5:
				case 26:
				case 27:
				case 6:
				case 4:
				case 17: break;
				default: if (e & 1024) throw Error(i(163));
			}
			if (e = t.sibling, e !== null) {
				e.return = t.return, il = e;
				break;
			}
			il = t.return;
		}
	}
	function ol(e, t, n) {
		var r = n.flags;
		switch (n.tag) {
			case 0:
			case 11:
			case 15:
				bl(e, n), r & 4 && Vc(5, n);
				break;
			case 1:
				if (bl(e, n), r & 4) {
					if (e = n.stateNode, t === null) try {
						e.componentDidMount();
					} catch (e) {
						Z(n, n.return, e);
					}
					else {
						var i = Ks(n.type, t.memoizedProps);
						t = t.memoizedState;
						try {
							e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
						} catch (e) {
							Z(n, n.return, e);
						}
					}
				}
				r & 64 && Uc(n), r & 512 && Gc(n, n.return);
				break;
			case 3:
				if (bl(e, n), r & 64 && (e = n.updateQueue, e !== null)) {
					if (t = null, n.child !== null) switch (n.child.tag) {
						case 27:
						case 5:
							t = n.child.stateNode;
							break;
						case 1: t = n.child.stateNode;
					}
					try {
						Xa(e, t);
					} catch (e) {
						Z(n, n.return, e);
					}
				}
				break;
			case 27: t === null && r & 4 && $c(n);
			case 26:
			case 5:
				bl(e, n), t === null && r & 4 && qc(n), r & 512 && Gc(n, n.return);
				break;
			case 12:
				bl(e, n);
				break;
			case 31:
				bl(e, n), r & 4 && dl(e, n);
				break;
			case 13:
				bl(e, n), r & 4 && fl(e, n), r & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = Ju.bind(null, n), sf(e, n))));
				break;
			case 22:
				if (r = n.memoizedState !== null || el, !r) {
					t = t !== null && t.memoizedState !== null || tl, i = el;
					var a = tl;
					el = r, (tl = t) && !a ? Sl(e, n, !!(n.subtreeFlags & 8772)) : bl(e, n), el = i, tl = a;
				}
				break;
			case 30: break;
			default: bl(e, n);
		}
	}
	function sl(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, sl(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && xt(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	var G = null, cl = !1;
	function ll(e, t, n) {
		for (n = n.child; n !== null;) ul(e, t, n), n = n.sibling;
	}
	function ul(e, t, n) {
		if (He && typeof He.onCommitFiberUnmount == "function") try {
			He.onCommitFiberUnmount(Ve, n);
		} catch {}
		switch (n.tag) {
			case 26:
				tl || Kc(n, t), ll(e, t, n), n.memoizedState ? n.memoizedState.count-- : n.stateNode && (n = n.stateNode, n.parentNode.removeChild(n));
				break;
			case 27:
				tl || Kc(n, t);
				var r = G, i = cl;
				Zd(n.type) && (G = n.stateNode, cl = !1), ll(e, t, n), pf(n.stateNode), G = r, cl = i;
				break;
			case 5: tl || Kc(n, t);
			case 6:
				if (r = G, i = cl, G = null, ll(e, t, n), G = r, cl = i, G !== null) {
					if (cl) try {
						(G.nodeType === 9 ? G.body : G.nodeName === "HTML" ? G.ownerDocument.body : G).removeChild(n.stateNode);
					} catch (e) {
						Z(n, t, e);
					}
					else try {
						G.removeChild(n.stateNode);
					} catch (e) {
						Z(n, t, e);
					}
				}
				break;
			case 18:
				G !== null && (cl ? (e = G, Qd(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, n.stateNode), Np(e)) : Qd(G, n.stateNode));
				break;
			case 4:
				r = G, i = cl, G = n.stateNode.containerInfo, cl = !0, ll(e, t, n), G = r, cl = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				Hc(2, n, t), tl || Hc(4, n, t), ll(e, t, n);
				break;
			case 1:
				tl || (Kc(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function" && Wc(n, t, r)), ll(e, t, n);
				break;
			case 21:
				ll(e, t, n);
				break;
			case 22:
				tl = (r = tl) || n.memoizedState !== null, ll(e, t, n), tl = r;
				break;
			default: ll(e, t, n);
		}
	}
	function dl(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
			e = e.dehydrated;
			try {
				Np(e);
			} catch (e) {
				Z(t, t.return, e);
			}
		}
	}
	function fl(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
			Np(e);
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function pl(e) {
		switch (e.tag) {
			case 31:
			case 13:
			case 19:
				var t = e.stateNode;
				return t === null && (t = e.stateNode = new rl()), t;
			case 22: return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new rl()), t;
			default: throw Error(i(435, e.tag));
		}
	}
	function ml(e, t) {
		var n = pl(e);
		t.forEach(function(t) {
			if (!n.has(t)) {
				n.add(t);
				var r = Yu.bind(null, e, t);
				t.then(r, r);
			}
		});
	}
	function hl(e, t) {
		var n = t.deletions;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var a = n[r], o = e, s = t, c = s;
			a: for (; c !== null;) {
				switch (c.tag) {
					case 27:
						if (Zd(c.type)) {
							G = c.stateNode, cl = !1;
							break a;
						}
						break;
					case 5:
						G = c.stateNode, cl = !1;
						break a;
					case 3:
					case 4:
						G = c.stateNode.containerInfo, cl = !0;
						break a;
				}
				c = c.return;
			}
			if (G === null) throw Error(i(160));
			ul(o, s, a), G = null, cl = !1, o = a.alternate, o !== null && (o.return = null), a.return = null;
		}
		if (t.subtreeFlags & 13886) for (t = t.child; t !== null;) _l(t, e), t = t.sibling;
	}
	var gl = null;
	function _l(e, t) {
		var n = e.alternate, r = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				hl(t, e), vl(e), r & 4 && (Hc(3, e, e.return), Vc(3, e), Hc(5, e, e.return));
				break;
			case 1:
				hl(t, e), vl(e), r & 512 && (tl || n === null || Kc(n, n.return)), r & 64 && el && (e = e.updateQueue, e !== null && (r = e.callbacks, r !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? r : n.concat(r))));
				break;
			case 26:
				var a = gl;
				if (hl(t, e), vl(e), r & 512 && (tl || n === null || Kc(n, n.return)), r & 4) {
					var o = n === null ? null : n.memoizedState;
					if (r = e.memoizedState, n === null) {
						if (r === null) {
							if (e.stateNode === null) {
								a: {
									r = e.type, n = e.memoizedProps, a = a.ownerDocument || a;
									b: switch (r) {
										case "title":
											o = a.getElementsByTagName("title")[0], (!o || o[bt] || o[pt] || o.namespaceURI === "http://www.w3.org/2000/svg" || o.hasAttribute("itemprop")) && (o = a.createElement(r), a.head.insertBefore(o, a.querySelector("head > title"))), Pd(o, r, n), o[pt] = e, Et(o), r = o;
											break a;
										case "link":
											var s = Vf("link", "href", a).get(r + (n.href || ""));
											if (s) {
												for (var c = 0; c < s.length; c++) if (o = s[c], o.getAttribute("href") === (n.href == null || n.href === "" ? null : n.href) && o.getAttribute("rel") === (n.rel == null ? null : n.rel) && o.getAttribute("title") === (n.title == null ? null : n.title) && o.getAttribute("crossorigin") === (n.crossOrigin == null ? null : n.crossOrigin)) {
													s.splice(c, 1);
													break b;
												}
											}
											o = a.createElement(r), Pd(o, r, n), a.head.appendChild(o);
											break;
										case "meta":
											if (s = Vf("meta", "content", a).get(r + (n.content || ""))) {
												for (c = 0; c < s.length; c++) if (o = s[c], o.getAttribute("content") === (n.content == null ? null : "" + n.content) && o.getAttribute("name") === (n.name == null ? null : n.name) && o.getAttribute("property") === (n.property == null ? null : n.property) && o.getAttribute("http-equiv") === (n.httpEquiv == null ? null : n.httpEquiv) && o.getAttribute("charset") === (n.charSet == null ? null : n.charSet)) {
													s.splice(c, 1);
													break b;
												}
											}
											o = a.createElement(r), Pd(o, r, n), a.head.appendChild(o);
											break;
										default: throw Error(i(468, r));
									}
									o[pt] = e, Et(o), r = o;
								}
								e.stateNode = r;
							} else Hf(a, e.type, e.stateNode);
						} else e.stateNode = If(a, r, e.memoizedProps);
					} else o === r ? r === null && e.stateNode !== null && Jc(e, e.memoizedProps, n.memoizedProps) : (o === null ? n.stateNode !== null && (n = n.stateNode, n.parentNode.removeChild(n)) : o.count--, r === null ? Hf(a, e.type, e.stateNode) : If(a, r, e.memoizedProps));
				}
				break;
			case 27:
				hl(t, e), vl(e), r & 512 && (tl || n === null || Kc(n, n.return)), n !== null && r & 4 && Jc(e, e.memoizedProps, n.memoizedProps);
				break;
			case 5:
				if (hl(t, e), vl(e), r & 512 && (tl || n === null || Kc(n, n.return)), e.flags & 32) {
					a = e.stateNode;
					try {
						Zt(a, "");
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				r & 4 && e.stateNode != null && (a = e.memoizedProps, Jc(e, a, n === null ? a : n.memoizedProps)), r & 1024 && (nl = !0);
				break;
			case 6:
				if (hl(t, e), vl(e), r & 4) {
					if (e.stateNode === null) throw Error(i(162));
					r = e.memoizedProps, n = e.stateNode;
					try {
						n.nodeValue = r;
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				break;
			case 3:
				if (Bf = null, a = gl, gl = gf(t.containerInfo), hl(t, e), gl = a, vl(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
					Np(t.containerInfo);
				} catch (t) {
					Z(e, e.return, t);
				}
				nl && (nl = !1, yl(e));
				break;
			case 4:
				r = gl, gl = gf(e.stateNode.containerInfo), hl(t, e), vl(e), gl = r;
				break;
			case 12:
				hl(t, e), vl(e);
				break;
			case 31:
				hl(t, e), vl(e), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, ml(e, r)));
				break;
			case 13:
				hl(t, e), vl(e), e.child.flags & 8192 && e.memoizedState !== null != (n !== null && n.memoizedState !== null) && ($l = Me()), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, ml(e, r)));
				break;
			case 22:
				a = e.memoizedState !== null;
				var l = n !== null && n.memoizedState !== null, u = el, d = tl;
				if (el = u || a, tl = d || l, hl(t, e), tl = d, el = u, vl(e), r & 8192) a: for (t = e.stateNode, t._visibility = a ? t._visibility & -2 : t._visibility | 1, a && (n === null || l || el || tl || xl(e)), n = null, t = e;;) {
					if (t.tag === 5 || t.tag === 26) {
						if (n === null) {
							l = n = t;
							try {
								if (o = l.stateNode, a) s = o.style, typeof s.setProperty == "function" ? s.setProperty("display", "none", "important") : s.display = "none";
								else {
									c = l.stateNode;
									var f = l.memoizedProps.style, p = f != null && f.hasOwnProperty("display") ? f.display : null;
									c.style.display = p == null || typeof p == "boolean" ? "" : ("" + p).trim();
								}
							} catch (e) {
								Z(l, l.return, e);
							}
						}
					} else if (t.tag === 6) {
						if (n === null) {
							l = t;
							try {
								l.stateNode.nodeValue = a ? "" : l.memoizedProps;
							} catch (e) {
								Z(l, l.return, e);
							}
						}
					} else if (t.tag === 18) {
						if (n === null) {
							l = t;
							try {
								var m = l.stateNode;
								a ? $d(m, !0) : $d(l.stateNode, !1);
							} catch (e) {
								Z(l, l.return, e);
							}
						}
					} else if ((t.tag !== 22 && t.tag !== 23 || t.memoizedState === null || t === e) && t.child !== null) {
						t.child.return = t, t = t.child;
						continue;
					}
					if (t === e) break a;
					for (; t.sibling === null;) {
						if (t.return === null || t.return === e) break a;
						n === t && (n = null), t = t.return;
					}
					n === t && (n = null), t.sibling.return = t.return, t = t.sibling;
				}
				r & 4 && (r = e.updateQueue, r !== null && (n = r.retryQueue, n !== null && (r.retryQueue = null, ml(e, n))));
				break;
			case 19:
				hl(t, e), vl(e), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, ml(e, r)));
				break;
			case 30: break;
			case 21: break;
			default: hl(t, e), vl(e);
		}
	}
	function vl(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				for (var n, r = e.return; r !== null;) {
					if (Yc(r)) {
						n = r;
						break;
					}
					r = r.return;
				}
				if (n == null) throw Error(i(160));
				switch (n.tag) {
					case 27:
						var a = n.stateNode;
						Qc(e, Xc(e), a);
						break;
					case 5:
						var o = n.stateNode;
						n.flags & 32 && (Zt(o, ""), n.flags &= -33), Qc(e, Xc(e), o);
						break;
					case 3:
					case 4:
						var s = n.stateNode.containerInfo;
						Zc(e, Xc(e), s);
						break;
					default: throw Error(i(161));
				}
			} catch (t) {
				Z(e, e.return, t);
			}
			e.flags &= -3;
		}
		t & 4096 && (e.flags &= -4097);
	}
	function yl(e) {
		if (e.subtreeFlags & 1024) for (e = e.child; e !== null;) {
			var t = e;
			yl(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), e = e.sibling;
		}
	}
	function bl(e, t) {
		if (t.subtreeFlags & 8772) for (t = t.child; t !== null;) ol(e, t.alternate, t), t = t.sibling;
	}
	function xl(e) {
		for (e = e.child; e !== null;) {
			var t = e;
			switch (t.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					Hc(4, t, t.return), xl(t);
					break;
				case 1:
					Kc(t, t.return);
					var n = t.stateNode;
					typeof n.componentWillUnmount == "function" && Wc(t, t.return, n), xl(t);
					break;
				case 27: pf(t.stateNode);
				case 26:
				case 5:
					Kc(t, t.return), xl(t);
					break;
				case 22:
					t.memoizedState === null && xl(t);
					break;
				case 30:
					xl(t);
					break;
				default: xl(t);
			}
			e = e.sibling;
		}
	}
	function Sl(e, t, n) {
		for (n &&= !!(t.subtreeFlags & 8772), t = t.child; t !== null;) {
			var r = t.alternate, i = e, a = t, o = a.flags;
			switch (a.tag) {
				case 0:
				case 11:
				case 15:
					Sl(i, a, n), Vc(4, a);
					break;
				case 1:
					if (Sl(i, a, n), r = a, i = r.stateNode, typeof i.componentDidMount == "function") try {
						i.componentDidMount();
					} catch (e) {
						Z(r, r.return, e);
					}
					if (r = a, i = r.updateQueue, i !== null) {
						var s = r.stateNode;
						try {
							var c = i.shared.hiddenCallbacks;
							if (c !== null) for (i.shared.hiddenCallbacks = null, i = 0; i < c.length; i++) Ya(c[i], s);
						} catch (e) {
							Z(r, r.return, e);
						}
					}
					n && o & 64 && Uc(a), Gc(a, a.return);
					break;
				case 27: $c(a);
				case 26:
				case 5:
					Sl(i, a, n), n && r === null && o & 4 && qc(a), Gc(a, a.return);
					break;
				case 12:
					Sl(i, a, n);
					break;
				case 31:
					Sl(i, a, n), n && o & 4 && dl(i, a);
					break;
				case 13:
					Sl(i, a, n), n && o & 4 && fl(i, a);
					break;
				case 22:
					a.memoizedState === null && Sl(i, a, n), Gc(a, a.return);
					break;
				case 30: break;
				default: Sl(i, a, n);
			}
			t = t.sibling;
		}
	}
	function Cl(e, t) {
		var n = null;
		e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && ua(n));
	}
	function wl(e, t) {
		e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && ua(e));
	}
	function Tl(e, t, n, r) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) El(e, t, n, r), t = t.sibling;
	}
	function El(e, t, n, r) {
		var i = t.flags;
		switch (t.tag) {
			case 0:
			case 11:
			case 15:
				Tl(e, t, n, r), i & 2048 && Vc(9, t);
				break;
			case 1:
				Tl(e, t, n, r);
				break;
			case 3:
				Tl(e, t, n, r), i & 2048 && (e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && ua(e)));
				break;
			case 12:
				if (i & 2048) {
					Tl(e, t, n, r), e = t.stateNode;
					try {
						var a = t.memoizedProps, o = a.id, s = a.onPostCommit;
						typeof s == "function" && s(o, t.alternate === null ? "mount" : "update", e.passiveEffectDuration, -0);
					} catch (e) {
						Z(t, t.return, e);
					}
				} else Tl(e, t, n, r);
				break;
			case 31:
				Tl(e, t, n, r);
				break;
			case 13:
				Tl(e, t, n, r);
				break;
			case 23: break;
			case 22:
				a = t.stateNode, o = t.alternate, t.memoizedState === null ? a._visibility & 2 ? Tl(e, t, n, r) : (a._visibility |= 2, Dl(e, t, n, r, !!(t.subtreeFlags & 10256) || !1)) : a._visibility & 2 ? Tl(e, t, n, r) : Ol(e, t), i & 2048 && Cl(o, t);
				break;
			case 24:
				Tl(e, t, n, r), i & 2048 && wl(t.alternate, t);
				break;
			default: Tl(e, t, n, r);
		}
	}
	function Dl(e, t, n, r, i) {
		for (i &&= !!(t.subtreeFlags & 10256) || !1, t = t.child; t !== null;) {
			var a = e, o = t, s = n, c = r, l = o.flags;
			switch (o.tag) {
				case 0:
				case 11:
				case 15:
					Dl(a, o, s, c, i), Vc(8, o);
					break;
				case 23: break;
				case 22:
					var u = o.stateNode;
					o.memoizedState === null ? (u._visibility |= 2, Dl(a, o, s, c, i)) : u._visibility & 2 ? Dl(a, o, s, c, i) : Ol(a, o), i && l & 2048 && Cl(o.alternate, o);
					break;
				case 24:
					Dl(a, o, s, c, i), i && l & 2048 && wl(o.alternate, o);
					break;
				default: Dl(a, o, s, c, i);
			}
			t = t.sibling;
		}
	}
	function Ol(e, t) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) {
			var n = e, r = t, i = r.flags;
			switch (r.tag) {
				case 22:
					Ol(n, r), i & 2048 && Cl(r.alternate, r);
					break;
				case 24:
					Ol(n, r), i & 2048 && wl(r.alternate, r);
					break;
				default: Ol(n, r);
			}
			t = t.sibling;
		}
	}
	var kl = 8192;
	function Al(e, t, n) {
		if (e.subtreeFlags & kl) for (e = e.child; e !== null;) jl(e, t, n), e = e.sibling;
	}
	function jl(e, t, n) {
		switch (e.tag) {
			case 26:
				Al(e, t, n), e.flags & kl && e.memoizedState !== null && Gf(n, gl, e.memoizedState, e.memoizedProps);
				break;
			case 5:
				Al(e, t, n);
				break;
			case 3:
			case 4:
				var r = gl;
				gl = gf(e.stateNode.containerInfo), Al(e, t, n), gl = r;
				break;
			case 22:
				e.memoizedState === null && (r = e.alternate, r !== null && r.memoizedState !== null ? (r = kl, kl = 16777216, Al(e, t, n), kl = r) : Al(e, t, n));
				break;
			default: Al(e, t, n);
		}
	}
	function Ml(e) {
		var t = e.alternate;
		if (t !== null && (e = t.child, e !== null)) {
			t.child = null;
			do
				t = e.sibling, e.sibling = null, e = t;
			while (e !== null);
		}
	}
	function Nl(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				il = r, Il(r, e);
			}
			Ml(e);
		}
		if (e.subtreeFlags & 10256) for (e = e.child; e !== null;) Pl(e), e = e.sibling;
	}
	function Pl(e) {
		switch (e.tag) {
			case 0:
			case 11:
			case 15:
				Nl(e), e.flags & 2048 && Hc(9, e, e.return);
				break;
			case 3:
				Nl(e);
				break;
			case 12:
				Nl(e);
				break;
			case 22:
				var t = e.stateNode;
				e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, Fl(e)) : Nl(e);
				break;
			default: Nl(e);
		}
	}
	function Fl(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				il = r, Il(r, e);
			}
			Ml(e);
		}
		for (e = e.child; e !== null;) {
			switch (t = e, t.tag) {
				case 0:
				case 11:
				case 15:
					Hc(8, t, t.return), Fl(t);
					break;
				case 22:
					n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, Fl(t));
					break;
				default: Fl(t);
			}
			e = e.sibling;
		}
	}
	function Il(e, t) {
		for (; il !== null;) {
			var n = il;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					Hc(8, n, t);
					break;
				case 23:
				case 22:
					if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
						var r = n.memoizedState.cachePool.pool;
						r != null && r.refCount++;
					}
					break;
				case 24: ua(n.memoizedState.cache);
			}
			if (r = n.child, r !== null) r.return = n, il = r;
			else a: for (n = e; il !== null;) {
				r = il;
				var i = r.sibling, a = r.return;
				if (sl(r), r === n) {
					il = null;
					break a;
				}
				if (i !== null) {
					i.return = a, il = i;
					break a;
				}
				il = a;
			}
		}
	}
	var Ll = {
		getCacheForType: function(e) {
			var t = na(ca), n = t.data.get(e);
			return n === void 0 && (n = e(), t.data.set(e, n)), n;
		},
		cacheSignal: function() {
			return na(ca).controller.signal;
		}
	}, Rl = typeof WeakMap == "function" ? WeakMap : Map, K = 0, q = null, J = null, Y = 0, X = 0, zl = null, Bl = !1, Vl = !1, Hl = !1, Ul = 0, Wl = 0, Gl = 0, Kl = 0, ql = 0, Jl = 0, Yl = 0, Xl = null, Zl = null, Ql = !1, $l = 0, eu = 0, tu = Infinity, nu = null, ru = null, iu = 0, au = null, ou = null, su = 0, cu = 0, lu = null, uu = null, du = 0, fu = null;
	function pu() {
		return K & 2 && Y !== 0 ? Y & -Y : O.T === null ? ut() : dd();
	}
	function mu() {
		if (Jl === 0) {
			if (!(Y & 536870912) || R) {
				var e = Ye;
				Ye <<= 1, !(Ye & 3932160) && (Ye = 262144), Jl = e;
			} else Jl = 536870912;
		}
		return e = no.current, e !== null && (e.flags |= 32), Jl;
	}
	function hu(e, t, n) {
		(e === q && (X === 2 || X === 9) || e.cancelPendingCommit !== null) && (Su(e, 0), yu(e, Y, Jl, !1)), rt(e, n), (!(K & 2) || e !== q) && (e === q && (!(K & 2) && (Kl |= n), Wl === 4 && yu(e, Y, Jl, !1)), rd(e));
	}
	function gu(e, t, n) {
		if (K & 6) throw Error(i(327));
		var r = !n && !(t & 127) && (t & e.expiredLanes) === 0 || $e(e, t), a = r ? Au(e, t) : Ou(e, t, !0), o = r;
		do {
			if (a === 0) {
				Vl && !r && yu(e, t, 0, !1);
				break;
			}
			if (n = e.current.alternate, o && !vu(n)) {
				a = Ou(e, t, !1), o = !1;
				continue;
			}
			if (a === 2) {
				if (o = t, e.errorRecoveryDisabledLanes & o) var s = 0;
				else s = e.pendingLanes & -536870913, s = s === 0 ? s & 536870912 ? 536870912 : 0 : s;
				if (s !== 0) {
					t = s;
					a: {
						var c = e;
						a = Xl;
						var l = c.current.memoizedState.isDehydrated;
						if (l && (Su(c, s).flags |= 256), s = Ou(c, s, !1), s !== 2) {
							if (Hl && !l) {
								c.errorRecoveryDisabledLanes |= o, Kl |= o, a = 4;
								break a;
							}
							o = Zl, Zl = a, o !== null && (Zl === null ? Zl = o : Zl.push.apply(Zl, o));
						}
						a = s;
					}
					if (o = !1, a !== 2) continue;
				}
			}
			if (a === 1) {
				Su(e, 0), yu(e, t, 0, !0);
				break;
			}
			a: {
				switch (r = e, o = a, o) {
					case 0:
					case 1: throw Error(i(345));
					case 4: if ((t & 4194048) !== t) break;
					case 6:
						yu(r, t, Jl, !Bl);
						break a;
					case 2:
						Zl = null;
						break;
					case 3:
					case 5: break;
					default: throw Error(i(329));
				}
				if ((t & 62914560) === t && (a = $l + 300 - Me(), 10 < a)) {
					if (yu(r, t, Jl, !Bl), Qe(r, 0, !0) !== 0) break a;
					su = t, r.timeoutHandle = Kd(_u.bind(null, r, n, Zl, nu, Ql, t, Jl, Kl, Yl, Bl, o, "Throttled", -0, 0), a);
					break a;
				}
				_u(r, n, Zl, nu, Ql, t, Jl, Kl, Yl, Bl, o, null, -0, 0);
			}
			break;
		} while (1);
		rd(e);
	}
	function _u(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
		if (e.timeoutHandle = -1, d = t.subtreeFlags, d & 8192 || (d & 16785408) == 16785408) {
			d = {
				stylesheets: null,
				count: 0,
				imgCount: 0,
				imgBytes: 0,
				suspenseyImages: [],
				waitingForImages: !0,
				waitingForViewTransition: !1,
				unsuspend: on
			}, jl(t, a, d);
			var m = (a & 62914560) === a ? $l - Me() : (a & 4194048) === a ? eu - Me() : 0;
			if (m = qf(d, m), m !== null) {
				su = a, e.cancelPendingCommit = m(Lu.bind(null, e, t, a, n, r, i, o, s, c, u, d, null, f, p)), yu(e, a, o, !l);
				return;
			}
		}
		Lu(e, t, a, n, r, i, o, s, c);
	}
	function vu(e) {
		for (var t = e;;) {
			var n = t.tag;
			if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null))) for (var r = 0; r < n.length; r++) {
				var i = n[r], a = i.getSnapshot;
				i = i.value;
				try {
					if (!Dr(a(), i)) return !1;
				} catch {
					return !1;
				}
			}
			if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
			else {
				if (t === e) break;
				for (; t.sibling === null;) {
					if (t.return === null || t.return === e) return !0;
					t = t.return;
				}
				t.sibling.return = t.return, t = t.sibling;
			}
		}
		return !0;
	}
	function yu(e, t, n, r) {
		t &= ~ql, t &= ~Kl, e.suspendedLanes |= t, e.pingedLanes &= ~t, r && (e.warmLanes |= t), r = e.expirationTimes;
		for (var i = t; 0 < i;) {
			var a = 31 - We(i), o = 1 << a;
			r[a] = -1, i &= ~o;
		}
		n !== 0 && at(e, n, t);
	}
	function bu() {
		return K & 6 ? !0 : (id(0, !1), !1);
	}
	function xu() {
		if (J !== null) {
			if (X === 0) var e = J.return;
			else e = J, Ji = qi = null, Oo(e), ja = null, Ma = 0, e = J;
			for (; e !== null;) Bc(e.alternate, e), e = e.return;
			J = null;
		}
	}
	function Su(e, t) {
		var n = e.timeoutHandle;
		n !== -1 && (e.timeoutHandle = -1, qd(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), su = 0, xu(), q = e, J = n = pi(e.current, null), Y = t, X = 0, zl = null, Bl = !1, Vl = $e(e, t), Hl = !1, Yl = Jl = ql = Kl = Gl = Wl = 0, Zl = Xl = null, Ql = !1, t & 8 && (t |= t & 32);
		var r = e.entangledLanes;
		if (r !== 0) for (e = e.entanglements, r &= t; 0 < r;) {
			var i = 31 - We(r), a = 1 << i;
			t |= e[i], r &= ~a;
		}
		return Ul = t, ri(), n;
	}
	function Cu(e, t) {
		H = null, O.H = Rs, t === xa || t === Ca ? (t = ka(), X = 3) : t === Sa ? (t = ka(), X = 4) : X = t === nc ? 8 : typeof t == "object" && t && typeof t.then == "function" ? 6 : 1, zl = t, J === null && (Wl = 1, Xs(e, bi(t, e.current)));
	}
	function wu() {
		var e = no.current;
		return e === null ? !0 : (Y & 4194048) === Y ? ro === null : (Y & 62914560) === Y || Y & 536870912 ? e === ro : !1;
	}
	function Tu() {
		var e = O.H;
		return O.H = Rs, e === null ? Rs : e;
	}
	function Eu() {
		var e = O.A;
		return O.A = Ll, e;
	}
	function Du() {
		Wl = 4, Bl || (Y & 4194048) !== Y && no.current !== null || (Vl = !0), !(Gl & 134217727) && !(Kl & 134217727) || q === null || yu(q, Y, Jl, !1);
	}
	function Ou(e, t, n) {
		var r = K;
		K |= 2;
		var i = Tu(), a = Eu();
		(q !== e || Y !== t) && (nu = null, Su(e, t)), t = !1;
		var o = Wl;
		a: do
			try {
				if (X !== 0 && J !== null) {
					var s = J, c = zl;
					switch (X) {
						case 8:
							xu(), o = 6;
							break a;
						case 3:
						case 2:
						case 9:
						case 6:
							no.current === null && (t = !0);
							var l = X;
							if (X = 0, zl = null, Pu(e, s, c, l), n && Vl) {
								o = 0;
								break a;
							}
							break;
						default: l = X, X = 0, zl = null, Pu(e, s, c, l);
					}
				}
				ku(), o = Wl;
				break;
			} catch (t) {
				Cu(e, t);
			}
		while (1);
		return t && e.shellSuspendCounter++, Ji = qi = null, K = r, O.H = i, O.A = a, J === null && (q = null, Y = 0, ri()), o;
	}
	function ku() {
		for (; J !== null;) Mu(J);
	}
	function Au(e, t) {
		var n = K;
		K |= 2;
		var r = Tu(), a = Eu();
		q !== e || Y !== t ? (nu = null, tu = Me() + 500, Su(e, t)) : Vl = $e(e, t);
		a: do
			try {
				if (X !== 0 && J !== null) {
					t = J;
					var o = zl;
					b: switch (X) {
						case 1:
							X = 0, zl = null, Pu(e, t, o, 1);
							break;
						case 2:
						case 9:
							if (Ta(o)) {
								X = 0, zl = null, Nu(t);
								break;
							}
							t = function() {
								X !== 2 && X !== 9 || q !== e || (X = 7), rd(e);
							}, o.then(t, t);
							break a;
						case 3:
							X = 7;
							break a;
						case 4:
							X = 5;
							break a;
						case 7:
							Ta(o) ? (X = 0, zl = null, Nu(t)) : (X = 0, zl = null, Pu(e, t, o, 7));
							break;
						case 5:
							var s = null;
							switch (J.tag) {
								case 26: s = J.memoizedState;
								case 5:
								case 27:
									var c = J;
									if (s ? Wf(s) : c.stateNode.complete) {
										X = 0, zl = null;
										var l = c.sibling;
										if (l !== null) J = l;
										else {
											var u = c.return;
											u === null ? J = null : (J = u, Fu(u));
										}
										break b;
									}
							}
							X = 0, zl = null, Pu(e, t, o, 5);
							break;
						case 6:
							X = 0, zl = null, Pu(e, t, o, 6);
							break;
						case 8:
							xu(), Wl = 6;
							break a;
						default: throw Error(i(462));
					}
				}
				ju();
				break;
			} catch (t) {
				Cu(e, t);
			}
		while (1);
		return Ji = qi = null, O.H = r, O.A = a, K = n, J === null ? (q = null, Y = 0, ri(), Wl) : 0;
	}
	function ju() {
		for (; J !== null && !Ae();) Mu(J);
	}
	function Mu(e) {
		var t = Mc(e.alternate, e, Ul);
		e.memoizedProps = e.pendingProps, t === null ? Fu(e) : J = t;
	}
	function Nu(e) {
		var t = e, n = t.alternate;
		switch (t.tag) {
			case 15:
			case 0:
				t = gc(n, t, t.pendingProps, t.type, void 0, Y);
				break;
			case 11:
				t = gc(n, t, t.pendingProps, t.type.render, t.ref, Y);
				break;
			case 5: Oo(t);
			default: Bc(n, t), t = J = mi(t, Ul), t = Mc(n, t, Ul);
		}
		e.memoizedProps = e.pendingProps, t === null ? Fu(e) : J = t;
	}
	function Pu(e, t, n, r) {
		Ji = qi = null, Oo(t), ja = null, Ma = 0;
		var i = t.return;
		try {
			if (tc(e, i, t, n, Y)) {
				Wl = 1, Xs(e, bi(n, e.current)), J = null;
				return;
			}
		} catch (t) {
			if (i !== null) throw J = i, t;
			Wl = 1, Xs(e, bi(n, e.current)), J = null;
			return;
		}
		t.flags & 32768 ? (R || r === 1 ? e = !0 : Vl || Y & 536870912 ? e = !1 : (Bl = e = !0, (r === 2 || r === 9 || r === 3 || r === 6) && (r = no.current, r !== null && r.tag === 13 && (r.flags |= 16384))), Iu(t, e)) : Fu(t);
	}
	function Fu(e) {
		var t = e;
		do {
			if (t.flags & 32768) {
				Iu(t, Bl);
				return;
			}
			e = t.return;
			var n = Rc(t.alternate, t, Ul);
			if (n !== null) {
				J = n;
				return;
			}
			if (t = t.sibling, t !== null) {
				J = t;
				return;
			}
			J = t = e;
		} while (t !== null);
		Wl === 0 && (Wl = 5);
	}
	function Iu(e, t) {
		do {
			var n = zc(e.alternate, e);
			if (n !== null) {
				n.flags &= 32767, J = n;
				return;
			}
			if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
				J = e;
				return;
			}
			J = e = n;
		} while (e !== null);
		Wl = 6, J = null;
	}
	function Lu(e, t, n, r, a, o, s, c, l) {
		e.cancelPendingCommit = null;
		do
			Hu();
		while (iu !== 0);
		if (K & 6) throw Error(i(327));
		if (t !== null) {
			if (t === e.current) throw Error(i(177));
			if (o = t.lanes | t.childLanes, o |= ni, it(e, n, o, s, c, l), e === q && (J = q = null, Y = 0), ou = t, au = e, su = n, cu = o, lu = a, uu = r, t.subtreeFlags & 10256 || t.flags & 10256 ? (e.callbackNode = null, e.callbackPriority = 0, Xu(Ie, function() {
				return Uu(), null;
			})) : (e.callbackNode = null, e.callbackPriority = 0), r = !!(t.flags & 13878), t.subtreeFlags & 13878 || r) {
				r = O.T, O.T = null, a = k.p, k.p = 2, s = K, K |= 4;
				try {
					al(e, t, n);
				} finally {
					K = s, k.p = a, O.T = r;
				}
			}
			iu = 1, Ru(), zu(), Bu();
		}
	}
	function Ru() {
		if (iu === 1) {
			iu = 0;
			var e = au, t = ou, n = !!(t.flags & 13878);
			if (t.subtreeFlags & 13878 || n) {
				n = O.T, O.T = null;
				var r = k.p;
				k.p = 2;
				var i = K;
				K |= 4;
				try {
					_l(t, e);
					var a = zd, o = Mr(e.containerInfo), s = a.focusedElem, c = a.selectionRange;
					if (o !== s && s && s.ownerDocument && jr(s.ownerDocument.documentElement, s)) {
						if (c !== null && Nr(s)) {
							var l = c.start, u = c.end;
							if (u === void 0 && (u = l), "selectionStart" in s) s.selectionStart = l, s.selectionEnd = Math.min(u, s.value.length);
							else {
								var d = s.ownerDocument || document, f = d && d.defaultView || window;
								if (f.getSelection) {
									var p = f.getSelection(), m = s.textContent.length, h = Math.min(c.start, m), g = c.end === void 0 ? h : Math.min(c.end, m);
									!p.extend && h > g && (o = g, g = h, h = o);
									var _ = Ar(s, h), v = Ar(s, g);
									if (_ && v && (p.rangeCount !== 1 || p.anchorNode !== _.node || p.anchorOffset !== _.offset || p.focusNode !== v.node || p.focusOffset !== v.offset)) {
										var y = d.createRange();
										y.setStart(_.node, _.offset), p.removeAllRanges(), h > g ? (p.addRange(y), p.extend(v.node, v.offset)) : (y.setEnd(v.node, v.offset), p.addRange(y));
									}
								}
							}
						}
						for (d = [], p = s; p = p.parentNode;) p.nodeType === 1 && d.push({
							element: p,
							left: p.scrollLeft,
							top: p.scrollTop
						});
						for (typeof s.focus == "function" && s.focus(), s = 0; s < d.length; s++) {
							var b = d[s];
							b.element.scrollLeft = b.left, b.element.scrollTop = b.top;
						}
					}
					sp = !!Rd, zd = Rd = null;
				} finally {
					K = i, k.p = r, O.T = n;
				}
			}
			e.current = t, iu = 2;
		}
	}
	function zu() {
		if (iu === 2) {
			iu = 0;
			var e = au, t = ou, n = !!(t.flags & 8772);
			if (t.subtreeFlags & 8772 || n) {
				n = O.T, O.T = null;
				var r = k.p;
				k.p = 2;
				var i = K;
				K |= 4;
				try {
					ol(e, t.alternate, t);
				} finally {
					K = i, k.p = r, O.T = n;
				}
			}
			iu = 3;
		}
	}
	function Bu() {
		if (iu === 4 || iu === 3) {
			iu = 0, je();
			var e = au, t = ou, n = su, r = uu;
			t.subtreeFlags & 10256 || t.flags & 10256 ? iu = 5 : (iu = 0, ou = au = null, Vu(e, e.pendingLanes));
			var i = e.pendingLanes;
			if (i === 0 && (ru = null), lt(n), t = t.stateNode, He && typeof He.onCommitFiberRoot == "function") try {
				He.onCommitFiberRoot(Ve, t, void 0, (t.current.flags & 128) == 128);
			} catch {}
			if (r !== null) {
				t = O.T, i = k.p, k.p = 2, O.T = null;
				try {
					for (var a = e.onRecoverableError, o = 0; o < r.length; o++) {
						var s = r[o];
						a(s.value, { componentStack: s.stack });
					}
				} finally {
					O.T = t, k.p = i;
				}
			}
			su & 3 && Hu(), rd(e), i = e.pendingLanes, n & 261930 && i & 42 ? e === fu ? du++ : (du = 0, fu = e) : du = 0, id(0, !1);
		}
	}
	function Vu(e, t) {
		(e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, ua(t)));
	}
	function Hu() {
		return Ru(), zu(), Bu(), Uu();
	}
	function Uu() {
		if (iu !== 5) return !1;
		var e = au, t = cu;
		cu = 0;
		var n = lt(su), r = O.T, a = k.p;
		try {
			k.p = 32 > n ? 32 : n, O.T = null, n = lu, lu = null;
			var o = au, s = su;
			if (iu = 0, ou = au = null, su = 0, K & 6) throw Error(i(331));
			var c = K;
			if (K |= 4, Pl(o.current), El(o, o.current, s, n), K = c, id(0, !1), He && typeof He.onPostCommitFiberRoot == "function") try {
				He.onPostCommitFiberRoot(Ve, o);
			} catch {}
			return !0;
		} finally {
			k.p = a, O.T = r, Vu(e, t);
		}
	}
	function Wu(e, t, n) {
		t = bi(n, t), t = Qs(e.stateNode, t, 2), e = Ua(e, t, 2), e !== null && (rt(e, 2), rd(e));
	}
	function Z(e, t, n) {
		if (e.tag === 3) Wu(e, e, n);
		else for (; t !== null;) {
			if (t.tag === 3) {
				Wu(t, e, n);
				break;
			}
			if (t.tag === 1) {
				var r = t.stateNode;
				if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (ru === null || !ru.has(r))) {
					e = bi(n, e), n = $s(2), r = Ua(t, n, 2), r !== null && (ec(n, r, t, e), rt(r, 2), rd(r));
					break;
				}
			}
			t = t.return;
		}
	}
	function Gu(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new Rl();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (Hl = !0, i.add(n), e = Ku.bind(null, e, t, n), t.then(e, e));
	}
	function Ku(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, q === e && (Y & n) === n && (Wl === 4 || Wl === 3 && (Y & 62914560) === Y && 300 > Me() - $l ? !(K & 2) && Su(e, 0) : ql |= n, Yl === Y && (Yl = 0)), rd(e);
	}
	function qu(e, t) {
		t === 0 && (t = tt()), e = oi(e, t), e !== null && (rt(e, t), rd(e));
	}
	function Ju(e) {
		var t = e.memoizedState, n = 0;
		t !== null && (n = t.retryLane), qu(e, n);
	}
	function Yu(e, t) {
		var n = 0;
		switch (e.tag) {
			case 31:
			case 13:
				var r = e.stateNode, a = e.memoizedState;
				a !== null && (n = a.retryLane);
				break;
			case 19:
				r = e.stateNode;
				break;
			case 22:
				r = e.stateNode._retryCache;
				break;
			default: throw Error(i(314));
		}
		r !== null && r.delete(t), qu(e, n);
	}
	function Xu(e, t) {
		return Oe(e, t);
	}
	var Zu = null, Qu = null, $u = !1, ed = !1, td = !1, nd = 0;
	function rd(e) {
		e !== Qu && e.next === null && (Qu === null ? Zu = Qu = e : Qu = Qu.next = e), ed = !0, $u || ($u = !0, ud());
	}
	function id(e, t) {
		if (!td && ed) {
			td = !0;
			do
				for (var n = !1, r = Zu; r !== null;) {
					if (!t) {
						if (e !== 0) {
							var i = r.pendingLanes;
							if (i === 0) var a = 0;
							else {
								var o = r.suspendedLanes, s = r.pingedLanes;
								a = (1 << 31 - We(42 | e) + 1) - 1, a &= i & ~(o & ~s), a = a & 201326741 ? a & 201326741 | 1 : a ? a | 2 : 0;
							}
							a !== 0 && (n = !0, ld(r, a));
						} else a = Y, a = Qe(r, r === q ? a : 0, r.cancelPendingCommit !== null || r.timeoutHandle !== -1), !(a & 3) || $e(r, a) || (n = !0, ld(r, a));
					}
					r = r.next;
				}
			while (n);
			td = !1;
		}
	}
	function ad() {
		od();
	}
	function od() {
		ed = $u = !1;
		var e = 0;
		nd !== 0 && Gd() && (e = nd);
		for (var t = Me(), n = null, r = Zu; r !== null;) {
			var i = r.next, a = sd(r, t);
			a === 0 ? (r.next = null, n === null ? Zu = i : n.next = i, i === null && (Qu = n)) : (n = r, (e !== 0 || a & 3) && (ed = !0)), r = i;
		}
		iu !== 0 && iu !== 5 || id(e, !1), nd !== 0 && (nd = 0);
	}
	function sd(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes & -62914561; 0 < a;) {
			var o = 31 - We(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = et(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
		if (t = q, n = Y, n = Qe(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r = e.callbackNode, n === 0 || e === t && (X === 2 || X === 9) || e.cancelPendingCommit !== null) return r !== null && r !== null && ke(r), e.callbackNode = null, e.callbackPriority = 0;
		if (!(n & 3) || $e(e, n)) {
			if (t = n & -n, t === e.callbackPriority) return t;
			switch (r !== null && ke(r), lt(n)) {
				case 2:
				case 8:
					n = Fe;
					break;
				case 32:
					n = Ie;
					break;
				case 268435456:
					n = Re;
					break;
				default: n = Ie;
			}
			return r = cd.bind(null, e), n = Oe(n, r), e.callbackPriority = t, e.callbackNode = n, t;
		}
		return r !== null && r !== null && ke(r), e.callbackPriority = 2, e.callbackNode = null, 2;
	}
	function cd(e, t) {
		if (iu !== 0 && iu !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
		var n = e.callbackNode;
		if (Hu() && e.callbackNode !== n) return null;
		var r = Y;
		return r = Qe(e, e === q ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r === 0 ? null : (gu(e, r, t), sd(e, Me()), e.callbackNode != null && e.callbackNode === n ? cd.bind(null, e) : null);
	}
	function ld(e, t) {
		if (Hu()) return null;
		gu(e, t, !0);
	}
	function ud() {
		Yd(function() {
			K & 6 ? Oe(Pe, ad) : od();
		});
	}
	function dd() {
		if (nd === 0) {
			var e = z;
			e === 0 && (e = Je, Je <<= 1, !(Je & 261888) && (Je = 256)), nd = e;
		}
		return nd;
	}
	function fd(e) {
		return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : an("" + e);
	}
	function pd(e, t) {
		var n = t.ownerDocument.createElement("input");
		return n.name = t.name, n.value = t.value, e.id && n.setAttribute("form", e.id), t.parentNode.insertBefore(n, t), e = new FormData(e), n.parentNode.removeChild(n), e;
	}
	function md(e, t, n, r, i) {
		if (t === "submit" && n && n.stateNode === i) {
			var a = fd((i[mt] || null).action), o = r.submitter;
			o && (t = (t = o[mt] || null) ? fd(t.formAction) : o.getAttribute("formAction"), t !== null && (a = t, o = null));
			var s = new En("action", "action", null, r, i);
			e.push({
				event: s,
				listeners: [{
					instance: null,
					listener: function() {
						if (r.defaultPrevented) {
							if (nd !== 0) {
								var e = o ? pd(i, o) : new FormData(i);
								ws(n, {
									pending: !0,
									data: e,
									method: i.method,
									action: a
								}, null, e);
							}
						} else typeof a == "function" && (s.preventDefault(), e = o ? pd(i, o) : new FormData(i), ws(n, {
							pending: !0,
							data: e,
							method: i.method,
							action: a
						}, a, e));
					},
					currentTarget: i
				}]
			});
		}
	}
	for (var hd = 0; hd < Zr.length; hd++) {
		var gd = Zr[hd];
		Qr(gd.toLowerCase(), "on" + (gd[0].toUpperCase() + gd.slice(1)));
	}
	Qr(Wr, "onAnimationEnd"), Qr(Gr, "onAnimationIteration"), Qr(Kr, "onAnimationStart"), Qr("dblclick", "onDoubleClick"), Qr("focusin", "onFocus"), Qr("focusout", "onBlur"), Qr(qr, "onTransitionRun"), Qr(Jr, "onTransitionStart"), Qr(Yr, "onTransitionCancel"), Qr(Xr, "onTransitionEnd"), At("onMouseEnter", ["mouseout", "mouseover"]), At("onMouseLeave", ["mouseout", "mouseover"]), At("onPointerEnter", ["pointerout", "pointerover"]), At("onPointerLeave", ["pointerout", "pointerover"]), kt("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), kt("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), kt("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), kt("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), kt("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), kt("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var _d = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), vd = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(_d));
	function yd(e, t) {
		t = !!(t & 4);
		for (var n = 0; n < e.length; n++) {
			var r = e[n], i = r.event;
			r = r.listeners;
			a: {
				var a = void 0;
				if (t) for (var o = r.length - 1; 0 <= o; o--) {
					var s = r[o], c = s.instance, l = s.currentTarget;
					if (s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						$r(e);
					}
					i.currentTarget = null, a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						$r(e);
					}
					i.currentTarget = null, a = c;
				}
			}
		}
	}
	function Q(e, t) {
		var n = t[gt];
		n === void 0 && (n = t[gt] = /* @__PURE__ */ new Set());
		var r = e + "__bubble";
		n.has(r) || (Cd(t, e, 2, !1), n.add(r));
	}
	function bd(e, t, n) {
		var r = 0;
		t && (r |= 4), Cd(n, e, r, t);
	}
	var xd = "_reactListening" + Math.random().toString(36).slice(2);
	function Sd(e) {
		if (!e[xd]) {
			e[xd] = !0, Dt.forEach(function(t) {
				t !== "selectionchange" && (vd.has(t) || bd(t, !1, e), bd(t, !0, e));
			});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[xd] || (t[xd] = !0, bd("selectionchange", !1, t));
		}
	}
	function Cd(e, t, n, r) {
		switch (mp(t)) {
			case 2:
				var i = cp;
				break;
			case 8:
				i = lp;
				break;
			default: i = up;
		}
		n = i.bind(null, t, n, e), i = void 0, !gn || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
			capture: !0,
			passive: i
		}) : i === void 0 ? e.addEventListener(t, n, !1) : e.addEventListener(t, n, { passive: i });
	}
	function wd(e, t, n, r, i) {
		var a = r;
		if (!(t & 1) && !(t & 2) && r !== null) a: for (;;) {
			if (r === null) return;
			var s = r.tag;
			if (s === 3 || s === 4) {
				var c = r.stateNode.containerInfo;
				if (c === i) break;
				if (s === 4) for (s = r.return; s !== null;) {
					var l = s.tag;
					if ((l === 3 || l === 4) && s.stateNode.containerInfo === i) return;
					s = s.return;
				}
				for (; c !== null;) {
					if (s = St(c), s === null) return;
					if (l = s.tag, l === 5 || l === 6 || l === 26 || l === 27) {
						r = a = s;
						continue a;
					}
					c = c.parentNode;
				}
			}
			r = r.return;
		}
		pn(function() {
			var r = a, i = cn(n), s = [];
			a: {
				var c = F.get(e);
				if (c !== void 0) {
					var l = En, u = e;
					switch (e) {
						case "keypress": if (N(n) === 0) break a;
						case "keydown":
						case "keyup":
							l = Wn;
							break;
						case "focusin":
							u = "focus", l = Fn;
							break;
						case "focusout":
							u = "blur", l = Fn;
							break;
						case "beforeblur":
						case "afterblur":
							l = Fn;
							break;
						case "click": if (n.button === 2) break a;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							l = Nn;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							l = Pn;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							l = Kn;
							break;
						case Wr:
						case Gr:
						case Kr:
							l = In;
							break;
						case Xr:
							l = qn;
							break;
						case "scroll":
						case "scrollend":
							l = On;
							break;
						case "wheel":
							l = Jn;
							break;
						case "copy":
						case "cut":
						case "paste":
							l = Ln;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup":
							l = Gn;
							break;
						case "toggle":
						case "beforetoggle": l = Yn;
					}
					var d = !!(t & 4), f = !d && (e === "scroll" || e === "scrollend"), p = d ? c === null ? null : c + "Capture" : c;
					d = [];
					for (var m = r, h; m !== null;) {
						var g = m;
						if (h = g.stateNode, g = g.tag, g !== 5 && g !== 26 && g !== 27 || h === null || p === null || (g = mn(m, p), g != null && d.push(Td(m, g, h))), f) break;
						m = m.return;
					}
					0 < d.length && (c = new l(c, u, null, n, i), s.push({
						event: c,
						listeners: d
					}));
				}
			}
			if (!(t & 7)) {
				a: {
					if (c = e === "mouseover" || e === "pointerover", l = e === "mouseout" || e === "pointerout", c && n !== sn && (u = n.relatedTarget || n.fromElement) && (St(u) || u[ht])) break a;
					if ((l || c) && (c = i.window === i ? i : (c = i.ownerDocument) ? c.defaultView || c.parentWindow : window, l ? (u = n.relatedTarget || n.toElement, l = r, u = u ? St(u) : null, u !== null && (f = o(u), d = u.tag, u !== f || d !== 5 && d !== 27 && d !== 6) && (u = null)) : (l = null, u = r), l !== u)) {
						if (d = Nn, g = "onMouseLeave", p = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (d = Gn, g = "onPointerLeave", p = "onPointerEnter", m = "pointer"), f = l == null ? c : wt(l), h = u == null ? c : wt(u), c = new d(g, m + "leave", l, n, i), c.target = f, c.relatedTarget = h, g = null, St(i) === r && (d = new d(p, m + "enter", u, n, i), d.target = h, d.relatedTarget = f, g = d), f = g, l && u) b: {
							for (d = Dd, p = l, m = u, h = 0, g = p; g; g = d(g)) h++;
							g = 0;
							for (var _ = m; _; _ = d(_)) g++;
							for (; 0 < h - g;) p = d(p), h--;
							for (; 0 < g - h;) m = d(m), g--;
							for (; h--;) {
								if (p === m || m !== null && p === m.alternate) {
									d = p;
									break b;
								}
								p = d(p), m = d(m);
							}
							d = null;
						}
						else d = null;
						l !== null && Od(s, c, l, d, !1), u !== null && f !== null && Od(s, f, u, d, !0);
					}
				}
				a: {
					if (c = r ? wt(r) : window, l = c.nodeName && c.nodeName.toLowerCase(), l === "select" || l === "input" && c.type === "file") var v = hr;
					else if (lr(c)) {
						if (gr) v = Tr;
						else {
							v = Cr;
							var y = Sr;
						}
					} else l = c.nodeName, !l || l.toLowerCase() !== "input" || c.type !== "checkbox" && c.type !== "radio" ? r && tn(r.elementType) && (v = hr) : v = wr;
					if (v &&= v(e, r)) {
						ur(s, v, n, i);
						break a;
					}
					y && y(e, c, r), e === "focusout" && r && c.type === "number" && r.memoizedProps.value != null && Jt(c, "number", c.value);
				}
				switch (y = r ? wt(r) : window, e) {
					case "focusin":
						(lr(y) || y.contentEditable === "true") && (Fr = y, Ir = r, Lr = null);
						break;
					case "focusout":
						Lr = Ir = Fr = null;
						break;
					case "mousedown":
						Rr = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						Rr = !1, P(s, n, i);
						break;
					case "selectionchange": if (Pr) break;
					case "keydown":
					case "keyup": P(s, n, i);
				}
				var b;
				if (Zn) b: {
					switch (e) {
						case "compositionstart":
							var x = "onCompositionStart";
							break b;
						case "compositionend":
							x = "onCompositionEnd";
							break b;
						case "compositionupdate":
							x = "onCompositionUpdate";
							break b;
					}
					x = void 0;
				}
				else ar ? rr(e, n) && (x = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (x = "onCompositionStart");
				x && (er && n.locale !== "ko" && (ar || x !== "onCompositionStart" ? x === "onCompositionEnd" && ar && (b = xn()) : (vn = i, yn = "value" in vn ? vn.value : vn.textContent, ar = !0)), y = Ed(r, x), 0 < y.length && (x = new Rn(x, e, null, n, i), s.push({
					event: x,
					listeners: y
				}), b ? x.data = b : (b = ir(n), b !== null && (x.data = b)))), (b = $n ? or(e, n) : sr(e, n)) && (x = Ed(r, "onBeforeInput"), 0 < x.length && (y = new Rn("onBeforeInput", "beforeinput", null, n, i), s.push({
					event: y,
					listeners: x
				}), y.data = b)), md(s, e, r, n, i);
			}
			yd(s, t);
		});
	}
	function Td(e, t, n) {
		return {
			instance: e,
			listener: t,
			currentTarget: n
		};
	}
	function Ed(e, t) {
		for (var n = t + "Capture", r = []; e !== null;) {
			var i = e, a = i.stateNode;
			if (i = i.tag, i !== 5 && i !== 26 && i !== 27 || a === null || (i = mn(e, n), i != null && r.unshift(Td(e, i, a)), i = mn(e, t), i != null && r.push(Td(e, i, a))), e.tag === 3) return r;
			e = e.return;
		}
		return [];
	}
	function Dd(e) {
		if (e === null) return null;
		do
			e = e.return;
		while (e && e.tag !== 5 && e.tag !== 27);
		return e || null;
	}
	function Od(e, t, n, r, i) {
		for (var a = t._reactName, o = []; n !== null && n !== r;) {
			var s = n, c = s.alternate, l = s.stateNode;
			if (s = s.tag, c !== null && c === r) break;
			s !== 5 && s !== 26 && s !== 27 || l === null || (c = l, i ? (l = mn(n, a), l != null && o.unshift(Td(n, l, c))) : i || (l = mn(n, a), l != null && o.push(Td(n, l, c)))), n = n.return;
		}
		o.length !== 0 && e.push({
			event: t,
			listeners: o
		});
	}
	var kd = /\r\n?/g, Ad = /\u0000|\uFFFD/g;
	function jd(e) {
		return (typeof e == "string" ? e : "" + e).replace(kd, "\n").replace(Ad, "");
	}
	function Md(e, t) {
		return t = jd(t), jd(e) === t;
	}
	function $(e, t, n, r, a, o) {
		switch (n) {
			case "children":
				typeof r == "string" ? t === "body" || t === "textarea" && r === "" || Zt(e, r) : (typeof r == "number" || typeof r == "bigint") && t !== "body" && Zt(e, "" + r);
				break;
			case "className":
				It(e, "class", r);
				break;
			case "tabIndex":
				It(e, "tabindex", r);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				It(e, n, r);
				break;
			case "style":
				en(e, r, o);
				break;
			case "data": if (t !== "object") {
				It(e, "data", r);
				break;
			}
			case "src":
			case "href":
				if (r === "" && (t !== "a" || n !== "href")) {
					e.removeAttribute(n);
					break;
				}
				if (r == null || typeof r == "function" || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = an("" + r), e.setAttribute(n, r);
				break;
			case "action":
			case "formAction":
				if (typeof r == "function") {
					e.setAttribute(n, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
					break;
				}
				if (typeof o == "function" && (n === "formAction" ? (t !== "input" && $(e, t, "name", a.name, a, null), $(e, t, "formEncType", a.formEncType, a, null), $(e, t, "formMethod", a.formMethod, a, null), $(e, t, "formTarget", a.formTarget, a, null)) : ($(e, t, "encType", a.encType, a, null), $(e, t, "method", a.method, a, null), $(e, t, "target", a.target, a, null))), r == null || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = an("" + r), e.setAttribute(n, r);
				break;
			case "onClick":
				r != null && (e.onclick = on);
				break;
			case "onScroll":
				r != null && Q("scroll", e);
				break;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				break;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(i(61));
					if (n = r.__html, n != null) {
						if (a.children != null) throw Error(i(60));
						e.innerHTML = n;
					}
				}
				break;
			case "multiple":
				e.multiple = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "muted":
				e.muted = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "ref": break;
			case "autoFocus": break;
			case "xlinkHref":
				if (r == null || typeof r == "function" || typeof r == "boolean" || typeof r == "symbol") {
					e.removeAttribute("xlink:href");
					break;
				}
				n = an("" + r), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
				break;
			case "contentEditable":
			case "spellCheck":
			case "draggable":
			case "value":
			case "autoReverse":
			case "externalResourcesRequired":
			case "focusable":
			case "preserveAlpha":
				r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, "" + r) : e.removeAttribute(n);
				break;
			case "inert":
			case "allowFullScreen":
			case "async":
			case "autoPlay":
			case "controls":
			case "default":
			case "defer":
			case "disabled":
			case "disablePictureInPicture":
			case "disableRemotePlayback":
			case "formNoValidate":
			case "hidden":
			case "loop":
			case "noModule":
			case "noValidate":
			case "open":
			case "playsInline":
			case "readOnly":
			case "required":
			case "reversed":
			case "scoped":
			case "seamless":
			case "itemScope":
				r && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, "") : e.removeAttribute(n);
				break;
			case "capture":
			case "download":
				!0 === r ? e.setAttribute(n, "") : !1 !== r && r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "cols":
			case "rows":
			case "size":
			case "span":
				r != null && typeof r != "function" && typeof r != "symbol" && !isNaN(r) && 1 <= r ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "rowSpan":
			case "start":
				r == null || typeof r == "function" || typeof r == "symbol" || isNaN(r) ? e.removeAttribute(n) : e.setAttribute(n, r);
				break;
			case "popover":
				Q("beforetoggle", e), Q("toggle", e), Ft(e, "popover", r);
				break;
			case "xlinkActuate":
				Lt(e, "http://www.w3.org/1999/xlink", "xlink:actuate", r);
				break;
			case "xlinkArcrole":
				Lt(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", r);
				break;
			case "xlinkRole":
				Lt(e, "http://www.w3.org/1999/xlink", "xlink:role", r);
				break;
			case "xlinkShow":
				Lt(e, "http://www.w3.org/1999/xlink", "xlink:show", r);
				break;
			case "xlinkTitle":
				Lt(e, "http://www.w3.org/1999/xlink", "xlink:title", r);
				break;
			case "xlinkType":
				Lt(e, "http://www.w3.org/1999/xlink", "xlink:type", r);
				break;
			case "xmlBase":
				Lt(e, "http://www.w3.org/XML/1998/namespace", "xml:base", r);
				break;
			case "xmlLang":
				Lt(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", r);
				break;
			case "xmlSpace":
				Lt(e, "http://www.w3.org/XML/1998/namespace", "xml:space", r);
				break;
			case "is":
				Ft(e, "is", r);
				break;
			case "innerText":
			case "textContent": break;
			default: (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") && (n = nn.get(n) || n, Ft(e, n, r));
		}
	}
	function Nd(e, t, n, r, a, o) {
		switch (n) {
			case "style":
				en(e, r, o);
				break;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(i(61));
					if (n = r.__html, n != null) {
						if (a.children != null) throw Error(i(60));
						e.innerHTML = n;
					}
				}
				break;
			case "children":
				typeof r == "string" ? Zt(e, r) : (typeof r == "number" || typeof r == "bigint") && Zt(e, "" + r);
				break;
			case "onScroll":
				r != null && Q("scroll", e);
				break;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				break;
			case "onClick":
				r != null && (e.onclick = on);
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref": break;
			case "innerText":
			case "textContent": break;
			default: if (!Ot.hasOwnProperty(n)) a: {
				if (n[0] === "o" && n[1] === "n" && (a = n.endsWith("Capture"), t = n.slice(2, a ? n.length - 7 : void 0), o = e[mt] || null, o = o == null ? null : o[n], typeof o == "function" && e.removeEventListener(t, o, a), typeof r == "function")) {
					typeof o != "function" && o !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(t, r, a);
					break a;
				}
				n in e ? e[n] = r : !0 === r ? e.setAttribute(n, "") : Ft(e, n, r);
			}
		}
	}
	function Pd(e, t, n) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "img":
				Q("error", e), Q("load", e);
				var r = !1, a = !1, o;
				for (o in n) if (n.hasOwnProperty(o)) {
					var s = n[o];
					if (s != null) switch (o) {
						case "src":
							r = !0;
							break;
						case "srcSet":
							a = !0;
							break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(i(137, t));
						default: $(e, t, o, s, n, null);
					}
				}
				a && $(e, t, "srcSet", n.srcSet, n, null), r && $(e, t, "src", n.src, n, null);
				return;
			case "input":
				Q("invalid", e);
				var c = o = s = a = null, l = null, u = null;
				for (r in n) if (n.hasOwnProperty(r)) {
					var d = n[r];
					if (d != null) switch (r) {
						case "name":
							a = d;
							break;
						case "type":
							s = d;
							break;
						case "checked":
							l = d;
							break;
						case "defaultChecked":
							u = d;
							break;
						case "value":
							o = d;
							break;
						case "defaultValue":
							c = d;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (d != null) throw Error(i(137, t));
							break;
						default: $(e, t, r, d, n, null);
					}
				}
				qt(e, o, c, l, u, s, a, !1);
				return;
			case "select":
				for (a in Q("invalid", e), r = s = o = null, n) if (n.hasOwnProperty(a) && (c = n[a], c != null)) switch (a) {
					case "value":
						o = c;
						break;
					case "defaultValue":
						s = c;
						break;
					case "multiple": r = c;
					default: $(e, t, a, c, n, null);
				}
				t = o, n = s, e.multiple = !!r, t == null ? n != null && Yt(e, !!r, n, !0) : Yt(e, !!r, t, !1);
				return;
			case "textarea":
				for (s in Q("invalid", e), o = a = r = null, n) if (n.hasOwnProperty(s) && (c = n[s], c != null)) switch (s) {
					case "value":
						r = c;
						break;
					case "defaultValue":
						a = c;
						break;
					case "children":
						o = c;
						break;
					case "dangerouslySetInnerHTML":
						if (c != null) throw Error(i(91));
						break;
					default: $(e, t, s, c, n, null);
				}
				Xt(e, r, a, o);
				return;
			case "option":
				for (l in n) if (n.hasOwnProperty(l) && (r = n[l], r != null)) switch (l) {
					case "selected":
						e.selected = r && typeof r != "function" && typeof r != "symbol";
						break;
					default: $(e, t, l, r, n, null);
				}
				return;
			case "dialog":
				Q("beforetoggle", e), Q("toggle", e), Q("cancel", e), Q("close", e);
				break;
			case "iframe":
			case "object":
				Q("load", e);
				break;
			case "video":
			case "audio":
				for (r = 0; r < _d.length; r++) Q(_d[r], e);
				break;
			case "image":
				Q("error", e), Q("load", e);
				break;
			case "details":
				Q("toggle", e);
				break;
			case "embed":
			case "source":
			case "link": Q("error", e), Q("load", e);
			case "area":
			case "base":
			case "br":
			case "col":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "track":
			case "wbr":
			case "menuitem":
				for (u in n) if (n.hasOwnProperty(u) && (r = n[u], r != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(i(137, t));
					default: $(e, t, u, r, n, null);
				}
				return;
			default: if (tn(t)) {
				for (d in n) n.hasOwnProperty(d) && (r = n[d], r !== void 0 && Nd(e, t, d, r, n, void 0));
				return;
			}
		}
		for (c in n) n.hasOwnProperty(c) && (r = n[c], r != null && $(e, t, c, r, n, null));
	}
	function Fd(e, t, n, r) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "input":
				var a = null, o = null, s = null, c = null, l = null, u = null, d = null;
				for (m in n) {
					var f = n[m];
					if (n.hasOwnProperty(m) && f != null) switch (m) {
						case "checked": break;
						case "value": break;
						case "defaultValue": l = f;
						default: r.hasOwnProperty(m) || $(e, t, m, null, r, f);
					}
				}
				for (var p in r) {
					var m = r[p];
					if (f = n[p], r.hasOwnProperty(p) && (m != null || f != null)) switch (p) {
						case "type":
							o = m;
							break;
						case "name":
							a = m;
							break;
						case "checked":
							u = m;
							break;
						case "defaultChecked":
							d = m;
							break;
						case "value":
							s = m;
							break;
						case "defaultValue":
							c = m;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (m != null) throw Error(i(137, t));
							break;
						default: m !== f && $(e, t, p, m, r, f);
					}
				}
				Kt(e, s, c, l, u, d, o, a);
				return;
			case "select":
				for (o in m = s = c = p = null, n) if (l = n[o], n.hasOwnProperty(o) && l != null) switch (o) {
					case "value": break;
					case "multiple": m = l;
					default: r.hasOwnProperty(o) || $(e, t, o, null, r, l);
				}
				for (a in r) if (o = r[a], l = n[a], r.hasOwnProperty(a) && (o != null || l != null)) switch (a) {
					case "value":
						p = o;
						break;
					case "defaultValue":
						c = o;
						break;
					case "multiple": s = o;
					default: o !== l && $(e, t, a, o, r, l);
				}
				t = c, n = s, r = m, p == null ? !!r != !!n && (t == null ? Yt(e, !!n, n ? [] : "", !1) : Yt(e, !!n, t, !0)) : Yt(e, !!n, p, !1);
				return;
			case "textarea":
				for (c in m = p = null, n) if (a = n[c], n.hasOwnProperty(c) && a != null && !r.hasOwnProperty(c)) switch (c) {
					case "value": break;
					case "children": break;
					default: $(e, t, c, null, r, a);
				}
				for (s in r) if (a = r[s], o = n[s], r.hasOwnProperty(s) && (a != null || o != null)) switch (s) {
					case "value":
						p = a;
						break;
					case "defaultValue":
						m = a;
						break;
					case "children": break;
					case "dangerouslySetInnerHTML":
						if (a != null) throw Error(i(91));
						break;
					default: a !== o && $(e, t, s, a, r, o);
				}
				M(e, p, m);
				return;
			case "option":
				for (var h in n) if (p = n[h], n.hasOwnProperty(h) && p != null && !r.hasOwnProperty(h)) switch (h) {
					case "selected":
						e.selected = !1;
						break;
					default: $(e, t, h, null, r, p);
				}
				for (l in r) if (p = r[l], m = n[l], r.hasOwnProperty(l) && p !== m && (p != null || m != null)) switch (l) {
					case "selected":
						e.selected = p && typeof p != "function" && typeof p != "symbol";
						break;
					default: $(e, t, l, p, r, m);
				}
				return;
			case "img":
			case "link":
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
			case "menuitem":
				for (var g in n) p = n[g], n.hasOwnProperty(g) && p != null && !r.hasOwnProperty(g) && $(e, t, g, null, r, p);
				for (u in r) if (p = r[u], m = n[u], r.hasOwnProperty(u) && p !== m && (p != null || m != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML":
						if (p != null) throw Error(i(137, t));
						break;
					default: $(e, t, u, p, r, m);
				}
				return;
			default: if (tn(t)) {
				for (var _ in n) p = n[_], n.hasOwnProperty(_) && p !== void 0 && !r.hasOwnProperty(_) && Nd(e, t, _, void 0, r, p);
				for (d in r) p = r[d], m = n[d], !r.hasOwnProperty(d) || p === m || p === void 0 && m === void 0 || Nd(e, t, d, p, r, m);
				return;
			}
		}
		for (var v in n) p = n[v], n.hasOwnProperty(v) && p != null && !r.hasOwnProperty(v) && $(e, t, v, null, r, p);
		for (f in r) p = r[f], m = n[f], !r.hasOwnProperty(f) || p === m || p == null && m == null || $(e, t, f, p, r, m);
	}
	function Id(e) {
		switch (e) {
			case "css":
			case "script":
			case "font":
			case "img":
			case "image":
			case "input":
			case "link": return !0;
			default: return !1;
		}
	}
	function Ld() {
		if (typeof performance.getEntriesByType == "function") {
			for (var e = 0, t = 0, n = performance.getEntriesByType("resource"), r = 0; r < n.length; r++) {
				var i = n[r], a = i.transferSize, o = i.initiatorType, s = i.duration;
				if (a && s && Id(o)) {
					for (o = 0, s = i.responseEnd, r += 1; r < n.length; r++) {
						var c = n[r], l = c.startTime;
						if (l > s) break;
						var u = c.transferSize, d = c.initiatorType;
						u && Id(d) && (c = c.responseEnd, o += u * (c < s ? 1 : (s - l) / (c - l)));
					}
					if (--r, t += 8 * (a + o) / (i.duration / 1e3), e++, 10 < e) break;
				}
			}
			if (0 < e) return t / e / 1e6;
		}
		return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
	}
	var Rd = null, zd = null;
	function Bd(e) {
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	function Vd(e) {
		switch (e) {
			case "http://www.w3.org/2000/svg": return 1;
			case "http://www.w3.org/1998/Math/MathML": return 2;
			default: return 0;
		}
	}
	function Hd(e, t) {
		if (e === 0) switch (t) {
			case "svg": return 1;
			case "math": return 2;
			default: return 0;
		}
		return e === 1 && t === "foreignObject" ? 0 : e;
	}
	function Ud(e, t) {
		return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
	}
	var Wd = null;
	function Gd() {
		var e = window.event;
		return e && e.type === "popstate" ? e !== Wd && (Wd = e, !0) : (Wd = null, !1);
	}
	var Kd = typeof setTimeout == "function" ? setTimeout : void 0, qd = typeof clearTimeout == "function" ? clearTimeout : void 0, Jd = typeof Promise == "function" ? Promise : void 0, Yd = typeof queueMicrotask == "function" ? queueMicrotask : Jd === void 0 ? Kd : function(e) {
		return Jd.resolve(null).then(e).catch(Xd);
	};
	function Xd(e) {
		setTimeout(function() {
			throw e;
		});
	}
	function Zd(e) {
		return e === "head";
	}
	function Qd(e, t) {
		var n = t, r = 0;
		do {
			var i = n.nextSibling;
			if (e.removeChild(n), i && i.nodeType === 8) {
				if (n = i.data, n === "/$" || n === "/&") {
					if (r === 0) {
						e.removeChild(i), Np(t);
						return;
					}
					r--;
				} else if (n === "$" || n === "$?" || n === "$~" || n === "$!" || n === "&") r++;
				else if (n === "html") pf(e.ownerDocument.documentElement);
				else if (n === "head") {
					n = e.ownerDocument.head, pf(n);
					for (var a = n.firstChild; a;) {
						var o = a.nextSibling, s = a.nodeName;
						a[bt] || s === "SCRIPT" || s === "STYLE" || s === "LINK" && a.rel.toLowerCase() === "stylesheet" || n.removeChild(a), a = o;
					}
				} else n === "body" && pf(e.ownerDocument.body);
			}
			n = i;
		} while (n);
		Np(t);
	}
	function $d(e, t) {
		var n = e;
		e = 0;
		do {
			var r = n.nextSibling;
			if (n.nodeType === 1 ? t ? (n._stashedDisplay = n.style.display, n.style.display = "none") : (n.style.display = n._stashedDisplay || "", n.getAttribute("style") === "" && n.removeAttribute("style")) : n.nodeType === 3 && (t ? (n._stashedText = n.nodeValue, n.nodeValue = "") : n.nodeValue = n._stashedText || ""), r && r.nodeType === 8) {
				if (n = r.data, n === "/$") {
					if (e === 0) break;
					e--;
				} else n !== "$" && n !== "$?" && n !== "$~" && n !== "$!" || e++;
			}
			n = r;
		} while (n);
	}
	function ef(e) {
		var t = e.firstChild;
		for (t && t.nodeType === 10 && (t = t.nextSibling); t;) {
			var n = t;
			switch (t = t.nextSibling, n.nodeName) {
				case "HTML":
				case "HEAD":
				case "BODY":
					ef(n), xt(n);
					continue;
				case "SCRIPT":
				case "STYLE": continue;
				case "LINK": if (n.rel.toLowerCase() === "stylesheet") continue;
			}
			e.removeChild(n);
		}
	}
	function tf(e, t, n, r) {
		for (; e.nodeType === 1;) {
			var i = n;
			if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
				if (!r && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
			} else if (!r) {
				if (t === "input" && e.type === "hidden") {
					var a = i.name == null ? null : "" + i.name;
					if (i.type === "hidden" && e.getAttribute("name") === a) return e;
				} else return e;
			} else if (!e[bt]) switch (t) {
				case "meta":
					if (!e.hasAttribute("itemprop")) break;
					return e;
				case "link":
					if (a = e.getAttribute("rel"), a === "stylesheet" && e.hasAttribute("data-precedence") || a !== i.rel || e.getAttribute("href") !== (i.href == null || i.href === "" ? null : i.href) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin) || e.getAttribute("title") !== (i.title == null ? null : i.title)) break;
					return e;
				case "style":
					if (e.hasAttribute("data-precedence")) break;
					return e;
				case "script":
					if (a = e.getAttribute("src"), (a !== (i.src == null ? null : i.src) || e.getAttribute("type") !== (i.type == null ? null : i.type) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin)) && a && e.hasAttribute("async") && !e.hasAttribute("itemprop")) break;
					return e;
				default: return e;
			}
			if (e = cf(e.nextSibling), e === null) break;
		}
		return null;
	}
	function nf(e, t, n) {
		if (t === "") return null;
		for (; e.nodeType !== 3;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = cf(e.nextSibling), e === null)) return null;
		return e;
	}
	function rf(e, t) {
		for (; e.nodeType !== 8;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !t || (e = cf(e.nextSibling), e === null)) return null;
		return e;
	}
	function af(e) {
		return e.data === "$?" || e.data === "$~";
	}
	function of(e) {
		return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
	}
	function sf(e, t) {
		var n = e.ownerDocument;
		if (e.data === "$~") e._reactRetry = t;
		else if (e.data !== "$?" || n.readyState !== "loading") t();
		else {
			var r = function() {
				t(), n.removeEventListener("DOMContentLoaded", r);
			};
			n.addEventListener("DOMContentLoaded", r), e._reactRetry = r;
		}
	}
	function cf(e) {
		for (; e != null; e = e.nextSibling) {
			var t = e.nodeType;
			if (t === 1 || t === 3) break;
			if (t === 8) {
				if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F") break;
				if (t === "/$" || t === "/&") return null;
			}
		}
		return e;
	}
	var lf = null;
	function uf(e) {
		e = e.nextSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "/$" || n === "/&") {
					if (t === 0) return cf(e.nextSibling);
					t--;
				} else n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&" || t++;
			}
			e = e.nextSibling;
		}
		return null;
	}
	function df(e) {
		e = e.previousSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
					if (t === 0) return e;
					t--;
				} else n !== "/$" && n !== "/&" || t++;
			}
			e = e.previousSibling;
		}
		return null;
	}
	function ff(e, t, n) {
		switch (t = Bd(n), e) {
			case "html":
				if (e = t.documentElement, !e) throw Error(i(452));
				return e;
			case "head":
				if (e = t.head, !e) throw Error(i(453));
				return e;
			case "body":
				if (e = t.body, !e) throw Error(i(454));
				return e;
			default: throw Error(i(451));
		}
	}
	function pf(e) {
		for (var t = e.attributes; t.length;) e.removeAttributeNode(t[0]);
		xt(e);
	}
	var mf = /* @__PURE__ */ new Map(), hf = /* @__PURE__ */ new Set();
	function gf(e) {
		return typeof e.getRootNode == "function" ? e.getRootNode() : e.nodeType === 9 ? e : e.ownerDocument;
	}
	var _f = k.d;
	k.d = {
		f: vf,
		r: yf,
		D: Sf,
		C: Cf,
		L: wf,
		m: Tf,
		X: Df,
		S: Ef,
		M: Of
	};
	function vf() {
		var e = _f.f(), t = bu();
		return e || t;
	}
	function yf(e) {
		var t = Ct(e);
		t !== null && t.tag === 5 && t.type === "form" ? Es(t) : _f.r(e);
	}
	var bf = typeof document > "u" ? null : document;
	function xf(e, t, n) {
		var r = bf;
		if (r && typeof t == "string" && t) {
			var i = Gt(t);
			i = "link[rel=\"" + e + "\"][href=\"" + i + "\"]", typeof n == "string" && (i += "[crossorigin=\"" + n + "\"]"), hf.has(i) || (hf.add(i), e = {
				rel: e,
				crossOrigin: n,
				href: t
			}, r.querySelector(i) === null && (t = r.createElement("link"), Pd(t, "link", e), Et(t), r.head.appendChild(t)));
		}
	}
	function Sf(e) {
		_f.D(e), xf("dns-prefetch", e, null);
	}
	function Cf(e, t) {
		_f.C(e, t), xf("preconnect", e, t);
	}
	function wf(e, t, n) {
		_f.L(e, t, n);
		var r = bf;
		if (r && e && t) {
			var i = "link[rel=\"preload\"][as=\"" + Gt(t) + "\"]";
			t === "image" && n && n.imageSrcSet ? (i += "[imagesrcset=\"" + Gt(n.imageSrcSet) + "\"]", typeof n.imageSizes == "string" && (i += "[imagesizes=\"" + Gt(n.imageSizes) + "\"]")) : i += "[href=\"" + Gt(e) + "\"]";
			var a = i;
			switch (t) {
				case "style":
					a = Af(e);
					break;
				case "script": a = Pf(e);
			}
			mf.has(a) || (e = h({
				rel: "preload",
				href: t === "image" && n && n.imageSrcSet ? void 0 : e,
				as: t
			}, n), mf.set(a, e), r.querySelector(i) !== null || t === "style" && r.querySelector(jf(a)) || t === "script" && r.querySelector(Ff(a)) || (t = r.createElement("link"), Pd(t, "link", e), Et(t), r.head.appendChild(t)));
		}
	}
	function Tf(e, t) {
		_f.m(e, t);
		var n = bf;
		if (n && e) {
			var r = t && typeof t.as == "string" ? t.as : "script", i = "link[rel=\"modulepreload\"][as=\"" + Gt(r) + "\"][href=\"" + Gt(e) + "\"]", a = i;
			switch (r) {
				case "audioworklet":
				case "paintworklet":
				case "serviceworker":
				case "sharedworker":
				case "worker":
				case "script": a = Pf(e);
			}
			if (!mf.has(a) && (e = h({
				rel: "modulepreload",
				href: e
			}, t), mf.set(a, e), n.querySelector(i) === null)) {
				switch (r) {
					case "audioworklet":
					case "paintworklet":
					case "serviceworker":
					case "sharedworker":
					case "worker":
					case "script": if (n.querySelector(Ff(a))) return;
				}
				r = n.createElement("link"), Pd(r, "link", e), Et(r), n.head.appendChild(r);
			}
		}
	}
	function Ef(e, t, n) {
		_f.S(e, t, n);
		var r = bf;
		if (r && e) {
			var i = Tt(r).hoistableStyles, a = Af(e);
			t ||= "default";
			var o = i.get(a);
			if (!o) {
				var s = {
					loading: 0,
					preload: null
				};
				if (o = r.querySelector(jf(a))) s.loading = 5;
				else {
					e = h({
						rel: "stylesheet",
						href: e,
						"data-precedence": t
					}, n), (n = mf.get(a)) && Rf(e, n);
					var c = o = r.createElement("link");
					Et(c), Pd(c, "link", e), c._p = new Promise(function(e, t) {
						c.onload = e, c.onerror = t;
					}), c.addEventListener("load", function() {
						s.loading |= 1;
					}), c.addEventListener("error", function() {
						s.loading |= 2;
					}), s.loading |= 4, Lf(o, t, r);
				}
				o = {
					type: "stylesheet",
					instance: o,
					count: 1,
					state: s
				}, i.set(a, o);
			}
		}
	}
	function Df(e, t) {
		_f.X(e, t);
		var n = bf;
		if (n && e) {
			var r = Tt(n).hoistableScripts, i = Pf(e), a = r.get(i);
			a || (a = n.querySelector(Ff(i)), a || (e = h({
				src: e,
				async: !0
			}, t), (t = mf.get(i)) && zf(e, t), a = n.createElement("script"), Et(a), Pd(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Of(e, t) {
		_f.M(e, t);
		var n = bf;
		if (n && e) {
			var r = Tt(n).hoistableScripts, i = Pf(e), a = r.get(i);
			a || (a = n.querySelector(Ff(i)), a || (e = h({
				src: e,
				async: !0,
				type: "module"
			}, t), (t = mf.get(i)) && zf(e, t), a = n.createElement("script"), Et(a), Pd(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function kf(e, t, n, r) {
		var a = (a = he.current) ? gf(a) : null;
		if (!a) throw Error(i(446));
		switch (e) {
			case "meta":
			case "title": return null;
			case "style": return typeof n.precedence == "string" && typeof n.href == "string" ? (t = Af(n.href), n = Tt(a).hoistableStyles, r = n.get(t), r || (r = {
				type: "style",
				instance: null,
				count: 0,
				state: null
			}, n.set(t, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			case "link":
				if (n.rel === "stylesheet" && typeof n.href == "string" && typeof n.precedence == "string") {
					e = Af(n.href);
					var o = Tt(a).hoistableStyles, s = o.get(e);
					if (s || (a = a.ownerDocument || a, s = {
						type: "stylesheet",
						instance: null,
						count: 0,
						state: {
							loading: 0,
							preload: null
						}
					}, o.set(e, s), (o = a.querySelector(jf(e))) && !o._p && (s.instance = o, s.state.loading = 5), mf.has(e) || (n = {
						rel: "preload",
						as: "style",
						href: n.href,
						crossOrigin: n.crossOrigin,
						integrity: n.integrity,
						media: n.media,
						hrefLang: n.hrefLang,
						referrerPolicy: n.referrerPolicy
					}, mf.set(e, n), o || Nf(a, e, n, s.state))), t && r === null) throw Error(i(528, ""));
					return s;
				}
				if (t && r !== null) throw Error(i(529, ""));
				return null;
			case "script": return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = Pf(n), n = Tt(a).hoistableScripts, r = n.get(t), r || (r = {
				type: "script",
				instance: null,
				count: 0,
				state: null
			}, n.set(t, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			default: throw Error(i(444, e));
		}
	}
	function Af(e) {
		return "href=\"" + Gt(e) + "\"";
	}
	function jf(e) {
		return "link[rel=\"stylesheet\"][" + e + "]";
	}
	function Mf(e) {
		return h({}, e, {
			"data-precedence": e.precedence,
			precedence: null
		});
	}
	function Nf(e, t, n, r) {
		e.querySelector("link[rel=\"preload\"][as=\"style\"][" + t + "]") ? r.loading = 1 : (t = e.createElement("link"), r.preload = t, t.addEventListener("load", function() {
			return r.loading |= 1;
		}), t.addEventListener("error", function() {
			return r.loading |= 2;
		}), Pd(t, "link", n), Et(t), e.head.appendChild(t));
	}
	function Pf(e) {
		return "[src=\"" + Gt(e) + "\"]";
	}
	function Ff(e) {
		return "script[async]" + e;
	}
	function If(e, t, n) {
		if (t.count++, t.instance === null) switch (t.type) {
			case "style":
				var r = e.querySelector("style[data-href~=\"" + Gt(n.href) + "\"]");
				if (r) return t.instance = r, Et(r), r;
				var a = h({}, n, {
					"data-href": n.href,
					"data-precedence": n.precedence,
					href: null,
					precedence: null
				});
				return r = (e.ownerDocument || e).createElement("style"), Et(r), Pd(r, "style", a), Lf(r, n.precedence, e), t.instance = r;
			case "stylesheet":
				a = Af(n.href);
				var o = e.querySelector(jf(a));
				if (o) return t.state.loading |= 4, t.instance = o, Et(o), o;
				r = Mf(n), (a = mf.get(a)) && Rf(r, a), o = (e.ownerDocument || e).createElement("link"), Et(o);
				var s = o;
				return s._p = new Promise(function(e, t) {
					s.onload = e, s.onerror = t;
				}), Pd(o, "link", r), t.state.loading |= 4, Lf(o, n.precedence, e), t.instance = o;
			case "script": return o = Pf(n.src), (a = e.querySelector(Ff(o))) ? (t.instance = a, Et(a), a) : (r = n, (a = mf.get(o)) && (r = h({}, n), zf(r, a)), e = e.ownerDocument || e, a = e.createElement("script"), Et(a), Pd(a, "link", r), e.head.appendChild(a), t.instance = a);
			case "void": return null;
			default: throw Error(i(443, t.type));
		}
		else t.type === "stylesheet" && !(t.state.loading & 4) && (r = t.instance, t.state.loading |= 4, Lf(r, n.precedence, e));
		return t.instance;
	}
	function Lf(e, t, n) {
		for (var r = n.querySelectorAll("link[rel=\"stylesheet\"][data-precedence],style[data-precedence]"), i = r.length ? r[r.length - 1] : null, a = i, o = 0; o < r.length; o++) {
			var s = r[o];
			if (s.dataset.precedence === t) a = s;
			else if (a !== i) break;
		}
		a ? a.parentNode.insertBefore(e, a.nextSibling) : (t = n.nodeType === 9 ? n.head : n, t.insertBefore(e, t.firstChild));
	}
	function Rf(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.title ??= t.title;
	}
	function zf(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.integrity ??= t.integrity;
	}
	var Bf = null;
	function Vf(e, t, n) {
		if (Bf === null) {
			var r = /* @__PURE__ */ new Map(), i = Bf = /* @__PURE__ */ new Map();
			i.set(n, r);
		} else i = Bf, r = i.get(n), r || (r = /* @__PURE__ */ new Map(), i.set(n, r));
		if (r.has(e)) return r;
		for (r.set(e, null), n = n.getElementsByTagName(e), i = 0; i < n.length; i++) {
			var a = n[i];
			if (!(a[bt] || a[pt] || e === "link" && a.getAttribute("rel") === "stylesheet") && a.namespaceURI !== "http://www.w3.org/2000/svg") {
				var o = a.getAttribute(t) || "";
				o = e + o;
				var s = r.get(o);
				s ? s.push(a) : r.set(o, [a]);
			}
		}
		return r;
	}
	function Hf(e, t, n) {
		e = e.ownerDocument || e, e.head.insertBefore(n, t === "title" ? e.querySelector("head > title") : null);
	}
	function Uf(e, t, n) {
		if (n === 1 || t.itemProp != null) return !1;
		switch (e) {
			case "meta":
			case "title": return !0;
			case "style":
				if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "") break;
				return !0;
			case "link":
				if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError) break;
				switch (t.rel) {
					case "stylesheet": return e = t.disabled, typeof t.precedence == "string" && e == null;
					default: return !0;
				}
			case "script": if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string") return !0;
		}
		return !1;
	}
	function Wf(e) {
		return !(e.type === "stylesheet" && !(e.state.loading & 3));
	}
	function Gf(e, t, n, r) {
		if (n.type === "stylesheet" && (typeof r.media != "string" || !1 !== matchMedia(r.media).matches) && !(n.state.loading & 4)) {
			if (n.instance === null) {
				var i = Af(r.href), a = t.querySelector(jf(i));
				if (a) {
					t = a._p, typeof t == "object" && t && typeof t.then == "function" && (e.count++, e = Jf.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = a, Et(a);
					return;
				}
				a = t.ownerDocument || t, r = Mf(r), (i = mf.get(i)) && Rf(r, i), a = a.createElement("link"), Et(a);
				var o = a;
				o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), Pd(a, "link", r), n.instance = a;
			}
			e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(n, t), (t = n.state.preload) && !(n.state.loading & 3) && (e.count++, n = Jf.bind(e), t.addEventListener("load", n), t.addEventListener("error", n));
		}
	}
	var Kf = 0;
	function qf(e, t) {
		return e.stylesheets && e.count === 0 && Xf(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(n) {
			var r = setTimeout(function() {
				if (e.stylesheets && Xf(e, e.stylesheets), e.unsuspend) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, 6e4 + t);
			0 < e.imgBytes && Kf === 0 && (Kf = 62500 * Ld());
			var i = setTimeout(function() {
				if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && Xf(e, e.stylesheets), e.unsuspend)) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, (e.imgBytes > Kf ? 50 : 800) + t);
			return e.unsuspend = n, function() {
				e.unsuspend = null, clearTimeout(r), clearTimeout(i);
			};
		} : null;
	}
	function Jf() {
		if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
			if (this.stylesheets) Xf(this, this.stylesheets);
			else if (this.unsuspend) {
				var e = this.unsuspend;
				this.unsuspend = null, e();
			}
		}
	}
	var Yf = null;
	function Xf(e, t) {
		e.stylesheets = null, e.unsuspend !== null && (e.count++, Yf = /* @__PURE__ */ new Map(), t.forEach(Zf, e), Yf = null, Jf.call(e));
	}
	function Zf(e, t) {
		if (!(t.state.loading & 4)) {
			var n = Yf.get(e);
			if (n) var r = n.get(null);
			else {
				n = /* @__PURE__ */ new Map(), Yf.set(e, n);
				for (var i = e.querySelectorAll("link[data-precedence],style[data-precedence]"), a = 0; a < i.length; a++) {
					var o = i[a];
					(o.nodeName === "LINK" || o.getAttribute("media") !== "not all") && (n.set(o.dataset.precedence, o), r = o);
				}
				r && n.set(null, r);
			}
			i = t.instance, o = i.getAttribute("data-precedence"), a = n.get(o) || r, a === r && n.set(null, i), n.set(o, i), this.count++, r = Jf.bind(this), i.addEventListener("load", r), i.addEventListener("error", r), a ? a.parentNode.insertBefore(i, a.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(i, e.firstChild)), t.state.loading |= 4;
		}
	}
	var Qf = {
		$$typeof: C,
		Provider: null,
		Consumer: null,
		_currentValue: ce,
		_currentValue2: ce,
		_threadCount: 0
	};
	function $f(e, t, n, r, i, a, o, s, c) {
		this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = nt(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = nt(0), this.hiddenUpdates = nt(null), this.identifierPrefix = r, this.onUncaughtError = i, this.onCaughtError = a, this.onRecoverableError = o, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.incompleteTransitions = /* @__PURE__ */ new Map();
	}
	function ep(e, t, n, r, i, a, o, s, c, l, u, d) {
		return e = new $f(e, t, n, o, c, l, u, d, s), t = 1, !0 === a && (t |= 24), a = di(3, null, null, t), e.current = a, a.stateNode = e, t = la(), t.refCount++, e.pooledCache = t, t.refCount++, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: t
		}, Ba(a), e;
	}
	function tp(e) {
		return e ? (e = li, e) : li;
	}
	function np(e, t, n, r, i, a) {
		i = tp(i), r.context === null ? r.context = i : r.pendingContext = i, r = Ha(t), r.payload = { element: n }, a = a === void 0 ? null : a, a !== null && (r.callback = a), n = Ua(e, r, t), n !== null && (hu(n, e, t), Wa(n, e, t));
	}
	function rp(e, t) {
		if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
			var n = e.retryLane;
			e.retryLane = n !== 0 && n < t ? n : t;
		}
	}
	function ip(e, t) {
		rp(e, t), (e = e.alternate) && rp(e, t);
	}
	function ap(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = oi(e, 67108864);
			t !== null && hu(t, e, 67108864), ip(e, 67108864);
		}
	}
	function op(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = pu();
			t = ct(t);
			var n = oi(e, t);
			n !== null && hu(n, e, t), ip(e, t);
		}
	}
	var sp = !0;
	function cp(e, t, n, r) {
		var i = O.T;
		O.T = null;
		var a = k.p;
		try {
			k.p = 2, up(e, t, n, r);
		} finally {
			k.p = a, O.T = i;
		}
	}
	function lp(e, t, n, r) {
		var i = O.T;
		O.T = null;
		var a = k.p;
		try {
			k.p = 8, up(e, t, n, r);
		} finally {
			k.p = a, O.T = i;
		}
	}
	function up(e, t, n, r) {
		if (sp) {
			var i = dp(r);
			if (i === null) wd(e, t, r, fp, n), Cp(e, r);
			else if (Tp(i, e, t, n, r)) r.stopPropagation();
			else if (Cp(e, r), t & 4 && -1 < Sp.indexOf(e)) {
				for (; i !== null;) {
					var a = Ct(i);
					if (a !== null) switch (a.tag) {
						case 3:
							if (a = a.stateNode, a.current.memoizedState.isDehydrated) {
								var o = Ze(a.pendingLanes);
								if (o !== 0) {
									var s = a;
									for (s.pendingLanes |= 2, s.entangledLanes |= 2; o;) {
										var c = 1 << 31 - We(o);
										s.entanglements[1] |= c, o &= ~c;
									}
									rd(a), !(K & 6) && (tu = Me() + 500, id(0, !1));
								}
							}
							break;
						case 31:
						case 13: s = oi(a, 2), s !== null && hu(s, a, 2), bu(), ip(a, 2);
					}
					if (a = dp(r), a === null && wd(e, t, r, fp, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else wd(e, t, r, null, n);
		}
	}
	function dp(e) {
		return e = cn(e), pp(e);
	}
	var fp = null;
	function pp(e) {
		if (fp = null, e = St(e), e !== null) {
			var t = o(e);
			if (t === null) e = null;
			else {
				var n = t.tag;
				if (n === 13) {
					if (e = s(t), e !== null) return e;
					e = null;
				} else if (n === 31) {
					if (e = c(t), e !== null) return e;
					e = null;
				} else if (n === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
					e = null;
				} else t !== e && (e = null);
			}
		}
		return fp = e, null;
	}
	function mp(e) {
		switch (e) {
			case "beforetoggle":
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "resize":
			case "seeked":
			case "submit":
			case "toggle":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart": return 2;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "scroll":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave": return 8;
			case "message": switch (Ne()) {
				case Pe: return 2;
				case Fe: return 8;
				case Ie:
				case Le: return 32;
				case Re: return 268435456;
				default: return 32;
			}
			default: return 32;
		}
	}
	var hp = !1, gp = null, _p = null, vp = null, yp = /* @__PURE__ */ new Map(), bp = /* @__PURE__ */ new Map(), xp = [], Sp = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");
	function Cp(e, t) {
		switch (e) {
			case "focusin":
			case "focusout":
				gp = null;
				break;
			case "dragenter":
			case "dragleave":
				_p = null;
				break;
			case "mouseover":
			case "mouseout":
				vp = null;
				break;
			case "pointerover":
			case "pointerout":
				yp.delete(t.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture": bp.delete(t.pointerId);
		}
	}
	function wp(e, t, n, r, i, a) {
		return e === null || e.nativeEvent !== a ? (e = {
			blockedOn: t,
			domEventName: n,
			eventSystemFlags: r,
			nativeEvent: a,
			targetContainers: [i]
		}, t !== null && (t = Ct(t), t !== null && ap(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
	}
	function Tp(e, t, n, r, i) {
		switch (t) {
			case "focusin": return gp = wp(gp, e, t, n, r, i), !0;
			case "dragenter": return _p = wp(_p, e, t, n, r, i), !0;
			case "mouseover": return vp = wp(vp, e, t, n, r, i), !0;
			case "pointerover":
				var a = i.pointerId;
				return yp.set(a, wp(yp.get(a) || null, e, t, n, r, i)), !0;
			case "gotpointercapture": return a = i.pointerId, bp.set(a, wp(bp.get(a) || null, e, t, n, r, i)), !0;
		}
		return !1;
	}
	function Ep(e) {
		var t = St(e.target);
		if (t !== null) {
			var n = o(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = s(n), t !== null) {
						e.blockedOn = t, dt(e.priority, function() {
							op(n);
						});
						return;
					}
				} else if (t === 31) {
					if (t = c(n), t !== null) {
						e.blockedOn = t, dt(e.priority, function() {
							op(n);
						});
						return;
					}
				} else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
					e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
					return;
				}
			}
		}
		e.blockedOn = null;
	}
	function Dp(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length;) {
			var n = dp(e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var r = new n.constructor(n.type, n);
				sn = r, n.target.dispatchEvent(r), sn = null;
			} else return t = Ct(n), t !== null && ap(t), e.blockedOn = n, !1;
			t.shift();
		}
		return !0;
	}
	function Op(e, t, n) {
		Dp(e) && n.delete(t);
	}
	function kp() {
		hp = !1, gp !== null && Dp(gp) && (gp = null), _p !== null && Dp(_p) && (_p = null), vp !== null && Dp(vp) && (vp = null), yp.forEach(Op), bp.forEach(Op);
	}
	function Ap(e, n) {
		e.blockedOn === n && (e.blockedOn = null, hp || (hp = !0, t.unstable_scheduleCallback(t.unstable_NormalPriority, kp)));
	}
	var jp = null;
	function Mp(e) {
		jp !== e && (jp = e, t.unstable_scheduleCallback(t.unstable_NormalPriority, function() {
			jp === e && (jp = null);
			for (var t = 0; t < e.length; t += 3) {
				var n = e[t], r = e[t + 1], i = e[t + 2];
				if (typeof r != "function") {
					if (pp(r || n) === null) continue;
					break;
				}
				var a = Ct(n);
				a !== null && (e.splice(t, 3), t -= 3, ws(a, {
					pending: !0,
					data: i,
					method: n.method,
					action: r
				}, r, i));
			}
		}));
	}
	function Np(e) {
		function t(t) {
			return Ap(t, e);
		}
		gp !== null && Ap(gp, e), _p !== null && Ap(_p, e), vp !== null && Ap(vp, e), yp.forEach(t), bp.forEach(t);
		for (var n = 0; n < xp.length; n++) {
			var r = xp[n];
			r.blockedOn === e && (r.blockedOn = null);
		}
		for (; 0 < xp.length && (n = xp[0], n.blockedOn === null);) Ep(n), n.blockedOn === null && xp.shift();
		if (n = (e.ownerDocument || e).$$reactFormReplay, n != null) for (r = 0; r < n.length; r += 3) {
			var i = n[r], a = n[r + 1], o = i[mt] || null;
			if (typeof a == "function") o || Mp(n);
			else if (o) {
				var s = null;
				if (a && a.hasAttribute("formAction")) {
					if (i = a, o = a[mt] || null) s = o.formAction;
					else if (pp(i) !== null) continue;
				} else s = o.action;
				typeof s == "function" ? n[r + 1] = s : (n.splice(r, 3), r -= 3), Mp(n);
			}
		}
	}
	function Pp() {
		function e(e) {
			e.canIntercept && e.info === "react-transition" && e.intercept({
				handler: function() {
					return new Promise(function(e) {
						return i = e;
					});
				},
				focusReset: "manual",
				scroll: "manual"
			});
		}
		function t() {
			i !== null && (i(), i = null), r || setTimeout(n, 20);
		}
		function n() {
			if (!r && !navigation.transition) {
				var e = navigation.currentEntry;
				e && e.url != null && navigation.navigate(e.url, {
					state: e.getState(),
					info: "react-transition",
					history: "replace"
				});
			}
		}
		if (typeof navigation == "object") {
			var r = !1, i = null;
			return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(n, 100), function() {
				r = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), i !== null && (i(), i = null);
			};
		}
	}
	function Fp(e) {
		this._internalRoot = e;
	}
	Ip.prototype.render = Fp.prototype.render = function(e) {
		var t = this._internalRoot;
		if (t === null) throw Error(i(409));
		var n = t.current;
		np(n, pu(), e, t, null, null);
	}, Ip.prototype.unmount = Fp.prototype.unmount = function() {
		var e = this._internalRoot;
		if (e !== null) {
			this._internalRoot = null;
			var t = e.containerInfo;
			np(e.current, 2, null, e, null, null), bu(), t[ht] = null;
		}
	};
	function Ip(e) {
		this._internalRoot = e;
	}
	Ip.prototype.unstable_scheduleHydration = function(e) {
		if (e) {
			var t = ut();
			e = {
				blockedOn: null,
				target: e,
				priority: t
			};
			for (var n = 0; n < xp.length && t !== 0 && t < xp[n].priority; n++);
			xp.splice(n, 0, e), n === 0 && Ep(e);
		}
	};
	var Lp = n.version;
	if (Lp !== "19.2.8") throw Error(i(527, Lp, "19.2.8"));
	k.findDOMNode = function(e) {
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(i(188)) : (e = Object.keys(e).join(","), Error(i(268, e)));
		return e = d(t), e = e === null ? null : p(e), e = e === null ? null : e.stateNode, e;
	};
	var Rp = {
		bundleType: 0,
		version: "19.2.8",
		rendererPackageName: "react-dom",
		currentDispatcherRef: O,
		reconcilerVersion: "19.2.8"
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var zp = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!zp.isDisabled && zp.supportsFiber) try {
			Ve = zp.inject(Rp), He = zp;
		} catch {}
	}
	e.createRoot = function(e, t) {
		if (!a(e)) throw Error(i(299));
		var n = !1, r = "", o = qs, s = Js, c = Ys;
		return t != null && (!0 === t.unstable_strictMode && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onUncaughtError !== void 0 && (o = t.onUncaughtError), t.onCaughtError !== void 0 && (s = t.onCaughtError), t.onRecoverableError !== void 0 && (c = t.onRecoverableError)), t = ep(e, 1, !1, null, null, n, r, null, o, s, c, Pp), e[ht] = t.current, Sd(e), new Fp(t);
	};
})), g = /* @__PURE__ */ o(((e, t) => {
	function n() {
		if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = h();
})), _ = /* @__PURE__ */ c(u(), 1), v = g(), y = /* @__PURE__ */ o(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.fragment");
	function r(e, n, r) {
		var i = null;
		if (r !== void 0 && (i = "" + r), n.key !== void 0 && (i = "" + n.key), "key" in n) for (var a in r = {}, n) a !== "key" && (r[a] = n[a]);
		else r = n;
		return n = r.ref, {
			$$typeof: t,
			type: e,
			key: i,
			ref: n === void 0 ? null : n,
			props: r
		};
	}
	e.Fragment = n, e.jsx = r, e.jsxs = r;
})), b = (/* @__PURE__ */ o(((e, t) => {
	t.exports = y();
})))();
function x({ children: e, ...t }) {
	return /* @__PURE__ */ (0, b.jsx)("span", {
		className: "visually-hidden",
		...t,
		children: e
	});
}
var S = {
	root: "_root_bmomu_1",
	neutral: "_neutral_bmomu_10",
	success: "_success_bmomu_11",
	warning: "_warning_bmomu_12",
	danger: "_danger_bmomu_13",
	info: "_info_bmomu_14"
};
//#endregion
//#region src/shared/ui/Badge/Badge.tsx
function C({ children: e, className: t, tone: n = "neutral", ...r }) {
	return /* @__PURE__ */ (0, b.jsx)("span", {
		className: [
			S.root,
			S[n],
			t
		].filter(Boolean).join(" "),
		...r,
		children: e
	});
}
var w = {
	root: "_root_1dybh_1",
	primary: "_primary_1dybh_28",
	secondary: "_secondary_1dybh_33",
	ghost: "_ghost_1dybh_39",
	danger: "_danger_1dybh_44",
	small: "_small_1dybh_49",
	medium: "_medium_1dybh_55",
	large: "_large_1dybh_61",
	icon: "_icon_1dybh_67"
};
//#endregion
//#region src/shared/ui/Button/Button.tsx
function T({ children: e, className: t, disabled: n, leadingIcon: r, loading: i = !1, loadingLabel: a, size: o = "medium", trailingIcon: s, type: c = "button", variant: l = "primary", ...u }) {
	let d = [
		w.root,
		w[l],
		w[o],
		t
	].filter(Boolean).join(" ");
	return /* @__PURE__ */ (0, b.jsxs)("button", {
		className: d,
		disabled: n || i,
		type: c,
		"aria-busy": i || void 0,
		...u,
		children: [
			r ? /* @__PURE__ */ (0, b.jsx)("span", {
				className: w.icon,
				children: r
			}) : null,
			/* @__PURE__ */ (0, b.jsx)("span", { children: i && a ? a : e }),
			s ? /* @__PURE__ */ (0, b.jsx)("span", {
				className: w.icon,
				children: s
			}) : null
		]
	});
}
var E = {
	root: "_root_eq2ep_1",
	elevated: "_elevated_eq2ep_7",
	none: "_none_eq2ep_8",
	small: "_small_eq2ep_9",
	medium: "_medium_eq2ep_10",
	large: "_large_eq2ep_11"
};
//#endregion
//#region src/shared/ui/Card/Card.tsx
function ee({ as: e = "article", children: t, className: n, elevated: r = !1, padding: i = "medium", ...a }) {
	return /* @__PURE__ */ (0, b.jsx)(e, {
		className: [
			E.root,
			E[i],
			r ? E.elevated : void 0,
			n
		].filter(Boolean).join(" "),
		...a,
		children: t
	});
}
//#endregion
//#region src/shared/ui/overlays/useModalOverlay.ts
var D = m(), te = [
	"a[href]",
	"area[href]",
	"button:not([disabled])",
	"input:not([disabled]):not([type='hidden'])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"iframe",
	"object",
	"embed",
	"[contenteditable='true']",
	"[tabindex]:not([tabindex='-1'])"
].join(",");
function ne(e) {
	return Array.from(e.querySelectorAll(te)).filter((e) => e.getAttribute("aria-hidden") !== "true");
}
function re({ open: e, onOpenChange: t, panelRef: n, initialFocusRef: r }) {
	let i = (0, _.useRef)(null), a = (0, _.useRef)(t);
	(0, _.useEffect)(() => {
		a.current = t;
	}, [t]), (0, _.useEffect)(() => {
		if (!e) return;
		i.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		let t = n.current;
		(r?.current ?? (t ? ne(t)[0] : null) ?? t)?.focus();
		let o = (e) => {
			if (e.key === "Escape") {
				e.preventDefault(), a.current(!1);
				return;
			}
			if (e.key !== "Tab" || !n.current) return;
			let t = ne(n.current);
			if (t.length === 0) {
				e.preventDefault(), n.current.focus();
				return;
			}
			let r = t[0], i = t[t.length - 1], o = document.activeElement;
			e.shiftKey && (o === r || !n.current.contains(o)) ? (e.preventDefault(), i.focus()) : !e.shiftKey && (o === i || !n.current.contains(o)) && (e.preventDefault(), r.focus());
		};
		return document.addEventListener("keydown", o), () => {
			document.removeEventListener("keydown", o);
			let e = i.current;
			e?.isConnected && e.focus();
		};
	}, [
		r,
		e,
		n
	]);
}
var ie = {
	backdrop: "_backdrop_njzlr_1",
	panel: "_panel_njzlr_11",
	title: "_title_njzlr_28",
	description: "_description_njzlr_34",
	content: "_content_njzlr_40",
	"backdrop-in": "_backdrop-in_njzlr_1",
	"panel-in": "_panel-in_njzlr_1"
};
//#endregion
//#region src/shared/ui/Dialog/Dialog.tsx
function ae({ open: e, onOpenChange: t, title: n, description: r, children: i, initialFocusRef: a, closeOnBackdrop: o = !0, className: s }) {
	let c = (0, _.useRef)(null), l = (0, _.useId)(), u = (0, _.useId)();
	return re({
		open: e,
		onOpenChange: t,
		panelRef: c,
		initialFocusRef: a
	}), !e || typeof document > "u" ? null : (0, D.createPortal)(/* @__PURE__ */ (0, b.jsx)("div", {
		className: ie.backdrop,
		onMouseDown: (e) => {
			o && e.target === e.currentTarget && t(!1);
		},
		children: /* @__PURE__ */ (0, b.jsxs)("div", {
			"aria-describedby": r === void 0 ? void 0 : u,
			"aria-labelledby": l,
			"aria-modal": "true",
			className: [ie.panel, s].filter(Boolean).join(" "),
			ref: c,
			role: "dialog",
			tabIndex: -1,
			children: [
				/* @__PURE__ */ (0, b.jsx)("h2", {
					className: ie.title,
					id: l,
					children: n
				}),
				r === void 0 ? null : /* @__PURE__ */ (0, b.jsx)("p", {
					className: ie.description,
					id: u,
					children: r
				}),
				/* @__PURE__ */ (0, b.jsx)("div", {
					className: ie.content,
					children: i
				})
			]
		})
	}), document.body);
}
var oe = {
	actions: "_actions_9xekt_1",
	button: "_button_9xekt_7",
	confirm: "_confirm_9xekt_30"
};
//#endregion
//#region src/shared/ui/ConfirmAction/ConfirmAction.tsx
function se({ open: e, onOpenChange: t, onConfirm: n, title: r, description: i, confirmLabel: a, cancelLabel: o, confirmDisabled: s = !1 }) {
	let c = (0, _.useRef)(null);
	return /* @__PURE__ */ (0, b.jsx)(ae, {
		description: i,
		initialFocusRef: c,
		onOpenChange: t,
		open: e,
		title: r,
		children: /* @__PURE__ */ (0, b.jsxs)("div", {
			className: oe.actions,
			children: [/* @__PURE__ */ (0, b.jsx)("button", {
				className: oe.button,
				onClick: () => t(!1),
				ref: c,
				type: "button",
				children: o
			}), /* @__PURE__ */ (0, b.jsx)("button", {
				className: `${oe.button} ${oe.confirm}`,
				disabled: s,
				onClick: n,
				type: "button",
				children: a
			})]
		})
	});
}
var O = {
	backdrop: "_backdrop_anwg7_1",
	start: "_start_anwg7_9",
	end: "_end_anwg7_12",
	panel: "_panel_anwg7_16",
	title: "_title_anwg7_37",
	description: "_description_anwg7_43",
	content: "_content_anwg7_49",
	"fade-in": "_fade-in_anwg7_1",
	"enter-end": "_enter-end_anwg7_1",
	"enter-start": "_enter-start_anwg7_1"
};
//#endregion
//#region src/shared/ui/Drawer/Drawer.tsx
function k({ open: e, onOpenChange: t, title: n, description: r, children: i, initialFocusRef: a, closeOnBackdrop: o = !0, placement: s = "end", className: c }) {
	let l = (0, _.useRef)(null), u = (0, _.useId)(), d = (0, _.useId)();
	return re({
		open: e,
		onOpenChange: t,
		panelRef: l,
		initialFocusRef: a
	}), !e || typeof document > "u" ? null : (0, D.createPortal)(/* @__PURE__ */ (0, b.jsx)("div", {
		className: `${O.backdrop} ${O[s]}`,
		onMouseDown: (e) => {
			o && e.target === e.currentTarget && t(!1);
		},
		children: /* @__PURE__ */ (0, b.jsxs)("aside", {
			"aria-describedby": r === void 0 ? void 0 : d,
			"aria-labelledby": u,
			"aria-modal": "true",
			className: [O.panel, c].filter(Boolean).join(" "),
			ref: l,
			role: "dialog",
			tabIndex: -1,
			children: [
				/* @__PURE__ */ (0, b.jsx)("h2", {
					className: O.title,
					id: u,
					children: n
				}),
				r === void 0 ? null : /* @__PURE__ */ (0, b.jsx)("p", {
					className: O.description,
					id: d,
					children: r
				}),
				/* @__PURE__ */ (0, b.jsx)("div", {
					className: O.content,
					children: i
				})
			]
		})
	}), document.body);
}
var ce = {
	root: "_root_1ankv_1",
	icon: "_icon_1ankv_2",
	title: "_title_1ankv_3",
	description: "_description_1ankv_4",
	action: "_action_1ankv_5"
};
//#endregion
//#region src/shared/ui/EmptyState/EmptyState.tsx
function le({ action: e, className: t, description: n, icon: r, title: i, ...a }) {
	let o = (0, _.useId)(), s = (0, _.useId)();
	return /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-describedby": n ? s : void 0,
		"aria-labelledby": o,
		className: [ce.root, t].filter(Boolean).join(" "),
		...a,
		children: [
			r ? /* @__PURE__ */ (0, b.jsx)("span", {
				"aria-hidden": "true",
				className: ce.icon,
				children: r
			}) : null,
			/* @__PURE__ */ (0, b.jsx)("h2", {
				className: ce.title,
				id: o,
				children: i
			}),
			n ? /* @__PURE__ */ (0, b.jsx)("p", {
				className: ce.description,
				id: s,
				children: n
			}) : null,
			e ? /* @__PURE__ */ (0, b.jsx)("div", {
				className: ce.action,
				children: e
			}) : null
		]
	});
}
var ue = {
	root: "_root_1byqi_1",
	icon: "_icon_1byqi_2",
	title: "_title_1byqi_3",
	description: "_description_1byqi_4",
	action: "_action_1byqi_5"
};
//#endregion
//#region src/shared/ui/ErrorState/ErrorState.tsx
function de({ action: e, className: t, description: n, icon: r, title: i, ...a }) {
	let o = (0, _.useId)(), s = (0, _.useId)();
	return /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-describedby": n ? s : void 0,
		"aria-labelledby": o,
		className: [ue.root, t].filter(Boolean).join(" "),
		role: "alert",
		...a,
		children: [
			r ? /* @__PURE__ */ (0, b.jsx)("span", {
				"aria-hidden": "true",
				className: ue.icon,
				children: r
			}) : null,
			/* @__PURE__ */ (0, b.jsx)("h2", {
				className: ue.title,
				id: o,
				children: i
			}),
			n ? /* @__PURE__ */ (0, b.jsx)("p", {
				className: ue.description,
				id: s,
				children: n
			}) : null,
			e ? /* @__PURE__ */ (0, b.jsx)("div", {
				className: ue.action,
				children: e
			}) : null
		]
	});
}
var fe = {
	root: "_root_wgcw9_1",
	media: "_media_wgcw9_2",
	caption: "_caption_wgcw9_5"
};
//#endregion
//#region src/shared/ui/MediaFrame/MediaFrame.tsx
function A({ aspectRatio: e = "16 / 9", caption: t, children: n, className: r, fit: i = "cover", style: a, ...o }) {
	return /* @__PURE__ */ (0, b.jsxs)("figure", {
		className: [fe.root, r].filter(Boolean).join(" "),
		style: {
			...a,
			"--media-frame-ratio": e
		},
		...o,
		children: [/* @__PURE__ */ (0, b.jsx)("div", {
			className: fe.media,
			"data-fit": i,
			children: n
		}), t ? /* @__PURE__ */ (0, b.jsx)("figcaption", {
			className: fe.caption,
			children: t
		}) : null]
	});
}
var pe = {
	root: "_root_133n8_1",
	labelRow: "_labelRow_133n8_2",
	track: "_track_133n8_3"
};
//#endregion
//#region src/shared/ui/Progress/Progress.tsx
function me({ className: e, formatValue: t = (e, t) => `${Math.round(e / t * 100)}%`, label: n, max: r = 100, showValue: i = !1, value: a, ...o }) {
	let s = r > 0 ? r : 100, c = a === void 0 ? void 0 : Math.min(Math.max(a, 0), s);
	return /* @__PURE__ */ (0, b.jsxs)("div", {
		className: [pe.root, e].filter(Boolean).join(" "),
		children: [/* @__PURE__ */ (0, b.jsxs)("div", {
			className: pe.labelRow,
			children: [/* @__PURE__ */ (0, b.jsx)("span", {
				id: o.id ? `${o.id}-label` : void 0,
				children: n
			}), i && c !== void 0 ? /* @__PURE__ */ (0, b.jsx)("span", {
				"aria-hidden": "true",
				children: t(c, s)
			}) : null]
		}), /* @__PURE__ */ (0, b.jsx)("progress", {
			"aria-label": o.id ? void 0 : n,
			"aria-labelledby": o.id ? `${o.id}-label` : void 0,
			className: pe.track,
			max: s,
			value: c,
			...o
		})]
	});
}
var he = {
	root: "_root_49jfz_1",
	pulse: "_pulse_49jfz_1",
	small: "_small_49jfz_7",
	medium: "_medium_49jfz_8",
	round: "_round_49jfz_9"
};
//#endregion
//#region src/shared/ui/Skeleton/Skeleton.tsx
function ge({ className: e, height: t, radius: n = "medium", style: r, width: i, ...a }) {
	return /* @__PURE__ */ (0, b.jsx)("span", {
		"aria-hidden": "true",
		className: [
			he.root,
			he[n],
			e
		].filter(Boolean).join(" "),
		style: {
			...r,
			width: i,
			height: t
		},
		...a
	});
}
var _e = {
	root: "_root_yg302_1",
	list: "_list_yg302_5",
	tab: "_tab_yg302_15",
	panel: "_panel_yg302_37"
};
//#endregion
//#region src/shared/ui/tabs/Tabs.tsx
function ve({ items: e, value: t, onValueChange: n, ariaLabel: r, orientation: i = "horizontal", className: a }) {
	let o = (0, _.useId)(), s = (0, _.useRef)(/* @__PURE__ */ new Map()), c = e.filter((e) => !e.disabled);
	function l(e) {
		e.disabled || (n(e.id), s.current.get(e.id)?.focus());
	}
	function u(e, t) {
		let n = c.findIndex((e) => e.id === t.id);
		if (n < 0 || c.length === 0) return;
		let r;
		e.key === "Home" && (r = c[0]), e.key === "End" && (r = c.at(-1)), (i === "horizontal" && e.key === "ArrowRight" || i === "vertical" && e.key === "ArrowDown") && (r = c[(n + 1) % c.length]), (i === "horizontal" && e.key === "ArrowLeft" || i === "vertical" && e.key === "ArrowUp") && (r = c[(n - 1 + c.length) % c.length]), r && (e.preventDefault(), l(r));
	}
	return /* @__PURE__ */ (0, b.jsxs)("div", {
		className: `${_e.root}${a ? ` ${a}` : ""}`,
		children: [/* @__PURE__ */ (0, b.jsx)("div", {
			"aria-label": r,
			"aria-orientation": i,
			className: _e.list,
			role: "tablist",
			children: e.map((e) => {
				let n = e.id === t, r = `${o}-tab-${e.id}`, i = `${o}-panel-${e.id}`;
				return /* @__PURE__ */ (0, b.jsx)("button", {
					"aria-controls": i,
					"aria-selected": n,
					className: _e.tab,
					disabled: e.disabled,
					id: r,
					onClick: () => l(e),
					onKeyDown: (t) => u(t, e),
					ref: (t) => {
						t ? s.current.set(e.id, t) : s.current.delete(e.id);
					},
					role: "tab",
					tabIndex: n ? 0 : -1,
					type: "button",
					children: e.label
				}, e.id);
			})
		}), e.map((e) => {
			let n = e.id === t;
			return /* @__PURE__ */ (0, b.jsx)("div", {
				"aria-labelledby": `${o}-tab-${e.id}`,
				className: _e.panel,
				hidden: !n,
				id: `${o}-panel-${e.id}`,
				role: "tabpanel",
				tabIndex: 0,
				children: e.panel
			}, e.id);
		})]
	});
}
//#endregion
//#region src/shared/api/ApiError.ts
function ye(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function be(e, t, n) {
	if (ye(e)) {
		if (typeof e.detail == "string" && e.detail.trim()) return e.detail;
		if (typeof e.message == "string" && e.message.trim()) return e.message;
	}
	return typeof e == "string" && e.trim() ? e : n?.trim() || `La requête a échoué (${t})`;
}
var xe = class extends Error {
	status;
	detail;
	code;
	validation;
	data;
	constructor(e) {
		let t = be(e.data, e.status, e.statusText);
		super(t, e.cause === void 0 ? void 0 : { cause: e.cause }), this.name = "ApiError", this.status = e.status, this.detail = t, this.data = e.data, ye(e.data) && (this.code = typeof e.data.code == "string" ? e.data.code : void 0, this.validation = e.data.validation ?? e.data.errors ?? (Array.isArray(e.data.detail) ? e.data.detail : void 0));
	}
};
//#endregion
//#region src/shared/api/orvalFetch.ts
async function Se(e) {
	if (e.status === 204 || e.status === 205 || !e.body) return;
	let t = e.headers.get("content-type")?.toLowerCase() ?? "";
	if (t.includes("application/json") || t.includes("+json")) {
		let t = await e.text();
		if (!t) return;
		try {
			return JSON.parse(t);
		} catch {
			return t;
		}
	}
	return t.startsWith("text/") ? e.text() : e.blob();
}
async function j(e, t) {
	let n = await fetch(e, t), r = await Se(n);
	if (!n.ok) throw new xe({
		status: n.status,
		statusText: n.statusText,
		data: r
	});
	return r;
}
//#endregion
//#region src/generated/openapi.ts
var Ce = () => "/api/episodes", we = async (e) => j(Ce(), {
	...e,
	method: "GET"
}), Te = () => "/api/episodes", Ee = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Te(), {
		...t,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, De = () => "/api/guided", Oe = async (e) => j(De(), {
	...e,
	method: "GET"
}), ke = () => "/api/guided/brief", Ae = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(ke(), {
		...t,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, je = () => "/api/guided/characters", Me = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(je(), {
		...t,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Ne = (e) => `/api/guided/characters/${e}`, Pe = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Ne(e), {
		...n,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, Fe = (e) => `/api/guided/characters/${e}/promote`, Ie = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Fe(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, Le = () => "/api/guided/episode-link", Re = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Le(), {
		...t,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, ze = () => "/api/guided/examples", Be = async (e) => j(ze(), {
	...e,
	method: "GET"
}), Ve = () => "/api/guided/proposals", He = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Ve(), {
		...t,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Ue = (e) => `/api/guided/proposals/${e}/accept`, We = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Ue(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, Ge = (e) => `/api/guided/proposals/${e}/reject`, Ke = async (e, t) => j(Ge(e), {
	...t,
	method: "POST"
}), qe = () => "/api/projects", Je = async (e) => j(qe(), {
	...e,
	method: "GET"
}), Ye = () => "/api/projects", Xe = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Ye(), {
		...t,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Ze = (e) => `/api/projects/${e}/activate`, Qe = async (e, t) => j(Ze(e), {
	...t,
	method: "POST"
}), $e = (e) => {
	let t = new URLSearchParams();
	Object.entries(e || {}).forEach(([e, n]) => {
		n !== void 0 && t.append(e, n === null ? "null" : String(n));
	});
	let n = t.toString();
	return n.length > 0 ? `/api/runtime-packs/current?${n}` : "/api/runtime-packs/current";
}, et = async (e, t) => j($e(e), {
	...t,
	method: "GET"
}), tt = (e) => {
	let t = new URLSearchParams();
	Object.entries(e || {}).forEach(([e, n]) => {
		n !== void 0 && t.append(e, n === null ? "null" : String(n));
	});
	let n = t.toString();
	return n.length > 0 ? `/api/runtime-packs/jobs/latest?${n}` : "/api/runtime-packs/jobs/latest";
}, nt = async (e, t) => j(tt(e), {
	...t,
	method: "GET"
}), rt = (e) => `/api/runtime-packs/jobs/${e}`, it = async (e, t) => j(rt(e), {
	...t,
	method: "GET"
}), at = (e) => `/api/runtime-packs/jobs/${e}/cancel`, ot = async (e, t) => j(at(e), {
	...t,
	method: "POST"
}), st = (e) => `/api/runtime-packs/jobs/${e}/logs`, ct = async (e, t) => j(st(e), {
	...t,
	method: "GET"
}), lt = (e) => `/api/runtime-packs/jobs/${e}/pause`, ut = async (e, t) => j(lt(e), {
	...t,
	method: "POST"
}), dt = (e) => `/api/runtime-packs/jobs/${e}/repair`, ft = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(dt(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, pt = (e) => `/api/runtime-packs/jobs/${e}/resume`, mt = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(pt(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, ht = (e) => `/api/runtime-packs/${e}/jobs`, gt = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(ht(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, _t = () => "/api/runtime/services", vt = async (e) => j(_t(), {
	...e,
	method: "GET"
}), yt = () => "/api/season-plan", bt = async (e) => j(yt(), {
	...e,
	method: "GET"
}), xt = () => "/api/season-plan/items", St = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(xt(), {
		...t,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Ct = (e, t) => {
	let n = new URLSearchParams();
	Object.entries(t || {}).forEach(([e, t]) => {
		t !== void 0 && n.append(e, t === null ? "null" : String(t));
	});
	let r = n.toString();
	return r.length > 0 ? `/api/season-plan/items/${e}?${r}` : `/api/season-plan/items/${e}`;
}, wt = async (e, t, n) => j(Ct(e, t), {
	...n,
	method: "DELETE"
}), Tt = (e) => `/api/season-plan/items/${e}`, Et = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Tt(e), {
		...n,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, Dt = (e) => `/api/season-plan/items/${e}/duplicate`, Ot = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Dt(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, kt = (e) => `/api/season-plan/items/${e}/materialize`, At = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(kt(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, jt = (e) => `/api/season-plan/items/${e}/restore`, Mt = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(jt(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, Nt = () => "/api/season-plan/order", Pt = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return j(Nt(), {
		...t,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Ft = () => "/api/studio/journey", It = async (e) => j(Ft(), {
	...e,
	method: "GET"
}), Lt = () => "/health", Rt = async (e) => j(Lt(), {
	...e,
	method: "GET"
}), zt = _.createContext(void 0), Bt = (e) => {
	let t = _.useContext(zt);
	if (e) return e;
	if (!t) throw Error("No QueryClient set, use QueryClientProvider to set one");
	return t;
}, Vt = ({ client: e, children: t }) => (_.useEffect(() => (e.mount(), () => {
	e.unmount();
}), [e]), /* @__PURE__ */ (0, b.jsx)(zt.Provider, {
	value: e,
	children: t
})), Ht = {
	setTimeout: (e, t) => setTimeout(e, t),
	clearTimeout: (e) => clearTimeout(e),
	setInterval: (e, t) => setInterval(e, t),
	clearInterval: (e) => clearInterval(e)
}, Ut = new class {
	#e = Ht;
	setTimeoutProvider(e) {
		this.#e = e;
	}
	setTimeout(e, t) {
		return this.#e.setTimeout(e, t);
	}
	clearTimeout(e) {
		this.#e.clearTimeout(e);
	}
	setInterval(e, t) {
		return this.#e.setInterval(e, t);
	}
	clearInterval(e) {
		this.#e.clearInterval(e);
	}
}();
function Wt(e) {
	setTimeout(e, 0);
}
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/utils.js
var Gt = typeof window > "u" || "Deno" in globalThis;
function Kt() {}
function qt(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function Jt(e) {
	return typeof e == "number" && e >= 0 && e !== Infinity;
}
function Yt(e, t) {
	return Math.max(e + (t || 0) - Date.now(), 0);
}
function M(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function Xt(e, t) {
	let { type: n = "all", exact: r, fetchStatus: i, predicate: a, queryKey: o, stale: s } = e;
	if (o) {
		if (r) {
			if (t.queryHash !== Qt(o, t.options)) return !1;
		} else if (!en(t.queryKey, o)) return !1;
	}
	if (n !== "all") {
		let e = t.isActive();
		if (n === "active" && !e || n === "inactive" && e) return !1;
	}
	return !(typeof s == "boolean" && t.isStale() !== s || i && i !== t.state.fetchStatus || a && !a(t));
}
function Zt(e, t) {
	let { exact: n, status: r, predicate: i, mutationKey: a } = e;
	if (a) {
		if (!t.options.mutationKey) return !1;
		if (n) {
			if ($t(t.options.mutationKey) !== $t(a)) return !1;
		} else if (!en(t.options.mutationKey, a)) return !1;
	}
	return !(r && t.state.status !== r || i && !i(t));
}
function Qt(e, t) {
	return (t?.queryKeyHashFn || $t)(e);
}
function $t(e) {
	return JSON.stringify(e, (e, t) => on(t) ? Object.keys(t).sort().reduce((e, n) => (e[n] = t[n], e), {}) : t);
}
function en(e, t) {
	if (e === t) return !0;
	if (typeof e != typeof t) return !1;
	if (e && t && typeof e == "object" && typeof t == "object") {
		if (Array.isArray(e) && Array.isArray(t)) {
			for (let n = 0; n < t.length; n++) if (!en(e[n], t[n])) return !1;
			return !0;
		}
		let n = Object.keys(t);
		for (let r of n) if (!en(e[r], t[r])) return !1;
		return !0;
	}
	return !1;
}
var tn = Object.prototype.hasOwnProperty;
function nn(e, t, n = 0) {
	if (e === t) return e;
	if (n > 500) return t;
	let r = an(e) && an(t);
	if (!r && !(on(e) && on(t))) return t;
	let i = (r ? e : Object.keys(e)).length, a = r ? t : Object.keys(t), o = a.length, s = r ? Array(o) : {}, c = 0;
	for (let l = 0; l < o; l++) {
		let o = r ? l : a[l], u = e[o], d = t[o];
		if (u === d) {
			s[o] = u, (r ? l < i : tn.call(e, o)) && c++;
			continue;
		}
		if (u === null || d === null || typeof u != "object" || typeof d != "object") {
			s[o] = d;
			continue;
		}
		let f = nn(u, d, n + 1);
		s[o] = f, f === u && c++;
	}
	return i === o && c === i ? e : s;
}
function rn(e, t) {
	if (!t || Object.keys(e).length !== Object.keys(t).length) return !1;
	for (let n in e) if (e[n] !== t[n]) return !1;
	return !0;
}
function an(e) {
	return Array.isArray(e) && e.length === Object.keys(e).length;
}
function on(e) {
	if (!sn(e)) return !1;
	let t = e.constructor;
	if (t === void 0) return !0;
	let n = t.prototype;
	return !(!sn(n) || !n.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(e) !== Object.prototype);
}
function sn(e) {
	return Object.prototype.toString.call(e) === "[object Object]";
}
function cn(e) {
	return new Promise((t) => {
		Ut.setTimeout(t, e);
	});
}
function ln(e, t, n) {
	return typeof n.structuralSharing == "function" ? n.structuralSharing(e, t) : n.structuralSharing === !1 ? t : nn(e, t);
}
function un(e, t, n = 0) {
	let r = [...e, t];
	return n && r.length > n ? r.slice(1) : r;
}
function dn(e, t, n = 0) {
	let r = [t, ...e];
	return n && r.length > n ? r.slice(0, -1) : r;
}
var fn = Symbol();
function pn(e, t) {
	return !e.queryFn && t?.initialPromise ? () => t.initialPromise : !e.queryFn || e.queryFn === fn ? () => Promise.reject(/* @__PURE__ */ Error(`Missing queryFn: '${e.queryHash}'`)) : e.queryFn;
}
function mn(e, t) {
	return typeof e == "function" ? e(...t) : !!e;
}
function hn(e, t, n) {
	let r = !1, i;
	return Object.defineProperty(e, "signal", {
		enumerable: !0,
		get: () => (i ??= t(), r ? i : (r = !0, i.aborted ? n() : i.addEventListener("abort", n, { once: !0 }), i))
	}), e;
}
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/environmentManager.js
var gn = () => Gt, _n = () => gn(), vn = class {
	constructor() {
		this.listeners = /* @__PURE__ */ new Set(), this.subscribe = this.subscribe.bind(this);
	}
	subscribe(e) {
		return this.listeners.add(e), this.onSubscribe(), () => {
			this.listeners.delete(e), this.onUnsubscribe();
		};
	}
	hasListeners() {
		return this.listeners.size > 0;
	}
	onSubscribe() {}
	onUnsubscribe() {}
}, yn = new class extends vn {
	#e;
	#t;
	#n;
	constructor() {
		super(), this.#n = (e) => {
			if (typeof window < "u" && window.addEventListener) {
				let t = () => e();
				return window.addEventListener("visibilitychange", t, !1), () => {
					window.removeEventListener("visibilitychange", t);
				};
			}
		};
	}
	onSubscribe() {
		this.#t || this.setEventListener(this.#n);
	}
	onUnsubscribe() {
		this.hasListeners() || (this.#t?.(), this.#t = void 0);
	}
	setEventListener(e) {
		this.#n = e, this.#t?.(), this.#t = e((e) => {
			typeof e == "boolean" ? this.setFocused(e) : this.onFocus();
		});
	}
	setFocused(e) {
		this.#e !== e && (this.#e = e, this.onFocus());
	}
	onFocus() {
		let e = this.isFocused();
		this.listeners.forEach((t) => {
			t(e);
		});
	}
	isFocused() {
		return typeof this.#e == "boolean" ? this.#e : globalThis.document?.visibilityState !== "hidden";
	}
}(), bn = Wt;
function xn() {
	let e = [], t = 0, n = (e) => {
		e();
	}, r = (e) => {
		e();
	}, i = bn, a = (r) => {
		t ? e.push(r) : i(() => {
			n(r);
		});
	}, o = () => {
		let t = e;
		e = [], t.length && i(() => {
			r(() => {
				t.forEach((e) => {
					n(e);
				});
			});
		});
	};
	return {
		batch: (e) => {
			let n;
			t++;
			try {
				n = e();
			} finally {
				t--, t || o();
			}
			return n;
		},
		batchCalls: (e) => (...t) => {
			a(() => {
				e(...t);
			});
		},
		schedule: a,
		setNotifyFunction: (e) => {
			n = e;
		},
		setBatchNotifyFunction: (e) => {
			r = e;
		},
		setScheduler: (e) => {
			i = e;
		}
	};
}
var N = xn(), Sn = new class extends vn {
	#e = !0;
	#t;
	#n;
	constructor() {
		super(), this.#n = (e) => {
			if (typeof window < "u" && window.addEventListener) {
				let t = () => e(!0), n = () => e(!1);
				return window.addEventListener("online", t, !1), window.addEventListener("offline", n, !1), () => {
					window.removeEventListener("online", t), window.removeEventListener("offline", n);
				};
			}
		};
	}
	onSubscribe() {
		this.#t || this.setEventListener(this.#n);
	}
	onUnsubscribe() {
		this.hasListeners() || (this.#t?.(), this.#t = void 0);
	}
	setEventListener(e) {
		this.#n = e, this.#t?.(), this.#t = e(this.setOnline.bind(this));
	}
	setOnline(e) {
		this.#e !== e && (this.#e = e, this.listeners.forEach((t) => {
			t(e);
		}));
	}
	isOnline() {
		return this.#e;
	}
}();
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/retryer.js
function Cn(e) {
	return Math.min(1e3 * 2 ** e, 3e4);
}
function wn(e) {
	return (e ?? "online") !== "online" || Sn.isOnline();
}
var Tn = class extends Error {
	constructor(e) {
		super("CancelledError"), this.revert = e?.revert, this.silent = e?.silent;
	}
};
function En(e) {
	let t = !1, n = 0, r, i = "pending", a, o, s = new Promise((e, t) => {
		a = e, o = t;
	});
	s.catch(Kt);
	let c = () => i !== "pending", l = (t) => {
		if (!c()) {
			let n = new Tn(t);
			h(n), e.onCancel?.(n);
		}
	}, u = () => {
		t = !0;
	}, d = () => {
		t = !1;
	}, f = () => yn.isFocused() && (e.networkMode === "always" || Sn.isOnline()) && e.canRun(), p = () => wn(e.networkMode) && e.canRun(), m = (e) => {
		c() || (r?.(), i = "resolved", a(e));
	}, h = (e) => {
		c() || (r?.(), i = "rejected", o(e));
	}, g = () => new Promise((t) => {
		r = (e) => {
			(c() || f()) && t(e);
		}, e.onPause?.();
	}).then(() => {
		r = void 0, c() || e.onContinue?.();
	}), _ = () => {
		if (c()) return;
		let r, i = n === 0 ? e.initialPromise : void 0;
		try {
			r = i ?? e.fn();
		} catch (e) {
			r = Promise.reject(e);
		}
		Promise.resolve(r).then(m).catch((r) => {
			if (c()) return;
			let i = e.retry ?? (_n() ? 0 : 3), a = e.retryDelay ?? Cn, o = typeof a == "function" ? a(n, r) : a, s = i === !0 || typeof i == "number" && n < i || typeof i == "function" && i(n, r);
			if (t || !s) {
				h(r);
				return;
			}
			n++, e.onFail?.(n, r), cn(o).then(() => f() ? void 0 : g()).then(() => {
				t ? h(r) : _();
			});
		});
	};
	return {
		promise: s,
		status: () => i,
		cancel: l,
		continue: () => (r?.(), s),
		cancelRetry: u,
		continueRetry: d,
		canStart: p,
		start: () => (p() ? _() : g().then(_), s)
	};
}
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/removable.js
var Dn = class {
	#e;
	destroy() {
		this.clearGcTimeout();
	}
	scheduleGc() {
		this.clearGcTimeout(), Jt(this.gcTime) && (this.#e = Ut.setTimeout(() => {
			this.optionalRemove();
		}, this.gcTime));
	}
	updateGcTime(e) {
		this.gcTime = Math.max(this.gcTime || 0, e ?? (_n() ? Infinity : 3e5));
	}
	clearGcTimeout() {
		this.#e !== void 0 && (Ut.clearTimeout(this.#e), this.#e = void 0);
	}
};
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/infiniteQueryBehavior.js
function On(e) {
	return { onFetch: (t, n) => {
		let r = t.options, i = t.fetchOptions?.meta?.fetchMore?.direction, a = t.state.data?.pages || [], o = t.state.data?.pageParams || [], s = {
			pages: [],
			pageParams: []
		}, c = 0, l = async () => {
			let n = !1, l = (e) => {
				hn(e, () => t.signal, () => n = !0);
			}, u = pn(t.options, t.fetchOptions), d = async (e, r, i) => {
				if (n) return Promise.reject(t.signal.reason);
				if (r == null && e.pages.length) return Promise.resolve(e);
				let a = (() => {
					let e = {
						client: t.client,
						queryKey: t.queryKey,
						pageParam: r,
						direction: i ? "backward" : "forward",
						meta: t.options.meta
					};
					return l(e), e;
				})(), o = await u(a), { maxPages: s } = t.options, c = i ? dn : un;
				return {
					pages: c(e.pages, o, s),
					pageParams: c(e.pageParams, r, s)
				};
			};
			if (i && a.length) {
				let e = i === "backward", t = e ? An : kn, n = {
					pages: a,
					pageParams: o
				};
				s = await d(n, t(r, n), e);
			} else {
				let t = e ?? a.length;
				do {
					let e = c === 0 ? o[0] ?? r.initialPageParam : kn(r, s);
					if (c > 0 && e == null) break;
					s = await d(s, e), c++;
				} while (c < t);
			}
			return s;
		};
		t.fetchFn = t.options.persister ? () => t.options.persister?.(l, {
			client: t.client,
			queryKey: t.queryKey,
			meta: t.options.meta,
			signal: t.signal
		}, n) : l;
	} };
}
function kn(e, { pages: t, pageParams: n }) {
	let r = t.length - 1;
	return t.length > 0 ? e.getNextPageParam(t[r], t, n[r], n) : void 0;
}
function An(e, { pages: t, pageParams: n }) {
	return t.length > 0 ? e.getPreviousPageParam?.(t[0], t, n[0], n) : void 0;
}
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/query.js
var jn = class extends Dn {
	#e;
	#t;
	#n;
	#r;
	#i;
	#a;
	#o;
	#s;
	constructor(e) {
		super(), this.#s = !1, this.#o = e.defaultOptions, this.setOptions(e.options), this.observers = [], this.#i = e.client, this.#r = this.#i.getQueryCache(), this.queryKey = e.queryKey, this.queryHash = e.queryHash, this.#t = Pn(this.options), this.state = e.state ?? this.#t, this.scheduleGc();
	}
	get meta() {
		return this.options.meta;
	}
	get queryType() {
		return this.#e;
	}
	get promise() {
		return this.#a?.promise;
	}
	setOptions(e) {
		if (this.options = {
			...this.#o,
			...e
		}, e?._type && (this.#e = e._type), this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
			let e = Pn(this.options);
			e.data !== void 0 && (this.setState(Nn(e.data, e.dataUpdatedAt)), this.#t = e);
		}
	}
	optionalRemove() {
		!this.observers.length && this.state.fetchStatus === "idle" && this.#r.remove(this);
	}
	setData(e, t) {
		let n = ln(this.state.data, e, this.options);
		return this.#c({
			data: n,
			type: "success",
			dataUpdatedAt: t?.updatedAt,
			manual: t?.manual
		}), n;
	}
	setState(e) {
		this.#c({
			type: "setState",
			state: e
		});
	}
	cancel(e) {
		let t = this.#a?.promise;
		return this.#a?.cancel(e), t ? t.then(Kt).catch(Kt) : Promise.resolve();
	}
	destroy() {
		super.destroy(), this.cancel({ silent: !0 });
	}
	get resetState() {
		return this.#t;
	}
	reset() {
		this.destroy(), this.setState(this.resetState);
	}
	isActive() {
		return this.observers.some((e) => M(e.options.enabled, this) !== !1);
	}
	isDisabled() {
		return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === fn || !this.isFetched();
	}
	isFetched() {
		return this.state.dataUpdateCount + this.state.errorUpdateCount > 0;
	}
	isStatic() {
		return this.getObserversCount() > 0 && this.observers.some((e) => M(e.options.staleTime, this) === "static");
	}
	isStale() {
		return this.getObserversCount() > 0 ? this.observers.some((e) => e.getCurrentResult().isStale) : this.state.data === void 0 || this.state.isInvalidated;
	}
	isStaleByTime(e = 0) {
		return this.state.data === void 0 ? !0 : e === "static" ? !1 : this.state.isInvalidated ? !0 : !Yt(this.state.dataUpdatedAt, e);
	}
	onFocus() {
		this.observers.find((e) => e.shouldFetchOnWindowFocus())?.refetch({ cancelRefetch: !1 }), this.#a?.continue();
	}
	onOnline() {
		this.observers.find((e) => e.shouldFetchOnReconnect())?.refetch({ cancelRefetch: !1 }), this.#a?.continue();
	}
	addObserver(e) {
		this.observers.includes(e) || (this.observers.push(e), this.clearGcTimeout(), this.#r.notify({
			type: "observerAdded",
			query: this,
			observer: e
		}));
	}
	removeObserver(e) {
		let t = this.observers.indexOf(e);
		t !== -1 && (this.observers.splice(t, 1), this.observers.length || (this.#a && (this.#s || this.state.fetchStatus === "paused" && this.state.status === "pending" ? this.#a.cancel({ revert: !0 }) : this.#a.cancelRetry()), this.scheduleGc()), this.#r.notify({
			type: "observerRemoved",
			query: this,
			observer: e
		}));
	}
	getObserversCount() {
		return this.observers.length;
	}
	invalidate() {
		this.state.isInvalidated || this.#c({ type: "invalidate" });
	}
	async fetch(e, t) {
		if (this.state.fetchStatus !== "idle" && this.#a?.status() !== "rejected") {
			if (this.state.data !== void 0 && t?.cancelRefetch) this.cancel({ silent: !0 });
			else if (this.#a) return this.#a.continueRetry(), this.#a.promise;
		}
		if (e && this.setOptions(e), !this.options.queryFn) {
			let e = this.observers.find((e) => e.options.queryFn);
			e && this.setOptions(e.options);
		}
		let n = new AbortController(), r = (e) => {
			Object.defineProperty(e, "signal", {
				enumerable: !0,
				get: () => (this.#s = !0, n.signal)
			});
		}, i = () => {
			let e = pn(this.options, t), n = (() => {
				let e = {
					client: this.#i,
					queryKey: this.queryKey,
					meta: this.meta
				};
				return r(e), e;
			})();
			return this.#s = !1, this.options.persister ? this.options.persister(e, n, this) : e(n);
		}, a = (() => {
			let e = {
				fetchOptions: t,
				options: this.options,
				queryKey: this.queryKey,
				client: this.#i,
				state: this.state,
				fetchFn: i
			};
			return r(e), e;
		})();
		(this.#e === "infinite" ? On(this.options.pages) : this.options.behavior)?.onFetch(a, this), this.#n = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#c({
			type: "fetch",
			meta: a.fetchOptions?.meta
		});
		let o = this.#a = En({
			initialPromise: t?.initialPromise,
			fn: a.fetchFn,
			onCancel: (e) => {
				e instanceof Tn && e.revert && this.setState({
					...this.#n,
					fetchStatus: "idle"
				}), n.abort();
			},
			onFail: (e, t) => {
				this.#c({
					type: "failed",
					failureCount: e,
					error: t
				});
			},
			onPause: () => {
				this.#c({ type: "pause" });
			},
			onContinue: () => {
				this.#c({ type: "continue" });
			},
			retry: a.options.retry,
			retryDelay: a.options.retryDelay,
			networkMode: a.options.networkMode,
			canRun: () => !0
		});
		try {
			let e = await o.start();
			if (e === void 0) throw Error(`${this.queryHash} data is undefined`);
			return this.setData(e), this.#r.config.onSuccess?.(e, this), this.#r.config.onSettled?.(e, this.state.error, this), e;
		} catch (e) {
			if (e instanceof Tn) {
				if (e.silent) return this.#a.promise;
				if (e.revert) {
					if (this.state.data === void 0) throw e;
					return this.state.data;
				}
			}
			throw this.#c({
				type: "error",
				error: e
			}), this.#r.config.onError?.(e, this), this.#r.config.onSettled?.(this.state.data, e, this), e;
		} finally {
			this.#a === o && (this.#a = void 0), this.scheduleGc();
		}
	}
	#c(e) {
		let t = (t) => {
			switch (e.type) {
				case "failed": return {
					...t,
					fetchFailureCount: e.failureCount,
					fetchFailureReason: e.error
				};
				case "pause": return {
					...t,
					fetchStatus: "paused"
				};
				case "continue": return {
					...t,
					fetchStatus: "fetching"
				};
				case "fetch": return {
					...t,
					...Mn(t.data, this.options),
					fetchMeta: e.meta ?? null
				};
				case "success":
					let n = {
						...t,
						...Nn(e.data, e.dataUpdatedAt),
						dataUpdateCount: t.dataUpdateCount + 1,
						...!e.manual && {
							fetchStatus: "idle",
							fetchFailureCount: 0,
							fetchFailureReason: null
						}
					};
					return this.#n = e.manual ? n : void 0, n;
				case "error":
					let r = e.error;
					return {
						...t,
						error: r,
						errorUpdateCount: t.errorUpdateCount + 1,
						errorUpdatedAt: Date.now(),
						fetchFailureCount: t.fetchFailureCount + 1,
						fetchFailureReason: r,
						fetchStatus: "idle",
						status: "error",
						isInvalidated: !0
					};
				case "invalidate": return {
					...t,
					isInvalidated: !0
				};
				case "setState": return {
					...t,
					...e.state
				};
			}
		};
		this.state = t(this.state), N.batch(() => {
			this.observers.slice().forEach((e) => {
				e.onQueryUpdate();
			}), this.#r.notify({
				query: this,
				type: "updated",
				action: e
			});
		});
	}
};
function Mn(e, t) {
	return {
		fetchFailureCount: 0,
		fetchFailureReason: null,
		fetchStatus: wn(t.networkMode) ? "fetching" : "paused",
		...e === void 0 && {
			error: null,
			status: "pending"
		}
	};
}
function Nn(e, t) {
	return {
		data: e,
		dataUpdatedAt: t ?? Date.now(),
		error: null,
		isInvalidated: !1,
		status: "success"
	};
}
function Pn(e) {
	let t = typeof e.initialData == "function" ? e.initialData() : e.initialData, n = t !== void 0, r = n ? typeof e.initialDataUpdatedAt == "function" ? e.initialDataUpdatedAt() : e.initialDataUpdatedAt : 0;
	return {
		data: t,
		dataUpdateCount: 0,
		dataUpdatedAt: n ? r ?? Date.now() : 0,
		error: null,
		errorUpdateCount: 0,
		errorUpdatedAt: 0,
		fetchFailureCount: 0,
		fetchFailureReason: null,
		fetchMeta: null,
		isInvalidated: !1,
		status: n ? "success" : "pending",
		fetchStatus: "idle"
	};
}
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/queryObserver.js
var Fn = class extends vn {
	#e;
	#t = void 0;
	#n = void 0;
	#r = void 0;
	#i;
	#a;
	#o;
	#s;
	#c;
	#l;
	#u;
	#d;
	#f;
	#p = /* @__PURE__ */ new Set();
	constructor(e, t) {
		super(), this.options = t, this.#e = e, this.#o = null, this.bindMethods(), this.setOptions(t);
	}
	bindMethods() {
		this.refetch = this.refetch.bind(this);
	}
	onSubscribe() {
		this.listeners.size === 1 && (this.#t.addObserver(this), Ln(this.#t, this.options) ? this.#m() : this.updateResult(), this.#y());
	}
	onUnsubscribe() {
		this.hasListeners() || this.destroy();
	}
	shouldFetchOnReconnect() {
		return Rn(this.#t, this.options, this.options.refetchOnReconnect);
	}
	shouldFetchOnWindowFocus() {
		return Rn(this.#t, this.options, this.options.refetchOnWindowFocus);
	}
	destroy() {
		this.listeners = /* @__PURE__ */ new Set(), this.#b(), this.#x(), this.#t.removeObserver(this);
	}
	setOptions(e) {
		let t = this.options, n = this.#t;
		if (this.options = this.#e.defaultQueryOptions(e), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof M(this.options.enabled, this.#t) != "boolean") throw Error("Expected enabled to be a boolean or a callback that returns a boolean");
		this.#S(), this.#t.setOptions(this.options), t._defaulted && !rn(this.options, t) && this.#e.getQueryCache().notify({
			type: "observerOptionsUpdated",
			query: this.#t,
			observer: this
		});
		let r = this.hasListeners();
		r && zn(this.#t, n, this.options, t) && this.#m(), this.updateResult(), r && (this.#t !== n || M(this.options.enabled, this.#t) !== M(t.enabled, this.#t) || M(this.options.staleTime, this.#t) !== M(t.staleTime, this.#t)) && this.#g();
		let i = this.#_();
		r && (this.#t !== n || M(this.options.enabled, this.#t) !== M(t.enabled, this.#t) || i !== this.#f) && this.#v(i);
	}
	getOptimisticResult(e) {
		let t = this.#e.getQueryCache().build(this.#e, e), n = this.createResult(t, e);
		return rn(this.getCurrentResult(), n) || (this.#r = n, this.#a = this.options, this.#i = this.#t.state), n;
	}
	getCurrentResult() {
		return this.#r;
	}
	trackResult(e, t) {
		return new Proxy(e, { get: (e, n) => (this.trackProp(n), t?.(n), Reflect.get(e, n)) });
	}
	trackProp(e) {
		this.#p.add(e);
	}
	getCurrentQuery() {
		return this.#t;
	}
	refetch({ ...e } = {}) {
		return this.fetch({ ...e });
	}
	fetchOptimistic(e) {
		let t = this.#e.defaultQueryOptions(e), n = this.#e.getQueryCache().build(this.#e, t), r = () => {}, i, a = new Promise((e) => {
			i = e, r = this.#e.getQueryCache().subscribe((i) => {
				i.type === "updated" && i.query.queryHash === n.queryHash && n.state.data !== void 0 && (r(), e(this.createResult(n, t)));
			});
		});
		return Promise.race([n.fetch().then(() => {
			let e = this.createResult(n, t);
			return i?.(e), e;
		}).finally(() => {
			r();
		}), a]);
	}
	fetch(e) {
		return this.#m({
			...e,
			cancelRefetch: e.cancelRefetch ?? !0
		}).then(() => (this.updateResult(), this.#r));
	}
	#m(e) {
		this.#S();
		let t = this.#t.fetch(this.options, e);
		return e?.throwOnError || (t = t.catch(Kt)), t;
	}
	#h(e) {
		return !_n() && M(this.options.enabled, this.#t) !== !1 && Jt(e);
	}
	#g() {
		this.#b();
		let e = M(this.options.staleTime, this.#t);
		if (this.#r.isStale || !this.#h(e)) return;
		let t = Yt(this.#r.dataUpdatedAt, e) + 1;
		this.#u = Ut.setTimeout(() => {
			this.#r.isStale || this.updateResult();
		}, t);
	}
	#_() {
		return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
	}
	#v(e) {
		this.#x(), this.#f = e, this.#f !== 0 && this.#h(this.#f) && (this.#d = Ut.setInterval(() => {
			(this.options.refetchIntervalInBackground || yn.isFocused()) && this.#m();
		}, this.#f));
	}
	#y() {
		this.#g(), this.#v(this.#_());
	}
	#b() {
		this.#u !== void 0 && (Ut.clearTimeout(this.#u), this.#u = void 0);
	}
	#x() {
		this.#d !== void 0 && (Ut.clearInterval(this.#d), this.#d = void 0);
	}
	createResult(e, t) {
		let n = this.#t, r = this.options, i = this.#r, a = this.#i, o = this.#a, s = e === n ? this.#n : e.state, { state: c } = e, l = { ...c }, u = !1, d;
		if (t._optimisticResults) {
			let i = this.hasListeners(), a = !i && Ln(e, t), o = i && zn(e, n, t, r);
			(a || o) && (l = {
				...l,
				...Mn(c.data, e.options)
			}), t._optimisticResults === "isRestoring" && (l.fetchStatus = "idle");
		}
		let { error: f, errorUpdatedAt: p, status: m } = l;
		d = l.data;
		let h = !1;
		if (t.placeholderData !== void 0 && d === void 0 && m === "pending") {
			let e;
			i?.isPlaceholderData && t.placeholderData === o?.placeholderData ? (e = i.data, h = !0) : e = typeof t.placeholderData == "function" ? t.placeholderData(this.#l?.state.data, this.#l) : t.placeholderData, e !== void 0 && (m = "success", d = ln(i?.data, e, t), u = !0);
		}
		if (t.select && d !== void 0 && !h) {
			if (i && d === a?.data && t.select === this.#s) d = this.#c;
			else try {
				this.#s = t.select, d = t.select(d), d = ln(i?.data, d, t), this.#c = d, this.#o = null;
			} catch (e) {
				this.#o = e;
			}
		} else d === void 0 && (this.#o = null);
		this.#o && (f = this.#o, d = this.#c, p = Date.now(), m = "error", u = !1);
		let g = l.fetchStatus === "fetching", _ = m === "pending", v = m === "error", y = _ && g, b = d !== void 0;
		return {
			status: m,
			fetchStatus: l.fetchStatus,
			isPending: _,
			isSuccess: m === "success",
			isError: v,
			isInitialLoading: y,
			isLoading: y,
			data: d,
			dataUpdatedAt: l.dataUpdatedAt,
			error: f,
			errorUpdatedAt: p,
			failureCount: l.fetchFailureCount,
			failureReason: l.fetchFailureReason,
			errorUpdateCount: l.errorUpdateCount,
			isFetched: e.isFetched(),
			isFetchedAfterMount: l.dataUpdateCount > s.dataUpdateCount || l.errorUpdateCount > s.errorUpdateCount,
			isFetching: g,
			isRefetching: g && !_,
			isLoadingError: v && !b,
			isPaused: l.fetchStatus === "paused",
			isPlaceholderData: u,
			isRefetchError: v && b,
			isStale: Bn(e, t),
			refetch: this.refetch,
			isEnabled: M(t.enabled, e) !== !1
		};
	}
	updateResult() {
		let e = this.#r, t = this.createResult(this.#t, this.options);
		if (this.#i = this.#t.state, this.#a = this.options, this.#i.data !== void 0 && (this.#l = this.#t), rn(t, e)) return;
		this.#r = t;
		let n = (() => {
			if (!e) return !0;
			let { notifyOnChangeProps: t } = this.options, n = typeof t == "function" ? t() : t;
			if (n === "all" || !n && !this.#p.size) return !0;
			let r = new Set(n ?? this.#p);
			return this.options.throwOnError && r.add("error"), Object.keys(this.#r).some((t) => {
				let n = t;
				return this.#r[n] !== e[n] && r.has(n);
			});
		})();
		N.batch(() => {
			n && this.listeners.forEach((e) => {
				e(this.#r);
			}), this.#e.getQueryCache().notify({
				query: this.#t,
				type: "observerResultsUpdated"
			});
		});
	}
	#S() {
		let e = this.#e.getQueryCache().build(this.#e, this.options);
		if (e === this.#t) return;
		let t = this.#t;
		this.#t = e, this.#n = e.state, this.hasListeners() && (t?.removeObserver(this), e.addObserver(this));
	}
	onQueryUpdate() {
		this.updateResult(), this.hasListeners() && this.#y();
	}
};
function In(e, t) {
	return M(t.enabled, e) !== !1 && e.state.data === void 0 && (e.state.status !== "error" || M(t.retryOnMount, e) !== !1);
}
function Ln(e, t) {
	return In(e, t) || e.state.data !== void 0 && Rn(e, t, t.refetchOnMount);
}
function Rn(e, t, n) {
	if (M(t.enabled, e) !== !1 && M(t.staleTime, e) !== "static") {
		let r = typeof n == "function" ? n(e) : n;
		return r === "always" || r !== !1 && Bn(e, t);
	}
	return !1;
}
function zn(e, t, n, r) {
	return (e !== t || M(r.enabled, e) === !1) && (!n.suspense || e.state.status !== "error") && Bn(e, n);
}
function Bn(e, t) {
	return M(t.enabled, e) !== !1 && e.isStaleByTime(M(t.staleTime, e));
}
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/mutation.js
var Vn = class extends Dn {
	#e;
	#t;
	#n;
	#r;
	constructor(e) {
		super(), this.#e = e.client, this.mutationId = e.mutationId, this.#n = e.mutationCache, this.#t = [], this.state = e.state || Hn(), this.setOptions(e.options), this.scheduleGc();
	}
	setOptions(e) {
		this.options = e, this.updateGcTime(this.options.gcTime);
	}
	get meta() {
		return this.options.meta;
	}
	addObserver(e) {
		this.#t.includes(e) || (this.#t.push(e), this.clearGcTimeout(), this.#n.notify({
			type: "observerAdded",
			mutation: this,
			observer: e
		}));
	}
	removeObserver(e) {
		this.#t = this.#t.filter((t) => t !== e), this.scheduleGc(), this.#n.notify({
			type: "observerRemoved",
			mutation: this,
			observer: e
		});
	}
	optionalRemove() {
		this.#t.length || (this.state.status === "pending" ? this.scheduleGc() : this.#n.remove(this));
	}
	continue() {
		return this.#r?.continue() ?? (this.state.status === "pending" ? this.execute(this.state.variables) : Promise.resolve());
	}
	async execute(e) {
		let t = () => {
			this.#i({ type: "continue" });
		}, n = {
			client: this.#e,
			meta: this.options.meta,
			mutationKey: this.options.mutationKey
		}, r = this.#r = En({
			fn: () => this.options.mutationFn ? this.options.mutationFn(e, n) : Promise.reject(/* @__PURE__ */ Error("No mutationFn found")),
			onFail: (e, t) => {
				this.#i({
					type: "failed",
					failureCount: e,
					error: t
				});
			},
			onPause: () => {
				this.#i({ type: "pause" });
			},
			onContinue: t,
			retry: this.options.retry ?? 0,
			retryDelay: this.options.retryDelay,
			networkMode: this.options.networkMode,
			canRun: () => this.#n.canRun(this)
		}), i = this.state.status === "pending", a = !r.canStart();
		try {
			if (i) t();
			else {
				this.#i({
					type: "pending",
					variables: e,
					isPaused: a
				}), this.#n.config.onMutate && await this.#n.config.onMutate(e, this, n);
				let t = await this.options.onMutate?.(e, n);
				t !== this.state.context && this.#i({
					type: "pending",
					context: t,
					variables: e,
					isPaused: a
				});
			}
			let o = await r.start();
			return await this.#n.config.onSuccess?.(o, e, this.state.context, this, n), await this.options.onSuccess?.(o, e, this.state.context, n), await this.#n.config.onSettled?.(o, null, this.state.variables, this.state.context, this, n), await this.options.onSettled?.(o, null, e, this.state.context, n), this.#i({
				type: "success",
				data: o
			}), o;
		} catch (t) {
			try {
				await this.#n.config.onError?.(t, e, this.state.context, this, n);
			} catch (e) {
				Promise.reject(e);
			}
			try {
				await this.options.onError?.(t, e, this.state.context, n);
			} catch (e) {
				Promise.reject(e);
			}
			try {
				await this.#n.config.onSettled?.(void 0, t, this.state.variables, this.state.context, this, n);
			} catch (e) {
				Promise.reject(e);
			}
			try {
				await this.options.onSettled?.(void 0, t, e, this.state.context, n);
			} catch (e) {
				Promise.reject(e);
			}
			throw this.#i({
				type: "error",
				error: t
			}), t;
		} finally {
			this.#r === r && (this.#r = void 0), this.#n.runNext(this);
		}
	}
	#i(e) {
		let t = (t) => {
			switch (e.type) {
				case "failed": return {
					...t,
					failureCount: e.failureCount,
					failureReason: e.error
				};
				case "pause": return {
					...t,
					isPaused: !0
				};
				case "continue": return {
					...t,
					isPaused: !1
				};
				case "pending": return {
					...t,
					context: e.context,
					data: void 0,
					failureCount: 0,
					failureReason: null,
					error: null,
					isPaused: e.isPaused,
					status: "pending",
					variables: e.variables,
					submittedAt: Date.now()
				};
				case "success": return {
					...t,
					data: e.data,
					failureCount: 0,
					failureReason: null,
					error: null,
					status: "success",
					isPaused: !1
				};
				case "error": return {
					...t,
					data: void 0,
					error: e.error,
					failureCount: t.failureCount + 1,
					failureReason: e.error,
					isPaused: !1,
					status: "error"
				};
			}
		};
		this.state = t(this.state), N.batch(() => {
			this.#t.forEach((t) => {
				t.onMutationUpdate(e);
			}), this.#n.notify({
				mutation: this,
				type: "updated",
				action: e
			});
		});
	}
};
function Hn() {
	return {
		context: void 0,
		data: void 0,
		error: null,
		failureCount: 0,
		failureReason: null,
		isPaused: !1,
		status: "idle",
		variables: void 0,
		submittedAt: 0
	};
}
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/mutationCache.js
var Un = class extends vn {
	#e;
	#t;
	#n;
	constructor(e = {}) {
		super(), this.config = e, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#n = 0;
	}
	build(e, t, n) {
		let r = new Vn({
			client: e,
			mutationCache: this,
			mutationId: ++this.#n,
			options: e.defaultMutationOptions(t),
			state: n
		});
		return this.add(r), r;
	}
	add(e) {
		this.#e.add(e);
		let t = Wn(e);
		if (typeof t == "string") {
			let n = this.#t.get(t);
			n ? n.push(e) : this.#t.set(t, [e]);
		}
		this.notify({
			type: "added",
			mutation: e
		});
	}
	remove(e) {
		if (this.#e.delete(e)) {
			let t = Wn(e);
			if (typeof t == "string") {
				let n = this.#t.get(t);
				if (n) {
					if (n.length > 1) {
						let t = n.indexOf(e);
						t !== -1 && n.splice(t, 1);
					} else n[0] === e && this.#t.delete(t);
				}
			}
		}
		this.notify({
			type: "removed",
			mutation: e
		});
	}
	canRun(e) {
		let t = Wn(e);
		if (typeof t == "string") {
			let n = this.#t.get(t)?.find((e) => e.state.status === "pending");
			return !n || n === e;
		}
		return !0;
	}
	runNext(e) {
		let t = Wn(e);
		return typeof t == "string" ? (this.#t.get(t)?.find((t) => t !== e && t.state.isPaused))?.continue() ?? Promise.resolve() : Promise.resolve();
	}
	clear() {
		N.batch(() => {
			this.#e.forEach((e) => {
				this.notify({
					type: "removed",
					mutation: e
				});
			}), this.#e.clear(), this.#t.clear();
		});
	}
	getAll() {
		return Array.from(this.#e);
	}
	find(e) {
		let t = {
			exact: !0,
			...e
		};
		return this.getAll().find((e) => Zt(t, e));
	}
	findAll(e = {}) {
		return this.getAll().filter((t) => Zt(e, t));
	}
	notify(e) {
		N.batch(() => {
			this.listeners.forEach((t) => {
				t(e);
			});
		});
	}
	resumePausedMutations() {
		let e = this.getAll().filter((e) => e.state.isPaused);
		return N.batch(() => Promise.all(e.map((e) => e.continue().catch(Kt))));
	}
};
function Wn(e) {
	return e.options.scope?.id;
}
//#endregion
//#region node_modules/@tanstack/query-core/build/modern/mutationObserver.js
var Gn = class extends vn {
	#e;
	#t = void 0;
	#n;
	#r;
	constructor(e, t) {
		super(), this.#e = e, this.setOptions(t), this.bindMethods(), this.#i();
	}
	bindMethods() {
		this.mutate = this.mutate.bind(this), this.reset = this.reset.bind(this);
	}
	setOptions(e) {
		let t = this.options;
		this.options = this.#e.defaultMutationOptions(e), rn(this.options, t) || this.#e.getMutationCache().notify({
			type: "observerOptionsUpdated",
			mutation: this.#n,
			observer: this
		}), t?.mutationKey && this.options.mutationKey && $t(t.mutationKey) !== $t(this.options.mutationKey) ? this.reset() : this.#n?.state.status === "pending" && this.#n.setOptions(this.options);
	}
	onSubscribe() {
		this.listeners.size === 1 && this.#n && (this.#n.addObserver(this), this.#i());
	}
	onUnsubscribe() {
		this.hasListeners() || this.#n?.removeObserver(this);
	}
	onMutationUpdate(e) {
		this.#i(), this.#a(e);
	}
	getCurrentResult() {
		return this.#t;
	}
	reset() {
		this.#n?.removeObserver(this), this.#n = void 0, this.#i(), this.#a();
	}
	mutate(e, t) {
		return this.#r = t, this.#n?.removeObserver(this), this.#n = this.#e.getMutationCache().build(this.#e, this.options), this.#n.addObserver(this), this.#n.execute(e);
	}
	#i() {
		let e = this.#n?.state ?? Hn();
		this.#t = {
			...e,
			isPending: e.status === "pending",
			isSuccess: e.status === "success",
			isError: e.status === "error",
			isIdle: e.status === "idle",
			mutate: this.mutate,
			reset: this.reset
		};
	}
	#a(e) {
		N.batch(() => {
			if (this.#r && this.hasListeners()) {
				let t = this.#t.variables, n = this.#t.context, r = {
					client: this.#e,
					meta: this.options.meta,
					mutationKey: this.options.mutationKey
				};
				if (e?.type === "success") {
					try {
						this.#r.onSuccess?.(e.data, t, n, r);
					} catch (e) {
						Promise.reject(e);
					}
					try {
						this.#r.onSettled?.(e.data, null, t, n, r);
					} catch (e) {
						Promise.reject(e);
					}
				} else if (e?.type === "error") {
					try {
						this.#r.onError?.(e.error, t, n, r);
					} catch (e) {
						Promise.reject(e);
					}
					try {
						this.#r.onSettled?.(void 0, e.error, t, n, r);
					} catch (e) {
						Promise.reject(e);
					}
				}
			}
			this.listeners.forEach((e) => {
				e(this.#t);
			});
		});
	}
}, Kn = class extends vn {
	#e;
	constructor(e = {}) {
		super(), this.config = e, this.#e = /* @__PURE__ */ new Map();
	}
	build(e, t, n) {
		let r = t.queryKey, i = t.queryHash ?? Qt(r, t), a = this.get(i);
		return a || (a = new jn({
			client: e,
			queryKey: r,
			queryHash: i,
			options: e.defaultQueryOptions(t),
			state: n,
			defaultOptions: e.getQueryDefaults(r)
		}), this.add(a)), a;
	}
	add(e) {
		this.#e.has(e.queryHash) || (this.#e.set(e.queryHash, e), this.notify({
			type: "added",
			query: e
		}));
	}
	remove(e) {
		let t = this.#e.get(e.queryHash);
		t && (e.destroy(), t === e && this.#e.delete(e.queryHash), this.notify({
			type: "removed",
			query: e
		}));
	}
	clear() {
		N.batch(() => {
			this.getAll().forEach((e) => {
				this.remove(e);
			});
		});
	}
	get(e) {
		return this.#e.get(e);
	}
	getAll() {
		return [...this.#e.values()];
	}
	find(e) {
		let t = {
			exact: !0,
			...e
		};
		return this.getAll().find((e) => Xt(t, e));
	}
	findAll(e = {}) {
		let t = this.getAll();
		return Object.keys(e).length > 0 ? t.filter((t) => Xt(e, t)) : t;
	}
	notify(e) {
		N.batch(() => {
			this.listeners.forEach((t) => {
				t(e);
			});
		});
	}
	onFocus() {
		N.batch(() => {
			this.getAll().forEach((e) => {
				e.onFocus();
			});
		});
	}
	onOnline() {
		N.batch(() => {
			this.getAll().forEach((e) => {
				e.onOnline();
			});
		});
	}
}, qn = class {
	#e;
	#t;
	#n;
	#r;
	#i;
	#a;
	#o;
	#s;
	constructor(e = {}) {
		this.#e = e.queryCache || new Kn(), this.#t = e.mutationCache || new Un(), this.#n = e.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#i = /* @__PURE__ */ new Map(), this.#a = 0;
	}
	mount() {
		this.#a++, this.#a === 1 && (this.#o = yn.subscribe(async (e) => {
			e && (await this.resumePausedMutations(), this.#e.onFocus());
		}), this.#s = Sn.subscribe(async (e) => {
			e && (await this.resumePausedMutations(), this.#e.onOnline());
		}));
	}
	unmount() {
		this.#a--, this.#a === 0 && (this.#o?.(), this.#o = void 0, this.#s?.(), this.#s = void 0);
	}
	isFetching(e) {
		return this.#e.findAll({
			...e,
			fetchStatus: "fetching"
		}).length;
	}
	isMutating(e) {
		return this.#t.findAll({
			...e,
			status: "pending"
		}).length;
	}
	getQueryData(e) {
		let t = this.defaultQueryOptions({ queryKey: e });
		return this.#e.get(t.queryHash)?.state.data;
	}
	ensureQueryData(e) {
		let t = this.defaultQueryOptions(e), n = this.#e.build(this, t), r = n.state.data;
		return r === void 0 ? this.fetchQuery(e) : (e.revalidateIfStale && n.isStaleByTime(M(t.staleTime, n)) && this.prefetchQuery(t), Promise.resolve(r));
	}
	getQueriesData(e) {
		return this.#e.findAll(e).map(({ queryKey: e, state: t }) => [e, t.data]);
	}
	setQueryData(e, t, n) {
		let r = this.defaultQueryOptions({ queryKey: e }), i = this.#e.get(r.queryHash)?.state.data, a = qt(t, i);
		if (a !== void 0) return this.#e.build(this, r).setData(a, {
			...n,
			manual: !0
		});
	}
	setQueriesData(e, t, n) {
		return N.batch(() => this.#e.findAll(e).map(({ queryKey: e }) => [e, this.setQueryData(e, t, n)]));
	}
	getQueryState(e) {
		let t = this.defaultQueryOptions({ queryKey: e });
		return this.#e.get(t.queryHash)?.state;
	}
	removeQueries(e) {
		let t = this.#e;
		N.batch(() => {
			t.findAll(e).forEach((e) => {
				t.remove(e);
			});
		});
	}
	resetQueries(e, t) {
		let n = this.#e;
		return N.batch(() => {
			let r = n.findAll(e), i = new Set(r);
			return r.forEach((e) => {
				e.reset();
			}), this.refetchQueries({
				type: "active",
				predicate: (e) => i.has(e)
			}, t);
		});
	}
	cancelQueries(e, t = {}) {
		let n = {
			revert: !0,
			...t
		}, r = N.batch(() => this.#e.findAll(e).map((e) => e.cancel(n)));
		return Promise.all(r).then(Kt).catch(Kt);
	}
	invalidateQueries(e, t = {}) {
		return N.batch(() => (this.#e.findAll(e).forEach((e) => {
			e.invalidate();
		}), e?.refetchType === "none" ? Promise.resolve() : this.refetchQueries({
			...e,
			type: e?.refetchType ?? e?.type ?? "active"
		}, t)));
	}
	refetchQueries(e, t = {}) {
		let n = {
			...t,
			cancelRefetch: t.cancelRefetch ?? !0
		}, r = N.batch(() => this.#e.findAll(e).filter((e) => !e.isDisabled() && !e.isStatic()).map((e) => {
			let t = e.fetch(void 0, n);
			return n.throwOnError || (t = t.catch(Kt)), e.state.fetchStatus === "paused" ? Promise.resolve() : t;
		}));
		return Promise.all(r).then(Kt);
	}
	async query(e) {
		let t = this.defaultQueryOptions(e);
		t.retry === void 0 && (t.retry = !1);
		let n = this.#e.build(this, t), r = n.isStaleByTime(M(t.staleTime, n)) ? await n.fetch(t) : n.state.data, i = t.select;
		return i ? i(r) : r;
	}
	fetchQuery(e) {
		let t = this.defaultQueryOptions(e);
		t.retry === void 0 && (t.retry = !1);
		let n = this.#e.build(this, t);
		return n.isStaleByTime(M(t.staleTime, n)) ? n.fetch(t) : Promise.resolve(n.state.data);
	}
	prefetchQuery(e) {
		return this.fetchQuery(e).then(Kt).catch(Kt);
	}
	infiniteQuery(e) {
		return e._type = "infinite", this.query(e);
	}
	fetchInfiniteQuery(e) {
		return e._type = "infinite", this.fetchQuery(e);
	}
	prefetchInfiniteQuery(e) {
		return this.fetchInfiniteQuery(e).then(Kt).catch(Kt);
	}
	ensureInfiniteQueryData(e) {
		return e._type = "infinite", this.ensureQueryData(e);
	}
	resumePausedMutations() {
		return Sn.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
	}
	getQueryCache() {
		return this.#e;
	}
	getMutationCache() {
		return this.#t;
	}
	getDefaultOptions() {
		return this.#n;
	}
	setDefaultOptions(e) {
		this.#n = e;
	}
	setQueryDefaults(e, t) {
		this.#r.set($t(e), {
			queryKey: e,
			defaultOptions: t
		});
	}
	getQueryDefaults(e) {
		let t = [...this.#r.values()], n = {};
		return t.forEach((t) => {
			en(e, t.queryKey) && Object.assign(n, t.defaultOptions);
		}), n;
	}
	setMutationDefaults(e, t) {
		this.#i.set($t(e), {
			mutationKey: e,
			defaultOptions: t
		});
	}
	getMutationDefaults(e) {
		let t = [...this.#i.values()], n = {};
		return t.forEach((t) => {
			en(e, t.mutationKey) && Object.assign(n, t.defaultOptions);
		}), n;
	}
	defaultQueryOptions(e) {
		if (e._defaulted) return e;
		let t = {
			...this.#n.queries,
			...this.getQueryDefaults(e.queryKey),
			...e,
			_defaulted: !0
		};
		return t.queryHash ||= Qt(t.queryKey, t), t.refetchOnReconnect === void 0 && (t.refetchOnReconnect = t.networkMode !== "always"), t.throwOnError === void 0 && (t.throwOnError = !!t.suspense), !t.networkMode && t.persister && (t.networkMode = "offlineFirst"), t.queryFn === fn && (t.enabled = !1), t;
	}
	defaultMutationOptions(e) {
		return e?._defaulted ? e : {
			...this.#n.mutations,
			...e?.mutationKey && this.getMutationDefaults(e.mutationKey),
			...e,
			_defaulted: !0
		};
	}
	clear() {
		this.#e.clear(), this.#t.clear();
	}
}, Jn = _.createContext(!1), Yn = () => _.useContext(Jn);
Jn.Provider;
//#endregion
//#region node_modules/@tanstack/react-query/build/modern/QueryErrorResetBoundary.js
function Xn() {
	let e = !1;
	return {
		clearReset: () => {
			e = !1;
		},
		reset: () => {
			e = !0;
		},
		isReset: () => e
	};
}
var Zn = _.createContext(Xn()), Qn = () => _.useContext(Zn), $n = (e, t, n) => {
	let r = n?.state.error && typeof e.throwOnError == "function" ? mn(e.throwOnError, [n.state.error, n]) : e.throwOnError;
	(e.suspense || r) && (t.isReset() || (e.retryOnMount = !1));
}, er = (e) => {
	_.useEffect(() => {
		e.clearReset();
	}, [e]);
}, tr = ({ result: e, errorResetBoundary: t, throwOnError: n, query: r, suspense: i }) => e.isError && !t.isReset() && !e.isFetching && r && (i && e.data === void 0 || mn(n, [e.error, r])), nr = (e) => {
	if (e.suspense) {
		let t = 1e3, n = (e) => e === "static" ? e : Math.max(e ?? t, t), r = e.staleTime;
		e.staleTime = typeof r == "function" ? (...e) => n(r(...e)) : n(r), typeof e.gcTime == "number" && (e.gcTime = Math.max(e.gcTime, t));
	}
}, rr = (e, t) => e?.suspense && t.isPending, ir = (e, t, n) => t.fetchOptimistic(e).catch(() => {
	n.clearReset();
});
//#endregion
//#region node_modules/@tanstack/react-query/build/modern/useBaseQuery.js
function ar(e, t, n) {
	let r = Yn(), i = Qn(), a = Bt(n), o = a.defaultQueryOptions(e), s = a.getQueryCache().get(o.queryHash), c = e.subscribed !== !1;
	o._optimisticResults = r ? "isRestoring" : c ? "optimistic" : void 0, nr(o), $n(o, i, s), er(i);
	let [l] = _.useState(() => new t(a, o)), u = l.getOptimisticResult(o), d = !r && c;
	if (_.useSyncExternalStore(_.useCallback((e) => {
		let t = d ? l.subscribe(N.batchCalls(e)) : Kt;
		return l.updateResult(), t;
	}, [l, d]), () => l.getCurrentResult(), () => l.getCurrentResult()), _.useEffect(() => {
		l.setOptions(o);
	}, [o, l]), rr(o, u)) throw ir(o, l, i);
	if (tr({
		result: u,
		errorResetBoundary: i,
		throwOnError: o.throwOnError,
		query: s,
		suspense: o.suspense
	})) throw u.error;
	return o.notifyOnChangeProps ? u : l.trackResult(u);
}
//#endregion
//#region node_modules/@tanstack/react-query/build/modern/useQuery.js
function or(e, t) {
	return ar(e, Fn, t);
}
//#endregion
//#region node_modules/@tanstack/react-query/build/modern/queryOptions.js
function sr(e) {
	return e;
}
//#endregion
//#region node_modules/@tanstack/react-query/build/modern/useMutation.js
function cr(e, t) {
	let n = Bt(t), [r] = _.useState(() => new Gn(n, e));
	_.useEffect(() => {
		r.setOptions(e);
	}, [r, e]);
	let i = _.useSyncExternalStore(_.useCallback((e) => r.subscribe(N.batchCalls(e)), [r]), () => r.getCurrentResult(), () => r.getCurrentResult()), a = _.useCallback((...e) => {
		r.mutate(e[0], e[1]).catch(Kt);
	}, [r]);
	if (i.error && mn(r.options.throwOnError, [i.error])) throw i.error;
	return {
		...i,
		mutate: a,
		mutateAsync: i.mutate
	};
}
//#endregion
//#region src/shared/query/studioQueryClient.ts
var lr = new qn({ defaultOptions: {
	queries: {
		staleTime: 3e4,
		retry: 1,
		refetchOnWindowFocus: !1
	},
	mutations: { retry: 0 }
} }), ur = "studio:tool-open-request";
function dr(e, t = window) {
	t.dispatchEvent(new CustomEvent(ur, { detail: { tool: e } }));
}
//#endregion
//#region src/shared/legacy/LegacyBridge.ts
var fr = [
	"studio:workspace-changed",
	"studio:project-changed",
	"studio:episode-loaded",
	"studio:episode-cleared",
	"studio:shot-selected",
	"studio:runtime",
	"studio:runtime-preparation",
	"studio:job",
	"studio:episode-job",
	"studio:stage-job",
	"studio:narrative-job",
	"studio:demo-job"
], pr = /* @__PURE__ */ new WeakMap();
function mr() {
	if (typeof window > "u") throw Error("LegacyBridge requires a browser window or an injected host.");
	return window;
}
function hr(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function gr(e) {
	return hr(e) ? e : {};
}
function _r(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function vr(e, t) {
	return gr(e[t]);
}
function yr(e) {
	return e === "studio:job" || e === "studio:episode-job" || e === "studio:stage-job" || e === "studio:narrative-job" || e === "studio:demo-job";
}
var br = class {
	#e;
	#t;
	#n;
	#r = /* @__PURE__ */ new Map();
	#i = /* @__PURE__ */ new Map();
	#a = !1;
	constructor(e = {}) {
		this.#e = e.host ?? mr(), this.#t = e.development ?? !1, this.#n = e.logger ?? console;
	}
	start() {
		if (this.#a) return this.#d("Duplicate LegacyBridge subscription prevented."), this;
		let e = pr.get(this.#e);
		e && e !== this && (this.#d("Replacing an active LegacyBridge subscription (HMR)."), e.#o());
		for (let e of fr) {
			let t = (t) => this.#s(e, t);
			this.#e.addEventListener(e, t), this.#i.set(e, t);
		}
		return pr.set(this.#e, this), this.#a = !0, this;
	}
	subscribe(e, t) {
		let n = this.#r.get(e) ?? /* @__PURE__ */ new Set(), r = t;
		n.has(r) ? this.#d(`Duplicate LegacyBridge listener prevented for "${e}".`) : (n.add(r), this.#r.set(e, n));
		let i = !0;
		return () => {
			i && (i = !1, n.delete(r), n.size === 0 && this.#r.delete(e));
		};
	}
	async initialSnapshot() {
		await this.#e.SerreProjects?.ready;
		let e = gr(this.#e.SerreProjects?.current()), t = gr(this.#e.SerreEpisode?.current()), n = vr(t, "episode"), r = gr(this.#e.SerreRuntimeManager?.current()), i = this.#e.SerreActivity?.current();
		return {
			workspace: {
				view: this.#l(this.#e.SerreWorkspace?.current()),
				payload: {}
			},
			project: {
				projectId: _r(e.active_id),
				payload: e
			},
			episode: {
				episodeId: _r(n.id),
				seriesId: _r(n.series_id),
				payload: t
			},
			runtime: {
				enabled: typeof r.enabled == "boolean" ? r.enabled : null,
				services: Array.isArray(r.services) ? r.services.filter(hr) : [],
				payload: r
			},
			activity: hr(i) ? i : null
		};
	}
	dispatch(e) {
		switch (e.type) {
			case "workspace.show": return this.#u(e.type, this.#e.SerreWorkspace, this.#e.SerreWorkspace?.show, e.view);
			case "studio.notify": return this.#u(e.type, this.#e.SerreStudio, this.#e.SerreStudio?.notify, e.message, e.level === "error");
			case "project.activate": return this.#u(e.type, this.#e.SerreProjects, this.#e.SerreProjects?.activate, e.projectId);
			case "episode.select": return this.#u(e.type, this.#e.SerreEpisode, this.#e.SerreEpisode?.refresh, e.episodeId);
			case "notifications.capture-error": return this.#u(e.type, this.#e.SerreNotifications, this.#e.SerreNotifications?.captureError, e.message);
			case "runtime.refresh": return this.#u(e.type, this.#e.SerreRuntimeManager, this.#e.SerreRuntimeManager?.refresh);
			case "runtime.prepare": return this.#u(e.type, this.#e.SerreRuntimeManager, this.#e.SerreRuntimeManager?.prepareAll);
			case "runtime.control": return this.#u(e.type, this.#e.SerreRuntimeManager, this.#e.SerreRuntimeManager?.control, e.service, e.action);
			case "runtime.show-logs": return this.#u(e.type, this.#e.SerreRuntimeManager, this.#e.SerreRuntimeManager?.showLogs, e.service);
			case "activity.open-log": return this.#u(e.type, this.#e.SerreActivity, this.#e.SerreActivity?.openLog);
			case "activity.close": return this.#u(e.type, this.#e.SerreActivity, this.#e.SerreActivity?.close);
			case "activity.publish": return this.#e.dispatchEvent(new CustomEvent("studio:stage-job", { detail: e.payload })), !0;
			default: return this.#d(`Unknown legacy command "${e.type}".`, e), !1;
		}
	}
	dispose() {
		this.#o();
		let e = [...this.#r.values()].reduce((e, t) => e + t.size, 0);
		e > 0 && this.#d(`LegacyBridge disposed with ${e} subscription(s) still active.`), this.#r.clear();
	}
	get subscriptionCount() {
		return this.#i.size;
	}
	#o() {
		for (let [e, t] of this.#i) this.#e.removeEventListener(e, t);
		this.#i.clear(), this.#a = !1, pr.get(this.#e) === this && pr.delete(this.#e);
	}
	#s(e, t) {
		let n = gr(t instanceof CustomEvent ? t.detail : void 0);
		if (yr(e)) {
			this.#c("activityChanged", {
				sourceEvent: e,
				payload: n
			});
			return;
		}
		switch (e) {
			case "studio:workspace-changed":
				this.#c("workspaceChanged", {
					view: this.#l(n.view),
					payload: n
				});
				break;
			case "studio:project-changed":
				this.#c("projectChanged", {
					projectId: _r(n.active_id),
					payload: n
				});
				break;
			case "studio:episode-loaded": {
				let e = vr(n, "episode");
				this.#c("episodeLoaded", {
					episodeId: _r(e.id),
					seriesId: _r(e.series_id),
					payload: n
				});
				break;
			}
			case "studio:episode-cleared":
				this.#c("episodeCleared", void 0);
				break;
			case "studio:shot-selected": {
				let e = vr(n, "episode"), t = vr(n, "shot");
				this.#c("shotSelected", {
					episodeId: _r(e.id),
					shotId: _r(t.id) ?? _r(t.shot_id),
					index: typeof n.index == "number" ? n.index : null,
					payload: n
				});
				break;
			}
			case "studio:runtime":
				this.#c("runtimeChanged", {
					enabled: typeof n.enabled == "boolean" ? n.enabled : null,
					services: Array.isArray(n.services) ? n.services.filter(hr) : [],
					payload: n
				});
				break;
			case "studio:runtime-preparation": this.#c("runtimePreparation", {
				status: _r(n.status),
				message: _r(n.message),
				progress: hr(n.progress) ? n.progress : null,
				payload: n
			});
		}
	}
	#c(e, t) {
		for (let n of this.#r.get(e) ?? []) n(t);
	}
	#l(e) {
		return e === "guided" || e === "graph" || e === "plan" || e === "outputs" || e === "bible" || e === "settings" ? e : null;
	}
	#u(e, t, n, ...r) {
		return n ? (n.call(t, ...r), !0) : (this.#d(`Legacy command "${e}" is unavailable.`), !1);
	}
	#d(e, t) {
		this.#t && this.#n.warn(`[LegacyBridge] ${e}`, t);
	}
};
//#endregion
//#region src/shared/legacy/LegacyWorkspaceSlot.tsx
function xr(e, t, n) {
	n === null ? e.removeAttribute(t) : e.setAttribute(t, n);
}
function Sr(e, t) {
	if (t.parent === null || !t.parent.isConnected) {
		e.remove();
		return;
	}
	t.nextSibling?.parentNode === t.parent ? t.parent.insertBefore(e, t.nextSibling) : t.parent.appendChild(e);
}
function Cr({ view: e, kernel: t, resolveLegacyRoot: n, unavailable: r, focusOnMount: i = !0, ...a }) {
	let o = (0, _.useRef)(null), [s, c] = (0, _.useState)("pending");
	return (0, _.useLayoutEffect)(() => {
		let r = o.current, a = r?.ownerDocument.activeElement instanceof HTMLElement ? r.ownerDocument.activeElement : null, s;
		try {
			s = n();
		} catch (n) {
			t.runtime.reportError(n, {
				boundary: "LegacyWorkspaceSlot",
				view: e
			}), c("unavailable");
			return;
		}
		if (r === null || s === null || s === r) {
			c("unavailable");
			return;
		}
		let l = {
			parent: s.parentNode,
			nextSibling: s.nextSibling,
			hidden: s.hasAttribute("hidden"),
			ariaHidden: s.getAttribute("aria-hidden"),
			inert: s.inert,
			tabIndex: s.getAttribute("tabindex")
		};
		return t.navigation.navigate({
			kind: "workspace",
			view: e
		}, { focus: !1 }), r.appendChild(s), s.hidden = !1, s.inert = !1, s.removeAttribute("aria-hidden"), c("mounted"), i && (s.hasAttribute("tabindex") || (s.tabIndex = -1), s.focus({ preventScroll: !0 })), () => {
			Sr(s, l), s.hidden = l.hidden, s.inert = l.inert, xr(s, "aria-hidden", l.ariaHidden), xr(s, "tabindex", l.tabIndex), i && a?.isConnected && a.focus({ preventScroll: !0 });
		};
	}, [
		i,
		t,
		n,
		e
	]), /* @__PURE__ */ (0, b.jsxs)("section", {
		...a,
		"data-legacy-workspace-status": s,
		children: [/* @__PURE__ */ (0, b.jsx)("div", {
			ref: o,
			"data-legacy-workspace-mount": ""
		}), s === "unavailable" ? r : null]
	});
}
//#endregion
//#region src/features/api-status/apiStatusQuery.ts
var wr = sr({
	queryKey: ["api", "health"],
	queryFn: ({ signal: e }) => Rt({ signal: e })
});
//#endregion
//#region src/features/api-status/ApiStatus.tsx
function Tr() {
	let e = or(wr), t = e.isPending ? "Connexion à l’API…" : e.isError ? "API indisponible" : `API connectée : ${e.data.status}`;
	return /* @__PURE__ */ (0, b.jsx)(x, {
		role: "status",
		children: t
	});
}
//#endregion
//#region src/features/api-status/index.ts
var Er = {
	id: "api-status",
	Component: Tr
};
//#endregion
//#region src/features/studio-status/StudioStatus.tsx
function Dr() {
	return /* @__PURE__ */ (0, b.jsx)(x, {
		role: "status",
		children: "Interface React initialisée"
	});
}
//#endregion
//#region src/features/studio-status/index.ts
var Or = {
	id: "studio-status",
	Component: Dr
}, kr = "/api/relationship-board";
function Ar() {
	return j(kr, { method: "GET" });
}
function jr(e, t, n) {
	return j(`${kr}/relationships/${encodeURIComponent(t.id)}`, {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			expected_revision: e,
			confirmed_by_user: !0,
			note: n,
			relationship: t
		})
	});
}
function Mr(e, t, n) {
	return j(`${kr}/secrets/${encodeURIComponent(t.id)}`, {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			expected_revision: e,
			confirmed_by_user: !0,
			note: n,
			secret: t
		})
	});
}
function Nr(e, t, n, r) {
	return j(`${kr}/summary-candidates`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			expected_revision: e,
			relationship_ids: t,
			secret_ids: n,
			locale: r
		})
	});
}
//#endregion
//#region src/features/relationships/messages.ts
var Pr = {
	fr: {
		eyebrow: "BIBLE RELATIONNELLE",
		title: "Relations, jalousies et secrets",
		description: "Chaque direction raconte un point de vue différent. Rien ne devient canonique sans ton enregistrement explicite.",
		tabs: "Sections de la Bible relationnelle",
		relations: "Relations",
		secrets: "Secrets",
		history: "Historique",
		advanced: "Bible avancée",
		source: "Depuis",
		target: "Vers",
		choosePair: "Choisir cette direction",
		noRelation: "Nouvelle relation",
		label: "Dynamique",
		summary: "Résumé canonique",
		save: "Enregistrer dans la Bible",
		saving: "Enregistrement…",
		generateSummary: "Générer un aperçu narratif",
		generating: "Génération…",
		candidate: "Aperçu candidat — non canonique",
		candidateDescription: "Cet aperçu explique les tensions mais ne modifie jamais la Bible.",
		revision: "Révision",
		provenance: "Provenance",
		affected: "Impact aval",
		noImpact: "Aucun épisode ou plan existant n’est touché.",
		reload: "Recharger les données",
		unavailable: "Relations indisponibles",
		unavailableDescription: "Recharge le Studio. Tes données canoniques ne sont pas modifiées.",
		loading: "Chargement des relations",
		empty: "Ajoute au moins deux personnages avant de définir leurs relations.",
		newSecret: "Nouveau secret",
		secretSummary: "Fait caché",
		severity: "Gravité",
		createdEpisode: "Épisode de création",
		revealed: "Déjà révélé",
		owners: "Détenteurs",
		knownBy: "Au courant",
		hiddenFrom: "Tenu à l’écart",
		edit: "Modifier",
		changes: "Modifications canoniques",
		noHistory: "Aucune modification relationnelle enregistrée.",
		operation: {
			create: "création",
			update: "mise à jour",
			delete: "suppression",
			replace: "remplacement"
		},
		axes: {
			desire: "Désir",
			trust: "Confiance",
			anger: "Colère",
			fear: "Peur",
			attachment: "Attachement",
			jealousy: "Jalousie",
			toxicity: "Toxicité"
		}
	},
	en: {
		eyebrow: "RELATIONSHIP BIBLE",
		title: "Relationships, jealousy and secrets",
		description: "Each direction tells a different point of view. Nothing becomes canon until you explicitly save it.",
		tabs: "Relationship Bible sections",
		relations: "Relationships",
		secrets: "Secrets",
		history: "History",
		advanced: "Advanced Bible",
		source: "From",
		target: "To",
		choosePair: "Choose this direction",
		noRelation: "New relationship",
		label: "Dynamic",
		summary: "Canonical summary",
		save: "Save to the Bible",
		saving: "Saving…",
		generateSummary: "Generate narrative preview",
		generating: "Generating…",
		candidate: "Candidate preview — not canonical",
		candidateDescription: "This preview explains tensions but never changes the Bible.",
		revision: "Revision",
		provenance: "Provenance",
		affected: "Downstream impact",
		noImpact: "No existing episode or shot is affected.",
		reload: "Reload data",
		unavailable: "Relationships unavailable",
		unavailableDescription: "Reload the Studio. Your canonical data is not modified.",
		loading: "Loading relationships",
		empty: "Add at least two characters before defining relationships.",
		newSecret: "New secret",
		secretSummary: "Hidden fact",
		severity: "Severity",
		createdEpisode: "Created in episode",
		revealed: "Already revealed",
		owners: "Owners",
		knownBy: "Knows it",
		hiddenFrom: "Kept unaware",
		edit: "Edit",
		changes: "Canonical changes",
		noHistory: "No relationship change recorded.",
		operation: {
			create: "created",
			update: "updated",
			delete: "deleted",
			replace: "replaced"
		},
		axes: {
			desire: "Desire",
			trust: "Trust",
			anger: "Anger",
			fear: "Fear",
			attachment: "Attachment",
			jealousy: "Jealousy",
			toxicity: "Toxicity"
		}
	}
};
function Fr(e) {
	return Pr[e];
}
//#endregion
//#region src/features/relationships/model.ts
var Ir = [
	"desire",
	"trust",
	"anger",
	"fear",
	"attachment",
	"jealousy",
	"toxicity"
];
function Lr(e, t) {
	return {
		id: `${e}-vers-${t}`,
		source: e,
		target: t,
		label: "",
		summary: "",
		desire: 0,
		trust: 0,
		anger: 0,
		fear: 0,
		attachment: 0,
		jealousy: 0,
		toxicity: 0,
		provenance: {
			source: "manual",
			note: ""
		}
	};
}
function Rr(e) {
	return {
		id: `secret-${Date.now()}`,
		owners: e ? [e] : [],
		known_by: e ? [e] : [],
		hidden_from: [],
		summary: "",
		severity: .5,
		created_episode: 1,
		revealed: !1,
		provenance: {
			source: "manual",
			note: ""
		}
	};
}
var P = {
	root: "_root_40gmc_1",
	header: "_header_40gmc_7",
	revision: "_revision_40gmc_26",
	relationshipLayout: "_relationshipLayout_40gmc_35",
	secretLayout: "_secretLayout_40gmc_36",
	matrixPanel: "_matrixPanel_40gmc_42",
	matrix: "_matrix_40gmc_42",
	matrixButton: "_matrixButton_40gmc_64",
	editor: "_editor_40gmc_89",
	axes: "_axes_40gmc_129",
	axis: "_axis_40gmc_134",
	actions: "_actions_40gmc_154",
	secretList: "_secretList_40gmc_159",
	secretButton: "_secretButton_40gmc_164",
	people: "_people_40gmc_183",
	checkbox: "_checkbox_40gmc_193",
	twoColumns: "_twoColumns_40gmc_199",
	candidate: "_candidate_40gmc_204",
	impact: "_impact_40gmc_205",
	error: "_error_40gmc_206",
	history: "_history_40gmc_236"
}, zr = ["relationship-board"];
function Br(e, t) {
	return e instanceof Error ? e.message : t;
}
function Vr({ locale: e, advancedView: t }) {
	let n = Fr(e), r = Bt(), i = or({
		queryKey: zr,
		queryFn: Ar
	}), [a, o] = (0, _.useState)("relationships"), [s, c] = (0, _.useState)(null), [l, u] = (0, _.useState)(null), [d, f] = (0, _.useState)(null), [p, m] = (0, _.useState)(null), [h, g] = (0, _.useState)(""), v = i.data;
	(0, _.useEffect)(() => {
		if (!v || s) return;
		let e = v.relationships[0];
		e ? c(e) : v.characters.length >= 2 && c(Lr(v.characters[0].id, v.characters[1].id));
	}, [v, s]), (0, _.useEffect)(() => {
		v && !l && v.secrets[0] && u(v.secrets[0]);
	}, [v, l]);
	let y = (e) => {
		r.setQueryData(zr, e), m(e.impact), g("");
	}, x = cr({
		mutationFn: ({ revision: e, relationship: t }) => jr(e, t, t.provenance.note),
		onSuccess: (e) => {
			y(e);
			let t = e.relationships.find((e) => e.id === s?.id);
			t && c(t);
		},
		onError: (e) => g(Br(e, n.unavailableDescription))
	}), S = cr({
		mutationFn: ({ revision: e, secret: t }) => Mr(e, t, t.provenance.note),
		onSuccess: (e) => {
			y(e);
			let t = e.secrets.find((e) => e.id === l?.id);
			t && u(t);
		},
		onError: (e) => g(Br(e, n.unavailableDescription))
	}), C = cr({
		mutationFn: ({ revision: t, relationshipIds: n, secretIds: r }) => Nr(t, n, r, e),
		onSuccess: (e) => {
			f(e), g("");
		},
		onError: (e) => g(Br(e, n.unavailableDescription))
	}), w = (0, _.useMemo)(() => new Map(v?.characters.map((e) => [e.id, e.name]) ?? []), [v?.characters]);
	if (i.isPending) return /* @__PURE__ */ (0, b.jsx)(ge, {
		"aria-label": n.loading,
		height: "28rem",
		width: "100%"
	});
	if (i.error || !v) return /* @__PURE__ */ (0, b.jsx)(de, {
		action: /* @__PURE__ */ (0, b.jsx)(T, {
			onClick: () => i.refetch(),
			children: n.reload
		}),
		description: n.unavailableDescription,
		title: n.unavailable
	});
	if (v.characters.length < 2) return /* @__PURE__ */ (0, b.jsx)(le, {
		description: n.empty,
		title: n.title
	});
	let E = (e, t) => {
		let n = v.relationships.find((n) => n.source === e && n.target === t);
		c(n ?? Lr(e, t)), f(null);
	}, ee = /* @__PURE__ */ (0, b.jsxs)("div", {
		className: P.relationshipLayout,
		children: [/* @__PURE__ */ (0, b.jsx)("section", {
			"aria-label": n.relations,
			className: P.matrixPanel,
			children: /* @__PURE__ */ (0, b.jsxs)("table", {
				className: P.matrix,
				children: [/* @__PURE__ */ (0, b.jsx)("thead", { children: /* @__PURE__ */ (0, b.jsxs)("tr", { children: [/* @__PURE__ */ (0, b.jsx)("th", {
					scope: "col",
					children: "↘"
				}), v.characters.map((e) => /* @__PURE__ */ (0, b.jsx)("th", {
					scope: "col",
					children: e.name
				}, e.id))] }) }), /* @__PURE__ */ (0, b.jsx)("tbody", { children: v.characters.map((e) => /* @__PURE__ */ (0, b.jsxs)("tr", { children: [/* @__PURE__ */ (0, b.jsx)("th", {
					scope: "row",
					children: e.name
				}), v.characters.map((t) => {
					if (e.id === t.id) return /* @__PURE__ */ (0, b.jsx)("td", { children: "—" }, t.id);
					let r = v.relationships.find((n) => n.source === e.id && n.target === t.id), i = s?.source === e.id && s.target === t.id;
					return /* @__PURE__ */ (0, b.jsx)("td", { children: /* @__PURE__ */ (0, b.jsxs)("button", {
						"aria-label": `${n.choosePair}: ${e.name} → ${t.name}`,
						"aria-pressed": i,
						className: P.matrixButton,
						"data-filled": !!r,
						onClick: () => E(e.id, t.id),
						type: "button",
						children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: r?.jealousy ?? 0 }), /* @__PURE__ */ (0, b.jsx)("small", { children: n.axes.jealousy })]
					}) }, t.id);
				})] }, e.id)) })]
			})
		}), s ? /* @__PURE__ */ (0, b.jsx)(Hr, {
			busy: x.isPending,
			draft: s,
			labels: n,
			names: w,
			onChange: c,
			onGenerate: () => C.mutate({
				revision: v.bible_revision,
				relationshipIds: [s.id],
				secretIds: []
			}),
			onSave: () => x.mutate({
				revision: v.bible_revision,
				relationship: s
			}),
			summaryBusy: C.isPending
		}) : null]
	}), D = /* @__PURE__ */ (0, b.jsxs)("div", {
		className: P.secretLayout,
		children: [/* @__PURE__ */ (0, b.jsxs)("aside", {
			className: P.secretList,
			children: [/* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => u(Rr(v.characters[0].id)),
				size: "small",
				variant: "secondary",
				children: n.newSecret
			}), v.secrets.map((e) => /* @__PURE__ */ (0, b.jsxs)("button", {
				"aria-pressed": l?.id === e.id,
				className: P.secretButton,
				onClick: () => u(e),
				type: "button",
				children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: e.summary }), /* @__PURE__ */ (0, b.jsxs)("small", { children: [Math.round(e.severity * 100), "%"] })]
			}, e.id))]
		}), l ? /* @__PURE__ */ (0, b.jsx)(Wr, {
			busy: S.isPending,
			characters: v.characters,
			draft: l,
			labels: n,
			onChange: u,
			onGenerate: () => C.mutate({
				revision: v.bible_revision,
				relationshipIds: [],
				secretIds: [l.id]
			}),
			onSave: () => S.mutate({
				revision: v.bible_revision,
				secret: l
			}),
			summaryBusy: C.isPending
		}) : null]
	}), te = /* @__PURE__ */ (0, b.jsxs)("section", {
		className: P.history,
		children: [/* @__PURE__ */ (0, b.jsx)("h2", { children: n.changes }), v.history.length ? /* @__PURE__ */ (0, b.jsx)("ol", { children: [...v.history].reverse().map((t) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [
			/* @__PURE__ */ (0, b.jsxs)("strong", { children: [
				"r",
				t.revision,
				" · ",
				t.entity_id
			] }),
			/* @__PURE__ */ (0, b.jsx)("span", { children: n.operation[t.operation] }),
			/* @__PURE__ */ (0, b.jsx)("time", {
				dateTime: t.changed_at,
				children: new Intl.DateTimeFormat(e, {
					dateStyle: "medium",
					timeStyle: "short"
				}).format(new Date(t.changed_at))
			})
		] }, `${t.revision}-${t.entity_type}-${t.entity_id}`)) }) : /* @__PURE__ */ (0, b.jsx)("p", { children: n.noHistory })]
	}), ne = [
		{
			id: "relationships",
			label: n.relations,
			panel: ee
		},
		{
			id: "secrets",
			label: n.secrets,
			panel: D
		},
		{
			id: "history",
			label: n.history,
			panel: te
		},
		...t ? [{
			id: "advanced",
			label: n.advanced,
			panel: a === "advanced" ? t : null
		}] : []
	];
	return /* @__PURE__ */ (0, b.jsxs)("main", {
		className: P.root,
		"data-relationship-board": !0,
		children: [
			/* @__PURE__ */ (0, b.jsxs)("header", {
				className: P.header,
				children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [
					/* @__PURE__ */ (0, b.jsx)("small", { children: n.eyebrow }),
					/* @__PURE__ */ (0, b.jsx)("h1", { children: n.title }),
					/* @__PURE__ */ (0, b.jsx)("p", { children: n.description })
				] }), /* @__PURE__ */ (0, b.jsxs)("div", {
					className: P.revision,
					children: [/* @__PURE__ */ (0, b.jsx)("span", { children: n.revision }), /* @__PURE__ */ (0, b.jsx)("strong", { children: v.bible_revision })]
				})]
			}),
			h ? /* @__PURE__ */ (0, b.jsxs)("div", {
				className: P.error,
				role: "alert",
				children: [/* @__PURE__ */ (0, b.jsx)("span", { children: h }), /* @__PURE__ */ (0, b.jsx)(T, {
					onClick: () => i.refetch(),
					size: "small",
					variant: "secondary",
					children: n.reload
				})]
			}) : null,
			p ? /* @__PURE__ */ (0, b.jsx)(Gr, {
				impact: p,
				labels: n
			}) : null,
			d ? /* @__PURE__ */ (0, b.jsxs)("aside", {
				className: P.candidate,
				children: [
					/* @__PURE__ */ (0, b.jsx)("strong", { children: n.candidate }),
					/* @__PURE__ */ (0, b.jsx)("p", { children: n.candidateDescription }),
					/* @__PURE__ */ (0, b.jsx)("pre", { children: d.summary }),
					/* @__PURE__ */ (0, b.jsxs)("small", { children: [
						n.provenance,
						": ",
						d.provenance.method
					] })
				]
			}) : null,
			/* @__PURE__ */ (0, b.jsx)(ve, {
				ariaLabel: n.tabs,
				items: ne,
				onValueChange: o,
				value: a
			})
		]
	});
}
function Hr({ busy: e, draft: t, labels: n, names: r, onChange: i, onGenerate: a, onSave: o, summaryBusy: s }) {
	return /* @__PURE__ */ (0, b.jsxs)("form", {
		className: P.editor,
		onSubmit: (e) => {
			e.preventDefault(), o();
		},
		children: [
			/* @__PURE__ */ (0, b.jsxs)("header", { children: [
				/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("small", { children: n.source }), /* @__PURE__ */ (0, b.jsx)("strong", { children: r.get(t.source) })] }),
				/* @__PURE__ */ (0, b.jsx)("span", {
					"aria-hidden": "true",
					children: "→"
				}),
				/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("small", { children: n.target }), /* @__PURE__ */ (0, b.jsx)("strong", { children: r.get(t.target) })] })
			] }),
			/* @__PURE__ */ (0, b.jsxs)("label", { children: [n.label, /* @__PURE__ */ (0, b.jsx)("input", {
				required: !0,
				value: t.label,
				onChange: (e) => i({
					...t,
					label: e.currentTarget.value
				})
			})] }),
			/* @__PURE__ */ (0, b.jsxs)("label", { children: [n.summary, /* @__PURE__ */ (0, b.jsx)("textarea", {
				required: !0,
				value: t.summary,
				onChange: (e) => i({
					...t,
					summary: e.currentTarget.value
				})
			})] }),
			/* @__PURE__ */ (0, b.jsx)("div", {
				className: P.axes,
				children: Ir.map((e) => /* @__PURE__ */ (0, b.jsx)(Ur, {
					axis: e,
					labels: n,
					onChange: (n) => i({
						...t,
						[e]: n
					}),
					value: t[e]
				}, e))
			}),
			/* @__PURE__ */ (0, b.jsxs)("label", { children: [n.provenance, /* @__PURE__ */ (0, b.jsx)("input", {
				maxLength: 500,
				value: t.provenance.note,
				onChange: (e) => i({
					...t,
					provenance: {
						source: "manual",
						note: e.currentTarget.value
					}
				})
			})] }),
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: P.actions,
				children: [/* @__PURE__ */ (0, b.jsx)(T, {
					loading: e,
					loadingLabel: n.saving,
					type: "submit",
					children: n.save
				}), /* @__PURE__ */ (0, b.jsx)(T, {
					loading: s,
					loadingLabel: n.generating,
					onClick: a,
					variant: "secondary",
					children: n.generateSummary
				})]
			})
		]
	});
}
function Ur({ axis: e, labels: t, onChange: n, value: r }) {
	let i = e === "jealousy" || e === "toxicity" ? 0 : -100;
	return /* @__PURE__ */ (0, b.jsxs)("fieldset", {
		className: P.axis,
		children: [
			/* @__PURE__ */ (0, b.jsx)("legend", { children: t.axes[e] }),
			/* @__PURE__ */ (0, b.jsx)("input", {
				"aria-label": `${t.axes[e]} slider`,
				max: 100,
				min: i,
				onChange: (e) => n(e.currentTarget.valueAsNumber),
				type: "range",
				value: r
			}),
			/* @__PURE__ */ (0, b.jsx)("input", {
				"aria-label": `${t.axes[e]} value`,
				max: 100,
				min: i,
				onChange: (e) => n(e.currentTarget.valueAsNumber),
				type: "number",
				value: r
			})
		]
	});
}
function Wr({ busy: e, characters: t, draft: n, labels: r, onChange: i, onGenerate: a, onSave: o, summaryBusy: s }) {
	let c = (e, t) => {
		let r = n[e].includes(t) ? n[e].filter((e) => e !== t) : [...n[e], t], a = {
			...n,
			[e]: r
		};
		e === "known_by" && r.includes(t) && (a.hidden_from = a.hidden_from.filter((e) => e !== t)), e === "hidden_from" && r.includes(t) && (a.known_by = a.known_by.filter((e) => e !== t)), i(a);
	};
	return /* @__PURE__ */ (0, b.jsxs)("form", {
		className: P.editor,
		onSubmit: (e) => {
			e.preventDefault(), o();
		},
		children: [
			/* @__PURE__ */ (0, b.jsxs)("label", { children: [r.secretSummary, /* @__PURE__ */ (0, b.jsx)("textarea", {
				minLength: 10,
				required: !0,
				value: n.summary,
				onChange: (e) => i({
					...n,
					summary: e.currentTarget.value
				})
			})] }),
			[
				"owners",
				"known_by",
				"hidden_from"
			].map((e) => /* @__PURE__ */ (0, b.jsxs)("fieldset", {
				className: P.people,
				children: [/* @__PURE__ */ (0, b.jsx)("legend", { children: {
					owners: r.owners,
					known_by: r.knownBy,
					hidden_from: r.hiddenFrom
				}[e] }), t.map((t) => /* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
					checked: n[e].includes(t.id),
					onChange: () => c(e, t.id),
					type: "checkbox"
				}), t.name] }, t.id))]
			}, e)),
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: P.twoColumns,
				children: [/* @__PURE__ */ (0, b.jsxs)("label", { children: [r.severity, /* @__PURE__ */ (0, b.jsx)("input", {
					max: 1,
					min: 0,
					onChange: (e) => i({
						...n,
						severity: e.currentTarget.valueAsNumber
					}),
					step: .05,
					type: "number",
					value: n.severity
				})] }), /* @__PURE__ */ (0, b.jsxs)("label", { children: [r.createdEpisode, /* @__PURE__ */ (0, b.jsx)("input", {
					min: 1,
					onChange: (e) => i({
						...n,
						created_episode: e.currentTarget.valueAsNumber
					}),
					type: "number",
					value: n.created_episode
				})] })]
			}),
			/* @__PURE__ */ (0, b.jsxs)("label", {
				className: P.checkbox,
				children: [/* @__PURE__ */ (0, b.jsx)("input", {
					checked: n.revealed,
					onChange: (e) => i({
						...n,
						revealed: e.currentTarget.checked
					}),
					type: "checkbox"
				}), r.revealed]
			}),
			/* @__PURE__ */ (0, b.jsxs)("label", { children: [r.provenance, /* @__PURE__ */ (0, b.jsx)("input", {
				maxLength: 500,
				value: n.provenance.note,
				onChange: (e) => i({
					...n,
					provenance: {
						source: "manual",
						note: e.currentTarget.value
					}
				})
			})] }),
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: P.actions,
				children: [/* @__PURE__ */ (0, b.jsx)(T, {
					loading: e,
					loadingLabel: r.saving,
					type: "submit",
					children: r.save
				}), /* @__PURE__ */ (0, b.jsx)(T, {
					loading: s,
					loadingLabel: r.generating,
					onClick: a,
					variant: "secondary",
					children: r.generateSummary
				})]
			})
		]
	});
}
function Gr({ impact: e, labels: t }) {
	let n = [...e.affected_episodes, ...e.affected_shots];
	return /* @__PURE__ */ (0, b.jsxs)("aside", {
		className: P.impact,
		children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: t.affected }), /* @__PURE__ */ (0, b.jsx)("span", { children: n.length ? n.join(", ") : t.noImpact })]
	});
}
//#endregion
//#region src/features/season-plan/messages.ts
var Kr = {
	fr: {
		eyebrow: "PLAN DE SAISON",
		title: "Construis la saison",
		description: "Réorganise les intentions sans renommer les épisodes déjà créés.",
		revision: "Révision",
		loading: "Chargement du plan de saison",
		unavailable: "Plan de saison indisponible",
		unavailableDescription: "Recharge les données. Aucun changement local ne sera appliqué.",
		reload: "Recharger",
		emptyTitle: "La saison est encore vide",
		emptyDescription: "Ajoute une première intention d’épisode, puis affine-la avant de la matérialiser.",
		add: "Ajouter une intention",
		adding: "Ajout…",
		episode: "Épisode",
		titleField: "Titre",
		logline: "Promesse",
		synopsis: "Synopsis",
		cliffhanger: "Cliffhanger",
		characters: "Personnages (un identifiant par ligne)",
		locations: "Lieux (un identifiant par ligne)",
		save: "Enregistrer",
		saving: "Enregistrement…",
		validate: "Valider",
		duplicate: "Dupliquer",
		remove: "Retirer du plan",
		restore: "Restaurer",
		materialize: "Créer l’épisode",
		moveUp: "Monter",
		moveDown: "Descendre",
		drag: "Déplacer l’intention",
		advanced: "Détails avancés",
		stableId: "ID stable",
		productionCode: "Code de production",
		noProductionCode: "Pas encore attribué",
		removed: "Retiré — récupérable",
		conflict: "Le plan a changé ailleurs. Recharge-le avant de poursuivre.",
		genericError: "L’opération a échoué. Tes données n’ont pas été remplacées.",
		producedDeleteTitle: "Retirer un épisode produit ?",
		producedDeleteDescription: "L’intention sera retirée du plan, mais l’épisode et ses fichiers seront conservés.",
		confirmRemove: "Retirer en conservant l’épisode",
		cancel: "Annuler",
		proposalConflict: "La proposition ou ses sources ont changé. Recharge ou régénère avant de poursuivre.",
		proposalAccepted: "Proposition validée et appliquée au plan.",
		status: {
			draft: "Brouillon",
			validated: "Validé",
			materialized: "Matérialisé",
			produced: "Produit",
			obsolete: "Obsolète"
		}
	},
	en: {
		eyebrow: "SEASON PLAN",
		title: "Build the season",
		description: "Reorder story intentions without renaming episodes that already exist.",
		revision: "Revision",
		loading: "Loading season plan",
		unavailable: "Season plan unavailable",
		unavailableDescription: "Reload the data. No local change will be applied.",
		reload: "Reload",
		emptyTitle: "The season is still empty",
		emptyDescription: "Add a first episode intention, then refine it before materializing it.",
		add: "Add an intention",
		adding: "Adding…",
		episode: "Episode",
		titleField: "Title",
		logline: "Promise",
		synopsis: "Synopsis",
		cliffhanger: "Cliffhanger",
		characters: "Characters (one ID per line)",
		locations: "Locations (one ID per line)",
		save: "Save",
		saving: "Saving…",
		validate: "Validate",
		duplicate: "Duplicate",
		remove: "Remove from plan",
		restore: "Restore",
		materialize: "Create episode",
		moveUp: "Move up",
		moveDown: "Move down",
		drag: "Move intention",
		advanced: "Advanced details",
		stableId: "Stable ID",
		productionCode: "Production code",
		noProductionCode: "Not assigned yet",
		removed: "Removed — recoverable",
		conflict: "The plan changed elsewhere. Reload it before continuing.",
		genericError: "The operation failed. Your data was not replaced.",
		producedDeleteTitle: "Remove a produced episode?",
		producedDeleteDescription: "The intention will leave the plan, but the episode and its files will be kept.",
		confirmRemove: "Remove and keep episode",
		cancel: "Cancel",
		proposalConflict: "The proposal or its sources changed. Reload or regenerate before continuing.",
		proposalAccepted: "Proposal validated and applied to the plan.",
		status: {
			draft: "Draft",
			validated: "Validated",
			materialized: "Materialized",
			produced: "Produced",
			obsolete: "Obsolete"
		}
	}
};
function qr(e) {
	return Kr[e];
}
//#endregion
//#region src/features/season-plan/model.ts
var Jr = {
	title: "",
	logline: "",
	synopsis: "",
	cliffhanger: "",
	character_ids: [],
	location_ids: []
}, Yr = {
	...Jr,
	hook: "",
	conflict: "",
	relationship_shift: "",
	relationship_ids: [],
	secret_id: null
};
function Xr(e) {
	return {
		title: e.title,
		logline: e.logline,
		synopsis: e.synopsis,
		cliffhanger: e.cliffhanger,
		character_ids: e.character_ids,
		location_ids: e.location_ids
	};
}
var F = {
	root: "_root_1oiy7_1",
	header: "_header_1oiy7_2",
	headerActions: "_headerActions_1oiy7_5",
	list: "_list_1oiy7_6",
	listItem: "_listItem_1oiy7_7",
	card: "_card_1oiy7_8",
	cardHeader: "_cardHeader_1oiy7_9",
	identity: "_identity_1oiy7_9",
	moveActions: "_moveActions_1oiy7_9",
	actions: "_actions_1oiy7_9",
	dragHandle: "_dragHandle_1oiy7_11",
	form: "_form_1oiy7_14",
	advanced: "_advanced_1oiy7_18",
	error: "_error_1oiy7_24",
	live: "_live_1oiy7_25",
	proposal: "_proposal_1oiy7_26",
	proposalHeader: "_proposalHeader_1oiy7_27",
	proposalMeta: "_proposalMeta_1oiy7_27",
	proposalActions: "_proposalActions_1oiy7_27",
	generate: "_generate_1oiy7_27",
	proposalEmpty: "_proposalEmpty_1oiy7_32",
	stale: "_stale_1oiy7_33",
	issues: "_issues_1oiy7_34",
	proposalList: "_proposalList_1oiy7_35",
	proposalCard: "_proposalCard_1oiy7_36",
	diff: "_diff_1oiy7_37"
}, Zr = (e) => ({
	id: e.id,
	position: e.position,
	season: e.season,
	manually_edited_fields: [...e.manually_edited_fields],
	title: e.title,
	logline: e.logline,
	synopsis: e.synopsis,
	cliffhanger: e.cliffhanger,
	hook: e.hook,
	conflict: e.conflict,
	relationship_shift: e.relationship_shift,
	relationship_ids: [...e.relationship_ids],
	secret_id: e.secret_id,
	character_ids: [...e.character_ids],
	location_ids: [...e.location_ids]
}), Qr = (e) => e.split("\n").map((e) => e.trim()).filter(Boolean);
function $r({ api: e, locale: t, onError: n, onPlanAccepted: r, onProposalChanged: i, plan: a, proposal: o }) {
	let s = t === "fr", [c, l] = (0, _.useState)(6), [u, d] = (0, _.useState)([]), [f, p] = (0, _.useState)(null), m = o !== null && o.base_plan_revision !== a.revision, h = o?.stale === !0 || m;
	(0, _.useEffect)(() => d(o?.items.map(Zr) ?? []), [o]);
	let g = async (e, t, r) => {
		p(e);
		try {
			r(await t());
		} catch (e) {
			n(e);
		} finally {
			p(null);
		}
	}, v = () => void g("generate", () => e.generateProposal({ episode_count: c }), i), y = () => {
		o && g("save", () => e.updateProposal({
			expected_revision: o.revision,
			items: u
		}), i);
	}, x = () => {
		o && !h && o.validation.valid && g("accept", async () => {
			let t = await e.updateProposal({
				expected_revision: o.revision,
				items: u
			});
			return i(t), e.acceptProposal({
				expected_revision: t.revision,
				expected_plan_revision: t.base_plan_revision
			});
		}, (e) => {
			r(e), i(null);
		});
	}, S = (e, t) => d((n) => n.map((n, r) => r === e ? {
		...n,
		...t
	} : n)), w = (e, t) => d((n) => {
		let r = e + t;
		if (r < 0 || r >= n.length) return n;
		let i = [...n], [a] = i.splice(e, 1);
		return i.splice(r, 0, a), i;
	});
	return /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-labelledby": "season-proposal-title",
		className: F.proposal,
		children: [/* @__PURE__ */ (0, b.jsxs)("header", {
			className: F.proposalHeader,
			children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [
				/* @__PURE__ */ (0, b.jsx)("small", { children: s ? "ASSISTANT IA" : "AI ASSISTANT" }),
				/* @__PURE__ */ (0, b.jsx)("h2", {
					id: "season-proposal-title",
					children: s ? "Proposition de saison" : "Season proposal"
				}),
				/* @__PURE__ */ (0, b.jsx)("p", { children: s ? "Génère un brouillon isolé, puis révise-le avant toute application au plan." : "Generate an isolated draft, then review it before applying anything to the plan." })
			] }), /* @__PURE__ */ (0, b.jsxs)("div", {
				className: F.generate,
				children: [/* @__PURE__ */ (0, b.jsxs)("label", { children: [s ? "Épisodes" : "Episodes", /* @__PURE__ */ (0, b.jsx)("input", {
					"aria-label": s ? "Nombre d’épisodes" : "Episode count",
					max: 20,
					min: 6,
					onChange: (e) => l(e.currentTarget.valueAsNumber),
					type: "number",
					value: c
				})] }), /* @__PURE__ */ (0, b.jsx)(T, {
					loading: f === "generate",
					onClick: v,
					children: o ? s ? "Régénérer" : "Regenerate" : s ? "Générer" : "Generate"
				})]
			})]
		}), o ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: F.proposalMeta,
				children: [
					/* @__PURE__ */ (0, b.jsx)(C, {
						tone: h ? "warning" : o.validation.valid ? "success" : "warning",
						children: h ? s ? "Périmée" : "Stale" : o.validation.valid ? s ? "Prête à réviser" : "Ready to review" : s ? "À corriger" : "Needs fixes"
					}),
					/* @__PURE__ */ (0, b.jsxs)("span", { children: [
						s ? "Base du plan" : "Plan baseline",
						" ",
						/* @__PURE__ */ (0, b.jsxs)("strong", { children: ["r", o.base_plan_revision] })
					] }),
					/* @__PURE__ */ (0, b.jsxs)("span", { children: [
						s ? "Modèle" : "Model",
						" ",
						/* @__PURE__ */ (0, b.jsx)("strong", { children: o.provenance.model })
					] }),
					/* @__PURE__ */ (0, b.jsxs)("span", { children: [
						s ? "Tâche" : "Task",
						" ",
						/* @__PURE__ */ (0, b.jsxs)("strong", { children: [
							o.provenance.task_id,
							"@",
							o.provenance.task_version
						] })
					] }),
					/* @__PURE__ */ (0, b.jsx)("code", {
						title: s ? "Empreinte du contexte" : "Context fingerprint",
						children: o.source_fingerprint.slice(0, 12)
					})
				]
			}),
			h ? /* @__PURE__ */ (0, b.jsx)("div", {
				className: F.stale,
				role: "alert",
				children: s ? "Le casting, les relations ou le plan ont changé. Régénère la proposition : elle ne sera pas appliquée silencieusement." : "Casting, relationships, or the plan changed. Regenerate the proposal; it will not be silently applied."
			}) : null,
			o.validation.issues.length > 0 ? /* @__PURE__ */ (0, b.jsx)("ul", {
				className: F.issues,
				children: o.validation.issues.map((e, t) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [
					/* @__PURE__ */ (0, b.jsx)("strong", { children: e.code }),
					" — ",
					e.message
				] }, `${e.code}-${e.item_id ?? t}`))
			}) : null,
			/* @__PURE__ */ (0, b.jsx)("ol", {
				className: F.proposalList,
				children: u.map((e, t) => {
					let n = a.items[t], r = !n || n.title !== e.title || n.logline !== e.logline || n.synopsis !== e.synopsis || n.cliffhanger !== e.cliffhanger;
					return /* @__PURE__ */ (0, b.jsx)("li", { children: /* @__PURE__ */ (0, b.jsxs)(ee, {
						className: F.proposalCard,
						padding: "medium",
						children: [
							/* @__PURE__ */ (0, b.jsxs)("header", {
								className: F.cardHeader,
								children: [/* @__PURE__ */ (0, b.jsxs)("div", {
									className: F.identity,
									children: [/* @__PURE__ */ (0, b.jsxs)("strong", { children: [
										s ? "Épisode" : "Episode",
										" ",
										t + 1
									] }), /* @__PURE__ */ (0, b.jsx)(C, {
										tone: n ? r ? "info" : "neutral" : "success",
										children: n ? r ? s ? "Modifié" : "Changed" : s ? "Inchangé" : "Unchanged" : s ? "Nouveau" : "New"
									})]
								}), /* @__PURE__ */ (0, b.jsxs)("div", {
									className: F.moveActions,
									children: [
										/* @__PURE__ */ (0, b.jsx)(T, {
											"aria-label": s ? "Monter la proposition" : "Move proposal up",
											disabled: t === 0,
											onClick: () => w(t, -1),
											size: "small",
											variant: "ghost",
											children: "↑"
										}),
										/* @__PURE__ */ (0, b.jsx)(T, {
											"aria-label": s ? "Descendre la proposition" : "Move proposal down",
											disabled: t === u.length - 1,
											onClick: () => w(t, 1),
											size: "small",
											variant: "ghost",
											children: "↓"
										}),
										/* @__PURE__ */ (0, b.jsx)(T, {
											"aria-label": s ? "Retirer de la proposition" : "Remove from proposal",
											onClick: () => d((e) => e.filter((e, n) => n !== t)),
											size: "small",
											variant: "danger",
											children: "×"
										})
									]
								})]
							}),
							n && r ? /* @__PURE__ */ (0, b.jsxs)("p", {
								className: F.diff,
								children: [/* @__PURE__ */ (0, b.jsxs)("span", { children: [
									s ? "Avant :" : "Before:",
									" ",
									/* @__PURE__ */ (0, b.jsx)("del", { children: n.title })
								] }), /* @__PURE__ */ (0, b.jsxs)("span", { children: [
									s ? "Après :" : "After:",
									" ",
									/* @__PURE__ */ (0, b.jsx)("ins", { children: e.title || "—" })
								] })]
							}) : null,
							/* @__PURE__ */ (0, b.jsxs)("div", {
								className: F.form,
								children: [
									/* @__PURE__ */ (0, b.jsxs)("label", { children: [s ? "Titre" : "Title", /* @__PURE__ */ (0, b.jsx)("input", {
										onChange: (e) => S(t, { title: e.currentTarget.value }),
										required: !0,
										value: e.title
									})] }),
									/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Hook", /* @__PURE__ */ (0, b.jsx)("textarea", {
										onChange: (e) => S(t, { hook: e.currentTarget.value }),
										required: !0,
										value: e.hook
									})] }),
									/* @__PURE__ */ (0, b.jsxs)("label", { children: [s ? "Conflit" : "Conflict", /* @__PURE__ */ (0, b.jsx)("textarea", {
										onChange: (e) => S(t, { conflict: e.currentTarget.value }),
										required: !0,
										value: e.conflict
									})] }),
									/* @__PURE__ */ (0, b.jsxs)("label", { children: [s ? "Bascule relationnelle" : "Relationship shift", /* @__PURE__ */ (0, b.jsx)("textarea", {
										onChange: (e) => S(t, { relationship_shift: e.currentTarget.value }),
										required: !0,
										value: e.relationship_shift
									})] }),
									/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Cliffhanger", /* @__PURE__ */ (0, b.jsx)("textarea", {
										onChange: (e) => S(t, { cliffhanger: e.currentTarget.value }),
										required: !0,
										value: e.cliffhanger
									})] }),
									/* @__PURE__ */ (0, b.jsxs)("details", {
										className: F.advanced,
										children: [
											/* @__PURE__ */ (0, b.jsx)("summary", { children: s ? "Tous les champs" : "All fields" }),
											/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Logline", /* @__PURE__ */ (0, b.jsx)("textarea", {
												onChange: (e) => S(t, { logline: e.currentTarget.value }),
												value: e.logline
											})] }),
											/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Synopsis", /* @__PURE__ */ (0, b.jsx)("textarea", {
												onChange: (e) => S(t, { synopsis: e.currentTarget.value }),
												value: e.synopsis
											})] }),
											/* @__PURE__ */ (0, b.jsxs)("label", { children: [s ? "Personnages (un ID par ligne)" : "Characters (one ID per line)", /* @__PURE__ */ (0, b.jsx)("textarea", {
												onChange: (e) => S(t, { character_ids: Qr(e.currentTarget.value) }),
												value: e.character_ids.join("\n")
											})] }),
											/* @__PURE__ */ (0, b.jsxs)("label", { children: [s ? "Lieux (un ID par ligne)" : "Locations (one ID per line)", /* @__PURE__ */ (0, b.jsx)("textarea", {
												onChange: (e) => S(t, { location_ids: Qr(e.currentTarget.value) }),
												value: e.location_ids.join("\n")
											})] }),
											/* @__PURE__ */ (0, b.jsxs)("label", { children: [s ? "Relations (un ID par ligne)" : "Relationships (one ID per line)", /* @__PURE__ */ (0, b.jsx)("textarea", {
												onChange: (e) => S(t, { relationship_ids: Qr(e.currentTarget.value) }),
												value: e.relationship_ids.join("\n")
											})] }),
											/* @__PURE__ */ (0, b.jsxs)("label", { children: [s ? "Secret éventuel" : "Optional secret", /* @__PURE__ */ (0, b.jsx)("input", {
												onChange: (e) => S(t, { secret_id: e.currentTarget.value || null }),
												value: e.secret_id ?? ""
											})] })
										]
									})
								]
							})
						]
					}) }, o.items[t]?.id ?? `new-${t}`);
				})
			}),
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: F.proposalActions,
				children: [
					/* @__PURE__ */ (0, b.jsx)(T, {
						onClick: () => d((e) => [...e, {
							...Yr,
							id: `proposal-item-local-${e.length + 1}`,
							position: e.length + 1,
							season: 1,
							manually_edited_fields: []
						}]),
						variant: "secondary",
						children: s ? "Ajouter un épisode" : "Add episode"
					}),
					/* @__PURE__ */ (0, b.jsx)(T, {
						loading: f === "save",
						onClick: y,
						variant: "secondary",
						children: s ? "Enregistrer le brouillon" : "Save draft"
					}),
					/* @__PURE__ */ (0, b.jsx)(T, {
						disabled: h || !o.validation.valid || u.length < 6 || u.length > 20,
						loading: f === "accept",
						onClick: x,
						children: s ? "Valider et appliquer au plan" : "Validate and apply to plan"
					})
				]
			})
		] }) : /* @__PURE__ */ (0, b.jsx)("p", {
			className: F.proposalEmpty,
			children: s ? "Aucune proposition active. Le plan actuel reste inchangé." : "No active proposal. The current plan remains unchanged."
		})]
	});
}
//#endregion
//#region src/features/season-plan/SeasonPlanBoard.tsx
var ei = ["season-plan"], ti = ["season-plan", "proposal"], ni = {
	draft: "neutral",
	validated: "success",
	materialized: "info",
	produced: "success",
	obsolete: "warning"
}, ri = (e) => e.split("\n").map((e) => e.trim()).filter(Boolean);
function ii({ api: e, locale: t, renderEpisodeConsequences: n }) {
	let r = qr(t), i = Bt(), a = or({
		queryKey: ei,
		queryFn: e.getPlan
	}), o = or({
		queryKey: ti,
		queryFn: e.getProposal
	}), [s, c] = (0, _.useState)(null), [l, u] = (0, _.useState)(""), [d, f] = (0, _.useState)(""), [p, m] = (0, _.useState)(null), [h, g] = (0, _.useState)(null), v = (0, _.useRef)(/* @__PURE__ */ new Map()), y = a.data, x = (e, t) => {
		i.setQueryData(ei, e), f(t), u("");
	}, S = async (e, t, n) => {
		c(e);
		try {
			x(await t(), n);
		} catch (e) {
			u(e instanceof xe && e.status === 409 ? r.conflict : r.genericError);
		} finally {
			c(null);
		}
	}, C = (e) => u(e instanceof xe && e.status === 409 ? r.proposalConflict : r.genericError), w = async (t, n) => {
		if (!y || t === n || s) return;
		let a = y.items.filter((e) => !e.deleted_at).map((e) => e.id), o = a.indexOf(t), l = a.indexOf(n);
		if (o < 0 || l < 0) return;
		let d = [...a];
		d.splice(o, 1), d.splice(l, 0, t);
		let f = y, p = y.items.filter((e) => e.deleted_at), m = {
			...y,
			items: [...d.map((e, t) => ({
				...y.items.find((t) => t.id === e),
				position: t + 1
			})), ...p]
		};
		i.setQueryData(ei, m), c(t);
		try {
			x(await e.reorder({
				expected_revision: y.revision,
				item_ids: d
			}), `${r.episode} ${l + 1}: ${m.items[l].title}`);
		} catch (e) {
			i.setQueryData(ei, f), u(e instanceof xe && e.status === 409 ? r.conflict : r.genericError);
		} finally {
			c(null), setTimeout(() => v.current.get(t)?.focus(), 0);
		}
	}, E = (e, t) => {
		if (!y) return;
		let n = y.items.findIndex((t) => t.id === e), r = y.items[n + t];
		r && w(e, r.id);
	};
	if (a.isPending) return /* @__PURE__ */ (0, b.jsx)(ge, {
		"aria-label": r.loading,
		height: "30rem",
		width: "100%"
	});
	if (a.error || !y) return /* @__PURE__ */ (0, b.jsx)(de, {
		action: /* @__PURE__ */ (0, b.jsx)(T, {
			onClick: () => a.refetch(),
			children: r.reload
		}),
		description: r.unavailableDescription,
		title: r.unavailable
	});
	let ee = () => void S("new", () => e.createItem({
		expected_revision: y.revision,
		item: Jr
	}), r.add);
	return /* @__PURE__ */ (0, b.jsxs)("div", {
		className: F.root,
		"data-season-plan-board": !0,
		children: [
			/* @__PURE__ */ (0, b.jsxs)("header", {
				className: F.header,
				children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [
					/* @__PURE__ */ (0, b.jsx)("small", { children: r.eyebrow }),
					/* @__PURE__ */ (0, b.jsx)("h1", { children: r.title }),
					/* @__PURE__ */ (0, b.jsx)("p", { children: r.description })
				] }), /* @__PURE__ */ (0, b.jsxs)("div", {
					className: F.headerActions,
					children: [/* @__PURE__ */ (0, b.jsxs)("span", { children: [
						r.revision,
						" ",
						/* @__PURE__ */ (0, b.jsx)("strong", { children: y.revision })
					] }), /* @__PURE__ */ (0, b.jsx)(T, {
						loading: s === "new",
						loadingLabel: r.adding,
						onClick: ee,
						children: r.add
					})]
				})]
			}),
			/* @__PURE__ */ (0, b.jsx)("p", {
				"aria-live": "polite",
				className: F.live,
				children: d
			}),
			l ? /* @__PURE__ */ (0, b.jsxs)("div", {
				className: F.error,
				role: "alert",
				children: [/* @__PURE__ */ (0, b.jsx)("span", { children: l }), /* @__PURE__ */ (0, b.jsx)(T, {
					onClick: () => a.refetch(),
					size: "small",
					variant: "secondary",
					children: r.reload
				})]
			}) : null,
			/* @__PURE__ */ (0, b.jsx)($r, {
				api: e,
				locale: t,
				onError: C,
				onPlanAccepted: (e) => x(e, r.proposalAccepted),
				onProposalChanged: (e) => i.setQueryData(ti, e),
				plan: y,
				proposal: o.data ?? null
			}),
			y.items.length === 0 ? /* @__PURE__ */ (0, b.jsx)(le, {
				action: /* @__PURE__ */ (0, b.jsx)(T, {
					onClick: ee,
					children: r.add
				}),
				description: r.emptyDescription,
				title: r.emptyTitle
			}) : /* @__PURE__ */ (0, b.jsx)("ol", {
				className: F.list,
				children: y.items.map((t, i) => /* @__PURE__ */ (0, b.jsx)("li", {
					className: F.listItem,
					"data-deleted": !!t.deleted_at,
					"data-season-item-id": t.id,
					onDragOver: (e) => {
						p && !t.deleted_at && e.preventDefault();
					},
					onDrop: (e) => {
						e.preventDefault(), p && w(p, t.id), m(null);
					},
					children: /* @__PURE__ */ (0, b.jsx)(ai, {
						busy: s === t.id,
						consequences: t.episode_id && n ? n(t.episode_id) : null,
						index: i,
						item: t,
						labels: r,
						moveDown: () => E(t.id, 1),
						moveUp: () => E(t.id, -1),
						onDelete: () => t.status === "produced" ? g(t) : void S(t.id, () => e.deleteItem(t.id, { expected_revision: y.revision }), r.removed),
						onDragEnd: () => m(null),
						onDragStart: (e) => {
							m(t.id), e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("text/plain", t.id);
						},
						onDuplicate: () => void S(t.id, () => e.duplicateItem(t.id, { expected_revision: y.revision }), r.duplicate),
						onMaterialize: () => void S(t.id, () => e.materializeItem(t.id, { expected_revision: y.revision }), r.materialize),
						onValidate: () => void S(t.id, () => e.validateItem(t.id, { expected_revision: y.revision }), r.validate),
						onRestore: () => void S(t.id, () => e.restoreItem(t.id, { expected_revision: y.revision }), r.restore),
						onSave: (n) => void S(t.id, () => e.updateItem(t.id, {
							expected_revision: y.revision,
							item: n
						}), r.save),
						registerHandle: (e) => {
							e ? v.current.set(t.id, e) : v.current.delete(t.id);
						},
						total: y.items.length
					})
				}, t.id))
			}),
			/* @__PURE__ */ (0, b.jsx)(se, {
				cancelLabel: r.cancel,
				confirmDisabled: s === h?.id,
				confirmLabel: r.confirmRemove,
				description: r.producedDeleteDescription,
				onConfirm: () => {
					if (!h) return;
					let t = h;
					S(t.id, () => e.deleteItem(t.id, {
						expected_revision: y.revision,
						decision: "detach_keep_episode"
					}), r.removed).then(() => g(null));
				},
				onOpenChange: (e) => {
					e || g(null);
				},
				open: h !== null,
				title: r.producedDeleteTitle
			})
		]
	});
}
function ai({ busy: e, consequences: t, index: n, item: r, labels: i, moveDown: a, moveUp: o, onDelete: s, onDragEnd: c, onDragStart: l, onDuplicate: u, onMaterialize: d, onRestore: f, onSave: p, onValidate: m, registerHandle: h, total: g }) {
	let [v, y] = (0, _.useState)(() => Xr(r));
	(0, _.useEffect)(() => y(Xr(r)), [r]);
	let x = !!r.deleted_at;
	return /* @__PURE__ */ (0, b.jsxs)(ee, {
		className: F.card,
		elevated: !0,
		padding: "medium",
		children: [
			/* @__PURE__ */ (0, b.jsxs)("header", {
				className: F.cardHeader,
				children: [/* @__PURE__ */ (0, b.jsxs)("div", {
					className: F.identity,
					children: [
						/* @__PURE__ */ (0, b.jsx)("button", {
							"aria-label": `${i.drag}: ${r.title || `${i.episode} ${n + 1}`}`,
							className: F.dragHandle,
							disabled: x || e,
							draggable: !x && !e,
							onDragEnd: c,
							onDragStart: l,
							onKeyDown: (e) => {
								e.key === "ArrowUp" && (e.preventDefault(), o()), e.key === "ArrowDown" && (e.preventDefault(), a());
							},
							ref: h,
							type: "button",
							children: "⋮⋮"
						}),
						/* @__PURE__ */ (0, b.jsxs)("strong", { children: [
							i.episode,
							" ",
							n + 1
						] }),
						/* @__PURE__ */ (0, b.jsx)(C, {
							tone: ni[r.status],
							children: i.status[r.status]
						}),
						x ? /* @__PURE__ */ (0, b.jsx)(C, {
							tone: "warning",
							children: i.removed
						}) : null
					]
				}), /* @__PURE__ */ (0, b.jsxs)("div", {
					className: F.moveActions,
					children: [/* @__PURE__ */ (0, b.jsx)(T, {
						"aria-label": `${i.moveUp}: ${r.title}`,
						disabled: x || e || n === 0,
						onClick: o,
						size: "small",
						variant: "ghost",
						children: "↑"
					}), /* @__PURE__ */ (0, b.jsx)(T, {
						"aria-label": `${i.moveDown}: ${r.title}`,
						disabled: x || e || n === g - 1,
						onClick: a,
						size: "small",
						variant: "ghost",
						children: "↓"
					})]
				})]
			}),
			/* @__PURE__ */ (0, b.jsxs)("form", {
				className: F.form,
				onSubmit: (e) => {
					e.preventDefault(), p(v);
				},
				children: [
					/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.titleField, /* @__PURE__ */ (0, b.jsx)("input", {
						disabled: x,
						onChange: (e) => y({
							...v,
							title: e.currentTarget.value
						}),
						required: !0,
						value: v.title
					})] }),
					/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.logline, /* @__PURE__ */ (0, b.jsx)("textarea", {
						disabled: x,
						onChange: (e) => y({
							...v,
							logline: e.currentTarget.value
						}),
						value: v.logline
					})] }),
					/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.synopsis, /* @__PURE__ */ (0, b.jsx)("textarea", {
						disabled: x,
						onChange: (e) => y({
							...v,
							synopsis: e.currentTarget.value
						}),
						value: v.synopsis
					})] }),
					/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.cliffhanger, /* @__PURE__ */ (0, b.jsx)("textarea", {
						disabled: x,
						onChange: (e) => y({
							...v,
							cliffhanger: e.currentTarget.value
						}),
						value: v.cliffhanger
					})] }),
					/* @__PURE__ */ (0, b.jsxs)("details", {
						className: F.advanced,
						children: [
							/* @__PURE__ */ (0, b.jsx)("summary", { children: i.advanced }),
							/* @__PURE__ */ (0, b.jsxs)("dl", { children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.stableId }), /* @__PURE__ */ (0, b.jsx)("dd", { children: /* @__PURE__ */ (0, b.jsx)("code", { children: r.id }) })] }), /* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.productionCode }), /* @__PURE__ */ (0, b.jsx)("dd", { children: /* @__PURE__ */ (0, b.jsx)("code", { children: r.episode_id ?? i.noProductionCode }) })] })] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.characters, /* @__PURE__ */ (0, b.jsx)("textarea", {
								disabled: x,
								onChange: (e) => y({
									...v,
									character_ids: ri(e.currentTarget.value)
								}),
								value: v.character_ids.join("\n")
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.locations, /* @__PURE__ */ (0, b.jsx)("textarea", {
								disabled: x,
								onChange: (e) => y({
									...v,
									location_ids: ri(e.currentTarget.value)
								}),
								value: v.location_ids.join("\n")
							})] })
						]
					}),
					/* @__PURE__ */ (0, b.jsx)("div", {
						className: F.actions,
						children: x ? /* @__PURE__ */ (0, b.jsx)(T, {
							disabled: e,
							onClick: f,
							children: i.restore
						}) : /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [
							/* @__PURE__ */ (0, b.jsx)(T, {
								loading: e,
								loadingLabel: i.saving,
								type: "submit",
								children: i.save
							}),
							r.status === "draft" ? /* @__PURE__ */ (0, b.jsx)(T, {
								disabled: e,
								onClick: m,
								variant: "secondary",
								children: i.validate
							}) : null,
							/* @__PURE__ */ (0, b.jsx)(T, {
								disabled: e,
								onClick: u,
								variant: "secondary",
								children: i.duplicate
							}),
							/* @__PURE__ */ (0, b.jsx)(T, {
								disabled: e || r.episode_id !== null || r.status !== "validated",
								onClick: d,
								variant: "secondary",
								children: i.materialize
							}),
							/* @__PURE__ */ (0, b.jsx)(T, {
								disabled: e,
								onClick: s,
								variant: "danger",
								children: i.remove
							})
						] })
					})
				]
			}),
			t
		]
	});
}
//#endregion
//#region src/features/season-plan/api.ts
var oi = (e) => e && typeof e == "object" ? e : {}, si = (e, t = "") => typeof e == "string" ? e : t, ci = (e, t = 0) => typeof e == "number" ? e : t, li = (e) => Array.isArray(e) ? e.filter((e) => typeof e == "string") : [];
function ui(e, t) {
	let n = oi(e);
	return {
		id: si(n.id, `proposal-item-${t + 1}`),
		position: ci(n.position, t + 1),
		season: ci(n.season, 1),
		title: si(n.title),
		logline: si(n.logline),
		synopsis: si(n.synopsis),
		cliffhanger: si(n.cliffhanger),
		hook: si(n.hook),
		conflict: si(n.conflict),
		relationship_shift: si(n.relationship_shift ?? n.relationship_stake),
		relationship_ids: li(n.relationship_ids),
		secret_id: typeof n.secret_id == "string" ? n.secret_id : null,
		character_ids: li(n.character_ids),
		location_ids: li(n.location_ids),
		manually_edited_fields: li(n.manually_edited_fields)
	};
}
function di(e) {
	let t = oi(e), n = oi(t.provenance), r = oi(t.validation);
	return {
		id: si(t.id, "current"),
		revision: ci(t.revision),
		base_plan_revision: ci(t.base_plan_revision),
		source_fingerprint: si(t.source_fingerprint),
		current_source_fingerprint: si(t.current_source_fingerprint),
		stale: t.stale === !0,
		provenance: {
			task_id: si(n.task_id, "unknown"),
			task_version: typeof n.task_version == "number" || typeof n.task_version == "string" ? String(n.task_version) : "unknown",
			model: si(n.model, "unknown"),
			input_fingerprint: si(n.input_fingerprint ?? t.source_fingerprint, "unknown")
		},
		validation: {
			valid: r.valid !== !1,
			issues: Array.isArray(r.issues) ? r.issues.map((e) => {
				let t = oi(e);
				return {
					code: si(t.code),
					item_id: typeof t.item_id == "string" ? t.item_id : null,
					field: typeof t.field == "string" ? t.field : null,
					message: si(t.message)
				};
			}) : []
		},
		items: Array.isArray(t.items) ? t.items.map(ui) : []
	};
}
var fi = (e) => e.map((e, t) => ({
	...e,
	position: t + 1,
	character_ids: [...e.character_ids],
	location_ids: [...e.location_ids],
	relationship_ids: [...e.relationship_ids]
}));
function pi(e) {
	return {
		revision: e.revision,
		updated_at: e.updated_at,
		items: e.items.map((e) => ({
			id: e.id,
			position: e.position ?? 0,
			title: e.title,
			logline: e.logline ?? "",
			synopsis: e.synopsis ?? "",
			cliffhanger: e.cliffhanger ?? "",
			character_ids: e.character_ids ?? [],
			location_ids: e.location_ids ?? [],
			status: e.lifecycle === "obsolete" ? "obsolete" : e.production_state === "unmaterialized" ? e.lifecycle ?? "draft" : e.production_state,
			episode_id: e.episode_id ?? null,
			deleted_at: e.deleted_at ?? null,
			provenance: e.provenance
		}))
	};
}
var mi = {
	async getPlan() {
		return pi(await bt());
	},
	async createItem(e) {
		let t = e.item;
		return pi(await St({
			expected_revision: e.expected_revision,
			season: 1,
			title: t.title || "Nouvel épisode",
			logline: t.logline || "Intention narrative à préciser.",
			synopsis: t.synopsis || "Synopsis de ce nouvel épisode à préciser dans le tableau.",
			cliffhanger: t.cliffhanger,
			character_ids: [...t.character_ids],
			location_ids: [...t.location_ids]
		}));
	},
	async updateItem(e, t) {
		return pi(await Et(e, {
			expected_revision: t.expected_revision,
			...t.item,
			character_ids: [...t.item.character_ids],
			location_ids: [...t.item.location_ids]
		}));
	},
	async validateItem(e, t) {
		return pi(await Et(e, {
			...t,
			lifecycle: "validated"
		}));
	},
	async duplicateItem(e, t) {
		return pi(await Ot(e, t));
	},
	async deleteItem(e, t) {
		return pi(await wt(e, {
			expected_revision: t.expected_revision,
			keep_produced_episode: t.decision === "detach_keep_episode"
		}));
	},
	async restoreItem(e, t) {
		return pi(await Mt(e, t));
	},
	async reorder(e) {
		return pi(await Pt({
			expected_revision: e.expected_revision,
			item_ids: [...e.item_ids]
		}));
	},
	async materializeItem(e, t) {
		return pi(await At(e, {
			...t,
			duration_target: 45
		}));
	},
	async getProposal() {
		try {
			return di(await j("/api/season-plan/proposal", { method: "GET" }));
		} catch (e) {
			if (e instanceof xe && e.status === 404) return null;
			throw e;
		}
	},
	async generateProposal(e) {
		return di(await j("/api/season-plan/proposal/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(e)
		}));
	},
	async updateProposal(e) {
		return di(await j("/api/season-plan/proposal", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				expected_revision: e.expected_revision,
				items: fi(e.items)
			})
		}));
	},
	async acceptProposal(e) {
		return pi(await j("/api/season-plan/proposal/accept", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(e)
		}));
	}
}, hi = (e) => e && typeof e == "object" ? e : {}, I = (e, t = "") => typeof e == "string" ? e : t, gi = (e, t = 0) => typeof e == "number" ? e : t, _i = (e) => Array.isArray(e) ? e : [], vi = (e) => [
	"fact",
	"knowledge",
	"secret",
	"relationship",
	"objective",
	"visual",
	"thread"
].includes(I(e)) ? I(e) : "fact", yi = (e) => [
	"blocker",
	"warning",
	"suggestion"
].includes(I(e)) ? I(e) : "warning";
function bi(e) {
	let t = hi(e), n = I(t.source_type);
	return {
		source_id: I(t.source_id ?? t.id ?? t.reference),
		source_type: [
			"episode",
			"delta",
			"bible",
			"season_plan"
		].includes(n) ? n : I(t.source) === "bible" ? "bible" : "episode",
		label: I(t.label ?? t.reference),
		excerpt: I(t.excerpt ?? t.reason)
	};
}
function xi(e, t) {
	let n = hi(e);
	return {
		id: I(n.id, `state-${t}`),
		category: vi(n.category),
		subject_id: I(n.subject_id),
		label: I(n.label),
		value: I(n.value),
		evidence: _i(n.evidence).map(bi)
	};
}
function Si(e, t) {
	let n = hi(e), r = I(n.operation);
	return {
		id: I(n.id, `change-${t}`),
		category: vi(n.category),
		operation: [
			"add",
			"update",
			"remove",
			"resolve"
		].includes(r) ? r : "update",
		subject_id: I(n.subject_id),
		label: I(n.label),
		before: typeof n.before == "string" ? n.before : null,
		after: typeof n.after == "string" ? n.after : null,
		evidence: _i(n.evidence ?? n.causes).map(bi)
	};
}
function Ci(e) {
	let t = e.entries ?? e.facts;
	if (Array.isArray(t)) return t.map(xi);
	let n = hi(e.state ?? e);
	return [
		["facts", "fact"],
		["knowledge", "knowledge"],
		["revealed_secrets", "secret"],
		["relationships", "relationship"],
		["objectives", "objective"],
		["object_states", "visual"],
		["visual_states", "visual"],
		["open_threads", "thread"],
		["resolved_threads", "thread"]
	].flatMap(([e, t]) => Object.entries(hi(n[e])).map(([n, r], i) => ({
		id: `${e}-${n}-${i}`,
		category: t,
		subject_id: n,
		label: n,
		value: typeof r == "string" ? r : JSON.stringify(r),
		evidence: []
	})));
}
function wi(e) {
	if (Array.isArray(e.changes)) return e.changes.map(Si);
	let t = hi(e.delta), n = _i(t.evidence).map(bi), r = new Map(n.map((e) => [e.source_id, e]));
	return [
		[
			"facts",
			"fact",
			"update"
		],
		[
			"knowledge",
			"knowledge",
			"add"
		],
		[
			"secrets_revealed",
			"secret",
			"add"
		],
		[
			"relationships",
			"relationship",
			"update"
		],
		[
			"objectives",
			"objective",
			"update"
		],
		[
			"object_states",
			"visual",
			"update"
		],
		[
			"visual_states",
			"visual",
			"update"
		],
		[
			"threads_opened",
			"thread",
			"add"
		],
		[
			"threads_resolved",
			"thread",
			"resolve"
		]
	].flatMap(([e, n, i]) => _i(t[e]).map((t, a) => {
		let o = hi(t), s = I(o.key ?? o.fact_id ?? o.objective_id, `${e}-${a}`), c = I(o.character_id ?? o.subject_id, s);
		return {
			id: `${e}-${c}-${s}`,
			category: n,
			operation: i,
			subject_id: c,
			label: s,
			before: null,
			after: I(o.value ?? o.description ?? o.status),
			evidence: _i(o.evidence_ids).map((e) => r.get(I(e))).filter((e) => e !== void 0)
		};
	}));
}
function Ti(e) {
	if (!e) return null;
	let t = hi(e), n = hi(t.provenance), r = I(t.status);
	return {
		id: I(t.id),
		episode_id: I(t.episode_id),
		revision: gi(t.revision),
		source_fingerprint: I(t.source_fingerprint),
		current_source_fingerprint: I(t.current_source_fingerprint ?? t.source_fingerprint),
		stale: t.stale === !0,
		status: ["approved", "refused"].includes(r) ? r : "proposed",
		changes: wi(t),
		findings: _i(t.findings).map((e) => {
			let t = hi(e);
			return {
				code: I(t.code),
				severity: yi(t.severity),
				message: I(t.message),
				cause_ids: _i(t.cause_ids).map((e) => I(e)).filter(Boolean)
			};
		}),
		provenance: {
			task_id: I(n.task_id, "continuity_delta"),
			task_version: I(n.task_version, "unknown"),
			model: I(n.model, "manual"),
			source_fingerprint: I(n.source_fingerprint ?? t.source_fingerprint)
		}
	};
}
function Ei(e) {
	let t = hi(e), n = _i(t.causes).map((e) => hi(e)), r = _i(t.changed_fields).map((e) => I(e)).filter(Boolean);
	return {
		season_item_id: I(t.season_item_id),
		episode_id: typeof t.episode_id == "string" ? t.episode_id : null,
		title: I(t.title, I(t.season_item_id)),
		severity: yi(t.severity),
		reasons: _i(t.reasons).map((e) => I(e)).filter(Boolean).concat(r.length ? [`Changed: ${r.join(", ")}`] : [], n.map((e) => `${I(e.type, "cause")}: ${I(e.id)}`)),
		evidence: _i(t.evidence).map(bi).concat(n.map((e) => ({
			source_id: I(e.id),
			source_type: "delta",
			label: I(e.type, "cause"),
			excerpt: ""
		})))
	};
}
function Di(e) {
	let t = hi(e), n = I(t.trigger ?? hi(t.cause).type);
	return {
		trigger: n.includes("reorder") ? "reorder" : n === "source_edit" ? "source_edit" : "delta",
		generated_at: I(t.generated_at),
		affected_items: _i(t.affected_items ?? t.items).map(Ei)
	};
}
function Oi(e) {
	let t = hi(e), n = hi(t.input_state ?? t.state_before), r = t.impact_report ? hi(t.impact_report) : null, i = Ti(t.proposal), a = I(t.current_source_fingerprint ?? t.source_fingerprint);
	return {
		episode_id: I(t.episode_id),
		revision: gi(t.revision),
		source_fingerprint: a,
		input_state: {
			revision: gi(n.revision ?? t.revision),
			before_episode_id: I(n.before_episode_id ?? t.episode_id),
			entries: Ci(n)
		},
		proposal: i ? {
			...i,
			current_source_fingerprint: i.current_source_fingerprint || a
		} : null,
		impact_report: r ? Di(r) : null
	};
}
var ki = (e) => `/api/continuity/episodes/${encodeURIComponent(e)}`, Ai = (e, t) => j(e, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: t === void 0 ? void 0 : JSON.stringify(t)
}), ji = {
	async getEpisodeContinuity(e) {
		let [t, n] = await Promise.all([j(ki(e), { method: "GET" }), j(`/api/continuity/impact?episode_id=${encodeURIComponent(e)}`, { method: "GET" })]);
		return Oi({
			...hi(t),
			impact_report: n
		});
	},
	async generateDelta(e) {
		return Oi(await Ai(`${ki(e)}/proposal/generate`));
	},
	async approveDelta(e, t, n) {
		return Oi(await Ai(`${ki(e)}/proposals/${encodeURIComponent(t)}/approve`, n));
	},
	async refuseDelta(e, t, n) {
		return Oi(await Ai(`${ki(e)}/proposals/${encodeURIComponent(t)}/refuse`, n));
	},
	async previewReorder(e) {
		return Di(await Ai("/api/continuity/impact/reorder", {
			expected_plan_revision: e.expected_plan_revision,
			item_ids: [...e.item_ids]
		}));
	}
}, Mi = {
	root: "_root_hin28_1",
	header: "_header_hin28_2",
	columns: "_columns_hin28_4",
	impact: "_impact_hin28_5",
	entries: "_entries_hin28_7",
	changes: "_changes_hin28_7",
	provenance: "_provenance_hin28_9",
	diff: "_diff_hin28_10",
	evidence: "_evidence_hin28_13",
	decisions: "_decisions_hin28_17",
	stale: "_stale_hin28_21",
	notice: "_notice_hin28_21"
}, Ni = {
	blocker: "warning",
	warning: "info",
	suggestion: "neutral"
};
function Pi({ evidence: e, fr: t }) {
	return e.length === 0 ? null : /* @__PURE__ */ (0, b.jsxs)("details", {
		className: Mi.evidence,
		children: [/* @__PURE__ */ (0, b.jsxs)("summary", { children: [
			t ? "Preuves et causes" : "Evidence and causes",
			" (",
			e.length,
			")"
		] }), /* @__PURE__ */ (0, b.jsx)("ul", { children: e.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [
			/* @__PURE__ */ (0, b.jsx)("strong", { children: e.label || e.source_id }),
			e.excerpt ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [" — ", /* @__PURE__ */ (0, b.jsx)("q", { children: e.excerpt })] }) : null,
			/* @__PURE__ */ (0, b.jsxs)("small", { children: [
				e.source_type,
				" · ",
				e.source_id
			] })
		] }, `${e.source_type}-${e.source_id}-${e.label}-${e.excerpt}`)) })]
	});
}
function Fi({ api: e, episodeId: t, locale: n = "fr" }) {
	let r = n === "fr", i = Bt(), a = ["continuity", t], o = or({
		queryKey: a,
		queryFn: () => e.getEpisodeContinuity(t)
	}), [s, c] = (0, _.useState)(null), [l, u] = (0, _.useState)(""), [d, f] = (0, _.useState)(""), [p, m] = (0, _.useState)(!1), h = o.data, g = h?.proposal, v = p || g?.stale === !0 || !!(g && g.source_fingerprint !== g.current_source_fingerprint), y = async (e, t, n) => {
		c(e);
		try {
			i.setQueryData(a, await t()), f(n), m(!1);
		} catch (e) {
			e instanceof xe && e.status === 409 ? (m(!0), f(r ? "La source a changé. Réévalue les conséquences avant toute approbation." : "The source changed. Re-evaluate consequences before approval.")) : f(r ? "L’opération a échoué sans modifier le canon." : "The operation failed without changing canon.");
		} finally {
			c(null);
		}
	};
	return o.isPending ? /* @__PURE__ */ (0, b.jsx)(ge, {
		"aria-label": r ? "Chargement des conséquences" : "Loading consequences",
		height: "20rem",
		width: "100%"
	}) : o.error || !h ? /* @__PURE__ */ (0, b.jsx)(de, {
		action: /* @__PURE__ */ (0, b.jsx)(T, {
			onClick: () => o.refetch(),
			children: r ? "Recharger" : "Reload"
		}),
		description: r ? "Aucune conséquence n’a été appliquée." : "No consequence was applied.",
		title: r ? "Continuité indisponible" : "Continuity unavailable"
	}) : /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-labelledby": `consequences-${t}`,
		className: Mi.root,
		children: [
			/* @__PURE__ */ (0, b.jsxs)("header", {
				className: Mi.header,
				children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [
					/* @__PURE__ */ (0, b.jsx)("small", { children: r ? "CONTINUITÉ CANONIQUE" : "CANON CONTINUITY" }),
					/* @__PURE__ */ (0, b.jsx)("h2", {
						id: `consequences-${t}`,
						children: r ? "Conséquences de l’épisode" : "Episode consequences"
					}),
					/* @__PURE__ */ (0, b.jsxs)("p", { children: [
						t,
						" · ",
						r ? "état révision" : "state revision",
						" ",
						h.input_state.revision
					] })
				] }), /* @__PURE__ */ (0, b.jsx)(T, {
					loading: s === "generate",
					onClick: () => void y("generate", () => e.generateDelta(t), r ? "Nouvelle proposition prête à examiner." : "New proposal ready for review."),
					children: g ? r ? "Réévaluer" : "Re-evaluate" : r ? "Proposer un delta" : "Propose delta"
				})]
			}),
			d ? /* @__PURE__ */ (0, b.jsx)("p", {
				"aria-live": "polite",
				className: v ? Mi.stale : Mi.notice,
				role: v ? "alert" : void 0,
				children: d
			}) : null,
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: Mi.columns,
				children: [/* @__PURE__ */ (0, b.jsxs)("section", {
					"aria-labelledby": `input-state-${t}`,
					children: [/* @__PURE__ */ (0, b.jsx)("h3", {
						id: `input-state-${t}`,
						children: r ? "État d’entrée" : "Input state"
					}), h.input_state.entries.length === 0 ? /* @__PURE__ */ (0, b.jsx)("p", { children: r ? "Aucun fait canonique avant cet épisode." : "No canonical fact before this episode." }) : /* @__PURE__ */ (0, b.jsx)("ul", {
						className: Mi.entries,
						children: h.input_state.entries.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [
							/* @__PURE__ */ (0, b.jsx)(C, {
								tone: "neutral",
								children: e.category
							}),
							/* @__PURE__ */ (0, b.jsx)("strong", { children: e.label }),
							/* @__PURE__ */ (0, b.jsx)("span", { children: e.value }),
							/* @__PURE__ */ (0, b.jsx)(Pi, {
								evidence: e.evidence,
								fr: r
							})
						] }, e.id))
					})]
				}), /* @__PURE__ */ (0, b.jsxs)("section", {
					"aria-labelledby": `delta-${t}`,
					children: [/* @__PURE__ */ (0, b.jsx)("h3", {
						id: `delta-${t}`,
						children: r ? "Delta proposé — non appliqué" : "Proposed delta — not applied"
					}), g ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [
						/* @__PURE__ */ (0, b.jsxs)("div", {
							className: Mi.provenance,
							children: [
								/* @__PURE__ */ (0, b.jsx)(C, {
									tone: g.status === "approved" ? "success" : v ? "warning" : "info",
									children: v ? r ? "Périmé" : "Stale" : g.status
								}),
								/* @__PURE__ */ (0, b.jsx)("span", { children: g.provenance.model }),
								/* @__PURE__ */ (0, b.jsxs)("code", { children: [
									g.provenance.task_id,
									"@",
									g.provenance.task_version
								] }),
								/* @__PURE__ */ (0, b.jsx)("code", { children: g.provenance.source_fingerprint.slice(0, 12) })
							]
						}),
						v ? /* @__PURE__ */ (0, b.jsx)("p", {
							className: Mi.stale,
							role: "alert",
							children: r ? "Cette proposition ne correspond plus à sa source et ne peut pas être approuvée." : "This proposal no longer matches its source and cannot be approved."
						}) : null,
						g.findings && g.findings.length > 0 ? /* @__PURE__ */ (0, b.jsx)("ul", {
							className: Mi.changes,
							children: g.findings.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [/* @__PURE__ */ (0, b.jsxs)("header", { children: [/* @__PURE__ */ (0, b.jsx)(C, {
								tone: Ni[e.severity],
								children: e.severity
							}), /* @__PURE__ */ (0, b.jsx)("strong", { children: e.code })] }), /* @__PURE__ */ (0, b.jsx)("p", { children: e.message })] }, e.code))
						}) : null,
						/* @__PURE__ */ (0, b.jsx)("ul", {
							className: Mi.changes,
							children: g.changes.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [
								/* @__PURE__ */ (0, b.jsxs)("header", { children: [
									/* @__PURE__ */ (0, b.jsx)(C, {
										tone: "info",
										children: e.category
									}),
									/* @__PURE__ */ (0, b.jsx)("strong", { children: e.label }),
									/* @__PURE__ */ (0, b.jsx)("small", { children: e.operation })
								] }),
								/* @__PURE__ */ (0, b.jsxs)("div", {
									className: Mi.diff,
									children: [
										e.before === null ? null : /* @__PURE__ */ (0, b.jsx)("del", { children: e.before }),
										/* @__PURE__ */ (0, b.jsx)("span", {
											"aria-hidden": "true",
											children: "→"
										}),
										e.after === null ? /* @__PURE__ */ (0, b.jsx)("em", { children: "∅" }) : /* @__PURE__ */ (0, b.jsx)("ins", { children: e.after })
									]
								}),
								/* @__PURE__ */ (0, b.jsx)(Pi, {
									evidence: e.evidence,
									fr: r
								})
							] }, e.id))
						}),
						g.status === "proposed" ? /* @__PURE__ */ (0, b.jsxs)("div", {
							className: Mi.decisions,
							children: [/* @__PURE__ */ (0, b.jsxs)("label", { children: [r ? "Motif du refus" : "Refusal reason", /* @__PURE__ */ (0, b.jsx)("textarea", {
								onChange: (e) => u(e.currentTarget.value),
								required: !0,
								value: l
							})] }), /* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)(T, {
								disabled: !l.trim(),
								loading: s === "refuse",
								onClick: () => void y("refuse", () => e.refuseDelta(t, g.id, {
									expected_revision: h.revision,
									reason: l.trim()
								}), r ? "Delta refusé. Le canon reste inchangé." : "Delta refused. Canon remains unchanged."),
								variant: "danger",
								children: r ? "Refuser sans appliquer" : "Refuse without applying"
							}), /* @__PURE__ */ (0, b.jsx)(T, {
								disabled: v || g.changes.length === 0,
								loading: s === "approve",
								onClick: () => void y("approve", () => e.approveDelta(t, g.id, {
									expected_revision: h.revision,
									expected_source_fingerprint: g.current_source_fingerprint
								}), r ? "Delta approuvé et appliqué au canon." : "Delta approved and applied to canon."),
								children: r ? "Approuver et appliquer" : "Approve and apply"
							})] })]
						}) : null
					] }) : /* @__PURE__ */ (0, b.jsx)(le, {
						description: r ? "Génère ou saisis une proposition. Le canon reste inchangé jusqu’à une approbation distincte." : "Generate or enter a proposal. Canon remains unchanged until separate approval.",
						title: r ? "Aucune proposition" : "No proposal"
					})]
				})]
			}),
			h.impact_report ? /* @__PURE__ */ (0, b.jsxs)("section", {
				"aria-labelledby": `impact-${t}`,
				className: Mi.impact,
				children: [/* @__PURE__ */ (0, b.jsx)("h3", {
					id: `impact-${t}`,
					children: h.impact_report.trigger === "reorder" ? r ? "Rapport d’impact du réordonnancement" : "Reorder impact report" : r ? "Rapport d’impact" : "Impact report"
				}), h.impact_report.affected_items.length === 0 ? /* @__PURE__ */ (0, b.jsx)("p", { children: r ? "Aucun item suivant affecté." : "No following item affected." }) : /* @__PURE__ */ (0, b.jsx)("ol", { children: h.impact_report.affected_items.map((e) => /* @__PURE__ */ (0, b.jsx)("li", { children: /* @__PURE__ */ (0, b.jsxs)(ee, {
					padding: "small",
					children: [
						/* @__PURE__ */ (0, b.jsxs)("header", { children: [/* @__PURE__ */ (0, b.jsx)(C, {
							tone: Ni[e.severity],
							children: e.severity
						}), /* @__PURE__ */ (0, b.jsx)("strong", { children: e.title })] }),
						/* @__PURE__ */ (0, b.jsx)("ul", { children: e.reasons.map((e) => /* @__PURE__ */ (0, b.jsx)("li", { children: e }, e)) }),
						/* @__PURE__ */ (0, b.jsx)(Pi, {
							evidence: e.evidence,
							fr: r
						})
					]
				}) }, e.season_item_id)) })]
			}) : null
		]
	});
}
//#endregion
//#region src/features/index.ts
var L = [Or, Er], R = (0, _.createContext)(null);
function Ii({ children: e, value: t }) {
	return /* @__PURE__ */ (0, b.jsx)(R.Provider, {
		value: t,
		children: e
	});
}
function Li() {
	let e = (0, _.useContext)(R);
	if (!e) throw Error("JourneyContext is missing");
	return e;
}
var Ri = {
	root: "_root_5xljp_1",
	hero: "_hero_5xljp_2",
	stage: "_stage_5xljp_3",
	stepper: "_stepper_5xljp_5",
	examplePicker: "_examplePicker_5xljp_12",
	exampleControls: "_exampleControls_5xljp_15",
	form: "_form_5xljp_18",
	actions: "_actions_5xljp_23",
	cards: "_cards_5xljp_24",
	statusCard: "_statusCard_5xljp_25",
	reviewGrid: "_reviewGrid_5xljp_26",
	error: "_error_5xljp_28"
};
//#endregion
//#region src/features/guided-journey/JourneyStepper.tsx
function zi({ stages: e, labels: t, navigationLabel: n }) {
	let r = Li();
	return /* @__PURE__ */ (0, b.jsx)("nav", {
		"aria-label": n,
		className: Ri.stepper,
		children: e.map((e, n) => /* @__PURE__ */ (0, b.jsxs)("button", {
			"aria-current": e.id === r.activeStage ? "step" : void 0,
			"data-status": e.status,
			onClick: () => r.selectStage(e.id),
			type: "button",
			children: [
				/* @__PURE__ */ (0, b.jsx)("span", { children: String(n + 1).padStart(2, "0") }),
				/* @__PURE__ */ (0, b.jsx)("strong", { children: t[e.id] }),
				/* @__PURE__ */ (0, b.jsx)("small", { children: e.status })
			]
		}, e.id))
	});
}
//#endregion
//#region src/features/guided-journey/model.ts
function Bi(e) {
	return typeof e == "object" && e && !Array.isArray(e) ? e : {};
}
function Vi(e) {
	return typeof e == "string" ? e : "";
}
function Hi(e) {
	return Array.isArray(e) ? e.filter((e) => typeof e == "string") : [];
}
function Ui(e) {
	let t = Bi(e), n = Bi(t.state), r = Bi(n.brief), i = Array.isArray(t.proposals) ? t.proposals : [], a = Bi(t.completion), o = Array.isArray(a.characters) ? a.characters.reduce((e, t) => {
		let n = Bi(t);
		return typeof n.id == "string" && (e[n.id] = {
			ready: n.ready === !0,
			promoted: n.promoted === !0,
			missing: Hi(n.missing)
		}), e;
	}, {}) : {};
	return {
		revision: typeof n.revision == "number" ? n.revision : 0,
		activeEpisodeId: typeof n.active_episode_id == "string" ? n.active_episode_id : null,
		brief: {
			working_title: Vi(r.working_title),
			idea: Vi(r.idea),
			genre: Vi(r.genre),
			tone: Vi(r.tone),
			audience: Vi(r.audience),
			language: Vi(r.language) || "fr",
			episode_title: Vi(r.episode_title),
			episode_concept: Vi(r.episode_concept),
			...typeof r.source_example_id == "string" ? { source_example_id: r.source_example_id } : {},
			learning_goals: Hi(r.learning_goals),
			continuity_notes: Hi(r.continuity_notes),
			locked_fields: Hi(r.locked_fields)
		},
		characters: Array.isArray(n.characters) ? n.characters.map((e) => Bi(e)) : [],
		canonicalCharacters: Array.isArray(t.canonical_characters) ? t.canonical_characters.flatMap((e) => {
			let t = Bi(e);
			return typeof t.id == "string" ? [{
				id: t.id,
				name: Vi(t.name) || t.id,
				role: Vi(t.role),
				visualDescription: Vi(t.visual_description),
				wardrobe: Vi(t.wardrobe)
			}] : [];
		}) : [],
		characterCompletion: o,
		generationLicenses: Array.isArray(t.generation_licenses) ? t.generation_licenses.flatMap((e) => {
			let t = Bi(e);
			return typeof t.id == "string" ? [{
				id: t.id,
				name: Vi(t.name),
				url: Vi(t.url),
				summary: Vi(t.summary),
				commercialUse: Vi(t.commercial_use)
			}] : [];
		}) : [],
		proposals: i.flatMap((e) => {
			let t = Bi(e), n = t.status;
			return typeof t.id != "string" || typeof t.target != "string" || typeof t.base_revision != "number" || n !== "candidate" && n !== "accepted" && n !== "rejected" ? [] : [{
				id: t.id,
				target: t.target,
				baseRevision: t.base_revision,
				before: Bi(t.before),
				after: Bi(t.after),
				model: Vi(t.model),
				status: n
			}];
		})
	};
}
function Wi(e) {
	let t = e.stages.find((e) => !["approved", "completed"].includes(e.status)) ?? e.stages.at(-1);
	if (!t) throw Error("Studio journey contains no stages");
	return t;
}
//#endregion
//#region src/features/guided-journey/ProposalReviewDrawer.tsx
function Gi({ proposal: e, busy: t, onAccept: n, onClose: r, onReject: i }) {
	let [a, o] = (0, _.useState)("");
	if (!e) return null;
	let s = a || JSON.stringify(e.after, null, 2);
	return /* @__PURE__ */ (0, b.jsxs)(k, {
		open: !0,
		onOpenChange: (e) => {
			e || r();
		},
		title: "Proposition — non appliquée",
		children: [
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: Ri.reviewGrid,
				children: [/* @__PURE__ */ (0, b.jsxs)("section", { children: [/* @__PURE__ */ (0, b.jsx)("h3", { children: "Avant" }), /* @__PURE__ */ (0, b.jsx)("pre", { children: JSON.stringify(e.before, null, 2) })] }), /* @__PURE__ */ (0, b.jsxs)("section", { children: [/* @__PURE__ */ (0, b.jsx)("h3", { children: "Après — modifiable" }), /* @__PURE__ */ (0, b.jsx)("textarea", {
					"aria-label": "Proposition modifiable",
					onChange: (e) => o(e.currentTarget.value),
					value: s
				})] })]
			}),
			/* @__PURE__ */ (0, b.jsxs)("p", { children: ["Modèle : ", e.model] }),
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: Ri.actions,
				children: [/* @__PURE__ */ (0, b.jsx)(T, {
					disabled: t,
					onClick: i,
					variant: "ghost",
					children: "Refuser"
				}), /* @__PURE__ */ (0, b.jsx)(T, {
					disabled: t,
					onClick: () => n(JSON.parse(s)),
					children: "Appliquer mes modifications"
				})]
			})
		]
	});
}
//#endregion
//#region src/features/casting/castingApi.ts
var Ki = () => j("/api/casting", { method: "GET" });
function qi(e, t, n) {
	let r = new URLSearchParams({
		expected_revision: String(t),
		kind: n.kind,
		permanent_identity: n.permanentIdentity,
		outfit: n.outfit,
		transient_state: n.transientState,
		license: n.license,
		source_label: n.file.name
	});
	return j(`/api/casting/${encodeURIComponent(e)}/variants/import?${r}`, {
		method: "POST",
		body: n.file,
		headers: { "Content-Type": n.file.type }
	});
}
function Ji(e, t) {
	return j(`/api/casting/${encodeURIComponent(e)}/variants/generate`, {
		method: "POST",
		body: JSON.stringify(t),
		headers: { "Content-Type": "application/json" }
	});
}
function Yi(e, t, n, r) {
	return j(`/api/casting/${encodeURIComponent(t)}/variants/${encodeURIComponent(n)}/${e}`, {
		method: "POST",
		body: JSON.stringify({ expected_revision: r }),
		headers: { "Content-Type": "application/json" }
	});
}
var Xi = {
	root: "_root_kneqk_1",
	forms: "_forms_kneqk_7",
	grid: "_grid_kneqk_11",
	compared: "_compared_kneqk_13",
	meta: "_meta_kneqk_14",
	actions: "_actions_kneqk_14",
	error: "_error_kneqk_18",
	notice: "_notice_kneqk_19"
}, Zi = {
	fr: {
		title: "Identités visuelles maîtres",
		intro: "Compare plusieurs pistes. Rien ne devient canonique sans ton approbation.",
		noCharacter: "Ajoute d’abord un personnage au casting.",
		import: "Importer une apparence",
		generate: "Générer une apparence",
		approve: "Approuver comme maître",
		restore: "Restaurer comme maître",
		reject: "Rejeter",
		compare: "Comparer",
		empty: "Aucune apparence pour ce personnage.",
		permanent: "Identité permanente",
		outfit: "Tenue",
		transient: "État transitoire",
		source: "Provenance",
		affected: "Le changement affecte",
		advanced: "Réglages techniques avancés",
		rights: "Je confirme disposer des droits correspondant à la licence indiquée.",
		packRights: "J’ai consulté les licences du pack actif."
	},
	en: {
		title: "Master visual identities",
		intro: "Compare several directions. Nothing becomes canonical without your approval.",
		noCharacter: "Add a cast member first.",
		import: "Import an appearance",
		generate: "Generate an appearance",
		approve: "Approve as master",
		restore: "Restore as master",
		reject: "Reject",
		compare: "Compare",
		empty: "No appearance for this character.",
		permanent: "Permanent identity",
		outfit: "Outfit",
		transient: "Transient state",
		source: "Provenance",
		affected: "This change affects",
		advanced: "Advanced technical settings",
		rights: "I confirm that I hold the rights covered by the stated license.",
		packRights: "I reviewed the active pack licenses."
	}
};
function Qi(e) {
	return [
		e.provenance.source_label,
		e.provenance.model,
		e.provenance.workflow,
		e.provenance.seed === null ? null : `seed ${e.provenance.seed}`,
		e.provenance.revision,
		e.provenance.license
	].filter(Boolean).join(" · ");
}
function $i({ characters: e, generationLicenses: t = [], locale: n, projectId: r }) {
	let i = Zi[n], a = Bt(), o = or({
		queryKey: ["casting", r],
		queryFn: Ki,
		enabled: e.length > 0
	}), [s, c] = (0, _.useState)(e[0]?.id ?? ""), [l, u] = (0, _.useState)([]), [d, f] = (0, _.useState)(""), [p, m] = (0, _.useState)("");
	(0, _.useEffect)(() => {
		e.some((e) => e.id === s) || (c(e[0]?.id ?? ""), u([]));
	}, [s, e]);
	let h = (0, _.useMemo)(() => o.data?.characters.find((e) => e.character_id === s), [s, o.data]), g = e.find((e) => e.id === s), v = async () => a.invalidateQueries({ queryKey: ["casting", r] }), y = cr({
		mutationFn: async (e) => e(),
		onSuccess: async (e) => {
			let t = e.affected;
			f(t ? `${i.affected} ${t.shot_ids.length} plan(s), ${t.rendered_shot_ids.length} rendu(s). Aucune régénération lancée.` : ""), m(""), await v();
		},
		onError: (e) => m(e instanceof Error ? e.message : "Operation failed")
	});
	if (e.length === 0) return /* @__PURE__ */ (0, b.jsx)(le, {
		title: i.title,
		description: i.noCharacter
	});
	if (o.isPending) return /* @__PURE__ */ (0, b.jsx)(ge, {
		"aria-label": i.title,
		height: "28rem",
		width: "100%"
	});
	if (o.error || !o.data) return /* @__PURE__ */ (0, b.jsx)(de, {
		title: i.title,
		description: o.error?.message ?? "Unavailable"
	});
	let x = (e) => u((t) => t.includes(e) ? t.filter((t) => t !== e) : [...t.slice(-1), e]), S = (e) => {
		e.preventDefault();
		let t = new FormData(e.currentTarget), n = t.get("file");
		if (!(n instanceof File) || n.size === 0) {
			m("Select an image");
			return;
		}
		y.mutate(() => qi(s, o.data.revision, {
			file: n,
			kind: String(t.get("kind")),
			permanentIdentity: String(t.get("permanent_identity")),
			outfit: String(t.get("outfit")),
			transientState: String(t.get("transient_state")),
			license: String(t.get("license"))
		}));
	}, w = (e) => {
		e.preventDefault();
		let t = new FormData(e.currentTarget);
		y.mutate(() => Ji(s, {
			expected_revision: o.data.revision,
			kind: String(t.get("kind")),
			permanent_identity: String(t.get("permanent_identity")),
			outfit: String(t.get("outfit")),
			transient_state: String(t.get("transient_state")),
			prompt: String(t.get("prompt")),
			model: String(t.get("model") || "") || void 0,
			workflow: String(t.get("workflow") || "") || void 0,
			seed: Number(t.get("seed")),
			license: String(t.get("license"))
		}));
	}, E = (e = !1) => /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [
		/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.permanent, /* @__PURE__ */ (0, b.jsx)("textarea", {
			defaultValue: g?.visualDescription,
			minLength: 10,
			name: "permanent_identity",
			required: !0
		})] }),
		/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.outfit, /* @__PURE__ */ (0, b.jsx)("input", {
			defaultValue: g?.wardrobe,
			name: "outfit"
		})] }),
		/* @__PURE__ */ (0, b.jsxs)("label", { children: [i.transient, /* @__PURE__ */ (0, b.jsx)("input", { name: "transient_state" })] }),
		/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Type", /* @__PURE__ */ (0, b.jsxs)("select", {
			name: "kind",
			children: [
				/* @__PURE__ */ (0, b.jsx)("option", {
					value: "portrait",
					children: "Portrait"
				}),
				/* @__PURE__ */ (0, b.jsx)("option", {
					value: "full_body",
					children: "Full body"
				}),
				/* @__PURE__ */ (0, b.jsx)("option", {
					value: "expression",
					children: "Expression"
				})
			]
		})] }),
		e ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [
			/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Prompt", /* @__PURE__ */ (0, b.jsx)("textarea", {
				defaultValue: [
					g?.name,
					g?.visualDescription,
					g?.wardrobe
				].filter(Boolean).join(", "),
				minLength: 10,
				name: "prompt",
				required: !0
			})] }),
			t.length ? /* @__PURE__ */ (0, b.jsxs)("aside", { children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: "Licences du pack actif" }), /* @__PURE__ */ (0, b.jsx)("ul", { children: t.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [
				/* @__PURE__ */ (0, b.jsx)("a", {
					href: e.url,
					rel: "noreferrer",
					target: "_blank",
					children: e.name
				}),
				" · ",
				e.summary,
				" · ",
				e.commercialUse
			] }, e.id)) })] }) : null,
			/* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
				name: "pack_licenses_confirmed",
				required: !0,
				type: "checkbox"
			}), i.packRights] }),
			/* @__PURE__ */ (0, b.jsxs)("details", { children: [
				/* @__PURE__ */ (0, b.jsx)("summary", { children: i.advanced }),
				/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Model", /* @__PURE__ */ (0, b.jsx)("input", {
					name: "model",
					placeholder: "Détecté depuis le workflow actif"
				})] }),
				/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Workflow", /* @__PURE__ */ (0, b.jsx)("input", {
					name: "workflow",
					placeholder: "Profil keyframe actif"
				})] }),
				/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Seed", /* @__PURE__ */ (0, b.jsx)("input", {
					defaultValue: "42",
					min: "0",
					name: "seed",
					required: !0,
					type: "number"
				})] })
			] })
		] }) : /* @__PURE__ */ (0, b.jsxs)("label", { children: ["Image", /* @__PURE__ */ (0, b.jsx)("input", {
			accept: "image/png,image/jpeg,image/webp",
			name: "file",
			required: !0,
			type: "file"
		})] }),
		/* @__PURE__ */ (0, b.jsxs)("label", { children: ["License", /* @__PURE__ */ (0, b.jsx)("input", {
			name: "license",
			required: !0
		})] }),
		/* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
			name: "rights_confirmed",
			required: !0,
			type: "checkbox"
		}), i.rights] })
	] });
	return /* @__PURE__ */ (0, b.jsxs)("section", {
		className: Xi.root,
		"data-casting-board": !0,
		children: [
			/* @__PURE__ */ (0, b.jsxs)("header", { children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("h2", { children: i.title }), /* @__PURE__ */ (0, b.jsx)("p", { children: i.intro })] }), /* @__PURE__ */ (0, b.jsxs)("label", { children: ["Character", /* @__PURE__ */ (0, b.jsx)("select", {
				"aria-label": "Character",
				onChange: (e) => {
					c(e.currentTarget.value), u([]);
				},
				value: s,
				children: e.map((e) => /* @__PURE__ */ (0, b.jsx)("option", {
					value: e.id,
					children: e.name
				}, e.id))
			})] })] }),
			p ? /* @__PURE__ */ (0, b.jsx)("p", {
				className: Xi.error,
				role: "alert",
				children: p
			}) : null,
			d ? /* @__PURE__ */ (0, b.jsx)("p", {
				className: Xi.notice,
				role: "status",
				children: d
			}) : null,
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: Xi.forms,
				children: [/* @__PURE__ */ (0, b.jsxs)("details", { children: [/* @__PURE__ */ (0, b.jsx)("summary", { children: i.import }), /* @__PURE__ */ (0, b.jsxs)("form", {
					onSubmit: S,
					children: [E(), /* @__PURE__ */ (0, b.jsx)(T, {
						loading: y.isPending,
						type: "submit",
						children: i.import
					})]
				}, `import-${s}`)] }), /* @__PURE__ */ (0, b.jsxs)("details", { children: [/* @__PURE__ */ (0, b.jsx)("summary", { children: i.generate }), /* @__PURE__ */ (0, b.jsxs)("form", {
					onSubmit: w,
					children: [E(!0), /* @__PURE__ */ (0, b.jsx)(T, {
						loading: y.isPending,
						type: "submit",
						children: i.generate
					})]
				}, `generate-${s}`)] })]
			}),
			!h || h.variants.length === 0 ? /* @__PURE__ */ (0, b.jsx)(le, { title: i.empty }) : /* @__PURE__ */ (0, b.jsx)("div", {
				className: Xi.grid,
				children: h.variants.map((e) => {
					let t = h.active_master_id === e.id;
					return /* @__PURE__ */ (0, b.jsxs)(ee, {
						className: l.includes(e.id) ? Xi.compared : "",
						children: [
							/* @__PURE__ */ (0, b.jsx)(A, {
								aspectRatio: e.kind === "portrait" ? "4 / 5" : "2 / 3",
								children: /* @__PURE__ */ (0, b.jsx)("img", {
									alt: `${e.kind} ${e.status}`,
									src: e.media_url
								})
							}),
							/* @__PURE__ */ (0, b.jsxs)("div", {
								className: Xi.meta,
								children: [/* @__PURE__ */ (0, b.jsx)(C, {
									tone: t ? "success" : e.status === "rejected" ? "danger" : "neutral",
									children: t ? "MASTER" : e.status
								}), /* @__PURE__ */ (0, b.jsx)("strong", { children: e.kind })]
							}),
							/* @__PURE__ */ (0, b.jsxs)("dl", { children: [
								/* @__PURE__ */ (0, b.jsx)("dt", { children: i.permanent }),
								/* @__PURE__ */ (0, b.jsx)("dd", { children: e.permanent_identity }),
								e.outfit ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.outfit }), /* @__PURE__ */ (0, b.jsx)("dd", { children: e.outfit })] }) : null,
								e.transient_state ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.transient }), /* @__PURE__ */ (0, b.jsx)("dd", { children: e.transient_state })] }) : null,
								/* @__PURE__ */ (0, b.jsx)("dt", { children: i.source }),
								/* @__PURE__ */ (0, b.jsx)("dd", { children: Qi(e) })
							] }),
							/* @__PURE__ */ (0, b.jsxs)("div", {
								className: Xi.actions,
								children: [
									/* @__PURE__ */ (0, b.jsx)(T, {
										"aria-pressed": l.includes(e.id),
										onClick: () => x(e.id),
										variant: "ghost",
										children: i.compare
									}),
									!t && e.status !== "rejected" ? /* @__PURE__ */ (0, b.jsx)(T, {
										onClick: () => y.mutate(() => Yi(e.status === "approved" ? "restore" : "approve", s, e.id, o.data.revision)),
										children: e.status === "approved" ? i.restore : i.approve
									}) : null,
									!t && e.status === "candidate" ? /* @__PURE__ */ (0, b.jsx)(T, {
										onClick: () => y.mutate(() => Yi("reject", s, e.id, o.data.revision)),
										variant: "danger",
										children: i.reject
									}) : null
								]
							})
						]
					}, e.id);
				})
			})
		]
	});
}
//#endregion
//#region src/features/guided-journey/ExampleBriefPicker.tsx
var ea = "serre:guided-example-pending";
function ta() {
	try {
		let e = JSON.parse(window.sessionStorage.getItem(ea) ?? "null");
		if (!e || typeof e != "object") return null;
		let t = e, n = t.example;
		return typeof t.projectId != "string" || !t.projectId || !n || typeof n.id != "string" || typeof n.name != "string" || typeof n.language != "string" || !n.brief || typeof n.brief != "object" ? null : e;
	} catch {
		return null;
	}
}
function na(e) {
	try {
		e ? window.sessionStorage.setItem(ea, JSON.stringify(e)) : window.sessionStorage.removeItem(ea);
	} catch {}
}
function ra(e) {
	let t = e && typeof e == "object" ? e.active_id : null;
	if (typeof t != "string" || !t) throw Error("Le nouveau projet n’a pas d’identifiant actif.");
	return t;
}
function ia(e) {
	window.SerreProjects?.refresh?.().catch(() => {}), window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: e }));
}
function aa({ locale: e, currentProjectId: t }) {
	let n = Bt(), [r, i] = (0, _.useState)(""), [a, o] = (0, _.useState)(ta), [s, c] = (0, _.useState)(!1), [l, u] = (0, _.useState)(""), [d, f] = (0, _.useState)(""), p = or({
		queryKey: ["guided-examples"],
		queryFn: Be,
		retry: !1,
		staleTime: Infinity
	}), m = p.data?.examples.find((e) => e.id === r), h = e === "fr", g = async () => {
		await n.invalidateQueries({ predicate: (e) => e.queryKey[0] !== "guided-examples" });
	}, v = async (e, t) => {
		ra(await Je()) !== e && ia(await Qe(e));
		let n = Ui(await Oe()), r = {
			...n.brief,
			...t.brief,
			language: t.language,
			source_example_id: t.id,
			learning_goals: t.learning_goals ?? [],
			continuity_notes: t.continuity_notes ?? []
		};
		await Ae({
			expected_revision: n.revision,
			brief: r
		}), await g();
	}, y = async () => {
		if (s || !m && !a) return;
		let e = a?.example ?? m;
		if (!e || !a && !window.confirm(h ? "Créer un nouveau projet vierge pour cette histoire ? Le projet actuel, sa Bible et ses épisodes resteront intacts." : "Create a new empty project for this story? The current project, its story bible and episodes will stay untouched.")) return;
		c(!0), u(""), f("");
		let n = a?.projectId ?? null;
		try {
			if (!n) {
				window.dispatchEvent(new CustomEvent("studio:project-changing", { detail: { previous: t } }));
				let r = await Xe({
					name: e.name.slice(0, 80),
					template_id: "custom",
					clone_content: !1,
					include_example_content: !1
				});
				n = ra(r);
				let i = {
					projectId: n,
					example: e
				};
				na(i), o(i), ia(r);
			}
			await v(n, e), na(null), o(null), f(h ? "Projet séparé créé avec ce brief. Tu peux maintenant le modifier." : "Separate project created with this brief. You can now edit it.");
		} catch (e) {
			let t = e instanceof Error ? e.message : String(e);
			u(n ? h ? `Le projet a été créé, mais son brief n’est pas encore enregistré : ${t}. Réessaie sans recréer de projet.` : `The project was created, but its brief was not saved: ${t}. Retry without creating another project.` : t), n && await g().catch(() => {});
		} finally {
			c(!1);
		}
	};
	return /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-label": h ? "Histoires exemples" : "Example stories",
		className: Ri.examplePicker,
		children: [
			/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: h ? "Partir d’une histoire exemple" : "Start from an example story" }), /* @__PURE__ */ (0, b.jsx)("p", { children: h ? "Chaque exemple démarre un projet vierge séparé : aucune Bible ni aucun épisode existant n’est repris." : "Each example starts a separate empty project: no existing story bible or episode is copied." })] }),
			p.isPending ? /* @__PURE__ */ (0, b.jsx)("p", {
				role: "status",
				children: h ? "Chargement des exemples…" : "Loading examples…"
			}) : null,
			p.isError ? /* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("p", {
				role: "alert",
				children: h ? "Impossible de charger les exemples." : "Could not load examples."
			}), /* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => void p.refetch(),
				type: "button",
				variant: "secondary",
				children: h ? "Réessayer" : "Retry"
			})] }) : null,
			p.isSuccess && !p.data.examples.length && !a ? /* @__PURE__ */ (0, b.jsx)("p", { children: h ? "Aucun exemple disponible." : "No examples available." }) : null,
			p.isSuccess && p.data.examples.length > 0 || a ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [
				/* @__PURE__ */ (0, b.jsxs)("div", {
					className: Ri.exampleControls,
					children: [/* @__PURE__ */ (0, b.jsxs)("label", {
						htmlFor: "guided-example-select",
						children: [h ? "Histoire" : "Story", /* @__PURE__ */ (0, b.jsxs)("select", {
							disabled: s || !!a,
							id: "guided-example-select",
							onChange: (e) => {
								i(e.target.value), f("");
							},
							value: r,
							children: [/* @__PURE__ */ (0, b.jsx)("option", {
								value: "",
								children: h ? "Choisir un exemple…" : "Choose an example…"
							}), p.data?.examples.map((e) => /* @__PURE__ */ (0, b.jsxs)("option", {
								value: e.id,
								children: [
									e.name,
									" · ",
									e.language
								]
							}, e.id))]
						})]
					}), /* @__PURE__ */ (0, b.jsx)(T, {
						disabled: s || !m && !a,
						onClick: () => void y(),
						type: "button",
						variant: "secondary",
						children: a ? h ? "Réessayer l’enregistrement" : "Retry saving" : h ? "Créer ce projet" : "Create this project"
					})]
				}),
				a?.example ?? m ? /* @__PURE__ */ (0, b.jsx)("p", { children: (a?.example ?? m)?.description }) : null,
				l ? /* @__PURE__ */ (0, b.jsx)("p", {
					role: "alert",
					children: l
				}) : null,
				a ? /* @__PURE__ */ (0, b.jsx)(T, {
					disabled: s,
					onClick: () => {
						na(null), o(null), u(""), f(h ? "Projet conservé sans brief. Tu peux le reprendre depuis la liste des projets." : "Project kept without its brief. You can reopen it from the project list.");
					},
					type: "button",
					variant: "secondary",
					children: h ? "Continuer sans enregistrer" : "Continue without saving"
				}) : null,
				d ? /* @__PURE__ */ (0, b.jsx)("p", {
					role: "status",
					children: d
				}) : null
			] }) : null
		]
	});
}
//#endregion
//#region src/features/guided-journey/StageHost.tsx
var oa = {
	fr: {
		idea: "Commence par l’envie",
		casting: "Qui porte l’histoire ?",
		relationships: "Fais évoluer les relations",
		season: "Construis la saison",
		episode: "Écris et valide l’épisode",
		storyboard: "Transforme le texte en actions",
		production: "Produis sans perdre le fil",
		release: "Regarde, compare, recommence"
	},
	en: {
		idea: "Start with the idea",
		casting: "Who carries the story?",
		relationships: "Evolve relationships",
		season: "Build the season",
		episode: "Write and approve the episode",
		storyboard: "Turn text into action",
		production: "Produce without losing the thread",
		release: "Watch, compare, iterate"
	}
}, sa = {
	fr: {
		add: "Ajouter un personnage",
		draft: "brouillon",
		canonical: "dans la Bible",
		newCharacter: "Nouveau personnage",
		name: "Nom",
		role: "Rôle",
		appearance: "Apparence",
		wardrobe: "Tenue",
		signature: "Détails signature, séparés par des virgules",
		palette: "Palette, 3 couleurs minimum",
		personality: "Personnalité",
		wants: "Désirs, séparés par des virgules",
		fears: "Peurs, séparées par des virgules",
		voice: "Voix",
		negative: "Éléments à éviter",
		missing: "À compléter",
		save: "Enregistrer la fiche",
		promote: "Valider dans la Bible",
		ai: "Compléter avec l’IA"
	},
	en: {
		add: "Add a character",
		draft: "draft",
		canonical: "in the Bible",
		newCharacter: "New character",
		name: "Name",
		role: "Role",
		appearance: "Appearance",
		wardrobe: "Wardrobe",
		signature: "Signature details, comma-separated",
		palette: "Palette, at least 3 colors",
		personality: "Personality",
		wants: "Wants, comma-separated",
		fears: "Fears, comma-separated",
		voice: "Voice",
		negative: "Elements to avoid",
		missing: "Still needed",
		save: "Save character sheet",
		promote: "Validate in the Bible",
		ai: "Complete with AI"
	}
};
function ca({ stage: e, guided: t, busy: n, locale: r, projectId: i, onAddCharacter: a, onCreateEpisode: o, onPromoteCharacter: s, onPropose: c, onSaveBrief: l, onSaveCharacter: u, slots: d }) {
	let f = Li(), p = (e) => {
		e.preventDefault();
		let n = new FormData(e.currentTarget), r = [...n.getAll("locked_fields")].map(String);
		l({
			...t.brief,
			...Object.fromEntries([...n.entries()].filter(([e]) => e !== "locked_fields")),
			locked_fields: r
		});
	}, m = d?.[e.id];
	if (!m && e.id === "idea") {
		let e = (e, n, r = !1) => /* @__PURE__ */ (0, b.jsxs)("label", { children: [
			n,
			r ? /* @__PURE__ */ (0, b.jsx)("textarea", {
				defaultValue: String(t.brief[e] ?? ""),
				name: e
			}) : /* @__PURE__ */ (0, b.jsx)("input", {
				defaultValue: String(t.brief[e] ?? ""),
				name: e
			}),
			/* @__PURE__ */ (0, b.jsxs)("span", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
				defaultChecked: t.brief.locked_fields?.includes(e),
				name: "locked_fields",
				type: "checkbox",
				value: e
			}), " Verrouiller"] })
		] });
		m = /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [/* @__PURE__ */ (0, b.jsx)(aa, {
			currentProjectId: i,
			locale: r
		}), /* @__PURE__ */ (0, b.jsxs)("form", {
			className: Ri.form,
			onSubmit: p,
			children: [
				e("working_title", "Titre de travail"),
				e("genre", "Genre"),
				e("idea", "Idée", !0),
				e("tone", "Ton"),
				e("audience", "Public"),
				/* @__PURE__ */ (0, b.jsxs)("label", { children: [
					"Langue (code à 2 lettres)",
					/* @__PURE__ */ (0, b.jsx)("input", {
						defaultValue: t.brief.language ?? "fr",
						maxLength: 2,
						minLength: 2,
						name: "language",
						pattern: "[a-z]{2}",
						required: !0
					}),
					/* @__PURE__ */ (0, b.jsxs)("span", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
						defaultChecked: t.brief.locked_fields?.includes("language"),
						name: "locked_fields",
						type: "checkbox",
						value: "language"
					}), " Verrouiller"] })
				] }),
				e("episode_title", "Titre de l’épisode"),
				e("episode_concept", "Promesse de l’épisode", !0),
				/* @__PURE__ */ (0, b.jsxs)("div", {
					className: Ri.actions,
					children: [/* @__PURE__ */ (0, b.jsx)(T, {
						disabled: n,
						type: "submit",
						children: "Enregistrer le brouillon"
					}), /* @__PURE__ */ (0, b.jsx)(T, {
						disabled: n,
						onClick: () => c("brief"),
						type: "button",
						variant: "secondary",
						children: "Améliorer avec l’IA"
					})]
				})
			]
		}, `${i}:${t.revision}`)] });
	}
	if (!m && e.id === "episode" && (m = t.activeEpisodeId ? /* @__PURE__ */ (0, b.jsxs)("div", {
		className: Ri.statusCard,
		children: [
			/* @__PURE__ */ (0, b.jsx)("strong", { children: t.activeEpisodeId }),
			/* @__PURE__ */ (0, b.jsx)("p", { children: "Épisode lié au parcours." }),
			/* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => f.navigate("produce"),
				children: "Écrire et valider"
			})
		]
	}) : /* @__PURE__ */ (0, b.jsxs)("div", {
		className: Ri.statusCard,
		children: [/* @__PURE__ */ (0, b.jsx)("p", { children: "Crée un épisode depuis le titre et la promesse du brief." }), /* @__PURE__ */ (0, b.jsx)(T, {
			disabled: n,
			onClick: o,
			children: "Créer et lier l’épisode"
		})]
	})), !m && e.id === "casting") {
		let e = sa[r], o = (e) => String(e ?? "").split(",").map((e) => e.trim()).filter(Boolean), l = (e, t) => {
			e.preventDefault();
			let n = new FormData(e.currentTarget);
			u({
				...t,
				name: String(n.get("name")),
				role: String(n.get("role")),
				visual_description: String(n.get("visual_description")),
				wardrobe: String(n.get("wardrobe")),
				signature_details: o(n.get("signature_details")),
				palette: o(n.get("palette")),
				personality: String(n.get("personality")),
				wants: o(n.get("wants")),
				fears: o(n.get("fears")),
				voice_description: String(n.get("voice_description")),
				generation_negative_prompt: String(n.get("generation_negative_prompt"))
			});
		};
		m = /* @__PURE__ */ (0, b.jsxs)("div", { children: [
			/* @__PURE__ */ (0, b.jsx)("div", {
				className: Ri.actions,
				children: /* @__PURE__ */ (0, b.jsx)(T, {
					disabled: n,
					onClick: a,
					children: e.add
				})
			}),
			t.characters.map((r) => {
				let i = t.characterCompletion[r.id];
				return /* @__PURE__ */ (0, b.jsxs)("details", {
					className: Ri.statusCard,
					open: !i?.promoted,
					children: [/* @__PURE__ */ (0, b.jsxs)("summary", { children: [
						r.name || e.newCharacter,
						" · ",
						i?.promoted ? e.canonical : e.draft
					] }), /* @__PURE__ */ (0, b.jsxs)("form", {
						className: Ri.form,
						onSubmit: (e) => l(e, r),
						children: [
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.name, /* @__PURE__ */ (0, b.jsx)("input", {
								defaultValue: r.name,
								name: "name",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.role, /* @__PURE__ */ (0, b.jsx)("input", {
								defaultValue: r.role,
								name: "role",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.appearance, /* @__PURE__ */ (0, b.jsx)("textarea", {
								defaultValue: r.visual_description,
								minLength: 20,
								name: "visual_description",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.wardrobe, /* @__PURE__ */ (0, b.jsx)("textarea", {
								defaultValue: r.wardrobe,
								minLength: 20,
								name: "wardrobe",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.signature, /* @__PURE__ */ (0, b.jsx)("input", {
								defaultValue: (r.signature_details ?? []).join(", "),
								name: "signature_details",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.palette, /* @__PURE__ */ (0, b.jsx)("input", {
								defaultValue: (r.palette ?? []).join(", "),
								name: "palette",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.personality, /* @__PURE__ */ (0, b.jsx)("textarea", {
								defaultValue: r.personality,
								minLength: 10,
								name: "personality",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.wants, /* @__PURE__ */ (0, b.jsx)("input", {
								defaultValue: (r.wants ?? []).join(", "),
								name: "wants",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.fears, /* @__PURE__ */ (0, b.jsx)("input", {
								defaultValue: (r.fears ?? []).join(", "),
								name: "fears",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.voice, /* @__PURE__ */ (0, b.jsx)("textarea", {
								defaultValue: r.voice_description,
								minLength: 10,
								name: "voice_description",
								required: !0
							})] }),
							/* @__PURE__ */ (0, b.jsxs)("label", { children: [e.negative, /* @__PURE__ */ (0, b.jsx)("input", {
								defaultValue: r.generation_negative_prompt,
								name: "generation_negative_prompt"
							})] }),
							i?.missing.length ? /* @__PURE__ */ (0, b.jsxs)("p", {
								role: "status",
								children: [
									e.missing,
									" : ",
									i.missing.join(", ")
								]
							}) : null,
							/* @__PURE__ */ (0, b.jsxs)("div", {
								className: Ri.actions,
								children: [
									/* @__PURE__ */ (0, b.jsx)(T, {
										disabled: n,
										type: "submit",
										children: e.save
									}),
									/* @__PURE__ */ (0, b.jsx)(T, {
										disabled: n || !i?.ready || i.promoted,
										onClick: () => s(r.id),
										type: "button",
										children: e.promote
									}),
									/* @__PURE__ */ (0, b.jsx)(T, {
										disabled: n,
										onClick: () => c(`character:${r.id}`),
										type: "button",
										variant: "secondary",
										children: e.ai
									})
								]
							})
						]
					})]
				}, r.id);
			}),
			/* @__PURE__ */ (0, b.jsx)($i, {
				characters: t.canonicalCharacters,
				generationLicenses: t.generationLicenses,
				locale: r,
				projectId: i
			})
		] });
	}
	return m ||= /* @__PURE__ */ (0, b.jsxs)("div", {
		className: Ri.statusCard,
		children: [/* @__PURE__ */ (0, b.jsx)("p", { children: e.blockers?.[0]?.message ?? `État : ${e.status}` }), /* @__PURE__ */ (0, b.jsx)(T, {
			onClick: () => e.primary_action.target.includes("results") ? f.navigate("results") : e.primary_action.target.includes("settings") ? f.navigate("settings") : e.primary_action.target.includes("bible") ? f.navigate("bible") : f.navigate("produce"),
			children: e.primary_action.label
		})]
	}), /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-labelledby": `journey-${e.id}`,
		className: Ri.stage,
		children: [/* @__PURE__ */ (0, b.jsxs)("header", { children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsxs)("small", { children: ["ÉTAPE · ", e.status] }), /* @__PURE__ */ (0, b.jsx)("h1", {
			id: `journey-${e.id}`,
			children: oa[r][e.id]
		})] }), /* @__PURE__ */ (0, b.jsx)("span", {
			"data-status": e.status,
			children: e.status
		})] }), m]
	});
}
//#endregion
//#region src/features/guided-journey/GuidedJourney.tsx
var la = {
	fr: {
		idea: "Idée",
		casting: "Casting",
		relationships: "Relations",
		season: "Saison",
		episode: "Épisode",
		storyboard: "Storyboard",
		production: "Production",
		release: "Résultat"
	},
	en: {
		idea: "Idea",
		casting: "Cast",
		relationships: "Relationships",
		season: "Season",
		episode: "Episode",
		storyboard: "Storyboard",
		production: "Production",
		release: "Release"
	}
};
function ua({ locale: e, onNavigate: t, slots: n }) {
	let r = Bt(), i = or({
		queryKey: ["studio-journey"],
		queryFn: It
	}), a = or({
		queryKey: ["guided-authoring"],
		queryFn: Oe,
		select: Ui
	}), [o, s] = (0, _.useState)("idea"), [c, l] = (0, _.useState)(!1), [u, d] = (0, _.useState)(null), [f, p] = (0, _.useState)("");
	(0, _.useEffect)(() => {
		!c && i.data && s(Wi(i.data).id);
	}, [i.data, c]);
	let m = async () => {
		await Promise.all([
			r.invalidateQueries({ queryKey: ["guided-authoring"] }),
			r.invalidateQueries({ queryKey: ["studio-journey"] }),
			r.invalidateQueries({ queryKey: ["casting", i.data?.project_id] })
		]);
	}, h = cr({
		mutationFn: async (e) => e(),
		onSuccess: m,
		onError: (e) => p(e instanceof Error ? e.message : "Le brouillon a changé. Recharge la vue.")
	}), g = a.data, v = (0, _.useMemo)(() => ({
		activeStage: o,
		selectStage: (e) => {
			l(!0), s(e);
		},
		navigate: t
	}), [o, t]);
	if (i.isPending || a.isPending) return /* @__PURE__ */ (0, b.jsx)(ge, {
		"aria-label": "Chargement du parcours",
		height: "24rem",
		width: "100%"
	});
	if (i.error || a.error || !i.data || !g) return /* @__PURE__ */ (0, b.jsx)(de, {
		title: "Parcours indisponible",
		description: "Recharge le Studio pour retrouver ton brouillon."
	});
	let y = i.data.stages.find((e) => e.id === o) ?? i.data.stages[0], x = i.data.stages.filter((e) => ["approved", "completed"].includes(e.status)).length, S = {
		...n,
		season: n?.season ?? /* @__PURE__ */ (0, b.jsx)(ii, {
			api: mi,
			locale: e,
			renderEpisodeConsequences: (t) => /* @__PURE__ */ (0, b.jsx)(Fi, {
				api: ji,
				episodeId: t,
				locale: e
			})
		})
	};
	return /* @__PURE__ */ (0, b.jsx)(Ii, {
		value: v,
		children: /* @__PURE__ */ (0, b.jsxs)("main", {
			className: Ri.root,
			"data-guided-journey": !0,
			children: [
				/* @__PURE__ */ (0, b.jsxs)("header", {
					className: Ri.hero,
					children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [
						/* @__PURE__ */ (0, b.jsx)("small", { children: "CRÉATION GUIDÉE" }),
						/* @__PURE__ */ (0, b.jsx)("h1", { children: "Ton épisode, de l’idée au rendu" }),
						/* @__PURE__ */ (0, b.jsx)("p", { children: "Tu gardes la décision. L’IA propose, le Studio montre les conséquences." })
					] }), /* @__PURE__ */ (0, b.jsx)(me, {
						label: `${x} / ${i.data.stages.length}`,
						value: x,
						max: i.data.stages.length
					})]
				}),
				/* @__PURE__ */ (0, b.jsx)(zi, {
					labels: la[e],
					navigationLabel: e === "fr" ? "Parcours de création" : "Creation journey",
					stages: i.data.stages
				}),
				f ? /* @__PURE__ */ (0, b.jsx)("p", {
					className: Ri.error,
					role: "alert",
					children: f
				}) : null,
				/* @__PURE__ */ (0, b.jsx)(ca, {
					busy: h.isPending,
					guided: g,
					locale: e,
					projectId: i.data.project_id,
					onAddCharacter: () => h.mutate(() => Me({ expected_revision: g.revision })),
					onCreateEpisode: () => h.mutate(async () => {
						let e = (await Ee({
							title: g.brief.episode_title || "Épisode sans titre",
							concept: g.brief.episode_concept || g.brief.idea
						})).id;
						if (typeof e != "string") throw Error("Épisode créé sans identifiant");
						return Re({
							expected_revision: g.revision,
							episode_id: e
						});
					}),
					onPromoteCharacter: (e) => h.mutate(() => Ie(e, { expected_revision: g.revision })),
					onPropose: async (t) => {
						p("");
						try {
							let n = Ui(await He({
								expected_revision: g.revision,
								target: t,
								mode: "improve",
								locale: e
							}));
							d(n.proposals.find((e) => e.status === "candidate") ?? null), await m();
						} catch (e) {
							p(e instanceof Error ? e.message : "Proposition impossible");
						}
					},
					onSaveBrief: (e) => h.mutate(() => Ae({
						expected_revision: g.revision,
						brief: e
					})),
					onSaveCharacter: (e) => h.mutate(() => Pe(e.id, {
						expected_revision: g.revision,
						character: e
					})),
					slots: S,
					stage: y
				}),
				/* @__PURE__ */ (0, b.jsx)(Gi, {
					busy: h.isPending,
					onAccept: (e) => u && h.mutate(() => We(u.id, {
						expected_revision: g.revision,
						edited_after: { ...e }
					}), { onSuccess: () => d(null) }),
					onClose: () => d(null),
					onReject: () => u && h.mutate(() => Ke(u.id), { onSuccess: () => d(null) }),
					proposal: u
				})
			]
		})
	});
}
//#endregion
//#region src/features/setup/model.ts
var da = /* @__PURE__ */ new Set([
	"queued",
	"running",
	"paused",
	"awaiting_license",
	"awaiting_manual",
	"completed",
	"failed",
	"cancelled"
]);
function fa(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) throw Error("Réponse de préparation invalide");
	return e;
}
function z(e, t = "") {
	return typeof e == "string" ? e : t;
}
function pa(e) {
	return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function ma(e) {
	let t = fa(e), n = fa(t.hardware), r = z(t.status);
	if (![
		"ready",
		"incomplete",
		"incompatible"
	].includes(r)) throw Error("État du pack inconnu");
	let i = Array.isArray(t.components) ? t.components : [], a = Array.isArray(t.managed_prerequisites) ? t.managed_prerequisites : [];
	return {
		packId: z(t.pack_id),
		status: r,
		summary: z(t.summary),
		requiredDownloadBytes: pa(t.required_download_bytes),
		hardware: {
			vramGb: typeof n.vram_gb == "number" ? n.vram_gb : null,
			diskFreeBytes: pa(n.disk_free_bytes),
			gpuName: typeof n.gpu_name == "string" ? n.gpu_name : null
		},
		components: i.map((e) => {
			let t = fa(e), n = fa(t.license), r = z(n.commercial_use, "review_required");
			return {
				id: z(t.id),
				role: z(t.role),
				state: z(t.state, "unknown"),
				required: t.required !== !1,
				sizeBytes: pa(t.size_bytes),
				reason: z(t.reason),
				action: z(t.action),
				license: {
					id: z(n.id),
					name: z(n.name),
					url: z(n.url),
					summary: z(n.summary),
					commercialUse: [
						"allowed",
						"restricted",
						"review_required"
					].includes(r) ? r : "review_required"
				}
			};
		}),
		managedPrerequisites: a.map((e) => {
			let t = fa(e);
			return {
				id: z(t.id),
				version: z(t.version),
				source: z(t.source),
				archiveSha256: z(t.archive_sha256),
				destination: z(t.destination),
				licenseName: z(t.license_name),
				licenseUrl: z(t.license_url),
				sizeBytes: pa(t.size_bytes),
				state: z(t.state, "missing")
			};
		})
	};
}
function ha(e) {
	let t = fa(e);
	if (t.job === null || t.job === void 0) return null;
	let n = fa(t.job), r = z(n.status);
	if (!da.has(r)) throw Error("État du job inconnu");
	let i = Array.isArray(n.steps) ? n.steps : [], a = Array.isArray(n.smoke_checks) ? n.smoke_checks : [];
	return {
		id: z(n.id),
		status: r,
		mode: n.mode === "manual" ? "manual" : "automatic",
		error: typeof n.error == "string" ? n.error : null,
		recovered: n.recovered === !0,
		acceptedLicenseIds: Array.isArray(n.accepted_license_ids) ? n.accepted_license_ids.map(String) : [],
		steps: i.map((e) => {
			let t = fa(e);
			return {
				componentId: z(t.component_id),
				status: z(t.status),
				message: z(t.message)
			};
		}),
		smokeChecks: a.map((e) => {
			let t = fa(e);
			return {
				checkId: z(t.check_id),
				status: t.status === "passed" ? "passed" : "failed",
				requiredComponents: Array.isArray(t.required_components) ? t.required_components.map(String) : [],
				message: z(t.message)
			};
		})
	};
}
function ga(e, t) {
	if (e <= 0) return t === "fr" ? "Aucun téléchargement" : "No download";
	let n = [
		"o",
		"Kio",
		"Mio",
		"Gio"
	], r = [
		"B",
		"KiB",
		"MiB",
		"GiB"
	], i = Math.min(Math.floor(Math.log(e) / Math.log(1024)), 3);
	return `${new Intl.NumberFormat(t, { maximumFractionDigits: 1 }).format(e / 1024 ** i)} ${(t === "fr" ? n : r)[i]}`;
}
//#endregion
//#region src/features/setup/api.ts
function _a(e) {
	let t = ha(e);
	if (!t) throw Error("Préparation introuvable");
	return t;
}
var va = {
	async diagnose() {
		return ma(await et());
	},
	async latest() {
		let [e, t] = await Promise.all([nt(), nt({ use_personal_comfy_models: !0 })]), n = [ha(e), ha(t)].filter((e) => e !== null), r = /* @__PURE__ */ new Set([
			"queued",
			"running",
			"paused",
			"awaiting_license",
			"awaiting_manual"
		]);
		return n.find((e) => r.has(e.status)) ?? n[0] ?? null;
	},
	async getJob(e) {
		return _a(await it(e));
	},
	async start(e) {
		return _a(await gt(e.packId, {
			mode: e.mode,
			accepted_license_ids: [...e.acceptedLicenseIds],
			use_personal_comfy_models: e.usePersonalComfyModels
		}));
	},
	async pause(e) {
		return _a(await ut(e));
	},
	async resume(e, t) {
		return _a(await mt(e, { accepted_license_ids: [...t] }));
	},
	async repair(e, t) {
		return _a(await ft(e, { accepted_license_ids: [...t] }));
	},
	async cancel(e) {
		return _a(await ot(e));
	},
	async logs(e) {
		return ((await ct(e)).logs ?? []).map((e) => typeof e.message == "string" ? e.message : "");
	}
}, ya = {
	fr: {
		title: "Préparer mon studio",
		intro: "La Serre vérifie cette machine et installe seulement ce qui manque pour créer en local.",
		loading: "Diagnostic de votre machine…",
		loadError: "Impossible de vérifier le studio",
		retryDiagnosis: "Relancer le diagnostic",
		steps: [
			"Diagnostic",
			"Vérification",
			"Installation",
			"Essai",
			"Prêt"
		],
		machine: "Cette machine",
		graphics: "Carte graphique",
		memory: "Mémoire vidéo",
		disk: "Espace disponible",
		unknown: "Non détecté",
		download: "À télécharger",
		capabilitiesTitle: "Ce que votre studio saura faire",
		capabilities: [
			[
				"write",
				"Écrire",
				"Construire les scènes et les dialogues"
			],
			[
				"characters",
				"Créer des personnages",
				"Préparer les images et les poses"
			],
			[
				"animate",
				"Animer",
				"Produire les mouvements et les plans"
			],
			[
				"voices",
				"Créer les voix",
				"Utiliser les outils audio locaux"
			],
			[
				"edit",
				"Monter",
				"Assembler et exporter le résultat"
			]
		],
		available: "Disponible",
		toPrepare: "À préparer",
		incompatible: "À vérifier",
		prepare: "Préparer mon studio",
		continueManual: "Continuer sans moteurs",
		reviewTitle: "Avant de commencer",
		reviewIntro: "Vous gardez le contrôle : rien ne sera installé avant votre accord.",
		destination: "Où installer les ressources ?",
		prerequisites: "Outils gérés nécessaires",
		prerequisiteSource: "Source officielle",
		prerequisiteDestination: "Destination isolée",
		prerequisiteChecksum: "SHA-256 vérifié",
		managed: "Dossier géré par La Serre (recommandé)",
		personal: "Mes modèles ComfyUI existants",
		personalHelp: "La Serre les référence sans les déplacer.",
		licenses: "Licences à accepter",
		licenseAccept: "J’accepte la licence {name}",
		reviewLicense: "Lire la licence",
		consent: "J’ai vérifié l’espace requis et l’emplacement d’installation.",
		variableTime: "Le temps dépend de votre connexion et de cette machine. Vous pourrez mettre en pause et reprendre.",
		back: "Retour",
		start: "Installer et vérifier",
		starting: "Démarrage…",
		progressTitle: "Préparation en cours",
		resumed: "La préparation précédente a été retrouvée et reprise ici.",
		progress: "Progression de l’installation",
		pause: "Mettre en pause",
		resume: "Reprendre",
		cancel: "Annuler en sécurité",
		repair: "Réparer",
		retry: "Réessayer",
		manual: "Choisir manuellement",
		details: "Voir les détails techniques",
		logs: "Journal technique",
		noLogs: "Aucun message technique.",
		errorTitle: "La préparation a besoin de votre aide",
		awaitingLicense: "Une licence supplémentaire doit être acceptée avant de reprendre.",
		awaitingManual: "Une intervention guidée est requise. Suivez l’étape ci-dessous, puis reprenez la préparation.",
		readyTitle: "Votre studio est prêt",
		readyIntro: "Les vérifications locales sont réussies. Vous pouvez démarrer votre première création.",
		smokeTitle: "Essai final",
		preview: "Aperçu de validation généré localement",
		downloadReport: "Télécharger le rapport de validation",
		continue: "Commencer à créer"
	},
	en: {
		title: "Prepare my studio",
		intro: "La Serre checks this computer and installs only what is missing for local creation.",
		loading: "Checking your computer…",
		loadError: "The studio could not be checked",
		retryDiagnosis: "Run diagnosis again",
		steps: [
			"Diagnosis",
			"Review",
			"Installation",
			"Test",
			"Ready"
		],
		machine: "This computer",
		graphics: "Graphics card",
		memory: "Video memory",
		disk: "Free space",
		unknown: "Not detected",
		download: "Download required",
		capabilitiesTitle: "What your studio will be able to do",
		capabilities: [
			[
				"write",
				"Write",
				"Build scenes and dialogue"
			],
			[
				"characters",
				"Create characters",
				"Prepare images and poses"
			],
			[
				"animate",
				"Animate",
				"Produce motion and shots"
			],
			[
				"voices",
				"Create voices",
				"Use local audio tools"
			],
			[
				"edit",
				"Edit",
				"Assemble and export the result"
			]
		],
		available: "Available",
		toPrepare: "To prepare",
		incompatible: "Needs review",
		prepare: "Prepare my studio",
		continueManual: "Continue without engines",
		reviewTitle: "Before we begin",
		reviewIntro: "You stay in control: nothing is installed before you consent.",
		destination: "Where should resources be installed?",
		prerequisites: "Required managed tools",
		prerequisiteSource: "Official source",
		prerequisiteDestination: "Isolated destination",
		prerequisiteChecksum: "Verified SHA-256",
		managed: "Folder managed by La Serre (recommended)",
		personal: "My existing ComfyUI models",
		personalHelp: "La Serre references them without moving them.",
		licenses: "Licenses to accept",
		licenseAccept: "I accept the {name} license",
		reviewLicense: "Read license",
		consent: "I checked the required space and installation location.",
		variableTime: "Timing depends on your connection and this computer. You can pause and resume.",
		back: "Back",
		start: "Install and verify",
		starting: "Starting…",
		progressTitle: "Preparing your studio",
		resumed: "Your previous preparation was found and resumed here.",
		progress: "Installation progress",
		pause: "Pause",
		resume: "Resume",
		cancel: "Cancel safely",
		repair: "Repair",
		retry: "Try again",
		manual: "Choose manually",
		details: "View technical details",
		logs: "Technical log",
		noLogs: "No technical messages.",
		errorTitle: "Setup needs your help",
		awaitingLicense: "An additional license must be accepted before resuming.",
		awaitingManual: "A guided intervention is required. Follow the step below, then resume setup.",
		readyTitle: "Your studio is ready",
		readyIntro: "Local checks passed. You can start your first creation.",
		smokeTitle: "Final test",
		preview: "Validation preview generated locally",
		downloadReport: "Download validation report",
		continue: "Start creating"
	}
};
function ba(e) {
	return ya[e];
}
var B = {
	root: "_root_1l1kt_1",
	stepper: "_stepper_1l1kt_4",
	hero: "_hero_1l1kt_11",
	machine: "_machine_1l1kt_12",
	capabilities: "_capabilities_1l1kt_16",
	primaryAction: "_primaryAction_1l1kt_19",
	fieldset: "_fieldset_1l1kt_20",
	consent: "_consent_1l1kt_22",
	actions: "_actions_1l1kt_25",
	notice: "_notice_1l1kt_26",
	jobSteps: "_jobSteps_1l1kt_27",
	technical: "_technical_1l1kt_30",
	ready: "_ready_1l1kt_33",
	readyGrid: "_readyGrid_1l1kt_34",
	readyActions: "_readyActions_1l1kt_36",
	reportLink: "_reportLink_1l1kt_37",
	preview: "_preview_1l1kt_39",
	previewLabel: "_previewLabel_1l1kt_40"
};
//#endregion
//#region src/features/setup/SetupStepper.tsx
function xa({ current: e, messages: t }) {
	return /* @__PURE__ */ (0, b.jsx)("nav", {
		"aria-label": t.title,
		className: B.stepper,
		children: /* @__PURE__ */ (0, b.jsx)("ol", { children: t.steps.map((t, n) => /* @__PURE__ */ (0, b.jsxs)("li", {
			"aria-current": n === e ? "step" : void 0,
			"data-complete": n < e,
			children: [/* @__PURE__ */ (0, b.jsx)("span", {
				"aria-hidden": "true",
				children: n < e ? "✓" : n + 1
			}), t]
		}, t)) })
	});
}
//#endregion
//#region src/features/setup/SetupWizard.tsx
function Sa(e) {
	return [...new Map(e.components.filter((e) => e.required && e.state !== "installed").map((e) => [e.license.id, e.license])).values()];
}
function Ca(e, t) {
	let n = {
		write: ["ollama", "narrative"],
		characters: ["comfy", "keyframe"],
		animate: [
			"video",
			"text-encoder",
			"node"
		],
		voices: ["voice", "audio"],
		edit: ["workflow", "edit"]
	}, r = t.components.filter((t) => n[e].some((e) => `${t.id} ${t.role}`.toLowerCase().includes(e)));
	return r.length === 0 || r.every((e) => e.state === "installed");
}
function wa(e) {
	return e.steps.filter((e) => [
		"installed",
		"skipped",
		"completed"
	].includes(e.status)).length;
}
function Ta({ locale: e, api: t = va, readyContent: n, onReady: r }) {
	let i = ba(e), a = Bt(), [o, s] = (0, _.useState)(!1), [c, l] = (0, _.useState)(/* @__PURE__ */ new Set()), [u, d] = (0, _.useState)(!1), [f, p] = (0, _.useState)(!1), [m, h] = (0, _.useState)(null), [g, v] = (0, _.useState)(!1), [y, x] = (0, _.useState)(() => typeof window < "u" && window.localStorage.getItem("serre-studio-manual-mode") === "1"), S = or({
		queryKey: ["runtime-pack", "diagnosis"],
		queryFn: () => t.diagnose()
	}), w = or({
		queryKey: ["runtime-pack", "latest"],
		queryFn: () => t.latest()
	}), E = m ?? w.data?.id ?? null, D = or({
		queryKey: [
			"runtime-pack",
			"job",
			E
		],
		queryFn: () => t.getJob(E),
		enabled: E !== null,
		refetchInterval: (e) => ["queued", "running"].includes(e.state.data?.status ?? "") ? 750 : !1
	}).data ?? (w.data?.id === E ? w.data : null), te = (0, _.useMemo)(() => S.data ? Sa(S.data) : [], [S.data]), ne = or({
		queryKey: [
			"runtime-pack",
			"logs",
			E
		],
		queryFn: () => t.logs(E),
		enabled: g && E !== null
	}), re = (e) => {
		h(e.id), a.setQueryData([
			"runtime-pack",
			"job",
			e.id
		], e);
	}, ie = cr({
		mutationFn: (e) => e(),
		onSuccess: re
	}), ae = cr({
		mutationFn: (e) => t.start(e),
		onSuccess: re
	}), oe = (e = !1) => {
		e ? window.localStorage.setItem("serre-studio-manual-mode", "1") : window.localStorage.removeItem("serre-studio-manual-mode"), r?.(), x(!0);
	};
	if (y) return /* @__PURE__ */ (0, b.jsx)(b.Fragment, { children: n });
	if (S.isPending || w.isPending) return /* @__PURE__ */ (0, b.jsx)("main", {
		className: B.root,
		children: /* @__PURE__ */ (0, b.jsx)(ge, {
			"aria-label": i.loading,
			height: "18rem"
		})
	});
	if (S.isError || w.isError || !S.data) return /* @__PURE__ */ (0, b.jsx)("main", {
		className: B.root,
		children: /* @__PURE__ */ (0, b.jsx)(de, {
			title: i.loadError,
			description: i.intro,
			action: /* @__PURE__ */ (0, b.jsxs)("div", {
				className: B.actions,
				children: [/* @__PURE__ */ (0, b.jsx)(T, {
					onClick: () => {
						S.refetch(), w.refetch();
					},
					children: i.retryDiagnosis
				}), n ? /* @__PURE__ */ (0, b.jsx)(T, {
					onClick: () => oe(!0),
					variant: "secondary",
					children: i.continueManual
				}) : null]
			})
		})
	});
	let se = D?.status === "completed" || S.data.status === "ready" ? 4 : D ? D.status === "queued" || D.status === "running" || D.status === "paused" ? 2 : 3 : +!!o, O = [.../* @__PURE__ */ new Set([...D?.acceptedLicenseIds ?? [], ...c])], k = u && te.every((e) => c.has(e.id)), ce = (e) => ie.mutate(e);
	if (se === 4) {
		let e = D?.smokeChecks ?? [];
		return /* @__PURE__ */ (0, b.jsxs)("main", {
			className: B.root,
			children: [/* @__PURE__ */ (0, b.jsx)(xa, {
				current: 4,
				messages: i
			}), /* @__PURE__ */ (0, b.jsxs)("section", {
				className: B.ready,
				"aria-labelledby": "setup-ready-title",
				children: [
					/* @__PURE__ */ (0, b.jsx)(C, {
						tone: "success",
						children: i.steps[4]
					}),
					/* @__PURE__ */ (0, b.jsx)("h1", {
						id: "setup-ready-title",
						children: i.readyTitle
					}),
					/* @__PURE__ */ (0, b.jsx)("p", { children: i.readyIntro }),
					/* @__PURE__ */ (0, b.jsxs)("div", {
						className: B.readyGrid,
						children: [/* @__PURE__ */ (0, b.jsxs)(ee, {
							as: "section",
							children: [/* @__PURE__ */ (0, b.jsx)("h2", { children: i.smokeTitle }), /* @__PURE__ */ (0, b.jsx)("ul", { children: e.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [
								/* @__PURE__ */ (0, b.jsx)(C, {
									tone: e.status === "passed" ? "success" : "danger",
									children: e.status === "passed" ? "✓" : "!"
								}),
								" ",
								e.message || e.checkId
							] }, e.checkId)) })]
						}), /* @__PURE__ */ (0, b.jsx)(A, {
							caption: i.preview,
							children: /* @__PURE__ */ (0, b.jsxs)("div", {
								className: B.preview,
								"aria-label": i.preview,
								role: "img",
								children: [/* @__PURE__ */ (0, b.jsx)("span", {
									className: B.previewLabel,
									children: "LA SERRE"
								}), /* @__PURE__ */ (0, b.jsx)("strong", { children: "Studio local" })]
							})
						})]
					}),
					/* @__PURE__ */ (0, b.jsxs)("div", {
						className: B.readyActions,
						children: [D ? /* @__PURE__ */ (0, b.jsx)("a", {
							className: B.reportLink,
							download: !0,
							href: `/api/runtime-packs/jobs/${D.id}/report`,
							children: i.downloadReport
						}) : null, /* @__PURE__ */ (0, b.jsx)(T, {
							size: "large",
							onClick: () => oe(),
							children: i.continue
						})]
					})
				]
			})]
		});
	}
	if (D) {
		let n = Math.max(D.steps.length, 1), r = [
			"failed",
			"cancelled",
			"awaiting_license",
			"awaiting_manual"
		].includes(D.status);
		return /* @__PURE__ */ (0, b.jsxs)("main", {
			className: B.root,
			children: [/* @__PURE__ */ (0, b.jsx)(xa, {
				current: se,
				messages: i
			}), /* @__PURE__ */ (0, b.jsxs)("section", {
				"aria-labelledby": "setup-progress-title",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, b.jsx)(C, {
						tone: r ? "warning" : "info",
						children: D.status.replaceAll("_", " ")
					}),
					/* @__PURE__ */ (0, b.jsx)("h1", {
						id: "setup-progress-title",
						children: r ? i.errorTitle : i.progressTitle
					}),
					D.recovered ? /* @__PURE__ */ (0, b.jsx)("p", {
						className: B.notice,
						children: i.resumed
					}) : null,
					D.status === "awaiting_license" ? /* @__PURE__ */ (0, b.jsx)("p", { children: i.awaitingLicense }) : null,
					D.status === "awaiting_manual" ? /* @__PURE__ */ (0, b.jsx)("p", { children: i.awaitingManual }) : null,
					D.error ? /* @__PURE__ */ (0, b.jsx)("p", {
						role: "alert",
						children: D.error
					}) : null,
					/* @__PURE__ */ (0, b.jsx)(me, {
						id: "setup-progress",
						label: i.progress,
						max: n,
						value: wa(D),
						showValue: !0
					}),
					/* @__PURE__ */ (0, b.jsx)("ol", {
						className: B.jobSteps,
						children: D.steps.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [/* @__PURE__ */ (0, b.jsx)(C, {
							tone: [
								"installed",
								"completed",
								"skipped"
							].includes(e.status) ? "success" : e.status === "failed" ? "danger" : "neutral",
							children: e.status
						}), /* @__PURE__ */ (0, b.jsxs)("span", { children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: e.componentId }), e.message ? /* @__PURE__ */ (0, b.jsx)("small", { children: e.message }) : null] })] }, e.componentId))
					}),
					ie.isError ? /* @__PURE__ */ (0, b.jsx)("p", {
						role: "alert",
						children: e === "fr" ? "L’action n’a pas abouti. Vous pouvez réessayer." : "The action did not complete. You can try again."
					}) : null,
					/* @__PURE__ */ (0, b.jsxs)("div", {
						className: B.actions,
						children: [
							D.status === "awaiting_license" && te.length ? /* @__PURE__ */ (0, b.jsxs)("fieldset", {
								className: B.fieldset,
								children: [/* @__PURE__ */ (0, b.jsx)("legend", { children: i.licenses }), te.map((e) => /* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
									checked: c.has(e.id),
									onChange: (t) => {
										let n = t.currentTarget.checked;
										l((t) => {
											let r = new Set(t);
											return n ? r.add(e.id) : r.delete(e.id), r;
										});
									},
									type: "checkbox"
								}), /* @__PURE__ */ (0, b.jsxs)("span", { children: [
									i.licenseAccept.replace("{name}", e.name),
									" ",
									/* @__PURE__ */ (0, b.jsx)("a", {
										href: e.url,
										rel: "noreferrer",
										target: "_blank",
										children: i.reviewLicense
									}),
									/* @__PURE__ */ (0, b.jsx)("small", { children: e.summary })
								] })] }, e.id))]
							}) : null,
							["queued", "running"].includes(D.status) ? /* @__PURE__ */ (0, b.jsx)(T, {
								variant: "secondary",
								onClick: () => ce(() => t.pause(D.id)),
								children: i.pause
							}) : null,
							D.status === "paused" ? /* @__PURE__ */ (0, b.jsx)(T, {
								onClick: () => ce(() => t.resume(D.id, O)),
								children: i.resume
							}) : null,
							r ? /* @__PURE__ */ (0, b.jsx)(T, {
								disabled: D.status === "awaiting_license" && !te.every((e) => O.includes(e.id)),
								onClick: () => ce(() => t.resume(D.id, O)),
								children: i.retry
							}) : null,
							r ? /* @__PURE__ */ (0, b.jsx)(T, {
								variant: "secondary",
								onClick: () => ce(() => t.repair(D.id, O)),
								children: i.repair
							}) : null,
							r ? /* @__PURE__ */ (0, b.jsx)(T, {
								variant: "ghost",
								onClick: () => ae.mutate({
									packId: S.data.packId,
									mode: "manual",
									acceptedLicenseIds: O,
									usePersonalComfyModels: !0
								}),
								children: i.manual
							}) : null,
							[
								"queued",
								"running",
								"paused",
								"awaiting_license",
								"awaiting_manual"
							].includes(D.status) ? /* @__PURE__ */ (0, b.jsx)(T, {
								variant: "danger",
								onClick: () => ce(() => t.cancel(D.id)),
								children: i.cancel
							}) : null
						]
					}),
					/* @__PURE__ */ (0, b.jsxs)("details", {
						className: B.technical,
						onToggle: (e) => v(e.currentTarget.open),
						children: [
							/* @__PURE__ */ (0, b.jsx)("summary", { children: i.details }),
							/* @__PURE__ */ (0, b.jsx)("h2", { children: i.logs }),
							ne.isPending ? /* @__PURE__ */ (0, b.jsx)("p", { children: i.loading }) : /* @__PURE__ */ (0, b.jsx)("pre", { children: ne.data?.join("\n") || i.noLogs })
						]
					})
				]
			})]
		});
	}
	return o ? /* @__PURE__ */ (0, b.jsxs)("main", {
		className: B.root,
		children: [/* @__PURE__ */ (0, b.jsx)(xa, {
			current: 1,
			messages: i
		}), /* @__PURE__ */ (0, b.jsxs)("section", {
			"aria-labelledby": "setup-review-title",
			children: [
				/* @__PURE__ */ (0, b.jsx)("h1", {
					id: "setup-review-title",
					children: i.reviewTitle
				}),
				/* @__PURE__ */ (0, b.jsx)("p", { children: i.reviewIntro }),
				/* @__PURE__ */ (0, b.jsxs)(ee, {
					as: "section",
					children: [/* @__PURE__ */ (0, b.jsxs)("h2", { children: [
						i.download,
						": ",
						ga(S.data.requiredDownloadBytes, e)
					] }), /* @__PURE__ */ (0, b.jsx)("p", { children: i.variableTime })]
				}),
				S.data.managedPrerequisites.length ? /* @__PURE__ */ (0, b.jsxs)(ee, {
					as: "section",
					children: [/* @__PURE__ */ (0, b.jsx)("h2", { children: i.prerequisites }), /* @__PURE__ */ (0, b.jsx)("ul", { children: S.data.managedPrerequisites.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [/* @__PURE__ */ (0, b.jsxs)("strong", { children: [
						e.id,
						" ",
						e.version
					] }), /* @__PURE__ */ (0, b.jsxs)("dl", { children: [
						/* @__PURE__ */ (0, b.jsx)("dt", { children: i.prerequisiteSource }),
						/* @__PURE__ */ (0, b.jsx)("dd", { children: /* @__PURE__ */ (0, b.jsx)("a", {
							href: e.source,
							rel: "noreferrer",
							target: "_blank",
							children: e.source
						}) }),
						/* @__PURE__ */ (0, b.jsx)("dt", { children: i.prerequisiteDestination }),
						/* @__PURE__ */ (0, b.jsx)("dd", { children: e.destination }),
						/* @__PURE__ */ (0, b.jsx)("dt", { children: i.prerequisiteChecksum }),
						/* @__PURE__ */ (0, b.jsx)("dd", { children: /* @__PURE__ */ (0, b.jsx)("code", { children: e.archiveSha256 }) }),
						/* @__PURE__ */ (0, b.jsx)("dt", { children: i.licenses }),
						/* @__PURE__ */ (0, b.jsx)("dd", { children: /* @__PURE__ */ (0, b.jsx)("a", {
							href: e.licenseUrl,
							rel: "noreferrer",
							target: "_blank",
							children: e.licenseName
						}) })
					] })] }, `${e.id}-${e.version}`)) })]
				}) : null,
				/* @__PURE__ */ (0, b.jsxs)("fieldset", {
					className: B.fieldset,
					children: [
						/* @__PURE__ */ (0, b.jsx)("legend", { children: i.destination }),
						/* @__PURE__ */ (0, b.jsxs)("label", { children: [
							/* @__PURE__ */ (0, b.jsx)("input", {
								checked: !f,
								name: "destination",
								onChange: () => p(!1),
								type: "radio"
							}),
							" ",
							/* @__PURE__ */ (0, b.jsx)("strong", { children: i.managed })
						] }),
						/* @__PURE__ */ (0, b.jsxs)("label", { children: [
							/* @__PURE__ */ (0, b.jsx)("input", {
								checked: f,
								name: "destination",
								onChange: () => p(!0),
								type: "radio"
							}),
							" ",
							/* @__PURE__ */ (0, b.jsx)("strong", { children: i.personal }),
							/* @__PURE__ */ (0, b.jsx)("small", { children: i.personalHelp })
						] })
					]
				}),
				te.length ? /* @__PURE__ */ (0, b.jsxs)("fieldset", {
					className: B.fieldset,
					children: [/* @__PURE__ */ (0, b.jsx)("legend", { children: i.licenses }), te.map((e) => /* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
						checked: c.has(e.id),
						onChange: (t) => {
							let n = t.currentTarget.checked;
							l((t) => {
								let r = new Set(t);
								return n ? r.add(e.id) : r.delete(e.id), r;
							});
						},
						type: "checkbox"
					}), /* @__PURE__ */ (0, b.jsxs)("span", { children: [
						i.licenseAccept.replace("{name}", e.name),
						" ",
						/* @__PURE__ */ (0, b.jsx)("a", {
							href: e.url,
							rel: "noreferrer",
							target: "_blank",
							children: i.reviewLicense
						}),
						/* @__PURE__ */ (0, b.jsx)("small", { children: e.summary })
					] })] }, e.id))]
				}) : null,
				/* @__PURE__ */ (0, b.jsxs)("label", {
					className: B.consent,
					children: [
						/* @__PURE__ */ (0, b.jsx)("input", {
							checked: u,
							onChange: (e) => d(e.currentTarget.checked),
							type: "checkbox"
						}),
						" ",
						i.consent
					]
				}),
				/* @__PURE__ */ (0, b.jsxs)("div", {
					className: B.actions,
					children: [/* @__PURE__ */ (0, b.jsx)(T, {
						variant: "secondary",
						onClick: () => s(!1),
						children: i.back
					}), /* @__PURE__ */ (0, b.jsx)(T, {
						disabled: !k,
						loading: ae.isPending,
						loadingLabel: i.starting,
						onClick: () => ae.mutate({
							packId: S.data.packId,
							mode: "automatic",
							acceptedLicenseIds: O,
							usePersonalComfyModels: f
						}),
						children: i.start
					})]
				})
			]
		})]
	}) : /* @__PURE__ */ (0, b.jsxs)("main", {
		className: B.root,
		children: [
			/* @__PURE__ */ (0, b.jsx)(xa, {
				current: 0,
				messages: i
			}),
			/* @__PURE__ */ (0, b.jsxs)("section", {
				className: B.hero,
				"aria-labelledby": "setup-title",
				children: [
					/* @__PURE__ */ (0, b.jsx)(C, {
						tone: S.data.status === "incompatible" ? "warning" : "info",
						children: S.data.summary
					}),
					/* @__PURE__ */ (0, b.jsx)("h1", {
						id: "setup-title",
						children: i.title
					}),
					/* @__PURE__ */ (0, b.jsx)("p", { children: i.intro })
				]
			}),
			/* @__PURE__ */ (0, b.jsxs)(ee, {
				as: "section",
				children: [/* @__PURE__ */ (0, b.jsx)("h2", { children: i.machine }), /* @__PURE__ */ (0, b.jsxs)("dl", {
					className: B.machine,
					children: [
						/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.graphics }), /* @__PURE__ */ (0, b.jsx)("dd", { children: S.data.hardware.gpuName ?? i.unknown })] }),
						/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.memory }), /* @__PURE__ */ (0, b.jsx)("dd", { children: S.data.hardware.vramGb === null ? i.unknown : `${S.data.hardware.vramGb} GB` })] }),
						/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.disk }), /* @__PURE__ */ (0, b.jsx)("dd", { children: ga(S.data.hardware.diskFreeBytes, e) })] }),
						/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.download }), /* @__PURE__ */ (0, b.jsx)("dd", { children: ga(S.data.requiredDownloadBytes, e) })] })
					]
				})]
			}),
			/* @__PURE__ */ (0, b.jsxs)("section", {
				"aria-labelledby": "setup-capabilities",
				children: [/* @__PURE__ */ (0, b.jsx)("h2", {
					id: "setup-capabilities",
					children: i.capabilitiesTitle
				}), /* @__PURE__ */ (0, b.jsx)("div", {
					className: B.capabilities,
					children: i.capabilities.map(([e, t, n]) => {
						let r = Ca(e, S.data);
						return /* @__PURE__ */ (0, b.jsxs)(ee, { children: [
							/* @__PURE__ */ (0, b.jsx)(C, {
								tone: r ? "success" : S.data.status === "incompatible" ? "warning" : "neutral",
								children: r ? i.available : S.data.status === "incompatible" ? i.incompatible : i.toPrepare
							}),
							/* @__PURE__ */ (0, b.jsx)("h3", { children: t }),
							/* @__PURE__ */ (0, b.jsx)("p", { children: n })
						] }, e);
					})
				})]
			}),
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: B.primaryAction,
				children: [/* @__PURE__ */ (0, b.jsx)(T, {
					disabled: S.data.status === "incompatible",
					size: "large",
					onClick: () => s(!0),
					children: i.prepare
				}), n ? /* @__PURE__ */ (0, b.jsx)(T, {
					onClick: () => oe(!0),
					size: "large",
					variant: "secondary",
					children: i.continueManual
				}) : null]
			})
		]
	});
}
//#endregion
//#region src/app/kernel/AppKernelProvider.tsx
var Ea = (0, _.createContext)(null);
function Da({ children: e, kernel: t }) {
	return /* @__PURE__ */ (0, b.jsx)(Ea.Provider, {
		value: t,
		children: e
	});
}
function Oa() {
	let e = (0, _.useContext)(Ea);
	if (e === null) throw Error("AppKernelProvider is missing from the React tree.");
	return e;
}
function ka() {
	return Oa().activeContext;
}
function Aa() {
	let e = ka();
	return (0, _.useSyncExternalStore)(e.subscribe, e.getSnapshot, e.getSnapshot);
}
//#endregion
//#region src/app/kernel/LegacyAppKernel.ts
var ja = {
	projectId: null,
	seriesId: null,
	episodeId: null,
	shotId: null
};
function Ma(e, t) {
	let n = e, r = /* @__PURE__ */ new Set();
	return {
		getSnapshot: () => n,
		setSnapshot: (e) => {
			t(n, e) || (n = e, r.forEach((e) => {
				e();
			}));
		},
		subscribe: (e) => (r.add(e), () => r.delete(e))
	};
}
function Na(e, t) {
	return e.projectId === t.projectId && e.seriesId === t.seriesId && e.episodeId === t.episodeId && e.shotId === t.shotId;
}
function Pa(e) {
	return e.message ? e.title + " · " + e.message : e.title;
}
function Fa(e) {
	return {
		running: "GENERATING",
		succeeded: "COMPLETED",
		failed: "FAILED",
		cancelled: "CANCELLED"
	}[e] ?? e;
}
function Ia(e = {}) {
	let t = e.bridge ?? new br({ host: e.host }), n = Ma(ja, Na), r = !1, i = 0, a = 0, o = [], s = (e) => {
		n.setSnapshot({
			...n.getSnapshot(),
			...e
		});
	}, c = () => (a += 1, "kernel-" + Date.now() + "-" + a), l = {
		activeContext: {
			getSnapshot: n.getSnapshot,
			subscribe: n.subscribe,
			selectProject: (e) => {
				if (e === null) {
					n.setSnapshot(ja);
					return;
				}
				t.dispatch({
					type: "project.activate",
					projectId: e
				});
			},
			selectSeries: (e) => s({
				seriesId: e,
				episodeId: null,
				shotId: null
			}),
			selectEpisode: (e) => {
				if (e === null) {
					s({
						episodeId: null,
						shotId: null
					});
					return;
				}
				t.dispatch({
					type: "episode.select",
					episodeId: e
				});
			},
			selectShot: (e) => s({ shotId: e })
		},
		navigation: { navigate: (e) => {
			t.dispatch({
				type: "workspace.show",
				view: e.view
			});
		} },
		notifications: { notify: (e) => (t.dispatch({
			type: "studio.notify",
			message: Pa(e),
			level: e.level
		}), c()) },
		runtime: {
			environment: "production",
			capabilities: {
				filesystem: !0,
				generation: !0,
				export: !0
			},
			now: () => /* @__PURE__ */ new Date(),
			createId: c,
			reportError: (e) => {
				let n = e instanceof Error ? e.message : String(e);
				t.dispatch({
					type: "notifications.capture-error",
					message: n
				});
			}
		},
		activity: { start: (e) => {
			let n = c(), r = (r) => {
				t.dispatch({
					type: "activity.publish",
					payload: {
						id: n,
						kind: e.kind,
						title: e.label,
						context: e.context,
						...r,
						status: Fa(r.status)
					}
				});
			};
			return r({ status: "running" }), {
				id: n,
				update: (e) => r({
					status: e.status ?? "running",
					...e
				}),
				finish: (e = "succeeded") => r({ status: e })
			};
		} }
	}, u = () => {
		o = [
			t.subscribe("projectChanged", ({ projectId: e }) => {
				n.setSnapshot({
					projectId: e,
					seriesId: null,
					episodeId: null,
					shotId: null
				});
			}),
			t.subscribe("episodeLoaded", ({ episodeId: e, seriesId: t }) => {
				s({
					seriesId: t,
					episodeId: e,
					shotId: null
				});
			}),
			t.subscribe("episodeCleared", () => {
				s({
					seriesId: null,
					episodeId: null,
					shotId: null
				});
			}),
			t.subscribe("shotSelected", ({ episodeId: e, shotId: t }) => {
				s({
					episodeId: e,
					shotId: t
				});
			})
		];
	};
	return {
		kernel: l,
		async start() {
			if (r) return;
			r = !0, i += 1;
			let e = i;
			u(), t.start();
			try {
				let a = await t.initialSnapshot();
				if (!r || i !== e) return;
				n.setSnapshot({
					projectId: a.project.projectId,
					seriesId: a.episode.seriesId,
					episodeId: a.episode.episodeId,
					shotId: null
				});
			} catch (t) {
				r && i === e && l.runtime.reportError(t);
			}
		},
		dispose() {
			r && (r = !1, i += 1, o.forEach((e) => {
				e();
			}), o = [], t.dispose());
		}
	};
}
//#endregion
//#region src/app/router/routes.ts
var La = [
	{
		kind: "primary",
		name: "create",
		path: "/create"
	},
	{
		kind: "primary",
		name: "produce",
		path: "/produce"
	},
	{
		kind: "primary",
		name: "results",
		path: "/results"
	},
	{
		kind: "contextual",
		name: "bible",
		path: "/bible"
	},
	{
		kind: "contextual",
		name: "settings",
		path: "/settings"
	},
	{
		kind: "advanced",
		name: "graph",
		path: "/advanced/graph"
	}
], Ra = new Map(La.map((e) => [e.path, e])), za = new Map(La.map((e) => [e.name, e])), Ba = [
	["project", "projectId"],
	["series", "seriesId"],
	["episode", "episodeId"],
	["shot", "shotId"]
];
function Va(e) {
	return e?.trim() || void 0;
}
function Ha(e) {
	let t = {};
	for (let [n, r] of Ba) {
		let i = Va(e.get(n));
		i !== void 0 && (t[r] = i);
	}
	return t;
}
function Ua(e) {
	let t = e.trim();
	if (t.startsWith("#")) return t.slice(1);
	let n = new URL(t || "/", "http://studio.local");
	return n.hash.startsWith("#/") ? n.hash.slice(1) : `${n.pathname}${n.search}`;
}
function Wa(e) {
	let t = Ua(e), n = new URL(t, "http://studio.local"), r = Ra.get(n.pathname), i = Ha(n.searchParams);
	return r === void 0 ? {
		kind: "not-found",
		attemptedHref: t,
		context: i
	} : {
		kind: r.kind,
		name: r.name,
		context: i
	};
}
function Ga(e) {
	let t = za.get(e.name);
	if (t === void 0 || t.kind !== e.kind) throw Error(`Invalid Studio route: ${e.kind}/${e.name}`);
	let n = new URLSearchParams();
	for (let [t, r] of Ba) {
		let i = Va(e.context[r] ?? null);
		i !== void 0 && n.set(t, i);
	}
	let r = n.toString();
	return `#${t.path}${r ? `?${r}` : ""}`;
}
function Ka(e, t = {}) {
	let n = za.get(e);
	if (n === void 0) throw Error(`Unknown Studio route: ${e}`);
	return {
		kind: n.kind,
		name: e,
		context: t
	};
}
//#endregion
//#region src/app/router/router.ts
function qa(e) {
	let t = /* @__PURE__ */ new Set(), n, r, i = () => {
		let t = e.location.hash;
		return (r === void 0 || t !== n) && (n = t, r = Wa(t || "#/create")), r;
	}, a = () => {
		n = void 0, t.forEach((e) => {
			e();
		});
	};
	return e.addEventListener("hashchange", a), e.addEventListener("popstate", a), {
		getSnapshot: i,
		navigate(t, n = {}) {
			let r = Ga(t), o = i();
			r !== (o.kind === "not-found" ? void 0 : Ga(o)) && (n.replace ? e.history.replaceState(null, "", r) : e.history.pushState(null, "", r), a());
		},
		subscribe(e) {
			return t.add(e), () => t.delete(e);
		}
	};
}
//#endregion
//#region src/app/router/messages.ts
var Ja = {
	fr: {
		navigation: {
			primaryName: "Navigation principale",
			contextualName: "Outils du projet",
			advancedName: "Outils avancés"
		},
		routes: {
			create: "Créer",
			produce: "Produire",
			results: "Résultats",
			bible: "Bible",
			settings: "Réglages",
			graph: "Inspecter le pipeline"
		},
		notFound: {
			title: "Page introuvable",
			description: "Cet espace du Studio n’existe pas.",
			backToCreate: "Revenir à Créer"
		}
	},
	en: {
		navigation: {
			primaryName: "Primary navigation",
			contextualName: "Project tools",
			advancedName: "Advanced tools"
		},
		routes: {
			create: "Create",
			produce: "Produce",
			results: "Results",
			bible: "Bible",
			settings: "Settings",
			graph: "Inspect pipeline"
		},
		notFound: {
			title: "Page not found",
			description: "This Studio space does not exist.",
			backToCreate: "Back to Create"
		}
	}
};
function Ya(e) {
	return e?.toLowerCase().startsWith("en") ? "en" : "fr";
}
function Xa(e) {
	return Ja[Ya(e)];
}
//#endregion
//#region src/app/shell/studioCatalog.ts
function Za(e) {
	return typeof e == "object" && e && !Array.isArray(e) ? e : {};
}
function Qa(e) {
	return typeof e == "string" && e.trim() ? e : null;
}
function $a(e) {
	let t = Za(e).projects;
	return Array.isArray(t) ? t.flatMap((e) => {
		let t = Za(e), n = Qa(t.id);
		return n ? [{
			id: n,
			name: Qa(t.name) ?? n
		}] : [];
	}) : [];
}
function eo(e) {
	let t = Za(e).episodes;
	return Array.isArray(t) ? t.flatMap((e) => {
		let t = Za(e), n = Qa(t.id);
		return n ? [{
			id: n,
			title: Qa(t.title) ?? n,
			seriesId: Qa(t.series_id)
		}] : [];
	}) : [];
}
function to(e) {
	let t = Za(e);
	return {
		enabled: typeof t.enabled == "boolean" ? t.enabled : null,
		serviceCount: Array.isArray(t.services) ? t.services.length : 0
	};
}
function no(e) {
	return {
		projects: or({
			queryKey: ["studio-shell", "projects"],
			queryFn: Je,
			select: $a
		}),
		episodes: or({
			enabled: e !== null,
			queryKey: [
				"studio-shell",
				"episodes",
				e
			],
			queryFn: we,
			select: eo
		})
	};
}
function ro() {
	return or({
		queryKey: ["studio-shell", "runtime"],
		queryFn: vt,
		refetchInterval: 3e4,
		select: to
	});
}
var V = {
	shell: "_shell_1vme5_1",
	header: "_header_1vme5_11",
	brand: "_brand_1vme5_21",
	brandMark: "_brandMark_1vme5_29",
	brandText: "_brandText_1vme5_40",
	primaryNavigation: "_primaryNavigation_1vme5_50",
	toolsMenu: "_toolsMenu_1vme5_60",
	languageSelect: "_languageSelect_1vme5_62",
	contextLink: "_contextLink_1vme5_63",
	actions: "_actions_1vme5_83",
	runtimeStatus: "_runtimeStatus_1vme5_90",
	contextBar: "_contextBar_1vme5_166",
	contextControl: "_contextControl_1vme5_176",
	contextValue: "_contextValue_1vme5_177",
	routeState: "_routeState_1vme5_226"
};
//#endregion
//#region src/app/shell/ContextBar.tsx
function io({ labels: e, onOpenShot: t }) {
	let n = Aa(), r = ka(), { projects: i, episodes: a } = no(n.projectId);
	return /* @__PURE__ */ (0, b.jsxs)("nav", {
		"aria-label": e.context,
		className: V.contextBar,
		"data-context-bar": !0,
		children: [
			/* @__PURE__ */ (0, b.jsxs)("label", {
				className: V.contextControl,
				children: [/* @__PURE__ */ (0, b.jsx)("span", { children: e.project }), /* @__PURE__ */ (0, b.jsxs)("select", {
					"aria-label": e.project,
					disabled: i.isPending || i.data?.length === 0,
					onChange: (e) => r.selectProject(e.currentTarget.value || null),
					value: n.projectId ?? "",
					children: [/* @__PURE__ */ (0, b.jsx)("option", {
						value: "",
						children: i.isPending ? e.loading : e.noProject
					}), i.data?.map((e) => /* @__PURE__ */ (0, b.jsx)("option", {
						value: e.id,
						children: e.name
					}, e.id))]
				})]
			}),
			/* @__PURE__ */ (0, b.jsxs)("span", {
				className: V.contextValue,
				children: [/* @__PURE__ */ (0, b.jsx)("small", { children: e.series }), /* @__PURE__ */ (0, b.jsx)("strong", { children: n.seriesId ?? e.noSeries })]
			}),
			/* @__PURE__ */ (0, b.jsxs)("label", {
				className: V.contextControl,
				children: [/* @__PURE__ */ (0, b.jsx)("span", { children: e.episode }), /* @__PURE__ */ (0, b.jsxs)("select", {
					"aria-label": e.episode,
					disabled: n.projectId === null || a.isPending || a.data?.length === 0,
					onChange: (e) => r.selectEpisode(e.currentTarget.value || null),
					value: n.episodeId ?? "",
					children: [/* @__PURE__ */ (0, b.jsx)("option", {
						value: "",
						children: a.isPending ? e.loading : e.noEpisode
					}), a.data?.map((e) => /* @__PURE__ */ (0, b.jsx)("option", {
						value: e.id,
						children: e.title
					}, e.id))]
				})]
			}),
			/* @__PURE__ */ (0, b.jsxs)("button", {
				"aria-label": `${e.shot}: ${n.shotId ?? e.noShot}`,
				className: V.contextLink,
				disabled: n.episodeId === null,
				onClick: t,
				type: "button",
				children: [/* @__PURE__ */ (0, b.jsx)("small", { children: e.shot }), /* @__PURE__ */ (0, b.jsx)("strong", { children: n.shotId ?? e.noShot })]
			})
		]
	});
}
//#endregion
//#region src/app/shell/messages.ts
var ao = {
	fr: {
		brand: "La Serre",
		studio: "Studio local",
		context: {
			context: "Contexte de création",
			project: "Projet actif",
			series: "Série active",
			episode: "Épisode actif",
			shot: "Plan actif",
			loading: "Chargement…",
			noProject: "Aucun projet",
			noEpisode: "Aucun épisode",
			noSeries: "Aucune série",
			noShot: "Aucun plan"
		},
		tools: {
			tools: "Outils",
			assets: "Assets",
			journal: "Journal",
			guide: "Guide",
			demo: "Démo locale",
			writing: "Écriture",
			settings: "Réglages",
			services: "Moteurs locaux",
			bible: "Bible",
			graph: "Graphe avancé"
		},
		runtime: {
			runtime: "Moteurs locaux",
			checking: "Vérification…",
			ready: "Disponibles",
			unavailable: "À préparer"
		},
		noProjectTitle: "Commence par créer un projet",
		noProjectDescription: "Chaque série, épisode, média et export reste isolé dans son projet local.",
		createProject: "Créer un projet",
		language: "Langue de l’interface"
	},
	en: {
		brand: "La Serre",
		studio: "Local studio",
		context: {
			context: "Creation context",
			project: "Active project",
			series: "Active series",
			episode: "Active episode",
			shot: "Active shot",
			loading: "Loading…",
			noProject: "No project",
			noEpisode: "No episode",
			noSeries: "No series",
			noShot: "No shot"
		},
		tools: {
			tools: "Tools",
			assets: "Assets",
			journal: "Activity log",
			guide: "Guide",
			demo: "Local demo",
			writing: "Writing",
			settings: "Settings",
			services: "Local engines",
			bible: "Bible",
			graph: "Advanced graph"
		},
		runtime: {
			runtime: "Local engines",
			checking: "Checking…",
			ready: "Available",
			unavailable: "Setup required"
		},
		noProjectTitle: "Create a project to get started",
		noProjectDescription: "Each series, episode, media file, and export stays isolated in its local project.",
		createProject: "Create project",
		language: "Interface language"
	}
};
function oo(e) {
	return ao[Ya(e)];
}
//#endregion
//#region src/app/shell/PrimaryNavigation.tsx
var so = [
	"create",
	"produce",
	"results"
];
function co({ messages: e, route: t, onNavigate: n }) {
	return /* @__PURE__ */ (0, b.jsx)("nav", {
		"aria-label": e.navigation.primaryName,
		className: V.primaryNavigation,
		"data-primary-navigation": !0,
		children: so.map((r) => /* @__PURE__ */ (0, b.jsx)("button", {
			"aria-current": t.kind !== "not-found" && t.name === r ? "page" : void 0,
			onClick: () => n(r),
			type: "button",
			children: e.routes[r]
		}, r))
	});
}
//#endregion
//#region src/app/shell/RuntimeStatus.tsx
function lo({ labels: e }) {
	let t = ro(), n = t.isPending ? "checking" : t.isError || t.data?.enabled === !1 ? "unavailable" : "ready", r = e[n];
	return /* @__PURE__ */ (0, b.jsxs)("output", {
		"aria-label": `${e.runtime}: ${r}`,
		className: V.runtimeStatus,
		"data-state": n,
		children: [/* @__PURE__ */ (0, b.jsx)("span", { "aria-hidden": "true" }), r]
	});
}
//#endregion
//#region src/app/shell/ToolsMenu.tsx
var uo = [
	"assets",
	"journal",
	"guide",
	"demo",
	"writing",
	"services"
];
function H({ labels: e, onNavigate: t }) {
	return /* @__PURE__ */ (0, b.jsxs)("details", {
		className: V.toolsMenu,
		"data-tools-menu": !0,
		children: [/* @__PURE__ */ (0, b.jsx)("summary", { children: e.tools }), /* @__PURE__ */ (0, b.jsxs)("div", {
			role: "menu",
			children: [
				/* @__PURE__ */ (0, b.jsx)("button", {
					onClick: () => t("bible"),
					role: "menuitem",
					type: "button",
					children: e.bible
				}),
				/* @__PURE__ */ (0, b.jsx)("button", {
					onClick: () => t("settings"),
					role: "menuitem",
					type: "button",
					children: e.settings
				}),
				/* @__PURE__ */ (0, b.jsx)("button", {
					onClick: () => t("graph"),
					role: "menuitem",
					type: "button",
					children: e.graph
				}),
				uo.map((t) => /* @__PURE__ */ (0, b.jsx)("button", {
					onClick: () => dr(t),
					role: "menuitem",
					type: "button",
					children: e[t]
				}, t))
			]
		})]
	});
}
//#endregion
//#region src/app/shell/useStudioLocale.ts
function U() {
	return Ya(typeof document > "u" ? void 0 : document.documentElement.lang);
}
function fo() {
	let [e, t] = (0, _.useState)(U);
	return (0, _.useEffect)(() => {
		let e = (e) => {
			let n = e.detail;
			t(Ya(n?.locale ?? n?.language ?? U()));
		};
		return window.addEventListener("studio:language-changed", e), () => window.removeEventListener("studio:language-changed", e);
	}, []), [e, (e) => {
		window.dispatchEvent(new CustomEvent("studio:language-change-request", { detail: { locale: e } })), t(e);
	}];
}
//#endregion
//#region src/app/StudioShell.tsx
var po = {
	create: "guided",
	produce: "plan",
	results: "outputs",
	bible: "bible",
	settings: "settings",
	graph: "graph"
}, mo = {
	guided: "#guided-workspace",
	graph: "[data-desktop-panel=\"graph\"]",
	plan: "[data-desktop-panel=\"plan\"]",
	outputs: "[data-desktop-panel=\"outputs\"]",
	bible: "#bible-workspace",
	settings: "[data-desktop-panel=\"settings\"]"
};
function ho() {
	return qa(window);
}
function go(e) {
	return {
		projectId: e.projectId ?? void 0,
		seriesId: e.seriesId ?? void 0,
		episodeId: e.episodeId ?? void 0,
		shotId: e.shotId ?? void 0
	};
}
function _o({ router: e, resolveLegacyRoot: t = (e) => document.querySelector(e) }) {
	let [n] = (0, _.useState)(ho), r = e ?? n, i = (0, _.useSyncExternalStore)(r.subscribe, r.getSnapshot, r.getSnapshot), a = Oa(), o = Aa(), s = (0, _.useRef)(i), [c, l] = (0, _.useState)(!1), [u, d] = fo(), f = Xa(u), p = oo(u), m = no(o.projectId);
	(0, _.useEffect)(() => {
		let e = document.getElementById("studio-react-root");
		if (e) return e.dataset.shellOwner = "react", window.dispatchEvent(new Event("studio:shell-owner-changed")), () => {
			delete e.dataset.shellOwner, window.dispatchEvent(new Event("studio:shell-owner-changed"));
		};
	}, []), (0, _.useEffect)(() => {
		if (c || s.current.kind === "not-found") {
			c || l(!0);
			return;
		}
		let e = s.current.context;
		if (e.projectId && e.projectId !== o.projectId) {
			a.activeContext.selectProject(e.projectId);
			return;
		}
		if (e.seriesId && e.seriesId !== o.seriesId) {
			a.activeContext.selectSeries(e.seriesId);
			return;
		}
		if (e.episodeId && e.episodeId !== o.episodeId) {
			a.activeContext.selectEpisode(e.episodeId);
			return;
		}
		if (e.shotId && e.shotId !== o.shotId) {
			a.activeContext.selectShot(e.shotId);
			return;
		}
		l(!0);
	}, [
		o,
		c,
		a
	]), (0, _.useEffect)(() => {
		c && i.kind !== "not-found" && r.navigate(Ka(i.name, go(o)), { replace: !0 });
	}, [
		o,
		c,
		i,
		r
	]);
	let h = (e) => {
		r.navigate(Ka(e, go(o)));
	}, g = (e) => dr(e), v = (() => {
		if (i.kind === "not-found") return /* @__PURE__ */ (0, b.jsx)(de, {
			action: /* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => h("create"),
				children: f.notFound.backToCreate
			}),
			className: V.routeState,
			description: f.notFound.description,
			title: f.notFound.title
		});
		if (m.projects.isSuccess && m.projects.data.length === 0) return /* @__PURE__ */ (0, b.jsx)(le, {
			action: /* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => g("project-new"),
				children: p.createProject
			}),
			className: V.routeState,
			description: p.noProjectDescription,
			title: p.noProjectTitle
		});
		if (i.name === "create") return /* @__PURE__ */ (0, b.jsx)(Ta, {
			locale: u,
			readyContent: /* @__PURE__ */ (0, b.jsx)(ua, {
				locale: u,
				onNavigate: h
			})
		});
		if (i.name === "bible") return /* @__PURE__ */ (0, b.jsx)(Vr, {
			advancedView: /* @__PURE__ */ (0, b.jsx)(Cr, {
				"aria-label": f.routes.bible,
				className: V.workspaceSlot,
				kernel: a,
				resolveLegacyRoot: () => t(mo.bible),
				unavailable: /* @__PURE__ */ (0, b.jsx)(de, {
					description: f.notFound.description,
					title: f.routes.bible
				}),
				view: "bible"
			}),
			locale: u
		});
		let e = po[i.name], n = mo[e];
		return /* @__PURE__ */ (0, b.jsx)(Cr, {
			"aria-label": f.routes[i.name],
			className: V.workspaceSlot,
			kernel: a,
			resolveLegacyRoot: () => t(n),
			unavailable: /* @__PURE__ */ (0, b.jsx)(de, {
				description: f.notFound.description,
				title: f.routes[i.name]
			}),
			view: e
		}, e);
	})();
	return /* @__PURE__ */ (0, b.jsxs)("div", {
		className: V.shell,
		"data-studio-shell": !0,
		children: [/* @__PURE__ */ (0, b.jsxs)("header", {
			className: V.header,
			children: [
				/* @__PURE__ */ (0, b.jsxs)("a", {
					className: V.brand,
					href: "#/create",
					children: [/* @__PURE__ */ (0, b.jsx)("span", {
						"aria-hidden": "true",
						className: V.brandMark,
						children: "SV"
					}), /* @__PURE__ */ (0, b.jsxs)("span", {
						className: V.brandText,
						children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: p.brand }), /* @__PURE__ */ (0, b.jsx)("small", { children: p.studio })]
					})]
				}),
				/* @__PURE__ */ (0, b.jsx)(co, {
					messages: f,
					onNavigate: h,
					route: i
				}),
				/* @__PURE__ */ (0, b.jsxs)("div", {
					className: V.actions,
					children: [
						/* @__PURE__ */ (0, b.jsx)(lo, { labels: p.runtime }),
						/* @__PURE__ */ (0, b.jsx)(H, {
							labels: p.tools,
							onNavigate: h
						}),
						/* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("span", {
							className: "sr-only",
							children: p.language
						}), /* @__PURE__ */ (0, b.jsxs)("select", {
							"aria-label": p.language,
							className: V.languageSelect,
							onChange: (e) => d(e.currentTarget.value === "en" ? "en" : "fr"),
							value: u,
							children: [/* @__PURE__ */ (0, b.jsx)("option", {
								value: "fr",
								children: "FR"
							}), /* @__PURE__ */ (0, b.jsx)("option", {
								value: "en",
								children: "EN"
							})]
						})] })
					]
				}),
				/* @__PURE__ */ (0, b.jsx)(io, {
					labels: p.context,
					onOpenShot: () => h("produce")
				})
			]
		}), v]
	});
}
//#endregion
//#region src/app/StudioReactRoot.tsx
function vo() {
	let e = Aa();
	return /* @__PURE__ */ (0, b.jsx)(x, {
		"data-episode-id": e.episodeId ?? "",
		"data-project-id": e.projectId ?? "",
		"data-series-id": e.seriesId ?? "",
		"data-shot-id": e.shotId ?? "",
		"data-studio-kernel-context": !0,
		role: "status",
		children: e.projectId ? "Contexte Studio synchronisé" : "Contexte Studio en attente"
	});
}
function yo() {
	let [e] = (0, _.useState)(Ia);
	return (0, _.useEffect)(() => (e.start(), () => e.dispose()), [e]), /* @__PURE__ */ (0, b.jsx)(Da, {
		kernel: e.kernel,
		children: /* @__PURE__ */ (0, b.jsxs)(Vt, {
			client: lr,
			children: [
				/* @__PURE__ */ (0, b.jsx)(vo, {}),
				/* @__PURE__ */ (0, b.jsx)(_o, {}),
				L.map(({ Component: e, id: t }) => /* @__PURE__ */ (0, b.jsx)(e, {}, t))
			]
		})
	});
}
function bo() {
	return /* @__PURE__ */ (0, b.jsx)(yo, {});
}
//#endregion
//#region src/main.tsx
var xo = document.getElementById("studio-react-root");
xo && (xo.dataset.reactMounted = "true", (0, v.createRoot)(xo).render(/* @__PURE__ */ (0, b.jsx)(_.StrictMode, { children: /* @__PURE__ */ (0, b.jsx)(bo, {}) })));
//#endregion
