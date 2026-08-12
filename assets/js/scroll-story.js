document.addEventListener("DOMContentLoaded", () => {
	const story = document.querySelector(".scroll-story");
	if (!story) return;

	const images = Array.from(story.querySelectorAll(".story-image"));
	const panels = Array.from(story.querySelectorAll(".story-panel"));
	const current = story.querySelector("[data-current-frame]");
	const total = story.querySelector("[data-total-frames]");
	const previousButton = story.querySelector("[data-previous-frame]");
	const nextButton = story.querySelector("[data-next-frame]");
	let activeIndex = 0;
	let lastWheelEvent = 0;
	let lastWheelStep = 0;
	let releasedDirection = 0;
	let isTransitioning = false;
	let transitionTimer;

	if (total) total.textContent = images.length;

	const panelIsActive = (panel, index) => {
		if (panel.dataset.at === "last") return index === images.length - 1;
		const from = Number(panel.dataset.from || 0);
		const to = Number(panel.dataset.to || from);
		return index >= from && index <= to;
	};

	const updateInterface = () => {
		panels.forEach(panel => panel.classList.toggle("active", panelIsActive(panel, activeIndex)));
		if (current) current.textContent = activeIndex + 1;
		if (previousButton) previousButton.disabled = activeIndex === 0;
		if (nextButton) nextButton.disabled = activeIndex === images.length - 1;
	};

	const showFrame = (index, immediate = false) => {
		const nextIndex = Math.min(Math.max(index, 0), images.length - 1);
		const previousIndex = activeIndex;
		const outgoingImage = images[previousIndex];
		const incomingImage = images[nextIndex];
		activeIndex = nextIndex;

		if (immediate || previousIndex === nextIndex) {
			images.forEach((image, imageIndex) => {
				const isActive = imageIndex === activeIndex;
				image.classList.remove("outgoing");
				image.classList.toggle("active", isActive);
				image.setAttribute("aria-hidden", String(!isActive));
			});
			updateInterface();
			return;
		}

		isTransitioning = true;
		clearTimeout(transitionTimer);
		outgoingImage.classList.add("outgoing");
		outgoingImage.classList.remove("active");
		incomingImage.classList.remove("outgoing");
		// Ensure the browser paints the incoming frame at zero opacity before
		// transitioning it over the still-opaque outgoing frame.
		void incomingImage.offsetWidth;
		incomingImage.classList.add("active");
		incomingImage.setAttribute("aria-hidden", "false");
		updateInterface();

		transitionTimer = window.setTimeout(() => {
			outgoingImage.classList.remove("outgoing");
			outgoingImage.setAttribute("aria-hidden", "true");
			isTransitioning = false;
		}, 180);
	};

	const moveFrame = direction => {
		if (isTransitioning) return false;
		const nextIndex = activeIndex + direction;
		if (nextIndex < 0 || nextIndex >= images.length) return false;
		showFrame(nextIndex);
		return true;
	};

	story.addEventListener("wheel", event => {
		if (!event.deltaY) return;

		const now = Date.now();
		const direction = event.deltaY > 0 ? 1 : -1;
		const continuingGesture = now - lastWheelEvent < 220;
		const atBoundary = direction > 0
			? activeIndex === images.length - 1
			: activeIndex === 0;
		lastWheelEvent = now;

		// Momentum from the gesture that reached a boundary is absorbed. A fresh
		// wheel gesture is allowed through so the visitor can leave the story.
		if (atBoundary) {
			if (!continuingGesture) releasedDirection = direction;
			if (releasedDirection !== direction) event.preventDefault();
			return;
		}

		releasedDirection = 0;
		event.preventDefault();
		if (now - lastWheelStep < 60) return;
		moveFrame(direction);
		lastWheelStep = now;
	}, { passive: false });

	previousButton?.addEventListener("click", () => moveFrame(-1));
	nextButton?.addEventListener("click", () => moveFrame(1));

	document.addEventListener("keydown", event => {
		const bounds = story.getBoundingClientRect();
		const storyIsVisible = bounds.top < window.innerHeight && bounds.bottom > 0;
		if (!storyIsVisible) return;

		const movesForward = ["ArrowDown", "ArrowRight", "PageDown"].includes(event.key);
		const movesBackward = ["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key);
		const direction = movesForward ? 1 : movesBackward ? -1 : 0;
		const canMove = direction > 0
			? activeIndex < images.length - 1
			: direction < 0 && activeIndex > 0;
		if (canMove) {
			event.preventDefault();
			moveFrame(direction);
		}
	});

	showFrame(0, true);
});
