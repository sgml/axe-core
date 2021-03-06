/**
 * Get the deepest node in a given collection
 * @private
 * @param  {Array} collection Array of nodes to test
 * @return {Node}             The deepest node
 */
function getDeepest(collection) {
	'use strict';

	return collection.sort(function (a, b) {
		if (axe.utils.contains(a, b)) {
			return 1;
		}
		return -1;
	})[0];

}

/**
 * Determines if a node is included or excluded in a given context
 * @private
 * @param  {Node}  node     The node to test
 * @param  {Object}  context "Resolved" context object, @see resolveContext
 * @return {Boolean}         [description]
 */
function isNodeInContext(node, context) {
	'use strict';

	var include = context.include && getDeepest(context.include.filter(function (candidate) {
		return axe.utils.contains(candidate, node);
	}));
	var exclude = context.exclude && getDeepest(context.exclude.filter(function (candidate) {
		return axe.utils.contains(candidate, node);
	}));
	if ((!exclude && include) || (exclude && axe.utils.contains(exclude, include))) {
		return true;
	}
	return false;
}

/**
 * Pushes unique nodes that are in context to an array
 * @private
 * @param  {Array} result  The array to push to
 * @param  {Array} nodes   The list of nodes to push
 * @param  {Object} context The "resolved" context object, @see resolveContext
 */
function pushNode(result, nodes) {
	'use strict';

	var temp;

	if (result.length === 0) {
		return nodes;
	}
	if (result.length < nodes.length) {
		// switch so the comparison is shortest
		temp = result;
		result = nodes;
		nodes = temp;
	}
	for (var i = 0, l = nodes.length; i < l; i++) {
		if (!result.includes(nodes[i])) {
			result.push(nodes[i]);
		}
	}
	return result;
}

/**
 * reduces the includes list to only the outermost includes
 * @param {Array} the array of include nodes
 * @return {Array} the modified array of nodes
 */
function reduceIncludes(includes) {
	return includes.reduce((res, el) => {
		if (!res.length || !res[res.length - 1].actualNode.contains(el.actualNode)) {
			res.push(el);
		}
		return res;
	}, []);
}

/**
 * Selects elements which match `selector` that are included and excluded via the `Context` object
 * @param  {String} selector  CSS selector of the HTMLElements to select
 * @param  {Context} context  The "resolved" context object, @see Context
 * @return {Array}            Matching virtual DOM nodes sorted by DOM order
 */
axe.utils.select = function select(selector, context) {
	//jshint maxstatements:20
	'use strict';

	var result = [], candidate;
	if (axe._selectCache) { // if used outside of run, it will still work
		for (var j = 0, l = axe._selectCache.length; j < l; j++) {
			// First see whether the item exists in the cache
			let item = axe._selectCache[j];
			if (item.selector === selector) {
				return item.result;
			}
		}	
	}
	var curried = (function (context) {
		return function (node) {
			return isNodeInContext(node, context);
		};
	})(context);
	var reducedIncludes = reduceIncludes(context.include);
	for (var i = 0; i < reducedIncludes.length; i++) {
		candidate = reducedIncludes[i];
		if (candidate.actualNode.nodeType === candidate.actualNode.ELEMENT_NODE &&
			axe.utils.matchesSelector(candidate.actualNode, selector) &&
			curried(candidate)) {
			result = pushNode(result, [candidate]);
		}
		result = pushNode(result, axe.utils.querySelectorAllFilter(candidate, selector, curried));
	}
	if (axe._selectCache) {
		axe._selectCache.push({
			selector: selector,
			result: result
		});
	}
	return result;
};
