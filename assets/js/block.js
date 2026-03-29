/**
 * WP AI Slider — Gutenberg Block (no build step, uses wp.element.createElement)
 */
(function (wp) {
	'use strict';

	if (!wp || !wp.blocks) {
		console.error('WP AI Slider: WordPress block editor not found.');
		return;
	}

	const { registerBlockType }                      = wp.blocks;
	const { createElement: el, useState, Fragment }  = wp.element;
	const { InspectorControls, useBlockProps }        = wp.blockEditor;
	const {
		PanelBody, Button, TextControl, TextareaControl,
		SelectControl, RangeControl, ToggleControl,
		Spinner, Notice, ColorPalette
	} = wp.components;
	const apiFetch = wp.apiFetch;

	/* -----------------------------------------------------------
	 * Utility: generate a unique slide id
	 * --------------------------------------------------------- */
	function uid() {
		return 'sl_' + Math.random().toString(36).slice(2, 11);
	}

	/* -----------------------------------------------------------
	 * Utility: build a larger Pixabay CDN URL from the preview URL.
	 *
	 * Pixabay's previewURL is always a cdn.pixabay.com URL ending in
	 * _150.jpg — no referrer restrictions. The same CDN serves the
	 * same image at larger sizes: _340.jpg, _640.jpg, _1280.jpg.
	 * webformatURL (pixabay.com/get/…) has hotlink restrictions and
	 * silently fails inside the WordPress admin iframe, causing the
	 * browser to fall back to the 150px thumbnail, which looks pixelated
	 * when stretched. Using the CDN directly avoids that entirely.
	 * --------------------------------------------------------- */
	function pixabayCdnUrl(previewUrl, size) {
		if (!previewUrl) return previewUrl;
		// Replace trailing _150.jpg (or any _NNN.jpg) with the requested size
		var larger = previewUrl.replace(/_\d+(\.\w+)$/, '_' + size + '$1');
		return larger !== previewUrl ? larger : previewUrl;
	}

	/* -----------------------------------------------------------
	 * Component: Pixabay image search panel
	 * --------------------------------------------------------- */
	function PixabaySearch({ onSelect, onClose }) {
		const [query,      setQuery]      = useState('');
		const [results,    setResults]    = useState([]);
		const [loading,    setLoading]    = useState(false);
		const [error,      setError]      = useState('');
		const [page,       setPage]       = useState(1);
		const [totalHits,  setTotalHits]  = useState(0);
		const [searched,   setSearched]   = useState(false); // true only after a real API call completes
		const perPage = 20;

		function doSearch(q, p) {
			if (!q.trim()) return;
			setLoading(true);
			setError('');
			setSearched(false);
			apiFetch({
				path: '/wp-ai-slider/v1/search-pixabay?query='
				      + encodeURIComponent(q) + '&page=' + p + '&per_page=' + perPage,
				method: 'GET',
			})
			.then(function (data) {
				setLoading(false);
				setSearched(true);
				setResults(data.hits || []);
				setTotalHits(data.totalHits || 0);
			})
			.catch(function (err) {
				setLoading(false);
				setSearched(true);
				setError(err.message || 'Image search failed. Check your Pixabay API key.');
			});
		}

		const totalPages = Math.ceil(totalHits / perPage);

		return el('div', { className: 'wpais-pixabay-panel' },

			/* Header */
			el('div', { className: 'wpais-search-header' },
				el('h4', {}, '🔍 Search Pixabay Images'),
				el(Button, { isSmall: true, onClick: onClose, className: 'wpais-close-btn' }, '✕ Close')
			),

			/* Search input */
			el('div', { className: 'wpais-search-row' },
				el('input', {
					type: 'text',
					className: 'wpais-search-input',
					placeholder: 'Search images… (e.g. nature, business, travel)',
					value: query,
					onChange: function (e) {
						setQuery(e.target.value);
						// Reset search state whenever the user edits the query
						// so no stale message lingers while they are still typing.
						setSearched(false);
						setResults([]);
						setTotalHits(0);
						setError('');
					},
					onKeyDown: function (e) {
						if (e.key === 'Enter') { setPage(1); doSearch(query, 1); }
					},
				}),
				el(Button, {
					isPrimary: true,
					disabled: loading || !query.trim(),
					onClick: function () { setPage(1); doSearch(query, 1); },
				}, loading ? '…' : 'Search')
			),

			/* Error */
			error && el(Notice, { status: 'error', isDismissible: false }, error),

			/* Success banner — only after a completed search that returned results */
			!loading && searched && results.length > 0 && el('p', { className: 'wpais-search-success' },
				'✅ Here are the images for "' + query + '" — click any image to select it.'
			),

			/* Loading indicator — custom spinner, no dependency on WP Spinner component */
			loading && el('div', { className: 'wpais-results-loading' },
				el('span', { className: 'wpais-spin-icon' }),
				el('span', { className: 'wpais-spin-text' }, 'Searching Pixabay for images…')
			),

			/* Results grid */
			el('div', { className: 'wpais-results-grid' },
				!loading && searched && results.length === 0 && el('p', { className: 'wpais-no-results' },
					'⚠️ No images found for "' + query + '". Please try a different search term.'
				),
				results.map(function (img) {
					return el('div', {
						key: img.id,
						className: 'wpais-result-item',
						onClick: function () { onSelect(img); },
						title: img.tags,
					},
						el('img', {
							src: img.previewURL,
							alt: img.tags,
							loading: 'lazy',
						}),
						el('div', { className: 'wpais-result-overlay' },
							el('span', {}, img.tags.split(',')[0].trim()),
							el('span', { className: 'wpais-result-author' }, '📷 ' + img.user)
						)
					);
				})
			),

			/* Pagination */
			totalPages > 1 && el('div', { className: 'wpais-pagination' },
				el(Button, {
					isSecondary: true, isSmall: true,
					disabled: page <= 1,
					onClick: function () { const p = page - 1; setPage(p); doSearch(query, p); },
				}, '← Prev'),
				el('span', { className: 'wpais-page-info' }, 'Page ' + page + ' / ' + totalPages),
				el(Button, {
					isSecondary: true, isSmall: true,
					disabled: page >= totalPages,
					onClick: function () { const p = page + 1; setPage(p); doSearch(query, p); },
				}, 'Next →')
			)
		);
	}

	/* -----------------------------------------------------------
	 * Component: Slide editor (image + text tabs)
	 * --------------------------------------------------------- */
	function SlideEditor({ slide, slideIndex, totalSlides, onUpdate, onRemove, onMoveUp, onMoveDown }) {
		const [showSearch,   setShowSearch]   = useState(!slide.imageUrl);
		const [activeTab,    setActiveTab]    = useState('tab1');
		const [generating,   setGenerating]   = useState(false);
		const [manualPrompt, setManualPrompt] = useState('');
		const [notice,       setNotice]       = useState(null); // { type: 'success'|'error', text }

		function flashNotice(type, text) {
			setNotice({ type, text });
			setTimeout(function () { setNotice(null); }, 4000);
		}

		function handleImageSelect(img) {
			// Store two CDN URLs:
			//   imageUrl     = _1280px — used on the frontend for high-res display
			//   imageWebUrl  = _640px  — used in the editor preview (faster load)
			// Both are cdn.pixabay.com URLs with no referrer restrictions.
			// webformatURL (pixabay.com/get/…) has hotlink restrictions and silently
			// fails inside the WP admin iframe, causing pixelation from the 150px fallback.
			var cdn1280 = pixabayCdnUrl(img.previewURL, 1280);
			var cdn640  = pixabayCdnUrl(img.previewURL, 640);
			onUpdate({
				...slide,
				imageUrl:     cdn1280 || cdn640 || img.webformatURL || img.previewURL,
				imageWebUrl:  cdn640  || img.webformatURL || img.previewURL,
				imagePreview: img.previewURL,
				imageTags:    img.tags,
				imageUser:    img.user,
				pixabayId:    img.id,
			});
			setShowSearch(false);
		}

		function callGenerateText(prompt, system) {
			setGenerating(true);
			setNotice(null);
			apiFetch({
				path: '/wp-ai-slider/v1/generate-text',
				method: 'POST',
				data: { prompt: prompt, system: system },
			})
			.then(function (data) {
				setGenerating(false);
				if (data.success && data.text) {
					// Try to split into hero + subtext on line break or dot
					let heroText    = data.text;
					let heroSubtext = '';
					const lineBreak = data.text.indexOf('\n');
					if (lineBreak > 0) {
						heroText    = data.text.substring(0, lineBreak).trim();
						heroSubtext = data.text.substring(lineBreak + 1).trim();
					}
					onUpdate({ ...slide, heroText: heroText, heroSubtext: heroSubtext });
					flashNotice('success', '✓ Hero text generated!');
				}
			})
			.catch(function (err) {
				setGenerating(false);
				flashNotice('error', err.message || 'Generation failed. Check your OpenRouter API key.');
			});
		}

		function generateFromImage() {
			if (!slide.imageTags) {
				flashNotice('error', 'Please select an image first.');
				return;
			}
			const prompt = 'Write a short, compelling hero heading (max 10 words) for a website slider image that shows: '
				+ slide.imageTags + '. Photographer: ' + (slide.imageUser || 'unknown')
				+ '. On a new line, write a short supporting subtitle (max 15 words). Output ONLY the two lines, nothing else.';
			const system = 'You are a professional copywriter creating impactful website hero text. '
				+ 'Output only the text as instructed. No explanations, no quotes, no formatting symbols.';
			callGenerateText(prompt, system);
		}

		function generateFromPrompt() {
			if (!manualPrompt.trim()) {
				flashNotice('error', 'Please enter your instructions first.');
				return;
			}
			const prompt = 'Based on this instruction: "' + manualPrompt + '" — '
				+ 'write a short compelling hero heading (max 10 words). '
				+ 'On a new line write a short supporting subtitle (max 15 words). '
				+ 'Output ONLY the two lines, nothing else.';
			const system = 'You are a professional copywriter. Output only the requested hero text. '
				+ 'No explanations, no quotes, no formatting.';
			callGenerateText(prompt, system);
		}

		return el('div', { className: 'wpais-slide-editor' },

			/* Slide editor header */
			el('div', { className: 'wpais-se-header' },
				el('div', { className: 'wpais-se-title' },
					el('span', { className: 'wpais-slide-badge' }, 'Slide ' + (slideIndex + 1)),
					slide.imageTags && el('span', { className: 'wpais-tag-preview' }, slide.imageTags.split(',')[0].trim())
				),
				el('div', { className: 'wpais-se-actions' },
					totalSlides > 1 && slideIndex > 0 && el(Button, {
						isSmall: true, onClick: onMoveUp, title: 'Move slide up',
					}, '↑'),
					totalSlides > 1 && slideIndex < totalSlides - 1 && el(Button, {
						isSmall: true, onClick: onMoveDown, title: 'Move slide down',
					}, '↓'),
					el(Button, {
						isSmall: true, isDestructive: true, onClick: onRemove,
					}, '✕ Remove')
				)
			),

			/* ── Image section ─────────────────────────────── */
			el('div', { className: 'wpais-image-section' },
				slide.imageUrl
					? el(Fragment, {},
						el('div', { className: 'wpais-image-chosen' },
							el('img', {
								src:       slide.imagePreview || slide.imageWebUrl,
								alt:       slide.imageTags || '',
								className: 'wpais-chosen-thumb',
								onError:   function (e) {
									// If preview CDN fails too, try webformat URL
									if (slide.imageWebUrl && e.target.src !== slide.imageWebUrl) {
										e.target.src = slide.imageWebUrl;
									}
								},
							}),
							el('div', { className: 'wpais-image-meta' },
								slide.imageTags && el('p', {},
									el('strong', {}, '🏷 Tags: '),
									el('span', {}, slide.imageTags)
								),
								slide.imageUser && el('p', {},
									el('strong', {}, '📷 Photographer: '),
									el('span', {}, slide.imageUser)
								)
							),
							el(Button, {
								isSecondary: true, isSmall: true,
								onClick: function () { setShowSearch(!showSearch); },
							}, showSearch ? '✕ Cancel Search' : '🔍 Change Image')
						)
					)
					: el('div', { className: 'wpais-no-image' },
						el('div', { className: 'wpais-no-image-icon' }, '🖼'),
						el('p', {}, 'No image selected'),
						el(Button, {
							isPrimary: true,
							onClick: function () { setShowSearch(true); },
						}, '🔍 Search Pixabay Images')
					),

				showSearch && el(PixabaySearch, {
					onSelect: handleImageSelect,
					onClose:  function () { setShowSearch(false); },
				})
			),

			/* ── Text generation (only shown when image is chosen) ── */
			slide.imageUrl && el('div', { className: 'wpais-text-section' },

				/* Tab navigation */
				el('div', { className: 'wpais-tab-nav' },
					el('button', {
						className: 'wpais-tab-btn' + (activeTab === 'tab1' ? ' active' : ''),
						onClick: function () { setActiveTab('tab1'); },
					},
						el('span', {}, '✨'),
						el('div', {},
							el('strong', {}, 'Tab 1: AI from Image'),
							el('small', {}, 'AI reads image metadata')
						)
					),
					el('button', {
						className: 'wpais-tab-btn' + (activeTab === 'tab2' ? ' active' : ''),
						onClick: function () { setActiveTab('tab2'); },
					},
						el('span', {}, '✍️'),
						el('div', {},
							el('strong', {}, 'Tab 2: Manual Prompt'),
							el('small', {}, 'Type your own instructions')
						)
					)
				),

				/* Tab 1 content */
				activeTab === 'tab1' && el('div', { className: 'wpais-tab-content' },
					el('p', { className: 'wpais-tab-desc' },
						'The AI will analyze the Pixabay image\'s tags, metadata, and photographer info to automatically generate compelling hero text for this slide.'
					),
					slide.imageTags && el('div', { className: 'wpais-meta-box' },
						el('strong', {}, '📌 Image Tags (read by AI):'),
						el('p', {}, slide.imageTags)
					),
					el(Button, {
						isPrimary: true,
						disabled:  generating || !slide.imageTags,
						onClick:   generateFromImage,
						className: 'wpais-gen-btn',
					},
						generating
							? el(Fragment, {}, el('span', { className: 'wpais-spin-icon wpais-spin-sm' }), ' Generating…')
							: '✨ Generate Hero Text from Image'
					)
				),

				/* Tab 2 content */
				activeTab === 'tab2' && el('div', { className: 'wpais-tab-content' },
					el('p', { className: 'wpais-tab-desc' },
						'Type your own instructions below and the AI will craft the perfect hero text for your slider.'
					),
					el(TextareaControl, {
						label:       'Your Instructions',
						placeholder: 'e.g. "A motivational tagline about exploring the world" or "Professional tagline for a tech startup"',
						value:       manualPrompt,
						onChange:    function (v) { setManualPrompt(v); },
						rows:        3,
					}),
					el(Button, {
						isPrimary: true,
						disabled:  generating || !manualPrompt.trim(),
						onClick:   generateFromPrompt,
						className: 'wpais-gen-btn',
					},
						generating
							? el(Fragment, {}, el('span', { className: 'wpais-spin-icon wpais-spin-sm' }), ' Generating…')
							: '✨ Generate Hero Text'
					)
				),

				/* Notice area */
				notice && el('div', { className: 'wpais-notice wpais-notice-' + notice.type }, notice.text),

				/* ── Manual text editing fields ──────────────── */
				el('div', { className: 'wpais-text-fields' },
					el('div', { className: 'wpais-field-label' },
						el('strong', {}, '📝 Hero Text — edit or refine below:')
					),
					el(TextControl, {
						label:       'Main Heading',
						placeholder: 'Your hero text will appear here after generation…',
						value:       slide.heroText || '',
						onChange:    function (v) { onUpdate({ ...slide, heroText: v }); },
					}),
					el(TextControl, {
						label:       'Sub Text (optional)',
						placeholder: 'Supporting subtitle…',
						value:       slide.heroSubtext || '',
						onChange:    function (v) { onUpdate({ ...slide, heroSubtext: v }); },
					})
				)
			)
		);
	}

	/* -----------------------------------------------------------
	 * Main Edit component
	 * --------------------------------------------------------- */
	function Edit({ attributes, setAttributes }) {
		const {
			slides, autoplay, autoplayInterval, showDots, showArrows,
			sliderHeight, overlayOpacity, textColor, overlayColor,
			textAlign, animationType, imageFit, imagePosition,
			fontFamily, headingSize, subtextSize, fontWeight, textShadow,
			borderRadius,
		} = attributes;

		const [selectedIdx, setSelectedIdx] = useState(slides.length > 0 ? 0 : null);

		const blockProps = useBlockProps({ className: 'wpais-block-wrapper' });

		/* ── Slide management helpers ── */
		function addSlide() {
			const newSlide = { id: uid(), imageUrl: '', heroText: '', heroSubtext: '', imageTags: '' };
			const next = [...slides, newSlide];
			setAttributes({ slides: next });
			setSelectedIdx(next.length - 1);
		}

		function updateSlide(index, updated) {
			const next = slides.map(function (s, i) { return i === index ? updated : s; });
			setAttributes({ slides: next });
		}

		function removeSlide(index) {
			const next = slides.filter(function (_, i) { return i !== index; });
			setAttributes({ slides: next });
			setSelectedIdx(next.length > 0 ? Math.min(index, next.length - 1) : null);
		}

		function moveSlide(index, direction) {
			const next = [...slides];
			const target = index + direction;
			if (target < 0 || target >= next.length) return;
			[next[index], next[target]] = [next[target], next[index]];
			setAttributes({ slides: next });
			setSelectedIdx(target);
		}

		/* ── Active slide for preview ── */
		const activeSlide = (selectedIdx !== null && slides[selectedIdx]) ? slides[selectedIdx] : null;

		/* ── Inspector controls (right sidebar) ── */
		const inspector = el(InspectorControls, {},

			/* ── Layout ── */
			el(PanelBody, { title: '📐 Layout & Width', initialOpen: true },
				el('p', { className: 'wpais-inspector-label' }, 'Block Width'),
				el('p', { style: { fontSize: '12px', color: '#555', margin: '0 0 10px' } },
					'Use the block toolbar ↑ above to set Wide or Full width alignment.'
				),

				el(RangeControl, {
					label:    'Slider Height (px)',
					value:    sliderHeight,
					min:      200,
					max:      900,
					step:     10,
					onChange: function (v) { setAttributes({ sliderHeight: v }); },
				}),

				el(SelectControl, {
					label:   'Image Display (Fit)',
					value:   imageFit,
					help:    'Cover fills the frame completely — best for most photos. Contain shows the full image with background bars. Auto uses the image at its natural dimensions.',
					options: [
						{ label: 'Cover — fill frame, trim edges (recommended)', value: 'cover' },
						{ label: 'Contain — show full image, add bars',          value: 'contain' },
						{ label: 'Auto — natural image size, centred',           value: 'auto' },
						{ label: '100% — stretch to full width',                 value: '100%' },
					],
					onChange: function (v) { setAttributes({ imageFit: v }); },
				}),

				el(SelectControl, {
					label:   'Image Focus Position',
					value:   imagePosition,
					help:    'Controls which part of the image stays visible when Cover mode crops the edges.',
					options: [
						{ label: 'Centre (default)',  value: 'center center' },
						{ label: 'Top Centre',        value: 'center top' },
						{ label: 'Bottom Centre',     value: 'center bottom' },
						{ label: 'Left Centre',       value: 'left center' },
						{ label: 'Right Centre',      value: 'right center' },
						{ label: 'Top Left',          value: 'left top' },
						{ label: 'Top Right',         value: 'right top' },
						{ label: 'Bottom Left',       value: 'left bottom' },
						{ label: 'Bottom Right',      value: 'right bottom' },
					],
					onChange: function (v) { setAttributes({ imagePosition: v }); },
				})
			),

			/* ── Slider behaviour ── */
			el(PanelBody, { title: '🎬 Slider Behaviour', initialOpen: false },

				el(SelectControl, {
					label:    'Slide Animation',
					value:    animationType,
					options:  [
						{ label: 'Fade (crossfade)',          value: 'fade' },
						{ label: 'Slide (horizontal scroll)', value: 'slide' },
					],
					onChange: function (v) { setAttributes({ animationType: v }); },
				}),

				el(ToggleControl, {
					label:    'Autoplay Slides',
					checked:  autoplay,
					onChange: function (v) { setAttributes({ autoplay: v }); },
				}),

				autoplay && el(RangeControl, {
					label:    'Autoplay Interval (ms)',
					value:    autoplayInterval,
					min:      1000,
					max:      10000,
					step:     500,
					onChange: function (v) { setAttributes({ autoplayInterval: v }); },
				}),

				el(ToggleControl, {
					label:    'Show Navigation Arrows',
					checked:  showArrows,
					onChange: function (v) { setAttributes({ showArrows: v }); },
				}),

				el(ToggleControl, {
					label:    'Show Dot Indicators',
					checked:  showDots,
					onChange: function (v) { setAttributes({ showDots: v }); },
				})
			),

			/* ── Overlay ── */
			el(PanelBody, { title: '🎨 Image Overlay', initialOpen: false },
				el('p', { className: 'wpais-inspector-label' }, 'Overlay Colour'),
				el(ColorPalette, {
					value:    overlayColor,
					onChange: function (v) { setAttributes({ overlayColor: v || '#000000' }); },
					colors: [
						{ name: 'Black',       color: '#000000' },
						{ name: 'Navy',        color: '#0d1b4b' },
						{ name: 'Deep Purple', color: '#2e0057' },
						{ name: 'Forest',      color: '#0c3b21' },
						{ name: 'Dark Maroon', color: '#3b0c0c' },
						{ name: 'Charcoal',    color: '#2d2d2d' },
						{ name: 'Dark Teal',   color: '#00363a' },
					],
				}),
				el(RangeControl, {
					label:    'Overlay Opacity (%)',
					value:    overlayOpacity,
					min:      0,
					max:      90,
					step:     5,
					onChange: function (v) { setAttributes({ overlayOpacity: v }); },
				})
			),

			/* ── Typography ── */
			el(PanelBody, { title: '✍️ Typography', initialOpen: false },

				el('p', { className: 'wpais-inspector-label' }, 'Text Colour'),
				el(ColorPalette, {
					value:    textColor,
					onChange: function (v) { setAttributes({ textColor: v || '#ffffff' }); },
					colors: [
						{ name: 'White',      color: '#ffffff' },
						{ name: 'Light Gray', color: '#f0f0f0' },
						{ name: 'Gold',       color: '#ffd700' },
						{ name: 'Sky Blue',   color: '#87ceeb' },
						{ name: 'Peach',      color: '#ffcba4' },
						{ name: 'Lime',       color: '#ccff00' },
						{ name: 'Coral',      color: '#ff6b6b' },
					],
				}),

				el(SelectControl, {
					label:    'Text Alignment',
					value:    textAlign,
					options:  [
						{ label: 'Centre', value: 'center' },
						{ label: 'Left',   value: 'left' },
						{ label: 'Right',  value: 'right' },
					],
					onChange: function (v) { setAttributes({ textAlign: v }); },
				}),

				el(SelectControl, {
					label:   'Font Family',
					value:   fontFamily,
					options: [
						{ label: 'Default (inherit from theme)', value: 'inherit' },
						{ label: 'System Sans-serif',            value: 'sans' },
						{ label: 'System Serif',                 value: 'serif' },
						{ label: 'Georgia (elegant serif)',      value: 'georgia' },
						{ label: 'Palatino (refined serif)',     value: 'palatino' },
						{ label: 'Trebuchet (modern sans)',      value: 'trebuchet' },
						{ label: 'Verdana (readable sans)',      value: 'verdana' },
						{ label: 'Impact (bold display)',        value: 'impact' },
						{ label: 'Courier (monospace)',          value: 'courier' },
					],
					onChange: function (v) { setAttributes({ fontFamily: v }); },
				}),

				el(SelectControl, {
					label:   'Font Weight',
					value:   fontWeight,
					options: [
						{ label: 'Normal (400)',      value: '400' },
						{ label: 'Medium (500)',      value: '500' },
						{ label: 'Semi-bold (600)',   value: '600' },
						{ label: 'Bold (700)',        value: '700' },
						{ label: 'Extra-bold (800)', value: '800' },
						{ label: 'Black (900)',       value: '900' },
					],
					onChange: function (v) { setAttributes({ fontWeight: v }); },
				}),

				el(RangeControl, {
					label:    'Heading Font Size (px)',
					value:    headingSize,
					min:      16,
					max:      120,
					step:     2,
					onChange: function (v) { setAttributes({ headingSize: v }); },
				}),

				el(RangeControl, {
					label:    'Subtext Font Size (px)',
					value:    subtextSize,
					min:      12,
					max:      60,
					step:     1,
					onChange: function (v) { setAttributes({ subtextSize: v }); },
				}),

				el(ToggleControl, {
					label:    'Text Shadow',
					help:     'Adds a subtle shadow behind the text to improve readability on bright images.',
					checked:  textShadow,
					onChange: function (v) { setAttributes({ textShadow: v }); },
				})
			),

			/* ── Style ── */
			el(PanelBody, { title: '🔲 Style', initialOpen: false },
				el(RangeControl, {
					label:    'Corner Rounding (px)',
					help:     'Rounds the corners of the slider. 0 = sharp corners. Try 8–16 for a card-style look.',
					value:    borderRadius,
					min:      0,
					max:      48,
					step:     2,
					onChange: function (v) { setAttributes({ borderRadius: v }); },
				})
			)
		);

		/* ── Block body ── */
		return el(Fragment, {},
			inspector,
			el('div', blockProps,

				/* Block header bar */
				el('div', { className: 'wpais-block-header' },
					el('div', { className: 'wpais-block-brand' },
						el('span', { className: 'dashicons dashicons-images-alt2' }),
						el('strong', {}, ' WP AI Slider')
					),
					el('div', { className: 'wpais-block-meta' },
						el('span', {}, slides.length + ' slide' + (slides.length !== 1 ? 's' : '')),
						el('span', { className: 'wpais-dot-sep' }, '·'),
						el('span', {}, animationType === 'fade' ? '✦ Fade' : '➜ Slide'),
						el('span', { className: 'wpais-dot-sep' }, '·'),
						el('span', {}, sliderHeight + 'px')
					)
				),

				/* Slide thumbnails strip */
				el('div', { className: 'wpais-thumbnails' },
					slides.map(function (slide, index) {
						return el('div', {
							key:       slide.id || index,
							className: 'wpais-thumb' + (selectedIdx === index ? ' wpais-thumb-active' : ''),
							onClick:   function () { setSelectedIdx(index); },
							style:     slide.imagePreview ? { backgroundImage: 'url(' + slide.imagePreview + ')' } : {},
							title:     'Edit slide ' + (index + 1),
						},
							!slide.imagePreview && el('span', { className: 'dashicons dashicons-format-image' }),
							el('span', { className: 'wpais-thumb-num' }, index + 1)
						);
					}),
					el('div', {
						className: 'wpais-thumb wpais-thumb-add',
						onClick:   addSlide,
						title:     'Add new slide',
					},
						el('span', { className: 'dashicons dashicons-plus' }),
						el('span', {}, 'Add')
					)
				),

				/* Empty state */
				slides.length === 0 && el('div', { className: 'wpais-empty-state' },
					el('div', { className: 'wpais-empty-icon' }, '🖼'),
					el('h3', {}, 'No slides yet'),
					el('p', {}, 'Click "+ Add" above, or use the button below to create your first slide.'),
					el(Button, { isPrimary: true, onClick: addSlide }, '+ Create First Slide')
				),

				/* Slide editor panel */
				selectedIdx !== null && slides[selectedIdx] &&
					el(SlideEditor, {
						key:        slides[selectedIdx].id || selectedIdx,
						slide:      slides[selectedIdx],
						slideIndex: selectedIdx,
						totalSlides: slides.length,
						onUpdate:   function (upd) { updateSlide(selectedIdx, upd); },
						onRemove:   function () { removeSlide(selectedIdx); },
						onMoveUp:   function () { moveSlide(selectedIdx, -1); },
						onMoveDown: function () { moveSlide(selectedIdx, 1); },
					}),

					/* Live preview (when image is selected) */
				activeSlide && (activeSlide.imageWebUrl || activeSlide.imagePreview || activeSlide.imageUrl) &&
					el('div', { className: 'wpais-live-preview' },
						el('div', { className: 'wpais-preview-label' },
							el('span', {}, '👁 Slide Preview — Slide ' + (selectedIdx + 1) + ' of ' + slides.length)
						),
						el('div', {
							className: 'wpais-preview-frame',
							style: borderRadius > 0 ? { borderRadius: borderRadius + 'px', overflow: 'hidden' } : {},
						},
							/* Image rendered as <img> tag — far more reliable than CSS backgroundImage
							   in the WP admin iframe; previewURL has no referrer restrictions */
							el('img', {
								src:       activeSlide.imageWebUrl || activeSlide.imagePreview,
								alt:       activeSlide.imageTags || '',
								className: 'wpais-preview-bg-img',
								onError:   function (e) {
									// CDN fallback chain: 640px → 340px → 150px thumbnail
									var cdn340 = pixabayCdnUrl(activeSlide.imagePreview, 340);
									var prev   = activeSlide.imagePreview;
									if (cdn340 && e.target.src !== cdn340) {
										e.target.src = cdn340;
									} else if (prev && e.target.src !== prev) {
										e.target.src = prev;
									}
								},
							}),
							el('div', {
								className: 'wpais-preview-overlay',
								style: {
									backgroundColor: overlayColor,
									opacity:         overlayOpacity / 100,
								},
							}),
							el('div', {
								className: 'wpais-preview-content wpais-align-' + textAlign,
								style: {
									textAlign: textAlign,
								},
							},
								activeSlide.heroText    && el('h2', {
									className: 'wpais-preview-hero',
									style: {
										color:      textColor || '#ffffff',
										fontSize:   headingSize + 'px',
										fontWeight: fontWeight,
										textShadow: textShadow ? '0 2px 8px rgba(0,0,0,.5)' : 'none',
									},
								}, activeSlide.heroText),
								activeSlide.heroSubtext && el('p', {
									className: 'wpais-preview-subtext',
									style: {
										color:      textColor || '#ffffff',
										fontSize:   subtextSize + 'px',
										textShadow: textShadow ? '0 1px 4px rgba(0,0,0,.4)' : 'none',
									},
								}, activeSlide.heroSubtext)
							)
						),

						/* Mini settings row */
						el('div', { className: 'wpais-preview-settings-row' },
							el('span', {}, autoplay ? '▶ Autoplay ' + (autoplayInterval / 1000) + 's' : '⏸ No autoplay'),
							el('span', { className: 'wpais-dot-sep' }, '·'),
							el('span', {}, showArrows ? '◀ ▶ Arrows on' : 'Arrows off'),
							el('span', { className: 'wpais-dot-sep' }, '·'),
							el('span', {}, showDots ? '⬤ Dots on' : 'Dots off')
						)
					)
			)
		);
	}

	/* -----------------------------------------------------------
	 * Register the block
	 * --------------------------------------------------------- */
	registerBlockType('wp-ai-slider/slider', {
		title:       'WP AI Slider',
		icon:        'images-alt2',
		category:    'media',
		description: 'AI-powered image slider using Pixabay images and OpenRouter-generated hero text.',
		keywords:    ['slider', 'hero', 'ai', 'pixabay', 'carousel', 'image'],
		supports: {
			html:    false,
			align:   ['wide', 'full'],
			anchor:  true,
			spacing: { margin: true, padding: true },
		},
		attributes: {
			// Content
			slides:           { type: 'array',   default: [], items: { type: 'object' } },
			// Layout
			align:            { type: 'string',  default: '' },
			sliderHeight:     { type: 'number',  default: 500 },
			imageFit:         { type: 'string',  default: 'cover' },
			// Behaviour
			autoplay:         { type: 'boolean', default: true },
			autoplayInterval: { type: 'number',  default: 5000 },
			animationType:    { type: 'string',  default: 'fade' },
			showArrows:       { type: 'boolean', default: true },
			showDots:         { type: 'boolean', default: true },
			// Overlay
			overlayColor:     { type: 'string',  default: '#000000' },
			overlayOpacity:   { type: 'number',  default: 40 },
			// Typography
			textColor:        { type: 'string',  default: '#ffffff' },
			textAlign:        { type: 'string',  default: 'center' },
			fontFamily:       { type: 'string',  default: 'inherit' },
			headingSize:      { type: 'number',  default: 48 },
			subtextSize:      { type: 'number',  default: 20 },
			fontWeight:       { type: 'string',  default: '700' },
			textShadow:       { type: 'boolean', default: true },
			// Style
			borderRadius:     { type: 'number',  default: 0 },
			imagePosition:    { type: 'string',  default: 'center center' },
		},
		edit: Edit,
		save: function () { return null; },
	});

})(window.wp);
