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
	function ee(e, n, r) {
		var i = r.ref;
		return {
			$$typeof: t,
			type: e,
			key: n,
			ref: i === void 0 ? null : i,
			props: r
		};
	}
	function te(e, t) {
		return ee(e.type, t, e.props);
	}
	function E(e) {
		return typeof e == "object" && !!e && e.$$typeof === t;
	}
	function ne(e) {
		var t = {
			"=": "=0",
			":": "=2"
		};
		return "$" + e.replace(/[=:]/g, function(e) {
			return t[e];
		});
	}
	var re = /\/+/g;
	function ie(e, t) {
		return typeof e == "object" && e && e.key != null ? ne("" + e.key) : t.toString(36);
	}
	function ae(e) {
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
	function oe(e, r, i, a, o) {
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
				case d: return c = e._init, oe(c(e._payload), r, i, a, o);
			}
		}
		if (c) return o = o(e), c = a === "" ? "." + ie(e, 0) : a, S(o) ? (i = "", c != null && (i = c.replace(re, "$&/") + "/"), oe(o, r, i, "", function(e) {
			return e;
		})) : o != null && (E(o) && (o = te(o, i + (o.key == null || e && e.key === o.key ? "" : ("" + o.key).replace(re, "$&/") + "/") + c)), r.push(o)), 1;
		c = 0;
		var l = a === "" ? "." : a + ":";
		if (S(e)) for (var u = 0; u < e.length; u++) a = e[u], s = l + ie(a, u), c += oe(a, r, i, s, o);
		else if (u = m(e), typeof u == "function") for (e = u.call(e), u = 0; !(a = e.next()).done;) a = a.value, s = l + ie(a, u++), c += oe(a, r, i, s, o);
		else if (s === "object") {
			if (typeof e.then == "function") return oe(ae(e), r, i, a, o);
			throw r = String(e), Error("Objects are not valid as a React child (found: " + (r === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : r) + "). If you meant to render a collection of children, use an array instead.");
		}
		return c;
	}
	function se(e, t, n) {
		if (e == null) return e;
		var r = [], i = 0;
		return oe(e, r, "", "", function(e) {
			return t.call(n, e, i++);
		}), r;
	}
	function ce(e) {
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
	var D = typeof reportError == "function" ? reportError : function(e) {
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
	}, O = {
		map: se,
		forEach: function(e, t, n) {
			se(e, function() {
				t.apply(this, arguments);
			}, n);
		},
		count: function(e) {
			var t = 0;
			return se(e, function() {
				t++;
			}), t;
		},
		toArray: function(e) {
			return se(e, function(e) {
				return e;
			}) || [];
		},
		only: function(e) {
			if (!E(e)) throw Error("React.Children.only expected to receive a single React element child.");
			return e;
		}
	};
	e.Activity = f, e.Children = O, e.Component = v, e.Fragment = r, e.Profiler = a, e.PureComponent = b, e.StrictMode = i, e.Suspense = l, e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = w, e.__COMPILER_RUNTIME = {
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
		return ee(e.type, i, r);
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
		return ee(e, a, i);
	}, e.createRef = function() {
		return { current: null };
	}, e.forwardRef = function(e) {
		return {
			$$typeof: c,
			render: e
		};
	}, e.isValidElement = E, e.lazy = function(e) {
		return {
			$$typeof: d,
			_payload: {
				_status: -1,
				_result: e
			},
			_init: ce
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
			i !== null && i(n, r), typeof r == "object" && r && typeof r.then == "function" && r.then(C, D);
		} catch (e) {
			D(e);
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
			if (n(c) !== null) m = !0, S || (S = !0, E());
			else {
				var t = n(l);
				t !== null && ie(x, t.startTime - e);
			}
		}
	}
	var S = !1, C = -1, w = 5, T = -1;
	function ee() {
		return g ? !0 : !(e.unstable_now() - T < w);
	}
	function te() {
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
							for (b(t), d = n(c); d !== null && !(d.expirationTime > t && ee());) {
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
								u !== null && ie(x, u.startTime - t), i = !1;
							}
						}
						break a;
					} finally {
						d = null, f = a, p = !1;
					}
					i = void 0;
				}
			} finally {
				i ? E() : S = !1;
			}
		}
	}
	var E;
	if (typeof y == "function") E = function() {
		y(te);
	};
	else if (typeof MessageChannel < "u") {
		var ne = new MessageChannel(), re = ne.port2;
		ne.port1.onmessage = te, E = function() {
			re.postMessage(null);
		};
	} else E = function() {
		_(te, 0);
	};
	function ie(t, n) {
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
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (v(C), C = -1) : h = !0, ie(x, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, S || (S = !0, E()))), r;
	}, e.unstable_shouldYield = ee, e.unstable_wrapCallback = function(e) {
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
	var h = Object.assign, g = Symbol.for("react.element"), _ = Symbol.for("react.transitional.element"), v = Symbol.for("react.portal"), y = Symbol.for("react.fragment"), b = Symbol.for("react.strict_mode"), x = Symbol.for("react.profiler"), S = Symbol.for("react.consumer"), C = Symbol.for("react.context"), w = Symbol.for("react.forward_ref"), T = Symbol.for("react.suspense"), ee = Symbol.for("react.suspense_list"), te = Symbol.for("react.memo"), E = Symbol.for("react.lazy"), ne = Symbol.for("react.activity"), re = Symbol.for("react.memo_cache_sentinel"), ie = Symbol.iterator;
	function ae(e) {
		return typeof e != "object" || !e ? null : (e = ie && e[ie] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var oe = Symbol.for("react.client.reference");
	function se(e) {
		if (e == null) return null;
		if (typeof e == "function") return e.$$typeof === oe ? null : e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case y: return "Fragment";
			case x: return "Profiler";
			case b: return "StrictMode";
			case T: return "Suspense";
			case ee: return "SuspenseList";
			case ne: return "Activity";
		}
		if (typeof e == "object") switch (e.$$typeof) {
			case v: return "Portal";
			case C: return e.displayName || "Context";
			case S: return (e._context.displayName || "Context") + ".Consumer";
			case w:
				var t = e.render;
				return e = e.displayName, e ||= (e = t.displayName || t.name || "", e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
			case te: return t = e.displayName || null, t === null ? se(e.type) || "Memo" : t;
			case E:
				t = e._payload, e = e._init;
				try {
					return se(e(t));
				} catch {}
		}
		return null;
	}
	var ce = Array.isArray, D = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, O = r.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, le = {
		pending: !1,
		data: null,
		method: null,
		action: null
	}, ue = [], de = -1;
	function fe(e) {
		return { current: e };
	}
	function pe(e) {
		0 > de || (e.current = ue[de], ue[de] = null, de--);
	}
	function k(e, t) {
		de++, ue[de] = e.current, e.current = t;
	}
	var me = fe(null), he = fe(null), ge = fe(null), _e = fe(null);
	function ve(e, t) {
		switch (k(ge, t), k(he, e), k(me, null), t.nodeType) {
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
		pe(me), k(me, e);
	}
	function ye() {
		pe(me), pe(he), pe(ge);
	}
	function A(e) {
		e.memoizedState !== null && k(_e, e);
		var t = me.current, n = Hd(t, e.type);
		t !== n && (k(he, e), k(me, n));
	}
	function be(e) {
		he.current === e && (pe(me), pe(he)), _e.current === e && (pe(_e), Qf._currentValue = le);
	}
	var xe, Se;
	function Ce(e) {
		if (xe === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			xe = t && t[1] || "", Se = -1 < e.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < e.stack.indexOf("@") ? "@unknown:0:0" : "";
		}
		return "\n" + xe + e + Se;
	}
	var we = !1;
	function Te(e, t) {
		if (!e || we) return "";
		we = !0;
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
			we = !1, Error.prepareStackTrace = n;
		}
		return (n = e ? e.displayName || e.name : "") ? Ce(n) : "";
	}
	function Ee(e, t) {
		switch (e.tag) {
			case 26:
			case 27:
			case 5: return Ce(e.type);
			case 16: return Ce("Lazy");
			case 13: return e.child !== t && t !== null ? Ce("Suspense Fallback") : Ce("Suspense");
			case 19: return Ce("SuspenseList");
			case 0:
			case 15: return Te(e.type, !1);
			case 11: return Te(e.type.render, !1);
			case 1: return Te(e.type, !0);
			case 31: return Ce("Activity");
			default: return "";
		}
	}
	function De(e) {
		try {
			var t = "", n = null;
			do
				t += Ee(e, n), n = e, e = e.return;
			while (e);
			return t;
		} catch (e) {
			return "\nError generating stack: " + e.message + "\n" + e.stack;
		}
	}
	var Oe = Object.prototype.hasOwnProperty, ke = t.unstable_scheduleCallback, Ae = t.unstable_cancelCallback, je = t.unstable_shouldYield, Me = t.unstable_requestPaint, Ne = t.unstable_now, Pe = t.unstable_getCurrentPriorityLevel, Fe = t.unstable_ImmediatePriority, Ie = t.unstable_UserBlockingPriority, Le = t.unstable_NormalPriority, Re = t.unstable_LowPriority, ze = t.unstable_IdlePriority, Be = t.log, Ve = t.unstable_setDisableYieldValue, He = null, Ue = null;
	function We(e) {
		if (typeof Be == "function" && Ve(e), Ue && typeof Ue.setStrictMode == "function") try {
			Ue.setStrictMode(He, e);
		} catch {}
	}
	var Ge = Math.clz32 ? Math.clz32 : Je, Ke = Math.log, qe = Math.LN2;
	function Je(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (Ke(e) / qe | 0) | 0;
	}
	var Ye = 256, Xe = 262144, Ze = 4194304;
	function Qe(e) {
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
	function $e(e, t, n) {
		var r = e.pendingLanes;
		if (r === 0) return 0;
		var i = 0, a = e.suspendedLanes, o = e.pingedLanes;
		e = e.warmLanes;
		var s = r & 134217727;
		return s === 0 ? (s = r & ~a, s === 0 ? o === 0 ? n || (n = r & ~e, n !== 0 && (i = Qe(n))) : i = Qe(o) : i = Qe(s)) : (r = s & ~a, r === 0 ? (o &= s, o === 0 ? n || (n = s & ~e, n !== 0 && (i = Qe(n))) : i = Qe(o)) : i = Qe(r)), i === 0 ? 0 : t !== 0 && t !== i && (t & a) === 0 && (a = i & -i, n = t & -t, a >= n || a === 32 && n & 4194048) ? t : i;
	}
	function et(e, t) {
		return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
	}
	function tt(e, t) {
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
	function nt() {
		var e = Ze;
		return Ze <<= 1, !(Ze & 62914560) && (Ze = 4194304), e;
	}
	function rt(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function it(e, t) {
		e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
	}
	function at(e, t, n, r, i, a) {
		var o = e.pendingLanes;
		e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
		var s = e.entanglements, c = e.expirationTimes, l = e.hiddenUpdates;
		for (n = o & ~n; 0 < n;) {
			var u = 31 - Ge(n), d = 1 << u;
			s[u] = 0, c[u] = -1;
			var f = l[u];
			if (f !== null) for (l[u] = null, u = 0; u < f.length; u++) {
				var p = f[u];
				p !== null && (p.lane &= -536870913);
			}
			n &= ~d;
		}
		r !== 0 && ot(e, r, 0), a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t));
	}
	function ot(e, t, n) {
		e.pendingLanes |= t, e.suspendedLanes &= ~t;
		var r = 31 - Ge(t);
		e.entangledLanes |= t, e.entanglements[r] = e.entanglements[r] | 1073741824 | n & 261930;
	}
	function st(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - Ge(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	function ct(e, t) {
		var n = t & -t;
		return n = n & 42 ? 1 : lt(n), (n & (e.suspendedLanes | t)) === 0 ? n : 0;
	}
	function lt(e) {
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
	function ut(e) {
		return e &= -e, 2 < e ? 8 < e ? e & 134217727 ? 32 : 268435456 : 8 : 2;
	}
	function dt() {
		var e = O.p;
		return e === 0 ? (e = window.event, e === void 0 ? 32 : mp(e.type)) : e;
	}
	function ft(e, t) {
		var n = O.p;
		try {
			return O.p = e, t();
		} finally {
			O.p = n;
		}
	}
	var pt = Math.random().toString(36).slice(2), j = "__reactFiber$" + pt, mt = "__reactProps$" + pt, ht = "__reactContainer$" + pt, gt = "__reactEvents$" + pt, _t = "__reactListeners$" + pt, vt = "__reactHandles$" + pt, yt = "__reactResources$" + pt, M = "__reactMarker$" + pt;
	function bt(e) {
		delete e[j], delete e[mt], delete e[gt], delete e[_t], delete e[vt];
	}
	function xt(e) {
		var t = e[j];
		if (t) return t;
		for (var n = e.parentNode; n;) {
			if (t = n[ht] || n[j]) {
				if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = df(e); e !== null;) {
					if (n = e[j]) return n;
					e = df(e);
				}
				return t;
			}
			e = n, n = e.parentNode;
		}
		return null;
	}
	function St(e) {
		if (e = e[j] || e[ht]) {
			var t = e.tag;
			if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e;
		}
		return null;
	}
	function Ct(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
		throw Error(i(33));
	}
	function wt(e) {
		var t = e[yt];
		return t ||= e[yt] = {
			hoistableStyles: /* @__PURE__ */ new Map(),
			hoistableScripts: /* @__PURE__ */ new Map()
		}, t;
	}
	function Tt(e) {
		e[M] = !0;
	}
	var Et = /* @__PURE__ */ new Set(), Dt = {};
	function Ot(e, t) {
		kt(e, t), kt(e + "Capture", t);
	}
	function kt(e, t) {
		for (Dt[e] = t, e = 0; e < t.length; e++) Et.add(t[e]);
	}
	var At = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), jt = {}, Mt = {};
	function Nt(e) {
		return Oe.call(Mt, e) ? !0 : Oe.call(jt, e) ? !1 : At.test(e) ? Mt[e] = !0 : (jt[e] = !0, !1);
	}
	function Pt(e, t, n) {
		if (Nt(t)) {
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
	function Ft(e, t, n) {
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
	function It(e, t, n, r) {
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
	function Lt(e) {
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
	function Rt(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function zt(e, t, n) {
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
	function Bt(e) {
		if (!e._valueTracker) {
			var t = Rt(e) ? "checked" : "value";
			e._valueTracker = zt(e, t, "" + e[t]);
		}
	}
	function Vt(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = Rt(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	function Ht(e) {
		if (e ||= typeof document < "u" ? document : void 0, e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	var Ut = /[\n"\\]/g;
	function Wt(e) {
		return e.replace(Ut, function(e) {
			return "\\" + e.charCodeAt(0).toString(16) + " ";
		});
	}
	function N(e, t, n, r, i, a, o, s) {
		e.name = "", o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" ? e.type = o : e.removeAttribute("type"), t == null ? o !== "submit" && o !== "reset" || e.removeAttribute("value") : o === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + Lt(t)) : e.value !== "" + Lt(t) && (e.value = "" + Lt(t)), t == null ? n == null ? r != null && e.removeAttribute("value") : Kt(e, o, Lt(n)) : Kt(e, o, Lt(t)), i == null && a != null && (e.defaultChecked = !!a), i != null && (e.checked = i && typeof i != "function" && typeof i != "symbol"), s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" ? e.name = "" + Lt(s) : e.removeAttribute("name");
	}
	function Gt(e, t, n, r, i, a, o, s) {
		if (a != null && typeof a != "function" && typeof a != "symbol" && typeof a != "boolean" && (e.type = a), t != null || n != null) {
			if (!(a !== "submit" && a !== "reset" || t != null)) {
				Bt(e);
				return;
			}
			n = n == null ? "" : "" + Lt(n), t = t == null ? n : "" + Lt(t), s || t === e.value || (e.value = t), e.defaultValue = t;
		}
		r ??= i, r = typeof r != "function" && typeof r != "symbol" && !!r, e.checked = s ? e.checked : !!r, e.defaultChecked = !!r, o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" && (e.name = o), Bt(e);
	}
	function Kt(e, t, n) {
		t === "number" && Ht(e.ownerDocument) === e || e.defaultValue === "" + n || (e.defaultValue = "" + n);
	}
	function qt(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + Lt(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function Jt(e, t, n) {
		if (t != null && (t = "" + Lt(t), t !== e.value && (e.value = t), n == null)) {
			e.defaultValue !== t && (e.defaultValue = t);
			return;
		}
		e.defaultValue = n == null ? "" : "" + Lt(n);
	}
	function Yt(e, t, n, r) {
		if (t == null) {
			if (r != null) {
				if (n != null) throw Error(i(92));
				if (ce(r)) {
					if (1 < r.length) throw Error(i(93));
					r = r[0];
				}
				n = r;
			}
			n ??= "", t = n;
		}
		n = Lt(t), e.defaultValue = n, r = e.textContent, r === n && r !== "" && r !== null && (e.value = r), Bt(e);
	}
	function Xt(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var Zt = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
	function Qt(e, t, n) {
		var r = t.indexOf("--") === 0;
		n == null || typeof n == "boolean" || n === "" ? r ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : r ? e.setProperty(t, n) : typeof n != "number" || n === 0 || Zt.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px";
	}
	function $t(e, t, n) {
		if (t != null && typeof t != "object") throw Error(i(62));
		if (e = e.style, n != null) {
			for (var r in n) !n.hasOwnProperty(r) || t != null && t.hasOwnProperty(r) || (r.indexOf("--") === 0 ? e.setProperty(r, "") : r === "float" ? e.cssFloat = "" : e[r] = "");
			for (var a in t) r = t[a], t.hasOwnProperty(a) && n[a] !== r && Qt(e, a, r);
		} else for (var o in t) t.hasOwnProperty(o) && Qt(e, o, t[o]);
	}
	function en(e) {
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
	var tn = /* @__PURE__ */ new Map([
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
	]), nn = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function rn(e) {
		return nn.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
	}
	function an() {}
	var on = null;
	function sn(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var cn = null, ln = null;
	function un(e) {
		var t = St(e);
		if (t && (e = t.stateNode)) {
			var n = e[mt] || null;
			a: switch (e = t.stateNode, t.type) {
				case "input":
					if (N(e, n.value, n.defaultValue, n.defaultValue, n.checked, n.defaultChecked, n.type, n.name), t = n.name, n.type === "radio" && t != null) {
						for (n = e; n.parentNode;) n = n.parentNode;
						for (n = n.querySelectorAll("input[name=\"" + Wt("" + t) + "\"][type=\"radio\"]"), t = 0; t < n.length; t++) {
							var r = n[t];
							if (r !== e && r.form === e.form) {
								var a = r[mt] || null;
								if (!a) throw Error(i(90));
								N(r, a.value, a.defaultValue, a.defaultValue, a.checked, a.defaultChecked, a.type, a.name);
							}
						}
						for (t = 0; t < n.length; t++) r = n[t], r.form === e.form && Vt(r);
					}
					break a;
				case "textarea":
					Jt(e, n.value, n.defaultValue);
					break a;
				case "select": t = n.value, t != null && qt(e, !!n.multiple, t, !1);
			}
		}
	}
	var dn = !1;
	function fn(e, t, n) {
		if (dn) return e(t, n);
		dn = !0;
		try {
			return e(t);
		} finally {
			if (dn = !1, (cn !== null || ln !== null) && (bu(), cn && (t = cn, e = ln, ln = cn = null, un(t), e))) for (t = 0; t < e.length; t++) un(e[t]);
		}
	}
	function pn(e, t) {
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
	var mn = !(typeof window > "u" || window.document === void 0 || window.document.createElement === void 0), hn = !1;
	if (mn) try {
		var gn = {};
		Object.defineProperty(gn, "passive", { get: function() {
			hn = !0;
		} }), window.addEventListener("test", gn, gn), window.removeEventListener("test", gn, gn);
	} catch {
		hn = !1;
	}
	var _n = null, vn = null, yn = null;
	function bn() {
		if (yn) return yn;
		var e, t = vn, n = t.length, r, i = "value" in _n ? _n.value : _n.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return yn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function xn(e) {
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
			return e.type === "keypress" ? (e = xn(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Bn[e.keyCode] || "Unidentified" : "";
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
			return e.type === "keypress" ? xn(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? xn(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
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
	], Zn = mn && "CompositionEvent" in window, Qn = null;
	mn && "documentMode" in document && (Qn = document.documentMode);
	var $n = mn && "TextEvent" in window && !Qn, er = mn && (!Zn || Qn && 8 < Qn && 11 >= Qn), tr = " ", nr = !1;
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
		if (ar) return e === "compositionend" || !Zn && rr(e, t) ? (e = bn(), yn = vn = _n = null, ar = !1, e) : null;
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
	function P(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!cr[e.type] : t === "textarea";
	}
	function lr(e, t, n, r) {
		cn ? ln ? ln.push(r) : ln = [r] : cn = r, t = Ed(t, "onChange"), 0 < t.length && (n = new En("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var ur = null, dr = null;
	function fr(e) {
		yd(e, 0);
	}
	function pr(e) {
		if (Vt(Ct(e))) return e;
	}
	function mr(e, t) {
		if (e === "change") return t;
	}
	var hr = !1;
	if (mn) {
		var gr;
		if (mn) {
			var _r = "oninput" in document;
			if (!_r) {
				var vr = document.createElement("div");
				vr.setAttribute("oninput", "return;"), _r = typeof vr.oninput == "function";
			}
			gr = _r;
		} else gr = !1;
		hr = gr && (!document.documentMode || 9 < document.documentMode);
	}
	function yr() {
		ur && (ur.detachEvent("onpropertychange", br), dr = ur = null);
	}
	function br(e) {
		if (e.propertyName === "value" && pr(dr)) {
			var t = [];
			lr(t, dr, e, sn(e)), fn(fr, t);
		}
	}
	function xr(e, t, n) {
		e === "focusin" ? (yr(), ur = t, dr = n, ur.attachEvent("onpropertychange", br)) : e === "focusout" && yr();
	}
	function Sr(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return pr(dr);
	}
	function Cr(e, t) {
		if (e === "click") return pr(t);
	}
	function wr(e, t) {
		if (e === "input" || e === "change") return pr(t);
	}
	function Tr(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var Er = typeof Object.is == "function" ? Object.is : Tr;
	function Dr(e, t) {
		if (Er(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!Oe.call(t, i) || !Er(e[i], t[i])) return !1;
		}
		return !0;
	}
	function Or(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function kr(e, t) {
		var n = Or(e);
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
			n = Or(n);
		}
	}
	function Ar(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Ar(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function jr(e) {
		e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
		for (var t = Ht(e.document); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = Ht(e.document);
		}
		return t;
	}
	function Mr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	var Nr = mn && "documentMode" in document && 11 >= document.documentMode, Pr = null, Fr = null, Ir = null, Lr = !1;
	function Rr(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		Lr || Pr == null || Pr !== Ht(r) || (r = Pr, "selectionStart" in r && Mr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), Ir && Dr(Ir, r) || (Ir = r, r = Ed(Fr, "onSelect"), 0 < r.length && (t = new En("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = Pr)));
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
	}, Vr = {}, F = {};
	mn && (F = document.createElement("div").style, "AnimationEvent" in window || (delete Br.animationend.animation, delete Br.animationiteration.animation, delete Br.animationstart.animation), "TransitionEvent" in window || delete Br.transitionend.transition);
	function Hr(e) {
		if (Vr[e]) return Vr[e];
		if (!Br[e]) return e;
		var t = Br[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in F) return Vr[e] = t[n];
		return e;
	}
	var Ur = Hr("animationend"), Wr = Hr("animationiteration"), Gr = Hr("animationstart"), Kr = Hr("transitionrun"), qr = Hr("transitionstart"), Jr = Hr("transitioncancel"), Yr = Hr("transitionend"), I = /* @__PURE__ */ new Map(), Xr = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	Xr.push("scrollEnd");
	function Zr(e, t) {
		I.set(e, t), Ot(t, [e]);
	}
	var Qr = typeof reportError == "function" ? reportError : function(e) {
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
	}, $r = [], ei = 0, ti = 0;
	function ni() {
		for (var e = ei, t = ti = ei = 0; t < e;) {
			var n = $r[t];
			$r[t++] = null;
			var r = $r[t];
			$r[t++] = null;
			var i = $r[t];
			$r[t++] = null;
			var a = $r[t];
			if ($r[t++] = null, r !== null && i !== null) {
				var o = r.pending;
				o === null ? i.next = i : (i.next = o.next, o.next = i), r.pending = i;
			}
			a !== 0 && oi(n, i, a);
		}
	}
	function ri(e, t, n, r) {
		$r[ei++] = e, $r[ei++] = t, $r[ei++] = n, $r[ei++] = r, ti |= r, e.lanes |= r, e = e.alternate, e !== null && (e.lanes |= r);
	}
	function ii(e, t, n, r) {
		return ri(e, t, n, r), si(e);
	}
	function ai(e, t) {
		return ri(e, null, null, t), si(e);
	}
	function oi(e, t, n) {
		e.lanes |= n;
		var r = e.alternate;
		r !== null && (r.lanes |= n);
		for (var i = !1, a = e.return; a !== null;) a.childLanes |= n, r = a.alternate, r !== null && (r.childLanes |= n), a.tag === 22 && (e = a.stateNode, e === null || e._visibility & 1 || (i = !0)), e = a, a = a.return;
		return e.tag === 3 ? (a = e.stateNode, i && t !== null && (i = 31 - Ge(n), e = a.hiddenUpdates, r = e[i], r === null ? e[i] = [t] : r.push(t), t.lane = n | 536870912), a) : null;
	}
	function si(e) {
		if (50 < du) throw du = 0, fu = null, Error(i(185));
		for (var t = e.return; t !== null;) e = t, t = e.return;
		return e.tag === 3 ? e.stateNode : null;
	}
	var ci = {};
	function li(e, t, n, r) {
		this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
	}
	function ui(e, t, n, r) {
		return new li(e, t, n, r);
	}
	function di(e) {
		return e = e.prototype, !(!e || !e.isReactComponent);
	}
	function fi(e, t) {
		var n = e.alternate;
		return n === null ? (n = ui(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 65011712, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
	}
	function pi(e, t) {
		e.flags &= 65011714;
		var n = e.alternate;
		return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}), e;
	}
	function mi(e, t, n, r, a, o) {
		var s = 0;
		if (r = e, typeof e == "function") di(e) && (s = 1);
		else if (typeof e == "string") s = Uf(e, n, me.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
		else a: switch (e) {
			case ne: return e = ui(31, n, t, a), e.elementType = ne, e.lanes = o, e;
			case y: return hi(n.children, a, o, t);
			case b:
				s = 8, a |= 24;
				break;
			case x: return e = ui(12, n, t, a | 2), e.elementType = x, e.lanes = o, e;
			case T: return e = ui(13, n, t, a), e.elementType = T, e.lanes = o, e;
			case ee: return e = ui(19, n, t, a), e.elementType = ee, e.lanes = o, e;
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
					case te:
						s = 14;
						break a;
					case E:
						s = 16, r = null;
						break a;
				}
				s = 29, n = Error(i(130, e === null ? "null" : typeof e, "")), r = null;
		}
		return t = ui(s, n, t, a), t.elementType = e, t.type = r, t.lanes = o, t;
	}
	function hi(e, t, n, r) {
		return e = ui(7, e, r, t), e.lanes = n, e;
	}
	function gi(e, t, n) {
		return e = ui(6, e, null, t), e.lanes = n, e;
	}
	function _i(e) {
		var t = ui(18, null, null, 0);
		return t.stateNode = e, t;
	}
	function vi(e, t, n) {
		return t = ui(4, e.children === null ? [] : e.children, e.key, t), t.lanes = n, t.stateNode = {
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
				stack: De(t)
			}, yi.set(e, t), t) : n;
		}
		return {
			value: e,
			source: t,
			stack: De(t)
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
		var i = 32 - Ge(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - Ge(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, Oi = 1 << 32 - Ge(t) + i | n << i | r, ki = a + e;
		} else Oi = 1 << a | n << i | r, ki = e;
	}
	function Mi(e) {
		e.return !== null && (Ai(e, 1), ji(e, 1, 0));
	}
	function L(e) {
		for (; e === Ci;) Ci = xi[--Si], xi[Si] = null, wi = xi[--Si], xi[Si] = null;
		for (; e === Di;) Di = Ti[--Ei], Ti[Ei] = null, ki = Ti[--Ei], Ti[Ei] = null, Oi = Ti[--Ei], Ti[Ei] = null;
	}
	function Ni(e, t) {
		Ti[Ei++] = Oi, Ti[Ei++] = ki, Ti[Ei++] = Di, Oi = t.id, ki = t.overflow, Di = e;
	}
	var Pi = null, R = null, z = !1, Fi = null, Ii = !1, Li = Error(i(519));
	function Ri(e) {
		throw Wi(bi(Error(i(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", "")), e)), Li;
	}
	function zi(e) {
		var t = e.stateNode, n = e.type, r = e.memoizedProps;
		switch (t[j] = e, t[mt] = r, n) {
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
				Q("invalid", t), Gt(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0);
				break;
			case "select":
				Q("invalid", t);
				break;
			case "textarea": Q("invalid", t), Yt(t, r.value, r.defaultValue, r.children);
		}
		n = r.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || !0 === r.suppressHydrationWarning || Md(t.textContent, n) ? (r.popover != null && (Q("beforetoggle", t), Q("toggle", t)), r.onScroll != null && Q("scroll", t), r.onScrollEnd != null && Q("scrollend", t), r.onClick != null && (t.onclick = an), t = !0) : t = !1, t || Ri(e, !0);
	}
	function Bi(e) {
		for (Pi = e.return; Pi;) switch (Pi.tag) {
			case 5:
			case 31:
			case 13:
				Ii = !1;
				return;
			case 27:
			case 3:
				Ii = !0;
				return;
			default: Pi = Pi.return;
		}
	}
	function Vi(e) {
		if (e !== Pi) return !1;
		if (!z) return Bi(e), z = !0, !1;
		var t = e.tag, n;
		if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = n === "form" || n === "button" || Ud(e.type, e.memoizedProps)), n = !n), n && R && Ri(e), Bi(e), t === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(317));
			R = uf(e);
		} else if (t === 31) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(317));
			R = uf(e);
		} else t === 27 ? (t = R, Zd(e.type) ? (e = lf, lf = null, R = e) : R = t) : R = Pi ? cf(e.stateNode.nextSibling) : null;
		return !0;
	}
	function Hi() {
		R = Pi = null, z = !1;
	}
	function Ui() {
		var e = Fi;
		return e !== null && (Zl === null ? Zl = e : Zl.push.apply(Zl, e), Fi = null), e;
	}
	function Wi(e) {
		Fi === null ? Fi = [e] : Fi.push(e);
	}
	var Gi = fe(null), Ki = null, qi = null;
	function Ji(e, t, n) {
		k(Gi, t._currentValue), t._currentValue = n;
	}
	function Yi(e) {
		e._currentValue = Gi.current, pe(Gi);
	}
	function Xi(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function Zi(e, t, n, r) {
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
						o.lanes |= n, c = o.alternate, c !== null && (c.lanes |= n), Xi(o.return, n, e), r || (s = null);
						break a;
					}
					o = c.next;
				}
			} else if (a.tag === 18) {
				if (s = a.return, s === null) throw Error(i(341));
				s.lanes |= n, o = s.alternate, o !== null && (o.lanes |= n), Xi(s, n, e), s = null;
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
	function Qi(e, t, n, r) {
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
					Er(a.pendingProps.value, s.value) || (e === null ? e = [c] : e.push(c));
				}
			} else if (a === _e.current) {
				if (s = a.alternate, s === null) throw Error(i(387));
				s.memoizedState.memoizedState !== a.memoizedState.memoizedState && (e === null ? e = [Qf] : e.push(Qf));
			}
			a = a.return;
		}
		e !== null && Zi(t, e, n, r), t.flags |= 262144;
	}
	function $i(e) {
		for (e = e.firstContext; e !== null;) {
			if (!Er(e.context._currentValue, e.memoizedValue)) return !0;
			e = e.next;
		}
		return !1;
	}
	function ea(e) {
		Ki = e, qi = null, e = e.dependencies, e !== null && (e.firstContext = null);
	}
	function ta(e) {
		return ra(Ki, e);
	}
	function na(e, t) {
		return Ki === null && ea(e), ra(e, t);
	}
	function ra(e, t) {
		var n = t._currentValue;
		if (t = {
			context: t,
			memoizedValue: n,
			next: null
		}, qi === null) {
			if (e === null) throw Error(i(308));
			qi = t, e.dependencies = {
				lanes: 0,
				firstContext: t
			}, e.flags |= 524288;
		} else qi = qi.next = t;
		return n;
	}
	var ia = typeof AbortController < "u" ? AbortController : function() {
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
	}, aa = t.unstable_scheduleCallback, oa = t.unstable_NormalPriority, sa = {
		$$typeof: C,
		Consumer: null,
		Provider: null,
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0
	};
	function ca() {
		return {
			controller: new ia(),
			data: /* @__PURE__ */ new Map(),
			refCount: 0
		};
	}
	function la(e) {
		e.refCount--, e.refCount === 0 && aa(oa, function() {
			e.controller.abort();
		});
	}
	var ua = null, da = 0, fa = 0, pa = null;
	function ma(e, t) {
		if (ua === null) {
			var n = ua = [];
			da = 0, fa = dd(), pa = {
				status: "pending",
				value: void 0,
				then: function(e) {
					n.push(e);
				}
			};
		}
		return da++, t.then(ha, ha), t;
	}
	function ha() {
		if (--da === 0 && ua !== null) {
			pa !== null && (pa.status = "fulfilled");
			var e = ua;
			ua = null, fa = 0, pa = null;
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
	var _a = D.S;
	D.S = function(e, t) {
		eu = Ne(), typeof t == "object" && t && typeof t.then == "function" && ma(e, t), _a !== null && _a(e, t);
	};
	var va = fe(null);
	function ya() {
		var e = va.current;
		return e === null ? K.pooledCache : e;
	}
	function ba(e, t) {
		t === null ? k(va, va.current) : k(va, t.pool);
	}
	function xa() {
		var e = ya();
		return e === null ? null : {
			parent: sa._currentValue,
			pool: e
		};
	}
	var Sa = Error(i(460)), Ca = Error(i(474)), wa = Error(i(542)), Ta = { then: function() {} };
	function Ea(e) {
		return e = e.status, e === "fulfilled" || e === "rejected";
	}
	function Da(e, t, n) {
		switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(an, an), t = n), t.status) {
			case "fulfilled": return t.value;
			case "rejected": throw e = t.reason, ja(e), e;
			default:
				if (typeof t.status == "string") t.then(an, an);
				else {
					if (e = K, e !== null && 100 < e.shellSuspendCounter) throw Error(i(482));
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
					case "rejected": throw e = t.reason, ja(e), e;
				}
				throw ka = t, Sa;
		}
	}
	function Oa(e) {
		try {
			var t = e._init;
			return t(e._payload);
		} catch (e) {
			throw typeof e == "object" && e && typeof e.then == "function" ? (ka = e, Sa) : e;
		}
	}
	var ka = null;
	function Aa() {
		if (ka === null) throw Error(i(459));
		var e = ka;
		return ka = null, e;
	}
	function ja(e) {
		if (e === Sa || e === wa) throw Error(i(483));
	}
	var Ma = null, Na = 0;
	function Pa(e) {
		var t = Na;
		return Na += 1, Ma === null && (Ma = []), Da(Ma, e, t);
	}
	function Fa(e, t) {
		t = t.props.ref, e.ref = t === void 0 ? null : t;
	}
	function Ia(e, t) {
		throw t.$$typeof === g ? Error(i(525)) : (e = Object.prototype.toString.call(t), Error(i(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
	}
	function La(e) {
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
			return e = fi(e, t), e.index = 0, e.sibling = null, e;
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
			return i === y ? d(e, t, n.props.children, r, n.key) : t !== null && (t.elementType === i || typeof i == "object" && i && i.$$typeof === E && Oa(i) === t.type) ? (t = a(t, n.props), Fa(t, n), t.return = e, t) : (t = mi(n.type, n.key, n.props, null, e.mode, r), Fa(t, n), t.return = e, t);
		}
		function u(e, t, n, r) {
			return t === null || t.tag !== 4 || t.stateNode.containerInfo !== n.containerInfo || t.stateNode.implementation !== n.implementation ? (t = vi(n, e.mode, r), t.return = e, t) : (t = a(t, n.children || []), t.return = e, t);
		}
		function d(e, t, n, r, i) {
			return t === null || t.tag !== 7 ? (t = hi(n, e.mode, r, i), t.return = e, t) : (t = a(t, n), t.return = e, t);
		}
		function f(e, t, n) {
			if (typeof t == "string" && t !== "" || typeof t == "number" || typeof t == "bigint") return t = gi("" + t, e.mode, n), t.return = e, t;
			if (typeof t == "object" && t) {
				switch (t.$$typeof) {
					case _: return n = mi(t.type, t.key, t.props, null, e.mode, n), Fa(n, t), n.return = e, n;
					case v: return t = vi(t, e.mode, n), t.return = e, t;
					case E: return t = Oa(t), f(e, t, n);
				}
				if (ce(t) || ae(t)) return t = hi(t, e.mode, n, null), t.return = e, t;
				if (typeof t.then == "function") return f(e, Pa(t), n);
				if (t.$$typeof === C) return f(e, na(e, t), n);
				Ia(e, t);
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
					case E: return n = Oa(n), p(e, t, n, r);
				}
				if (ce(n) || ae(n)) return i === null ? d(e, t, n, r, null) : null;
				if (typeof n.then == "function") return p(e, t, Pa(n), r);
				if (n.$$typeof === C) return p(e, t, na(e, n), r);
				Ia(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case _: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case v: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case E: return r = Oa(r), m(e, t, n, r, i);
				}
				if (ce(r) || ae(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				if (typeof r.then == "function") return m(e, t, n, Pa(r), i);
				if (r.$$typeof === C) return m(e, t, n, na(t, r), i);
				Ia(t, r);
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
			if (h === s.length) return n(i, d), z && Ai(i, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(i, s[h], c), d !== null && (a = o(d, a, h), u === null ? l = d : u.sibling = d, u = d);
				return z && Ai(i, h), l;
			}
			for (d = r(d); h < s.length; h++) g = m(d, i, h, s[h], c), g !== null && (e && g.alternate !== null && d.delete(g.key === null ? h : g.key), a = o(g, a, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(i, e);
			}), z && Ai(i, h), l;
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
			if (v.done) return n(a, h), z && Ai(a, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(a, v.value, l), v !== null && (s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
				return z && Ai(a, g), u;
			}
			for (h = r(h); !v.done; g++, v = c.next()) v = m(h, a, g, v.value, l), v !== null && (e && v.alternate !== null && h.delete(v.key === null ? g : v.key), s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(a, e);
			}), z && Ai(a, g), u;
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
									} else if (r.elementType === l || typeof l == "object" && l && l.$$typeof === E && Oa(l) === r.type) {
										n(e, r.sibling), c = a(r, o.props), Fa(c, o), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							o.type === y ? (c = hi(o.props.children, e.mode, c, o.key), c.return = e, e = c) : (c = mi(o.type, o.key, o.props, null, e.mode, c), Fa(c, o), c.return = e, e = c);
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
					case E: return o = Oa(o), b(e, r, o, c);
				}
				if (ce(o)) return h(e, r, o, c);
				if (ae(o)) {
					if (l = ae(o), typeof l != "function") throw Error(i(150));
					return o = l.call(o), g(e, r, o, c);
				}
				if (typeof o.then == "function") return b(e, r, Pa(o), c);
				if (o.$$typeof === C) return b(e, r, na(e, o), c);
				Ia(e, o);
			}
			return typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint" ? (o = "" + o, r !== null && r.tag === 6 ? (n(e, r.sibling), c = a(r, o), c.return = e, e = c) : (n(e, r), c = gi(o, e.mode, c), c.return = e, e = c), s(e)) : n(e, r);
		}
		return function(e, t, n, r) {
			try {
				Na = 0;
				var i = b(e, t, n, r);
				return Ma = null, i;
			} catch (t) {
				if (t === Sa || t === wa) throw t;
				var a = ui(29, t, null, e.mode);
				return a.lanes = r, a.return = e, a;
			}
		};
	}
	var Ra = La(!0), za = La(!1), Ba = !1;
	function Va(e) {
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
	function Ha(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			callbacks: null
		});
	}
	function Ua(e) {
		return {
			lane: e,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function Wa(e, t, n) {
		var r = e.updateQueue;
		if (r === null) return null;
		if (r = r.shared, G & 2) {
			var i = r.pending;
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, t = si(e), oi(e, null, n), t;
		}
		return ri(e, r, t, n), si(e);
	}
	function Ga(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194048)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, st(e, n);
		}
	}
	function Ka(e, t) {
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
	var qa = !1;
	function Ja() {
		if (qa) {
			var e = pa;
			if (e !== null) throw e;
		}
	}
	function Ya(e, t, n, r) {
		qa = !1;
		var i = e.updateQueue;
		Ba = !1;
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
				if (p ? (J & f) === f : (r & f) === f) {
					f !== 0 && f === fa && (qa = !0), u !== null && (u = u.next = {
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
							case 2: Ba = !0;
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
	function Xa(e, t) {
		if (typeof e != "function") throw Error(i(191, e));
		e.call(t);
	}
	function Za(e, t) {
		var n = e.callbacks;
		if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) Xa(n[e], t);
	}
	var Qa = fe(null), $a = fe(0);
	function eo(e, t) {
		e = Wl, k($a, e), k(Qa, t), Wl = e | t.baseLanes;
	}
	function to() {
		k($a, Wl), k(Qa, Qa.current);
	}
	function no() {
		Wl = $a.current, pe(Qa), pe($a);
	}
	var ro = fe(null), io = null;
	function ao(e) {
		var t = e.alternate;
		k(uo, uo.current & 1), k(ro, e), io === null && (t === null || Qa.current !== null || t.memoizedState !== null) && (io = e);
	}
	function oo(e) {
		k(uo, uo.current), k(ro, e), io === null && (io = e);
	}
	function so(e) {
		e.tag === 22 ? (k(uo, uo.current), k(ro, e), io === null && (io = e)) : co(e);
	}
	function co() {
		k(uo, uo.current), k(ro, ro.current);
	}
	function lo(e) {
		pe(ro), io === e && (io = null), pe(uo);
	}
	var uo = fe(0);
	function fo(e) {
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
	var po = 0, B = null, V = null, mo = null, ho = !1, go = !1, _o = !1, vo = 0, yo = 0, bo = null, xo = 0;
	function H() {
		throw Error(i(321));
	}
	function So(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!Er(e[n], t[n])) return !1;
		return !0;
	}
	function Co(e, t, n, r, i, a) {
		return po = a, B = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, D.H = e === null || e.memoizedState === null ? Bs : Vs, _o = !1, a = n(r, i), _o = !1, go && (a = To(t, n, r, i)), wo(e), a;
	}
	function wo(e) {
		D.H = zs;
		var t = V !== null && V.next !== null;
		if (po = 0, mo = V = B = null, ho = !1, yo = 0, bo = null, t) throw Error(i(300));
		e === null || ic || (e = e.dependencies, e !== null && $i(e) && (ic = !0));
	}
	function To(e, t, n, r) {
		B = e;
		var a = 0;
		do {
			if (go && (bo = null), yo = 0, go = !1, 25 <= a) throw Error(i(301));
			if (a += 1, mo = V = null, e.updateQueue != null) {
				var o = e.updateQueue;
				o.lastEffect = null, o.events = null, o.stores = null, o.memoCache != null && (o.memoCache.index = 0);
			}
			D.H = Hs, o = t(n, r);
		} while (go);
		return o;
	}
	function Eo() {
		var e = D.H, t = e.useState()[0];
		return t = typeof t.then == "function" ? No(t) : t, e = e.useState()[0], (V === null ? null : V.memoizedState) !== e && (B.flags |= 1024), t;
	}
	function Do() {
		var e = vo !== 0;
		return vo = 0, e;
	}
	function Oo(e, t, n) {
		t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
	}
	function ko(e) {
		if (ho) {
			for (e = e.memoizedState; e !== null;) {
				var t = e.queue;
				t !== null && (t.pending = null), e = e.next;
			}
			ho = !1;
		}
		po = 0, mo = V = B = null, go = !1, yo = vo = 0, bo = null;
	}
	function Ao() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return mo === null ? B.memoizedState = mo = e : mo = mo.next = e, mo;
	}
	function jo() {
		if (V === null) {
			var e = B.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = V.next;
		var t = mo === null ? B.memoizedState : mo.next;
		if (t !== null) mo = t, V = e;
		else {
			if (e === null) throw B.alternate === null ? Error(i(467)) : Error(i(310));
			V = e, e = {
				memoizedState: V.memoizedState,
				baseState: V.baseState,
				baseQueue: V.baseQueue,
				queue: V.queue,
				next: null
			}, mo === null ? B.memoizedState = mo = e : mo = mo.next = e;
		}
		return mo;
	}
	function Mo() {
		return {
			lastEffect: null,
			events: null,
			stores: null,
			memoCache: null
		};
	}
	function No(e) {
		var t = yo;
		return yo += 1, bo === null && (bo = []), e = Da(bo, e, t), t = B, (mo === null ? t.memoizedState : mo.next) === null && (t = t.alternate, D.H = t === null || t.memoizedState === null ? Bs : Vs), e;
	}
	function Po(e) {
		if (typeof e == "object" && e) {
			if (typeof e.then == "function") return No(e);
			if (e.$$typeof === C) return ta(e);
		}
		throw Error(i(438, String(e)));
	}
	function Fo(e) {
		var t = null, n = B.updateQueue;
		if (n !== null && (t = n.memoCache), t == null) {
			var r = B.alternate;
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
		}, n === null && (n = Mo(), B.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = re;
		return t.index++, n;
	}
	function Io(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function Lo(e) {
		return Ro(jo(), V, e);
	}
	function Ro(e, t, n) {
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
				if (f === u.lane ? (po & f) === f : (J & f) === f) {
					var p = u.revertLane;
					if (p === 0) l !== null && (l = l.next = {
						lane: 0,
						revertLane: 0,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}), f === fa && (d = !0);
					else if ((po & p) === p) {
						u = u.next, p === fa && (d = !0);
						continue;
					} else f = {
						lane: 0,
						revertLane: u.revertLane,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}, l === null ? (c = l = f, s = o) : l = l.next = f, B.lanes |= p, Gl |= p;
					f = u.action, _o && n(o, f), o = u.hasEagerState ? u.eagerState : n(o, f);
				} else p = {
					lane: f,
					revertLane: u.revertLane,
					gesture: u.gesture,
					action: u.action,
					hasEagerState: u.hasEagerState,
					eagerState: u.eagerState,
					next: null
				}, l === null ? (c = l = p, s = o) : l = l.next = p, B.lanes |= f, Gl |= f;
				u = u.next;
			} while (u !== null && u !== t);
			if (l === null ? s = o : l.next = c, !Er(o, e.memoizedState) && (ic = !0, d && (n = pa, n !== null))) throw n;
			e.memoizedState = o, e.baseState = s, e.baseQueue = l, r.lastRenderedState = o;
		}
		return a === null && (r.lanes = 0), [e.memoizedState, r.dispatch];
	}
	function zo(e) {
		var t = jo(), n = t.queue;
		if (n === null) throw Error(i(311));
		n.lastRenderedReducer = e;
		var r = n.dispatch, a = n.pending, o = t.memoizedState;
		if (a !== null) {
			n.pending = null;
			var s = a = a.next;
			do
				o = e(o, s.action), s = s.next;
			while (s !== a);
			Er(o, t.memoizedState) || (ic = !0), t.memoizedState = o, t.baseQueue === null && (t.baseState = o), n.lastRenderedState = o;
		}
		return [o, r];
	}
	function Bo(e, t, n) {
		var r = B, a = jo(), o = z;
		if (o) {
			if (n === void 0) throw Error(i(407));
			n = n();
		} else n = t();
		var s = !Er((V || a).memoizedState, n);
		if (s && (a.memoizedState = n, ic = !0), a = a.queue, ds(Uo.bind(null, r, a, e), [e]), a.getSnapshot !== t || s || mo !== null && mo.memoizedState.tag & 1) {
			if (r.flags |= 2048, os(9, { destroy: void 0 }, Ho.bind(null, r, a, n, t), null), K === null) throw Error(i(349));
			o || po & 127 || Vo(r, t, n);
		}
		return n;
	}
	function Vo(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = B.updateQueue, t === null ? (t = Mo(), B.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function Ho(e, t, n, r) {
		t.value = n, t.getSnapshot = r, Wo(t) && Go(e);
	}
	function Uo(e, t, n) {
		return n(function() {
			Wo(t) && Go(e);
		});
	}
	function Wo(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !Er(e, n);
		} catch {
			return !0;
		}
	}
	function Go(e) {
		var t = ai(e, 2);
		t !== null && hu(t, e, 2);
	}
	function Ko(e) {
		var t = Ao();
		if (typeof e == "function") {
			var n = e;
			if (e = n(), _o) {
				We(!0);
				try {
					n();
				} finally {
					We(!1);
				}
			}
		}
		return t.memoizedState = t.baseState = e, t.queue = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: Io,
			lastRenderedState: e
		}, t;
	}
	function qo(e, t, n, r) {
		return e.baseState = n, Ro(e, V, typeof r == "function" ? r : Io);
	}
	function Jo(e, t, n, r, a) {
		if (Is(e)) throw Error(i(485));
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
			D.T === null ? o.isTransition = !1 : n(!0), r(o), n = t.pending, n === null ? (o.next = t.pending = o, Yo(t, o)) : (o.next = n.next, t.pending = n.next = o);
		}
	}
	function Yo(e, t) {
		var n = t.action, r = t.payload, i = e.state;
		if (t.isTransition) {
			var a = D.T, o = {};
			D.T = o;
			try {
				var s = n(i, r), c = D.S;
				c !== null && c(o, s), Xo(e, t, s);
			} catch (n) {
				Qo(e, t, n);
			} finally {
				a !== null && o.types !== null && (a.types = o.types), D.T = a;
			}
		} else try {
			a = n(i, r), Xo(e, t, a);
		} catch (n) {
			Qo(e, t, n);
		}
	}
	function Xo(e, t, n) {
		typeof n == "object" && n && typeof n.then == "function" ? n.then(function(n) {
			Zo(e, t, n);
		}, function(n) {
			return Qo(e, t, n);
		}) : Zo(e, t, n);
	}
	function Zo(e, t, n) {
		t.status = "fulfilled", t.value = n, $o(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Yo(e, n)));
	}
	function Qo(e, t, n) {
		var r = e.pending;
		if (e.pending = null, r !== null) {
			r = r.next;
			do
				t.status = "rejected", t.reason = n, $o(t), t = t.next;
			while (t !== r);
		}
		e.action = null;
	}
	function $o(e) {
		e = e.listeners;
		for (var t = 0; t < e.length; t++) (0, e[t])();
	}
	function es(e, t) {
		return t;
	}
	function ts(e, t) {
		if (z) {
			var n = K.formState;
			if (n !== null) {
				a: {
					var r = B;
					if (z) {
						if (R) {
							b: {
								for (var i = R, a = Ii; i.nodeType !== 8;) {
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
								R = cf(i.nextSibling), r = i.data === "F!";
								break a;
							}
						}
						Ri(r);
					}
					r = !1;
				}
				r && (t = n[0]);
			}
		}
		return n = Ao(), n.memoizedState = n.baseState = t, r = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: es,
			lastRenderedState: t
		}, n.queue = r, n = Ns.bind(null, B, r), r.dispatch = n, r = Ko(!1), a = Fs.bind(null, B, !1, r.queue), r = Ao(), i = {
			state: t,
			dispatch: null,
			action: e,
			pending: null
		}, r.queue = i, n = Jo.bind(null, B, i, a, n), i.dispatch = n, r.memoizedState = e, [
			t,
			n,
			!1
		];
	}
	function ns(e) {
		return rs(jo(), V, e);
	}
	function rs(e, t, n) {
		if (t = Ro(e, t, es)[0], e = Lo(Io)[0], typeof t == "object" && t && typeof t.then == "function") try {
			var r = No(t);
		} catch (e) {
			throw e === Sa ? wa : e;
		}
		else r = t;
		t = jo();
		var i = t.queue, a = i.dispatch;
		return n !== t.memoizedState && (B.flags |= 2048, os(9, { destroy: void 0 }, is.bind(null, i, n), null)), [
			r,
			a,
			e
		];
	}
	function is(e, t) {
		e.action = t;
	}
	function as(e) {
		var t = jo(), n = V;
		if (n !== null) return rs(t, n, e);
		jo(), t = t.memoizedState, n = jo();
		var r = n.queue.dispatch;
		return n.memoizedState = e, [
			t,
			r,
			!1
		];
	}
	function os(e, t, n, r) {
		return e = {
			tag: e,
			create: n,
			deps: r,
			inst: t,
			next: null
		}, t = B.updateQueue, t === null && (t = Mo(), B.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e), e;
	}
	function ss() {
		return jo().memoizedState;
	}
	function cs(e, t, n, r) {
		var i = Ao();
		B.flags |= e, i.memoizedState = os(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r);
	}
	function ls(e, t, n, r) {
		var i = jo();
		r = r === void 0 ? null : r;
		var a = i.memoizedState.inst;
		V !== null && r !== null && So(r, V.memoizedState.deps) ? i.memoizedState = os(t, a, n, r) : (B.flags |= e, i.memoizedState = os(1 | t, a, n, r));
	}
	function us(e, t) {
		cs(8390656, 8, e, t);
	}
	function ds(e, t) {
		ls(2048, 8, e, t);
	}
	function fs(e) {
		B.flags |= 4;
		var t = B.updateQueue;
		if (t === null) t = Mo(), B.updateQueue = t, t.events = [e];
		else {
			var n = t.events;
			n === null ? t.events = [e] : n.push(e);
		}
	}
	function ps(e) {
		var t = jo().memoizedState;
		return fs({
			ref: t,
			nextImpl: e
		}), function() {
			if (G & 2) throw Error(i(440));
			return t.impl.apply(void 0, arguments);
		};
	}
	function ms(e, t) {
		return ls(4, 2, e, t);
	}
	function hs(e, t) {
		return ls(4, 4, e, t);
	}
	function gs(e, t) {
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
	function _s(e, t, n) {
		n = n == null ? null : n.concat([e]), ls(4, 4, gs.bind(null, t, e), n);
	}
	function vs() {}
	function ys(e, t) {
		var n = jo();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return t !== null && So(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function bs(e, t) {
		var n = jo();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		if (t !== null && So(t, r[1])) return r[0];
		if (r = e(), _o) {
			We(!0);
			try {
				e();
			} finally {
				We(!1);
			}
		}
		return n.memoizedState = [r, t], r;
	}
	function xs(e, t, n) {
		return n === void 0 || po & 1073741824 && !(J & 261930) ? e.memoizedState = t : (e.memoizedState = n, e = mu(), B.lanes |= e, Gl |= e, n);
	}
	function Ss(e, t, n, r) {
		return Er(n, t) ? n : Qa.current === null ? !(po & 42) || po & 1073741824 && !(J & 261930) ? (ic = !0, e.memoizedState = n) : (e = mu(), B.lanes |= e, Gl |= e, t) : (e = xs(e, n, r), Er(e, t) || (ic = !0), e);
	}
	function Cs(e, t, n, r, i) {
		var a = O.p;
		O.p = a !== 0 && 8 > a ? a : 8;
		var o = D.T, s = {};
		D.T = s, Fs(e, !1, t, n);
		try {
			var c = i(), l = D.S;
			l !== null && l(s, c), typeof c == "object" && c && typeof c.then == "function" ? Ps(e, t, ga(c, r), pu(e)) : Ps(e, t, r, pu(e));
		} catch (n) {
			Ps(e, t, {
				then: function() {},
				status: "rejected",
				reason: n
			}, pu());
		} finally {
			O.p = a, o !== null && s.types !== null && (o.types = s.types), D.T = o;
		}
	}
	function ws() {}
	function Ts(e, t, n, r) {
		if (e.tag !== 5) throw Error(i(476));
		var a = Es(e).queue;
		Cs(e, a, t, le, n === null ? ws : function() {
			return Ds(e), n(r);
		});
	}
	function Es(e) {
		var t = e.memoizedState;
		if (t !== null) return t;
		t = {
			memoizedState: le,
			baseState: le,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: Io,
				lastRenderedState: le
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
				lastRenderedReducer: Io,
				lastRenderedState: n
			},
			next: null
		}, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
	}
	function Ds(e) {
		var t = Es(e);
		t.next === null && (t = e.alternate.memoizedState), Ps(e, t.next.queue, {}, pu());
	}
	function Os() {
		return ta(Qf);
	}
	function ks() {
		return jo().memoizedState;
	}
	function As() {
		return jo().memoizedState;
	}
	function js(e) {
		for (var t = e.return; t !== null;) {
			switch (t.tag) {
				case 24:
				case 3:
					var n = pu();
					e = Ua(n);
					var r = Wa(t, e, n);
					r !== null && (hu(r, t, n), Ga(r, t, n)), t = { cache: ca() }, e.payload = t;
					return;
			}
			t = t.return;
		}
	}
	function Ms(e, t, n) {
		var r = pu();
		n = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, Is(e) ? Ls(t, n) : (n = ii(e, t, n, r), n !== null && (hu(n, e, r), Rs(n, t, r)));
	}
	function Ns(e, t, n) {
		Ps(e, t, n, pu());
	}
	function Ps(e, t, n, r) {
		var i = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (Is(e)) Ls(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, Er(s, o)) return ri(e, t, i, 0), K === null && ni(), !1;
			} catch {}
			if (n = ii(e, t, i, r), n !== null) return hu(n, e, r), Rs(n, t, r), !0;
		}
		return !1;
	}
	function Fs(e, t, n, r) {
		if (r = {
			lane: 2,
			revertLane: dd(),
			gesture: null,
			action: r,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, Is(e)) {
			if (t) throw Error(i(479));
		} else t = ii(e, n, r, 2), t !== null && hu(t, e, 2);
	}
	function Is(e) {
		var t = e.alternate;
		return e === B || t !== null && t === B;
	}
	function Ls(e, t) {
		go = ho = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function Rs(e, t, n) {
		if (n & 4194048) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, st(e, n);
		}
	}
	var zs = {
		readContext: ta,
		use: Po,
		useCallback: H,
		useContext: H,
		useEffect: H,
		useImperativeHandle: H,
		useLayoutEffect: H,
		useInsertionEffect: H,
		useMemo: H,
		useReducer: H,
		useRef: H,
		useState: H,
		useDebugValue: H,
		useDeferredValue: H,
		useTransition: H,
		useSyncExternalStore: H,
		useId: H,
		useHostTransitionStatus: H,
		useFormState: H,
		useActionState: H,
		useOptimistic: H,
		useMemoCache: H,
		useCacheRefresh: H
	};
	zs.useEffectEvent = H;
	var Bs = {
		readContext: ta,
		use: Po,
		useCallback: function(e, t) {
			return Ao().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: ta,
		useEffect: us,
		useImperativeHandle: function(e, t, n) {
			n = n == null ? null : n.concat([e]), cs(4194308, 4, gs.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return cs(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			cs(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = Ao();
			t = t === void 0 ? null : t;
			var r = e();
			if (_o) {
				We(!0);
				try {
					e();
				} finally {
					We(!1);
				}
			}
			return n.memoizedState = [r, t], r;
		},
		useReducer: function(e, t, n) {
			var r = Ao();
			if (n !== void 0) {
				var i = n(t);
				if (_o) {
					We(!0);
					try {
						n(t);
					} finally {
						We(!1);
					}
				}
			} else i = t;
			return r.memoizedState = r.baseState = i, e = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: i
			}, r.queue = e, e = e.dispatch = Ms.bind(null, B, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = Ao();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: function(e) {
			e = Ko(e);
			var t = e.queue, n = Ns.bind(null, B, t);
			return t.dispatch = n, [e.memoizedState, n];
		},
		useDebugValue: vs,
		useDeferredValue: function(e, t) {
			return xs(Ao(), e, t);
		},
		useTransition: function() {
			var e = Ko(!1);
			return e = Cs.bind(null, B, e.queue, !0, !1), Ao().memoizedState = e, [!1, e];
		},
		useSyncExternalStore: function(e, t, n) {
			var r = B, a = Ao();
			if (z) {
				if (n === void 0) throw Error(i(407));
				n = n();
			} else {
				if (n = t(), K === null) throw Error(i(349));
				J & 127 || Vo(r, t, n);
			}
			a.memoizedState = n;
			var o = {
				value: n,
				getSnapshot: t
			};
			return a.queue = o, us(Uo.bind(null, r, o, e), [e]), r.flags |= 2048, os(9, { destroy: void 0 }, Ho.bind(null, r, o, n, t), null), n;
		},
		useId: function() {
			var e = Ao(), t = K.identifierPrefix;
			if (z) {
				var n = ki, r = Oi;
				n = (r & ~(1 << 32 - Ge(r) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = vo++, 0 < n && (t += "H" + n.toString(32)), t += "_";
			} else n = xo++, t = "_" + t + "r_" + n.toString(32) + "_";
			return e.memoizedState = t;
		},
		useHostTransitionStatus: Os,
		useFormState: ts,
		useActionState: ts,
		useOptimistic: function(e) {
			var t = Ao();
			t.memoizedState = t.baseState = e;
			var n = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: null,
				lastRenderedState: null
			};
			return t.queue = n, t = Fs.bind(null, B, !0, n), n.dispatch = t, [e, t];
		},
		useMemoCache: Fo,
		useCacheRefresh: function() {
			return Ao().memoizedState = js.bind(null, B);
		},
		useEffectEvent: function(e) {
			var t = Ao(), n = { impl: e };
			return t.memoizedState = n, function() {
				if (G & 2) throw Error(i(440));
				return n.impl.apply(void 0, arguments);
			};
		}
	}, Vs = {
		readContext: ta,
		use: Po,
		useCallback: ys,
		useContext: ta,
		useEffect: ds,
		useImperativeHandle: _s,
		useInsertionEffect: ms,
		useLayoutEffect: hs,
		useMemo: bs,
		useReducer: Lo,
		useRef: ss,
		useState: function() {
			return Lo(Io);
		},
		useDebugValue: vs,
		useDeferredValue: function(e, t) {
			return Ss(jo(), V.memoizedState, e, t);
		},
		useTransition: function() {
			var e = Lo(Io)[0], t = jo().memoizedState;
			return [typeof e == "boolean" ? e : No(e), t];
		},
		useSyncExternalStore: Bo,
		useId: ks,
		useHostTransitionStatus: Os,
		useFormState: ns,
		useActionState: ns,
		useOptimistic: function(e, t) {
			return qo(jo(), V, e, t);
		},
		useMemoCache: Fo,
		useCacheRefresh: As
	};
	Vs.useEffectEvent = ps;
	var Hs = {
		readContext: ta,
		use: Po,
		useCallback: ys,
		useContext: ta,
		useEffect: ds,
		useImperativeHandle: _s,
		useInsertionEffect: ms,
		useLayoutEffect: hs,
		useMemo: bs,
		useReducer: zo,
		useRef: ss,
		useState: function() {
			return zo(Io);
		},
		useDebugValue: vs,
		useDeferredValue: function(e, t) {
			var n = jo();
			return V === null ? xs(n, e, t) : Ss(n, V.memoizedState, e, t);
		},
		useTransition: function() {
			var e = zo(Io)[0], t = jo().memoizedState;
			return [typeof e == "boolean" ? e : No(e), t];
		},
		useSyncExternalStore: Bo,
		useId: ks,
		useHostTransitionStatus: Os,
		useFormState: as,
		useActionState: as,
		useOptimistic: function(e, t) {
			var n = jo();
			return V === null ? (n.baseState = e, [e, n.queue.dispatch]) : qo(n, V, e, t);
		},
		useMemoCache: Fo,
		useCacheRefresh: As
	};
	Hs.useEffectEvent = ps;
	function Us(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : h({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var Ws = {
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = pu(), i = Ua(r);
			i.payload = t, n != null && (i.callback = n), t = Wa(e, i, r), t !== null && (hu(t, e, r), Ga(t, e, r));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = pu(), i = Ua(r);
			i.tag = 1, i.payload = t, n != null && (i.callback = n), t = Wa(e, i, r), t !== null && (hu(t, e, r), Ga(t, e, r));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = pu(), r = Ua(n);
			r.tag = 2, t != null && (r.callback = t), t = Wa(e, r, n), t !== null && (hu(t, e, n), Ga(t, e, n));
		}
	};
	function Gs(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Dr(n, r) || !Dr(i, a) : !0;
	}
	function Ks(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && Ws.enqueueReplaceState(t, t.state, null);
	}
	function qs(e, t) {
		var n = t;
		if ("ref" in t) for (var r in n = {}, t) r !== "ref" && (n[r] = t[r]);
		if (e = e.defaultProps) for (var i in n === t && (n = h({}, n)), e) n[i] === void 0 && (n[i] = e[i]);
		return n;
	}
	function Js(e) {
		Qr(e);
	}
	function Ys(e) {
		console.error(e);
	}
	function Xs(e) {
		Qr(e);
	}
	function Zs(e, t) {
		try {
			var n = e.onUncaughtError;
			n(t.value, { componentStack: t.stack });
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Qs(e, t, n) {
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
	function $s(e, t, n) {
		return n = Ua(n), n.tag = 3, n.payload = { element: null }, n.callback = function() {
			Zs(e, t);
		}, n;
	}
	function ec(e) {
		return e = Ua(e), e.tag = 3, e;
	}
	function tc(e, t, n, r) {
		var i = n.type.getDerivedStateFromError;
		if (typeof i == "function") {
			var a = r.value;
			e.payload = function() {
				return i(a);
			}, e.callback = function() {
				Qs(t, n, r);
			};
		}
		var o = n.stateNode;
		o !== null && typeof o.componentDidCatch == "function" && (e.callback = function() {
			Qs(t, n, r), typeof i != "function" && (ru === null ? ru = /* @__PURE__ */ new Set([this]) : ru.add(this));
			var e = r.stack;
			this.componentDidCatch(r.value, { componentStack: e === null ? "" : e });
		});
	}
	function nc(e, t, n, r, a) {
		if (n.flags |= 32768, typeof r == "object" && r && typeof r.then == "function") {
			if (t = n.alternate, t !== null && Qi(t, n, a, !0), n = ro.current, n !== null) {
				switch (n.tag) {
					case 31:
					case 13: return io === null ? Du() : n.alternate === null && X === 0 && (X = 3), n.flags &= -257, n.flags |= 65536, n.lanes = a, r === Ta ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = /* @__PURE__ */ new Set([r]) : t.add(r), Gu(e, r, a)), !1;
					case 22: return n.flags |= 65536, r === Ta ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
						transitions: null,
						markerInstances: null,
						retryQueue: /* @__PURE__ */ new Set([r])
					}, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = /* @__PURE__ */ new Set([r]) : n.add(r)), Gu(e, r, a)), !1;
				}
				throw Error(i(435, n.tag));
			}
			return Gu(e, r, a), Du(), !1;
		}
		if (z) return t = ro.current, t === null ? (r !== Li && (t = Error(i(423), { cause: r }), Wi(bi(t, n))), e = e.current.alternate, e.flags |= 65536, a &= -a, e.lanes |= a, r = bi(r, n), a = $s(e.stateNode, r, a), Ka(e, a), X !== 4 && (X = 2)) : (!(t.flags & 65536) && (t.flags |= 256), t.flags |= 65536, t.lanes = a, r !== Li && (e = Error(i(422), { cause: r }), Wi(bi(e, n)))), !1;
		var o = Error(i(520), { cause: r });
		if (o = bi(o, n), Xl === null ? Xl = [o] : Xl.push(o), X !== 4 && (X = 2), t === null) return !0;
		r = bi(r, n), n = t;
		do {
			switch (n.tag) {
				case 3: return n.flags |= 65536, e = a & -a, n.lanes |= e, e = $s(n.stateNode, r, e), Ka(n, e), !1;
				case 1: if (t = n.type, o = n.stateNode, !(n.flags & 128) && (typeof t.getDerivedStateFromError == "function" || o !== null && typeof o.componentDidCatch == "function" && (ru === null || !ru.has(o)))) return n.flags |= 65536, a &= -a, n.lanes |= a, a = ec(a), tc(a, e, n, r), Ka(n, a), !1;
			}
			n = n.return;
		} while (n !== null);
		return !1;
	}
	var rc = Error(i(461)), ic = !1;
	function ac(e, t, n, r) {
		t.child = e === null ? za(t, null, n, r) : Ra(t, e.child, n, r);
	}
	function oc(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		if ("ref" in r) {
			var o = {};
			for (var s in r) s !== "ref" && (o[s] = r[s]);
		} else o = r;
		return ea(t), r = Co(e, t, n, o, a, i), s = Do(), e !== null && !ic ? (Oo(e, t, i), Ac(e, t, i)) : (z && s && Mi(t), t.flags |= 1, ac(e, t, r, i), t.child);
	}
	function sc(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !di(a) && a.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = a, cc(e, t, a, r, i)) : (e = mi(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, !jc(e, i)) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Dr : n, n(o, r) && e.ref === t.ref) return Ac(e, t, i);
		}
		return t.flags |= 1, e = fi(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function cc(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Dr(a, r) && e.ref === t.ref) {
				if (ic = !1, t.pendingProps = r = a, jc(e, i)) e.flags & 131072 && (ic = !0);
				else return t.lanes = e.lanes, Ac(e, t, i);
			}
		}
		return gc(e, t, n, r, i);
	}
	function lc(e, t, n, r) {
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
				return dc(e, t, a, n, r);
			}
			if (n & 536870912) t.memoizedState = {
				baseLanes: 0,
				cachePool: null
			}, e !== null && ba(t, a === null ? null : a.cachePool), a === null ? to() : eo(t, a), so(t);
			else return r = t.lanes = 536870912, dc(e, t, a === null ? n : a.baseLanes | n, n, r);
		} else a === null ? (e !== null && ba(t, null), to(), co(t)) : (ba(t, a.cachePool), eo(t, a), co(t), t.memoizedState = null);
		return ac(e, t, i, n), t.child;
	}
	function uc(e, t) {
		return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), t.sibling;
	}
	function dc(e, t, n, r, i) {
		var a = ya();
		return a = a === null ? null : {
			parent: sa._currentValue,
			pool: a
		}, t.memoizedState = {
			baseLanes: n,
			cachePool: a
		}, e !== null && ba(t, null), to(), so(t), e !== null && Qi(e, t, r, !0), t.childLanes = i, null;
	}
	function fc(e, t) {
		return t = Tc({
			mode: t.mode,
			children: t.children
		}, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
	}
	function pc(e, t, n) {
		return Ra(t, e.child, null, n), e = fc(t, t.pendingProps), e.flags |= 2, lo(t), t.memoizedState = null, e;
	}
	function mc(e, t, n) {
		var r = t.pendingProps, a = !!(t.flags & 128);
		if (t.flags &= -129, e === null) {
			if (z) {
				if (r.mode === "hidden") return e = fc(t, r), t.lanes = 536870912, uc(null, e);
				if (oo(t), (e = R) ? (e = rf(e, Ii), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Di === null ? null : {
						id: Oi,
						overflow: ki
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = _i(e), n.return = t, t.child = n, Pi = t, R = null)) : e = null, e === null) throw Ri(t);
				return t.lanes = 536870912, null;
			}
			return fc(t, r);
		}
		var o = e.memoizedState;
		if (o !== null) {
			var s = o.dehydrated;
			if (oo(t), a) {
				if (t.flags & 256) t.flags &= -257, t = pc(e, t, n);
				else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
				else throw Error(i(558));
			} else if (ic || Qi(e, t, n, !1), a = (n & e.childLanes) !== 0, ic || a) {
				if (r = K, r !== null && (s = ct(r, n), s !== 0 && s !== o.retryLane)) throw o.retryLane = s, ai(e, s), hu(r, e, s), rc;
				Du(), t = pc(e, t, n);
			} else e = o.treeContext, R = cf(s.nextSibling), Pi = t, z = !0, Fi = null, Ii = !1, e !== null && Ni(t, e), t = fc(t, r), t.flags |= 4096;
			return t;
		}
		return e = fi(e.child, {
			mode: r.mode,
			children: r.children
		}), e.ref = t.ref, t.child = e, e.return = t, e;
	}
	function hc(e, t) {
		var n = t.ref;
		if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
		else {
			if (typeof n != "function" && typeof n != "object") throw Error(i(284));
			(e === null || e.ref !== n) && (t.flags |= 4194816);
		}
	}
	function gc(e, t, n, r, i) {
		return ea(t), n = Co(e, t, n, r, void 0, i), r = Do(), e !== null && !ic ? (Oo(e, t, i), Ac(e, t, i)) : (z && r && Mi(t), t.flags |= 1, ac(e, t, n, i), t.child);
	}
	function _c(e, t, n, r, i, a) {
		return ea(t), t.updateQueue = null, n = To(t, r, n, i), wo(e), r = Do(), e !== null && !ic ? (Oo(e, t, a), Ac(e, t, a)) : (z && r && Mi(t), t.flags |= 1, ac(e, t, n, a), t.child);
	}
	function vc(e, t, n, r, i) {
		if (ea(t), t.stateNode === null) {
			var a = ci, o = n.contextType;
			typeof o == "object" && o && (a = ta(o)), a = new n(r, a), t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, a.updater = Ws, t.stateNode = a, a._reactInternals = t, a = t.stateNode, a.props = r, a.state = t.memoizedState, a.refs = {}, Va(t), o = n.contextType, a.context = typeof o == "object" && o ? ta(o) : ci, a.state = t.memoizedState, o = n.getDerivedStateFromProps, typeof o == "function" && (Us(t, n, o, r), a.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof a.getSnapshotBeforeUpdate == "function" || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (o = a.state, typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount(), o !== a.state && Ws.enqueueReplaceState(a, a.state, null), Ya(t, r, a, i), Ja(), a.state = t.memoizedState), typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !0;
		} else if (e === null) {
			a = t.stateNode;
			var s = t.memoizedProps, c = qs(n, s);
			a.props = c;
			var l = a.context, u = n.contextType;
			o = ci, typeof u == "object" && u && (o = ta(u));
			var d = n.getDerivedStateFromProps;
			u = typeof d == "function" || typeof a.getSnapshotBeforeUpdate == "function", s = t.pendingProps !== s, u || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (s || l !== o) && Ks(t, a, r, o), Ba = !1;
			var f = t.memoizedState;
			a.state = f, Ya(t, r, a, i), Ja(), l = t.memoizedState, s || f !== l || Ba ? (typeof d == "function" && (Us(t, n, d, r), l = t.memoizedState), (c = Ba || Gs(t, n, c, r, f, l, o)) ? (u || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount()), typeof a.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), a.props = r, a.state = l, a.context = o, r = c) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			a = t.stateNode, Ha(e, t), o = t.memoizedProps, u = qs(n, o), a.props = u, d = t.pendingProps, f = a.context, l = n.contextType, c = ci, typeof l == "object" && l && (c = ta(l)), s = n.getDerivedStateFromProps, (l = typeof s == "function" || typeof a.getSnapshotBeforeUpdate == "function") || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (o !== d || f !== c) && Ks(t, a, r, c), Ba = !1, f = t.memoizedState, a.state = f, Ya(t, r, a, i), Ja();
			var p = t.memoizedState;
			o !== d || f !== p || Ba || e !== null && e.dependencies !== null && $i(e.dependencies) ? (typeof s == "function" && (Us(t, n, s, r), p = t.memoizedState), (u = Ba || Gs(t, n, u, r, f, p, c) || e !== null && e.dependencies !== null && $i(e.dependencies)) ? (l || typeof a.UNSAFE_componentWillUpdate != "function" && typeof a.componentWillUpdate != "function" || (typeof a.componentWillUpdate == "function" && a.componentWillUpdate(r, p, c), typeof a.UNSAFE_componentWillUpdate == "function" && a.UNSAFE_componentWillUpdate(r, p, c)), typeof a.componentDidUpdate == "function" && (t.flags |= 4), typeof a.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = p), a.props = r, a.state = p, a.context = c, r = u) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return a = r, hc(e, t), r = !!(t.flags & 128), a || r ? (a = t.stateNode, n = r && typeof n.getDerivedStateFromError != "function" ? null : a.render(), t.flags |= 1, e !== null && r ? (t.child = Ra(t, e.child, null, i), t.child = Ra(t, null, n, i)) : ac(e, t, n, i), t.memoizedState = a.state, e = t.child) : e = Ac(e, t, i), e;
	}
	function yc(e, t, n, r) {
		return Hi(), t.flags |= 256, ac(e, t, n, r), t.child;
	}
	var bc = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null
	};
	function xc(e) {
		return {
			baseLanes: e,
			cachePool: xa()
		};
	}
	function Sc(e, t, n) {
		return e = e === null ? 0 : e.childLanes & ~n, t && (e |= Jl), e;
	}
	function Cc(e, t, n) {
		var r = t.pendingProps, a = !1, o = !!(t.flags & 128), s;
		if ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : !!(uo.current & 2)), s && (a = !0, t.flags &= -129), s = !!(t.flags & 32), t.flags &= -33, e === null) {
			if (z) {
				if (a ? ao(t) : co(t), (e = R) ? (e = rf(e, Ii), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Di === null ? null : {
						id: Oi,
						overflow: ki
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = _i(e), n.return = t, t.child = n, Pi = t, R = null)) : e = null, e === null) throw Ri(t);
				return of(e) ? t.lanes = 32 : t.lanes = 536870912, null;
			}
			var c = r.children;
			return r = r.fallback, a ? (co(t), a = t.mode, c = Tc({
				mode: "hidden",
				children: c
			}, a), r = hi(r, a, n, null), c.return = t, r.return = t, c.sibling = r, t.child = c, r = t.child, r.memoizedState = xc(n), r.childLanes = Sc(e, s, n), t.memoizedState = bc, uc(null, r)) : (ao(t), wc(t, c));
		}
		var l = e.memoizedState;
		if (l !== null && (c = l.dehydrated, c !== null)) {
			if (o) t.flags & 256 ? (ao(t), t.flags &= -257, t = Ec(e, t, n)) : t.memoizedState === null ? (co(t), c = r.fallback, a = t.mode, r = Tc({
				mode: "visible",
				children: r.children
			}, a), c = hi(c, a, n, null), c.flags |= 2, r.return = t, c.return = t, r.sibling = c, t.child = r, Ra(t, e.child, null, n), r = t.child, r.memoizedState = xc(n), r.childLanes = Sc(e, s, n), t.memoizedState = bc, t = uc(null, r)) : (co(t), t.child = e.child, t.flags |= 128, t = null);
			else if (ao(t), of(c)) {
				if (s = c.nextSibling && c.nextSibling.dataset, s) var u = s.dgst;
				s = u, r = Error(i(419)), r.stack = "", r.digest = s, Wi({
					value: r,
					source: null,
					stack: null
				}), t = Ec(e, t, n);
			} else if (ic || Qi(e, t, n, !1), s = (n & e.childLanes) !== 0, ic || s) {
				if (s = K, s !== null && (r = ct(s, n), r !== 0 && r !== l.retryLane)) throw l.retryLane = r, ai(e, r), hu(s, e, r), rc;
				af(c) || Du(), t = Ec(e, t, n);
			} else af(c) ? (t.flags |= 192, t.child = e.child, t = null) : (e = l.treeContext, R = cf(c.nextSibling), Pi = t, z = !0, Fi = null, Ii = !1, e !== null && Ni(t, e), t = wc(t, r.children), t.flags |= 4096);
			return t;
		}
		return a ? (co(t), c = r.fallback, a = t.mode, l = e.child, u = l.sibling, r = fi(l, {
			mode: "hidden",
			children: r.children
		}), r.subtreeFlags = l.subtreeFlags & 65011712, u === null ? (c = hi(c, a, n, null), c.flags |= 2) : c = fi(u, c), c.return = t, r.return = t, r.sibling = c, t.child = r, uc(null, r), r = t.child, c = e.child.memoizedState, c === null ? c = xc(n) : (a = c.cachePool, a === null ? a = xa() : (l = sa._currentValue, a = a.parent === l ? a : {
			parent: l,
			pool: l
		}), c = {
			baseLanes: c.baseLanes | n,
			cachePool: a
		}), r.memoizedState = c, r.childLanes = Sc(e, s, n), t.memoizedState = bc, uc(e.child, r)) : (ao(t), n = e.child, e = n.sibling, n = fi(n, {
			mode: "visible",
			children: r.children
		}), n.return = t, n.sibling = null, e !== null && (s = t.deletions, s === null ? (t.deletions = [e], t.flags |= 16) : s.push(e)), t.child = n, t.memoizedState = null, n);
	}
	function wc(e, t) {
		return t = Tc({
			mode: "visible",
			children: t
		}, e.mode), t.return = e, e.child = t;
	}
	function Tc(e, t) {
		return e = ui(22, e, null, t), e.lanes = 0, e;
	}
	function Ec(e, t, n) {
		return Ra(t, e.child, null, n), e = wc(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function Dc(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), Xi(e.return, t, n);
	}
	function Oc(e, t, n, r, i, a) {
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
	function kc(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		r = r.children;
		var o = uo.current, s = !!(o & 2);
		if (s ? (o = o & 1 | 2, t.flags |= 128) : o &= 1, k(uo, o), ac(e, t, r, n), r = z ? wi : 0, !s && e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
			if (e.tag === 13) e.memoizedState !== null && Dc(e, n, t);
			else if (e.tag === 19) Dc(e, n, t);
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
				for (n = t.child, i = null; n !== null;) e = n.alternate, e !== null && fo(e) === null && (i = n), n = n.sibling;
				n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), Oc(t, !1, i, n, a, r);
				break;
			case "backwards":
			case "unstable_legacy-backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && fo(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				Oc(t, !0, n, null, a, r);
				break;
			case "together":
				Oc(t, !1, null, null, void 0, r);
				break;
			default: t.memoizedState = null;
		}
		return t.child;
	}
	function Ac(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), Gl |= t.lanes, (n & t.childLanes) === 0) {
			if (e !== null) {
				if (Qi(e, t, n, !1), (n & t.childLanes) === 0) return null;
			} else return null;
		}
		if (e !== null && t.child !== e.child) throw Error(i(153));
		if (t.child !== null) {
			for (e = t.child, n = fi(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = fi(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function jc(e, t) {
		return (e.lanes & t) !== 0 || (e = e.dependencies, !!(e !== null && $i(e)));
	}
	function Mc(e, t, n) {
		switch (t.tag) {
			case 3:
				ve(t, t.stateNode.containerInfo), Ji(t, sa, e.memoizedState.cache), Hi();
				break;
			case 27:
			case 5:
				A(t);
				break;
			case 4:
				ve(t, t.stateNode.containerInfo);
				break;
			case 10:
				Ji(t, t.type, t.memoizedProps.value);
				break;
			case 31:
				if (t.memoizedState !== null) return t.flags |= 128, oo(t), null;
				break;
			case 13:
				var r = t.memoizedState;
				if (r !== null) return r.dehydrated === null ? (n & t.child.childLanes) === 0 ? (ao(t), e = Ac(e, t, n), e === null ? null : e.sibling) : Cc(e, t, n) : (ao(t), t.flags |= 128, null);
				ao(t);
				break;
			case 19:
				var i = !!(e.flags & 128);
				if (r = (n & t.childLanes) !== 0, r ||= (Qi(e, t, n, !1), (n & t.childLanes) !== 0), i) {
					if (r) return kc(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), k(uo, uo.current), r) break;
				return null;
			case 22: return t.lanes = 0, lc(e, t, n, t.pendingProps);
			case 24: Ji(t, sa, e.memoizedState.cache);
		}
		return Ac(e, t, n);
	}
	function Nc(e, t, n) {
		if (e !== null) {
			if (e.memoizedProps !== t.pendingProps) ic = !0;
			else {
				if (!jc(e, n) && !(t.flags & 128)) return ic = !1, Mc(e, t, n);
				ic = !!(e.flags & 131072);
			}
		} else ic = !1, z && t.flags & 1048576 && ji(t, wi, t.index);
		switch (t.lanes = 0, t.tag) {
			case 16:
				a: {
					var r = t.pendingProps;
					if (e = Oa(t.elementType), t.type = e, typeof e == "function") di(e) ? (r = qs(e, r), t.tag = 1, t = vc(null, t, e, r, n)) : (t.tag = 0, t = gc(null, t, e, r, n));
					else {
						if (e != null) {
							var a = e.$$typeof;
							if (a === w) {
								t.tag = 11, t = oc(null, t, e, r, n);
								break a;
							}
							if (a === te) {
								t.tag = 14, t = sc(null, t, e, r, n);
								break a;
							}
						}
						throw t = se(e) || e, Error(i(306, t, ""));
					}
				}
				return t;
			case 0: return gc(e, t, t.type, t.pendingProps, n);
			case 1: return r = t.type, a = qs(r, t.pendingProps), vc(e, t, r, a, n);
			case 3:
				a: {
					if (ve(t, t.stateNode.containerInfo), e === null) throw Error(i(387));
					r = t.pendingProps;
					var o = t.memoizedState;
					a = o.element, Ha(e, t), Ya(t, r, null, n);
					var s = t.memoizedState;
					if (r = s.cache, Ji(t, sa, r), r !== o.cache && Zi(t, [sa], n, !0), Ja(), r = s.element, o.isDehydrated) {
						if (o = {
							element: r,
							isDehydrated: !1,
							cache: s.cache
						}, t.updateQueue.baseState = o, t.memoizedState = o, t.flags & 256) {
							t = yc(e, t, r, n);
							break a;
						}
						if (r !== a) {
							a = bi(Error(i(424)), t), Wi(a), t = yc(e, t, r, n);
							break a;
						}
						switch (e = t.stateNode.containerInfo, e.nodeType) {
							case 9:
								e = e.body;
								break;
							default: e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
						}
						for (R = cf(e.firstChild), Pi = t, z = !0, Fi = null, Ii = !0, n = za(t, null, r, n), t.child = n; n;) n.flags = n.flags & -3 | 4096, n = n.sibling;
					} else {
						if (Hi(), r === a) {
							t = Ac(e, t, n);
							break a;
						}
						ac(e, t, r, n);
					}
					t = t.child;
				}
				return t;
			case 26: return hc(e, t), e === null ? (n = kf(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : z || (n = t.type, e = t.pendingProps, r = Bd(ge.current).createElement(n), r[j] = t, r[mt] = e, Pd(r, n, e), Tt(r), t.stateNode = r) : t.memoizedState = kf(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
			case 27: return A(t), e === null && z && (r = t.stateNode = ff(t.type, t.pendingProps, ge.current), Pi = t, Ii = !0, a = R, Zd(t.type) ? (lf = a, R = cf(r.firstChild)) : R = a), ac(e, t, t.pendingProps.children, n), hc(e, t), e === null && (t.flags |= 4194304), t.child;
			case 5: return e === null && z && ((a = r = R) && (r = tf(r, t.type, t.pendingProps, Ii), r === null ? a = !1 : (t.stateNode = r, Pi = t, R = cf(r.firstChild), Ii = !1, a = !0)), a || Ri(t)), A(t), a = t.type, o = t.pendingProps, s = e === null ? null : e.memoizedProps, r = o.children, Ud(a, o) ? r = null : s !== null && Ud(a, s) && (t.flags |= 32), t.memoizedState !== null && (a = Co(e, t, Eo, null, null, n), Qf._currentValue = a), hc(e, t), ac(e, t, r, n), t.child;
			case 6: return e === null && z && ((e = n = R) && (n = nf(n, t.pendingProps, Ii), n === null ? e = !1 : (t.stateNode = n, Pi = t, R = null, e = !0)), e || Ri(t)), null;
			case 13: return Cc(e, t, n);
			case 4: return ve(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Ra(t, null, r, n) : ac(e, t, r, n), t.child;
			case 11: return oc(e, t, t.type, t.pendingProps, n);
			case 7: return ac(e, t, t.pendingProps, n), t.child;
			case 8: return ac(e, t, t.pendingProps.children, n), t.child;
			case 12: return ac(e, t, t.pendingProps.children, n), t.child;
			case 10: return r = t.pendingProps, Ji(t, t.type, r.value), ac(e, t, r.children, n), t.child;
			case 9: return a = t.type._context, r = t.pendingProps.children, ea(t), a = ta(a), r = r(a), t.flags |= 1, ac(e, t, r, n), t.child;
			case 14: return sc(e, t, t.type, t.pendingProps, n);
			case 15: return cc(e, t, t.type, t.pendingProps, n);
			case 19: return kc(e, t, n);
			case 31: return mc(e, t, n);
			case 22: return lc(e, t, n, t.pendingProps);
			case 24: return ea(t), r = ta(sa), e === null ? (a = ya(), a === null && (a = K, o = ca(), a.pooledCache = o, o.refCount++, o !== null && (a.pooledCacheLanes |= n), a = o), t.memoizedState = {
				parent: r,
				cache: a
			}, Va(t), Ji(t, sa, a)) : ((e.lanes & n) !== 0 && (Ha(e, t), Ya(t, null, null, n), Ja()), a = e.memoizedState, o = t.memoizedState, a.parent === r ? (r = o.cache, Ji(t, sa, r), r !== a.cache && Zi(t, [sa], n, !0)) : (a = {
				parent: r,
				cache: r
			}, t.memoizedState = a, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = a), Ji(t, sa, r))), ac(e, t, t.pendingProps.children, n), t.child;
			case 29: throw t.pendingProps;
		}
		throw Error(i(156, t.tag));
	}
	function Pc(e) {
		e.flags |= 4;
	}
	function Fc(e, t, n, r, i) {
		if ((t = !!(e.mode & 32)) && (t = !1), t) {
			if (e.flags |= 16777216, (i & 335544128) === i) {
				if (e.stateNode.complete) e.flags |= 8192;
				else if (wu()) e.flags |= 8192;
				else throw ka = Ta, Ca;
			}
		} else e.flags &= -16777217;
	}
	function Ic(e, t) {
		if (t.type !== "stylesheet" || t.state.loading & 4) e.flags &= -16777217;
		else if (e.flags |= 16777216, !Wf(t)) {
			if (wu()) e.flags |= 8192;
			else throw ka = Ta, Ca;
		}
	}
	function Lc(e, t) {
		t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag === 22 ? 536870912 : nt(), e.lanes |= t, Yl |= t);
	}
	function Rc(e, t) {
		if (!z) switch (e.tailMode) {
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
	function U(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 65011712, r |= i.flags & 65011712, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function zc(e, t, n) {
		var r = t.pendingProps;
		switch (L(t), t.tag) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return U(t), null;
			case 1: return U(t), null;
			case 3: return n = t.stateNode, r = null, e !== null && (r = e.memoizedState.cache), t.memoizedState.cache !== r && (t.flags |= 2048), Yi(sa), ye(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (Vi(t) ? Pc(t) : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Ui())), U(t), null;
			case 26:
				var a = t.type, o = t.memoizedState;
				return e === null ? (Pc(t), o === null ? (U(t), Fc(t, a, null, r, n)) : (U(t), Ic(t, o))) : o ? o === e.memoizedState ? (U(t), t.flags &= -16777217) : (Pc(t), U(t), Ic(t, o)) : (e = e.memoizedProps, e !== r && Pc(t), U(t), Fc(t, a, e, r, n)), null;
			case 27:
				if (be(t), n = ge.current, a = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && Pc(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(i(166));
						return U(t), null;
					}
					e = me.current, Vi(t) ? zi(t, e) : (e = ff(a, r, n), t.stateNode = e, Pc(t));
				}
				return U(t), null;
			case 5:
				if (be(t), a = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && Pc(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(i(166));
						return U(t), null;
					}
					if (o = me.current, Vi(t)) zi(t, o);
					else {
						var s = Bd(ge.current);
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
						o[j] = t, o[mt] = r;
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
						r && Pc(t);
					}
				}
				return U(t), Fc(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
			case 6:
				if (e && t.stateNode != null) e.memoizedProps !== r && Pc(t);
				else {
					if (typeof r != "string" && t.stateNode === null) throw Error(i(166));
					if (e = ge.current, Vi(t)) {
						if (e = t.stateNode, n = t.memoizedProps, r = null, a = Pi, a !== null) switch (a.tag) {
							case 27:
							case 5: r = a.memoizedProps;
						}
						e[j] = t, e = !!(e.nodeValue === n || r !== null && !0 === r.suppressHydrationWarning || Md(e.nodeValue, n)), e || Ri(t, !0);
					} else e = Bd(e).createTextNode(r), e[j] = t, t.stateNode = e;
				}
				return U(t), null;
			case 31:
				if (n = t.memoizedState, e === null || e.memoizedState !== null) {
					if (r = Vi(t), n !== null) {
						if (e === null) {
							if (!r) throw Error(i(318));
							if (e = t.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(557));
							e[j] = t;
						} else Hi(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						U(t), e = !1;
					} else n = Ui(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
					if (!e) return t.flags & 256 ? (lo(t), t) : (lo(t), null);
					if (t.flags & 128) throw Error(i(558));
				}
				return U(t), null;
			case 13:
				if (r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (a = Vi(t), r !== null && r.dehydrated !== null) {
						if (e === null) {
							if (!a) throw Error(i(318));
							if (a = t.memoizedState, a = a === null ? null : a.dehydrated, !a) throw Error(i(317));
							a[j] = t;
						} else Hi(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						U(t), a = !1;
					} else a = Ui(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = a), a = !0;
					if (!a) return t.flags & 256 ? (lo(t), t) : (lo(t), null);
				}
				return lo(t), t.flags & 128 ? (t.lanes = n, t) : (n = r !== null, e = e !== null && e.memoizedState !== null, n && (r = t.child, a = null, r.alternate !== null && r.alternate.memoizedState !== null && r.alternate.memoizedState.cachePool !== null && (a = r.alternate.memoizedState.cachePool.pool), o = null, r.memoizedState !== null && r.memoizedState.cachePool !== null && (o = r.memoizedState.cachePool.pool), o !== a && (r.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), Lc(t, t.updateQueue), U(t), null);
			case 4: return ye(), e === null && Sd(t.stateNode.containerInfo), U(t), null;
			case 10: return Yi(t.type), U(t), null;
			case 19:
				if (pe(uo), r = t.memoizedState, r === null) return U(t), null;
				if (a = !!(t.flags & 128), o = r.rendering, o === null) {
					if (a) Rc(r, !1);
					else {
						if (X !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
							if (o = fo(e), o !== null) {
								for (t.flags |= 128, Rc(r, !1), e = o.updateQueue, t.updateQueue = e, Lc(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;) pi(n, e), n = n.sibling;
								return k(uo, uo.current & 1 | 2), z && Ai(t, r.treeForkCount), t.child;
							}
							e = e.sibling;
						}
						r.tail !== null && Ne() > tu && (t.flags |= 128, a = !0, Rc(r, !1), t.lanes = 4194304);
					}
				} else {
					if (!a) {
						if (e = fo(o), e !== null) {
							if (t.flags |= 128, a = !0, e = e.updateQueue, t.updateQueue = e, Lc(t, e), Rc(r, !0), r.tail === null && r.tailMode === "hidden" && !o.alternate && !z) return U(t), null;
						} else 2 * Ne() - r.renderingStartTime > tu && n !== 536870912 && (t.flags |= 128, a = !0, Rc(r, !1), t.lanes = 4194304);
					}
					r.isBackwards ? (o.sibling = t.child, t.child = o) : (e = r.last, e === null ? t.child = o : e.sibling = o, r.last = o);
				}
				return r.tail === null ? (U(t), null) : (e = r.tail, r.rendering = e, r.tail = e.sibling, r.renderingStartTime = Ne(), e.sibling = null, n = uo.current, k(uo, a ? n & 1 | 2 : n & 1), z && Ai(t, r.treeForkCount), e);
			case 22:
			case 23: return lo(t), no(), r = t.memoizedState !== null, e === null ? r && (t.flags |= 8192) : e.memoizedState !== null !== r && (t.flags |= 8192), r ? n & 536870912 && !(t.flags & 128) && (U(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : U(t), n = t.updateQueue, n !== null && Lc(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), r = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (r = t.memoizedState.cachePool.pool), r !== n && (t.flags |= 2048), e !== null && pe(va), null;
			case 24: return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), Yi(sa), U(t), null;
			case 25: return null;
			case 30: return null;
		}
		throw Error(i(156, t.tag));
	}
	function Bc(e, t) {
		switch (L(t), t.tag) {
			case 1: return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return Yi(sa), ye(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 26:
			case 27:
			case 5: return be(t), null;
			case 31:
				if (t.memoizedState !== null) {
					if (lo(t), t.alternate === null) throw Error(i(340));
					Hi();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 13:
				if (lo(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(i(340));
					Hi();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return pe(uo), null;
			case 4: return ye(), null;
			case 10: return Yi(t.type), null;
			case 22:
			case 23: return lo(t), no(), e !== null && pe(va), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 24: return Yi(sa), null;
			case 25: return null;
			default: return null;
		}
	}
	function Vc(e, t) {
		switch (L(t), t.tag) {
			case 3:
				Yi(sa), ye();
				break;
			case 26:
			case 27:
			case 5:
				be(t);
				break;
			case 4:
				ye();
				break;
			case 31:
				t.memoizedState !== null && lo(t);
				break;
			case 13:
				lo(t);
				break;
			case 19:
				pe(uo);
				break;
			case 10:
				Yi(t.type);
				break;
			case 22:
			case 23:
				lo(t), no(), e !== null && pe(va);
				break;
			case 24: Yi(sa);
		}
	}
	function Hc(e, t) {
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
	function Uc(e, t, n) {
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
	function Wc(e) {
		var t = e.updateQueue;
		if (t !== null) {
			var n = e.stateNode;
			try {
				Za(t, n);
			} catch (t) {
				Z(e, e.return, t);
			}
		}
	}
	function Gc(e, t, n) {
		n.props = qs(e.type, e.memoizedProps), n.state = e.memoizedState;
		try {
			n.componentWillUnmount();
		} catch (n) {
			Z(e, t, n);
		}
	}
	function Kc(e, t) {
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
	function qc(e, t) {
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
	function Jc(e) {
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
	function Yc(e, t, n) {
		try {
			var r = e.stateNode;
			Fd(r, e.type, n, t), r[mt] = t;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Xc(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Zd(e.type) || e.tag === 4;
	}
	function Zc(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || Xc(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.tag === 27 && Zd(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Qc(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(e, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(e), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = an));
		else if (r !== 4 && (r === 27 && Zd(e.type) && (n = e.stateNode, t = null), e = e.child, e !== null)) for (Qc(e, t, n), e = e.sibling; e !== null;) Qc(e, t, n), e = e.sibling;
	}
	function $c(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
		else if (r !== 4 && (r === 27 && Zd(e.type) && (n = e.stateNode), e = e.child, e !== null)) for ($c(e, t, n), e = e.sibling; e !== null;) $c(e, t, n), e = e.sibling;
	}
	function el(e) {
		var t = e.stateNode, n = e.memoizedProps;
		try {
			for (var r = e.type, i = t.attributes; i.length;) t.removeAttributeNode(i[0]);
			Pd(t, r, n), t[j] = e, t[mt] = n;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	var tl = !1, nl = !1, rl = !1, il = typeof WeakSet == "function" ? WeakSet : Set, al = null;
	function ol(e, t) {
		if (e = e.containerInfo, Rd = sp, e = jr(e), Mr(e)) {
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
		}, sp = !1, al = t; al !== null;) if (t = al, e = t.child, t.subtreeFlags & 1028 && e !== null) e.return = t, al = e;
		else for (; al !== null;) {
			switch (t = al, o = t.alternate, e = t.flags, t.tag) {
				case 0:
					if (e & 4 && (e = t.updateQueue, e = e === null ? null : e.events, e !== null)) for (n = 0; n < e.length; n++) a = e[n], a.ref.impl = a.nextImpl;
					break;
				case 11:
				case 15: break;
				case 1:
					if (e & 1024 && o !== null) {
						e = void 0, n = t, a = o.memoizedProps, o = o.memoizedState, r = n.stateNode;
						try {
							var h = qs(n.type, a);
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
				e.return = t.return, al = e;
				break;
			}
			al = t.return;
		}
	}
	function sl(e, t, n) {
		var r = n.flags;
		switch (n.tag) {
			case 0:
			case 11:
			case 15:
				xl(e, n), r & 4 && Hc(5, n);
				break;
			case 1:
				if (xl(e, n), r & 4) {
					if (e = n.stateNode, t === null) try {
						e.componentDidMount();
					} catch (e) {
						Z(n, n.return, e);
					}
					else {
						var i = qs(n.type, t.memoizedProps);
						t = t.memoizedState;
						try {
							e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
						} catch (e) {
							Z(n, n.return, e);
						}
					}
				}
				r & 64 && Wc(n), r & 512 && Kc(n, n.return);
				break;
			case 3:
				if (xl(e, n), r & 64 && (e = n.updateQueue, e !== null)) {
					if (t = null, n.child !== null) switch (n.child.tag) {
						case 27:
						case 5:
							t = n.child.stateNode;
							break;
						case 1: t = n.child.stateNode;
					}
					try {
						Za(e, t);
					} catch (e) {
						Z(n, n.return, e);
					}
				}
				break;
			case 27: t === null && r & 4 && el(n);
			case 26:
			case 5:
				xl(e, n), t === null && r & 4 && Jc(n), r & 512 && Kc(n, n.return);
				break;
			case 12:
				xl(e, n);
				break;
			case 31:
				xl(e, n), r & 4 && fl(e, n);
				break;
			case 13:
				xl(e, n), r & 4 && pl(e, n), r & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = Ju.bind(null, n), sf(e, n))));
				break;
			case 22:
				if (r = n.memoizedState !== null || tl, !r) {
					t = t !== null && t.memoizedState !== null || nl, i = tl;
					var a = nl;
					tl = r, (nl = t) && !a ? Cl(e, n, !!(n.subtreeFlags & 8772)) : xl(e, n), tl = i, nl = a;
				}
				break;
			case 30: break;
			default: xl(e, n);
		}
	}
	function cl(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, cl(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && bt(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	var W = null, ll = !1;
	function ul(e, t, n) {
		for (n = n.child; n !== null;) dl(e, t, n), n = n.sibling;
	}
	function dl(e, t, n) {
		if (Ue && typeof Ue.onCommitFiberUnmount == "function") try {
			Ue.onCommitFiberUnmount(He, n);
		} catch {}
		switch (n.tag) {
			case 26:
				nl || qc(n, t), ul(e, t, n), n.memoizedState ? n.memoizedState.count-- : n.stateNode && (n = n.stateNode, n.parentNode.removeChild(n));
				break;
			case 27:
				nl || qc(n, t);
				var r = W, i = ll;
				Zd(n.type) && (W = n.stateNode, ll = !1), ul(e, t, n), pf(n.stateNode), W = r, ll = i;
				break;
			case 5: nl || qc(n, t);
			case 6:
				if (r = W, i = ll, W = null, ul(e, t, n), W = r, ll = i, W !== null) {
					if (ll) try {
						(W.nodeType === 9 ? W.body : W.nodeName === "HTML" ? W.ownerDocument.body : W).removeChild(n.stateNode);
					} catch (e) {
						Z(n, t, e);
					}
					else try {
						W.removeChild(n.stateNode);
					} catch (e) {
						Z(n, t, e);
					}
				}
				break;
			case 18:
				W !== null && (ll ? (e = W, Qd(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, n.stateNode), Np(e)) : Qd(W, n.stateNode));
				break;
			case 4:
				r = W, i = ll, W = n.stateNode.containerInfo, ll = !0, ul(e, t, n), W = r, ll = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				Uc(2, n, t), nl || Uc(4, n, t), ul(e, t, n);
				break;
			case 1:
				nl || (qc(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function" && Gc(n, t, r)), ul(e, t, n);
				break;
			case 21:
				ul(e, t, n);
				break;
			case 22:
				nl = (r = nl) || n.memoizedState !== null, ul(e, t, n), nl = r;
				break;
			default: ul(e, t, n);
		}
	}
	function fl(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
			e = e.dehydrated;
			try {
				Np(e);
			} catch (e) {
				Z(t, t.return, e);
			}
		}
	}
	function pl(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
			Np(e);
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function ml(e) {
		switch (e.tag) {
			case 31:
			case 13:
			case 19:
				var t = e.stateNode;
				return t === null && (t = e.stateNode = new il()), t;
			case 22: return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new il()), t;
			default: throw Error(i(435, e.tag));
		}
	}
	function hl(e, t) {
		var n = ml(e);
		t.forEach(function(t) {
			if (!n.has(t)) {
				n.add(t);
				var r = Yu.bind(null, e, t);
				t.then(r, r);
			}
		});
	}
	function gl(e, t) {
		var n = t.deletions;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var a = n[r], o = e, s = t, c = s;
			a: for (; c !== null;) {
				switch (c.tag) {
					case 27:
						if (Zd(c.type)) {
							W = c.stateNode, ll = !1;
							break a;
						}
						break;
					case 5:
						W = c.stateNode, ll = !1;
						break a;
					case 3:
					case 4:
						W = c.stateNode.containerInfo, ll = !0;
						break a;
				}
				c = c.return;
			}
			if (W === null) throw Error(i(160));
			dl(o, s, a), W = null, ll = !1, o = a.alternate, o !== null && (o.return = null), a.return = null;
		}
		if (t.subtreeFlags & 13886) for (t = t.child; t !== null;) vl(t, e), t = t.sibling;
	}
	var _l = null;
	function vl(e, t) {
		var n = e.alternate, r = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				gl(t, e), yl(e), r & 4 && (Uc(3, e, e.return), Hc(3, e), Uc(5, e, e.return));
				break;
			case 1:
				gl(t, e), yl(e), r & 512 && (nl || n === null || qc(n, n.return)), r & 64 && tl && (e = e.updateQueue, e !== null && (r = e.callbacks, r !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? r : n.concat(r))));
				break;
			case 26:
				var a = _l;
				if (gl(t, e), yl(e), r & 512 && (nl || n === null || qc(n, n.return)), r & 4) {
					var o = n === null ? null : n.memoizedState;
					if (r = e.memoizedState, n === null) {
						if (r === null) {
							if (e.stateNode === null) {
								a: {
									r = e.type, n = e.memoizedProps, a = a.ownerDocument || a;
									b: switch (r) {
										case "title":
											o = a.getElementsByTagName("title")[0], (!o || o[M] || o[j] || o.namespaceURI === "http://www.w3.org/2000/svg" || o.hasAttribute("itemprop")) && (o = a.createElement(r), a.head.insertBefore(o, a.querySelector("head > title"))), Pd(o, r, n), o[j] = e, Tt(o), r = o;
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
									o[j] = e, Tt(o), r = o;
								}
								e.stateNode = r;
							} else Hf(a, e.type, e.stateNode);
						} else e.stateNode = If(a, r, e.memoizedProps);
					} else o === r ? r === null && e.stateNode !== null && Yc(e, e.memoizedProps, n.memoizedProps) : (o === null ? n.stateNode !== null && (n = n.stateNode, n.parentNode.removeChild(n)) : o.count--, r === null ? Hf(a, e.type, e.stateNode) : If(a, r, e.memoizedProps));
				}
				break;
			case 27:
				gl(t, e), yl(e), r & 512 && (nl || n === null || qc(n, n.return)), n !== null && r & 4 && Yc(e, e.memoizedProps, n.memoizedProps);
				break;
			case 5:
				if (gl(t, e), yl(e), r & 512 && (nl || n === null || qc(n, n.return)), e.flags & 32) {
					a = e.stateNode;
					try {
						Xt(a, "");
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				r & 4 && e.stateNode != null && (a = e.memoizedProps, Yc(e, a, n === null ? a : n.memoizedProps)), r & 1024 && (rl = !0);
				break;
			case 6:
				if (gl(t, e), yl(e), r & 4) {
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
				if (Bf = null, a = _l, _l = gf(t.containerInfo), gl(t, e), _l = a, yl(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
					Np(t.containerInfo);
				} catch (t) {
					Z(e, e.return, t);
				}
				rl && (rl = !1, bl(e));
				break;
			case 4:
				r = _l, _l = gf(e.stateNode.containerInfo), gl(t, e), yl(e), _l = r;
				break;
			case 12:
				gl(t, e), yl(e);
				break;
			case 31:
				gl(t, e), yl(e), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, hl(e, r)));
				break;
			case 13:
				gl(t, e), yl(e), e.child.flags & 8192 && e.memoizedState !== null != (n !== null && n.memoizedState !== null) && ($l = Ne()), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, hl(e, r)));
				break;
			case 22:
				a = e.memoizedState !== null;
				var l = n !== null && n.memoizedState !== null, u = tl, d = nl;
				if (tl = u || a, nl = d || l, gl(t, e), nl = d, tl = u, yl(e), r & 8192) a: for (t = e.stateNode, t._visibility = a ? t._visibility & -2 : t._visibility | 1, a && (n === null || l || tl || nl || Sl(e)), n = null, t = e;;) {
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
				r & 4 && (r = e.updateQueue, r !== null && (n = r.retryQueue, n !== null && (r.retryQueue = null, hl(e, n))));
				break;
			case 19:
				gl(t, e), yl(e), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, hl(e, r)));
				break;
			case 30: break;
			case 21: break;
			default: gl(t, e), yl(e);
		}
	}
	function yl(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				for (var n, r = e.return; r !== null;) {
					if (Xc(r)) {
						n = r;
						break;
					}
					r = r.return;
				}
				if (n == null) throw Error(i(160));
				switch (n.tag) {
					case 27:
						var a = n.stateNode;
						$c(e, Zc(e), a);
						break;
					case 5:
						var o = n.stateNode;
						n.flags & 32 && (Xt(o, ""), n.flags &= -33), $c(e, Zc(e), o);
						break;
					case 3:
					case 4:
						var s = n.stateNode.containerInfo;
						Qc(e, Zc(e), s);
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
	function bl(e) {
		if (e.subtreeFlags & 1024) for (e = e.child; e !== null;) {
			var t = e;
			bl(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), e = e.sibling;
		}
	}
	function xl(e, t) {
		if (t.subtreeFlags & 8772) for (t = t.child; t !== null;) sl(e, t.alternate, t), t = t.sibling;
	}
	function Sl(e) {
		for (e = e.child; e !== null;) {
			var t = e;
			switch (t.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					Uc(4, t, t.return), Sl(t);
					break;
				case 1:
					qc(t, t.return);
					var n = t.stateNode;
					typeof n.componentWillUnmount == "function" && Gc(t, t.return, n), Sl(t);
					break;
				case 27: pf(t.stateNode);
				case 26:
				case 5:
					qc(t, t.return), Sl(t);
					break;
				case 22:
					t.memoizedState === null && Sl(t);
					break;
				case 30:
					Sl(t);
					break;
				default: Sl(t);
			}
			e = e.sibling;
		}
	}
	function Cl(e, t, n) {
		for (n &&= !!(t.subtreeFlags & 8772), t = t.child; t !== null;) {
			var r = t.alternate, i = e, a = t, o = a.flags;
			switch (a.tag) {
				case 0:
				case 11:
				case 15:
					Cl(i, a, n), Hc(4, a);
					break;
				case 1:
					if (Cl(i, a, n), r = a, i = r.stateNode, typeof i.componentDidMount == "function") try {
						i.componentDidMount();
					} catch (e) {
						Z(r, r.return, e);
					}
					if (r = a, i = r.updateQueue, i !== null) {
						var s = r.stateNode;
						try {
							var c = i.shared.hiddenCallbacks;
							if (c !== null) for (i.shared.hiddenCallbacks = null, i = 0; i < c.length; i++) Xa(c[i], s);
						} catch (e) {
							Z(r, r.return, e);
						}
					}
					n && o & 64 && Wc(a), Kc(a, a.return);
					break;
				case 27: el(a);
				case 26:
				case 5:
					Cl(i, a, n), n && r === null && o & 4 && Jc(a), Kc(a, a.return);
					break;
				case 12:
					Cl(i, a, n);
					break;
				case 31:
					Cl(i, a, n), n && o & 4 && fl(i, a);
					break;
				case 13:
					Cl(i, a, n), n && o & 4 && pl(i, a);
					break;
				case 22:
					a.memoizedState === null && Cl(i, a, n), Kc(a, a.return);
					break;
				case 30: break;
				default: Cl(i, a, n);
			}
			t = t.sibling;
		}
	}
	function wl(e, t) {
		var n = null;
		e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && la(n));
	}
	function Tl(e, t) {
		e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && la(e));
	}
	function El(e, t, n, r) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) Dl(e, t, n, r), t = t.sibling;
	}
	function Dl(e, t, n, r) {
		var i = t.flags;
		switch (t.tag) {
			case 0:
			case 11:
			case 15:
				El(e, t, n, r), i & 2048 && Hc(9, t);
				break;
			case 1:
				El(e, t, n, r);
				break;
			case 3:
				El(e, t, n, r), i & 2048 && (e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && la(e)));
				break;
			case 12:
				if (i & 2048) {
					El(e, t, n, r), e = t.stateNode;
					try {
						var a = t.memoizedProps, o = a.id, s = a.onPostCommit;
						typeof s == "function" && s(o, t.alternate === null ? "mount" : "update", e.passiveEffectDuration, -0);
					} catch (e) {
						Z(t, t.return, e);
					}
				} else El(e, t, n, r);
				break;
			case 31:
				El(e, t, n, r);
				break;
			case 13:
				El(e, t, n, r);
				break;
			case 23: break;
			case 22:
				a = t.stateNode, o = t.alternate, t.memoizedState === null ? a._visibility & 2 ? El(e, t, n, r) : (a._visibility |= 2, Ol(e, t, n, r, !!(t.subtreeFlags & 10256) || !1)) : a._visibility & 2 ? El(e, t, n, r) : kl(e, t), i & 2048 && wl(o, t);
				break;
			case 24:
				El(e, t, n, r), i & 2048 && Tl(t.alternate, t);
				break;
			default: El(e, t, n, r);
		}
	}
	function Ol(e, t, n, r, i) {
		for (i &&= !!(t.subtreeFlags & 10256) || !1, t = t.child; t !== null;) {
			var a = e, o = t, s = n, c = r, l = o.flags;
			switch (o.tag) {
				case 0:
				case 11:
				case 15:
					Ol(a, o, s, c, i), Hc(8, o);
					break;
				case 23: break;
				case 22:
					var u = o.stateNode;
					o.memoizedState === null ? (u._visibility |= 2, Ol(a, o, s, c, i)) : u._visibility & 2 ? Ol(a, o, s, c, i) : kl(a, o), i && l & 2048 && wl(o.alternate, o);
					break;
				case 24:
					Ol(a, o, s, c, i), i && l & 2048 && Tl(o.alternate, o);
					break;
				default: Ol(a, o, s, c, i);
			}
			t = t.sibling;
		}
	}
	function kl(e, t) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) {
			var n = e, r = t, i = r.flags;
			switch (r.tag) {
				case 22:
					kl(n, r), i & 2048 && wl(r.alternate, r);
					break;
				case 24:
					kl(n, r), i & 2048 && Tl(r.alternate, r);
					break;
				default: kl(n, r);
			}
			t = t.sibling;
		}
	}
	var Al = 8192;
	function jl(e, t, n) {
		if (e.subtreeFlags & Al) for (e = e.child; e !== null;) Ml(e, t, n), e = e.sibling;
	}
	function Ml(e, t, n) {
		switch (e.tag) {
			case 26:
				jl(e, t, n), e.flags & Al && e.memoizedState !== null && Gf(n, _l, e.memoizedState, e.memoizedProps);
				break;
			case 5:
				jl(e, t, n);
				break;
			case 3:
			case 4:
				var r = _l;
				_l = gf(e.stateNode.containerInfo), jl(e, t, n), _l = r;
				break;
			case 22:
				e.memoizedState === null && (r = e.alternate, r !== null && r.memoizedState !== null ? (r = Al, Al = 16777216, jl(e, t, n), Al = r) : jl(e, t, n));
				break;
			default: jl(e, t, n);
		}
	}
	function Nl(e) {
		var t = e.alternate;
		if (t !== null && (e = t.child, e !== null)) {
			t.child = null;
			do
				t = e.sibling, e.sibling = null, e = t;
			while (e !== null);
		}
	}
	function Pl(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				al = r, Ll(r, e);
			}
			Nl(e);
		}
		if (e.subtreeFlags & 10256) for (e = e.child; e !== null;) Fl(e), e = e.sibling;
	}
	function Fl(e) {
		switch (e.tag) {
			case 0:
			case 11:
			case 15:
				Pl(e), e.flags & 2048 && Uc(9, e, e.return);
				break;
			case 3:
				Pl(e);
				break;
			case 12:
				Pl(e);
				break;
			case 22:
				var t = e.stateNode;
				e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, Il(e)) : Pl(e);
				break;
			default: Pl(e);
		}
	}
	function Il(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				al = r, Ll(r, e);
			}
			Nl(e);
		}
		for (e = e.child; e !== null;) {
			switch (t = e, t.tag) {
				case 0:
				case 11:
				case 15:
					Uc(8, t, t.return), Il(t);
					break;
				case 22:
					n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, Il(t));
					break;
				default: Il(t);
			}
			e = e.sibling;
		}
	}
	function Ll(e, t) {
		for (; al !== null;) {
			var n = al;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					Uc(8, n, t);
					break;
				case 23:
				case 22:
					if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
						var r = n.memoizedState.cachePool.pool;
						r != null && r.refCount++;
					}
					break;
				case 24: la(n.memoizedState.cache);
			}
			if (r = n.child, r !== null) r.return = n, al = r;
			else a: for (n = e; al !== null;) {
				r = al;
				var i = r.sibling, a = r.return;
				if (cl(r), r === n) {
					al = null;
					break a;
				}
				if (i !== null) {
					i.return = a, al = i;
					break a;
				}
				al = a;
			}
		}
	}
	var Rl = {
		getCacheForType: function(e) {
			var t = ta(sa), n = t.data.get(e);
			return n === void 0 && (n = e(), t.data.set(e, n)), n;
		},
		cacheSignal: function() {
			return ta(sa).controller.signal;
		}
	}, zl = typeof WeakMap == "function" ? WeakMap : Map, G = 0, K = null, q = null, J = 0, Y = 0, Bl = null, Vl = !1, Hl = !1, Ul = !1, Wl = 0, X = 0, Gl = 0, Kl = 0, ql = 0, Jl = 0, Yl = 0, Xl = null, Zl = null, Ql = !1, $l = 0, eu = 0, tu = Infinity, nu = null, ru = null, iu = 0, au = null, ou = null, su = 0, cu = 0, lu = null, uu = null, du = 0, fu = null;
	function pu() {
		return G & 2 && J !== 0 ? J & -J : D.T === null ? dt() : dd();
	}
	function mu() {
		if (Jl === 0) {
			if (!(J & 536870912) || z) {
				var e = Xe;
				Xe <<= 1, !(Xe & 3932160) && (Xe = 262144), Jl = e;
			} else Jl = 536870912;
		}
		return e = ro.current, e !== null && (e.flags |= 32), Jl;
	}
	function hu(e, t, n) {
		(e === K && (Y === 2 || Y === 9) || e.cancelPendingCommit !== null) && (Su(e, 0), yu(e, J, Jl, !1)), it(e, n), (!(G & 2) || e !== K) && (e === K && (!(G & 2) && (Kl |= n), X === 4 && yu(e, J, Jl, !1)), rd(e));
	}
	function gu(e, t, n) {
		if (G & 6) throw Error(i(327));
		var r = !n && !(t & 127) && (t & e.expiredLanes) === 0 || et(e, t), a = r ? Au(e, t) : Ou(e, t, !0), o = r;
		do {
			if (a === 0) {
				Hl && !r && yu(e, t, 0, !1);
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
							if (Ul && !l) {
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
						yu(r, t, Jl, !Vl);
						break a;
					case 2:
						Zl = null;
						break;
					case 3:
					case 5: break;
					default: throw Error(i(329));
				}
				if ((t & 62914560) === t && (a = $l + 300 - Ne(), 10 < a)) {
					if (yu(r, t, Jl, !Vl), $e(r, 0, !0) !== 0) break a;
					su = t, r.timeoutHandle = Kd(_u.bind(null, r, n, Zl, nu, Ql, t, Jl, Kl, Yl, Vl, o, "Throttled", -0, 0), a);
					break a;
				}
				_u(r, n, Zl, nu, Ql, t, Jl, Kl, Yl, Vl, o, null, -0, 0);
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
				unsuspend: an
			}, Ml(t, a, d);
			var m = (a & 62914560) === a ? $l - Ne() : (a & 4194048) === a ? eu - Ne() : 0;
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
					if (!Er(a(), i)) return !1;
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
			var a = 31 - Ge(i), o = 1 << a;
			r[a] = -1, i &= ~o;
		}
		n !== 0 && ot(e, n, t);
	}
	function bu() {
		return G & 6 ? !0 : (id(0, !1), !1);
	}
	function xu() {
		if (q !== null) {
			if (Y === 0) var e = q.return;
			else e = q, qi = Ki = null, ko(e), Ma = null, Na = 0, e = q;
			for (; e !== null;) Vc(e.alternate, e), e = e.return;
			q = null;
		}
	}
	function Su(e, t) {
		var n = e.timeoutHandle;
		n !== -1 && (e.timeoutHandle = -1, qd(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), su = 0, xu(), K = e, q = n = fi(e.current, null), J = t, Y = 0, Bl = null, Vl = !1, Hl = et(e, t), Ul = !1, Yl = Jl = ql = Kl = Gl = X = 0, Zl = Xl = null, Ql = !1, t & 8 && (t |= t & 32);
		var r = e.entangledLanes;
		if (r !== 0) for (e = e.entanglements, r &= t; 0 < r;) {
			var i = 31 - Ge(r), a = 1 << i;
			t |= e[i], r &= ~a;
		}
		return Wl = t, ni(), n;
	}
	function Cu(e, t) {
		B = null, D.H = zs, t === Sa || t === wa ? (t = Aa(), Y = 3) : t === Ca ? (t = Aa(), Y = 4) : Y = t === rc ? 8 : typeof t == "object" && t && typeof t.then == "function" ? 6 : 1, Bl = t, q === null && (X = 1, Zs(e, bi(t, e.current)));
	}
	function wu() {
		var e = ro.current;
		return e === null ? !0 : (J & 4194048) === J ? io === null : (J & 62914560) === J || J & 536870912 ? e === io : !1;
	}
	function Tu() {
		var e = D.H;
		return D.H = zs, e === null ? zs : e;
	}
	function Eu() {
		var e = D.A;
		return D.A = Rl, e;
	}
	function Du() {
		X = 4, Vl || (J & 4194048) !== J && ro.current !== null || (Hl = !0), !(Gl & 134217727) && !(Kl & 134217727) || K === null || yu(K, J, Jl, !1);
	}
	function Ou(e, t, n) {
		var r = G;
		G |= 2;
		var i = Tu(), a = Eu();
		(K !== e || J !== t) && (nu = null, Su(e, t)), t = !1;
		var o = X;
		a: do
			try {
				if (Y !== 0 && q !== null) {
					var s = q, c = Bl;
					switch (Y) {
						case 8:
							xu(), o = 6;
							break a;
						case 3:
						case 2:
						case 9:
						case 6:
							ro.current === null && (t = !0);
							var l = Y;
							if (Y = 0, Bl = null, Pu(e, s, c, l), n && Hl) {
								o = 0;
								break a;
							}
							break;
						default: l = Y, Y = 0, Bl = null, Pu(e, s, c, l);
					}
				}
				ku(), o = X;
				break;
			} catch (t) {
				Cu(e, t);
			}
		while (1);
		return t && e.shellSuspendCounter++, qi = Ki = null, G = r, D.H = i, D.A = a, q === null && (K = null, J = 0, ni()), o;
	}
	function ku() {
		for (; q !== null;) Mu(q);
	}
	function Au(e, t) {
		var n = G;
		G |= 2;
		var r = Tu(), a = Eu();
		K !== e || J !== t ? (nu = null, tu = Ne() + 500, Su(e, t)) : Hl = et(e, t);
		a: do
			try {
				if (Y !== 0 && q !== null) {
					t = q;
					var o = Bl;
					b: switch (Y) {
						case 1:
							Y = 0, Bl = null, Pu(e, t, o, 1);
							break;
						case 2:
						case 9:
							if (Ea(o)) {
								Y = 0, Bl = null, Nu(t);
								break;
							}
							t = function() {
								Y !== 2 && Y !== 9 || K !== e || (Y = 7), rd(e);
							}, o.then(t, t);
							break a;
						case 3:
							Y = 7;
							break a;
						case 4:
							Y = 5;
							break a;
						case 7:
							Ea(o) ? (Y = 0, Bl = null, Nu(t)) : (Y = 0, Bl = null, Pu(e, t, o, 7));
							break;
						case 5:
							var s = null;
							switch (q.tag) {
								case 26: s = q.memoizedState;
								case 5:
								case 27:
									var c = q;
									if (s ? Wf(s) : c.stateNode.complete) {
										Y = 0, Bl = null;
										var l = c.sibling;
										if (l !== null) q = l;
										else {
											var u = c.return;
											u === null ? q = null : (q = u, Fu(u));
										}
										break b;
									}
							}
							Y = 0, Bl = null, Pu(e, t, o, 5);
							break;
						case 6:
							Y = 0, Bl = null, Pu(e, t, o, 6);
							break;
						case 8:
							xu(), X = 6;
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
		return qi = Ki = null, D.H = r, D.A = a, G = n, q === null ? (K = null, J = 0, ni(), X) : 0;
	}
	function ju() {
		for (; q !== null && !je();) Mu(q);
	}
	function Mu(e) {
		var t = Nc(e.alternate, e, Wl);
		e.memoizedProps = e.pendingProps, t === null ? Fu(e) : q = t;
	}
	function Nu(e) {
		var t = e, n = t.alternate;
		switch (t.tag) {
			case 15:
			case 0:
				t = _c(n, t, t.pendingProps, t.type, void 0, J);
				break;
			case 11:
				t = _c(n, t, t.pendingProps, t.type.render, t.ref, J);
				break;
			case 5: ko(t);
			default: Vc(n, t), t = q = pi(t, Wl), t = Nc(n, t, Wl);
		}
		e.memoizedProps = e.pendingProps, t === null ? Fu(e) : q = t;
	}
	function Pu(e, t, n, r) {
		qi = Ki = null, ko(t), Ma = null, Na = 0;
		var i = t.return;
		try {
			if (nc(e, i, t, n, J)) {
				X = 1, Zs(e, bi(n, e.current)), q = null;
				return;
			}
		} catch (t) {
			if (i !== null) throw q = i, t;
			X = 1, Zs(e, bi(n, e.current)), q = null;
			return;
		}
		t.flags & 32768 ? (z || r === 1 ? e = !0 : Hl || J & 536870912 ? e = !1 : (Vl = e = !0, (r === 2 || r === 9 || r === 3 || r === 6) && (r = ro.current, r !== null && r.tag === 13 && (r.flags |= 16384))), Iu(t, e)) : Fu(t);
	}
	function Fu(e) {
		var t = e;
		do {
			if (t.flags & 32768) {
				Iu(t, Vl);
				return;
			}
			e = t.return;
			var n = zc(t.alternate, t, Wl);
			if (n !== null) {
				q = n;
				return;
			}
			if (t = t.sibling, t !== null) {
				q = t;
				return;
			}
			q = t = e;
		} while (t !== null);
		X === 0 && (X = 5);
	}
	function Iu(e, t) {
		do {
			var n = Bc(e.alternate, e);
			if (n !== null) {
				n.flags &= 32767, q = n;
				return;
			}
			if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
				q = e;
				return;
			}
			q = e = n;
		} while (e !== null);
		X = 6, q = null;
	}
	function Lu(e, t, n, r, a, o, s, c, l) {
		e.cancelPendingCommit = null;
		do
			Hu();
		while (iu !== 0);
		if (G & 6) throw Error(i(327));
		if (t !== null) {
			if (t === e.current) throw Error(i(177));
			if (o = t.lanes | t.childLanes, o |= ti, at(e, n, o, s, c, l), e === K && (q = K = null, J = 0), ou = t, au = e, su = n, cu = o, lu = a, uu = r, t.subtreeFlags & 10256 || t.flags & 10256 ? (e.callbackNode = null, e.callbackPriority = 0, Xu(Le, function() {
				return Uu(), null;
			})) : (e.callbackNode = null, e.callbackPriority = 0), r = !!(t.flags & 13878), t.subtreeFlags & 13878 || r) {
				r = D.T, D.T = null, a = O.p, O.p = 2, s = G, G |= 4;
				try {
					ol(e, t, n);
				} finally {
					G = s, O.p = a, D.T = r;
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
				n = D.T, D.T = null;
				var r = O.p;
				O.p = 2;
				var i = G;
				G |= 4;
				try {
					vl(t, e);
					var a = zd, o = jr(e.containerInfo), s = a.focusedElem, c = a.selectionRange;
					if (o !== s && s && s.ownerDocument && Ar(s.ownerDocument.documentElement, s)) {
						if (c !== null && Mr(s)) {
							var l = c.start, u = c.end;
							if (u === void 0 && (u = l), "selectionStart" in s) s.selectionStart = l, s.selectionEnd = Math.min(u, s.value.length);
							else {
								var d = s.ownerDocument || document, f = d && d.defaultView || window;
								if (f.getSelection) {
									var p = f.getSelection(), m = s.textContent.length, h = Math.min(c.start, m), g = c.end === void 0 ? h : Math.min(c.end, m);
									!p.extend && h > g && (o = g, g = h, h = o);
									var _ = kr(s, h), v = kr(s, g);
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
					G = i, O.p = r, D.T = n;
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
				n = D.T, D.T = null;
				var r = O.p;
				O.p = 2;
				var i = G;
				G |= 4;
				try {
					sl(e, t.alternate, t);
				} finally {
					G = i, O.p = r, D.T = n;
				}
			}
			iu = 3;
		}
	}
	function Bu() {
		if (iu === 4 || iu === 3) {
			iu = 0, Me();
			var e = au, t = ou, n = su, r = uu;
			t.subtreeFlags & 10256 || t.flags & 10256 ? iu = 5 : (iu = 0, ou = au = null, Vu(e, e.pendingLanes));
			var i = e.pendingLanes;
			if (i === 0 && (ru = null), ut(n), t = t.stateNode, Ue && typeof Ue.onCommitFiberRoot == "function") try {
				Ue.onCommitFiberRoot(He, t, void 0, (t.current.flags & 128) == 128);
			} catch {}
			if (r !== null) {
				t = D.T, i = O.p, O.p = 2, D.T = null;
				try {
					for (var a = e.onRecoverableError, o = 0; o < r.length; o++) {
						var s = r[o];
						a(s.value, { componentStack: s.stack });
					}
				} finally {
					D.T = t, O.p = i;
				}
			}
			su & 3 && Hu(), rd(e), i = e.pendingLanes, n & 261930 && i & 42 ? e === fu ? du++ : (du = 0, fu = e) : du = 0, id(0, !1);
		}
	}
	function Vu(e, t) {
		(e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, la(t)));
	}
	function Hu() {
		return Ru(), zu(), Bu(), Uu();
	}
	function Uu() {
		if (iu !== 5) return !1;
		var e = au, t = cu;
		cu = 0;
		var n = ut(su), r = D.T, a = O.p;
		try {
			O.p = 32 > n ? 32 : n, D.T = null, n = lu, lu = null;
			var o = au, s = su;
			if (iu = 0, ou = au = null, su = 0, G & 6) throw Error(i(331));
			var c = G;
			if (G |= 4, Fl(o.current), Dl(o, o.current, s, n), G = c, id(0, !1), Ue && typeof Ue.onPostCommitFiberRoot == "function") try {
				Ue.onPostCommitFiberRoot(He, o);
			} catch {}
			return !0;
		} finally {
			O.p = a, D.T = r, Vu(e, t);
		}
	}
	function Wu(e, t, n) {
		t = bi(n, t), t = $s(e.stateNode, t, 2), e = Wa(e, t, 2), e !== null && (it(e, 2), rd(e));
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
					e = bi(n, e), n = ec(2), r = Wa(t, n, 2), r !== null && (tc(n, r, t, e), it(r, 2), rd(r));
					break;
				}
			}
			t = t.return;
		}
	}
	function Gu(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new zl();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (Ul = !0, i.add(n), e = Ku.bind(null, e, t, n), t.then(e, e));
	}
	function Ku(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, K === e && (J & n) === n && (X === 4 || X === 3 && (J & 62914560) === J && 300 > Ne() - $l ? !(G & 2) && Su(e, 0) : ql |= n, Yl === J && (Yl = 0)), rd(e);
	}
	function qu(e, t) {
		t === 0 && (t = nt()), e = ai(e, t), e !== null && (it(e, t), rd(e));
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
		return ke(e, t);
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
								a = (1 << 31 - Ge(42 | e) + 1) - 1, a &= i & ~(o & ~s), a = a & 201326741 ? a & 201326741 | 1 : a ? a | 2 : 0;
							}
							a !== 0 && (n = !0, ld(r, a));
						} else a = J, a = $e(r, r === K ? a : 0, r.cancelPendingCommit !== null || r.timeoutHandle !== -1), !(a & 3) || et(r, a) || (n = !0, ld(r, a));
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
		for (var t = Ne(), n = null, r = Zu; r !== null;) {
			var i = r.next, a = sd(r, t);
			a === 0 ? (r.next = null, n === null ? Zu = i : n.next = i, i === null && (Qu = n)) : (n = r, (e !== 0 || a & 3) && (ed = !0)), r = i;
		}
		iu !== 0 && iu !== 5 || id(e, !1), nd !== 0 && (nd = 0);
	}
	function sd(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes & -62914561; 0 < a;) {
			var o = 31 - Ge(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = tt(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
		if (t = K, n = J, n = $e(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r = e.callbackNode, n === 0 || e === t && (Y === 2 || Y === 9) || e.cancelPendingCommit !== null) return r !== null && r !== null && Ae(r), e.callbackNode = null, e.callbackPriority = 0;
		if (!(n & 3) || et(e, n)) {
			if (t = n & -n, t === e.callbackPriority) return t;
			switch (r !== null && Ae(r), ut(n)) {
				case 2:
				case 8:
					n = Ie;
					break;
				case 32:
					n = Le;
					break;
				case 268435456:
					n = ze;
					break;
				default: n = Le;
			}
			return r = cd.bind(null, e), n = ke(n, r), e.callbackPriority = t, e.callbackNode = n, t;
		}
		return r !== null && r !== null && Ae(r), e.callbackPriority = 2, e.callbackNode = null, 2;
	}
	function cd(e, t) {
		if (iu !== 0 && iu !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
		var n = e.callbackNode;
		if (Hu() && e.callbackNode !== n) return null;
		var r = J;
		return r = $e(e, e === K ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r === 0 ? null : (gu(e, r, t), sd(e, Ne()), e.callbackNode != null && e.callbackNode === n ? cd.bind(null, e) : null);
	}
	function ld(e, t) {
		if (Hu()) return null;
		gu(e, t, !0);
	}
	function ud() {
		Yd(function() {
			G & 6 ? ke(Fe, ad) : od();
		});
	}
	function dd() {
		if (nd === 0) {
			var e = fa;
			e === 0 && (e = Ye, Ye <<= 1, !(Ye & 261888) && (Ye = 256)), nd = e;
		}
		return nd;
	}
	function fd(e) {
		return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : rn("" + e);
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
								Ts(n, {
									pending: !0,
									data: e,
									method: i.method,
									action: a
								}, null, e);
							}
						} else typeof a == "function" && (s.preventDefault(), e = o ? pd(i, o) : new FormData(i), Ts(n, {
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
	for (var hd = 0; hd < Xr.length; hd++) {
		var gd = Xr[hd];
		Zr(gd.toLowerCase(), "on" + (gd[0].toUpperCase() + gd.slice(1)));
	}
	Zr(Ur, "onAnimationEnd"), Zr(Wr, "onAnimationIteration"), Zr(Gr, "onAnimationStart"), Zr("dblclick", "onDoubleClick"), Zr("focusin", "onFocus"), Zr("focusout", "onBlur"), Zr(Kr, "onTransitionRun"), Zr(qr, "onTransitionStart"), Zr(Jr, "onTransitionCancel"), Zr(Yr, "onTransitionEnd"), kt("onMouseEnter", ["mouseout", "mouseover"]), kt("onMouseLeave", ["mouseout", "mouseover"]), kt("onPointerEnter", ["pointerout", "pointerover"]), kt("onPointerLeave", ["pointerout", "pointerover"]), Ot("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), Ot("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), Ot("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), Ot("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), Ot("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), Ot("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
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
						Qr(e);
					}
					i.currentTarget = null, a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						Qr(e);
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
			e[xd] = !0, Et.forEach(function(t) {
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
		n = i.bind(null, t, n, e), i = void 0, !hn || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
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
					if (s = xt(c), s === null) return;
					if (l = s.tag, l === 5 || l === 6 || l === 26 || l === 27) {
						r = a = s;
						continue a;
					}
					c = c.parentNode;
				}
			}
			r = r.return;
		}
		fn(function() {
			var r = a, i = sn(n), s = [];
			a: {
				var c = I.get(e);
				if (c !== void 0) {
					var l = En, u = e;
					switch (e) {
						case "keypress": if (xn(n) === 0) break a;
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
						case Ur:
						case Wr:
						case Gr:
							l = In;
							break;
						case Yr:
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
						if (h = g.stateNode, g = g.tag, g !== 5 && g !== 26 && g !== 27 || h === null || p === null || (g = pn(m, p), g != null && d.push(Td(m, g, h))), f) break;
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
					if (c = e === "mouseover" || e === "pointerover", l = e === "mouseout" || e === "pointerout", c && n !== on && (u = n.relatedTarget || n.fromElement) && (xt(u) || u[ht])) break a;
					if ((l || c) && (c = i.window === i ? i : (c = i.ownerDocument) ? c.defaultView || c.parentWindow : window, l ? (u = n.relatedTarget || n.toElement, l = r, u = u ? xt(u) : null, u !== null && (f = o(u), d = u.tag, u !== f || d !== 5 && d !== 27 && d !== 6) && (u = null)) : (l = null, u = r), l !== u)) {
						if (d = Nn, g = "onMouseLeave", p = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (d = Gn, g = "onPointerLeave", p = "onPointerEnter", m = "pointer"), f = l == null ? c : Ct(l), h = u == null ? c : Ct(u), c = new d(g, m + "leave", l, n, i), c.target = f, c.relatedTarget = h, g = null, xt(i) === r && (d = new d(p, m + "enter", u, n, i), d.target = h, d.relatedTarget = f, g = d), f = g, l && u) b: {
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
					if (c = r ? Ct(r) : window, l = c.nodeName && c.nodeName.toLowerCase(), l === "select" || l === "input" && c.type === "file") var v = mr;
					else if (P(c)) {
						if (hr) v = wr;
						else {
							v = Sr;
							var y = xr;
						}
					} else l = c.nodeName, !l || l.toLowerCase() !== "input" || c.type !== "checkbox" && c.type !== "radio" ? r && en(r.elementType) && (v = mr) : v = Cr;
					if (v &&= v(e, r)) {
						lr(s, v, n, i);
						break a;
					}
					y && y(e, c, r), e === "focusout" && r && c.type === "number" && r.memoizedProps.value != null && Kt(c, "number", c.value);
				}
				switch (y = r ? Ct(r) : window, e) {
					case "focusin":
						(P(y) || y.contentEditable === "true") && (Pr = y, Fr = r, Ir = null);
						break;
					case "focusout":
						Ir = Fr = Pr = null;
						break;
					case "mousedown":
						Lr = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						Lr = !1, Rr(s, n, i);
						break;
					case "selectionchange": if (Nr) break;
					case "keydown":
					case "keyup": Rr(s, n, i);
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
				x && (er && n.locale !== "ko" && (ar || x !== "onCompositionStart" ? x === "onCompositionEnd" && ar && (b = bn()) : (_n = i, vn = "value" in _n ? _n.value : _n.textContent, ar = !0)), y = Ed(r, x), 0 < y.length && (x = new Rn(x, e, null, n, i), s.push({
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
			if (i = i.tag, i !== 5 && i !== 26 && i !== 27 || a === null || (i = pn(e, n), i != null && r.unshift(Td(e, i, a)), i = pn(e, t), i != null && r.push(Td(e, i, a))), e.tag === 3) return r;
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
			s !== 5 && s !== 26 && s !== 27 || l === null || (c = l, i ? (l = pn(n, a), l != null && o.unshift(Td(n, l, c))) : i || (l = pn(n, a), l != null && o.push(Td(n, l, c)))), n = n.return;
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
				typeof r == "string" ? t === "body" || t === "textarea" && r === "" || Xt(e, r) : (typeof r == "number" || typeof r == "bigint") && t !== "body" && Xt(e, "" + r);
				break;
			case "className":
				Ft(e, "class", r);
				break;
			case "tabIndex":
				Ft(e, "tabindex", r);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				Ft(e, n, r);
				break;
			case "style":
				$t(e, r, o);
				break;
			case "data": if (t !== "object") {
				Ft(e, "data", r);
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
				r = rn("" + r), e.setAttribute(n, r);
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
				r = rn("" + r), e.setAttribute(n, r);
				break;
			case "onClick":
				r != null && (e.onclick = an);
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
				n = rn("" + r), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
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
				Q("beforetoggle", e), Q("toggle", e), Pt(e, "popover", r);
				break;
			case "xlinkActuate":
				It(e, "http://www.w3.org/1999/xlink", "xlink:actuate", r);
				break;
			case "xlinkArcrole":
				It(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", r);
				break;
			case "xlinkRole":
				It(e, "http://www.w3.org/1999/xlink", "xlink:role", r);
				break;
			case "xlinkShow":
				It(e, "http://www.w3.org/1999/xlink", "xlink:show", r);
				break;
			case "xlinkTitle":
				It(e, "http://www.w3.org/1999/xlink", "xlink:title", r);
				break;
			case "xlinkType":
				It(e, "http://www.w3.org/1999/xlink", "xlink:type", r);
				break;
			case "xmlBase":
				It(e, "http://www.w3.org/XML/1998/namespace", "xml:base", r);
				break;
			case "xmlLang":
				It(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", r);
				break;
			case "xmlSpace":
				It(e, "http://www.w3.org/XML/1998/namespace", "xml:space", r);
				break;
			case "is":
				Pt(e, "is", r);
				break;
			case "innerText":
			case "textContent": break;
			default: (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") && (n = tn.get(n) || n, Pt(e, n, r));
		}
	}
	function Nd(e, t, n, r, a, o) {
		switch (n) {
			case "style":
				$t(e, r, o);
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
				typeof r == "string" ? Xt(e, r) : (typeof r == "number" || typeof r == "bigint") && Xt(e, "" + r);
				break;
			case "onScroll":
				r != null && Q("scroll", e);
				break;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				break;
			case "onClick":
				r != null && (e.onclick = an);
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref": break;
			case "innerText":
			case "textContent": break;
			default: if (!Dt.hasOwnProperty(n)) a: {
				if (n[0] === "o" && n[1] === "n" && (a = n.endsWith("Capture"), t = n.slice(2, a ? n.length - 7 : void 0), o = e[mt] || null, o = o == null ? null : o[n], typeof o == "function" && e.removeEventListener(t, o, a), typeof r == "function")) {
					typeof o != "function" && o !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(t, r, a);
					break a;
				}
				n in e ? e[n] = r : !0 === r ? e.setAttribute(n, "") : Pt(e, n, r);
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
				Gt(e, o, c, l, u, s, a, !1);
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
				t = o, n = s, e.multiple = !!r, t == null ? n != null && qt(e, !!r, n, !0) : qt(e, !!r, t, !1);
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
				Yt(e, r, a, o);
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
			default: if (en(t)) {
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
				N(e, s, c, l, u, d, o, a);
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
				t = c, n = s, r = m, p == null ? !!r != !!n && (t == null ? qt(e, !!n, n ? [] : "", !1) : qt(e, !!n, t, !0)) : qt(e, !!n, p, !1);
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
				Jt(e, p, m);
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
			default: if (en(t)) {
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
						a[M] || s === "SCRIPT" || s === "STYLE" || s === "LINK" && a.rel.toLowerCase() === "stylesheet" || n.removeChild(a), a = o;
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
					ef(n), bt(n);
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
			} else if (!e[M]) switch (t) {
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
		bt(e);
	}
	var mf = /* @__PURE__ */ new Map(), hf = /* @__PURE__ */ new Set();
	function gf(e) {
		return typeof e.getRootNode == "function" ? e.getRootNode() : e.nodeType === 9 ? e : e.ownerDocument;
	}
	var _f = O.d;
	O.d = {
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
		var t = St(e);
		t !== null && t.tag === 5 && t.type === "form" ? Ds(t) : _f.r(e);
	}
	var bf = typeof document > "u" ? null : document;
	function xf(e, t, n) {
		var r = bf;
		if (r && typeof t == "string" && t) {
			var i = Wt(t);
			i = "link[rel=\"" + e + "\"][href=\"" + i + "\"]", typeof n == "string" && (i += "[crossorigin=\"" + n + "\"]"), hf.has(i) || (hf.add(i), e = {
				rel: e,
				crossOrigin: n,
				href: t
			}, r.querySelector(i) === null && (t = r.createElement("link"), Pd(t, "link", e), Tt(t), r.head.appendChild(t)));
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
			var i = "link[rel=\"preload\"][as=\"" + Wt(t) + "\"]";
			t === "image" && n && n.imageSrcSet ? (i += "[imagesrcset=\"" + Wt(n.imageSrcSet) + "\"]", typeof n.imageSizes == "string" && (i += "[imagesizes=\"" + Wt(n.imageSizes) + "\"]")) : i += "[href=\"" + Wt(e) + "\"]";
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
			}, n), mf.set(a, e), r.querySelector(i) !== null || t === "style" && r.querySelector(jf(a)) || t === "script" && r.querySelector(Ff(a)) || (t = r.createElement("link"), Pd(t, "link", e), Tt(t), r.head.appendChild(t)));
		}
	}
	function Tf(e, t) {
		_f.m(e, t);
		var n = bf;
		if (n && e) {
			var r = t && typeof t.as == "string" ? t.as : "script", i = "link[rel=\"modulepreload\"][as=\"" + Wt(r) + "\"][href=\"" + Wt(e) + "\"]", a = i;
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
				r = n.createElement("link"), Pd(r, "link", e), Tt(r), n.head.appendChild(r);
			}
		}
	}
	function Ef(e, t, n) {
		_f.S(e, t, n);
		var r = bf;
		if (r && e) {
			var i = wt(r).hoistableStyles, a = Af(e);
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
					Tt(c), Pd(c, "link", e), c._p = new Promise(function(e, t) {
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
			var r = wt(n).hoistableScripts, i = Pf(e), a = r.get(i);
			a || (a = n.querySelector(Ff(i)), a || (e = h({
				src: e,
				async: !0
			}, t), (t = mf.get(i)) && zf(e, t), a = n.createElement("script"), Tt(a), Pd(a, "link", e), n.head.appendChild(a)), a = {
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
			var r = wt(n).hoistableScripts, i = Pf(e), a = r.get(i);
			a || (a = n.querySelector(Ff(i)), a || (e = h({
				src: e,
				async: !0,
				type: "module"
			}, t), (t = mf.get(i)) && zf(e, t), a = n.createElement("script"), Tt(a), Pd(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function kf(e, t, n, r) {
		var a = (a = ge.current) ? gf(a) : null;
		if (!a) throw Error(i(446));
		switch (e) {
			case "meta":
			case "title": return null;
			case "style": return typeof n.precedence == "string" && typeof n.href == "string" ? (t = Af(n.href), n = wt(a).hoistableStyles, r = n.get(t), r || (r = {
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
					var o = wt(a).hoistableStyles, s = o.get(e);
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
			case "script": return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = Pf(n), n = wt(a).hoistableScripts, r = n.get(t), r || (r = {
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
		return "href=\"" + Wt(e) + "\"";
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
		}), Pd(t, "link", n), Tt(t), e.head.appendChild(t));
	}
	function Pf(e) {
		return "[src=\"" + Wt(e) + "\"]";
	}
	function Ff(e) {
		return "script[async]" + e;
	}
	function If(e, t, n) {
		if (t.count++, t.instance === null) switch (t.type) {
			case "style":
				var r = e.querySelector("style[data-href~=\"" + Wt(n.href) + "\"]");
				if (r) return t.instance = r, Tt(r), r;
				var a = h({}, n, {
					"data-href": n.href,
					"data-precedence": n.precedence,
					href: null,
					precedence: null
				});
				return r = (e.ownerDocument || e).createElement("style"), Tt(r), Pd(r, "style", a), Lf(r, n.precedence, e), t.instance = r;
			case "stylesheet":
				a = Af(n.href);
				var o = e.querySelector(jf(a));
				if (o) return t.state.loading |= 4, t.instance = o, Tt(o), o;
				r = Mf(n), (a = mf.get(a)) && Rf(r, a), o = (e.ownerDocument || e).createElement("link"), Tt(o);
				var s = o;
				return s._p = new Promise(function(e, t) {
					s.onload = e, s.onerror = t;
				}), Pd(o, "link", r), t.state.loading |= 4, Lf(o, n.precedence, e), t.instance = o;
			case "script": return o = Pf(n.src), (a = e.querySelector(Ff(o))) ? (t.instance = a, Tt(a), a) : (r = n, (a = mf.get(o)) && (r = h({}, n), zf(r, a)), e = e.ownerDocument || e, a = e.createElement("script"), Tt(a), Pd(a, "link", r), e.head.appendChild(a), t.instance = a);
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
			if (!(a[M] || a[j] || e === "link" && a.getAttribute("rel") === "stylesheet") && a.namespaceURI !== "http://www.w3.org/2000/svg") {
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
					t = a._p, typeof t == "object" && t && typeof t.then == "function" && (e.count++, e = Jf.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = a, Tt(a);
					return;
				}
				a = t.ownerDocument || t, r = Mf(r), (i = mf.get(i)) && Rf(r, i), a = a.createElement("link"), Tt(a);
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
		_currentValue: le,
		_currentValue2: le,
		_threadCount: 0
	};
	function $f(e, t, n, r, i, a, o, s, c) {
		this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = rt(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = rt(0), this.hiddenUpdates = rt(null), this.identifierPrefix = r, this.onUncaughtError = i, this.onCaughtError = a, this.onRecoverableError = o, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.incompleteTransitions = /* @__PURE__ */ new Map();
	}
	function ep(e, t, n, r, i, a, o, s, c, l, u, d) {
		return e = new $f(e, t, n, o, c, l, u, d, s), t = 1, !0 === a && (t |= 24), a = ui(3, null, null, t), e.current = a, a.stateNode = e, t = ca(), t.refCount++, e.pooledCache = t, t.refCount++, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: t
		}, Va(a), e;
	}
	function tp(e) {
		return e ? (e = ci, e) : ci;
	}
	function np(e, t, n, r, i, a) {
		i = tp(i), r.context === null ? r.context = i : r.pendingContext = i, r = Ua(t), r.payload = { element: n }, a = a === void 0 ? null : a, a !== null && (r.callback = a), n = Wa(e, r, t), n !== null && (hu(n, e, t), Ga(n, e, t));
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
			var t = ai(e, 67108864);
			t !== null && hu(t, e, 67108864), ip(e, 67108864);
		}
	}
	function op(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = pu();
			t = lt(t);
			var n = ai(e, t);
			n !== null && hu(n, e, t), ip(e, t);
		}
	}
	var sp = !0;
	function cp(e, t, n, r) {
		var i = D.T;
		D.T = null;
		var a = O.p;
		try {
			O.p = 2, up(e, t, n, r);
		} finally {
			O.p = a, D.T = i;
		}
	}
	function lp(e, t, n, r) {
		var i = D.T;
		D.T = null;
		var a = O.p;
		try {
			O.p = 8, up(e, t, n, r);
		} finally {
			O.p = a, D.T = i;
		}
	}
	function up(e, t, n, r) {
		if (sp) {
			var i = dp(r);
			if (i === null) wd(e, t, r, fp, n), Cp(e, r);
			else if (Tp(i, e, t, n, r)) r.stopPropagation();
			else if (Cp(e, r), t & 4 && -1 < Sp.indexOf(e)) {
				for (; i !== null;) {
					var a = St(i);
					if (a !== null) switch (a.tag) {
						case 3:
							if (a = a.stateNode, a.current.memoizedState.isDehydrated) {
								var o = Qe(a.pendingLanes);
								if (o !== 0) {
									var s = a;
									for (s.pendingLanes |= 2, s.entangledLanes |= 2; o;) {
										var c = 1 << 31 - Ge(o);
										s.entanglements[1] |= c, o &= ~c;
									}
									rd(a), !(G & 6) && (tu = Ne() + 500, id(0, !1));
								}
							}
							break;
						case 31:
						case 13: s = ai(a, 2), s !== null && hu(s, a, 2), bu(), ip(a, 2);
					}
					if (a = dp(r), a === null && wd(e, t, r, fp, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else wd(e, t, r, null, n);
		}
	}
	function dp(e) {
		return e = sn(e), pp(e);
	}
	var fp = null;
	function pp(e) {
		if (fp = null, e = xt(e), e !== null) {
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
			case "message": switch (Pe()) {
				case Fe: return 2;
				case Ie: return 8;
				case Le:
				case Re: return 32;
				case ze: return 268435456;
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
		}, t !== null && (t = St(t), t !== null && ap(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
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
		var t = xt(e.target);
		if (t !== null) {
			var n = o(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = s(n), t !== null) {
						e.blockedOn = t, ft(e.priority, function() {
							op(n);
						});
						return;
					}
				} else if (t === 31) {
					if (t = c(n), t !== null) {
						e.blockedOn = t, ft(e.priority, function() {
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
				on = r, n.target.dispatchEvent(r), on = null;
			} else return t = St(n), t !== null && ap(t), e.blockedOn = n, !1;
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
				var a = St(n);
				a !== null && (e.splice(t, 3), t -= 3, Ts(a, {
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
			var t = dt();
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
	O.findDOMNode = function(e) {
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(i(188)) : (e = Object.keys(e).join(","), Error(i(268, e)));
		return e = d(t), e = e === null ? null : p(e), e = e === null ? null : e.stateNode, e;
	};
	var Rp = {
		bundleType: 0,
		version: "19.2.8",
		rendererPackageName: "react-dom",
		currentDispatcherRef: D,
		reconcilerVersion: "19.2.8"
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var zp = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!zp.isDisabled && zp.supportsFiber) try {
			He = zp.inject(Rp), Ue = zp;
		} catch {}
	}
	e.createRoot = function(e, t) {
		if (!a(e)) throw Error(i(299));
		var n = !1, r = "", o = Js, s = Ys, c = Xs;
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
var ee = {
	root: "_root_eq2ep_1",
	elevated: "_elevated_eq2ep_7",
	none: "_none_eq2ep_8",
	small: "_small_eq2ep_9",
	medium: "_medium_eq2ep_10",
	large: "_large_eq2ep_11"
};
//#endregion
//#region src/shared/ui/Card/Card.tsx
function te({ as: e = "article", children: t, className: n, elevated: r = !1, padding: i = "medium", ...a }) {
	return /* @__PURE__ */ (0, b.jsx)(e, {
		className: [
			ee.root,
			ee[i],
			r ? ee.elevated : void 0,
			n
		].filter(Boolean).join(" "),
		...a,
		children: t
	});
}
//#endregion
//#region src/shared/ui/overlays/useModalOverlay.ts
var E = m(), ne = [
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
function re(e) {
	return Array.from(e.querySelectorAll(ne)).filter((e) => e.getAttribute("aria-hidden") !== "true");
}
function ie({ open: e, onOpenChange: t, panelRef: n, initialFocusRef: r }) {
	let i = (0, _.useRef)(null), a = (0, _.useRef)(t);
	(0, _.useEffect)(() => {
		a.current = t;
	}, [t]), (0, _.useEffect)(() => {
		if (!e) return;
		i.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		let t = n.current;
		(r?.current ?? (t ? re(t)[0] : null) ?? t)?.focus();
		let o = (e) => {
			if (e.key === "Escape") {
				e.preventDefault(), a.current(!1);
				return;
			}
			if (e.key !== "Tab" || !n.current) return;
			let t = re(n.current);
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
var ae = {
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
function oe({ open: e, onOpenChange: t, title: n, description: r, children: i, initialFocusRef: a, closeOnBackdrop: o = !0, placement: s = "end", className: c }) {
	let l = (0, _.useRef)(null), u = (0, _.useId)(), d = (0, _.useId)();
	return ie({
		open: e,
		onOpenChange: t,
		panelRef: l,
		initialFocusRef: a
	}), !e || typeof document > "u" ? null : (0, E.createPortal)(/* @__PURE__ */ (0, b.jsx)("div", {
		className: `${ae.backdrop} ${ae[s]}`,
		onMouseDown: (e) => {
			o && e.target === e.currentTarget && t(!1);
		},
		children: /* @__PURE__ */ (0, b.jsxs)("aside", {
			"aria-describedby": r === void 0 ? void 0 : d,
			"aria-labelledby": u,
			"aria-modal": "true",
			className: [ae.panel, c].filter(Boolean).join(" "),
			ref: l,
			role: "dialog",
			tabIndex: -1,
			children: [
				/* @__PURE__ */ (0, b.jsx)("h2", {
					className: ae.title,
					id: u,
					children: n
				}),
				r === void 0 ? null : /* @__PURE__ */ (0, b.jsx)("p", {
					className: ae.description,
					id: d,
					children: r
				}),
				/* @__PURE__ */ (0, b.jsx)("div", {
					className: ae.content,
					children: i
				})
			]
		})
	}), document.body);
}
var se = {
	root: "_root_1ankv_1",
	icon: "_icon_1ankv_2",
	title: "_title_1ankv_3",
	description: "_description_1ankv_4",
	action: "_action_1ankv_5"
};
//#endregion
//#region src/shared/ui/EmptyState/EmptyState.tsx
function ce({ action: e, className: t, description: n, icon: r, title: i, ...a }) {
	let o = (0, _.useId)(), s = (0, _.useId)();
	return /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-describedby": n ? s : void 0,
		"aria-labelledby": o,
		className: [se.root, t].filter(Boolean).join(" "),
		...a,
		children: [
			r ? /* @__PURE__ */ (0, b.jsx)("span", {
				"aria-hidden": "true",
				className: se.icon,
				children: r
			}) : null,
			/* @__PURE__ */ (0, b.jsx)("h2", {
				className: se.title,
				id: o,
				children: i
			}),
			n ? /* @__PURE__ */ (0, b.jsx)("p", {
				className: se.description,
				id: s,
				children: n
			}) : null,
			e ? /* @__PURE__ */ (0, b.jsx)("div", {
				className: se.action,
				children: e
			}) : null
		]
	});
}
var D = {
	root: "_root_1byqi_1",
	icon: "_icon_1byqi_2",
	title: "_title_1byqi_3",
	description: "_description_1byqi_4",
	action: "_action_1byqi_5"
};
//#endregion
//#region src/shared/ui/ErrorState/ErrorState.tsx
function O({ action: e, className: t, description: n, icon: r, title: i, ...a }) {
	let o = (0, _.useId)(), s = (0, _.useId)();
	return /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-describedby": n ? s : void 0,
		"aria-labelledby": o,
		className: [D.root, t].filter(Boolean).join(" "),
		role: "alert",
		...a,
		children: [
			r ? /* @__PURE__ */ (0, b.jsx)("span", {
				"aria-hidden": "true",
				className: D.icon,
				children: r
			}) : null,
			/* @__PURE__ */ (0, b.jsx)("h2", {
				className: D.title,
				id: o,
				children: i
			}),
			n ? /* @__PURE__ */ (0, b.jsx)("p", {
				className: D.description,
				id: s,
				children: n
			}) : null,
			e ? /* @__PURE__ */ (0, b.jsx)("div", {
				className: D.action,
				children: e
			}) : null
		]
	});
}
var le = {
	root: "_root_wgcw9_1",
	media: "_media_wgcw9_2",
	caption: "_caption_wgcw9_5"
};
//#endregion
//#region src/shared/ui/MediaFrame/MediaFrame.tsx
function ue({ aspectRatio: e = "16 / 9", caption: t, children: n, className: r, fit: i = "cover", style: a, ...o }) {
	return /* @__PURE__ */ (0, b.jsxs)("figure", {
		className: [le.root, r].filter(Boolean).join(" "),
		style: {
			...a,
			"--media-frame-ratio": e
		},
		...o,
		children: [/* @__PURE__ */ (0, b.jsx)("div", {
			className: le.media,
			"data-fit": i,
			children: n
		}), t ? /* @__PURE__ */ (0, b.jsx)("figcaption", {
			className: le.caption,
			children: t
		}) : null]
	});
}
var de = {
	root: "_root_133n8_1",
	labelRow: "_labelRow_133n8_2",
	track: "_track_133n8_3"
};
//#endregion
//#region src/shared/ui/Progress/Progress.tsx
function fe({ className: e, formatValue: t = (e, t) => `${Math.round(e / t * 100)}%`, label: n, max: r = 100, showValue: i = !1, value: a, ...o }) {
	let s = r > 0 ? r : 100, c = a === void 0 ? void 0 : Math.min(Math.max(a, 0), s);
	return /* @__PURE__ */ (0, b.jsxs)("div", {
		className: [de.root, e].filter(Boolean).join(" "),
		children: [/* @__PURE__ */ (0, b.jsxs)("div", {
			className: de.labelRow,
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
			className: de.track,
			max: s,
			value: c,
			...o
		})]
	});
}
var pe = {
	root: "_root_49jfz_1",
	pulse: "_pulse_49jfz_1",
	small: "_small_49jfz_7",
	medium: "_medium_49jfz_8",
	round: "_round_49jfz_9"
};
//#endregion
//#region src/shared/ui/Skeleton/Skeleton.tsx
function k({ className: e, height: t, radius: n = "medium", style: r, width: i, ...a }) {
	return /* @__PURE__ */ (0, b.jsx)("span", {
		"aria-hidden": "true",
		className: [
			pe.root,
			pe[n],
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
var me = {
	root: "_root_yg302_1",
	list: "_list_yg302_5",
	tab: "_tab_yg302_15",
	panel: "_panel_yg302_37"
};
//#endregion
//#region src/shared/ui/tabs/Tabs.tsx
function he({ items: e, value: t, onValueChange: n, ariaLabel: r, orientation: i = "horizontal", className: a }) {
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
		className: `${me.root}${a ? ` ${a}` : ""}`,
		children: [/* @__PURE__ */ (0, b.jsx)("div", {
			"aria-label": r,
			"aria-orientation": i,
			className: me.list,
			role: "tablist",
			children: e.map((e) => {
				let n = e.id === t, r = `${o}-tab-${e.id}`, i = `${o}-panel-${e.id}`;
				return /* @__PURE__ */ (0, b.jsx)("button", {
					"aria-controls": i,
					"aria-selected": n,
					className: me.tab,
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
				className: me.panel,
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
function ge(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function _e(e, t, n) {
	if (ge(e)) {
		if (typeof e.detail == "string" && e.detail.trim()) return e.detail;
		if (typeof e.message == "string" && e.message.trim()) return e.message;
	}
	return typeof e == "string" && e.trim() ? e : n?.trim() || `La requête a échoué (${t})`;
}
var ve = class extends Error {
	status;
	detail;
	code;
	validation;
	data;
	constructor(e) {
		let t = _e(e.data, e.status, e.statusText);
		super(t, e.cause === void 0 ? void 0 : { cause: e.cause }), this.name = "ApiError", this.status = e.status, this.detail = t, this.data = e.data, ge(e.data) && (this.code = typeof e.data.code == "string" ? e.data.code : void 0, this.validation = e.data.validation ?? e.data.errors ?? (Array.isArray(e.data.detail) ? e.data.detail : void 0));
	}
};
//#endregion
//#region src/shared/api/orvalFetch.ts
async function ye(e) {
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
async function A(e, t) {
	let n = await fetch(e, t), r = await ye(n);
	if (!n.ok) throw new ve({
		status: n.status,
		statusText: n.statusText,
		data: r
	});
	return r;
}
//#endregion
//#region src/generated/openapi.ts
var be = () => "/api/episodes", xe = async (e) => A(be(), {
	...e,
	method: "GET"
}), Se = () => "/api/episodes", Ce = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(Se(), {
		...t,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, we = () => "/api/guided", Te = async (e) => A(we(), {
	...e,
	method: "GET"
}), Ee = () => "/api/guided/brief", De = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(Ee(), {
		...t,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Oe = () => "/api/guided/characters", ke = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(Oe(), {
		...t,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Ae = () => "/api/guided/episode-link", je = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(Ae(), {
		...t,
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Me = () => "/api/guided/proposals", Ne = async (e, t) => {
	let n = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(Me(), {
		...t,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...n(t?.headers)
		},
		body: JSON.stringify(e)
	});
}, Pe = (e) => `/api/guided/proposals/${e}/accept`, Fe = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(Pe(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, Ie = (e) => `/api/guided/proposals/${e}/reject`, Le = async (e, t) => A(Ie(e), {
	...t,
	method: "POST"
}), Re = () => "/api/projects", ze = async (e) => A(Re(), {
	...e,
	method: "GET"
}), Be = (e) => {
	let t = new URLSearchParams();
	Object.entries(e || {}).forEach(([e, n]) => {
		n !== void 0 && t.append(e, n === null ? "null" : String(n));
	});
	let n = t.toString();
	return n.length > 0 ? `/api/runtime-packs/current?${n}` : "/api/runtime-packs/current";
}, Ve = async (e, t) => A(Be(e), {
	...t,
	method: "GET"
}), He = (e) => {
	let t = new URLSearchParams();
	Object.entries(e || {}).forEach(([e, n]) => {
		n !== void 0 && t.append(e, n === null ? "null" : String(n));
	});
	let n = t.toString();
	return n.length > 0 ? `/api/runtime-packs/jobs/latest?${n}` : "/api/runtime-packs/jobs/latest";
}, Ue = async (e, t) => A(He(e), {
	...t,
	method: "GET"
}), We = (e) => `/api/runtime-packs/jobs/${e}`, Ge = async (e, t) => A(We(e), {
	...t,
	method: "GET"
}), Ke = (e) => `/api/runtime-packs/jobs/${e}/cancel`, qe = async (e, t) => A(Ke(e), {
	...t,
	method: "POST"
}), Je = (e) => `/api/runtime-packs/jobs/${e}/logs`, Ye = async (e, t) => A(Je(e), {
	...t,
	method: "GET"
}), Xe = (e) => `/api/runtime-packs/jobs/${e}/pause`, Ze = async (e, t) => A(Xe(e), {
	...t,
	method: "POST"
}), Qe = (e) => `/api/runtime-packs/jobs/${e}/repair`, $e = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(Qe(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, et = (e) => `/api/runtime-packs/jobs/${e}/resume`, tt = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(et(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, nt = (e) => `/api/runtime-packs/${e}/jobs`, rt = async (e, t, n) => {
	let r = (e) => {
		if (!e) return {};
		if (e instanceof Headers) return Object.fromEntries(e.entries());
		if (Symbol.iterator in e) return Object.fromEntries(Array.from(e, (e) => Array.from(e)));
		let t = {};
		for (let [n, r] of Object.entries(e)) r !== void 0 && (t[n] = r);
		return t;
	};
	return A(nt(e), {
		...n,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...r(n?.headers)
		},
		body: JSON.stringify(t)
	});
}, it = () => "/api/runtime/services", at = async (e) => A(it(), {
	...e,
	method: "GET"
}), ot = () => "/api/studio/journey", st = async (e) => A(ot(), {
	...e,
	method: "GET"
}), ct = () => "/health", lt = async (e) => A(ct(), {
	...e,
	method: "GET"
}), ut = _.createContext(void 0), dt = (e) => {
	let t = _.useContext(ut);
	if (e) return e;
	if (!t) throw Error("No QueryClient set, use QueryClientProvider to set one");
	return t;
}, ft = ({ client: e, children: t }) => (_.useEffect(() => (e.mount(), () => {
	e.unmount();
}), [e]), /* @__PURE__ */ (0, b.jsx)(ut.Provider, {
	value: e,
	children: t
})), pt = {
	setTimeout: (e, t) => setTimeout(e, t),
	clearTimeout: (e) => clearTimeout(e),
	setInterval: (e, t) => setInterval(e, t),
	clearInterval: (e) => clearInterval(e)
}, j = new class {
	#e = pt;
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
function mt(e) {
	setTimeout(e, 0);
}
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/utils.js
var ht = typeof window > "u" || "Deno" in globalThis;
function gt() {}
function _t(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function vt(e) {
	return typeof e == "number" && e >= 0 && e !== Infinity;
}
function yt(e, t) {
	return Math.max(e + (t || 0) - Date.now(), 0);
}
function M(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function bt(e, t) {
	let { type: n = "all", exact: r, fetchStatus: i, predicate: a, queryKey: o, stale: s } = e;
	if (o) {
		if (r) {
			if (t.queryHash !== St(o, t.options)) return !1;
		} else if (!wt(t.queryKey, o)) return !1;
	}
	if (n !== "all") {
		let e = t.isActive();
		if (n === "active" && !e || n === "inactive" && e) return !1;
	}
	return !(typeof s == "boolean" && t.isStale() !== s || i && i !== t.state.fetchStatus || a && !a(t));
}
function xt(e, t) {
	let { exact: n, status: r, predicate: i, mutationKey: a } = e;
	if (a) {
		if (!t.options.mutationKey) return !1;
		if (n) {
			if (Ct(t.options.mutationKey) !== Ct(a)) return !1;
		} else if (!wt(t.options.mutationKey, a)) return !1;
	}
	return !(r && t.state.status !== r || i && !i(t));
}
function St(e, t) {
	return (t?.queryKeyHashFn || Ct)(e);
}
function Ct(e) {
	return JSON.stringify(e, (e, t) => kt(t) ? Object.keys(t).sort().reduce((e, n) => (e[n] = t[n], e), {}) : t);
}
function wt(e, t) {
	if (e === t) return !0;
	if (typeof e != typeof t) return !1;
	if (e && t && typeof e == "object" && typeof t == "object") {
		if (Array.isArray(e) && Array.isArray(t)) {
			for (let n = 0; n < t.length; n++) if (!wt(e[n], t[n])) return !1;
			return !0;
		}
		let n = Object.keys(t);
		for (let r of n) if (!wt(e[r], t[r])) return !1;
		return !0;
	}
	return !1;
}
var Tt = Object.prototype.hasOwnProperty;
function Et(e, t, n = 0) {
	if (e === t) return e;
	if (n > 500) return t;
	let r = Ot(e) && Ot(t);
	if (!r && !(kt(e) && kt(t))) return t;
	let i = (r ? e : Object.keys(e)).length, a = r ? t : Object.keys(t), o = a.length, s = r ? Array(o) : {}, c = 0;
	for (let l = 0; l < o; l++) {
		let o = r ? l : a[l], u = e[o], d = t[o];
		if (u === d) {
			s[o] = u, (r ? l < i : Tt.call(e, o)) && c++;
			continue;
		}
		if (u === null || d === null || typeof u != "object" || typeof d != "object") {
			s[o] = d;
			continue;
		}
		let f = Et(u, d, n + 1);
		s[o] = f, f === u && c++;
	}
	return i === o && c === i ? e : s;
}
function Dt(e, t) {
	if (!t || Object.keys(e).length !== Object.keys(t).length) return !1;
	for (let n in e) if (e[n] !== t[n]) return !1;
	return !0;
}
function Ot(e) {
	return Array.isArray(e) && e.length === Object.keys(e).length;
}
function kt(e) {
	if (!At(e)) return !1;
	let t = e.constructor;
	if (t === void 0) return !0;
	let n = t.prototype;
	return !(!At(n) || !n.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(e) !== Object.prototype);
}
function At(e) {
	return Object.prototype.toString.call(e) === "[object Object]";
}
function jt(e) {
	return new Promise((t) => {
		j.setTimeout(t, e);
	});
}
function Mt(e, t, n) {
	return typeof n.structuralSharing == "function" ? n.structuralSharing(e, t) : n.structuralSharing === !1 ? t : Et(e, t);
}
function Nt(e, t, n = 0) {
	let r = [...e, t];
	return n && r.length > n ? r.slice(1) : r;
}
function Pt(e, t, n = 0) {
	let r = [t, ...e];
	return n && r.length > n ? r.slice(0, -1) : r;
}
var Ft = Symbol();
function It(e, t) {
	return !e.queryFn && t?.initialPromise ? () => t.initialPromise : !e.queryFn || e.queryFn === Ft ? () => Promise.reject(/* @__PURE__ */ Error(`Missing queryFn: '${e.queryHash}'`)) : e.queryFn;
}
function Lt(e, t) {
	return typeof e == "function" ? e(...t) : !!e;
}
function Rt(e, t, n) {
	let r = !1, i;
	return Object.defineProperty(e, "signal", {
		enumerable: !0,
		get: () => (i ??= t(), r ? i : (r = !0, i.aborted ? n() : i.addEventListener("abort", n, { once: !0 }), i))
	}), e;
}
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/environmentManager.js
var zt = () => ht, Bt = () => zt(), Vt = class {
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
}, Ht = new class extends Vt {
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
}(), Ut = mt;
function Wt() {
	let e = [], t = 0, n = (e) => {
		e();
	}, r = (e) => {
		e();
	}, i = Ut, a = (r) => {
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
var N = Wt(), Gt = new class extends Vt {
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
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/retryer.js
function Kt(e) {
	return Math.min(1e3 * 2 ** e, 3e4);
}
function qt(e) {
	return (e ?? "online") !== "online" || Gt.isOnline();
}
var Jt = class extends Error {
	constructor(e) {
		super("CancelledError"), this.revert = e?.revert, this.silent = e?.silent;
	}
};
function Yt(e) {
	let t = !1, n = 0, r, i = "pending", a, o, s = new Promise((e, t) => {
		a = e, o = t;
	});
	s.catch(gt);
	let c = () => i !== "pending", l = (t) => {
		if (!c()) {
			let n = new Jt(t);
			h(n), e.onCancel?.(n);
		}
	}, u = () => {
		t = !0;
	}, d = () => {
		t = !1;
	}, f = () => Ht.isFocused() && (e.networkMode === "always" || Gt.isOnline()) && e.canRun(), p = () => qt(e.networkMode) && e.canRun(), m = (e) => {
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
			let i = e.retry ?? (Bt() ? 0 : 3), a = e.retryDelay ?? Kt, o = typeof a == "function" ? a(n, r) : a, s = i === !0 || typeof i == "number" && n < i || typeof i == "function" && i(n, r);
			if (t || !s) {
				h(r);
				return;
			}
			n++, e.onFail?.(n, r), jt(o).then(() => f() ? void 0 : g()).then(() => {
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
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/removable.js
var Xt = class {
	#e;
	destroy() {
		this.clearGcTimeout();
	}
	scheduleGc() {
		this.clearGcTimeout(), vt(this.gcTime) && (this.#e = j.setTimeout(() => {
			this.optionalRemove();
		}, this.gcTime));
	}
	updateGcTime(e) {
		this.gcTime = Math.max(this.gcTime || 0, e ?? (Bt() ? Infinity : 3e5));
	}
	clearGcTimeout() {
		this.#e !== void 0 && (j.clearTimeout(this.#e), this.#e = void 0);
	}
};
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/infiniteQueryBehavior.js
function Zt(e) {
	return { onFetch: (t, n) => {
		let r = t.options, i = t.fetchOptions?.meta?.fetchMore?.direction, a = t.state.data?.pages || [], o = t.state.data?.pageParams || [], s = {
			pages: [],
			pageParams: []
		}, c = 0, l = async () => {
			let n = !1, l = (e) => {
				Rt(e, () => t.signal, () => n = !0);
			}, u = It(t.options, t.fetchOptions), d = async (e, r, i) => {
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
				})(), o = await u(a), { maxPages: s } = t.options, c = i ? Pt : Nt;
				return {
					pages: c(e.pages, o, s),
					pageParams: c(e.pageParams, r, s)
				};
			};
			if (i && a.length) {
				let e = i === "backward", t = e ? $t : Qt, n = {
					pages: a,
					pageParams: o
				};
				s = await d(n, t(r, n), e);
			} else {
				let t = e ?? a.length;
				do {
					let e = c === 0 ? o[0] ?? r.initialPageParam : Qt(r, s);
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
function Qt(e, { pages: t, pageParams: n }) {
	let r = t.length - 1;
	return t.length > 0 ? e.getNextPageParam(t[r], t, n[r], n) : void 0;
}
function $t(e, { pages: t, pageParams: n }) {
	return t.length > 0 ? e.getPreviousPageParam?.(t[0], t, n[0], n) : void 0;
}
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/query.js
var en = class extends Xt {
	#e;
	#t;
	#n;
	#r;
	#i;
	#a;
	#o;
	#s;
	constructor(e) {
		super(), this.#s = !1, this.#o = e.defaultOptions, this.setOptions(e.options), this.observers = [], this.#i = e.client, this.#r = this.#i.getQueryCache(), this.queryKey = e.queryKey, this.queryHash = e.queryHash, this.#t = rn(this.options), this.state = e.state ?? this.#t, this.scheduleGc();
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
			let e = rn(this.options);
			e.data !== void 0 && (this.setState(nn(e.data, e.dataUpdatedAt)), this.#t = e);
		}
	}
	optionalRemove() {
		!this.observers.length && this.state.fetchStatus === "idle" && this.#r.remove(this);
	}
	setData(e, t) {
		let n = Mt(this.state.data, e, this.options);
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
		return this.#a?.cancel(e), t ? t.then(gt).catch(gt) : Promise.resolve();
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
		return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === Ft || !this.isFetched();
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
		return this.state.data === void 0 ? !0 : e === "static" ? !1 : this.state.isInvalidated ? !0 : !yt(this.state.dataUpdatedAt, e);
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
			let e = It(this.options, t), n = (() => {
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
		(this.#e === "infinite" ? Zt(this.options.pages) : this.options.behavior)?.onFetch(a, this), this.#n = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#c({
			type: "fetch",
			meta: a.fetchOptions?.meta
		});
		let o = this.#a = Yt({
			initialPromise: t?.initialPromise,
			fn: a.fetchFn,
			onCancel: (e) => {
				e instanceof Jt && e.revert && this.setState({
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
			if (e instanceof Jt) {
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
					...tn(t.data, this.options),
					fetchMeta: e.meta ?? null
				};
				case "success":
					let n = {
						...t,
						...nn(e.data, e.dataUpdatedAt),
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
function tn(e, t) {
	return {
		fetchFailureCount: 0,
		fetchFailureReason: null,
		fetchStatus: qt(t.networkMode) ? "fetching" : "paused",
		...e === void 0 && {
			error: null,
			status: "pending"
		}
	};
}
function nn(e, t) {
	return {
		data: e,
		dataUpdatedAt: t ?? Date.now(),
		error: null,
		isInvalidated: !1,
		status: "success"
	};
}
function rn(e) {
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
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/queryObserver.js
var an = class extends Vt {
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
		this.listeners.size === 1 && (this.#t.addObserver(this), sn(this.#t, this.options) ? this.#m() : this.updateResult(), this.#y());
	}
	onUnsubscribe() {
		this.hasListeners() || this.destroy();
	}
	shouldFetchOnReconnect() {
		return cn(this.#t, this.options, this.options.refetchOnReconnect);
	}
	shouldFetchOnWindowFocus() {
		return cn(this.#t, this.options, this.options.refetchOnWindowFocus);
	}
	destroy() {
		this.listeners = /* @__PURE__ */ new Set(), this.#b(), this.#x(), this.#t.removeObserver(this);
	}
	setOptions(e) {
		let t = this.options, n = this.#t;
		if (this.options = this.#e.defaultQueryOptions(e), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof M(this.options.enabled, this.#t) != "boolean") throw Error("Expected enabled to be a boolean or a callback that returns a boolean");
		this.#S(), this.#t.setOptions(this.options), t._defaulted && !Dt(this.options, t) && this.#e.getQueryCache().notify({
			type: "observerOptionsUpdated",
			query: this.#t,
			observer: this
		});
		let r = this.hasListeners();
		r && ln(this.#t, n, this.options, t) && this.#m(), this.updateResult(), r && (this.#t !== n || M(this.options.enabled, this.#t) !== M(t.enabled, this.#t) || M(this.options.staleTime, this.#t) !== M(t.staleTime, this.#t)) && this.#g();
		let i = this.#_();
		r && (this.#t !== n || M(this.options.enabled, this.#t) !== M(t.enabled, this.#t) || i !== this.#f) && this.#v(i);
	}
	getOptimisticResult(e) {
		let t = this.#e.getQueryCache().build(this.#e, e), n = this.createResult(t, e);
		return Dt(this.getCurrentResult(), n) || (this.#r = n, this.#a = this.options, this.#i = this.#t.state), n;
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
		return e?.throwOnError || (t = t.catch(gt)), t;
	}
	#h(e) {
		return !Bt() && M(this.options.enabled, this.#t) !== !1 && vt(e);
	}
	#g() {
		this.#b();
		let e = M(this.options.staleTime, this.#t);
		if (this.#r.isStale || !this.#h(e)) return;
		let t = yt(this.#r.dataUpdatedAt, e) + 1;
		this.#u = j.setTimeout(() => {
			this.#r.isStale || this.updateResult();
		}, t);
	}
	#_() {
		return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
	}
	#v(e) {
		this.#x(), this.#f = e, this.#f !== 0 && this.#h(this.#f) && (this.#d = j.setInterval(() => {
			(this.options.refetchIntervalInBackground || Ht.isFocused()) && this.#m();
		}, this.#f));
	}
	#y() {
		this.#g(), this.#v(this.#_());
	}
	#b() {
		this.#u !== void 0 && (j.clearTimeout(this.#u), this.#u = void 0);
	}
	#x() {
		this.#d !== void 0 && (j.clearInterval(this.#d), this.#d = void 0);
	}
	createResult(e, t) {
		let n = this.#t, r = this.options, i = this.#r, a = this.#i, o = this.#a, s = e === n ? this.#n : e.state, { state: c } = e, l = { ...c }, u = !1, d;
		if (t._optimisticResults) {
			let i = this.hasListeners(), a = !i && sn(e, t), o = i && ln(e, n, t, r);
			(a || o) && (l = {
				...l,
				...tn(c.data, e.options)
			}), t._optimisticResults === "isRestoring" && (l.fetchStatus = "idle");
		}
		let { error: f, errorUpdatedAt: p, status: m } = l;
		d = l.data;
		let h = !1;
		if (t.placeholderData !== void 0 && d === void 0 && m === "pending") {
			let e;
			i?.isPlaceholderData && t.placeholderData === o?.placeholderData ? (e = i.data, h = !0) : e = typeof t.placeholderData == "function" ? t.placeholderData(this.#l?.state.data, this.#l) : t.placeholderData, e !== void 0 && (m = "success", d = Mt(i?.data, e, t), u = !0);
		}
		if (t.select && d !== void 0 && !h) {
			if (i && d === a?.data && t.select === this.#s) d = this.#c;
			else try {
				this.#s = t.select, d = t.select(d), d = Mt(i?.data, d, t), this.#c = d, this.#o = null;
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
			isStale: un(e, t),
			refetch: this.refetch,
			isEnabled: M(t.enabled, e) !== !1
		};
	}
	updateResult() {
		let e = this.#r, t = this.createResult(this.#t, this.options);
		if (this.#i = this.#t.state, this.#a = this.options, this.#i.data !== void 0 && (this.#l = this.#t), Dt(t, e)) return;
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
function on(e, t) {
	return M(t.enabled, e) !== !1 && e.state.data === void 0 && (e.state.status !== "error" || M(t.retryOnMount, e) !== !1);
}
function sn(e, t) {
	return on(e, t) || e.state.data !== void 0 && cn(e, t, t.refetchOnMount);
}
function cn(e, t, n) {
	if (M(t.enabled, e) !== !1 && M(t.staleTime, e) !== "static") {
		let r = typeof n == "function" ? n(e) : n;
		return r === "always" || r !== !1 && un(e, t);
	}
	return !1;
}
function ln(e, t, n, r) {
	return (e !== t || M(r.enabled, e) === !1) && (!n.suspense || e.state.status !== "error") && un(e, n);
}
function un(e, t) {
	return M(t.enabled, e) !== !1 && e.isStaleByTime(M(t.staleTime, e));
}
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/mutation.js
var dn = class extends Xt {
	#e;
	#t;
	#n;
	#r;
	constructor(e) {
		super(), this.#e = e.client, this.mutationId = e.mutationId, this.#n = e.mutationCache, this.#t = [], this.state = e.state || fn(), this.setOptions(e.options), this.scheduleGc();
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
		}, r = this.#r = Yt({
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
function fn() {
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
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/mutationCache.js
var pn = class extends Vt {
	#e;
	#t;
	#n;
	constructor(e = {}) {
		super(), this.config = e, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#n = 0;
	}
	build(e, t, n) {
		let r = new dn({
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
		let t = mn(e);
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
			let t = mn(e);
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
		let t = mn(e);
		if (typeof t == "string") {
			let n = this.#t.get(t)?.find((e) => e.state.status === "pending");
			return !n || n === e;
		}
		return !0;
	}
	runNext(e) {
		let t = mn(e);
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
		return this.getAll().find((e) => xt(t, e));
	}
	findAll(e = {}) {
		return this.getAll().filter((t) => xt(e, t));
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
		return N.batch(() => Promise.all(e.map((e) => e.continue().catch(gt))));
	}
};
function mn(e) {
	return e.options.scope?.id;
}
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/query-core/build/modern/mutationObserver.js
var hn = class extends Vt {
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
		this.options = this.#e.defaultMutationOptions(e), Dt(this.options, t) || this.#e.getMutationCache().notify({
			type: "observerOptionsUpdated",
			mutation: this.#n,
			observer: this
		}), t?.mutationKey && this.options.mutationKey && Ct(t.mutationKey) !== Ct(this.options.mutationKey) ? this.reset() : this.#n?.state.status === "pending" && this.#n.setOptions(this.options);
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
		let e = this.#n?.state ?? fn();
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
}, gn = class extends Vt {
	#e;
	constructor(e = {}) {
		super(), this.config = e, this.#e = /* @__PURE__ */ new Map();
	}
	build(e, t, n) {
		let r = t.queryKey, i = t.queryHash ?? St(r, t), a = this.get(i);
		return a || (a = new en({
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
		return this.getAll().find((e) => bt(t, e));
	}
	findAll(e = {}) {
		let t = this.getAll();
		return Object.keys(e).length > 0 ? t.filter((t) => bt(e, t)) : t;
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
}, _n = class {
	#e;
	#t;
	#n;
	#r;
	#i;
	#a;
	#o;
	#s;
	constructor(e = {}) {
		this.#e = e.queryCache || new gn(), this.#t = e.mutationCache || new pn(), this.#n = e.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#i = /* @__PURE__ */ new Map(), this.#a = 0;
	}
	mount() {
		this.#a++, this.#a === 1 && (this.#o = Ht.subscribe(async (e) => {
			e && (await this.resumePausedMutations(), this.#e.onFocus());
		}), this.#s = Gt.subscribe(async (e) => {
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
		let r = this.defaultQueryOptions({ queryKey: e }), i = this.#e.get(r.queryHash)?.state.data, a = _t(t, i);
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
		return Promise.all(r).then(gt).catch(gt);
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
			return n.throwOnError || (t = t.catch(gt)), e.state.fetchStatus === "paused" ? Promise.resolve() : t;
		}));
		return Promise.all(r).then(gt);
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
		return this.fetchQuery(e).then(gt).catch(gt);
	}
	infiniteQuery(e) {
		return e._type = "infinite", this.query(e);
	}
	fetchInfiniteQuery(e) {
		return e._type = "infinite", this.fetchQuery(e);
	}
	prefetchInfiniteQuery(e) {
		return this.fetchInfiniteQuery(e).then(gt).catch(gt);
	}
	ensureInfiniteQueryData(e) {
		return e._type = "infinite", this.ensureQueryData(e);
	}
	resumePausedMutations() {
		return Gt.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
		this.#r.set(Ct(e), {
			queryKey: e,
			defaultOptions: t
		});
	}
	getQueryDefaults(e) {
		let t = [...this.#r.values()], n = {};
		return t.forEach((t) => {
			wt(e, t.queryKey) && Object.assign(n, t.defaultOptions);
		}), n;
	}
	setMutationDefaults(e, t) {
		this.#i.set(Ct(e), {
			mutationKey: e,
			defaultOptions: t
		});
	}
	getMutationDefaults(e) {
		let t = [...this.#i.values()], n = {};
		return t.forEach((t) => {
			wt(e, t.mutationKey) && Object.assign(n, t.defaultOptions);
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
		return t.queryHash ||= St(t.queryKey, t), t.refetchOnReconnect === void 0 && (t.refetchOnReconnect = t.networkMode !== "always"), t.throwOnError === void 0 && (t.throwOnError = !!t.suspense), !t.networkMode && t.persister && (t.networkMode = "offlineFirst"), t.queryFn === Ft && (t.enabled = !1), t;
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
}, vn = _.createContext(!1), yn = () => _.useContext(vn);
vn.Provider;
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/react-query/build/modern/QueryErrorResetBoundary.js
function bn() {
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
var xn = _.createContext(bn()), Sn = () => _.useContext(xn), Cn = (e, t, n) => {
	let r = n?.state.error && typeof e.throwOnError == "function" ? Lt(e.throwOnError, [n.state.error, n]) : e.throwOnError;
	(e.suspense || r) && (t.isReset() || (e.retryOnMount = !1));
}, wn = (e) => {
	_.useEffect(() => {
		e.clearReset();
	}, [e]);
}, Tn = ({ result: e, errorResetBoundary: t, throwOnError: n, query: r, suspense: i }) => e.isError && !t.isReset() && !e.isFetching && r && (i && e.data === void 0 || Lt(n, [e.error, r])), En = (e) => {
	if (e.suspense) {
		let t = 1e3, n = (e) => e === "static" ? e : Math.max(e ?? t, t), r = e.staleTime;
		e.staleTime = typeof r == "function" ? (...e) => n(r(...e)) : n(r), typeof e.gcTime == "number" && (e.gcTime = Math.max(e.gcTime, t));
	}
}, Dn = (e, t) => e?.suspense && t.isPending, On = (e, t, n) => t.fetchOptimistic(e).catch(() => {
	n.clearReset();
});
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/react-query/build/modern/useBaseQuery.js
function kn(e, t, n) {
	let r = yn(), i = Sn(), a = dt(n), o = a.defaultQueryOptions(e), s = a.getQueryCache().get(o.queryHash), c = e.subscribed !== !1;
	o._optimisticResults = r ? "isRestoring" : c ? "optimistic" : void 0, En(o), Cn(o, i, s), wn(i);
	let [l] = _.useState(() => new t(a, o)), u = l.getOptimisticResult(o), d = !r && c;
	if (_.useSyncExternalStore(_.useCallback((e) => {
		let t = d ? l.subscribe(N.batchCalls(e)) : gt;
		return l.updateResult(), t;
	}, [l, d]), () => l.getCurrentResult(), () => l.getCurrentResult()), _.useEffect(() => {
		l.setOptions(o);
	}, [o, l]), Dn(o, u)) throw On(o, l, i);
	if (Tn({
		result: u,
		errorResetBoundary: i,
		throwOnError: o.throwOnError,
		query: s,
		suspense: o.suspense
	})) throw u.error;
	return o.notifyOnChangeProps ? u : l.trackResult(u);
}
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/react-query/build/modern/useQuery.js
function An(e, t) {
	return kn(e, an, t);
}
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/react-query/build/modern/queryOptions.js
function jn(e) {
	return e;
}
//#endregion
//#region ../../../../../../../workspace/plante/frontend/node_modules/@tanstack/react-query/build/modern/useMutation.js
function Mn(e, t) {
	let n = dt(t), [r] = _.useState(() => new hn(n, e));
	_.useEffect(() => {
		r.setOptions(e);
	}, [r, e]);
	let i = _.useSyncExternalStore(_.useCallback((e) => r.subscribe(N.batchCalls(e)), [r]), () => r.getCurrentResult(), () => r.getCurrentResult()), a = _.useCallback((...e) => {
		r.mutate(e[0], e[1]).catch(gt);
	}, [r]);
	if (i.error && Lt(r.options.throwOnError, [i.error])) throw i.error;
	return {
		...i,
		mutate: a,
		mutateAsync: i.mutate
	};
}
//#endregion
//#region src/shared/query/studioQueryClient.ts
var Nn = new _n({ defaultOptions: {
	queries: {
		staleTime: 3e4,
		retry: 1,
		refetchOnWindowFocus: !1
	},
	mutations: { retry: 0 }
} }), Pn = "studio:tool-open-request";
function Fn(e, t = window) {
	t.dispatchEvent(new CustomEvent(Pn, { detail: { tool: e } }));
}
//#endregion
//#region src/shared/legacy/LegacyBridge.ts
var In = [
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
], Ln = /* @__PURE__ */ new WeakMap();
function Rn() {
	if (typeof window > "u") throw Error("LegacyBridge requires a browser window or an injected host.");
	return window;
}
function zn(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Bn(e) {
	return zn(e) ? e : {};
}
function Vn(e) {
	return typeof e == "string" && e.length > 0 ? e : null;
}
function Hn(e, t) {
	return Bn(e[t]);
}
function Un(e) {
	return e === "studio:job" || e === "studio:episode-job" || e === "studio:stage-job" || e === "studio:narrative-job" || e === "studio:demo-job";
}
var Wn = class {
	#e;
	#t;
	#n;
	#r = /* @__PURE__ */ new Map();
	#i = /* @__PURE__ */ new Map();
	#a = !1;
	constructor(e = {}) {
		this.#e = e.host ?? Rn(), this.#t = e.development ?? !1, this.#n = e.logger ?? console;
	}
	start() {
		if (this.#a) return this.#d("Duplicate LegacyBridge subscription prevented."), this;
		let e = Ln.get(this.#e);
		e && e !== this && (this.#d("Replacing an active LegacyBridge subscription (HMR)."), e.#o());
		for (let e of In) {
			let t = (t) => this.#s(e, t);
			this.#e.addEventListener(e, t), this.#i.set(e, t);
		}
		return Ln.set(this.#e, this), this.#a = !0, this;
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
		let e = Bn(this.#e.SerreProjects?.current()), t = Bn(this.#e.SerreEpisode?.current()), n = Hn(t, "episode"), r = Bn(this.#e.SerreRuntimeManager?.current()), i = this.#e.SerreActivity?.current();
		return {
			workspace: {
				view: this.#l(this.#e.SerreWorkspace?.current()),
				payload: {}
			},
			project: {
				projectId: Vn(e.active_id),
				payload: e
			},
			episode: {
				episodeId: Vn(n.id),
				seriesId: Vn(n.series_id),
				payload: t
			},
			runtime: {
				enabled: typeof r.enabled == "boolean" ? r.enabled : null,
				services: Array.isArray(r.services) ? r.services.filter(zn) : [],
				payload: r
			},
			activity: zn(i) ? i : null
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
		this.#i.clear(), this.#a = !1, Ln.get(this.#e) === this && Ln.delete(this.#e);
	}
	#s(e, t) {
		let n = Bn(t instanceof CustomEvent ? t.detail : void 0);
		if (Un(e)) {
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
					projectId: Vn(n.active_id),
					payload: n
				});
				break;
			case "studio:episode-loaded": {
				let e = Hn(n, "episode");
				this.#c("episodeLoaded", {
					episodeId: Vn(e.id),
					seriesId: Vn(e.series_id),
					payload: n
				});
				break;
			}
			case "studio:episode-cleared":
				this.#c("episodeCleared", void 0);
				break;
			case "studio:shot-selected": {
				let e = Hn(n, "episode"), t = Hn(n, "shot");
				this.#c("shotSelected", {
					episodeId: Vn(e.id),
					shotId: Vn(t.id) ?? Vn(t.shot_id),
					index: typeof n.index == "number" ? n.index : null,
					payload: n
				});
				break;
			}
			case "studio:runtime":
				this.#c("runtimeChanged", {
					enabled: typeof n.enabled == "boolean" ? n.enabled : null,
					services: Array.isArray(n.services) ? n.services.filter(zn) : [],
					payload: n
				});
				break;
			case "studio:runtime-preparation": this.#c("runtimePreparation", {
				status: Vn(n.status),
				message: Vn(n.message),
				progress: zn(n.progress) ? n.progress : null,
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
function Gn(e, t, n) {
	n === null ? e.removeAttribute(t) : e.setAttribute(t, n);
}
function Kn(e, t) {
	if (t.parent === null || !t.parent.isConnected) {
		e.remove();
		return;
	}
	t.nextSibling?.parentNode === t.parent ? t.parent.insertBefore(e, t.nextSibling) : t.parent.appendChild(e);
}
function qn({ view: e, kernel: t, resolveLegacyRoot: n, unavailable: r, focusOnMount: i = !0, ...a }) {
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
			Kn(s, l), s.hidden = l.hidden, s.inert = l.inert, Gn(s, "aria-hidden", l.ariaHidden), Gn(s, "tabindex", l.tabIndex), i && a?.isConnected && a.focus({ preventScroll: !0 });
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
var Jn = jn({
	queryKey: ["api", "health"],
	queryFn: ({ signal: e }) => lt({ signal: e })
});
//#endregion
//#region src/features/api-status/ApiStatus.tsx
function Yn() {
	let e = An(Jn), t = e.isPending ? "Connexion à l’API…" : e.isError ? "API indisponible" : `API connectée : ${e.data.status}`;
	return /* @__PURE__ */ (0, b.jsx)(x, {
		role: "status",
		children: t
	});
}
//#endregion
//#region src/features/api-status/index.ts
var Xn = {
	id: "api-status",
	Component: Yn
};
//#endregion
//#region src/features/studio-status/StudioStatus.tsx
function Zn() {
	return /* @__PURE__ */ (0, b.jsx)(x, {
		role: "status",
		children: "Interface React initialisée"
	});
}
//#endregion
//#region src/features/studio-status/index.ts
var Qn = {
	id: "studio-status",
	Component: Zn
}, $n = "/api/relationship-board";
function er() {
	return A($n, { method: "GET" });
}
function tr(e, t, n) {
	return A(`${$n}/relationships/${encodeURIComponent(t.id)}`, {
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
function nr(e, t, n) {
	return A(`${$n}/secrets/${encodeURIComponent(t.id)}`, {
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
function rr(e, t, n, r) {
	return A(`${$n}/summary-candidates`, {
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
var ir = {
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
function ar(e) {
	return ir[e];
}
//#endregion
//#region src/features/relationships/model.ts
var or = [
	"desire",
	"trust",
	"anger",
	"fear",
	"attachment",
	"jealousy",
	"toxicity"
];
function sr(e, t) {
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
function cr(e) {
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
}, lr = ["relationship-board"];
function ur(e, t) {
	return e instanceof Error ? e.message : t;
}
function dr({ locale: e, advancedView: t }) {
	let n = ar(e), r = dt(), i = An({
		queryKey: lr,
		queryFn: er
	}), [a, o] = (0, _.useState)("relationships"), [s, c] = (0, _.useState)(null), [l, u] = (0, _.useState)(null), [d, f] = (0, _.useState)(null), [p, m] = (0, _.useState)(null), [h, g] = (0, _.useState)(""), v = i.data;
	(0, _.useEffect)(() => {
		if (!v || s) return;
		let e = v.relationships[0];
		e ? c(e) : v.characters.length >= 2 && c(sr(v.characters[0].id, v.characters[1].id));
	}, [v, s]), (0, _.useEffect)(() => {
		v && !l && v.secrets[0] && u(v.secrets[0]);
	}, [v, l]);
	let y = (e) => {
		r.setQueryData(lr, e), m(e.impact), g("");
	}, x = Mn({
		mutationFn: ({ revision: e, relationship: t }) => tr(e, t, t.provenance.note),
		onSuccess: (e) => {
			y(e);
			let t = e.relationships.find((e) => e.id === s?.id);
			t && c(t);
		},
		onError: (e) => g(ur(e, n.unavailableDescription))
	}), S = Mn({
		mutationFn: ({ revision: e, secret: t }) => nr(e, t, t.provenance.note),
		onSuccess: (e) => {
			y(e);
			let t = e.secrets.find((e) => e.id === l?.id);
			t && u(t);
		},
		onError: (e) => g(ur(e, n.unavailableDescription))
	}), C = Mn({
		mutationFn: ({ revision: t, relationshipIds: n, secretIds: r }) => rr(t, n, r, e),
		onSuccess: (e) => {
			f(e), g("");
		},
		onError: (e) => g(ur(e, n.unavailableDescription))
	}), w = (0, _.useMemo)(() => new Map(v?.characters.map((e) => [e.id, e.name]) ?? []), [v?.characters]);
	if (i.isPending) return /* @__PURE__ */ (0, b.jsx)(k, {
		"aria-label": n.loading,
		height: "28rem",
		width: "100%"
	});
	if (i.error || !v) return /* @__PURE__ */ (0, b.jsx)(O, {
		action: /* @__PURE__ */ (0, b.jsx)(T, {
			onClick: () => i.refetch(),
			children: n.reload
		}),
		description: n.unavailableDescription,
		title: n.unavailable
	});
	if (v.characters.length < 2) return /* @__PURE__ */ (0, b.jsx)(ce, {
		description: n.empty,
		title: n.title
	});
	let ee = (e, t) => {
		let n = v.relationships.find((n) => n.source === e && n.target === t);
		c(n ?? sr(e, t)), f(null);
	}, te = /* @__PURE__ */ (0, b.jsxs)("div", {
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
						onClick: () => ee(e.id, t.id),
						type: "button",
						children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: r?.jealousy ?? 0 }), /* @__PURE__ */ (0, b.jsx)("small", { children: n.axes.jealousy })]
					}) }, t.id);
				})] }, e.id)) })]
			})
		}), s ? /* @__PURE__ */ (0, b.jsx)(fr, {
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
	}), E = /* @__PURE__ */ (0, b.jsxs)("div", {
		className: P.secretLayout,
		children: [/* @__PURE__ */ (0, b.jsxs)("aside", {
			className: P.secretList,
			children: [/* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => u(cr(v.characters[0].id)),
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
		}), l ? /* @__PURE__ */ (0, b.jsx)(mr, {
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
	}), ne = /* @__PURE__ */ (0, b.jsxs)("section", {
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
	}), re = [
		{
			id: "relationships",
			label: n.relations,
			panel: te
		},
		{
			id: "secrets",
			label: n.secrets,
			panel: E
		},
		{
			id: "history",
			label: n.history,
			panel: ne
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
			p ? /* @__PURE__ */ (0, b.jsx)(hr, {
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
			/* @__PURE__ */ (0, b.jsx)(he, {
				ariaLabel: n.tabs,
				items: re,
				onValueChange: o,
				value: a
			})
		]
	});
}
function fr({ busy: e, draft: t, labels: n, names: r, onChange: i, onGenerate: a, onSave: o, summaryBusy: s }) {
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
				children: or.map((e) => /* @__PURE__ */ (0, b.jsx)(pr, {
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
function pr({ axis: e, labels: t, onChange: n, value: r }) {
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
function mr({ busy: e, characters: t, draft: n, labels: r, onChange: i, onGenerate: a, onSave: o, summaryBusy: s }) {
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
function hr({ impact: e, labels: t }) {
	let n = [...e.affected_episodes, ...e.affected_shots];
	return /* @__PURE__ */ (0, b.jsxs)("aside", {
		className: P.impact,
		children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: t.affected }), /* @__PURE__ */ (0, b.jsx)("span", { children: n.length ? n.join(", ") : t.noImpact })]
	});
}
//#endregion
//#region src/features/index.ts
var gr = [Qn, Xn], _r = (0, _.createContext)(null);
function vr({ children: e, value: t }) {
	return /* @__PURE__ */ (0, b.jsx)(_r.Provider, {
		value: t,
		children: e
	});
}
function yr() {
	let e = (0, _.useContext)(_r);
	if (!e) throw Error("JourneyContext is missing");
	return e;
}
var br = {
	root: "_root_1t2c2_1",
	hero: "_hero_1t2c2_2",
	stage: "_stage_1t2c2_3",
	stepper: "_stepper_1t2c2_5",
	form: "_form_1t2c2_12",
	actions: "_actions_1t2c2_17",
	cards: "_cards_1t2c2_18",
	statusCard: "_statusCard_1t2c2_19",
	reviewGrid: "_reviewGrid_1t2c2_20",
	error: "_error_1t2c2_22"
};
//#endregion
//#region src/features/guided-journey/JourneyStepper.tsx
function xr({ stages: e, labels: t, navigationLabel: n }) {
	let r = yr();
	return /* @__PURE__ */ (0, b.jsx)("nav", {
		"aria-label": n,
		className: br.stepper,
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
function Sr(e) {
	return typeof e == "object" && e && !Array.isArray(e) ? e : {};
}
function Cr(e) {
	return typeof e == "string" ? e : "";
}
function wr(e) {
	return Array.isArray(e) ? e.filter((e) => typeof e == "string") : [];
}
function Tr(e) {
	let t = Sr(e), n = Sr(t.state), r = Sr(n.brief), i = Array.isArray(t.proposals) ? t.proposals : [];
	return {
		revision: typeof n.revision == "number" ? n.revision : 0,
		activeEpisodeId: typeof n.active_episode_id == "string" ? n.active_episode_id : null,
		brief: {
			working_title: Cr(r.working_title),
			idea: Cr(r.idea),
			genre: Cr(r.genre),
			tone: Cr(r.tone),
			audience: Cr(r.audience),
			episode_title: Cr(r.episode_title),
			episode_concept: Cr(r.episode_concept),
			locked_fields: wr(r.locked_fields)
		},
		characters: Array.isArray(n.characters) ? n.characters.map((e) => Sr(e)) : [],
		proposals: i.flatMap((e) => {
			let t = Sr(e), n = t.status;
			return typeof t.id != "string" || typeof t.target != "string" || typeof t.base_revision != "number" || n !== "candidate" && n !== "accepted" && n !== "rejected" ? [] : [{
				id: t.id,
				target: t.target,
				baseRevision: t.base_revision,
				before: Sr(t.before),
				after: Sr(t.after),
				model: Cr(t.model),
				status: n
			}];
		})
	};
}
function Er(e) {
	let t = e.stages.find((e) => !["approved", "completed"].includes(e.status)) ?? e.stages.at(-1);
	if (!t) throw Error("Studio journey contains no stages");
	return t;
}
//#endregion
//#region src/features/guided-journey/ProposalReviewDrawer.tsx
function Dr({ proposal: e, busy: t, onAccept: n, onClose: r, onReject: i }) {
	let [a, o] = (0, _.useState)("");
	if (!e) return null;
	let s = a || JSON.stringify(e.after, null, 2);
	return /* @__PURE__ */ (0, b.jsxs)(oe, {
		open: !0,
		onOpenChange: (e) => {
			e || r();
		},
		title: "Proposition — non appliquée",
		children: [
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: br.reviewGrid,
				children: [/* @__PURE__ */ (0, b.jsxs)("section", { children: [/* @__PURE__ */ (0, b.jsx)("h3", { children: "Avant" }), /* @__PURE__ */ (0, b.jsx)("pre", { children: JSON.stringify(e.before, null, 2) })] }), /* @__PURE__ */ (0, b.jsxs)("section", { children: [/* @__PURE__ */ (0, b.jsx)("h3", { children: "Après — modifiable" }), /* @__PURE__ */ (0, b.jsx)("textarea", {
					"aria-label": "Proposition modifiable",
					onChange: (e) => o(e.currentTarget.value),
					value: s
				})] })]
			}),
			/* @__PURE__ */ (0, b.jsxs)("p", { children: ["Modèle : ", e.model] }),
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: br.actions,
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
var Or = () => A("/api/casting", { method: "GET" });
function kr(e, t, n) {
	let r = new URLSearchParams({
		expected_revision: String(t),
		kind: n.kind,
		permanent_identity: n.permanentIdentity,
		outfit: n.outfit,
		transient_state: n.transientState,
		license: n.license,
		source_label: n.file.name
	});
	return A(`/api/casting/${encodeURIComponent(e)}/variants/import?${r}`, {
		method: "POST",
		body: n.file,
		headers: { "Content-Type": n.file.type }
	});
}
function Ar(e, t) {
	return A(`/api/casting/${encodeURIComponent(e)}/variants/generate`, {
		method: "POST",
		body: JSON.stringify(t),
		headers: { "Content-Type": "application/json" }
	});
}
function jr(e, t, n, r) {
	return A(`/api/casting/${encodeURIComponent(t)}/variants/${encodeURIComponent(n)}/${e}`, {
		method: "POST",
		body: JSON.stringify({ expected_revision: r }),
		headers: { "Content-Type": "application/json" }
	});
}
var Mr = {
	root: "_root_kneqk_1",
	forms: "_forms_kneqk_7",
	grid: "_grid_kneqk_11",
	compared: "_compared_kneqk_13",
	meta: "_meta_kneqk_14",
	actions: "_actions_kneqk_14",
	error: "_error_kneqk_18",
	notice: "_notice_kneqk_19"
}, Nr = {
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
		affected: "Le changement affecte"
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
		affected: "This change affects"
	}
};
function Pr(e) {
	return [
		e.provenance.source_label,
		e.provenance.model,
		e.provenance.workflow,
		e.provenance.seed === null ? null : `seed ${e.provenance.seed}`,
		e.provenance.revision,
		e.provenance.license
	].filter(Boolean).join(" · ");
}
function Fr({ characters: e, locale: t }) {
	let n = Nr[t], r = dt(), i = An({
		queryKey: ["casting"],
		queryFn: Or,
		enabled: e.length > 0
	}), [a, o] = (0, _.useState)(e[0]?.id ?? ""), [s, c] = (0, _.useState)([]), [l, u] = (0, _.useState)(""), [d, f] = (0, _.useState)(""), p = (0, _.useMemo)(() => i.data?.characters.find((e) => e.character_id === a), [a, i.data]), m = async () => r.invalidateQueries({ queryKey: ["casting"] }), h = Mn({
		mutationFn: async (e) => e(),
		onSuccess: async (e) => {
			let t = e.affected;
			u(t ? `${n.affected} ${t.shot_ids.length} plan(s), ${t.rendered_shot_ids.length} rendu(s). Aucune régénération lancée.` : ""), f(""), await m();
		},
		onError: (e) => f(e instanceof Error ? e.message : "Operation failed")
	});
	if (e.length === 0) return /* @__PURE__ */ (0, b.jsx)(ce, {
		title: n.title,
		description: n.noCharacter
	});
	if (i.isPending) return /* @__PURE__ */ (0, b.jsx)(k, {
		"aria-label": n.title,
		height: "28rem",
		width: "100%"
	});
	if (i.error || !i.data) return /* @__PURE__ */ (0, b.jsx)(O, {
		title: n.title,
		description: i.error?.message ?? "Unavailable"
	});
	let g = (e) => c((t) => t.includes(e) ? t.filter((t) => t !== e) : [...t.slice(-1), e]), v = (e) => {
		e.preventDefault();
		let t = new FormData(e.currentTarget), n = t.get("file");
		if (!(n instanceof File) || n.size === 0) {
			f("Select an image");
			return;
		}
		h.mutate(() => kr(a, i.data.revision, {
			file: n,
			kind: String(t.get("kind")),
			permanentIdentity: String(t.get("permanent_identity")),
			outfit: String(t.get("outfit")),
			transientState: String(t.get("transient_state")),
			license: String(t.get("license"))
		}));
	}, y = (e) => {
		e.preventDefault();
		let t = new FormData(e.currentTarget);
		h.mutate(() => Ar(a, {
			expected_revision: i.data.revision,
			kind: String(t.get("kind")),
			permanent_identity: String(t.get("permanent_identity")),
			outfit: String(t.get("outfit")),
			transient_state: String(t.get("transient_state")),
			prompt: String(t.get("prompt")),
			model: String(t.get("model")),
			workflow: String(t.get("workflow")),
			seed: Number(t.get("seed")),
			license: String(t.get("license"))
		}));
	}, x = (e = !1) => /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [
		/* @__PURE__ */ (0, b.jsxs)("label", { children: [n.permanent, /* @__PURE__ */ (0, b.jsx)("textarea", {
			minLength: 10,
			name: "permanent_identity",
			required: !0
		})] }),
		/* @__PURE__ */ (0, b.jsxs)("label", { children: [n.outfit, /* @__PURE__ */ (0, b.jsx)("input", { name: "outfit" })] }),
		/* @__PURE__ */ (0, b.jsxs)("label", { children: [n.transient, /* @__PURE__ */ (0, b.jsx)("input", { name: "transient_state" })] }),
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
				minLength: 10,
				name: "prompt",
				required: !0
			})] }),
			/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Model", /* @__PURE__ */ (0, b.jsx)("input", {
				name: "model",
				required: !0
			})] }),
			/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Workflow", /* @__PURE__ */ (0, b.jsx)("input", {
				name: "workflow",
				required: !0
			})] }),
			/* @__PURE__ */ (0, b.jsxs)("label", { children: ["Seed", /* @__PURE__ */ (0, b.jsx)("input", {
				min: "0",
				name: "seed",
				required: !0,
				type: "number"
			})] })
		] }) : /* @__PURE__ */ (0, b.jsxs)("label", { children: ["Image", /* @__PURE__ */ (0, b.jsx)("input", {
			accept: "image/png,image/jpeg,image/webp",
			name: "file",
			required: !0,
			type: "file"
		})] }),
		/* @__PURE__ */ (0, b.jsxs)("label", { children: ["License", /* @__PURE__ */ (0, b.jsx)("input", {
			name: "license",
			required: !0
		})] })
	] });
	return /* @__PURE__ */ (0, b.jsxs)("section", {
		className: Mr.root,
		"data-casting-board": !0,
		children: [
			/* @__PURE__ */ (0, b.jsxs)("header", { children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("h2", { children: n.title }), /* @__PURE__ */ (0, b.jsx)("p", { children: n.intro })] }), /* @__PURE__ */ (0, b.jsxs)("label", { children: ["Character", /* @__PURE__ */ (0, b.jsx)("select", {
				"aria-label": "Character",
				onChange: (e) => {
					o(e.currentTarget.value), c([]);
				},
				value: a,
				children: e.map((e) => /* @__PURE__ */ (0, b.jsx)("option", {
					value: e.id,
					children: e.name
				}, e.id))
			})] })] }),
			d ? /* @__PURE__ */ (0, b.jsx)("p", {
				className: Mr.error,
				role: "alert",
				children: d
			}) : null,
			l ? /* @__PURE__ */ (0, b.jsx)("p", {
				className: Mr.notice,
				role: "status",
				children: l
			}) : null,
			/* @__PURE__ */ (0, b.jsxs)("div", {
				className: Mr.forms,
				children: [/* @__PURE__ */ (0, b.jsxs)("details", { children: [/* @__PURE__ */ (0, b.jsx)("summary", { children: n.import }), /* @__PURE__ */ (0, b.jsxs)("form", {
					onSubmit: v,
					children: [x(), /* @__PURE__ */ (0, b.jsx)(T, {
						loading: h.isPending,
						type: "submit",
						children: n.import
					})]
				})] }), /* @__PURE__ */ (0, b.jsxs)("details", { children: [/* @__PURE__ */ (0, b.jsx)("summary", { children: n.generate }), /* @__PURE__ */ (0, b.jsxs)("form", {
					onSubmit: y,
					children: [x(!0), /* @__PURE__ */ (0, b.jsx)(T, {
						loading: h.isPending,
						type: "submit",
						children: n.generate
					})]
				})] })]
			}),
			!p || p.variants.length === 0 ? /* @__PURE__ */ (0, b.jsx)(ce, { title: n.empty }) : /* @__PURE__ */ (0, b.jsx)("div", {
				className: Mr.grid,
				children: p.variants.map((e) => {
					let t = p.active_master_id === e.id;
					return /* @__PURE__ */ (0, b.jsxs)(te, {
						className: s.includes(e.id) ? Mr.compared : "",
						children: [
							/* @__PURE__ */ (0, b.jsx)(ue, {
								aspectRatio: e.kind === "portrait" ? "4 / 5" : "2 / 3",
								children: /* @__PURE__ */ (0, b.jsx)("img", {
									alt: `${e.kind} ${e.status}`,
									src: e.media_url
								})
							}),
							/* @__PURE__ */ (0, b.jsxs)("div", {
								className: Mr.meta,
								children: [/* @__PURE__ */ (0, b.jsx)(C, {
									tone: t ? "success" : e.status === "rejected" ? "danger" : "neutral",
									children: t ? "MASTER" : e.status
								}), /* @__PURE__ */ (0, b.jsx)("strong", { children: e.kind })]
							}),
							/* @__PURE__ */ (0, b.jsxs)("dl", { children: [
								/* @__PURE__ */ (0, b.jsx)("dt", { children: n.permanent }),
								/* @__PURE__ */ (0, b.jsx)("dd", { children: e.permanent_identity }),
								e.outfit ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: n.outfit }), /* @__PURE__ */ (0, b.jsx)("dd", { children: e.outfit })] }) : null,
								e.transient_state ? /* @__PURE__ */ (0, b.jsxs)(b.Fragment, { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: n.transient }), /* @__PURE__ */ (0, b.jsx)("dd", { children: e.transient_state })] }) : null,
								/* @__PURE__ */ (0, b.jsx)("dt", { children: n.source }),
								/* @__PURE__ */ (0, b.jsx)("dd", { children: Pr(e) })
							] }),
							/* @__PURE__ */ (0, b.jsxs)("div", {
								className: Mr.actions,
								children: [
									/* @__PURE__ */ (0, b.jsx)(T, {
										"aria-pressed": s.includes(e.id),
										onClick: () => g(e.id),
										variant: "ghost",
										children: n.compare
									}),
									!t && e.status !== "rejected" ? /* @__PURE__ */ (0, b.jsx)(T, {
										onClick: () => h.mutate(() => jr(e.status === "approved" ? "restore" : "approve", a, e.id, i.data.revision)),
										children: e.status === "approved" ? n.restore : n.approve
									}) : null,
									!t && e.status === "candidate" ? /* @__PURE__ */ (0, b.jsx)(T, {
										onClick: () => h.mutate(() => jr("reject", a, e.id, i.data.revision)),
										variant: "danger",
										children: n.reject
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
//#region src/features/guided-journey/StageHost.tsx
var Ir = {
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
};
function Lr({ stage: e, guided: t, busy: n, locale: r, onAddCharacter: i, onCreateEpisode: a, onPropose: o, onSaveBrief: s, slots: c }) {
	let l = yr(), u = (e) => {
		e.preventDefault();
		let t = new FormData(e.currentTarget), n = [...t.getAll("locked_fields")].map(String);
		s({
			...Object.fromEntries([...t.entries()].filter(([e]) => e !== "locked_fields")),
			locked_fields: n
		});
	}, d = c?.[e.id];
	if (!d && e.id === "idea") {
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
		d = /* @__PURE__ */ (0, b.jsxs)("form", {
			className: br.form,
			onSubmit: u,
			children: [
				e("working_title", "Titre de travail"),
				e("genre", "Genre"),
				e("idea", "Idée", !0),
				e("tone", "Ton"),
				e("audience", "Public"),
				e("episode_title", "Titre de l’épisode"),
				e("episode_concept", "Promesse de l’épisode", !0),
				/* @__PURE__ */ (0, b.jsxs)("div", {
					className: br.actions,
					children: [/* @__PURE__ */ (0, b.jsx)(T, {
						disabled: n,
						type: "submit",
						children: "Enregistrer le brouillon"
					}), /* @__PURE__ */ (0, b.jsx)(T, {
						disabled: n,
						onClick: () => o("brief"),
						type: "button",
						variant: "secondary",
						children: "Améliorer avec l’IA"
					})]
				})
			]
		});
	}
	return !d && e.id === "episode" && (d = t.activeEpisodeId ? /* @__PURE__ */ (0, b.jsxs)("div", {
		className: br.statusCard,
		children: [
			/* @__PURE__ */ (0, b.jsx)("strong", { children: t.activeEpisodeId }),
			/* @__PURE__ */ (0, b.jsx)("p", { children: "Épisode lié au parcours." }),
			/* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => l.navigate("produce"),
				children: "Écrire et valider"
			})
		]
	}) : /* @__PURE__ */ (0, b.jsxs)("div", {
		className: br.statusCard,
		children: [/* @__PURE__ */ (0, b.jsx)("p", { children: "Crée un épisode depuis le titre et la promesse du brief." }), /* @__PURE__ */ (0, b.jsx)(T, {
			disabled: n,
			onClick: a,
			children: "Créer et lier l’épisode"
		})]
	})), !d && e.id === "casting" && (d = /* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)(Fr, {
		characters: t.characters.map(({ id: e, name: t }) => ({
			id: e,
			name: t || e
		})),
		locale: r
	}), /* @__PURE__ */ (0, b.jsx)("div", {
		className: br.actions,
		children: /* @__PURE__ */ (0, b.jsx)(T, {
			disabled: n,
			onClick: i,
			children: "Ajouter un personnage"
		})
	})] })), d ||= /* @__PURE__ */ (0, b.jsxs)("div", {
		className: br.statusCard,
		children: [/* @__PURE__ */ (0, b.jsx)("p", { children: e.blockers?.[0]?.message ?? `État : ${e.status}` }), /* @__PURE__ */ (0, b.jsx)(T, {
			onClick: () => e.primary_action.target.includes("results") ? l.navigate("results") : e.primary_action.target.includes("settings") ? l.navigate("settings") : e.primary_action.target.includes("bible") ? l.navigate("bible") : l.navigate("produce"),
			children: e.primary_action.label
		})]
	}), /* @__PURE__ */ (0, b.jsxs)("section", {
		"aria-labelledby": `journey-${e.id}`,
		className: br.stage,
		children: [/* @__PURE__ */ (0, b.jsxs)("header", { children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsxs)("small", { children: ["ÉTAPE · ", e.status] }), /* @__PURE__ */ (0, b.jsx)("h1", {
			id: `journey-${e.id}`,
			children: Ir[r][e.id]
		})] }), /* @__PURE__ */ (0, b.jsx)("span", {
			"data-status": e.status,
			children: e.status
		})] }), d]
	});
}
//#endregion
//#region src/features/guided-journey/GuidedJourney.tsx
var Rr = {
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
function zr({ locale: e, onNavigate: t, slots: n }) {
	let r = dt(), i = An({
		queryKey: ["studio-journey"],
		queryFn: st
	}), a = An({
		queryKey: ["guided-authoring"],
		queryFn: Te,
		select: Tr
	}), [o, s] = (0, _.useState)("idea"), [c, l] = (0, _.useState)(!1), [u, d] = (0, _.useState)(null), [f, p] = (0, _.useState)("");
	(0, _.useEffect)(() => {
		!c && i.data && s(Er(i.data).id);
	}, [i.data, c]);
	let m = async () => {
		await Promise.all([r.invalidateQueries({ queryKey: ["guided-authoring"] }), r.invalidateQueries({ queryKey: ["studio-journey"] })]);
	}, h = Mn({
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
	if (i.isPending || a.isPending) return /* @__PURE__ */ (0, b.jsx)(k, {
		"aria-label": "Chargement du parcours",
		height: "24rem",
		width: "100%"
	});
	if (i.error || a.error || !i.data || !g) return /* @__PURE__ */ (0, b.jsx)(O, {
		title: "Parcours indisponible",
		description: "Recharge le Studio pour retrouver ton brouillon."
	});
	let y = i.data.stages.find((e) => e.id === o) ?? i.data.stages[0], x = i.data.stages.filter((e) => ["approved", "completed"].includes(e.status)).length;
	return /* @__PURE__ */ (0, b.jsx)(vr, {
		value: v,
		children: /* @__PURE__ */ (0, b.jsxs)("main", {
			className: br.root,
			"data-guided-journey": !0,
			children: [
				/* @__PURE__ */ (0, b.jsxs)("header", {
					className: br.hero,
					children: [/* @__PURE__ */ (0, b.jsxs)("div", { children: [
						/* @__PURE__ */ (0, b.jsx)("small", { children: "CRÉATION GUIDÉE" }),
						/* @__PURE__ */ (0, b.jsx)("h1", { children: "Ton épisode, de l’idée au rendu" }),
						/* @__PURE__ */ (0, b.jsx)("p", { children: "Tu gardes la décision. L’IA propose, le Studio montre les conséquences." })
					] }), /* @__PURE__ */ (0, b.jsx)(fe, {
						label: `${x} / ${i.data.stages.length}`,
						value: x,
						max: i.data.stages.length
					})]
				}),
				/* @__PURE__ */ (0, b.jsx)(xr, {
					labels: Rr[e],
					navigationLabel: e === "fr" ? "Parcours de création" : "Creation journey",
					stages: i.data.stages
				}),
				f ? /* @__PURE__ */ (0, b.jsx)("p", {
					className: br.error,
					role: "alert",
					children: f
				}) : null,
				/* @__PURE__ */ (0, b.jsx)(Lr, {
					busy: h.isPending,
					guided: g,
					locale: e,
					onAddCharacter: () => h.mutate(() => ke({ expected_revision: g.revision })),
					onCreateEpisode: () => h.mutate(async () => {
						let e = (await Ce({
							title: g.brief.episode_title || "Épisode sans titre",
							concept: g.brief.episode_concept || g.brief.idea
						})).id;
						if (typeof e != "string") throw Error("Épisode créé sans identifiant");
						return je({
							expected_revision: g.revision,
							episode_id: e
						});
					}),
					onPropose: async (t) => {
						p("");
						try {
							let n = Tr(await Ne({
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
					onSaveBrief: (e) => h.mutate(() => De({
						expected_revision: g.revision,
						brief: e
					})),
					slots: n,
					stage: y
				}),
				/* @__PURE__ */ (0, b.jsx)(Dr, {
					busy: h.isPending,
					onAccept: (e) => u && h.mutate(() => Fe(u.id, {
						expected_revision: g.revision,
						edited_after: { ...e }
					}), { onSuccess: () => d(null) }),
					onClose: () => d(null),
					onReject: () => u && h.mutate(() => Le(u.id), { onSuccess: () => d(null) }),
					proposal: u
				})
			]
		})
	});
}
//#endregion
//#region src/features/setup/model.ts
var Br = /* @__PURE__ */ new Set([
	"queued",
	"running",
	"paused",
	"awaiting_license",
	"awaiting_manual",
	"completed",
	"failed",
	"cancelled"
]);
function Vr(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) throw Error("Réponse de préparation invalide");
	return e;
}
function F(e, t = "") {
	return typeof e == "string" ? e : t;
}
function Hr(e) {
	return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function Ur(e) {
	let t = Vr(e), n = Vr(t.hardware), r = F(t.status);
	if (![
		"ready",
		"incomplete",
		"incompatible"
	].includes(r)) throw Error("État du pack inconnu");
	let i = Array.isArray(t.components) ? t.components : [];
	return {
		packId: F(t.pack_id),
		status: r,
		summary: F(t.summary),
		requiredDownloadBytes: Hr(t.required_download_bytes),
		hardware: {
			vramGb: typeof n.vram_gb == "number" ? n.vram_gb : null,
			diskFreeBytes: Hr(n.disk_free_bytes),
			gpuName: typeof n.gpu_name == "string" ? n.gpu_name : null
		},
		components: i.map((e) => {
			let t = Vr(e), n = Vr(t.license), r = F(n.commercial_use, "review_required");
			return {
				id: F(t.id),
				role: F(t.role),
				state: F(t.state, "unknown"),
				required: t.required !== !1,
				sizeBytes: Hr(t.size_bytes),
				reason: F(t.reason),
				action: F(t.action),
				license: {
					id: F(n.id),
					name: F(n.name),
					url: F(n.url),
					summary: F(n.summary),
					commercialUse: [
						"allowed",
						"restricted",
						"review_required"
					].includes(r) ? r : "review_required"
				}
			};
		})
	};
}
function Wr(e) {
	let t = Vr(e);
	if (t.job === null || t.job === void 0) return null;
	let n = Vr(t.job), r = F(n.status);
	if (!Br.has(r)) throw Error("État du job inconnu");
	let i = Array.isArray(n.steps) ? n.steps : [], a = Array.isArray(n.smoke_checks) ? n.smoke_checks : [];
	return {
		id: F(n.id),
		status: r,
		mode: n.mode === "manual" ? "manual" : "automatic",
		error: typeof n.error == "string" ? n.error : null,
		recovered: n.recovered === !0,
		acceptedLicenseIds: Array.isArray(n.accepted_license_ids) ? n.accepted_license_ids.map(String) : [],
		steps: i.map((e) => {
			let t = Vr(e);
			return {
				componentId: F(t.component_id),
				status: F(t.status),
				message: F(t.message)
			};
		}),
		smokeChecks: a.map((e) => {
			let t = Vr(e);
			return {
				checkId: F(t.check_id),
				status: t.status === "passed" ? "passed" : "failed",
				requiredComponents: Array.isArray(t.required_components) ? t.required_components.map(String) : [],
				message: F(t.message)
			};
		})
	};
}
function Gr(e, t) {
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
function Kr(e) {
	let t = Wr(e);
	if (!t) throw Error("Préparation introuvable");
	return t;
}
var qr = {
	async diagnose() {
		return Ur(await Ve());
	},
	async latest() {
		let [e, t] = await Promise.all([Ue(), Ue({ use_personal_comfy_models: !0 })]), n = [Wr(e), Wr(t)].filter((e) => e !== null), r = /* @__PURE__ */ new Set([
			"queued",
			"running",
			"paused",
			"awaiting_license",
			"awaiting_manual"
		]);
		return n.find((e) => r.has(e.status)) ?? n[0] ?? null;
	},
	async getJob(e) {
		return Kr(await Ge(e));
	},
	async start(e) {
		return Kr(await rt(e.packId, {
			mode: e.mode,
			accepted_license_ids: [...e.acceptedLicenseIds],
			use_personal_comfy_models: e.usePersonalComfyModels
		}));
	},
	async pause(e) {
		return Kr(await Ze(e));
	},
	async resume(e, t) {
		return Kr(await tt(e, { accepted_license_ids: [...t] }));
	},
	async repair(e, t) {
		return Kr(await $e(e, { accepted_license_ids: [...t] }));
	},
	async cancel(e) {
		return Kr(await qe(e));
	},
	async logs(e) {
		return ((await Ye(e)).logs ?? []).map((e) => typeof e.message == "string" ? e.message : "");
	}
}, Jr = {
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
		reviewTitle: "Avant de commencer",
		reviewIntro: "Vous gardez le contrôle : rien ne sera installé avant votre accord.",
		destination: "Où installer les ressources ?",
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
		awaitingManual: "Un composant doit être indiqué manuellement dans les réglages avancés.",
		readyTitle: "Votre studio est prêt",
		readyIntro: "Les vérifications locales sont réussies. Vous pouvez démarrer votre première création.",
		smokeTitle: "Essai final",
		preview: "Aperçu de validation généré localement",
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
		reviewTitle: "Before we begin",
		reviewIntro: "You stay in control: nothing is installed before you consent.",
		destination: "Where should resources be installed?",
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
		awaitingManual: "A component must be selected manually in advanced settings.",
		readyTitle: "Your studio is ready",
		readyIntro: "Local checks passed. You can start your first creation.",
		smokeTitle: "Final test",
		preview: "Validation preview generated locally",
		continue: "Start creating"
	}
};
function Yr(e) {
	return Jr[e];
}
var I = {
	root: "_root_k7f7p_1",
	stepper: "_stepper_k7f7p_4",
	hero: "_hero_k7f7p_11",
	machine: "_machine_k7f7p_12",
	capabilities: "_capabilities_k7f7p_16",
	primaryAction: "_primaryAction_k7f7p_19",
	fieldset: "_fieldset_k7f7p_20",
	consent: "_consent_k7f7p_22",
	actions: "_actions_k7f7p_25",
	notice: "_notice_k7f7p_26",
	jobSteps: "_jobSteps_k7f7p_27",
	technical: "_technical_k7f7p_30",
	ready: "_ready_k7f7p_33",
	readyGrid: "_readyGrid_k7f7p_34",
	preview: "_preview_k7f7p_36",
	previewLabel: "_previewLabel_k7f7p_37"
};
//#endregion
//#region src/features/setup/SetupStepper.tsx
function Xr({ current: e, messages: t }) {
	return /* @__PURE__ */ (0, b.jsx)("nav", {
		"aria-label": t.title,
		className: I.stepper,
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
function Zr(e) {
	return [...new Map(e.components.filter((e) => e.required && e.state !== "installed").map((e) => [e.license.id, e.license])).values()];
}
function Qr(e, t) {
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
function $r(e) {
	return e.steps.filter((e) => [
		"installed",
		"skipped",
		"completed"
	].includes(e.status)).length;
}
function ei({ locale: e, api: t = qr, readyContent: n, onReady: r }) {
	let i = Yr(e), a = dt(), [o, s] = (0, _.useState)(!1), [c, l] = (0, _.useState)(/* @__PURE__ */ new Set()), [u, d] = (0, _.useState)(!1), [f, p] = (0, _.useState)(!1), [m, h] = (0, _.useState)(null), [g, v] = (0, _.useState)(!1), [y, x] = (0, _.useState)(!1), S = An({
		queryKey: ["runtime-pack", "diagnosis"],
		queryFn: () => t.diagnose()
	}), w = An({
		queryKey: ["runtime-pack", "latest"],
		queryFn: () => t.latest()
	}), ee = m ?? w.data?.id ?? null, E = An({
		queryKey: [
			"runtime-pack",
			"job",
			ee
		],
		queryFn: () => t.getJob(ee),
		enabled: ee !== null,
		refetchInterval: (e) => ["queued", "running"].includes(e.state.data?.status ?? "") ? 750 : !1
	}).data ?? (w.data?.id === ee ? w.data : null), ne = (0, _.useMemo)(() => S.data ? Zr(S.data) : [], [S.data]), re = An({
		queryKey: [
			"runtime-pack",
			"logs",
			ee
		],
		queryFn: () => t.logs(ee),
		enabled: g && ee !== null
	}), ie = (e) => {
		h(e.id), a.setQueryData([
			"runtime-pack",
			"job",
			e.id
		], e);
	}, ae = Mn({
		mutationFn: (e) => e(),
		onSuccess: ie
	}), oe = Mn({
		mutationFn: (e) => t.start(e),
		onSuccess: ie
	});
	if (y) return /* @__PURE__ */ (0, b.jsx)(b.Fragment, { children: n });
	if (S.isPending || w.isPending) return /* @__PURE__ */ (0, b.jsx)("main", {
		className: I.root,
		children: /* @__PURE__ */ (0, b.jsx)(k, {
			"aria-label": i.loading,
			height: "18rem"
		})
	});
	if (S.isError || w.isError || !S.data) return /* @__PURE__ */ (0, b.jsx)("main", {
		className: I.root,
		children: /* @__PURE__ */ (0, b.jsx)(O, {
			title: i.loadError,
			description: i.intro,
			action: /* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => {
					S.refetch(), w.refetch();
				},
				children: i.retryDiagnosis
			})
		})
	});
	let se = E?.status === "completed" || S.data.status === "ready" ? 4 : E ? E.status === "queued" || E.status === "running" || E.status === "paused" ? 2 : 3 : +!!o, ce = [.../* @__PURE__ */ new Set([...E?.acceptedLicenseIds ?? [], ...c])], D = u && ne.every((e) => c.has(e.id)), le = (e) => ae.mutate(e);
	if (se === 4) {
		let e = E?.smokeChecks ?? [];
		return /* @__PURE__ */ (0, b.jsxs)("main", {
			className: I.root,
			children: [/* @__PURE__ */ (0, b.jsx)(Xr, {
				current: 4,
				messages: i
			}), /* @__PURE__ */ (0, b.jsxs)("section", {
				className: I.ready,
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
						className: I.readyGrid,
						children: [/* @__PURE__ */ (0, b.jsxs)(te, {
							as: "section",
							children: [/* @__PURE__ */ (0, b.jsx)("h2", { children: i.smokeTitle }), /* @__PURE__ */ (0, b.jsx)("ul", { children: e.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [
								/* @__PURE__ */ (0, b.jsx)(C, {
									tone: e.status === "passed" ? "success" : "danger",
									children: e.status === "passed" ? "✓" : "!"
								}),
								" ",
								e.message || e.checkId
							] }, e.checkId)) })]
						}), /* @__PURE__ */ (0, b.jsx)(ue, {
							caption: i.preview,
							children: /* @__PURE__ */ (0, b.jsxs)("div", {
								className: I.preview,
								"aria-label": i.preview,
								role: "img",
								children: [/* @__PURE__ */ (0, b.jsx)("span", {
									className: I.previewLabel,
									children: "LA SERRE"
								}), /* @__PURE__ */ (0, b.jsx)("strong", { children: "Studio local" })]
							})
						})]
					}),
					/* @__PURE__ */ (0, b.jsx)(T, {
						size: "large",
						onClick: () => {
							r?.(), x(!0);
						},
						children: i.continue
					})
				]
			})]
		});
	}
	if (E) {
		let n = Math.max(E.steps.length, 1), r = [
			"failed",
			"cancelled",
			"awaiting_license",
			"awaiting_manual"
		].includes(E.status);
		return /* @__PURE__ */ (0, b.jsxs)("main", {
			className: I.root,
			children: [/* @__PURE__ */ (0, b.jsx)(Xr, {
				current: se,
				messages: i
			}), /* @__PURE__ */ (0, b.jsxs)("section", {
				"aria-labelledby": "setup-progress-title",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, b.jsx)(C, {
						tone: r ? "warning" : "info",
						children: E.status.replaceAll("_", " ")
					}),
					/* @__PURE__ */ (0, b.jsx)("h1", {
						id: "setup-progress-title",
						children: r ? i.errorTitle : i.progressTitle
					}),
					E.recovered ? /* @__PURE__ */ (0, b.jsx)("p", {
						className: I.notice,
						children: i.resumed
					}) : null,
					E.status === "awaiting_license" ? /* @__PURE__ */ (0, b.jsx)("p", { children: i.awaitingLicense }) : null,
					E.status === "awaiting_manual" ? /* @__PURE__ */ (0, b.jsx)("p", { children: i.awaitingManual }) : null,
					E.error ? /* @__PURE__ */ (0, b.jsx)("p", {
						role: "alert",
						children: E.error
					}) : null,
					/* @__PURE__ */ (0, b.jsx)(fe, {
						id: "setup-progress",
						label: i.progress,
						max: n,
						value: $r(E),
						showValue: !0
					}),
					/* @__PURE__ */ (0, b.jsx)("ol", {
						className: I.jobSteps,
						children: E.steps.map((e) => /* @__PURE__ */ (0, b.jsxs)("li", { children: [/* @__PURE__ */ (0, b.jsx)(C, {
							tone: [
								"installed",
								"completed",
								"skipped"
							].includes(e.status) ? "success" : e.status === "failed" ? "danger" : "neutral",
							children: e.status
						}), /* @__PURE__ */ (0, b.jsxs)("span", { children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: e.componentId }), e.message ? /* @__PURE__ */ (0, b.jsx)("small", { children: e.message }) : null] })] }, e.componentId))
					}),
					ae.isError ? /* @__PURE__ */ (0, b.jsx)("p", {
						role: "alert",
						children: e === "fr" ? "L’action n’a pas abouti. Vous pouvez réessayer." : "The action did not complete. You can try again."
					}) : null,
					/* @__PURE__ */ (0, b.jsxs)("div", {
						className: I.actions,
						children: [
							E.status === "awaiting_license" && ne.length ? /* @__PURE__ */ (0, b.jsxs)("fieldset", {
								className: I.fieldset,
								children: [/* @__PURE__ */ (0, b.jsx)("legend", { children: i.licenses }), ne.map((e) => /* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
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
							["queued", "running"].includes(E.status) ? /* @__PURE__ */ (0, b.jsx)(T, {
								variant: "secondary",
								onClick: () => le(() => t.pause(E.id)),
								children: i.pause
							}) : null,
							E.status === "paused" ? /* @__PURE__ */ (0, b.jsx)(T, {
								onClick: () => le(() => t.resume(E.id, ce)),
								children: i.resume
							}) : null,
							r ? /* @__PURE__ */ (0, b.jsx)(T, {
								disabled: E.status === "awaiting_license" && !ne.every((e) => ce.includes(e.id)),
								onClick: () => le(() => t.resume(E.id, ce)),
								children: i.retry
							}) : null,
							r ? /* @__PURE__ */ (0, b.jsx)(T, {
								variant: "secondary",
								onClick: () => le(() => t.repair(E.id, ce)),
								children: i.repair
							}) : null,
							r ? /* @__PURE__ */ (0, b.jsx)(T, {
								variant: "ghost",
								onClick: () => oe.mutate({
									packId: S.data.packId,
									mode: "manual",
									acceptedLicenseIds: ce,
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
							].includes(E.status) ? /* @__PURE__ */ (0, b.jsx)(T, {
								variant: "danger",
								onClick: () => le(() => t.cancel(E.id)),
								children: i.cancel
							}) : null
						]
					}),
					/* @__PURE__ */ (0, b.jsxs)("details", {
						className: I.technical,
						onToggle: (e) => v(e.currentTarget.open),
						children: [
							/* @__PURE__ */ (0, b.jsx)("summary", { children: i.details }),
							/* @__PURE__ */ (0, b.jsx)("h2", { children: i.logs }),
							re.isPending ? /* @__PURE__ */ (0, b.jsx)("p", { children: i.loading }) : /* @__PURE__ */ (0, b.jsx)("pre", { children: re.data?.join("\n") || i.noLogs })
						]
					})
				]
			})]
		});
	}
	return o ? /* @__PURE__ */ (0, b.jsxs)("main", {
		className: I.root,
		children: [/* @__PURE__ */ (0, b.jsx)(Xr, {
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
				/* @__PURE__ */ (0, b.jsxs)(te, {
					as: "section",
					children: [/* @__PURE__ */ (0, b.jsxs)("h2", { children: [
						i.download,
						": ",
						Gr(S.data.requiredDownloadBytes, e)
					] }), /* @__PURE__ */ (0, b.jsx)("p", { children: i.variableTime })]
				}),
				/* @__PURE__ */ (0, b.jsxs)("fieldset", {
					className: I.fieldset,
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
				ne.length ? /* @__PURE__ */ (0, b.jsxs)("fieldset", {
					className: I.fieldset,
					children: [/* @__PURE__ */ (0, b.jsx)("legend", { children: i.licenses }), ne.map((e) => /* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("input", {
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
					className: I.consent,
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
					className: I.actions,
					children: [/* @__PURE__ */ (0, b.jsx)(T, {
						variant: "secondary",
						onClick: () => s(!1),
						children: i.back
					}), /* @__PURE__ */ (0, b.jsx)(T, {
						disabled: !D,
						loading: oe.isPending,
						loadingLabel: i.starting,
						onClick: () => oe.mutate({
							packId: S.data.packId,
							mode: "automatic",
							acceptedLicenseIds: ce,
							usePersonalComfyModels: f
						}),
						children: i.start
					})]
				})
			]
		})]
	}) : /* @__PURE__ */ (0, b.jsxs)("main", {
		className: I.root,
		children: [
			/* @__PURE__ */ (0, b.jsx)(Xr, {
				current: 0,
				messages: i
			}),
			/* @__PURE__ */ (0, b.jsxs)("section", {
				className: I.hero,
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
			/* @__PURE__ */ (0, b.jsxs)(te, {
				as: "section",
				children: [/* @__PURE__ */ (0, b.jsx)("h2", { children: i.machine }), /* @__PURE__ */ (0, b.jsxs)("dl", {
					className: I.machine,
					children: [
						/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.graphics }), /* @__PURE__ */ (0, b.jsx)("dd", { children: S.data.hardware.gpuName ?? i.unknown })] }),
						/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.memory }), /* @__PURE__ */ (0, b.jsx)("dd", { children: S.data.hardware.vramGb === null ? i.unknown : `${S.data.hardware.vramGb} GB` })] }),
						/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.disk }), /* @__PURE__ */ (0, b.jsx)("dd", { children: Gr(S.data.hardware.diskFreeBytes, e) })] }),
						/* @__PURE__ */ (0, b.jsxs)("div", { children: [/* @__PURE__ */ (0, b.jsx)("dt", { children: i.download }), /* @__PURE__ */ (0, b.jsx)("dd", { children: Gr(S.data.requiredDownloadBytes, e) })] })
					]
				})]
			}),
			/* @__PURE__ */ (0, b.jsxs)("section", {
				"aria-labelledby": "setup-capabilities",
				children: [/* @__PURE__ */ (0, b.jsx)("h2", {
					id: "setup-capabilities",
					children: i.capabilitiesTitle
				}), /* @__PURE__ */ (0, b.jsx)("div", {
					className: I.capabilities,
					children: i.capabilities.map(([e, t, n]) => {
						let r = Qr(e, S.data);
						return /* @__PURE__ */ (0, b.jsxs)(te, { children: [
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
			/* @__PURE__ */ (0, b.jsx)("div", {
				className: I.primaryAction,
				children: /* @__PURE__ */ (0, b.jsx)(T, {
					disabled: S.data.status === "incompatible",
					size: "large",
					onClick: () => s(!0),
					children: i.prepare
				})
			})
		]
	});
}
//#endregion
//#region src/app/kernel/AppKernelProvider.tsx
var ti = (0, _.createContext)(null);
function ni({ children: e, kernel: t }) {
	return /* @__PURE__ */ (0, b.jsx)(ti.Provider, {
		value: t,
		children: e
	});
}
function ri() {
	let e = (0, _.useContext)(ti);
	if (e === null) throw Error("AppKernelProvider is missing from the React tree.");
	return e;
}
function ii() {
	return ri().activeContext;
}
function ai() {
	let e = ii();
	return (0, _.useSyncExternalStore)(e.subscribe, e.getSnapshot, e.getSnapshot);
}
//#endregion
//#region src/app/kernel/LegacyAppKernel.ts
var oi = {
	projectId: null,
	seriesId: null,
	episodeId: null,
	shotId: null
};
function si(e, t) {
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
function ci(e, t) {
	return e.projectId === t.projectId && e.seriesId === t.seriesId && e.episodeId === t.episodeId && e.shotId === t.shotId;
}
function li(e) {
	return e.message ? e.title + " · " + e.message : e.title;
}
function ui(e) {
	return {
		running: "GENERATING",
		succeeded: "COMPLETED",
		failed: "FAILED",
		cancelled: "CANCELLED"
	}[e] ?? e;
}
function di(e = {}) {
	let t = e.bridge ?? new Wn({ host: e.host }), n = si(oi, ci), r = !1, i = 0, a = 0, o = [], s = (e) => {
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
					n.setSnapshot(oi);
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
			message: li(e),
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
						status: ui(r.status)
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
var fi = [
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
], pi = new Map(fi.map((e) => [e.path, e])), mi = new Map(fi.map((e) => [e.name, e])), hi = [
	["project", "projectId"],
	["series", "seriesId"],
	["episode", "episodeId"],
	["shot", "shotId"]
];
function gi(e) {
	return e?.trim() || void 0;
}
function _i(e) {
	let t = {};
	for (let [n, r] of hi) {
		let i = gi(e.get(n));
		i !== void 0 && (t[r] = i);
	}
	return t;
}
function vi(e) {
	let t = e.trim();
	if (t.startsWith("#")) return t.slice(1);
	let n = new URL(t || "/", "http://studio.local");
	return n.hash.startsWith("#/") ? n.hash.slice(1) : `${n.pathname}${n.search}`;
}
function yi(e) {
	let t = vi(e), n = new URL(t, "http://studio.local"), r = pi.get(n.pathname), i = _i(n.searchParams);
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
function bi(e) {
	let t = mi.get(e.name);
	if (t === void 0 || t.kind !== e.kind) throw Error(`Invalid Studio route: ${e.kind}/${e.name}`);
	let n = new URLSearchParams();
	for (let [t, r] of hi) {
		let i = gi(e.context[r] ?? null);
		i !== void 0 && n.set(t, i);
	}
	let r = n.toString();
	return `#${t.path}${r ? `?${r}` : ""}`;
}
function xi(e, t = {}) {
	let n = mi.get(e);
	if (n === void 0) throw Error(`Unknown Studio route: ${e}`);
	return {
		kind: n.kind,
		name: e,
		context: t
	};
}
//#endregion
//#region src/app/router/router.ts
function Si(e) {
	let t = /* @__PURE__ */ new Set(), n, r, i = () => {
		let t = e.location.hash;
		return (r === void 0 || t !== n) && (n = t, r = yi(t || "#/create")), r;
	}, a = () => {
		n = void 0, t.forEach((e) => {
			e();
		});
	};
	return e.addEventListener("hashchange", a), e.addEventListener("popstate", a), {
		getSnapshot: i,
		navigate(t, n = {}) {
			let r = bi(t), o = i();
			r !== (o.kind === "not-found" ? void 0 : bi(o)) && (n.replace ? e.history.replaceState(null, "", r) : e.history.pushState(null, "", r), a());
		},
		subscribe(e) {
			return t.add(e), () => t.delete(e);
		}
	};
}
//#endregion
//#region src/app/router/messages.ts
var Ci = {
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
function wi(e) {
	return e?.toLowerCase().startsWith("en") ? "en" : "fr";
}
function Ti(e) {
	return Ci[wi(e)];
}
//#endregion
//#region src/app/shell/studioCatalog.ts
function Ei(e) {
	return typeof e == "object" && e && !Array.isArray(e) ? e : {};
}
function Di(e) {
	return typeof e == "string" && e.trim() ? e : null;
}
function Oi(e) {
	let t = Ei(e).projects;
	return Array.isArray(t) ? t.flatMap((e) => {
		let t = Ei(e), n = Di(t.id);
		return n ? [{
			id: n,
			name: Di(t.name) ?? n
		}] : [];
	}) : [];
}
function ki(e) {
	let t = Ei(e).episodes;
	return Array.isArray(t) ? t.flatMap((e) => {
		let t = Ei(e), n = Di(t.id);
		return n ? [{
			id: n,
			title: Di(t.title) ?? n,
			seriesId: Di(t.series_id)
		}] : [];
	}) : [];
}
function Ai(e) {
	let t = Ei(e);
	return {
		enabled: typeof t.enabled == "boolean" ? t.enabled : null,
		serviceCount: Array.isArray(t.services) ? t.services.length : 0
	};
}
function ji(e) {
	return {
		projects: An({
			queryKey: ["studio-shell", "projects"],
			queryFn: ze,
			select: Oi
		}),
		episodes: An({
			enabled: e !== null,
			queryKey: [
				"studio-shell",
				"episodes",
				e
			],
			queryFn: xe,
			select: ki
		})
	};
}
function Mi() {
	return An({
		queryKey: ["studio-shell", "runtime"],
		queryFn: at,
		refetchInterval: 3e4,
		select: Ai
	});
}
var L = {
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
function Ni({ labels: e, onOpenShot: t }) {
	let n = ai(), r = ii(), { projects: i, episodes: a } = ji(n.projectId);
	return /* @__PURE__ */ (0, b.jsxs)("nav", {
		"aria-label": e.context,
		className: L.contextBar,
		"data-context-bar": !0,
		children: [
			/* @__PURE__ */ (0, b.jsxs)("label", {
				className: L.contextControl,
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
				className: L.contextValue,
				children: [/* @__PURE__ */ (0, b.jsx)("small", { children: e.series }), /* @__PURE__ */ (0, b.jsx)("strong", { children: n.seriesId ?? e.noSeries })]
			}),
			/* @__PURE__ */ (0, b.jsxs)("label", {
				className: L.contextControl,
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
				className: L.contextLink,
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
var Pi = {
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
function R(e) {
	return Pi[wi(e)];
}
//#endregion
//#region src/app/shell/PrimaryNavigation.tsx
var z = [
	"create",
	"produce",
	"results"
];
function Fi({ messages: e, route: t, onNavigate: n }) {
	return /* @__PURE__ */ (0, b.jsx)("nav", {
		"aria-label": e.navigation.primaryName,
		className: L.primaryNavigation,
		"data-primary-navigation": !0,
		children: z.map((r) => /* @__PURE__ */ (0, b.jsx)("button", {
			"aria-current": t.kind !== "not-found" && t.name === r ? "page" : void 0,
			onClick: () => n(r),
			type: "button",
			children: e.routes[r]
		}, r))
	});
}
//#endregion
//#region src/app/shell/RuntimeStatus.tsx
function Ii({ labels: e }) {
	let t = Mi(), n = t.isPending ? "checking" : t.isError || t.data?.enabled === !1 ? "unavailable" : "ready", r = e[n];
	return /* @__PURE__ */ (0, b.jsxs)("output", {
		"aria-label": `${e.runtime}: ${r}`,
		className: L.runtimeStatus,
		"data-state": n,
		children: [/* @__PURE__ */ (0, b.jsx)("span", { "aria-hidden": "true" }), r]
	});
}
//#endregion
//#region src/app/shell/ToolsMenu.tsx
var Li = [
	"assets",
	"journal",
	"guide",
	"demo",
	"writing",
	"services"
];
function Ri({ labels: e, onNavigate: t }) {
	return /* @__PURE__ */ (0, b.jsxs)("details", {
		className: L.toolsMenu,
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
				Li.map((t) => /* @__PURE__ */ (0, b.jsx)("button", {
					onClick: () => Fn(t),
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
function zi() {
	return wi(typeof document > "u" ? void 0 : document.documentElement.lang);
}
function Bi() {
	let [e, t] = (0, _.useState)(zi);
	return (0, _.useEffect)(() => {
		let e = (e) => {
			let n = e.detail;
			t(wi(n?.locale ?? n?.language ?? zi()));
		};
		return window.addEventListener("studio:language-changed", e), () => window.removeEventListener("studio:language-changed", e);
	}, []), [e, (e) => {
		window.dispatchEvent(new CustomEvent("studio:language-change-request", { detail: { locale: e } })), t(e);
	}];
}
//#endregion
//#region src/app/StudioShell.tsx
var Vi = {
	create: "guided",
	produce: "plan",
	results: "outputs",
	bible: "bible",
	settings: "settings",
	graph: "graph"
}, Hi = {
	guided: "#guided-workspace",
	graph: "[data-desktop-panel=\"graph\"]",
	plan: "[data-desktop-panel=\"plan\"]",
	outputs: "[data-desktop-panel=\"outputs\"]",
	bible: "#bible-workspace",
	settings: "[data-desktop-panel=\"settings\"]"
};
function Ui() {
	return Si(window);
}
function Wi(e) {
	return {
		projectId: e.projectId ?? void 0,
		seriesId: e.seriesId ?? void 0,
		episodeId: e.episodeId ?? void 0,
		shotId: e.shotId ?? void 0
	};
}
function Gi({ router: e, resolveLegacyRoot: t = (e) => document.querySelector(e) }) {
	let [n] = (0, _.useState)(Ui), r = e ?? n, i = (0, _.useSyncExternalStore)(r.subscribe, r.getSnapshot, r.getSnapshot), a = ri(), o = ai(), s = (0, _.useRef)(i), [c, l] = (0, _.useState)(!1), [u, d] = Bi(), f = Ti(u), p = R(u), m = ji(o.projectId);
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
		c && i.kind !== "not-found" && r.navigate(xi(i.name, Wi(o)), { replace: !0 });
	}, [
		o,
		c,
		i,
		r
	]);
	let h = (e) => {
		r.navigate(xi(e, Wi(o)));
	}, g = (e) => Fn(e), v = (() => {
		if (i.kind === "not-found") return /* @__PURE__ */ (0, b.jsx)(O, {
			action: /* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => h("create"),
				children: f.notFound.backToCreate
			}),
			className: L.routeState,
			description: f.notFound.description,
			title: f.notFound.title
		});
		if (m.projects.isSuccess && m.projects.data.length === 0) return /* @__PURE__ */ (0, b.jsx)(ce, {
			action: /* @__PURE__ */ (0, b.jsx)(T, {
				onClick: () => g("project-new"),
				children: p.createProject
			}),
			className: L.routeState,
			description: p.noProjectDescription,
			title: p.noProjectTitle
		});
		if (i.name === "create") return /* @__PURE__ */ (0, b.jsx)(ei, {
			locale: u,
			readyContent: /* @__PURE__ */ (0, b.jsx)(zr, {
				locale: u,
				onNavigate: h
			})
		});
		if (i.name === "bible") return /* @__PURE__ */ (0, b.jsx)(dr, {
			advancedView: /* @__PURE__ */ (0, b.jsx)(qn, {
				"aria-label": f.routes.bible,
				className: L.workspaceSlot,
				kernel: a,
				resolveLegacyRoot: () => t(Hi.bible),
				unavailable: /* @__PURE__ */ (0, b.jsx)(O, {
					description: f.notFound.description,
					title: f.routes.bible
				}),
				view: "bible"
			}),
			locale: u
		});
		let e = Vi[i.name], n = Hi[e];
		return /* @__PURE__ */ (0, b.jsx)(qn, {
			"aria-label": f.routes[i.name],
			className: L.workspaceSlot,
			kernel: a,
			resolveLegacyRoot: () => t(n),
			unavailable: /* @__PURE__ */ (0, b.jsx)(O, {
				description: f.notFound.description,
				title: f.routes[i.name]
			}),
			view: e
		}, e);
	})();
	return /* @__PURE__ */ (0, b.jsxs)("div", {
		className: L.shell,
		"data-studio-shell": !0,
		children: [/* @__PURE__ */ (0, b.jsxs)("header", {
			className: L.header,
			children: [
				/* @__PURE__ */ (0, b.jsxs)("a", {
					className: L.brand,
					href: "#/create",
					children: [/* @__PURE__ */ (0, b.jsx)("span", {
						"aria-hidden": "true",
						className: L.brandMark,
						children: "SV"
					}), /* @__PURE__ */ (0, b.jsxs)("span", {
						className: L.brandText,
						children: [/* @__PURE__ */ (0, b.jsx)("strong", { children: p.brand }), /* @__PURE__ */ (0, b.jsx)("small", { children: p.studio })]
					})]
				}),
				/* @__PURE__ */ (0, b.jsx)(Fi, {
					messages: f,
					onNavigate: h,
					route: i
				}),
				/* @__PURE__ */ (0, b.jsxs)("div", {
					className: L.actions,
					children: [
						/* @__PURE__ */ (0, b.jsx)(Ii, { labels: p.runtime }),
						/* @__PURE__ */ (0, b.jsx)(Ri, {
							labels: p.tools,
							onNavigate: h
						}),
						/* @__PURE__ */ (0, b.jsxs)("label", { children: [/* @__PURE__ */ (0, b.jsx)("span", {
							className: "sr-only",
							children: p.language
						}), /* @__PURE__ */ (0, b.jsxs)("select", {
							"aria-label": p.language,
							className: L.languageSelect,
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
				/* @__PURE__ */ (0, b.jsx)(Ni, {
					labels: p.context,
					onOpenShot: () => h("produce")
				})
			]
		}), v]
	});
}
//#endregion
//#region src/app/StudioReactRoot.tsx
function Ki() {
	let e = ai();
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
function qi() {
	let [e] = (0, _.useState)(di);
	return (0, _.useEffect)(() => (e.start(), () => e.dispose()), [e]), /* @__PURE__ */ (0, b.jsx)(ni, {
		kernel: e.kernel,
		children: /* @__PURE__ */ (0, b.jsxs)(ft, {
			client: Nn,
			children: [
				/* @__PURE__ */ (0, b.jsx)(Ki, {}),
				/* @__PURE__ */ (0, b.jsx)(Gi, {}),
				gr.map(({ Component: e, id: t }) => /* @__PURE__ */ (0, b.jsx)(e, {}, t))
			]
		})
	});
}
function Ji() {
	return /* @__PURE__ */ (0, b.jsx)(qi, {});
}
//#endregion
//#region src/main.tsx
var Yi = document.getElementById("studio-react-root");
Yi && (Yi.dataset.reactMounted = "true", (0, v.createRoot)(Yi).render(/* @__PURE__ */ (0, b.jsx)(_.StrictMode, { children: /* @__PURE__ */ (0, b.jsx)(Ji, {}) })));
//#endregion
