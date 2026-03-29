/**
 * WP AI Slider — Frontend Slider Script
 * Initialises all .wp-ai-slider-wrapper elements on the page.
 * Pure vanilla JS, no dependencies.
 */
(function () {
	'use strict';

	/* Initialise once DOM is ready */
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	function init() {
		document.querySelectorAll('.wp-ai-slider-wrapper').forEach(initSlider);
	}

	function initSlider(wrapper) {
		const slides    = Array.from(wrapper.querySelectorAll('.wp-ai-slider-slide'));
		const dots      = Array.from(wrapper.querySelectorAll('.wp-ai-slider-dot'));
		const prevBtn   = wrapper.querySelector('.wp-ai-slider-prev');
		const nextBtn   = wrapper.querySelector('.wp-ai-slider-next');
		const track     = wrapper.querySelector('.wp-ai-slider-track');

		if (!slides.length) return;

		const autoplay   = wrapper.dataset.autoplay   === 'true';
		const interval   = parseInt(wrapper.dataset.interval, 10) || 5000;
		const animation  = wrapper.dataset.animation  || 'fade';

		let current   = 0;
		let timer     = null;
		let touchX    = 0;

		/* Setup slide animation mode */
		if (animation === 'slide') {
			track.style.display  = 'flex';
			track.style.willChange = 'transform';
			slides.forEach(function (s) {
				s.style.flex = '0 0 100%';
				s.style.minWidth = '100%';
			});
		}

		/* Go to a slide by index */
		function goTo(index) {
			const total = slides.length;
			const prev  = current;
			current     = ((index % total) + total) % total;

			if (prev === current) return;

			/* Update slides */
			slides[prev].classList.remove('active');
			slides[current].classList.add('active');
			slides[prev].setAttribute('aria-hidden', 'true');
			slides[current].setAttribute('aria-hidden', 'false');

			/* Update dots */
			if (dots[prev])    { dots[prev].classList.remove('active');  dots[prev].setAttribute('aria-selected', 'false'); }
			if (dots[current]) { dots[current].classList.add('active');  dots[current].setAttribute('aria-selected', 'true'); }

			/* Slide animation: move track */
			if (animation === 'slide' && track) {
				track.style.transform = 'translateX(-' + (current * 100) + '%)';
			}
		}

		/* Autoplay */
		function startTimer() {
			if (!autoplay || slides.length <= 1) return;
			clearInterval(timer);
			timer = setInterval(function () { goTo(current + 1); }, interval);
		}

		function resetTimer() {
			clearInterval(timer);
			startTimer();
		}

		/* Arrow buttons */
		if (prevBtn) {
			prevBtn.addEventListener('click', function () { goTo(current - 1); resetTimer(); });
		}
		if (nextBtn) {
			nextBtn.addEventListener('click', function () { goTo(current + 1); resetTimer(); });
		}

		/* Dot buttons */
		dots.forEach(function (dot) {
			dot.addEventListener('click', function () {
				goTo(parseInt(this.dataset.index, 10));
				resetTimer();
			});
		});

		/* Keyboard navigation */
		wrapper.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowLeft')  { goTo(current - 1); resetTimer(); }
			if (e.key === 'ArrowRight') { goTo(current + 1); resetTimer(); }
		});

		/* Touch / swipe support */
		wrapper.addEventListener('touchstart', function (e) {
			touchX = e.touches[0].clientX;
		}, { passive: true });

		wrapper.addEventListener('touchend', function (e) {
			const diff = touchX - e.changedTouches[0].clientX;
			if (Math.abs(diff) > 50) {
				goTo(diff > 0 ? current + 1 : current - 1);
				resetTimer();
			}
		}, { passive: true });

		/* Pause on hover */
		wrapper.addEventListener('mouseenter', function () { clearInterval(timer); });
		wrapper.addEventListener('mouseleave', startTimer);

		/* Visibility API — pause when tab is hidden */
		document.addEventListener('visibilitychange', function () {
			if (document.hidden) {
				clearInterval(timer);
			} else {
				startTimer();
			}
		});

		/* Initialise */
		slides.forEach(function (s, i) {
			s.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
		});

		startTimer();
	}

})();
