function createContentGetSelector() {
	'use strict';
	var group = document.createElement('div');
	group.innerHTML = '<label id="mylabel">Label</label><input id="myinput" aria-labelledby="mylabel" type="text" />';
	return group;
}

function makeShadowTreeGetSelector(node) {
	'use strict';
	var root = node.attachShadow({mode: 'open'});
	var div = document.createElement('div');
	div.className = 'parent';
	root.appendChild(div);
	div.appendChild(createContentGetSelector());
}

function makeNonunique(fixture) {
	'use strict';
	var nonUnique = '<div><div><div></div></div></div>';
	fixture.innerHTML = '<main>' +
		nonUnique + nonUnique + nonUnique +
		'<div><div></div></div>';
	var node = document.createElement('div');
	var parent = fixture.querySelector('div:nth-child(4) > div');
	parent.appendChild(node);
	return node;
}

describe('axe.utils.getSelector', function () {
	'use strict';

	var fixture = document.getElementById('fixture');
	var shadowSupported = axe.testUtils.shadowSupport.v1;

	afterEach(function () {
		fixture.innerHTML = '';
	});

	it('should be a function', function () {
		assert.isFunction(axe.utils.getSelector);
	});

	it('should generate a unique CSS selector', function () {
		var node = document.createElement('div');
		fixture.appendChild(node);

		var sel = axe.utils.getSelector(node);

		assert.equal(sel, '#fixture > div');

		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);
	});

	it('should still work if an element has nothing but whitespace as a className', function () {
		var node = document.createElement('div');
		node.className = '    ';
		fixture.appendChild(node);

		var sel = axe.utils.getSelector(node);

		assert.equal(sel, '#fixture > div');

		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);
	});

	it('should handle special characters', function () {
		var node = document.createElement('div');
		node.id = 'monkeys#are.animals\\ok';
		fixture.appendChild(node);

		var result = document.querySelectorAll(axe.utils.getSelector(node));
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);
	});

	it('should handle special characters in className', function () {
		var node = document.createElement('div');
		node.className = '.  bb-required';
		fixture.appendChild(node);

		var result = document.querySelectorAll(axe.utils.getSelector(node));
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);
	});

	it('should be able to fall back to positional selectors', function () {
		var node, expected;
		for (var i = 0; i < 10; i++) {
			node = document.createElement('div');
			fixture.appendChild(node);
			if (i === 5) {
				expected = node;
			}
		}

		var result = document.querySelectorAll(axe.utils.getSelector(expected));
		assert.lengthOf(result, 1);
		assert.equal(result[0], expected);
	});

	it('should stop on unique ID', function () {
		var node = document.createElement('div');
		node.id = 'monkeys';
		fixture.appendChild(node);

		var sel = axe.utils.getSelector(node);

		assert.equal(sel, '#monkeys');

		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);

	});

	it('should not use ids if they are not unique', function () {
		var node = document.createElement('div');
		node.id = 'monkeys';
		fixture.appendChild(node);

		node = document.createElement('div');
		node.id = 'monkeys';
		fixture.appendChild(node);

		var sel = axe.utils.getSelector(node);

		assert.equal(sel, '#fixture > div:nth-child(2)');

		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);
	});

	it('should use classes if available and unique', function () {
		var node = document.createElement('div');
		node.className = 'monkeys simian';
		fixture.appendChild(node);

		node = document.createElement('div');
		node.className = 'dogs cats';
		fixture.appendChild(node);

		var sel = axe.utils.getSelector(node);

		assert.equal(sel, '.dogs.cats');

		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);

	});

	it('should default to tagName and position if classes are not unique', function () {
		var node = document.createElement('div');
		node.className = 'monkeys simian';
		fixture.appendChild(node);

		node = document.createElement('div');
		node.className = 'monkeys simian';
		fixture.appendChild(node);

		var sel = axe.utils.getSelector(node);

		assert.equal(sel, '#fixture > div:nth-child(2)');

		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);

	});

	it('should work on the documentElement', function () {
		var sel = axe.utils.getSelector(document.documentElement);
		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], document.documentElement);
	});

	it('should work on the documentElement with classes', function () {
		var orig = document.documentElement.className;
		document.documentElement.className = 'stuff and other things';
		var sel = axe.utils.getSelector(document.documentElement);
		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], document.documentElement);
		document.documentElement.className = orig;
	});

	it('should work on the body', function () {
		var sel = axe.utils.getSelector(document.body);
		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], document.body);
	});

	it('should work on namespaced elements', function () {
		fixture.innerHTML = '<hx:include>Hello</hx:include>';
		var node = fixture.firstChild;
		var sel = axe.utils.getSelector(node);
		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);
	});

	it('should work on complex namespaced elements', function () {
		fixture.innerHTML = '<m:math xmlns:m="http://www.w3.org/1998/Math/MathML">' +
		  '<m:mi>x</m:mi>' +
		  '<m:annotation-xml encoding="MathML-Content">' +
		    '<m:ci>x</m:ci>' +
		  '</m:annotation-xml>' +
		'</m:math>';
		var node = fixture.querySelector('m\\:ci');
		var sel = axe.utils.getSelector(node);
		var result = document.querySelectorAll(sel);
		assert.lengthOf(result, 1);
		assert.equal(result[0], node);
	});

	it('shouldn\'t fail if the node\'s parentNode doesnt have children, somehow (Firefox bug)', function () {
		var sel = axe.utils.getSelector({
			nodeName: 'a',
			classList: [],
			getAttribute: function () { },
			hasAttribute: function () { return false; },
			parentNode: {
				nodeName: 'b',
				getAttribute: function () { },
				hasAttribute: function () { return false; },
				classList: []
			}
		});
		assert.equal(sel, 'a');
	});

	it('should use role attributes', function () {
		var node = document.createElement('div');
		node.setAttribute('role', 'menuitem');
		fixture.appendChild(node);

		assert.equal(
			axe.utils.getSelector(node),
			'div[role="menuitem"]'
		);
	});

	it('should use href and src attributes', function () {
		var link = document.createElement('a');
		link.setAttribute('href', '//deque.com/thang/');
		fixture.appendChild(link);
		link = document.createElement('a');
		link.setAttribute('href', '//deque.com/about/');
		fixture.appendChild(link);

		var img = document.createElement('img');
		img.setAttribute('src', '//deque.com/thang.png');
		fixture.appendChild(img);
		img = document.createElement('img');
		img.setAttribute('src', '//deque.com/logo.png');
		fixture.appendChild(img);

		assert.equal(
			axe.utils.getSelector(link),
			'a[href$="about/"]'
		);
		assert.equal(
			axe.utils.getSelector(img),
			'img[src$="logo.png"]'
		);
	});

	it('should not generate universal selectors', function () {
		var node = document.createElement('div');
		node.setAttribute('role', 'menuitem');
		fixture.appendChild(node);

		assert.equal(
			axe.utils.getSelector(node),
			'div[role="menuitem"]'
		);
	});

	it('should add [type] to input elements', function () {
		var node = document.createElement('input');
		node.type = 'password';
		fixture.appendChild(node);
		assert.equal(
			axe.utils.getSelector(node),
			'input[type="password"]'
		);
	});

	it('should use the name property if that distinguishes', function () {
		var node = document.createElement('input');
		node.type = 'text';
		fixture.appendChild(node);
		node = document.createElement('input');
		node.type = 'text';
		node.name = 'username';
		fixture.appendChild(node);
		assert.equal(
			axe.utils.getSelector(node),
			'input[type="text"][name="username"]'
		);
	});

	it('no options: should work with shadow DOM', function () {
		var shadEl;

		if (shadowSupported) {
			// shadow DOM v1 - note: v0 is compatible with this code, so no need
			// to specifically test this
			fixture.innerHTML = '<div></div>';
			makeShadowTreeGetSelector(fixture.firstChild);
			shadEl = fixture.firstChild.shadowRoot.querySelector('input#myinput');
			assert.deepEqual(axe.utils.getSelector(shadEl), [
				'#fixture > div',
				'#myinput'
			]);
		}
	});
	it('toRoot: should work with shadow DOM', function () {
		var shadEl;

		if (shadowSupported) {
			// shadow DOM v1 - note: v0 is compatible with this code, so no need
			// to specifically test this
			fixture.innerHTML = '<div></div>';
			makeShadowTreeGetSelector(fixture.firstChild);
			shadEl = fixture.firstChild.shadowRoot.querySelector('input#myinput');
			assert.deepEqual(axe.utils.getSelector(shadEl, { toRoot: true }), [
				'html > body > #fixture > div',
				'.parent > div > #myinput'
			]);
		}
	});
	it('should correctly calculate unique selector when no discernable features', function () {
		var node = makeNonunique(fixture);
		var sel = axe.utils.getSelector(node, {});
		var mine = document.querySelector(sel);
		assert.isTrue(mine === node);
	});
	it('should not traverse further up than required when no discernable features', function () {
		var node = makeNonunique(fixture);
		var top = fixture.querySelector('div:nth-child(4)');
		var sel = axe.utils.getSelector(node, {});
		sel = sel.substring(0, sel.indexOf(' >'));
		var test = document.querySelector(sel);
		assert.isTrue(test === top);
	});

});
