/**
 * WP AI Slider — Admin Settings JS
 */
(function ($) {
	'use strict';

	const REST  = wpAiSliderAdmin.restUrl;
	const NONCE = wpAiSliderAdmin.nonce;

	/* ── Utility: REST request ──────────────────────────────── */
	function rest(endpoint, method, data) {
		const opts = {
			url:         REST + endpoint,
			method:      method || 'GET',
			contentType: 'application/json',
			beforeSend:  function (xhr) {
				xhr.setRequestHeader('X-WP-Nonce', NONCE);
			},
		};
		if (method === 'POST' && data !== undefined) {
			opts.data = JSON.stringify(data);
		}
		return $.ajax(opts);
	}

	/* ── Utility: show result message ──────────────────────── */
	function showResult($el, ok, msg) {
		$el.removeClass('wpais-ok wpais-fail')
		   .addClass(ok ? 'wpais-ok' : 'wpais-fail')
		   .html((ok ? '✓ ' : '✗ ') + msg);
	}

	/* ── Load settings on page load ────────────────────────── */
	function loadSettings() {
		rest('/get-settings', 'GET').done(function (res) {
			if (!res.success) return;
			const s = res.settings;
			if (s.openrouter_api_key) $('#openrouter_api_key').val(s.openrouter_api_key);
			if (s.pixabay_api_key)    $('#pixabay_api_key').val(s.pixabay_api_key);
			if (s.ai_model)           selectModel(s.ai_model);
		});
	}

	function selectModel(modelId) {
		if ($('#ai_model option[value="' + modelId + '"]').length) {
			$('#ai_model').val(modelId);
		} else {
			// Model not in default list — add it
			$('#ai_model').prepend(
				$('<option>').val(modelId).text(modelId)
			).val(modelId);
		}
	}

	/* ── Toggle key visibility ──────────────────────────────── */
	$(document).on('click', '.wpais-toggle-vis', function () {
		const id    = $(this).data('target');
		const $inp  = $('#' + id);
		const $icon = $(this).find('.dashicons');
		if ($inp.attr('type') === 'password') {
			$inp.attr('type', 'text');
			$icon.removeClass('dashicons-visibility').addClass('dashicons-hidden');
		} else {
			$inp.attr('type', 'password');
			$icon.removeClass('dashicons-hidden').addClass('dashicons-visibility');
		}
	});

	/* ── Save API key to DB before testing ─────────────────── */
	function saveKeyThen(keyName, value, callback) {
		if (!value) { callback(); return; }
		const payload = {};
		payload[keyName] = value;
		rest('/save-settings', 'POST', payload).always(callback);
	}

	/* ── Test OpenRouter ────────────────────────────────────── */
	$('#btn-test-openrouter').on('click', function () {
		const $btn = $(this);
		const $res = $('#result-openrouter');
		$btn.prop('disabled', true)
		    .html('<span class="dashicons dashicons-update wpais-spin"></span> Testing…');
		$res.html('').removeClass('wpais-ok wpais-fail');

		saveKeyThen('openrouter_api_key', $('#openrouter_api_key').val(), function () {
			rest('/test-openrouter', 'POST', {})
				.done(function (r) {
					showResult($res, true, r.message + (r.model ? ' (Model: ' + r.model + ')' : ''));
				})
				.fail(function (xhr) {
					const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Connection failed';
					showResult($res, false, msg);
				})
				.always(function () {
					$btn.prop('disabled', false)
					    .html('<span class="dashicons dashicons-yes-alt"></span> Test OpenRouter Connection');
				});
		});
	});

	/* ── Test Pixabay ───────────────────────────────────────── */
	$('#btn-test-pixabay').on('click', function () {
		const $btn = $(this);
		const $res = $('#result-pixabay');
		$btn.prop('disabled', true)
		    .html('<span class="dashicons dashicons-update wpais-spin"></span> Testing…');
		$res.html('').removeClass('wpais-ok wpais-fail');

		saveKeyThen('pixabay_api_key', $('#pixabay_api_key').val(), function () {
			rest('/test-pixabay', 'POST', {})
				.done(function (r) {
					showResult($res, true, r.message);
				})
				.fail(function (xhr) {
					const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Connection failed';
					showResult($res, false, msg);
				})
				.always(function () {
					$btn.prop('disabled', false)
					    .html('<span class="dashicons dashicons-yes-alt"></span> Test Pixabay Connection');
				});
		});
	});

	/* ── Refresh model list ─────────────────────────────────── */
	$('#btn-fetch-models').on('click', function () {
		const $btn      = $(this);
		const $select   = $('#ai_model');
		const current   = $select.val();
		$btn.prop('disabled', true)
		    .html('<span class="dashicons dashicons-update wpais-spin"></span> Loading…');

		const key = $('#openrouter_api_key').val();

		function fetchModels() {
			rest('/get-models', 'GET')
				.done(function (r) {
					if (!r.success || !r.models) return;
					$select.empty();
					r.models.forEach(function (m) {
						$select.append(
							$('<option>').val(m.id).text(m.name + (m.context ? ' (' + (m.context / 1000) + 'k ctx)' : ''))
						);
					});
					selectModel(current);
				})
				.fail(function (xhr) {
					const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Could not load models';
					alert('Model fetch failed: ' + msg);
				})
				.always(function () {
					$btn.prop('disabled', false)
					    .html('<span class="dashicons dashicons-update"></span> Refresh');
				});
		}

		if (key) {
			saveKeyThen('openrouter_api_key', key, fetchModels);
		} else {
			fetchModels();
		}
	});

	/* ── Save all settings ──────────────────────────────────── */
	$('#btn-save-settings').on('click', function () {
		const $btn = $(this);
		const $res = $('#result-save');
		$btn.prop('disabled', true)
		    .html('<span class="dashicons dashicons-update wpais-spin"></span> Saving…');
		$res.html('').removeClass('wpais-ok wpais-fail');

		const payload = {
			openrouter_api_key: $('#openrouter_api_key').val(),
			pixabay_api_key:    $('#pixabay_api_key').val(),
			ai_model:           $('#ai_model').val(),
		};

		rest('/save-settings', 'POST', payload)
			.done(function (r) {
				showResult($res, true, r.message);
				// Reload after short delay to refresh status badges
				setTimeout(function () { location.reload(); }, 1500);
			})
			.fail(function (xhr) {
				const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Save failed';
				showResult($res, false, msg);
				$btn.prop('disabled', false)
				    .html('<span class="dashicons dashicons-saved"></span> Save Settings');
			});
	});

	/* ── Init ───────────────────────────────────────────────── */
	$(document).ready(loadSettings);

})(jQuery);
