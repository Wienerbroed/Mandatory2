
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	/** @returns {void} */
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/** @returns {void} */
	function validate_store(store, name) {
		if (store != null && typeof store.subscribe !== 'function') {
			throw new Error(`'${name}' is not a store with a 'subscribe' method`);
		}
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/**
	 * Get the current value from a store by subscribing and immediately unsubscribing.
	 *
	 * https://svelte.dev/docs/svelte-store#get
	 * @template T
	 * @param {import('../store/public.js').Readable<T>} store
	 * @returns {T}
	 */
	function get_store_value(store) {
		let value;
		subscribe(store, (_) => (value = _))();
		return value;
	}

	/** @returns {void} */
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}

	function create_slot(definition, ctx, $$scope, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, $$scope, fn) {
		return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
	}

	function get_slot_changes(definition, $$scope, dirty, fn) {
		if (definition[2] && fn) {
			const lets = definition[2](fn(dirty));
			if ($$scope.dirty === undefined) {
				return lets;
			}
			if (typeof lets === 'object') {
				const merged = [];
				const len = Math.max($$scope.dirty.length, lets.length);
				for (let i = 0; i < len; i += 1) {
					merged[i] = $$scope.dirty[i] | lets[i];
				}
				return merged;
			}
			return $$scope.dirty | lets;
		}
		return $$scope.dirty;
	}

	/** @returns {void} */
	function update_slot_base(
		slot,
		slot_definition,
		ctx,
		$$scope,
		slot_changes,
		get_slot_context_fn
	) {
		if (slot_changes) {
			const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
			slot.p(slot_context, slot_changes);
		}
	}

	/** @returns {any[] | -1} */
	function get_all_dirty_from_scope($$scope) {
		if ($$scope.ctx.length > 32) {
			const dirty = [];
			const length = $$scope.ctx.length / 32;
			for (let i = 0; i < length; i++) {
				dirty[i] = -1;
			}
			return dirty;
		}
		return -1;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @returns {(event: any) => any} */
	function prevent_default(fn) {
		return function (event) {
			event.preventDefault();
			// @ts-ignore
			return fn.call(this, event);
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}
	/**
	 * List of attributes that should always be set through the attr method,
	 * because updating them through the property setter doesn't work reliably.
	 * In the example of `width`/`height`, the problem is that the setter only
	 * accepts numeric values, but the attribute can also be set to a string like `50%`.
	 * If this list becomes too big, rethink this approach.
	 */
	const always_set_through_set_attribute = ['width', 'height'];

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {{ [x: string]: string }} attributes
	 * @returns {void}
	 */
	function set_attributes(node, attributes) {
		// @ts-ignore
		const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
		for (const key in attributes) {
			if (attributes[key] == null) {
				node.removeAttribute(key);
			} else if (key === 'style') {
				node.style.cssText = attributes[key];
			} else if (key === '__value') {
				/** @type {any} */ (node).value = node[key] = attributes[key];
			} else if (
				descriptors[key] &&
				descriptors[key].set &&
				always_set_through_set_attribute.indexOf(key) === -1
			) {
				node[key] = attributes[key];
			} else {
				attr(node, key, attributes[key]);
			}
		}
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	/**
	 * Schedules a callback to run immediately before the component is unmounted.
	 *
	 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
	 * only one that runs inside a server-side component.
	 *
	 * https://svelte.dev/docs/svelte#ondestroy
	 * @param {() => any} fn
	 * @returns {void}
	 */
	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	/**
	 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs#template-syntax-component-directives-on-eventname).
	 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
	 *
	 * Component events created with `createEventDispatcher` create a
	 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
	 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
	 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
	 * property and can contain any type of data.
	 *
	 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
	 * ```ts
	 * const dispatch = createEventDispatcher<{
	 *  loaded: never; // does not take a detail argument
	 *  change: string; // takes a detail argument of type string, which is required
	 *  optional: number | null; // takes an optional detail argument of type number
	 * }>();
	 * ```
	 *
	 * https://svelte.dev/docs/svelte#createeventdispatcher
	 * @template {Record<string, any>} [EventMap=any]
	 * @returns {import('./public.js').EventDispatcher<EventMap>}
	 */
	function createEventDispatcher() {
		const component = get_current_component();
		return (type, detail, { cancelable = false } = {}) => {
			const callbacks = component.$$.callbacks[type];
			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
				callbacks.slice().forEach((fn) => {
					fn.call(component, event);
				});
				return !event.defaultPrevented;
			}
			return true;
		};
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update$1(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update$1($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function outro_and_destroy_block(block, lookup) {
		transition_out(block, 1, 1, () => {
			lookup.delete(block.key);
		});
	}

	/** @returns {any[]} */
	function update_keyed_each(
		old_blocks,
		dirty,
		get_key,
		dynamic,
		ctx,
		list,
		lookup,
		node,
		destroy,
		create_each_block,
		next,
		get_context
	) {
		let o = old_blocks.length;
		let n = list.length;
		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;
		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();
		const updates = [];
		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);
			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				// defer updates until all the DOM shuffling is done
				updates.push(() => block.p(child_ctx, dirty));
			}
			new_lookup.set(key, (new_blocks[i] = block));
			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}
		const will_move = new Set();
		const did_move = new Set();
		/** @returns {void} */
		function insert(block) {
			transition_in(block, 1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}
		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;
			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			} else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			} else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			} else if (did_move.has(old_key)) {
				o--;
			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);
			} else {
				will_move.add(old_key);
				o--;
			}
		}
		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}
		while (n) insert(new_blocks[n - 1]);
		run_all(updates);
		return new_blocks;
	}

	/** @returns {void} */
	function validate_each_keys(ctx, list, get_context, get_key) {
		const keys = new Map();
		for (let i = 0; i < list.length; i++) {
			const key = get_key(get_context(ctx, list, i));
			if (keys.has(key)) {
				let value = '';
				try {
					value = `with value '${String(key)}' `;
				} catch (e) {
					// can't stringify
				}
				throw new Error(
					`Cannot have duplicate keys in a keyed each: Keys at index ${keys.get(
					key
				)} and ${i} ${value}are duplicates`
				);
			}
			keys.set(key, i);
		}
	}

	/** @returns {{}} */
	function get_spread_update(levels, updates) {
		const update = {};
		const to_null_out = {};
		const accounted_for = { $$scope: 1 };
		let i = levels.length;
		while (i--) {
			const o = levels[i];
			const n = updates[i];
			if (n) {
				for (const key in o) {
					if (!(key in n)) to_null_out[key] = 1;
				}
				for (const key in n) {
					if (!accounted_for[key]) {
						update[key] = n[key];
						accounted_for[key] = 1;
					}
				}
				levels[i] = n;
			} else {
				for (const key in o) {
					accounted_for[key] = 1;
				}
			}
		}
		for (const key in to_null_out) {
			if (!(key in update)) update[key] = undefined;
		}
		return update;
	}

	function get_spread_object(spread_props) {
		return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.20';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Node} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @param {boolean} [has_prevent_default]
	 * @param {boolean} [has_stop_propagation]
	 * @param {boolean} [has_stop_immediate_propagation]
	 * @returns {() => void}
	 */
	function listen_dev(
		node,
		event,
		handler,
		options,
		has_prevent_default,
		has_stop_propagation,
		has_stop_immediate_propagation
	) {
		const modifiers =
			options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default) modifiers.push('preventDefault');
		if (has_stop_propagation) modifiers.push('stopPropagation');
		if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
			dispose();
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data) return;
		dispatch_dev('SvelteDOMSetData', { node: text, data });
		text.data = /** @type {string} */ (data);
	}

	function ensure_array_like_dev(arg) {
		if (
			typeof arg !== 'string' &&
			!(arg && typeof arg === 'object' && 'length' in arg) &&
			!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
		) {
			throw new Error('{#each} only works with iterable values.');
		}
		return ensure_array_like(arg);
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	function construct_svelte_component_dev(component, props) {
		const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
		try {
			const instance = new component(props);
			if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
				throw new Error(error_message);
			}
			return instance;
		} catch (err) {
			const { message } = err;
			if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
				throw new Error(error_message);
			} else {
				throw err;
			}
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	const subscriber_queue = [];

	/**
	 * Creates a `Readable` store that allows reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#readable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Readable<T>}
	 */
	function readable(value, start) {
		return {
			subscribe: writable(value, start).subscribe
		};
	}

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	/**
	 * Derived value store by synchronizing one or more readable stores and
	 * applying an aggregation function over its input values.
	 *
	 * https://svelte.dev/docs/svelte-store#derived
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @overload
	 * @param {S} stores - input stores
	 * @param {(values: import('./private.js').StoresValues<S>, set: (value: T) => void, update: (fn: import('./public.js').Updater<T>) => void) => import('./public.js').Unsubscriber | void} fn - function callback that aggregates the values
	 * @param {T} [initial_value] - initial value
	 * @returns {import('./public.js').Readable<T>}
	 */

	/**
	 * Derived value store by synchronizing one or more readable stores and
	 * applying an aggregation function over its input values.
	 *
	 * https://svelte.dev/docs/svelte-store#derived
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @overload
	 * @param {S} stores - input stores
	 * @param {(values: import('./private.js').StoresValues<S>) => T} fn - function callback that aggregates the values
	 * @param {T} [initial_value] - initial value
	 * @returns {import('./public.js').Readable<T>}
	 */

	/**
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @param {S} stores
	 * @param {Function} fn
	 * @param {T} [initial_value]
	 * @returns {import('./public.js').Readable<T>}
	 */
	function derived(stores, fn, initial_value) {
		const single = !Array.isArray(stores);
		/** @type {Array<import('./public.js').Readable<any>>} */
		const stores_array = single ? [stores] : stores;
		if (!stores_array.every(Boolean)) {
			throw new Error('derived() expects stores as input, got a falsy value');
		}
		const auto = fn.length < 2;
		return readable(initial_value, (set, update) => {
			let started = false;
			const values = [];
			let pending = 0;
			let cleanup = noop;
			const sync = () => {
				if (pending) {
					return;
				}
				cleanup();
				const result = fn(single ? values[0] : values, set, update);
				if (auto) {
					set(result);
				} else {
					cleanup = is_function(result) ? result : noop;
				}
			};
			const unsubscribers = stores_array.map((store, i) =>
				subscribe(
					store,
					(value) => {
						values[i] = value;
						pending &= ~(1 << i);
						if (started) {
							sync();
						}
					},
					() => {
						pending |= 1 << i;
					}
				)
			);
			started = true;
			sync();
			return function stop() {
				run_all(unsubscribers);
				cleanup();
				// We need to set this to false because callbacks can still happen despite having unsubscribed:
				// Callbacks might already be placed in the queue which doesn't know it should no longer
				// invoke this derived store.
				started = false;
			};
		});
	}

	/**
	 * @external Store
	 * @see [Svelte stores](https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract)
	 */

	/**
	 * Create a store similar to [Svelte's `derived`](https://svelte.dev/docs#run-time-svelte-store-writable),
	 * but which has its own `set` and `update` methods and can send values back to the origin stores.
	 * [Read more...](https://github.com/PixievoltNo1/svelte-writable-derived#default-export-writablederived)
	 * 
	 * @param {Store|Store[]} origins One or more stores to derive from. Same as
	 * [`derived`](https://svelte.dev/docs#run-time-svelte-store-writable)'s 1st parameter.
	 * @param {!Function} derive The callback to determine the derived value. Same as
	 * [`derived`](https://svelte.dev/docs#run-time-svelte-store-writable)'s 2nd parameter.
	 * @param {!Function} reflect Called when the derived store gets a new value via its `set` or
	 * `update` methods, and determines new values for the origin stores.
	 * [Read more...](https://github.com/PixievoltNo1/svelte-writable-derived#new-parameter-reflect)
	 * @param [initial] The new store's initial value. Same as
	 * [`derived`](https://svelte.dev/docs#run-time-svelte-store-writable)'s 3rd parameter.
	 * 
	 * @returns {Store} A writable store.
	 */
	function writableDerived(origins, derive, reflect, initial) {
		var childDerivedSetter, originValues, blockNextDerive = false;
		var reflectOldValues = reflect.length >= 2;
		var wrappedDerive = (got, set, update) => {
			childDerivedSetter = set;
			if (reflectOldValues) {
				originValues = got;
			}
			if (!blockNextDerive) {
				let returned = derive(got, set, update);
				if (derive.length < 2) {
					set(returned);
				} else {
					return returned;
				}
			}
			blockNextDerive = false;
		};
		var childDerived = derived(origins, wrappedDerive, initial);
		
		var singleOrigin = !Array.isArray(origins);
		function doReflect(reflecting) {
			var setWith = reflect(reflecting, originValues);
			if (singleOrigin) {
				blockNextDerive = true;
				origins.set(setWith);
			} else {
				setWith.forEach( (value, i) => {
					blockNextDerive = true;
					origins[i].set(value);
				} );
			}
			blockNextDerive = false;
		}
		
		var tryingSet = false;
		function update(fn) {
			var isUpdated, mutatedBySubscriptions, oldValue, newValue;
			if (tryingSet) {
				newValue = fn( get_store_value(childDerived) );
				childDerivedSetter(newValue);
				return;
			}
			var unsubscribe = childDerived.subscribe( (value) => {
				if (!tryingSet) {
					oldValue = value;
				} else if (!isUpdated) {
					isUpdated = true;
				} else {
					mutatedBySubscriptions = true;
				}
			} );
			newValue = fn(oldValue);
			tryingSet = true;
			childDerivedSetter(newValue);
			unsubscribe();
			tryingSet = false;
			if (mutatedBySubscriptions) {
				newValue = get_store_value(childDerived);
			}
			if (isUpdated) {
				doReflect(newValue);
			}
		}
		return {
			subscribe: childDerived.subscribe,
			set(value) { update( () => value ); },
			update,
		};
	}

	const TOAST_LIMIT = 20;
	const toasts = writable([]);
	const pausedAt = writable(null);
	const toastTimeouts = new Map();
	const addToRemoveQueue = (toastId) => {
	    if (toastTimeouts.has(toastId)) {
	        return;
	    }
	    const timeout = setTimeout(() => {
	        toastTimeouts.delete(toastId);
	        remove(toastId);
	    }, 1000);
	    toastTimeouts.set(toastId, timeout);
	};
	const clearFromRemoveQueue = (toastId) => {
	    const timeout = toastTimeouts.get(toastId);
	    if (timeout) {
	        clearTimeout(timeout);
	    }
	};
	function update(toast) {
	    if (toast.id) {
	        clearFromRemoveQueue(toast.id);
	    }
	    toasts.update(($toasts) => $toasts.map((t) => (t.id === toast.id ? { ...t, ...toast } : t)));
	}
	function add(toast) {
	    toasts.update(($toasts) => [toast, ...$toasts].slice(0, TOAST_LIMIT));
	}
	function upsert(toast) {
	    if (get_store_value(toasts).find((t) => t.id === toast.id)) {
	        update(toast);
	    }
	    else {
	        add(toast);
	    }
	}
	function dismiss(toastId) {
	    toasts.update(($toasts) => {
	        if (toastId) {
	            addToRemoveQueue(toastId);
	        }
	        else {
	            $toasts.forEach((toast) => {
	                addToRemoveQueue(toast.id);
	            });
	        }
	        return $toasts.map((t) => t.id === toastId || toastId === undefined ? { ...t, visible: false } : t);
	    });
	}
	function remove(toastId) {
	    toasts.update(($toasts) => {
	        if (toastId === undefined) {
	            return [];
	        }
	        return $toasts.filter((t) => t.id !== toastId);
	    });
	}
	function startPause(time) {
	    pausedAt.set(time);
	}
	function endPause(time) {
	    let diff;
	    pausedAt.update(($pausedAt) => {
	        diff = time - ($pausedAt || 0);
	        return null;
	    });
	    toasts.update(($toasts) => $toasts.map((t) => ({
	        ...t,
	        pauseDuration: t.pauseDuration + diff
	    })));
	}
	const defaultTimeouts = {
	    blank: 4000,
	    error: 4000,
	    success: 2000,
	    loading: Infinity,
	    custom: 4000
	};
	function useToasterStore(toastOptions = {}) {
	    const mergedToasts = writableDerived(toasts, ($toasts) => $toasts.map((t) => ({
	        ...toastOptions,
	        ...toastOptions[t.type],
	        ...t,
	        duration: t.duration ||
	            toastOptions[t.type]?.duration ||
	            toastOptions?.duration ||
	            defaultTimeouts[t.type],
	        style: [toastOptions.style, toastOptions[t.type]?.style, t.style].join(';')
	    })), ($toasts) => $toasts);
	    return {
	        toasts: mergedToasts,
	        pausedAt
	    };
	}

	const isFunction = (valOrFunction) => typeof valOrFunction === 'function';
	const resolveValue = (valOrFunction, arg) => (isFunction(valOrFunction) ? valOrFunction(arg) : valOrFunction);

	const genId = (() => {
	    let count = 0;
	    return () => {
	        count += 1;
	        return count.toString();
	    };
	})();
	const prefersReducedMotion = (() => {
	    // Cache result
	    let shouldReduceMotion;
	    return () => {
	        if (shouldReduceMotion === undefined && typeof window !== 'undefined') {
	            const mediaQuery = matchMedia('(prefers-reduced-motion: reduce)');
	            shouldReduceMotion = !mediaQuery || mediaQuery.matches;
	        }
	        return shouldReduceMotion;
	    };
	})();

	const createToast = (message, type = 'blank', opts) => ({
	    createdAt: Date.now(),
	    visible: true,
	    type,
	    ariaProps: {
	        role: 'status',
	        'aria-live': 'polite'
	    },
	    message,
	    pauseDuration: 0,
	    ...opts,
	    id: opts?.id || genId()
	});
	const createHandler = (type) => (message, options) => {
	    const toast = createToast(message, type, options);
	    upsert(toast);
	    return toast.id;
	};
	const toast = (message, opts) => createHandler('blank')(message, opts);
	toast.error = createHandler('error');
	toast.success = createHandler('success');
	toast.loading = createHandler('loading');
	toast.custom = createHandler('custom');
	toast.dismiss = (toastId) => {
	    dismiss(toastId);
	};
	toast.remove = (toastId) => remove(toastId);
	toast.promise = (promise, msgs, opts) => {
	    const id = toast.loading(msgs.loading, { ...opts, ...opts?.loading });
	    promise
	        .then((p) => {
	        toast.success(resolveValue(msgs.success, p), {
	            id,
	            ...opts,
	            ...opts?.success
	        });
	        return p;
	    })
	        .catch((e) => {
	        toast.error(resolveValue(msgs.error, e), {
	            id,
	            ...opts,
	            ...opts?.error
	        });
	    });
	    return promise;
	};

	function calculateOffset(toast, $toasts, opts) {
	    const { reverseOrder, gutter = 8, defaultPosition } = opts || {};
	    const relevantToasts = $toasts.filter((t) => (t.position || defaultPosition) === (toast.position || defaultPosition) && t.height);
	    const toastIndex = relevantToasts.findIndex((t) => t.id === toast.id);
	    const toastsBefore = relevantToasts.filter((toast, i) => i < toastIndex && toast.visible).length;
	    const offset = relevantToasts
	        .filter((t) => t.visible)
	        .slice(...(reverseOrder ? [toastsBefore + 1] : [0, toastsBefore]))
	        .reduce((acc, t) => acc + (t.height || 0) + gutter, 0);
	    return offset;
	}
	const handlers = {
	    startPause() {
	        startPause(Date.now());
	    },
	    endPause() {
	        endPause(Date.now());
	    },
	    updateHeight: (toastId, height) => {
	        update({ id: toastId, height });
	    },
	    calculateOffset
	};
	function useToaster(toastOptions) {
	    const { toasts, pausedAt } = useToasterStore(toastOptions);
	    const timeouts = new Map();
	    let _pausedAt;
	    const unsubscribes = [
	        pausedAt.subscribe(($pausedAt) => {
	            if ($pausedAt) {
	                for (const [, timeoutId] of timeouts) {
	                    clearTimeout(timeoutId);
	                }
	                timeouts.clear();
	            }
	            _pausedAt = $pausedAt;
	        }),
	        toasts.subscribe(($toasts) => {
	            if (_pausedAt) {
	                return;
	            }
	            const now = Date.now();
	            for (const t of $toasts) {
	                if (timeouts.has(t.id)) {
	                    continue;
	                }
	                if (t.duration === Infinity) {
	                    continue;
	                }
	                const durationLeft = (t.duration || 0) + t.pauseDuration - (now - t.createdAt);
	                if (durationLeft < 0) {
	                    if (t.visible) {
	                        // FIXME: This causes a recursive cycle of updates.
	                        toast.dismiss(t.id);
	                    }
	                    return null;
	                }
	                timeouts.set(t.id, setTimeout(() => toast.dismiss(t.id), durationLeft));
	            }
	        })
	    ];
	    onDestroy(() => {
	        for (const unsubscribe of unsubscribes) {
	            unsubscribe();
	        }
	    });
	    return { toasts, handlers };
	}

	/* node_modules\svelte-french-toast\dist\components\CheckmarkIcon.svelte generated by Svelte v4.2.20 */
	const file$c = "node_modules\\svelte-french-toast\\dist\\components\\CheckmarkIcon.svelte";

	function create_fragment$c(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "svelte-11kvm4p");
				set_style(div, "--primary", /*primary*/ ctx[0]);
				set_style(div, "--secondary", /*secondary*/ ctx[1]);
				add_location(div, file$c, 5, 0, 148);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*primary*/ 1) {
					set_style(div, "--primary", /*primary*/ ctx[0]);
				}

				if (dirty & /*secondary*/ 2) {
					set_style(div, "--secondary", /*secondary*/ ctx[1]);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$c.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$c($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('CheckmarkIcon', slots, []);
		let { primary = "#61d345" } = $$props;
		let { secondary = "#fff" } = $$props;
		const writable_props = ['primary', 'secondary'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CheckmarkIcon> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('primary' in $$props) $$invalidate(0, primary = $$props.primary);
			if ('secondary' in $$props) $$invalidate(1, secondary = $$props.secondary);
		};

		$$self.$capture_state = () => ({ primary, secondary });

		$$self.$inject_state = $$props => {
			if ('primary' in $$props) $$invalidate(0, primary = $$props.primary);
			if ('secondary' in $$props) $$invalidate(1, secondary = $$props.secondary);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [primary, secondary];
	}

	class CheckmarkIcon extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$c, create_fragment$c, safe_not_equal, { primary: 0, secondary: 1 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "CheckmarkIcon",
				options,
				id: create_fragment$c.name
			});
		}

		get primary() {
			throw new Error("<CheckmarkIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set primary(value) {
			throw new Error("<CheckmarkIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get secondary() {
			throw new Error("<CheckmarkIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set secondary(value) {
			throw new Error("<CheckmarkIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules\svelte-french-toast\dist\components\ErrorIcon.svelte generated by Svelte v4.2.20 */
	const file$b = "node_modules\\svelte-french-toast\\dist\\components\\ErrorIcon.svelte";

	function create_fragment$b(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "svelte-1ee93ns");
				set_style(div, "--primary", /*primary*/ ctx[0]);
				set_style(div, "--secondary", /*secondary*/ ctx[1]);
				add_location(div, file$b, 5, 0, 148);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*primary*/ 1) {
					set_style(div, "--primary", /*primary*/ ctx[0]);
				}

				if (dirty & /*secondary*/ 2) {
					set_style(div, "--secondary", /*secondary*/ ctx[1]);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$b.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$b($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ErrorIcon', slots, []);
		let { primary = "#ff4b4b" } = $$props;
		let { secondary = "#fff" } = $$props;
		const writable_props = ['primary', 'secondary'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ErrorIcon> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('primary' in $$props) $$invalidate(0, primary = $$props.primary);
			if ('secondary' in $$props) $$invalidate(1, secondary = $$props.secondary);
		};

		$$self.$capture_state = () => ({ primary, secondary });

		$$self.$inject_state = $$props => {
			if ('primary' in $$props) $$invalidate(0, primary = $$props.primary);
			if ('secondary' in $$props) $$invalidate(1, secondary = $$props.secondary);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [primary, secondary];
	}

	class ErrorIcon extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$b, create_fragment$b, safe_not_equal, { primary: 0, secondary: 1 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ErrorIcon",
				options,
				id: create_fragment$b.name
			});
		}

		get primary() {
			throw new Error("<ErrorIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set primary(value) {
			throw new Error("<ErrorIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get secondary() {
			throw new Error("<ErrorIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set secondary(value) {
			throw new Error("<ErrorIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules\svelte-french-toast\dist\components\LoaderIcon.svelte generated by Svelte v4.2.20 */
	const file$a = "node_modules\\svelte-french-toast\\dist\\components\\LoaderIcon.svelte";

	function create_fragment$a(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "svelte-1j7dflg");
				set_style(div, "--primary", /*primary*/ ctx[0]);
				set_style(div, "--secondary", /*secondary*/ ctx[1]);
				add_location(div, file$a, 5, 0, 151);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*primary*/ 1) {
					set_style(div, "--primary", /*primary*/ ctx[0]);
				}

				if (dirty & /*secondary*/ 2) {
					set_style(div, "--secondary", /*secondary*/ ctx[1]);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$a.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$a($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('LoaderIcon', slots, []);
		let { primary = "#616161" } = $$props;
		let { secondary = "#e0e0e0" } = $$props;
		const writable_props = ['primary', 'secondary'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LoaderIcon> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('primary' in $$props) $$invalidate(0, primary = $$props.primary);
			if ('secondary' in $$props) $$invalidate(1, secondary = $$props.secondary);
		};

		$$self.$capture_state = () => ({ primary, secondary });

		$$self.$inject_state = $$props => {
			if ('primary' in $$props) $$invalidate(0, primary = $$props.primary);
			if ('secondary' in $$props) $$invalidate(1, secondary = $$props.secondary);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [primary, secondary];
	}

	class LoaderIcon extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$a, create_fragment$a, safe_not_equal, { primary: 0, secondary: 1 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "LoaderIcon",
				options,
				id: create_fragment$a.name
			});
		}

		get primary() {
			throw new Error("<LoaderIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set primary(value) {
			throw new Error("<LoaderIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get secondary() {
			throw new Error("<LoaderIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set secondary(value) {
			throw new Error("<LoaderIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules\svelte-french-toast\dist\components\ToastIcon.svelte generated by Svelte v4.2.20 */
	const file$9 = "node_modules\\svelte-french-toast\\dist\\components\\ToastIcon.svelte";

	// (13:27) 
	function create_if_block_2$4(ctx) {
		let div;
		let loadericon;
		let t;
		let current;
		const loadericon_spread_levels = [/*iconTheme*/ ctx[0]];
		let loadericon_props = {};

		for (let i = 0; i < loadericon_spread_levels.length; i += 1) {
			loadericon_props = assign(loadericon_props, loadericon_spread_levels[i]);
		}

		loadericon = new LoaderIcon({ props: loadericon_props, $$inline: true });
		let if_block = /*type*/ ctx[2] !== 'loading' && create_if_block_3$2(ctx);

		const block = {
			c: function create() {
				div = element("div");
				create_component(loadericon.$$.fragment);
				t = space();
				if (if_block) if_block.c();
				attr_dev(div, "class", "indicator svelte-1kgeier");
				add_location(div, file$9, 13, 1, 390);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				mount_component(loadericon, div, null);
				append_dev(div, t);
				if (if_block) if_block.m(div, null);
				current = true;
			},
			p: function update(ctx, dirty) {
				const loadericon_changes = (dirty & /*iconTheme*/ 1)
				? get_spread_update(loadericon_spread_levels, [get_spread_object(/*iconTheme*/ ctx[0])])
				: {};

				loadericon.$set(loadericon_changes);

				if (/*type*/ ctx[2] !== 'loading') {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*type*/ 4) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_3$2(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(div, null);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(loadericon.$$.fragment, local);
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(loadericon.$$.fragment, local);
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_component(loadericon);
				if (if_block) if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$4.name,
			type: "if",
			source: "(13:27) ",
			ctx
		});

		return block;
	}

	// (11:38) 
	function create_if_block_1$4(ctx) {
		let switch_instance;
		let switch_instance_anchor;
		let current;
		var switch_value = /*icon*/ ctx[1];

		function switch_props(ctx, dirty) {
			return { $$inline: true };
		}

		if (switch_value) {
			switch_instance = construct_svelte_component_dev(switch_value, switch_props());
		}

		const block = {
			c: function create() {
				if (switch_instance) create_component(switch_instance.$$.fragment);
				switch_instance_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (switch_instance) mount_component(switch_instance, target, anchor);
				insert_dev(target, switch_instance_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*icon*/ 2 && switch_value !== (switch_value = /*icon*/ ctx[1])) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = construct_svelte_component_dev(switch_value, switch_props());
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(switch_instance_anchor);
				}

				if (switch_instance) destroy_component(switch_instance, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$4.name,
			type: "if",
			source: "(11:38) ",
			ctx
		});

		return block;
	}

	// (9:0) {#if typeof icon === 'string'}
	function create_if_block$7(ctx) {
		let div;
		let t;

		const block = {
			c: function create() {
				div = element("div");
				t = text(/*icon*/ ctx[1]);
				attr_dev(div, "class", "animated svelte-1kgeier");
				add_location(div, file$9, 9, 1, 253);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, t);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*icon*/ 2) set_data_dev(t, /*icon*/ ctx[1]);
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$7.name,
			type: "if",
			source: "(9:0) {#if typeof icon === 'string'}",
			ctx
		});

		return block;
	}

	// (16:2) {#if type !== 'loading'}
	function create_if_block_3$2(ctx) {
		let div;
		let current_block_type_index;
		let if_block;
		let current;
		const if_block_creators = [create_if_block_4$1, create_else_block$6];
		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (/*type*/ ctx[2] === 'error') return 0;
			return 1;
		}

		current_block_type_index = select_block_type_1(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				div = element("div");
				if_block.c();
				attr_dev(div, "class", "status svelte-1kgeier");
				add_location(div, file$9, 16, 3, 476);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3$2.name,
			type: "if",
			source: "(16:2) {#if type !== 'loading'}",
			ctx
		});

		return block;
	}

	// (20:4) {:else}
	function create_else_block$6(ctx) {
		let checkmarkicon;
		let current;
		const checkmarkicon_spread_levels = [/*iconTheme*/ ctx[0]];
		let checkmarkicon_props = {};

		for (let i = 0; i < checkmarkicon_spread_levels.length; i += 1) {
			checkmarkicon_props = assign(checkmarkicon_props, checkmarkicon_spread_levels[i]);
		}

		checkmarkicon = new CheckmarkIcon({
				props: checkmarkicon_props,
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(checkmarkicon.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(checkmarkicon, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const checkmarkicon_changes = (dirty & /*iconTheme*/ 1)
				? get_spread_update(checkmarkicon_spread_levels, [get_spread_object(/*iconTheme*/ ctx[0])])
				: {};

				checkmarkicon.$set(checkmarkicon_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(checkmarkicon.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(checkmarkicon.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(checkmarkicon, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$6.name,
			type: "else",
			source: "(20:4) {:else}",
			ctx
		});

		return block;
	}

	// (18:4) {#if type === 'error'}
	function create_if_block_4$1(ctx) {
		let erroricon;
		let current;
		const erroricon_spread_levels = [/*iconTheme*/ ctx[0]];
		let erroricon_props = {};

		for (let i = 0; i < erroricon_spread_levels.length; i += 1) {
			erroricon_props = assign(erroricon_props, erroricon_spread_levels[i]);
		}

		erroricon = new ErrorIcon({ props: erroricon_props, $$inline: true });

		const block = {
			c: function create() {
				create_component(erroricon.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(erroricon, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const erroricon_changes = (dirty & /*iconTheme*/ 1)
				? get_spread_update(erroricon_spread_levels, [get_spread_object(/*iconTheme*/ ctx[0])])
				: {};

				erroricon.$set(erroricon_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(erroricon.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(erroricon.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(erroricon, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4$1.name,
			type: "if",
			source: "(18:4) {#if type === 'error'}",
			ctx
		});

		return block;
	}

	function create_fragment$9(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$7, create_if_block_1$4, create_if_block_2$4];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (typeof /*icon*/ ctx[1] === 'string') return 0;
			if (typeof /*icon*/ ctx[1] !== 'undefined') return 1;
			if (/*type*/ ctx[2] !== 'blank') return 2;
			return -1;
		}

		if (~(current_block_type_index = select_block_type(ctx))) {
			if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		}

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].m(target, anchor);
				}

				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if (~current_block_type_index) {
						if_blocks[current_block_type_index].p(ctx, dirty);
					}
				} else {
					if (if_block) {
						group_outros();

						transition_out(if_blocks[previous_block_index], 1, 1, () => {
							if_blocks[previous_block_index] = null;
						});

						check_outros();
					}

					if (~current_block_type_index) {
						if_block = if_blocks[current_block_type_index];

						if (!if_block) {
							if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
							if_block.c();
						} else {
							if_block.p(ctx, dirty);
						}

						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					} else {
						if_block = null;
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (~current_block_type_index) {
					if_blocks[current_block_type_index].d(detaching);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$9.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$9($$self, $$props, $$invalidate) {
		let type;
		let icon;
		let iconTheme;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ToastIcon', slots, []);
		let { toast } = $$props;

		$$self.$$.on_mount.push(function () {
			if (toast === undefined && !('toast' in $$props || $$self.$$.bound[$$self.$$.props['toast']])) {
				console.warn("<ToastIcon> was created without expected prop 'toast'");
			}
		});

		const writable_props = ['toast'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ToastIcon> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('toast' in $$props) $$invalidate(3, toast = $$props.toast);
		};

		$$self.$capture_state = () => ({
			CheckmarkIcon,
			ErrorIcon,
			LoaderIcon,
			toast,
			iconTheme,
			icon,
			type
		});

		$$self.$inject_state = $$props => {
			if ('toast' in $$props) $$invalidate(3, toast = $$props.toast);
			if ('iconTheme' in $$props) $$invalidate(0, iconTheme = $$props.iconTheme);
			if ('icon' in $$props) $$invalidate(1, icon = $$props.icon);
			if ('type' in $$props) $$invalidate(2, type = $$props.type);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*toast*/ 8) {
				$$invalidate(2, { type, icon, iconTheme } = toast, type, ($$invalidate(1, icon), $$invalidate(3, toast)), ($$invalidate(0, iconTheme), $$invalidate(3, toast)));
			}
		};

		return [iconTheme, icon, type, toast];
	}

	class ToastIcon extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$9, create_fragment$9, safe_not_equal, { toast: 3 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ToastIcon",
				options,
				id: create_fragment$9.name
			});
		}

		get toast() {
			throw new Error("<ToastIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set toast(value) {
			throw new Error("<ToastIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules\svelte-french-toast\dist\components\ToastMessage.svelte generated by Svelte v4.2.20 */
	const file$8 = "node_modules\\svelte-french-toast\\dist\\components\\ToastMessage.svelte";

	// (7:1) {:else}
	function create_else_block$5(ctx) {
		let switch_instance;
		let switch_instance_anchor;
		let current;
		var switch_value = /*toast*/ ctx[0].message;

		function switch_props(ctx, dirty) {
			return {
				props: { toast: /*toast*/ ctx[0] },
				$$inline: true
			};
		}

		if (switch_value) {
			switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx));
		}

		const block = {
			c: function create() {
				if (switch_instance) create_component(switch_instance.$$.fragment);
				switch_instance_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (switch_instance) mount_component(switch_instance, target, anchor);
				insert_dev(target, switch_instance_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*toast*/ 1 && switch_value !== (switch_value = /*toast*/ ctx[0].message)) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx));
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					const switch_instance_changes = {};
					if (dirty & /*toast*/ 1) switch_instance_changes.toast = /*toast*/ ctx[0];
					switch_instance.$set(switch_instance_changes);
				}
			},
			i: function intro(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(switch_instance_anchor);
				}

				if (switch_instance) destroy_component(switch_instance, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$5.name,
			type: "else",
			source: "(7:1) {:else}",
			ctx
		});

		return block;
	}

	// (5:1) {#if typeof toast.message === 'string'}
	function create_if_block$6(ctx) {
		let t_value = /*toast*/ ctx[0].message + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*toast*/ 1 && t_value !== (t_value = /*toast*/ ctx[0].message + "")) set_data_dev(t, t_value);
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$6.name,
			type: "if",
			source: "(5:1) {#if typeof toast.message === 'string'}",
			ctx
		});

		return block;
	}

	function create_fragment$8(ctx) {
		let div;
		let current_block_type_index;
		let if_block;
		let current;
		const if_block_creators = [create_if_block$6, create_else_block$5];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (typeof /*toast*/ ctx[0].message === 'string') return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		let div_levels = [{ class: "message" }, /*toast*/ ctx[0].ariaProps];
		let div_data = {};

		for (let i = 0; i < div_levels.length; i += 1) {
			div_data = assign(div_data, div_levels[i]);
		}

		const block = {
			c: function create() {
				div = element("div");
				if_block.c();
				set_attributes(div, div_data);
				toggle_class(div, "svelte-1nauejd", true);
				add_location(div, file$8, 3, 0, 37);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div, null);
				}

				set_attributes(div, div_data = get_spread_update(div_levels, [{ class: "message" }, dirty & /*toast*/ 1 && /*toast*/ ctx[0].ariaProps]));
				toggle_class(div, "svelte-1nauejd", true);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$8.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$8($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ToastMessage', slots, []);
		let { toast } = $$props;

		$$self.$$.on_mount.push(function () {
			if (toast === undefined && !('toast' in $$props || $$self.$$.bound[$$self.$$.props['toast']])) {
				console.warn("<ToastMessage> was created without expected prop 'toast'");
			}
		});

		const writable_props = ['toast'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ToastMessage> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('toast' in $$props) $$invalidate(0, toast = $$props.toast);
		};

		$$self.$capture_state = () => ({ toast });

		$$self.$inject_state = $$props => {
			if ('toast' in $$props) $$invalidate(0, toast = $$props.toast);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [toast];
	}

	class ToastMessage extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$8, create_fragment$8, safe_not_equal, { toast: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ToastMessage",
				options,
				id: create_fragment$8.name
			});
		}

		get toast() {
			throw new Error("<ToastMessage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set toast(value) {
			throw new Error("<ToastMessage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules\svelte-french-toast\dist\components\ToastBar.svelte generated by Svelte v4.2.20 */
	const file$7 = "node_modules\\svelte-french-toast\\dist\\components\\ToastBar.svelte";
	const get_default_slot_changes$1 = dirty => ({ toast: dirty & /*toast*/ 1 });

	const get_default_slot_context$1 = ctx => ({
		ToastIcon,
		ToastMessage,
		toast: /*toast*/ ctx[0]
	});

	// (28:1) {:else}
	function create_else_block$4(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[6].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], get_default_slot_context$1);
		const default_slot_or_fallback = default_slot || fallback_block$1(ctx);

		const block = {
			c: function create() {
				if (default_slot_or_fallback) default_slot_or_fallback.c();
			},
			m: function mount(target, anchor) {
				if (default_slot_or_fallback) {
					default_slot_or_fallback.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope, toast*/ 129)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[7],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, get_default_slot_changes$1),
							get_default_slot_context$1
						);
					}
				} else {
					if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty & /*toast*/ 1)) {
						default_slot_or_fallback.p(ctx, !current ? -1 : dirty);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot_or_fallback, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot_or_fallback, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$4.name,
			type: "else",
			source: "(28:1) {:else}",
			ctx
		});

		return block;
	}

	// (23:1) {#if Component}
	function create_if_block$5(ctx) {
		let switch_instance;
		let switch_instance_anchor;
		let current;
		var switch_value = /*Component*/ ctx[2];

		function switch_props(ctx, dirty) {
			return {
				props: {
					$$slots: {
						message: [create_message_slot],
						icon: [create_icon_slot]
					},
					$$scope: { ctx }
				},
				$$inline: true
			};
		}

		if (switch_value) {
			switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx));
		}

		const block = {
			c: function create() {
				if (switch_instance) create_component(switch_instance.$$.fragment);
				switch_instance_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (switch_instance) mount_component(switch_instance, target, anchor);
				insert_dev(target, switch_instance_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*Component*/ 4 && switch_value !== (switch_value = /*Component*/ ctx[2])) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx));
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					const switch_instance_changes = {};

					if (dirty & /*$$scope, toast*/ 129) {
						switch_instance_changes.$$scope = { dirty, ctx };
					}

					switch_instance.$set(switch_instance_changes);
				}
			},
			i: function intro(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(switch_instance_anchor);
				}

				if (switch_instance) destroy_component(switch_instance, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$5.name,
			type: "if",
			source: "(23:1) {#if Component}",
			ctx
		});

		return block;
	}

	// (29:43)     
	function fallback_block$1(ctx) {
		let toasticon;
		let t;
		let toastmessage;
		let current;

		toasticon = new ToastIcon({
				props: { toast: /*toast*/ ctx[0] },
				$$inline: true
			});

		toastmessage = new ToastMessage({
				props: { toast: /*toast*/ ctx[0] },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(toasticon.$$.fragment);
				t = space();
				create_component(toastmessage.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(toasticon, target, anchor);
				insert_dev(target, t, anchor);
				mount_component(toastmessage, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const toasticon_changes = {};
				if (dirty & /*toast*/ 1) toasticon_changes.toast = /*toast*/ ctx[0];
				toasticon.$set(toasticon_changes);
				const toastmessage_changes = {};
				if (dirty & /*toast*/ 1) toastmessage_changes.toast = /*toast*/ ctx[0];
				toastmessage.$set(toastmessage_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(toasticon.$$.fragment, local);
				transition_in(toastmessage.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(toasticon.$$.fragment, local);
				transition_out(toastmessage.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}

				destroy_component(toasticon, detaching);
				destroy_component(toastmessage, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: fallback_block$1.name,
			type: "fallback",
			source: "(29:43)     ",
			ctx
		});

		return block;
	}

	// (25:3) 
	function create_icon_slot(ctx) {
		let toasticon;
		let current;

		toasticon = new ToastIcon({
				props: { toast: /*toast*/ ctx[0], slot: "icon" },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(toasticon.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(toasticon, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const toasticon_changes = {};
				if (dirty & /*toast*/ 1) toasticon_changes.toast = /*toast*/ ctx[0];
				toasticon.$set(toasticon_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(toasticon.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(toasticon.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(toasticon, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_icon_slot.name,
			type: "slot",
			source: "(25:3) ",
			ctx
		});

		return block;
	}

	// (26:3) 
	function create_message_slot(ctx) {
		let toastmessage;
		let current;

		toastmessage = new ToastMessage({
				props: { toast: /*toast*/ ctx[0], slot: "message" },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(toastmessage.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(toastmessage, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const toastmessage_changes = {};
				if (dirty & /*toast*/ 1) toastmessage_changes.toast = /*toast*/ ctx[0];
				toastmessage.$set(toastmessage_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(toastmessage.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(toastmessage.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(toastmessage, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_message_slot.name,
			type: "slot",
			source: "(26:3) ",
			ctx
		});

		return block;
	}

	function create_fragment$7(ctx) {
		let div;
		let current_block_type_index;
		let if_block;
		let div_class_value;
		let div_style_value;
		let current;
		const if_block_creators = [create_if_block$5, create_else_block$4];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*Component*/ ctx[2]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				div = element("div");
				if_block.c();

				attr_dev(div, "class", div_class_value = "base " + (/*toast*/ ctx[0].height
				? /*animation*/ ctx[4]
				: 'transparent') + " " + (/*toast*/ ctx[0].className || '') + " svelte-ug60r4");

				attr_dev(div, "style", div_style_value = "" + (/*style*/ ctx[1] + "; " + /*toast*/ ctx[0].style));
				set_style(div, "--factor", /*factor*/ ctx[3]);
				add_location(div, file$7, 17, 0, 540);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div, null);
				}

				if (!current || dirty & /*toast, animation*/ 17 && div_class_value !== (div_class_value = "base " + (/*toast*/ ctx[0].height
				? /*animation*/ ctx[4]
				: 'transparent') + " " + (/*toast*/ ctx[0].className || '') + " svelte-ug60r4")) {
					attr_dev(div, "class", div_class_value);
				}

				if (!current || dirty & /*style, toast*/ 3 && div_style_value !== (div_style_value = "" + (/*style*/ ctx[1] + "; " + /*toast*/ ctx[0].style))) {
					attr_dev(div, "style", div_style_value);
				}

				const style_changed = dirty & /*style, toast*/ 3;

				if (dirty & /*factor, style, toast*/ 11 || style_changed) {
					set_style(div, "--factor", /*factor*/ ctx[3]);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$7.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$7($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ToastBar', slots, ['default']);
		let { toast } = $$props;
		let { position = void 0 } = $$props;
		let { style = "" } = $$props;
		let { Component = void 0 } = $$props;
		let factor;
		let animation;

		$$self.$$.on_mount.push(function () {
			if (toast === undefined && !('toast' in $$props || $$self.$$.bound[$$self.$$.props['toast']])) {
				console.warn("<ToastBar> was created without expected prop 'toast'");
			}
		});

		const writable_props = ['toast', 'position', 'style', 'Component'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ToastBar> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('toast' in $$props) $$invalidate(0, toast = $$props.toast);
			if ('position' in $$props) $$invalidate(5, position = $$props.position);
			if ('style' in $$props) $$invalidate(1, style = $$props.style);
			if ('Component' in $$props) $$invalidate(2, Component = $$props.Component);
			if ('$$scope' in $$props) $$invalidate(7, $$scope = $$props.$$scope);
		};

		$$self.$capture_state = () => ({
			ToastIcon,
			prefersReducedMotion,
			ToastMessage,
			toast,
			position,
			style,
			Component,
			factor,
			animation
		});

		$$self.$inject_state = $$props => {
			if ('toast' in $$props) $$invalidate(0, toast = $$props.toast);
			if ('position' in $$props) $$invalidate(5, position = $$props.position);
			if ('style' in $$props) $$invalidate(1, style = $$props.style);
			if ('Component' in $$props) $$invalidate(2, Component = $$props.Component);
			if ('factor' in $$props) $$invalidate(3, factor = $$props.factor);
			if ('animation' in $$props) $$invalidate(4, animation = $$props.animation);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*toast, position*/ 33) {
				{
					const top = (toast.position || position || "top-center").includes("top");
					$$invalidate(3, factor = top ? 1 : -1);

					const [enter, exit] = prefersReducedMotion()
					? ["fadeIn", "fadeOut"]
					: ["enter", "exit"];

					$$invalidate(4, animation = toast.visible ? enter : exit);
				}
			}
		};

		return [toast, style, Component, factor, animation, position, slots, $$scope];
	}

	class ToastBar extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$7, create_fragment$7, safe_not_equal, {
				toast: 0,
				position: 5,
				style: 1,
				Component: 2
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ToastBar",
				options,
				id: create_fragment$7.name
			});
		}

		get toast() {
			throw new Error("<ToastBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set toast(value) {
			throw new Error("<ToastBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get position() {
			throw new Error("<ToastBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set position(value) {
			throw new Error("<ToastBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get style() {
			throw new Error("<ToastBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set style(value) {
			throw new Error("<ToastBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get Component() {
			throw new Error("<ToastBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set Component(value) {
			throw new Error("<ToastBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules\svelte-french-toast\dist\components\ToastWrapper.svelte generated by Svelte v4.2.20 */
	const file$6 = "node_modules\\svelte-french-toast\\dist\\components\\ToastWrapper.svelte";
	const get_default_slot_changes = dirty => ({ toast: dirty & /*toast*/ 1 });
	const get_default_slot_context = ctx => ({ toast: /*toast*/ ctx[0] });

	// (34:1) {:else}
	function create_else_block$3(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[8].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], get_default_slot_context);
		const default_slot_or_fallback = default_slot || fallback_block(ctx);

		const block = {
			c: function create() {
				if (default_slot_or_fallback) default_slot_or_fallback.c();
			},
			m: function mount(target, anchor) {
				if (default_slot_or_fallback) {
					default_slot_or_fallback.m(target, anchor);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope, toast*/ 129)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[7],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, get_default_slot_changes),
							get_default_slot_context
						);
					}
				} else {
					if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty & /*toast*/ 1)) {
						default_slot_or_fallback.p(ctx, !current ? -1 : dirty);
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(default_slot_or_fallback, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(default_slot_or_fallback, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$3.name,
			type: "else",
			source: "(34:1) {:else}",
			ctx
		});

		return block;
	}

	// (32:1) {#if toast.type === 'custom'}
	function create_if_block$4(ctx) {
		let toastmessage;
		let current;

		toastmessage = new ToastMessage({
				props: { toast: /*toast*/ ctx[0] },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(toastmessage.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(toastmessage, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const toastmessage_changes = {};
				if (dirty & /*toast*/ 1) toastmessage_changes.toast = /*toast*/ ctx[0];
				toastmessage.$set(toastmessage_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(toastmessage.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(toastmessage.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(toastmessage, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$4.name,
			type: "if",
			source: "(32:1) {#if toast.type === 'custom'}",
			ctx
		});

		return block;
	}

	// (35:16)     
	function fallback_block(ctx) {
		let toastbar;
		let current;

		toastbar = new ToastBar({
				props: {
					toast: /*toast*/ ctx[0],
					position: /*toast*/ ctx[0].position
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(toastbar.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(toastbar, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const toastbar_changes = {};
				if (dirty & /*toast*/ 1) toastbar_changes.toast = /*toast*/ ctx[0];
				if (dirty & /*toast*/ 1) toastbar_changes.position = /*toast*/ ctx[0].position;
				toastbar.$set(toastbar_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(toastbar.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(toastbar.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(toastbar, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: fallback_block.name,
			type: "fallback",
			source: "(35:16)     ",
			ctx
		});

		return block;
	}

	function create_fragment$6(ctx) {
		let div;
		let current_block_type_index;
		let if_block;
		let current;
		const if_block_creators = [create_if_block$4, create_else_block$3];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*toast*/ ctx[0].type === 'custom') return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				div = element("div");
				if_block.c();
				attr_dev(div, "class", "wrapper svelte-v01oml");
				toggle_class(div, "active", /*toast*/ ctx[0].visible);
				toggle_class(div, "transition", !prefersReducedMotion());
				set_style(div, "--factor", /*factor*/ ctx[3]);
				set_style(div, "--offset", /*toast*/ ctx[0].offset);
				set_style(div, "top", /*top*/ ctx[5]);
				set_style(div, "bottom", /*bottom*/ ctx[4]);
				set_style(div, "justify-content", /*justifyContent*/ ctx[2]);
				add_location(div, file$6, 20, 0, 667);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				/*div_binding*/ ctx[9](div);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div, null);
				}

				if (!current || dirty & /*toast*/ 1) {
					toggle_class(div, "active", /*toast*/ ctx[0].visible);
				}

				if (dirty & /*factor*/ 8) {
					set_style(div, "--factor", /*factor*/ ctx[3]);
				}

				if (dirty & /*toast*/ 1) {
					set_style(div, "--offset", /*toast*/ ctx[0].offset);
				}

				if (dirty & /*top*/ 32) {
					set_style(div, "top", /*top*/ ctx[5]);
				}

				if (dirty & /*bottom*/ 16) {
					set_style(div, "bottom", /*bottom*/ ctx[4]);
				}

				if (dirty & /*justifyContent*/ 4) {
					set_style(div, "justify-content", /*justifyContent*/ ctx[2]);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if_blocks[current_block_type_index].d();
				/*div_binding*/ ctx[9](null);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$6.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$6($$self, $$props, $$invalidate) {
		let top;
		let bottom;
		let factor;
		let justifyContent;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ToastWrapper', slots, ['default']);
		let { toast } = $$props;
		let { setHeight } = $$props;
		let wrapperEl;

		onMount(() => {
			setHeight(wrapperEl.getBoundingClientRect().height);
		});

		$$self.$$.on_mount.push(function () {
			if (toast === undefined && !('toast' in $$props || $$self.$$.bound[$$self.$$.props['toast']])) {
				console.warn("<ToastWrapper> was created without expected prop 'toast'");
			}

			if (setHeight === undefined && !('setHeight' in $$props || $$self.$$.bound[$$self.$$.props['setHeight']])) {
				console.warn("<ToastWrapper> was created without expected prop 'setHeight'");
			}
		});

		const writable_props = ['toast', 'setHeight'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ToastWrapper> was created with unknown prop '${key}'`);
		});

		function div_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				wrapperEl = $$value;
				$$invalidate(1, wrapperEl);
			});
		}

		$$self.$$set = $$props => {
			if ('toast' in $$props) $$invalidate(0, toast = $$props.toast);
			if ('setHeight' in $$props) $$invalidate(6, setHeight = $$props.setHeight);
			if ('$$scope' in $$props) $$invalidate(7, $$scope = $$props.$$scope);
		};

		$$self.$capture_state = () => ({
			onMount,
			prefersReducedMotion,
			ToastBar,
			ToastMessage,
			toast,
			setHeight,
			wrapperEl,
			justifyContent,
			factor,
			bottom,
			top
		});

		$$self.$inject_state = $$props => {
			if ('toast' in $$props) $$invalidate(0, toast = $$props.toast);
			if ('setHeight' in $$props) $$invalidate(6, setHeight = $$props.setHeight);
			if ('wrapperEl' in $$props) $$invalidate(1, wrapperEl = $$props.wrapperEl);
			if ('justifyContent' in $$props) $$invalidate(2, justifyContent = $$props.justifyContent);
			if ('factor' in $$props) $$invalidate(3, factor = $$props.factor);
			if ('bottom' in $$props) $$invalidate(4, bottom = $$props.bottom);
			if ('top' in $$props) $$invalidate(5, top = $$props.top);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*toast*/ 1) {
				$$invalidate(5, top = (toast.position?.includes("top")) ? 0 : null);
			}

			if ($$self.$$.dirty & /*toast*/ 1) {
				$$invalidate(4, bottom = (toast.position?.includes("bottom")) ? 0 : null);
			}

			if ($$self.$$.dirty & /*toast*/ 1) {
				$$invalidate(3, factor = (toast.position?.includes("top")) ? 1 : -1);
			}

			if ($$self.$$.dirty & /*toast*/ 1) {
				$$invalidate(2, justifyContent = toast.position?.includes("center") && "center" || (toast.position?.includes("right") || toast.position?.includes("end")) && "flex-end" || null);
			}
		};

		return [
			toast,
			wrapperEl,
			justifyContent,
			factor,
			bottom,
			top,
			setHeight,
			$$scope,
			slots,
			div_binding
		];
	}

	class ToastWrapper extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$6, create_fragment$6, safe_not_equal, { toast: 0, setHeight: 6 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ToastWrapper",
				options,
				id: create_fragment$6.name
			});
		}

		get toast() {
			throw new Error("<ToastWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set toast(value) {
			throw new Error("<ToastWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get setHeight() {
			throw new Error("<ToastWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set setHeight(value) {
			throw new Error("<ToastWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules\svelte-french-toast\dist\components\Toaster.svelte generated by Svelte v4.2.20 */
	const file$5 = "node_modules\\svelte-french-toast\\dist\\components\\Toaster.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[11] = list[i];
		return child_ctx;
	}

	// (30:1) {#each _toasts as toast (toast.id)}
	function create_each_block$2(key_1, ctx) {
		let first;
		let toastwrapper;
		let current;

		function func(...args) {
			return /*func*/ ctx[10](/*toast*/ ctx[11], ...args);
		}

		toastwrapper = new ToastWrapper({
				props: {
					toast: /*toast*/ ctx[11],
					setHeight: func
				},
				$$inline: true
			});

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				first = empty();
				create_component(toastwrapper.$$.fragment);
				this.first = first;
			},
			m: function mount(target, anchor) {
				insert_dev(target, first, anchor);
				mount_component(toastwrapper, target, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const toastwrapper_changes = {};
				if (dirty & /*_toasts*/ 4) toastwrapper_changes.toast = /*toast*/ ctx[11];
				if (dirty & /*_toasts*/ 4) toastwrapper_changes.setHeight = func;
				toastwrapper.$set(toastwrapper_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(toastwrapper.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(toastwrapper.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(first);
				}

				destroy_component(toastwrapper, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$2.name,
			type: "each",
			source: "(30:1) {#each _toasts as toast (toast.id)}",
			ctx
		});

		return block;
	}

	function create_fragment$5(ctx) {
		let div;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let div_class_value;
		let current;
		let mounted;
		let dispose;
		let each_value = ensure_array_like_dev(/*_toasts*/ ctx[2]);
		const get_key = ctx => /*toast*/ ctx[11].id;
		validate_each_keys(ctx, each_value, get_each_context$2, get_key);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$2(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
		}

		const block = {
			c: function create() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(div, "class", div_class_value = "toaster " + (/*containerClassName*/ ctx[1] || '') + " svelte-1phplh9");
				attr_dev(div, "style", /*containerStyle*/ ctx[0]);
				attr_dev(div, "role", "alert");
				add_location(div, file$5, 22, 0, 617);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}

				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(div, "mouseenter", /*handlers*/ ctx[4].startPause, false, false, false, false),
						listen_dev(div, "mouseleave", /*handlers*/ ctx[4].endPause, false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*_toasts, handlers*/ 20) {
					each_value = ensure_array_like_dev(/*_toasts*/ ctx[2]);
					group_outros();
					validate_each_keys(ctx, each_value, get_each_context$2, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
					check_outros();
				}

				if (!current || dirty & /*containerClassName*/ 2 && div_class_value !== (div_class_value = "toaster " + (/*containerClassName*/ ctx[1] || '') + " svelte-1phplh9")) {
					attr_dev(div, "class", div_class_value);
				}

				if (!current || dirty & /*containerStyle*/ 1) {
					attr_dev(div, "style", /*containerStyle*/ ctx[0]);
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$5.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$5($$self, $$props, $$invalidate) {
		let $toasts;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Toaster', slots, []);
		let { reverseOrder = false } = $$props;
		let { position = "top-center" } = $$props;
		let { toastOptions = void 0 } = $$props;
		let { gutter = 8 } = $$props;
		let { containerStyle = void 0 } = $$props;
		let { containerClassName = void 0 } = $$props;
		const { toasts, handlers } = useToaster(toastOptions);
		validate_store(toasts, 'toasts');
		component_subscribe($$self, toasts, value => $$invalidate(9, $toasts = value));
		let _toasts;

		const writable_props = [
			'reverseOrder',
			'position',
			'toastOptions',
			'gutter',
			'containerStyle',
			'containerClassName'
		];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Toaster> was created with unknown prop '${key}'`);
		});

		const func = (toast, height) => handlers.updateHeight(toast.id, height);

		$$self.$$set = $$props => {
			if ('reverseOrder' in $$props) $$invalidate(5, reverseOrder = $$props.reverseOrder);
			if ('position' in $$props) $$invalidate(6, position = $$props.position);
			if ('toastOptions' in $$props) $$invalidate(7, toastOptions = $$props.toastOptions);
			if ('gutter' in $$props) $$invalidate(8, gutter = $$props.gutter);
			if ('containerStyle' in $$props) $$invalidate(0, containerStyle = $$props.containerStyle);
			if ('containerClassName' in $$props) $$invalidate(1, containerClassName = $$props.containerClassName);
		};

		$$self.$capture_state = () => ({
			useToaster,
			ToastWrapper,
			reverseOrder,
			position,
			toastOptions,
			gutter,
			containerStyle,
			containerClassName,
			toasts,
			handlers,
			_toasts,
			$toasts
		});

		$$self.$inject_state = $$props => {
			if ('reverseOrder' in $$props) $$invalidate(5, reverseOrder = $$props.reverseOrder);
			if ('position' in $$props) $$invalidate(6, position = $$props.position);
			if ('toastOptions' in $$props) $$invalidate(7, toastOptions = $$props.toastOptions);
			if ('gutter' in $$props) $$invalidate(8, gutter = $$props.gutter);
			if ('containerStyle' in $$props) $$invalidate(0, containerStyle = $$props.containerStyle);
			if ('containerClassName' in $$props) $$invalidate(1, containerClassName = $$props.containerClassName);
			if ('_toasts' in $$props) $$invalidate(2, _toasts = $$props._toasts);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$toasts, position, reverseOrder, gutter*/ 864) {
				$$invalidate(2, _toasts = $toasts.map(toast => ({
					...toast,
					position: toast.position || position,
					offset: handlers.calculateOffset(toast, $toasts, {
						reverseOrder,
						gutter,
						defaultPosition: position
					})
				})));
			}
		};

		return [
			containerStyle,
			containerClassName,
			_toasts,
			toasts,
			handlers,
			reverseOrder,
			position,
			toastOptions,
			gutter,
			$toasts,
			func
		];
	}

	class Toaster extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$5, create_fragment$5, safe_not_equal, {
				reverseOrder: 5,
				position: 6,
				toastOptions: 7,
				gutter: 8,
				containerStyle: 0,
				containerClassName: 1
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Toaster",
				options,
				id: create_fragment$5.name
			});
		}

		get reverseOrder() {
			throw new Error("<Toaster>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set reverseOrder(value) {
			throw new Error("<Toaster>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get position() {
			throw new Error("<Toaster>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set position(value) {
			throw new Error("<Toaster>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get toastOptions() {
			throw new Error("<Toaster>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set toastOptions(value) {
			throw new Error("<Toaster>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get gutter() {
			throw new Error("<Toaster>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set gutter(value) {
			throw new Error("<Toaster>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get containerStyle() {
			throw new Error("<Toaster>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set containerStyle(value) {
			throw new Error("<Toaster>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get containerClassName() {
			throw new Error("<Toaster>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set containerClassName(value) {
			throw new Error("<Toaster>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\Login.svelte generated by Svelte v4.2.20 */
	const file$4 = "src\\components\\Login.svelte";

	// (113:4) {#if isLogin && !forgot}
	function create_if_block_2$3(ctx) {
		let h1;
		let t1;
		let input0;
		let t2;
		let input1;
		let t3;
		let button;
		let t5;
		let p0;
		let a0;
		let t7;
		let p1;
		let a1;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				h1 = element("h1");
				h1.textContent = "Login";
				t1 = space();
				input0 = element("input");
				t2 = space();
				input1 = element("input");
				t3 = space();
				button = element("button");
				button.textContent = "Login";
				t5 = space();
				p0 = element("p");
				a0 = element("a");
				a0.textContent = "Create account";
				t7 = space();
				p1 = element("p");
				a1 = element("a");
				a1.textContent = "Forgot password?";
				attr_dev(h1, "class", "svelte-xnww06");
				add_location(h1, file$4, 113, 8, 3382);
				attr_dev(input0, "type", "email");
				attr_dev(input0, "placeholder", "Email");
				attr_dev(input0, "class", "svelte-xnww06");
				add_location(input0, file$4, 115, 8, 3408);
				attr_dev(input1, "type", "password");
				attr_dev(input1, "placeholder", "Password");
				attr_dev(input1, "class", "svelte-xnww06");
				add_location(input1, file$4, 116, 8, 3479);
				attr_dev(button, "class", "svelte-xnww06");
				add_location(button, file$4, 118, 8, 3561);
				attr_dev(a0, "href", "#");
				attr_dev(a0, "class", "svelte-xnww06");
				add_location(a0, file$4, 121, 12, 3629);
				attr_dev(p0, "class", "svelte-xnww06");
				add_location(p0, file$4, 120, 8, 3612);
				attr_dev(a1, "href", "#");
				attr_dev(a1, "class", "svelte-xnww06");
				add_location(a1, file$4, 127, 12, 3801);
				attr_dev(p1, "class", "svelte-xnww06");
				add_location(p1, file$4, 126, 8, 3784);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h1, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, input0, anchor);
				set_input_value(input0, /*email*/ ctx[0]);
				insert_dev(target, t2, anchor);
				insert_dev(target, input1, anchor);
				set_input_value(input1, /*password*/ ctx[1]);
				insert_dev(target, t3, anchor);
				insert_dev(target, button, anchor);
				insert_dev(target, t5, anchor);
				insert_dev(target, p0, anchor);
				append_dev(p0, a0);
				insert_dev(target, t7, anchor);
				insert_dev(target, p1, anchor);
				append_dev(p1, a1);

				if (!mounted) {
					dispose = [
						listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
						listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
						listen_dev(button, "click", /*login*/ ctx[6], false, false, false, false),
						listen_dev(a0, "click", prevent_default(/*click_handler*/ ctx[12]), false, true, false, false),
						listen_dev(a1, "click", prevent_default(/*click_handler_1*/ ctx[13]), false, true, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
					set_input_value(input0, /*email*/ ctx[0]);
				}

				if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
					set_input_value(input1, /*password*/ ctx[1]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(h1);
					detach_dev(t1);
					detach_dev(input0);
					detach_dev(t2);
					detach_dev(input1);
					detach_dev(t3);
					detach_dev(button);
					detach_dev(t5);
					detach_dev(p0);
					detach_dev(t7);
					detach_dev(p1);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$3.name,
			type: "if",
			source: "(113:4) {#if isLogin && !forgot}",
			ctx
		});

		return block;
	}

	// (135:4) {#if !isLogin && !forgot}
	function create_if_block_1$3(ctx) {
		let h1;
		let t1;
		let input0;
		let t2;
		let input1;
		let t3;
		let input2;
		let t4;
		let button;
		let t6;
		let p;
		let a;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				h1 = element("h1");
				h1.textContent = "Sign Up";
				t1 = space();
				input0 = element("input");
				t2 = space();
				input1 = element("input");
				t3 = space();
				input2 = element("input");
				t4 = space();
				button = element("button");
				button.textContent = "Sign Up";
				t6 = space();
				p = element("p");
				a = element("a");
				a.textContent = "Back to login";
				attr_dev(h1, "class", "svelte-xnww06");
				add_location(h1, file$4, 135, 8, 4019);
				attr_dev(input0, "type", "email");
				attr_dev(input0, "placeholder", "Email");
				attr_dev(input0, "class", "svelte-xnww06");
				add_location(input0, file$4, 137, 8, 4047);
				attr_dev(input1, "type", "password");
				attr_dev(input1, "placeholder", "Password");
				attr_dev(input1, "class", "svelte-xnww06");
				add_location(input1, file$4, 138, 8, 4118);
				attr_dev(input2, "type", "password");
				attr_dev(input2, "placeholder", "Confirm password");
				attr_dev(input2, "class", "svelte-xnww06");
				add_location(input2, file$4, 139, 8, 4198);
				attr_dev(button, "class", "svelte-xnww06");
				add_location(button, file$4, 141, 8, 4295);
				attr_dev(a, "href", "#");
				attr_dev(a, "class", "svelte-xnww06");
				add_location(a, file$4, 144, 12, 4366);
				attr_dev(p, "class", "svelte-xnww06");
				add_location(p, file$4, 143, 8, 4349);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h1, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, input0, anchor);
				set_input_value(input0, /*email*/ ctx[0]);
				insert_dev(target, t2, anchor);
				insert_dev(target, input1, anchor);
				set_input_value(input1, /*password*/ ctx[1]);
				insert_dev(target, t3, anchor);
				insert_dev(target, input2, anchor);
				set_input_value(input2, /*confirmPassword*/ ctx[2]);
				insert_dev(target, t4, anchor);
				insert_dev(target, button, anchor);
				insert_dev(target, t6, anchor);
				insert_dev(target, p, anchor);
				append_dev(p, a);

				if (!mounted) {
					dispose = [
						listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[14]),
						listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[15]),
						listen_dev(input2, "input", /*input2_input_handler*/ ctx[16]),
						listen_dev(button, "click", /*signUp*/ ctx[7], false, false, false, false),
						listen_dev(a, "click", prevent_default(/*click_handler_2*/ ctx[17]), false, true, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
					set_input_value(input0, /*email*/ ctx[0]);
				}

				if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
					set_input_value(input1, /*password*/ ctx[1]);
				}

				if (dirty & /*confirmPassword*/ 4 && input2.value !== /*confirmPassword*/ ctx[2]) {
					set_input_value(input2, /*confirmPassword*/ ctx[2]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(h1);
					detach_dev(t1);
					detach_dev(input0);
					detach_dev(t2);
					detach_dev(input1);
					detach_dev(t3);
					detach_dev(input2);
					detach_dev(t4);
					detach_dev(button);
					detach_dev(t6);
					detach_dev(p);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$3.name,
			type: "if",
			source: "(135:4) {#if !isLogin && !forgot}",
			ctx
		});

		return block;
	}

	// (152:4) {#if forgot}
	function create_if_block$3(ctx) {
		let h1;
		let t1;
		let input;
		let t2;
		let button;
		let t4;
		let p;
		let a;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				h1 = element("h1");
				h1.textContent = "Forgot Password";
				t1 = space();
				input = element("input");
				t2 = space();
				button = element("button");
				button.textContent = "Send reset link";
				t4 = space();
				p = element("p");
				a = element("a");
				a.textContent = "Back to login";
				attr_dev(h1, "class", "svelte-xnww06");
				add_location(h1, file$4, 152, 8, 4578);
				attr_dev(input, "type", "email");
				attr_dev(input, "placeholder", "Enter your email");
				attr_dev(input, "class", "svelte-xnww06");
				add_location(input, file$4, 154, 8, 4614);
				attr_dev(button, "class", "svelte-xnww06");
				add_location(button, file$4, 160, 8, 4751);
				attr_dev(a, "href", "#");
				attr_dev(a, "class", "svelte-xnww06");
				add_location(a, file$4, 165, 12, 4862);
				attr_dev(p, "class", "svelte-xnww06");
				add_location(p, file$4, 164, 8, 4845);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h1, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, input, anchor);
				set_input_value(input, /*resetEmail*/ ctx[3]);
				insert_dev(target, t2, anchor);
				insert_dev(target, button, anchor);
				insert_dev(target, t4, anchor);
				insert_dev(target, p, anchor);
				append_dev(p, a);

				if (!mounted) {
					dispose = [
						listen_dev(input, "input", /*input_input_handler*/ ctx[18]),
						listen_dev(button, "click", /*forgotPassword*/ ctx[8], false, false, false, false),
						listen_dev(a, "click", prevent_default(/*click_handler_3*/ ctx[19]), false, true, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*resetEmail*/ 8 && input.value !== /*resetEmail*/ ctx[3]) {
					set_input_value(input, /*resetEmail*/ ctx[3]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(h1);
					detach_dev(t1);
					detach_dev(input);
					detach_dev(t2);
					detach_dev(button);
					detach_dev(t4);
					detach_dev(p);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$3.name,
			type: "if",
			source: "(152:4) {#if forgot}",
			ctx
		});

		return block;
	}

	function create_fragment$4(ctx) {
		let main;
		let t0;
		let t1;
		let if_block0 = /*isLogin*/ ctx[4] && !/*forgot*/ ctx[5] && create_if_block_2$3(ctx);
		let if_block1 = !/*isLogin*/ ctx[4] && !/*forgot*/ ctx[5] && create_if_block_1$3(ctx);
		let if_block2 = /*forgot*/ ctx[5] && create_if_block$3(ctx);

		const block = {
			c: function create() {
				main = element("main");
				if (if_block0) if_block0.c();
				t0 = space();
				if (if_block1) if_block1.c();
				t1 = space();
				if (if_block2) if_block2.c();
				attr_dev(main, "class", "svelte-xnww06");
				add_location(main, file$4, 110, 0, 3316);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, main, anchor);
				if (if_block0) if_block0.m(main, null);
				append_dev(main, t0);
				if (if_block1) if_block1.m(main, null);
				append_dev(main, t1);
				if (if_block2) if_block2.m(main, null);
			},
			p: function update(ctx, [dirty]) {
				if (/*isLogin*/ ctx[4] && !/*forgot*/ ctx[5]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_2$3(ctx);
						if_block0.c();
						if_block0.m(main, t0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (!/*isLogin*/ ctx[4] && !/*forgot*/ ctx[5]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_1$3(ctx);
						if_block1.c();
						if_block1.m(main, t1);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (/*forgot*/ ctx[5]) {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block$3(ctx);
						if_block2.c();
						if_block2.m(main, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(main);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$4.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Login', slots, []);
		const dispatch = createEventDispatcher();
		let email = "";
		let password = "";
		let confirmPassword = "";
		let resetEmail = "";
		let message = "";
		let isLogin = true;
		let forgot = false;

		// -----------------------------
		// LOGIN
		// -----------------------------
		async function login() {
			try {
				const res = await fetch("http://localhost:5000/api/auth/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, password })
				});

				const data = await res.json();

				if (data.success) {
					localStorage.setItem("accessToken", data.accessToken);
					localStorage.setItem("refreshToken", data.refreshToken);
					localStorage.setItem("userId", data.userId);
					toast.success("Login successful");
					dispatch("loginSuccess");
				} else {
					toast.error(data.error || data.message || "Login failed");
				}
			} catch {
				toast.error("Unable to connect to server");
			}
		}

		// -----------------------------
		// SIGNUP
		// -----------------------------
		async function signUp() {
			if (!email || !password || !confirmPassword) {
				toast.error("All fields are required");
				return;
			}

			if (password !== confirmPassword) {
				toast.error("Passwords do not match");
				return;
			}

			try {
				const res = await fetch("http://localhost:5000/api/auth/signUp", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, password })
				});

				const data = await res.json();

				if (data.success) {
					toast.success("Signup successful! Please log in.");
					$$invalidate(4, isLogin = true);
					$$invalidate(2, confirmPassword = "");
				} else {
					toast.error(data.error || data.message || "Signup failed");
				}
			} catch {
				toast.error("Unable to connect to server");
			}
		}

		// -----------------------------
		// FORGOT PASSWORD
		// -----------------------------
		async function forgotPassword() {
			if (!resetEmail) {
				toast.error("Email is required");
				return;
			}

			try {
				await fetch("http://localhost:5000/api/auth/forgot-password", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email: resetEmail })
				});

				toast.success("If the email exists, a reset link was sent");
				$$invalidate(5, forgot = false);
				$$invalidate(3, resetEmail = "");
			} catch {
				toast.error("Unable to send reset email");
			}
		}

		function resetState() {
			$$invalidate(0, email = "");
			$$invalidate(1, password = "");
			$$invalidate(2, confirmPassword = "");
			message = "";
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Login> was created with unknown prop '${key}'`);
		});

		function input0_input_handler() {
			email = this.value;
			$$invalidate(0, email);
		}

		function input1_input_handler() {
			password = this.value;
			$$invalidate(1, password);
		}

		const click_handler = () => {
			$$invalidate(4, isLogin = false);
			resetState();
		};

		const click_handler_1 = () => {
			$$invalidate(5, forgot = true);
			resetState();
		};

		function input0_input_handler_1() {
			email = this.value;
			$$invalidate(0, email);
		}

		function input1_input_handler_1() {
			password = this.value;
			$$invalidate(1, password);
		}

		function input2_input_handler() {
			confirmPassword = this.value;
			$$invalidate(2, confirmPassword);
		}

		const click_handler_2 = () => {
			$$invalidate(4, isLogin = true);
			resetState();
		};

		function input_input_handler() {
			resetEmail = this.value;
			$$invalidate(3, resetEmail);
		}

		const click_handler_3 = () => {
			$$invalidate(5, forgot = false);
			resetState();
		};

		$$self.$capture_state = () => ({
			createEventDispatcher,
			toast,
			dispatch,
			email,
			password,
			confirmPassword,
			resetEmail,
			message,
			isLogin,
			forgot,
			login,
			signUp,
			forgotPassword,
			resetState
		});

		$$self.$inject_state = $$props => {
			if ('email' in $$props) $$invalidate(0, email = $$props.email);
			if ('password' in $$props) $$invalidate(1, password = $$props.password);
			if ('confirmPassword' in $$props) $$invalidate(2, confirmPassword = $$props.confirmPassword);
			if ('resetEmail' in $$props) $$invalidate(3, resetEmail = $$props.resetEmail);
			if ('message' in $$props) message = $$props.message;
			if ('isLogin' in $$props) $$invalidate(4, isLogin = $$props.isLogin);
			if ('forgot' in $$props) $$invalidate(5, forgot = $$props.forgot);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			email,
			password,
			confirmPassword,
			resetEmail,
			isLogin,
			forgot,
			login,
			signUp,
			forgotPassword,
			resetState,
			input0_input_handler,
			input1_input_handler,
			click_handler,
			click_handler_1,
			input0_input_handler_1,
			input1_input_handler_1,
			input2_input_handler,
			click_handler_2,
			input_input_handler,
			click_handler_3
		];
	}

	class Login extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Login",
				options,
				id: create_fragment$4.name
			});
		}
	}

	async function authFetch(url, options = {}) {
	    const token = localStorage.getItem("accessToken");

	    options.headers = {
	        ...(options.headers || {}),
	        Authorization: `Bearer ${token}`
	    };

	    let res = await fetch(url, options);

	    // If access token expired
	    if (res.status === 403) {
	        const refreshToken = localStorage.getItem("refreshToken");

	        const refreshRes = await fetch("http://localhost:5000/api/auth/refresh", {
	            method: "POST",
	            headers: { "Content-Type": "application/json" },
	            body: JSON.stringify({ refreshToken })
	        });

	        const refreshData = await refreshRes.json();

	        if (!refreshData.accessToken) {
	            // User must log in again
	            localStorage.clear();
	            window.location.href = "/";
	            return res;
	        }

	        localStorage.setItem("accessToken", refreshData.accessToken);

	        // Retry original request
	        options.headers.Authorization = `Bearer ${refreshData.accessToken}`;
	        res = await fetch(url, options);
	    }

	    return res;
	}

	/* src\components\Content.svelte generated by Svelte v4.2.20 */
	const file$3 = "src\\components\\Content.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[15] = list[i];
		return child_ctx;
	}

	// (96:8) {:else}
	function create_else_block$2(ctx) {
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				button.textContent = "Post";
				add_location(button, file$3, 96, 12, 2635);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);

				if (!mounted) {
					dispose = listen_dev(button, "click", /*createPost*/ ctx[5], false, false, false, false);
					mounted = true;
				}
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$2.name,
			type: "else",
			source: "(96:8) {:else}",
			ctx
		});

		return block;
	}

	// (93:8) {#if editingId}
	function create_if_block_2$2(ctx) {
		let button0;
		let t1;
		let button1;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button0 = element("button");
				button0.textContent = "Save";
				t1 = space();
				button1 = element("button");
				button1.textContent = "Cancel";
				add_location(button0, file$3, 93, 12, 2468);
				add_location(button1, file$3, 94, 12, 2523);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button0, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, button1, anchor);

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", /*saveEdit*/ ctx[7], false, false, false, false),
						listen_dev(button1, "click", /*click_handler*/ ctx[11], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button0);
					detach_dev(t1);
					detach_dev(button1);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$2.name,
			type: "if",
			source: "(93:8) {#if editingId}",
			ctx
		});

		return block;
	}

	// (112:12) {#if post.image}
	function create_if_block_1$2(ctx) {
		let img;
		let img_src_value;

		const block = {
			c: function create() {
				img = element("img");
				if (!src_url_equal(img.src, img_src_value = /*post*/ ctx[15].image)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", "Post image");
				attr_dev(img, "width", "250");
				attr_dev(img, "class", "svelte-60c5ik");
				add_location(img, file$3, 112, 16, 3022);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*posts*/ 1 && !src_url_equal(img.src, img_src_value = /*post*/ ctx[15].image)) {
					attr_dev(img, "src", img_src_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$2.name,
			type: "if",
			source: "(112:12) {#if post.image}",
			ctx
		});

		return block;
	}

	// (116:12) {#if Number(post.userId) === myId}
	function create_if_block$2(ctx) {
		let button0;
		let t1;
		let button1;
		let mounted;
		let dispose;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[12](/*post*/ ctx[15]);
		}

		function click_handler_2() {
			return /*click_handler_2*/ ctx[13](/*post*/ ctx[15]);
		}

		const block = {
			c: function create() {
				button0 = element("button");
				button0.textContent = "Edit";
				t1 = space();
				button1 = element("button");
				button1.textContent = "Delete";
				attr_dev(button0, "class", "edit svelte-60c5ik");
				add_location(button0, file$3, 116, 16, 3162);
				attr_dev(button1, "class", "delete svelte-60c5ik");
				add_location(button1, file$3, 117, 16, 3247);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button0, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, button1, anchor);

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", click_handler_1, false, false, false, false),
						listen_dev(button1, "click", click_handler_2, false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button0);
					detach_dev(t1);
					detach_dev(button1);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$2.name,
			type: "if",
			source: "(116:12) {#if Number(post.userId) === myId}",
			ctx
		});

		return block;
	}

	// (103:4) {#each posts as post}
	function create_each_block$1(ctx) {
		let div;
		let p0;
		let strong;
		let a;
		let t0_value = /*post*/ ctx[15].email + "";
		let t0;
		let a_href_value;
		let t1;
		let p1;
		let t2_value = /*post*/ ctx[15].text + "";
		let t2;
		let t3;
		let t4;
		let show_if = Number(/*post*/ ctx[15].userId) === /*myId*/ ctx[4];
		let t5;
		let if_block0 = /*post*/ ctx[15].image && create_if_block_1$2(ctx);
		let if_block1 = show_if && create_if_block$2(ctx);

		const block = {
			c: function create() {
				div = element("div");
				p0 = element("p");
				strong = element("strong");
				a = element("a");
				t0 = text(t0_value);
				t1 = space();
				p1 = element("p");
				t2 = text(t2_value);
				t3 = space();
				if (if_block0) if_block0.c();
				t4 = space();
				if (if_block1) if_block1.c();
				t5 = space();
				attr_dev(a, "href", a_href_value = `#/user/${/*post*/ ctx[15].userId}`);
				attr_dev(a, "class", "svelte-60c5ik");
				add_location(a, file$3, 106, 20, 2845);
				add_location(strong, file$3, 105, 16, 2815);
				add_location(p0, file$3, 104, 12, 2794);
				add_location(p1, file$3, 109, 12, 2954);
				attr_dev(div, "class", "post svelte-60c5ik");
				add_location(div, file$3, 103, 8, 2762);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, p0);
				append_dev(p0, strong);
				append_dev(strong, a);
				append_dev(a, t0);
				append_dev(div, t1);
				append_dev(div, p1);
				append_dev(p1, t2);
				append_dev(div, t3);
				if (if_block0) if_block0.m(div, null);
				append_dev(div, t4);
				if (if_block1) if_block1.m(div, null);
				append_dev(div, t5);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*posts*/ 1 && t0_value !== (t0_value = /*post*/ ctx[15].email + "")) set_data_dev(t0, t0_value);

				if (dirty & /*posts*/ 1 && a_href_value !== (a_href_value = `#/user/${/*post*/ ctx[15].userId}`)) {
					attr_dev(a, "href", a_href_value);
				}

				if (dirty & /*posts*/ 1 && t2_value !== (t2_value = /*post*/ ctx[15].text + "")) set_data_dev(t2, t2_value);

				if (/*post*/ ctx[15].image) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_1$2(ctx);
						if_block0.c();
						if_block0.m(div, t4);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (dirty & /*posts*/ 1) show_if = Number(/*post*/ ctx[15].userId) === /*myId*/ ctx[4];

				if (show_if) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block$2(ctx);
						if_block1.c();
						if_block1.m(div, t5);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$1.name,
			type: "each",
			source: "(103:4) {#each posts as post}",
			ctx
		});

		return block;
	}

	function create_fragment$3(ctx) {
		let main;
		let h1;
		let t1;
		let section;
		let h2;
		let t2_value = (/*editingId*/ ctx[3] ? "Edit Post" : "New Post") + "";
		let t2;
		let t3;
		let input0;
		let t4;
		let input1;
		let t5;
		let t6;
		let hr;
		let t7;
		let mounted;
		let dispose;

		function select_block_type(ctx, dirty) {
			if (/*editingId*/ ctx[3]) return create_if_block_2$2;
			return create_else_block$2;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);
		let each_value = ensure_array_like_dev(/*posts*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				main = element("main");
				h1 = element("h1");
				h1.textContent = "All Posts";
				t1 = space();
				section = element("section");
				h2 = element("h2");
				t2 = text(t2_value);
				t3 = space();
				input0 = element("input");
				t4 = space();
				input1 = element("input");
				t5 = space();
				if_block.c();
				t6 = space();
				hr = element("hr");
				t7 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				add_location(h1, file$3, 84, 4, 2190);
				add_location(h2, file$3, 87, 8, 2235);
				attr_dev(input0, "placeholder", "Write something...");
				add_location(input0, file$3, 89, 8, 2294);
				attr_dev(input1, "placeholder", "Image URL (optional)");
				add_location(input1, file$3, 90, 8, 2364);
				attr_dev(section, "class", "svelte-60c5ik");
				add_location(section, file$3, 86, 4, 2216);
				add_location(hr, file$3, 100, 4, 2717);
				attr_dev(main, "class", "svelte-60c5ik");
				add_location(main, file$3, 83, 0, 2178);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, main, anchor);
				append_dev(main, h1);
				append_dev(main, t1);
				append_dev(main, section);
				append_dev(section, h2);
				append_dev(h2, t2);
				append_dev(section, t3);
				append_dev(section, input0);
				set_input_value(input0, /*text*/ ctx[1]);
				append_dev(section, t4);
				append_dev(section, input1);
				set_input_value(input1, /*image*/ ctx[2]);
				append_dev(section, t5);
				if_block.m(section, null);
				append_dev(main, t6);
				append_dev(main, hr);
				append_dev(main, t7);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(main, null);
					}
				}

				if (!mounted) {
					dispose = [
						listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
						listen_dev(input1, "input", /*input1_input_handler*/ ctx[10])
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*editingId*/ 8 && t2_value !== (t2_value = (/*editingId*/ ctx[3] ? "Edit Post" : "New Post") + "")) set_data_dev(t2, t2_value);

				if (dirty & /*text*/ 2 && input0.value !== /*text*/ ctx[1]) {
					set_input_value(input0, /*text*/ ctx[1]);
				}

				if (dirty & /*image*/ 4 && input1.value !== /*image*/ ctx[2]) {
					set_input_value(input1, /*image*/ ctx[2]);
				}

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(section, null);
					}
				}

				if (dirty & /*deletePost, posts, startEdit, Number, myId*/ 337) {
					each_value = ensure_array_like_dev(/*posts*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(main, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(main);
				}

				if_block.d();
				destroy_each(each_blocks, detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$3.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Content', slots, []);
		let posts = [];
		let text = "";
		let image = "";
		let editingId = null;
		const myId = Number(localStorage.getItem("userId"));

		async function loadPosts() {
			const res = await fetch("http://localhost:5000/api/auth/posts");
			$$invalidate(0, posts = await res.json());
		}

		async function createPost() {
			if (!text.trim() && !image.trim()) {
				toast.error("Cannot post empty content");
				return;
			}

			const res = await authFetch("http://localhost:5000/api/auth/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, image })
			});

			const data = await res.json();

			if (data.success) {
				toast.success("Post created!");
				$$invalidate(1, text = "");
				$$invalidate(2, image = "");
				loadPosts();
			}
		}

		function startEdit(post) {
			$$invalidate(3, editingId = post.id);
			$$invalidate(1, text = post.text);
			$$invalidate(2, image = post.image);
		}

		async function saveEdit() {
			const res = await authFetch(`http://localhost:5000/api/auth/posts/${editingId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, image })
			});

			const data = await res.json();

			if (data.success) {
				toast.success("Post updated!");
				$$invalidate(3, editingId = null);
				$$invalidate(1, text = "");
				$$invalidate(2, image = "");
				loadPosts();
			}
		}

		async function deletePost(id) {
			if (!confirm("Delete this post?")) return;
			const res = await authFetch(`http://localhost:5000/api/auth/posts/${id}`, { method: "DELETE" });
			const data = await res.json();

			if (data.success) {
				toast.success("Post deleted!");
				loadPosts();
			}
		}

		onMount(() => {
			loadPosts();
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Content> was created with unknown prop '${key}'`);
		});

		function input0_input_handler() {
			text = this.value;
			$$invalidate(1, text);
		}

		function input1_input_handler() {
			image = this.value;
			$$invalidate(2, image);
		}

		const click_handler = () => {
			$$invalidate(3, editingId = null);
			$$invalidate(1, text = "");
			$$invalidate(2, image = "");
		};

		const click_handler_1 = post => startEdit(post);
		const click_handler_2 = post => deletePost(post.id);

		$$self.$capture_state = () => ({
			onMount,
			authFetch,
			toast,
			posts,
			text,
			image,
			editingId,
			myId,
			loadPosts,
			createPost,
			startEdit,
			saveEdit,
			deletePost
		});

		$$self.$inject_state = $$props => {
			if ('posts' in $$props) $$invalidate(0, posts = $$props.posts);
			if ('text' in $$props) $$invalidate(1, text = $$props.text);
			if ('image' in $$props) $$invalidate(2, image = $$props.image);
			if ('editingId' in $$props) $$invalidate(3, editingId = $$props.editingId);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			posts,
			text,
			image,
			editingId,
			myId,
			createPost,
			startEdit,
			saveEdit,
			deletePost,
			input0_input_handler,
			input1_input_handler,
			click_handler,
			click_handler_1,
			click_handler_2
		];
	}

	class Content extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Content",
				options,
				id: create_fragment$3.name
			});
		}
	}

	/* src\components\ResetPassword.svelte generated by Svelte v4.2.20 */
	const file$2 = "src\\components\\ResetPassword.svelte";

	function create_fragment$2(ctx) {
		let input0;
		let t0;
		let input1;
		let t1;
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				input0 = element("input");
				t0 = space();
				input1 = element("input");
				t1 = space();
				button = element("button");
				button.textContent = "Reset Password";
				attr_dev(input0, "type", "password");
				attr_dev(input0, "placeholder", "New password");
				add_location(input0, file$2, 29, 0, 794);
				attr_dev(input1, "type", "password");
				attr_dev(input1, "placeholder", "Confirm password");
				add_location(input1, file$2, 30, 0, 870);
				add_location(button, file$2, 31, 0, 957);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, input0, anchor);
				set_input_value(input0, /*password*/ ctx[0]);
				insert_dev(target, t0, anchor);
				insert_dev(target, input1, anchor);
				set_input_value(input1, /*confirmPassword*/ ctx[1]);
				insert_dev(target, t1, anchor);
				insert_dev(target, button, anchor);

				if (!mounted) {
					dispose = [
						listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
						listen_dev(input1, "input", /*input1_input_handler*/ ctx[4]),
						listen_dev(button, "click", /*resetPassword*/ ctx[2], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*password*/ 1 && input0.value !== /*password*/ ctx[0]) {
					set_input_value(input0, /*password*/ ctx[0]);
				}

				if (dirty & /*confirmPassword*/ 2 && input1.value !== /*confirmPassword*/ ctx[1]) {
					set_input_value(input1, /*confirmPassword*/ ctx[1]);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(input0);
					detach_dev(t0);
					detach_dev(input1);
					detach_dev(t1);
					detach_dev(button);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$2.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ResetPassword', slots, []);
		const params = new URLSearchParams(window.location.hash.split("?")[1]);
		const token = params.get("token");
		let password = "";
		let confirmPassword = "";

		async function resetPassword() {
			const res = await fetch("http://localhost:5000/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, password, confirmPassword })
			});

			const data = await res.json();

			if (data.success) {
				toast.success("Password updated!");
				window.location.href = "/";
			} else {
				toast.error(data.error);
			}
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ResetPassword> was created with unknown prop '${key}'`);
		});

		function input0_input_handler() {
			password = this.value;
			$$invalidate(0, password);
		}

		function input1_input_handler() {
			confirmPassword = this.value;
			$$invalidate(1, confirmPassword);
		}

		$$self.$capture_state = () => ({
			toast,
			params,
			token,
			password,
			confirmPassword,
			resetPassword
		});

		$$self.$inject_state = $$props => {
			if ('password' in $$props) $$invalidate(0, password = $$props.password);
			if ('confirmPassword' in $$props) $$invalidate(1, confirmPassword = $$props.confirmPassword);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			password,
			confirmPassword,
			resetPassword,
			input0_input_handler,
			input1_input_handler
		];
	}

	class ResetPassword extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ResetPassword",
				options,
				id: create_fragment$2.name
			});
		}
	}

	/* src\components\UserPage.svelte generated by Svelte v4.2.20 */
	const file$1 = "src\\components\\UserPage.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[18] = list[i];
		return child_ctx;
	}

	// (154:4) {:else}
	function create_else_block_1(ctx) {
		let p;

		const block = {
			c: function create() {
				p = element("p");
				p.textContent = "Select a user to view their posts.";
				add_location(p, file$1, 154, 8, 4694);
			},
			m: function mount(target, anchor) {
				insert_dev(target, p, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(p);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1.name,
			type: "else",
			source: "(154:4) {:else}",
			ctx
		});

		return block;
	}

	// (118:4) {#if userId !== null}
	function create_if_block$1(ctx) {
		let h1;
		let t0;
		let t1;
		let t2;
		let a;
		let t4;
		let t5;
		let hr;
		let t6;
		let each_1_anchor;
		let if_block = /*userId*/ ctx[5] === /*myId*/ ctx[6] && create_if_block_3$1(ctx);
		let each_value = ensure_array_like_dev(/*posts*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				h1 = element("h1");
				t0 = text(/*email*/ ctx[4]);
				t1 = text("'s Posts");
				t2 = space();
				a = element("a");
				a.textContent = "← Back to All Posts";
				t4 = space();
				if (if_block) if_block.c();
				t5 = space();
				hr = element("hr");
				t6 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
				add_location(h1, file$1, 118, 8, 3323);
				attr_dev(a, "href", "#/");
				attr_dev(a, "class", "svelte-60c5ik");
				add_location(a, file$1, 119, 8, 3357);
				add_location(hr, file$1, 136, 8, 4038);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h1, anchor);
				append_dev(h1, t0);
				append_dev(h1, t1);
				insert_dev(target, t2, anchor);
				insert_dev(target, a, anchor);
				insert_dev(target, t4, anchor);
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, t5, anchor);
				insert_dev(target, hr, anchor);
				insert_dev(target, t6, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*email*/ 16) set_data_dev(t0, /*email*/ ctx[4]);

				if (/*userId*/ ctx[5] === /*myId*/ ctx[6]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_3$1(ctx);
						if_block.c();
						if_block.m(t5.parentNode, t5);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty & /*deletePost, posts, startEdit, Number, myId*/ 1345) {
					each_value = ensure_array_like_dev(/*posts*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(h1);
					detach_dev(t2);
					detach_dev(a);
					detach_dev(t4);
					detach_dev(t5);
					detach_dev(hr);
					detach_dev(t6);
					detach_dev(each_1_anchor);
				}

				if (if_block) if_block.d(detaching);
				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$1.name,
			type: "if",
			source: "(118:4) {#if userId !== null}",
			ctx
		});

		return block;
	}

	// (122:8) {#if userId === myId}
	function create_if_block_3$1(ctx) {
		let section;
		let h2;
		let t0_value = (/*editingId*/ ctx[3] ? "Edit Post" : "New Post") + "";
		let t0;
		let t1;
		let input0;
		let t2;
		let input1;
		let t3;
		let mounted;
		let dispose;

		function select_block_type_1(ctx, dirty) {
			if (/*editingId*/ ctx[3]) return create_if_block_4;
			return create_else_block$1;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				section = element("section");
				h2 = element("h2");
				t0 = text(t0_value);
				t1 = space();
				input0 = element("input");
				t2 = space();
				input1 = element("input");
				t3 = space();
				if_block.c();
				add_location(h2, file$1, 123, 16, 3467);
				attr_dev(input0, "placeholder", "Write something...");
				add_location(input0, file$1, 124, 16, 3532);
				attr_dev(input1, "placeholder", "Image URL (optional)");
				add_location(input1, file$1, 125, 16, 3610);
				attr_dev(section, "class", "svelte-60c5ik");
				add_location(section, file$1, 122, 12, 3440);
			},
			m: function mount(target, anchor) {
				insert_dev(target, section, anchor);
				append_dev(section, h2);
				append_dev(h2, t0);
				append_dev(section, t1);
				append_dev(section, input0);
				set_input_value(input0, /*text*/ ctx[1]);
				append_dev(section, t2);
				append_dev(section, input1);
				set_input_value(input1, /*image*/ ctx[2]);
				append_dev(section, t3);
				if_block.m(section, null);

				if (!mounted) {
					dispose = [
						listen_dev(input0, "input", /*input0_input_handler*/ ctx[11]),
						listen_dev(input1, "input", /*input1_input_handler*/ ctx[12])
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*editingId*/ 8 && t0_value !== (t0_value = (/*editingId*/ ctx[3] ? "Edit Post" : "New Post") + "")) set_data_dev(t0, t0_value);

				if (dirty & /*text*/ 2 && input0.value !== /*text*/ ctx[1]) {
					set_input_value(input0, /*text*/ ctx[1]);
				}

				if (dirty & /*image*/ 4 && input1.value !== /*image*/ ctx[2]) {
					set_input_value(input1, /*image*/ ctx[2]);
				}

				if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(section, null);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(section);
				}

				if_block.d();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3$1.name,
			type: "if",
			source: "(122:8) {#if userId === myId}",
			ctx
		});

		return block;
	}

	// (131:16) {:else}
	function create_else_block$1(ctx) {
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				button.textContent = "Post";
				add_location(button, file$1, 131, 20, 3921);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);

				if (!mounted) {
					dispose = listen_dev(button, "click", /*createPost*/ ctx[7], false, false, false, false);
					mounted = true;
				}
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$1.name,
			type: "else",
			source: "(131:16) {:else}",
			ctx
		});

		return block;
	}

	// (128:16) {#if editingId}
	function create_if_block_4(ctx) {
		let button0;
		let t1;
		let button1;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button0 = element("button");
				button0.textContent = "Save";
				t1 = space();
				button1 = element("button");
				button1.textContent = "Cancel";
				add_location(button0, file$1, 128, 20, 3730);
				add_location(button1, file$1, 129, 20, 3793);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button0, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, button1, anchor);

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", /*saveEdit*/ ctx[9], false, false, false, false),
						listen_dev(button1, "click", /*click_handler*/ ctx[13], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button0);
					detach_dev(t1);
					detach_dev(button1);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4.name,
			type: "if",
			source: "(128:16) {#if editingId}",
			ctx
		});

		return block;
	}

	// (144:16) {#if post.image}
	function create_if_block_2$1(ctx) {
		let img;
		let img_src_value;

		const block = {
			c: function create() {
				img = element("img");
				if (!src_url_equal(img.src, img_src_value = /*post*/ ctx[18].image)) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", "Post image");
				attr_dev(img, "width", "250");
				attr_dev(img, "class", "svelte-60c5ik");
				add_location(img, file$1, 144, 20, 4295);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*posts*/ 1 && !src_url_equal(img.src, img_src_value = /*post*/ ctx[18].image)) {
					attr_dev(img, "src", img_src_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$1.name,
			type: "if",
			source: "(144:16) {#if post.image}",
			ctx
		});

		return block;
	}

	// (148:16) {#if Number(post.userId) === myId}
	function create_if_block_1$1(ctx) {
		let button0;
		let t1;
		let button1;
		let mounted;
		let dispose;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[14](/*post*/ ctx[18]);
		}

		function click_handler_2() {
			return /*click_handler_2*/ ctx[15](/*post*/ ctx[18]);
		}

		const block = {
			c: function create() {
				button0 = element("button");
				button0.textContent = "Edit";
				t1 = space();
				button1 = element("button");
				button1.textContent = "Delete";
				attr_dev(button0, "class", "edit svelte-60c5ik");
				add_location(button0, file$1, 148, 20, 4447);
				attr_dev(button1, "class", "delete svelte-60c5ik");
				add_location(button1, file$1, 149, 20, 4536);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button0, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, button1, anchor);

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", click_handler_1, false, false, false, false),
						listen_dev(button1, "click", click_handler_2, false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button0);
					detach_dev(t1);
					detach_dev(button1);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$1.name,
			type: "if",
			source: "(148:16) {#if Number(post.userId) === myId}",
			ctx
		});

		return block;
	}

	// (139:8) {#each posts as post}
	function create_each_block(ctx) {
		let div;
		let p0;
		let strong;
		let a;
		let t0_value = /*post*/ ctx[18].email + "";
		let t0;
		let a_href_value;
		let t1;
		let p1;
		let t2_value = /*post*/ ctx[18].text + "";
		let t2;
		let t3;
		let t4;
		let show_if = Number(/*post*/ ctx[18].userId) === /*myId*/ ctx[6];
		let t5;
		let if_block0 = /*post*/ ctx[18].image && create_if_block_2$1(ctx);
		let if_block1 = show_if && create_if_block_1$1(ctx);

		const block = {
			c: function create() {
				div = element("div");
				p0 = element("p");
				strong = element("strong");
				a = element("a");
				t0 = text(t0_value);
				t1 = space();
				p1 = element("p");
				t2 = text(t2_value);
				t3 = space();
				if (if_block0) if_block0.c();
				t4 = space();
				if (if_block1) if_block1.c();
				t5 = space();
				attr_dev(a, "href", a_href_value = `#/user/${/*post*/ ctx[18].userId}`);
				attr_dev(a, "class", "svelte-60c5ik");
				add_location(a, file$1, 140, 27, 4138);
				add_location(strong, file$1, 140, 19, 4130);
				add_location(p0, file$1, 140, 16, 4127);
				add_location(p1, file$1, 141, 16, 4219);
				attr_dev(div, "class", "post svelte-60c5ik");
				add_location(div, file$1, 139, 12, 4091);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, p0);
				append_dev(p0, strong);
				append_dev(strong, a);
				append_dev(a, t0);
				append_dev(div, t1);
				append_dev(div, p1);
				append_dev(p1, t2);
				append_dev(div, t3);
				if (if_block0) if_block0.m(div, null);
				append_dev(div, t4);
				if (if_block1) if_block1.m(div, null);
				append_dev(div, t5);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*posts*/ 1 && t0_value !== (t0_value = /*post*/ ctx[18].email + "")) set_data_dev(t0, t0_value);

				if (dirty & /*posts*/ 1 && a_href_value !== (a_href_value = `#/user/${/*post*/ ctx[18].userId}`)) {
					attr_dev(a, "href", a_href_value);
				}

				if (dirty & /*posts*/ 1 && t2_value !== (t2_value = /*post*/ ctx[18].text + "")) set_data_dev(t2, t2_value);

				if (/*post*/ ctx[18].image) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_2$1(ctx);
						if_block0.c();
						if_block0.m(div, t4);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (dirty & /*posts*/ 1) show_if = Number(/*post*/ ctx[18].userId) === /*myId*/ ctx[6];

				if (show_if) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_1$1(ctx);
						if_block1.c();
						if_block1.m(div, t5);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(139:8) {#each posts as post}",
			ctx
		});

		return block;
	}

	function create_fragment$1(ctx) {
		let main;

		function select_block_type(ctx, dirty) {
			if (/*userId*/ ctx[5] !== null) return create_if_block$1;
			return create_else_block_1;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				main = element("main");
				if_block.c();
				attr_dev(main, "class", "svelte-60c5ik");
				add_location(main, file$1, 116, 0, 3280);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, main, anchor);
				if_block.m(main, null);
			},
			p: function update(ctx, [dirty]) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(main, null);
					}
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(main);
				}

				if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('UserPage', slots, []);
		let posts = [];
		let text = "";
		let image = "";
		let editingId = null;
		let email = "";
		let userId = null; // Current user page we are viewing
		const myId = Number(localStorage.getItem("userId"));

		// Parse hash to get userId
		function checkHash() {
			const hash = window.location.hash;

			if (hash.startsWith("#/user/")) {
				$$invalidate(5, userId = Number(hash.split("/")[2]));
				loadUserPosts();
			} else {
				$$invalidate(5, userId = null);
				$$invalidate(0, posts = []);
			}
		}

		// Load posts for this specific user
		async function loadUserPosts() {
			if (!userId) return;

			// Fetch all posts
			const res = await fetch("http://localhost:5000/api/auth/posts");

			const allPosts = await res.json();

			// Filter posts for this user only
			$$invalidate(0, posts = allPosts.filter(p => Number(p.userId) === userId));

			// Get user email
			if (posts.length > 0) {
				$$invalidate(4, email = posts[0].email);
			} else {
				// fallback if user has no posts
				const userRes = await fetch(`http://localhost:5000/api/auth/user/${userId}`);

				const userData = await userRes.json();
				$$invalidate(4, email = userData.email || "Unknown User");
			}
		}

		async function createPost() {
			if (!text.trim() && !image.trim()) {
				toast.error("Cannot post empty content");
				return;
			}

			const res = await authFetch("http://localhost:5000/api/auth/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, image })
			});

			const data = await res.json();

			if (data.success) {
				toast.success("Post created!");
				$$invalidate(1, text = "");
				$$invalidate(2, image = "");
				loadUserPosts();
			}
		}

		function startEdit(post) {
			$$invalidate(3, editingId = post.id);
			$$invalidate(1, text = post.text);
			$$invalidate(2, image = post.image);
		}

		async function saveEdit() {
			const res = await authFetch(`http://localhost:5000/api/auth/posts/${editingId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, image })
			});

			const data = await res.json();

			if (data.success) {
				toast.success("Post updated!");
				$$invalidate(3, editingId = null);
				$$invalidate(1, text = "");
				$$invalidate(2, image = "");
				loadUserPosts();
			}
		}

		async function deletePost(id) {
			if (!confirm("Delete this post?")) return;
			const res = await authFetch(`http://localhost:5000/api/auth/posts/${id}`, { method: "DELETE" });
			const data = await res.json();

			if (data.success) {
				toast.success("Post deleted!");
				loadUserPosts();
			}
		}

		// Run on mount and listen to hash changes
		onMount(() => {
			checkHash();
			window.addEventListener("hashchange", checkHash);
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<UserPage> was created with unknown prop '${key}'`);
		});

		function input0_input_handler() {
			text = this.value;
			$$invalidate(1, text);
		}

		function input1_input_handler() {
			image = this.value;
			$$invalidate(2, image);
		}

		const click_handler = () => {
			$$invalidate(3, editingId = null);
			$$invalidate(1, text = "");
			$$invalidate(2, image = "");
		};

		const click_handler_1 = post => startEdit(post);
		const click_handler_2 = post => deletePost(post.id);

		$$self.$capture_state = () => ({
			onMount,
			authFetch,
			toast,
			posts,
			text,
			image,
			editingId,
			email,
			userId,
			myId,
			checkHash,
			loadUserPosts,
			createPost,
			startEdit,
			saveEdit,
			deletePost
		});

		$$self.$inject_state = $$props => {
			if ('posts' in $$props) $$invalidate(0, posts = $$props.posts);
			if ('text' in $$props) $$invalidate(1, text = $$props.text);
			if ('image' in $$props) $$invalidate(2, image = $$props.image);
			if ('editingId' in $$props) $$invalidate(3, editingId = $$props.editingId);
			if ('email' in $$props) $$invalidate(4, email = $$props.email);
			if ('userId' in $$props) $$invalidate(5, userId = $$props.userId);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			posts,
			text,
			image,
			editingId,
			email,
			userId,
			myId,
			createPost,
			startEdit,
			saveEdit,
			deletePost,
			input0_input_handler,
			input1_input_handler,
			click_handler,
			click_handler_1,
			click_handler_2
		];
	}

	class UserPage extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "UserPage",
				options,
				id: create_fragment$1.name
			});
		}
	}

	/* src\App.svelte generated by Svelte v4.2.20 */
	const file = "src\\App.svelte";

	// (48:4) {#if loggedIn}
	function create_if_block_3(ctx) {
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				button.textContent = "Log out";
				attr_dev(button, "class", "logout svelte-4o1cxu");
				add_location(button, file, 48, 8, 1283);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);

				if (!mounted) {
					dispose = listen_dev(button, "click", /*logout*/ ctx[4], false, false, false, false);
					mounted = true;
				}
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3.name,
			type: "if",
			source: "(48:4) {#if loggedIn}",
			ctx
		});

		return block;
	}

	// (59:0) {:else}
	function create_else_block(ctx) {
		let login;
		let current;
		login = new Login({ $$inline: true });
		login.$on("loginSuccess", /*handleLoginSuccess*/ ctx[3]);

		const block = {
			c: function create() {
				create_component(login.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(login, target, anchor);
				current = true;
			},
			p: noop,
			i: function intro(local) {
				if (current) return;
				transition_in(login.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(login.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(login, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block.name,
			type: "else",
			source: "(59:0) {:else}",
			ctx
		});

		return block;
	}

	// (57:19) 
	function create_if_block_2(ctx) {
		let content;
		let current;
		content = new Content({ $$inline: true });

		const block = {
			c: function create() {
				create_component(content.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(content, target, anchor);
				current = true;
			},
			p: noop,
			i: function intro(local) {
				if (current) return;
				transition_in(content.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(content.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(content, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2.name,
			type: "if",
			source: "(57:19) ",
			ctx
		});

		return block;
	}

	// (55:56) 
	function create_if_block_1(ctx) {
		let userpage;
		let current;

		userpage = new UserPage({
				props: { userId: /*userId*/ ctx[2] },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(userpage.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(userpage, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const userpage_changes = {};
				if (dirty & /*userId*/ 4) userpage_changes.userId = /*userId*/ ctx[2];
				userpage.$set(userpage_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(userpage.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(userpage.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(userpage, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1.name,
			type: "if",
			source: "(55:56) ",
			ctx
		});

		return block;
	}

	// (53:0) {#if hash.startsWith("#/reset-password")}
	function create_if_block(ctx) {
		let resetpassword;
		let current;
		resetpassword = new ResetPassword({ $$inline: true });

		const block = {
			c: function create() {
				create_component(resetpassword.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(resetpassword, target, anchor);
				current = true;
			},
			p: noop,
			i: function intro(local) {
				if (current) return;
				transition_in(resetpassword.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(resetpassword.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(resetpassword, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(53:0) {#if hash.startsWith(\\\"#/reset-password\\\")}",
			ctx
		});

		return block;
	}

	function create_fragment(ctx) {
		let toaster;
		let t0;
		let header;
		let t1;
		let show_if;
		let show_if_1;
		let current_block_type_index;
		let if_block1;
		let if_block1_anchor;
		let current;
		toaster = new Toaster({ $$inline: true });
		let if_block0 = /*loggedIn*/ ctx[0] && create_if_block_3(ctx);
		const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2, create_else_block];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (dirty & /*hash*/ 2) show_if = null;
			if (dirty & /*hash, userId*/ 6) show_if_1 = null;
			if (show_if == null) show_if = !!/*hash*/ ctx[1].startsWith("#/reset-password");
			if (show_if) return 0;
			if (show_if_1 == null) show_if_1 = !!(/*hash*/ ctx[1].startsWith("#/user/") && /*userId*/ ctx[2] !== null);
			if (show_if_1) return 1;
			if (/*loggedIn*/ ctx[0]) return 2;
			return 3;
		}

		current_block_type_index = select_block_type(ctx, -1);
		if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				create_component(toaster.$$.fragment);
				t0 = space();
				header = element("header");
				if (if_block0) if_block0.c();
				t1 = space();
				if_block1.c();
				if_block1_anchor = empty();
				attr_dev(header, "class", "svelte-4o1cxu");
				add_location(header, file, 46, 0, 1245);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				mount_component(toaster, target, anchor);
				insert_dev(target, t0, anchor);
				insert_dev(target, header, anchor);
				if (if_block0) if_block0.m(header, null);
				insert_dev(target, t1, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block1_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (/*loggedIn*/ ctx[0]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_3(ctx);
						if_block0.c();
						if_block0.m(header, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx, dirty);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block1 = if_blocks[current_block_type_index];

					if (!if_block1) {
						if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block1.c();
					} else {
						if_block1.p(ctx, dirty);
					}

					transition_in(if_block1, 1);
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(toaster.$$.fragment, local);
				transition_in(if_block1);
				current = true;
			},
			o: function outro(local) {
				transition_out(toaster.$$.fragment, local);
				transition_out(if_block1);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(header);
					detach_dev(t1);
					detach_dev(if_block1_anchor);
				}

				destroy_component(toaster, detaching);
				if (if_block0) if_block0.d();
				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);
		let loggedIn = false;

		if (localStorage.getItem("accessToken")) {
			loggedIn = true;
		}

		function handleLoginSuccess() {
			$$invalidate(0, loggedIn = true);
		}

		async function logout() {
			const refreshToken = localStorage.getItem("refreshToken");

			await fetch("http://localhost:5000/api/auth/logout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ refreshToken })
			});

			localStorage.clear();
			$$invalidate(0, loggedIn = false);
			window.location.href = "/";
		}

		// Hash routing
		let hash = window.location.hash;

		window.addEventListener("hashchange", () => {
			$$invalidate(1, hash = window.location.hash);
		});

		// Detect user ID from hash
		let userId = null;

		if (hash.startsWith("#/user/")) {
			userId = Number(hash.split("/")[2]);
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({
			Login,
			Content,
			ResetPassword,
			UserPage,
			Toaster,
			loggedIn,
			handleLoginSuccess,
			logout,
			hash,
			userId
		});

		$$self.$inject_state = $$props => {
			if ('loggedIn' in $$props) $$invalidate(0, loggedIn = $$props.loggedIn);
			if ('hash' in $$props) $$invalidate(1, hash = $$props.hash);
			if ('userId' in $$props) $$invalidate(2, userId = $$props.userId);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [loggedIn, hash, userId, handleLoginSuccess, logout];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	const app = new App({
		target: document.body,
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
