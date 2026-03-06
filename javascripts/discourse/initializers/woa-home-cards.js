import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";

export default apiInitializer("0.11.1", (api) => {
  const DEFAULT_ROTATE_INTERVAL = 6500;
  const DEFAULT_TICK_TIMEOUT = 20;
  const DEFAULT_JUMP_ITERATIONS = 1;
  let splitflapStops = [];

  const stopSplitflaps = () => {
    splitflapStops.forEach((stop) => stop());
    splitflapStops = [];
  };

  const renderSplitflapText = (container, text, lengthOverride) => {
    const normalized = (text || "").toUpperCase();
    const length = typeof lengthOverride === "number" ? lengthOverride : normalized.length;
    const padded = normalized.padEnd(length, " ");
    container.style.setProperty("--cell-count", String(length));
    container.innerHTML = "";
    Array.from(padded).forEach((char) => {
      const cell = document.createElement("span");
      cell.className = "woa-splitflap__cell";
      cell.textContent = char || " ";
      container.appendChild(cell);
    });
    container.setAttribute("data-current", padded);
  };

  const parseCssSizeToPx = (value) => {
    if (!value) {
      return 0;
    }
    const trimmed = value.trim();
    if (trimmed.endsWith("px")) {
      return Number.parseFloat(trimmed) || 0;
    }
    if (trimmed.endsWith("rem")) {
      const rootSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      return (Number.parseFloat(trimmed) || 0) * rootSize;
    }
    return Number.parseFloat(trimmed) || 0;
  };

  const getSplitflapCellCount = (container) => {
    const styles = window.getComputedStyle(container);
    const cellWidth = parseCssSizeToPx(styles.getPropertyValue("--cell-width")) || 16;
    const gap = parseCssSizeToPx(styles.columnGap || styles.gap) || 2;
    const width = container.getBoundingClientRect().width;
    if (!width) {
      return 0;
    }
    return Math.max(1, Math.floor((width + gap) / (cellWidth + gap)));
  };

  const startSplitflap = (container, texts, options = {}, onChange) => {
    const normalizedTexts = (texts || [])
      .map((text) => (text || "").toUpperCase())
      .filter((text) => text.length > 0);
    if (!normalizedTexts.length) {
      return () => {};
    }
    const maxLength = Math.max(
      normalizedTexts.reduce((max, text) => Math.max(max, text.length), 0),
      Number(options.cellCount || 0)
    );

    const timeOut = Number(options.timeOut ?? DEFAULT_ROTATE_INTERVAL);
    const tickTimeOut = Number(options.tickTimeOut ?? DEFAULT_TICK_TIMEOUT);
    const nbJumpIterations = Number(options.nbJumpIterations ?? DEFAULT_JUMP_ITERATIONS);
    let curIndex = 0;
    let curText = normalizedTexts[0];
    let targetText = normalizedTexts[0];
    let timerId = null;
    let stopped = false;
    let jumpCount = 0;

    const schedule = (fn, delay) => {
      timerId = window.setTimeout(fn, delay);
    };

    const updateDisplay = (text) => {
      renderSplitflapText(container, text, maxLength);
      curText = text;
    };

    const changeText = () => {
      if (stopped) {
        return;
      }
      const nextIndex = (curIndex + 1) % normalizedTexts.length;
      targetText = normalizedTexts[nextIndex];
      curIndex = nextIndex;
      if (onChange) {
        onChange(curIndex);
      }
      transitionTick();
    };

    const transitionTick = () => {
      if (stopped) {
        return;
      }
      const current = curText.padEnd(maxLength, " ").split("");
      const target = targetText.padEnd(maxLength, " ");
      let done = true;

      for (let i = 0; i < maxLength; i += 1) {
        const targetChar = target[i];
        const targetCode = targetChar ? targetChar.charCodeAt(0) : 32;
        if (targetCode < 32 || targetCode > 126) {
          current[i] = targetChar;
          continue;
        }

        if (current[i] !== targetChar) {
          done = false;
          let code = current[i].charCodeAt(0);
          if (Number.isNaN(code) || code < 32 || code > 126) {
            code = 32;
          }
          if (jumpCount >= nbJumpIterations) {
            code += 1;
            if (code > 126) {
              code = 32;
            }
            current[i] = String.fromCharCode(code);
          }
        }
      }

      jumpCount = (jumpCount + 1) % (nbJumpIterations + 1);
      updateDisplay(current.join(""));

      if (!done) {
        schedule(transitionTick, tickTimeOut);
      } else {
        schedule(changeText, timeOut);
      }
    };

    updateDisplay(curText);
    if (onChange) {
      onChange(curIndex);
    }
    schedule(changeText, timeOut);

    return () => {
      stopped = true;
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
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
      stopSplitflaps();
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
    stopSplitflaps();

    try {
      const response = await ajax(`/tag/${encodeURIComponent(tag)}.json?order=created&ascending=false`);
      const topics = (response?.topic_list?.topics || []).slice(0, limit);
      if (!topics.length) {
        return;
      }

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

      const cellCount = getSplitflapCellCount(title) || getSplitflapCellCount(meta);

      const getTopicUrl = (topic) => {
        const fallbackUrl =
          topic?.slug && topic?.id ? `/t/${topic.slug}/${topic.id}` : topic?.id ? `/t/${topic.id}` : null;
        const rawUrl = topic?.relative_url || topic?.url || fallbackUrl;
        return rawUrl === "undefined" ? fallbackUrl : rawUrl;
      };

      const titleTexts = topics.map((topic) => topic?.title || "");
      const metaTexts = topics.map((topic) => {
        if (topic?.category_id && response?.category_list?.categories) {
          const category = response.category_list.categories.find((item) => item.id === topic.category_id);
          if (category) {
            return category.name || "";
          }
        }
        return "";
      });

      const updateLink = (index) => {
        const topic = topics[index];
        const url = getTopicUrl(topic);
        if (url) {
          link.href = url;
        }
      };

      splitflapStops.push(
        startSplitflap(
          title,
          titleTexts,
          {
            timeOut: rotateInterval,
            tickTimeOut: DEFAULT_TICK_TIMEOUT,
            nbJumpIterations: DEFAULT_JUMP_ITERATIONS,
            cellCount,
          },
          updateLink
        )
      );

      splitflapStops.push(
        startSplitflap(meta, metaTexts, {
          timeOut: rotateInterval,
          tickTimeOut: DEFAULT_TICK_TIMEOUT,
          nbJumpIterations: DEFAULT_JUMP_ITERATIONS,
          cellCount,
        })
      );
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
