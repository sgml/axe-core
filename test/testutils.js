var testUtils = {};

/**
 * Create a check context for mocking/resetting data and relatedNodes in tests
 *
 * @return Object
 */
testUtils.MockCheckContext = function () {
	'use strict';
	return {
		_relatedNodes: [],
		_data: null,
		data: function (d) {
			this._data = d;
		},
		relatedNodes: function (rn) {
			this._relatedNodes = rn;
		},
		reset: function () {
			this._data = null;
			this._relatedNodes = [];
		}
	};
};

/**
 * Provide an API for determining Shadow DOM v0 and v1 support in tests.
 * PhantomJS doesn't have Shadow DOM support, while some browsers do.
 *
 * @param HTMLDocumentElement		The document of the current context
 * @return Object
 */
testUtils.shadowSupport = (function(document) {
	'use strict';
	var v0 = document.body && typeof document.body.createShadowRoot === 'function',
			v1 = document.body && typeof document.body.attachShadow === 'function';

	return {
		v0: (v0 === true),
		v1: (v1 === true),
		undefined: (
			document.body && typeof document.body.attachShadow === 'undefined' &&
			typeof document.body.createShadowRoot === 'undefined'
		)
	};

})(document);

/**
 * Method for injecting content into a fixture and caching
 * the flattened DOM tree (light and Shadow DOM together)
 *
 * @param Node|String 	Stuff to go into the fixture (html or DOM node)
 * @return HTMLElement
 */
testUtils.fixtureSetup = function (content) {
	'use strict';
	var fixture = document.querySelector('#fixture');
	fixture.innerHTML = '';
	if (typeof content === 'string') {
		fixture.innerHTML = content;
	} else if (content instanceof Node) {
		fixture.appendChild(content);
	}
	axe._tree = axe.utils.getFlattenedTree(fixture);
	return fixture;
};
/**
 * Create check arguments
 *
 * @param Node|String 	Stuff to go into the fixture (html or node)
 * @param Object  			Options argument for the check (optional, default: {})
 * @param String  			Target for the check, CSS selector (default: '#target')
 * @return Array
 */
testUtils.checkSetup = function (content, options, target) {
	'use strict';
	// Normalize the params
	if (typeof options !== 'object') {
		target = options;
		options = {};
	}
	// Normalize target, allow it to be the inserted node or '#target'
	target = target || (content instanceof Node ? content : '#target');
	testUtils.fixtureSetup(content);

	var node;
	if (typeof target === 'string') {
		node = axe.utils.querySelectorAll(axe._tree[0], target)[0];
	} else if (target instanceof Node) {
		node = axe.utils.getNodeFromTree(axe._tree[0], target);
	} else {
		node = target;
	}
	return [node.actualNode, options, node];
};


/**
 * Create check arguments with Shadow DOM. Target can be inside or outside of Shadow DOM, queried by
 * adding `id="target"` to a fragment. Or specify a custom selector as the `targetSelector` argument.
 *
 * @param Node|String 	Stuff to go into the fixture (html or node)
 * @param Node|String 	Stuff to go into the shadow boundary (html or node)
 * @param String  			Target selector for the check, can be inside or outside of Shadow DOM (default: '#target')
 * @param Object  			Options argument for the check (optional, default: {})
 * @return Array
 */
testUtils.shadowCheckSetup = function (content, shadowContent, targetSelector, options) {
	'use strict';

	// Normalize the params
	if (typeof options !== 'object') {
		options = {};
	}
	// Normalize target, allow it to be the provided string or use '#target' to query composed tree
	targetSelector = targetSelector || '#target';

	var fixture = testUtils.fixtureSetup(content);
	var targetCandidate = fixture.querySelector(targetSelector);
	var container = targetCandidate;
	if (!targetCandidate) {
		container = fixture.firstChild;
	}
	// attach a shadowRoot with the content provided
	var shadowRoot = container.attachShadow({ mode: 'open' });
	if (typeof shadowContent === 'string') {
		shadowRoot.innerHTML = shadowContent;
	} else if (content instanceof Node) {
		shadowRoot.appendChild(shadowContent);
	}

	if (!targetCandidate) {
		targetCandidate = shadowRoot.querySelector(targetSelector);
	}
	if (!targetSelector && !targetCandidate) {
		throw 'shadowCheckSetup requires at least one fragment to have #target, or a provided targetSelector';
	}

	// query the composed tree AFTER shadowDOM has been attached
	axe._tree = axe.utils.getFlattenedTree(fixture);
	var node = axe.utils.getNodeFromTree(axe._tree[0], targetCandidate);
	return [node.actualNode, options, node];
};


axe.testUtils = testUtils;