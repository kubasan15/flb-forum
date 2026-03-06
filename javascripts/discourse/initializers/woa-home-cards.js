import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";

export default apiInitializer("0.11.1", (api) => {
  const FLIP_ALPHABET = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/:_";
  const DEFAULT_ROTATE_INTERVAL = 6500;
  const FLIP_DURATION = 320;
  let rotationTimer = null;

  const ensureSplitflapChars = (container, length) => {
    while (container.children.length < length) {
      const char = document.createElement("span");
      char.className = "woa-splitflap__char";
      const top = document.createElement("span");
      top.className = "woa-splitflap__top";
      const bottom = document.createElement("span");
      bottom.className = "woa-splitflap__bottom";
      const flip = document.createElement("span");
      flip.className = "woa-splitflap__flip";
      char.appendChild(top);
      char.appendChild(bottom);
      char.appendChild(flip);
      container.appendChild(char);
    }
    while (container.children.length > length) {
      container.removeChild(container.lastChild);
    }
  };

  const setSplitflapChar = (charEl, value) => {
    const top = charEl.querySelector(".woa-splitflap__top");
    const bottom = charEl.querySelector(".woa-splitflap__bottom");
    if (top) {
      top.textContent = value;
    }
    if (bottom) {
      bottom.textContent = value;
    }
    charEl.setAttribute("data-current", value);
  };

  const setSplitflapText = (container, text) => {
    const normalized = text || "";
    ensureSplitflapChars(container, normalized.length);
    Array.from(normalized).forEach((char, index) => {
      const charEl = container.children[index];
      setSplitflapChar(charEl, char);
    });
    container.setAttribute("data-current", normalized);
  };

  const buildFlipSteps = (fromChar, toChar) => {
    if (fromChar === toChar) {
      return [toChar];
    }
    const fromIndex = FLIP_ALPHABET.indexOf(fromChar);
    const toIndex = FLIP_ALPHABET.indexOf(toChar);
    if (fromIndex === -1 || toIndex === -1) {
      return [toChar];
    }
    const steps = [];
    let index = fromIndex;
    while (index !== toIndex) {
      index = (index + 1) % FLIP_ALPHABET.length;
      steps.push(FLIP_ALPHABET[index]);
    }
    return steps.length ? steps : [toChar];
  };

  const animateSplitflapText = (container, nextText) => {
    const currentText = container.getAttribute("data-current") || "";
    const targetText = nextText || "";
    const maxLength = Math.max(currentText.length, targetText.length);
    const paddedCurrent = currentText.padEnd(maxLength, " ");
    const paddedTarget = targetText.padEnd(maxLength, " ");

    ensureSplitflapChars(container, maxLength);
    Array.from(paddedTarget).forEach((targetChar, index) => {
      const charEl = container.children[index];
      const steps = buildFlipSteps(paddedCurrent[index], targetChar);
      steps.forEach((stepChar, stepIndex) => {
        const delay = index * 28 + stepIndex * FLIP_DURATION;
        window.setTimeout(() => {
          const flip = charEl.querySelector(".woa-splitflap__flip");
          if (flip) {
            flip.textContent = charEl.getAttribute("data-current") || " ";
          }
          charEl.classList.remove("is-flipping");
          void charEl.offsetHeight;
          charEl.classList.add("is-flipping");
          window.setTimeout(() => {
            setSplitflapChar(charEl, stepChar);
          }, FLIP_DURATION * 0.5);
        }, delay);
      });
    });

    container.setAttribute("data-current", targetText);
  };

  const applyCardAttributes = () => {
    document.querySelectorAll("[data-woa-card]").forEach((card) => {
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "link");
    });
  };

  const renderAnnouncements = async () => {
    const container = document.querySelector("[data-woa-announcements]");
    if (!container) {
      if (rotationTimer) {
        window.clearInterval(rotationTimer);
        rotationTimer = null;
      }
      return;
    }

    const list = container.querySelector(".woa-home-announcements__list");
    if (!list) {
      return;
    }

    const tag = container.getAttribute("data-tag") || "announcement";
    const limit = Number(container.getAttribute("data-limit") || 5);
    const rotateInterval = Number(container.getAttribute("data-rotate-interval") || DEFAULT_ROTATE_INTERVAL);
    list.innerHTML = "";
    if (rotationTimer) {
      window.clearInterval(rotationTimer);
      rotationTimer = null;
    }

    try {
      const response = await ajax(`/tag/${encodeURIComponent(tag)}.json?order=created&ascending=false`);
      const topics = (response?.topic_list?.topics || []).slice(0, limit);
      if (!topics.length) {
        return;
      }

      let rotationIndex = 0;
      const link = document.createElement("a");
      link.className = "woa-home-announcement";

      const titleLine = document.createElement("div");
      titleLine.className = "woa-home-announcement__line";
      const title = document.createElement("span");
      title.className = "woa-home-announcement__title woa-splitflap";
      titleLine.appendChild(title);

      const metaLine = document.createElement("div");
      metaLine.className = "woa-home-announcement__line woa-home-announcement__line--meta";
      const meta = document.createElement("span");
      meta.className = "woa-home-announcement__meta woa-splitflap";
      metaLine.appendChild(meta);

      link.appendChild(titleLine);
      link.appendChild(metaLine);
      list.appendChild(link);

      const updateAnnouncement = (topic, animate) => {
        const fallbackUrl =
          topic?.slug && topic?.id ? `/t/${topic.slug}/${topic.id}` : topic?.id ? `/t/${topic.id}` : null;
        const rawUrl = topic?.relative_url || topic?.url || fallbackUrl;
        const topicUrl = rawUrl === "undefined" ? fallbackUrl : rawUrl;
        if (!topicUrl) {
          return;
        }

        link.href = topicUrl;
        const titleText = topic?.title || "";
        let metaText = "";
        if (topic.category_id && response?.category_list?.categories) {
          const category = response.category_list.categories.find((item) => item.id === topic.category_id);
          if (category) {
            metaText = category.name || "";
          }
        }

        if (animate) {
          animateSplitflapText(title, titleText);
          animateSplitflapText(meta, metaText);
        } else {
          setSplitflapText(title, titleText);
          setSplitflapText(meta, metaText);
        }
      };

      updateAnnouncement(topics[rotationIndex], false);

      if (topics.length > 1 && rotateInterval > 0) {
        rotationTimer = window.setInterval(() => {
          rotationIndex = (rotationIndex + 1) % topics.length;
          updateAnnouncement(topics[rotationIndex], true);
        }, rotateInterval);
      }
    } catch (error) {
      const fallback = document.createElement("div");
      fallback.className = "woa-home-announcement__meta";
      fallback.textContent = "Announcements are loading...";
      list.appendChild(fallback);
    }
  };

  const handleCardClick = (event) => {
    const card = event.target.closest("[data-woa-card]");
    if (!card || event.target.closest("a")) {
      return;
    }

    const href = card.getAttribute("data-href");
    if (href && href !== "#") {
      window.location.href = href;
    }
  };

  const handleCardKeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const card = event.target.closest("[data-woa-card]");
    if (!card || event.target.closest("a")) {
      return;
    }

    event.preventDefault();
    const href = card.getAttribute("data-href");
    if (href && href !== "#") {
      window.location.href = href;
    }
  };

  applyCardAttributes();
  renderAnnouncements();
  document.addEventListener("click", handleCardClick);
  document.addEventListener("keydown", handleCardKeydown);

  api.onPageChange(() => {
    applyCardAttributes();
    renderAnnouncements();
  });
});
